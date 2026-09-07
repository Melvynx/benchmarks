# Elysian — Opus 5

A landing page for **Maison Elysian**, *Atelier of Atmospheres* — a fictional house
that bottles places which do not exist. The page presents its fifth work,
**Opus 5**, as a descent through five movements.

The visual world is a hand-pulled riso print: four inks (teal, marigold, coral,
bone) on cotton paper, deliberately out of register.

## Running it

```bash
pnpm install
pnpm dev          # vite dev server
pnpm typecheck    # tsc --noEmit
pnpm build        # typecheck + production build to dist/
pnpm preview      # serve dist/
```

## What to look for

- **Overture** — the hero plate is cut into vertical louvres that print
  themselves in, drift, swell under the pointer and peel away on scroll. The
  title's coral and marigold plates follow the hand, always slightly misregistered.
- **INKS IV / I** (masthead) — reprints the entire page in a single teal ink.
- **III · The Vale** — drag (or focus and use the arrow keys) to move the
  meridian and pull the valley from first light to night. It performs one
  unprompted sweep the first time it comes into view.
- **IV · The Temple** — the pediment is a `clip-path`, cut to meet the temple's
  own; lamplight follows the pointer across the night.
- **V · Threshold** — the page turns to paper. Ask for a key and it is stamped
  in wax.
- **ELYSIAN** (masthead wordmark) — knocks every plate out of register for a
  moment and returns you to the surface.

Everything above degrades gracefully: `prefers-reduced-motion` settles all
motion into its final state, and the hero falls back to a whole plate without JS.

## Structure

```
index.html               the whole document
src/main.ts              boot sequence — preload, veil, wiring
src/modules/             env · slats · reveal · scrollstage · cursor
                         meridian · threshold · ink
src/styles/              base · chrome · hero · movements
public/media/            four plates, webp, with 900w variants
```

One shared `requestAnimationFrame` loop drives every scroll-linked effect;
reveals and scene changes run on `IntersectionObserver`.

Type set in Bodoni Moda and Archivo. All places depicted are fictitious.
