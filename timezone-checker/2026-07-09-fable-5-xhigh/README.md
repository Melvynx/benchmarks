# Claude Fable 5 — Timezone Overlap Checker

Find the hours when a distributed team is awake at the same time. Built with React 19 + Vite + TypeScript, no other runtime dependencies — timezone math (DST, fractional offsets like UTC+5:30) comes from the browser's `Intl` API.

## Run it

```sh
pnpm install
pnpm dev
```

Then open the printed URL (default `http://localhost:5173`).

## Features

- **Meeting mode** — highlights the hours when *every* selected city is awake at once.
- **Base mode** — compares each city independently against the reference city.
- **Reference city** — the first city in the list anchors the 24-hour grid; click any city name to promote it.
- **Catalog of 34 cities** across all major world regions, searchable by name or country. No duplicates.
- **Configurable awake window** (wake/sleep hour, overnight ranges supported) and 12h/24h format.
- **Live offsets** — UTC offsets are derived from today's date, so DST is always current; a subtle marker shows the current hour, and each city shows its live local clock.
- Distinct desktop (cities as rows) and mobile (cities as columns) layouts.
- Everything persists to `localStorage`.
