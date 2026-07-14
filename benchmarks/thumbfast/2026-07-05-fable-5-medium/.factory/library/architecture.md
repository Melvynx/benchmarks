# Architecture

Architectural decisions, patterns discovered.

---

## Listing Pages Pattern

Listing pages follow a consistent pattern:
- Server component at `app/orgs/[orgSlug]/(navigation)/{entity}/page.tsx` renders a client component
- Client component at `{entity}-page-client.tsx` handles data fetching, infinite scroll, and rendering
- Cards are defined in the same file as the listing page client component, either inline or as extracted function components
- Data fetching uses `useInfiniteQuery` with cursor-based pagination

## Dialog System

- `dialogManager` from `@/features/dialog-manager/dialog-manager` provides `.confirm()`, `.input()`, `.custom()`
- Used globally for confirmations and input prompts
- No need to render dialog components — they're managed by the store

## Server Actions Pattern

- Actions defined in `*.action.ts` files using `orgAction` from `safe-actions`
- Called via `resolveActionResult(actionFn(input))` on the client
- Wrapped in `useMutation` from TanStack Query for loading/error states

## Query Invalidation

- Each feature domain has a `*Keys` object (e.g., `promptKeys`, `videoKeys`, `personKeys`)
- After mutations, invalidate via `queryClient.invalidateQueries({ queryKey: keys.all })`
