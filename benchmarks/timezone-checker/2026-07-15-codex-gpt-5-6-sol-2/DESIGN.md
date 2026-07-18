---
name: GPT-5.6 Sol
description: A precise, daylight timezone overlap workspace for distributed teams.
colors:
  primary: "oklch(0.625 0.19 43)"
  primary-deep: "oklch(0.515 0.175 39)"
  primary-soft: "oklch(0.94 0.04 43)"
  background: "oklch(1 0 0)"
  surface: "oklch(0.972 0.006 43)"
  ink: "oklch(0.225 0.025 38)"
  muted: "oklch(0.535 0.018 38)"
  border: "oklch(0.885 0.012 43)"
  overlap: "oklch(0.495 0.145 147)"
  overlap-background: "oklch(0.885 0.095 147)"
  warning-background: "oklch(0.95 0.048 78)"
typography:
  display:
    fontFamily: "Avenir Next, Avenir, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 720
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Avenir Next, Avenir, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "0.82rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Avenir Next, Avenir, Segoe UI, Helvetica, Arial, sans-serif"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  sm: "8px"
  md: "12px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "9px 16px"
    height: "62px"
  button-secondary:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 16px"
    height: "62px"
  overlap-cell:
    backgroundColor: "{colors.overlap-background}"
    textColor: "{colors.overlap}"
    rounded: "0px"
---

# Design System: GPT-5.6 Sol

## 1. Overview

**Creative North Star: "The Shared Dayline"**

One reference day runs through every city, like a precise line passed between teammates. The interface stays bright and restrained so the aligned hours carry the visual weight. Burnt orange identifies decisions and controls; green has one job only: shared availability.

The system is compact without becoming cryptic. Borders establish alignment, tonal surfaces distinguish sleep from wake, and state markers reinforce color. It explicitly rejects ornamental world clocks, dense enterprise scheduling software, generic card-heavy SaaS layouts, dark mission-control styling, and prototype grids that require interpretation before use.

**Key Characteristics:**

- Exact row and column alignment
- Restrained daylight surfaces
- Burnt-orange control vocabulary
- Green reserved for overlap
- Structural mobile transposition at 768px

## 2. Colors

The palette uses true white as architecture, a warm primary for decisions, and a separate green semantic channel for successful overlap.

### Primary

- **Burnt Signal:** The primary token marks selected controls, add actions, focus, and the reference city.
- **Deep Signal:** The deep primary carries white text on filled actions and badges.
- **Signal Wash:** The soft primary marks hover and reference context without becoming decorative.

### Secondary

- **Overlap Green:** Reserved for hours when the active comparison qualifies. It never decorates unrelated controls.
- **Overlap Field:** A pale fill that preserves dark, readable hour labels while forming continuous bands.

### Neutral

- **True White:** The main canvas and awake cells.
- **Daylight Surface:** Sleeping cells, toolbar wells, and supporting rows.
- **Warm Ink:** Primary copy and grid data.
- **Muted Ink:** Secondary labels and offsets.
- **Soft Rule:** The one-pixel alignment system.

**The Green Means Go Rule.** Green is forbidden unless a time cell or range represents actual overlap.

## 3. Typography

**Display Font:** Avenir Next (with system sans fallbacks)  
**Body Font:** Avenir Next (with system sans fallbacks)  
**Label Font:** Avenir Next (with system sans fallbacks)

**Character:** One humanist sans family keeps the workspace familiar and efficient. Weight, spacing, and tabular numerals create hierarchy without introducing a second visual voice.

### Hierarchy

- **Display** (720, 1.75rem, 1.1): The model-name heading only.
- **Headline** (700, 1.18rem, 1.2): Empty states and compact result headings.
- **Title** (700, 0.88rem, 1.2): City names, summary outcomes, and panel titles.
- **Body** (500, 0.82rem, 1.5): Supporting instructions, capped near 65 characters where prose appears.
- **Label** (700, 0.72rem, 1.2): Controls, offsets, and summary metadata. Short status labels may use uppercase.

**The Alignment Rule.** Every time, offset, count, and range uses tabular numerals.

## 4. Elevation

The system is flat by default. One-pixel rules and tonal surfaces establish structure. Elevation appears only for floating pickers and the selected segment, using a compact `0 6px 8px oklch(0.26 0.035 40 / 0.14)` popover shadow and a smaller selected-control shadow.

### Shadow Vocabulary

- **Popover lift** (`box-shadow: 0 6px 8px oklch(0.26 0.035 40 / 0.14)`): Search and settings panels only.
- **Selected segment** (`box-shadow: 0 2px 6px oklch(0.28 0.03 40 / 0.12)`): The active mode within its shared well.

**The Flat-Until-Floating Rule.** Static content never receives a decorative drop shadow.

## 5. Components

### Buttons

- **Shape:** Gently curved controls using the medium radius.
- **Primary:** Deep Signal with white text, a strong border, and a minimum 44px target.
- **Hover / Focus:** Primary brightens; focus uses a visible translucent Signal ring.
- **Secondary:** True White with a strong neutral border; hover moves to Signal Wash.

### Chips

- **Style:** Range badges use Overlap Field with dark green text; REF uses Deep Signal with white text.
- **State:** Chips communicate facts, never behave like hidden buttons.

### Cards / Containers

- **Corner Style:** Large radius, capped at 14px.
- **Background:** True White or Daylight Surface according to hierarchy.
- **Shadow Strategy:** Flat; see Elevation.
- **Border:** One-pixel Soft Rule.
- **Internal Padding:** Usually the medium spacing token.

### Inputs / Fields

- **Style:** Daylight Surface, medium-neutral stroke, and small radius.
- **Focus:** White fill plus Signal border and focus ring.
- **Error / Disabled:** Disabled options remain visible with an explicit Added label.

### Navigation

The two-mode segmented control uses familiar pressed-button semantics. The selected mode becomes white inside a tinted well; no bespoke navigation gestures are introduced.

### Time Matrix

Sleeping cells use the surface tone, muted type, and a small dot. Awake cells use white and regular ink. Overlap cells use the green field, heavy type, inset horizontal rules, and a dark state dot. Desktop presents cities as rows; mobile renders a separate transposed grid with cities as columns.

## 6. Do's and Don'ts

### Do:

- **Do** preserve one shared template for all 24 desktop columns.
- **Do** reserve green for qualifying overlap states and range badges.
- **Do** keep every local time visible, including half-hour and quarter-hour offsets.
- **Do** transpose the information architecture below 768px instead of squeezing desktop rows.
- **Do** maintain 44px interaction targets and visible keyboard focus.

### Don't:

- **Don't** build an ornamental world-clock dashboard.
- **Don't** imitate dense enterprise scheduling software.
- **Don't** introduce a generic card-heavy SaaS layout.
- **Don't** use dark mission-control styling.
- **Don't** ship a prototype-like grid that requires a legend before alignment makes sense.
- **Don't** add decorative green, gradient text, glass panels, or oversized rounded cards.
