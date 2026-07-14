---
paths: "**/*.tsx"
---

### React/Next.js

- Use `"use client"` only for Web API access in small components
- Wrap client components in `Suspense` with fallback
- **ALWAYS use `PageProps<"/route/path">`** for page components — NEVER create local PageProps types

### Styling

- Use typography components from `@/components/ui/typography.tsx` for text
- Prefer `flex flex-col gap-4` over `space-y-4` for spacing
- Prefer `Card` from `@/components/ui/card.tsx` over custom styled divs

### State Management

- `nuqs` for URL search params
- Zustand for global state
- TanStack Query for server state

### Forms

**CRITICAL**: ALWAYS use TanStack Form from `@/features/form/tanstack-form`. NEVER use React Hook Form.

- Read `tanstack-form.tsx` for `useForm`, `Form`, `form.AppField` pattern and available field components
- Use `resolveActionResult` helper for server action mutations
- Server actions in `*.action.ts` files
