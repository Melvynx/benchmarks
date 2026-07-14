---
name: Thumbfa.st
description: Create stunning AI-powered YouTube thumbnails in seconds
colors:
  primary: "oklch(0.628 0.258 29.23)"
  primary-foreground: "oklch(1 0 0)"
  background: "oklch(1 0 0)"
  foreground: "oklch(0.2 0 0)"
  card: "oklch(0.985 0 0)"
  secondary: "oklch(0.96 0 0)"
  secondary-foreground: "oklch(0.2 0 0)"
  muted: "oklch(0.96 0 0)"
  muted-foreground: "oklch(0.45 0 0)"
  accent: "oklch(0.95 0.02 29.23)"
  accent-foreground: "oklch(0.628 0.258 29.23)"
  destructive: "oklch(0.628 0.258 29.23)"
  border: "oklch(0.92 0 0)"
  input: "oklch(0.92 0 0)"
  ring: "oklch(0.628 0.258 29.23)"
  success: "hsl(151 55% 41%)"
  warning: "hsl(24 94% 50%)"
  info: "hsl(221.2 83.2% 53.3%)"
  dark-background: "oklch(0.13 0 0)"
  dark-card: "oklch(0.18 0 0)"
  dark-foreground: "oklch(0.95 0 0)"
  dark-border: "oklch(0.28 0 0)"
  mention-person: "oklch(0.55 0.2 290)"
  mention-inspiration: "oklch(0.6 0.17 160)"
  mention-image: "oklch(0.7 0.18 70)"
typography:
  display:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Inter, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.75
  label:
    fontFamily: "Inter, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "2px"
  md: "4px"
  lg: "6px"
  xl: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.secondary-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-ghost:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  badge-default:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  badge-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "24px"
---

# Design System: Thumbfa.st

## 1. Overview

**Creative North Star: "The Cutting Room"**

Thumbfa.st is a fast editing bench, not a showroom. The interface is neutral, focused, and built for batch work: a creator processes a queue of videos and ships thumbnails in minutes. Surfaces stay near-monochrome on purpose. The only saturated thing that belongs on screen is the creator's own output (the thumbnails) and the one decisive red the brand owns. Everything else is bench, clamp, and ruler.

Red is the record light. It marks the live action (the primary button, the current selection, the focus ring) and the single destructive cut (delete). It is never wallpaper. Outside those two jobs the system runs on white, near-black ink, and three steps of warm-neutral gray. Density lives where data matters (admin tables, generation grids, stat rows); calm lives everywhere else (forms, dialogs, empty states). The tool should disappear into the task and let the work be the loud thing.

This system explicitly rejects the over-decorated SaaS dashboard: no gradients, no glassmorphism, no glowing hero-metric cards, no purple-gradient "AI tool" sparkle aesthetic, and no marketing tone inside the product or admin. shadcn tokens are the source of truth; a screen that reaches for a hardcoded color or a one-off card variant is wrong before it is ugly.

**Key Characteristics:**
- Near-monochrome chrome so colorful thumbnail output is the only loud element.
- One brand red, scarce by doctrine, for primary actions, selection, focus, and true destruction only.
- Token-driven semantic color; never hardcoded hex.
- Dense where data matters, calm everywhere else.
- Light and dark themes, both shipped from the same OKLCH token set.
- Lucide icons only. No emojis. No gradients.

## 2. Colors

A grayscale workbench with one red tool and a small set of semantic states. Color carries meaning here; it never decorates.

### Primary
- **Record Red** (`oklch(0.628 0.258 29.23)`, brand `#FF0000`): The single brand accent (YouTube red). Reserved for primary buttons, the current selection, state indicators, and the focus ring. It also serves as `destructive`; see the Two Jobs Rule below. Paired with white text (`primary-foreground`, `oklch(1 0 0)`).
- **Red Wash** (`accent`, `oklch(0.95 0.02 29.23)`): A barely-tinted red used for hover/selected backgrounds where solid red would shout. Its foreground is Record Red itself.

### Neutral
- **Paper White** (`background`, `oklch(1 0 0)`): The base content surface in light mode.
- **Card Off-White** (`card`, `oklch(0.985 0 0)`): A half-step down from Paper White to lift cards and panels without a shadow.
- **Ink** (`foreground`, `oklch(0.2 0 0)`): Near-black for all primary text. Not pure black, so it reads calm rather than harsh.
- **Bench Gray** (`secondary` / `muted`, `oklch(0.96 0 0)`): The second neutral layer for toolbars, secondary buttons, and quiet fills.
- **Muted Ink** (`muted-foreground`, `oklch(0.45 0 0)`): Secondary text, captions, table meta. Holds ~4.5:1 on white; never go lighter for body text.
- **Rule Line** (`border` / `input`, `oklch(0.92 0 0)`): Hairline borders and dividers. Depth comes from this line, not from shadow.
- **Dark Bench** (`dark-background` `oklch(0.13 0 0)`, `dark-card` `oklch(0.18 0 0)`, `dark-border` `oklch(0.28 0 0)`): The dark-mode counterparts. Same red, same semantics, inverted neutrals.

### Tertiary (semantic states)
- **Signal Green** (`success`, `hsl(151 55% 41%)`): Success, active, completed, approved, succeeded.
- **Signal Amber** (`warning`, `hsl(24 94% 50%)`): Warnings and at-risk states.
- **Signal Blue** (`info`, `hsl(221.2 83.2% 53.3%)`): Informational callouts only. Never used as a generic UI accent.

### Signature (agent mentions)
- **Mention Violet** (`oklch(0.55 0.2 290)`): `@person` tags in the prompt/agent editor.
- **Mention Green** (`oklch(0.6 0.17 160)`): `@inspiration` tags.
- **Mention Amber** (`oklch(0.7 0.18 70)`): `@image` tags.
Each renders as a low-chroma tinted pill (15% bg, 25% border) so mentions read inline without competing with the red.

### Named Rules
**The Two Jobs Rule.** Record Red has exactly two jobs: the primary action and the one destructive action. The overlap is intentional scarcity, not an accident. If red shows up for anything else (a decorative heading, a non-primary CTA, a chart fill, an icon for flavor), it is wrong. Scarcity is what makes the red mean "act now" or "this deletes."

**The No-Blue-Default Rule.** `info` blue exists for informational states only. The generic accent of this system is red, and the neutral of this system is gray. Reaching for `blue-*`, `sky-*`, `cyan-*`, or `indigo-*` as a "default accent" is forbidden; those families do not belong to the theme.

## 3. Typography

**Display / Body Font:** Inter (fallback `sans-serif`)
**Serif Font:** Source Serif 4 (fallback `serif`) — long-form prose surfaces only
**Label / Mono Font:** JetBrains Mono (fallback `monospace`) — IDs, tokens, code, numeric data

**Character:** One workhorse sans (Inter) carries headings, labels, buttons, body, and data. The pairing is deliberately quiet: contrast comes from weight and size, not from competing typefaces. Mono appears only where character-precision matters (org IDs, credit counts, code). Serif is held in reserve for genuine long-form reading.

### Hierarchy
- **Display** (Inter 800, `text-4xl`→`text-5xl` at lg, line-height ~1.1, `-0.02em`): Page-level h1 in prose/marketing-adjacent surfaces. Inside the product, page titles sit lower (see Title).
- **Headline** (Inter 600, `text-3xl`/`text-2xl`, tracking-tight): Section headings; h2 carries a bottom hairline border in prose.
- **Title** (Inter 600, `text-2xl`/`text-lg`): Card titles and admin page headers (`text-2xl font-semibold tracking-tight`).
- **Body** (Inter 400, `text-sm`–`text-base`, line-height 1.75): Default reading text. Prose capped at 65ch; dense tables and panels may run wider.
- **Label** (Inter 500, `text-xs`): Stat-card titles, table meta, badges. Sentence case by default; reserve uppercase for ≤4-word labels.

### Named Rules
**The One Family Rule.** Inter does the work. Do not introduce a second sans, a display face, or a "brand font" for product or admin UI. Hierarchy is weight (400/500/600/800) and size, not a new typeface.

**The Mono-for-Data Rule.** Use JetBrains Mono only for machine values: IDs, tokens, credit counts, code. Never set body copy or labels in mono for flavor.

## 4. Elevation

Near-flat by default. Depth is drawn with the **Rule Line** (`border` at `oklch(0.92 0 0)`) and a half-step surface change (`card` off-white above `background` white), not with shadow. Shadows exist but are deliberately faint and low-opacity; they confirm interactivity, they do not float UI.

### Shadow Vocabulary
- **`shadow-xs`** (`0 1px 3px rgba(0,0,0,0.05)`): Default for buttons, badges, inputs. Just enough to separate a control from its surface.
- **`shadow-sm`** (`0 1px 3px rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)`): Cards and panels at rest.
- **`shadow-md` / `lg` / `xl`**: Reserved for transient layers (popovers, dropdowns, dialogs). Never on a resting card.

### Named Rules
**The Hairline-Before-Shadow Rule.** When you need to separate two surfaces, reach for a 1px border or a tonal step (white vs. off-white) before reaching for a shadow. If a 2014-era drop shadow appears under a card, it is too dark and the blur is too small; delete it and use the border.

## 5. Components

Refined and restrained. Tight radii, hairline borders, near-invisible shadows, and state shown through subtle tint shifts rather than heavy presses. Every interactive component ships all of: default, hover, focus-visible, active, disabled, and (where async) loading.

### Buttons
- **Shape:** Gently rounded (`rounded-md`, 4px). Heights are fixed by size: `sm` 32px, default 36px, `lg` 40px; icon buttons are square (32/36/40px).
- **Primary:** Record Red fill, white text, `shadow-xs`. Hover drops to `primary/90`. Focus shows a red ring.
- **Outline / Outline-filled:** White (or `input/30` in dark) with a hairline border; hover fills with `accent` and shifts text to `accent-foreground`.
- **Secondary:** Bench Gray fill, ink text; hover `secondary/80`.
- **Ghost:** Transparent; hover fills with `accent`. The default for low-emphasis row actions.
- **Destructive:** Record Red fill, white text (shares the primary color by the Two Jobs Rule). Reserve for irreversible actions only.
- **Semantic (success / warning / invert / link):** Available but rare; use only when the state genuinely calls for it.
- **Disabled:** `opacity-50`, pointer-events off. **Loading:** in-button spinner, never a layout-shifting swap.

### Badges
- **Shape:** `rounded-md` (4px), `px-2 py-0.5`, `text-xs font-medium`, transparent border on filled variants.
- **Variants:** `default` (red), `secondary` (gray), `destructive` (red), `outline` (ink text, hover accent).
- **Status mapping:** active/completed/approved/succeeded → `default`; failed/banned → `destructive`; everything else → `outline`. Use the shared `StatusBadge`; never hand-roll a status pill.

### Cards / Containers
- **Corner Style:** `rounded-xl` (10px) — the one place the system rounds more generously.
- **Background:** Card Off-White (`card`) over the page white; ink text.
- **Shadow Strategy:** `shadow-sm` at rest (see Elevation). No nested cards, ever.
- **Border:** 1px Rule Line.
- **Internal Padding:** 24px (`py-6 px-6`), 6-unit gap between sections.

### Inputs / Fields
- **Style:** Transparent fill, 1px `input` border, `rounded-md` (4px), 36px tall, `shadow-xs`.
- **Focus:** Border shifts to `ring` and a 3px `ring/50` halo appears (`focus-visible:ring-[3px]`).
- **Error:** `aria-invalid` adds a `destructive` ring and border. **Disabled:** `opacity-50`, no pointer.
- **Placeholder:** `muted-foreground` — meets contrast; do not lighten it for "elegance."

### Navigation / Admin shell
- **Sidebar** uses its own neutral layer (`sidebar` tokens) one step off the content surface.
- **Admin surfaces** are built only from the shared kit in `src/routes/admin/_components/admin-shared.tsx`: `AdminPageHeader`, `AdminStatCard`, `AdminTable` (with skeleton + empty states baked in), `AdminSearch`, `AdminPagination`, `StatusBadge`. Never fork a one-off table, stat card, or pagination.

### Signature — Mention pills (agent editor)
Inline tinted pills inside the TipTap prompt editor: `@person` violet, `@inspiration` green, `@image` amber. Low chroma (15% bg / 25% border) so multiple mentions in a sentence stay legible and never fight the red.

## 6. Do's and Don'ts

### Do:
- **Do** treat shadcn semantic tokens as the source of truth (`primary`, `secondary`, `muted`, `accent`, `success`, `warning`, `destructive`, `border`). Use the variant, not a hardcoded color.
- **Do** keep Record Red scarce — primary action and true destruction only (the Two Jobs Rule).
- **Do** build admin/data surfaces from the shared `admin-shared.tsx` kit; one vocabulary across every screen.
- **Do** ship a skeleton that mirrors the real layout for every async surface, and an empty state that teaches the interface rather than saying "nothing here."
- **Do** put edits in dialogs (`dialogManager` + TanStack Form) and keep reading inline and dense.
- **Do** separate surfaces with a 1px Rule Line or a tonal step before reaching for a shadow.
- **Do** use Lucide icons and `aria-label` every icon-only button.

### Don't:
- **Don't** use gradients or glassmorphism anywhere. No glowing hero-metric cards.
- **Don't** ship the generic AI-tool look: purple gradients, sparkle icons, neon accents.
- **Don't** use marketing tone or hype language inside the product or admin.
- **Don't** introduce `blue-*`, `sky-*`, `cyan-*`, or `indigo-*` as a generic accent; the accent is red, the neutral is gray (the No-Blue-Default Rule).
- **Don't** use Record Red for decoration, headings, chart fills, or non-primary CTAs.
- **Don't** nest cards, fork a one-off admin component, or hand-roll a status badge.
- **Don't** use a `border-left`/`border-right` greater than 1px as a colored accent stripe.
- **Don't** lighten `muted-foreground` or placeholder text below ~4.5:1 for "elegance."
- **Don't** use emojis in the UI; use a Lucide icon.
