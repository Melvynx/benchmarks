# Design System

## Visual Theme

Harbor chart table at dusk. Cool cobalt instruments on pure white paper. Overlap hours are lit viridian windows. Sleeping hours recede. No cream, no neon.

## Colors

Strategy: Restrained. Primary (cobalt, seed hue 230) for chrome and REF. Accent/overlap is viridian. Surface stays pure white so the green band is the only saturated object.

```css
--bg: oklch(1 0 0);
--surface: oklch(0.965 0.012 230);
--ink: oklch(0.22 0.032 230);
--muted: oklch(0.42 0.03 230);
--primary: oklch(0.45 0.086 230);
--primary-fg: oklch(0.99 0.01 230);
--overlap: oklch(0.88 0.11 155);
--overlap-ink: oklch(0.28 0.09 155);
--warning: oklch(0.5 0.12 55);
```

## Typography

IBM Plex Sans for UI. IBM Plex Mono, tabular, for hour cells. Fixed rem scale. Heading is the model name only.

## Components

Segmented mode control, native hour selects, combobox city picker, 24-cell grid (desktop rows / mobile columns as two layouts), range badges, REF pill.

## Layout

Desktop ≥768: city rows, hour columns. Mobile <768: city columns, hour rows. Toolbar, summary, grid, hint. Spacing on a 4px scale.
