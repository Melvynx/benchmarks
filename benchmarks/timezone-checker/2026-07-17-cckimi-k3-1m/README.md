# k3[1m] — Timezone Overlap Checker

Find shared awake hours across timezones — built for remote workers, distributed
teams, and digital nomads scheduling across the globe.

## Quickstart

```bash
pnpm install
pnpm dev
```

Then open http://localhost:9210

## Scripts

| Command        | What it does                                      |
| -------------- | ------------------------------------------------- |
| `pnpm dev`     | Start the dev server on port 9210                 |
| `pnpm build`   | Typecheck + production build                      |
| `pnpm preview` | Serve the production build on port 9210           |
| `pnpm test`    | Run timezone-math + render verification checks    |

## Features

- **Meeting mode** — highlights hours when *everyone* in every city is awake.
- **Base mode** — compares each city independently against the reference city.
- **Reference city** — first in the list (REF badge); click any city's name to promote it.
- **37-city catalog** across all world regions, searchable by city or country.
- **Awake window settings** — wake/sleep hours (overnight windows supported) and 12h/24h clock.
- **DST-aware timezone math** via `Intl`, including fractional offsets (India +5:30, Nepal +5:45).
- **Two layouts** — horizontal grid on desktop, transposed vertical grid on mobile.
- **Persistence** — city list, mode, and settings survive reloads via localStorage.

## Tech

Vite · React 19 · TypeScript · Tailwind CSS v4 · Inter & JetBrains Mono (self-hosted)

## Structure

```
src/
  lib/         cities catalog, timezone math, overlap computation
  hooks/       useNow (live clock), usePersistentState (localStorage)
  components/  header, settings bar, combobox, summary, desktop/mobile grids
scripts/
  verify.ts    math + SSR smoke checks
```
