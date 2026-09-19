# Version 2.0.0 Validation

Reviewed on 2026-09-18. This record covers the 2.0.0 packages of the dictation product with the redesigned interface: the two-column shell specified in [UI design](UI_DESIGN.md) (**首页**, **AI 配置**, **基本设置**, **表达风格**), grouped setting rows, and the black voice capsule. Recording, ASR, optional polishing, retained clipboard output and optional paste into the current foreground application are unchanged from 0.1.5. Historical receipts for earlier versions remain in Git and do not qualify this version.

## Current evidence

| Check | Result and scope |
| --- | --- |
| Source and build | `npm run typecheck` clean; both package commands completed their build, typecheck and bundling steps. |
| Automated regressions | `npm test`: **90 tests in 10 files passed**. `native/bin/typeless-native --self-test` passed. `npm run verify:windows` compiled the helper with zero warnings and zero errors (compile check only). |
| Development desktop integration | `npm run test:desktop` on the final source: **28 checks passed with 4 mock HTTP requests**, receipt [`.local/desktop-e2e-HVWQST/result.json`](../.local/desktop-e2e-HVWQST/result.json). Selectors follow the sidebar shell (`nav[aria-label="主导航"]`, four tabs, 880 × 600 minimum window across all four pages); no behavioral assertion was removed, and two were added (an unconfigured launch opens **AI 配置**; the result card is visible on **首页**). |
| Development delivery | `npm run test:delivery` on the final source: **5 scenarios passed**, clipboard restored, receipt [`.local/delivery-e2e-EbI8nt/result.json`](../.local/delivery-e2e-EbI8nt/result.json). |
| Mounted macOS delivery | Application launched from the read-only mounted 2.0.0 DMG: **5 scenarios passed**, receipt [`.local/delivery-e2e-6KuFVi/result.json`](../.local/delivery-e2e-6KuFVi/result.json). No-input recording retained copied output; real native paste into the disposable textarea and contenteditable matched their contents with one input event each, no submit, no Enter and no main-window focus; the textarea run finished from the capsule confirm control; explicit original-text copy made one clipboard write; processing cancellation from the capsule fenced the late response; clipboard cleanup restored the original. |
| Mounted macOS settings integration | Same mounted application: **28 checks passed with 4 mock HTTP requests**, receipt [`.local/desktop-e2e-32gsl7/result.json`](../.local/desktop-e2e-32gsl7/result.json). Covers the sidebar shell, unconfigured launch on **AI 配置**, original/result views and copy feedback, no-speech recovery, error-capsule navigation, inactive personal instructions, autosave, atomic credentials, provider-draft retention across pages, cancellation and restart persistence. |
| Regression found and fixed during verification | Unsaved **AI 配置** edits were lost when switching pages because pages now unmount; drafts are retained in module scope and restored on return. A dictation error now switches the window to **首页**, where the recovery alert lives. The sidebar footer wraps long fallback chords instead of clipping the status badge. |
| Visual inspection | Screenshots below come from the passing development runs at 1000 × 750 and were compared against the official Typeless 2.0 assets catalogued in `docs/research/ui-official-*.md`. |
| Final packages | Both 2.0.0 packages built and passed integrity checks; the mounted macOS runtime passed as recorded above; Windows runtime remains untested. |

Current screenshots (fake audio and mock providers): [首页 with result](screenshots/dictation-result.png), [原文 view](screenshots/dictation-original.png), [recovery alert](screenshots/dictation-recovery.png), [AI 配置](screenshots/settings-ai.png), [基本设置](screenshots/settings-basic.png), [表达风格 in the 不润色 state](screenshots/settings-style.png), [capsule recording](screenshots/voice-recording.png), [capsule controls](screenshots/voice-recording-controls.png), [capsule processing](screenshots/voice-processing.png), [processing with cancel](screenshots/voice-processing-controls.png), [delivery target](screenshots/delivery-target.png).

Production keeps completed dictation on the clipboard. Optional native paste sends the platform paste shortcut to the current foreground application; it does not capture an original field or require an editable role. Dispatch is not proof of acceptance by arbitrary applications. No Return/Enter is sent. Tests restore the original clipboard only during ownership-guarded cleanup. Existing preferences and encrypted keys from 0.1.5 remain readable; the settings schema did not change.

## Artifact ledger

| Artifact | Status | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| [macOS arm64 DMG](../release/Typeless-2.0.0-arm64.dmg) | Verified | 131,023,160 | `18aa95dfff62613c911e2c220b6e7119b77e2e3e4626f89086ab5cc98ffa8faa` |
| [Windows x64 portable ZIP](../release/Typeless-2.0.0-win.zip) | Integrity verified | 157,559,801 | `42a82189419a06f235bf28ef37e457a222ed351eaed7aea0c877f00c382176e7` |

The DMG passed `hdiutil verify`, read-only mounting and `codesign --verify --deep --strict` on both the unpacked and the mounted application. Its Applications link targets `/Applications`, its bundle reports version 2.0.0 and a minimum macOS of 13.0, and its `app.asar` is byte-identical between the unpacked and mounted copies. The bundled native helper shares UUID `20692AF1-EF68-3EC3-A489-D68F00254486` with the source build. The image was ejected after the runtime checks.

The Windows ZIP passed `unzip -t`; `Typeless.exe` is present with no embedded Authenticode certificate (security directory size 0); `resources/native/windows/Helper.cs` matches the source file's SHA-256, `launch.ps1` ships beside it, and `resources/app.asar` is byte-identical to the macOS bundle's. macOS is ad-hoc signed without Developer ID or notarization. Windows is unsigned. [Release metadata](../release/artifacts.json) records the final artifacts and acceptance boundaries.

## Reproduce

Run from the checkout with npm dependencies and host build tools installed. No real provider credentials are needed.

```sh
cd /Users/junbingao/github/Typeless
npm run typecheck
npm test
npm run build
native/bin/typeless-native --self-test
npm run verify:windows
npm run test:desktop
npm run test:delivery
```

Both Electron harnesses create isolated `.local/` profiles and use fake audio, mock loopback providers, synthetic keys and test-only credential encryption. They use real Electron IPC; the delivery harness additionally uses real native paste into its own disposable editor. Run GUI checks serially, with the desktop available. They do not grant OS permissions or send real messages.

```sh
cd /Users/junbingao/github/Typeless
npm run package:mac
npm run package:win
hdiutil verify release/Typeless-2.0.0-arm64.dmg
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Typeless.app
unzip -t release/Typeless-2.0.0-win.zip
shasum -a 256 release/Typeless-2.0.0-arm64.dmg release/Typeless-2.0.0-win.zip
mkdir -p .cache/dmg-acceptance
hdiutil attach -readonly -nobrowse -mountpoint .cache/dmg-acceptance release/Typeless-2.0.0-arm64.dmg
codesign --verify --deep --strict --verbose=2 .cache/dmg-acceptance/Typeless.app
TYPELESS_EXECUTABLE="/Users/junbingao/github/Typeless/.cache/dmg-acceptance/Typeless.app/Contents/MacOS/Typeless" npm run test:desktop
TYPELESS_EXECUTABLE="/Users/junbingao/github/Typeless/.cache/dmg-acceptance/Typeless.app/Contents/MacOS/Typeless" npm run test:delivery
hdiutil detach .cache/dmg-acceptance
```

Any rebuilt artifact requires fresh version, integrity and runtime checks. Detach the image after its runtime process exits; a first detach can report the disk as busy while Electron is still shutting down.

## Limits

- Physical Fn/Right Alt, real microphone and Bluetooth capture, permission grant/revocation, and actual Keychain/Credential Manager encryption are not established by these mock tests.
- No live ASR or polishing quality, latency, billing or provider availability is measured. Prompt examples are not model-quality results.
- Windows runtime, keyboard hooks, portable-app startup, the Windows window frame and real paste acceptance remain untested. Minimum-supported macOS runtime, other editors, input methods and multi-monitor/fullscreen behavior remain separate acceptance work.
- Visual fidelity was judged against public official screenshots and demo videos, not against a running copy of the commercial application; dark mode is not implemented.
- Current-foreground paste can reach a different application if the user switches while processing. Receiving applications decide how pasted content behaves. Clipboard ownership checks can stop paste if another application replaces the clipboard.
- Cancellation cannot recall an already dispatched key event or an API request already accepted by a provider. No exactly-once billing, public release, notarization or automatic-update service is claimed.
