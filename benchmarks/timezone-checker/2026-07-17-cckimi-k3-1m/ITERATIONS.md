# Iteration log & roadmap

Quality loop for this app. Each cycle has one theme, ships small, and ends with
browser verification (desktop + mobile screenshots), `pnpm build`, `pnpm test`.

## Done — 2026-07-18

### Cycle 1 — Hierarchy & structure
- Merged the overlap summary into the grid card as a status band (green tint
  when overlap exists, amber when zero): the answer now sits on the thing it
  describes instead of floating in its own card.
- "Add city" went from bright-green CTA to a neutral elevated button: green is
  reserved for the overlap semantic (see PRODUCT.md principle 2).
- Settings bar no longer wraps into orphans on mobile ("16h window" became a
  pill, the clock group only right-aligns from `sm:` up).
- Sleeping-cell text raised from 26% to 42% opacity: de-emphasized but legible.

### Cycle 2 — Micro-interactions
- Column hover on the desktop grid (cells + hour headers): hovering any cell
  highlights the full vertical slice, so "when it's 12pm in SF, it's 3am in
  Denpasar" reads in one glance.
- Persistent faint tint on the current-hour column.
- Popover entrance animation (160ms scale/fade, origin top-right).
- Mini-strip segments got hour tooltips.
- `prefers-reduced-motion` disables cell/popover/pulse animations.

### Cycle 3 — Mobile & edge cases
- Mobile grid is now a self-scrolling panel (max 72vh) with sticky city
  headers (top) and sticky hour gutter (left): city names never scroll away.
- Remove buttons on mobile: 16px → 28px touch targets.
- Single city: awake hours no longer render as fake "overlap" green
  (`buildGrid` returns empty flags below 2 cities), and a hint band invites
  adding a second city.
- Zero overlap: the contradictory "everyone is awake at the same time" caption
  is hidden; the amber guidance stands alone.
- Empty state: grid helper text and legend footer no longer render.

## Roadmap — next cycles

### Cycle 4 — Grid as an instrument
- Drag to reorder cities (FLIP animation; first position = reference).
- Click-drag across hour columns to select a candidate slot; show it in every
  city's local time with a "copy invite text" action.
- Keyboard scrubbing: arrow keys move the highlighted column.

### Cycle 5 — Accessibility hardening
- Roving tabindex + `role="grid"` semantics on both layouts.
- Screen-reader announcements on mode switch and overlap changes
  (`aria-live` on the summary band).
- Automated axe-core pass wired into `pnpm test`.

### Cycle 6 — Scheduling depth
- Per-city awake windows (each teammate has their own hours) with a per-row
  editor; the uniform window stays the default.
- Date picker: check overlap for a specific day (DST transitions shift
  offsets); show "next week this becomes X" when a DST change is near.
- Shareable state: encode cities/mode/window in the URL; "copy link".
- Export a chosen slot as `.ics`.

### Cycle 7 — Regression safety
- Extend `scripts/e2e.ts` to cover: mode toggle, promote/remove, combobox
  keyboard flow, persistence reload, mobile layout.
- Reference screenshots (desktop/mobile, meeting/base, zero-overlap) compared
  pixel-wise in CI.
- DST edge-case unit tests: transition day in each direction, Lord Howe-style
  30-minute DST, wake === sleep.

### Cycle 8 — Performance & delight
- Bundle audit (fonts subsetting: only latin is needed).
- Skeleton-free instant paint audit (app is client-only; keep first render
  under one frame of layout shift).
- Sub-minute "now" dot easing between hour columns instead of jumping.

## Working agreement

1. One theme per cycle; no drive-by refactors.
2. Every cycle ends green: `pnpm build` + `pnpm test`, plus browser proof.
3. Copy rules: no em dashes, verb+object button labels, no marketing words.
4. Green = overlap only. Any new UI element must pick another channel.
