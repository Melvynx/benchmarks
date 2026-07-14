---
name: step-02-vercel-setup
description: Link Vercel project, set TanStack Start + Convex build settings, and normalize Vercel env to deploy keys only
prev_step: step-01-convex-prod.md
next_step: step-03-deploy.md
---

# Step 2: Vercel Setup

## Goal

By the end of this step:

1. The repo is linked to a Vercel project (`.vercel/project.json` exists).
2. Vercel project settings use framework preset `tanstack-start` and build command `pnpm exec convex deploy --cmd 'pnpm run build'`.
3. Vercel env contains only the Convex deploy keys needed for builds.
4. App/runtime secrets are removed from Vercel because Convex owns them.

## Rules

- Use `vercel link` only when `.vercel/project.json` is missing.
- Do not add Stripe, Resend, OAuth, R2, Better Auth, database, or public app vars to Vercel.
- Use `pnpm vercel:setup-convex-env` to prune Vercel env and ensure `CONVEX_PROD_DEPLOY_KEY` exists for preview builds.
- Do not run `vercel deploy` in this step.

## Execution

### 1. Verify Vercel Link

```bash
test -f .vercel/project.json && cat .vercel/project.json || vercel link
```

### 2. Verify Vercel Project Settings

Do not use `vercel.json` for build configuration. Set the Vercel project settings instead:

```text
Framework Preset: TanStack Start
Build Command: pnpm exec convex deploy --cmd 'pnpm run build'
Root Directory: repo root unless the app lives in a subdirectory
```

This lets Convex deploy functions from the same commit, inject the frontend Convex URL into the Vite build, and then run the TanStack Start build. The repo build script starts with `scripts/vercel-build-preflight.sh`, which copies production Convex env into preview deployments via `CONVEX_PROD_DEPLOY_KEY` before overriding preview-specific URL/auth values.

### 3. Normalize Vercel Env

Run:

```bash
pnpm vercel:setup-convex-env
```

This script:

- removes obsolete app/runtime env vars from Vercel Production, Preview, and Development;
- keeps `CONVEX_DEPLOY_KEY` for Production;
- keeps `CONVEX_DEPLOY_KEY` for Preview;
- creates and adds `CONVEX_PROD_DEPLOY_KEY` to Preview when missing.

With the current Vercel CLI, adding an all-preview variable may ask for a git branch. Press Enter to apply it to all Preview branches.

### 4. Verify

```bash
vercel env ls
```

Expected remaining variables:

```text
CONVEX_DEPLOY_KEY       Production
CONVEX_DEPLOY_KEY       Preview
CONVEX_PROD_DEPLOY_KEY  Preview
```

## Success Metrics

✅ Vercel uses the `tanstack-start` framework preset.
✅ Vercel build command is `pnpm exec convex deploy --cmd 'pnpm run build'`.
✅ `vercel env ls` shows only Convex deploy keys.
✅ No app/runtime secrets remain in Vercel.

## Next Step

Load `step-03-deploy.md`.
