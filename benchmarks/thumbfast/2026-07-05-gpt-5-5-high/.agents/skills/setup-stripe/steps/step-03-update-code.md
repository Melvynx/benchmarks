---
name: step-03-setup-stripe-update-code
description: Strict step 3 - update NowStack billing plan code to match requested Stripe plans
prev_step: steps/step-02-collect-plans.md
next_step: steps/step-04-create-stripe.md
---

# Step 3: Update Billing Code

## Mandatory Rules

- Start only if Step 2 is complete.
- Before editing files under `convex/`, read `convex/_generated/ai/guidelines.md`.
- `convex/billing/plans.ts` is the source of truth for plan names, prices, limits, trial days, and Stripe env var names.
- `src/lib/auth/stripe/auth-plans.ts` should only contain UI-only features/icons and limit display labels.
- Do not hardcode Stripe Price IDs in source code. Use env var names.
- Do not create a temporary plan JSON file.

## Gate

Before editing, read:

- `SETUP_STRIPE_CHECKLIST.md`
- `convex/_generated/ai/guidelines.md`
- `convex/billing/plans.ts`
- `src/lib/auth/stripe/auth-plans.ts`

Verify:

- `[x] Step 2 complete`
- `Current step: 3`

## Update `convex/billing/plans.ts`

Apply the normalized plan matrix:

- Keep or update the `free` plan as the zero-price baseline.
- Update `BillingPlanDefinition` only if the plan model truly needs more fields.
- Keep `price` and `yearlyPrice` in human currency units.
- Set `currency` to uppercase.
- Set `stripePriceEnv` / `stripeAnnualPriceEnv` to the env names that Step 4 will write.
- Set `trialDays`, `isPopular`, and `isHidden` from the plan matrix.
- Update `PlanLimit`, `DEFAULT_PLAN_LIMITS`, and `PLAN_LIMIT_KEYS` only when the user changed limit dimensions.

## Update `src/lib/auth/stripe/auth-plans.ts`

Apply UI-only details:

- Update `LIMITS_CONFIG` when limit dimensions or labels changed.
- Update `ADDITIONAL_FEATURES` so every visible plan has clear feature copy.
- Add Lucide icons only from `lucide-react`.
- Do not duplicate price, limit, or env data already derived from `BILLING_PLANS`.

## Validate

Run:

```bash
pnpm ts
```

If the plan limit shape changed, also run:

```bash
pnpm lint:ci
```

If either command fails, fix the issue and rerun. If blocked by unrelated existing failures, record the exact blocker in `SETUP_STRIPE_CHECKLIST.md`.

## Checklist

Update `SETUP_STRIPE_CHECKLIST.md`:

- Check `[x] Step 3 started`.
- Check `[x] Convex guidelines read`.
- Check `[x] Billing plan source updated`.
- Check `[x] UI plan features updated`.
- Check `[x] TypeScript validation passed or documented`.
- Fill `Code files updated`.
- Fill `Validation notes`.
- Set `Current step` to `4`.
- Set `Waiting for` to `none`.
- Check `[x] Step 3 complete`.

Then declare:

```text
STRIPE STATE: step=4; waiting_for=none; completed=preflight,api_keys,convex_env,webhook,plans,code_updated
```

Load `./step-04-create-stripe.md`.
