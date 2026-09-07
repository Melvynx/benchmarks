# Timezone overlap checker

Find the hours when a distributed team is awake at the same time. Pick cities from a
curated catalog of 34, set your awake window, and read the overlap straight off a
24-hour grid anchored to a reference city.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:9321
```

Other scripts: `pnpm build`, `pnpm preview`, `pnpm test`, `pnpm typecheck`.

## Stack

- React 19 + TypeScript, bundled by Vite
- Tailwind CSS v4 for styling
- Zustand (with `persist`) for state, saved to `localStorage`
- Vitest for the timezone and overlap math

## How it works

- **Reference city** — the first city in the list. Every column is one hour of its day.
  Click any other city's name to promote it.
- **Meeting mode** — highlights hours when *every* city is inside the awake window.
- **Base mode** — highlights, per city, the hours it shares with the reference only.
  The reference row lights up wherever at least one colleague is reachable.
- **Awake window** — wake/sleep hours apply to all cities and may wrap overnight.
- **Offsets** — computed from `Intl.DateTimeFormat` for the current instant, so DST
  and fractional zones (India, Nepal) fall out for free. A minute-level tick keeps a
  long-lived tab accurate.

## Layout

```
src/
  data/cities.ts        catalog + search
  lib/timezone.ts       offsets, local-time math, formatting
  lib/overlap.ts        awake windows, overlap, ranges, grid model
  store/useAppStore.ts  persisted state
  hooks/useSchedule.ts  derives the grid model from state
  components/           header, mode toggle, settings, city picker,
                        overlap summary, desktop + mobile grids
```

Desktop (≥768px) renders cities as rows; mobile renders cities as columns. They are
two separate components rather than one reflowing grid.
