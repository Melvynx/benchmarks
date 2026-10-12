# Living garden

A cute ecology toy: a round 3D garden with fruit trees, blue blobs and red blobs. Tune the rules, press play, and watch the three groups rise and fall. Every number on screen and in the charts comes from the simulation.

## Run

```bash
pnpm install
pnpm dev        # http://127.0.0.1:9228
pnpm build      # typecheck + production build
pnpm preview    # serves the build on 9228
pnpm test       # simulation and helper tests
pnpm tune --preset=balanced --seconds=1500 --seeds=1,2,3   # headless runs of the simulation
```

## The rules

All waves come from energy bookkeeping in `src/sim/world.ts`.

- Moving costs energy in proportion to speed squared, waiting costs a little, and wide vision costs a little more.
- Blue blobs eat fruit for energy. Each bite removes a fruit from its tree, the tree rests for the return delay, then grows fruit back one at a time.
- Red blobs get energy from a gentle contact with a blue blob: a slice of the blue blob's energy moves to red, red rests for the pause time, and the blue blob is startled and briefly untouchable.
- A blob makes a copy once it holds at least its copy threshold. The copy is paid for with stored energy, so nothing grows for free.
- Children inherit speed and vision from their parent with a small random wobble.

## Layout

- `src/sim` seeded, deterministic simulation, presets, run summary, chart helpers.
- `src/render` three.js scene, procedural geometry, particles.
- `src/ui` React panels and SVG charts.
- `scripts` headless tuning and parameter sweeps.

Keyboard: Space play/pause, S step one second, R reset, N randomize, +/- speed, Esc deselect.
