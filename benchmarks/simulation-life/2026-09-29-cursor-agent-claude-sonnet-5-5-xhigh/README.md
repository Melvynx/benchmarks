# Living garden

A playful ecology toy: blue and red bean-shaped blobs live in a round tabletop dish with fruit trees.

```bash
pnpm install
pnpm dev        # http://127.0.0.1:9357
pnpm build      # typecheck + production build
pnpm typecheck
pnpm sim balanced 3600 1,2,3   # headless run: <preset> <seconds> <seeds> [param=value ...]
```

## How it works

- **Blue** blobs eat fruit, avoid crowds, gather at trees and flee red blobs.
- **Red** blobs hunt blue blobs. A gentle contact moves some energy from blue to red, then the red blob pauses.
- Everything costs energy: moving, waiting, copying. A copy costs stored energy and mutates speed and vision slightly.
- Fruit shrinks when eaten, rests, then regrows.
- The simulation is a fixed-step, seeded model (`src/sim`). The renderer (`src/render`) is a canvas-2D pseudo-3D scene with a real orthographic camera, so the dish rotates.
- All charts and the run summary are computed from the recorded history (`world.history`), never from canned curves.

## Controls

Drag the dish to rotate, click a blob to inspect it. Presets, sliders (fruit, blue, red, garden setup), seed, speed, play, pause, step, reset and randomize are on the page. Sliders under "Garden setup" restart the garden; everything else applies live.
