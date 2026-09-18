# User guide

This guide describes the reduced dictation interface. UI labels are shown in Chinese to match the app. See [Validation](VALIDATION.md) for actual artifacts and completed checks; this guide does not certify all editors or live-provider quality.

## Open the application

The 0.1.5 package output locations are [Typeless-0.1.5-arm64.dmg](../release/Typeless-0.1.5-arm64.dmg) for Apple silicon macOS and [Typeless-0.1.5-win.zip](../release/Typeless-0.1.5-win.zip) for Windows x64. Consult Validation for availability and verification. On macOS, quit any existing instance, drag `Typeless.app` into Applications, eject the disk image, and launch the installed app. The local build is ad-hoc signed, not Developer ID signed or notarized. On Windows, extract the entire portable archive and run `Typeless.exe` with its companion files intact.

From source, run `npm ci`, `npm run build`, then `npm start` in the checkout. The first run contains no API keys.

## Configure AI once

The initial configuration action opens **AI 配置** directly. The window contains a recording control and three tabs: **AI 配置**, **基本设置**, and **表达风格**.

Under **AI 配置**, each provider has its own visible connection form:

| Connection | Configuration |
| --- | --- |
| **语音识别** | Speech protocol, base URL, model and API key. The MiMo preset uses `https://api.xiaomimimo.com/v1` and `mimo-v2.5-asr`. |
| **文字润色** | Independent OpenAI-compatible base URL, model and API key. Select a model supported by your provider account. |

Click **保存** in the edited connection. Its address, model, protocol where applicable, and replacement key are submitted together. Editing one form does not save the other. Failed saves keep the draft and show an error; do not assume the connection changed until saving succeeds.

Saved keys never appear in the input again. Leaving a key blank retains its saved value; **删除密钥** explicitly removes it. Changing the endpoint origin or speech protocol invalidates the old key unless you enter a replacement. Keys are not included in renderer snapshots. HTTPS is required except for loopback HTTP services. Do not include credentials or query parameters in a base URL, or append `/chat/completions`.

The OpenAI-compatible speech adapter uses multipart `/audio/transcriptions`; MiMo uses an audio message sent to `/chat/completions`. Choose the matching protocol, endpoint and exact model identifier yourself. Saving configuration does not prove provider access, balance or model quality.

## Choose a writing style

Open **表达风格** and select one level:

- **不润色:** use the original transcript; no text-model request.
- **轻度润色:** remove clear fillers and accidental repetition with minimal rephrasing.
- **强力润色:** also simplify self-corrections and redundant phrasing, while preserving facts, negation, quantities, names and uncertainty.

The level saves immediately; no second enable switch or Save button is required. New installations default to strong polishing. Output quality depends on the selected text model.

Use **个人表达说明** for optional instructions such as preferred terminology or language style. It saves when you leave the field or press Command/Ctrl+Enter. Save failures remain visible with a retry action. When **不润色** is selected, these instructions stay saved but do not affect output. Dictated questions remain text to write, not instructions for the model to answer.

## Basic settings and permissions

**基本设置** contains the microphone, primary shortcut, fallback shortcut, **完成后自动粘贴**, **录音提示音**, and **登录系统时启动**. Selectors and switches save immediately. The fallback shortcut offers three readable presets and saves on selection; an existing custom binding remains available. There is no global Save action. Startup behavior applies to packaged applications.

Microphone names may be unavailable before permission is granted; **系统默认** uses the default device. Device choices refresh when devices change. A waveform indicates audio level, not a live transcript. Recording sounds indicate recording transitions; visible state remains authoritative if sound playback is suppressed.

Use the inline permission controls when microphone or native input permissions are missing. On macOS, native Fn listening depends on the event-tap permissions, and automatic paste depends on Accessibility. Review Accessibility and Input Monitoring in system settings; restart if macOS requires it. Development Electron and the installed app can have different permission identities. The app's recording button and automatic copying do not require native paste permission.

## Dictate from anywhere

1. Tap Fn on macOS, Right Alt on Windows, or the configured fallback. You can also click **开始听写** in the window.
2. Wait for the recording waveform, then speak. No editable-field check is required, including in terminals or with no input focused.
3. Tap the shortcut again or click **结束听写**. The capsule shows a processing animation while recognition and any polishing complete.
4. The result is automatically copied and remains on the clipboard. If **完成后自动粘贴** is on, the app dispatches Command+V/Ctrl+V to whichever application is now in front. The capsule hides after copying and the optional paste attempt.
5. If nothing received the paste, focus the intended destination and paste manually. The current-result panel lets you view and copy either the original transcript or the edited result. Copying does not dispatch another paste or alter the other result.

The app never sends Enter. Switching applications during processing changes the possible paste destination. A reported dispatch does not prove the destination accepted text. There is no original-target lock or automatic focus restoration.

The default fallback is Command/Ctrl+Shift+Space. Only isolated primary-key taps trigger dictation; Fn chords and AltGr typing should remain normal input. Windows Fn support depends on keyboard hardware, so Right Alt is used instead. If Fn/Globe invokes a macOS system action, review its keyboard assignment or use the fallback. The application does not change that assignment automatically.

Hover over the capsule to reveal cancel and, while recording, finish. During processing, cancel remains available. The main window and capsule context menu also offer cancellation. Cancellation stops the current operation, but cannot undo text already copied or pasted. The default recording cap is 60 seconds; silence alone does not end a thinking pause.

## Recovery

When polishing fails, the recognized original is copied and can still be automatically pasted. A visible warning distinguishes this fallback from polished output. If recognition fails, **重试** can reuse the active session's retained audio until it expires. Recognized original text remains available in the current-result view; explicitly copying it changes only the clipboard, even if the edited result was already pasted. A clipboard failure is a separate error; do not assume any text was copied until copying succeeds.

Click an error capsule to open the main recovery surface. Missing provider configuration links to **AI 配置**; microphone or input-permission issues link to the relevant basic settings. Silence, disconnection, denied access and provider failures have distinct recovery messages. The main window shows only the current result, warnings and relevant recovery actions. Starting another session replaces the current session; copy any text you need before doing so.

## Local storage and retention

Development defaults to `.local/app/`, with configuration and encrypted credentials in `.local/app/settings/state.json`. Installed applications normally use Electron's OS application-data root with the same `settings/state.json` suffix. `TYPELESS_DATA_DIR` selects a separate root. Session data, logs and crash-dump locations are sibling directories. Do not share one live data root between independent running installations.

API keys are encrypted through OS-protected storage before persistence; encryption failure does not permit plaintext fallback. Other settings are not encrypted. The current transcript is not stored as a persistent transcript archive. Raw audio is kept in memory for the active request; failed recognition may retain it for up to five minutes for retry. Success, cancellation, a new session or quitting clears it. Restarting cannot recover that audio.

Every finished result replaces the system clipboard. The app does not restore its prior contents. Audio is sent to the configured speech provider, and polishing sends the transcript plus writing instructions to the configured text provider. No screenshots, arbitrary documents or continuous typing are supplied as context. Provider retention and billing policies are independent of local storage; the app does not promise offline operation or provider-wide zero retention.

## Troubleshooting

| Symptom | Next action |
| --- | --- |
| Speech provider not configured | Use the configuration action to open **AI 配置**, then save a speech-provider key and model. |
| Save failed | Read the inline error; correct the draft and retry the same provider or setting. |
| Authorization or balance error | Check the selected provider account, key, model access and balance. |
| Endpoint error | Check the base URL and whether the speech protocol matches the service. |
| No waveform or no speech detected | Check microphone permission and the selected input, then record audible speech. |
| Fn unavailable or opens another action | Review primary and fallback status in **基本设置**, native permissions, and the macOS keyboard assignment; use the button or fallback meanwhile. |
| Right Alt conflicts with typing | Choose a suitable fallback for your keyboard layout. |
| Original text appears instead of polished text | Read the warning and check **表达风格** and the text connection. |
| Text is absent from the destination | Use the retained clipboard manually; check automatic paste and native permissions. |
| Retry audio expired | Record again; audio is not restored from disk. |
| Browser shows preview | Launch the desktop application; the preview has no native transcription bridge. |
| Secure storage unavailable | Restore OS credential-store access, then save the key again. |

For a bug report, include app version, OS, provider kind/model, visible error and affected editor. Redact keys and personal transcripts, and specify whether you used development Electron or a packaged app.

## Design references

The [complete official Quickstart review](research/quickstart-review.md) explains the scoped adaptations, with supporting [dictation/action evidence](research/quickstart-dictation-and-actions.md) and [preferences/recovery evidence](research/quickstart-preferences-and-learning.md). These sources do not establish implementation acceptance; consult [Validation](VALIDATION.md).
