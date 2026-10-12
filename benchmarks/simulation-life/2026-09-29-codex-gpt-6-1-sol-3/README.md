# GPT-6

A dependency-free living garden toy. Blue blobs eat regrowing fruit, red blobs transfer energy through gentle contact, and all movement and births consume energy. A seeded simulation drives the world, counts, timeline, phase plot, and inspection panel.

## Run

Use `pnpm dev` through your Portly-managed server. The app listens on port **9198**. `pnpm build` creates `dist/`; `pnpm preview` serves it on the same port.

## Checks

- `pnpm check`: JavaScript syntax checks.
- `pnpm test`: energy conservation, fruit and contact cooldowns, deterministic seeds, 120-day population waves, and preset behavior.
- `pnpm verify`: bounded HTTP checks on port 9198, then closes the server.

Rules apply live. Starting conditions apply with “Plant a fresh garden.” Reset retains current rules and seed; randomize changes the seed. One displayed day is ten simulation seconds. The timeline displays fruit divided by four to keep every group readable. Its values come from recorded simulation history.
