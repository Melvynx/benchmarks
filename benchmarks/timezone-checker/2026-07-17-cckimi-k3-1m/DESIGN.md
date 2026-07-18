# Design

## Theme

Dark-only instrument panel. Near-black green-tinted ink surface, one semantic
green accent, generous radius on cards (18px), tight radius on cells (7px).

## Color

| Token | Value | Role |
| --- | --- | --- |
| `--color-ink` | `#090d0c` | Body background |
| `--color-panel` | `#0f1614` | Sticky surfaces (mobile gutter, popover base) |
| `--color-paper` | `#e9f2ec` | Primary text |
| `--color-fog` | `#8ba094` | Secondary text, labels |
| `--color-leaf` | `#3ddc97` | Overlap accent, REF badge, current hour. Semantic: overlap only |
| `--color-warn` | `#fbbf24` | Zero-overlap warnings |

White-alpha layers (`rgba(255,255,255, .014–.11)`) build card fills and borders.
Blue (`#93c5fd`) appears only in the "overnight" chip.

## Typography

- Sans: Inter Variable — labels, body, headings.
- Mono: JetBrains Mono Variable — every number (hours, offsets, ranges, counts).
- Scale is compact product UI: 9–14px labels, 19px h1, 30px count in summary.

## Components

- `.card` — gradient white-alpha fill, 1px white/7% border, 18px radius, inset highlight.
- `.seg` — segmented control (mode toggle, 12h/24h).
- `.cell` — 42px hour cell; states: `cell-asleep` (hatched), `cell-awake` (white/5.5%),
  `cell-overlap` (green gradient + inner ring). `cell-sm` = 28px mobile variant.
- `.range-badge` / `.warn-chip` / `.chip` / `.offset-pill` / `.ref-badge` — pills.
- `.popover` + `.combo-*` — searchable city combobox.
- `.mini-strip` — 24-segment sparkline of the overlap day.

## Motion

- `cell-in`: 350ms rise+fade on grid rows, 45ms stagger per row.
- `pulse-dot`: 2s opacity pulse on the current-hour dot.
- Control transitions 150ms.

## Layout

- Max width 80rem (`max-w-7xl`), single column: header → settings → summary → grid card.
- Desktop grid: `minmax(180px,220px) + 24 × 1fr + 34px`, min-width 1050px, h-scroll.
- Mobile (<768px): transposed grid, sticky hour gutter, cities as columns.
