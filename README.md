# Typeless desktop

A personal AI dictation application for macOS and Windows. Tap a shortcut, speak, and tap again to finish. Results are automatically copied; optional automatic paste sends them to the application currently in front. Bring your own speech-recognition and text-processing API keys. The interface is Chinese; source code and documentation are English.

This is an independent implementation, not the commercial Typeless service. Current artifacts, executed checks and remaining acceptance limits belong in [Validation](docs/VALIDATION.md). Research and mock-provider tests do not establish live recognition or polishing quality.

## A two-column window

The main window is a two-column shell. A fixed sidebar carries the application mark, four destinations and a card showing the effective dictation shortcut with its status. The content column scrolls on its own and prints the current version at its lower right.

- **首页:** the **说话，不打字** hero, the dictation card with its start/stop button, shortcut keycaps, recording waveform, recovery alert and current result, a shortcut card for the primary and fallback bindings, a **配置概览** row of three status cards that open the other destinations, and a side rail with a status summary and a **三步开始** quick start.
- **AI 配置:** independent speech-recognition and text-polishing connections. Each connection has its own endpoint, model and API key, saved together with its **保存** button; the speech connection also selects the **小米 MiMo** or **OpenAI 兼容** protocol.
- **基本设置:** rows grouped under **快捷键**, **音频**, **通用** and **系统权限**: microphone, primary and fallback shortcuts, automatic paste, recording sounds, startup behavior and permission status.
- **表达风格:** **不润色**, **轻度润色**, or **强力润色**, plus optional **个人表达说明**.

Switches, selectors and the polishing level save immediately. Text preferences save on blur or Enter; multiline instructions use blur or Command/Ctrl+Enter. A failed save remains visible and can be retried. There is no global Save action and no second navigation layer for settings. Provider credentials deliberately use an explicit atomic save rather than saving partially edited addresses or keys.

No polishing copies the original transcript without requesting the text model. Personal instructions remain saved but have no effect in this mode. Light polishing targets fillers and accidental repetitions. Strong polishing additionally targets self-corrections and redundancy while preserving facts, names, numbers, negation and uncertainty. New installations select strong polishing; actual output depends on the configured model. Cleanup failures retain and copy the original transcript with a warning.

## First run and everyday dictation

1. With no speech key saved, the application opens on **AI 配置**; from **首页**, the **配置语音** button and the **语音识别** overview card open it too. The speech preset is Xiaomi MiMo, `https://api.xiaomimimo.com/v1`, model `mimo-v2.5-asr`; enter your own key and click that connection's **保存**. The alternative OpenAI-compatible adapter uses multipart `/audio/transcriptions`.
2. Configure the independent **文字润色** connection using your text provider's base URL, model and key, then save it. Alternatively, select **表达风格 → 不润色** for recognition alone. Do not append `/chat/completions` to a base URL.
3. In **基本设置**, select a microphone and review permissions. The **首页** button can record and copy even when native shortcut or paste permissions are unavailable.
4. Click **开始听写** on **首页**, or use the shortcut from any application. Tap again, click **结束听写**, or click the capsule's confirm circle to finish. The bottom-center capsule is black and shows a cancel circle, a white waveform and a confirm circle, all visible without hovering; the remaining time joins them for the last ten seconds of the recording cap. Processing replaces the waveform and confirm circle with **思考中** and keeps cancel, then the capsule disappears after copying and the optional paste attempt. Click an error capsule to open recovery.

macOS uses isolated Fn taps; Windows uses isolated Right Alt taps. The default fallback is Command/Ctrl+Shift+Space. Fn hardware behavior is not universal on Windows, and AltGr combinations must remain normal typing. If macOS Fn/Globe also triggers a system action, review its keyboard setting or use the fallback; the app does not change that system assignment.

Recording does not require an editable field, an original target, or a terminal allowlist. Every completed result replaces the clipboard and remains there. **完成后自动粘贴** optionally dispatches Command+V/Ctrl+V to the current foreground application; changing applications changes the destination. A dispatched shortcut is not proof of visible input. With no usable destination, paste the copied result later. The app never presses Enter to send or execute text. Canceling cannot undo an already completed copy or paste.

The result card on **首页** offers **整理后** and **原文** views with a copy button. Copying either view only updates the clipboard: it does not run a model, replace the other view, or dispatch another paste. New sessions replace these transient views. The recovery alert above that card offers relevant configuration links and retry only while the session remains recoverable. The recorder produces mono 16 kHz PCM16 WAV and defaults to a 60-second cap. See the [User guide](docs/USER_GUIDE.md) for permissions, storage and troubleshooting.

## Build and run

Use Node.js supported by the locked dependencies and npm. macOS native builds require Xcode Command Line Tools. From this checkout:

```sh
cd /Users/junbingao/github/Typeless
npm ci
npm run build
npm start
```

On Windows, substitute your checkout path. The build produces the renderer, Electron entry points and host-native helper. No API keys ship with the app. A browser opening the renderer displays a marked preview without native transcription.

Development and verification commands, run from the project directory:

```sh
npm run dev
npm test
npm run typecheck
npm run test:desktop
npm run test:delivery
npm run verify:windows
```

Build before desktop tests. `test:desktop` exercises real Electron IPC, configuration and recording with fake audio, local HTTP providers and test-only credential encryption. `test:delivery` launches a disposable external editor to check native paste, input events, clipboard retention, focus and overlay behavior; it requires existing permissions and does not grant them. Neither measures live ASR quality, a physical shortcut, the real microphone, or OS credential security. Test evidence is isolated under `.local/`. `verify:windows` checks helper compilation with an optional .NET SDK, not Windows runtime behavior. Normal Windows use relies on the packaged helper and system PowerShell.

## Packaging

The 2.0.0 build targets are:

- macOS Apple silicon: [Typeless-2.0.0-arm64.dmg](release/Typeless-2.0.0-arm64.dmg), with the unpacked [Typeless.app](release/mac-arm64/Typeless.app).
- Windows x64 portable: [Typeless-2.0.0-win.zip](release/Typeless-2.0.0-win.zip).

These are output locations, not release or acceptance claims. Consult [Validation](docs/VALIDATION.md) for the artifacts actually built and checked.

```sh
npm run package:mac
npm run package:win
```

On macOS, drag the app from the DMG into Applications, eject the image, then launch it. The build uses ad-hoc signing, not Developer ID signing or notarization. On Windows, extract the complete ZIP before opening `Typeless.exe`; retain its companion files. Signing, notarization, publishing and automatic updates are separate work.

## Data and credentials

Audio goes directly to the chosen speech provider. When polishing is enabled, the transcript and writing instructions go to the chosen text provider. Provider policies and charges apply independently; this is not an offline or provider-zero-retention claim. No application account, hosted backend or sync is required.

Keys are encrypted with OS-protected storage before local persistence and are never returned in renderer snapshots. Blank key fields retain saved keys; **删除密钥** removes one explicitly. Changing an endpoint origin or speech protocol invalidates its old key unless a replacement is supplied. Encryption failure does not fall back to plaintext keys.

The current transcript stays in memory; the application does not create a persistent transcript archive. Failed recognition can retain audio in memory for up to five minutes for retry. Success, cancellation, a new session or quitting releases it. The production clipboard is not restored to its previous contents. Other local settings are not encrypted by this application.

Development data defaults to `.local/app/`; installed apps normally use the OS application-data directory. `TYPELESS_DATA_DIR` overrides the root. See [local storage](docs/USER_GUIDE.md#local-storage-and-retention).

## Project references

| Path | Purpose |
| --- | --- |
| [Proposal](docs/PROPOSAL.md) | Current scope, architecture and acceptance requirements |
| [Validation](docs/VALIDATION.md) | Executed checks and remaining limitations |
| [UI design](docs/UI_DESIGN.md) | Interface specification for the sidebar shell, pages and voice capsule |
| [Complete Quickstart review](docs/research/quickstart-review.md) | Full official-guide review and scoped interaction decisions |
| [Dictation and actions research](docs/research/quickstart-dictation-and-actions.md) | Recording, editing and adjacent-action evidence |
| [Preferences and recovery research](docs/research/quickstart-preferences-and-learning.md) | Personalization, settings and recovery evidence |
| [Official settings research](docs/research/settings-simplification.md) | Screenshot evidence and the reduced configuration design |
| [Implementation decision](docs/IMPLEMENTATION_DECISION.md) | Shared Electron stack and native helper tradeoffs |
| [Provider research](docs/research/providers.md) | Protocol sources and provider contracts |
| [Dictation decision](docs/research/dictation-redesign.md) | Copy-first behavior and historical target investigation |
| `src/renderer/` | Interface and microphone capture |
| `src/core/` | Providers, session lifecycle and local settings |
| `electron/`, `native/` | Desktop integration and platform helpers |
