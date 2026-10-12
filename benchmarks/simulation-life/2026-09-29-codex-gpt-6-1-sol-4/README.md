# GPT-6

A playful, dependency-free living garden. Run `pnpm dev` and open **http://localhost:9189**. `pnpm start` uses the same port.

The initial garden has a real, deterministically simulated 75-second head start, with its history shown in the charts. Reset begins at day 1. One garden day is 10 simulated seconds. Use Space to play/pause, arrow keys to rotate, and R to reset. Click a blob, or focus the garden and press Enter, to inspect it.

Fruit, blue, and red rules apply live. Starting trees, populations, world size, and seed apply on reset. Choosing a preset or Surprise me plants a new garden immediately. History can be exported as CSV.

Every blob spends energy waiting and moving. Blues get 23 energy after finishing a fruit. Reds transfer up to the configured contact strength from a blue, receiving 82% after their pause; a blue has an 8-second grace period. A copy costs its parent 46 energy and starts with 32. Inherited speed traits vary slightly. Fruit regrows after a delay. Finite food, energy costs, local crowding, and aging limit growth; there are no fabricated curves or population caps.

Run `pnpm check` for syntax, reproducibility, energy/cooldown/regrowth checks, long-run preset behavior, and UI integration checks using a local DOM harness. `pnpm build` validates and exports the static app to `dist/`; `pnpm preview` serves that build on port 9189. Run `pnpm verify:runtime` for HTTP checks on port 9189. The DOM harness exercises the actual app but does not replace a real browser check.
