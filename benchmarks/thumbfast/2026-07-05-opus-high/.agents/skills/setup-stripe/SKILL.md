---
name: setup-stripe
description: "Strict NowStack Stripe setup: collect Stripe API keys, store secrets in Convex env, collect billing plans and prices, create Stripe products/prices, update billing code, verify"
argument-hint: "[test|live]"
---

# Setup Stripe - Strict NowStack Billing Setup

<objective>
Configure Stripe billing for a NowStack app in one strict order: verify the local Convex setup, collect Stripe API keys, write secrets to Convex env, collect the desired plans and prices, update the billing code, create products and recurring prices directly in the user's Stripe account from `convex/billing/plans.ts`, then validate.
</objective>

<strict_order>
This workflow MUST follow this order exactly. Do not reorder, merge, or skip steps unless the user explicitly asks to stop or skip the current step.

1. Preflight: verify Convex config, required files, Stripe SDK availability, and current billing plan shape.
2. API keys: collect `STRIPE_SECRET_KEY`, set it in Convex env, then run the existing webhook helper to create/update the Convex Stripe webhook and set `STRIPE_WEBHOOK_SECRET`.
3. Plans and prices: ask for the full plan matrix in one structured response.
4. Code update: update `convex/billing/plans.ts` and UI-only plan features in `src/lib/auth/stripe/auth-plans.ts`.
5. Stripe creation: create or reuse Stripe Products and recurring Prices in the user's Stripe account from `convex/billing/plans.ts`, then write the resulting Price IDs into Convex env.
6. Finish: validate, update `CHANGELOG.md`, clean temporary files, and summarize.
</strict_order>

<interaction_rules>
- Never ask for secrets and plan details in the same message.
- Never write Stripe secrets to `.env`, `.env.local`, Vercel env, `CHANGELOG.md`, or any git-tracked file.
- Do not print full secret values. Mask them as `sk_test_...1234` / `sk_live_...1234`.
- Use `request_user_input` when available and allowed for checkpoint choices. Plain text is the fallback.
- Keep the user's language for prompts and summaries.
- If the user provides a publishable key, only record whether it was provided. Do not store it unless the codebase actually needs `VITE_STRIPE_PUBLISHABLE_KEY`.
</interaction_rules>

<hard_execution_contract>
The agent MUST treat this workflow as a gated state machine, not loose guidance.

Before every step, write a compact state summary:

```text
STRIPE STATE: step={current_step}; waiting_for={none|api_keys|plan_matrix}; completed={comma-separated completed gates}
```

Rules:
- Never execute a step if its gate is missing. Go back to the step that collects the missing input.
- If user input is needed, ask exactly the requested question, then stop.
- If a command fails, do not skip forward. Fix it, retry when safe, or stop with the blocker.
- If the user changes a previous answer, update state and resume from the earliest affected step.
- If conversation context is compacted or unclear, reconstruct state from `SETUP_STRIPE_CHECKLIST.md`, local files, and the latest user messages before continuing.
</hard_execution_contract>

<checklist_protocol>
The agent MUST use a temporary root checklist file to force strict ordering.

Checklist file:
- Runtime path: `SETUP_STRIPE_CHECKLIST.md` at the project root.
- Template path: `.agents/skills/setup-stripe/templates/SETUP_STRIPE_CHECKLIST.md`.
- Create it in Step 0 before any setup command if it does not exist.
- Update it before and after every step by checking boxes and filling the state fields.
- Update it with normal file edits; do not overwrite the whole checklist unless creating it from the template.
- At the end, after validation and final summary preparation, delete it with `trash SETUP_STRIPE_CHECKLIST.md`.
- If `trash` is unavailable, do not delete files; tell the user cleanup could not run.
</checklist_protocol>

<stop_gates>
These are mandatory stop points:

| Stop Gate | Step | Stop Until |
| --- | --- | --- |
| API keys requested | 1 | User provides `STRIPE_SECRET_KEY=...` or says to stop |
| Plan matrix requested | 2 | User provides complete plan data or explicitly asks for defaults |
| Stripe creation confirmation when mode is live | 3 | User confirms creating live Stripe objects |
</stop_gates>

<gate_matrix>
| Step | Required Before Starting | Required Before Advancing |
| --- | --- | --- |
| 0 | Skill loaded | Convex checked, billing files read, Stripe SDK available |
| 1 | Step 0 complete | `STRIPE_SECRET_KEY` set in Convex env, Convex webhook endpoint registered or blocker documented |
| 2 | Step 1 complete | Complete plan matrix received and normalized |
| 3 | Step 2 complete | Billing code updated and TypeScript validation run |
| 4 | Step 3 complete | Stripe Products/Prices created or reused from `convex/billing/plans.ts`, price env vars set in Convex |
| 5 | Step 4 complete | Changelog updated, cleanup attempted, final summary complete |
</gate_matrix>

<state_variables>
Persist these values across steps:

| Variable | Description |
| --- | --- |
| `{stripe_mode}` | `test` or `live`, detected from `STRIPE_SECRET_KEY` prefix or argument |
| `{stripe_secret_key_set}` | Whether `STRIPE_SECRET_KEY` was set in Convex env |
| `{webhook_configured}` | Whether Stripe points at the Convex `/stripe/webhook` endpoint and Convex has the signing secret |
| `{plan_matrix}` | The user-provided normalized plan data applied to Convex billing code |
| `{stripe_price_envs}` | Mapping of env var names to Stripe Price IDs created or reused |
| `{code_files_updated}` | Billing files updated in Step 4 |
| `{validation_notes}` | Passed/skipped/failed verification commands |
</state_variables>

<entry_point>
Load `steps/step-00-preflight.md`.
</entry_point>

<step_files>
| Strict Step | File | Purpose |
| --- | --- | --- |
| 0 | `steps/step-00-preflight.md` | Verify setup and initialize workflow state |
| 1 | `steps/step-01-collect-keys.md` | Collect Stripe API keys and write secrets to Convex env |
| 2 | `steps/step-02-collect-plans.md` | Collect the plan and price matrix |
| 3 | `steps/step-03-update-code.md` | Update billing plan code and UI plan features |
| 4 | `steps/step-04-create-stripe.md` | Create/reuse Stripe products and prices from code, then set Convex env price IDs |
| 5 | `steps/step-05-finalize.md` | Validate, update changelog, clean up, summarize |
</step_files>

<bundled_resources>
| File | Purpose |
| --- | --- |
| `templates/SETUP_STRIPE_CHECKLIST.md` | Runtime checklist template copied to project root during Step 0 and removed at the end |
| `scripts/create-stripe-plans.mjs` | Idempotently creates/reuses Stripe products/prices from `convex/billing/plans.ts` and can write price IDs to Convex env |
</bundled_resources>

<stack_context>
This app stores billing behavior in `convex/billing.ts` and `convex/billingNode.ts`. The UI auth plans in `src/lib/auth/stripe/auth-plans.ts` provide visible plan copy and metadata.

Stripe is handled by Convex:
- Checkout and portal flows call Convex actions.
- Webhooks go to `https://<deployment>.convex.site/stripe/webhook`, mounted in `convex/http.ts`.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_*_PLAN_ID` values belong in Convex env.
- Stripe Price metadata must include `plan: "<plan-name>"` because webhook processing reads it.
</stack_context>

<important_files>
Files this workflow may modify:

| File | Change |
| --- | --- |
| `convex/billing.ts` | Billing actions and subscription/credit orchestration |
| `convex/billingNode.ts` | Stripe SDK calls and webhook processing |
| `src/lib/auth/stripe/auth-plans.ts` | UI-only features/icons and limit display labels when limits change |
| `CHANGELOG.md` | Required changelog entry |
| `SETUP_STRIPE_CHECKLIST.md` | Temporary runtime checklist, removed at the end |

Files this workflow reads:

- `.agents/rules/stripe-billing.md`
- `.agents/rules/changelog.md`
- `convex/billing.ts`
- `convex/billingNode.ts`
- `src/lib/auth/stripe/auth-plans.ts`
- `package.json`
</important_files>

<success_metrics>
- `STRIPE_SECRET_KEY` is set in Convex env.
- `STRIPE_WEBHOOK_SECRET` is set in Convex env for the registered Convex webhook endpoint.
- Every paid plan has a Stripe monthly Price ID in Convex env.
- Every paid plan with annual billing has a Stripe annual Price ID in Convex env.
- Convex billing code matches the user's plan names, limits, prices, currency, and env var names.
- `src/lib/auth/stripe/auth-plans.ts` has UI-only feature copy for every visible plan.
- `pnpm ts` passes, or any failure is documented with the exact blocker.
- `CHANGELOG.md` has a `FEATURE:` or `CHORE:` entry under today's date.
</success_metrics>

<failure_modes>
- Writing `sk_*` secrets to tracked files instead of Convex env.
- Creating Stripe prices before `convex/billing/plans.ts` reflects the plan matrix.
- Creating live Stripe objects without explicit live-mode confirmation.
- Updating UI features but not `convex/billing/plans.ts`, which is the source of truth.
- Setting price IDs in local `.env` only; Convex actions will not see them.
- Forgetting `metadata.plan` on Stripe Prices, which breaks webhook plan mapping.
</failure_modes>

## NEXT STEP

Load `steps/step-00-preflight.md`.
