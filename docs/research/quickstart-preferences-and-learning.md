# Quickstart: Preferences, Learning, and Recovery

Reviewed on 2026-09-18. This is research, not a product change or a runtime test of the commercial application.

## Coverage and method

The [current Quickstart index](https://www.typeless.com/help/quickstart) lists seven pages: Dictate, Translate, Ask anything, Speak to edit, Personalization, History & Dictionary, and Settings. This document covers the following three pages completely; the other four are assigned to the companion dictation/editing research.

| Page opened from the index | Sections read | Platform coverage actually present |
| --- | --- | --- |
| [Personalization](https://www.typeless.com/help/quickstart/personalization) | Learning behavior, progress report, privacy claims, settings and disabling | Desktop settings path and screenshot; no separate mobile instructions |
| [History & Dictionary](https://www.typeless.com/help/quickstart/history-and-dictionary) | History review, copying, feedback, retry, audio export, single/all deletion, retention; dictionary correction learning, filters, adding, CSV import, search, editing and deletion | Desktop and mobile instructions throughout; CSV import specifically desktop |
| [Settings](https://www.typeless.com/help/quickstart/settings) | Existing/additional shortcuts, microphone, interface language, appearance, sounds, other-audio muting, login startup and Dock behavior | Desktop prose; language and appearance illustrations additionally show mobile screens |

All 16 linked illustrations were downloaded again to `.local/research-quickstart/` and inspected with `view_image`. [The local asset manifest](../../.local/research-quickstart/assets.json) records exact URLs and download sizes. These are official annotated instructional illustrations, not observations from launching or manipulating the installed app. Some backgrounds show version 2.0.0; that is an image label, not verification of the current binary version. No account, microphone, API key, private application data or application GUI was used.

## Personalization: claims versus visible controls

The guide describes learning phrasing and tone through continued use without initial configuration. Home exposes a progress report; the desktop settings area also provides access. Disabling personalization stops further style learning and uses generic phrasing. The documented control is inside the report's upper-right overflow menu. The guide claims learning abstract patterns rather than retaining message contents. It does not specify sampling triggers, observation windows, storage implementation, correction latency, percentage calculation or a reset/delete-learning procedure. These are vendor claims, not verified properties of our application. [Official guide](https://www.typeless.com/help/quickstart/personalization).

The report illustration shows a modal above the main window, a secondary settings navigation column, a large category chart, an overall 64% value and category percentages. No editable three-level polishing selector is visible. Our no/light/strong control is a user-requested design, not a reproduced official feature. [Report screenshot](https://typeless-static.com/webpage/assets/help-center/quickstart/personalization-progress-report.webp).

## History and dictionary: documented operation

History supports desktop filtering by task type. Desktop actions appear on hover; mobile offers tap-to-copy and swipe actions. Feedback accepts typed or dictated comments. Retry reuses the same audio after a failed attempt. Audio can be downloaded on desktop or shared on mobile. Deleting one transcript requires confirmation; an overflow action removes the whole history. The guide describes history as device-local and offers retention from unlimited through shorter intervals to disabled.

Dictionary learning has a more concrete trigger: correcting a word after dictation can add its preferred spelling automatically. Separate filters distinguish automatic and manual entries. Desktop uses an add-word dialog with optional CSV import; mobile uses an add button. Search supports partial matches. Desktop hover controls and mobile tap/swipe controls edit or delete words. The guide does not describe a universal observation API or guarantee correction detection in every application. [Official guide](https://www.typeless.com/help/quickstart/history-and-dictionary).

The vendor's no-content-retention claims should not be paraphrased as “no local text/audio exists”: its own history instructions expose local transcripts and original audio. Server retention, local retention and the mechanics of learning are separate questions. Our current memory-only latest-result behavior must be described on its own terms.

### History and dictionary visual inventory

Each linked asset below was directly inspected; the observations describe visible layout or controls rather than inferring hidden behavior.

| Official screenshot | Direct visual observation |
| --- | --- |
| [History overview](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-history-overview.webp) | Desktop uses a left navigation rail, top retention area, task filters and time-stamped text rows. Mobile uses a bottom navigation bar and single-column entries. |
| [Copying](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-copy-history-transcript.webp) | A small desktop copy icon sits beside the transcript with a tooltip. Mobile exposes copy, feedback and overflow actions after a swipe. |
| [Feedback](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-submit-history-feedback.webp) | Desktop dialog and mobile sheet keep a transcript excerpt above a comment area; the mobile image shows its dictation keyboard. This is a feedback form, not direct correction editing. |
| [Retry](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-retry-history-transcript.webp) | Retry is directly attached to the failed/dismissed entry on both platforms, without navigating to a separate recovery page. |
| [Audio and deletion](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-download-delete-history-transcript.webp) | Desktop overflow menu and mobile bottom sheet group retry, audio export and deletion; destructive text is red. |
| [Retention](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-set-history-retention.webp) | Desktop dropdown and mobile selection sheet expose the same six intervals; the mobile selected row has a checkmark. |
| [Dictionary overview](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-dictionary-overview.webp) | Desktop vocabulary is arranged in several columns; mobile is a single list. Small icons distinguish entry origins, with matching origin filters. |
| [Adding a word](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-add-dictionary-word.webp) | Both platforms show one text field and explicit cancel/add actions. The desktop dialog additionally has an import entry. |
| [CSV import](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-import-dictionary-csv.webp) | Import is a secondary action within the add dialog, not another navigation page. The screenshot does not specify CSV schema or import failure behavior. |
| [Editing/deleting vocabulary](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-edit-delete-dictionary-word.webp) | Desktop exposes pencil/trash icons beside the hovered word; mobile exposes edit/delete swipe actions. These are management affordances, not evidence of model accuracy. |

## Settings: modification steps and layout

The guide directs desktop users through the bottom-left settings icon. Existing shortcut values are clicked and replaced by pressing a key combination; additional bindings support external keyboards and can be removed. It advises testing changed shortcuts in a text field. Microphone selection supports the system default or a named device and instructs users to speak and check the volume indicator. Language is selected from a list. Appearance offers light, dark or system-following modes. Audio toggles control interaction sounds and muting other playback; general toggles cover login launch and macOS Dock visibility. [Official guide](https://www.typeless.com/help/quickstart/settings).

The text supplies no standalone mobile shortcut/microphone setup sequence. Language and appearance assets do show mobile equivalents, described below. No global save button is visible in these illustrations; neither that absence nor the prose proves persistence timing, error rollback or transactional saving.

| Official screenshot | Direct visual observation |
| --- | --- |
| [Changing a shortcut](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-change-keyboard-shortcut.webp) | Left-aligned action descriptions and right-aligned key controls share rows. The highlighted row shows a focused key-capture field; other actions use readable key tokens. |
| [Additional keyboard binding](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-add-external-keyboard-shortcut.webp) | A second input appears below the existing binding within the same action row. No separate keyboard-management page is shown. |
| [Microphone selection](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-select-microphone.webp) | A second modal lists automatic/default and named devices. The selected device has a live-level-style bar indicator; device descriptions distinguish Bluetooth/external sources. This is a screenshot of an indicator, not our own audio measurement. |
| [Interface language](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-select-interface-language.webp) | Desktop uses a dropdown; mobile uses a dedicated searchable list. Names appear in native script with a secondary language label and a selected checkmark. |
| [Appearance and adjacent settings](https://typeless-static.com/webpage/assets/help-center/quickstart/desktop-mobile-switch-appearance.webp) | Desktop settings form a vertically scrolling series of rows with right-side controls and section dividers. Mobile uses a selection sheet. Sound/muting switches are visible on desktop; appearance is not an illustrated theme gallery. |

## Minimal applications to this project

These are design recommendations, not additional official claims or implemented work.

1. **Make capture diagnosable without creating a setup wizard.** Keep the existing recording waveform and microphone selector. Showing the resolved device name next to the system-default option would answer which microphone is in use. A level indicator should run only during explicitly started recording/testing, not start capture merely because settings opened. A second microphone modal is unnecessary.
2. **Keep recovery beside the latest result.** Preserve one-click copy and conditionally offer retry only while reusable audio exists. State whether original text was copied after a polishing failure. This captures the useful failure recovery shown in the history illustrations without reintroducing a history browser, audio exports or retention settings.
3. **Expose actual values, not implementation syntax.** Retain readable shortcut presets and independent native/fallback availability. Official key capture is informative, but adding it here requires solving conflicts with already registered global shortcuts; presets remain the smaller reliable implementation.
4. **Keep preference edits local and observable.** Continue single-row selects/toggles with immediate save feedback and inline retry. Keep provider endpoint/model/key changes atomic behind each provider's save action. Official screenshots do not establish credential-editing behavior; copying their apparent lack of save buttons would not justify unsafe per-keystroke key updates.
5. **Keep expression preferences explicit.** Retain three polishing levels plus one personal instruction field. Do not present a learning percentage, imply automatic correction monitoring, or claim vendor-style zero retention. If terminology is repeatedly wrong, a small explicit instruction in the existing field is a narrower option than restoring a vocabulary database.

## Features not justified by this review

Do not restore history/search/retention/export pages, dictionary import and CRUD, automatic memory collection, per-category learning dashboards, a second settings sidebar, appearance galleries, multilingual interface controls, extra translation/assistant shortcut families or mobile swipe navigation. They were reviewed to understand the whole product, not to expand this project's agreed scope. No recommendation changes the global waveform/loading capsule, focus behavior, current-foreground paste, copy-first retention or no-Enter rule.
