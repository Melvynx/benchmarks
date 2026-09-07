# ELYSIAN

A landing page for a fictional house that manufactures *elsewhere* — four
commissioned worlds, catalogued and crated. Built as a static Vite site: no
framework, no component library, no runtime dependencies.

```bash
pnpm install --ignore-workspace   # a parent pnpm-workspace.yaml would otherwise capture this
pnpm dev
pnpm build
```

## The idea

The four source images are not placed in sections; they are cut up and used as
material. The same still life appears as twelve louvered blades in the hero, as
the fill inside the title's letterforms, as chips in a marquee, and as a plate in
a rotating instrument. Nothing on the page is a rectangle if it can help it.

## The seven movements

| | Section | What it does |
|---|---|---|
| I | **The Threshold** | A temple at night. Twelve blades stand edge-on across the frame and turn to face the cursor, opening onto a second world behind the first. The title is filled with a mountain valley. |
| II | **The Colophon** | Two counter-running marquees of fragments and claims. |
| III | **The Preamble** | The house's statement, a drop cap, a god's head in a keyhole niche, and the workshop ledger. |
| IV | **The Four Plates** | A scroll-pinned horizontal rail. Each plate is masked differently — arch, oculus, pediment, torn paper — and carries its own accent colour, which the page adopts as the plate crosses centre. Annotation pins open on hover or tap. |
| V | **The Aperture** | A draggable brass instrument. Turning the collar turns the weather: four worlds on one spindle, with a readout of latitude, temperature and audible birds. |
| VI | **The Index** | Holdings not on view. Hovering a row summons a floating apparition that trails the pointer. |
| VII | **The Invitation** | A monumental image-filled wordmark and a perforated ticket. A valid address stamps a wax seal. |

## Three hours

The masthead switches the house between three lightings, each a different set of
CSS custom properties — `matins` (cold dawn), `meridian` (the whole page turns to
printed paper), `vespers` (night, the default). The choice persists in
`localStorage`. Every accent is re-tuned through `color-mix()` so it stays
readable on paper.

## Interaction

Everything scroll- and pointer-linked runs in a single `requestAnimationFrame`
loop with lerped easing — the rail, the parallax layers, the louvers, the
marquees, the apparition. Nothing listens to `scroll` and writes styles
directly.

## Accessibility

- The aperture knob is a `role="slider"`: arrow keys, Home/End, wheel, drag, and
  four selector dots all drive it, and `aria-valuetext` announces the world.
- `prefers-reduced-motion` unrolls the horizontal rail into a vertical stack,
  stops the grain, the Ken Burns drift and the marquees, and holds the louvers
  still in a woven pattern rather than collapsing them to a slab.
- Below 900px the rail becomes a vertical stack regardless of motion preference;
  the apparition is replaced by row highlighting on touch.
- Skip link, focus-visible rings, `aria-live` on the readout, and the decorative
  layers are all `aria-hidden`.
- The scroll reveals only start hidden when scripting is live (`html.js`, set by
  an inline head script), and a frame-loop pass reveals anything the reader has
  already scrolled past — restored scroll on refresh, an anchor jump, a fast
  flick. Copy is never left invisible waiting for an observer that cannot fire.
- The chosen hour is restored before first paint, so returning to the house at
  meridian does not flash night first.

## Assets

`scripts/build-assets.sh` derives every image in `public/img/` from the four
sources — four full plates, four blurred placeholders, and sixteen fragments —
recording each crop as an `ffmpeg` filter so the provenance is reproducible.
Everything is WebP at q76; the whole set is ~2.5 MB.

```bash
pnpm assets   # needs ffmpeg and cwebp on PATH
```
