# Cowdie

A 3D virtual pet in the browser. Hatch a spotted egg, raise a calf into a grown cow, and keep it fed, happy, clean and rested on a floating meadow island.

## Run

```bash
pnpm install
pnpm dev        # http://localhost:9359
pnpm build      # typecheck + production bundle
pnpm preview    # serve dist on :9359
```

## Playing

- **Feed**: open the snack tray (`F`). Drag a snack to Cowdie's mouth and it opens up and chomps when close; tap a snack to toss it in an arc. Drop one on the grass and a hungry Cowdie trots over to eat it. Every food has its own reaction (love, yum, spicy, bleh, treat); one of them is a secret favorite.
- **Pet**: stroke Cowdie with the cursor for hearts and giggles. Quick taps are boops (too many makes it dizzy).
- **Play** (`P`): kick the beach ball; Cowdie chases and headbutts it back. Rallies are tracked.
- **Clean** (`C`): scrub to lather bubbles, tap poops to sweep them up.
- **Sleep** (`S`): Cowdie walks to its hay bed; the island turns to night.
- **Heal** (`H`): medicine appears when Cowdie is sick.
- **Style** (`W`): accessories unlock as Cowdie levels up.

Stats decay in real time and progress while the tab is closed (gently, capped at 12h). Progress is saved to `localStorage`.

## Stack

Vite, React 19, TypeScript, three.js via @react-three/fiber + drei, zustand. All models are procedural primitives; all sound and music is synthesized with WebAudio.

## Checks

```bash
pnpm typecheck
pnpm exec playwright install chromium --only-shell   # once, with PLAYWRIGHT_BROWSERS_PATH=0
pnpm verify    # with `pnpm dev` running: end-to-end interaction run against :9359
```
