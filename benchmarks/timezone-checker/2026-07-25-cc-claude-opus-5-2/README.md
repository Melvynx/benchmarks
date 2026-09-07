# Timezone Overlap Checker

Find the hours when a distributed team is awake at the same time.

```bash
pnpm install && pnpm dev
```

Runs on **http://localhost:9215**.

## Modes

- **Meeting** — one shared window: the hours when *everyone* is awake simultaneously.
- **Base** — the reference city vs. each other city independently, so every city gets
  its own window. The reference row itself shows the union of those windows, i.e. the
  hours when it can reach at least one teammate.

The first city in the list is the reference; all hour columns are its local day.
Click any city name to promote it to reference.

## Notes

- **No date library.** All timezone math goes through the platform's `Intl` API against
  the IANA database, so DST (both hemispheres) and fractional offsets like Kathmandu's
  UTC+5:45 are handled by construction rather than by table.
- **Ranges are start-inclusive, end-exclusive** — `9 AM → 12 PM` means 9, 10 and 11.
  Non-contiguous windows render as separate badges.
- **Awake windows may cross midnight** (e.g. wake 22, sleep 6).
- Desktop (≥768px) and mobile (<768px) are two separate grids, not one reflowing one.
- City list, awake window, time format and mode persist to `localStorage`.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server on port 9215 |
| `pnpm build` | Typecheck + production build |
| `pnpm preview` | Serve the build on port 9215 |
| `pnpm typecheck` | `tsc -b --noEmit` |
| `pnpm test` | Vitest unit suite (52 tests) |
