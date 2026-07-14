---
paths:
  - "convex/**/*.ts"
  - "src/lib/auth/stripe/auth-plans.ts"
  - "src/lib/billing/**/*.ts"
---

# Convex Authorization, DTOs, And Billing Constants

## Function Guards

- **CRITICAL**: Org/admin Convex functions must use builders from `@convex/auth/functions`; do not hand-roll `requireOrganizationAccess`, `requireAdmin`, or raw `ctx.auth` checks in each handler.
- Use `orgQuery`, `orgMutation`, or `orgAction` for organization-scoped work. The builder resolves `args.organizationId` from `organizationId` or `organizationSlug`; use the resolved `args.organizationId` inside the handler.
- Use `adminQuery`, `adminMutation`, or `adminAction` only for platform-admin work, and keep those functions under `convex/admin/`.
- Do not create extra wrappers like `orgAdminMutation`. Combine `orgMutation` with `roles` or `permission`:

```ts
export const updateOrganization = orgMutation({
  roles: ["owner", "admin"],
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.organizationId, { name: args.name });
  },
});
```

- Use `roles` for coarse organization roles (`owner`, `admin`, `member`). Use `permission` for Better Auth permission checks. Do not duplicate the same check again in the handler.
- If an org function must exclude platform-admin bypass, create/use a `makeOrgQuery` / `makeOrgMutation` / `makeOrgAction` variant with `allowPlatformAdmin: false`; do not add inline admin exceptions.

## DTOs

- **CRITICAL**: If a Convex response needs a shaped object, create a DTO mapper in `convex/<domain>/dto/<name>.ts`; do not inline repeated response mapping in queries.
- One DTO file per response shape. Export `to<Name>Dto(...)` and `type <Name>Dto = ReturnType<typeof to<Name>Dto>`.
- DTO inputs should use generated Convex document types, for example `Doc<"table">` or Better Auth component docs from `@convex/betterAuth/_generated/dataModel`. Do not duplicate table shapes by hand.
- DTO functions are pure shape converters: no `ctx`, no database reads, no auth checks, no Stripe calls.
- Keep joins/read orchestration in helpers or queries, then call DTO methods at the return boundary.

## Billing Plans

- **CRITICAL**: Plan names, prices, limits, Stripe env var names, trial days, paid-plan lists, and active subscription statuses live in `convex/billing/plans.ts`.
- Never duplicate literals like `"pro"`, `"ultra"`, `"active"`, `"trialing"`, or `"past_due"` in admin, Stripe, subscription, or UI logic. Import helpers such as `getBillingPlan`, `getPaidBillingPlan`, `getPlanStripePriceId`, and `isActiveSubscriptionStatus`.
- `src/lib/auth/stripe/auth-plans.ts` derives UI auth plans from `convex/billing/plans.ts`; add new plan data in the Convex billing config first.

## Naming

- Public Convex function names should describe the domain action: `patchById`, `updateSubscriptionPlan`, `createOrganizationCheckout`. Avoid vague names like `update`, `getAll`, or `doThing` in exported APIs.
- Webhook-only subscription mutations stay internal and keep the `FromWebhook` suffix. Never expose them as public `mutation`.
