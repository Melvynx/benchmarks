# ELYSIAN — Purveyors of Impossible Goods

A fictional luxury house, established in a place that does not exist. A single-page,
chaptered editorial experience built with zero dependencies — plain HTML, CSS, and
vanilla JavaScript.

## Run

Any static file server from this directory:

```bash
python3 -m http.server 4173
# → http://127.0.0.1:4173
```

## The experience

- **Gate** — the house opens with a split-door reveal.
- **Hero** — the wordmark is cut from the still-life plate itself (`background-clip: text`), with a floating arch-cropped fragment and parallax.
- **Chapter I · The Collection** — an editorial index of four "impossible objects." On desktop, hovering summons an arch-shaped lens that chases the cursor and re-crops the still life per object; on touch, rows expand inline.
- **Chapter II · The Scholars** — sticky arch plate with scroll-driven pan, drop-cap copy, house maxim.
- **Chapter III · The Source** — a scroll-driven portal: a small arched window that opens into a full-bleed panorama as you descend, while the valley pans beneath it.
- **Chapter IV · The Temple** — the golden temple under a live canvas starfield (twinkle + occasional shooting star) and a CTA that notices you back.

Custom cursor, film grain, chapter-dot navigation, and full `prefers-reduced-motion`
fallbacks throughout. Works on desktop and mobile.

## Files

- `index.html` — structure and copy
- `css/style.css` — the entire visual system
- `js/main.js` — scroll/parallax engine, lens, portal, starfield
- `public/img/` — the four source plates
