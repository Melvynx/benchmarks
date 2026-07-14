---
name: step-02-setup-stripe-collect-plans
description: Strict step 2 - collect the desired plan and price matrix
prev_step: steps/step-01-collect-keys.md
next_step: steps/step-03-update-code.md
---

# Step 2: Collect Plans And Prices

## Mandatory Rules

- Start only if Step 1 is complete.
- Ask for plan data in one structured prompt.
- Do not create Stripe objects until the plan matrix is complete.
- Keep `free` as the zero-price baseline unless the user explicitly asks to remove or hide it.

## Gate

Before asking for plans, read `SETUP_STRIPE_CHECKLIST.md` and verify:

- `[x] Step 1 complete`
- `Current step: 2`

Ask:

```text
Send the Stripe plan matrix you want.

For each paid plan, include:
- name
- description
- monthly price
- yearly price
- currency
- trial days
- limits
- visible features
- whether it is popular or hidden

Example:
pro: $29/mo, $290/year, USD, 14 trial days, limits projects=20 storage=50 members=10, popular, features: ...
ultra: $99/mo, $990/year, USD, 14 trial days, limits projects=100 storage=1000 members=100, features: ...
```

Then STOP until the user answers.

## Normalize Plan Data

Normalize every paid plan into the fields that will be applied directly to `convex/billing/plans.ts`:

```json
{
  "name": "pro",
  "description": "For growing teams",
  "price": 29,
  "yearlyPrice": 290,
  "currency": "USD",
  "trialDays": 14,
  "isPopular": true,
  "isHidden": false,
  "limits": {
    "projects": 20,
    "storage": 50,
    "members": 10
  },
  "features": [
    "Custom branding",
    "Embed widgets"
  ],
  "stripePriceEnv": "STRIPE_PRO_PLAN_ID",
  "stripeAnnualPriceEnv": "STRIPE_PRO_YEARLY_PLAN_ID"
}
```

Rules:
- Plan names must be lowercase kebab-case.
- Currency must be uppercase in code and lowercase only when passed to Stripe.
- `price` and `yearlyPrice` are human currency units, not cents.
- Generate env names as `STRIPE_<PLAN>_PLAN_ID` and `STRIPE_<PLAN>_YEARLY_PLAN_ID` unless the user explicitly gives different names.
- `features` are UI-only copy for `src/lib/auth/stripe/auth-plans.ts`.
- Limits must match `PlanLimit` keys unless Step 4 updates `PlanLimit`, `DEFAULT_PLAN_LIMITS`, `LIMITS_CONFIG`, and admin override behavior consistently.
- Do not create a temporary plan JSON file. `convex/billing/plans.ts` is the source of truth and Step 4 reads it directly.

## Checklist

Update `SETUP_STRIPE_CHECKLIST.md`:

- Check `[x] Step 2 started`.
- Check `[x] Plan matrix received`.
- Check `[x] Plan matrix normalized`.
- Fill `Plan names`.
- Set `Current step` to `3`.
- Set `Waiting for` to `none`.
- Check `[x] Step 2 complete`.

Then declare:

```text
STRIPE STATE: step=3; waiting_for=none; completed=preflight,api_keys,convex_env,webhook,plans
```

Load `./step-03-update-code.md`.
