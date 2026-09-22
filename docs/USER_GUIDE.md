# User guide

This guide describes the reduced dictation interface. UI labels are shown in Chinese, the default language; the whole interface is also available in English (基本设置 → 通用 → 语言, or the toggle on the welcome screen), and the English labels follow the same structure. See [Validation](VALIDATION.md) for actual artifacts and completed checks; this guide does not certify all editors or live-provider quality.

## Open the application

The 2.2.1 package output locations are [Typeless-2.2.1-arm64.dmg](../release/Typeless-2.2.1-arm64.dmg) for Apple silicon macOS and [Typeless-2.2.1-win.zip](../release/Typeless-2.2.1-win.zip) for Windows x64. Consult Validation for availability and verification. On macOS, quit any existing instance, drag `Typeless.app` into Applications, eject the disk image, and launch the installed app. The local build is ad-hoc signed, not Developer ID signed or notarized, so macOS warns on first launch that the developer cannot be verified; allow the app under 系统设置 → 隐私与安全性. On Windows, extract the entire portable archive and run `Typeless.exe` with its companion files intact; SmartScreen may ask for confirmation because the build is unsigned.

To run from source, follow the [development guide](DEVELOPMENT.md). The first run contains no API keys.

## The main window

The window is a two-column shell on a white background. The sidebar shows the application mark, the same seven-bar waveform as the Dock icon, and three destinations in order: **首页**, **AI 配置** and **基本设置**. Arrow keys move between them. While a newer release is available, a small **有新版本** pill at the bottom of the sidebar opens **基本设置**. The content column scrolls on its own; the version lives in **基本设置 → 关于**.

**首页** carries the **说话，不打字** title and the dictation card: the **开始听写** button, the shortcut keycaps, the recording waveform and elapsed time, the recovery alert and the current result. Below it a single status list has three rows, **语音识别**, **文字润色** and **快捷键**, each with its current detail and a status badge; clicking a row opens the matching destination. The shortcut and its status appear nowhere else on the page, and the getting-started steps live only in the setup guide.

A new installation reaches this shell only after the setup guide below. Afterwards, with no speech key saved, the application opens on **AI 配置**; otherwise it opens on **首页**.

## Set up on first launch

The first launch of a new installation opens a setup guide instead of the shell. **欢迎使用 Typeless** starts it with **开始设置**; **跳过向导** ends it at once. Under those two buttons a quiet **English** link switches the whole interface to English (and **中文** switches back); the choice is saved immediately and applies to every later screen, the capsule and the tray menu. A progress header then names four steps, **权限**, **麦克风**, **快捷键** and **完成**, each with **继续** and a way to skip.

**权限** lists one card per system permission: the microphone on both platforms, **允许 Typeless 粘贴文字并监听 Fn 键** on macOS, and **启用系统输入助手** on Windows. Only the first card that still needs attention stays expanded; a granted card collapses to its title with a check. The step re-reads the live permission state, so cards collapse while you flip the switches in system settings. **继续** is enabled once every card is granted; **稍后在基本设置中授权** continues without them. The info button on a pending card reveals the manual path, 系统设置 → 隐私与安全性 → 麦克风 or 辅助功能 → 开启 Typeless.

| State | Where you see it | What it means and what to do |
| --- | --- | --- |
| **待授权** (Windows helper: **不可用**) | **基本设置 → 系统权限** and the **完成** checklist | The permission was never granted. Use **允许** in the guide, **授权** on the microphone row in **基本设置**, or **打开系统设置** on the assistant row, then confirm the system prompt. |
| **已授权** | Both surfaces; in the guide the card collapses with a check | Nothing further is needed. |
| **系统已拒绝麦克风权限。请在系统设置中开启后返回。** | Microphone card after a refusal | The system will not prompt again. Use **打开系统设置**, enable Typeless under 麦克风, and return; the card updates by itself. |
| **系统显示已授权，但 Fn 监听尚未生效。** (**已授权但监听未生效** in **基本设置**) | macOS accessibility card and the shortcut row | The system reports the listening grant, yet the event tap keeps failing. Use **重新打开 Typeless** first. If the relaunched application shows the permission as pending again, the grant belongs to an earlier build; remove Typeless under 辅助功能 and 输入监控 and add it again. **复制诊断信息** collects the details for a bug report. |
| **助手不可用，可先使用备用快捷键。** | Windows helper card | The bundled helper is not running, so Right Alt and automatic paste are unavailable. Use the fallback shortcut and the recording button meanwhile. |

On macOS a grant made while Typeless is already running is not always applied to the running process: the system can keep handing it a dead event tap. The helper cannot repair such a tap, and replacing the helper process does not help either, so the card and the shortcut row report the stale grant and ask for a full application relaunch through **重新打开 Typeless**. Local builds are ad-hoc signed and take a new identity with every release, so a grant recorded for an earlier build stays in the system list while the new binary remains untrusted; when the relaunched application shows the permission as pending again, remove Typeless under 辅助功能 and 输入监控 and add it back. A relaunch is a recovery attempt, not a guarantee that the system will hand out a working tap. Fn listening accepts either Accessibility or Input Monitoring, while automatic paste needs Accessibility, so **快捷键仍不可用？改用输入监控** under the cards opens the Input Monitoring pane as the alternative. **允许** on the accessibility card asks the helper for the permission and opens the Accessibility pane instead whenever the helper is unavailable.

**麦克风** asks you to speak. Pick an input from the **麦克风** selector, which saves immediately, and watch the level meter; **已检测到声音** appears once sound is detected. Without the permission the step offers **允许**, plus **打开系统设置** after a refusal. If the device cannot be opened, 无法访问麦克风，请检查是否被其他应用占用。 names the likely cause. This test stays in the application and sends no audio to a provider.

**快捷键** asks for one press of Fn on macOS, Right Alt on Windows, or the fallback chord. While setup is incomplete a press is only counted and acknowledged with **检测到 Fn**, **检测到 Right Alt** or **检测到备用快捷键**: it does not start dictation, and the capsule does not appear. When the primary listener is not ready, the step says so and the fallback still counts.

**完成** shows a checklist of microphone, assistant and shortcut with their current status, then **去连接 AI 服务** when no speech key is saved and **开始使用** otherwise; **稍后再说** also ends the guide. Finishing or skipping records setup as complete. An installation upgraded from an earlier version already has a settings file, which counts as complete, so it never sees the guide. **基本设置 → 系统权限 → 重新运行设置向导** reopens it at any time.

## Configure AI once

Open **AI 配置** from the sidebar, or use the **配置语音** button or the **语音识别** card on **首页**. Each provider has its own visible connection form:

| Connection | Configuration |
| --- | --- |
| **语音识别** | Speech protocol, base URL, model and API key. The MiMo preset uses `https://api.xiaomimimo.com/v1` and `mimo-v2.5-asr`. |
| **文字润色** | Independent OpenAI-compatible base URL, model and API key. Select a model supported by your provider account. |

Click **保存** in the edited connection. Its address, model, protocol where applicable, and replacement key are submitted together. Editing one form does not save the other. Failed saves keep the draft and show an error; do not assume the connection changed until saving succeeds.

Saved keys never appear in the input again. Leaving a key blank retains its saved value; **删除密钥** explicitly removes it. Changing the endpoint origin or speech protocol invalidates the old key unless you enter a replacement. Keys are not included in renderer snapshots. HTTPS is required except for loopback HTTP services. Do not include credentials or query parameters in a base URL, or append `/chat/completions`.

The OpenAI-compatible speech adapter uses multipart `/audio/transcriptions`; MiMo uses an audio message sent to `/chat/completions`. Choose the matching protocol, endpoint and exact model identifier yourself. Saving configuration does not prove provider access, balance or model quality.

## Choose a writing style

Open **AI 配置**. The **文字润色** form starts with **润色程度**; select one level:

- **不润色:** use the original transcript; no text-model request.
- **轻度润色:** remove clear fillers and accidental repetition with minimal rephrasing.
- **强力润色:** also simplify self-corrections and redundant phrasing, while preserving facts, negation, quantities, names and uncertainty.

The level saves immediately; no second enable switch or Save button is required. New installations default to strong polishing. Output quality depends on the selected text model.

Use **个人表达说明** for optional instructions such as preferred terminology or language style. It saves when you leave the field or press Command/Ctrl+Enter. Save failures remain visible with a retry action. When **不润色** is selected, these instructions stay saved but do not affect output. Dictated questions remain text to write, not instructions for the model to answer.

## Basic settings and permissions

**基本设置** groups its rows under **快捷键** (primary and fallback shortcut), **音频** (microphone and **录音提示音**), **通用** (**语言** with **中文** / **English**, then **完成后自动粘贴** and **登录系统时启动**), **系统权限** and **关于**. Each row keeps its label on the left and its control on the right. Selectors and switches save immediately. The fallback shortcut offers three readable presets and saves on selection; an existing custom binding remains available. There is no global Save action. Startup behavior applies to packaged applications.

Microphone names may be unavailable before permission is granted; **系统默认** uses the default device. Device choices refresh when devices change. A waveform indicates audio level, not a live transcript. Recording sounds indicate recording transitions; visible state remains authoritative if sound playback is suppressed.

**系统权限** repeats the guide's checks as rows. **麦克风** shows **已授权** or **待授权**, with **授权** to request it and **打开系统设置** once the system has refused it. **辅助功能** on macOS shows **已授权** or **待授权**; **系统输入助手** on Windows shows **已就绪** or **不可用** instead, because nothing is granted there. Both offer **打开系统设置**. macOS adds an **输入监控** row with three states: **已授权** when Input Monitoring itself is granted, **辅助功能已覆盖** when only Accessibility is granted, and **未授权** otherwise, where **打开系统设置** opens the Input Monitoring pane. The row **设置向导** has **重新运行设置向导** and returns you to the first-launch guide without touching any other setting. The last row, **诊断信息**, has **复制诊断信息**: it puts the application version, the operating-system version, the packaged executable path with the macOS bundle hash, the non-secret settings, the current permissions and the last fifty helper status transitions on the clipboard, and its label reads **已复制** for two seconds. That report contains no API keys and no transcripts, so it can go straight into a bug report.

**关于** holds the **版本** row. Its badge reads **未检查**, **正在检查…**, **已是最新**, **有新版本 x.y.z**, **下载中 n%**, **已下载** or **检查失败**, and its button follows: **检查更新** asks GitHub for the latest release, **下载更新** saves that release's installer for this platform into your Downloads folder and verifies the published digest, **打开安装包** opens the downloaded file, and **重试** repeats a failed check. **更新说明** opens the release page. Packaged applications also check automatically 15 seconds after launch and every six hours; a newer release then shows **有新版本** in the sidebar. Installing remains a manual step: drag the new application into Applications, reopen it and grant the permissions again, because each ad-hoc signed build has its own identity.

The **主要快捷键** row reports its own health beside the keycaps. **已就绪** and **已关闭** need nothing. **已授权但监听未生效** adds a **重新打开 Typeless** button, because an authorized helper cannot repair a failing event tap in place. **请授权辅助功能（升级后需移除旧条目重新添加）**, **监听未生效，请检查权限** and **助手正在重新连接** point back to the permission rows; the first appears while nothing is granted yet and reminds you that an upgraded build needs its own entry. On macOS, Fn listening needs Accessibility or Input Monitoring and automatic paste needs Accessibility. Development Electron and the installed app can hold different permission identities. The recording button and automatic copying do not require the paste permission.

## Dictate from anywhere

1. Tap Fn on macOS, Right Alt on Windows, or the configured fallback. You can also click **开始听写** on **首页**.
2. Wait for the recording waveform, then speak. No editable-field check is required, including in terminals or with no input focused.
3. Tap the shortcut again, click **结束听写**, or click the capsule's confirm circle. The capsule then shows **思考中** while recognition and any polishing complete.
4. The result is automatically copied and remains on the clipboard. If **完成后自动粘贴** is on, the app dispatches Command+V/Ctrl+V to whichever application is now in front. The capsule hides after copying and the optional paste attempt.
5. If nothing received the paste, focus the intended destination and paste manually. The result card on **首页** lets you view and copy either **原文** or **整理后**. Copying does not dispatch another paste or alter the other result.

The app never sends Enter. Switching applications during processing changes the possible paste destination. A reported dispatch does not prove the destination accepted text. There is no original-target lock or automatic focus restoration.

The default fallback is Command/Ctrl+Shift+Space. Only isolated primary-key taps trigger dictation; Fn chords and AltGr typing should remain normal input. Windows Fn support depends on keyboard hardware, so Right Alt is used instead. If Fn/Globe invokes a macOS system action, review its keyboard assignment or use the fallback. The application does not change that assignment automatically.

The capsule is a black bar centered near the bottom of the screen. While recording it shows a dark cancel circle on the left, a white waveform in the middle and a white confirm circle on the right. All of them stay visible without hovering, and using them does not move focus away from the application in front. When less than ten seconds of the recording cap remain, the remaining time appears between the waveform and the confirm circle. While processing, the waveform and the confirm circle give way to a **思考中** label and the cancel circle remains. The main window and the capsule context menu also offer cancellation. Cancellation stops the current operation, but cannot undo text already copied or pasted. The default recording cap is 60 seconds; silence alone does not end a thinking pause.

## Recovery

When polishing fails, the recognized original is copied and can still be automatically pasted. A visible warning distinguishes this fallback from polished output. If recognition fails, **重试** can reuse the active session's retained audio until it expires. Recognized original text remains available in the **原文** view of the result card; explicitly copying it changes only the clipboard, even if the edited result was already pasted. A clipboard failure is a separate error; do not assume any text was copied until copying succeeds.

An error shows a black capsule with an alert icon and the message; clicking it opens the main window, where the same message and its actions appear in the **首页** dictation area. Missing provider configuration links to **AI 配置**; microphone or input-permission issues link to **基本设置**. Silence, disconnection, denied access and provider failures have distinct recovery messages. **首页** shows only the current result, warnings and relevant recovery actions. Starting another session replaces the current session; copy any text you need before doing so.

## Local storage and retention

Development defaults to `.local/app/`, with configuration and encrypted credentials in `.local/app/settings/state.json`. Installed applications normally use Electron's OS application-data root with the same `settings/state.json` suffix. `TYPELESS_DATA_DIR` selects a separate root. Session data, logs and crash-dump locations are sibling directories; `logs/native-status.log` records one JSON line per helper status transition, is truncated once it passes 256 KB, and holds no transcripts or credentials. Do not share one live data root between independent running installations.

API keys are encrypted through OS-protected storage before persistence; encryption failure does not permit plaintext fallback. Other settings are not encrypted. The current transcript is not stored as a persistent transcript archive. Raw audio is kept in memory for the active request; failed recognition may retain it for up to five minutes for retry. Success, cancellation, a new session or quitting clears it. Restarting cannot recover that audio.

Every finished result replaces the system clipboard. The app does not restore its prior contents. Audio is sent to the configured speech provider, and polishing sends the transcript plus writing instructions to the configured text provider. No screenshots, arbitrary documents or continuous typing are supplied as context. Provider retention and billing policies are independent of local storage; the app does not promise offline operation or provider-wide zero retention.

## Troubleshooting

| Symptom | Next action |
| --- | --- |
| Speech provider not configured | Open **AI 配置** from the sidebar or the **配置语音** button, then save a speech-provider key and model. |
| Save failed | Read the inline error; correct the draft and retry the same provider or setting. |
| Authorization or balance error | Check the selected provider account, key, model access and balance. |
| Endpoint error | Check the base URL and whether the speech protocol matches the service. |
| No waveform or no speech detected | Check microphone permission and the selected input, then record audible speech. |
| Fn unavailable or opens another action | Review primary and fallback status in **基本设置**, native permissions, and the macOS keyboard assignment; use the button or fallback meanwhile. |
| Shortcut shows **已授权但监听未生效** | Use **重新打开 Typeless** in that row or in the guide; the helper cannot recover a failing event tap on its own. |
| Permission still pending after that relaunch | The grant belongs to an earlier ad-hoc signed build. Remove Typeless under 辅助功能 and 输入监控, add it again, then relaunch. |
| Microphone permission was refused | Use **打开系统设置** in **基本设置** or in the guide, enable Typeless, then return; the system no longer prompts. |
| Shortcut press does nothing during setup | Expected: while the setup guide is open, presses are only counted to confirm the shortcut arrives. |
| Want to check permissions again | Run **基本设置 → 系统权限 → 重新运行设置向导**. |
| Right Alt conflicts with typing | Choose a suitable fallback for your keyboard layout. |
| Original text appears instead of polished text | Read the warning under the result and check **AI 配置 → 文字润色** (level and connection). |
| **检查失败** in **关于** | Read the line under the row: no connection to GitHub, an unreadable response, no installer for this platform, a digest mismatch or an unwritable Downloads folder. **重试** repeats the check; **更新说明** opens the release page in the browser. |
| Text is absent from the destination | Use the retained clipboard manually; check automatic paste and native permissions. |
| Retry audio expired | Record again; audio is not restored from disk. |
| Browser shows preview | Launch the desktop application; the preview has no native transcription bridge. |
| Secure storage unavailable | Restore OS credential-store access, then save the key again. |
| Need details for a bug report | Use **基本设置 → 系统权限 → 诊断信息 → 复制诊断信息**, or read `logs/native-status.log` under the data root. |

For a bug report, include app version, OS, provider kind/model, visible error and affected editor; **复制诊断信息** assembles the version, platform, identity, permissions and helper history for you. Redact keys and personal transcripts, and specify whether you used development Electron or a packaged app.

## Design references

The [complete official Quickstart review](research/quickstart-review.md) explains the scoped adaptations, with supporting [dictation/action evidence](research/quickstart-dictation-and-actions.md) and [preferences/recovery evidence](research/quickstart-preferences-and-learning.md). These sources do not establish implementation acceptance; consult [Validation](VALIDATION.md).
