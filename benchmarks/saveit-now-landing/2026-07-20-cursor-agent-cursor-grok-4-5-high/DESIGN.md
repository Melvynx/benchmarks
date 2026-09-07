# Design System

## Theme

Cinematic consumer campaign. Full-bleed landscape portals, warm sunset ember, cool paper surfaces, deep ink type. Signature: glowing rectangular portal as the "save / retrieve" motif, paired with the illuminated house as "home for bookmarks."

## Colors (OKLCH)

| Role | Value | Hex approx | Notes |
|------|-------|------------|-------|
| bg | oklch(0.995 0.002 80) | #FFFCFA | Near-white paper, not cream wash |
| surface | oklch(0.97 0.008 70) | #F7F3EE | Soft section wash |
| ink | oklch(0.22 0.025 40) | #2A211C | Primary text |
| muted | oklch(0.48 0.03 45) | #6E5C50 | Secondary text |
| ember | oklch(0.62 0.17 45) | #D45A1A | Primary CTA / accent |
| ember-deep | oklch(0.42 0.14 40) | #8A3510 | Hover / dark accents |
| dusk | oklch(0.55 0.12 350) | #A45A7A | Soft magenta from skies |
| forest | oklch(0.38 0.06 150) | #2F4A3C | Grounding contrast |
| portal | oklch(0.96 0.02 90) | #FFF8EC | Glow highlight |
| on-dark | oklch(0.98 0.01 80) | #FFF9F4 | Text on imagery |

## Typography

- Display: Bricolage Grotesque (variable) — confident campaign headlines
- Body: Karla — readable, warm without serif cliché
- Scale: fluid clamp; H1 max 4.5rem; letter-spacing ≥ -0.03em
- Headings: text-wrap balance; body: text-wrap pretty

## Layout

- Hero: full-bleed campaign still (portal-ridge), brand-forward, one headline, one support line, CTA pair
- Sections alternate paper and image-led planes
- Max content width ~72rem; generous vertical rhythm (clamp 5rem–9rem)
- No hero cards; cards only where interaction needs a container (pricing, FAQ)

## Imagery map

| Asset | Role |
|-------|------|
| portal-ridge.png | Hero full-bleed |
| portal-arch.png | Agentic capture step |
| portal-rocks.png | Understanding / organize step |
| lake.png | 100% rediscovery promise |
| observatory.png | iOS / wherever you are |
| home.png | Closing CTA home metaphor |

## Motion

- Hero text staggered fade-up on load
- Scroll reveals via IntersectionObserver (opacity + translateY only)
- FAQ accordion height/opacity transitions
- CTA press scale 0.96
- All gated by prefers-reduced-motion

## Components

- Floating glass nav island over hero, solid on scroll
- Primary CTA: ember filled pill; secondary: ghost on imagery / outline on paper
- FAQ: single-open accordion with keyboard support
- Pricing: two-tier split, Pro emphasized without urgency theater
