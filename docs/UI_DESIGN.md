# UI redesign specification

Date: 2026-09-18. Status: **frozen implementation contract** for the 2.0.0 interface overhaul. This document supersedes the visual and navigation rules in [PROPOSAL.md](PROPOSAL.md) for the renderer; behavior, IPC contracts, provider logic and delivery semantics are unchanged.

Evidence: official Typeless 2.0.0 help-center screenshots and demo videos catalogued in [ui-official-app-windows.md](research/ui-official-app-windows.md), [ui-official-overlay-and-brand.md](research/ui-official-overlay-and-brand.md) and [ui-official-onboarding-and-changelog.md](research/ui-official-onboarding-and-changelog.md). Sampled colors come from those assets. Where this project deliberately departs from the official product, the departure is stated.

## 1. Goals and non-goals

Goals

- Replace the current single-column tabbed window with the official Typeless desktop shell: light sidebar with pill-selected navigation, large page titles, grouped setting rows with a left label/description and a right-aligned control, blue switches, bordered dropdowns, key chips, black pill primary buttons, gray information cards, and a black floating voice capsule.
- Keep every existing capability, action, setting, error route and accessibility hook. This is a re-skin plus an information-architecture change, not a feature change.
- Chinese UI copy stays and is the default; every string also exists in English in the message catalogue (`src/renderer/i18n/messages/`), and the language switch is specified in section 14. Existing copy is kept unless this document specifies new copy.

Non-goals

- No account, history archive, dictionary, translation, Ask-anything, personalization report, cloud sync, or dark mode. Do not add disabled placeholders for them.
- No new `AppAction` types, IPC channels, settings fields or provider behavior. `src/shared/contracts.ts`, `src/core/`, `electron/controller.ts`, `electron/preload.ts` and `electron/native-client.ts` are out of scope.
- No copying of the Typeless logo mark, brand illustrations or fonts as files. Layout, proportions, color roles and component styling are copied; the logo is replaced by a lucide `AudioWaveform` glyph.

## 2. Information architecture

The main window becomes a two-column shell.

```
┌──────────────┬────────────────────────────────────────────────┐
│ ● ● ●        │                                                │
│ ⌇ Typeless   │  Page title                                     │
│              │  Page subtitle                                  │
│ ▣ 首页        │                                                │
│ ✦ AI 配置     │  … page content …                               │
│ ⚙ 基本设置    │                                                │
│ ✎ 表达风格    │                                                │
│              │                                                │
│              │                                                │
│ [Fn · 已就绪] │                                   版本 2.0.0    │
└──────────────┴────────────────────────────────────────────────┘
```

Destinations (in this order, since section 13): `home` 首页, `ai` AI 配置, `basic` 基本设置; 表达风格 lives inside AI 配置. All three render inside the content column; there is no modal settings sheet (official Typeless uses one; this project keeps settings as pages because the whole product is configuration). The `Page` type lives in `src/renderer/settings/types.ts`.

Initial page: the first-run setup guide (section 12) while `settings.general.setupCompleted` is `false`; afterwards `ai` when no speech key is saved, else `home`. Recovery links (`recoverySettings`) and the unconfigured primary action navigate to `ai` or `basic` exactly as today. Because the recovery alert lives on 首页, the shell switches to `home` whenever a dictation session newly enters the `error` state, so clicking the recovery capsule (which only shows the window) always lands on the alert.

Sidebar semantics: `<nav aria-label="主导航">` containing a `role="tablist"` with four `role="tab"` buttons (`id="settings-tab-<page>"`, `aria-selected`, `aria-controls="settings-panel-<page>"`, arrow/Home/End keyboard navigation as the current tabs). Each page is a `role="tabpanel"` with `id="settings-panel-<page>"` and `aria-labelledby`; only the active panel is rendered (not hidden panels), so `getByRole('tabpanel')` counts one.

## 3. Window and frame

- `electron/main.ts`: main window `width: 1000, height: 750, minWidth: 880, minHeight: 600`, `backgroundColor: '#fdfdfd'` (official window is 1000 × 750 pt). On macOS add `titleBarStyle: 'hiddenInset'` and `trafficLightPosition: { x: 18, y: 18 }` so the traffic lights sit in the sidebar like the official app. Windows keeps the default frame.
- Sidebar header area is a drag region (`-webkit-app-region: drag`; interactive children `no-drag`). On macOS the sidebar gets `padding-top: 56px` (traffic lights at 18,18 with 20px pitch); on Windows `16px`. Platform comes from `snapshot.platform`; set `data-platform` on `<body>`.
- Content column scrolls independently; the sidebar is fixed height.

## 4. Design tokens

Defined once in `src/renderer/styles/tokens.css` on `:root`. Values are measured from undimmed official assets (see research section 3). Implementers must use tokens, never raw values, except for one-off geometry.

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#fdfdfd` | content background (the app never uses pure white chrome) |
| `--bg-sidebar` | `#f6f6f6` | sidebar |
| `--bg-card-muted` | `#f6f6f6` | gray information cards on the content background |
| `--bg-muted` | `#efefef` | segmented control track, tinted buttons |
| `--bg-icon-hover` | `#f0f0f0` | icon button hover, circular icon buttons |
| `--bg-selected` | `#e4e4e4` | selected sidebar item |
| `--bg-hover` | `#ededed` | sidebar item hover |
| `--bg-option-selected` | `#e9e9e9` | selected option card / current menu row |
| `--line` | `#f0f0f0` | hairline dividers, card borders (felt, not seen) |
| `--line-strong` | `#e4e4e4` | input, select, chip and secondary button borders |
| `--line-hover` | `#d4d4d4` | input hover border |
| `--line-focus` | `#1a1819` | focused input border (2px), selected option card border (1.5px) |
| `--text` | `#111111` | primary text |
| `--text-secondary` | `#6b6b6b` | descriptions, subtitles, section header labels, icons |
| `--text-tertiary` | `#9a9a9a` | captions, timestamps, placeholders |
| `--text-inverse` | `#ffffff` | text on ink |
| `--ink` | `#1a1819` | primary button, voice capsule, toast, tooltip |
| `--ink-hover` | `#2e2c2d` | primary button hover |
| `--accent` | `#1c5dee` | switch on, level meter |
| `--accent-text` | `#4c7cff` | accent text links and badges |
| `--accent-soft` | `#e8effd` | accent badge background |
| `--ok` | `#00866f` | ready / granted status |
| `--ok-soft` | `#e3f4f0` | ok badge background |
| `--warn` | `#ff5700` | needs attention status |
| `--warn-soft` | `#fff0e8` | warn badge background |
| `--danger` | `#eb0f36` | destructive text on hover |
| `--mint` | `#81d0ba` | four-point sparkle tint (polishing) |
| `--switch-off` | `#e4e4e4` | switch track off (not observed; interpolated) |
| `--radius-xs` | `6px` | icon button hover square |
| `--radius-sm` | `8px` | inputs, selects, key chips, nav pill |
| `--radius-md` | `10px` | option cards, popovers, small cards |
| `--radius-lg` | `12px` | cards, info cards |
| `--radius-xl` | `16px` | hero dictation card, toast |
| `--radius-pill` | `999px` | every button, segmented control, badges, voice capsule |
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,.05)` | segmented thumb |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,.07)` | raised card, popover |
| `--shadow-lg` | `0 10px 32px rgba(0,0,0,.16)` | toast, dialogs |
| `--shadow-capsule` | `0 6px 20px rgba(0,0,0,.28)` | voice capsule |
| `--font` | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Inter, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif` | everything (official face is a geometric sans; not bundled, see non-goals) |
| `--font-mono` | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | model ids only; key chips use `--font` |
| `--fs-hero` | `52px`, weight 700, letter-spacing `-0.03em`, line-height 1.05 | home hero title |
| `--fs-section` | `20px`, weight 600 | Home section heading ("配置概览") |
| `--fs-card-title` | `17px`, weight 600 | Home card titles |
| `--home-bg` / `--home-dot` / `--home-glow` | `#f5f7f9` / `#e2e6ea` / `rgba(214,224,255,.55)` | Home-only dotted backdrop |
| `--gradient-card-a` / `--gradient-card-b` | `linear-gradient(180deg,#edf3f8,#eef7fb)` / `linear-gradient(180deg,#e9ecf4,#f3f5fa)` | pale gradient link cards |
| `--fs-title` | `35px`, weight 700, letter-spacing `-0.02em`, line-height 1.15 | page title |
| `--fs-heading` | `15px`, weight 600 | section header label (in `--text-secondary`), setting row label, card title |
| `--fs-nav` | `14px`, weight 500 | sidebar labels, buttons |
| `--fs-body` | `13px`, weight 400, line-height 1.5 | body, descriptions, controls |
| `--fs-group-label` | `12px`, weight 600 | small group labels ("今天"-style), segmented labels use 13px medium |
| `--fs-caption` | `11px` | captions, version, timestamps |
| `--sidebar-w` | `200px` | fixed sidebar width |
| `--sidebar-pad` | `12px` | sidebar side gutter |
| `--content-pad-x` / `--content-pad-y` | `24px` / `36px` | content padding |
| `--content-max` | `880px` | max width of page content |
| `--control-h` | `32px` | inputs, selects, buttons, key chip frames |
| `--control-w` | `320px` | right-column control width in setting rows |
| `--nav-h` | `35px` | sidebar nav row height (4px gap between rows) |
| `--ease` | `cubic-bezier(.2,.8,.2,1)` | all transitions |
| `--dur-fast` / `--dur` / `--dur-slow` | `120ms` / `180ms` / `260ms` | hover, page/state change, capsule morph |

Reduced motion: every animation and transition is disabled under `prefers-reduced-motion: reduce`.

## 5. Shared primitives (`src/renderer/ui.tsx`, owned by the lead)

Implementers consume these; do not fork them. Signatures:

```ts
Field({ label, hint?, children })                 // legacy vertical field; kept for the textarea
PageHeader({ title, subtitle?, actions? })          // <header class="page-header">
SectionGroup({ icon, title, description?, children })  // <section class="group"> with icon+title header and divider
SettingRow({ label, description?, htmlFor?, control, status?, stacked?, inline?, className? })
  // grid row: left = <label for> (or span) + description; right = control; status renders under the control;
  // inline=true lays the control column out horizontally (badge + button), stacked=true uses one column
Card({ children, className?, tone?: 'plain' | 'muted' | 'raised' })
Segmented({ options: { value, label }[], value, onChange, ariaLabel, disabled? })
  // role="group" aria-label; buttons carry aria-pressed
KeyChips({ binding, mac, framed?, size? })           // <span class="keychips"> of <kbd> parts via shortcutLabel; size='keycap' = white 36px keycaps with ink outline
StatusBadge({ tone: 'ok' | 'warn' | 'muted' | 'accent', children })
Busy(), Wave({ level, active }), clockText(), sessionLabels
```

Their CSS lives in `src/renderer/styles/base.css` (also lead-owned): resets, typography, native `input`/`select`/`textarea`/`button` skins, `input[role=switch]`, `.primary`, `.secondary`, `.text-button`, `.icon-button`, `kbd`, `.badge`, `.card`, `.group`, `.setting-row`, `.segmented`, `.page-header`, `.toast`, `.save-status`, `.field`, `.wave`, `.spin`, focus rings, reduced motion.

## 6. Component specifications

Sidebar item: height `--nav-h` (35px), 4px gap between rows, radius `--radius-sm`, padding 0 10px, icon 20px stroke 1.5 in `--text-secondary` + label `--fs-nav` (14px/500) in `--text`, gap 10px. Hover `--bg-hover`; selected `--bg-selected` with icon and label in `--text` (weight stays 500; official does not embolden). Focus ring 2px `--text` offset 2px. Sidebar gutters are `--sidebar-pad` (12px).

Brand row: icon `AudioWaveform` 22px stroke 2 in `--text` + "Typeless" 21px/700 letter-spacing -0.01em; row height 32px, padding-left 10px; 24px above the nav list.

Sidebar footer card (bottom-anchored, 12px above the bottom edge): a white `button.card` (bg `--bg`, radius `--radius-md`, padding 12px 14px, hairline border `--line`) navigating to `basic`: first line "听写快捷键" `--fs-caption` `--text-tertiary`, second line `KeyChips` of the effective shortcut + `StatusBadge` (ok "已就绪" / warn "不可用" / muted "已关闭"). Nothing else in the sidebar; version text lives in the content column.

Page header: title `--fs-title`; subtitle `--fs-body` `--text-secondary` max-width 620px, 8px below title; header margin-bottom 24px; optional right-aligned actions (pill buttons).

Group: header row (icon 20px stroke 1.5 `--text-secondary`, label `--fs-heading` in `--text-secondary`, gap 8px), 1px `--line` divider 12px below, rows below; groups separated by 32px. Description under header optional (`--fs-body`).

Setting row: `display:grid; grid-template-columns: minmax(0,1fr) var(--control-w); gap: 8px 32px; align-items: start; padding: 16px 0;` no divider between rows (official uses spacing only); label `--fs-heading` in `--text`; description `--fs-body` `--text-secondary` 4px below, max-width 60%; control column right-aligned and top-aligned with the label (`justify-self:end; width:100%`); status text under control 8px `--fs-body`. `stacked` variant (textarea, option cards) uses one column. Rows stack only below a 900px window width (`@media (max-width: 900px)` in base.css; page stylesheets mirror the same breakpoint), so the default 1000 × 750 window always shows two columns.

Inputs and selects: height `--control-h` (32px), padding 0 12px, border 1px `--line-strong`, radius `--radius-sm`, bg `--bg`, font `--fs-body`; placeholder `--text-tertiary`; hover border `--line-hover`; focus: border `--line-focus` rendered 2px via `box-shadow: inset 0 0 0 1px var(--line-focus)` (no colored ring, official style); disabled opacity .55. Selects stay native `<select>` (tests use `selectOption`), styled with `appearance:none` and an inline SVG chevron 16px at right 10px, padding-right 36px. Textarea: padding 12px 14px, min-height 160px, line-height 1.6, radius `--radius-md`.

Switch: 32×20 (official 30×19), track off `--switch-off`, on `--accent`; knob 16px white with `0 1px 2px rgba(0,0,0,.2)`, travel 12px, `--dur-fast`. Disabled opacity .5.

Buttons are always pills (radius `--radius-pill`), height `--control-h` (32px), label `--fs-nav` (14px/500), padding 0 16px. `.primary`: bg `--ink`, text white, hover `--ink-hover`; disabled = bg `--bg-selected` and text `--text-tertiary` (no opacity). `.secondary` (default `button`): bg `--bg`, 1px `--line-strong`, hover `--bg-muted`. `.tinted`: bg `--bg-muted`, no border. `.text-button`: no container, 14px/500 `--text`, underline on hover only; `.danger-text` turns `--danger` on hover. `.icon-button`: 28×28 hit area, 20px glyph, transparent, hover paints `--bg-icon-hover` with radius `--radius-xs`; `.icon-button.round` is 40px circular `--bg-icon-hover`. `.small` = height 28px, 13px.

Key chips (`kbd`): height 26px, padding 0 8px, border 1px `--line-strong`, radius `--radius-sm`, bg `--bg`, `--font` 13px/500, color `--text`, chips in a `.keychips` flex with 6px gap. A chip group may be wrapped in `.keychips-frame` (border 1px `--line-strong`, radius `--radius-sm`, padding 3px 4px) when shown as a standalone control.

Segmented control: track bg `--bg-muted`, radius pill, padding 4px, inline-flex; items height 32px (40px track), padding 0 14px, radius pill, 13px/500 `--text-secondary`, content-sized (not equal widths); selected bg `--bg`, color `--text`, `--shadow-sm`; transition `--dur-fast`.

Cards: `.card` bg `--bg`, 1px `--line`, radius `--radius-lg`, padding 16px 20px; `.card.muted` bg `--bg-card-muted`, no border; `.card.raised` bg `--bg` with `--shadow-md`, hairline border. Clickable cards (`button.card`) get hover `--shadow-md` (the official hovered-row lift) and no translate. Card grids use 12px gutters.

Option card (radio): border 1px `--line-strong`, radius `--radius-md`, padding 12px 16px, title 15px/600 + description 13px gray, min-height 56px; selected: border 1.5px `--line-focus`, bg `--bg-option-selected`; focus ring on the card. `role="radio"` inside `role="radiogroup"`; cards sit side by side with 12px gap.

Status badge: inline-flex, height 22px, padding 0 8px 0 7px, radius pill, 11px/600; leading 6px dot; tones ok/warn/muted/accent use the soft backgrounds (official plan badge proportions).

Toast (official toasts are dark cards): fixed bottom 24px center, bg `--ink`, radius `--radius-lg`, padding 12px 10px 12px 14px, `--shadow-lg`; leading `CircleAlert` 18px in `--warn`, text white 13px, trailing white `icon-button` close (aria-label 关闭提示). `main.tsx` renders `<div class="toast" role="alert"><CircleAlert/><span/><button/></div>`.

Save status (`.save-status`): 13px `--text-secondary`, "正在保存…" with a 12px spinner; failure "保存失败" + `.text-button` "重试".

Inline alert (`role="alert"` inside pages): `Card tone="muted"` with `TriangleAlert` 18px in `--warn`, message 13px, action buttons `.secondary.small` and `.text-button`.

## 7. Page specifications

### 7.1 首页 (Home) — `src/renderer/Home.tsx` + `DictationPanel.tsx`

Superseded by section 13.2 for everything except the dictation card (item 3), the recovery alert (item 4) and the result card (item 5), which are unchanged.

Reference: the current official v2.0.0 Home (`.local/research-ui/onboarding-changelog/png/setup-09-across-apps.png`): a very large hero, a white shortcut card with outlined keycaps, a "Popular use cases" three-column card grid, and a narrow right rail holding a gray stats card and pale gradient link cards, on a cool dotted backdrop.

Backdrop: the Home tabpanel carries class `page-home`. For this page only, the content column background is `--home-bg` with a dot grid `radial-gradient(circle, var(--home-dot) 1px, transparent 1.2px) 0 0 / 14px 14px` and a soft glow `radial-gradient(520px 320px at 88% -10%, var(--home-glow), transparent 70%)`. Cards on Home are pure white `#ffffff` with a hairline `--line` border and radius `--radius-xl`. Other pages keep `--bg` and no pattern.

1. Hero: "说话，不打字" in `--fs-hero` (52px/700, letter-spacing -0.03em, line-height 1.05), no subtitle; margin-bottom 28px.
2. Layout below the hero: `display:grid; grid-template-columns: minmax(0,1fr) 260px; gap: 20px; align-items:start`. Under 1080px window width the rail moves below the main column.

Main column, in order:

3. Dictation card (`Card tone="raised"`, white, padding 20px 24px, radius `--radius-xl`), this is `DictationPanel`. Layout `grid-template-columns: 48px 1fr auto`, gap 16px, align center. Left: 48px circle `.dictation-icon` (bg `--ink`, white `Mic` 22px; recording adds a pulsing 3px ring `rgba(26,24,25,.15)`; processing shows `Busy` in white). Middle: heading `--fs-card-title`/600 (`sessionLabels` or "随时开口，直接输入" / "先连接你的 AI 模型") and 13px secondary line: idle configured → "再按一次结束，文字自动复制{并粘贴}。"; unconfigured → "配置语音识别，文字润色按需开启。"; shortcut unavailable → "快捷键暂不可用，可点击按钮听写。" + text-button 基本设置; recording → "正在聆听 · 00:12". When recording a full-width `Wave` (`bars={48}`, bars 2px wide with a 4px gap, height 40px) appears as a second row under the grid. Right: `KeyChips size="keycap"` (idle, configured) + primary pill button (`开始听写` / `结束听写` with `Square` icon / `处理中` disabled / `配置语音` when unconfigured) + `icon-button` "取消听写" while active. Keep class names `.dictation-panel`, `.record-button`.
4. Recovery alert (`role="alert"`, `.dictation-panel` descendant): `Card tone="muted"` with class `inline-alert`, message from `recoveryMessage`; actions `.secondary.small` "AI 配置"/"基本设置" via `recoverySettings`, `.text-button` "重试" when `canRetry`.
5. Result card (`Card`, white), shown when `showResult`: header row with `Segmented` `ariaLabel="听写结果视图"` options 整理后/原文 when texts differ, otherwise a 13px gray label "本次听写"; right `icon-button` `aria-label="复制本次听写"` that swaps to `Check` + "已复制" (aria-label "已复制") for 1.8 s. Body `.result-text` 15px line-height 1.7, max-height 220px scroll. Footer `.result-note` 13px gray with optional page link `.text-button`.
6. Shortcut card (`.shortcut-card`, white, radius `--radius-xl`, padding 4px 24px): rows separated by a hairline `--line`; each row `grid-template-columns: minmax(0,1fr) auto; align-items:center; padding: 18px 0`; left: title `--fs-card-title`/600 + 13px `--text-secondary` description; right: `KeyChips size="keycap"`. Rows: "听写" / "按一下开始，再按一下结束" → primary shortcut keycaps (a muted `StatusBadge` "已关闭" when disabled); "备用快捷键" / "主快捷键不可用时的备选" → fallback keycaps.
7. Section heading "配置概览" (`--fs-section`/600, margin 28px 0 16px) then `.usecase-grid` = `grid-template-columns: repeat(3, minmax(0,1fr)); gap:16px` (three columns at every window width ≥ 900px; one column below) of three `button.card` (white, radius `--radius-xl`, padding 20px, text-align left): a 40px rounded-square tile (`--bg-muted`, radius 12) holding a 20px icon top-left, title `--fs-card-title`/600, description 13px `--text-secondary`, `StatusBadge` at the bottom. Cards: 语音识别 (`Mic`; "{小米 MiMo|OpenAI 兼容} · {model}"; badge 已连接/待配置) → `ai`; 文字润色 (`Sparkles` tinted `--mint`; "{不润色|轻度润色|强力润色} · {model}" or "未配置润色模型，保留原文"; badge 已连接/未配置/已关闭) → `style` when a cleanup key is saved, else `ai`; 快捷键与权限 (`Keyboard`; "{effective shortcut label} · 麦克风{已授权|待授权}"; badge 已就绪/需授权) → `basic`.

Right rail, in order:

8. Status card (`Card tone="muted"`, radius `--radius-xl`, padding 20px): four rows 16px apart, each `icon 18px --text-secondary` + `strong 15px` value + 13px `--text-secondary` unit: `Mic` "{小米 MiMo|OpenAI 兼容}" "语音识别"; `Sparkles` "{不润色|轻度润色|强力润色}" "润色程度"; `Keyboard` "{shortcut label}" "{已就绪|不可用|已关闭}"; `ShieldCheck` "麦克风" "{已授权|待授权}". Bottom line, 16px below: `Lock` 14px + `.text-button` "密钥只保存在本机" (navigates to `ai`), 13px `--text-secondary`, underlined like the official privacy link.
9. Quick-start card (`button.card.link-card`, no border, background `--gradient-card-a`, radius `--radius-xl`, padding 20px, `ArrowUpRight` 16px top-right): title "三步开始" `--fs-card-title`/600, then three short lines 13px `--text-secondary` "1. 连接语音识别服务", "2. 选择润色程度", "3. 在任何应用按快捷键开口"; navigates to `ai`.
10. Content footer: right-aligned "版本 {version}" `--fs-caption` `--text-tertiary`, `margin-top:auto`, padding-top 24px.

### 7.2 AI 配置 — `src/renderer/settings/Providers.tsx`

Header: title "AI 配置", subtitle "语音识别与文字润色分别连接你自己的模型服务，密钥只保存在本机。"

Two `form.provider-panel` elements stacked, each a `SectionGroup` (icons `Mic` / `Sparkles`) whose `<h2>` heading text is exactly "语音识别" / "文字润色" (tests locate forms by heading). Rows:

- 语音识别 only: 语音协议 as a stacked row with two option cards (`radiogroup aria-label="语音协议"`): "小米 MiMo" (description "音频以 Base64 发送到 chat/completions") and "OpenAI 兼容" ("multipart 上传到 audio/transcriptions").
- 语音服务地址 / 润色服务地址: `<input type="url">`, description "填写服务根地址，不要包含 /chat/completions。"
- 语音模型 / 润色模型: text input.
- 语音 API 密钥 / 润色 API 密钥: `type="password"`, `autoComplete="new-password"`; hint keeps current logic ("已保存；留空保留。" / "地址或协议已变更，请重新输入密钥。" / "密钥仅保存在本机，不会回显。").
- Action row (`.row-actions`, right aligned, 12px gap): `.text-button.danger-text` "删除密钥" (when saved) then `.primary` "保存" (disabled until changed; "保存中…" while busy). Error `<p class="error-text" role="alert">` under the row.

Labels must be `<label htmlFor>` so `getByLabel(/^语音服务地址/)` etc. resolve. Footer caption under both groups: "音频发送至语音服务；开启润色后，文字发送至润色服务。"

### 7.3 基本设置 — `src/renderer/settings/Preferences.tsx` (`BasicSettingsPage`)

Header: "基本设置", subtitle "快捷键、麦克风、粘贴行为与系统权限。" Groups in this order:

1. `Keyboard` 快捷键: row 主要快捷键 (description "按一下开始，再按一下结束。" ; control = native select labelled by the row label with options `{Fn|RightAlt}` "Fn · 按一下开始 / 结束" and `Disabled` "关闭"; status under control = `StatusBadge` from `shortcutStatusMessages`), row 备用快捷键 (select of presets; status badge 已就绪/未注册).
2. `Mic` 音频: 麦克风 (select of devices), 录音提示音 (switch).
3. `Laptop` 通用: 完成后自动粘贴 (switch, description "把结果粘贴到当前前台应用，不会按下回车。"), 登录系统时启动 (switch).
4. `ShieldCheck` 系统权限: rows 麦克风, 辅助功能 (macOS) / 系统输入助手 (Windows), 输入监控 (macOS only). Control = `StatusBadge` (ok 已授权/已就绪, warn 待授权/不可用, and 未单独授权 for 输入监控 as today) + `.secondary.small` action button ("授权" / "打开系统设置") where one exists today.

Switch rows: control is `<input type="checkbox" role="switch" aria-label="{label}">` so `getByRole('switch', { name: '完成后自动粘贴' })` resolves; `SaveStatus` under the control.

### 7.4 表达风格 — `Preferences.tsx` (`WritingPage`)

Superseded by section 13.4: the two groups now live inside the 文字润色 form of AI 配置 and the page no longer exists.

Header: "表达风格", subtitle "决定识别结果如何整理。个人表达说明会随每次润色一起发送。" Groups:

1. `Sparkles` 润色程度: stacked row with `Segmented` (`ariaLabel="润色程度"`) 不润色 / 轻度润色 / 强力润色, hint line from `writingLevels`, `SaveStatus`.
2. `PenLine` 个人表达说明: stacked row with the textarea labelled "个人表达说明" (`<label htmlFor>`), hint "离开输入框自动保存，也可按 ⌘ / Ctrl + Enter。" or, when level is none, "开启润色后生效，说明会保留。"; the group carries class `writing-inactive` in that state (textarea and label in `--text-secondary`).

## 8. Voice capsule (`src/renderer/VoiceOverlay.tsx`, `styles/overlay.css`, `electron/voice-overlay.ts`)

Copy the official black capsule. All figures come from [ui-official-overlay-and-brand.md](research/ui-official-overlay-and-brand.md) normalised to a bar height H = 48 logical px; reference crops are under `.local/research-ui/overlay-brand/crops/` and frames under `.local/research-ui/overlay-brand/dictate30/`.

Tokens (add to `overlay.css` as local custom properties, not to tokens.css): `--capsule-h: 48px; --capsule-bg: #1c1a1b; --capsule-cancel: #424242; --capsule-text: #d3d3d3; --capsule-shadow: 0 4px 6px rgba(0,0,0,.03), 0 12px 16px rgba(0,0,0,.08), 0 1px 12px rgba(128,128,128,.12);`.

Window (`electron/voice-overlay.ts`): `voiceWindowSize = { width: 240, height: 76 }`, `recoveryWindowSize = { width: 400, height: 76 }`; `overlayBounds` centres horizontally on the cursor display work area and places the window `area.y + area.height - size.height - 16`. The capsule is centred inside the window; the extra window area only carries the shadow. Body stays transparent (`.overlay-body` rules live in `shell.css`, owned by Agent A; do not duplicate them).

Recording state (`.voice-pill`, `role="status"`, `aria-label="正在录音"`): a true capsule 165 × 48, radius 24, fill `--capsule-bg`, `--capsule-shadow`, no border. Horizontal layout: 6px inset, 36px cancel circle, free space, 57px waveform centred on the capsule centre, free space, 36px confirm circle, 6px inset (`display:grid; grid-template-columns: 36px 1fr 36px; padding: 0 6px; align-items:center`). `button.voice-control.voice-cancel` (`aria-label="取消听写"`): 36px circle `--capsule-cancel`, white `X` glyph 16px strokeWidth 2.5; hover `#4e4e4e`. `button.voice-control.voice-finish` (`aria-label="完成听写"`): 36px circle `#ffffff`, `Check` glyph 16px strokeWidth 2.5 in `--capsule-bg`; hover `#ececec`. Both keep `onMouseDown preventDefault` so focus never leaves the target app, and both are always visible (official behaviour; no hover reveal). Countdown: when `settings.audio.maxDurationSeconds * 1000 - session.durationMs <= 10000`, a `span.voice-timer` with the remaining `m:ss` (15px/500, `#ffffff`, `font-variant-numeric: tabular-nums`) appears between the waveform and the confirm circle and the capsule widens to 210px (width transition `--dur-slow`).

Waveform (`.voice-pill .wave`, rendered by `Wave` with `bars={10}`): exactly 10 bars, width 3px, gap 3px (span 57px), colour `#ffffff`, fully rounded caps, minimum height 3px (a dot), maximum 30px, vertically centred and growing symmetrically. Apply an end-fade window so the outer bars stay near the minimum: multiply the level by `[.15,.4,.75,.95,1,1,.95,.75,.4,.15]` per position before adding the sinusoidal variation. Near-silence renders as ten evenly spaced dots. Override the base `.wave` size inside `.voice-pill` (`width:57px; height:30px; gap:3px`).

Processing state (`aria-label="正在处理"`): controls and waveform disappear in one frame; the capsule becomes a text pill that hugs its label: `span.voice-label` "思考中" (15px/500, `--capsule-text`) with 13px horizontal padding; height stays 48. A `div.voice-loading` wraps the label and contains `<i class="voice-wash" />`: an absolutely positioned overlay `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.12) 45%, rgba(255,255,255,.12) 100%)` clipped to the capsule, whose `transform: translateX()` runs from -100% to 0 over 1.2s with `cubic-bezier(.1,.7,.2,1)`, `animation-iteration-count: infinite`, 400ms delay between passes (implement as a 1.6s keyframe with the last 25% holding). Deliberate departure from the official pill: the 36px cancel circle stays at the left while processing, because this product keeps processing cancellable from the capsule (the delivery test clicks 取消听写 during processing). Layout while processing: `grid-template-columns: 36px auto; padding: 0 6px; gap: 4px` — cancel circle, then the label with 13px right padding; the capsule hugs that content (about 118px for 思考中). `.voice-pill button` count is 2 while recording and 1 while processing. Keep the class names `.voice-loading` and `.voice-loading i` (a delivery test reads the animation).

Transitions (width is the only dimension that ever animates; height never changes after appearing): appear = 200ms ease-out from `scale(.8) translateY(4px)` and opacity 0; recording → processing = 233ms spring that undershoots to 83% of the target width and settles (`@keyframes voice-contract { 0% { width: 165px } 45% { width: calc(var(--pill-w) * .83) } 70% { width: calc(var(--pill-w) * .83) } 100% { width: var(--pill-w) } }`); dismiss = instant (no exit animation). Under `prefers-reduced-motion` all of this is off.

The overlay window keeps its existing right-click context menu (取消听写 while active, 打开 Typeless), implemented in `electron/main.ts` and unchanged by this redesign.

Recovery state (`button.voice-recovery`, `aria-label="查看听写问题"`, `title=recoveryMessage`): a text capsule 48px tall, max-width 368px hugging its content, padding 0 16px 0 12px, fill `--capsule-bg`, `--capsule-shadow`; leading `CircleAlert` 16px in `--warn`, text 13px `#ececec` single-line ellipsis; hover fill `#2a2829`. Clicking opens the main window as today.

## 9. File ownership

| Owner | Files (exclusive) |
| --- | --- |
| Lead (before fan-out) | `docs/UI_DESIGN.md`, `src/renderer/styles/tokens.css`, `src/renderer/styles/base.css`, `src/renderer/ui.tsx`, `src/renderer/settings/types.ts` |
| Agent A shell+home | `src/renderer/main.tsx`, `src/renderer/Sidebar.tsx` (new), `src/renderer/Home.tsx` (new), `src/renderer/DictationPanel.tsx`, `src/renderer/styles/shell.css` (new), `src/renderer/styles/home.css` (new), `index.html`, `electron/main.ts` (window options only), delete `src/renderer/styles.css` |
| Lead at integration | delete `src/renderer/Settings.tsx`, final typecheck/build/visual review |
| Agent B1 providers | `src/renderer/settings/Providers.tsx`, `src/renderer/styles/providers.css` (new) |
| Agent B2 preferences | `src/renderer/settings/Preferences.tsx`, `src/renderer/settings/Autosave.tsx`, `src/renderer/styles/preferences.css` (new) |
| Agent C overlay | `src/renderer/VoiceOverlay.tsx`, `src/renderer/styles/overlay.css` (new), `electron/voice-overlay.ts`, `tests/voice-overlay.test.ts` |
| Agent D verification | `tests/desktop.e2e.mjs`, `tests/dictation-delivery.e2e.mjs` |
| Agent E docs | `README.md`, `docs/USER_GUIDE.md`, `docs/PROPOSAL.md`, `docs/VALIDATION.md`, `docs/screenshots/*` |

CSS loading: `main.tsx` imports `styles/tokens.css` then `styles/base.css` first, then `styles/shell.css` and `styles/home.css`. Every other component imports its own stylesheet at the top of its file (`Providers.tsx` → `../styles/providers.css`, `Preferences.tsx` → `../styles/preferences.css`, `VoiceOverlay.tsx` → `./styles/overlay.css`), so a page renders correctly even before the shell is rewired. Each stylesheet only targets class names its owner renders; shared class names are defined in `base.css` only.

Cross-file contract: `main.tsx` renders `<Sidebar page onNavigate snapshot />` and, in `<main>`, `<Home snapshot run openSettings />`, `<Providers snapshot run />`, `<BasicSettings snapshot run />`, `<WritingSettings snapshot run />`. The three settings components keep their current export names and `SettingsSectionProps` props, so the legacy `Settings.tsx` keeps compiling while work is parallel; the lead deletes `Settings.tsx` at integration (agents must not delete it). `RunAction`, `SettingsSectionProps`, `Page`, `SettingsTab` and `pages` come from `settings/types.ts`. No file owned by an agent may import from `./Settings`.

## 10. Accessibility and test hooks that must survive

- `nav[aria-label="主导航"]` > `role=tablist` with three `role=tab` (`首页`, `AI 配置`, `基本设置`) since section 13, `aria-selected`; one `role=tabpanel` rendered.
- Home: `button` "配置语音" / "开始听写" / "结束听写"; `.dictation-panel [role="alert"]` with buttons "基本设置" / "AI 配置" / "重试"; `role=group[name="听写结果视图"]` with buttons "整理后"/"原文" carrying `aria-pressed`; `.result-text`; buttons "复制本次听写" then "已复制".
- AI 配置: `form.provider-panel` with `h2` "语音识别"/"文字润色"; labels 语音服务地址, 语音模型, 语音 API 密钥, 润色服务地址, 润色模型, 润色 API 密钥; button "保存"; no button named "保存设置"; `role=alert` with 保存失败 text on failure.
- 基本设置: `switch` named 完成后自动粘贴, 录音提示音, 登录系统时启动; selects labelled 主要快捷键 (value `Disabled` option) and 备用快捷键; `.save-status`.
- 文字润色 form on AI 配置 (since section 13): buttons 不润色/轻度润色/强力润色 with `aria-pressed`; textarea labelled 个人表达说明; `.writing-inactive` containing "开启润色后生效，说明会保留。".
- Overlay: `.voice-pill .wave`, `.voice-pill button` (2 while recording, 1 while processing), button "取消听写" in both states, "完成听写" while recording, `.voice-loading i` carrying a CSS animation while processing, `button` "查看听写问题" in recovery.

## 11. Acceptance

1. `npm run typecheck`, `npm test`, `npm run build` pass.
2. `npm run test:desktop` and `npm run test:delivery` pass after Agent D updates selectors (tablist name and tab count only, if the hooks above are honored).
3. Screenshots of 首页 (idle, recording, result, recovery), AI 配置, 基本设置, 表达风格, capsule (recording, processing, recovery) are captured into `docs/screenshots/` and visually match sections 6–8.
4. Window is usable at 880×600 without horizontal scrolling; setting rows show two columns at 1000px window width and stack below 900px.
5. No plaintext copy changes beyond those listed here; no new `AppAction`s; `npm test` count does not decrease.

## 12. First-run setup guide

Added after the 2.0.0 release. The guide walks a new install through every system permission before the main shell appears, modelled on the official onboarding (`docs/research/ui-official-onboarding-and-changelog.md` section 2: progress header with gradient bar, one-expanded-at-a-time permission cards that collapse with a black check, 15-bar blue microphone meter, periwinkle feature cards). It also replaces the "监听不可用，正在恢复" dead end: when the helper reports listening authorization but its event tap still fails, the UI says so, explains the stale-grant cause, and offers a relaunch and a diagnostics copy. Revised on 2026-09-22 after field testing showed that restarting the helper process never recovers such a tap.

### 12.1 Trigger and exit

- `settings.general.setupCompleted` (new, `boolean`). Fresh installs start at `false`; a `state.json` written before this flag existed is loaded as `true` (upgrades never see the guide). Store handles both; the renderer only reads the flag.
- While the flag is `false`, `main.tsx` renders `<SetupGuide snapshot run />` (from `src/renderer/onboarding/SetupGuide.tsx`) instead of the sidebar shell. Nothing else changes in the shell code path.
- The guide ends by saving `{ general: { setupCompleted: true } }`. The shell then opens on `ai` when no speech key is saved, otherwise `home` (the existing initial-page rule). 基本设置 gains a "重新运行设置向导" button that saves the flag back to `false`.
- While the flag is `false`, the main process counts shortcut presses instead of starting dictation (12.4). The voice capsule therefore never appears during setup.

### 12.2 Chrome

Welcome screen (no progress header): the whole window is `--setup-bg` with two soft radial glows; a centred white card 436 wide (auto height, padding 56px 48px, radius 24, `--shadow-md`) holds the `AudioWaveform` mark (32px), `h1` "欢迎使用 Typeless" (`--fs-title`, weight 700), grey subtitle "说话，不打字", a primary pill "开始设置" (full card width, height 44) and a text link "跳过向导" (completes setup immediately). The card keeps its 436px width at every window size (the minimum window is 880 wide).

Step shell (steps 权限, 麦克风, 快捷键, 完成):

```
┌────────────────────────────────────────────────────────────┐
│ ● ● ●     权限  ›  麦克风  ›  快捷键  ›  完成                │ 56px, white
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ 4px bar
├──────────────────────────────┬─────────────────────────────┤
│ ← 上一步                     │                             │
│                              │                             │
│ h1 (--fs-title)              │      art panel: --setup-art │
│ subtitle (--text-secondary)  │      one hero card          │
│                              │                             │
│ … step content …             │                             │
│                              │                             │
│ [skip link]        [继续]    │                             │
└──────────────────────────────┴─────────────────────────────┘
        55% (--setup-panel-split)          45%
```

- Header: `nav[aria-label="设置进度"]` > `ol` with four `li`; the active one carries `aria-current="step"`, weight 600, `--text`; others `--text-secondary`, weight 400; separators are `ChevronRight` 14px `--text-tertiary`. The whole header is a drag region on macOS (`-webkit-app-region: drag`) with `padding-top: 8px` so it clears the traffic lights, and the label row is centred.
- Progress bar: `role="progressbar"` with `aria-valuemin=0 aria-valuemax=100 aria-valuenow`, track `--setup-progress-track`, fill `--setup-progress-fill`, transition `width var(--dur-slow)`. Fill: 权限 `15 + 25 × granted/total` (%), 麦克风 55, 快捷键 75, 完成 100.
- Left panel: white, padding `40px 48px`, content max-width 520, flex column; the footer row sticks to the bottom (`margin-top: auto`, `justify-content: space-between`). The "← 上一步" text button sits top-left (`ArrowLeft` 14px); it is absent on 权限.
- Right panel: `--setup-art` with two radial glows (`--home-glow` and `rgba(196,212,255,.55)`), centred hero card. The split holds at every width the window allows (minimum 880): the art panel is never hidden, because the microphone meter lives there.
- Buttons: primary pill = `--ink` fill, white text, height 40, padding 0 24; secondary = white, `1px solid var(--line-strong)`; text link = `.text-button`. Disabled primary = `--bg-selected` fill, `--text-tertiary` label.

### 12.3 Steps

**权限** — `h1` "在这台电脑上设置 Typeless", subtitle "两项系统权限，只在你听写时使用。". Cards are stacked (`gap: 12px`), fill `--setup-card`, radius `--radius-lg`, padding 20 24. Only the first non-granted card is expanded; a granted card collapses to its title row with a filled black circular check (`CircleCheck` 22px, `--ink`). Each card is `.permission-card[data-permission][data-state]` with an `h3` title.

| `data-permission` | Platform | Title | Expanded body | Primary control |
| --- | --- | --- | --- | --- |
| `microphone` | all | 允许 Typeless 使用麦克风 | 只在你按下快捷键听写时访问麦克风。 | "允许" → `permissions.request microphone` |
| `accessibility` | darwin | 允许 Typeless 粘贴文字并监听 Fn 键 | Typeless 需要辅助功能权限，才能把结果粘贴到当前输入框，并识别单独按下的 Fn。 | "允许" → `permissions.request accessibility` |
| `helper` | win32 | 启用系统输入助手 | Typeless 通过内置助手识别 Right Alt 并粘贴文字，无需额外授权。 | none |

`data-state` values and their rendering:

- `pending`: body + "允许" pill + `Info` icon button (aria-label "为什么需要此权限", toggles one extra line of the manual path: 系统设置 → 隐私与安全性 → 辅助功能 / 麦克风 → 开启 Typeless).
- `denied` (microphone `denied`; helper `nativeAvailable === false`): body "系统已拒绝麦克风权限。请在系统设置中开启后返回。" / "助手不可用，可先使用备用快捷键。" and, for the microphone, "打开系统设置" → `permissions.open microphone`.
- `stale` (`shortcutMessage === 'relaunch_required'`: the helper reports listening authorization through Accessibility or Input Monitoring, yet its tap still fails): body "系统显示已授权，但 Fn 监听尚未生效。请先重新打开 Typeless；如果重新打开后仍显示待授权，说明是升级前留下的旧授权：请在系统设置 → 隐私与安全性 → 辅助功能与输入监控中移除 Typeless 并重新添加。" Buttons in this order: "重新打开 Typeless" → `app.relaunch` (primary), "打开系统设置" → `permissions.open accessibility`, "复制诊断信息" → `diagnostics.copy` (label becomes "已复制" for 2 s on success). No `enabling` state exists: the helper retries the tap on every 2 s poll, so a grant that works shows `granted` within one poll and one that does not shows `stale`.
- `granted`: microphone `granted`; accessibility `true` and (`primaryShortcutAvailable` or primary shortcut `Disabled`); helper `nativeAvailable`.

Below the cards on macOS: text link "快捷键仍不可用？改用输入监控" → `permissions.open inputMonitoring`.

Hero card: a white card (radius `--radius-xl`, 320 wide) that mirrors the OS privacy list: one row per permission card (icon `Mic` / `Accessibility` / `Keyboard`, label 麦克风 / 辅助功能 / 系统输入助手) with a switch graphic (`--switch-off` track, `--accent` when on) that flips as the card becomes `granted`; a caption "系统设置 → 隐私与安全性" underneath in `--text-tertiary`. Footer: left text link "稍后在基本设置中授权" (advances regardless); right primary "继续", enabled only when every card is `granted`. The step re-renders live from `snapshot.permissions` (main publishes every 2 s and after each request), so the user watches cards collapse as they flip the OS switches.

**麦克风** — `h1` "说几句话，测试麦克风", subtitle "看到蓝色音量条随声音跳动即可。". Content: bold prompt "说话时能看到蓝色的条在动吗？", then a `SettingRow`-like row with `select` labelled "麦克风" (options: 系统默认 + `enumerateDevices()` audio inputs; change saves `audio.deviceId` immediately and restarts the test stream), then a status line that shows `StatusBadge ok` "已检测到声音" (`.mic-detected`) once any level ≥ 0.02 was seen on this step. If `permissions.microphone !== 'granted'`, the content instead shows "先允许 Typeless 使用麦克风" with "允许" (`permissions.request microphone`) and, when `denied`, "打开系统设置" (`permissions.open microphone`). If `getUserMedia` throws, show `role="alert"` "无法访问麦克风，请检查是否被其他应用占用。". Footer: "上一步" link, primary "继续" (always enabled).

Hero card: white, radius `--radius-xl`, 320×200, holding `.level-meter[data-active]` with 15 `i` bars (width 10, radius 5, gap 8, heights 24…72 in a shallow arc); lit bars `--meter-active`, idle `--meter-idle`; lit count = `round(level × 15)` with 120 ms ease. Level = RMS of an `AnalyserNode` time-domain buffer × 4, clamped to 1.

Stream lifecycle (`src/renderer/onboarding/MicTest.tsx`): on mount dispatch `{ type: 'microphone.test', active: true }`, then `getUserMedia({ audio: { deviceId: id === 'default' ? undefined : { exact: id } } })`; on unmount stop tracks, close the `AudioContext`, dispatch `active: false`. Never sends audio to main.

**快捷键** — `h1` "试试快捷键", subtitle "在任何应用里，按一下 Fn 开始听写，再按一下结束。" (Windows: Right Alt). Content: instruction card "现在按一下 Fn" with `KeyChips size="keycap"`; when `permissions.shortcutPresses` exceeds its value at step entry, render `.shortcut-detected` (`StatusBadge ok`) "检测到 Fn" / "检测到 Right Alt" and the copy "很好，快捷键可以用了。". If `primaryShortcutAvailable` is false, show a warn note "Fn 监听尚未就绪，可先用备用快捷键；稍后可在基本设置中查看。" and count fallback presses the same way (the badge then reads "检测到备用快捷键"). A second row lists the fallback chord: "备用快捷键 · 任何时候都可用" with keycaps. Footer: "上一步", primary "继续" (always enabled).

Hero: two `--setup-feature-card` cards (radius `--radius-xl`, padding 24): "听写" with the primary keycap, "备用" with the fallback keycaps — white keycaps with a 1px `--ink` outline, as in the official "Experience it" screen.

**完成** — `h1` "一切就绪" when `settings.asr.hasApiKey`, otherwise "还差最后一步"; subtitle "连接语音识别服务后，就可以在任何应用里开口了。" (only when no key). Content: a checklist card with three rows (麦克风 / 辅助功能 or 系统输入助手 / 快捷键) each with `CircleCheck` (`--ok`) or `CircleAlert` (`--warn`) and the same wording as 基本设置. Footer: text link "稍后再说" (completes setup); primary "去连接 AI 服务" (no key) or "开始使用" (key present). Both save `setupCompleted: true`; the shell's initial-page rule does the rest.

Hero card: a preview of the voice capsule from section 8 rendered statically inside a white card (black pill 165×48 with ten idle bars, cancel and confirm circles) above the caption "听写时会出现在屏幕底部", so the user knows what to expect after the guide.

### 12.4 Main-process behaviour (Agent N)

- `permissions.shortcutPresses` (new) counts native and fallback presses since launch. When `settings.general.setupCompleted` is `false`, both handlers increment the counter and call the health refresh (so the snapshot publishes at once) instead of dispatching `dictation.toggle`. When `true`, behaviour is unchanged.
- `{ type: 'microphone.test', active }`: main records `micTestUntil = active ? now + 120 s : 0`. The media permission request and check handlers allow audio when `micTestUntil > now` in addition to `arming`/`recording`.
- `{ type: 'permissions.open', pane }`: darwin opens `x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone | Privacy_Accessibility | Privacy_ListenEvent`; win32 opens `ms-settings:privacy-microphone` for `microphone` and is a no-op otherwise; other platforms no-op. Always `{ ok: true }`.
- `{ type: 'permissions.request', permission: 'accessibility' }`: if the helper request fails (for example the helper is unavailable), main opens the Accessibility pane instead and still returns the refreshed permissions; the action never fails because of the helper.
- `{ type: 'app.relaunch' }`: on packaged macOS, spawn a detached `/bin/sh` that waits for the current pid to exit and then runs `/usr/bin/open <bundle path>` (the new instance starts the way Finder starts it), then `app.quit()`. Elsewhere `app.relaunch(); app.quit()`.
- Stale tap. The helper only reports: `reconcile()` keeps its existing reasons and never exits on its own; there is no self-restart, exit code, environment flag or restart budget, and `NativeStatus` has no `restartsExhausted`. `electron/shortcut-status.ts`: when the reason is `tap_creation_failed`, `tap_disabled` or `runloop_source_failed` and the helper is trusted (`accessibility || inputMonitoring`), `shortcutMessage` is `relaunch_required`; every other mapping stays and `tap_stale` no longer exists.
- Native status history: main records the last 50 transitions of `NativeStatus` (a transition is a change in `accessibility`, `inputMonitoring`, `shortcutReason`, `tapEnabled`, `helperPid` or `error`) with timestamps, and appends each as one JSON line to `<logs>/native-status.log`, truncating that file when it exceeds 256 KB.
- `{ type: 'diagnostics.copy' }`: main writes a plain-text report to the clipboard with `clipboard.writeText`: app version, `process.platform` and `process.getSystemVersion()`, packaged flag and executable path, bundle cdhash on macOS (parsed from `codesign -dvvv` on the bundle via `spawnSync` with a 3 s timeout, `unknown` on failure), settings without secrets (`shortcut`, `general`, `audio.deviceId`), the current `Permissions`, and the status history. Returns `{ ok: true }`, or `{ ok: false, message }` when the clipboard write throws.
- Unit tests: `tests/shortcut-status.test.ts` covers trusted-plus-stale → `relaunch_required` and untrusted-plus-stale unchanged; `tests/native-client.test.ts` drops the exit-code-3 cases; `native/bin/typeless-native --self-test` must still pass.

### 12.5 基本设置 changes (Agent O)

- Shortcut status copy: `relaunch_required` → "已授权但监听未生效" plus a small secondary button "重新打开 Typeless" → `app.relaunch`; `input_monitoring_denied` → "请授权辅助功能（升级后需移除旧条目重新添加）". Other codes keep their copy; `tap_stale` is gone.
- 系统权限 group gains a last row 诊断信息, description "复制版本、权限与助手状态，便于排查问题。", button "复制诊断信息" → `diagnostics.copy` (label "已复制" for 2 s on success).
- 系统权限 group: the 麦克风 row shows "打开系统设置" (`permissions.open microphone`) instead of "授权" when the status is `denied`. The 输入监控 row reads "已授权" (`ok`) when input monitoring itself is granted, "辅助功能已覆盖" (`ok`) when only accessibility is granted, otherwise "未授权" (`warn`) with "打开系统设置" (`permissions.open inputMonitoring`). New row 设置向导, description "重新检查权限、麦克风与快捷键。", button "重新运行设置向导" → `settings.save { general: { setupCompleted: false } }`.

### 12.6 Test hooks (extends section 10)

- Guide root `main.onboarding[aria-label="设置向导"]`; `nav[aria-label="主导航"]` is not rendered while the guide is up, and vice versa.
- Welcome: `h1` "欢迎使用 Typeless"; buttons "开始设置", "跳过向导".
- Header: `nav[aria-label="设置进度"] li[aria-current="step"]`; `[role="progressbar"]` with `aria-valuenow`.
- 权限: `h1` "在这台电脑上设置 Typeless"; `.permission-card[data-permission][data-state]` with `h3`; buttons "允许", "打开系统设置", "重新打开 Typeless", "改用输入监控" (text of the link ends with it), "稍后在基本设置中授权", "继续".
- 麦克风: `h1` "说几句话，测试麦克风"; `select` labelled "麦克风"; `.level-meter i` × 15; `.mic-detected`; buttons "上一步", "继续".
- 快捷键: `h1` "试试快捷键"; `.shortcut-detected`; buttons "上一步", "继续".
- 完成: `h1` "一切就绪" | "还差最后一步"; buttons "去连接 AI 服务" | "开始使用", "稍后再说".
- 基本设置: button "重新运行设置向导"; button "重新打开 Typeless" only while `relaunch_required`; button "复制诊断信息"; 输入监控 badge "已授权" | "辅助功能已覆盖" | "未授权".
- Permission card states are `pending | denied | stale | granted`; the `stale` card carries buttons "重新打开 Typeless", "打开系统设置", "复制诊断信息".

### 12.7 Ownership for this change

| Owner | Files (exclusive) |
| --- | --- |
| Lead (before fan-out) | `src/shared/contracts.ts`, `src/core/store.ts`, `tests/core-store.test.ts`, `src/renderer/styles/tokens.css`, `docs/UI_DESIGN.md`, `CLAUDE.md` |
| Agent N native + main | `native/macos/Main.swift`, `native/PROTOCOL.md`, `electron/native-client.ts`, `electron/shortcut-status.ts`, `electron/main.ts`, `electron/controller.ts`, `tests/native-client.test.ts`, `tests/shortcut-status.test.ts`, `tests/core-session.test.ts` (host stub only) |
| Agent O renderer | `src/renderer/onboarding/**` (new), `src/renderer/styles/onboarding.css` (new), `src/renderer/main.tsx`, `src/renderer/bridge.ts`, `src/renderer/settings/Preferences.tsx`, `src/renderer/styles/preferences.css` |
| Agent D verification (after N and O) | `tests/desktop.e2e.mjs`, `tests/dictation-delivery.e2e.mjs`, `docs/screenshots/*`, `docs/VALIDATION.md` |
| Agent E docs (after N and O) | `README.md`, `docs/USER_GUIDE.md`, `docs/PROPOSAL.md` |

Agent O imports primitives from `ui.tsx` but does not edit it, `base.css` or `shell.css`; anything new lives under `onboarding/` and `onboarding.css`. The preview bridge must simulate the new actions (`permissions.request` flips the matching flag, `microphone.test`, `permissions.open`, `app.relaunch` and `diagnostics.copy` return ok) so the guide renders in a plain browser.

### 12.8 Acceptance

1. `npm run typecheck`, `npm test`, `npm run build`, `native/bin/typeless-native --self-test` pass; the unit-test count does not decrease.
2. `npm run test:desktop` launches a fresh profile, walks 欢迎 → 权限 (skip link) → 麦克风 (fake device lights the meter and `.mic-detected` appears) → 快捷键 → 完成 → "去连接 AI 服务", asserts the shell opens on AI 配置 with `general.setupCompleted === true`, and the relaunch stage lands directly in the shell.
3. The guide is usable at 880×600 without horizontal scrolling on every step.
4. Existing shell behaviour and hooks in section 10 are unchanged once setup is complete.

## 13. Simplification pass (2.2.0)

Requested on 2026-09-22 after the setup guide shipped: pure white pages, fewer repeated status lines, one brand mark, three destinations, and an in-app release check. Behaviour stays as it is; this section changes only presentation, navigation and adds the update check. Where it contradicts sections 2, 5, 7 or 12, this section wins.

### 13.1 Tokens and shared rules (lead, done before fan-out)

- `--bg` is `#ffffff`; the sidebar keeps `--bg-sidebar #f6f6f6`. The Home backdrop (dot grid, glow) and the `--home-*`, `--gradient-card-*` and `--mint` tokens are gone. `--setup-bg` and `--setup-art` are flat `#f6f6f6`; `--setup-feature-card` is `#ffffff`.
- Colour is reserved for status: `StatusBadge` keeps its soft ok/warn/accent tints, the microphone meter stays `--meter-active`, links keep `--accent-text`. Switches (`input[role=switch]:checked` and the guide's `.privacy-switch[data-on="true"]`) are `--ink`.
- Cards on white pages use `border: 1px solid var(--line-strong)` so they read on the white background; no card carries a gradient.
- `BrandMark({ size, className })` in `ui.tsx` draws the Dock icon's seven rounded bars (heights 3/6/9/12/9/6/3 on a 24 grid, width 2, pitch 3, `rx=1`, `fill="currentColor"`). It replaces every `AudioWaveform` use.
- Icons: 首页 `House`, AI 配置 `Sparkle` (single four-point star), 基本设置 `Settings`, 语音识别 `Mic`, 文字润色 `PenLine`, 快捷键 `Keyboard`, 关于 `Info`, update `CircleArrowUp`. `Sparkles` is not used anywhere.
- `pages` has three entries: `home` 首页, `ai` AI 配置, `basic` 基本设置. `SettingsTab` is `'ai' | 'basic'`.
- `AppSnapshot.update: UpdateState` and the actions `update.check`, `update.download`, `update.open`, `update.openRelease` exist in `contracts.ts`; `Controller.setUpdate()` publishes transitions.

### 13.2 Shell and Home (Agent A)

Sidebar: brand row = `BrandMark` 22px + "Typeless" wordmark (unchanged type). Three nav items. The footer shortcut card is removed. When `snapshot.update.status === 'available'` the footer shows `button.sidebar-update` (`margin-top:auto`, white card, `--line-strong` border, radius `--radius-md`, padding 10px 12px, 13px): `CircleArrowUp` 16px + "有新版本 {latestVersion}"; it navigates to `basic`. Nothing else sits in the footer.

`main.tsx`: routes `home | ai | basic`; `WritingSettings` is no longer imported or rendered; everything else (setup guide gate, initial page rule, error → home, toast) unchanged.

Home (`Home.tsx`, `styles/home.css` rewritten): single column, `.page-home` max-width 680px, no backdrop, no right rail.

1. `PageHeader` title "说话，不打字" (`--fs-title`), no subtitle.
2. `DictationPanel` unchanged (its keycaps and one instruction line are the only shortcut guidance on the page).
3. `.status-list`: one white card (`--line-strong` border, radius `--radius-lg`, padding 4px 0) holding three `button.status-row` (full width, text-align left, `grid-template-columns: 20px minmax(0,1fr) auto 16px`, gap 12px, padding 14px 16px, hairline `--line` between rows, hover `--bg-hover`): icon 20px `--text-secondary`; text block = label `--fs-heading`/600 + 13px `--text-secondary` detail; `StatusBadge`; `ChevronRight` 16px `--text-tertiary`.
   - 语音识别 (`Mic`): detail "{小米 MiMo|OpenAI 兼容} · {model}" or "待配置"; badge 已连接 (ok) / 待配置 (warn); → `ai`.
   - 文字润色 (`PenLine`): detail "{不润色|轻度润色|强力润色}{ · model when connected}" or "未配置润色模型"; badge 已连接 (ok) / 未配置 (warn) / 已关闭 (muted, when 不润色); → `ai`.
   - 快捷键 (`Keyboard`): detail = `KeyChips` (chip size) of the effective shortcut, or "已关闭"; badge 已就绪 (ok) / 不可用 (warn) / 已关闭 (muted); → `basic`.
4. Nothing else: no shortcut card, no 配置概览, no rail, no 三步开始, no privacy line, no version footer (the version moves to 基本设置 → 关于).

### 13.3 Setup guide (Agent B)

Presentation only: welcome backdrop and art panel are flat `--setup-bg` / `--setup-art` without radial glows; feature cards are white with a `--line-strong` border; the privacy hero switch turns `--ink`; the welcome mark is `BrandMark` 32px. The 完成 step adds, below the checklist and only when no speech key is saved, a `.next-steps` card (white, `--line-strong` border, radius `--radius-lg`, padding 16px 20px) titled "接下来" (`--fs-heading`/600) with three 13px `--text-secondary` lines: "1. 连接语音识别服务", "2. 选择润色程度", "3. 在任何应用按 {Fn|Right Alt|fallback chord label} 开口". Copy, states, hooks and flow of section 12 are otherwise unchanged.

### 13.4 AI 配置 (Agent C)

Subtitle: "语音识别与文字润色分别连接你自己的模型服务，并在这里设置润色方式；密钥只保存在本机。" The 语音识别 form is unchanged. The 文字润色 form (`form.provider-panel`, `h2` "文字润色", icon `PenLine`) now contains, in order:

1. 润色程度: stacked row, `Segmented ariaLabel="润色程度"` 不润色 / 轻度润色 / 强力润色 (buttons `type="button"`, `aria-pressed`), hint from `writingLevels`, `SaveStatus`; autosaves through `useSettingDraft` exactly as the old 表达风格 page did.
2. `.provider-divider` (hairline `--line`, margin 4px 0).
3. The existing connection rows (润色服务地址, 润色模型, 润色 API 密钥) and the action row with 保存 / 删除密钥 and the error line.
4. `.provider-divider`.
5. 个人表达说明: stacked row, textarea `id="writing-instructions"` with `<label htmlFor>`, placeholder and hints as before ("离开输入框自动保存，也可按 ⌘ / Ctrl + Enter。" or "开启润色后生效，说明会保留。"); the row wrapper carries `.writing-inactive` while 不润色 is selected. Blur and ⌘/Ctrl+Enter commit; Enter inside the textarea never submits the form.

The code moves from `Preferences.tsx` into `settings/Writing.tsx` (`WritingLevelRow`, `WritingInstructionsRow`, both taking `SettingsSectionProps`); `Providers.tsx` renders them. The footer caption stays.

### 13.5 基本设置 (Agent D)

`WritingSettings` and its imports leave `Preferences.tsx`. A last group `Info` 关于 gains one row 版本 (label "版本", description "Typeless {version}", `htmlFor` none). Its control is a `StatusBadge` plus one button, by `snapshot.update.status`:

| status | badge | button |
| --- | --- | --- |
| `idle` | muted "未检查" | "检查更新" → `update.check` |
| `checking` | muted "正在检查…" | disabled "检查中…" |
| `none` | ok "已是最新" | "检查更新" |
| `available` | accent "有新版本 {latestVersion}" | `.primary.small` "下载更新" → `update.download` |
| `downloading` | muted "下载中 {round(progress×100)}%" | disabled "下载中…" |
| `downloaded` | ok "已下载" | "打开安装包" → `update.open` |
| `error` | warn "检查失败" | "重试" → `update.check` |

Under the control: when `releaseUrl` is present a `.text-button` "更新说明" → `update.openRelease`; when `downloaded`, a 13px `--text-secondary` line "打开安装包后，把 Typeless 拖入应用程序文件夹并重新打开；升级后需重新授权辅助功能。" (Windows: "解压后运行 Typeless.exe，覆盖旧文件即可。"); when `error`, the mapped message: `network` "无法连接 GitHub，请稍后重试。", `invalid_response` "GitHub 返回了无法识别的内容。", `no_asset` "此版本没有适用于当前系统的安装包。", `checksum` "下载文件校验失败，请重新下载。", `write_failed` "无法写入下载目录。". Preview bridge (`bridge.ts`): `update` is `{ status: 'none', currentVersion, checkedAt }` and the four `update.*` actions return ok without changing state.

### 13.6 Release check (Agent E)

- `src/core/update.ts` (pure, unit-tested in `tests/update.test.ts`): `compareVersions(a, b)` (strip a leading `v`, compare dot-separated integers, missing parts are 0, any prerelease suffix sorts below the plain version), `pickAsset(assets, platform, arch)` (darwin+arm64 → name ending `-arm64.dmg`; darwin+x64 → `-x64.dmg`; win32 → `-win.zip`; otherwise undefined), `parseLatestRelease(json)` → `{ version, releaseUrl, assets: { name, url, size, digest? }[] }` or throws `invalid_response` (requires `tag_name`, `html_url` on `https://github.com/`, array `assets` with `browser_download_url` on https).
- `electron/update-checker.ts`: `class UpdateChecker` constructed with `{ currentVersion, platform, arch, downloadsDir, fetcher = fetch, onChange(state) }`, state starts `{ status: 'idle', currentVersion }`. `check(url)`: `checking` → fetch with `Accept: application/vnd.github+json`, `User-Agent: Typeless/{version}`, 10 s timeout, 1 MB cap → `none` (equal or older) or `available` (with `latestVersion`, `releaseUrl`, `assetName`) or `error: no_asset` when newer but no asset, `error: network | invalid_response` otherwise; sets `checkedAt`. `download()`: only from `available`; `downloading` with `progress`; GET the asset URL (https only, `redirect: 'follow'`, 500 MB cap), stream to `<downloadsDir>/<assetName>.part` while hashing SHA-256, then verify against `digest` (`sha256:<hex>`) when present, rename to `<assetName>` → `downloaded` with `filePath`; on failure delete the partial file → `error: checksum | network | write_failed`. `open()`: `shell.openPath(filePath)` when `downloaded`. `openRelease()`: `shell.openExternal(releaseUrl)` only when its host is `github.com`. `onChange` fires on every transition, throttled to 250 ms while downloading; `cancel()` aborts an in-flight download at quit.
- `electron/main.ts`: `const updateUrl = process.env.TYPELESS_UPDATE_URL || 'https://api.github.com/repos/gaojunbin/Typeless/releases/latest'`; downloads directory = `join(dataRoot, 'downloads')` when `TYPELESS_DATA_DIR` is set, else `app.getPath('downloads')`. Wire `onChange` → `controller.setUpdate`. Automatic check 15 s after ready and every 6 h, only when `app.isPackaged || process.env.TYPELESS_UPDATE_URL`, and never when the value is `off`. The four actions dispatch through new `ControllerHost` methods (`checkUpdate`, `downloadUpdate`, `openUpdate`, `openReleasePage`); `update.check` is always allowed manually (it ignores `off`).
- `tests/update-checker.test.ts` with an injected fetcher and a temp directory under `.local/tests/`: newer release → `available`; same version → `none`; newer without a matching asset → `no_asset`; download success writes the file and reports `downloaded`; digest mismatch deletes the partial file and reports `checksum`.

### 13.7 Test hooks (replaces the affected lines of section 10)

- `nav[aria-label="主导航"]` > `role=tablist` with three `role=tab` (首页, AI 配置, 基本设置). No footer shortcut card; `button.sidebar-update` only while an update is available.
- Home: `.status-list` with three `button.status-row` named by their labels (语音识别, 文字润色, 快捷键); `.dictation-panel` hooks unchanged; no `.home-hero`, `.shortcut-card`, `.usecase-grid`, `.home-rail`, `.quickstart-card` or `.home-version`.
- AI 配置: `form.provider-panel` with `h2` 文字润色 contains buttons 不润色/轻度润色/强力润色 with `aria-pressed`, textarea labelled 个人表达说明 and `.writing-inactive` containing "开启润色后生效，说明会保留。"; the provider labels and 保存 button are unchanged.
- 基本设置: group 关于 with the 版本 row; buttons "检查更新" / "下载更新" / "打开安装包" / "重试" and badge texts as in 13.5; "更新说明" text button.
- Setup guide: unchanged hooks plus `.next-steps` on 完成 when no speech key is saved.

### 13.8 Ownership

| Owner | Files (exclusive) |
| --- | --- |
| Lead (done) | `src/shared/contracts.ts`, `src/renderer/settings/types.ts`, `src/renderer/ui.tsx`, `src/renderer/styles/tokens.css`, `src/renderer/styles/base.css`, `docs/UI_DESIGN.md`, `CLAUDE.md`, minimal compile fixes in `Sidebar.tsx`, `Home.tsx`, `main.tsx`, `controller.ts`, `bridge.ts` |
| Agent A shell + home | `src/renderer/main.tsx`, `src/renderer/Sidebar.tsx`, `src/renderer/Home.tsx`, `src/renderer/DictationPanel.tsx`, `src/renderer/styles/shell.css`, `src/renderer/styles/home.css` |
| Agent B setup guide | `src/renderer/onboarding/**`, `src/renderer/styles/onboarding.css` |
| Agent C AI 配置 | `src/renderer/settings/Providers.tsx`, `src/renderer/settings/Writing.tsx` (new), `src/renderer/styles/providers.css` |
| Agent D 基本设置 | `src/renderer/settings/Preferences.tsx`, `src/renderer/styles/preferences.css`, `src/renderer/bridge.ts` |
| Agent E release check | `src/core/update.ts` (new), `electron/update-checker.ts` (new), `electron/main.ts`, `electron/controller.ts`, `tests/update.test.ts` (new), `tests/update-checker.test.ts` (new), `tests/core-session.test.ts` (host stub only) |
| Agent F verification (after A–E) | `tests/desktop.e2e.mjs`, `tests/dictation-delivery.e2e.mjs`, `docs/screenshots/*`, `docs/VALIDATION.md` |
| Agent G docs (after A–E) | `README.md`, `docs/USER_GUIDE.md`, `docs/PROPOSAL.md` |

### 13.9 Acceptance

1. `npm run typecheck`, `npm test`, `npm run build`, `native/bin/typeless-native --self-test` pass; unit tests grow by the update tests.
2. `npm run test:desktop` passes with three tabs, the 润色 controls under AI 配置, the Home status list, and an update stage driven by `TYPELESS_UPDATE_URL` pointing at the harness mock server (a fake `99.0.0` release whose asset is a small file served by the same server): 检查更新 → 有新版本 99.0.0 → 下载更新 → 已下载, and the file exists under the profile's `downloads/`. `npm run test:delivery` passes.
3. Every page and guide step renders at 880×600 without horizontal scrolling; no page shows a coloured backdrop or gradient card.
4. Screenshots of 首页, AI 配置, 基本设置 and the guide are refreshed in `docs/screenshots/`.

## 14. Interface language (2026-09-23)

Requested after 2.2.1: the whole interface in Chinese or English, switchable by the user. Behaviour, layout and colour do not change; this section adds the setting, the switch and the copy catalogue.

### 14.1 Setting

- `settings.general.language: 'zh' | 'en'`, default `'zh'`. The store rejects any other value; a `state.json` written before the field existed loads as `'zh'`.
- `main.tsx` wraps the shell, the guide and the capsule in `I18nProvider` and sets `document.documentElement.lang` to `zh-CN` or `en`. The main process rebuilds the tray menu and the capsule context menu from the same setting whenever a snapshot is published.

### 14.2 Catalogue

- `src/renderer/i18n/index.ts`: `useI18n()` returns `{ language, t }`; `translate(language, key, params)` serves modules without React context (`sessionPresentation.ts`, `bridge.ts`). Placeholders are `{name}`.
- One file per area under `i18n/messages/`: `common` (destinations, shell toasts, writing levels, protocol names, language names), `home` (首页, dictation card, session labels, capsule), `session` (recovery and warning copy by error code), `settings`, `onboarding`. Each is declared with `defineMessages({ zh, en })`, so the two objects must share exactly the same keys; `tests/i18n.test.ts` additionally checks that placeholders match and that no English string contains CJK.
- Module-level tables hold keys, not text: `pages[].labelKey`, `writingLevels[].labelKey/hintKey`, `sessionLabelKeys`, the permission card models and the step list of the guide.
- Chinese copy is unchanged character for character; the accessibility hooks in section 10 and the e2e selectors therefore keep working in the default language. In English the same hooks read `Main navigation`, `Setup guide`, `Setup progress`, `Dictation`, `Language`.

### 14.3 Switches

- **基本设置 → 通用**: the first row is **语言** (`Language`), a `Segmented` control with the options **中文** and **English**, always written in their own language. It saves through `useSettingDraft` like the switches beside it, with the same saving / retry status, and the new language applies as soon as the snapshot returns.
- **Setup guide → welcome**: under **跳过向导** a `.text-button.setup-language` in `--text-secondary` shows the other language's name and saves it on click, so a first-time user can switch before granting anything. Nothing else on the welcome card moves.

### 14.4 English copy

Sentence case, short, no exclamation marks. Destinations are Home, AI Setup and Settings. System terms follow Apple's English names: Accessibility, Input Monitoring, System Settings, Privacy & Security. Product terms: Speech recognition, Text polishing, Polishing level (No polishing / Light polishing / Strong polishing), Personal instructions, Shortcut, System input helper, Setup guide, Check for updates, Up to date, Version {version} available, Download update, Open installer, Release notes.

### 14.5 Acceptance

- `npm test` includes the catalogue checks and the store's language validation.
- `npm run test:desktop` switches to English on 基本设置, asserts the navigation, the 关于 row and the document language, checks the three pages at the 880 × 600 minimum for horizontal overflow and for any remaining Chinese text, photographs them, switches back, and toggles the language on the welcome screen during the guide rerun.

