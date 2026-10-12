# GPT-6

A responsive timezone overlap checker built with React, TypeScript, and Vite.

## Run

```sh
pnpm install
pnpm dev
```

The app runs at http://localhost:9195. The port is fixed and strict.

## Checks

```sh
pnpm test
pnpm build
```

Tests use Node 22.6+ and cover DST, fractional timezone offsets, availability boundaries, overnight schedules, split windows, and default city overlap.

Meeting mode finds availability shared by every city. Base mode finds availability independently between each city and the first city; the reference row highlights the union of those pairwise windows. Click a city name to promote it to the reference position.

Preferences and the city list are saved locally. Equal wake and sleep hours mean 24-hour availability. Each column samples its start time; summary ranges describe qualifying one-hour slots, with their end exclusive. Fractional offsets remain visible in local cell labels. UTC offsets are derived from the current instant and refreshed each minute.
