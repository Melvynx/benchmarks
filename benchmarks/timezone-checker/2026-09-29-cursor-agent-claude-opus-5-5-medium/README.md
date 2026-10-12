# Timezone overlap checker

Find the hours when everyone across timezones is awake.

```bash
pnpm install
pnpm dev        # http://localhost:9367
```

Other scripts: `pnpm build`, `pnpm preview`, `pnpm typecheck`, `pnpm test`.

## Stack

Vite + React 19 + TypeScript, plain CSS with design tokens, Vitest for the time math. No runtime dependencies beyond React and the Inter font.

## Structure

```
src/
  lib/time.ts        offsets via Intl (DST + :30/:45 zones), formatting, awake checks
  lib/grid.ts        pure grid/overlap model for meeting and base modes
  lib/cities.ts      34-city catalog + accent-insensitive search
  state/useAppState  reducer + localStorage persistence (validated on load)
  components/        controls, city picker, summary, legend
  components/grid/   DesktopGrid (cities = rows) and MobileGrid (cities = columns)
```

## Behaviour notes

- A cell is "awake" only if the whole local hour fits in the awake window, so a 6:30am cell in a UTC+5:30 city is still asleep with a 7am wake-up.
- Overlap windows that cross the reference city's midnight are merged into one range (e.g. `10pm — 2am`).
- In base mode, the reference row highlights every hour it overlaps with at least one other city.
