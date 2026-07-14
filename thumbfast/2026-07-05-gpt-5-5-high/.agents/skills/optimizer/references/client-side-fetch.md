<client_side_fetch_reference>
<overview>
Client-side data patterns for NowStack. The stack is **TanStack Start + Convex**: server data is fetched through Convex React hooks (`convex/react`) for live, reactive data. API routes and route loaders call Convex through `fetchAuthQuery` / `fetchAuthMutation` when they need server-only checks; client components subscribe directly to Convex.
</overview>

<table_of_contents>

1. Convex query in a component
2. Route guards and initial loading
3. URL state via TanStack Router search params
4. Mutations
5. Optimistic updates
6. Server-side Convex calls
7. Custom async queries
</table_of_contents>

<convex_query_in_component>
The canonical hook for client data:

```tsx
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

export function ActiveSubscription({ orgId }: { orgId: string }) {
  const subscription = useQuery(
    api.subscriptions.queries.getActiveByOrganization,
    orgId ? { organizationId: orgId } : "skip",
  );

  if (subscription === undefined) return <Skeleton />;
  if (!subscription) return <FreePlanBadge />;
  return <PlanBadge plan={subscription.plan} />;
}
```

`useQuery(api.x.y, args)` subscribes to Convex reactively. Pass `"skip"` until required args are available.
</convex_query_in_component>

<route_guards_and_initial_loading>
For auth redirects, default organization redirects, or server-only checks, call the server-only helper directly from `beforeLoad`. Then subscribe to live Convex data in the component:

```ts
import { getRequiredUser } from "@/lib/auth/auth-user";
import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";

async function authGuard() {
  const user = await getRequiredUser();
  return { userId: user.id };
}

export const Route = createFileRoute("/(logged-in)")({
  beforeLoad: async () => {
    try {
      await authGuard();
    } catch {
      throw redirect({ to: "/auth/signin" });
    }
  },
  component: () => <Outlet />,
});

function AccountPage() {
  const session = useQuery(api.auth.queries.getSession, {});
  if (session === undefined) return <Skeleton />;
  return <AccountDetails session={session} />;
}
```

</route_guards_and_initial_loading>

<url_state>
This project does **not** use `nuqs`. URL state lives in TanStack Router search params:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const SearchSchema = z.object({
  page: z.number().int().positive().default(1),
  status: z.enum(["all", "active", "trialing", "canceled"]).default("all"),
  q: z.string().default(""),
});

export const Route = createFileRoute("/admin/subscriptions/")({
  validateSearch: SearchSchema,
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const { page, status, q } = Route.useSearch();
  const navigate = Route.useNavigate();

  // ... use page/status/q in Convex useQuery args
  // navigate({ search: (prev) => ({ ...prev, page: prev.page + 1 }) })
}
```

</url_state>

<mutations>
For simple Convex mutations, call `useMutation` from `convex/react` directly. Alias it to `useConvexMutation` when a file also uses TanStack Query mutations.

```tsx
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";

export function RemoveMemberButton({
  memberId,
  organizationId,
}: {
  memberId: string;
  organizationId: string;
}) {
  const removeMember = useConvexMutation(api.auth.mutations.removeMember);

  const handleClick = async () => {
    try {
      await removeMember({ memberIdOrEmail: memberId, organizationId });
      toast.success("Member removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed");
    }
  };

  return <Button onClick={handleClick}>Remove</Button>;
}
```

Why direct Convex mutation is enough for simple calls:

- Convex queries are live - any data mutated on the server propagates to subscribers without manual `invalidateQueries`.
- A wrapper adds ceremony when you only need one awaited call.

Use TanStack Query `useMutation` for imperative lifecycle state around a Convex mutation, especially in forms and dialogs:

```tsx
import { useMutation as useQueryMutation } from "@tanstack/react-query";
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";

const sendSupportRequest = useConvexMutation(
  api.contact.mutations.sendSupportRequest,
);

const mutation = useQueryMutation({
  mutationFn: (values: ContactSupportInput) => sendSupportRequest(values),
  onSuccess: () => {
    toast.success("Your message has been sent.");
    form.reset();
  },
  onError: () => {
    toast.error("An error occurred");
  },
});
```

For optimistic UI, use Convex's built-in `.withOptimisticUpdate(...)` (see next section).

For mutations that need side effects like Stripe or R2, expose a Convex action and call it with `useAction`:

```ts
import { api } from "@convex/_generated/api";
import { useAction } from "convex/react";

const createCheckout = useAction(api.stripe.actions.createOrganizationCheckout);
await createCheckout({
  organizationSlug,
  plan: "pro",
  successUrl: "/billing/success",
  cancelUrl: "/billing",
});
```

</mutations>

<optimistic_updates>
For instantly-reflected mutations (toggling a flag, reordering a list), use Convex's built-in `.withOptimisticUpdate(...)` on a Convex mutation. Convex patches the local query store, then reverts/confirms once the server replies - no manual query invalidation or rollback bookkeeping.

```tsx
import { useMutation as useConvexMutation } from "convex/react";
import { api } from "@convex/_generated/api";

export function PinButton({
  feedbackId,
  organizationId,
  pinned,
}: {
  feedbackId: Id<"feedbacks">;
  organizationId: string;
  pinned: boolean;
}) {
  const togglePin = useConvexMutation(
    api.feedbacks.mutations.togglePin,
  ).withOptimisticUpdate((localStore, { feedbackId, pinned }) => {
    const list = localStore.getQuery(api.feedbacks.queries.list, {
      organizationId,
    });
    if (!list) return;

    localStore.setQuery(
      api.feedbacks.queries.list,
      { organizationId },
      list.map((f) => (f._id === feedbackId ? { ...f, pinned } : f)),
    );
  });

  return (
    <Button onClick={() => togglePin({ feedbackId, pinned: !pinned })}>
      {pinned ? "Unpin" : "Pin"}
    </Button>
  );
}
```

For purely client-side optimism scoped to a single component (no shared cache), React 19's `useOptimistic` is also a valid pattern - see `src/routes/orgs/$orgSlug/(navigation)/settings/members/org-members-form.tsx` for an example combining `useOptimistic` with a Better Auth `authClient` mutation.
</optimistic_updates>

<server_side_convex_calls>
Inside API routes or route loaders, call Convex through the typed helpers in `@/lib/auth-server`. They forward the auth token automatically:

```ts
import { fetchAuthQuery, fetchAuthMutation } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";

const sub = await fetchAuthQuery(api.subscriptions.queries.getByOrganization, {
  organizationId,
});

await fetchAuthMutation(api.auth.mutations.updateOrganization, {
  organizationId,
  data: { name },
});
```

</server_side_convex_calls>

<custom_async_queries>
Use the local `useAsyncQuery` helper only for non-Convex async reads, such as a browser-only API or an endpoint that is not exposed as a Convex query:

```ts
import { useAsyncQuery } from "@/hooks/use-async-query";

const result = useAsyncQuery({
  queryKey: ["external-report", reportId],
  enabled: Boolean(reportId),
  queryFn: () => fetchReport(reportId),
});
```

Do not use `useAsyncQuery` as a replacement for Convex `useQuery`; it has no live subscription semantics.
</custom_async_queries>
</client_side_fetch_reference>
