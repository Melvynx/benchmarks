# Groundwave Design System

## Theme

A field observatory at first light: graphite instruments, clear white plotting stock, cultivated moss controls, and mineral amber reserved for notable signals. Restrained color strategy with spatial structure supplied by contour lines, graticules, and precise rules.

## Color

All implementation colors use OKLCH tokens. The primary is moss green at hue 150. Alert colors are semantic and always paired with text, shape, or icon cues.

- Background: pure white
- Raised surface: cool near-white
- Ink: green-tinted near-black
- Muted ink: cool slate green
- Primary: deep moss
- Accent: mineral amber
- Destructive: iron red
- Selection: dark mineral blue

## Typography

System sans for all interface text. Tabular numbers and coordinate readouts use the system monospace stack. Type uses a compact fixed scale, clear weight contrast, and 1.45 minimum body line height.

## Layout

Desktop is a three-part observatory: context and controls in the header, geography and time as the main instrument, and the event stream as a persistent comparison rail. Event detail opens inline over the stream without replacing the map. Mobile uses an explicit Map / Events switch and a bottom detail sheet.

## Components

Controls use 10px radii, solid boundaries, and consistent 44px targets. Event rows are full-width buttons with magnitude discs, depth texture, time, and status text. Map marks vary by magnitude through size and stroke count, not color alone. Skeletons preserve the final layout.

## Motion

State transitions run 160–220ms with ease-out curves. Selection uses position-preserving highlights. Reduced motion removes all transforms and smooth scrolling.
