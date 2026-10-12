# GPT-6

A timezone overlap checker built with React 19, TypeScript, and Vite. Designed for distributed teams and people whose friends are a few timezones away.

## Run locally

Requires Node.js 22.18+ and pnpm.

```sh
pnpm install
pnpm dev
```

Open **http://localhost:9181**. The development and preview commands both use port 9181 and fail if it is occupied.

## Checks

```sh
pnpm check
pnpm test
pnpm build
```

Tests use Node's built-in test runner and cover overlap boundaries, fractional offsets, overnight schedules, independent base comparisons, reference changes, catalog validity, and daylight saving changes.

## How it works

- **Meeting mode** finds the intersection of every selected city's awake window.
- **Base mode** compares each city with the first city independently. The reference row highlights the union of these pairwise windows.
- Click a city name to make it the reference, or click an hour or overlap range to inspect the local times.
- The catalog includes 34 cities. Search by city or country; already selected cities cannot be added again.
- Wake time is inclusive, and sleep time is exclusive. Overnight windows are supported; equal wake and sleep times represent all-day availability.
- IANA timezone offsets are derived from the current date using `Intl.DateTimeFormat`, including daylight saving and fractional offsets. The date and live clocks update every 30 seconds.
- Summaries are calculated at minute precision. Grid cells show the local time and availability at the start of each reference hour. Fractional boundaries appear precisely in the summaries.
- Desktop uses cities as rows; mobile uses a separate layout with cities as columns.
- City order, mode, and settings persist in `localStorage`. Invalid saved values are safely discarded. If storage is unavailable, the app continues working and displays a status message.

## Structure

`src/time.ts` contains pure timezone and overlap functions. `src/cities.ts` defines the fixed catalog. `src/usePreferences.ts` manages validated browser persistence. Components in `src/components/` own the grid, summaries, city picker, settings, help, and decorative live world clock.

Google Fonts is optional; the interface falls back to the system sans-serif font when offline. All illustrations are local SVGs.
