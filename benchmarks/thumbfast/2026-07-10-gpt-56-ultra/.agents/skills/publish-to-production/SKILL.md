---
name: publish-to-production
description: Maximally autonomous production deployment for NowStack - sets up Convex prod, Vercel project, env vars, build command, deploy keys, and triggers first deploy. Use when shipping the app to production for the first time, when re-syncing env vars after env changes, or when the user says "deploy to production", "publish to prod", "ship to prod".
---

# Publish to Production - NowStack Production Deployment

<objective>
Set up and deploy the NowStack app to production with the LEAST manual user intervention possible. The skill provisions the Convex production deployment, puts runtime env in Convex, links/configures the Vercel project, sets the Convex-aware build command, keeps only deploy keys in Vercel, and kicks off the first production deploy. After deploy, it walks the user through the small set of things that genuinely cannot be automated (OAuth callback URLs, Stripe live keys, custom domain).
</objective>

<when_to_use>
Use this workflow when:

- Shipping the NowStack app to production for the first time
- Migrating from a working dev setup (`.env.local` + Convex dev) to a clean production deploy
- Re-syncing env vars from the local env to Convex prod after key rotation
- The user types `/publish-to-production` or asks to "deploy to prod", "ship to production", "publish the app"

Do NOT use this for:

- Routine pushes to an already-set-up production (just `git push` triggers Vercel)
- Setting up a fresh dev environment (use `/init-project` instead)
- One-off env var changes (just run `npx convex env set --prod KEY value` directly)
  </when_to_use>

<parameters>
**No arguments** - This workflow is interactive but autonomous. It will:

- Auto-detect existing Convex / Vercel / .vercel / .env.local state
- Read local dev env vars and propose them as prod values (the user confirms or overrides)
- Only ask the user for values that genuinely change between dev and prod (live Stripe keys, prod domain, OAuth callback updates)

**Optional flag** the user can pass in their message:

- "skip postdeploy" → stop after the first deploy succeeds (don't run the OAuth/Stripe webhook walkthrough)
- "dry-run" → print every command but don't execute. Useful to inspect.
  </parameters>

<state_variables>
**Persist across all steps:**

| Variable                   | Type    | Description                                                                                      |
| -------------------------- | ------- | ------------------------------------------------------------------------------------------------ |
| `{prod_domain}`            | string  | Production domain, e.g. `app.example.com`. No protocol. Set in step 00.                          |
| `{prod_url}`               | string  | `https://{prod_domain}`. Set in step 00.                                                         |
| `{convex_prod_deployment}` | string  | Convex prod deployment name, e.g. `discerning-finch-456`. Set in step 01.                        |
| `{convex_prod_url}`        | string  | `https://{convex_prod_deployment}.convex.cloud`. Set in step 01.                                 |
| `{convex_deploy_key}`      | string  | Convex Production Deploy Key (`prod:...`). User-provided in step 03.                             |
| `{vercel_project_name}`    | string  | Vercel project name. Read from `.vercel/project.json` if linked, else picked.                    |
| `{vercel_team_slug}`       | string  | Vercel team slug. Read from `.vercel/project.json` if linked.                                    |
| `{stripe_mode}`            | string  | `"test"` or `"live"`. Detected from local `STRIPE_SECRET_KEY` prefix (`sk_test_` vs `sk_live_`). |
| `{has_oauth_github}`       | boolean | Whether GitHub OAuth is configured locally. Determines step 04 callback walkthrough.             |
| `{has_oauth_google}`       | boolean | Whether Google OAuth is configured locally.                                                      |
| `{dry_run}`                | boolean | If true, every shell call is printed inside a fenced block instead of executed.                  |
| `{skip_postdeploy}`        | boolean | If true, skip step 04.                                                                           |

</state_variables>

<entry_point>
Load `steps/step-00-init.md`
</entry_point>

<step_files>
| Step | File | Purpose |
| ---- | ----------------------------- | ------------------------------------------------------------------------ |
| 00 | `step-00-init.md` | Preflight: check CLIs, read state, ask only for `{prod_domain}` if missing |
| 01 | `step-01-convex-prod.md` | Provision Convex prod deployment + mirror all required Convex env vars |
| 02 | `step-02-vercel-setup.md` | Link Vercel project, set TanStack Start build settings, prune Vercel env, ensure deploy keys |
| 03 | `step-03-deploy.md` | Verify deploy keys and trigger first prod deploy |
| 04 | `step-04-postdeploy.md` | Stripe webhook, OAuth callback URLs, Resend domain, sanity tests |
</step_files>

<workflow_diagram>

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Step 00     │───►│  Step 01     │───►│  Step 02     │
│  Preflight   │    │  Convex prod │    │  Vercel      │
└──────────────┘    └──────────────┘    └──────────────┘
                                               │
       ┌───────────────────────────────────────┘
       ▼
┌──────────────┐    ┌──────────────┐
│  Step 03     │───►│  Step 04     │
│  Deploy      │    │  Postdeploy  │
└──────────────┘    └──────────────┘
```

</workflow_diagram>

<important_files>
**Files this workflow may create or modify (root paths):**

| File                             | Change                                                                                     |
| -------------------------------- | ------------------------------------------------------------------------------------------ |
| `.vercel/project.json`           | Created by `vercel link` if not present                                                    |
| Vercel project settings          | Configured with the TanStack Start framework preset and Convex deploy build command        |
| (Convex prod env, NOT a file)    | Mutated via `npx convex env set --prod KEY value` for each required backend secret         |
| (Vercel project env, NOT a file) | Mutated only for Convex deploy keys; runtime secrets stay in Convex                        |
| `.env.production` (optional)     | NOT created by default. Only created if user requests a local prod env file for debugging. |

**Files this workflow READS:**

- `.env` and `.env.local` (source of truth for local secrets to mirror)
- `convex/**/*.ts` (to verify which env vars Convex actually consumes)
- `src/lib/env.ts` (to verify which env vars the Vercel runtime needs)
- `src/site-config.ts` (domain context) and `convex/http.ts` + `convex/stripe/actions.ts` (Stripe webhook lives in Convex, not in `src/routes/api/`)
- `package.json` (to confirm `build` script and Convex/Vercel CLI availability)

</important_files>

<stack_context>
This project is **NowStack v2**:

- **Backend**: Convex (no Postgres / no Prisma)
- **Frontend**: Vite + TanStack Start + Nitro (deployed as a Node.js / serverless app on Vercel)
- **Auth**: Better Auth via `@convex-dev/better-auth` component (lives entirely in Convex)
- **Email**: Resend via `@convex-dev/resend` component (Resend API key in Convex env)
- **Payments**: Stripe via custom Convex actions. The webhook is a Convex `httpAction` mounted at `https://<deployment>.convex.site/stripe/webhook`. Webhooks never hit Vercel — there is no TanStack webhook route.
- **File upload**: Cloudflare R2 via Convex actions in `convex/files/actions.ts`

**TWO places env vars must be set for prod to work:**

1. **Convex prod env** (server-side secrets used inside `convex/**` functions): set via `npx convex env set --prod KEY value`
2. **Vercel project env** only stores deploy keys: `CONVEX_DEPLOY_KEY` for Production/Preview and `CONVEX_PROD_DEPLOY_KEY` for Preview production snapshot imports.

The Vercel framework preset must be `tanstack-start`. The Vercel build command must be `npx convex deploy --cmd 'npm run build'`, so Convex deploys from the same commit and injects the frontend Convex URL into the Vite build.

See `references/env-mapping.md` for the full canonical list of which var lives where and why.
</stack_context>

<principles>
- **Mirror, don't reinvent.** For most env vars, the prod value is identical to the local dev value. Read `.env` / `.env.local`, propose, confirm. Only ask the user to provide a new value when prod genuinely differs (live Stripe keys, prod domain, prod OAuth client).
- **Echo what you're about to do BEFORE doing it.** Print the command. Run it. Print the result. Never silently mutate cloud state.
- **Idempotent by construction.** If Convex prod is already created, skip creation. If Vercel already has the right framework preset and build command, skip. Use `pnpm vercel:setup-convex-env` to prune stale Vercel vars and preserve only deploy keys. Re-runs of this skill should be safe.
- **Stop on failure.** If `npx convex env set --prod` fails for any var, stop immediately. Don't attempt the Vercel step with a broken Convex prod.
- **Never log secret values to the terminal.** When echoing what's set, mask values like `sk_live_***...***1234`.
</principles>

<critical_safety>
🛑 **NEVER run `vercel --prod` or `vercel deploy --prod` until step 03.** The first deploy must happen AFTER the Vercel project settings and Vercel env vars are in place, otherwise Vercel will deploy a broken build and the user has to roll back.

🛑 **NEVER write secrets to git-tracked files.** No secrets in `package.json`, `CHANGELOG.md`, or any committed file.

🛑 **NEVER `vercel env add` app/runtime variables such as `STRIPE_*`, `RESEND_*`, `R2_*`, OAuth secrets, or `VITE_EMAIL_CONTACT`.** Those belong in Convex or static app config, not Vercel.

🛑 **NEVER reuse the dev Convex deployment as production.** A fresh `convex deployment create --prod` (or first `convex deploy`) creates the prod deployment. Conflating dev and prod data is unrecoverable.
</critical_safety>

<success_metrics>
✅ A `https://{prod_domain}` URL responds with a working app
✅ Sign up / sign in works end-to-end (Better Auth + Resend email delivery)
✅ Stripe checkout and webhook end-to-end work
✅ `npx convex env list --prod` returns every var listed in `references/env-mapping.md` (Convex column), with `STRIPE_WEBHOOK_SECRET` added after the Stripe webhook exists
✅ `vercel env ls` returns only the Vercel deploy keys listed in `references/env-mapping.md`
✅ `git push` to the production branch automatically triggers `npx convex deploy --cmd 'npm run build'` on Vercel
✅ `CHANGELOG.md` has a `FEATURE:` entry for the production launch
</success_metrics>

<failure*modes>
❌ Setting `STRIPE_WEBHOOK_SECRET` only in Vercel. The webhook route is `convex/http.ts`, so the signing secret must live in Convex prod env
❌ Forgetting `CONVEX_DEPLOY_KEY` in Vercel - the build will fail because `npx convex deploy` has no auth
❌ Forgetting `CONVEX_PROD_DEPLOY_KEY` in Vercel Preview - preview builds cannot import a production snapshot
❌ Setting `SITE_URL` to the Vercel auto-URL (`*.vercel.app`) instead of the custom prod domain - OAuth and email links will break
❌ Not adding `https://{prod_url}/api/auth/callback/{provider}` to GitHub/Google OAuth apps - users get OAuth callback errors
❌ Leaving `EMAIL_FROM` set to `onboarding@resend.dev` in prod - Resend will silently drop emails to non-test recipients
❌ Setting test-mode Stripe keys in production (`sk_test*` and `pk_*test*`) - real users cannot pay
❌ Modifying `.env` for prod values - this file is local-only; production env lives in Convex / Vercel
</failure_modes>

## NEXT STEP

Load `steps/step-00-init.md`.
