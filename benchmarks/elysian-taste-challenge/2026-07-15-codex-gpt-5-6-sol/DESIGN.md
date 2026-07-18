# Design System

## Visual Theme

A nocturnal cabinet of climates: polished black stone, verdigris light, mineral blue, electric vermilion, and temple gold. Images appear as apertures, strata, and moving horizons rather than framed pictures. The composition is cinematic and asymmetric, with moments of deliberate stillness.

## Color Palette

- Void: `oklch(0.075 0 0)`
- Ink: `oklch(0.97 0.006 188)`
- Verdigris: `oklch(0.72 0.10 188)`
- Deep verdigris: `oklch(0.28 0.075 188)`
- Vermilion: `oklch(0.64 0.20 32)`
- Temple gold: `oklch(0.82 0.14 84)`
- Mineral blue: `oklch(0.59 0.15 244)`
- Muted text: `oklch(0.73 0.018 188)`

## Typography

- Display: Bodoni 72 or Didot, with restrained tracking and dramatic Roman contrast.
- Utility and body: Avenir Next, with a compact, lucid cadence.
- Display headings cap at 96px and use balanced wrapping.

## Layout

Full-viewport scenes, circular and polygonal image apertures, generous negative space, and diagonals that lead the eye between worlds. Desktop compositions may overlap; mobile compositions become strongly vertical without losing the apertures or visual scale.

## Motion

The page loads like a lens opening. Pointer movement shifts image strata subtly. Scroll changes the active climate through shaped wipes, and intentional press gestures reveal small omens. All motion collapses to simple state changes under reduced-motion preferences.

## Components

- Constellation navigation: four points indicating the active world.
- Climate aperture: clipped, full-bleed imagery with a moving focal point.
- Specimen label: compact sans-serif metadata used only where it clarifies a scene.
- Hold control: a circular press-and-hold interaction with visible progress and keyboard parity.
- Portal link: high-contrast text action with an animated directional line.
