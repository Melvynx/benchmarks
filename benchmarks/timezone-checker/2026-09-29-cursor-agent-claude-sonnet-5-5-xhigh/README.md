# Claude Sonnet 5.5 — timezone overlap checker

Find the hours when a distributed team is awake at the same time, or compare your own schedule against colleagues in other timezones.

React 19 + TypeScript + Vite + Tailwind CSS v4. No runtime dependencies beyond React, `lucide-react` icons and the Inter font.

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:9364
```

Other scripts: `pnpm build`, `pnpm preview` (also on 9364), `pnpm test`, `pnpm lint`, `pnpm typecheck`.

## How it works

- **Meeting mode** highlights the hours when *every* city is awake; all rows share the same window.
- **Base mode** compares the reference city (first row) with each other city independently.
- The grid has 24 columns, one per hour of the reference city's day. Each cell shows the local time in that city. Sleeping cells are hatched and faded, awake cells are sand, overlap cells are green.
- Click a city name to make it the reference. Removing the reference promotes the next city.
- Wake / sleep hours and 12h / 24h format live in **Settings**. Overnight windows (wake 22, sleep 6) work. Wake equal to sleep means awake all day.
- Everything is persisted to `localStorage` under `timezone-overlap:v1`; invalid stored data falls back to defaults field by field.
- Offsets come from `Intl.DateTimeFormat` at the current date, so DST and fractional offsets (India, Nepal) are correct. A column is judged awake by the local time at which it starts.
- Below 768px the grid is a separate layout: cities as columns, hours as rows, with pinned headers and a pinned reference column.

## Structure

```
src/
  data/cities.ts        catalog of 34 cities + search
  lib/timezone.ts       UTC offset from Intl
  lib/overlap.ts        pure awake / overlap / range maths (buildGrid)
  lib/format.ts         hour, range and offset formatting
  state/                reducer, validation, localStorage
  hooks/                useGrid, useNow, useMediaQuery
  components/           toolbar, picker, settings, summary, grid (desktop + mobile)
```
