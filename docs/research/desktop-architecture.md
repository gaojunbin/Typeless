# Desktop Architecture: Simultaneous macOS and Windows Launch

Status: architecture research with an accepted implementation decision. Access date for every source below: **2026-09-17**. The user subsequently authorized implementation. A macOS native helper compiles, isolated-tap self-tests pass, and its read-only status/rejection protocol has been exercised. The Windows helper cross-compiles against .NET Framework 4.8 references with C# 5 (zero warnings/errors); Windows native execution, real shortcut interception, visible insertion, microphone recording, credentialed provider calls, signing and distribution are not established by this report. API documentation establishes primitives, not end-to-end compatibility.

The later user requirement for simultaneous macOS and Windows launch supersedes the macOS-first assumption in `RESEARCH_BRIEF.md`. Both operating systems must pass the same release gate. Platform-specific keyboard limitations must be disclosed rather than represented as feature parity.

## 1. Recommendation and product boundary

Build a **global dictation helper**. The accepted implementation stack is **Electron + React/TypeScript shared UI/domain core, a Swift macOS helper, and a C# Win32/UI Automation Windows helper**. This uses the available JavaScript/Swift toolchain while preserving native shortcut and focus ownership. Electron owns an isolated local recording renderer using getUserMedia/WebAudio, provider orchestration and a narrowly scoped clipboard transaction; helpers own Fn/Right Alt recognition, target tokens and guarded delivery. Capture is not yet validated against Bluetooth/device changes, so AVAudioEngine/WASAPI remain a future escalation if WebAudio cannot meet acceptance. Keep renderer Node integration off, context isolation and sandboxing on, restrictive CSP, explicit permission handlers and validated IPC senders. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)

Tauri 2/Rust remains a researched alternative, not the shipped dependency or current core. Its architecture supports a shared Rust/WebView boundary but still requires the same platform work. The decision favors immediate implementation with the existing toolchain; it is not evidence Electron outperforms Tauri. The development Windows helper is compiled in memory by a static PowerShell command using a bundled source path supplied through an environment variable, without changing execution policy or requesting elevation. Enterprise restrictions, startup latency and production signing remain release risks; a signed precompiled helper is the preferred production evolution. [Tauri architecture](https://v2.tauri.app/concept/architecture/)

The requirement is one completed tap to start and another completed tap to stop. Fn is the preferred macOS binding, subject to keyboard and OS verification. On Windows, offer Fn only when a local key-detection test observes a usable event; otherwise offer Right Alt, a user-selected chord, or a tray/overlay button. **Universal Windows Fn support is not a credible launch promise.** Microsoft explicitly documents that Fn cannot be remapped in most cases, and its virtual-key table has no standard Fn entry. These establish the portability constraint; firmware consumption on any particular device remains a hardware-test hypothesis. [PowerToys keyboard limitations](https://learn.microsoft.com/en-us/windows/powertoys/keyboard-manager), [Virtual-key codes](https://learn.microsoft.com/en-us/windows/win32/inputdev/virtual-key-codes)

A true registered input method is a separate future integration, not the first product: Apple's InputMethodKit and Microsoft's TSF/IME system are dedicated input-method frameworks. Windows imposes IME signing and TSF requirements. IME integration could improve composition-aware text delivery in participating controls, but would add input-source registration, selection, composition lifecycle, and two distinct native implementations. It still would not expose a firmware-hidden Fn key or guarantee access to every application. The helper preserves the user's existing Chinese/Japanese/other IME and works through a tested delivery adapter or explicit Copy fallback. [InputMethodKit](https://developer.apple.com/documentation/inputmethodkit), [Microsoft IME requirements overview](https://learn.microsoft.com/en-us/windows/apps/develop/input/input-method-editors)

## 2. Stack decision

This table contains engineering judgments, not benchmark results.

| Option | Strength for this task | Cost/risk | Decision |
|---|---|---|---|
| SwiftUI/AppKit macOS + C#/.NET/WinUI Windows, shared protocol and fixtures | Direct native lifecycle, accessibility and window integration; independently idiomatic UI | Two UI/domain implementations unless a shared core is added; duplicate provider/error/privacy logic risks drift; simultaneous delivery needs two platform owners | Fallback if shared-shell integration fails; retain protocol and evaluation fixtures |
| Tauri 2 + Rust shared core + native adapters | One provider pipeline, storage model, state machine and settings UI; native ownership where required | Rust/Swift FFI, COM threading, WebView differences, release pipelines on both OSs; a web window alone is insufficient for overlay quality | Researched alternative; not the selected implementation |
| Electron with native modules | Feasible shared settings/history UI and orchestration | Still needs the same native keyboard/audio/insertion work; adds a different runtime and native-module packaging surface without removing the main risks | Accepted implementation choice with existing toolchain; no measured performance claim |
| Flutter or Avalonia with platform plugins | Feasible shared UI | The critical APIs remain platform plugins; accessibility, overlay, packaging and IME compatibility still need OS-specific work | No demonstrated advantage for this brief; revisit only with a proven team/component base |
| Browser/PWA-only application | Simple provider settings and recording demo | Does not satisfy the specified OS-wide native interaction contract | Not a candidate for the full product |

WinUI is part of Microsoft's Windows App SDK; that SDK is a valid Windows shell choice, not a cross-platform shell. [Windows App SDK](https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/)

### Logical module ownership (implemented names may differ)

- `core/session`: one serial TypeScript state owner; session IDs, generation counters, cancellation, monotonic deadlines and exactly-once delivery intent.
- `core/audio`: bounded buffers, resampling/encoding policy, VAD decisions and provider-size limits. Native callbacks only enqueue bounded chunks; they never run networking or models.
- `core/providers`: separate ASR and text-processing traits; MiMo implementation follows the independently verified provider contract. Never assume MiMo implements an OpenAI transcription route. Capability fields include streaming, accepted formats, maximum duration/bytes, language hints and vocabulary support.
- `core/cleanup`: minimal meaning-preserving cleanup, dictionary selection, optional style profile, output validation, raw-text fallback and versioned prompt fixtures.
- `core/storage`: one settings entry point, local history policy, dictionary/memory provenance and deletion, encryption policy and migration transactions.
- `platform/macos`: event tap, permission status, AX focus descriptor, native event integration, paste dispatch and secure secret storage.
- `platform/windows`: hotkey/hook lifecycle, UI Automation focus descriptor, native target HWND, paste dispatch and OS-protected secret storage.
- `ui`: onboarding, settings, history and explicit review. Display structured status; do not possess provider secrets or arbitrary native-command access.

The native adapter contract returns capabilities and structured failures, not optimistic booleans: `probeShortcut`, `captureTarget`, `startCapture`, `stopCapture`, `validateTarget`, `deliver`, `permissionStatus`, `showOverlay`. `deliver` distinguishes confirmed, dispatched-but-unverified, rejected-before-write and indeterminate-partial-write. A successful OS event-injection return is not proof the application inserted the text.

Use a narrow Electron preload API and local bundled content only; no remote pages with native privileges. Bound string lengths, requested paths, destinations and session ownership in the main process. The native JSONL protocol is documented in `native/PROTOCOL.md`; helpers retain target objects internally and expose opaque tokens. [Electron security guidance](https://www.electronjs.org/docs/latest/tutorial/security)

## 3. Keyboard feasibility and permissions

### macOS

Apple exposes a secondary Fn modifier flag and Core Graphics event taps. Prototype a session event tap observing modifier changes plus other key events, deriving an isolated Fn down/up pair; do not treat Fn as a normal printable key. The proposal does not require a root-level HID tap. Fn+arrow/F-key/system shortcuts must pass through without triggering dictation. First successful tap starts recording; second ends it, without waiting for a double-tap interval. Ignore repeat transitions and self-injected events; cancel a tap candidate when another key participates. Duration/debounce thresholds must be configurable for accessibility and validated on physical keyboards. [Fn event flag](https://developer.apple.com/documentation/coregraphics/cgeventflags/masksecondaryfn), [Event tap creation](https://developer.apple.com/documentation/coregraphics/cgevent/tapcreate(tap:place:options:eventsofinterest:callback:userinfo:))

Onboarding must detect and explain Fn/Globe conflicts with input-source switching, Emoji and system Dictation. Provide instructions for the user to choose an appropriate Keyboard setting; never silently modify that setting. Apple notes Dictation shortcut changes can also change the Fn/Globe setting. Passive observation cannot guarantee suppression of a competing OS action, and active filtering must be separately validated. [Apple Dictation settings](https://support.apple.com/en-mide/guide/mac-help/mh40584/mac), [Apple function keys](https://support.apple.com/en-ie/102439)

Track these permissions independently: microphone access for recording; Accessibility for cross-app focus/text actions; and keyboard-event listen/post authorization as required by the chosen implementation. Core Graphics exposes separate preflight/request functions for listen and post access. Exact TCC prompts and event-tap behavior must be tested on every supported macOS release with a signed app. Request incrementally, display actual status and handle denial/revocation; do not ask for Screen Recording for the baseline product. [Media-capture authorization](https://developer.apple.com/documentation/bundleresources/requesting-authorization-for-media-capture-on-macos), [Core Graphics access functions](https://developer.apple.com/documentation/coregraphics/core-graphics-functions)

### Windows

Use `RegisterHotKey` with `MOD_NOREPEAT` for conventional chords where possible; it reports registration failure and cannot promise ownership of an already reserved chord. Bare Right Alt needs a carefully scoped native keyboard hook and isolated-tap recognition rather than treating it as a standard registered modifier chord. Right Alt commonly participates in AltGr input: preserve modified-character entry and reject the binding when it breaks the selected layout. Microsoft calls out AltGr/Ctrl+Alt conflicts in keyboard remapping. Offer a candidate such as Ctrl+Shift+Space only after registration and typing tests; do not claim any default chord is globally conflict-free. [RegisterHotKey](https://learn.microsoft.com/en-in/windows/win32/api/winuser/nf-winuser-registerhotkey), [PowerToys AltGr limitations](https://learn.microsoft.com/en-us/windows/powertoys/keyboard-manager)

The keyboard test screen displays observed input, chosen binding, conflict result and a start/stop test. If Fn produces no OS event, show “Fn is not available on this keyboard” and immediately offer alternatives. Do not require a driver, firmware change, administrator launch or external remapper. Per-device persistence is allowed only where device identity can actually be observed; do not infer it from a generic hook.

Microphone privacy is a separate OS control; desktop and Store app settings differ. Do not promise a macOS-style per-app Accessibility prompt on Windows. Normal-privilege insertion cannot inject into higher-integrity targets under UIPI, and secure desktop/UAC screens are excluded. Offer Copy rather than escalating the whole app. [Windows microphone privacy](https://support.microsoft.com/en-us/windows/privacy/windows-camera-microphone-and-privacy), [SendInput and UIPI](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-sendinput)

## 4. Audio capture and session behavior

The selected implementation starts with Electron getUserMedia/WebAudio capture. Native capture alternatives are AVAudioEngine on macOS and shared-mode WASAPI on Windows; the following lifecycle requirements apply to either route. Observe engine configuration changes and endpoint notifications; the OS documents these mechanisms. Do not assume an iOS AVAudioSession route recipe applies to macOS. [AVAudioEngine configuration changes](https://developer.apple.com/documentation/foundation/nsnotification/name-swift.struct/avaudioengineconfigurationchange), [Windows endpoint notifications](https://learn.microsoft.com/en-us/windows/win32/api/mmdeviceapi/nn-mmdeviceapi-immnotificationclient)

- Default input follows the OS default until the user chooses a pinned device. Show the actual device, live input level and readiness. Start sound/visual readiness only after capture is active; do not claim audio before readiness was recorded.
- Test Bluetooth headsets, built-in mics and USB audio separately. Actual sample rate, channel count and latency are negotiated at runtime. Bluetooth profile/quality changes are a compatibility risk, not a measured property of this design.
- On device disappearance, interruption, sleep, lock or permission revocation: stop capture and preserve the already captured audio only within the chosen retention policy. Report interruption; never silently switch microphones mid-utterance. An explicit Resume can start a new segment with device and format metadata.
- Keep bounded audio in memory; a proposed initial maximum is 120 seconds, reduced to provider limits when necessary. Warn before the limit and stop cleanly. Any future segmentation must maintain utterance order and disclose partial results.
- Local VAD assists silence detection and trims only conservative outer silence. It does not stop a toggle session at normal pauses by default. Provide optional silence auto-stop as a separate preference. A no-speech result sends no ASR/cleanup request and inserts nothing; noisy-room and soft-speech false negatives need a labeled evaluation set.
- No always-on microphone or pre-trigger recording. An initial start-up gap must be exposed by the readiness cue, not hidden with unsolicited background listening.

### State machine

| State | User-visible status and permitted transitions |
|---|---|
| Idle | Tap -> Preflight; settings and provider tests available |
| Preflight | Check target, permissions, device and configuration; success -> Starting, failure -> Blocked/Error |
| Starting | Show preparing microphone; ready -> Recording; second tap cancels pending start; failure -> Error |
| Recording | Show elapsed time/device/level; next tap -> Stopping; Cancel -> Cancelled; interruption -> Interrupted |
| Stopping | Close stream and freeze audio once; valid speech -> Transcribing; silence -> NoSpeech; repeated stop ignored |
| Transcribing | ASR stage label; success -> Cleaning or Ready; Cancel invalidates session generation; retryable failure -> Error |
| Cleaning | Preserve raw transcript; success -> Ready; cleanup failure -> Review with raw text; never silently invent a successful cleanup |
| Ready | Revalidate target and delivery policy; safe -> Delivering; target changed/unknown/terminal -> Review |
| Delivering | At most one automatic attempt; confirmed -> Completed; unverifiable -> Review marked delivery uncertain; never auto-retry a partial write |
| Review | Copy, explicit insertion into a newly bound target, retry failed provider stage, edit, or discard; a new recording is an explicit action |
| Error / Interrupted | Explain failed stage; retry only retained inputs; device recovery or new recording; discard always available |
| Completed / NoSpeech / Cancelled | Brief accessible feedback, release buffers per policy, return Idle |

Every async result carries a session ID and generation. Cancellation closes capture immediately and prevents stale results from reaching delivery; it cannot undo audio already sent to a provider. A tap while Transcribing/Cleaning shows “Processing” and does not start another recording, cancel, or duplicate a request. Cancel is a dedicated action/shortcut. Hold-to-talk is optional and outside the baseline toggle acceptance contract.

## 5. Focus-safe delivery

1. Before recording, bind the target process, window, focused accessible element, app identity and selection/caret descriptor where exposed. Avoid retaining full document text. Unknown/sensitive target -> dictate into review only.
2. Before delivery, re-check the same target, foreground state, field identity, editability, secure status and selection. App identity alone is insufficient: two fields in one browser window are different targets. Any focus/selection change or ambiguous identity -> Review. Never bring an old window forward and paste silently.
3. Prefer an explicitly tested insertion/selection API per control family. AX/UI Automation do not imply a universal insert-at-caret operation. Do not replace an entire control value to simulate insertion, especially in rich editors.
4. Use a clipboard paste adapter only on the compatibility allowlist and with user-enabled clipboard fallback. Snapshot restorable formats, write plain text, dispatch the platform/app-specific paste action, and restore only if clipboard ownership/change number still matches our write. Windows exposes a clipboard sequence number for change detection. A fixed delay alone does not prove the target consumed the clipboard. Unsupported/delayed/large clipboard formats or unverifiable consumption -> explicit Copy/review, not a promise of perfect restoration. [Clipboard sequence number](https://learn.microsoft.com/en-us/windows/win32/api/winuser/nf-winuser-getclipboardsequencenumber)
5. Clipboard managers or cloud clipboard may observe temporary clipboard data. Restoration cannot retract those copies; disclose this when enabling the fallback. Do not use clipboard delivery in sensitive profiles. Never overwrite clipboard content copied by the user during processing.
6. Do not synthesize Enter/Return to submit a message or run a command. Terminals, shells and code consoles default to review/copy because pasted newlines can execute commands without an extra synthetic Enter. An advanced terminal adapter requires separate explicit opt-in, multiline review and tested bracketed-paste handling; it is not a launch requirement.
7. Selecting Pinyin does not imply active composition. The implementation probes the public macOS marked-text range and legacy Windows IMM composition where supported; modern Windows TSF composition support needs a dedicated TextEdit adapter. Idle input methods use guarded paste when their probe reports clear. If an IME composition is active or cannot be safely classified in a supported target, wait or use Review. Do not commit/cancel the user's composition to make room for dictation. Test Chinese Pinyin, Japanese and AltGr layouts; Unicode/emoji/grapheme handling must preserve text and selection.
8. Password/secure fields are blocked for automatic context and insertion. Windows exposes `IsPassword`, but missing/misreported accessibility metadata means no detector is universal. Denylisted apps and unknown fields use the conservative route. Do not defeat Secure Input, secure desktops, administrator boundaries or remote-session restrictions. [UI Automation properties](https://learn.microsoft.com/en-us/windows/win32/winauto/uiauto-automation-element-propids)

The UI says “Inserted” only with reliable adapter evidence. Otherwise it says “Text ready” or “Paste sent—check the target.” Keep a recoverable transcript per session policy; never silently repeat a dispatch that could have already succeeded. An atomic focus-check-plus-insert guarantee across arbitrary apps is impossible to establish from these APIs alone; race-window tests and conservative fallback remain necessary.

## 6. Overlay and screen inventory

Use a light, restrained visual style with readable text, generous spacing, system typography and native high-contrast adaptations. State labels accompany icons/color. Animation respects reduced-motion settings. VoiceOver/Narrator announce major state changes, not every audio meter update.

macOS: a small `NSPanel` with `nonactivatingPanel`; Windows: a top-level native overlay using `WS_EX_NOACTIVATE` and appropriate positioning without activation. These APIs offer nonactivation behavior; full-screen apps, Spaces/virtual desktops, multiple monitors, click interactions and screen readers require actual testing. Microsoft warns nonactivating windows should not be activated through assistive keyboard navigation, so provide a separate normal, keyboard-accessible control window opened intentionally. [Apple nonactivating panel](https://developer.apple.com/documentation/appkit/nswindow/stylemask-swift.struct/utilitywindow), [Windows extended styles](https://learn.microsoft.com/en-us/windows/win32/winmsg/extended-window-styles)

| Surface | Essential content and interactions | Focus policy |
|---|---|---|
| Onboarding | Explain two remote processing destinations; API setup; incremental permissions; microphone readiness; keyboard capture/conflicts; safe insertion test; privacy defaults | Normal focused window |
| Live overlay | Preparing/Recording/Transcribing/Cleaning/Ready/Error; actual mic, elapsed time, level; Stop/Cancel status; never display secrets | Does not activate; accessible alternative via explicit control window |
| Menu bar / tray | Start/Stop, cancel, last result, microphone, app mode, settings, pause shortcuts, quit | User-invoked menu; capture original target before opening where needed |
| Result review | Raw/cleaned comparison, edit, retry failed stage, Copy, explicit rebind-and-insert, discard, uncertain-delivery warning | Opens only on explicit interaction; passive ready indicator otherwise |
| History | Off state explanation; opt-in duration; search locally, copy, delete individual/all, export; no raw audio by default | Normal window |
| Dictionary and memory | Add term/pronunciation/correction, inspect provenance/scope, accept/reject suggestions, edit/delete/export; separate global and app scope | Normal window |
| App profiles | Mode: verbatim/minimal cleanup/style; insertion allowlist; context off/selected text; sensitivity/terminal rules; app identity | Normal window |
| Providers and settings | ASR adapter selection; MiMo configuration; separate text base URL/key/model; test results; shortcut/mic; retention; updates; sanitized diagnostics | Normal window; keys write-only/masked |

Menu-invoked dictation must not bind the menu itself as the destination. If the original target cannot be captured reliably, record to Review. UI language is a separate product decision; keep design strings as placeholders until chosen.

## 7. Privacy, memory and context

All items in this section are proposed defaults, not claims about vendor retention.

| Data | Default lifecycle | Optional behavior |
|---|---|---|
| Raw audio | In RAM until success/cancel/discard; failed-session retry buffer capped at 10 minutes and shown to user; no disk audio | Explicit user export; encrypted temporary disk spool only if a later feature needs it |
| Raw and cleaned transcript | Session-local until dismissed, or 10-minute failed-session recovery expiry | Local history opt-in; proposed 7-day default after opt-in, configurable and deletable |
| Dictionary | Explicitly added records persist locally | Selected applicable terms may be sent to provider only where supported and disclosed |
| Personalization memory | Off until enabled; explicit style preferences and accepted correction suggestions only | Local app-scoped rules with source/date and edit/delete; no covert monitoring of later typing |
| App context | Off; application identity for local routing only | Per-app selected-text/small-surrounding-text opt-in; per-session preview and bounded payload |
| Diagnostics | Error category, duration, OS/app version and anonymous local session identifier; no audio/text/key/window title | Explicit preview-and-export of sanitized diagnostics; telemetry separately opted in |
| Provider secrets | Native OS secret store references in config | No browser localStorage, plaintext logs, synced exports or command-line arguments |

Keep one user-facing settings store; credentials are protected references, history/memory are data stores rather than extra independent configuration entry points. Proposed at-rest protection uses a random application data key protected by the OS secret store; database/WAL/temp files, exports and crash reports require threat-model review. Local encryption does not protect text after insertion into another app and does not establish a provider's data policy.

User audio goes only to the selected ASR provider; raw transcript plus explicitly selected dictionary/style/context goes only to the selected cleanup endpoint. No hosted proxy, account or automatic cross-device sync is required for the initial BYOK design. Show both destinations before connection testing. A provider test must use synthetic text or an explicitly recorded sample, not private history. Reject credential-bearing redirects across origins; expose TLS/endpoint failures without printing secrets.

Memory retrieval is deterministic and bounded: exact dictionary matches and selected app-profile rules first; optional accepted correction pairs later. No embedding/vector store is needed initially. A correction suggestion must be user-confirmed, reversible and attributable. Do not infer personal facts, harvest clipboard contents, scrape entire windows or monitor all keystrokes. Document text is untrusted data, never an instruction capable of changing endpoints, reading secrets, invoking tools or broadening context access.

Meaning-preserving cleanup must retain names, numbers, negation, language switching and explicitly dictated formatting; unsupported confidence scores must not be invented. Preserve the raw transcript for comparison. An unsafe/empty/structurally invalid cleanup response routes to review/raw text rather than creating content. Provider-specific retention and regional processing remain external diligence questions in `providers.md`.

## 8. Packaging and update strategy

Release macOS and Windows installers together, under one compatibility matrix and release notes. Proposed initial targets are current supported macOS on Apple Silicon and Windows 11 x64; Intel Mac and Windows ARM64 are explicit scope decisions before implementation, not silently claimed. Phase zero must select exact minimum OS builds and CPU architectures from real test-hardware availability.

- macOS direct distribution: Developer ID signing, hardened runtime, required microphone declaration/entitlements, notarization and stapling; test on a clean nondevelopment Mac. App Store eligibility is not assumed. Apple distinguishes notarization from App Review. [Apple notarization](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution), [Packaging Mac software](https://developer.apple.com/documentation/xcode/packaging-mac-software-for-distribution)
- Windows direct distribution: choose a signed per-user installer and test standard-user install/uninstall, WebView runtime prerequisites, firewall/proxy environments and SmartScreen behavior; signing does not justify claiming every trust dialog disappears. MSIX is an alternative distribution track subject to packaging/API compatibility validation. Microsoft documents package signing separately. [MSIX signing](https://learn.microsoft.com/en-us/windows/msix/package/sign-app-package-using-signtool)
- If a future Tauri stack is selected, its updater requires signed update artifacts; this update signature is distinct from OS signing/notarization. For the selected Electron stack, design HTTPS feeds, channel/architecture matching, monotonic versions, staged rollout and key rotation/recovery. Install only when idle after explicit update choice; preserve settings with transactional schema migration and backup rollback. Do not downgrade data schemas blindly. [Tauri updater](https://v2.tauri.app/plugin/updater/)
- Keep bundle/application identity stable and test permission persistence across upgrades. Test interrupted downloads, tampered manifests/artifacts, restart, uninstall data-choice and failed migration. Signing credentials and release accounts are future authorized setup, not accessed in this research.

This is a native desktop product, not a long-running web service: no Docker runtime is proposed for the client. A local WebView settings UI satisfies the shared UI need without exposing an HTTP service. A future hosted service would need a separately scoped deployment design.

## 9. Feasibility spikes and simultaneous rollout

Indicative estimate, not a committed schedule: **10–14 calendar weeks with two dedicated platform-capable engineers, shared-core ownership and recurring QA/design support**, after provider access and signing prerequisites are available. Staffing, undocumented provider behavior and compatibility results can change it. One engineer should not use this estimate as a delivery commitment.

| Phase | Duration estimate | Both-platform exit evidence |
|---|---|---|
| 0: feasibility | 1–2 weeks | Physical key-event traces including Windows unavailable-Fn; no-activation overlay; real microphone capture/BT recovery; browser/editor insertion and race test; signed packaging skeleton. Decide minimum OS/architectures and native bridge viability |
| 1: vertical slice | 2–3 weeks | Tap start/stop -> real MiMo adapter -> raw transcript -> conservative delivery/review; cancellation, errors and secrets; same session fixtures on both OSs |
| 2: product baseline | 3–4 weeks | Configurable cleanup provider; meaning-preservation evaluation; complete screens; dictionary/explicit memory; privacy controls; accessibility; supported-app compatibility matrix |
| 3: paired beta | 2–3 weeks | Real users on both OSs; device/layout matrix; signed update/rollback; no unbounded logs/buffers; latency and failure data, with consent |
| 4: joint release | 1–2 weeks | Both platform matrices green, honest hardware exclusions, user docs, recovery/export paths and verified distribution artifacts |

If acceptance fails an Electron-specific integration, retain the domain contract and switch the affected integration to native; reassess schedule. If Windows Fn is unobservable, the outcome is a documented alternative binding, not an implementation bug to “solve” through unsupported interception. If simultaneous release cannot meet parity, reduce both platforms' optional scope rather than silently shipping macOS first.

## 10. Acceptance matrix

All measurements below are **proposed release gates, currently untested**. Run on each declared minimum/current OS build and each supported architecture. Record app/OS/keyboard/device versions with results. Latency budgets exclude unbounded provider/network time unless a fixed test environment is stated.

| Requirement | macOS execution | Windows execution | Measurable pass condition |
|---|---|---|---|
| Toggle semantics | Built-in Apple and external keyboard Fn; configurable chord | At least two OEM laptops plus external keyboard; observable Fn where present; Right Alt/chord fallback | 100 isolated start/stop cycles/device: exactly one start and one stop; 0 triggers from modifier chords/repeat; silent Fn absence reported |
| Layout conflicts | Input-source/Emoji/Dictation configured cases; Chinese IME | US + German/Polish AltGr + Chinese IME | 100 modified-character/shortcut cases per layout: 0 lost characters or unsolicited dictation; collision surfaced |
| Startup latency | Internal, USB and BT mic | Internal, USB and BT mic | Warm internal/USB p95 tap-release-to-ready <=300 ms target; BT <=1 s target or explicit readiness; no claim of captured pre-ready speech |
| Audio lifecycle | Device unplug, sleep/wake, permission revoke, default change | Same plus endpoint invalidation | No stuck recording; actual device shown; interrupted audio never silently blended; buffers remain bounded |
| No speech/VAD | Silence, fan/music and soft-speech corpus | Identical corpus | 0 provider calls for digital silence; >=95% intended speech retained in labeled initial corpus; publish noise false positives |
| Overlay/focus | Full-screen/Spaces/multiple monitors/scaling | Full-screen/virtual desktops/multiple monitors/DPI | 100 show/update/hide cycles: 0 foreground-target changes; controls reachable through explicit accessible window |
| Basic insertion | TextEdit, Safari/Chrome fields, tested rich editor and VS Code | Notepad, Edge/Chrome fields, tested rich editor and VS Code | >=99% exact insertion over 100 fixtures per supported control; no whole-document replacement; uncertain cases Review |
| Focus race | Switch app, browser field, caret/selection while processing | Same | 0 automatic writes to changed/unbound targets in 100 deliberate race cases; review always recoverable |
| Sensitive target | Secure fields and denylist | Password controls, elevated target, UAC/secure desktop | 0 automatic insertion/context collection in identified restricted cases; no elevation workaround; unknown fields conservatively reviewed |
| Clipboard | Text, image, mixed formats, user copies during pending paste | Same plus clipboard busy/delayed formats | 0 overwrites of newer user clipboard; restoration only on verified supported path; unsupported cases Copy/review |
| IME/terminal | Active Pinyin/Japanese composition and Terminal | Active Pinyin/Japanese composition, AltGr and Windows Terminal | 0 destructive composition resets; terminals never auto-submit, multiline defaults to review |
| Provider failures | Offline, TLS, 401, 429, 5xx, malformed/late response | Identical fixtures | Stage-specific recoverable state; no leaked keys; no automatic duplicate insertion; cancelled late results ignored |
| Cleanup fidelity | Shared multilingual/name/number/negation corpus | Same golden fixtures | 0 invented facts or altered critical numbers/negation in release safety corpus; raw result recoverable; wider accuracy reported separately |
| Processing latency | Fixed 10-second audio/network/provider test | Same environment | Measure ASR and cleanup separately; proposed stop-to-ready p95 <=5 s target, not a provider guarantee; >=30 runs/configuration |
| Retention/delete | History off, opt-in, expiry, cancel, app restart | Same | No audio/transcript artifacts after default expiry; delete removes DB/WAL/temp references; no content in diagnostics; export requires explicit action |
| Accessibility | VoiceOver, keyboard, reduced motion, contrast | Narrator, keyboard, high contrast, 200% scale | Entire onboarding/settings/review usable without pointer; states announced once; no color-only controls |
| Install/update | Clean signed/notarized install and upgrade | Clean signed standard-user install and upgrade | Tampered artifact rejected; idle-only update; failed migration recovers; uninstall offers explicit local-data removal choice |

Process-level memory/RSS, idle CPU, power usage and long-session thermal behavior must be measured in phase zero and beta before setting defensible hard resource budgets. Provider requests should be counted independently from UI success. Test documentation must distinguish mocked pipelines, real provider responses, synthetic OS events, visible insertion, signed installation and production release.

## 11. Open decisions and known unknowns

- Whether the exact required physical Fn UX is acceptable as hardware-dependent on Windows; software alone cannot promise an event the device never reports.
- Exact OS/architecture support; available Mac/Windows physical test devices and external keyboard/Bluetooth matrix.
- Active Fn filtering versus guided OS conflict configuration on supported Macs; event taps after lock/unlock and permission revocation.
- Electron overlay/COM lifecycle and accessibility quality; the helper compiles on macOS, but visible cross-app native acceptance remains pending.
- Per-control delivery confirmation and clipboard consumption/restoration reliability; no universal proof exists from a generic paste call.
- MiMo limits/protocol, request data retention and model output fidelity; use provider research rather than assuming compatibility.
- Vendor signing accounts/certificates, distribution channel and update-feed hosting; none accessed or changed.
- Product UI language and whether optional history/memory defaults are accepted. Core requirements do not depend on hidden context collection or always-on learning.
