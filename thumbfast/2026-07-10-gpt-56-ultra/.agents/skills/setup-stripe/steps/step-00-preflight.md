---
name: step-00-setup-stripe-preflight
description: Strict step 0 - verify Convex, Stripe, and billing setup before collecting keys
next_step: steps/step-01-collect-keys.md
---

# Step 0: Preflight

## Mandatory Rules

- This is always the first step.
- Do not ask for secrets until this step passes.
- Do not edit billing code in this step.
- Read the Stripe billing and changelog rules before continuing.

## Gate

Start only when the skill is invoked. Before doing anything, declare:

```text
STRIPE STATE: step=0; waiting_for=none; completed=none
```

Create the runtime checklist before setup commands:

```bash
test -f SETUP_STRIPE_CHECKLIST.md || cp .agents/skills/setup-stripe/templates/SETUP_STRIPE_CHECKLIST.md SETUP_STRIPE_CHECKLIST.md
```

Then update `SETUP_STRIPE_CHECKLIST.md`:

- Fill `Current step` with `0`.
- Fill `Waiting for` with `none`.
- Check `[x] Runtime checklist created`.
- Check `[x] Step 0 started`.

## Sequence

### 1. Read required guidance

Read:

- `.agents/rules/stripe-billing.md`
- `.agents/rules/changelog.md`
- `convex/billing.ts`
- `convex/billingNode.ts`
- `src/lib/auth/stripe/auth-plans.ts`
- `package.json`

### 2. Verify Convex local config

```bash
test -f .env.local && grep -E '^(CONVEX_DEPLOYMENT|VITE_CONVEX_URL|VITE_CONVEX_SITE_URL)=' .env.local
```

If missing, run:

```bash
pnpm exec convex dev --once
```

If Convex asks for login/team/project selection, stop and let the user complete it.

### 3. Verify Stripe SDK and webhook target

```bash
node -e "import('stripe').then(() => console.log('stripe ok'))"
test -f .agents/skills/setup-stripe/scripts/create-stripe-plans.mjs && echo "price helper ok"
rg -n '"/stripe/webhook"|/stripe/webhook' convex/http.ts convex/billingNode.ts
```

### 4. Inspect current billing shape

Use `rg` to locate current Stripe env names and paid plans:

```bash
rg -n "STRIPE_.*PLAN_ID|BILLING_PLANS|ADDITIONAL_FEATURES|PlanLimit|subscription|credit" convex/billing.ts convex/billingNode.ts src/lib/auth/stripe/auth-plans.ts
```

Update `SETUP_STRIPE_CHECKLIST.md`:

- Check `[x] Convex configuration checked`.
- Check `[x] Billing files read`.
- Check `[x] Stripe SDK and webhook target verified`.
- Check `[x] Step 0 complete`.
- Set `Current step` to `1`.
- Set `Waiting for` to `api_keys`.

Then declare:

```text
STRIPE STATE: step=1; waiting_for=api_keys; completed=preflight
```

Load `./step-01-collect-keys.md`.
