# Design System

## Intent

A product designer working late in a dim studio needs the surrounding interface to disappear while bright artboards, precise geometry, and state feedback remain unmistakable. The visual strategy is restrained: neutral near-black architecture, one cobalt brand anchor, magenta only for geometric guides, and semantic colors only for status.

## Theme

Dark, compact, high-contrast product UI. Panels use small luminance steps rather than decorative borders. Canvas space is darker than the shell so white frames read like physical artboards. Corners are modest, shadows are local and functional, and transitions communicate state within 150–200ms.

## Color

All authored colors use OKLCH.

```css
:root {
  --bg: oklch(0.095 0 0);
  --surface: oklch(0.135 0.006 260);
  --surface-raised: oklch(0.17 0.009 260);
  --surface-hover: oklch(0.205 0.012 260);
  --ink: oklch(0.96 0.006 260);
  --muted: oklch(0.69 0.018 260);
  --subtle: oklch(0.5 0.018 260);
  --primary: oklch(0.62 0.18 260);
  --primary-strong: oklch(0.53 0.19 260);
  --accent: oklch(0.69 0.22 342);
  --success: oklch(0.72 0.16 151);
  --warning: oklch(0.8 0.16 80);
  --danger: oklch(0.66 0.2 28);
  --canvas: oklch(0.16 0.006 260);
  --divider: oklch(1 0 0 / 0.08);
  --focus: oklch(0.72 0.16 260);
}
```

White text is used on saturated primary and accent fills. Muted text meets application-chrome contrast requirements on every panel surface.

## Typography

- UI and controls: Inter, system-ui, sans-serif.
- Canvas text choices: Inter, Roboto, Poppins, Playfair Display, JetBrains Mono, and Space Grotesk.
- 11px metadata, 12px labels, 13px controls and body, 14px section titles.
- Tabular figures for coordinates, dimensions, zoom, opacity, and status counters.
- Weight 450–550 for labels, 600 for active controls, 400 for metadata.

## Layout

- Header: 48px, stable global controls and centered tool group.
- Left panel: 248px default, resizable in a future iteration; pages and searchable layer tree.
- Right panel: 272px default, property sections with two-column numeric controls.
- Bottom status bar: 28px, cursor coordinates, selection count, history and autosave state.
- Canvas fills remaining space and owns all pan/zoom gestures.
- Below 980px, properties collapse into an overlay; below 720px, layers collapse too.

## Components

- Icon buttons: 32px visible control with a 40px interaction target, 7px radius, tooltip and shortcut.
- Text/numeric fields: 28px height, 6px radius, neutral resting surface, clear hover/focus/error states.
- Section headers: 32px, sentence case, disclosure affordance, no decorative eyebrows.
- Menus/popovers: raised neutral surface, 8px radius, crisp local shadow, keyboard roving focus.
- Toasts: compact status plus action, never modal for routine feedback.
- Selection handles: white fill, cobalt outline, constant screen-space size.
- Smart guides: magenta lines and distance badges with a dark legible backing.

## Motion

- Hover/focus/selection: 120–160ms ease-out.
- Panels/popovers: 180ms opacity and translate only.
- Press feedback: scale to 0.96 when appropriate.
- Canvas geometry tracks pointer input directly with requestAnimationFrame; no decorative interpolation.
- Reduced motion removes translate and scale while preserving immediate opacity and state changes.

## Interaction States

Every control defines default, hover, focus-visible, active, disabled, and error states. Autosave exposes saving, saved, and failed states. Destructive operations remain undoable and announce the affected layer count. Empty search results explain how to recover. Unsupported imports report a reason instead of failing silently.
