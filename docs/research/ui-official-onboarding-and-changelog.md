# Official Typeless UI research — onboarding, permissions, errors, empty states, changelog

Research date: **2026-09-18**. Researcher scope: first-run/onboarding flow, permission prompts,
sign-in screens, empty states, error and troubleshooting UI, and the release-notes changelog read as
a timeline of UI screenshots. The settings/history/dictionary windows, the floating voice bar and the
brand system are other agents' topics; assets that show them were still collected and are routed in
the manifest.

All assets live in `.local/research-ui/onboarding-changelog/` (`raw/` originals, `png/` converted,
`frames/` video stills, `thirdparty/` non-official captures, `manifest.json`).

## 1. Evidence rules

* **Observed** — read directly off a downloaded image or video frame, or quoted verbatim from a page
  I fetched. Pixel measurements were taken with `ffmpeg` raw-pixel scans on the original files.
* **Inferred** — a reasonable reading that the evidence supports but does not prove.
* **Unknown** — not present in any source I could reach.

Pixel values below are **device pixels of the source image**. Where a real screen capture let me
establish the backing scale, I also give logical points (pt).

Two caveats that shape everything downstream:

1. The images on `typeless.com/help` are **idealised marketing renders**, not screen grabs. They show
   a browser-free window floating on a blurred pastel backdrop.
2. The third-party captures (`note.com`, Leo Labs) are **real screenshots** and disagree with the
   marketing renders in several places. Where they conflict, both are reported.

### Sources

| Source | URL | Date | What it gave |
|---|---|---|---|
| Official setup guide (macOS only) | `https://www.typeless.com/help/installation-and-setup` | live 2026-09-18, undated | 7 ordered onboarding steps, 9 images, 2 videos |
| Troubleshooting index | `https://www.typeless.com/help/troubleshooting` | live 2026-09-18 | 7 subpages |
| Missing transcript | `.../troubleshooting/missing-transcript` | undated | History as recovery path |
| Dictation limit | `.../troubleshooting/dictation-limit` | undated | 9-minute cap, 60-second countdown toast |
| Permission issues | `.../troubleshooting/permission-issues` | undated | 2 GIFs, older 4-stage onboarding visible |
| System setting conflicts | `.../troubleshooting/system-setting-conflicts` | undated | fn-key conflict guidance |
| Give feedback | `.../troubleshooting/give-feedback` | undated | feedback card + History flag icon |
| Check for updates | `.../troubleshooting/check-for-updates` | undated | Home footer link + menu-bar menu |
| Microphone unavailable | `.../troubleshooting/microphone-unavailable` | undated | dark error toast, 8 platform videos |
| FAQs | `https://www.typeless.com/help/faqs` | undated | permission rationale copy |
| macOS release notes | `https://www.typeless.com/help/release-notes/macos` | 7 entries, 2025-08-14 → 2026-08-26 | version/date timeline |
| Windows release notes | `https://www.typeless.com/help/release-notes/windows` | 3 entries, 2025-10-22 → 2026-08-26 | version/date timeline |
| Sitemap | `https://www.typeless.com/sitemap.xml` | — | full page enumeration (7 locales) |
| note.com review (Japanese, Naoyuki Kubo) | `https://note.com/naoyukikubo/n/n8494c0c147de` | images stamped 2026-02-07 → 2026-08-09 | real onboarding + sign-in + permission captures |
| Leo Labs deep dive (Leo) | `https://leolabs.me/blog/typeless-deep-dive/en/` | 2026-03-30 | real Home hero and Dictionary captures (zh locale) |

Asset hosts found: `typeless-static.com/webpage/assets/...`, the same bucket via
`s3.us-west-2.amazonaws.com/typeless-static.com/...`, and `static-web.maxai.photos/...` (Typeless is
a MaxAI product, which is why the second host appears).

## 2. Onboarding flow

### 2.1 Window shell (observed)

The onboarding window is the same size on every screen.

| Property | Value |
|---|---|
| Marketing render size | 2160 × 1500 px |
| Real capture size (note.com, 2026-02-07, Retina @2x) | 2159 × 1500 px |
| Logical size | **1080 × 750 pt** |
| Aspect ratio | **1.44 : 1** (36 : 25) |

Both the marketing render and an unrelated real screenshot land on the same 2160 × 1500 figure, so
the 1080 × 750 pt window is solid. Chrome is a plain macOS window: traffic lights top-left, **no
title text, no toolbar, no sidebar**. Whether it is resizable is unknown.

### 2.2 Progress header (observed)

Present on every screen after sign-in. Not present on the sign-in screen itself.

* Height 112 px of the 1500 px window (≈ 56 pt), pure white, flush to the window top.
* Stage labels centred horizontally as a row, separated by thin chevrons (`>`).
* Active stage is near-black and bold; inactive stages are mid-grey and regular weight.
* Directly beneath sits a **full-width progress bar, 8 px tall (≈ 4 pt)**.
* The bar's filled portion is a **left-to-right gradient that darkens toward the playhead**, running
  from about `#9A9A9A` at x = 0 to about `#323232` at the fill edge. The unfilled track is `#F3F3F3`.
  This gradient is the single most distinctive detail of the onboarding chrome.

Fill fractions measured: 39.2 % on the microphone-test screen, 45.1 % on the accessibility-permission
screen. Both screens show "Set up" as the active stage, so the fill advances *within* a stage rather
than snapping to stage boundaries. The two figures are not in flow order, which I cannot reconcile
from static assets — see Open questions.

### 2.3 Stage labels changed between builds (observed)

| Build | Stages |
|---|---|
| Current (2026-09 help centre renders) | Sign up → **Set up** → Experience it (3 stages) |
| Older (real capture 2026-02-07, and the permission-issues GIFs) | Sign up → Permissions → Set up → Try it (4 stages) |

The flow was compressed from four stages to three, and "Try it" was renamed "Experience it".

### 2.4 Screen-by-screen

#### Step 0 — Install (observed, outside the app)

Three OS-level screens the guide documents but the app does not draw: the DMG window with the app
icon dragged onto the Applications alias, Launchpad/Spotlight, and the macOS Gatekeeper dialog
(`"Typeless" is an app downloaded from the Internet. Are you sure you want to open it?` with
**Cancel** and a blue **Open**).

#### Step 1 — Sign in (observed)

Marketing render (`setup-04-sign-in-options.webp`):

* No progress header. The window background is a **blurred pastel wallpaper** — soft blue-grey at the
  left (`#E1E3E7`), warmer off-white at the right (`#F1F2F6`).
* A centred **white card**, roughly 872 × 960 px (≈ 436 × 480 pt), so about 40 % of window width and
  64 % of window height, with a soft large corner radius and no visible border or shadow edge.
* Card contents top to bottom: the Typeless crescent mark in black, an H1 **"Welcome to Typeless"** in
  a heavy geometric sans, a grey subtitle **"Speak, don't type"**, then four full-width pill buttons
  at even spacing, then a two-line legal note.
* Button order and treatment:
  1. **Continue with Google** — primary, fill `#1C1A1B`, white label, full-colour Google "G" glyph.
  2. **Continue with email** — secondary, fill `#FFFFFF`, hairline grey border, black label, envelope icon.
  3. **Continue with Apple** — secondary, Apple logo in black.
  4. **Continue with SSO** — secondary, building/office glyph.
* Footer: `By signing in, you agree to the Terms of service and Privacy policy`, both links underlined.

Real capture (`note-jp-07.png`, 2026-02-07) differs in three ways:

* The window background is **plain white** — there is no pastel wallpaper and no card. The content
  sits directly on the window.
* Only **two** providers are offered: the black Google pill, then a horizontal rule with the word
  "or" (`または`) centred in it, then the outlined email pill. Apple and SSO are absent.
* The subtitle is "smart dictation that understands you", not "Speak, don't type".

So the sign-in screen gained Apple and SSO, gained the pastel-card treatment, and lost the "or"
divider somewhere between February and September 2026. *Inferred:* the card-on-wallpaper treatment is
the current one, since it matches the rest of the current help-centre set.

#### Step 2 — Permissions (observed)

Title **"Set up Typeless on your computer"**, H1 left-aligned in the left panel.

* The body splits into two vertical panels: **white content panel occupying 1196 px of 2160
  (55.4 %)** on the left, and a blurred pastel art panel on the right (44.6 %). In the February real
  capture the right panel is an almost-empty near-white (`#F9FAFB`), so the art panel is newer.
* The left panel holds **two stacked permission cards**, fill `#F9F9F9`, inset about 100 px (6.4 % of
  window width) from the panel edge, each about 656 px wide (42 % of window width), modest corner
  radius.
* Only one card is expanded at a time; it shows title, one line of grey explanatory copy, a small
  black **Allow** pill and an outlined ⓘ info icon beside it.
* A completed card **collapses to its title alone and gains a filled black circular checkmark** on the
  right edge. This checked-and-collapsed state is the clearest reusable pattern on the screen.

Exact copy:

| Card | Title | Body |
|---|---|---|
| 1 | Allow Typeless to paste text into any textbox | This lets Typeless put your spoken words in the right textbox. |
| 2 | Allow Typeless to use your microphone | Typeless will only access the mic when you are actively using it. |

Pressing **Allow** triggers the native OS prompt, shown in the right panel of the render: the macOS
microphone TCC dialog (`"Typeless" would like to access the microphone. / Typeless requires access to
your microphone for voice commands.` with **Don't Allow** and **Allow**).

Manual-fallback copy from the guide, for when the prompt cannot be used:
System Settings → Privacy & Security → Accessibility → turn on Typeless; if absent, **+** → pick
Typeless from Applications → **Open**. Same path for Microphone. If macOS asks, click
**Quit & Reopen**.

#### Step 3 — Microphone test (observed)

* H1 **"Speak to test your microphone"**, subtitle "Your computer's built-in mic will ensure optimal
  transcription."
* Mid-panel, in bold black: the yes/no question **"Do you see the blue bars moving while you speak?"**
* Right panel carries a **white rounded card holding a 15-bar level meter**. Bars are vertical
  rounded lozenges at even pitch; active bars are **`#1E5CF2`**, inactive **`#D9D9D9`**. In the render
  6 of 15 are lit. The meter card fill is `#FAFAFA`.
* Buttons sit bottom-right of the left panel, secondary then primary:
  **"No, change microphone"** (white fill, hairline border) and **"Continue"** (fill `#1C1A1B`).
* A **"← Back"** text link sits top-left of the left panel.
* Failure branch, per the guide: choosing "No, change microphone" reveals a device list in-app; the
  guide then sends the user to System Settings → Sound → Input.

#### Step 4 — Confirm shortcuts / "Experience it" (observed)

`setup-08-experience-the-magic.webp` (2160 × 1380) is a full-bleed pastel screen with no window
chrome visible.

* Centred headline **"Speak, don't type"** with the first word in near-black and "don't type" in grey
  `#747476` — a two-tone headline, reused from the sign-in subtitle.
* Three cards with a **vertical periwinkle gradient from `#C4D4FF` at the top to `#F3F6FE` at the
  bottom**, generous corner radius. Layout: one wide **Dictate** card on top, then **Translate** and
  **Ask anything** side by side beneath it.
* Each card holds a bold black feature name and one or two **keycap chips** — white rounded rectangles
  with a solid black outline and black label.

Default shortcuts (observed):

| Feature | macOS | Windows |
|---|---|---|
| Dictate | `Fn` | `Right Alt` |
| Translate | `Fn` + `Left Shift` | `Right Alt` + `Right Shift` |
| Ask anything | `Fn` + `Space` | not stated |

The guide then walks three guided examples (Dictate, Translate, Ask anything), each a bulleted list
of four claims. *Unknown:* whether these examples are separate screens inside the app or a single
scrolling screen.

#### Step 5 — Done (observed, partially)

The guide's closing section "Begin your Typeless journey" is illustrated with
`macos-typeless-across-apps-and-websites.webp`, which is **not a final onboarding screen** — it is a
screenshot of the main Home window at build v2.0.0. *Inferred:* onboarding ends by handing the user
to Home; there is no separate celebration screen in evidence.

## 3. Permission and error UI

### 3.1 Toasts are dark, and the rest of the app is light (observed)

This is the single most surprising design fact in the whole set. Transient alerts render as a
**floating dark card** over the desktop, near the voice bar, while every window surface is light.

Shared anatomy, from `err-microphone-unavailable-alert.webp` (toast measures 708 × 337 px) and
`err-dictation-limit-countdown.webp` (toast 1440 px wide):

* Surface **`#1C1A1B`** — the exact same near-black as the primary button fill.
* Large corner radius; a soft drop shadow below.
* Header row: a circular **(!)** status icon immediately left of a bold white title, and a grey **×**
  dismiss at the far right.
* Body copy **centred**, grey `#9F9C9D`, two to three lines.
* Optional action pill, fill `#424242`, white label.
* The microphone-unavailable toast also carries a small **Typeless crescent + wordmark in grey at the
  bottom-right**, which the countdown toast does not.

Status icon colours:

| State | Icon colour |
|---|---|
| Warning (session countdown) | **`#FF570A`** (clean sample, thick stroke) |
| Error (microphone unavailable) | saturated red; the 1 px ring samples `#DA646E` against the dark surface, so the source sits brighter, in the `#F04452`–`#FF5A5A` family |

### 3.2 Microphone unavailable (observed)

Title **"Microphone unavailable"**. Body:
`Typeless can't access your microphone. Another app may be using it, or access may be blocked by a
system or security setting.` Action pill: **"Get help"**.

The help page enumerates four causes (OS block, security/MDM software, another app holding the mic,
device unavailable) and ships **eight screen-recording videos** covering Windows 11, Windows 10,
Windows exclusive mode, Windows device check, macOS 13, macOS 12, macOS system check and the in-app
picker. The in-app microphone picker appears on both platforms; the Windows recording is 1354 × 940,
which is a different window size from the macOS onboarding window.

### 3.3 Dictation limit (observed)

Hard cap **9 minutes per dictation**. At the 8-minute mark a **60-second countdown** appears on the
voice bar. If the cap is hit, the dictation so far is saved to History automatically.

The toast reads **"Transcription session ends in less than 1 minute"** with body `Typeless currently
supports up to 9 minutes of transcription per session. Start a new session to continue.` It sits
directly above the voice bar, which in that same asset shows a circular **×**, a white waveform, the
countdown **0:59**, and a white circular **✓** — voice-bar detail belongs to the overlay agent.

### 3.4 Missing-permission surfacing inside the app (unknown)

No banner, red dot, or in-window nag is visible in any official or third-party asset. The
permission-issues page only tells the user to toggle the OS switches off and on. *Inferred:* a
missing permission is surfaced as a toast at the moment of use rather than as persistent window
chrome, but I found no image proving it.

### 3.5 Missing transcript (observed)

There is no error UI. The page's answer is a recovery path: open **History**, where the last
transcript persists for the configured **Keep History** retention window, after which records are
deleted automatically.

### 3.6 Feedback UI (observed)

The Home screen carries a **"Give feedback"** section, shown in `fb-give-feedback-home.webp`:

* An outlined card containing a **"Last transcript" chip** with an ⓘ icon and a ⌄ disclosure, plus an
  **×** at the card's top-right that switches the form from transcript-specific to general feedback.
* Below the chip, the transcript preview is quoted with a **vertical rule on its left**.
* A textarea with the placeholder
  `How can this transcript be improved? Tip: You can speak your feedback to save time.`
* A **"Send feedback"** button bottom-right, shown in a **disabled state**: light grey fill, grey
  label — a useful reference for the disabled-primary treatment.

Per-item reporting lives in History as a **flag icon on each row**.

### 3.7 Update UI (observed)

Two entry points.

* **Home footer**, bottom-left of the content area: `Version v1.8.0` in grey followed by an
  underlined **"Check for updates"** link. The v2.0.0 Home shows the same pattern at the bottom-right
  of the right rail, reading `Version 2.0.0  Check for updates`.
* **Menu-bar menu** (`upd-menubar-check-for-updates.webp`), a standard macOS menu whose items are, in
  order: *Give feedback · Open Typeless home · Show history · Add word to dictionary* — separator —
  *Settings… ⌘,* · *Select microphone ›* — separator — *Version 1.8.0* (disabled) · *Check for
  updates…* · *Quit Typeless ⌘Q*. The status-bar icon is the Typeless crescent.

### 3.8 Plan-limit UI (observed)

The free plan surfaces its cap as a **sidebar card**, not a toast:
title "Get unlimited words", a bold counter `1,872 / 8,000 words` with an ⓘ, a thin dark progress
rule underneath, three lines of benefit copy, and a **blue `#1F5DF3` Upgrade pill**. The plan badge
sits next to the wordmark: a grey **Free** pill or a blue-tinted **Pro** pill.

## 4. Empty states

**No official or third-party asset shows an empty History, empty Dictionary, or zero-state Home.**
Every screenshot is populated with sample data. The closest evidence:

* `upd-home-check-for-updates.webp` shows a **fresh free account** with the counter at `0 / 8,000
  words`, so the sidebar card's zero state is observed. Its Home body is blurred in that render.
* The Dictionary has an obvious "no words yet" path implied by its **"New word"** primary pill and
  the `All / Auto-added / Manually-added` filter, but no empty rendering exists in evidence.
* History's retention copy (`Keep history`, `Your data stays private`) sits in a header block above
  the list, so an empty list would still show that block.

This is a real gap. Treat every empty state as **unknown** and design it fresh.

## 5. Changelog timeline

Ten dated entries exist across the two desktop platforms. Versions and dates are taken verbatim from
each entry page.

| Date | Platform | Version | Title | UI-relevant change | Asset |
|---|---|---|---|---|---|
| 2025-08-14 | macOS | V0.1.0 | Introducing Typeless for Mac (Beta) | First public UI. Dictionary with **Add new**; History retention control | `rn-v010-cover-macos`, `rn-beta-dictionary-macos`, `rn-beta-stays-local-macos` |
| 2025-09-23 | macOS | V0.4.0 | Voice Superpowers | Select-text → hotkey → speak command. Introduces the rewrite overlay | `rn-voice-superpowers-cover`, 3 rewrite GIFs |
| 2025-10-22 | Windows | V0.1.0 | Introducing Typeless for Windows (Beta) | Windows port of the v0.1.0 UI | `rn-v010-cover-windows`, `rn-beta-dictionary-windows` |
| 2025-12-04 | macOS | V0.7.0 | Getting started with Translation mode | Settings → Language → "Set target language for translation mode"; shortcut `fn + ⇧` | `rn-v070-cover`, 3 GIFs/PNG |
| 2025-12-16 | macOS | V0.8.1 | Setting your preferred language variant | Regional variants. States the **gear icon is in the bottom-left corner of the app** | 3 PNGs |
| 2025-12-24 | macOS | V0.9.0 | Getting started with v0.9.0 features | Personalization (on by default, off in Settings → Personalization); web search + Markdown | 1 PNG, 1 GIF |
| 2026-07-08 | macOS | **V2.0.0** | Set multiple target languages for Translate | Settings → Language → **Translation targets** → Edit → Add another language, drag to reorder. Language chip hovers **above the Voice bar** | 2 posters + 2 MP4 |
| 2026-07-08 | Windows | **V2.0.0** | Set multiple target languages for Translate | Same; Windows defaults `Right Alt` / `Right Alt + Right Shift` | 2 posters + 2 MP4 |
| 2026-08-26 | macOS | **V2.4.0** | Keep your History synced across devices with Cloud Sync | History → **Cloud Sync** toggle → **Agree and turn on** consent step | 1 poster + 1 MP4 |
| 2026-08-26 | Windows | **V2.4.0** | Keep your History synced across devices with Cloud Sync | Same on Windows | 1 poster + 1 MP4 |

There is a version gap with no release note between V0.9.0 (2025-12) and V2.0.0 (2026-07), yet
v1.8.0 is visible in the help-centre screenshots. The 1.x line shipped without published notes.

### What the current UI generation looks like

Three distinct Home generations are visible in the collected assets:

| Generation | Evidence | Hero | Layout |
|---|---|---|---|
| 0.x (2025-08 → 2025-12) | release-note images | — | Settings reached by a **gear in the bottom-left corner** |
| 1.8.x (≈2026-02 → 2026-06) | `upd-home-check-for-updates`, `fb-give-feedback-home`, `leolabs-data-overview` | "Speak naturally, write perfectly – in any app" with an inline `fn` keycap | Sidebar + 4 metric tiles + referral banner + **Give feedback** section; `Version v1.8.0 Check for updates` bottom-left |
| **2.0.0+ (current, ≥2026-07)** | `setup-09-across-apps` | **"Speak, don't type"**, very large and heavy | Sidebar + shortcut card (Dictate/Translate/Ask anything with keycaps) + **"Popular use cases"** app grid + **right rail** holding stats, "Refer friends", "Affiliate program"; `Version 2.0.0 Check for updates` bottom-right |

**Outdated, do not copy:** every image under `rn-beta-*`, `rn-v070-*`, `rn-langvariants-*`,
`rn-v090-*` (0.x settings, dictionary and history layouts, and the bottom-left gear), plus the
four-stage onboarding header in `err-permission-fix-*.gif` and `note-jp-08.png`, plus the v1.8.x Home
in `upd-home-check-for-updates`, `fb-give-feedback-home` and `leolabs-data-overview`.

**Current, safe to copy:** the `setup-0*` onboarding set, `err-microphone-unavailable-alert`,
`err-dictation-limit-countdown`, `rn-macos-*` / `rn-windows-*` posters from 2026-07 and 2026-08, and
`setup-09-across-apps` for Home.

## 6. Third-party evidence

### note.com — Naoyuki Kubo, Japanese, images stamped 2026-02-07 to 2026-08-09

The only source with **real desktop onboarding captures**. Twenty images collected.

* `thirdparty/note-jp-07.png` (4480 × 2520, 2026-02-07) — the sign-in window on a Mac desktop.
  Establishes the **1080 × 750 pt** window size, the plain white background of that build, the
  two-provider layout with an "or" divider, and that the Dock icon and menu-bar icon are both the
  black crescent. The menu bar shows the crescent as the **leftmost status item**.
* `thirdparty/note-jp-08.png` (2026-02-07) — the permissions screen with the **four-stage header**,
  alongside the native mic dialog and System Settings → Accessibility with `Typeless.app` toggled on.
  Confirms the collapsed-card-with-black-check pattern and the gradient progress bar (fill ≈ 46 %,
  `#A1A1A1` → `#3E3F40`, track `#F4F4F3`).
* `thirdparty/note-jp-05.png` — Applications folder; the app icon is the black crescent on white.
* `thirdparty/note-jp-09.png` — real dictation into a text field, result auto-formatted as a numbered
  list. Overlay agent's material.
* `thirdparty/note-jp-11.png`, `note-jp-13.png` (2026-06-08) — the **Ask-anything answer panel**: a
  floating **light** window titled "Typeless" with a close ×, rendering a Markdown answer with
  headings and bullets. Overlay agent's material.
* `thirdparty/note-jp-18.png`, `note-jp-20.png` (2026-07-20, 2026-08-09) — the **web** sign-in modal
  on typeless.com, not the app. Four providers, and a tinted notice strip above the buttons carrying
  a referral message (`Your friend gifted you $5 Typeless Pro credit. Sign up to claim.`). Useful as
  the house style for an inline notice strip.
* `thirdparty/note-jp-19.png` (2026-07-29) — web cancellation modal: a yellow warning strip, a grey
  "Keep current plan" button and a **red destructive** "Continue cancel" button. The only red button
  anywhere in the collected set.

Light theme throughout; **no dark-theme screenshot exists in any source I found**, even though the
help centre documents a "Switch appearance" setting.

### Leo Labs — "Typeless deep dive", 2026-03-30, author Leo

Two real captures in a Chinese locale, build ≈ v1.8.x. The article text is about privacy and data
retention and says almost nothing about the UI, so the value is entirely in the images.

* `thirdparty/leolabs-data-overview.png` — the v1.8.x Home hero. Headline "Speak naturally, write
  perfectly – in any app", subtitle with an **inline `Fn` keycap chip rendered in running text**, a
  "Popular use cases ↗" button top-right. Below, a large light-grey container holds white sub-cards:
  a **radial/pie personalization chart** at 55.5 % with a "View report" pill, and four metric tiles
  (total dictation time, words dictated, time saved, average dictation speed). A lock icon plus
  underlined "Your data stays private" sits at the bottom-left of that block.
* `thirdparty/leolabs-dictionary.png` — the Dictionary screen. H1, a **dark "New word" pill**
  top-right, a segmented filter `All / ✦ Auto-added / ✎ Manually-added` where the active segment is a
  white pill on a light grey track, a circular search button at the right, and a **three-column grid
  of word chips** — white rounded rects with hairline borders, each prefixed by a **teal sparkle
  glyph** for auto-added entries. Windows agent's material.

### Searches that produced nothing usable

Product Hunt returned a JavaScript shell (5.7 KB) with no gallery images. Reddit r/macapps, YouTube
thumbnails and Computerworld surfaced no Typeless desktop screenshots in the search results. Review
sites (`spokenly.app`, `getvoibe.com`, `andrewmurrayhq.com`) carry text only, no product captures.

## 7. Colour and metric reference

Every value below is a direct pixel sample from a source image.

| Token | Value | Where |
|---|---|---|
| Near-black (primary button, toast surface, voice bar) | `#1C1A1B` | sign-in, mic test, both toasts |
| Blue accent (level meter, Upgrade button) | `#1E5CF2` / `#1F5DF3` | mic test, v2.0.0 Home |
| Inactive meter bar | `#D9D9D9` | mic test |
| Permission card fill | `#F9F9F9` | permissions |
| Sidebar fill | `#F8F8F8` | v2.0.0 Home |
| Selected nav row fill | `#E5E5E5` | v2.0.0 Home |
| Card / panel white | `#FFFFFF` | everywhere |
| Progress track | `#F3F3F3` | onboarding header |
| Progress fill gradient | `#9A9A9A` → `#323232` | onboarding header |
| Toast body text | `#9F9C9D` | both toasts |
| Toast action pill | `#424242` | microphone unavailable |
| Headline secondary grey | `#747476` | "Experience it" |
| Feature card gradient | `#C4D4FF` → `#F3F6FE` (top → bottom) | "Experience it" |
| Warning icon | `#FF570A` | dictation limit |
| Window backdrop (blurred art) | `#E1E3E7` → `#F1F2F6` | sign-in, set-up right panel |

| Metric | Value |
|---|---|
| Onboarding window | 1080 × 750 pt (1.44 : 1) |
| Header height | 112 px of 1500 (≈ 56 pt, 7.5 % of window height) |
| Progress bar height | 8 px (≈ 4 pt), full window width |
| Content / art panel split | 55.4 % / 44.6 % |
| Sign-in card | ≈ 872 × 960 px (≈ 436 × 480 pt), 40 % × 64 % of window |
| Permission card | ≈ 656 px wide (42 % of window width), inset ≈ 100 px |
| Level meter | 15 bars, 6 lit in the render |
| Microphone-unavailable toast | 708 × 337 px |
| Dictation-limit toast | 1440 px wide |
| Dictation cap | 9 minutes, 60-second countdown at 8:00 |
| Free-plan cap | 8,000 words |

## 8. Asset manifest summary

`manifest.json` documents **67 assets**; the directory holds 234 files and 120 MB once converted PNGs
and extracted video frames are counted (86 originals in `raw/`, 90 in `png/`, 30 in `frames/`, 26 in
`thirdparty/`).

| Group | Count | Notes |
|---|---|---|
| Onboarding (`setup-*`) | 11 | 9 images + 2 MP4 |
| Permissions and errors (`err-*`) | 13 | includes 2 MP4 and 2 GIF |
| Updates, feedback, billing (`upd-*`, `fb-*`, `billing-*`) | 5 | |
| Release notes (`rn-*`) | 22 | spans v0.1.0 → v2.4.0 |
| Third party (`note-jp-*`, `leolabs-*`) | 12 documented of 23 downloaded | |

Every entry carries `source_url`, `page_url`, `date`, `shows` and a `topics` array
(`onboarding` / `permissions` / `windows` / `overlay` / `brand`) so the lead can route assets.

**Routed to the windows agent:** `setup-09-across-apps` (current v2.0.0 Home),
`upd-home-check-for-updates` and `fb-give-feedback-home` (v1.8.x Home, free and pro),
`fb-report-transcription`, `err-missing-transcript-history`, `billing-upgrade`, both
`err-*-typeless-mic-check*` (in-app microphone picker, macOS and Windows), all `rn-macos-*` and
`rn-windows-*` posters, `rn-beta-dictionary-*`, `rn-beta-stays-local-*`, `rn-langvariants-*`,
`rn-v070-translation-select`, `rn-v070-translation-shortcut`, `rn-v090-disable-personalization`,
`thirdparty/leolabs-dictionary.png`, `thirdparty/leolabs-data-overview.png`. Also in the directory
but not in the manifest: the full `other-*` set (22 files) covering history, dictionary, shortcuts,
microphone selection, appearance and interface language, all pulled from
`https://www.typeless.com/help/quickstart/*`.

**Routed to the overlay/brand agent:** `err-microphone-unavailable-alert` and
`err-dictation-limit-countdown` (toast + voice bar), `upd-menubar-check-for-updates` (menu-bar menu
and status icon), all `rn-rewrite-*` GIFs, `rn-v070-translation-speak`,
`rn-v090-personalization-trigger`, `rn-*-switch-target-lang-poster` (language chip above the voice
bar), `thirdparty/note-jp-09.png`, `thirdparty/note-jp-11.png`, `thirdparty/note-jp-13.png`
(Ask-anything answer panel), `thirdparty/note-jp-05.png` and `note-jp-07.png` (app icon, Dock icon,
menu-bar icon), and all `rn-v010-cover-*` / `rn-v070-cover` / `rn-voice-superpowers-cover` art.

## 9. Open questions

1. **Progress-bar semantics.** The fill is 45 % on the permissions screen and 39 % on the microphone
   test, which is backwards relative to flow order. Either the two renders come from different
   builds, or the fill tracks something other than step index.
2. **Empty states are entirely undocumented.** No empty History, empty Dictionary or first-run Home
   exists in any source.
3. **Dark theme.** The help centre documents a "Switch appearance" control, but every screenshot in
   every source is light. Dark-theme surfaces are unknown, apart from the toasts, which are dark in
   light mode already.
4. **Windows onboarding.** `/help/installation-and-setup` resolves to a macOS-only document; the
   sitemap contains no Windows setup page. The Windows onboarding window size (1354 × 940 in the
   microphone video) differs from the macOS 1080 × 750 pt.
5. **Whether onboarding is resizable**, and what it does at small widths, is unknown.
6. **The guided Dictate/Translate/Ask-anything examples** in step 4 — one scrolling screen or three
   screens — is unknown.
7. **In-app surfacing of a revoked permission** after onboarding is unknown; no banner or badge is
   visible in any asset.
8. **Product Hunt gallery** could not be fetched (JavaScript shell, 5.7 KB). Not retried per the
   two-attempt rule.
9. **Release notes for the entire 1.x line** were never published, so the transition from the v0.x
   bottom-left-gear layout to the v1.8 sidebar layout is undocumented.
