# Dictation interaction redesign decision

Date: 2026-09-18. The **0.1.2 copy-first decision below supersedes the original-target acquisition and guarded-delivery plan** preserved later in this document. The earlier investigation and 0.1.1 behavior are historical evidence, not current requirements.

## Current decision: record anywhere, copy first

The user explicitly requires recording to begin from any location, including terminals and applications without an editable field. The application must not capture or qualify an original target before recording. Best-effort application context is used only for personalization, runs alongside microphone startup, and cannot block recording if native integration is unavailable or slow.

Every completed transcription or text-processing result is automatically copied to the system clipboard and retained there. This includes practice mode, disabled automatic paste, text-only processing, and the original transcript recovered after cleanup failure. Copying replaces the previous clipboard; the application does not restore it. A cleanup warning remains visible but does not prevent copying or the configured paste attempt. Clipboard-copy failure is a separate recoverable error.

When automatic paste is enabled and the session is not practice, the application dispatches Command+V on macOS or Ctrl+V on Windows to the **current foreground application**. It does not require an editor type, original caret, Accessibility target token, or terminal exception. With no usable input position or no native paste capability, the copied result remains available for the user to paste later. No Enter key or message submission is dispatched. The UI has no manual insertion button that would paste back into its own window.

The normal overlay is a **120 × 36 logical-pixel pill inside a 144 × 60 window**. It shows only the waveform while recording and a loading animation during processing and clipboard/paste work. It disappears when copying and the optional paste attempt finish; a failed paste must not leave a persistent result card when the text was copied successfully. The main window retains warnings and recovery controls. Canceling after a successful copy does not retract the clipboard result.

Session state distinguishes `copied`, `pending`, `dispatched`, and `confirmed`; a dispatched shortcut is not proof that the receiving application accepted the text. Asynchronous cancellation and clipboard serialization prevent obsolete results from overwriting a newer result. An uncertain paste is not automatically repeated.

At this documentation update, **47 tests in 7 files** had passed, and isolated synthetic pastes into Sublime Text and Terminal had been observed. The 0.1.2 package checks and the full updated delivery integration run were still in progress. Those observations do not establish physical Fn input, real microphone behavior, live ASR quality, every editor, or Windows runtime acceptance. See [Validation](../VALIDATION.md) for completed receipts and subsequent results.

## Historical plan: original-target delivery (superseded)

Everything below preserves the earlier research and repair proposal, including source descriptions that no longer match 0.1.2. Its target-acquisition gates, original-field validation, and clipboard-restoration approach must not be treated as current behavior. The vendor visual evidence remains useful for the compact overlay; the user's newer copy-first requirement determines delivery semantics.

### Earlier product decision

The primary workflow is dictation inside the user's existing application. The main Typeless window is for configuration, history and recovery; it is not a required stop in the normal recording-to-insertion flow. The next implementation must fix target acquisition and delivery together with the floating UI.

The official [Dictate guide](https://www.typeless.com/help/quickstart/dictate) specifies focusing a destination field, tapping Fn to start on macOS, and tapping again to receive writing at the original location. Its [embedded demonstration](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-dictate-polished-writing.mp4) shows a small bottom-center capsule, a processing transition, text appearing in Notes and the capsule disappearing. This was inspected frame by frame; the vendor application itself was not run. The video does not establish its internal insertion API or real-world latency.

The demonstration includes cross/check controls while recording and a “Thinking” label while processing. The user's explicit requirement takes precedence: **waveform only while recording, animation only while processing, then automatic insertion and dismissal**. Insertion does not submit or send the conversation.

### Earlier normal flow

| Stage | Visible surface | Required behavior |
|---|---|---|
| Idle | None | Keep the user's application and caret active. |
| First Fn tap | Tiny capsule once capture is ready | Acquire the original input target before showing any UI; show only the live waveform. |
| Second Fn tap | Same compact capsule with a loading animation | Stop audio and process it; keep the original target and display anchor. |
| Delivery | Continue the loading presentation until delivery finishes | Insert into the original validated field automatically. No result preview or Copy step. |
| Completion | Capsule disappears | The text is in the destination; the main window stays hidden and Enter is not pressed. |

Start visual implementation with a roughly **120 × 36 logical-pixel** pill, then inspect it at actual display scale. This is a proposed size, not a measured Typeless API value. The official recording capsule measures approximately 160 × 48 **video pixels** in a 1440 × 960 edited demonstration; native scale is unknown. The native window must fit the pill and its shadow, rather than keeping the current 420 × 180 window behind a smaller CSS element. Anchor near the bottom center of the destination display and do not follow subsequent mouse movement.

Arming must not animate as live recording before the microphone starts. Normal operation should omit status paragraphs, transcript previews, timers and permanent action buttons. Accessible state descriptions and a discoverable cancellation path remain necessary. Errors need a distinct, concise recovery path; they must not turn the normal pill into a persistent truncated English error card. Practice mode remains confined to deliberately started in-app practice.

### Defects identified in the original implementation

1. `Sessions.insert()` produces the reported warning **before calling native insertion** when a target is missing or not insertable. Target-capture exceptions have already been discarded. The exact user-specific permission, application or AX-control cause cannot be reconstructed from that generic message.
2. Fn dispatch defaults to `practice: false`; the home practice checkbox does not explain an ordinary global Fn session. IME and clipboard checks occur later and are not the direct source of this exact warning.
3. macOS target eligibility currently requires particular AX text roles, an enabled flag and a readable selected-text range. The helper lacks the accessibility activation path documented for Electron applications. These are concrete compatibility gaps to investigate, not proof of which one affected the user's particular conversation.
4. The app publishes `ready` before insertion and has no separate delivery-pending state. A non-inserted ready result keeps the overlay visible indefinitely. A native dispatched event is also treated as an inserted boolean without verifying visible text.
5. The native window remains 420 × 180. Its contents are a status card; processing has no dedicated animation. Position is recalculated from the pointer's display on each update.
6. Existing automated integration tests use practice mode, fake audio and local providers. Their passing results did not validate Fn-to-external-editor delivery. The previous visual redesign addressed the main window, leaving this core interaction unqualified.

### Earlier implementation work, in dependency order

1. **Make target failures diagnosable.** Retain structured outcomes such as permission denied, helper unavailable, no editable field and unsupported control. Report the specific failure at the right stage without logging keys, transcript text or existing field content.
2. **Repair macOS target acquisition.** Capture the foreground application, window and field before overlay publication. Add bounded activation/retry for supported Electron accessibility trees, following [Electron's documented `AXManualAccessibility` mechanism](https://www.electronjs.org/docs/latest/tutorial/accessibility). Separate direct AX-writing capability from eligibility for a guarded paste; do not equate a missing selection API with every form of input being impossible.
3. **Represent delivery explicitly.** Keep text availability separate from insertion pending, confirmed, dispatched and failed outcomes. Preserve cancellation fencing and one-shot dispatch. A failed target must not silently become permission to paste into a different foreground destination.
4. **Replace the overlay interaction.** Use a compact non-activating window, waveform/loading-only normal states, a fixed session display anchor and dismissal after delivery. Keep recovery available without opening or focusing the main window during successful dictation. Apply the shared interaction to Windows while preserving its distinct shortcut and insertion implementation.
5. **Qualify actual input behavior.** Test the real native route before generating a replacement package advertised as fixing automatic insertion. Unit mocks and screenshots remain supporting evidence.

The direct-AX versus clipboard choice is our implementation decision. Public Typeless material does not establish its internal algorithm. Existing secure-field, original-target, cancellation and no-auto-send protections should be preserved while removing unnecessary restrictions on supported ordinary chat controls.

### Earlier acceptance gate

Use disposable fields with synthetic text, never a real message submission. Confirm physical Fn start/stop, retained caret/focus, compact geometry, recording feedback, processing animation, actual resulting field contents and overlay dismissal. Include a native macOS editor, a browser textarea/contenteditable and an Electron conversation editor; the user's failing editor still needs specific qualification when identifiable. Exercise Chinese and Latin input methods, multiline output, existing selections, multiple displays and fullscreen windows.

Also verify no editable field, denied permissions, a changed window/caret, protected fields, cancellation, provider errors and clipboard changes. A dispatched event without observable field confirmation must retain that uncertainty internally and must not be automatically retried. Windows runtime acceptance remains separate from macOS acceptance.

### Historical evidence

- [Official workflow and timestamped visual evidence](typeless-dictation-flow.md)
- [Historical session, overlay and test gaps](dictation-implementation-gap.md)
- [macOS target-capture diagnosis](macos-target-diagnosis.md)

To inspect the downloaded official demonstration locally:

```sh
cd /Users/junbingao/github/Typeless
open .local/research-typeless/desktop-dictate.mp4
```

This opens the vendor research evidence only. Use the current package and validation links in the project README to inspect this project's implementation.
