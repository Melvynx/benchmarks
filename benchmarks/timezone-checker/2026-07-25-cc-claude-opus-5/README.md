# Timezone Overlap Checker

Find the hours a distributed team actually shares. Pick cities from a curated
catalog, set the awake window you keep, and read the overlap straight off a
24-column grid anchored to your reference city.

```bash
pnpm install
pnpm dev     # http://localhost:9218
```

`pnpm test` runs the timezone and overlap unit tests, `pnpm build` typechecks
and bundles, `pnpm lint` runs Oxlint.

## Two modes

- **Meeting** — the hours when *every* city on the board is awake at once. One
  shared window, highlighted identically in every row.
- **Base** — each city measured against the reference city alone. Rows light up
  independently, which is what you want when you work with several people who
  never need to meet each other.

## How it works

- `src/data/cities.ts` — the closed catalog (36 cities, every major region and
  every inhabited UTC offset, fractional ones included).
- `src/lib/time.ts` — UTC offsets derived by formatting a real instant into each
  IANA zone, so DST and half-hour offsets fall out for free.
- `src/lib/overlap.ts` — pure projection of every city onto the reference city's
  day, plus the sleeping / awake / overlap resolution for each mode. All of the
  logic worth testing lives here and nothing in it touches React.
- `src/components/` — presentation only. Desktop (cities as rows) and mobile
  (cities as columns) are two separate trees, not one grid fighting a media
  query; the breakpoint is resolved in JS so only one mounts.
- `src/state/app-state.ts` — reducer plus a localStorage codec that sanitizes
  what it reads back, so a stale or hand-edited payload degrades to defaults.

Ranges are half-open: `9am — 12pm` means hours 9, 10 and 11. Windows that
straddle midnight are merged into one range; non-contiguous windows stay
separate badges.
