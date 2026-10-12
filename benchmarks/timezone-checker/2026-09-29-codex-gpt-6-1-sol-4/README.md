# GPT-6

A timezone overlap planner built with React, TypeScript, and Vite.

## Run

```sh
pnpm install
pnpm run dev
```

Open http://localhost:9188. The development and preview servers use port 9188 exclusively.

## Features

- 34 searchable cities across all major world regions, with duplicate prevention.
- Meeting and Base modes, independent pair summaries, and exclusive-end range badges.
- Click-to-promote reference cities and immediate city removal.
- Overnight awake windows, fractional local times, and automatic DST offsets.
- Separate horizontal desktop and vertical mobile layouts.
- Persistent local configuration and keyboard-accessible controls.

## Check

```sh
pnpm run build
pnpm test
```

The dependency-free timezone checks require Node.js 22.13 or later.

Meeting mode finds common awake hours across all cities. Base mode compares each city with the first city independently. Click a city name to change the reference. Availability settings support overnight schedules and 12- or 24-hour time formats.

Timezone offsets come from the browser's IANA timezone data at the current date, including DST and fractional offsets. Each column represents the start of an hour in the reference timezone; fractional local times retain their minutes. Ranges end exclusively. Matching wake and sleep hours mean awake all day.

City selection, reference order, availability, and mode persist in localStorage. All cities can be removed; the empty selection is preserved after refresh. Mobile uses a separate vertical layout with horizontal scrolling when many cities are selected.
