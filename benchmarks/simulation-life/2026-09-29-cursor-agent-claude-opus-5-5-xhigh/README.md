# Living garden

A 3D dish garden where blue blobs eat fruit, red blobs hug energy out of blues, and every population curve comes from a
deterministic, energy-based agent simulation.

```bash
pnpm install
pnpm dev        # http://127.0.0.1:9356
pnpm test       # determinism + preset behavior on real runs
pnpm build && pnpm preview   # production build on :9356
pnpm verify     # headless Chrome smoke test against a running server
pnpm tune --preset balanced --secs 3600 --seeds 3   # headless runs, ASCII trajectory
```

## Rules (all emergent, nothing scripted)

- Fixed 0.05 s step, seeded RNG. Same seed + settings = same garden.
- Energy burn per second = use × (0.3 + 0.7 × (speed / base)²) × vision cost. Waiting is cheap, sprinting is not.
- Fruit: each tree has `fruitLimit` slots. Eaten slots stay bare for `fruitDelay`, then regrow at `fruitGrowth`.
- Blues seek the best unclaimed tree, eat (+12 E per fruit, locked for `blueEatTime`), wait near trees, avoid crowds and
  flee active reds within 65% of their vision. Munching or waiting under a canopy hides them at 55% of red vision.
- Reds chase the nearest visible blue for up to 4 s of stamina, hug on contact (draw `redContact` E; a blue left below
  2 E fades), then rest for `redPauseTime`. Hungry reds lurk more; full reds stop hunting.
- Budding at the copy threshold costs 20% of stored energy; the rest is split. Reds only bud with room to spare
  (at most one other red within 5 u). Speed and vision genes are inherited with `traitDrift` noise.

## Layout

- `src/sim` — engine, params/presets, wave analysis, run story
- `src/render` — Three.js garden (instanced blobs, trees, particles, picking)
- `src/app/controller.ts` — fixed-step loop, transport, selection
- `src/ui` — React UI and Canvas2D charts
- `scripts` — `tune.ts`, `sweep.ts` (parameter sweeps), `verify.ts`
