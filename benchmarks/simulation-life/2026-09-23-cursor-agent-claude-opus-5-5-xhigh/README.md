# Living garden

A 3D dish of fruit trees, blue blobs that eat fruit, and red blobs that feed on gentle contact with blues. Populations rise and fall in offset waves from the rules alone: nothing in the charts is scripted.

```bash
pnpm install
pnpm dev        # http://127.0.0.1:9348
pnpm build && pnpm preview   # production build, same port
```

## Rules (src/sim)

- Fixed 20 Hz step, seeded RNG, so a seed + settings always replays the same run.
- Energy drains with movement (cost grows with speed²) and a little while idle (more for sharper vision).
- Blue eats fruit off trees. Each meal takes time; each picked branch rests before regrowing.
- Red gains energy from contact with a blue, then pauses. Chases burn stamina; tired reds rest.
- Copying halves the parent's surplus energy into a child with slightly drifted speed/vision genes.
- Each tree can hide one blue. Reds can't see a hidden blue, and a blue won't copy while a red was seen in the last few seconds.

The frame loop gives the sim at most 10 ms per frame. If a huge crowd can't keep up with the chosen speed, the garden runs slower (the badge says how fast) instead of freezing the page.

## Scripts

- `pnpm sweep --preset fruit-rich --seeds 1,2,3 --t 1500`: headless runs, prints waves, peaks, lag, CV.
- `pnpm tune`: parameter search helper used to calibrate presets.
- `pnpm bench '{"redStart":0}' fruit-rich 200 30`: CPU cost per sim step at a given crowd size.
- `pnpm perf gpu '{"redStart":0}' fruit-rich 200`: in-browser fps, per-phase frame cost and triangle count.
- `pnpm verify`: Playwright walk-through against the running dev server (screenshots in `.verify/`).
  Needs a Chromium in `.playwright-browsers` (`PLAYWRIGHT_BROWSERS_PATH=./.playwright-browsers pnpm exec playwright install chromium`).

## Keys

Space play/pause · → or . step · R reset · F follow selection · Esc deselect
