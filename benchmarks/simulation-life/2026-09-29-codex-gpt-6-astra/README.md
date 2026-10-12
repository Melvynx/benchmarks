# GPT-6

A tiny living garden, drawn with Canvas. No runtime dependencies.

## Run

`pnpm dev` serves the app at **http://localhost:9194**.

`pnpm check` checks JavaScript syntax. `pnpm test` runs deterministic simulation checks, including a twenty-minute balanced run.

The opening garden contains 45 seconds of real simulated history. Reset starts a new run at zero. Play/pause, single-second stepping, speed controls, presets, and live parameter changes all use the same simulation. Starting counts and the random seed apply when resetting.

Drag the island to rotate it; click a blob to inspect its energy, age, action, inherited speed, sensing range, and generation. The timeline records population counts. Phase view plots blue against red population.

Fruit supplies finite energy, movement consumes energy, contact transfers energy from blue to red at a loss, and reproduction costs more energy than the child receives. A 250-blob safety ceiling protects rendering, while the default populations are constrained well below it by food. Presets can go extinct: the simulation does not secretly replenish blobs or synthesize chart curves.

Verification in the creation environment: syntax and simulation checks passed. Live browser verification was blocked: Portly could not launch, browser automation was denied, and a bounded HTTP check received EPERM while binding port 9194.
