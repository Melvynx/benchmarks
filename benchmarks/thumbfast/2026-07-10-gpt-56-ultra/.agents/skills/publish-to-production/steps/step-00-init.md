---
name: step-00-init
description: Preflight checks, gather context from existing state, ask only what cannot be auto-detected
prev_step: ../SKILL.md
next_step: step-01-convex-prod.md
---

# Step 0: Preflight + Context Gathering

## Goal

Before mutating any cloud state, verify CLIs and read everything we can from the local repo so the rest of the workflow is autonomous.

## MANDATORY EXECUTION RULES (READ FIRST)

- ✅ Run preflight commands in parallel where possible (read-only)
- ✅ Decide values from existing state - never ask the user a question we can answer ourselves
- ✅ The ONLY things we may ask in this step:
  1. `{prod_domain}` (cannot be auto-detected)
  2. Confirmation of `{stripe_mode}` if local Stripe key is `sk_test_*` (loud warning before continuing)
  3. Confirmation that the user is ready to proceed (single yes/no, not a list of questions)
- 🛑 If a CLI is missing, STOP and surface the install command. Do not continue.
- 🛑 If `git status` shows uncommitted changes that will affect the deploy, ask before continuing (Vercel deploys from `git`, so uncommitted changes will not ship).

## EXECUTION PROTOCOLS

### 1. CLI preflight (parallel)

Run these read-only commands in parallel:

```bash
# Convex CLI
npx convex --version

# Vercel CLI
vercel --version

# Stripe CLI (only required for postdeploy step 04, but warn now if missing)
stripe --version || echo "MISSING_STRIPE_CLI"

# gh CLI (used to validate the GitHub repo is connected)
gh --version || echo "MISSING_GH_CLI"

# git state
git rev-parse --is-inside-work-tree
git status --short
git rev-parse --abbrev-ref HEAD

# Existing Vercel link
test -f .vercel/project.json && cat .vercel/project.json || echo "NO_VERCEL_LINK"

# Existing Vercel project settings
vercel project inspect || echo "NO_VERCEL_PROJECT_SETTINGS"

# Existing .env.local (for CONVEX_DEPLOYMENT pointer)
test -f .env.local && grep -E '^(CONVEX_DEPLOYMENT|VITE_CONVEX_URL|VITE_CONVEX_SITE_URL)=' .env.local || echo "NO_ENV_LOCAL"

# Existing .env (for the secret values to mirror to prod)
test -f .env && echo "OK_ENV_PRESENT" || echo "NO_ENV"

# Convex prod existence (does NOT create one - just checks)
npx convex env list --prod 2>&1 | head -5
```

**Interpret results:**

| Output                            | Meaning                                            | Action                                                               |
| --------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| `npx convex --version` errors     | Convex CLI not installed via npx (rare with `npx`) | `pnpm i convex` or rerun in repo                                     |
| `vercel --version` errors         | Vercel CLI not installed                           | `npm i -g vercel` (suggest globally)                                 |
| `MISSING_STRIPE_CLI`              | Stripe CLI not installed                           | `brew install stripe/stripe-cli/stripe` - flag for step 04, continue |
| `MISSING_GH_CLI`                  | gh CLI not installed                               | Optional, continue                                                   |
| `git status --short` non-empty    | Uncommitted changes                                | Warn - the deploy will use the last pushed commit                    |
| `NO_VERCEL_LINK`                  | Project not linked to a Vercel project yet         | Will be handled in step 02                                           |
| `NO_VERCEL_PROJECT_SETTINGS`      | Vercel project settings could not be read          | Will be handled in step 02                                           |
| `NO_ENV_LOCAL` / `NO_ENV`         | Local dev not bootstrapped                         | STOP - run `/init-project` or `npx convex dev` first                 |
| Convex prod listing returns `[ ]` | Prod deployment exists but empty                   | Will be filled in step 01                                            |
| Convex prod errors with "no prod" | No prod deployment exists yet                      | Will be created in step 01                                           |

### 2. Read local state into variables

Read into memory (don't echo secret values):

```bash
# Source the local env files
[ -f .env.local ] && set -a && . ./.env.local && set +a
[ -f .env ] && set -a && . ./.env && set +a
```

(Or read each file with the `Read` tool and extract values - whichever the runtime supports. The point is to learn:)

| Read                          | Use to determine                                                |
| ----------------------------- | --------------------------------------------------------------- |
| `STRIPE_SECRET_KEY` prefix    | `{stripe_mode}` = `live` if `sk_live_*` else `test`             |
| `GITHUB_CLIENT_ID` non-empty  | `{has_oauth_github}` = true                                     |
| `GOOGLE_CLIENT_ID` non-empty  | `{has_oauth_google}` = true                                     |
| `EMAIL_FROM`                  | Suggest prod sender (replace any `onboarding@resend.dev` value) |
| `R2_*` set                    | If unset, file uploads will not work in prod - warn             |
| `.vercel/project.json` exists | Skip vercel link creation, but read project name + team slug    |

### 3. Ask the user ONLY this

Show a single consolidated message:

```
Production deploy preflight:

✓ Convex CLI: <version>
✓ Vercel CLI: <version>
[✓ or ⚠] Stripe CLI: <version or "missing - will need it for webhook setup">
[✓ or ⚠] gh CLI: <version or "missing - optional">

Repo state:
- Branch: <branch>
- Last commit: <short sha + subject>
- Uncommitted changes: <none | N files - they will NOT ship>

Local dev state:
- Convex dev deployment: <name from .env.local>
- Stripe mode locally: <test | live>  [⚠ if test mode and asking for prod]
- GitHub OAuth configured: <yes/no>
- Google OAuth configured: <yes/no>
- Vercel project linked: <yes (name) | no, will create>

I need ONE thing from you to proceed:

  → Production domain (no protocol), e.g. app.example.com:
    [user enters value]

After that I will:
  1. Provision Convex prod deployment + mirror env vars
  2. Link/configure the Vercel project + prune Vercel env
  3. Verify Convex deploy keys and trigger the first deploy
  4. Walk through Stripe webhook + OAuth callback updates

Proceed? (y/n)
```

**If user gives the prod domain:**

- Set `{prod_domain}` = the domain string the user entered (strip leading `https://`, trailing `/`)
- Set `{prod_url}` = `https://{prod_domain}`

**If `{stripe_mode}` == `test` AND user is doing a real launch (not just rehearsal):**

```
⚠ Heads up: your local STRIPE_SECRET_KEY is sk_test_* (test mode).

For a real production launch you need:
  - sk_live_* secret key (Stripe Dashboard → Developers → API keys)
  - pk_live_* publishable key
  - new live-mode price IDs for STRIPE_*_PLAN_ID (created against the live products)

Two options:
  (A) Continue with test keys for now - good for staging / rehearsal
  (B) Switch to live keys before continuing - I'll prompt you for each value in step 01

Which? (A/B)
```

Persist the answer in `{stripe_mode}` for step 01. If (B), step 01 will prompt for each Stripe value individually instead of mirroring.

### 4. Confirm and continue

Once the user confirms, summarize the resolved state and proceed:

```
Resolved:
  prod_domain         = {prod_domain}
  prod_url            = {prod_url}
  stripe_mode         = {stripe_mode}
  has_oauth_github    = {has_oauth_github}
  has_oauth_google    = {has_oauth_google}
  vercel_project      = {vercel_project_name or "(will be created)"}

Continuing with step 01: provision Convex prod...
```

Then load `step-01-convex-prod.md`.

## CONTEXT BOUNDARIES

<available_state>
Nothing yet - this is the entry step. Sets all initial state variables.
</available_state>

<produced_state>
After this step, the following variables are set:

- `{prod_domain}`, `{prod_url}` (from user)
- `{stripe_mode}` (auto-detected, user-confirmed)
- `{has_oauth_github}`, `{has_oauth_google}` (auto-detected)
- `{vercel_project_name}`, `{vercel_team_slug}` (from `.vercel/project.json` if it exists, else null)
- `{dry_run}`, `{skip_postdeploy}` (from user message flags)
  </produced_state>

## SUCCESS METRICS

✅ All required CLIs are present
✅ Local dev state is sane (`.env.local` has Convex pointers, `.env` has secrets)
✅ User has provided `{prod_domain}` and confirmed `{stripe_mode}`
✅ Single consolidated question shown - not a Q&A loop

## FAILURE MODES

❌ Asking for env values that already exist locally (we will mirror them)
❌ Continuing past missing Convex CLI or Vercel CLI
❌ Continuing if `.env.local` has no `CONVEX_DEPLOYMENT` (the dev environment was never bootstrapped)
❌ Silently using test-mode Stripe keys when the user asked to publish to production

## NEXT STEP

Load `step-01-convex-prod.md`.
