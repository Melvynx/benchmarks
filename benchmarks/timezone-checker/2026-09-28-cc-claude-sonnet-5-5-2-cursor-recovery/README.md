# Claude Sonnet 5.5 — timezone overlap checker

Find the hours when everyone across your timezones is awake, or compare a base city against each colleague.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:9237
```

Other scripts: `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm preview` (also port 9237).

## Stack

Vite + React 19 + TypeScript, CSS Modules, Vitest + Testing Library. No UI library.

## Layout

- `src/lib/time.ts` — UTC offsets from the current date via `Intl` (DST and fractional offsets), hour formatting.
- `src/lib/overlap.ts` — awake window (incl. overnight), Meeting/Base overlap, range merging. Pure and unit-tested.
- `src/lib/search.ts`, `src/data/cities.ts` — 34-city catalog and diacritic-insensitive search.
- `src/state/` — reducer and validated localStorage persistence (`timezone-overlap:v1`).
- `src/components/DesktopGrid.tsx`, `MobileGrid.tsx` — two separate layouts, switched at 768px.
