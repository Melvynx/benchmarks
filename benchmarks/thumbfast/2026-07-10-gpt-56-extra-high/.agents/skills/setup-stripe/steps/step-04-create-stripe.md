---
name: step-04-setup-stripe-create-products-prices
description: Strict step 4 - create or reuse Stripe products and prices from convex/billing/plans.ts
prev_step: steps/step-03-update-code.md
next_step: steps/step-05-finalize.md
---

# Step 4: Create Stripe Products And Prices

## Mandatory Rules

- Start only if Step 3 is complete.
- Use the user's Stripe secret key through Convex env or process env.
- Never create live Stripe products/prices without explicit live-mode confirmation.
- Use the bundled helper instead of hand-writing Stripe API calls inline.
- The helper must read `BILLING_PLANS` from `convex/billing/plans.ts`; do not create a temporary plan JSON file.
- Ensure every Stripe Price has `metadata.plan` set to the plan name.

## Gate

Before creating Stripe objects, read `SETUP_STRIPE_CHECKLIST.md` and verify:

- `[x] Step 3 complete`
- `Current step: 4`
- `convex/billing/plans.ts` contains the final paid plans and Stripe env var names

If `Stripe mode` is `live`, ask:

```text
Confirm that I should create or reuse live Stripe products and prices now.
```

Stop until confirmed.

## Run Helper

Dry-run first. This reads `convex/billing/plans.ts` through `pnpm exec tsx` and does not touch Stripe or Convex env:

```bash
node .agents/skills/setup-stripe/scripts/create-stripe-plans.mjs --dry-run
```

If the dry-run output matches the intended `BILLING_PLANS`, create/reuse Stripe objects and set price IDs in Convex env:

```bash
node .agents/skills/setup-stripe/scripts/create-stripe-plans.mjs --set-convex-env
```

For live mode, after explicit confirmation, prefix the real command:

```bash
SETUP_STRIPE_LIVE_CONFIRMED=1 node .agents/skills/setup-stripe/scripts/create-stripe-plans.mjs --set-convex-env
```

Verify Convex price envs:

```bash
pnpm exec convex env list | rg 'STRIPE_.*PLAN_ID'
```

Record the env names and Price IDs in `SETUP_STRIPE_CHECKLIST.md`. Price IDs are not secrets, but keep the output concise.

## Webhook URL

The webhook helper from Step 1 uses `VITE_CONVEX_SITE_URL` from `.env.local` and registers:

```text
https://<convex-deployment>.convex.site/stripe/webhook
```

It must not register a localhost webhook for the normal NowStack flow.

## Checklist

Update `SETUP_STRIPE_CHECKLIST.md`:

- Check `[x] Step 4 started`.
- Check `[x] Stripe creation dry-run reviewed`.
- Check `[x] Stripe products/prices created or reused`.
- Check `[x] Stripe price IDs set in Convex env`.
- Fill `Stripe price envs`.
- Set `Current step` to `5`.
- Set `Waiting for` to `none`.
- Check `[x] Step 4 complete`.

Then declare:

```text
STRIPE STATE: step=5; waiting_for=none; completed=preflight,api_keys,convex_env,webhook,plans,code_updated,stripe_prices
```

Load `./step-05-finalize.md`.
