# Quickstart: dictation and adjacent actions

Reviewed 2026-09-18. All four page URLs were followed from the official [Quickstart index](https://www.typeless.com/help/quickstart), not inferred from page titles. This report covers Dictate, Translate, Ask anything, and Speak to edit. It complements the [settings simplification study](settings-simplification.md); reviewing a capability does not add it to our product scope.

## Method and evidence boundaries

Original HTML and extracted text for each page, the index HTML, original images/video posters, and all eleven distinct embedded MP4 demonstrations were saved under `.local/research-quickstart/`. Asset URLs were extracted from each page's actual HTML. Translation assets live under the vendor's release-notes path, although embedded in Quickstart. `manifest.json` records the page-to-asset mapping.

Every video was decoded with ffmpeg into eight chronological frames, arranged left-to-right across the top row, then the bottom row. All eleven contact sheets, all eleven original posters, and both original language-variant screenshots were visually inspected with `view_image`. Poster-only inspection would have missed most of the interaction. The extracted frames sample the public demonstrations; this is not frame-by-frame verification or operation of a commercial account. No private account, user content, product GUI, or paid API was accessed.

The large shortcut key labels, blue speech captions, cursor spotlights and zooms appear to be demonstration annotations. That is an interpretation of their presentation, not proof of product implementation. In particular, blue captions must not be cited as evidence of live ASR text in the actual interface. Sample outputs do not establish quality, latency, safety or universal compatibility. None of these four pages demonstrates a provider/network/permission failure and recovery sequence.

## Dictate

Source: [Dictate](https://www.typeless.com/help/quickstart/dictate).

**Documented:** desktop starts from a focused text field, uses one Fn/Right Alt tap to start, waits for sound or the Voice bar, then another tap to finish. Mobile uses the keyboard's Speak button for the same toggle. Language variants are configured separately, through desktop Settings or mobile Account/Settings.

**Observed:** the desktop Notes demonstration keeps the document dominant. A tiny lower voice bar shows waveform activity with X/check affordances; it contracts into a small processing indicator before a formatted list appears in Notes. No answer card interrupts ordinary dictation. The mobile email demonstration uses a large waveform inside the keyboard area, then processing and inserted text. The desktop variant screenshot uses a modal with language rows and dropdowns; mobile uses a full settings page and bottom selection sheet with a selected checkmark.

**Unknown:** cancel semantics, error recovery, clipboard behavior, true focus ownership and whether the same target survives application switching. A visible X is not proof of a complete cancellation contract.

**Our inference:** keep recording/processing unmistakable, feedback compact, and the destination visible. Preserve the user's copy-first-anywhere decision rather than importing the official field-focus prerequisite. Dedicated regional-variant management is not needed for the current reduced scope.

## Translate

Source: [Translate](https://www.typeless.com/help/quickstart/translate).

**Documented:** users configure preferred target languages and reorder them. Desktop invokes translation with Fn+Left Shift or Right Alt+Right Shift, changes the target through the Voice bar, and finishes with the main dictation shortcut. Mobile holds Speak, swipes upward to a target, and taps to finish.

**Observed:** desktop setup moves from Settings to a small target-list dialog, then a searchable language list. Both desktop and mobile demonstrations show a three-target limit and drag handles. Mobile setup is a navigated page rather than a desktop modal. During desktop recording, a compact target label sits immediately above the voice bar; its menu changes the target without reopening settings. Mobile uses a temporary curved target chooser inside the keyboard, with a visible Cancel affordance, then waveform/processing/output.

**Unknown:** save durability, failed translation recovery and the result of canceling are not demonstrated.

**Our inference:** preferences can be prepared once, while transient controls belong near their immediate action. Keep the current product's single dictation path; do not add translation targets, gestures, modes or another shortcut merely to reproduce this example.

## Ask anything

Source: [Ask anything](https://www.typeless.com/help/quickstart/ask-anything).

**Documented:** this is desktop functionality. Fn+Space/Right Alt+Space starts an instruction; the main shortcut finishes it. Selected editable text can be replaced. Questions about selected text retain the selection and return an answer; unselected questions use an answer card; web actions open a relevant website.

**Observed:** four distinct demonstrations show an X composer selection replaced in place, a selected Japanese webpage retained behind an answer card, an unselected question progressing through a compact web-search state into a scrollable answer card, and a web-action request opening YouTube results. The recording bar is reused with a small mode label. The answer card has a compact header/close affordance, separated input context and answer content where applicable, and copy icons. No mobile Ask anything demonstration is provided on this page.

**Unknown:** failure handling, factual accuracy, action confirmation and undo behavior are not established by these successful demonstrations.

**Our inference:** response presentation follows the task: insertion needs no answer dashboard. Our dictation utility should retain only its compact current-result/recovery surface. Chat, search, web automation and selected-text rewriting remain outside scope.

## Speak to edit

Source: [Speak to edit](https://www.typeless.com/help/quickstart/speak-to-edit).

**Documented:** this is mobile editing. Select text, tap the bottom-left editing action, speak the change, then tap it again to finish; the selection is replaced.

**Observed:** the email demonstration first shows native selection handles and the contextual edit button. The active keyboard preserves a preview of selected text above a smaller waveform/control, with a short finish instruction. Processing uses the same compact indicator as dictation. The updated shopping list returns to the email. A close affordance is visible; its effect is not exercised. This page provides no separate desktop demonstration; the desktop analogue is on Ask anything.

**Unknown:** selection mismatch, interrupted editing, retry, destructive replacement safeguards and undo are not demonstrated.

**Our inference:** reveal an action only when its context makes it meaningful and keep that context legible. For our product, this supports conditional result and recovery controls, not a new selection editor or mobile keyboard.

## Decisions for the existing minimal product

1. Keep one repeatable start/finish interaction and no mode chooser before ordinary dictation.
2. Keep the foreground task visually dominant. The capsule carries recording/processing feedback; configuration does not open on successful completion.
3. Distinguish capture readiness from processing and final delivery. Demonstration timing must not become a performance promise.
4. Keep optional preferences in the existing three configuration tabs. Do not transplant vendor account, subscription, metrics or target-language management surfaces.
5. Show output and recovery only when useful. Preserve current copy-first behavior, explicit paste uncertainty and accessible cancellation even though the vendor demonstrations do not verify those contracts.
6. Avoid copying presentation annotations, assistant cards or mobile gesture mechanics into a desktop input utility. A larger answer card solves a different task from inserting dictated text.

These are recommendations for our scoped product, not claims that the vendor implements the same clipboard, cancellation, permission or persistence semantics.

## Public asset inventory and completion checklist

- [x] Read the index and all four linked pages; save original HTML and extracted text.
- [x] Download all eleven embedded videos and original posters.
- [x] Decode and inspect each video's chronological eight-frame contact sheet.
- [x] Inspect both desktop/mobile language-variant screenshots and all original posters.
- [x] Record desktop/mobile distinctions, recovery evidence gaps and scope exclusions.
- [x] Keep product code and runtime state unchanged.

The following URLs came directly from downloaded page HTML. Files are retained locally under their original basename; video contact sheets use the same basename with `.contact.png` instead of `.mp4`.

### dictate assets

- [Screenshot / poster: desktop-dictate-polished-writing--poster.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-dictate-polished-writing--poster.webp)
- [Video: desktop-dictate-polished-writing.mp4](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-dictate-polished-writing.mp4)
- [Screenshot / poster: mobile-dictate-polished-writing--poster.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/mobile-dictate-polished-writing--poster.webp)
- [Video: mobile-dictate-polished-writing.mp4](https://typeless-static.com/webpage/assets/help-center/quickstart/mobile-dictate-polished-writing.mp4)
- [Screenshot / poster: desktop-select-language-variants.webp.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-select-language-variants.webp.webp)
- [Screenshot / poster: mobile-select-language-variants.webp.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/mobile-select-language-variants.webp.webp)

### translate assets

- [Screenshot / poster: macos-set-multiple-target-languages-poster.webp](https://typeless-static.com/webpage/assets/release-notes/desktop/macos-set-multiple-target-languages-poster.webp)
- [Video: macos-set-multiple-target-languages.mp4](https://typeless-static.com/webpage/assets/release-notes/desktop/macos-set-multiple-target-languages.mp4)
- [Screenshot / poster: ios-set-multiple-target-languages-poster.webp](https://typeless-static.com/webpage/assets/release-notes/mobile/ios-set-multiple-target-languages-poster.webp)
- [Video: ios-set-multiple-target-languages.mp4](https://typeless-static.com/webpage/assets/release-notes/mobile/ios-set-multiple-target-languages.mp4)
- [Screenshot / poster: macos-switch-between-target-languages-poster.webp](https://typeless-static.com/webpage/assets/release-notes/desktop/macos-switch-between-target-languages-poster.webp)
- [Video: macos-switch-between-target-languages.mp4](https://typeless-static.com/webpage/assets/release-notes/desktop/macos-switch-between-target-languages.mp4)
- [Screenshot / poster: ios-switch-between-target-languages-poster.webp](https://typeless-static.com/webpage/assets/release-notes/mobile/ios-switch-between-target-languages-poster.webp)
- [Video: ios-switch-between-target-languages.mp4](https://typeless-static.com/webpage/assets/release-notes/mobile/ios-switch-between-target-languages.mp4)

### ask-anything assets

- [Screenshot / poster: desktop-edit-selected-text-with-voice--poster.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-edit-selected-text-with-voice--poster.webp)
- [Video: desktop-edit-selected-text-with-voice.mp4](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-edit-selected-text-with-voice.mp4)
- [Screenshot / poster: desktop-ask-about-selected-text--poster.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-ask-about-selected-text--poster.webp)
- [Video: desktop-ask-about-selected-text.mp4](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-ask-about-selected-text.mp4)
- [Screenshot / poster: desktop-get-quick-answers--poster.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-get-quick-answers--poster.webp)
- [Video: desktop-get-quick-answers.mp4](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-get-quick-answers.mp4)
- [Screenshot / poster: desktop-take-quick-web-actions--poster.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-take-quick-web-actions--poster.webp)
- [Video: desktop-take-quick-web-actions.mp4](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-take-quick-web-actions.mp4)

### speak-to-edit assets

- [Screenshot / poster: mobile-edit-selected-text-with-voice--poster.webp](https://typeless-static.com/webpage/assets/help-center/quickstart/mobile-edit-selected-text-with-voice--poster.webp)
- [Video: mobile-edit-selected-text-with-voice.mp4](https://typeless-static.com/webpage/assets/help-center/quickstart/mobile-edit-selected-text-with-voice.mp4)
