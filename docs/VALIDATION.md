# Version 2.1.0 Validation

Reviewed on 2026-09-18 for 2.0.0 and revised on 2026-09-22 for the 2.1.0 packages, which add the first-run setup guide and the stale-tap helper recovery recorded below. The 2.0.0 evidence in this section is kept because the interface it qualifies is unchanged; the packaged 2.1.0 runs follow. This record covers the dictation product with the redesigned interface: the two-column shell specified in [UI design](UI_DESIGN.md) (**首页**, **AI 配置**, **基本设置**, **表达风格**), grouped setting rows, and the black voice capsule. Recording, ASR, optional polishing, retained clipboard output and optional paste into the current foreground application are unchanged from 0.1.5. Historical receipts for earlier versions remain in Git and do not qualify this version.

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

Production keeps completed dictation on the clipboard. Optional native paste sends the platform paste shortcut to the current foreground application; it does not capture an original field or require an editable role. Dispatch is not proof of acceptance by arbitrary applications. No Return/Enter is sent. Tests restore the original clipboard only during ownership-guarded cleanup. Existing preferences and encrypted keys from 0.1.5 remain readable; the settings schema did not change at 2.0.0. The setup-guide change recorded below adds one field, `general.setupCompleted`.

## First-run setup guide (2026-09-21)

Executed on 2026-09-21 against the source, then repeated on 2026-09-22 from the mounted 2.1.0 DMG (see the packaged rows in this table). The guide is specified in [UI design](UI_DESIGN.md) section 12: while `settings.general.setupCompleted` is `false`, a four-step walk (**权限**, **麦克风**, **快捷键**, **完成**) replaces the shell and the main process counts shortcut presses instead of starting dictation.

| Check | Result and scope |
| --- | --- |
| Source and build | `npm run typecheck` clean. `npm run build` completed its native, typecheck, Vite and esbuild steps; it was re-run immediately before each Electron suite. |
| Automated regressions | `npm test`: **96 tests in 10 files passed** (90 before this change). `native/bin/typeless-native --self-test` passed, returning `{"passed":true,"selfTest":"shortcut-and-paste-policy"}`. |
| Desktop integration | `npm run test:desktop` on a fresh profile: **35 checks passed with 4 mock HTTP requests**, receipt [`.local/desktop-e2e-MVSwDO/result.json`](../.local/desktop-e2e-MVSwDO/result.json). Seven checks are new: `setup-guide-fresh-launch`, `setup-permissions-skip`, `setup-microphone-meter`, `setup-shortcut-step`, `setup-done-opens-ai`, `setup-rerun-and-skip`, `restart-skips-setup`. The walk asserts that no 主导航 tablist exists while the guide is up, that the 权限 step lists exactly the two macOS cards (`microphone`, `accessibility`) with a live `role="progressbar"`, that the 麦克风 step renders its device `select` and 15 meter bars and reaches **已检测到声音** from the fake device, that 快捷键 reports no detection without a press, and that **去连接 AI 服务** lands on **AI 配置** with `setupCompleted === true`. Rerunning the guide from **基本设置** and choosing **跳过向导** returns to the shell, and the restart stage confirms the persisted flag skips the guide. No existing assertion was removed. The suite was run twice with the same result; the second receipt is [`.local/desktop-e2e-5FhM8E/result.json`](../.local/desktop-e2e-5FhM8E/result.json), and the screenshots below come from the first run. |
| Delivery | `npm run test:delivery`: **5 scenarios passed with 7 mock HTTP requests**, clipboard restored, receipt [`.local/delivery-e2e-ZeiJJn/result.json`](../.local/delivery-e2e-ZeiJJn/result.json). The harness seeds `<data root>/settings/state.json` with `setupCompleted: true` (mode 0600) before launch, so it still opens in the shell and remains a delivery test. Real native paste into the disposable textarea and contenteditable matched their contents; the no-input run kept the transcript on the clipboard. |
| Settings schema | `general.setupCompleted` is new: fresh installs start at `false`, and a `state.json` written without the field loads as `true`, so upgrades never see the guide. Both paths are covered by `tests/core-store.test.ts` in the run above. |
| Packaged macOS desktop integration | Application launched from the read-only mounted 2.1.0 DMG on 2026-09-22: **35 checks passed with 4 mock HTTP requests**, receipt [`.local/desktop-e2e-qHkKtI/result.json`](../.local/desktop-e2e-qHkKtI/result.json). Same walk as the development run, including the setup guide on a fresh profile. |
| Packaged macOS delivery | Same mounted application: **5 scenarios passed**, clipboard restored, receipt [`.local/delivery-e2e-NhwoD8/result.json`](../.local/delivery-e2e-NhwoD8/result.json). |

Setup-guide screenshots from that passing desktop run (fake audio, mock providers, 1000 × 750): [欢迎](screenshots/setup-welcome.png), [权限](screenshots/setup-permissions.png), [麦克风](screenshots/setup-microphone.png), [快捷键](screenshots/setup-shortcut.png), [完成](screenshots/setup-done.png).

### Limits of this record

- The helper stale-tap recovery is unit-tested only: helper exit code 3, the three-restarts-in-120 s budget, the `TYPELESS_HELPER_RESTART_ON_STALE` flag, `restartsExhausted` and the `tap_stale` / `relaunch_required` mappings are exercised in `tests/native-client.test.ts` and `tests/shortcut-status.test.ts`. Revoking and re-granting the system permissions that produce a stale event tap cannot be reproduced on this machine, so no end-to-end recovery was observed.
- `app.relaunch` and `permissions.open` were never dispatched by any run: they quit the application or open System Settings. The 允许 buttons were never clicked, so no system permission prompt was raised.
- Both permission cards were already granted on this machine, so only the collapsed granted state was rendered and photographed. The `pending`, `denied`, `enabling` and `relaunch` card states, the "为什么需要此权限" hint, and the Windows 系统输入助手 card were not exercised.
- No physical Fn or Right Alt press was made. The 快捷键 step was verified only in its no-press state; `.shortcut-detected` never rendered, and the shortcut-press counter was not observed changing.
- The microphone step ran on Chromium's fake audio device with the reported OS microphone status stubbed to `granted` inside the Electron main process. Real device enumeration, real capture and the real permission status remain unverified.
- The screenshots above come from the fake-audio run of the development build; the packaged runs produced no new screenshots, and none was taken with a real microphone.
- `npm run verify:windows` was not re-run for this change, and no Windows runtime was exercised.

## Artifact ledger

| Artifact | Status | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| [macOS arm64 DMG](../release/Typeless-2.1.0-arm64.dmg) | Verified | 131,033,586 | `39e3d9ff0b0e127202ad636aac71b873b0ff112c4574048df88be02d5134d881` |
| [Windows x64 portable ZIP](../release/Typeless-2.1.0-win.zip) | Integrity verified | 157,567,775 | `555ff537bac97aa6ca2479c35a063688535e1635141686bb36790a3c03728c6a` |

The DMG passed `hdiutil verify`, read-only mounting and `codesign --verify --deep --strict` on both the unpacked and the mounted application. Its Applications link targets `/Applications`, its bundle reports version 2.1.0 and a minimum macOS of 13.0, and its `app.asar` is byte-identical between the unpacked and mounted copies. The bundled native helper shares UUID `42BE6433-9BAB-3157-B537-1060AD2C108C` with the source build. The image was ejected after the runtime checks.

The Windows ZIP passed `unzip -t`; `Typeless.exe` is present and unsigned; `resources/native/windows/Helper.cs` is byte-identical to the source file, and `resources/app.asar` is byte-identical to the macOS bundle's. macOS is ad-hoc signed without Developer ID or notarization. Windows is unsigned. [Release metadata](../release/artifacts.json) records the final artifacts and acceptance boundaries.

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
hdiutil verify release/Typeless-2.1.0-arm64.dmg
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Typeless.app
unzip -t release/Typeless-2.1.0-win.zip
shasum -a 256 release/Typeless-2.1.0-arm64.dmg release/Typeless-2.1.0-win.zip
mkdir -p .cache/dmg-acceptance
hdiutil attach -readonly -nobrowse -mountpoint .cache/dmg-acceptance release/Typeless-2.1.0-arm64.dmg
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
