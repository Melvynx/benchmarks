# Codex

A timezone overlap checker built with React, TypeScript, and Vite.

## Run

```sh
pnpm install
pnpm dev
```

Open http://localhost:9188. The development and preview servers use strict port 9188.

Requires Node.js 22.6 or newer. The test suite uses Node's built-in test runner and TypeScript stripping, so it needs no installed dependencies.

## Checks

```sh
pnpm test
pnpm build
```

Meeting mode highlights hours shared by everyone. Base mode compares each city independently against the first city; the reference row highlights the union of those pairwise windows. Click any city name to change the reference. Settings and cities are saved locally without an account.

Offsets use the current date through the browser's IANA timezone database, including DST and fractional offsets. Each grid cell samples the beginning of its reference-hour slot; fractional local times remain visible. Range ends are exclusive. Equal wake and sleep hours mean awake for 24 hours. Midnight-ending ranges carry a +1 marker. Mobile uses a separate transposed layout.
