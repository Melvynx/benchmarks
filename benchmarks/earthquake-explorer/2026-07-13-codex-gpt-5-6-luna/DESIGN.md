# Design System

## Direction

Dark field station at 02:00, a researcher reading a cool monitor in a quiet room while a single amber trace marks the newest signal. The surface stays nearly black so the data marks, paper-like labels, and coastline lines carry the atmosphere.

## Color

Use OKLCH tokens. The palette is restrained, with cold cobalt for interaction, pale mineral ink for text, and amber for live seismic signals and caution.

- `--ink`: `oklch(0.93 0.025 100)`
- `--ink-muted`: `oklch(0.70 0.035 100)`
- `--ink-dim`: `oklch(0.51 0.035 100)`
- `--bg`: `oklch(0.12 0.012 145)`
- `--surface`: `oklch(0.16 0.015 145)`
- `--surface-raised`: `oklch(0.20 0.018 145)`
- `--line`: `oklch(0.30 0.022 145)`
- `--line-strong`: `oklch(0.42 0.035 145)`
- `--primary`: `oklch(0.55 0.105 230)`
- `--primary-soft`: `oklch(0.38 0.075 230)`
- `--signal`: `oklch(0.78 0.16 78)`
- `--signal-hot`: `oklch(0.68 0.18 45)`
- `--good`: `oklch(0.73 0.13 150)`
- `--bad`: `oklch(0.70 0.15 25)`

## Typography

Use `Inter`, `ui-sans-serif`, `system-ui`, sans-serif for the product UI. Use `ui-monospace`, `SFMono-Regular`, monospace for coordinates, timestamps, and small instrument readouts. Product type is compact and fixed-scale: 12px labels, 13-14px metadata, 15px body, 18-22px section headings, 38-52px event magnitude readouts.

## Shape and Layout

Use 10px panel radii, 6px controls, 999px status pills. Borders are quiet and structural. Avoid decorative shadows; use one subtle inset border and small elevation only where a layer must separate. Desktop composition is a wide map, a narrow live stream, and a contextual record panel. Mobile composition is map, time scrubber, filter drawer, stream, then record detail.

## Motion

Use 160-220ms ease-out transitions for selection, panel reveal, and status changes. The newest event may use a slow, low-contrast pulse, but no content should depend on animation. Reduce all motion to instant state changes under `prefers-reduced-motion: reduce`.
