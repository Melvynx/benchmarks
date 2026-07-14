# Development Commands

For starting the app locally (`pnpm start-all`, `pnpm dev`, `pnpm convex:dev`, etc.), see **`.agents/rules/start-commands.md`**. This file covers the rest.

## Type-checking, lint, format

| Command        | Effect                               |
| -------------- | ------------------------------------ |
| `pnpm ts`      | `tsc --noEmit` — fast type check     |
| `pnpm lint`    | ESLint with `--fix`                  |
| `pnpm lint:ci` | ESLint without `--fix` (CI mode)     |
| `pnpm clean`   | `tsc --noEmit && prettier --write .` |
| `pnpm format`  | Prettier on the whole repo           |
| `pnpm knip`    | Detect unused exports / dead files   |

## Build / production

| Command      | Effect                                            |
| ------------ | ------------------------------------------------- |
| `pnpm build` | Production Vite build                             |
| `pnpm start` | Run the built server (`.output/server/index.mjs`) |

## Convex

| Command              | Effect                                                 |
| -------------------- | ------------------------------------------------------ |
| `pnpm convex:dev`    | `pnpm exec convex dev` — codegen + dev sync            |
| `pnpm convex:deploy` | `pnpm exec convex deploy` — push to current deployment |

`postinstall` runs `pnpm exec convex codegen` automatically.

## Testing

**ALWAYS use the CI variants** — interactive modes are incompatible with Claude Code.

- `pnpm test:ci` — Vitest run (`__tests__/`)
- `pnpm test:e2e:ci` — Playwright headless (`e2e/`)

**NEVER run** `pnpm test` (vitest watch) or `pnpm test:e2e` (Playwright UI).

## Stripe webhooks

Webhooks (dev and prod) go directly to the Convex deployment URL (`POST /stripe/webhook`). Do not forward Stripe to a TanStack `/api/webhooks/stripe` route; that route no longer exists. Register `https://<deployment>.convex.site/stripe/webhook` in Stripe and store the signing secret in Convex env.

## Email templates

- `pnpm email` — React Email preview server (iterate on templates in `emails/`)
