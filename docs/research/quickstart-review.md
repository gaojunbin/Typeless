# Complete Quickstart review

Reviewed 2026-09-18 against the live [official Quickstart index](https://www.typeless.com/help/quickstart). All seven linked topics were read, including their desktop/mobile distinctions. The review covers 18 instructional screenshots, 11 video posters and chronological samples from all 11 embedded demonstrations. Videos were inspected as eight-frame contact sheets, not through a commercial account. Public media and inspection receipts are under `.local/research-quickstart/`.

## Coverage and product decisions

| Official page | Relevant observation | Application to this product |
| --- | --- | --- |
| [Dictate](https://www.typeless.com/help/quickstart/dictate) | A small voice bar accompanies the host editor; recording and processing have different presentations. Desktop demonstrations show cancel/finish affordances. Language variants are configured separately. | Retain shortcut start/stop and the small waveform/loading capsule. Make cancel/finish available on hover without enlarging the normal surface. Continue the user's copy-first, current-foreground paste policy. Regional-variant management remains outside this change. |
| [Translate](https://www.typeless.com/help/quickstart/translate) | Targets are prepared in advance and chosen beside the immediate recording action. Desktop and mobile use different controls. | Retain direct saved preferences and nearby transient controls. Do not restore a translation mode, target manager or extra shortcut family. |
| [Ask anything](https://www.typeless.com/help/quickstart/ask-anything) | Editing, answering and opening a web result use distinct outcomes; answer cards are for questions. | Dictation continues to produce text rather than answers. Successful input does not open a large result window. The current-session panel remains a recovery surface, not a chatbot. |
| [Speak to edit](https://www.typeless.com/help/quickstart/speak-to-edit) | Mobile editing preserves a visible selection preview while the user gives an instruction. | Preserve useful context through a current-result original/edited view and explicit copying. Do not introduce selection capture, replacement commands or a mobile keyboard. This is an adaptation, not a claim that the guide demonstrates transcript comparison. |
| [Personalization](https://www.typeless.com/help/quickstart/personalization) | The guide describes automatic style learning and a report, with an option to disable it. Its internal observation and storage mechanisms are not disclosed. | Keep explicit personal instructions. Make their inactive state clear when polishing is off. No learning percentage, automatic observation or vendor privacy guarantee is reproduced. |
| [History & Dictionary](https://www.typeless.com/help/quickstart/history-and-dictionary) | Copy and retry sit beside relevant entries. Dictionary correction learning is described separately from manual vocabulary management. | Keep recovery beside the current session, expose usable retry only, and allow original text to be copied without repeating paste. Do not restore archives, vocabulary CRUD or CSV import. |
| [Settings](https://www.typeless.com/help/quickstart/settings) | Flat setting rows show current values; microphone setup includes a level indicator. | Preserve the three existing tabs and readable shortcut presets. Configuration and microphone errors link directly to the relevant tab; provider fields remain an explicit atomic save. |

## Selected implementation requirements

1. The normal capsule remains 120 × 36 logical pixels inside its 144 × 60 non-focusable window. Hover reveals cancel and, while recording, finish. Processing permits cancellation without opening the main window. An error can explicitly open recovery; success cannot steal focus.
2. Original and edited results are views of one in-memory session. Copying either is an explicit clipboard action, not another paste or model request. New sessions reset the selected view and copy feedback.
3. Capture and ASR failures retain specific categories. The interface offers a short actionable explanation, a direct configuration/permission route where relevant, and retry only while core state permits it. Polishing and paste warnings must not be replaced by a generic success message.
4. The first unconfigured action opens speech configuration. Personal instructions remain saved when polishing is off, with an explicit inactive indication. No setup wizard, additional navigation destination or feature dashboard is added.
5. Native copy-first delivery, cancellation isolation and no-Enter behavior remain required. Hover-button interaction must be tested against a real external editor, because screenshots do not establish focus ownership.

These requirements are scoped product decisions derived from the reviewed patterns. [Validation](../VALIDATION.md) records implementation and runtime evidence separately.

## Evidence and exclusions

The full page/media inventories, source links and observed-versus-inferred distinctions are in [dictation and adjacent actions](quickstart-dictation-and-actions.md) and [preferences, learning and recovery](quickstart-preferences-and-learning.md). The earlier [settings-only study](settings-simplification.md) is retained as a narrower research record.

Large shortcut labels and blue speech captions in demonstrations appear to be instructional annotations; they are not evidence of live transcription UI. Successful demonstrations do not prove error behavior, cancel semantics, clipboard fallback, provider accuracy, latency, or arbitrary-app compatibility. Vendor personalization and retention statements are claims, not guarantees for this independent application. Desktop interaction patterns are adapted deliberately; mobile gestures are not copied into the desktop utility.
