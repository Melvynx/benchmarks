---
name: optimizer
description: This skill should be used when the user asks to "optimize", "improve performance", "add state management", "add URL state", or mentions Zustand, TanStack Form, client-side fetching with Convex, optimistic updates, or custom async mutation/query hooks. Provides best practices for state management, URL state via TanStack Router, data fetching with Convex queries, and forms.
---

<objective>
Guide optimal patterns for NowStack application development. Covers Zustand for global UI state, direct Convex React hooks for live server data, TanStack Form for form handling, TanStack Router search params for URL state, TanStack Query mutations for imperative async lifecycle state, and local `useAsyncQuery` helpers for non-Convex async reads. This stack is **TanStack Start + Convex** — there are no Next.js Server Components, no `"use cache"` directive, and no `cacheTag`/`revalidateTag` semantics here.

If the optimization target is Convex database bandwidth, documents read vs
returned, `.filter()` scans, index design, or expensive Convex query syntax,
use `convex-cost-optimizer` first.
</objective>

<quick_start>
<decision_tree>
**Choose the right tool:**

| Need                               | Solution                                      | Reference                         |
| ---------------------------------- | --------------------------------------------- | --------------------------------- |
| Shared UI state between components | Zustand store                                 | `references/state-management.md`  |
| LocalStorage-persisted state       | Zustand with `persist` middleware             | `references/state-management.md`  |
| URL state (filters, pagination)    | TanStack Router search params (`useSearch`)   | `references/client-side-fetch.md` |
| Server data on a route             | Server guard/loader + Convex `useQuery`       | `references/client-side-fetch.md` |
| Live-updating server data          | `useQuery(api.x.y, args)` from `convex/react` | `references/client-side-fetch.md` |
| Convex mutation                    | `useMutation(api.x.y)` from `convex/react`    | `references/client-side-fetch.md` |
| Non-reactive async read            | `useAsyncQuery`                               | `references/client-side-fetch.md` |
| Imperative async mutation lifecycle | TanStack Query `useMutation` or `useAction`   | `references/client-side-fetch.md` |
| Optimistic mutation                | Convex `.withOptimisticUpdate(...)`           | `references/client-side-fetch.md` |
| Form handling                      | TanStack Form                                 | `references/forms.md`             |

</decision_tree>

<zustand_quick>

```ts
import { create } from "zustand";

type MyStore = {
  value: string;
  setValue: (value: string) => void;
};

export const useMyStore = create<MyStore>((set) => ({
  value: "",
  setValue: (value) => set({ value }),
}));
```

</zustand_quick>

<convex_query_quick>

```ts
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

const subscription = useQuery(
  api.subscriptions.queries.getActiveByOrganization,
  org.id ? { organizationId: org.id } : "skip",
);
```

</convex_query_quick>

<tanstack_form_quick>

```tsx
import { useForm, Form } from "@/features/form/tanstack-form";

const form = useForm({
  schema: MySchema,
  defaultValues: { field: "" },
  onSubmit: async ({ value }) => {
    await mutation.mutateAsync(value);
  },
});

<Form form={form}>
  <form.AppField name="field">{(field) => <field.Input />}</form.AppField>
  <form.SubmitButton>Submit</form.SubmitButton>
</Form>;
```

</tanstack_form_quick>
</quick_start>

<core_principles>
<zustand_when>
**Use Zustand when:**

- Sharing UI state between multiple components (open/closed dialogs, sidebars, preferences)
- Persisting client-side state to localStorage
- State must be reachable from outside React (e.g. `dialogManager.confirm(...)`)

**Do NOT use Zustand for:**

- Server data — use Convex `useQuery` / `useMutation`
- URL state — use TanStack Router search params
- Form state — use TanStack Form
</zustand_when>

<query_when>
**Use Convex React hooks when:**

- Fetching Convex data from React components
- You want live subscription updates
- Multiple components read the same backend data
- You need Convex optimistic updates

**Do NOT use React Query for:**

- One-off computed values that don't hit Convex (use `useMemo`)
- Data that has zero re-render value (compute it inline)
- Convex subscriptions already handled by `convex/react`

**Use TanStack Query mutations for:**

- Imperative form submissions that need `isPending`, `mutateAsync`, `onSuccess`,
  or `onError`
- Wrapping Convex mutations/actions when the UI needs lifecycle callbacks
</query_when>

<form_when>
**ALWAYS use TanStack Form for new forms:**

- Validates with Zod
- Handles loading states
- Integrates with mutations
- Pre-built field components in `@/features/form/tanstack-form`

**Legacy:** A few existing components still use `useZodForm` from `@/components/ui/form` (react-hook-form). Don't propagate that pattern — convert if you touch the file.
</form_when>
</core_principles>

<anti_patterns>
<wrong>
Using `useState` for state that lives in multiple components:

```tsx
// BAD - state duplicated in each component
const [isOpen, setIsOpen] = useState(false);
```

</wrong>
<right>
```tsx
// GOOD - single source of truth
const isOpen = useDialogStore((s) => s.isOpen);
```
</right>

<wrong>
Fetching in `useEffect`:
```tsx
// BAD - no caching, no loading state, no live updates
useEffect(() => {
  fetch("/api/data").then(setData);
}, []);
```
</wrong>
<right>
```ts
// GOOD - Convex query through convex/react
const feedback = useQuery(api.feedbacks.queries.listAdmin, {});
```
</right>

<wrong>
Calling Convex directly with raw `fetch` to the Convex HTTP endpoint:
```ts
// BAD - bypasses auth wiring
const res = await fetch(`${convexUrl}/api/run/...`);
```
</wrong>
<right>
```ts
// GOOD - authenticated server-to-Convex calls
import { fetchAuthQuery, fetchAuthMutation } from "@/lib/auth-server";
const data = await fetchAuthQuery(api.feedbacks.queries.list, {});
```
</right>
</anti_patterns>

<reference_guides>

- **`references/client-side-fetch.md`** — Convex queries, route loaders, search params, optimistic mutations
- **`references/state-management.md`** — Zustand store patterns and persistence
- **`references/forms.md`** — TanStack Form patterns, validation, auto-save
</reference_guides>

<success_criteria>

- Zustand used for shared UI state, never for server data
- All client-side Convex data is fetched via `useQuery(api.x.y, args)` from `convex/react`
- TanStack Form used for new forms, with Zod validation
- URL state lives in route search params, not local component state
- Convex mutations rely on reactive subscriptions, with optimistic updates only when the UI needs instant local feedback
</success_criteria>
