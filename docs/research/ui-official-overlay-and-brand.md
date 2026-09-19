# Official Typeless: floating voice bar, menu-bar presence, and brand tokens

Research date: 2026-09-18. This document covers two things only: (A) the official floating
voice bar (the "Voice bar") in every state visible in public material, plus the macOS
menu-bar status item, and (B) the brand and visual language. Application windows
(settings, history, dictionary) and onboarding are out of scope here.

Nothing was installed, no account was created, no binary was downloaded. All evidence comes
from public marketing pages, the public help center, the publicly embedded MP4
demonstrations, and the public iTunes lookup metadata endpoint.

## 1. Scope, evidence rules, and sources

### Evidence rules

Every statement below is tagged by how it was obtained.

- **Observed** — measured directly from a downloaded official file with `ffmpeg`, `ffprobe`,
  `sips` or a Pillow sampler. Pixel coordinates and hex values are recorded so the
  measurement can be repeated.
- **Inferred** — derived from an observed measurement by ratio, or read from letterforms and
  shapes rather than measured. Always labelled.
- **Not observable** — listed in section 7.

Two caveats apply to every number taken from the demonstration videos.

1. **The demos are zoom composites.** Within a single clip the virtual camera pushes in and
   pulls out, so the bar's absolute pixel size changes over time inside one file. Absolute
   pixels are therefore never comparable across clips or across timestamps.
2. **The demos are colour-crushed.** All five 1440x960 clips are H.264, `yuv420p`,
   `color_range=tv`. The bar's near-black fill decodes as `#000000` in extracted frames,
   while the same surface measures `#1C1A1B` in the lossless marketing renders. Where the
   two disagree, the marketing render is authoritative and the video value is given in
   parentheses.

To defeat the zoom problem, **every dimension in this document is normalised against the
bar's own height**, written `H`. `H` is the single stable unit. Section 2.1 explains why
`H = 48 pt` is the recommended absolute mapping and what remains unproven about it.

The blue speech-bubble captions, large key-cap graphics and cursor spotlights in the videos
are **demonstration annotations, not product UI**. They are excluded from all specs.

### Sources

Official pages and pre-existing local material:

| Source | URL |
| --- | --- |
| Home (hero renders, MUI theme, wordmark) | https://www.typeless.com/ |
| Downloads | https://www.typeless.com/downloads |
| Pricing | https://www.typeless.com/pricing |
| About | https://www.typeless.com/about |
| Data controls | https://www.typeless.com/data-controls |
| Help center index | https://www.typeless.com/help |
| Quickstart: Dictate | https://www.typeless.com/help/quickstart/dictate |
| Quickstart: Ask anything | https://www.typeless.com/help/quickstart/ask-anything |
| Quickstart: Translate | https://www.typeless.com/help/quickstart/translate |
| iOS app metadata (app icon) | https://itunes.apple.com/lookup?id=6749257650 |
| Static asset CDN | https://typeless-static.com/webpage/assets/ |

Official video files used for the state machine, all 30 fps unless noted:

| Clip | Size / duration | What it shows |
| --- | --- | --- |
| `desktop-dictate-polished-writing.mp4` | 1440x960, 6.524 s | Plain dictation, full lifecycle |
| `desktop-ask-about-selected-text.mp4` | 1440x960, 9.658 s | Ask mode over a selection, answer card |
| `desktop-edit-selected-text-with-voice.mp4` | 1440x960, 8.056 s | Ask mode, in-place replacement |
| `desktop-get-quick-answers.mp4` | 1440x960, 7.406 s | Ask mode, web search, answer card |
| `desktop-take-quick-web-actions.mp4` | 1440x960, 8.544 s | Ask mode, browser action |
| `macos-switch-between-target-languages.mp4` | 1920x1080, 14.400 s | Translate chip with language stepper |
| `macos-set-multiple-target-languages.mp4` | 1920x1080, 25 fps, 13.400 s | Settings flow; no new bar states |

The two highest-value still renders, both lossless and free of video compression:

- `hero_voice_alpha.png` (1352x518, alpha) — the **idle** bar at 331x147 px.
- `different_tones_for_each_app.png` (1240x800) — the **recording** bar at 330x96 px. This
  is the single most precise official image of the bar and is the basis of section 2.2.

Local derivatives live in `.local/research-ui/overlay-brand/`; `manifest.json` there maps
every local path to its source URL.

## 2. Overlay state machine

### 2.1 The unit system

The recording bar measures 330x96 px in `different_tones_for_each_app.png` and 161x47 px in
the dictate clip. Both give an aspect ratio of 3.44, and 330/161 = 2.05, so the marketing
render is a straightforward 2x export of the same layout. Dividing it by two yields a bar of
**165 x 48** with a 24 radius, 36 control circles on a 6 inset, and a waveform on a 6 pitch.
Every one of those falls on a whole or half point, which no other divisor produces.

Two independent clips then confirm the base. The "Thinking" capsule measures 127 px wide at
H = 47 in the dictate clip and 98 px wide at H = 36 in the quick-answers clip, filmed at a
different zoom. Normalised to H = 48 these give 129.7 and 130.7 — a 0.8% spread. The
normalisation is sound.

**Observed:** all ratios in this document. **Inferred:** that `H` equals 48 logical points
on screen. No public asset contains a calibration reference such as a macOS menu bar in the
same frame as the bar, so the absolute size is an informed recommendation, not a
measurement. A rebuilder who prefers a different `H` can scale every figure below by
`H / 48` and stay faithful to the original proportions.

### 2.2 State table

Ratios are given as multiples of `H`; the point column assumes `H = 48`.

| # | State | Width | Height | Evidence |
| --- | --- | --- | --- | --- |
| 0 | Hidden | — | — | dictate t < 1.233 s and t > 6.100 s |
| 1 | Entering | 2.68 H to 3.43 H | 0.83 H to 1.00 H | dictate 30 fps frames 39-45 |
| 2 | Recording, dictate | 3.44 H (165) | 1.00 H (48) | marketing render; dictate f_008-f_022 |
| 3 | Recording, Ask | 3.44 H (165) + chip | 1.00 H (48) | ask-selected f_010-f_019 |
| 4 | Recording, Translate | 4.08 H (196) + chip | 1.00 H (48) | lang-switch f_023-f_049 |
| 5 | Contracting | 2.23 H (107) at floor | 1.00 H (48) | dictate 30 fps frames 134-140 |
| 6 | Thinking | 2.71 H (130) | 1.00 H (48) | dictate f_025-f_031; quick-answers f_016-f_018 |
| 7 | Searching the web | 5.06 H (243) | 1.00 H (48) | quick-answers f_019-f_024 |
| 8 | Idle / resting | 2.25 H | 1.00 H | `hero_voice_alpha.png` only |
| 9 | Answer card | ~53% of frame width | ~76% of frame height | quick-answers f_025+; ask-selected f_031+ |
| 10 | Dismissed to app | — | — | web-actions f_026+ |

State 8 appears only in a marketing render, never in a video. State 10 is a web action: the
bar simply disappears and a browser page opens; there is no result overlay.

### 2.3 State 2 — Recording (the canonical bar)

Measured on `different_tones_for_each_app.png` at 2x, halved for the point column.

| Property | 2x px | Points | Ratio |
| --- | --- | --- | --- |
| Capsule | 330 x 96 | 165 x 48 | 3.44 H x H |
| Corner radius | 48 | 24 | 0.5 H, fully rounded |
| Fill | `#1C1A1B` | — | — |
| Content inset | 12.5 | 6.25 | 0.13 H |
| Control circle diameter | 71 | 35.5 | 0.74 H |
| Cancel circle fill | `#424242` | — | — |
| Confirm circle fill | `#FFFFFF` | — | — |
| Glyph stroke width | 6 | 3 | 0.0625 H |
| Waveform span | 114 | 57 | 1.19 H |

The corner profile confirms a true capsule rather than a large-radius rectangle. Measuring
the dictate frame at H = 47, the half-width deficit at depth `d` from the top edge runs
15.5, 12.0, 8.5, 5.5 px at d = 1, 3, 5, 8. The circle of radius 23.5 predicts 16.7, 12.0,
9.0, 5.8. The match is within one pixel at every depth.

Layout along the horizontal axis, left to right: 6.25 inset, a 35.5 cancel circle, free
space, the 57-wide waveform centred on the capsule's own centre, free space, a 35.5 confirm
circle, 6.25 inset. The waveform's centre and the capsule's centre coincide to within one
pixel in every frame examined.

The cancel glyph is a plain X of two 3-wide strokes at 45 degrees, white, on the `#424242`
circle. The confirm glyph is a check of two 3-wide strokes, `#1C1A1B`, on the white circle.
Both glyphs are optically centred in their circles. **Inferred:** the glyph box is roughly
14-16 pt inside the 35.5 circle, read from the crops rather than measured to the edge.

No border is visible on the recording capsule against the light backgrounds in the videos.
The idle render does carry a rim; see state 8.

**Shadow. Observed:** in the dictate frames the background lightens from `#DBE1E9` at 95 px
from the capsule to `#CAD0D4` at 2 px from it, and the band directly beneath the capsule
reads `#ACAEB2` against `#ADB4B9` further down. That is a soft, slightly downward-biased
ambient shadow of low opacity, a few points of blur. **Inferred:** it is close to the
website's own single custom shadow,
`0 4px 6px rgba(0,0,0,0.03), 0 12px 16px rgba(0,0,0,0.08), 0 1px 12px rgba(128,128,128,0.12)`,
which is the only non-default shadow in the site's CSS and appears 14 times.

### 2.4 State 3 — Recording in Ask mode

Identical capsule, plus two additions.

**The mode label chip**, measured in `ask-selected/f_014.png` and `edit-selected/f_012.png`,
which agree to the pixel:

| Property | px at H = 47 | Points at H = 48 | Ratio |
| --- | --- | --- | --- |
| Chip | 140 x 47 | 143 x 48 | 2.98 H x H |
| Corner radius | ~10 | ~10 | 0.21 H |
| Gap, chip bottom to capsule top | 12 | 12.3 | 0.26 H |
| Label text, ascender to descender | 17 | 17.4 | 0.36 H |
| Horizontal padding around label | 13 | 13.3 | 0.28 H |

The chip is horizontally centred on the capsule, not left-aligned with it. Its radius fits a
rounded rectangle, not a capsule: the half-width deficit at d = 1, 3, 5 is 5.0, 2.5, 1.0 px,
and a radius of 9-10 predicts 4.9, 2.3, 0.9.

Label text is "Ask anything", near-white, peak `#ECECE9`.

**The mode glow.** A single soft light source sits in the gap between the chip and the
capsule, on the horizontal centre line, at roughly y = 895-900 in the 1440-frame. It bleeds
upward into the chip's lower third and downward into the capsule's upper third, fading to
the base `#1C1A1B` elsewhere. In Ask mode it is a deep teal-green.

| Sample | Location | Value |
| --- | --- | --- |
| Peak, chip interior | (718, 887) | `#16735E` |
| Chip lower band | (719, 884) | `#16705B` |
| Peak, capsule interior | (711, 904) | `#0D4A3F` |
| Capsule, 14 px below its top | (700, 917) | `#031813` |
| Chip, away from the glow | (665, 855) | `#252223` |

The glow is present in all four Ask-mode clips.

### 2.5 State 4 — Recording in Translate mode

Same architecture, different colour and a richer chip. Measured in
`lang-switch/f_030.png`, a 1920x1080 clip where the capsule is 204 x 50.

| Property | px at H = 50 | Points at H = 48 |
| --- | --- | --- |
| Capsule | 204 x 50 | 196 x 48 |
| Chip | 379 x 60 | 364 x 58 |
| Gap, chip to capsule | 13 | 12.5 |
| Waveform bar pitch | 7.0 | 6.7 |

Two differences from Ask mode are real rather than measurement noise. The Translate capsule
is about 19% wider than the dictate capsule at the same height, because its waveform region
is wider. The Translate chip is about 20% taller than the capsule, because it contains a
nested control rather than plain text.

The chip reads `Translating to` in near-white (`#F2F2F7`) followed by a nested, lighter
rounded-rectangle button holding the target language ("German", "Japanese") and a
chevron-up-over-chevron-down stepper glyph on its right. Tapping it changes the target
without leaving the bar.

The glow is blue, not green: peak `#2A54DF` at (957, 892), with the capsule's top edge
reading `#162767` and decaying to `#050B19` about 16 px down. Peak blue sits within a few
percent of the site's own accent token `#1F5DF2`.

In plain dictate mode there is **no chip and no glow** — the capsule is neutral `#1C1A1B`
throughout. Mode colour is therefore the overlay's primary signal of what will happen when
the user finishes.

### 2.6 State 6 — Thinking, and state 7 — Searching the web

The controls vanish, the waveform vanishes, and the capsule becomes a text pill. Height is
unchanged at H; only the width animates.

| Label | Width | Normalised to H = 48 |
| --- | --- | --- |
| "Thinking", dictate clip | 127 px at H = 47 | 129.7 |
| "Thinking", quick-answers clip | 98 px at H = 36 | 130.7 |
| "Thinking", lang-switch clip | 162 px at H = 50 | 155.5 |
| "Searching the web", quick-answers | 182 px at H = 36 | 242.7 |

The capsule hugs its label. Taking 13.3 pt of horizontal padding per side from section 2.4,
"Thinking" leaves 103 pt for eight characters and "Searching the web" leaves 216 pt for
seventeen — a 2.10 ratio for a 2.13 character ratio. The width rule is therefore
`label width + 2 x 13 pt`, which also explains the lang-switch outlier: its clip renders the
same label at a slightly larger type size.

Status label colour, sampled in fully-lit frames, peaks at `#D3D3D3` to `#D8D8D8`. This is
noticeably dimmer than the mode-chip label at `#ECECE9`, a deliberate hierarchy: the chip
states intent, the status pill states progress.

**The processing animation is a wash, not a spinner.** In the extracted frames the capsule
is split by a vertical boundary. Left of it the fill reads `#343434`-`#3C3C3C` and the label
glyphs read `#86`-`#94`; right of it the fill reads `#000000` and the same glyphs read
`#5B`-`#6D`. Fill and text brighten together by roughly the same delta, which is the
signature of one translucent light overlay being revealed progressively rather than two
separately animated layers.

Boundary position over time in the dictate clip, sampled at 30 fps on the row above the text:

| t (s) | 4.633 | 4.700 | 4.767 | 4.900 | 5.033 | 5.167 | 5.300 | 5.500 | 5.700 | 5.833 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| boundary x | 677 | 691 | 701 | 721 | 737 | 756 | 761 | 764 | 768 | 772 |

The capsule spans x 657 to 783. The wash starts at its left edge, crosses about 75% of the
width in the first 530 ms, then decelerates asymptotically toward the right edge over the
next 700 ms. It had not restarted when the clip ended at 6.067 s. Accounting for the video's
black crush, the recommended values are a base of `#1C1A1B` and a washed fill near `#3A3A3A`
— that is, a white overlay at roughly 12% opacity.

### 2.7 State 8 — Idle / resting

Only in `hero_voice_alpha.png`, which is a lossless alpha render.

| Property | px | Ratio |
| --- | --- | --- |
| Capsule | 331 x 147 | 2.25 H x H |
| Radius | 73.5 | 0.5 H, fully rounded |
| Fill | `#1C1A1B` | — |
| Rim stroke | ~4 px, `#5D5D5D` to `#646464` | 0.027 H |
| Dots | 10, 3 wide x 10 tall | 0.020 H x 0.068 H |
| Dot pitch | 19.2 | 0.131 H |
| Dot colour | `#8A8788` | ~55% white |

This state is shorter and proportionally fatter than the recording bar (2.25 H versus
3.44 H) because it carries no controls. It is the only state with a visible rim: a
one-point-ish lighter stroke all round, the standard treatment for a dark floating surface
on a light desktop.

**Not observed:** whether this idle state ever appears in the shipping product. No video
shows it. It may be a marketing composition rather than a runtime state, and it should be
treated as optional.

### 2.8 State 9 — Answer card

Two variants were captured. Both are centred horizontally on the frame, sit roughly in the
vertical middle, use a white or near-white surface (`#FDFDFD` to `#FEFCFB`), a generous
corner radius and a soft drop shadow. In the quick-answers clip the card measures 758 px
wide in a 1440-wide frame, about 53%, and roughly 733 px tall, about 76%.

Structure, top to bottom, read from `ask-selected/f_040.png`:

1. **Title bar.** The Typeless mark plus the "Typeless" wordmark, bold, horizontally
   centred. A close X sits at the top-right corner. No other chrome.
2. **Input context block**, present only when the request had input. A microphone glyph and
   the spoken instruction in dark text ("Translate it into English."), then the captured
   selection quoted beneath it in grey, with a vertical rule down the left. A copy icon sits
   at the right of the block and a "...more" expander at its bottom-right.
3. **Answer panel.** A white rounded panel. Its header row carries a sparkle glyph and
   "Answer" in bold on the left, a copy icon on the right, then a hairline divider.
4. **Body.** Rich text with headings, bullets, bold runs and italics, generous line height,
   and a thin scrollbar on the right when the content overflows.

In the quick-answers clip only the Answer panel is present; the input context block is
omitted because nothing was selected.

### 2.9 State 10 — Dismissed to an application

In `desktop-take-quick-web-actions.mp4` the bar goes Recording, then Thinking, then
disappears at f_026, and the browser shows a YouTube results page. There is no confirmation
overlay, no result card, and no undo affordance anywhere in the frame.

### 2.10 Error, warning and permission states

**Not observed.** None of the seven clips, and none of the posters, shows a failure, a
retry, a permission prompt, an offline notice or any red or amber state in the bar. The help
center's missing-transcript article mentions recovering output from History after a card is
closed, but never shows the bar in an error state.

### 2.11 Transitions

All timings from `desktop-dictate-polished-writing.mp4` decoded at 30 fps, so the resolution
is 33 ms.

**Appear.** Nothing at t = 1.233; at t = 1.267 the capsule is present at 126 x 39, four
pixels lower than its final rest position.

| t (s) | 1.267 | 1.300 | 1.333 | 1.367 | 1.400 | 1.433 | 1.467 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| width | 126 | 141 | 149 | 155 | 159 | 159 | 160 |
| height | 39 | 39 | 42 | 45 | 46 | 46 | 47 |

Duration about 200 ms, first-frame scale about 0.79 x 0.83, and a 4 px upward settle. Width
deltas of 15, 8, 6, 4, 0, 1 are monotonically decreasing: a decelerating ease-out, with
a scale and a small upward translate running together.

**Recording to Thinking.** The controls disappear in a single frame, then the width springs.

| t (s) | 4.400 | 4.433 | 4.467 | 4.500 | 4.533 | 4.567 | 4.600 | 4.633 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| width | 160 | 118 | 105 | 105 | 107 | 115 | 124 | 126 |

Duration about 233 ms. The capsule contracts **past** its target to 105, which is 83% of the
126 resting width, holds for two frames, then expands back. Height is constant at 47
throughout. That is a spring with a visible undershoot, not an ease.

**Thinking wash.** See the table in section 2.6. About 1.2 s observed, decelerating, no
repeat within the clip.

**Dismiss.** Present at t = 6.067, gone at t = 6.100, with no intermediate frame at 30 fps.
Either an instant hide or a fade under 33 ms. The dictated text appears in the destination
document only after the bar is gone.

## 3. Waveform specification

Measured on `different_tones_for_each_app.png` at 2x, then confirmed across four dictate
frames and one lang-switch frame.

| Property | 2x px | Points | Ratio |
| --- | --- | --- | --- |
| Bar count | 10 | 10 | fixed |
| Bar width | 6 | 3 | 0.0625 H |
| Bar pitch | 12 | 6 | 0.125 H |
| Bar gap | 6 | 3 | 0.0625 H |
| Total span | 114 | 57 | 1.19 H |
| Minimum height | 6 | 3 | 0.0625 H |
| Maximum observed height | 60 | 30 | 0.625 H |
| Colour | `#FFFFFF` | — | — |

The bar count is 10 in every state and every clip examined: the marketing render, the four
dictate frames, and the lang-switch frame. It does not scroll horizontally and it does not
change count with speech.

**Geometry.** Bars are vertically centred on the capsule's centre line and grow symmetrically
up and down. In the dictate clip every bar's centre sits at y = 925 while the capsule spans
y 902-948, centre 925. At minimum height a bar equals its own width, so it renders as a
circular dot; the caps are rounded, giving a lozenge at intermediate heights. The gap equals
the bar width, so the duty cycle is exactly 50%.

**Envelope.** Heights sampled across the ten positions in one frame:

| Source | Heights, left to right |
| --- | --- |
| Marketing render (2x) | 6, 6, 18, 24, 18, 36, 60, 24, 12, 6 |
| dictate f_010 | 7, 9, 13, 13, 18, 17, 15, 11, 9, 7 |
| dictate f_012 | 5, 7, 15, 18, 21, 21, 19, 11, 9, 5 |
| dictate f_016 | 7, 9, 13, 17, 19, 19, 14, 13, 9, 5 |
| dictate f_020 | 5, 9, 9, 9, 13, 13, 11, 11, 9, 5 |

The interior bars track the signal, but the **first and last positions sit at or within one
pixel of the minimum in every frame examined**, and the second and ninth are close behind.
**Inferred:** a symmetric window function, or equivalently a fade mask at both ends, is
applied over the level data. Without that mask the outermost bars would occasionally exceed
their neighbours, and they never do.

**Idle shape.** Two different resting forms appear. Inside the recording capsule, when the
level is near zero, all ten bars collapse to the minimum dot and the row reads as ten evenly
spaced dots at pitch 0.125 H — visible in the lang-switch and dictate entry frames. In the
standalone idle render the dots are smaller relative to the bar (0.020 H wide against
0.0625 H) and much further apart (0.131 H pitch against 0.125 H at a 2.25 H bar width), and
they are grey `#8A8788` rather than white. The recording capsule's collapsed state, not the
hero render, is the one confirmed by video.

## 4. Menu bar and tray

Source: `menubar-menu-check-for-updates.png`, 2684x1132, from the help center.

**The status item** is the Typeless symbol alone — the two-crescent sound-wave mark, no
wordmark, no badge. It is rendered as a monochrome macOS template image: solid white against
the blue desktop wallpaper in this capture, which means it inverts with the menu bar's
appearance rather than carrying its own colour. While the menu is open the item sits on the
standard rounded-rectangle selection highlight. No recording indicator, count, or coloured
state is visible on the item in any public image.

**The dropdown**, in order, with separators marked:

```
Give feedback
---
Open Typeless home
Show history
Add word to dictionary
---
Settings...                    ⌘,
Select microphone              ▸
---
Version 1.8.0                  (disabled)
Check for updates...
Quit Typeless                  ⌘Q
```

"Select microphone" is a submenu. "Version 1.8.0" is a disabled informational row, not an
action. The menu uses stock macOS vibrancy and metrics; nothing about it is custom.

**Not observed:** any keyboard-shortcut hint rendered near the floating bar. The desktop
clips show the shortcut only as an oversized key-cap **annotation** composited over the
video, which is presentation, not UI. The one in-product hint text found anywhere is "Tap
again to finish" in `platform.webp`, and it belongs to the **iOS** keyboard control, not to
the desktop bar.

## 5. Brand tokens

### 5.1 Logo

The site ships **no standalone SVG**. The wordmark exists only as an inline SVG in the page
header, extracted here to `brand/typeless_wordmark_369x81.svg`: `viewBox="0 0 369 81"`, nine
paths, every one `fill="currentColor"`. It is rendered at 36 px tall with `color: #000`.
Pure monochrome, no gradient, no stroke, no second colour.

**The symbol** is two solid crescents arranged as an expanding sound wave. A large, thin
outer crescent arcs from upper-left to lower-right, wrapping like a thickened closing
parenthesis rotated about 45 degrees. Inside it sits a smaller, fatter wedge-shaped crescent.
The whitespace between them forms a second implied wave. It reads as sound radiating outward,
and secondarily as an abstract D or echo glyph.

**The wordmark** sets "Typeless" to the right of the symbol in a geometric sans with
near-uniform stroke width and flat terminals, visually around Bold / 700. The `y` has a
straight descender, the `e` a horizontal bar, and the `s` a wide aperture.

Files: `brand/typeless_wordmark_369x81.svg`, `brand/typeless_mark_only.svg` (extracted
locally from the ninth path, not an official file), `brand/logo_500.png` (500x500, the site's
`mask-icon`), `brand/logo_152_apple_touch.png` with 120, 76 and 60 px siblings,
`brand/favicon.ico` (48x48 container holding 16 and 32).

### 5.2 App icon

`brand/appstore_icon_1024.png`, 1024x1024, from the public iTunes lookup for app id
6749257650 — "Typeless: AI Voice Keyboard", seller Simply LLC, seller URL typeless.com, so
this is official.

The background is a near-white vertical gradient: `#FFFFFF` at the top through `#F5F5F5` in
the middle to `#ECECEC` at the bottom, with a faint central lift. The foreground is the same
two-crescent mark, rendered as **thick matte black plastic with real depth**: body around
`#1C1A1B` to `#211E1E`, lit faces rising to about `#424040`, soft bevel highlights along the
edges and a light inner shadow. The background shows through the gap between the crescents.
The squircle is Apple's system mask, not baked into the art. No colour anywhere.

This is the **iOS** icon. Typeless for macOS is distributed from its own site rather than the
Mac App Store, so the macOS `.icns` has no public URL. The menu-bar template glyph is the
only public evidence of the macOS mark's form.

### 5.3 Colour palette

Extracted from the site's MUI theme module, so these are the product's own declared tokens
rather than sampled approximations.

| Role | Hex | Token / where |
| --- | --- | --- |
| Primary surface, the bar's fill | `#1D1A1A` | `custom.primary`; the bar samples `#1C1A1B` |
| Primary hover | `#4D4D4D` | contained button hover |
| Accent | `#1F5DF2` | `custom.premium`; Upgrade button, mic level meter |
| Accent hover | `#1D53D2` | premium button hover |
| Text primary | `#111111` | `text.primary` |
| Text secondary | `#111111` at 75% | `text.secondary` |
| Text tertiary | `#111111` at 50% | `text.tertiary` |
| Background | `#FFFFFF` | `background.default` and `paper` |
| Background secondary | `#F4F4F4` | `background.secondary`; `#F5F5F5` on page |
| Border | `rgba(0,0,0,0.12)` | `border.main`, 37 occurrences |
| Border light | `rgba(119,119,119,0.15)` | `border.secondary`, scrollbars |
| Border hover | `rgba(119,119,119,0.3)` | `border.hover` |
| Hover fill | `rgba(0,0,0,0.04)` | `hover` |
| Selected fill | `rgba(0,0,0,0.08)` | `selected.main` |
| Error | `#EC0F38` | `Mui-error` |
| Dark background | `#202124` | dark mode `background.default` |
| Dark paper | `#2C2C2C` | dark mode `background.paper` |

Overlay-specific values, measured rather than declared:

| Role | Hex | Source |
| --- | --- | --- |
| Capsule fill | `#1C1A1B` | both lossless renders |
| Capsule rim, idle only | `#5D5D5D` to `#646464` | `hero_voice_alpha.png` |
| Cancel button fill | `#424242` | marketing render (`#373737` in video) |
| Confirm button fill | `#FFFFFF` | both |
| Waveform | `#FFFFFF` | both |
| Idle dots | `#8A8788` | `hero_voice_alpha.png` |
| Washed fill, Thinking | ~`#3A3A3A` | dictate 30 fps, crush-corrected |
| Status label | `#D3D3D3` to `#D8D8D8` | dictate, quick-answers |
| Mode chip label | `#ECECE9` to `#F2F2F7` | ask-selected, lang-switch |
| Ask mode glow | `#16735E` peak | ask-selected f_014 at (718, 887) |
| Translate mode glow | `#2A54DF` peak | lang-switch f_030 at (957, 892) |

The whole system is achromatic — near-black, white, and a narrow grey ramp — with exactly
one accent, the blue `#1F5DF2`. Colour in the overlay carries one meaning only: which mode
will run. Green means Ask, blue means Translate, no colour means plain dictation.

### 5.4 Typography

Two self-hosted families, both as woff2 under `/_next/static/media/`.

- **Inter** at 300 / 400 / 500 / 700. The body face, in 187 declarations, all `!important`:
  `'Inter', sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue`.
- **Prompt** at 400 / 500 / 600 / 700. Display only, two declarations: the hero headline at
  96 px / 100 px line height / weight 600 / centred, and one centred label at weight 500.

Size frequency: 16 px (221), 1 rem (132), 14 px (106), 20 px (94), 1.5 rem (92), 18 px (59),
then 24, 30, 48, 72. Weight frequency: 400 (212), 500 (68), 600 (47), 700 (18), 300 (9).
Component overrides set body copy to 16 px, buttons to 14 px with `text-transform: none`, and
icons to 20 px. Letter-spacing: 0.00938 em body, 0.02857 em buttons, -0.01562 em h1.
Breakpoints 320 / 768 / 1024 / 1280 / 1440, spacing unit 8.

**For the overlay itself, this is inferred, not observed.** The bar is a native macOS surface
and its labels read as the system UI face, SF Pro, rather than Inter. The two are metrically
close enough that the video frames cannot separate them. The measurable facts are the ratios:
the chip label spans 0.36 H from ascender to descender, sits in 0.28 H of horizontal padding,
and runs at a regular weight. At H = 48 that puts the label near 17-19 pt.

### 5.5 Radius and shadow language

Theme base `shape.borderRadius: 8`. Frequency across rendered CSS: 8 px (94), 0 (60), 50%
(28), the MUI pill sentinels 79992 px and 7992 px (20 each), 24 px (13), 32 px (12), 9999 px
(6), 12 px (5), 16 px (5), `32px 32px 0 0` (5), `24px 24px 0 0` (4), 20 px, 999 px.

The site's main call to action uses `borderRadius: 999px` with 1.5 units of vertical padding.
That pill instinct carries straight into the product: the voice bar is a full capsule, the
mode chip is a 0.21 H rounded rectangle, and both control buttons are perfect circles.

One custom shadow exists, used 14 times, and everything else is the MUI default ramp:

```css
box-shadow:
  0px 4px 6px rgba(0, 0, 0, 0.03),
  0px 12px 16px rgba(0, 0, 0, 0.08),
  0px 1px 12px rgba(128, 128, 128, 0.12);
```

Three stacked layers, all very low opacity, the middle one carrying most of the weight with a
downward bias. This matches the soft halo measured around the floating bar in section 2.3.

### 5.6 Motion language

Everything below is measured from the dictate clip at 33 ms resolution.

| Transition | Duration | Curve |
| --- | --- | --- |
| Appear | ~200 ms | ease-out, scale 0.8 to 1.0 plus a small upward translate |
| Recording to Thinking | ~233 ms | spring, undershoots to 83% of target, then settles |
| Thinking wash | ~1.2 s per pass | strongly decelerating, no repeat observed |
| Dismiss | under 33 ms | instant or a sub-frame fade |

The vocabulary is consistent and narrow: **width is the only dimension that animates between
states.** Height never changes once the bar has appeared. Nothing rotates, nothing spins,
nothing pulses. Processing is communicated by a light wash travelling across a surface rather
than by a conventional spinner or progress bar. Entry is soft and decelerating; exit is
abrupt, which keeps the destination application visible the instant the work is done.

### 5.7 Illustration style

Home-page and help-center imagery uses soft, cool, out-of-focus gradient backdrops — pale
blue-grey `#D4E3F5` to `#F2F7FA` — with real application icons (Slack, Gmail, WhatsApp) as
literal collage elements, joined by thin grey dashed connector lines. Speech is drawn as
white rounded speech bubbles with a small tail. A muted mint `#7DCEB9` marks positive
automatic actions. There is no line-art mascot, no isometric scene, and no abstract
3D geometry. Product screenshots are shown in unembellished floating windows with rounded
corners and a soft shadow, never in a device frame with a bezel.

## 6. Asset manifest

The machine-readable version is `.local/research-ui/overlay-brand/manifest.json`. Summary:

| Local path (under `.local/research-ui/overlay-brand/`) | Source | Contents |
| --- | --- | --- |
| `dictate-polished/f_*.png` | `.../quickstart/desktop-dictate-polished-writing.mp4` | 33 frames at 5 fps, full dictate lifecycle |
| `dictate30/g_*.png` | same clip | 195 frames at 30 fps, transition timing |
| `ask-selected/f_*.png` | `.../quickstart/desktop-ask-about-selected-text.mp4` | 48 frames, Ask chip, green glow, answer card |
| `edit-selected/f_*.png` | `.../quickstart/desktop-edit-selected-text-with-voice.mp4` | 40 frames, Ask chip, in-place replacement |
| `quick-answers/f_*.png` | `.../quickstart/desktop-get-quick-answers.mp4` | 37 frames, Thinking, Searching the web, card |
| `web-actions/f_*.png` | `.../quickstart/desktop-take-quick-web-actions.mp4` | 43 frames, dismissal to browser |
| `lang-switch/f_*.png` | `.../release-notes/desktop/macos-switch-between-target-languages.mp4` | 72 frames, Translate chip, blue glow |
| `lang-multi/f_*.png` | `.../release-notes/desktop/macos-set-multiple-target-languages.mp4` | 67 frames, settings flow |
| `crops/dict_*.png` | derived | 5x upscales of entry, recording, contraction, wash |
| `crops/qa_*.png`, `crops/wa_*.png`, `crops/as_*.png`, `crops/es_*.png` | derived | 4-6x upscales of Ask-mode states |
| `crops/ls_*.png` | derived | 3x upscales of Translate chip and stepper |
| `crops/menubar_icon.png` | derived | 4x upscale of the status item |
| `brand/typeless_wordmark_369x81.svg` | inline SVG in `https://www.typeless.com/` | Full lockup, 9 paths, `currentColor` |
| `brand/typeless_mark_only.svg` | derived locally | Symbol only, extracted path |
| `brand/logo_500.png` | `https://www.typeless.com/logo_500.png` | 500x500 mask icon |
| `brand/logo_{152,120,76,60}_apple_touch.png` | `rel=apple-touch-icon` | Touch icons |
| `brand/favicon.ico` | `https://www.typeless.com/favicon.ico` | 48x48, holds 16 and 32 |
| `brand/og_social_1200x630.png` | `https://www.typeless.com/social.png` | og:image, wordmark plus tagline |
| `brand/og_social_1080_square.png` | `https://www.typeless.com/social-1080.png` | Square social card |
| `brand/appstore_icon_1024.png` | iTunes lookup id 6749257650, `artworkUrl512` upscaled path | 1024x1024 iOS app icon |
| `brand/screenshots/hero_voice_alpha.png` | `https://typeless-static.com/webpage/assets/` | Idle bar, 331x147, lossless alpha |
| `brand/screenshots/different_tones_for_each_app.png` | `https://typeless-static.com/webpage/assets/` | Recording bar, 330x96, lossless |
| `brand/screenshots/platform.webp` | `https://typeless-static.com/webpage/assets/` | Mac bar beside the iOS control |
| `brand/macos_ui/menubar-menu-check-for-updates.png` | `https://typeless-static.com/webpage/assets/help-center/` | Status item and full dropdown |
| `brand/macos_ui/macos-typeless-across-apps-and-websites.png` | same prefix | Main window, Upgrade button `#1F5DF3` |
| `brand/macos_ui/macos-test-microphone-success.png` | same prefix | Level meter, `#1E5CF2` on `#D9D9D9` |
| `brand/all_inline_styles.css` | rendered styles of `https://www.typeless.com/` | Source of radius and shadow counts |
| `brand/js/` | `https://www.typeless.com/_next/static/chunks/` | MUI theme module with colour tokens |
| `sample.py`, `wave.py` | written here | Pillow colour sampler and waveform measurer |

Official social accounts found in the site HTML, not scraped: X `@typelessdotcom`, LinkedIn
company 107872201, YouTube `@typelessdotcom`, Instagram `@typelessdotcom`, TikTok
`@typelesshq`. Third-party, recorded but not used as evidence: the Product Hunt listing at
`https://www.producthunt.com/products/typeless-2`.

## 7. Open questions and what is not observable

**Sizing and placement**

1. The bar's absolute size in logical points. `H = 48` is a well-supported inference, not a
   measurement; no public asset places the bar in the same frame as a calibration reference.
2. The true offset from the bottom of the screen. Observed gaps are 0.23 to 0.28 H below the
   bar, but every clip is a zoom composite and at least one anchors the bar to an application
   window's lower edge rather than the display's. The real inset is unknown.
3. Behaviour on multiple displays, in full-screen Spaces, or with the Dock visible. Never
   shown.
4. Whether the bar is draggable or user-positionable. Never shown.

**States never demonstrated**

5. Any error, warning, retry, offline or permission-denied appearance. No red or amber state
   exists in any public asset.
6. Whether the idle state of section 2.7 ships at all, or is marketing-only.
7. What the cancel X actually does, and whether cancellation is confirmed to the user.
8. What happens if focus changes, the target window closes, or the selection changes during
   processing.
9. Any hover, pressed or focus-ring treatment on the two control buttons.
10. Whether the bar is keyboard-navigable and what its accessibility labels are.

**Animation details**

11. Whether the Thinking wash loops. It ran once over 1.2 s and the clip ended before any
    repeat. Its period and reset behaviour are unknown.
12. Whether the dismissal is an instant hide or a fade shorter than 33 ms.
13. The exact easing functions. Only the sampled shapes are known: decelerating on entry,
    undershooting spring on the state change.
14. The waveform's update rate and its mapping from audio level to bar height. The end-taper
    is observed; its precise window function is not.

**Brand assets**

15. No `.svg` and no `.icns` is published. The macOS application icon has no public URL; only
    the iOS icon and the monochrome menu-bar template glyph are available.
16. The site's largest published bitmap is 500x500. The 1024x1024 icon comes from the App
    Store and is the mobile artwork.
17. There is no `site.webmanifest` or `manifest.json`; both return 404.
18. The typeface used in the native overlay is inferred from letterforms as the macOS system
    face, not confirmed. The site's Inter is metrically close enough that video frames cannot
    distinguish them.
19. Product Hunt gallery images resolve only to UUID placeholders and were not retrieved. No
    third-party screenshot was used as evidence for any measurement above.
