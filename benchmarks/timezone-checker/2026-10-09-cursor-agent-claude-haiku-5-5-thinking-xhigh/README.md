# Claude Haiku 5.5

Timezone overlap checker. Find when your cities are awake together (Meeting mode), or how each city overlaps a base city (Base mode).

## Run

```bash
pnpm install
pnpm dev        # http://localhost:9377
```

## Scripts

- `pnpm dev`, `pnpm build`, `pnpm start`: Next.js on port 9377
- `pnpm test`: Vitest suite for the timezone and overlap math
- `pnpm typecheck`, `pnpm lint`

## Structure

- `src/lib/`: pure logic. City catalog, DST-aware UTC offsets via `Intl`, overlap engine, board model, state reducers, localStorage store.
- `src/components/`: UI. `desktop-grid.tsx` (≥768px, cities as rows) and `mobile-grid.tsx` (<768px, cities as columns) are separate layouts, not one responsive grid.
- Persisted state lives under the `timezone-overlap:v1` localStorage key. Invalid stored data falls back to defaults.
