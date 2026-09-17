# User guide

This guide describes the implemented interface and data flow. It does not certify compatibility with every editor or claim real-provider accuracy. Refer to [Validation](VALIDATION.md) for tests actually completed. UI labels are shown in Chinese so they can be matched directly to the app.

## Open the desktop application

On an Apple silicon Mac, open [Typeless-0.1.3-arm64.dmg](../release/Typeless-0.1.3-arm64.dmg), drag `Typeless.app` onto the `Applications` shortcut, eject the disk image, then open Typeless from Applications. Quit an existing Typeless instance before replacing its application bundle. The DMG does not include API keys; configure your own services after launch. The unpacked [release/mac-arm64/Typeless.app](../release/mac-arm64/Typeless.app) remains available for local development checks. This package does not target Intel Macs.

For Windows, download [Typeless-0.1.3-win.zip](../release/Typeless-0.1.3-win.zip) and extract the complete x64 portable ZIP into a writable location, then open `Typeless.exe`; do not run the executable from inside the archive or move it away from its companion resources. The first Windows distribution is a portable archive, not an NSIS installer. The macOS app uses ad-hoc signing; current artifact verification is tracked in Validation; it is not Developer ID signed or notarized, so macOS may show a security warning. Check [Validation](VALIDATION.md) for platform acceptance.

Source users can run `npm ci`, `npm run build` and `npm start` from the checkout, as shown in [README](../README.md). `npm run test:desktop` is a mock-provider Electron integration check with fake capture data, not a real recognition test. `npm run verify:windows` is an optional helper compilation check requiring a .NET SDK; normal Windows portable use relies on the packaged sources and system PowerShell, not the SDK. Compilation alone does not establish that shortcuts and insertion work on your Windows machine.

## Navigation

The sidebar contains **语音输入**, **历史记录**, **个性化**, and **设置**. **个性化** has **词典**, **记忆**, and **应用风格** tabs. Settings are grouped into **模型服务**, **声音与快捷键**, **文字整理**, and **隐私与权限**; click **保存设置** to apply form changes. The home page keeps **录音选项** and text-only **文字整理** collapsed until needed.

## Set up the two services

Open **设置 → 模型服务**. Speech recognition and text cleanup have independent base URLs, model identifiers and API keys; configuring one does not configure the other. The speech API key is shown first; expand **语音服务设置** to change its protocol, base URL or model. Text cleanup keeps its model and API key visible; expand **文字服务地址** to change its base URL. Configuration changes take effect after **保存设置**.

| Setting | MiMo speech recognition | Text cleanup/translation |
|---|---|---|
| Provider type | 小米 MiMo | OpenAI-compatible chat API |
| Base URL | `https://api.xiaomimimo.com/v1` | Your provider's API base, for example `https://api.openai.com/v1` |
| Model | `mimo-v2.5-asr` | An exact model ID your account can use |
| Credential | Your MiMo API key | Your text-provider API key |

Keys are never preconfigured. The text model is intentionally blank until selected. A saved key appears only as a saved-state indication; an empty password field means keep the existing key. Use **删除已保存密钥** in the corresponding service section to remove its credential explicitly; this leaves other unsaved form edits intact. Replacing the endpoint origin, or changing ASR provider kind, invalidates its previous credential unless you supply a replacement. HTTPS is required except HTTP loopback services. Do not put a key in the URL or add query parameters.

The alternative **OpenAI 兼容转写** speech provider requires a service implementing multipart `/audio/transcriptions`; it is different from MiMo's audio-message `/chat/completions` protocol. Selecting another provider does not automatically discover its model or endpoint. Update all corresponding fields yourself.

**测试连接** checks the saved `/models` endpoint. Save edits first; the test button is disabled while settings have unsaved changes. Success does not prove that audio transcription, text generation, billing access, or recognition quality works; some usable providers may not expose a compatible model list. A short practice recording is the next test.

For raw recognition only, choose **文字整理 → 润色程度 → 不润色** and save. Translation requires the text provider. If cleanup fails or is unavailable, the app preserves the original transcript and warns rather than pretending it translated successfully.

## Microphone and system permissions

In **设置 → 声音与快捷键**, select **系统默认麦克风** or an available input device. Click **刷新设备** after connecting a microphone. Device names can be unavailable until permission is granted. The recording waveform is an input level indicator, not a live transcript. **录音提示音** enables a short tone after recording is confirmed ready and another when it ends. Tones come from the main window only; audio playback restrictions can suppress them without failing dictation. Use the visible state as the authoritative indicator.

In **设置 → 隐私与权限 → 系统权限**, request microphone authorization. On macOS, Input Monitoring is used for the native Fn shortcut, and Accessibility permission may be required to dispatch the system paste shortcut. Review the relevant permissions in system settings and return to **重新检查权限** after enabling them. A missing paste permission does not block microphone recording or copying the result; use the recording button or fallback shortcut if Fn is unavailable. If OS settings require reopening the app, quit from Settings or the tray and relaunch. Development Electron and the installed application can have different permission identities.

Windows microphone access can be blocked by system or organization policy. If another program exclusively owns a device, close it or select another input. When the native helper or its shortcut is unavailable, the app's recording button and supported fallback shortcut remain the recovery routes; recording and automatic copying do not require an editable field. Automatic system paste depends on native availability and permissions.

## First practice and everyday use

1. Open **语音输入**. **录音选项** contains **口述**, translation, and **练习模式**. Practice is enabled by default: results are automatically copied and retained in the app, without automatic paste.
2. Click **开始说话** and wait until **正在录音** appears, then speak.
3. Click **结束录音**. Status changes through **正在识别** and **正在整理**.
4. The result is automatically copied. Paste it in any app, or use **复制结果** to copy it again. Expand **原文与更多操作** for the original transcript, **使用原文**, and **重试**. Errors and warnings remain visible outside the disclosure.
5. Expand **文字整理** to process pasted text without microphone capture. This action can call the configured text provider and incur charges. Its result is automatically copied and also appears on the same page.

Recording stops at the configured cap: default 60 seconds, allowed range 5–120 seconds, with a final countdown in the main window. A normal thinking pause does not stop recording. Entirely silent input produces an error. Cancel while recording or processing to stop the local job and reject late responses; a request already received by a provider may still incur charges.

Start dictation from any application or the desktop; an editable field is not required. When automatic paste is enabled, the system paste shortcut is sent to whichever application is foreground when processing completes. The main-window practice checkbox does not change global-shortcut behavior. Fn on macOS or Right Alt on Windows starts on one isolated tap and stops on another. Fn chords and AltGr combinations are not intended to trigger recording. Use **Command/Ctrl + Shift + Space** if the native shortcut is unavailable or conflicts; change the fallback in Settings if needed.

If Fn/Globe also invokes the emoji picker or system dictation, review the key’s assigned action in macOS keyboard settings. Select “Do Nothing” if that option is offered, or use the fallback shortcut instead; exact labels and locations vary by OS version. The app does not change macOS key behavior automatically.

The primary shortcut menu offers the supported platform key (`Fn` or `RightAlt`) or disabling it. Custom combinations belong in **备用快捷键**, which works independently of the native single-key shortcut. Windows Fn support is not universal. For languages that rely on Right Alt/AltGr, validate the combination behavior before making this your daily shortcut.

During external recording, a small non-activating capsule shows only the waveform. Recognition, cleanup and insertion use a loading animation. The capsule disappears once the result has been copied and the optional paste attempt finishes, including when no input field is focused. A dispatched paste shortcut is not proof of text appearing in an application. Right-click the capsule to cancel or open Typeless. Practice sessions do not use this floating surface. Recording, processing or copy errors use a brief Chinese recovery notice; successful copying without a paste does not produce an input-field error card; details remain in the main window without opening it automatically. Closing the main window hides it and leaves the app running; use **退出应用** or the tray menu to quit completely. Reopen the main window from the tray/menu bar.

## Insertion, warnings and recovery

**完成后自动粘贴** is enabled initially. Every completed result replaces the clipboard with the final text and remains available in the app. With automatic paste enabled, ordinary dictation also attempts the system paste shortcut in the current foreground application. It does not capture or restore an original field or caret, inspect editor eligibility, or require a text field before recording. Practice, text-only processing and disabling automatic paste still copy the output but do not paste automatically.

If nothing accepts the paste, or paste permission is unavailable, the result remains copied: select your destination and press Command+V on macOS or Ctrl+V on Windows. The clipboard keeps the new transcript; the application does not restore previous clipboard content. A cleanup failure copies the recognized original text so it remains usable. Check warnings and the resulting text before sharing it.

The app reports a dispatched shortcut separately from confirmed delivery. Inspect the current application before repeating a paste. An automatic paste attempt is not repeated, and **重试** may be unavailable after that attempt. The application does not press Enter or click Send. This describes the application's actions; the receiving application controls how pasted text is handled. Windows helper compilation alone does not establish Windows runtime behavior.

Recovery choices are distinct:

| Action | What it does |
|---|---|
| 重试 after ASR failure | Resubmits the current in-memory audio while available; may incur another charge |
| 重试 with recognized text | Reruns text processing without rerecording audio |
| 使用原文 | Selects and copies the recognized text rather than the cleaned output |
| 历史记录 → 更多 → 重新整理 | Reprocesses and copies that entry's saved raw text as a new practice result; no audio replay |
| 复制结果 | Copies text for manual recovery |

Numbers or unusually large text expansion can produce a review warning. Output is still copied; review the text before using it. These checks are not comprehensive factual validation: inspect negation, dates, names, technical terms and important commitments yourself.

## Translation and writing preferences

Set **翻译目标语言** in **设置 → 文字整理**, save, then expand **语音输入 → 录音选项** and choose **翻译为…** before recording or processing text. Translation requires a configured text provider and remains available with **不润色**; that combination requests faithful translation without additional polishing. Ordinary dictation preserves original language and mixed-language phrasing. The global basic dictation shortcut starts ordinary dictation; separate translation hotkeys are not implemented in this version.

Use **润色程度** in **设置 → 文字整理**, or click the current level below the recording control to open that setting. Save changes before recording.

| Level | Behavior |
|---|---|
| 不润色 | Preserve the original recognized text without calling the text model for ordinary dictation |
| 轻度润色 | Remove filler words and small repetitions while preserving the original phrasing |
| 强力润色 | Remove fillers, repetitions, abandoned corrections and redundancy while retaining facts and meaning; do not invent content |

New installations default to **强力润色**. A configured selection remains in effect until changed. These levels request model behavior; review important output. Ordinary dictation with **不润色** bypasses text-model dictionary, memory, profile and writing instructions. Translation still uses the text model.

Use **个人写作指令** for explicit preferences within the selected level. For example, request preservation of English product names or concise paragraphs. Application rules in **个性化 → 应用风格** match the captured application name, case-insensitively. Practice mode has no external app name, so app-specific rules will not match. Check an external result's target name before creating its profile.

## Dictionary, memory and history

**个性化 → 词典** supports search, add, edit, and delete. Open **更多** beside search for **导入 CSV** and **导出 CSV**. These entries are supplied as approved vocabulary to the text model; they are not ASR acoustic training or deterministic replacements. A term therefore needs configured cleanup to influence the current pipeline. An empty scope or `*` means all apps; otherwise use the exact target application name, ignoring letter case.

CSV columns are `term,replacement,description,scope`. The header is optional; quote fields containing commas or quotes. Import adds entries rather than deduplicating them. Example:

```csv
term,replacement,description,scope
MiMo,MiMo,Xiaomi model name,*
Project Atlas,Project Atlas,Internal project name,Mail
```

**个性化 → 记忆** contains only explicitly saved entries. Both the global memory option and each entry's enabled flag must be on for it to enter applicable text prompts. Global memory is off by default. You can create entries while it is off, then enable it when ready. Disabling it does not delete entries; deleting an entry removes it from future prompts.

History **更多 → 修正 → 将此次修正保存为个人记忆** is available only when the global memory option is enabled; otherwise the dialog directs you to **个性化 → 记忆**. The checkbox starts unchecked. The saved memory contains a bounded preferred-versus-previous wording example, not an automatically inferred abstract rule. Inspect and edit it in Memory, especially if the correction contains personal details. It is scoped to the recorded target app, or all apps for a practice entry. No background typing is monitored to infer preferences.

Text history is off initially. Use **历史记录 → 开启历史记录** to retain future results, or enable **设置 → 隐私与权限 → 保存本地文字历史**, choose 1–365 days (default 7), and save. Each record offers **复制** directly; its **更多** disclosure contains insertion status, **识别原文**, **重新整理**, **修正**, and **删除记录**. The **更多** menu beside history search contains **导出历史** (JSON) and **清空历史**; clearing asks for confirmation. Disabling history and saving removes stored history entries; it does not delete dictionary entries or memories. The store also limits history to its newest 1,000 entries.

## Local storage and retention

For `npm start` and `npm run dev`, the default data root is `.local/app/` inside the project. The main state file is `.local/app/settings/state.json`; sibling directories contain Electron session data, crash-dump location and logs. Installed apps normally use Electron's OS-specific user-data root, with the same `settings/state.json` suffix. `TYPELESS_DATA_DIR` overrides the root, useful for an isolated profile. Do not point multiple independent installations at one live profile.

API credentials inside the state file are encrypted with Electron's OS-protected storage. The renderer receives only `hasApiKey` indicators. Configuration, dictionary, memories and enabled text history remain readable local JSON; the whole file is not application-encrypted. Keep the directory private and avoid exporting or sharing it. OS account/keychain changes can make copied credentials undecryptable; enter keys again rather than expecting a portable credential backup.

Raw audio is collected in memory and sent directly to the ASR provider. Successful recognition/processing releases its retained audio, including when cleanup falls back to raw text. Recognition failure can keep only the active recording in memory for up to five minutes; retry restarts that attempt's lifecycle. Cancel, a new recording/text session, or quitting clears it. There is no audio file history or restart-persistent audio retry.

Text cleanup sends the transcript, vocabulary, writing preferences and enabled applicable memories to the chosen text provider. **共享应用上下文** controls inclusion of the explicit target app name. App-specific profile and scope matching still happen locally, and matched instructions can still be sent when that switch is off. Screenshots, arbitrary document text and continuous keyboard input are not included in this pipeline.

No app account, hosted analytics or sync is required. This does not imply offline operation: configured providers have their own retention policies and billing. Deleting local history cannot retract previously processed provider requests. Exported CSV/JSON files are separate copies and are not removed by in-app deletion.

## Troubleshooting

| Symptom | Next action |
|---|---|
| Start button unavailable | Configure the ASR key and model; save settings |
| Authorization/balance error | Verify the correct provider key, account permissions and balance; do not paste keys into screenshots |
| Endpoint/model error | Check the base URL and exact model ID; ensure ASR provider kind matches the actual protocol |
| Connection check fails | Check network and `/models` support; a failed model-list test alone does not establish failed inference |
| No waveform or no speech detected | Grant microphone permission, choose the correct device, then try a short audible practice recording |
| Microphone disconnected | Reconnect/select a device, refresh the list and start a new session |
| Fn opens a system action or does nothing | Check the separate primary/fallback statuses in **声音与快捷键**, review Accessibility and Input Monitoring in **隐私与权限**, then refresh permissions; Fn availability follows the actual native event-tap state, and Accessibility can also authorize listening; set its macOS action to “Do Nothing” if available or use the configurable fallback |
| Right Alt conflicts with typing | Use a different fallback; verify AltGr behavior for your keyboard layout |
| Raw text appears instead of cleanup/translation | Read the warning; check the selected polishing level and text-provider configuration, then retry the recognized text |
| Result does not appear in another app | The result remains copied; focus the desired destination and press Command+V or Ctrl+V; a dispatched shortcut does not prove visible input |
| Retry says recording expired | Record again; audio is neither written to disk nor restored after restarting |
| History is empty | It is off by default; enable it for future sessions, or check retention expiry |
| Saved memory seems inactive | Enable global memory, enable the entry, check its app scope and ensure cleanup is configured |
| Browser says preview | Launch the desktop app with `npm start`; preview has no native bridge or real transcription |
| Secure storage unavailable | Restore OS credential-store availability; the app will not persist a plaintext API key |

When reporting a problem, include the app version, OS, selected provider kind/model, visible error and the affected editor type. Redact credentials and personal transcripts. Record whether the issue occurred in preview, development Electron or a packaged application.
