---
paths:
  - "**/stripe*"
  - "**/stripe/**"
  - "**/billing/**"
  - "**/plans/**"
  - "**/*subscription*"
  - "**/subscriptions/**"
---

# Stripe Billing

Entry points:

- **Upgrade / portal / admin billing flows** -> Convex actions call the Stripe SDK.
- **Webhook** -> Convex `httpAction` at `https://<deployment>.convex.site/stripe/webhook` -> `internal.stripe.actions.processWebhook` -> internal subscription mutations.

Stripe webhooks **never** go through a Vercel/TanStack route — that legacy stub was removed. All webhook handling lives in `convex/http.ts` + Convex billing functions.

## Key files

| File                                | Purpose                                                                 |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `convex/billing.ts`                 | Org billing actions and subscription state orchestration                 |
| `convex/billingNode.ts`             | Stripe SDK calls and webhook processing                                 |
| `convex/credits.ts`                 | Shared credit balance and ledger logic                                  |
| `convex/http.ts`                    | Mounts `POST /stripe/webhook`                                           |
| `convex/schema.ts`                  | Subscription, credit balance, credit transaction, and provider key tables |
| `src/features/billing/`             | Org billing UI                                                          |
| `src/lib/auth/stripe/auth-plans.ts` | UI plan copy and Better Auth plan metadata                              |

## `subscriptions` table

Defined in `convex/schema.ts`. Indexes: `by_organization`, `by_stripe_id`, `by_status`. Fields most code touches: `organizationId`, `plan`, `status` (`active` / `trialing` / `past_due` / `canceled`), `stripeCustomerId`, `stripeSubscriptionId`, `periodStart` / `periodEnd` (ms), `cancelAtPeriodEnd`, `seats`, `overrideLimits`.

## Mutation visibility (don't break this)

| Function                                                                              | Access                         | Caller                          |
| ------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------- |
| `convex/subscriptions.queries.getByOrganization`, `getActiveByOrganization`           | `orgQuery`                     | org UI                          |
| `convex/admin/subscriptions.*`                                                        | `adminQuery` / `adminMutation` | admin UI/actions                |
| `convex/admin/billing.*`                                                              | `adminAction`                  | admin UI                        |
| `convex/stripe/actions.createOrganizationCheckout`, `createOrganizationBillingPortal` | `orgAction` owner/admin        | org billing UI                  |
| `upsertFromWebhook`, `updateFromWebhook`                                              | **internal**                   | only `convex/stripe/actions.ts` |

Never expose `*FromWebhook` as public mutations.

## Environment variables

Convex env (`pnpm exec convex env set KEY value`) - used by Convex billing functions:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET` (Convex-only - signature verification happens inside the `httpAction`)
- `STRIPE_PRO_PLAN_ID`, `STRIPE_PRO_YEARLY_PLAN_ID`
- `STRIPE_ULTRA_PLAN_ID`, `STRIPE_ULTRA_YEARLY_PLAN_ID`

Web app env - used by the TanStack app/client:

- `STRIPE_SECRET_KEY` (also)
- `VITE_STRIPE_PUBLISHABLE_KEY` (only if embedding Stripe Elements)
- All `STRIPE_*_PLAN_ID` vars (also)

## Adding a new plan

1. Stripe Dashboard: create Product + monthly + annual Prices. Set `plan: "<name>"` in each Price's metadata (the webhook reads it).
2. Add `STRIPE_<NAME>_PLAN_ID` and `STRIPE_<NAME>_YEARLY_PLAN_ID` to Convex env AND Vercel.
3. Add the plan once in Convex billing config/code. Do not duplicate the plan name elsewhere.
4. Add matching UI copy in `src/lib/auth/stripe/auth-plans.ts` only if the plan needs UI-only feature copy.

## Webhook setup

Register the webhook endpoint in Stripe manually or through deployment tooling:

- URL: `https://<deployment>.convex.site/stripe/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Secret: store the Stripe signing secret in Convex env as `STRIPE_WEBHOOK_SECRET`

## Local webhook testing

Stripe webhooks target the Convex deployment URL, not the local TanStack server. Register `https://<dev-deployment>.convex.site/stripe/webhook` in Stripe and store the signing secret in Convex env. If you genuinely need to inspect webhook traffic, point the Stripe CLI at the Convex dev URL: `stripe listen --forward-to https://<dev-deployment>.convex.site/stripe/webhook`.
