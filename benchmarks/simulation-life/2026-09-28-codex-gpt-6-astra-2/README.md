# GPT-6

A self-contained living-garden simulator. No dependencies, external assets, network requests, or installation required.

## Run

```sh
pnpm dev
```

Open **http://localhost:9179**. Both development and preview use port 9179.

```sh
pnpm check          # deterministic simulation and source validation
pnpm check:runtime  # bounded HTTP smoke check on port 9179
pnpm build          # produce dist/
pnpm preview        # serve dist/ on port 9179
```

The native server serves files from this project only. The build copies the static application to `dist/` for any static host.

## The garden

- Drag the garden to rotate it, and select a resident to inspect its energy, age, action, movement traits, and family.
- Change fruit, blue, or red rules while it runs. World settings apply with **Plant a new garden**.
- Pause, advance one second, reset the same seed, randomize, and switch between five starting presets.
- Watch the real population timeline and blue-versus-red phase plot. Toggle timeline series or export the recorded history as CSV.
- Keyboard: Space to play/pause, R to reset, right arrow to step while paused. Focus the canvas to rotate with left/right, zoom with +/−, and cycle residents with Enter. Escape closes inspection or expanded view.

## Simulation

Each resident has its own energy and position. The simulation advances in fixed 0.1-second steps with a seeded random generator. Blues seek attached fruit and flee nearby reds. Reds seek blues, transfer energy on contact, and rest afterward. Blues get a recovery window after contact.

Waiting consumes less energy than moving. A birth costs the parent 46 energy and gives the child 34, so reproduction never creates energy. Children inherit slightly varied movement and sensing traits. Fruit regrows with a delay and a rate limit. There are no injected population curves, automatic replacement residents, or hidden population caps.

The balanced seed sustains ongoing populations and fluctuations in long runs. Fruit-rich conditions create fast early blue growth; an abundant harvest can still produce a later ecological overshoot. Low fruit keeps the garden small. Red-heavy starts can cause extinction: this is a consequence of the energy rules, and can be explored with reset or new settings.

All graphics are drawn locally with Canvas 2D and SVG. Canvas depth sorting, lighting gradients, soft shadows, and animation create the little raised garden world.
