# Native helper protocol

One JSON object per line. Requests contain `id`, `method`, and `params`; responses echo `id` and contain either `result` or `error: {code,message}`. Events contain `event` and `params`. stdout is protocol-only. No credentials or application text are logged.

## Recording and delivery contract

Recording does not require an editable field, Accessibility permission, a saved selection, or an original application. The shell copies the final result to the clipboard and leaves it there, then asks the helper to send the normal paste shortcut to whichever application is currently in front. The receiving application decides what to do. No Enter or submission event is sent.

There is no editor inspection, original-target capture, focus-epoch validation, direct AX text writing, UI Automation insertion, protected-field rule, IME gate, terminal exclusion, or clipboard restoration. These were removed, not retained as alternative protocols.

## Methods

| Method | Parameters | Result |
| --- | --- | --- |
| `status` | `{}` | Platform, OS permission state, shortcut availability, and binding. No prompts. |
| `configureShortcut` | `{binding:"fn"\|"right-alt"\|"disabled"}` | Binding and availability. Fn is macOS-only. |
| `context` | `{}` | `{appName:string}` from the foreground process, with an empty name if unavailable. No AX/UIA dependency. Optional personalization context must never block recording. |
| `pasteText` | `{text,clipboardOwner,requestId,deadlineMs}` | `{status:"dispatched"}` after shortcut events are posted. This does not prove the application accepted the paste. |
| `cancelPaste` | `{requestId}` | Records cancellation independently of the dispatch queue and returns `{cancelled:true}`. Already-dispatched input cannot be recalled. |
| `requestPermissions` | `{}` | Explicit macOS Accessibility/Input Monitoring prompt; Windows status only. Invoke only from a user permission action. |
| `stop` | `{}` | Exits the helper. |

`requestId` is a UUID generated once per paste attempt. A cancelled or dispatched ID cannot be reused during that helper process's lifetime. `deadlineMs` is an absolute Unix timestamp in milliseconds, at most ten seconds ahead when checked; the client uses four seconds. Expired and cancelled requests are rejected before dispatch. IDs are consumed before posting input, including uncertain partial dispatch. The UI must never automatically replay uncertain delivery.

The shell stages the text and a UUID owner marker using raw clipboard format `dev.typeless.owner`. Immediately before dispatch, the helper checks that both marker and text still match the request. If the user or another application replaced the clipboard, the helper reports `clipboard_changed` and sends no shortcut. The helper only reads these two clipboard values and never writes or restores clipboard content. These checks cannot make the clipboard and OS event queue one atomic transaction.

macOS uses Cmd+V and checks event-posting permission. Windows uses Ctrl+V; known Windows Terminal, WezTerm, and Alacritty processes receive Ctrl+Shift+V. Process identification selects a conventional shortcut only and never excludes an application. Windows `SendInput` may be blocked by integrity-level boundaries; partial/failed dispatch is reported as uncertain, without changing privileges.

Important error codes include `permission_required`, `clipboard_changed`, `cancelled`, `request_expired`, `already_dispatched`, `invalid_request`, `event_unavailable`, and `insertion_uncertain`. Transport failures additionally expose `helper_unavailable`, `native_timeout`, or `native_protocol_error` through `NativeError.code`.

## Events and client API

Events are `shortcut:{action:"toggle"}`, `ready:{platform}`, and `stale:{reason}`. The `stale` event is emitted immediately before the macOS helper exits with code `3` because its event tap kept failing while the process was authorized; the reason is the last `shortcutReason`. Exit code `3` is the only exit the client treats as a recoverable self-restart request. Isolated Fn/Right Alt release toggles recording. Chords suppress the candidate, never the original OS event. No focus polling or target-change events remain. OS shortcut conflicts are not changed automatically.

`NativeClient.context()` returns an application label. `NativeClient.paste(text,{clipboardOwner,signal?})` generates the request ID, propagates cancellation through `cancelPaste`, and returns `{ok,status?,code?,message?}`. The protocol reserves `confirmed` as a possible result status, but current helpers report only `dispatched`.

The default Windows client starts static PowerShell `-Command` code and reads the bundled C# source path from `TYPELESS_NATIVE_SOURCE`. It does not change execution policy or require administrator privileges. The standalone `launch.ps1` is a development alternative and may be blocked by script policy. UI Automation assemblies are no longer required.

## Verification

Run from the repository root:

```sh
npm run build:native
native/bin/typeless-native --self-test
node scripts/verify-windows-helper.mjs
```

The macOS self-test checks isolated shortcut recognition, chord exclusion, cancellation, request expiry, and duplicate dispatch rejection without installing event taps, querying a target, or posting keyboard events. Native runtime acceptance is separate from these tests.

The Windows verifier compiles the exact helper against .NET Framework 4.8 references with C# 5 for Windows PowerShell 5.1 syntax compatibility. It uses project-local `.cache/dotnet` when available, keeps state/packages/output under `.cache`, disables SDK certificate generation, and does not change system PATH. Successful macOS cross-compilation does not establish Windows startup, shortcut behavior, terminal keybinding compatibility, clipboard format handling, or visible paste acceptance.

Helpers never record audio, access provider credentials, call remote services, retain dictation text, or send Enter. Real microphone, physical shortcut, signed-installation permission, and application acceptance checks must be reported separately.

## macOS shortcut health and recovery

The native `status` response separately reports `inputMonitoring`, `tapEnabled`, `shortcutAvailable`, `shortcutReason`, `helperPid`, `fnTransitions`, and `shortcutActivations`. Availability requires a valid enabled event tap and run-loop source with the Fn binding selected. A fallback shortcut must not make the UI claim that Fn itself is working. The counters include only Function-key transitions and successful shortcut activations; no ordinary key codes or typed content are retained.

The helper reconciles its event tap every two seconds and on status/configuration/permission requests. Disabled taps are re-enabled; invalid ports or failed run-loop sources are recreated only with existing listening authorization (Input Monitoring or Accessibility). Normal startup and health polling do not request permission. The client clears stale startup state after helper failure, and status polling can restart it while restoring the last configured binding. Explicit application shutdown disables recovery.

A tap that keeps failing while the process is authorized cannot be repaired in place. After three consecutive reconciles ending in `tap_creation_failed`, `tap_disabled`, or `runloop_source_failed` while authorized, the helper emits `stale` and exits with code `3`, but only when the client started it with `TYPELESS_HELPER_RESTART_ON_STALE=1`. The counter resets on any other outcome, including `ready`. Without the environment variable the helper only reports the reason and keeps running, so `--self-test` and manual runs never self-restart.

The client sets that variable while fewer than three code-`3` exits happened in the last 120 seconds, and restarts such a helper after 500 ms instead of the usual two seconds. Once the budget is spent it restarts the helper without the variable and marks every `status` result with `restartsExhausted: true`, which the shell presents as `relaunch_required`; a status reporting `shortcutReason: "ready"` clears the history. Restarting the helper does not prove the operating system will hand the new process a working tap; a full application relaunch remains the last resort.

The recognizer accepts Function-key code `0x3F` and the secondary-Fn flag transition in modifier or keyboard events. Other keys carrying Fn flags cannot begin a gesture. Other-key/modifier chords, autorepeat, duplicate releases, holds over two seconds, and releases within 250 ms of the previous activation do not retrigger. These rules cover synthetic sequences; they do not prove a particular physical keyboard emits the expected events. OS Globe/Fn actions are not suppressed or reconfigured.

Evidence checked on 2026-09-18:

- Apple documents [`maskSecondaryFn`](https://developer.apple.com/documentation/coregraphics/cgeventflags/masksecondaryfn) as the Function-key state flag. The installed Apple SDK's `HIToolbox/Events.h` defines `kVK_Function = 0x3F`.
- [`CGEventType`](https://developer.apple.com/documentation/coregraphics/cgeventtype) includes events reporting taps disabled by timeout or user input. A stored port alone does not establish readiness; [`tapIsEnabled`](https://developer.apple.com/documentation/coregraphics/cgevent/tapisenabled(tap:)) supplies the enabled-state check.
- Apple's [input-monitoring guidance](https://support.apple.com/guide/mac-help/mchl4cedafb6/mac) describes a separate user-controlled permission for monitoring input across applications. Microphone permission does not establish shortcut access. Apple DTS also clarifies that Accessibility already grants event listening and posting; the helper therefore accepts either listening preflight or Accessibility trust, and checks the actual tap state. See [Apple DTS permission clarification](https://developer.apple.com/forums/thread/828052).
- [`CGEvent.tapCreate`](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate(tap:place:options:eventsofinterest:callback:userinfo:)) describes passive event taps and their run-loop callback environment. This implementation remains a session-level, listen-only tap; it does not request root privileges.

Permission state belongs to the actual running helper's execution identity. A development helper status check does not certify an installed bundle or a DMG copy. Ad-hoc signing and a successful signature check are not proof of a retained TCC grant. Confirm the `helperPid` and executable path for the instance being tested. Physical Fn and update/install identity behavior remain separate runtime acceptance items.

For a separate, permission-preserving event-tap recovery check:

```sh
xcrun swiftc -D NATIVE_TESTS -target arm64-apple-macos13.0 -module-cache-path .cache/swift-modules native/macos/Main.swift native/macos/Paste.swift native/macos/TapRecognizer.swift -framework AppKit -framework ApplicationServices -o .cache/native-shortcut-tests
.cache/native-shortcut-tests --self-test-tap-recovery
npx vitest run tests/native-client.test.ts
```

The test binary requires existing input-listening authorization and otherwise reports `blocked`. It disables and invalidates only its own newly created event tap, verifies detection/recreation, checks disabled/re-enabled bindings, then removes the tap. It posts zero keyboard events and does not simulate a physical Fn press. On 2026-09-18 this check passed on the development helper; pure gesture tests and four mocked client lifecycle tests also passed. The latter cover failure/restart, saved binding restoration, stale-child isolation, intentional shutdown, and live-but-hung health recovery without paste replay. No user-installed physical Fn acceptance is implied by these results.

Apple documents the [session tap](https://developer.apple.com/documentation/coregraphics/cgeventtaplocation/cgsessioneventtap) at the entry to the login session and a later annotated tap at application delivery. This implementation uses the earlier session-level passive listener. Apple also exposes [Globe/Fn keyboard actions](https://support.apple.com/en-sg/guide/mac-help/kbdm162/mac), including input-source switching, emoji and double-press Dictation. Those documents do not guarantee that every keyboard/OS action combination delivers a usable Fn transition to third-party taps. No global keyboard setting is changed; observed counters distinguish a running tap from an observed gesture.

The development helper also passed a real session-event-tap loop on 2026-09-18: temporary code posted synthetic `flagsChanged` events for Function key 63, and the running helper emitted one activation for an isolated gesture, none for an Fn+Shift chord, and one for a rapid double gesture. Receipts are `.local/shortcut-validation/result.json` and `health.json`; the injector was deleted. No recording or provider call was made. This verifies generated events through the real tap, not physical Fn/Globe hardware or system-action coexistence. A live but unresponsive helper is retired after a health timeout; later polling restarts it without replaying paste requests.
