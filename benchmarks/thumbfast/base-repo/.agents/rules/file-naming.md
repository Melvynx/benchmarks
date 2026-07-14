# File Naming

## App Data Functions

Do not add TanStack server functions for app data reads, writes, billing, uploads, or admin operations. Put those behaviors in Convex modules under `convex/`.

## Convex (`convex/`)

- **Feature modules** live under a folder named after the table or feature: `convex/<feature>/{queries,mutations,actions}.ts`. Examples: `convex/auth/`, `convex/subscriptions/`, `convex/feedbacks/`, `convex/stripe/actions.ts`, `convex/email/actions.tsx`.
- **Shared backend-only helpers** live under `convex/utils/`. Keep one-off config, errors, and small shared utilities there instead of adding more root files.
- **Root files are reserved for Convex entrypoints/config plus `README.md`**: `schema.ts`, `http.ts`, `auth.config.ts`, `convex.config.ts`, and `tsconfig.json`.
- **Schema** is always `convex/schema.ts`.
- **Auth wiring** is `convex/auth.config.ts` + `convex/auth/config.ts`.
- **DTO mappers** live in `convex/<domain>/dto/<name>.ts`, one response shape per file. Export `to<Name>Dto` plus `type <Name>Dto = ReturnType<typeof to<Name>Dto>`.
- **Convex components** (Better Auth, future ones) live in `convex/<componentName>/` with their own `convex.config.ts` + `schema.ts` (precedent: `convex/betterAuth/`).
- The app's component registry is `convex/convex.config.ts` (root).
- **Never edit** `convex/_generated/**` — it's regenerated on every `pnpm convex:dev` / `pnpm postinstall`.

## Routes (`src/routes/` — TanStack Router file-based)

- `__root.tsx` — root layout (one per project)
- `route.tsx` — layout route at this URL segment (renders `<Outlet />` for children). Example: `src/routes/auth/route.tsx`
- `index.tsx` — leaf route at the same URL segment as its parent folder
- `$param.tsx` / `$param/` — dynamic segment. Use `$orgSlug`, `$orgId`, `$slug`, etc. **Do not use Next.js `[slug]` bracket syntax** — TanStack uses `$`.
- `(group)/` — pathless route group (e.g. `(navigation)/`, `(layout)/`, `(logged-in)/`). The directory name is wrapped in parens and contributes nothing to the URL.
- `_components/` and `_actions/` — private directories whose contents are **excluded** from routing. Use `_components/` for route-local components; only use `_actions/` for route-local non-ServerFn helpers when unavoidable.
- Files prefixed with `-` (e.g. `-helper.ts`) are also excluded from routing.

## Schemas

- `<feature>.schema.ts` for Zod schemas next to the code that uses them (e.g. `signup.schema.ts`).

## Components

- Shadcn primitives: `src/components/ui/<name>.tsx` (lowercase-kebab, single word per file)
- Project-shared custom components: `src/components/nowts/<name>.tsx`
- Feature-local components: `src/features/<feature>/<name>.tsx`
- Route-local components: `src/routes/.../_components/<name>.tsx`
- Filenames are kebab-case; the default export is PascalCase

## Hooks

- `src/hooks/use-<name>.ts` (kebab-case, `use-` prefix). The exported hook is `useName` (camelCase).

## Tests

- Unit (Vitest): `src/__tests__/<name>.test.ts` or `<name>.test.tsx`
- Unit test helpers/setup: `src/test/<name>.ts` or `<name>.tsx`
- E2E (Playwright): `e2e/<name>.spec.ts`
