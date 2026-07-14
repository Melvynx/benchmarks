# Env Var Mapping - Convex-First Production

Single source of truth for where production and preview env vars live.

Runtime app secrets live in **Convex**, not Vercel. Vercel should only keep deploy/build keys that let its build call Convex.

## Convex Env

Set these with `pnpm exec convex env set --prod KEY value` for production, and with Convex preview defaults for fresh preview deployments.

| Var                           | Scope                | Notes                                                                                |
| ----------------------------- | -------------------- | ------------------------------------------------------------------------------------ |
| `SITE_URL`                    | Convex prod/defaults | Environment-specific app URL. Do not copy production `SITE_URL` to preview defaults. |
| `GITHUB_CLIENT_ID`            | Convex               | OAuth provider config.                                                               |
| `GITHUB_CLIENT_SECRET`        | Convex               | OAuth provider config.                                                               |
| `GOOGLE_CLIENT_ID`            | Convex               | Optional OAuth provider config.                                                      |
| `GOOGLE_CLIENT_SECRET`        | Convex               | Optional OAuth provider config.                                                      |
| `RESEND_API_KEY`              | Convex               | Email sending happens from Convex.                                                   |
| `EMAIL_FROM`                  | Convex               | Sender used by Convex email functions.                                               |
| `STRIPE_SECRET_KEY`           | Convex               | Stripe calls live in Convex actions.                                                 |
| `STRIPE_WEBHOOK_SECRET`       | Convex               | Stripe webhook hits Convex `httpAction`.                                             |
| `STRIPE_PRO_PLAN_ID`          | Convex               | Stripe price id.                                                                     |
| `STRIPE_PRO_YEARLY_PLAN_ID`   | Convex               | Stripe price id.                                                                     |
| `STRIPE_ULTRA_PLAN_ID`        | Convex               | Stripe price id.                                                                     |
| `STRIPE_ULTRA_YEARLY_PLAN_ID` | Convex               | Stripe price id.                                                                     |
| `R2_S3_URL`                   | Convex               | R2 upload backend.                                                                   |
| `R2_S3_ACCESS_KEY_ID`         | Convex               | R2 upload backend.                                                                   |
| `R2_S3_SECRET_ACCESS_KEY`     | Convex               | R2 upload backend.                                                                   |
| `R2_S3_BUCKET_NAME`           | Convex               | R2 upload backend.                                                                   |
| `R2_URL`                      | Convex               | Public R2 URL.                                                                       |

## Vercel Env

Only these should remain in Vercel:

| Var                      | Vercel environment | Notes                                                                                                     |
| ------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------- |
| `CONVEX_DEPLOY_KEY`      | Production         | Production deploy key. Authorizes `pnpm exec convex deploy --cmd 'pnpm build'` to deploy Convex prod before the app build. |
| `CONVEX_DEPLOY_KEY`      | Preview            | Preview deploy key. Creates/reuses Convex preview deployments for Vercel previews.                        |
| `CONVEX_PROD_DEPLOY_KEY` | Preview            | Production deploy key used only to export prod data before importing into fresh preview deployments.      |

`VITE_CONVEX_URL` is injected by `convex deploy --cmd-url-env-var-name VITE_CONVEX_URL`; do not set it manually in Vercel.

## Setup Command

Run this during deploy setup or whenever env state drifts:

```bash
pnpm vercel:setup-convex-env
```

It removes obsolete app/runtime env vars from Vercel and ensures the preview production-export key exists.

## Vars That Should Not Be In Vercel

Do not keep app/runtime secrets in Vercel:

`RESEND_API_KEY`, `EMAIL_FROM`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, Stripe price ids, `GITHUB_CLIENT_*`, `GOOGLE_CLIENT_*`, `R2_*`, `VITE_EMAIL_CONTACT`, `VITE_STRIPE_PUBLISHABLE_KEY`, `BETTER_AUTH_*`.
