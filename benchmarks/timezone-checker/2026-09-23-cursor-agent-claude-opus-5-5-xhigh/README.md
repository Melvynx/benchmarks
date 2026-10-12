# Timezone overlap checker

Find the hours when everyone across a set of cities is awake, or compare one base city against each colleague individually.

```bash
pnpm install
pnpm dev        # http://localhost:9347
```

| Script           | What it does                         |
| ---------------- | ------------------------------------ |
| `pnpm dev`       | Vite dev server on port 9347         |
| `pnpm build`     | Type-check and production build      |
| `pnpm preview`   | Serve the production build on 9347   |
| `pnpm test`      | Unit tests for the scheduling logic  |
| `pnpm lint`      | ESLint (TypeScript + React hooks)    |
| `pnpm typecheck` | `tsc -b`                             |

## How it works

- **Meeting mode** highlights the hours when every city is awake. **Base mode** compares the reference city with each other city on its own; the reference row lights up wherever at least one city overlaps.
- The first city is the reference: each of the 24 columns is one hour of its day, and every cell shows the local time in that city at that moment. Click a city name to promote it.
- UTC offsets are read from `Intl` for the current instant, so DST and fractional zones (India +5:30, Nepal +5:45, Iran +3:30) are exact. The date rolls over at local midnight, marked with the weekday.
- Overlap windows are inclusive start, exclusive end, and wrap across midnight (22:00–02:00 is one window, not two).
- When nobody-left-out is impossible, the summary suggests the closest compromise and who would be asleep.
- Cities, mode and awake window persist to `localStorage` (`tz-overlap`), are sanitised on load, and stay in sync across open tabs.
- On phones, five or more cities switch to compact column headers (city code + offset); from nine the grid scrolls sideways under a pinned header.

## Structure

```
src/
  domain/      pure logic: city catalog, timezone math, overlap analysis, share text (unit-tested)
  state/       zustand stores: persisted app state + ephemeral UI focus
  hooks/       useSchedule (view model), useNow (minute ticker), useMediaQuery
  components/
    grid/      DesktopGrid (cities as rows) and MobileGrid (cities as columns), shared HourCell
    summary/   OverlapSummary, RangeBadge, CopyButton
    ui/        Button, Segmented, Kbd
```

Stack: React 19, Vite 8, TypeScript, Tailwind CSS 4, zustand, Radix Popover, cmdk. Reordering animations use the native View Transitions API.
