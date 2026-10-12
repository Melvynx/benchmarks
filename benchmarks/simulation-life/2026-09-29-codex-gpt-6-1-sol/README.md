# Living garden

A dependency-free interactive ecology toy. Run `pnpm dev` on port **9198**, `pnpm build` for a static production build, and `pnpm preview` to serve that build on the same port.

## Simulation

Seeded individual agents spend energy moving and resting. Blue agents seek fruit and avoid nearby reds; red agents seek blues with enough energy to share, giving exhausted blues a small recovery refuge. Fruit is attached to trees, depleted by meals, and regrows after a cooldown. Copying costs stored energy and produces inherited movement variation. Pauses prevent instant repeat interactions. All charts are recorded from this simulation at one-day intervals.

Rules take effect live. Starting conditions and the seed apply on reset. Drag the garden to rotate, scroll to zoom, and click a creature to inspect it. With the garden focused, arrow keys rotate, Space toggles playback, Enter cycles creature inspections, and Escape closes inspection. The phase-space tab traces the actual blue-versus-red populations.

## Checks

`pnpm check` checks syntax. `pnpm test` runs deterministic simulation tests. `pnpm build` creates the static output with no dependencies or network access required.
