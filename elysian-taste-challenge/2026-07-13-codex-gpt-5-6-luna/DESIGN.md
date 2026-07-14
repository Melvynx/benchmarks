# Elysian visual direction

## Scene

Midnight in an old observatory where the walls have been painted violet, the brass instruments are warm from the sun, and four impossible windows look out onto different kinds of memory.

## Direction

A surreal house-of-curiosities landing page with an art-directed collage, sharp typographic contrast, and a feeling of turning a private archive page by page. The work is luxurious because it is particular, not because it is quiet.

## Color tokens

```css
--night: oklch(0.16 0.06 280);
--night-deep: oklch(0.105 0.035 280);
--violet: oklch(0.28 0.12 318);
--coral: oklch(0.66 0.18 40);
--gold: oklch(0.81 0.15 82);
--river: oklch(0.67 0.12 244);
--ink: oklch(0.96 0.025 88);
--muted: oklch(0.78 0.035 82);
--line: oklch(0.96 0.025 88 / 0.2);
```

## Typography

- Display: Bodoni / Didot / Iowan Old Style fallback stack. High-contrast, sculptural, and slightly old-world.
- Interface: Helvetica Neue / Avenir Next / Segoe UI. Neutral enough to let the images speak.
- Display headings use a restrained negative tracking value, never tighter than `-0.04em`.

## Composition

The hero is a single dark room with a floating four-image constellation. The primary still life is elliptical and central; the other images behave like tilted windows around it. Lower sections alternate between dark observatory blue and saturated coral to give the page a deliberate change of atmosphere.

## Motion

The hero responds to pointer position with low-amplitude parallax. The atlas changes its active artwork with a dissolve and a small lateral shift. The archive drawer opens as a physical sheet sliding out from the edge. All motion has a reduced-motion fallback.
