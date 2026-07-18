---
name: step-03-deploy
description: Verify Convex deploy keys in Vercel and trigger first prod deploy
prev_step: step-02-vercel-setup.md
next_step: step-04-postdeploy.md
---

# Step 3: Deploy

## Goal

Vercel should already have the deploy keys from step 02. Once those are present, every git push automatically deploys both Convex and Vercel through `npx convex deploy --cmd 'npm run build'`.

## MANDATORY EXECUTION RULES

- ✅ Verify Vercel has only the expected Convex deploy keys
- ✅ Use `vercel --prod --yes` for first deploy (non-interactive)
- ✅ Tail Vercel build logs and surface failures with the actual error line
- 🛑 NEVER print the full deploy key value
- 🛑 NEVER skip Vercel link verification - ensure `.vercel/project.json` is correct before deploying
- 🛑 NEVER run `vercel --prod` if `CONVEX_DEPLOY_KEY` is missing in Vercel env (the build will fail with no Convex auth)

## EXECUTION SEQUENCE

### 1. Final Pre-Deploy Sanity Check

```bash
# Confirm Convex prod has expected vars
npx convex env list --prod | wc -l   # rough count

# Confirm Vercel only has deploy keys
vercel env ls

# Confirm Vercel project build settings
vercel project inspect

# Confirm git is in a clean state for the commit Vercel will deploy from
git rev-parse HEAD
git status --short
```

If `git status` shows uncommitted changes, ask:

```
You have uncommitted changes. Vercel will deploy from the last pushed commit ({short_sha}).
Your local changes will NOT ship.

Continue with the existing committed code? (y/n)
```

If yes, continue. If no, exit and let the user commit + push first.

Expected Vercel env keys:

```text
CONVEX_DEPLOY_KEY       Production
CONVEX_DEPLOY_KEY       Preview
CONVEX_PROD_DEPLOY_KEY  Preview
```

If any are missing, run `pnpm vercel:setup-convex-env` before deploying.

### 2. Trigger first deploy

We use `vercel deploy --prod` which:

- Detects the linked project (from `.vercel/project.json`)
- Reads the Vercel project build command
- Pulls the production env vars (including `CONVEX_DEPLOY_KEY`)
- Runs the build command in Vercel's build env
- Deploys

```bash
vercel deploy --prod --yes
```

This is interactive by default but `--yes` skips all prompts.

The command stays attached to the build by default and prints the build URL plus a tailing build log. Stream the output verbatim to the user.

### 5. Watch the build

While the build runs, the output looks like:

```
Inspect: https://vercel.com/{team}/{project}/{deployment-id}
Production: https://{prod_url} [3s]
Building...

[in build log:]
Running "install" command: pnpm install --frozen-lockfile
Running "build" command: npx convex deploy --cmd 'npm run build'
...
Running "convex deploy --cmd npm run build"
✔ Schema validated.
✔ Deployed Convex functions to https://{convex_prod_deployment}.convex.cloud
> vite build
...
```

If the build prints `Error: ...` or exits non-zero, capture the error line.

### 6. On build failure - diagnose

Common causes of first-deploy failure and fixes:

| Error                                               | Cause                                                 | Fix                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `CONVEX_DEPLOY_KEY environment variable is missing` | Step 02 setup did not apply the production deploy key | Run `pnpm vercel:setup-convex-env`, then add the production key if still missing     |
| `CONVEX_PROD_DEPLOY_KEY is required`                | Preview prod snapshot key is missing                  | Run `pnpm vercel:setup-convex-env`                                                   |
| `pnpm: command not found`                           | Vercel didn't pick up pnpm                            | Add `corepack enable` or set Node version in project settings; or set framework null |
| `Module not found: @convex-dev/...`                 | Lockfile out of sync                                  | `pnpm install` locally, commit `pnpm-lock.yaml`, push, retry                         |
| `Schema validation error in convex/`                | Convex schema diverged                                | Run `/convex-migration-helper` to plan a safe migration                              |
| TypeScript build error in `src/**`                  | TS error not caught in CI                             | Run `pnpm ts` locally, fix, push                                                     |

For each, surface the specific actionable error to the user. Don't just say "build failed".

### 7. On build success - point the domain

If `{prod_domain}` was added in step 02 but isn't yet aliased to this deployment:

```bash
vercel alias set {deployment-url-from-output} {prod_domain}
```

(Production deployments are usually auto-aliased to the production domain, but explicit `vercel alias set` is idempotent.)

Verify with:

```bash
curl -I https://{prod_domain}
# Expect: HTTP/2 200
```

### 8. Update CHANGELOG

Append to `CHANGELOG.md` per `.agents/rules/changelog.md`:

```markdown
## YYYY-MM-DD

FEATURE: Production launch - Convex prod ({convex_prod_deployment}) + Vercel ({vercel_project_name}) on https://{prod_domain}
```

Use the actual current date. Insert a new dated section at the TOP if today's section doesn't exist.

### 9. Hand off to step 04

Echo:

```
✓ Production is live at https://{prod_domain}

Three remaining manual steps that I'll walk you through next:
  • Stripe webhook endpoint (so checkout / subscription events reach the app)
  • OAuth callback URLs (GitHub / Google)
  • Resend domain verification (if not already done)

Continue? (y/n / "skip" to stop here)
```

If yes, load `step-04-postdeploy.md`. If "skip" or `{skip_postdeploy}`, end the workflow with a summary.

## CONTEXT BOUNDARIES

<available_state>
From step 00 + 01 + 02:

- All earlier state
- Convex prod env fully populated
- Vercel env normalized to deploy keys only
- Vercel project settings configured
  </available_state>

<produced_state>
After this step:

- Convex deploy keys set in Vercel
- First production deploy succeeded
- `https://{prod_domain}` returns 200
- `CHANGELOG.md` updated
  </produced_state>

## SUCCESS METRICS

✅ `vercel env ls` includes the three expected Convex deploy-key rows
✅ `vercel deploy --prod --yes` completed with exit 0
✅ `curl -I https://{prod_domain}` returns 200
✅ Convex dashboard shows the deployed functions match the latest commit
✅ `CHANGELOG.md` has today's `FEATURE:` entry

## FAILURE MODES

❌ Setting app/runtime secrets in Vercel instead of Convex
❌ Missing the Preview `CONVEX_PROD_DEPLOY_KEY`, which breaks production snapshot imports for previews
❌ Running `vercel deploy --prod` without `--yes` and getting blocked on a prompt the AI can't answer
❌ Aliasing `{prod_domain}` before DNS is configured (browser will hit Vercel's pending SSL state)
❌ Deploying with uncommitted local changes the user thought were included

## NEXT STEP

If user wants postdeploy, load `step-04-postdeploy.md`. Otherwise stop.
