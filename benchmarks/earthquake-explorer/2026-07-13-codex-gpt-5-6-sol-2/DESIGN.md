# Design System

## Theme

Night field station under low task lighting: neutral near-black surfaces reduce glare, mineral green marks active selection, and ember marks seismically notable values. The color strategy is restrained and data-led.

## Color

- Background: `oklch(0.115 0 0)`
- Surface: `oklch(0.155 0.008 160)`
- Raised surface: `oklch(0.205 0.012 160)`
- Ink: `oklch(0.955 0.006 160)`
- Muted: `oklch(0.72 0.018 160)`
- Primary: `oklch(0.62 0.115 160)`
- Accent: `oklch(0.72 0.16 47)`
- Danger: `oklch(0.62 0.20 28)`

## Typography

Use the native system sans stack for interface text and the native monospace stack for coordinates, timestamps, and measurements. Use a compact fixed scale with strong numeric alignment.

## Layout

Desktop is a three-part instrument: temporal strip, central map, and event stream, with details sliding over the map edge. Mobile uses a purpose-built Map/Stream switch and a bottom detail sheet. Panels use 8 to 12px corners, fine separators, and no decorative shadows.

## Components

Controls share a 44px minimum height, visible focus ring, and pressed states. Event rows carry magnitude as a shaped numeric token, not color alone. Alert and data-integrity states combine text, icons, and restrained semantic color.

## Motion

Use 160 to 220ms ease-out transitions for selection, panel movement, and map synchronization. Remove movement under `prefers-reduced-motion`.
