---
name: EZexams
description: Exam cram hub; an exam-hall noticeboard of admission tickets, seen through frosted glass.
colors:
  seal-vermilion: "#c4472a"
  slate-ink: "#253745"
  pewter: "#4a5c6a"
  night-ink: "#06141b"
  fog-board: "#dde1e0"
  paper: "#f3f5f5"
  paper-shade: "#e8ebeb"
  hairline: "#c2c9ca"
  rule-strong: "#9ba8ab"
  pass-green: "#2d7a3e"
  amber-caution: "#a26300"
  glass-film: "rgba(255,255,255,.32)"
  glass-edge: "rgba(255,255,255,.55)"
typography:
  display:
    fontFamily: "Iansui, DFKai-SB, BiauKai, Kaiti TC, Noto Sans TC, serif"
    fontSize: "clamp(38px, 7vw, 58px)"
    fontWeight: 700
    lineHeight: 1.15
  headline:
    fontFamily: "Iansui, DFKai-SB, BiauKai, Kaiti TC, Noto Sans TC, serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.3
  title:
    fontFamily: "Iansui, DFKai-SB, BiauKai, Kaiti TC, Noto Sans TC, serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.4
  body:
    fontFamily: "Noto Sans TC, PingFang TC, Microsoft JhengHei, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.8
  body-en:
    fontFamily: "Source Serif 4, Georgia, Noto Serif TC, serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "JetBrains Mono, Menlo, Consolas, Noto Sans TC, monospace"   # box labels, ticket metadata, badges, status lines; tabs and the date line use the body face
    fontSize: "12.5px"
    fontWeight: 600
    lineHeight: 1.5
rounded:
  badge: "4px"
  tab: "5px"
  control: "8px"
  ticket: "10px"
  glass: "16px"
  pill: "50%"
spacing:
  xs: "8px"
  sm: "14px"
  md: "16px"
  lg: "24px"
  xl: "44px"
components:
  button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.control}"
    padding: "7px 16px"
  button-primary:
    backgroundColor: "{colors.slate-ink}"
    textColor: "#ffffff"
    rounded: "{rounded.control}"
    padding: "7px 16px"
  button-primary-hover:
    backgroundColor: "{colors.seal-vermilion}"
    textColor: "#ffffff"
  tab-active:
    backgroundColor: "{colors.slate-ink}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    padding: "6px 12px 8px"
  ticket:
    backgroundColor: "{colors.glass-film}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.glass}"
  badge-kind:
    backgroundColor: "{colors.seal-vermilion}"
    textColor: "#ffffff"
    typography: "{typography.label}"
    rounded: "{rounded.badge}"
    padding: "1px 8px"
  option:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.control}"
    padding: "9px 12px"
  input:
    backgroundColor: "{colors.paper-shade}"
    textColor: "{colors.night-ink}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
---

# Design System: EZexams

## Overview

**Creative North Star: "The Exam-Hall Noticeboard"**

Each exam is pinned up like an admission ticket. The ticket has a tear-off stub with the date, a red seal marking the kind of exam, and a handwritten title. Everything sits on cool, fog-grey paper in dark ink. A frosted-glass layer, loaded last on every page, lays over the board. Cards, tables, and note boxes become translucent panes with a bright one-pixel edge, and three soft, slowly drifting blobs of colour (lavender, sky, peach) glow behind them. The structure and type come from the noticeboard, and the surfaces come from the glass. That combination is the system as shipped. Neither layer should be removed without a decision to do so.

The mood is calm and precise. These pages are read for hours at a desk and glanced at on a phone in the hallway before an exam, so ornament stays quiet and colour carries meaning: green means right, vermilion means wrong or important, amber means caution or in progress, and slate means English and the primary action. The personality lives in small exam-hall and terminal details: the half-circle notches on the ticket stub, the `$` prompt with a blinking cursor in a section header, mono metadata, and the process-status card (`pcb`) that reports a chapter as ready, running, or terminated.

Three scripts live together, and each has a job. Iansui, a handwritten-feeling Chinese face, is used for titles. Noto Sans TC is used for reading. Source Serif 4 is used for English textbook passages. JetBrains Mono is used for labels, tabs, and data. The bilingual pairing is the core of the product, and the type system makes the two languages look clearly different.

**Key Characteristics:**
- Admission-ticket cards with a dashed tear-off stub and notches
- Frosted glass panes (16px corners, 1px bright edge, soft ambient shadow) over a fog-grey board with soft colour blobs
- Iansui display / Noto Sans TC body / Source Serif 4 English / JetBrains Mono stamps, figures and codes
- Colour as meaning: right, wrong, caution, English
- Small terminal touches: `$` prompts, blinking cursors, status LEDs, process boxes
- Full light and dark themes, plus following the system setting

## Colors

The palette is cool, muted slate-and-fog with one warm accent, Seal Vermilion. The glass blobs add the only other saturated colour, and only as soft background light.

### Primary
- **Seal Vermilion**: the exam stamp. Used for the MIDTERM/kind badge, point badges, wrong-answer states, warning boxes, the selected item in the theme menu, and the hover state of primary actions and links. In dark mode it brightens to #ff7d5a.

### Secondary
- **Slate Ink**: the primary action and the English voice. Used for primary buttons, the active tab, English note boxes and their labels, table header text, focus outlines, list markers, and progress bars. In dark mode it becomes #9ba8ab, with dark text on it.
- **Pewter**: the Chinese-explanation voice. Used for Chinese note boxes (`.box.zh`), prompts, group-heading rules, and hover borders on answer options.

### Tertiary (state)
- **Pass Green**: correct answers, finished chapters ("terminated"), the synced LED. In dark mode it is #73d48f.
- **Amber Caution**: tip boxes, "running" status, syncing LED, star ratings. In dark mode it is #f2bd5a.

### Neutral
- **Night Ink**: body text, 1.5px ink borders, hard offset shadows, and the logo mark tile. 76% and 64% alpha versions are used for secondary text on light surfaces. In dark mode the muted text alpha is 80% (rgba(204,208,207,.8)), so it keeps at least 4.5:1 contrast on the dark Paper Shade.
- **Fog Board**: the page background behind the glass. In dark mode it is #11212d.
- **Dark-mode surface literals**: #11212d (Fog Board), #1c2e3b and #172835 (Paper and Paper Shade), #2f4352 and #4a5c6a (hairline and rule strong), and #ff7d5a (Seal Vermilion brightened). These are the intended dark palette, not stray colours.
- **Paper / Paper Shade**: solid surfaces under the glass. Paper Shade is used for options, inputs, and table headers. In dark mode they are #1c2e3b and #172835.
- **Hairline / Rule Strong**: cell borders, box borders, dotted heading rules, dashed stub edges. In dark mode they are #2f4352 and #4a5c6a.
- **Glass Film / Glass Edge**: the translucent pane fill and the bright one-pixel edge that makes the glass read as glass. In dark mode they are rgba(255,255,255,.07) and .16.

### Named Rules
**The Seal Is Rare Rule.** Vermilion is the stamp, not the ink. It marks the exam kind, points, mistakes, and hover. It never fills large areas or body copy.

**The Meaning-Only Rule.** Each tint means something: slate is English, pewter is Chinese, vermilion is warning or wrong, amber is tip or caution, green is right. Never use a tint for decoration.

**The Two Themes Rule.** Every token has a light and a dark value, and both ship. The dark values are defined in `assets/ezhome.css` and repeated in each subject page's inline style. A new colour without a dark value is incomplete.

## Typography

**Display Font:** Iansui (with DFKai-SB, BiauKai, Kaiti TC)
**Body Font:** Noto Sans TC (with PingFang TC, Microsoft JhengHei)
**English Font:** Source Serif 4 (with Georgia)
**Label/Mono Font:** JetBrains Mono (with Menlo, Consolas)

**Character:** Iansui titles look hand-lettered, like a notice written by an exam proctor. They sit over a clean sans for reading, a bookish serif for English textbook text, and a mono for anything that works like data. All fonts are self-hosted and subset by unicode-range (`assets/fonts/fonts.css`), so a page downloads only the Chinese glyphs it uses.

### Hierarchy
- **Display** (700, clamp(38px, 7vw, 58px), 1.15): the home hero heading only.
- **Headline** (700, 36px, 1.3): the page heading inside a section header (`.vhead`). Term headings on the home page use clamp(26px, 4vw, 34px).
- **Title** (700, 24px, 1.4): section headings (h3). A dotted rule extends from the heading to the edge. A Chinese subtitle (`.zhn`) wraps onto its own line beneath.
- **Body** (400, 16px, 1.8): Chinese and mixed reading text. Lead paragraphs are capped at 60ch.
- **English body** (400, 17px, 1.7): English passages in `.box.en`, set in Source Serif 4.
- **Label** (500–600, 11.5–13px, mono): box labels, ticket metadata (`dt`), stub date, badges, status lines. Tabs, the date line under the title and small tags (`.labtag`, `.hwtag`) are set in the body face, sentence case.

### Named Rules
**The Text Scale Rule.** Every reading size is written as `calc(Npx * var(--ts, 1))`. Chapter views, exam papers, and review set `--ts: 1.2`. Figures and chapter-end practice reset it to 1. Never hard-code a reading size without `--ts`.

**The Script Has a Job Rule.** Never set English textbook passages in the Chinese body face, and never set titles in mono. Each language and role keeps its own face.

**The Latin Apostrophe Rule.** ’ and ‘ are drawn with a Latin face (the `EZapos` font-face) so English contractions don't render full-width inside Chinese text.

## Layout

The layout is a single reading column. Subject pages cap `main` at 860px. The home page wrap is 960px, and the sticky top bar's inner row is 1000px. Side padding is `max(16px, env(safe-area-inset-*))` everywhere, and the top bar respects safe areas, because the site is installed as a PWA on phones and iPads.

- **Home:** subjects are a two-column grid (gap 44px × 24px) that becomes one column at 760px or narrower. Upcoming exams sort by date. Finished exams drop to 60% opacity and move into a collapsible "past" area.
- **Subject page:** a sticky 58px top bar holds the brand, a tab strip of plain words that scrolls sideways, the current chapter underlined in vermilion, and the theme button. Each view opens with a `.vhead`: the headline, a date line, a lead paragraph, and a process-status card on the right. Then come notes, boxes, tables, figures, and questions.
- **Side by side:** `.two`, `.three`, and `.four` are wrapping flex or auto-fit grids (minimum columns 260 / 200 / 180px), so they stack naturally on phones.
- **Breakpoints observed:** 520, 640, 760, 900px.
- **Rhythm:** boxes and tables keep 14px vertical margins. Sections open with 44px above the h3, and the bottom padding of `main` is 72–96px so the back-to-top button never covers content.

## Elevation & Depth

This is a hybrid of glass and offset shadows. Glass is the default surface: a translucent fill, `backdrop-filter: blur(16px)`, a 1px bright edge, and a soft ambient shadow. A pane nested inside another pane drops its blur and shadow and uses a lighter tint only, because blur stacked on blur costs a lot of GPU on long pages and adds nothing visible. Menus and the score bar use an almost solid glass (blur 24px, 93–95% fill) so the text underneath doesn't show through. Where `backdrop-filter` is unsupported, panes fall back to an 82% solid fill.

The noticeboard's hard offset shadows (`Npx Npx 0` in Night Ink) remain on small controls that the glass layer doesn't touch: the back-to-top button and the process-status card (with its ink header bar).

### Shadow Vocabulary
- **Glass ambient** (`0 10px 30px rgba(0,0,0,.06)`; dark mode .35): every glass pane at rest.
- **Glass lift** (`0 16px 40px rgba(0,0,0,.10)`; dark mode .45): ticket hover, together with `translateY(-3px)`.
- **Menu** (`0 6px 18px rgba(6,20,27,.12)`): popovers such as the theme menu.
- **Hard offset** (`3px 3px 0` to `5px 5px 0` Night Ink): noticeboard controls. On press it shrinks by 1px and the control moves 1px toward it.

### Named Rules
**Surfaces by Role.** Blurred glass is for things that float: the top bar, the exam toolbar, menus, tickets and the process card. Everything you read or answer in (note boxes, figures, tables, question cards, review cards, the next-step card) is a flat pane: the glass fill, a 1px `--line` border, 12px corners, no blur and no shadow. The 7-day plan is a ruled list, not a stack of cards.

**The One Blur Rule.** Only the outermost pane blurs. Anything nested inside it uses `--glass-bg-nested` with no blur and no shadow.

**The Glass Edge Rule.** A glass pane always has the 1px bright edge (`--glass-edge`). Without it the pane reads as a muddy grey box.

## Shapes

Glass panes (tickets, boxes, figures, tables, question cards, the exam toolbar) use soft 16px corners. Interactive controls (buttons, options, inputs, the theme button) use 8px. Tab strips are square inside, with 5px corners only at the outer ends. Badges use 4px. Status LEDs and option letters (A/B/C/D) are circles.

Recurring forms:
- **Ticket stub:** a dashed left edge, plus two notches cut into its top and bottom edges as half-circles (outlined glass arcs in the glass layer).
- **Box label tab:** a mono label tucked into the box's top-left corner with only its bottom-right corner rounded, like a file-folder tab.
- **Dotted heading rule:** h3 headings trail a dotted line to the edge of the column.
- **Borders:** ink borders are 1.5px on controls and dividers. Hairlines on glass are 1px.

## Components

### Buttons
Calm and precise; the colour appears on hover, not at rest.
- **Shape:** gently rounded (8px), 1.5px Night Ink border.
- **Default:** a paper-coloured fill with ink text, 14px/500, 7px × 16px padding. On hover it takes a faint slate tint.
- **Primary:** a Slate Ink fill with white text, 600. On hover it turns Seal Vermilion.
- **Disabled:** 55% opacity with the default cursor.
- **Focus:** a 2px Slate Ink outline with a 2px offset, on every interactive element.

### Tabs (subject top bar)
- A row of plain-word tabs (14px/500, body face), no boxes. The current chapter is ink and bold with a 3px vermilion underline; running or finished chapters show a 3px bar on top. Groups are split by a 1px hairline.
- **Active:** a Slate Ink fill with white text, `aria-current="true"`.
- **State bar:** a 3px bottom bar, amber while the chapter is "running" and green once it is "terminated".

### Cards / Containers
- **Ticket (home):** the signature component, described under Admission Ticket below.
- **Note boxes:** `.box` with a mono label tab. Variants: `en` (slate tint, Source Serif 17px), `zh` (pewter tint), `warn` (vermilion tint), `tip` (amber tint). Each tint is laid over glass, 16px corners, 14px × 18px padding.
- **Question / review cards:** glass panes. Collapsible answers (`.qa`) use a slate summary row with a chevron that rotates when opened.

### Answer Options
- An 8px-rounded row with a circular letter badge in Iansui. Before an answer is chosen it is a nested-glass fill with a glass edge, and on hover the border turns pewter.
- **Right:** a green tint and border, with the badge filled green. **Wrong:** a vermilion tint and border, with the badge filled vermilion.

### Inputs / Fields
- A mono 14px field, 1.5px Rule Strong border, Paper Shade fill, 8px corners.
- **Focus:** no outline. The border turns Slate Ink and a 3px slate glow ring appears.
- **Messages:** green for success and vermilion for errors, at 14px.

### Navigation
- **Brand:** the "EZ" mono tile, ink on board colour. On subject pages it has perforated tick marks on both sides.
- **Theme:** a 36px square button holding a system, light, or dark icon. It opens a solid-glass menu, and the checked item is shown in vermilion with a ✓.
- **Back to top:** a mono pill with a hard offset shadow that fades in after scrolling.

### Admission Ticket (signature)
- A two-column card. The main area holds a vermilion `MIDTERM` badge, an Iansui title (26px), the textbook and chapter range, a mono `dl` of Notes / Practice / Exams, and a mono "Start →" that turns vermilion on hover. The 104px stub on the right shows `EXAM`, the date in large slate mono, and the year.
- Glass fill, 16px corners. On hover it lifts by 3px with a glass-lift shadow.

### Process Status Card (signature)
- A 184px mono card with an ink header bar and dashed rows of label and value (tabular numbers). A status dot reads ready (slate), running (amber, blinking), or terminated (green), and a thin progress bar sits underneath.

## Do's and Don'ts

### Do:
- **Do** build new surfaces from glass panes (16px corners, `--glass-bg`, 1px `--glass-bd` edge, `--glass-sh`) on the fog board, and blur only the outermost pane.
- **Do** keep the noticeboard vocabulary for structure: ticket stubs, mono metadata, Iansui titles, dotted heading rules, `$` eyebrows.
- **Do** give every new colour a dark-theme value and test both themes plus the system setting.
- **Do** write reading sizes as `calc(Npx * var(--ts, 1))`.
- **Do** put English textbook text in Source Serif 4 inside a slate `en` box, and Chinese explanations in a pewter `zh` box.
- **Do** keep vermilion for stamps, mistakes, and hover only.

### Don't:
- **Don't** use colour decoratively. Every tint means right, wrong, caution, English, or Chinese.
- **Don't** stack blurred glass inside blurred glass.
- **Don't** drop the 1px bright glass edge or the `@supports` solid fallback.
- **Don't** set titles in mono or English passages in the Chinese sans.
- **Don't** let the background blobs become saturated or busy. They are soft light behind glass and never a focal point.
