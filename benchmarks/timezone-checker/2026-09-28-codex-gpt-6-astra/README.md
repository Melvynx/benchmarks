# GPT-6

A timezone overlap checker built with React and Vite. Includes Meeting mode, independent Base comparisons, 34 searchable cities, reference-city switching, overnight schedules, 12/24-hour display, and localStorage persistence.

## Run

```sh
pnpm install
pnpm dev
```

Open http://localhost:9183. The development and preview servers use port 9183 with strict port selection.

```sh
pnpm build
pnpm test
```

## Structure

- `src/time.js`: city catalog, current IANA timezone offsets, minute-resolution overlap calculation, range formatting, and validated storage restoration.
- `src/App.jsx`: persistent settings and application composition.
- `src/components/`: city picker, preferences, summary, separate desktop/mobile time layouts, and globe artwork.
- `src/styles.css`: responsive visual styling.

## Time model

Each column represents an hour of the reference city's day. Current-date UTC offsets are derived from `Intl.DateTimeFormat`, including DST and fractional offsets. Overlap summaries are calculated at minute precision; each grid cell describes the instant at the start of its reference-hour column. Windows are start-inclusive and end-exclusive. A midnight ending marked `+1` is the next day. Matching wake and sleep hours mean awake all day. In Base mode, the reference row highlights the union of its pairwise overlaps.

The page refreshes current timezone offsets every minute. Settings save to this browser's localStorage and restore on reload.

## Verification environment

Dependency installation was attempted, but the environment could not resolve `registry.npmjs.org` and its offline cache lacked dependencies. The required Portly runner could not launch because its app executable was missing. Build, automated tests, and live browser verification therefore still need to run in an environment with dependencies and a working runner.
