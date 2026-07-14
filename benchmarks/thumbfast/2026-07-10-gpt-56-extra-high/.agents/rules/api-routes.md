---
paths:
  - "src/routes/api/**/*.ts"
---

# API Routes

API routes in this project use `createAPIFileRoute` from `@tanstack/react-start/api`. They live under `src/routes/api/` and return a standard `Response`.

## Critical: no middleware on API routes

`createAPIFileRoute` does **not** support a declarative `.middleware([...])` chain.

- For **API routes** (`createAPIFileRoute`): call auth helpers inline at the top of the handler, wrap the body in `try`/`catch`, end with `handleApiError(e)`.
- Do not add TanStack server functions for app data mutations. Use Convex queries, mutations, and actions.

`@/lib/api-middleware` only exports `handleApiError`. Auth helpers live in `@/lib/auth/auth-user` and `@/lib/organizations/get-org`.

## Canonical pattern

```ts
import { handleApiError } from "@/lib/api-middleware";
import { HttpError } from "@/lib/errors/http-error";
import { ApplicationError } from "@/lib/errors/application-error";
import { getRequiredUser, isAdmin } from "@/lib/auth/auth-user";
import { getRequiredCurrentOrg } from "@/lib/organizations/get-org";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { z } from "zod";

const BodySchema = z.object({ name: z.string().min(1) });

export const APIRoute = createAPIFileRoute("/api/orgs/$orgId")({
  POST: async ({ request, params }: { request: Request; params: { orgId: string } }) => {
    try {
      const user = await getRequiredUser();
      const org = await getRequiredCurrentOrg({ id: params.orgId });
      if (!isAdmin(user)) throw new HttpError("Forbidden", 403);

      const body = BodySchema.parse(await request.json());

      // ... do work, e.g. fetchAuthMutation(api.foo.bar, ...)

      return Response.json({ ok: true, orgId: org.id, body });
    } catch (e) {
      return handleApiError(e);
    }
  },
});
```

## Errors → status codes

`handleApiError` maps thrown errors to responses:

| Throw                                | Response                                    |
| ------------------------------------ | ------------------------------------------- |
| `new HttpError("…", 401 \| 403 \| 404 \| …)` | `{ message }` with that status              |
| `new ApplicationError("…")`          | `{ message }` with `400`                    |
| `z.ZodError` (e.g. `Schema.parse(…)`) | `{ message: "Validation error", errors }` with `422` |
| Anything else                        | `{ message }` with `500` (full message in DEV, generic in prod) |

Use `HttpError` whenever you need a non-400 status from inside an API route.

## Webhooks

Webhook routes (`src/routes/api/webhooks/*.ts`) typically don't run user auth — they verify a signature and return early on failure with `Response.json({ error }, { status: 400 })` so the upstream provider sees the right status. They still benefit from `handleApiError` for unexpected errors.

The Stripe webhook in production goes to **Convex** (not to a TanStack route) — see `.agents/rules/stripe-billing.md`.
