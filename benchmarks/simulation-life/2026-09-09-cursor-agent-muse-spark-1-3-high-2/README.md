# muse-spark-1-3-high

A playful living-garden simulator: a round tabletop world with fruit trees, blue blobs that eat fruit, and red blobs that sip energy from blues on gentle contact.

## Run

- `pnpm install --ignore-workspace` (repo root is a pnpm workspace; install standalone)
- `pnpm dev` — serves on `http://127.0.0.1:9331`
- `pnpm build` — typechecks and produces `dist/`

## How it works

- `src/sim.ts` — seeded energy simulation. Moving costs energy, waiting costs a little, blues gain energy from fruit, reds gain it from contact with blues, reproduction splits stored energy (nothing grows for free), fruit regrows after a delay. All chart curves come from this model; nothing is scripted.
- `src/world.tsx` — canvas dish world: drag to rotate, click a blob to inspect it.
- `src/charts.tsx` — timeline chart (fruit/blue/red), blue-vs-red phase plot, inherited-trait trends.
- `src/App.tsx` — transport (play/pause/step/reset/randomize), 20 live sliders, 5 presets, run summary.

## Dynamics

Balanced settings produce out-of-phase blue/red waves. Fruit-rich blooms, red-heavy dips blues first, low-fruit stays tiny. Predator recruitment is capped and costly, newborns get a grace period, and resting reds sip little energy, so cycles persist instead of collapsing instantly.
