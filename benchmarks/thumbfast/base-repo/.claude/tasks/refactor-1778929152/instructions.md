# Refactor: Convex-first feature backend

## Objective
Replace feature-local API query and `safe-actions` usage with real Convex queries, mutations, and actions while preserving the existing UI, client state, route behavior, and feature logic.

## Pattern to Find
- `*.action.ts` files importing `@/lib/actions/safe-actions`
- feature query helpers that call internal `/api/orgs/...` endpoints through `upfetch`
- UI components using `resolveActionResult`, `isActionSuccessful`, or action functions from `*.action.ts`
- feature routes that fetch first-party app data from `/api/orgs/...`

## Transformation
- Add or reuse Convex functions under `convex/app.ts` or feature-appropriate `convex/*` modules.
- Client components should use `useQuery`, `useMutation`, or `useAction` from `convex/react` against `api.*` generated Convex functions.
- Server routes/loaders should use `fetchAuthQuery`, `fetchAuthMutation`, or `fetchAuthAction` from `src/lib/auth-server.ts` when they need authenticated Convex access.
- Preserve current response shapes where the UI expects them, or adapt only the thin query/action helper layer so UI markup and state logic stay unchanged.
- Do not introduce Prisma/Postgres/Neon runtime code. Keep backend state in Convex.
- Do not use the deleted/non-working `safe-actions` wrapper.
- Do not change UI styling, layout, text, or interaction semantics except where imports/wiring must change.
- Do not use raw `fetch` for app API calls. External URL downloads are acceptable only where they are genuinely external/browser file reads.
- Follow existing generated Convex types when available. Run `pnpm exec convex codegen` if Convex function names or return types change.

## Examples
Before:
```ts
const mutation = useMutation({
  mutationFn: () => resolveActionResult(createPersonAction(input)),
});
```

After:
```ts
const createPerson = useMutation(api.app.createPerson);
const mutation = useMutation({
  mutationFn: () => createPerson(input),
});
```

Before:
```ts
export function listPersons(orgSlug: string) {
  return upfetch<Person[]>(`/api/orgs/${orgSlug}/persons`);
}
```

After:
```ts
export function usePersons(orgSlug: string) {
  return useQuery(api.app.listPersons, { orgSlug });
}
```

## Constraints
- Only modify files in your assigned feature scope unless a shared Convex helper is strictly necessary.
- You are not alone in the codebase. Other workers may edit adjacent features; do not revert edits made by others.
- Keep ownership boundaries clear and mention every file you changed.
- Read at least three similar files or existing patterns before editing.
- Compare relevant behavior against `main` when uncertain.
