---
paths:
  - "**/*.{ts,tsx}"
---

# Authentication

This project uses **Better Auth** via `@convex-dev/better-auth`. Auth state lives in Convex; helpers split between API route / route-loader server code, Convex functions, and client React components.

## Server-side helpers

Use these from API route handlers, route loaders, and other server-only utilities:

```ts
import { getUser, getRequiredUser } from "@/lib/auth/auth-user";
import {
  getCurrentOrg,
  getRequiredCurrentOrg,
} from "@/lib/organizations/get-org";

const user = await getUser();              // optional - returns null
const user = await getRequiredUser();      // throws if not authenticated

const org = await getCurrentOrg();          // optional
const org = await getRequiredCurrentOrg();  // throws
```

## Client-side helpers

```tsx
import { useSession } from "@/lib/auth-client";

function MyComponent() {
  const session = useSession();

  if (session.isPending) return <Loading />;
  if (!session.data?.user) return <LoginPrompt />;

  return <div>Hello {session.data.user.name}</div>;
}
```

## Calling Convex from the server

Use `fetchAuthQuery` / `fetchAuthMutation` / `fetchAuthAction` from `@/lib/auth-server` to invoke Convex functions as the authenticated user from route loaders and API routes:

```ts
import { fetchAuthQuery, fetchAuthMutation } from "@/lib/auth-server";
import { api } from "@convex/_generated/api";

const data = await fetchAuthQuery(api.someModule.queries.someQuery, args);
await fetchAuthMutation(api.someModule.mutations.someMutation, args);
```

## Inside Convex functions

Use the project's builders and auth helpers, not raw `ctx.auth`:

```ts
import { adminQuery, orgMutation } from "@convex/auth/functions";

export const updateOrg = orgMutation({
  roles: ["owner", "admin"],
  args: {},
  handler: async (ctx, args) => {},
});

export const listAdminData = adminQuery({
  args: {},
  handler: async (ctx) => {},
});
```
