# Product

## Register

product

## Users

Remote workers, distributed teams, and digital nomads scheduling across timezones.
They arrive mid-task ("when can the three of us meet this week?"), stay under two
minutes, and leave with a time range. Often consulted on a phone right before
sending a meeting invite.

## Product Purpose

A timezone overlap checker. Two modes: Meeting (hours when everyone across all
selected cities is awake) and Base (each city compared independently against a
reference city). The core surface is a 24-column hour grid anchored to the
reference city, plus an overlap summary with concrete time ranges. Success =
the user can read the answer (the green window) in one glance without decoding.

## Brand Personality

Calm, precise, nocturnal. A quiet instrument for a global desk: dark surface,
one green accent that means exactly one thing (overlap), monospaced hours.
Confidence through restraint, not decoration.

## Anti-references

- Airline-dashboard density: ten pill styles, five accent colors, badges everywhere.
- World-clock widget kitsch: globes, maps, analog clocks, day/night gradients as decoration.
- SaaS hero-metric styling on what is a working tool.

## Design Principles

1. The grid is the answer. Everything else (header, settings, summary) supports
   reading the green window faster; nothing may compete with it visually.
2. Green = overlap, and nothing else. The accent is a semantic channel, not a theme.
3. Numbers are data: mono, tabular, aligned. Labels are quiet sans.
4. Zero states teach: no overlap and no cities are moments to guide, not dead ends.
5. Density with hierarchy: a 24×N grid is inherently dense; contrast in weight and
   luminance does the organizing, not boxes inside boxes.

## Accessibility & Inclusion

- WCAG AA: body text ≥4.5:1 on the dark surface; cell states distinguishable by
  more than hue (luminance + weight + texture for sleeping cells).
- Full keyboard support on combobox, toggles, and promote/remove actions.
- `prefers-reduced-motion` honored on all animations.
