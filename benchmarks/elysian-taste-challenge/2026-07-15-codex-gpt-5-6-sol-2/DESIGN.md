# Design System

## Direction

Elysian feels like a lacquered astronomical rotunda after midnight, with ultramarine sky maps, oxidized gold leaf, and one moving beam of light. The color strategy is full-palette and occasionally drenched. The experience stays nocturnal so the supplied artwork can flare into view instead of sitting politely on a neutral page.

## Color

```css
--night: oklch(0.08 0 0);
--surface: oklch(0.14 0.025 232);
--ink: oklch(0.97 0.006 230);
--muted: oklch(0.74 0.025 230);
--cobalt: oklch(0.56 0.14 232);
--cobalt-bright: oklch(0.75 0.08 230);
--gold: oklch(0.79 0.15 79);
--oxblood: oklch(0.42 0.16 27);
--verdant: oklch(0.73 0.15 145);
```

The cobalt seed anchors the brand. Gold marks invitations and active states. Oxblood appears at thresholds; verdant appears only around the river valley. Body copy uses high-contrast ink or white.

## Typography

- Display: Bodoni Moda, with Didot and Bodoni 72 fallbacks. Monumental, lapidary, and never italic by default.
- Text: Manrope, with Avenir Next and Helvetica Neue fallbacks. Quiet, precise, and compact.
- Display sizes are fluid and capped at 6rem. Body copy stays under 65 characters per line.

## Composition

- A continuous four-realm pilgrimage replaces ordinary content sections.
- Artwork is always full-bleed, doubled, masked, arched, or cut into a flowing ribbon.
- A fixed constellation of Roman numerals acts as the index.
- Text occupies the margins of the artwork like movable type on a ceremonial atlas.
- Corners remain mostly square. Circles and arches belong only to portals and celestial navigation.

## Motion

- One pointer-driven beam reveals color in the opening still life.
- Scroll progress moves already-clipped image layers, not layout.
- Section changes update the constellation and color atmosphere.
- The final temple aperture expands with scroll and opens a native full-screen dialog.
- Reduced motion removes parallax, ambient drift, smooth scrolling, and continuous animation while preserving every composition and control.

## Accessibility

- All controls have visible focus states and 44px touch targets.
- Important images use concise descriptive alternatives; decorative duplicates use empty alternatives.
- Copy always sits on a persistent scrim or solid field.
- The journey follows logical DOM order and remains complete without JavaScript.

