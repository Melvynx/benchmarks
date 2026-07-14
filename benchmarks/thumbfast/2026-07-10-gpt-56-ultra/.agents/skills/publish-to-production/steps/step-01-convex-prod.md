---
name: step-01-convex-prod
description: Provision Convex production deployment and mirror all required backend env vars
prev_step: step-00-init.md
next_step: step-02-vercel-setup.md
---

# Step 1: Convex Production Setup

## Goal

Provision (or detect) the Convex production deployment, then push every backend env var the app needs into Convex prod env. After this step, `npx convex env list --prod` returns every required backend var except `STRIPE_WEBHOOK_SECRET`, which is created in step 04 after the Stripe webhook endpoint exists.

## MANDATORY EXECUTION RULES

- ✅ Mirror by default: read each var from `.env`, propose, set in Convex prod
- ✅ Use `npx convex env set --prod KEY 'value'` (note `--prod` flag)
- ✅ For values that differ from dev (e.g. `SITE_URL`), substitute the prod value
- ✅ For Stripe in live mode, prompt the user for each new live-mode value individually
- 🛑 Do not invent `STRIPE_WEBHOOK_SECRET` in this step. It belongs in Convex prod env, but the real `whsec_*` value is only available after creating the Stripe webhook endpoint in step 04.
- 🛑 NEVER set `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `DATABASE_URL`, `REDIS_URL` - they're either deprecated or unused in this stack
- 🛑 NEVER print actual secret values in terminal output. When confirming, mask: `re_***...***xyz`

## EXECUTION SEQUENCE

### 1. Ensure Convex prod deployment exists

Convex creates a prod deployment automatically the first time you run `npx convex deploy` for the project. Check if it exists first.

```bash
# This either lists vars or fails because prod doesn't exist
npx convex env list --prod 2>&1
```

**If output contains `No prod deployment` or similar error:**

The prod deployment is created on the first `npx convex deploy --prod` call OR on the first `npx convex env set --prod KEY value` call. We will create it implicitly when we set the first env var (`SITE_URL`).

**If output is `[]` or a list of vars:**

Prod deployment exists. Capture its name from `npx convex deployment list` (look for the `prod` deployment in the current project) and set `{convex_prod_deployment}`.

```bash
# Show all deployments, find the prod one for this project
npx convex deployment list 2>&1
```

If the listing isn't easy to parse, run:

```bash
# Open the dashboard in browser to see prod deployment name
npx convex dashboard --prod
```

…and ask the user for the deployment name shown there (e.g. `discerning-finch-456`). Set `{convex_prod_deployment}`.

Set:

```
{convex_prod_url}      = https://{convex_prod_deployment}.convex.cloud
{convex_prod_site_url} = https://{convex_prod_deployment}.convex.site
```

### 2. Build the canonical mirror plan

For each variable in `references/env-mapping.md` that needs to live in **Convex prod**, decide its value:

| Var                           | Source                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `SITE_URL`                    | `{prod_url}` (always)                                                                               |
| `GITHUB_CLIENT_ID`            | `.env`'s `GITHUB_CLIENT_ID` if user confirms reuse, ELSE prompt for prod-specific value             |
| `GITHUB_CLIENT_SECRET`        | matches choice above                                                                                |
| `GOOGLE_CLIENT_ID` (optional) | `.env`'s value (Google OAuth typically supports multiple redirect URIs in one client)               |
| `GOOGLE_CLIENT_SECRET`        | `.env`'s value                                                                                      |
| `RESEND_API_KEY`              | `.env`'s value                                                                                      |
| `EMAIL_FROM`                  | If `.env` value is `onboarding@resend.dev` or `*@example.com`, prompt for prod sender. Else mirror. |
| `STRIPE_SECRET_KEY`           | `{stripe_mode}=test` → mirror. `{stripe_mode}=live` → prompt for `sk_live_*`                        |
| `STRIPE_PRO_PLAN_ID`          | same logic                                                                                          |
| `STRIPE_PRO_YEARLY_PLAN_ID`   | same logic                                                                                          |
| `STRIPE_ULTRA_PLAN_ID`        | same logic                                                                                          |
| `STRIPE_ULTRA_YEARLY_PLAN_ID` | same logic                                                                                          |
| `R2_S3_URL`                   | `.env`'s value                                                                                      |
| `R2_S3_ACCESS_KEY_ID`         | `.env`'s value                                                                                      |
| `R2_S3_SECRET_ACCESS_KEY`     | `.env`'s value                                                                                      |
| `R2_S3_BUCKET_NAME`           | `.env`'s value (or prompt for dedicated prod bucket)                                                |
| `R2_URL`                      | `.env`'s value                                                                                      |

(Skip a var if its source is missing AND the var is optional.)

### 3. Show the plan and confirm

Echo a single confirmation block. Mask secrets. Example:

```
Plan: set 13 variables in Convex prod ({convex_prod_deployment})

  Var                           Source              Value (masked)
  ───────────────────────────   ─────────────────   ──────────────────────────
  SITE_URL                      derived             https://{prod_domain}
  GITHUB_CLIENT_ID              mirror .env         f9d57bb***
  GITHUB_CLIENT_SECRET          mirror .env         79eff4ee***
  GOOGLE_CLIENT_ID              mirror .env         96609205***
  GOOGLE_CLIENT_SECRET          mirror .env         GOCSPX-***
  RESEND_API_KEY                mirror .env         re_MdNrV***
  EMAIL_FROM                    mirror .env         "App <noreply@{prod_domain}>"
  STRIPE_SECRET_KEY             mirror .env (TEST)  sk_test_***   ⚠ TEST MODE
  STRIPE_PRO_PLAN_ID            mirror .env         price_***
  STRIPE_PRO_YEARLY_PLAN_ID     mirror .env         price_***
  STRIPE_ULTRA_PLAN_ID          mirror .env         price_***
  STRIPE_ULTRA_YEARLY_PLAN_ID   mirror .env         price_***
  R2_S3_URL                     mirror .env         https://*.r2.cloudflarestorage.com
  R2_S3_ACCESS_KEY_ID           mirror .env         595f7469***
  R2_S3_SECRET_ACCESS_KEY       mirror .env         53fdc70f***
  R2_S3_BUCKET_NAME             mirror .env         nowts
  R2_URL                        mirror .env         https://nowts.mlvcdn.com

Confirm? (y/n / "edit X" to override one)
```

**If user says "edit GITHUB_CLIENT_ID"** (etc), prompt for that single value, update the plan, redisplay, ask again.

### 4. Apply the plan

For each var in the plan, run sequentially (NOT in parallel - Convex env set may rate-limit):

```bash
npx convex env set --prod KEY_NAME 'value'
```

After each one, log:

```
✓ KEY_NAME set in Convex prod
```

If any single command fails:

```
✗ KEY_NAME failed: <error>
   Stopping. Fix and re-run /publish-to-production to resume.
```

### 5. Verify

Final pass:

```bash
npx convex env list --prod
```

Compare returned keys against the expected set. Report:

```
Convex prod env: 13/13 expected vars are set ✓
```

If any are missing or unexpected vars are present, list them.

## SPECIAL CASES

### Case A: User said `{stripe_mode}=live` in step 00

For each `STRIPE_*` var, do NOT mirror. Instead prompt:

```
STRIPE_SECRET_KEY (Convex prod) - paste your sk_live_* key:
```

Validate prefix:

- `STRIPE_SECRET_KEY` must start with `sk_live_`
- `STRIPE_*_PLAN_ID` must start with `price_`

If user pastes a `sk_test_*` key in live mode, reject with:

```
That looks like a test-mode key. For live mode I need sk_live_*. Paste again or type "abort":
```

### Case B: `EMAIL_FROM` is currently `onboarding@resend.dev` in `.env`

Resend's onboarding sender ONLY delivers to the email used to create the Resend account. In production this means real users will not receive any emails.

Prompt:

```
Your local EMAIL_FROM is "onboarding@resend.dev" - Resend will silently drop emails to non-test addresses with this sender.

For prod you need a verified domain in Resend.

Quick options:
  (A) I have already verified {prod_domain} in Resend → enter sender, e.g.
        "{App Name} <noreply@{prod_domain}>"
  (B) I haven't verified yet → I'll print the steps; pause here, then come back.

Enter choice and value (or "skip" to proceed with onboarding sender at your own risk):
```

If (B), print:

```
1. Open https://resend.com/domains
2. "Add Domain" → enter {prod_domain}
3. Add the printed DNS records to your DNS provider (Cloudflare, Vercel DNS, etc.)
4. Wait until status = "Verified"
5. Re-run /publish-to-production with your prod sender ready
```

### Case C: GitHub OAuth - reuse vs new

By default Better Auth supports a single OAuth callback URL per provider. Production needs `https://{prod_domain}/api/auth/callback/github` while dev uses `http://localhost:3000/api/auth/callback/github`.

GitHub OAuth Apps support a single Authorization callback URL, so you typically need TWO apps (one for dev, one for prod) and DIFFERENT client IDs in each environment.

Prompt:

```
Better Auth uses GITHUB_CLIENT_ID for OAuth. Two options:

  (A) Reuse the same GitHub OAuth App in dev + prod
        - Edit the App's "Authorization callback URL" to https://{prod_domain}/api/auth/callback/github
        - This breaks local dev OAuth until you switch back
        - Mirror current .env values to Convex prod

  (B) Create a NEW GitHub OAuth App for production (recommended)
        - Open https://github.com/settings/developers → New OAuth App
        - Homepage URL: https://{prod_domain}
        - Callback URL: https://{prod_domain}/api/auth/callback/github
        - Paste prod CLIENT_ID and CLIENT_SECRET below

Choice? (A/B):
```

If (B), prompt for the two values and set them in Convex prod.

Google OAuth differs - Google supports multiple authorized redirect URIs on a single client, so it's safe to reuse and just add `https://{prod_domain}/api/auth/callback/google` to the existing client (this is a manual step in step 04).

## CONTEXT BOUNDARIES

<available_state>
From step 00:

- `{prod_domain}`, `{prod_url}`
- `{stripe_mode}`
- `{has_oauth_github}`, `{has_oauth_google}`
- `.env` and `.env.local` values are readable
</available_state>

<produced_state>
After this step:

- `{convex_prod_deployment}` (e.g. `discerning-finch-456`)
- `{convex_prod_url}` (e.g. `https://discerning-finch-456.convex.cloud`)
- `{convex_prod_site_url}` (e.g. `https://discerning-finch-456.convex.site`)
- All required Convex prod env vars are set, except `STRIPE_WEBHOOK_SECRET` until step 04 creates the Stripe endpoint
</produced_state>

## SUCCESS METRICS

✅ `npx convex env list --prod` returns all required keys except the step-04 `STRIPE_WEBHOOK_SECRET`
✅ `SITE_URL` matches `{prod_url}` exactly
✅ User informed of any skipped vars (and which ones)
✅ Stripe mode is consistent (no test keys mixed with live)

## FAILURE MODES

❌ Setting a placeholder `STRIPE_WEBHOOK_SECRET` in Convex before the real Stripe endpoint exists
❌ Setting `SITE_URL` to `{convex_prod_site_url}` (that's the Convex backend URL, not the app URL)
❌ Continuing past a failed `npx convex env set --prod` call
❌ Mirroring `EMAIL_FROM=onboarding@resend.dev` to prod silently
❌ Mixing test and live Stripe keys

## NEXT STEP

Load `step-02-vercel-setup.md`.
