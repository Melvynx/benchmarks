---
name: step-01-setup-stripe-collect-keys
description: Strict step 1 - collect Stripe API keys, set Convex env, and configure the webhook
prev_step: steps/step-00-preflight.md
next_step: steps/step-02-collect-plans.md
---

# Step 1: Collect API Keys

## Mandatory Rules

- Start only if Step 0 is complete.
- Ask only for Stripe API keys in this step.
- Never write keys to files.
- Never print full key values.
- Backend Stripe secrets go to Convex env only.

## Gate

Before asking for keys, read `SETUP_STRIPE_CHECKLIST.md` and verify:

- `[x] Step 0 complete`
- `Current step: 1`

Ask:

```text
Send the Stripe API key lines for this environment:

STRIPE_SECRET_KEY=sk_test_...

Optional, only if your app uses Stripe Elements:
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

I will store backend secrets in Convex env, not in local files.
```

Then STOP until the user answers.

## Processing User Input

Accept `KEY=value` lines. Required:

- `STRIPE_SECRET_KEY`

Optional:

- `VITE_STRIPE_PUBLISHABLE_KEY`

Detect `{stripe_mode}`:

- `sk_test_` -> `test`
- `sk_live_` -> `live`

If the key starts with `sk_live_`, explicitly confirm before mutating Stripe or Convex:

```text
This is a live Stripe secret key. Confirm that I should configure live billing for this app.
```

Stop until confirmed.

## Set Convex Env

Mask the value in any user-visible output, then run:

```bash
pnpm exec convex env set STRIPE_SECRET_KEY "$STRIPE_SECRET_KEY"
```

Verify the key exists without printing it:

```bash
pnpm exec convex env get STRIPE_SECRET_KEY >/dev/null && echo "STRIPE_SECRET_KEY set"
```

Register the Convex webhook endpoint in Stripe:

```bash
echo "Register https://<deployment>.convex.site/stripe/webhook in Stripe, then store the signing secret in Convex env as STRIPE_WEBHOOK_SECRET."
```

Verify:

```bash
pnpm exec convex env list | rg 'STRIPE_SECRET_KEY|STRIPE_WEBHOOK_SECRET'
```

If `VITE_STRIPE_PUBLISHABLE_KEY` was provided, inspect the codebase before deciding where it belongs:

```bash
rg -n "VITE_STRIPE_PUBLISHABLE_KEY|loadStripe|Elements" src convex
```

Only set or document it if the app actually uses Stripe Elements. Do not store it by habit.

## Checklist

Update `SETUP_STRIPE_CHECKLIST.md`:

- Check `[x] Step 1 started`.
- Check `[x] STRIPE_SECRET_KEY set in Convex env`.
- Check `[x] Stripe webhook helper run`.
- Check `[x] Convex Stripe env verified`.
- Fill `Stripe mode`.
- Set `Current step` to `2`.
- Set `Waiting for` to `plan_matrix`.
- Check `[x] Step 1 complete`.

Then declare:

```text
STRIPE STATE: step=2; waiting_for=plan_matrix; completed=preflight,api_keys,convex_env,webhook
```

Load `./step-02-collect-plans.md`.
