# Typeless desktop

A personal AI dictation application for macOS and Windows. Tap a shortcut, speak naturally, and finish with another tap. Bring your own speech-recognition and text-processing API keys. The interface is Chinese; source code and project documentation are English.

This is an independent implementation, not the commercial Typeless service. Research informed its workflow; vendor claims are not our test results. Current build artifacts, executed checks, and remaining platform/provider acceptance limits are recorded in [Validation](docs/VALIDATION.md).

## What it does

- Record from any application with a compact waveform, tap again to process, and automatically copy the result. When enabled, paste it into the application currently in front.
- Recognize speech using Xiaomi MiMo or a separate OpenAI-compatible transcription adapter.
- Clean up text or explicitly translate it with a configurable OpenAI-compatible text model.
- Copy and retain the original transcript when cleanup fails; automatic paste can still use that text while the warning remains visible.
- Manage dictionary terms, explicit scoped memories, per-application writing rules, and optional local history.
- Run without an application account, hosted backend, Docker, or cloud synchronization.

The first version records mono 16 kHz PCM16 WAV: 60 seconds by default, configurable from 5 to 120 seconds. Dictionary terms currently guide **text cleanup**, not the ASR request. Memory and text history are disabled by default. There is no automatic keystroke learning, general voice assistant, mobile client, or selection-based voice editor in this version.

## Desktop artifact entry points

Release 0.1.3 downloads are listed below. Packaging and acceptance evidence are tracked in Validation. See [Validation](docs/VALIDATION.md) for package checks and runtime acceptance.

- macOS Apple silicon: [Typeless-0.1.3-arm64.dmg](release/Typeless-0.1.3-arm64.dmg). Open the disk image, drag `Typeless.app` into `Applications`, eject the image, then launch the installed app. The unpacked build is written to [Typeless.app](release/mac-arm64/Typeless.app).
- Windows x64: [Typeless-0.1.3-win.zip](release/Typeless-0.1.3-win.zip). Extract the whole archive, then run `Typeless.exe`. This is a portable package, not an installer.

The app uses Electron + React + TypeScript with native Swift/macOS and C#/Windows helpers. Artifact availability is separate from real-API and Windows runtime acceptance; see the validation report before treating either as verified.

## Build and run

Use a current Node.js runtime supported by the locked dependencies and npm. macOS native builds require Xcode Command Line Tools (`xcrun swiftc`). The Windows native helper uses Windows PowerShell and system assemblies for shortcuts and paste dispatch; qualify its behavior on Windows before relying on automatic paste. See [Validation](docs/VALIDATION.md) for the environment actually tested.

From this checkout:

```sh
cd /Users/junbingao/github/Typeless
npm ci
npm run build
npm start
```

On Windows, first change to your own checkout directory instead of using the macOS path above. `npm ci` installs locked dependencies; `npm run build` builds the renderer, Electron entry points and host-native helper. `npm start` opens the desktop app. The first run contains no API keys and cannot perform real cloud transcription until configured.

For development and verification, run each command from the same project directory:

```sh
npm run dev
npm test
npm run typecheck
npm run test:desktop
npm run test:delivery
npm run verify:windows
```

`npm run dev` starts the local renderer server and Electron; run the full build first to prepare the native helper. Renderer changes reload during development; restart the command for main-process changes. `npm test` runs automated tests, and `npm run typecheck` checks TypeScript. `npm run test:desktop` exercises Electron IPC and local mock-provider HTTP with fake audio/keys and test-only credential encryption; it does not validate live ASR, the real microphone or OS keychain security. Build first. `npm run verify:windows` compiles the Windows helper against its reference assemblies; it requires an optional .NET SDK in `.cache/dotnet` or on `PATH`, and does not test Windows runtime behavior. The .NET SDK is not required to use the Windows portable app.

An ordinary browser opening the renderer sees a clearly marked UI preview: it does not simulate successful transcription or provide native integration.

`npm run test:delivery` launches a separate disposable Electron editor to check real native paste, input events, focus retention, clipboard retention and overlay dismissal. It also checks recording and clipboard retention without an input field. The external-paste portion requires existing native permissions; the test never grants them automatically. It uses fake audio, local HTTP providers and test-only encryption; physical shortcuts and live ASR are outside this check. Evidence is written under `.local/delivery-e2e-*/`.

Packaging commands:

```sh
npm run package:mac
npm run package:win
```

Outputs are configured under `release/`. The macOS target produces `release/Typeless-0.1.3-arm64.dmg` and retains `release/mac-arm64/Typeless.app`; it targets Apple silicon, not Intel Macs. The default Windows target is an x64 portable ZIP: extract the entire archive and run `Typeless.exe`. Keep its companion files and resources together. An optional `npm run package:win:installer` target builds NSIS on Windows or a compatible host. Current artifact links are above; consult [Validation](docs/VALIDATION.md) for packaging and runtime evidence. The macOS app uses an ad-hoc signature, not Developer ID signing or notarization. The attempted NSIS build on this arm64 Mac encountered an incompatible host binary (`-86`) without Rosetta, so Windows distribution uses ZIP; no system Rosetta installation was performed. Signing, notarization, store publication and automatic updates are separate from a local package build.

## First run

The white interface has four navigation entries: **语音输入**, **历史记录**, **个性化**, and **设置**. **个性化** groups **词典**, **记忆**, and **应用风格**; **设置** has **模型服务**, **声音与快捷键**, **文字整理**, and **隐私与权限** tabs. Recording options and text-only processing are collapsed on the home page.

The ASR and cleanup configurations are independent: each has its own endpoint, model and API key. Neither has a supplied key.

1. Open **设置 → 模型服务**. For MiMo ASR, use `https://api.xiaomimimo.com/v1`, model `mimo-v2.5-asr`, and your own key.
2. Set the text provider's OpenAI-compatible base URL, API key and model ID, then click **保存设置**. For recognition-only use, choose **设置 → 文字整理 → 润色程度 → 不润色**. The same selector offers **轻度润色** and **强力润色**; there is no separate cleanup switch. Do not append `/chat/completions` to the base URL.
3. Open **设置 → 隐私与权限** and grant microphone permission. On macOS, grant the permissions needed for native Fn detection and paste dispatch, then refresh permission status. Missing native permissions do not prevent recording from the app button or automatically copying a finished result. Reopen the app if macOS requires it.
4. Return to **语音输入**. **录音选项** contains **练习模式**, enabled by default. Click **开始说话**, speak, then **结束录音**. The result is automatically copied without automatic paste in practice mode. Review it and expand **原文与更多操作** for the recognized text and recovery actions.
5. Use the global shortcut to record from anywhere, including a terminal or an application without an editable field. The bottom-center capsule shows a waveform while recording and an animation while processing. Every finished result is copied and remains on the clipboard. With **设置 → 声音与快捷键 → 完成后自动粘贴** enabled, non-practice dictation also dispatches Command+V or Ctrl+V to the application in front at completion. If there is nowhere to paste, use the copied text later. The capsule disappears after copying and the optional paste attempt finish. Right-click it to cancel or open Typeless; canceling after a copy does not restore the previous clipboard.

macOS uses isolated **Fn** taps. Windows uses isolated **Right Alt** taps or a configurable fallback combination. Universal Windows Fn support is not guaranteed; Fn visibility depends on keyboard hardware, and AltGr combinations must not be treated as dictation taps. The fallback is **Command/Ctrl + Shift + Space**, configurable in Settings. If the macOS Fn/Globe key also opens emoji or system dictation, review its assigned action in your macOS keyboard settings and select “Do Nothing” if available, or use the fallback shortcut. Labels vary by macOS version. The app does not change this system key behavior automatically. Do not repurpose a key needed for your normal input layout; choose another fallback if conflicts occur.

See the [User guide](docs/USER_GUIDE.md) for setup details, recovery, storage, permissions, CSV format and limitations.

## Data and privacy

Audio goes directly to the selected speech provider. Recognition text, approved vocabulary, writing preferences and enabled applicable memories go to the selected text provider when polishing or translation is requested. Optional application-context sharing adds an application name obtained on a best-effort basis; app-specific rules can still be selected locally and sent without that name. Provider policies and charges apply independently.

No raw audio is written to history. Failed recognition can retain the current recording in memory for five minutes for retry; success, cancellation, a new session or quitting releases it. API keys are encrypted using OS-protected credential facilities before local persistence and never returned in renderer snapshots. Every completed result, including practice and text-only processing, replaces the system clipboard with its text; the app does not restore the previous clipboard. Other local configuration/history text is not encrypted by this application. This is not an offline or provider-zero-retention claim.

Development data stays under `.local/app/` by default. Installed applications normally use the OS app-data directory. `TYPELESS_DATA_DIR` can choose a different root. See the exact layout and deletion behavior in the [User guide](docs/USER_GUIDE.md#local-storage-and-retention).

## Documents and structure

| Path | Purpose |
|---|---|
| [Proposal](docs/PROPOSAL.md) | Scope, architecture, milestones and requirement traceability |
| [Implementation decision](docs/IMPLEMENTATION_DECISION.md) | Shared Electron stack and native-helper tradeoffs |
| [Validation](docs/VALIDATION.md) | Executed checks, artifacts and unresolved acceptance |
| [Product research](docs/research/typeless-product.md) | Source-linked Typeless workflow and replication matrix |
| [Provider research](docs/research/providers.md) | MiMo protocol and provider contracts |
| [ASR comparison](docs/research/asr-comparison.md) | Typeless disclosure audit, current Chinese ASR quality evidence, regional pricing and selection guidance |
| [Desktop research](docs/research/desktop-architecture.md) | macOS/Windows integration constraints |
| [Dictation interaction decision](docs/research/dictation-redesign.md) | Current copy-first decision and superseded original-target investigation |
| `src/renderer/` | React interface and microphone capture |
| `src/core/` | Providers, session lifecycle and local store |
| `src/shared/contracts.ts` | Renderer/main bridge contract |
| `electron/` | Preload, main process and platform integration |
| `native/` | Swift and Windows C# helpers |

Recording does not require an original input target, Accessibility tree, editable-field classification, or terminal allowlist. Application context is optional personalization input and cannot block microphone startup. Automatic paste goes to the current foreground application, so switching applications changes where a later paste may land. A dispatched paste remains distinct from confirmed delivery; when paste fails or is unavailable, the copied text remains available. The app never presses Enter to send a message or execute a command.
