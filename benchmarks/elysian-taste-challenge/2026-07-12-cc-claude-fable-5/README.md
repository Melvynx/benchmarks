# Elysian — perfume from a garden that does not exist

A landing page for a fictional perfume house whose garden appears only at
night. The supplied botanical painting is the entire visual world of the
page: the full-bleed nocturnal hero, the three specimen plates cropped from
it (one per extrait), and the magnifying field-notes loupe all draw from the
same canvas.

## Stack

Vite + vanilla JS, hand-written CSS. Self-hosted fonts (Bodoni Moda,
Newsreader, IBM Plex Mono). No runtime dependencies.

## Run

```bash
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run preview   # serve the production build
```

## Notes

- Images are pre-processed crops of the source painting (`public/assets`),
  served as WebP with JPEG fallbacks.
- Interactions: staggered masthead entrance, scroll reveals, arch-plate
  parallax, a cursor loupe with discoverable specimen annotations (touch
  devices get the annotations persistently and a press-drag loupe), and a
  night-porter ledger form.
- `prefers-reduced-motion` disables all movement; keyboard focus is styled;
  the page works down to small phones.
