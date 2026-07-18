# Design System

## Overview

Restrained product UI for a focused email client. A clean white workspace supports dense inbox scanning; crimson is reserved for the active mailbox, primary actions, and important feedback.

## Color

```css
:root {
  --bg: oklch(1 0 0);
  --surface: oklch(.976 .004 30);
  --surface-strong: oklch(.948 .007 30);
  --ink: oklch(.245 .018 28);
  --muted: oklch(.49 .016 28);
  --line: oklch(.89 .008 28);
  --primary: oklch(.56 .19 34);
  --primary-soft: oklch(.94 .035 34);
  --accent: oklch(.43 .11 250);
  --success: oklch(.48 .12 145);
  --warning: oklch(.67 .14 75);
  --danger: oklch(.54 .2 28);
}
```

## Type

System sans stack: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`. Compact product scale with 12px metadata, 14px body, 16px content, and 20px primary workspace heading.

## Layout

Three-part desktop shell: top command bar, slim rail/sidebar, and mail workspace. On narrow screens, the navigation becomes a drawer and the reading view replaces the message list.

## Components

Icon buttons are 36px desktop and 42px touch-friendly mobile. Primary actions are solid crimson. Lists rely on clean dividers, row state, typography, and metadata alignment rather than cards.

## Motion

State transitions use 160-220ms easing. Mail rows, drawers, menus, and compose panels honor reduced-motion preferences.
