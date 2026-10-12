# Cowdie

A tiny 3D virtual cow you feed, wash, play with and put to bed. Built with Vite, React, TypeScript and three.js. All art, textures and sounds are generated in code, so there are no asset files.

## Run it

```bash
pnpm install
pnpm dev        # http://127.0.0.1:9370
pnpm build      # typecheck + production build
pnpm preview    # serves the build on 9370
pnpm test       # unit tests for the game rules
pnpm e2e        # Playwright run against the dev server (needs Chrome, pnpm dev running)
```

## How to play

- **Feed**: open the tray (F), then drag a snack onto Cowdie's mouth. She leans in, opens up, chews, swallows and reacts. Tap a card (or press Enter on it) to throw the snack instead. Drop it on the meadow and she walks over to eat it. When she is stuffed she politely refuses.
- **Favorite snack**: each Cowdie secretly loves one food. Feed her everything to find out; the favorite gives a big bonus.
- **Play** (P): tap the meadow to throw a ball; she chases and kicks it.
- **Wash** (W): scrub her with the sponge until the bubbles pile up.
- **Sleep** (S): the world turns to night and she recovers energy. She wakes by herself when rested.
- **Pet her**: click and rub her head, boop her nose, tap her belly, scratch her ears.
- **Clean up**: tap the little messes on the grass.
- **Grow up**: everything earns XP. Levels change her size, unlock outfits (Wardrobe) and trigger confetti.
- She keeps living while the tab is closed. Needs decay slowly and are caught up when you come back.

Keyboard: `F` feed, `P` play, `W` wash, `S` sleep/wake, `Esc` close panels and modes.

## Layout

- `src/game`: pure rules (`logic.ts`, unit-tested), balance data (`config.ts`), zustand store with persistence (`store.ts`), event bus.
- `src/three`: the pet (`Cowdie.ts`), the meadow (`Environment.ts`), particles, foods, accessories, textures and the orchestrator (`World.ts`).
- `src/ui`: React HUD (meters, dock, trays, toasts).
- `src/audio/sfx.ts`: synthesized sound effects (WebAudio).
- `e2e`: Playwright scripts (`verify.mjs` is the full check, `shot.mjs` and `layout.mjs` are screenshot helpers).
