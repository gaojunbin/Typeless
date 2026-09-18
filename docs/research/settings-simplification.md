# Settings simplification

Research date: 2026-09-18. Scope: official Typeless desktop settings and the minimum configuration surface for this project. This is a product design recommendation, not evidence that the proposed implementation has shipped.

## Evidence and limits

Official help pages and their published screenshots were inspected. Screenshots establish visible controls and layout; they do not establish current runtime persistence, keyboard behavior, or implementation details. No commercial app account, private settings, or local user data was inspected.

| Official source | Directly observed evidence | Relevant implication |
| --- | --- | --- |
| [Settings](https://www.typeless.com/help/quickstart/settings), [shortcut screenshot](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-change-keyboard-shortcut.webp), [appearance screenshot](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-switch-appearance.webp) | A settings window contains one scrolling pane with Keyboard shortcuts, Language, Audio, and General groups. Labels sit on the left; shortcut controls, dropdowns, and switches sit on the right. Shortcut editing starts by clicking the assigned value. Appearance uses an inline menu. No global Save button is visible. | Flat setting rows are a useful reference. The instructions omit a Save step for these controls, but actual autosave timing and persistence were not verified. |
| [Microphone screenshot](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-select-microphone.webp) | Microphone selection opens another modal, containing device choices and an input-level indicator. | The official interface is not entirely inline. This project can deliberately reduce that extra navigation step. |
| [Personalization](https://www.typeless.com/help/quickstart/personalization), [report screenshot](https://typeless-static.com/webpage/assets/help-center/quickstart/personalization-progress-report.webp) | Personalization shows automatic-learning progress, an overall percentage, and application-category statistics. A More menu contains the disabling action described in help. | This is not evidence of an editable three-level polishing control or a manual per-app style form. The progress dashboard is outside this user's requested scope. |
| [History and dictionary](https://www.typeless.com/help/quickstart/history-and-dictionary), [dictionary screenshot](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-add-dictionary-word.webp) | History and Dictionary are separate destinations. Dictionary creation uses one word input and an explicit Add action, with CSV import secondary. | Even the official word-entry form is small. Nevertheless, dictionary, CSV management, and history are not required for this user's reduced interface. |
| [Dictation](https://www.typeless.com/help/quickstart/dictate) | The documented workflow uses a shortcut to start and stop dictation outside the main window, followed by text appearing in the destination. | The primary speech workflow should not require navigating the configuration window each time. |

No inspected official material establishes a none/light/strong selector, a bring-your-own-key provider form, or an editable personal-instruction field. Those are this project's requirements, not claims about the commercial product. Vendor marketing statements about personalization or privacy were not treated as implementation evidence.

## Proposed reduced surface

Use one configuration window with exactly three first-level destinations: AI configuration, Basic settings, and Writing style. Remove the separate Home-to-Settings route. A compact shortcut/recording control at the top provides status and a direct action; a latest-result area appears only when there is useful output or a recoverable error. Do not fill idle space with tutorials, statistics, decorative cards, or repeated status summaries.

- **AI configuration:** only the required speech-recognition and text-processing connections. Keep each provider's endpoint, model, and secret together in one compact form. Save a provider connection atomically through one explicit action. Do not separately persist an incomplete endpoint and a retained secret. Indicate saved state without exposing secrets.
- **Basic settings:** only essential recording, shortcut, microphone, and delivery preferences supported by the application. Use direct controls in flat rows, with short secondary text only where a consequence needs explanation. Changes to safe independent switches and selectors should save immediately. Permission failures need one actionable inline message rather than a permanent diagnostic dashboard.
- **Writing style:** one three-choice selector for unchanged transcription, light cleanup, or strong cleanup, plus an optional personal instruction. Make the selected behavior understandable in one short sentence. Do not expose a second cleanup-enabled switch or a separate technical strength control.

Remove translation, the text experiment surface, practice mode, history management, dictionary CSV workflows, memory management, and per-application profiles from the visible product requested here. Do not reproduce official account, billing, assistant, or personalization analytics merely because they appear in vendor screenshots.

## Interaction and visual rules

The configuration window should use a light background, near-black text, restrained borders, and generous spacing. Use typography and group spacing instead of a box around each setting. Controls remain visible at the normal window size; do not require opening a disclosure just to find the main connection fields or writing choice.

The ordinary flow is shortcut, recording pill, processing animation, then completion. The current product decision takes precedence over the official guide's text-field prerequisite: recording can start anywhere; every completed result is copied and retained; optional automatic paste targets the current foreground application and never sends Enter. Do not restore original-target capture gates while simplifying the interface.

Keep the existing global capsule separate from configuration navigation. The window should not open after successful delivery. A failed paste must not obscure the fact that text is still available on the clipboard. Errors should explain the next action locally, without making the normal capsule into a large status card.

## Acceptance targets for implementation

1. Changing the writing level takes one control interaction after opening its first-level destination; there is no additional enable switch or Save step.
2. A user can reach and complete either AI connection from the first-level AI destination without nested configuration panels. Saving sends its fields as one coherent update.
3. A safe independent basic preference changes directly, shows its current value, and survives reopening the window. This persistence must be tested locally; it was not inferred as a verified vendor mechanism.
4. Starting and finishing ordinary dictation does not require opening the main window or choosing a practice/translation mode.
5. The main navigation contains only the three requested configuration destinations; removed secondary features do not remain as disabled placeholders or hidden menus.
6. Verification covers incomplete credentials, preserved saved secrets, failed saves, microphone/shortcut permission failures, clipboard-only completion, and narrow-window readability. Research screenshots are not a substitute for these runtime checks.
