# Timezone overlap checker

Find the hours when everyone on a distributed team is awake.

```bash
pnpm install
pnpm dev        # http://localhost:9362
```

| Script           | What it does                          |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | Vite dev server on port 9362          |
| `pnpm build`     | Type-check and build to `dist/`       |
| `pnpm preview`   | Serve the production build on 9362    |
| `pnpm check`     | Type-check, lint and run unit tests   |

## Modes

- **Meeting** — highlights the hours when every city is awake at once.
- **Base** — the reference city (top row, `REF`) is compared with each other city independently.

Click any city name to make it the reference. Press `/` or `⌘K` to search for a city.

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Zustand (persisted to `localStorage`) · Motion · Vitest

## Layout

```
src/
  lib/          Pure logic: city catalog, timezone math, overlap model, formatting, search
  store/        Zustand store, state validation, toast queue, undoable actions
  hooks/        Shared clock, media query, derived overlap model, popover dismissal
  components/
    controls/   Mode toggle, city search combobox, availability settings
    summary/    Overlap summary and range badges
    grid/       Desktop grid (cities as rows), mobile grid (cities as columns), legend
    ui/         Small shared primitives
```

All timezone and overlap logic lives in `src/lib` as pure functions and is covered by unit tests.
UTC offsets come from `Intl.DateTimeFormat` for the current instant, so daylight saving time and
fractional offsets (India +5:30, Nepal +5:45, Iran +3:30) are handled without a timezone database.
