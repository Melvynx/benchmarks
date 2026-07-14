# Design system

## Product

Seismic Observatory is a dark, quiet field station for reading live earthquake activity. It borrows the composure of geologic instruments, contour maps, and annotated field notebooks, then applies that language to a contemporary data product.

## Color

Use OKLCH tokens only. The surface is near-black with a subtle blue-green cast so light map tiles and olive signal accents carry the visual hierarchy. Olive is reserved for active controls, measured event strength, and selection. Ember, gold, and blue carry alert, tsunami, and informational semantics.

```css
--bg: oklch(0.17 0.026 176)
--surface: oklch(0.215 0.028 176)
--surface-2: oklch(0.255 0.034 176)
--surface-3: oklch(0.305 0.038 176)
--line: oklch(0.40 0.030 176 / 0.42)
--ink: oklch(0.95 0.015 105)
--muted: oklch(0.75 0.026 176)
--dim: oklch(0.62 0.028 176)
--primary: oklch(0.72 0.13 108)
--primary-strong: oklch(0.82 0.14 108)
--accent: oklch(0.72 0.15 52)
--danger: oklch(0.70 0.17 28)
--info: oklch(0.77 0.11 215)
--warning: oklch(0.78 0.14 85)
```

## Typography

Use a system sans for interface copy and a system monospace for measurements, timestamps, coordinates, and API metadata. UI type is compact and steady, with readable line-height and weight contrast rather than oversized display typography. Labels use sentence case; short data headings may use restrained uppercase tracking.

## Layout

Desktop is a field instrument: a narrow filter rail, dominant map stage, and evidence rail share one viewport. The timeline spans the full content width beneath that instrument. Mobile turns the composition into a reachable sequence: top context and period controls, map first, timeline second, event stream third, with filters and detail revealed inline or as an anchored bottom sheet.

## Components

Use 10-14px radii, quiet full borders, compact controls with strong focus rings, olive selection, and semantic status chips with text labels. Avoid decorative cards. The signature connected seismic timeline uses real event bins, selection highlighting, and an active time-window label. Leaflet supplies the geographic basemap and map navigation; marker size encodes magnitude, label shape encodes cluster count, and list/detail provide the accessible equivalent.

## Motion

Keep transitions between 150 and 220ms and use them for state changes: refresh status, selected event reveal, marker emphasis, and mobile sheet movement. Reduced motion collapses the transitions to instant state changes. Never hide essential content behind an entrance animation.
