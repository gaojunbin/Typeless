# Dictation delivery and overlay implementation gap

> Historical investigation, superseded by the [0.1.2 copy-first decision](dictation-redesign.md#current-decision-record-anywhere-copy-first). The target-capture requirements, source references, and proposed fixes below describe an earlier implementation. Current recording does not require a captured or editable target; results are copied and optionally pasted into the current foreground application.

Date: 2026-09-18. This is a source-level diagnosis and proposed behavior specification, not an implementation or runtime acceptance report. No application state, keys, transcript history, live provider, physical shortcut, or external editor was accessed for this investigation. Existing validation receipts were read but not rerun.

## Finding

The reported sequence—Fn starts capture, Fn stops capture, a result becomes ready, and the app reports `No safe original text target is available`—is consistent with a delivery prerequisite failing after transcription. It is not evidence of missing API configuration. The application currently combines text readiness and delivery outcome in a way that leaves a large result/status card visible when delivery has not happened.

The exact warning originates in `Sessions.insert()` before the native insertion call. Its alternatives are a missing captured target, `canInsert === false`, a protected target, or a practice session. Native Fn and fallback-shortcut callbacks dispatch `dictation.toggle` without `practice`, whose default is `false`. The home-page practice checkbox therefore does not explain an ordinary Fn session. A protected target found at capture time normally fails earlier, before recording, with a separate error. The most relevant unresolved branches for the reported sequence are target capture failure and a captured target that cannot accept insertion; the actual branch still needs runtime evidence.

Target-capture exceptions are currently swallowed into `undefined`. The session exposes only `targetApp`, `inserted`, and free-form warning/error strings, so the UI cannot distinguish permission failure, native-helper failure, no editable target, or an unsupported control from the generic warning alone. Detailed AX target behavior is being investigated separately; this report does not assert a specific editor/permission cause.

Source: [session lifecycle](../../src/core/session.ts), [shortcut wiring and native host](../../electron/main.ts), [snapshot contracts](../../src/shared/contracts.ts).

## Current overlay behavior

| Concern | Implemented behavior | Product consequence |
|---|---|---|
| Native window | Fixed 420 × 180, transparent, frameless, nonfocusable, always on top, initially hidden; macOS panel, all workspaces/fullscreen visibility | The native footprint remains much larger than a small waveform pill |
| Visual surface | White horizontal card with rounded border/shadow, status title, secondary line, recording waveform, and action buttons | A monochrome restyle did not redesign the recording interaction |
| Position | Horizontally centered in the work area of the display nearest the mouse; y is work-area bottom minus 200 | The 180-high native window ends 20 px above the work-area bottom, but the short card is top-aligned inside it and appears substantially higher |
| Repositioning | Recomputed for every published snapshot, including recording levels and unrelated setting/permission updates | Moving the pointer to another display can move the overlay during a session |
| Show | `arming`, `recording`, `transcribing`, `polishing`, `error`, and `ready && !inserted` | Ready practice results, disabled-auto-insert results, and insertion failures all retain the overlay |
| Hide | Other states, cancellation, system lock/suspend, or ready with `inserted === true` | No completion/failure dwell timer or explicit dismiss action exists for a ready/error result |
| Focus | `showInactive()`, nonfocusable window | The normal overlay is designed not to steal editor focus; actual native behavior still needs qualification |
| Recording | State text, timer, waveform, stop and cancel buttons | More content than the requested minimal waveform |
| Processing | Text status and cancel button; waveform rendered only for `recording` | There is no dedicated processing animation in the overlay |
| Ready/error | Text preview or ellipsized warning/error; copy when text exists | A full actionable error is not necessarily readable; errors without text expose no overlay recovery action |

`Wave` renders 27 level-scaled bars. The overlay constrains its waveform to 48 × 28 px; its bars are still part of a wide status card. This is source evidence, not a recording of an actual Fn interaction.

The overlay component returns before the main application's toast rendering. A failed action dispatched from an overlay button can set local toast state without displaying that toast. The global shortcut error handler likewise shows/focuses the main window but does not forward `ActionResult.message` into renderer toast state. These are separate error-presentation gaps; they do not establish why target capture failed.

Sources: [window lifecycle](../../electron/main.ts), [Overlay and dispatch UI](../../src/renderer/main.tsx), [waveform](../../src/renderer/ui.tsx), [overlay CSS](../../src/renderer/styles.css).

## Session and delivery lifecycle

1. A native Fn event or fallback shortcut calls `Controller.dispatch({ type: 'dictation.toggle' })`. The main-window button explicitly passes its local practice setting, initially `true`. Text-only processing and history reprocessing always create practice sessions.
2. Starting checks ASR credentials/model, resets the session to `arming`, and captures the original target for a non-practice session. A failed capture does not prevent recording, except an explicitly protected target. Audio capture runs through the main renderer, even if the main window is hidden.
3. Capture readiness sets `recording`; the second tap sets `transcribing` and requests capture stop. Generation/session fencing rejects stale responses after cancellation or a newer session.
4. Recognition supplies `rawText`. Cleanup supplies final text or a warning-bearing raw-text fallback. The application sets `ready`, saves optional history, and publishes before attempting insertion.
5. Automatic insertion runs only if the session-start settings enable it, this is not practice, and cleanup returned no warning. The generic unsafe-target guard may stop here before native insertion.
6. A valid insertion attempt marks the result internally consumed before calling the native host. The host first tries native insertion, then considers guarded clipboard fallback. A changed target or unsupported rich clipboard prevents that fallback. Clipboard restoration is conditional on ownership.
7. The result retains status `ready`. `inserted` is assigned `result.ok`; a native `dispatched` response can therefore set it to true without proof the target committed text. Only `confirmed` clears the warning unconditionally. Further automatic attempts are rejected after consumption.

This means **ready describes text availability, not delivery**. Conversely, the current `inserted` boolean includes dispatched-but-unconfirmed input and is not a verified-delivery receipt. Overlay visibility relies on that boolean: it hides dispatched results even if a warning still requires checking the target. The same lifecycle has no explicit inserting state, so it can briefly publish a ready/copy surface before insertion completes.

History is opt-in, contains raw/final text and the latest delivery boolean/warning, and stores no audio. It is updated before and after insertion under the same session ID. It therefore does not supply a separate native delivery trace. Memory changes only through explicit manual entry or an explicitly selected history correction; changing dictionary or memory settings cannot by itself repair target capture. Existing inference warnings and raw-text recovery must remain intact when simplifying the overlay.

Sources: [controller actions](../../electron/controller.ts), [session state machine](../../src/core/session.ts), [clipboard route](../../electron/main.ts), [history and memory store](../../src/core/store.ts).

## Proposed interaction specification

These are implementation recommendations for review, not completed changes or vendor specifications. Start with one compact native window sized to its content, approximately 100–140 × 32–40 logical pixels for normal states; confirm the final dimensions visually at actual desktop scale. Anchor it near the bottom center of the target display, with a small consistent margin. Select the display at session start and retain that placement during the session.

| State | Normal compact surface | Delivery/recovery behavior |
|---|---|---|
| Idle/cancelled | Hidden | No persistent ready card |
| Arming | Small neutral loading animation | Preserve target focus; do not imply the microphone is already recording |
| Recording | Black/gray waveform on a small light pill | The second shortcut tap ends capture; keep accessible stop/cancel alternatives available without permanent explanatory text |
| Recognition/cleanup | Same pill with a subtle looping processing animation | Keep it visible while work is pending; do not switch to a result preview |
| Insertion pending | Continue the processing presentation | Validate the original target immediately before insertion; do not claim completion at text-ready |
| Confirmed insertion | Hide, optionally after a very short completion transition | Do not show the transcript or copy button during the normal successful path |
| Dispatched but unconfirmed | End the busy animation; no verified-delivery claim | Never auto-retry; retain the distinct outcome and an unobtrusive route to inspect/recover without a large persistent success card |
| Deliberate practice / auto-insert off | End the compact session presentation | Show the result in the main window; explain the deliberate mode there, not as a delivery failure |
| Actionable failure | A separate, concise recovery surface | Show the specific reason and relevant action; retain the result where available, without presenting a truncated English error as the normal pill |

The implementation should represent target-capture outcome and delivery status explicitly, with at least `not attempted`, `pending`, `confirmed`, `dispatched`, and `failed` delivery outcomes. Target diagnostics should identify the failing stage and stable reason category while excluding transcript content and credentials. The original target token and safety constraints must remain intact; no blind paste into whichever window happens to be frontmost.

Failure messaging should distinguish missing service configuration, microphone authorization, unavailable native helper, missing Accessibility permission, no editable target, target changed, protected field, provider failure, cleanup review warning, and uncertain delivery. A generic instruction to copy manually must not be the only diagnosis when configuration is valid and the real issue is target capture. Conversely, a verified unsafe/changed target should keep a manual-copy fallback rather than forcing delivery. The recording-cap countdown belongs only near the limit; it must not imply a service/key error or a copy requirement.

Normal states should not show an application name, elapsed timer, transcript preview, or explanatory status paragraph by default. Accessibility names and keyboard alternatives remain necessary. Failure actions may need a separately focusable surface opened deliberately; the normal pill must not activate the app or displace the original caret.

## What the existing tests establish

| Evidence | Covered | Not established |
|---|---|---|
| `tests/core-session.test.ts` | Late-target fencing, cancellation, one-shot consumed insertion, raw output when cleanup is deliberately off, cleanup failure fallback, provider/privacy snapshots | The target is a stub `{ appName: 'Editor', canInsert: true, isSecure: false }`; insertion is a `vi.fn` returning `{ ok: true, status: 'dispatched' }`. No real AX target, clipboard, keyboard, or external editor is exercised |
| `tests/desktop.e2e.mjs` | Actual Electron/preload/renderer IPC, local mock HTTP, fake microphone capture, result/history handling, persistence and credential wiring | Recording explicitly passes `practice: true`; it cannot establish successful external insertion. Media and secure storage are test doubles, not physical input or real keychain acceptance |
| Native checks recorded in `VALIDATION.md` | Tap state-machine self-tests, JSONL status/configuration, invalid-target rejection, build/protocol compatibility | No installed event tap with a physical Fn session, no successful external insertion, no end-to-end editor acceptance |
| Earlier UI checks in `VALIDATION.md` | Main-page layout at two sizes, navigation/dialog interactions, transparent overlay HTML/body | Transparent background is not evidence of compact overlay geometry, processing animation, display anchoring, preserved focus, or auto-dismiss behavior during actual dictation |
| Packaging receipts | Built artifacts and byte correspondence to source | Not a substitute for a real installed application completing Fn → speech → target insertion |

The validation ledger already states these boundaries. The gap is therefore both a missing product behavior and missing real-workflow acceptance, not a contradiction to those narrower mock/build receipts. No existing automated test directly reproduces the reported no-safe-target failure or asserts a structured explanation for target-capture exceptions.

Sources: [session tests](../../tests/core-session.test.ts), [desktop integration harness](../../tests/desktop.e2e.mjs), [validation ledger](../VALIDATION.md).

## Acceptance work required before declaring delivery fixed

- Add deterministic coverage for target-capture rejection, a non-insertable target, protected fields, target changes, deliberate practice, disabled automatic insertion, confirmed versus dispatched outcomes, and overlay lifecycle/animation states. Assert the reason exposed to the user, not just a boolean or warning substring.
- Exercise an installed macOS build using actual Fn taps and a real microphone in representative ordinary editors, browser inputs, and the user's failing editor. Record the captured target category, delivery route/outcome, target text before/after, and preserved focus without recording sensitive transcript content.
- Qualify multiple displays and fullscreen spaces: the compact surface remains anchored, does not jump when the mouse moves, and does not steal focus. Confirm the processing animation spans recognition through delivery and success removes the surface.
- Exercise permission-denied, no-editable-target, changed-target, protected-field, provider-failure, and uncertain-dispatch cases. Recovery must remain actionable, cannot duplicate delivery, and cannot masquerade as a successful paste.
- Keep Windows runtime qualification separate. Unit stubs, Swift compilation, package integrity, and screenshots alone cannot close the external-editor acceptance gap.

This investigation intentionally does not perform those actions or change application source. Its deliverable is the diagnosis and a concrete specification for the next implementation decision.
