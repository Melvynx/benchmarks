# Code Conventions

## TypeScript

- Use `type` over `interface` (enforced by ESLint)
- Prefer functional components with TypeScript types
- No enums - use maps instead
- Strict TypeScript configuration
- Prefer `??` over `||`

## Styling

- Mobile-first with TailwindCSS v4
- Use Shadcn/UI components from `src/components/ui/`
- Custom components in `src/components/nowts/`
- Use the shared typography components in `@/components/nowts/typography.tsx` for paragraphs and headings (instead of raw `<p>` / `<h1>` etc.)
- For spacing, prefer utility layouts: `flex flex-col gap-4` (vertical), `flex gap-4` (horizontal). Avoid `space-y-*` / `space-x-*`.
- Prefer `@/components/ui/card.tsx` for styled wrappers over custom `<div>` styles

## State Management

- Zustand for global UI state (see `src/features/dialog-manager/dialog-store.ts`)
- Convex React hooks for server state — use `useQuery` / `useMutation` from `convex/react`
- For URL state, use TanStack Router search params (`Route.useSearch`, `useSearch`). This project does **not** use `nuqs`.

## Forms and Mutations

**CRITICAL**: Use TanStack Form for ALL new forms — `react-hook-form` is deprecated. Some legacy tests/components still use `useZodForm` from `@/components/ui/form`; do not propagate that pattern.

- See `.agents/rules/tanstack-form.md`
- Submit forms through Convex mutations/actions or Better Auth client helpers.
- Do not add TanStack server functions for app data mutations.

## Authentication

- See `.agents/rules/authentication.md`

## Backend / Database

- Convex (no Prisma, no Postgres). Schema in `convex/schema.ts`.
- See `.agents/rules/convex-imports.md` and `.agents/rules/convex-queries.md`
- Always read `convex/_generated/ai/guidelines.md` before writing Convex functions

## Dialog System

- See `.agents/rules/dialog-manager.md`

## API Requests

- All HTTP calls SHOULD use `@/lib/up-fetch.ts`. NEVER use raw `fetch`.

## File Storage

- The single backend is **Cloudflare R2**. Upload via `convex/files/actions.ts` (uses `@aws-sdk/client-s3` against R2's S3-compatible endpoint). The action returns the public URL and throws on failure.
- Required env vars (Convex backend env): `R2_S3_URL`, `R2_S3_ACCESS_KEY_ID`, `R2_S3_SECRET_ACCESS_KEY`, `R2_S3_BUCKET_NAME`, `R2_URL`.
