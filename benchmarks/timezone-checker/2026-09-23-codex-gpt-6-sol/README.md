# GPT-6

A timezone overlap checker for distributed schedules. It uses React, TypeScript, and Vite.

## Run

```sh
pnpm install
pnpm dev
```

Open http://127.0.0.1:9174.

## Checks

```sh
pnpm check:time
pnpm check:render
pnpm test
pnpm build
```

Meeting mode highlights hours when every selected city is awake. Base mode compares each city independently with the first city in the list. The 24 columns are anchored to the reference city's current local day. Configuration is stored in the browser's localStorage.
