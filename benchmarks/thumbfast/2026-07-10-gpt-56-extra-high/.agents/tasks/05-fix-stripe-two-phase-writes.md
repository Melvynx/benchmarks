# 05 - Add rollback / single-source-of-truth to Stripe two-phase writes

**Severity**: BLOCKING (Logic Resilience + Logic Correctness agreed)
**Risk**: HIGH - touches real-money flows. Test against Stripe test mode end-to-end before merging.
**Depends on**: nothing structural, but read `.agents/rules/stripe-billing.md` first

## Problem

Several admin/server actions mutate Stripe **and then** Convex sequentially with no rollback. If the second call fails the two systems diverge silently:

| Site | File | What can drift |
|------|------|----------------|
| Upgrade flow | `src/features/plans/plans.action.ts` lines ~39-48 | `stripe.customers.create` succeeds, `setOrgStripeCustomerId` fails -> orphaned Stripe customer; next retry creates a duplicate |
| Admin "create subscription" | `src/routes/admin/organizations/$orgId/_actions/subscription-admin.actions.ts` lines ~187-204 | `stripe.subscriptions.create` succeeds (customer billed), Convex `upsert` fails -> org charged but stays on free plan |
| Admin "change plan" | same file lines ~70-84 | Stripe plan updated, Convex `update` fails -> Stripe shows new plan, app shows old |
| Admin "cancel" | same file lines ~100-108 | Stripe `cancel_at_period_end: true`, Convex `cancelAtPeriodEnd: false` -> UI still shows active |

In addition, `convex/subscriptions/mutations.ts:updateFromWebhook` silently returns `null` when the subscription does not exist (line ~126), masking the case where `checkout.session.completed` failed and a later `customer.subscription.updated` arrives for an unknown subscription.

And `convex/stripe/actions.ts` `customer.subscription.deleted` handler (lines ~169-178) calls `updateFromWebhook` with only `{ status: "canceled" }`, leaving stale `periodEnd` from the previous active state on the row.

## Files

| Path | What to change |
|------|----------------|
| `src/features/plans/plans.action.ts` | Wrap customer-create + setOrgStripeCustomerId in try/catch; on Convex failure, `stripe.customers.del(customer.id)` then re-throw |
| `src/routes/admin/organizations/$orgId/_actions/subscription-admin.actions.ts` | Same shape for create/update/cancel actions. Prefer "Convex first, Stripe second" where possible. Where Stripe must come first (creating a real subscription), wrap in try/catch and **cancel** the Stripe subscription on Convex failure. |
| `convex/subscriptions/mutations.ts` `updateFromWebhook` | When no row matches, **throw** instead of returning `null`, so the webhook handler can log it and Stripe will retry. |
| `convex/stripe/actions.ts` `customer.subscription.deleted` branch | Pass `periodEnd` and `cancelAtPeriodEnd` from the event payload, not just `status`. |
| `.agents/rules/stripe-billing.md` | Read for the architectural picture |

## Acceptance criteria

1. Every Stripe + Convex paired write either:
   - Runs Convex first when safe, OR
   - Wraps both in try/catch with a compensating Stripe action on Convex failure, OR
   - Relies entirely on the webhook to reconcile (i.e. removes the optimistic Convex write).
2. `updateFromWebhook` no longer silently swallows the no-match case. Either throws or returns a discriminated result that the caller in `convex/stripe/actions.ts` logs and converts to a non-2xx response so Stripe retries.
3. `customer.subscription.deleted` writes a complete payload including `periodEnd` and `cancelAtPeriodEnd` derived from the Stripe event.
4. The existing happy-path behavior is unchanged - normal upgrades, cancellations, plan changes still work.

## Implementation notes

For the upgrade flow:

```ts
// src/features/plans/plans.action.ts
const customer = await stripe.customers.create({ ... });
try {
  await fetchAuthMutation(api.auth.mutations.setOrgStripeCustomerId, {
    organizationId,
    stripeCustomerId: customer.id,
  });
} catch (err) {
  await stripe.customers.del(customer.id).catch(() => {/* best effort */});
  throw err;
}
```

For the "change plan" admin action - the cleanest fix is to **stop writing the plan to Convex from the admin action** and let `customer.subscription.updated` webhook do it (single source of truth). Verify Stripe sends webhooks to the Convex `POST /stripe/webhook` endpoint and `STRIPE_WEBHOOK_SECRET` is stored in Convex env.

For "cancel" - the Stripe webhook also fires `customer.subscription.updated` with the new `cancel_at_period_end` value, so the Convex write in the admin action is also redundant. Same fix.

For the create flow specifically - decide once: webhook-first or optimistic-with-rollback. Both are valid; pick one and document it in `.agents/rules/stripe-billing.md`.

## Verification

```bash
pnpm ts
pnpm lint:ci
```

End-to-end against Stripe **test mode**:

1. Upgrade an org, fail the Convex mutation deliberately (e.g. throw inside `setOrgStripeCustomerId`). Confirm the Stripe customer is deleted (check Stripe dashboard).
2. Cancel a subscription via the UI. Confirm Stripe shows `cancel_at_period_end=true` AND Convex shows `cancelAtPeriodEnd=true` after the webhook fires (check `.logs/convex.txt` for the webhook event).
3. Trigger `customer.subscription.deleted` via Stripe CLI: `stripe trigger customer.subscription.deleted`. Confirm `periodEnd` on the Convex row is set to the actual end timestamp, not stale.
4. Manually call `updateFromWebhook` with an unknown `stripeSubscriptionId` - it must throw, not return null silently.

## Out of scope

- The `by_stripe_id` index on optional field issue (Logic Correctness Issue #1) - that's a schema-level concern and can be its own task.
- The `upsertFromWebhook` duplicate-row-on-existing-free-plan issue - related but separate; flag it on this PR but punt the fix.
