# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Typeless is an Electron + React + TypeScript desktop dictation app for macOS and Windows. Tap a shortcut, speak, tap again: audio goes to a speech-recognition provider, the transcript optionally goes to an OpenAI-compatible text model for polishing, the result is copied to the clipboard and optionally pasted into the foreground app. Users bring their own API keys. No backend, no account, no transcript archive.

Language rule from the README: the product UI is Chinese; all source, comments, docs and commit messages are English.

## Commands

```sh
npm ci                     # install (lockfile pinned; Node 26 / npm 11 in use)
npm run dev                # build native helper, bundle electron, start Vite on 127.0.0.1:5173, launch Electron
npm start                  # launch built app (runs `npm run build` first if dist-electron/main.cjs is missing)
npm run build              # build:native -> typecheck -> vite build -> esbuild electron/{main,preload}.ts -> dist-electron/*.cjs
npm run build:native       # macOS: xcrun swiftc native/macos/*.swift -> native/bin/typeless-native ; Windows: stages Helper.cs
npm run typecheck          # tsc --noEmit (covers src, electron, tests, vite/vitest configs)
npm test                   # vitest run (tests/**/*.test.ts and src/renderer/**/*.test.ts, node environment)
npx vitest run tests/core-session.test.ts        # single test file
npx vitest run -t "distinguishes"                 # by test name
npm run test:desktop       # Playwright Electron e2e with fake audio + mock HTTP providers (build first)
npm run test:delivery      # Playwright e2e that really pastes into a disposable Electron editor (needs OS permissions)
npm run verify:windows     # cross-compile Helper.cs with dotnet (compile check only, not runtime)
native/bin/typeless-native --self-test           # macOS helper gesture/protocol self-test
npm run package:mac        # electron-builder arm64 DMG -> release/
npm run package:win        # electron-builder x64 ZIP -> release/ (package:win:installer for NSIS)
```

Build before `test:desktop` / `test:delivery`; they launch `dist-electron/main.cjs`. Set `TYPELESS_EXECUTABLE` to point them at a packaged binary. Both e2e harnesses write isolated profiles under `.local/` and must run serially with a desktop available.

All caches and outputs stay in the repo: `.cache/` (npm, electron, swift modules, dotnet), `.local/` (app data in dev, test receipts), `dist/`, `dist-electron/`, `native/bin/`, `release/`. All are gitignored. `TYPELESS_DATA_DIR` overrides the data root; dev defaults to `.local/app/`.

## Architecture

### Process boundaries

```
renderer (src/renderer, React, sandboxed, no Node)
   │  window.typeless  (electron/preload.ts, contextBridge)
   │  IPC: typeless:snapshot / typeless:action / typeless:capture / typeless:capture-event
main (electron/main.ts) ── Controller (electron/controller.ts)
   ├── Sessions   (src/core/session.ts)   state machine + cancellation fencing
   ├── Store      (src/core/store.ts)     settings + encrypted secrets, state.json
   ├── Providers  (src/core/providers.ts) ASR + cleanup HTTP
   ├── ClipboardDelivery (electron/clipboard-delivery.ts) serialized copy, owner marker
   ├── VoiceOverlay (electron/voice-overlay.ts) capsule window placement/lifecycle
   ├── UpdateChecker (electron/update-checker.ts) GitHub latest-release check + installer download
   └── NativeClient (electron/native-client.ts) ── JSON-lines over stdio ──> native helper
                                                    macOS: native/bin/typeless-native (Swift)
                                                    Windows: powershell Add-Type native/windows/Helper.cs (C# 5)
```

- `src/shared/contracts.ts` is the single contract between renderer and main: `AppSnapshot`, `AppAction`, `CaptureCommand`/`CaptureEvent`, `TypelessBridge`. Change it first when adding actions or settings.
- The renderer never sees API keys. `hasApiKey` booleans are derived in `Store.snapshot()`; secrets travel only inside `settings.save` actions and are encrypted with Electron `safeStorage` before persistence. No plaintext fallback: if encryption is unavailable the save fails.
- The renderer is state-less about the app: it receives full `AppSnapshot` pushes and dispatches actions. One renderer bundle serves two windows, chosen by URL hash: `#default` (main window) and `#overlay` (the bottom-center capsule). `src/renderer/bridge.ts` falls back to a preview bridge when `window.typeless` is absent (plain browser), so the UI renders without Electron.
- Renderer layout: `main.tsx` renders the first-run setup guide (`onboarding/SetupGuide.tsx`, spec in `docs/UI_DESIGN.md` section 12) while `settings.general.setupCompleted` is false; afterwards it owns the current `Page` (three destinations: 首页, AI 配置, 基本设置) and renders `Sidebar.tsx` plus one page — `Home.tsx` (`DictationPanel.tsx` plus a three-row status list), `settings/Providers.tsx` (AI 配置: both provider forms; the 文字润色 form embeds the 润色程度 and 个人表达说明 rows from `settings/Writing.tsx`), `settings/Preferences.tsx` (基本设置 including the 关于 row with the release check). Colour is reserved for status badges and the microphone meter; pages are white. Shared primitives (`PageHeader`, `SectionGroup`, `SettingRow`, `Segmented`, `KeyChips`, `StatusBadge`, `Wave`) live in `ui.tsx`; design tokens and shared CSS in `styles/tokens.css` and `styles/base.css`, page CSS next to each page (`styles/*.css`, imported by the component). `docs/UI_DESIGN.md` is the visual contract: keep the accessibility hooks it lists in section 10, because the e2e suites select by them.
- Audio capture lives in the renderer (`src/renderer/audio.ts`) because `getUserMedia` needs a document. Main sends `CaptureCommand`s; the renderer replies with `CaptureEvent`s carrying mono 16 kHz PCM16 WAV bytes. Main validates size and sender before accepting.
- Release check: `UpdateChecker` fetches `TYPELESS_UPDATE_URL` (default: this repo's GitHub `releases/latest`) 15 s after launch and every 6 h when packaged or when the variable is set (`off` disables the automatic check; the manual 检查更新 button always runs). It downloads the platform asset into `<data root>/downloads` when `TYPELESS_DATA_DIR` is set, else the system Downloads folder, verifies the GitHub `digest` when present, and only ever opens the file for the user (`shell.openPath`); there is no in-place auto-update because the app is ad-hoc signed. Pure logic lives in `src/core/update.ts`; state travels as `AppSnapshot.update`.
- `electron/main.ts` also enforces security: strict CSP header injection, single-instance lock, IPC sender verification (`trusted()`), media permission granted only to the main window while `arming`/`recording`, dev URL must be loopback.

### Dictation session lifecycle (src/core/session.ts)

`idle → arming → recording → transcribing → polishing → inserting → ready | error | cancelled`

Every async step captures `(session.id, generation, abort.signal)` and checks `this.active(id, generation)` after each await. Cancel, a new toggle, or a capture error bumps `generation` and aborts the signal, so late provider responses and duplicate completions are dropped rather than overwriting a newer clipboard. Preserve this pattern when editing.

Other invariants baked into `Sessions`:
- Provider settings and decrypted keys are snapshotted into `jobContext` at `begin()`; mid-session settings edits do not change the running job, except cleanup enabled/strength/instructions which are re-read at polish time.
- Cleanup failure is not a session error: the raw transcript is copied with a warning.
- Delivery order is copy first, then optional paste. `consumed` is set once a paste is attempted so `retry` cannot replay an uncertain paste.
- On ASR failure the audio is kept in memory for 5 minutes for `retry`, then dropped.
- Error codes are strings like `asr_401`, `no_speech`, `clipboard_changed`. The renderer maps them to Chinese copy in `src/renderer/sessionPresentation.ts`; new codes need an entry there and in `recoverySettings` if they should link to a settings tab.

### Clipboard ownership and paste

`ClipboardDelivery.copy` writes `text/plain` plus a raw format `dev.typeless.owner` holding a UUID. `paste` refuses if the last copy does not match the requested text, then hands the owner UUID to the native helper, which re-checks both clipboard values immediately before posting Cmd+V / Ctrl+V and reports `clipboard_changed` otherwise. Helpers never write the clipboard, never press Enter, and report only `dispatched` (never `confirmed`) today. Treat "dispatched" as unproven delivery in UI copy.

### Native helper protocol

`native/PROTOCOL.md` is authoritative. One JSON object per line on stdio; requests `{id,method,params}`, responses `{id,result|error}`, events `{event,params}` (`shortcut`, `ready`). Methods: `status`, `configureShortcut`, `context`, `pasteText`, `cancelPaste`, `requestPermissions`, `stop`. Paste requests carry a UUID `requestId` and an absolute `deadlineMs` (client uses +4 s); consumed or expired IDs are rejected.

`NativeClient` restarts a dead helper on the next `status()` poll (main polls every 2 s and on resume/unlock), kills a hung one after `native_timeout`, and restores the last configured binding. macOS shortcut is an isolated Fn tap via a listen-only session event tap (`Main.swift` + `TapRecognizer.swift`); Windows is an isolated Right Alt via a low-level keyboard hook. Chords, autorepeat, holds > 2 s and rapid re-taps do not trigger. Electron `globalShortcut` handles the fallback chord independently.

Windows helper constraints: it is compiled at runtime by Windows PowerShell 5.1 `Add-Type`, so `Helper.cs` must stay C# 5 syntax against .NET Framework 4.8 references (`System.Windows.Forms`, `System.Web.Extensions`). `npm run verify:windows` is the only local check; there is no Windows runtime test in this repo.

### Settings model (src/core/store.ts)

- `defaults()` in `store.ts` and `AppSettings` in `contracts.ts` define the schema. `settingsPatch` validates every incoming key by `typeof` against defaults and rejects unknown sections/keys, so adding a setting means updating both, plus the renderer.
- Persistence is a whole-document atomic write (`state.json.tmp` then rename, mode 0600). Unknown top-level or per-section fields in the file are preserved as opaque data but never surface in snapshots.
- Base URLs must be HTTPS, or HTTP on loopback, with no credentials/query/fragment (`endpointBase`). Changing a provider's origin, or the ASR `kind`, silently drops its stored key unless a new one is supplied in the same save.
- `general.setupCompleted` gates the setup guide. Fresh installs start at `false`; a `state.json` written before the flag existed loads as `true` so upgrades skip the guide. While it is `false`, the main process counts shortcut presses into `permissions.shortcutPresses` instead of toggling dictation.
- UI "润色程度" is three levels but the stored shape is two fields: `不润色` = `cleanup.enabled:false`; `轻度润色` = `writing.strength:'light'`; `强力润色` = `writing.strength:'balanced'`. `src/renderer/writingPresentation.ts` does the mapping. Do not rename `'balanced'` without a migration.
- Provider forms save atomically via an explicit 保存 button (`settings/Providers.tsx`); every other control autosaves through `useSettingDraft` (`settings/Autosave.tsx`), which serializes saves and surfaces retry on failure.

### Providers (src/core/providers.ts)

- ASR `kind:'mimo'` posts base64 WAV as an `input_audio` part to `{base}/chat/completions` with an `api-key` header. `kind:'openai'` posts multipart to `{base}/audio/transcriptions` with Bearer auth. Cleanup always uses `{base}/chat/completions` with Bearer auth. Users enter base URLs without the path suffix.
- `request()` enforces `redirect:'error'`, 90 s timeout, 1 MB response cap, and retries 429/503 at most twice honoring `Retry-After` up to 5 s. Non-`stop` finish reasons, refusals, tool calls and empty content are `ProviderError`s, not results.
- `cleanup-prompt.ts` puts the transcript in a JSON `user` message and few-shot examples, never in the system prompt, so dictated text is data rather than instructions. `semanticWarning` flags changed numbers, > 2x expansion, or code fences.

## Testing conventions

- Unit tests construct real `Store`/`Sessions`/`Controller` with an identity `SecretCrypto` and temp dirs under `.local/tests/`; providers are stubbed with `vi.fn`. `Providers` accepts a `fetcher` for HTTP contract tests. See `tests/core-session.test.ts` and `tests/provider-http.test.ts` for the patterns.
- The e2e harnesses monkey-patch `safeStorage`, `clipboard.write` and `systemPreferences.getMediaAccessStatus` (forced to `granted`, because the development Electron binary reports `not-determined` and the setup guide would otherwise never show the meter) inside the Electron main process via Playwright `instance.evaluate`, and serve mock providers on a loopback HTTP server. The desktop suite walks the setup guide first; the delivery suite seeds `setupCompleted: true` to skip it. They write JSON receipts to `.local/<harness>-<id>/result.json`.
- No physical Fn, real microphone, live provider, or Windows runtime is covered by any automated test. Do not describe those as verified.

## Documentation conventions

- `docs/PROPOSAL.md` is the current product/design contract and `docs/UI_DESIGN.md` the interface specification; `docs/VALIDATION.md` records what was actually executed for the current version and its limits; `README.md` is the build/run entry; `docs/USER_GUIDE.md` describes user-facing behavior; `docs/research/` is historical evidence, not a feature list. `RESEARCH_BRIEF.md` and `SYNTHESIS_CHECKLIST.md` at the root are earlier planning artifacts.
- When behavior changes, update the matching doc in the same change, and keep claims scoped: a test script or build output is not acceptance evidence until it has been run and recorded in `VALIDATION.md`.
