# Version 0.1.5 Validation

Reviewed on 2026-09-18. This record covers the simplified dictation product: recording, ASR, optional polishing, retained clipboard output and optional paste into the current foreground application. The interface contains AI configuration, basic settings and writing style. Historical receipts remain in Git and do not qualify this version.

## Current evidence

| Check | Result and scope |
| --- | --- |
| Source and build | Final macOS and Windows package commands each completed their build/typecheck steps. |
| Automated regressions | `npm test`: **90 tests in 10 files passed**. |
| Mounted macOS delivery | [Final-artifact receipt](../.local/delivery-e2e-0WRQ7N/result.json): **all 5 scenarios passed**. No-input recording retained copied output. Real native paste into disposable textarea/contenteditable controls matched their contents and input-driven models, with one input event each, no submit and no main-window focus event. The textarea run finished through the hover button. Original-text copying made one clipboard write, no editor changes and retained the edited result. Processing cancellation fenced the late response, with no clipboard/editor changes. Overlay dismissal and clipboard cleanup passed. |
| Mounted macOS settings integration | [Final-artifact receipt](../.local/desktop-e2e-oT9nxx/result.json): **27 checks passed with 4 mock HTTP requests**. Covers direct setup navigation, original/result view and copy feedback, no-speech recovery, error-capsule navigation, inactive personal instructions, autosave, credentials, cancellation and restart persistence. |
| Visual inspection | Development captures were inspected for main/minimum layouts, error recovery, original/result views, no-polishing state and capsule hover controls. Final mounted main-panel and hover-control captures were also inspected; current screenshots come from the final mounted application. |
| Final packages | Both 0.1.5 packages built and passed integrity checks. Mounted macOS runtime passed as recorded above; Windows runtime remains untested. |

Native `--self-test` passed. `npm run verify:windows` cross-compilation passed with zero warnings and zero errors; this is not Windows runtime acceptance. Earlier development GUI runs preceded the final copy/paste wording correction; the mounted receipts above qualify the final assets instead.

Current screenshots: [AI configuration](screenshots/settings-ai.png), [basic settings](screenshots/settings-basic.png), [writing style](screenshots/settings-style.png), [edited result](screenshots/dictation-result.png), [original text](screenshots/dictation-original.png), [recovery](screenshots/dictation-recovery.png), [recording controls](screenshots/voice-recording-controls.png) and [processing controls](screenshots/voice-processing-controls.png).

Production keeps completed dictation on the clipboard. Optional native paste sends the platform paste shortcut to the current foreground application; it does not capture an original field or require an editable role. Dispatch is not proof of acceptance by arbitrary applications. No Return/Enter is sent. Tests restore the original clipboard only during ownership-guarded cleanup; they keep that original content in memory, not receipts.

Existing known preferences and encrypted keys remain readable. Unknown stored fields are preserved as opaque data but excluded from runtime snapshots and model prompts. No new history is collected. The current session supports explicit recovery; consumed or uncertain paste attempts are not automatically replayed.

## Artifact ledger

| Artifact | Status | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| [macOS arm64 DMG](../release/Typeless-0.1.5-arm64.dmg) | Verified | 131,043,151 | `fa9ec827e4600178c10ace4ca04483547298e3e22573de04de926a492171926e` |
| [Windows x64 portable ZIP](../release/Typeless-0.1.5-win.zip) | Integrity verified | 157,552,991 | `4fde9166a87fef1347fe3a7de6bad09a8f3abf2d088f1af412272e88c7f7cbcb` |

The DMG passed `hdiutil verify`, read-only mounting and `codesign --verify --deep --strict`. Its Applications link targets `/Applications`, and its declared minimum macOS version is 13.0. The image was normally ejected after runtime checks.

The [integrity receipt](../.local/package-integrity.json) reports `ok=true`: five source-built application assets match the unpacked macOS, mounted macOS and Windows archives; all report version 0.1.5. Mounted and unpacked macOS archives match. Source-built, unpacked and mounted native helpers share UUID `20692AF1-EF68-3EC3-A489-D68F00254486`. Windows ZIP CRC passed, its archive matches the unpacked archive, its helper source matches source, and the x64 executable is present with no embedded Authenticode certificate.

macOS is ad-hoc signed without Developer ID or notarization. Windows is unsigned. [Release metadata](../release/artifacts.json) records the final artifacts and acceptance boundaries.

## Reproduce

Run from the checkout with npm dependencies and host build tools installed. No real provider credentials are needed for these checks.

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

The native executable/self-test requires macOS. Windows cross-compilation requires the project-local or installed .NET SDK; compilation does not execute the Windows helper. Both Electron harnesses create isolated `.local/` profiles and use fake audio, mock loopback providers, synthetic keys and test-only credential encryption. They use real Electron IPC; the delivery harness additionally uses real native paste into its own disposable editor. Run GUI checks serially, with the desktop available. They do not grant OS permissions or send real messages.

```sh
cd /Users/junbingao/github/Typeless
npm run package:mac
npm run package:win
hdiutil verify release/Typeless-0.1.5-arm64.dmg
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Typeless.app
unzip -t release/Typeless-0.1.5-win.zip
shasum -a 256 release/Typeless-0.1.5-arm64.dmg release/Typeless-0.1.5-win.zip
mkdir -p .cache/dmg-acceptance
hdiutil attach -readonly -nobrowse -mountpoint .cache/dmg-acceptance release/Typeless-0.1.5-arm64.dmg
codesign --verify --deep --strict --verbose=2 .cache/dmg-acceptance/Typeless.app
TYPELESS_EXECUTABLE="/Users/junbingao/github/Typeless/.cache/dmg-acceptance/Typeless.app/Contents/MacOS/Typeless" npm run test:desktop
TYPELESS_EXECUTABLE="/Users/junbingao/github/Typeless/.cache/dmg-acceptance/Typeless.app/Contents/MacOS/Typeless" npm run test:delivery
hdiutil detach .cache/dmg-acceptance
```

These commands reproduce the recorded checks. Any rebuilt artifact requires fresh version, source-asset, integrity and runtime checks. Detach the image after its runtime process exits.

## Limits

- Physical Fn/Right Alt, real microphone and Bluetooth capture, permission grant/revocation, and actual Keychain/Credential Manager encryption are not established by these mock tests.
- No live ASR or polishing quality, latency, billing or provider availability is measured. Prompt examples are not model-quality results.
- Windows runtime, keyboard hooks, portable-app startup and real paste acceptance remain untested. Minimum-supported macOS runtime, other editors, input methods and multi-monitor/fullscreen behavior remain separate acceptance work.
- Current-foreground paste can reach a different application if the user switches while processing. Receiving applications decide how pasted content behaves. Clipboard ownership checks can stop paste if another application replaces the clipboard.
- Cancellation cannot recall an already dispatched key event or an API request already accepted by a provider. No exactly-once billing, public release, notarization or automatic-update service is claimed.
