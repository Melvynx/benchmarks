# GPT-6 Astra

A dependency-free living garden simulator with a depth-sorted, rotatable canvas world, seed-reproducible individual energy rules, live tuning, creature inspection, five presets, actual population history and a blue/red phase plot.

## Run

`pnpm dev` serves the application on port **9160**. Use Portly to supervise the command under this workspace's server policy.

`pnpm test` runs the deterministic ecology regression suite. `pnpm build` packages a self-contained application into `dist/index.html`, which also opens directly without a server.

## Model

One fixed tick is 0.1 simulated seconds. Trees regrow fractional fruit after a configurable delay. Blue blobs sense fruit and flee nearby red blobs. Reds pursue visible blues, transfer finite energy on contact, and rest. Movement consumes full metabolism; eating and contact pauses consume 35%. A newborn receives 40 energy while its parent spends 48. There is no immigration, resurrection, or fabricated history. A 350-agent safety ceiling bounds rendering work; default populations remain well below it through food and energy constraints.

The balanced default seed sustains both groups for an hour in the regression test. Other seeds and settings can lead to extinction. Starting conditions apply on reset; behavioral controls apply live. Initial history contains only the starting observation, and subsequent samples record actual counts about once per simulated second. History retains the most recent 1,800 observations. All series share a labeled count axis; phase space uses blue count horizontally and red count vertically.

Dragging changes camera yaw; clicking a creature opens its inspector. Decorative bouncing is disabled under reduced-motion preferences. Physics still advances only while playing or stepping.
