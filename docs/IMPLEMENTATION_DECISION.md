# First implementation decision

Date: 2026-09-17. The user authorized implementation after research and requested no further questions while unavailable.

## Decision

Build macOS and Windows together using Electron, React and TypeScript, with a Swift helper on macOS and a C# helper hosted by Windows PowerShell on Windows. The shared renderer and core own the complete dictation workflow. Native helpers own OS-specific shortcut and target validation.

The research's initial Tauri preference is superseded for this first implementation. Electron allows the available TypeScript/Swift toolchain to produce and validate a complete product without first introducing an uninstalled Rust toolchain. The tradeoff is a larger runtime and higher baseline memory use. Native keyboard and insertion acceptance is still required; selecting Electron does not eliminate those integration risks.

This is a global dictation application. It does not register as a full operating-system IME. It cooperates with the user's existing input methods, and never presses Enter to send a message or execute a command.

## Assigned ownership

| Work package | Owner | Files |
|---|---|---|
| UI, audio capture, onboarding, preferences and recovery | Product/renderer agent | `src/renderer/`, `index.html` |
| Providers, local data, session controller and Electron security boundary | Provider/core agent | `src/core/`, `electron/` except native client |
| Fn / Right Alt, target identity, native insertion and native builds | Desktop/native agent | `native/`, `electron/native-client.ts`, `scripts/build-native.mjs` |
| Shared contract, build/package tooling, integration review, validation and delivery | Coordinating agent | `src/shared/`, root tooling, integrated documents |

All three implementation agents use the available `gpt-6-astra` model identifier with medium reasoning effort. The model identifier is a tool configuration, not an independently verified runtime identity.

## First-version acceptance

- Both platform implementations share recording, ASR, cleanup, translation, dictionary, explicit memory, app profiles, history and recovery behavior.
- MiMo requests use the documented audio message contract; an OpenAI transcription adapter is independently selectable.
- User secrets stay outside renderer snapshots and use OS-backed encryption at rest when available; unavailable encryption never causes plaintext persistence.
- Startup does not request permissions, enable login items, read unrelated credentials or capture ambient audio automatically.
- Fn single tap starts and the next single tap stops on supported macOS keyboards. Windows uses Right Alt or a user-configured supported shortcut; universal Fn is not promised.
- Changed or uncertain targets require review/manual copy. Provider failures retain available raw text. Results never silently go to another app or another model vendor.
- Unit/contract checks and actual native build/UI verification are recorded separately from API-key-dependent inference and Windows-machine acceptance.

## Current evidence boundary

Research is public-source analysis. It is not firsthand Typeless benchmarking. This machine provides macOS arm64; no Windows runtime or user provider keys have been supplied. Build outputs, screenshots, automated checks and remaining acceptance items will be recorded in `docs/VALIDATION.md` at delivery.

Reference: [Electron security](https://www.electronjs.org/docs/latest/tutorial/security), [global shortcuts](https://www.electronjs.org/docs/latest/api/global-shortcut), and [OS-backed safe storage](https://www.electronjs.org/docs/latest/api/safe-storage), accessed 2026-09-17.
