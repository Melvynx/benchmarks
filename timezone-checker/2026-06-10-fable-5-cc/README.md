# Fable 5 — Timezone Overlap Checker

Find the hours when your whole distributed team is awake. Built with React 18 + TypeScript + Vite.

## Run

```sh
pnpm install
pnpm dev
```

Then open the printed URL (default `http://localhost:5173`).

## Features

- **Meeting mode** — highlights the hours when *every* selected city is simultaneously awake.
- **Base mode** — the first (reference) city is compared one-on-one against each other city, each with its own independent overlap.
- **Reference city** — the first city in the list anchors the 24-column grid; click any other city's name to promote it.
- **34-city catalog** across all major world regions, searchable by city or country. No duplicates.
- **Awake window settings** — wake/sleep hour (overnight windows supported) and 12h/24h format.
- **DST-aware** — UTC offsets are derived from the current date; fractional offsets (India +5:30, Nepal +5:45) are fully supported.
- **Two layouts** — horizontal grid on desktop (cities as rows), vertical on mobile (cities as columns).
- **Persistence** — cities, mode, and settings are stored in localStorage.

## Structure

```
src/
  data/cities.ts          city catalog (IANA timezones, regions)
  lib/time.ts             UTC-offset math via Intl (DST-safe)
  lib/overlap.ts          awake-window + overlap computation
  lib/format.ts           hour/range/cell label formatting
  lib/appState.ts         state shape, defaults, localStorage sanitizing
  hooks/                  useAppState (persistence), useNow (live clock)
  components/             Header, CitySearch, OverlapSummary,
                          DesktopGrid, MobileGrid, HourCell, Legend
```
