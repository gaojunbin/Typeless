# Official Typeless desktop app windows — visual reference

**Date of research:** 2026-09-18
**Subject:** the application windows of the commercial Typeless desktop app (macOS build shown in every source).
**Out of scope here:** the floating voice bar / dictation overlay, the onboarding flow, the mobile apps, and marketing-site branding. Those are covered by other research.

## 1. Scope, method and evidence rules

### Evidence rules used throughout

| Marker | Meaning |
| --- | --- |
| **[observed]** | Directly visible in a downloaded screenshot or extracted video frame. |
| **[measured]** | Derived from pixel measurement with Pillow (`scan.py` / `sample_colors.py` in the asset folder). Hex values are the modal colour of a 5x5 sample; sizes are converted to points. |
| **[inferred]** | Reasoned from the evidence but not directly readable. Always flagged inline. |
| **[text-only]** | Stated in official help-centre prose, with no screenshot to confirm the visual form. |

### Measurement basis

All primary help-centre desktop screenshots are 2688 x 1792 renders of the app window composited on a wallpaper. The scale factor was pinned by measuring the macOS traffic-light pitch: the red and green dot centres are 64 px apart across two gaps, so one gap is 32 px. The macOS standard gap is 20 pt.

> **Scale: 1.6 image px = 1 logical point.** All "pt" figures below are image pixels divided by 1.6. On a 1x display 1 pt = 1 CSS px, so these numbers can be used directly as CSS pixel values.

Two app versions appear in the sources. Version 2.0.0 is the current design and is the basis of this document. Version 1.8.0 screenshots survive on two troubleshooting/billing pages and are described separately in section 2.10 because the Home layout changed materially.

### Local assets

Everything is downloaded to `/Users/junbingao/github/Typeless/.local/research-ui/app-windows/`:

- `*.webp` — original downloads; `png/*.png` — viewable conversions.
- `frames/*.png` — frames extracted from the official release-notes MP4s with ffmpeg.
- `manifest.json` — every local file mapped to its source URL, the help page it came from, and what it shows.
- `sample_colors.py`, `scan.py` — the measurement scripts.

### Sources

Official (typeless.com and its CDN typeless-static.com):

- https://www.typeless.com/help/quickstart/history-and-dictionary
- https://www.typeless.com/help/quickstart/settings
- https://www.typeless.com/help/quickstart/personalization
- https://www.typeless.com/help/quickstart/dictate
- https://www.typeless.com/help/quickstart/translate
- https://www.typeless.com/help/installation-and-setup
- https://www.typeless.com/help/billing
- https://www.typeless.com/help/troubleshooting/check-for-updates
- https://www.typeless.com/help/troubleshooting/dictation-limit
- https://www.typeless.com/help/troubleshooting/microphone-unavailable
- https://www.typeless.com/ (homepage feature crops)
- Asset host: `https://typeless-static.com/webpage/assets/help-center/...` and `.../assets/release-notes/desktop/...`

Third party, clearly labelled where used:

- https://leolabs.me/blog/typeless-deep-dive/en/ — two real in-app screenshots in a Chinese locale (`images/data-overview.png`, `images/dictionary.png`). Useful as independent confirmation of card nesting and the dictionary grid.

---

## 2. Window inventory

### 2.0 Shell that every main window shares

**Source:** `png/desktop-mobile-history-overview.png`, `png/desktop-mobile-dictionary-overview.png`, `png/macos-set-multiple-target-languages-poster.png`

- **Window frame** [measured]: 1595 x 1200 px = **~1000 x 750 pt**, a 4:3 window. Corner radius is large and uniform on all four corners, about 18–20 px = **11–12 pt**; the window does not use a standard macOS titlebar.
- **Title bar** [observed]: there is none. The three traffic lights sit directly on the sidebar background at the top-left, roughly 26 pt from the left edge and 26 pt from the top. Dot colours sample to `#FD4F4F` red and `#00CA2D` green [measured]. The whole top strip is draggable window chrome with no title text and no toolbar.
- **Two-pane split** [measured]: sidebar occupies x 192–510 of a window spanning 192–1787, i.e. **318 px = 199 pt = 19.9 % of window width**. Treat the sidebar as a fixed **200 pt** rail, not a percentage.
- **Divider** [observed]: a single hairline between sidebar and content, roughly 1 px at 1x. Very low contrast.
- **Backgrounds** [measured]: sidebar `#F6F6F6`, content `#FDFDFD`. The content area is very slightly warmer/brighter than the sidebar; there is no pure `#FFFFFF` anywhere in the chrome.
- **Content padding** [measured]: 37 px = **23 pt**, so **24 pt** left and right gutters inside the content pane.
- **Version footer** [observed]: bottom-**right** of the content pane in v2.0 — the caption `Version 2.0.0` in grey followed by `Check for updates` as an underlined text link. (In v1.8 this sat bottom-**left**.)

#### Sidebar anatomy, top to bottom

1. **Traffic lights** — red, yellow, green, macOS standard, 20 pt pitch.
2. **Brand lock-up** [observed] — the Typeless mark (a solid black crescent / stylised wing) followed by the wordmark "Typeless" in bold, then a plan badge. Wordmark cap height is 24 px = 15 pt, so roughly a **21 pt / 21 px bold** wordmark [measured]. Badge reads `Pro` in blue on a pale blue pill, or `Free` in grey on a pale grey pill, depending on the account [observed in two different screenshots].
3. **Navigation list** — exactly three destinations: **Home**, **History**, **Dictionary**. Each row is icon + label, left aligned. Row pitch 62 px = **39 pt**; the selected pill is 281 px = 176 pt wide inside the 200 pt rail, so it is inset about **12 pt** left and right [measured]. Pill height is about 56 px = **35 pt**, corner radius about 8 px = **8 pt** [measured]. Selected fill `#E4E4E4` [measured]; idle rows are transparent on `#F6F6F6`. Label cap height 16 px → about **14 pt / 14 px medium**.
4. **Large flexible gap.** The nav list is top-anchored and the promotional cards are bottom-anchored.
5. **"Get mobile app" card** [observed] — a white rounded card, roughly full sidebar width minus the 12 pt gutters, containing a small phone glyph and the bold label `Get mobile app`. A small circular grey dismiss badge with an ✕ overlaps its top-right corner, sitting half outside the card.
6. **Upgrade card, free accounts only** [observed] — label `Get unlimited words`, then a quota line `1,920 / 8,000 words` in bold with an ⓘ info glyph, then a thin two-tone progress bar, then a full-width blue `Upgrade` pill button. On Pro accounts this card is absent [observed: the History and Dictionary screenshots show a `Pro` badge and no upgrade card].
7. **Footer icon row** [observed] — four 24 pt outline glyph buttons on one baseline. A person-in-circle (account) is pushed to the **left**; an envelope (inbox / messages), a gear (settings), and a question-in-circle (help) are grouped to the **right**. The gear is the only entry point to Settings from inside the window.

---

### 2.1 Home window

**Sources:** `png/macos-set-multiple-target-languages-poster.png` (v2.0, complete and undimmed), `leolabs-data-overview.png` (third party, real app).

Reading order in the content pane:

1. **Hero heading** `Speak, don't type` [observed]. Very large, bold, tight tracking, black. Visually 3x the H1 used on other screens; **[inferred]** around 44–48 pt.
2. **Privacy link** [observed] — a padlock outline glyph followed by `Your data stays private`, underlined, in a mid grey. Sits immediately under the hero, left aligned.
3. **Stat grid** [observed] — a 2 x 2 grid of white cards with a hairline border and roughly 12 pt radius, separated by about 12 pt gutters:

   | Card | Big value | Unit | Caption |
   | --- | --- | --- | --- |
   | 1 | 52 | hr | Total dictation time |
   | 2 | 500K | words | Words dictated |
   | 3 | 180 | hr | Time saved |
   | 4 | 160 | WPM | Average dictation speed |

   Card anatomy: a small outline icon at top-left (clock, microphone, hourglass, lightning bolt), then the value in large bold black with the unit appended in small bold grey, then the caption on the next line in regular grey. In the real-app third-party shot the icon sits inside a pale grey rounded-square tile [observed in `leolabs-data-overview.png`].
4. **Personalization card** [observed] — a wide card spanning the full stat-grid width. Left: the signature/pen-stroke glyph, `64%` in large bold, `Personalization` caption, and a `View report` button rendered as a light grey pill with dark text. Right: the polar-area ("rose") chart described in 2.8.
5. **Right rail** [observed] — a third column, noticeably narrower than the stat area (**[inferred]** about 22 % of the content pane), holding a stack of cards:
   - A shortcut summary card: the label `Dictate` over an `Fn` keycap; `Translate` over `Fn` + `Left Shift`; `Ask anything` over `Fn` + `Space`.
   - `Popular use cases ↗` — a card with a title row and an app-icon strip.
   - `Refer friends ↗` — bold title, body `Get $5 credit for every invite.` with `$5 credit` bolded inline.
   - `Affiliate program ↗` — bold title, body `Earn 25% recurring commission.` with `25%` bolded inline.

   All three link cards carry a small ↗ external-link arrow at the top-right and a faint illustration bleeding behind the text.

---

### 2.2 History window

**Sources:** `png/desktop-mobile-history-overview.png` (primary), plus four interaction screenshots.

1. **Header row** [observed] — H1 `History` on the left, a `…` overflow icon button on the far right of the content pane, vertically centred with the title. H1 cap height 40 px = 25 pt → **[measured] about 34–36 pt / 35 px, bold**.
2. **Settings card** [measured] — one `#F6F6F6` card, radius ~10–12 pt, spanning the full content width (1198 px = 749 pt) and 264 px = **165 pt** tall. It contains two stacked rows:
   - `Keep history` — a hard-drive glyph, a bold 15 pt label, the body line `How long do you want to keep your dictation history on your device?` in 13 pt grey, and a select control pinned to the right edge reading `Forever` with a chevron.
   - `Your data stays private` — a padlock glyph, bold 15 pt label, and a two-line 13 pt grey paragraph: "Your voice dictations are private with zero data retention. They are stored only on your device and cannot be accessed from anywhere else."
3. **Filter segmented control** [measured] — a pill track 387 x 64 px = **242 x 40 pt**, fully rounded, fill `#EFEFEF`. Three segments: `All` (selected), `Dictations`, `Ask anything`. The selected segment is a white `#FBFBFB`–`#FEFEFE` pill inset about 4 px with a very soft shadow. Labels are about 12 pt; the selected label is darker and slightly heavier than the idle ones. The control is left aligned, not full width.
4. **Day group label** [measured] — `Today`, cap height 14 px → about **12 pt**, semibold, dark grey, with generous space above.
5. **Transcript list** [observed] — a bordered container with hairline dividers between rows, no per-row card. Each row is a two-column layout: a fixed-width left gutter holding the time (`11:32 AM`) in **11 pt** grey, and the transcript body in **13 pt** near-black to its right. Multi-paragraph and ordered-list content renders with real paragraph spacing and real numbered lists inside the row, so rows vary a lot in height.
6. **Row hover** [observed in `desktop-mobile-copy-history-transcript.png`] — the row lifts to a white card with a soft shadow and a right-aligned icon cluster appears: copy (two overlapping squares), flag (feedback), `…` (overflow). Icons are outline, roughly 20 pt, in a mid grey, each with an invisible square hit area that shows a light grey rounded-square background on hover.
7. **Tooltip** [measured] — a dark pill, fill `#1B191A`, white ~13 pt text, radius about 8 pt, positioned directly above the hovered icon. Example text: `Copy transcript`.
8. **Row overflow menu** [observed in `desktop-mobile-download-delete-history-transcript.png`] — a white popover, radius ~10 pt, strong soft shadow, anchored under the `…` button. Items are icon + label at ~15 pt:
   - `Retry` (circular-arrow glyph)
   - `Download audio` (down-arrow-in-circle glyph)
   - hairline divider
   - `Delete transcript` in red with a red trash glyph.
9. **Failed / dismissed row** [observed in `desktop-mobile-retry-history-transcript.png`] — body text reads `The transcription was dismissed.` and the hover cluster gains a labelled `Retry` button (circular-arrow icon plus the word, on a light grey rounded-square) placed to the left of the flag and overflow icons.
10. **Ask-anything marker** [observed in the same screenshot] — rows produced by Ask anything carry a small sparkle ✦ glyph at the far right of the row, in a light grey.
11. **Retention select menu** [observed in `desktop-mobile-set-history-retention.png`] — opens downward from the `Forever` control, aligned to the control's right edge. White popover, radius ~10 pt, items `Forever`, `1 year`, `1 month`, `1 week`, `24 hours`, `Never`. The current value's row carries a light grey `#E9E9E9` fill. The trigger's chevron flips from ⌄ to ⌃ while open.
12. **Feedback modal** [observed in `desktop-mobile-submit-history-feedback.png`] — see 3.x component notes; described in 2.7.

---

### 2.3 Dictionary window

**Source:** `png/desktop-mobile-dictionary-overview.png`; third-party confirmation in `leolabs-dictionary.png`.

1. **Header row** [observed] — H1 `Dictionary` on the left; a primary button `New word` on the far right. That button is **144 x 51 px = 90 x 32 pt** with fill `#1A1819` (near-black), white ~14 pt medium label, fully rounded pill radius [measured].
2. **Filter row** [observed] — the same segmented pill as History, `#EFEFEF` track, segments `All`, `✦ Auto-added`, `✧ Manually-added`. The two non-"All" segments carry their marker glyph inline before the label: a four-point sparkle in mint for auto-added, a feather quill in grey for manually-added. A separate **circular** icon button with a magnifier sits at the far right of the same row, fill `#F0F0F0`, about 40 pt diameter [measured]. Search is collapsed behind that button rather than shown as an always-open field.
3. **Word grid** [observed] — **three equal columns** with about 12 pt gutters, filling left to right then wrapping. Each word is its own card: white `#FDFDFD` fill, hairline border, radius about 10 pt, height about 40 pt, containing the marker glyph then the term at ~14 pt. Cards are all the same height regardless of term length.
4. **Row hover** [observed in `desktop-mobile-edit-delete-dictionary-word.png`] — the card lifts with a shadow and two icon buttons appear inside it at the right edge: a pencil (edit) and a trash (delete), each on a light grey rounded-square. A dark tooltip (`Edit`) appears above.
5. **Empty space** [observed] — once the words run out there is no empty state; the remainder of the content pane is simply blank `#FDFDFD`.

---

### 2.4 Settings — an in-window modal, not a separate window

This is the single most important structural finding. **[observed across five screenshots]**

Clicking the gear in the sidebar footer does **not** open a macOS preferences window. It dims the whole main window and floats a large modal sheet over it.

- **Scrim** [measured] — a black overlay at roughly **0.65 alpha** over the main window (content `#FDFDFD` reads as `#575757` behind the scrim). The modal itself sits above a much lighter second layer measured at about **0.20 alpha**, which is how the help-centre "spotlight" effect is produced (see the note at the end of this section).
- **Modal geometry** [measured] — 1871 px wide inside a 2156 px window, i.e. **about 87 % of window width**, and about **81 % of window height**. Corner radius is large, about 16 pt. It is horizontally centred but sits slightly below vertical centre.
- **Modal split** [measured] — an internal left rail of 399 px = **21.3 % of modal width**, same proportion as the main window's sidebar. Rail background `#F6F6F6`, content background `#FDFDFD` — identical tokens to the main window [derived by undoing the measured scrim alpha].
- **Close affordance** [observed] — a single ✕ icon button at the modal's top-right. There is no OK/Cancel footer; every setting applies immediately.

#### Modal rail items, in order

| Label | Icon | Notes |
| --- | --- | --- |
| `Account` | person in circle | |
| `Settings` | gear | selected in most screenshots; selected state is a `#E4E4E4` pill, same as the main nav |
| `Personalization` | signature / pen-stroke mark | |
| `About` | ⓘ info circle | |
| *hairline divider* | | |
| `Help center` | open book | trailing ↗ external-link arrow, right aligned |
| `Release note` | note / card glyph | trailing ↗ external-link arrow, right aligned |

#### Settings pane content, in order

The content pane has its own H1 `Settings`, then four labelled sections. Each section header is an outline glyph plus a grey ~15 pt label, followed by a hairline rule spanning the content width.

**Section 1 — `Keyboard shortcuts`** (keyboard glyph)

Three rows, each label-left / control-right:

| Label | Description | Control |
| --- | --- | --- |
| `Dictate` | `Press to start and stop dictation.` | shortcut chips + `Add another` |
| `Translate` | `Press to start and stop translation.` | shortcut chips + `Add another` |
| `Ask anything` | `Press to start and stop asking anything.` | shortcut chips + `Add another` |

Defaults observed: Dictate = `Fn`; Translate = `Fn` + `Left Shift`; Ask anything = `Fn` + `Space`.

The control column is a vertical stack, right aligned: a bordered container holding one or more keycap chips plus a trailing ✕ to clear the binding, then a secondary `Add another` button beneath it. While capturing, the container becomes a focused input with a black 2 px border showing the placeholder `Type a shortcut` and a blinking caret; a small circular-arrow "reset to default" icon button appears just under its right edge [observed in `desktop-change-keyboard-shortcut.png`]. Adding a second binding stacks a new capture field under the existing chip row [observed in `desktop-add-external-keyboard-shortcut.png`].

**Section 2 — `Language`** (globe glyph)

| Label | Description | Control |
| --- | --- | --- |
| `Interface language` | `Choose the language used in the user interface.` | select showing `English` |
| `Translation targets` | `Choose up to 3 target languages for your dictation in translation mode.` | a value chip showing the current targets plus a pencil icon; overflow renders as `Japanese, Ger… +1` |
| `Language variants` | `Choose your preferred language variants for the best experience.` | secondary button `Select language variants` |

**Section 3 — `Audio`** (microphone glyph)

| Label | Description | Control |
| --- | --- | --- |
| `Microphone` | `Choose your preferred microphone for Typeless to capture your voice.` | a select-like button showing `Auto-detect (MacBoo…` with a **right** chevron — it opens a modal, not a menu |
| `Interaction sounds` | `Play sounds for key actions like start/stop.` | toggle, on |
| `Mute when dictating` | `Automatically silence other active audio during dictation.` | toggle, on |

**Section 4 — `General`** (laptop glyph)

| Label | Description | Control |
| --- | --- | --- |
| `Appearance` | `Choose a light or dark appearance, or follow your system setting.` | select showing `System` |
| `Launch app at login` | `Open Typeless automatically when your computer starts.` | toggle |
| `Show app in dock` | `Display Typeless in your Mac dock for quick access.` | toggle |

> **Ordering caveat.** The help-centre prose at `/help/quickstart/settings` lists the sections as Keyboard shortcuts → Audio → Language → General and omits Translation targets and Language variants. Every v2.0 screenshot shows **Keyboard shortcuts → Language → Audio → General** with all three language rows. Trust the screenshots; the prose is stale.

> **Spotlight artefact.** In the help-centre screenshots one row is always rendered white and un-dimmed with a soft shadow while everything else is greyed. That is a documentation annotation, **not** an app hover state. Do not build a white "lifted row" state for settings rows on its strength. Row hover *is* real in the History and Dictionary lists, where the lift is subtle and paired with icon buttons appearing.

---

### 2.5 Appearance and interface-language selects

**Sources:** `png/desktop-mobile-switch-appearance.png`, `png/desktop-mobile-select-interface-language.png`

- **Trigger** [observed] — a bordered select, white fill, hairline border, radius about 8 pt, left-aligned value text, chevron at the right inset. Width is fixed by the control column, not by content. Height matches the other 30–32 pt controls.
- **Open state** [observed] — the border darkens, the chevron flips to ⌃, and the value text can appear with a blue text-selection highlight (`English` in the interface-language shot), which suggests these are combo boxes with a typeahead field rather than pure menus.
- **Popover** [measured] — white `#FDFDFD`, radius ~10 pt, soft shadow, width matched to the trigger, opening downward and left-aligned to it. Current value row is filled `#E9E9E9` and carries a **filled black circle with a white check** at the right edge.
- **Appearance options** [observed]: `System`, `Light`, `Dark`.
- **Interface-language rows** [observed] — two lines per row: the language's endonym on top in near-black (`日本語`, `العربية (مصر)`, `Български`), the English name underneath in grey. The list starts with `English` and then runs alphabetically by English name: Amharic, Arabic (Egypt), Arabic (Saudi Arabia), Armenian, Bengali, Bulgarian, Catalan, Croatian, Czech, … The list scrolls; help text says 58 languages [text-only].

---

### 2.6 Microphone picker modal

**Source:** `png/desktop-select-microphone.png`

A **second modal stacked on top of the Settings modal**, centred, roughly 40 % of window width, white, radius ~14 pt, heavy soft shadow, with its own ✕ at the top-right.

1. Title `Microphone`, bold, about 22 pt.
2. Description, 2 lines, grey ~14 pt: "Choose the microphone that captures your voice. If the bar doesn't move, try a different microphone."
3. Hairline divider.
4. A vertical list of selectable rows. Each row is its own card: white fill, hairline border, radius ~8 pt, about 12 pt vertical gaps between them. Row content is a bold ~15 pt device name over a ~13 pt grey subtitle.

| Row | Subtitle | State |
| --- | --- | --- |
| `Auto-detect (MacBook Pro Microphone)` | `Uses system default microphone` | idle |
| `MacBook Pro Microphone` | `Recommended` (in blue, not grey) | **selected** |
| `AirPods` | `Bluetooth microphone` | idle |
| `Wireless Mic Rx` | `External microphone` | idle |
| `Shure MV7+` | `External microphone` | idle |

The **selected** row is marked by a darker ~1.5 pt border plus a very light grey fill, not by a checkmark. It also carries a **live input level meter** at its right edge: five rounded vertical bars, filled left-to-right in blue `#1F5BF2` against light grey unfilled bars [measured].

---

### 2.7 Other modals and dialogs

**Add to dictionary** (`png/desktop-mobile-add-dictionary-word.png`) — small centred white card, radius ~10 pt.
Title `Add to dictionary` bold ~19 pt; a single full-width text input with a hairline border, focused (darker border, caret) with placeholder `Add a new word`; then a footer row. The footer puts a **text button** `Import CSV` with an upload glyph on the **left**, and right-aligns `Cancel` (white fill, hairline border, pill) next to `Add word` (near-black fill, white text, pill). When the input is empty the primary button is disabled: light grey fill with grey text [observed in the mobile half of the same asset].

**Feedback** (`png/desktop-mobile-submit-history-feedback.png`) — centred white card, title `Feedback` bold with ✕ at the top-right. Inside, a single bordered box contains a small `Transcript ⓘ` label, then the quoted transcript preceded by a thin vertical rule, then a large text area whose placeholder reads "How can this transcript be improved? Tip: You can speak your feedback to save time." A right-aligned `Send feedback` primary button sits below, disabled until text is entered.

**Language variants** (`png/desktop-select-language-variants.png`) — centred white card, taller than wide. Title `Language variants`, a three-line grey description, then five rows, each a bordered white card about 12 pt apart: the base language left (`English`, `Chinese`, `Spanish`, `French`, `Portuguese`), and a borderless select on the right showing the chosen variant (`English (US)`, `Traditional Chinese (Taiwan)`, `Spanish (Mexico)`, `French (France)`, `Portuguese (Portugal)`). Opening one raises a white popover listing that language's variants (`English (US) / (UK) / (AU) / (CA)`) with the current one filled light grey. A footer text link `What about other languages?` is underlined and left aligned.

**Translation targets** (`frames/ttc-8.6s.png`, `frames/ttc-12.8s.png`) — centred white card. Title `Translation targets` + ✕; description "Choose up to 3 target languages for your dictation in translation mode."; then a **pale blue gradient preview panel** (radius ~10 pt) that plays an animated demo of the voice bar with a `Translating to <lang>` pill and its dark language menu; then a hairline; then a bordered list card:

- One row per configured target (`Japanese`, `German`, `Spanish (Spain)`), hairline-divided.
- A hovered row gets a light grey fill, a six-dot **drag handle** ⠿ at the left, and a **trash** icon at the right — the list is reorderable and the order sets the cycle order of the overlay's language switcher.
- A final action row `Add another language` in the accent blue. Once three targets exist it turns grey/disabled.

Opening the add row raises a picker popover listing endonym over English name (`日本語 / Japanese`, `Deutsch / German`, `Español (España) / Spanish (Spain)`, `Nederlands / Dutch`, `Français (France) / French (France)`), already-chosen languages carrying a filled check, with a **search field pinned to the bottom** of the popover (magnifier icon, placeholder `Search language`, trailing ✕ clear).

**Microphone unavailable alert** (`png/microphone-unavailable-alert.png`) and the **session-limit toast** (`png/count-down.png`) — both are dark surfaces, not white. The toast is a near-black rounded card with an orange ⚠ circle glyph, a bold white two-line title `Transcription session ends in less than 1 minute`, a grey body paragraph, and a ✕ at the top-right; it floats above the voice bar rather than inside a window.

---

### 2.8 Personalization pane

**Source:** `png/personalization-progress-report.png`; large crop in `png/homepage-Personalization-progress.png`.

Reached from the Settings modal rail, and also from `View report` on the Home personalization card.

1. **Header** — H1 `Personalization` with a small ⓘ info glyph immediately after the word, then the modal ✕ at the far right.
2. **Privacy banner** — a `#F6F6F6` card, radius ~10 pt, padlock glyph + bold `Your data stays private`, then a single grey line truncated with an inline `…more` disclosure: "Your words stay yours. We never store your actual messages, dictation, or any personal c…more".
3. **Report card** — a second `#F6F6F6` card containing everything below.
   - Header line: `Overall personalization:` in regular grey followed by `64%` in large bold black, with a `…` overflow icon button at the card's top-right.
   - **Left: polar-area ("rose") chart.** One wedge per category, all wedges sharing the same centre, each wedge's **radius** encoding its percentage against a full-circle light grey `#F0F0F0` track. Wedges are separated by white 2–3 pt gaps and carry a faint dot/halftone texture. The fill alternates between a blue family and a cyan family and lightens as values fall [measured]: `#6EA6F6`, `#51CFFF`, `#8BBAFF`, `#6ED0F7`, `#9ABCFA`, `#7AD2F4`, `#8FD8F6`, `#AEE2F5`.
   - **Right: category table.** Two columns headed `Category` and `Personalization` in small grey caps-ish labels, then hairline-divided rows. Each row is an outline glyph + category name on the left and a right-aligned percentage. Observed rows in descending order: AI assistants 92 %, Messaging 86 %, Email 75 %, Social platforms 69 %, Project management 64 %, Document editors 53 %, Presentations 42 %, Spreadsheets 36 %, Form builders 29 %, Development tools 21 %, Data analytics 16 %, Design & media 16 %, Others 9 %.

---

### 2.9 Welcome / sign-in window

**Source:** `png/macos-sign-in-options.png`

A **different window shape**: no sidebar, no nav. The full window is a soft, blurred pale blue-and-white gradient (reads as a frosted wallpaper), with traffic lights floating at the top-left. A single **pure `#FFFFFF`** card [measured] is centred on both axes, radius ~20 pt, soft shadow, roughly 38 % of window width. This is the only surface in the app that is pure white; everywhere else the "white" is `#FDFDFD`.

Contents, centred:

1. The Typeless mark in solid black, about 60 pt tall.
2. `Welcome to Typeless` — very large bold, about 40 pt.
3. `Speak, don't type` — grey subtitle, about 20 pt.
4. Four full-width pill buttons stacked with about 12 pt gaps, each roughly 44 pt tall:
   - `Continue with Google` — **primary**: near-black fill, white text, full-colour Google G.
   - `Continue with email` — white fill, hairline border, envelope glyph.
   - `Continue with Apple` — white fill, hairline border,  glyph.
   - `Continue with SSO` — white fill, hairline border, building glyph.
   Each button centres its icon + label pair as a group, so the icons are not on a shared left rail.
5. Footer microcopy, small grey, centred: "By signing in, you agree to the Terms of service and Privacy policy", both link words underlined.

---

### 2.10 Legacy v1.8.0 Home (for contrast only)

**Sources:** `png/billing-upgrade2.png`, `png/home-check-for-updates.png`, `leolabs-data-overview.png`

Kept here because it shows how the design evolved; do not copy it.

- Window corners are much squarer, and the content pane is a **white rounded panel inset** inside a grey window body rather than a flush split.
- Hero is `Speak naturally, write perfectly – in any app` with a subline `Press Fn to start and stop dictation.` where `Fn` is an inline keycap chip.
- Stats live in **one grouped grey container**: a tall personalization card on the left (percentage, caption, `View report` pill, chart, and the `Your data stays private` link **inside** the card), and a 2 x 2 of white stat cards on the right.
- `Refer friends` and `Affiliate program` are wide illustrated cards in the main content area with `Invite friends` / `Join now` buttons — in v2.0 they moved to the right rail and lost their buttons.
- A `Give feedback` block sat at the bottom with a `Last transcript ⓘ ⌄` disclosure and a text area.
- The sidebar upgrade card was taller: label, quota line, progress bar, a three-line description ("Upgrade for unlimited words, enhanced accuracy, and priority access during high demand."), then the blue `Upgrade` button. The `Get mobile app` card had Apple and Android glyphs peeking above it.
- `Version v1.8.0  Check for updates` sat bottom-**left**.

---

### 2.11 macOS menu-bar (tray) menu

**Source:** `png/menu-check-for-updates.png` (v1.8, but the command set is the app's IA)

A native macOS vibrancy menu under the crescent status item, with divider-separated groups:

```
Give feedback
─────────────────────────
Open Typeless home
Show history
Add word to dictionary
─────────────────────────
Settings…                ⌘,
Select microphone         ›
─────────────────────────
Version 1.8.0            (disabled)
Check for updates…
Quit Typeless            ⌘Q
```

Note that `Select microphone` is a submenu here but a modal inside the app, and that `Settings…` carries the standard ⌘, accelerator.

---

## 3. Design tokens observed

### 3.1 Colour

Every value below is **[measured]** from an undimmed pixel region unless noted. Values marked "recovered" were sampled through the documentation scrim and divided back out using the measured 0.20 alpha; they land on the same tokens as the undimmed samples, which is good cross-validation.

**Surfaces**

| Role | Hex | Where sampled |
| --- | --- | --- |
| Content / page background | `#FDFDFD` | History and Dictionary content panes |
| Sidebar, modal rail | `#F6F6F6` | main sidebar; settings modal rail (recovered) |
| Card / panel fill (on content) | `#F6F6F6` | Keep-history card, privacy banner, report card |
| Inset control track | `#EFEFEF` | segmented control track |
| Circular icon button | `#F0F0F0` | dictionary search button |
| Selected nav pill | `#E4E4E4` | sidebar and modal rail (recovered) |
| Menu row, current value | `#E9E9E9` | appearance and retention popovers |
| Chart unfilled track | `#F0F0F0` | personalization rose chart |
| Hairline divider / border | `#F4F4F4` – `#F6F6F6` | list dividers, card borders |
| Inverse surface (buttons, tooltips, toasts) | `#1A1819` – `#1C1A1B` | `New word` button, `Copy transcript` tooltip, session toast, sign-in primary button |
| Pure white | `#FFFFFF` | **only** the sign-in window's centre card |

Apart from the sign-in card, there is no pure `#FFFFFF` and no pure `#000000` anywhere in the chrome. The neutral ramp is essentially `FDFDFD → F6F6F6 → F4F4F4 → F0F0F0 → EFEFEF → E9E9E9 → E4E4E4 → 1A1819`. Note how tight the top of that ramp is: the divider between two list rows is only three or four levels darker than the surface it sits on.

**Accents**

| Role | Hex | Where sampled |
| --- | --- | --- |
| Primary accent / brand blue | `#1C5DEE` | `Upgrade` button fill |
| Same accent, control context | `#1F5BF2` | microphone level meter; toggle-on (recovered `#1F5EF0`) |
| Accent text link | `#4C7CFF` | `Add another language`, `Recommended` |
| Auto-added marker (mint) | `#81D0BA` | dictionary sparkle glyph |
| Success / edit (solid fill) | `#00866F` | mobile swipe `Edit` / `Copy` |
| Destructive (solid fill) | `#EB0F36` | mobile swipe `Delete` |
| Destructive (menu text/icon) | roughly `#F72854` | `Delete transcript` row |
| Neutral action (solid fill) | `#4B4B4B` | mobile swipe `More` |
| Feedback / flag | `#6B49F2` | mobile swipe `Feedback` |
| Warning | `#FF5700` | session-limit toast glyph |
| Traffic lights | `#FD4F4F`, `#00CA2D` | window controls |

**Data-visualisation ramp** (polar-area chart, high to low value): `#6EA6F6`, `#51CFFF`, `#8BBAFF`, `#6ED0F7`, `#9ABCFA`, `#7AD2F4`, `#8FD8F6`, `#AEE2F5` on a `#F0F0F0` track. It alternates a blue hue and a cyan hue and desaturates/lightens as the value drops.

**Text** [inferred from ink density, not sampled as flat fills]: primary near-black around `#111111`, secondary grey around `#6B6B6B`, tertiary/placeholder grey around `#9A9A9A`.

### 3.2 Typography

The face is a geometric-leaning grotesque with a single-storey-feeling `a`… actually a double-storey `a`, a straight-tailed `y`, and noticeably tight tracking in the display sizes. It is **not** SF Pro: the digits and the `t` terminals differ, and the apostrophe in "don't type" is a tapered comma form. It reads closest to **Poppins / Plus Jakarta Sans** in the display sizes and something Inter-like in the UI sizes **[inferred]**. Treat "Inter for UI, a geometric sans for display" as the safest reconstruction.

Sizes derived from measured cap heights, using cap height ≈ 0.71 em:

| Role | Cap height (px @1x) | Size | Weight | Example |
| --- | --- | --- | --- | --- |
| Hero (Home only) | — | ~44–48 px *[inferred]* | Bold | `Speak, don't type` |
| Window H1 | 25 | **~35 px** | Bold | `History`, `Dictionary` |
| Modal title | ~16 | ~22 px | Bold | `Microphone`, `Translation targets` |
| Dialog title | ~14 | ~19 px | Bold | `Add to dictionary`, `Feedback` |
| Section / card heading | 10.6 | **15 px** | Semibold | `Keep history`, `Audio` |
| Menu row, list row title | ~11 | ~15 px | Regular/Medium | overflow-menu items |
| Sidebar nav label | 10.0 | **14 px** | Medium | `History` |
| Button label | ~10 | ~14 px | Medium | `New word`, `Add word` |
| Body / description | 9.4 | **13 px** | Regular | `How long do you want to keep…` |
| Group label | 8.8 | **12 px** | Semibold | `Today` |
| Segmented label | 8.1 | **12 px** | Medium | `All`, `Dictations` |
| Caption / timestamp | 8.1 | **11 px** | Regular | `11:32 AM`, `Version 2.0.0` |

Line height in body paragraphs measures roughly **1.45–1.5x** the font size. Display text uses tight tracking, around **-0.02em**; body text looks near-normal.

### 3.3 Radii

| Element | Measured | Use |
| --- | --- | --- |
| Window | ~11–12 pt | outer frame |
| Modal sheet | ~16 pt | Settings modal |
| Dialog / popover card | ~10 pt | Add to dictionary, menus, microphone modal (~14 pt) |
| Card / panel | **~10–12 pt** | settings card, report card, stat cards |
| List row card | ~8–10 pt | dictionary word card, microphone row |
| Nav pill | **8 pt** | selected sidebar item |
| Input / select | ~8 pt | text fields, selects, shortcut chips |
| Tooltip | ~8 pt | dark tooltip pill |
| Pill button | **full round** | `New word`, `Upgrade`, `Cancel`, `Add word`, sign-in buttons |
| Segmented control | **full round** | track and selected thumb |
| Toggle | full round | |

Two radius families coexist: **rounded-rect** for containers and inputs (8–16 pt) and **fully rounded pills** for buttons and segmented controls. Buttons are essentially never rounded-rect.

### 3.4 Borders, shadows and elevation

- **Hairlines everywhere.** Dividers between list rows, under section headers, and around cards are a single 1 px line at `#F4F4F4`–`#F6F6F6` **[measured]** — only three or four levels darker than the `#FDFDFD` surface. They are meant to be felt, not seen. There are no heavy 1 pt borders except on focused inputs.
- **Focused input**: border goes to near-black at roughly 2 px, with no coloured focus ring.
- **Selected list row** (microphone modal): a darker ~1.5 px border plus a light fill, still no colour.
- **Elevation ladder** [observed]:
  1. flat card on background — hairline only, no shadow;
  2. hovered list row — small soft shadow, large blur, no visible offset, barely-there;
  3. popover / menu — medium soft shadow;
  4. dialog — large diffuse shadow;
  5. modal sheet — large shadow plus a page scrim.
  Shadows are always neutral grey and very diffuse. Nothing uses a tinted or coloured shadow.

### 3.5 Spacing rhythm

A **4 pt** base with heavy use of 8/12/16/24. Observed:

| Gap | Value |
| --- | --- |
| Content pane side gutter | **24 pt** |
| Sidebar side gutter | **12 pt** |
| Card grid gutter | **12 pt** |
| Nav row pitch | **~39 pt** (35 pt pill + 4 pt gap) |
| Between stacked cards in a modal | **12 pt** |
| Above a section header | **~32 pt** |
| Between label and its description line | **~4 pt** |

### 3.6 Control sizes

| Control | Measured | Notes |
| --- | --- | --- |
| Primary pill button | **90 x 32 pt** (`New word`) | height is the constant; width hugs content + ~16 pt padding |
| Select / input | **~30–32 pt** tall | |
| Segmented control | **242 x 40 pt** | thumb inset ~4 pt |
| Toggle | **30 x 19 pt**, ratio 1.60 | knob is a white circle with a tiny shadow |
| Icon button (square) | ~28 pt hit area, 20 pt glyph | light grey rounded-square on hover |
| Icon button (circular) | ~40 pt diameter | dictionary search |
| Sidebar nav row | ~35 pt tall | |

### 3.7 Icon style

[observed, best seen in `png/homepage-Personalization-progress.png`]

- **Outline only.** No filled icons anywhere in the light UI except the selected-state check (a filled black circle with a white check) and the mobile tab bar.
- Stroke weight is uniform and light, about **1.5–1.75 px at a 20 px box** — noticeably lighter than SF Symbols Regular. Joins and caps are **rounded**.
- Geometry is simple and generously rounded: the clock is a plain circle with two hands, the "document editors" glyph is a rounded rectangle with a pencil, the code glyph is a bare `</>`.
- This reads as **Lucide / Feather**, not SF Symbols **[inferred]**.
- Two custom marks break the rule and are worth reproducing exactly: the **four-point sparkle** ✦ in mint for auto-added dictionary words and AI-generated rows, and the **feather quill** in grey for manually-added words. The `Personalization` icon is a third custom mark, a cursive pen-stroke.
- Icons in section headers and setting rows are always grey, never coloured. Colour is reserved for the two dictionary markers and for status.

### 3.8 Illustration and empty states

- **Illustration style** [observed in the v1.8 refer/affiliate cards]: soft, desaturated, semi-abstract shapes in pale blue and pale pink, bleeding behind the text at low opacity rather than sitting in a frame.
- **Backdrop imagery**: the sign-in window and the translation-targets preview panel both use a very soft, out-of-focus pale blue/white/peach gradient that reads as a blurred photograph.
- **No empty state was observed** for History or Dictionary. Running out of content simply leaves blank background. **[open question]**

---

## 4. Component catalog

**Sidebar nav item** — 200 pt rail, 12 pt side gutter. Row height ~35 pt, 4 pt gap. Contents: 20 pt outline icon, 10 pt gap, 14 pt medium label.
*Idle*: transparent on `#F6F6F6`, icon and label in a dark grey.
*Selected*: `#E4E4E4` fill, 8 pt radius, label and icon go near-black.
*Hover*: **[not observed]**; a lighter grey fill around `#EDEDED` is the obvious interpolation.

**Section header** (inside Settings and Personalization) — 20 pt outline glyph, 8 pt gap, 15 pt grey label, then a hairline rule spanning the full content width about 12 pt below the baseline. ~32 pt of space above.

**Setting row** — a two-column grid. Left column: 15 pt semibold label on line 1, 13 pt grey description on line 2 (wraps to 2 lines freely), capped at roughly 60 % of the content width. Right column: the control, right-aligned and vertically top-aligned with the label, not centred on the whole row. Rows are separated by space, not by dividers.

**Switch / toggle** — 30 x 19 pt pill. *On*: `#1C5DEE` track, white knob at the right with a hairline shadow. *Off*: **[not observed]** — expect a `#E4E4E4`-ish track with the knob left.

**Select (dropdown)** — white fill, hairline border, 8 pt radius, ~30 pt tall, value text left, chevron ⌄ right with ~10 pt inset. *Open*: border darkens, chevron flips to ⌃, popover drops below, left-aligned, width matched to the trigger. Popover: `#FDFDFD`, 10 pt radius, medium shadow, ~4 pt internal padding; rows ~32 pt tall; current row filled `#E9E9E9` with a filled-black-circle white check at the right.

**Segmented control** — fully-rounded `#EFEFEF` track, 40 pt tall, thumb inset ~4 pt. Selected thumb is white with a soft shadow; selected label is darker and slightly heavier. Segments size to their content, not to equal widths. Segments may carry a leading glyph.

**Primary button** — near-black `#1A1819` fill, white 14 pt medium label, 32 pt tall, fully rounded, horizontal padding ~16 pt. *Disabled*: light grey fill with grey label; no outline, no reduced opacity on the text alone.

**Secondary button** — white fill, hairline border, near-black label, same 32 pt height and pill radius. Used for `Cancel`, `Add another`, `Select language variants`.

**Tertiary / tinted button** — light grey `#EFEFEF` pill, dark label, no border. Used for `View report`.

**Text button** — no container; label plus an optional leading glyph, in near-black (`Import CSV`) or in the accent blue (`Add another language`). Underlined only when it is a link out (`Check for updates`, `What about other languages?`).

**Icon button** — 20 pt outline glyph in a ~28 pt square hit area. Idle is transparent; hover paints a light grey rounded-square (~6 pt radius). A circular variant (~40 pt, `#F0F0F0`) is used for the dictionary search.

**History list row** — hairline-divided, no card. Left gutter of fixed width holds an 11 pt grey timestamp; the body sits to its right at 13 pt with real paragraph and list rendering. Vertical padding ~14 pt. *Hover*: the row becomes a white card with a soft shadow and a right-aligned cluster of icon buttons appears; on a failed row a labelled `Retry` button joins the cluster. A trailing sparkle marks Ask-anything entries.

**Dictionary word card** — white `#FDFDFD`, hairline border, ~10 pt radius, ~40 pt tall, three per row with 12 pt gutters. Contents: marker glyph, 10 pt gap, 14 pt term. *Hover*: shadow plus pencil and trash icon buttons inside the right edge.

**Tag / badge** — two kinds. The **plan badge** next to the wordmark is a small pill: `Pro` in blue on a pale blue fill, `Free` in grey on a pale grey fill, about 11 pt semibold with ~6 pt horizontal padding. The **value chip** in a setting's control column (`Japanese`, `Japanese, Ger… +1`) is a bordered white pill with a trailing pencil icon, and overflows with a `+n` counter rather than wrapping.

**Search field** — the desktop app does **not** show a persistent search field. Dictionary search is a circular icon button that presumably expands **[inferred]**. Inside popovers, search appears as a bottom-pinned field: hairline border, pill radius, leading magnifier, placeholder `Search language`, trailing ✕ to clear.

**Modal / sheet** — page scrim at ~0.65 alpha; centred card; 10–16 pt radius; large diffuse shadow; ✕ at the top-right; no button footer for settings-style modals, and a right-aligned Cancel + primary pair for form-style dialogs. The Settings modal is the only one with its own internal rail. Modals stack: the microphone picker opens **on top of** the Settings modal with a second scrim.

**Keyboard-shortcut chip (keycap)** — a small rounded rect, ~8 pt radius, white fill, hairline border, ~14 pt label, horizontal padding ~8 pt, height ~26 pt. Multiple chips sit side by side with ~6 pt gaps inside a shared bordered container that also holds a trailing ✕ to clear the whole binding. In onboarding and the Home right rail the same chip appears standalone with a slightly heavier border. Capture state replaces the chips with a focused input showing `Type a shortcut`.

**Progress indicator** — only one form observed: a thin (~3 pt) fully-rounded two-tone bar under the quota line in the sidebar upgrade card. No spinners, no determinate rings. The microphone level meter is a discrete five-bar equaliser rather than a progress bar.

**Empty state** — **[not observed]**.

---

## 5. Navigation model and information architecture

**Three top-level destinations only.** The sidebar holds `Home`, `History`, `Dictionary` and nothing else. Everything configurable lives behind the gear.

```
Main window
├── Home            statistics, personalization summary, shortcut reminder, growth links
├── History         retention setting + transcript list (All / Dictations / Ask anything)
└── Dictionary      auto-added + manually-added terms
     └── sidebar footer
         ├── person icon   → Account
         ├── envelope icon → inbox / messages
         ├── gear icon     → Settings modal
         └── ? icon        → help
```

```
Settings modal (overlays the main window, ~87% x ~81%)
├── Account          plan + Subscription section            [text-only]
├── Settings         Keyboard shortcuts → Language → Audio → General
│    ├── Microphone            → nested modal (device list + level meter)
│    ├── Translation targets   → nested modal (ordered list, max 3, drag to reorder)
│    └── Language variants     → nested modal (one select per base language)
├── Personalization  privacy banner + overall % + rose chart + category table
├── About                                                    [not observed]
├── Help center ↗    external
└── Release note ↗   external
```

**Inline vs modal — the rule the app follows.** A setting whose value is a single choice from a short list is a **select with a popover** and is edited inline (Appearance, Interface language, Keep history). A setting that needs a list, a preview, ordering, or live feedback is promoted to a **nested modal** (Microphone, Translation targets, Language variants). Destructive and per-item actions live in a **row overflow menu**, never inline.

**Ordering logic in Settings.** Sections run from most-used to least: the shortcuts you press constantly, then language (which changes what you get back), then audio hardware, then app-level preferences. Within a section, rows that open something come before rows that are simple toggles.

**Where the same concept appears twice.** `Your data stays private` shows up as a link under the Home hero, as a card row in History, and as a banner in Personalization. Personalization is reachable both from the Home card's `View report` and from the Settings rail. Microphone selection exists in the Settings modal and in the menu-bar menu.

**Immediate application.** No settings modal has Save or Apply. Every control commits on change and the modal is dismissed with ✕ or, presumably, Escape **[inferred]**.

---

## 6. Open questions and what could not be observed

1. **Dark mode.** `Appearance` offers `Light` / `Dark` / `System`, but **no dark-mode screenshot of any app window exists** in the help centre or on the marketing site. Every dark surface observed (tooltips, overflow toast, the voice bar) is an inverse component in the light theme, not dark mode. The dark palette must be designed, not copied.
2. **Account pane.** Never screenshotted. Help prose confirms only that it exists, that the plan is managed there, and that cancellation happens "under `Subscription` on the Account page". Plan name, email display, sign-out placement and the layout are unknown.
3. **About pane.** Never screenshotted. Presumably version, licences, and links, but nothing is confirmed.
4. **Release notes pages.** `https://www.typeless.com/help/release-notes/macos` and `/windows` return a client-rendered shell with no entries and no assets in the HTML. Fetched twice (WebFetch and curl) with the same result. Any screenshots embedded in dated release-note entries are unreachable without executing the page's JavaScript.
5. **Windows build.** Every screenshot is macOS. The Windows chrome (title bar, window controls, `Show app in dock` equivalent) is unknown.
6. **Hover states for sidebar nav, buttons, and selects.** Only the selected states were captured. Hover was observed only for list rows and icon buttons.
7. **Toggle OFF appearance.** Every toggle in every screenshot is on.
8. **Empty states** for History and Dictionary, and the **loading / skeleton** treatment, were never shown.
9. **The expanded search field** in Dictionary. Only the collapsed circular button was captured.
10. **Exact typeface.** Identified by eye only. The web font on typeless.com is not necessarily the app's font, and no screenshot resolves the ambiguity between Poppins, Plus Jakarta Sans and a similar geometric sans at display sizes.
11. **Window resize behaviour.** Whether the sidebar is truly fixed at 200 pt, whether the Home right rail collapses at narrow widths, and the minimum window size are all unknown; only one window size was ever rendered.
12. **The inbox / envelope icon** in the sidebar footer is never explained in any help page and was never shown open.
