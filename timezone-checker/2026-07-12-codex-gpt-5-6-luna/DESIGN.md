# Design direction

## Mood

An early-morning operations desk with violet status lights, a clean white planning sheet, and one bright green decision band.

## Color system

- `--bg`: `oklch(1 0 0)`
- `--surface`: `oklch(0.975 0.008 270)`
- `--ink`: `oklch(0.23 0.035 270)`
- `--muted`: `oklch(0.48 0.03 270)`
- `--primary`: `oklch(0.42 0.15 270)`
- `--primary-strong`: `oklch(0.27 0.1 270)`
- `--overlap`: `oklch(0.76 0.15 150)`
- `--warning`: `oklch(0.68 0.16 55)`

## Typography

Use the system sans stack for product familiarity, with tabular numerals for hour values. Headings are compact and weighted, labels are sentence case, and the grid uses a clear monospace treatment for time values.

## Layout

Desktop uses an app header, a two-column planning area, and a dense horizontal grid. Mobile replaces the desktop grid with a true rotated table: cities are columns and hours are rows. Panels use a 14px radius, thin borders, and no decorative shadows.

## Interaction

Mode toggles are segmented controls. City search is inline and keyboard friendly. The settings panel stays visible on desktop and becomes a compact control panel on mobile. Overlap cells use both a green fill and a stronger border/text treatment.
