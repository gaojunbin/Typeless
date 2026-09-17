# Integrated Delivery Review Checklist

The user authorized implementation after the initial research phase. This checklist now reviews the proposal, implemented first version, documentation, and delivery evidence together. A checked design requirement does not by itself establish tested runtime behavior; record actual results and limitations in `docs/VALIDATION.md`.

## Confirmed user decisions

- macOS and Windows are in the same first-version scope; implementation, packaging and native acceptance are tracked separately.
- Implementation is authorized. The selected architecture is Electron + React + TypeScript with Swift and Windows C# native helpers.
- The first distribution targets are a macOS Apple silicon application directory and a Windows x64 portable ZIP. NSIS remains an optional separate target.
- Xiaomi MiMo is the default ASR provider; its key is configured by the user.
- Text cleanup uses a separate OpenAI-compatible endpoint; its base URL, key, and model are configured by the user.
- Toggle-to-talk is the primary interaction.
- Memory and personalization are core scope, not an optional afterthought.
- Repository documents are English; conversational delivery is Chinese.

## Required integrated output

Use `docs/PROPOSAL.md` for the product/design contract, `README.md` for build and artifact entry points, `docs/USER_GUIDE.md` for actual first-run behavior, and `docs/VALIDATION.md` for evidence. Keep research recommendations distinct from the implemented architecture.

1. Give a clear recommended product and technical direction before listing alternatives.
2. Map every user requirement to a design component, a delivery phase, and an acceptance criterion.
3. Separate existing Typeless capabilities, proposed improvements, and uncertain or untested claims.
4. Preserve simultaneous desktop delivery throughout all phase and staffing assumptions.
5. Explain why an application-level dictation helper or a registered OS input method is appropriate.
6. Describe the end-to-end flow from shortcut to recording, ASR, cleanup, safe insertion, and recovery.
7. Include a recording/processing/insertion state diagram with cancellation and failure handling.
8. Specify Fn feasibility per platform, keyboard conflicts, and a practical Windows default without claiming universal Fn support.
9. Specify ASR and text-provider boundaries, exact known MiMo protocol, capability flags, endpoint normalization, authentication, timeouts, cancellation, retry, and output validation.
10. Explain that a streamed text response does not establish real-time audio transcription support.
11. Include one configuration entry point and OS-protected secrets; explain what is sent to each vendor.
12. Specify retention defaults, audio cleanup, history, export/delete, diagnostic redaction, and explicit context controls.
13. Define dictionary, per-application preferences, explicit memory, correction suggestions, and learned style separately, with provenance and user correction/deletion.
14. Preserve meaning, names, numbers, negation, code, URLs, and user-selected formatting; protect model prompts from treating dictated material as instructions.
15. Describe essential screens, first-run setup, permissions, missing-key behavior, latency feedback, keyboard access, and the light visual style.
16. Handle target focus changes, secure fields, elevated Windows apps, unsupported editors, clipboard races, and IME composition without silently typing into the wrong destination.
17. Include long-audio limits, silence, device changes, offline/provider errors, duplicate results, raw-text fallback, and an accessible manual copy path.
18. Include a cross-platform acceptance matrix, realistic performance targets labeled as goals, a privacy test plan, and a provider contract test strategy.
19. Specify proposed OS baselines and supported CPU architectures as decisions to validate, not current platform test results.
20. Give phased milestones, dependencies, exit criteria, staffing assumptions, and risks; avoid falsely precise delivery promises.
21. Include an operating-cost formula with any sourced current prices clearly dated and unknown charges marked unknown.
22. Keep packaging, signing, updater integrity, distribution, and cross-platform acceptance as separate delivery gates.
23. Keep scope proportional: no required hosted service or Docker for desktop clients; any future hosted sync is a separately scoped service.
24. Document actual install, build, launch, development, automated-test, native-verification and packaging commands, and distinguish successful execution from commands merely provided for users.
25. Deliver runnable artifact entry points and independently configurable ASR/cleanup setup instructions; identify remaining real-provider, Windows runtime, signing and distribution acceptance without treating implementation as awaiting authorization.

## Evidence review

- Use direct source links near externally supported claims and maintain access dates.
- Prefer primary sources; technical implementation claims must use primary sources.
- Vendor marketing is not a measured benchmark or hands-on product evaluation.
- Public user comments are anecdotes, not prevalence estimates.
- Later authorization includes implementation, local dependency/build work, automated verification and local packaging. Do not retain the original research-only boundary as the current task scope.
- Real user credentials, production-provider tests, macOS/Windows native acceptance, package generation, signing and public release are separate claims. Only assert each when its evidence exists.
- Do not install system Rosetta to work around the failed NSIS host tool. The Windows first-distribution route is a portable ZIP; an intermediate `.nsis.7z` is not the delivered installer or portable ZIP.

## Coordinator review questions

- Does the plan actually deliver the requested start/stop, cleanup, and personalized dictation on both desktops?
- Are important limitations explained alongside the relevant design, rather than hidden in appendices?
- Do the chosen architecture, capability claims, schedule, and acceptance tests agree with one another?
- Can the user open the delivered desktop artifact, configure ASR and cleanup independently, and recover from documented permission/provider/insertion failures?
- Do artifact links identify a real `.app` or portable ZIP while preserving the distinction between generated packages and tested Windows/provider behavior?
