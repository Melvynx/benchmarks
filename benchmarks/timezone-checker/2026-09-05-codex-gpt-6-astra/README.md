# GPT-6 Astra

A timezone overlap checker built with React, TypeScript, and Vite.

## Run

```sh
pnpm install
pnpm dev
```

The application listens on port **9159**. The port is strict: it will not silently switch to another port.

## Checks

```sh
pnpm test
pnpm build
```

Browser checks use `pnpm test:e2e` against an already-running app on port 9159. In this workspace, start servers and run checks through Portly as required by the repository rules; the Playwright configuration intentionally does not launch its own server.

Meeting mode finds shared awake hours across all cities. Base mode compares each city independently with the first city. Click a city name to promote it; click an hourly cell to inspect that moment across the team. Search includes countries and ignores accents. Escape closes either popover.

Settings, cities, and mode persist locally. Invalid stored data falls back safely. Matching wake/sleep hours mean 24-hour availability. The grid samples the start of each reference hour, keeping fractional timezone minutes; overlap counts describe qualifying hourly snapshots rather than minute-exact meeting durations. Current-date timezone offsets come from the browser Intl timezone database, including daylight saving. Ranges are inclusive start and exclusive end; +1 denotes next-day midnight. In base mode the reference row shows its awake window neutrally, while other rows highlight their independent overlap.

Desktop and mobile use separate horizontal and vertical layouts. No account or backend is required.
