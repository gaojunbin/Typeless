# Implementation and Validation Record

Current implementation: **0.1.3**, reviewed **2026-09-18**. This ledger separates source/build checks, observed runtime behavior, package verification and remaining acceptance. Historical receipts do not qualify a new implementation or artifact.

## Current behavior: copy first

Dictation can start from an application or the desktop without an editable input field. Application context is best effort; AX editor eligibility, original-target tokens and terminal exclusions are not recording prerequisites. Once text is ready, the application copies it to the clipboard and retains it there. Practice, text-only processing, disabled automatic paste and raw fallback after cleanup failure also copy their output.

When **完成后自动粘贴** is enabled for ordinary dictation, the native helper attempts the platform paste shortcut in the current foreground application. It does not restore an original window, caret or selection. If no field accepts the paste, or paste permission is unavailable, copying can still succeed and the user can paste manually. Production code does not restore previous clipboard content and has no empty/plain-text-only clipboard prerequisite. Clipboard ownership checks guard the optional paste, not recording.

The floating surface remains a 120 × 36 logical-pixel waveform/loading capsule inside a transparent, non-focusable 144 × 60 window. Successful copying and completion of the optional paste attempt dismiss it. No-input-field copying is not an error card. The main window distinguishes copied output from a dispatched paste shortcut; dispatch alone does not prove that an application accepted text. The app does not press Return/Enter or click Send. Receiving applications determine how pasted text is handled.

## Current 0.1.3 changes and acceptance

- **Three polishing levels:** one UI selector maps no polishing to `cleanup.enabled=false`, light to `enabled=true` plus `writing.strength=light`, and strong to `enabled=true` plus `strength=balanced`. New settings default to strong; existing saved preferences are not forcibly changed. There is no second visible enable switch.
- **Intent preservation:** light requests removal of fillers and small repetitions; strong also removes abandoned corrections and redundancy without inventing facts or turning uncertainty into an assertion. Ordinary dictation with no polishing preserves the transcript and sends no text-model request. Translation remains independent of the polishing enable flag and still requires a text model.
- **Prompt examples are not model acceptance:** reducing the user's example to “是谁来着” is a prompt example only. No live-model output, quality improvement or latency result is claimed from that example.
- **Fn availability:** the macOS implementation reports the event tap's actual enabled state, attempts recovery after disablement and preserves the configured binding when the helper restarts. Primary native and fallback shortcut availability are reported separately; a registered fallback no longer implies that Fn is working. The UI exposes both shortcut states and Input Monitoring permission. Accessibility may also authorize listening; a false Input Monitoring indicator alone does not establish Fn failure. The native tap-enabled result determines primary availability, and the home page links to shortcut settings when the configured primary is unavailable. These are implementation changes, not proof of physical-key acceptance.

| Scope | Current 0.1.3 status |
| --- | --- |
| TypeScript/source build | `npm run build` and TypeScript checking **passed** for 0.1.3. This does not establish packaged runtime behavior. |
| Automated regressions | `npm test`: **68 tests in 9 files passed**. Includes native-client failure/stopped/restart/hang regressions with controlled dependencies; no physical keyboard or live-provider claim. |
| macOS real event-tap synthetic input | **Passed:** [shortcut receipt](../.local/shortcut-validation/result.json). Injected `CGEvent flagsChanged`, key code 63, through the session tap: isolated Fn produced 1 activation, Fn+Shift produced 0, rapid double tap produced 1. `physicalKeyboardTested=false`; this is not physical Fn acceptance. |
| macOS tap health/recovery | **Passed:** [health receipt](../.local/shortcut-validation/health.json). Detected disabled/invalid taps, recovered/recreated them, and disabled/re-enabled the binding. `postedEvents=0`; health checks did not inject key events. |
| Native production self-tests | `native/bin/typeless-native --self-test` **passed**. |
| Windows helper compilation | C# 5/.NET Framework 4.8 compilation **passed with 0 errors and 0 warnings**; Windows runtime remains untested. |
| Desktop settings integration | **Passed: 14 groups, 7 mock HTTP requests**, isolated `.local/desktop-e2e-IGzIvE`. Real UI selection/save of all three levels, original text without HTTP in no-polish mode, separate shortcut status and strong after restart passed. [Writing settings](screenshots/writing-settings.png) and [shortcut settings](screenshots/shortcut-settings.png) were visually checked. Fake audio, loopback providers and test-only encryption do not establish live inference or OS credential-store behavior. |
| Copy-first delivery integration | **Passed:** [development receipt](../.local/delivery-e2e-Z6TETx/result.json). No-input-field recording retained copied text and hid the overlay; textarea/contenteditable actual DOM and model values matched, with one input event each, no Enter/submit or main focus event, and retained clipboard output. This uses fake audio and mock providers. |
| macOS and Windows artifacts | Both 0.1.3 package builds and integrity inspections **passed**; see the current artifact ledger below. Windows runtime remains untested. |
| Mounted macOS 0.1.3 runtime | **Passed:** [mounted-app receipt](../.local/delivery-e2e-asXhii/result.json). No-input-field copy and textarea/contenteditable actual DOM/model acceptance passed, with one input event each, no Enter/submit or main focus event, retained clipboard output and overlay dismissal. Test cleanup restored the original clipboard; production retention was asserted before cleanup. The image was detached. |
| Installed application/user configuration | Not inspected or established. No current installation/configuration conclusion is drawn; commercial Typeless private data was not read. |

Physical Fn, live ASR, live-model polishing and Windows runtime remain untested in this acceptance round. Current-build copy-first regression receipts are recorded above; they do not replace these untested acceptance scopes.

## Current 0.1.3 artifact ledger

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| [macOS arm64 DMG](../release/Typeless-0.1.3-arm64.dmg) | 131,034,787 | `f49f4cf5934b70c47cf657679c518471caa4cb0558759cfdbe54308b6555e194` |
| [Windows x64 portable ZIP](../release/Typeless-0.1.3-win.zip) | 157,564,061 | `f12f0d5087ce7f0e181c8ccc7db6fe0406c17293976ba58a3273a6ff379a194c` |

Both package commands passed. The DMG passed `hdiutil verify`, read-only mounting and mounted-app `codesign --verify --deep --strict`. Its `Applications` link points to `/Applications`; the declared minimum macOS version is 13.0. Source-built, unpacked and mounted helpers share UUID `20692AF1-EF68-3EC3-A489-D68F00254486`. The image was detached after runtime acceptance.

The unpacked macOS, mounted macOS and unpacked Windows archives each report version 0.1.3 and match all five source-built assets byte for byte: main, preload, HTML, renderer JavaScript and CSS. Mounted and unpacked macOS `app.asar` archives match exactly. The Windows ZIP passed CRC inspection, contains `Typeless.exe`, and its `app.asar` matches the unpacked archive; packaged `Helper.cs` matches source.

These are package integrity and the stated macOS runtime checks, not Developer ID signing, notarization, physical Fn, live-model polishing, Windows execution or minimum-OS runtime qualification. Windows is unsigned and no current NSIS installer acceptance is claimed. [artifacts.json](../release/artifacts.json) contains release metadata.

## Reproduce source and helper checks

From the checkout, with locked npm dependencies and required host tools already installed:

```sh
cd /Users/junbingao/github/Typeless
npm run typecheck
npm test
npm run build
native/bin/typeless-native --self-test
npm run verify:windows
```

`npm run build` writes `dist/`, `dist-electron/` and the host-native output. Swift compilation requires macOS Command Line Tools. Windows helper verification requires an optional .NET SDK under `.cache/dotnet` or on `PATH`; this SDK is not needed for normal Windows portable-app use. These commands require no provider credentials.

The following macOS helper smoke check reads status/context, disables the shortcut in this temporary helper and stops it. It does not record audio, inspect an input field or dispatch a paste:

```sh
cd /Users/junbingao/github/Typeless
printf '%s\n' \
  '{"id":"1","method":"status","params":{}}' \
  '{"id":"2","method":"context","params":{}}' \
  '{"id":"3","method":"configureShortcut","params":{"binding":"disabled"}}' \
  '{"id":"4","method":"stop","params":{}}' \
  | native/bin/typeless-native
```

Expect JSONL responses with status, the foreground application label, shortcut configuration and termination. `context` does not establish an editable field or successful paste. See [native/PROTOCOL.md](../native/PROTOCOL.md) for the current paste request and permission boundaries. The removed `validateTarget` and `insertText` protocol is not a current reproducer.

## Reproduce Electron integration

```sh
cd /Users/junbingao/github/Typeless
npm run build
npm run test:desktop
npm run test:delivery
```

`test:desktop` uses an isolated `.local/desktop-e2e-*` profile, fake audio, fake keys, test-only credential encryption and loopback HTTP responses. It exercises real Electron IPC and HTTP transport, including translation, cancellation, settings redaction and restart persistence. A passing receipt does not establish real Keychain/Credential Manager encryption, microphone hardware or live ASR.

`test:delivery` uses a separate disposable Electron target. Its no-input-field scenario must still record, complete mock HTTP processing, retain the result on the clipboard and hide the capsule. Textarea and contenteditable scenarios additionally inspect actual contents and input-event-driven model updates. Native paste permission is required only for the actual dispatch acceptance scope; missing permission is reported as blocked rather than a recording prerequisite. Neither script grants system permissions or sends a real message.

The scripts preserve original clipboard content only in test memory and perform ownership/content-guarded cleanup. They must not save real clipboard contents in receipts or logs. This cleanup is independent of the production rule that completed text remains on the clipboard. Script deadlines bound test cleanup; a forced process termination is not a successful cleanup receipt.

Both harnesses use the application action invoked by the global shortcut; neither physically presses Fn. Fake audio and HTTP output are not a speech-recognition benchmark. Use each run's final result rather than the existence of a screenshot as the pass criterion.

After building a package, the desktop harness can target its executable:

```sh
cd /Users/junbingao/github/Typeless
TYPELESS_EXECUTABLE="/Users/junbingao/github/Typeless/release/mac-arm64/Typeless.app/Contents/MacOS/Typeless" node tests/desktop.e2e.mjs
```

## Package verification commands

```sh
cd /Users/junbingao/github/Typeless
npm run package:mac
hdiutil verify "release/Typeless-0.1.3-arm64.dmg"
codesign --verify --deep --strict --verbose=2 "release/mac-arm64/Typeless.app"
npm run package:win
unzip -t "release/Typeless-0.1.3-win.zip"
shasum -a 256 "release/Typeless-0.1.3-arm64.dmg" "release/Typeless-0.1.3-win.zip"
```

These commands perform current-version package checks; until receipts are recorded, they are instructions rather than passing results. Rebuilt artifacts require fresh version, asset and runtime checks; use a read-only mounted image for packaged macOS runtime acceptance. A valid ad-hoc signature does not establish notarization. For Windows, extract the entire portable ZIP; its companion files are required.

## Remaining acceptance and limits

- Physical Fn/Right Alt/AltGr behavior, microphone hardware/Bluetooth, OS permission grant/revocation and real credential-store behavior remain separate from fake-device tests.
- No live MiMo/OpenAI-compatible inference, billing, measured recognition accuracy, real provider latency or service SLA is established. Model-list connectivity alone does not prove inference access.
- Sublime and Terminal receipts qualify their specific synthetic native-paste cases. They do not qualify every editor, input method, protected application, elevated Windows process, display configuration or OS version.
- Windows runtime, PowerShell startup, actual clipboard formats, keyboard hooks and paste acceptance remain untested. C# compilation is not a Windows runtime result.
- Recording defaults to 60 seconds, configurable up to 120. Long-recording chunk stitching and real-time audio streaming are not implemented.
- Clipboard contents are intentionally replaced by completed dictation. Another application's later clipboard write is outside this app's ownership; paste checks must not turn that change into permission to restore older data.
- Current-foreground paste can go to a different application if the user switches while processing. This is the requested behavior, not original-target tracking. The app does not press Return/Enter, but recipients control their own handling of pasted text.
- Cancellation fences pending work; it cannot recall an already dispatched input event or an API request already accepted by a provider. Exactly-once provider billing is not claimed.
- Lock/suspend behavior, login startup, multiple monitors/fullscreen and screen-reader navigation require explicit runtime acceptance. No app-store submission, public release or automatic update service is claimed.

## Historical 0.1.0 and 0.1.1 receipts

These records concern superseded implementations and artifacts. They are retained for provenance only and **do not validate 0.1.3**.

- **0.1.0:** the monochrome main-window redesign, four settings tabs and collapsed secondary controls were visually checked. Automated tests reported 22 tests in 5 files. Mounted-app mock integration reported 11 groups and 7 local HTTP requests (`.local/desktop-e2e-iqK8N9`); the separate settings UI receipt is `.local/settings-ui-result.json`. Earlier package integrity and ad-hoc signature checks applied to that version.
- **0.1.1:** the original-target/AX eligibility implementation reported 41 tests in 7 files. Disposable Electron editor checks passed in `.local/delivery-e2e-Yu1ZtR/result.json` and the mounted-DMG run `.local/delivery-e2e-iIi73I/result.json`. That implementation restored staged clipboard content and restricted target eligibility; **both policies were replaced by copy-first behavior**. Its helper UUID, hashes, Cocoa target-token tests and clipboard-restoration receipts are not current acceptance evidence.

## Historical 0.1.2 receipts

The following full copy-first acceptance record concerns 0.1.2 only. It does not validate the 0.1.3 source, packages, Fn recovery or polishing changes. Historical release files and local receipts may have been superseded.

### Historical 0.1.2 executed checks

| Check | Observed result | Evidence boundary |
| --- | --- | --- |
| TypeScript and build | `npm run build` passed. | Source checking and renderer/Electron/native build; not release-package acceptance. |
| Automated regressions | `npm test`: **47 tests in 7 files** passed. | Includes the copy-first session and delivery behavior using controlled dependencies; not live-provider quality. |
| macOS native build and self-tests | Compilation and native self-tests passed. | Shortcut recognition and paste request cancellation/deduplication checks; not physical Fn input. |
| Windows helper compilation | `npm run verify:windows`: **0 errors, 0 warnings** against .NET Framework 4.8 references with C# 5. | Cross-compilation on macOS; no Windows process, shortcut or paste runtime acceptance. |
| Sublime Text native paste | Saved file exactly matched the synthetic Chinese/English text, **46 UTF-8 bytes**. | Actual native system paste and saved contents; direct helper test, not recording or ASR. See the partial-run qualification below. |
| Terminal native paste | Dedicated raw reader received the exact **46 bytes**, with no Return. | Actual native system paste into a disposable reader; pasted content was not executed by a shell. |
| 0.1.2 Electron delivery integration | **Passed**, [development receipt](../.local/delivery-e2e-8pOa06/result.json). | No-input-field recording completed both mock HTTP stages, retained copied text and hid the capsule. Textarea and contenteditable contents/model values matched, with one input event each, no submit or main-window focus event, retained clipboard output and overlay dismissal. Target accessibility was not explicitly enabled. |
| 0.1.2 desktop integration | **Passed: 11 check groups, 7 mock HTTP requests**, isolated profile `.local/desktop-e2e-pN1o73`. | Includes restart persistence. Audio, provider responses and credential encryption are test doubles; the test-only clipboard cleanup does not change production retention. |
| 0.1.2 packages | Both package builds and integrity inspections passed. | Version and all five application assets match the source build across macOS unpacked/mounted and Windows unpacked archives; see the artifact ledger. |
| Mounted 0.1.2 DMG runtime | **Passed**, [mounted-app delivery receipt](../.local/delivery-e2e-n7iyxr/result.json). | No-input recording/copy and both actual editor paste scenarios passed, including input events, retained clipboard output, no Enter/submit, no main-window focus theft and overlay dismissal. The read-only image was detached afterward. |

The development delivery receipt separately records test cleanup as `clipboardRecovery: restored`; production retention was asserted before that cleanup. [Recording](../.local/delivery-e2e-8pOa06/recording.png), [processing](../.local/delivery-e2e-8pOa06/processing.png) and [disposable target contents](../.local/delivery-e2e-8pOa06/target-final.png) belong to that run.

### Historical 0.1.2 native application evidence

The synthetic text was `Typeless synthetic paste: 中文输入 abc 123`.

- [Sublime partial-run receipt](../.local/tests/native-app-paste-9ne51wqc/result.json) and [saved synthetic file](../.local/tests/native-app-paste-9ne51wqc/sublime-synthetic.txt): the Sublime step passed with exact saved contents. The combined run ended with `ok: false` because the subsequent Terminal foreground assertion expected the English application name. That run **did not paste into Terminal** and is not an overall passing receipt.
- [Terminal-only passing receipt](../.local/tests/native-app-paste-fdrwq9fa/result.json) and [reader result](../.local/tests/native-app-paste-fdrwq9fa/terminal-reader.json): the localized application name was `终端`; the reader reported `matched: true`, `byteCount: 46`, `containsReturn: false`. Native dispatch and observed receiver bytes are separate pieces of evidence.

Both runs restored the original clipboard as **test cleanup only**. That behavior is not part of production delivery. These runs used synthetic text and existing permissions; they did not evaluate a microphone, a model API, physical Fn, arbitrary applications or Windows.

### Historical 0.1.2 artifact ledger

| Target | Verified 0.1.2 artifact | Recorded status |
| --- | --- | --- |
| macOS arm64 | [Typeless-0.1.2-arm64.dmg](../release/Typeless-0.1.2-arm64.dmg) | `npm run package:mac`, image checksum, read-only mount, strict/deep signature integrity and mounted-app delivery E2E passed. `Applications` points to `/Applications`. The image was detached. |
| macOS unpacked app | `release/mac-arm64/Typeless.app` | Version 0.1.2. Its app archive matches the mounted archive exactly; all five source-built assets match. |
| Windows x64 portable | [Typeless-0.1.2-win.zip](../release/Typeless-0.1.2-win.zip) | `npm run package:win`, ZIP CRC and `Typeless.exe` presence passed. ZIP `app.asar` matches the unpacked archive, and packaged helper source matches then-built `Helper.cs`. Windows runtime remains untested. |
| Windows NSIS installer | No completed current artifact | A compatible installer build host remains necessary; do not present intermediate archives as installers. |

Verified package sizes and SHA-256 hashes:

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| macOS arm64 DMG | 131,035,605 | `316397ed6b109a90a771ce585769836a585899aa6e141bd0ddcaf4ddcde32f2a` |
| Windows x64 ZIP | 157,555,770 | `31226f68e4919f2b653d60c58426ac2ae3a122768916b50b2d7cf5adaecd9ff7` |

Source-built, unpacked and mounted macOS helpers share UUID `6A487EBA-3111-3E63-BEC9-A7C7CBE0678C`; the declared minimum macOS version is 13.0. This is deployment-header consistency, not execution testing on macOS 13. The mounted app passed `codesign --verify --deep --strict`. The macOS unpacked, macOS mounted and Windows unpacked `app.asar` archives each report version 0.1.2 and match all five 0.1.2 application assets byte for byte: main, preload, HTML, renderer JavaScript and CSS.

The mounted-app receipt also reports `clipboardRecovery: restored` for test cleanup only. Production retention was independently asserted before cleanup. The recorded hashes above identify these historical artifacts; the mutable release manifest may describe a later build.

The macOS distribution uses ad-hoc signing, without Developer ID signing or notarization. Windows is unsigned. Signature structure, Gatekeeper acceptance, normal installation and public distribution are distinct checks. Intel Mac, Windows ARM64 and a minimum-OS runtime matrix remain unqualified.
