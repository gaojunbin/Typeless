# Development

How to build, run, test and package Typeless from this checkout. For what the product does, read the [README](../README.md) and the [user guide](USER_GUIDE.md). For the architecture map and the repository conventions that coding agents follow, read [CLAUDE.md](../CLAUDE.md).

## Requirements

- Node.js and npm matching the lockfile (Node 26 and npm 11 are in use); install dependencies with `npm ci`.
- macOS: Xcode Command Line Tools, because the native helper is compiled with `xcrun swiftc`.
- Windows: nothing extra at runtime; the helper is compiled on the fly by Windows PowerShell 5.1. An optional .NET SDK enables `npm run verify:windows`.
- No API keys are needed: the app ships without keys and every automated test uses mock providers.

## Build and run

```sh
npm ci
npm run build   # native helper -> typecheck -> Vite renderer -> esbuild main/preload
npm start       # launch the built app
npm run dev     # rebuild the helper, start Vite on 127.0.0.1:5173 and launch Electron
```

Opening the renderer in a plain browser shows a marked preview without native transcription; adding `#setup` to the URL opens the setup guide.

## Tests

```sh
npm run typecheck
npm test                 # Vitest unit tests
npm run test:desktop     # Playwright Electron e2e with fake audio and mock providers (build first)
npm run test:delivery    # real paste into a disposable Electron editor; needs existing OS permissions
npm run test:update-mac  # macOS only: in-place update of a packaged copy under .local/ (run package:mac first)
npm run verify:windows   # compile check of native/windows/Helper.cs with dotnet
native/bin/typeless-native --self-test
```

`test:desktop` walks the setup guide, configuration, recording with fake audio, the mocked release check and recovery through real Electron IPC. `test:delivery` checks native paste, input events, clipboard retention, focus and the capsule; it requires permissions that are already granted and grants none. Both write isolated profiles and JSON receipts under `.local/`, must run serially and need a desktop. Set `TYPELESS_EXECUTABLE` to point them at a packaged binary. No automated test covers a physical shortcut, a real microphone, a live provider or the Windows runtime.

## Packaging

```sh
npm run package:mac   # arm64 DMG -> release/Typeless-<version>-arm64.dmg
npm run package:win   # x64 portable ZIP -> release/Typeless-<version>-win.zip
```

macOS output is sealed with the project's fixed self-signed certificate, **Typeless Project**, and is not notarized. The fixed identity is what lets Accessibility and Input Monitoring grants survive upgrades: macOS remembers the signer, and every release carries the same one. Gatekeeper still warns on the first install because no Apple certificate is involved. Windows output is unsigned.

### Signing identity

- The certificate lives only in the maintainer's login keychain; the repository holds nothing but its name (`build.mac.identity`). The private key must never be committed, and a password-protected `.p12` backup belongs in a password manager: losing the key means a new identity, and users of the following release have to grant the permissions once more and install that one release by hand (the in-place installer only accepts bundles sealed by the same certificate).
- Creating it (once, on the release machine): Keychain Access → Certificate Assistant → Create a Certificate…; name `Typeless Project`, identity type Self Signed Root, certificate type Code Signing; tick "Let me override defaults" and set the validity to 3650 days, keep the other defaults, keychain "login". Then open the certificate, expand Trust and set Code Signing to Always Trust, and open its private key → Access Control → allow all applications (or add `codesign`), so `npm run package:mac` can sign without a dialog. `security find-identity -v -p codesigning` must list `Typeless Project` afterwards.
- Machines without that certificate (contributors, CI) build with `TYPELESS_SIGN_IDENTITY=- npm run package:mac` for an ad-hoc seal, or point the variable at their own certificate. Ad-hoc builds behave like releases before 2.4.0: each one is a new identity to macOS. Package output is not a release: the [validation record](VALIDATION.md) lists the integrity, signature and runtime checks a build must pass, and its "Reproduce" section is the release checklist. GitHub Releases carry the installers together with the SHA-256 digests that the in-app update check verifies; on macOS the app then installs the DMG in place and relaunches, on Windows it opens the archive.

## Data, logs and environment

- Development data defaults to `.local/app/`; packaged apps use the operating system's application-data directory. `TYPELESS_DATA_DIR` overrides the root.
- Settings live in `settings/state.json` under that root, written as a whole document with an atomic rename and mode 0600. API keys are encrypted with Electron `safeStorage` before persistence and never reach the renderer; there is no plaintext fallback.
- Helper status transitions are appended to `logs/native-status.log` as JSON lines, truncated past 256 KB, without transcripts or keys.
- `TYPELESS_UPDATE_URL` points the release check at another `releases/latest` document (the desktop harness uses a loopback mock); `off` disables the automatic check while keeping the manual button.
- All caches and outputs stay inside the repository and are gitignored: `.cache/`, `.local/`, `dist/`, `dist-electron/`, `native/bin/`, `release/`.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/renderer/` | React interface, setup guide and microphone capture |
| `src/core/` | Providers, session lifecycle, settings store and release parsing |
| `src/shared/contracts.ts` | The single renderer/main IPC contract |
| `electron/` | Main process, controller, clipboard delivery, voice capsule, update checker and native client |
| `native/` | macOS Swift helper and Windows C# helper; `PROTOCOL.md` is authoritative |
| `tests/` | Vitest unit tests and the two Playwright harnesses |
| `docs/` | [Proposal](PROPOSAL.md), [UI design](UI_DESIGN.md), [validation](VALIDATION.md), [user guide](USER_GUIDE.md), [implementation decision](IMPLEMENTATION_DECISION.md), research notes and screenshots |

## Conventions

The product interface is Chinese; source, comments, documentation and commit messages are English. When behaviour changes, update the matching document in the same change, and record executed checks in [VALIDATION.md](VALIDATION.md) before describing anything as verified.
