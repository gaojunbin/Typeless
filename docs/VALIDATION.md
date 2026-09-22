# Version 2.2.0 Validation

Reviewed on 2026-09-18 for 2.0.0 and revised on 2026-09-22 for the 2.1.1 packages (setup guide, stale-grant guidance) and again the same day for the 2.2.0 packages (white simplified interface, three destinations, release check). The 2.0.0 evidence in this section is kept for the dictation behaviour it qualifies; the interface it photographed has since been simplified as recorded in the 2.2.0 section below. This record covers the dictation product with the redesigned interface: the two-column shell specified in [UI design](UI_DESIGN.md) (**首页**, **AI 配置**, **基本设置**, **表达风格**), grouped setting rows, and the black voice capsule. Recording, ASR, optional polishing, retained clipboard output and optional paste into the current foreground application are unchanged from 0.1.5. Historical receipts for earlier versions remain in Git and do not qualify this version.

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

Current screenshots (fake audio and mock providers, refreshed from the 2.2.0 development run): [首页](screenshots/home.png), [首页 with result](screenshots/dictation-result.png), [原文 view](screenshots/dictation-original.png), [recovery alert](screenshots/dictation-recovery.png), [AI 配置](screenshots/settings-ai.png), [AI 配置 in the 不润色 state](screenshots/settings-ai-writing-none.png), [基本设置 with the 关于 row](screenshots/settings-basic.png), [capsule recording](screenshots/voice-recording.png), [capsule controls](screenshots/voice-recording-controls.png), [capsule processing](screenshots/voice-processing.png), [processing with cancel](screenshots/voice-processing-controls.png), [delivery target](screenshots/delivery-target.png).

Production keeps completed dictation on the clipboard. Optional native paste sends the platform paste shortcut to the current foreground application; it does not capture an original field or require an editable role. Dispatch is not proof of acceptance by arbitrary applications. No Return/Enter is sent. Tests restore the original clipboard only during ownership-guarded cleanup. Existing preferences and encrypted keys from 0.1.5 remain readable; the settings schema did not change at 2.0.0. The setup-guide change recorded below adds one field, `general.setupCompleted`.

## First-run setup guide and stale-grant guidance (2026-09-21, revised 2026-09-22)

Executed on 2026-09-21 for the setup guide, then executed again in full on 2026-09-22 after the helper self-restart was removed. The guide is specified in [UI design](UI_DESIGN.md) section 12: while `settings.general.setupCompleted` is `false`, a four-step walk (**权限**, **麦克风**, **快捷键**, **完成**) replaces the shell and the main process counts shortcut presses instead of starting dictation. Section 12.3 fixes the permission card states at `pending | denied | stale | granted`. A helper that reports listening authorization through Accessibility or Input Monitoring while its event tap still fails is presented as `relaunch_required`, and its card shows the `stale` state with **重新打开 Typeless**, **打开系统设置** and **复制诊断信息**. The helper only reports; it never exits or restarts itself.

| Check | Result and scope |
| --- | --- |
| Source and build | `npm run typecheck` clean. `npm run build` completed its native, typecheck, Vite and esbuild steps and produced the bundle both Electron suites below launched. |
| Automated regressions | `npm test`: **94 tests in 10 files passed**. The count fell from 96 because two helper lifecycle cases were deleted together with the self-restart they covered. `native/bin/typeless-native --self-test` passed, returning `{"passed":true,"selfTest":"shortcut-and-paste-policy"}`. |
| Desktop integration | `npm run test:desktop` on a fresh profile: **36 checks passed with 4 mock HTTP requests**. The suite was run twice with the same result; receipts [`.local/desktop-e2e-AZI3nm/result.json`](../.local/desktop-e2e-AZI3nm/result.json) and [`.local/desktop-e2e-39uMvu/result.json`](../.local/desktop-e2e-39uMvu/result.json), with the screenshots below taken from the first run. Eight checks cover this work: `setup-guide-fresh-launch`, `setup-permissions-skip`, `setup-microphone-meter`, `setup-shortcut-step`, `setup-done-opens-ai`, `setup-rerun-and-skip`, `restart-skips-setup` and the new `diagnostics-copy-report`. The walk asserts that no 主导航 tablist exists while the guide is up, that the 权限 step lists exactly the two macOS cards (`microphone`, `accessibility`) with a live `role="progressbar"`, that every rendered card carries one of the four documented `data-state` values, that the 麦克风 step renders its device `select` and 15 meter bars and reaches **已检测到声音** from the fake device, that 快捷键 reports no detection without a press, and that **去连接 AI 服务** lands on **AI 配置** with `setupCompleted === true`. Rerunning the guide from **基本设置** and choosing **跳过向导** returns to the shell, and the restart stage confirms the persisted flag skips the guide. No existing assertion was removed. |
| Diagnostics report | `diagnostics-copy-report` runs on **基本设置** after the provider credentials are saved: the 诊断信息 row carries a **复制诊断信息** button, clicking it turns that label to **已复制** within one second, and the clipboard then holds a report that begins with `Typeless `, carries a `permissions:` line and a `native status history` block, and contains none of the synthetic `FAKE-` credentials stored earlier in the run. Dispatching `{ type: 'diagnostics.copy' }` directly returns `ok`. The harness reads the clipboard text before the check and writes it back afterwards, because this action uses `clipboard.writeText` and so bypasses the ownership-marked write the harness restores on close. |
| Native status log | The same run wrote `<data root>/logs/native-status.log` with mode 0600 and one JSON line per `NativeStatus` transition, each carrying `accessibility`, `inputMonitoring`, `shortcutReason`, `tapEnabled`, `helperPid` and `error`: four lines in [`.local/desktop-e2e-AZI3nm/logs/native-status.log`](../.local/desktop-e2e-AZI3nm/logs/native-status.log). The data root is the profile given by `TYPELESS_DATA_DIR`, `.local/app/` in development. The last 50 transitions are also held in memory and appear in the diagnostics report. Truncation above 256 KB was not reached by any run. |
| Stale grant mapping | Unit tests only. `tests/shortcut-status.test.ts` covers a trusted helper whose reason is `tap_creation_failed`, `tap_disabled` or `runloop_source_failed` mapping to `relaunch_required`, and the untrusted case keeping its own reason. No run produced a failing tap, so no card reached the `stale` state during these suites. |
| Delivery | `npm run test:delivery`: **5 scenarios passed with 7 mock HTTP requests**, clipboard restored (`clipboardRecovery: "restored"`), receipt [`.local/delivery-e2e-UCIKuC/result.json`](../.local/delivery-e2e-UCIKuC/result.json). The harness seeds `<data root>/settings/state.json` with `setupCompleted: true` (mode 0600) before launch, so it still opens in the shell and remains a delivery test. Real native paste into the disposable textarea and contenteditable matched their contents; the no-input run kept the transcript on the clipboard. This suite is unchanged by the revision. |
| Settings schema | `general.setupCompleted` is new at 2.1.0: fresh installs start at `false`, and a `state.json` written without the field loads as `true`, so upgrades never see the guide. Both paths are covered by `tests/core-store.test.ts` in the run above. The revision adds no setting. |
| Packaged macOS runs from the 2.1.1 build | Application launched from the read-only mounted 2.1.1 DMG on 2026-09-22: desktop suite **36 checks passed with 4 mock HTTP requests**, receipt [`.local/desktop-e2e-dVmUYh/result.json`](../.local/desktop-e2e-dVmUYh/result.json), including the setup-guide walk on a fresh profile and the diagnostics copy; delivery suite **5 scenarios passed**, clipboard restored, receipt [`.local/delivery-e2e-363K0q/result.json`](../.local/delivery-e2e-363K0q/result.json). |

Setup-guide screenshots from the first passing desktop run (fake audio, mock providers, 1000 × 750): [欢迎](screenshots/setup-welcome.png), [权限](screenshots/setup-permissions.png), [麦克风](screenshots/setup-microphone.png), [快捷键](screenshots/setup-shortcut.png), [完成](screenshots/setup-done.png). From the same run, [基本设置 系统权限](screenshots/settings-diagnostics.png) shows the lower half of the page with the 设置向导 and 诊断信息 rows.

### Limits of this record

- The stale-grant path is unit-tested only. Revoking and re-granting the system permissions that leave a trusted helper with a failing event tap could not be reproduced on this machine, so neither the `relaunch_required` mapping nor the recovery it recommends was observed end to end.
- A field report from 2026-09-22 motivated the change and remains unreproduced here: on the user's Mac, 2.1.0 reported listening authorization while the event tap still failed, restarting the helper process did not recover it, and relaunching the application returned the permission to 待授权. The new copy asks the user to remove and re-add the stale system entry; that instruction is not verified by any run in this record.
- `app.relaunch` and `permissions.open` were never dispatched by any run: the first quits the application, on packaged macOS through a LaunchServices `open` of the bundle after the current process exits, and the second opens System Settings. The 允许 buttons were never clicked, so no system permission prompt was raised.
- Both permission cards were already granted on this machine, so only the collapsed granted state was rendered and photographed. The `pending`, `denied` and `stale` card states, the "为什么需要此权限" hint, and the Windows 系统输入助手 card were not exercised by any run; the `stale` card was rendered only from an injected snapshot during development.
- The diagnostics report was read only from the development Electron binary, where the bundle is unpackaged. Its `cdhash` line, which is parsed from `codesign -dvvv` and falls back to `unknown`, was not checked against a packaged bundle, and the report's contents were asserted by prefix and substring rather than field by field.
- No physical Fn or Right Alt press was made. The 快捷键 step was verified only in its no-press state; `.shortcut-detected` never rendered, and the shortcut-press counter was not observed changing.
- The microphone step ran on Chromium's fake audio device with the reported OS microphone status stubbed to `granted` inside the Electron main process. Real device enumeration, real capture and the real permission status remain unverified.
- The screenshots above come from the fake-audio run of the development build; the 2.1.1 packaged runs produced no new screenshots, and none was taken with a real microphone.
- `npm run verify:windows` was not re-run for this change, and no Windows runtime was exercised.


## Simplification pass and release check (2.2.0, 2026-09-22)

Requested after 2.1.1 shipped and specified in [UI design](UI_DESIGN.md) section 13: white pages without decorative backdrops, a sidebar brand mark identical to the Dock icon, three destinations (表达风格 folded into the 文字润色 form of **AI 配置**), a Home page reduced to the dictation card plus one three-row status list, `Sparkle` / `PenLine` icons in place of `Sparkles`, and a **关于** row in **基本设置** that checks GitHub Releases and downloads the installer. Dictation, providers, settings storage and the setup guide flow are unchanged.

| Check | Result and scope |
| --- | --- |
| Source and build | `npm run typecheck` clean. `npm run build` completed its native, typecheck, Vite and esbuild steps before each Electron run. |
| Automated regressions | `npm test`: **109 tests in 12 files passed** (94 before this change). New: `tests/update.test.ts` (version ordering, asset selection, release parsing, loopback-only HTTP trust) and `tests/update-checker.test.ts` (available / none / no_asset / network / invalid_response, download with progress and digest verification, checksum failure cleanup, release-page host check) with an injected fetcher and temp directories; no test reaches GitHub. |
| Desktop integration | `npm run test:desktop` on the final source: **39 checks passed with 4 mock HTTP requests**, receipt [`.local/desktop-e2e-pRuFeK/result.json`](../.local/desktop-e2e-pRuFeK/result.json). Two earlier passing runs of the same source ([`.local/desktop-e2e-NsT3Xw`](../.local/desktop-e2e-NsT3Xw/result.json), [`.local/desktop-e2e-D5JqF1`](../.local/desktop-e2e-D5JqF1/result.json)) preceded one fix to the harness itself, recorded in the packaged row below. Replaced checks: `three-sidebar-tabs` and `minimum-window-three-pages` (three `role=tab`, three pages at 880 × 600 without horizontal overflow). New checks: `home-status-list` (three `.status-row`, none of the removed hero, overview grid, rail, quick start, version footer or sidebar footer card), `writing-controls-in-ai` (润色程度 buttons and 个人表达说明 inside the 文字润色 form), `update-check-and-download` (the harness serves a fake `v99.0.0` release and a 4 KB asset with a SHA-256 digest over loopback HTTP; 检查更新 → **有新版本 99.0.0** in the row and the sidebar pill → 下载更新 → **打开安装包**, `update.status === downloaded`, the file lands under the profile's `downloads/` with the expected length, and the sidebar pill disappears). Every earlier assertion remains, with 表达风格 selectors pointed at **AI 配置**. |
| Delivery | `npm run test:delivery` on the final source: **5 scenarios passed**, clipboard restored, receipt [`.local/delivery-e2e-gRpM9w/result.json`](../.local/delivery-e2e-gRpM9w/result.json). |
| Visual review | The lead compared the run's screenshots against section 13: white pages, borders instead of tinted cards, colour only on status badges and the meter, no gradient anywhere in the shell or the guide. |
| Packaged macOS desktop integration | Application launched from the read-only mounted 2.2.0 DMG: the first attempt failed in the new update stage because the packaged app starts slower and its automatic release check (15 s after launch) had already turned **检查更新** into **下载更新** before the harness clicked it; the stage now triggers the manual check through IPC and asserts on the resulting states, and the rerun passed with **39 checks and 4 mock HTTP requests**, receipt [`.local/desktop-e2e-wUZd0I/result.json`](../.local/desktop-e2e-wUZd0I/result.json). This is the only run in which the automatic check was observed to fire. |
| Packaged macOS delivery | Same mounted application: **5 scenarios passed**, clipboard restored, receipt [`.local/delivery-e2e-LYg72w/result.json`](../.local/delivery-e2e-LYg72w/result.json). |

### Limits of this record

- The release check was exercised only against the harness's loopback mock; the real GitHub endpoint, its rate limits, redirects to `objects.githubusercontent.com`, the automatic 15 s / 6 h schedule (packaged builds only) and `shell.openPath` on a real DMG were not observed by any run.
- Only the darwin / arm64 asset rule was exercised end to end; `-x64.dmg` and `-win.zip` selection is unit-tested only.
- The 关于 row states `downloading` and `error` were rendered only in the unit tests' state transitions, not photographed.
- Windows runtime remains untested; the Windows install hint in the 关于 row was not shown on a Windows machine.

## Artifact ledger

| Artifact | Status | Bytes | SHA-256 |
| --- | --- | ---: | --- |
| [macOS arm64 DMG](../release/Typeless-2.2.0-arm64.dmg) | Verified | 131,062,809 | `8d8555499c2f835e4f4db80adcfea8124974182abc6e027bb8ef782ebd64e77f` |
| [Windows x64 portable ZIP](../release/Typeless-2.2.0-win.zip) | Integrity verified | 157,576,546 | `7b3a0162174e434df2428e53f6f3f58996625095ef6cd07d066e916aba47ae4d` |

The DMG passed `hdiutil verify`, read-only mounting and `codesign --verify --deep --strict` on both the unpacked and the mounted application. Its Applications link targets `/Applications`, its bundle reports version 2.2.0 and a minimum macOS of 13.0, and its `app.asar` is byte-identical between the unpacked and mounted copies. The bundled native helper shares UUID `20692AF1-EF68-3EC3-A489-D68F00254486` with the source build (unchanged since 2.1.1). The image was ejected after the runtime checks.

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
hdiutil verify release/Typeless-2.2.0-arm64.dmg
codesign --verify --deep --strict --verbose=2 release/mac-arm64/Typeless.app
unzip -t release/Typeless-2.2.0-win.zip
shasum -a 256 release/Typeless-2.2.0-arm64.dmg release/Typeless-2.2.0-win.zip
mkdir -p .cache/dmg-acceptance
hdiutil attach -readonly -nobrowse -mountpoint .cache/dmg-acceptance release/Typeless-2.2.0-arm64.dmg
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
