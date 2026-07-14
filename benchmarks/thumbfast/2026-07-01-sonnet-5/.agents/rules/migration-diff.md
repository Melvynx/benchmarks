---
paths:
  - "src/routes/**"
  - "src/features/**"
  - "src/lib/**"
  - "server/api/**"
  - "convex/**"
  - "app/**"
---

# Migration Diff Review

Use this when checking what changed, broke, or was forgotten after a framework/data migration.

## When this applies

- The user asks what is missing after a migration/refactor.
- A feature existed before and may not work in the current branch.
- You need to compare old Next/App Router code with current TanStack/Convex code.

## Rules

- **ALWAYS** identify the baseline first: use the user-specified branch/tag, otherwise compare against `origin/main`.
- **ALWAYS** separate framework noise from product gaps. Missing `app/**/page.tsx` is only a gap if the current app has no equivalent route, link, API, or Convex function.
- **ALWAYS** verify migrated features through three layers: route/API existence, current UI links/call sites, and backing data mutation/query/action.
- **NEVER** assume a route is migrated because a similar component exists; check the generated route tree and live imports/call sites.
- **NEVER** claim credits, billing, or auth migrated until the write path, read path, and webhook/cron/background path are all accounted for.
- **ALWAYS** search for current links to missing pages and current calls to missing API routes before summarizing.
- **ALWAYS** list exact missing product surfaces, then mark which ones are intentionally replaced, unknown, or broken.

## Useful commands

```bash
git merge-base HEAD origin/main
git ls-tree -r --name-only origin/main
find src/routes server/api convex -maxdepth 5 -type f | sort
rg -n "settings/billing|settings/api-keys|api/webhooks|api/cron|api/qstash|api/proxy|api/v1|persons/|videos/" src server convex -g '!routeTree.gen.ts'
```

For route/API diffs, normalize old `app/**/[param]/page.tsx` and `app/api/**/route.ts` paths against current `src/routes/**` and `server/api/**` paths. Treat route groups like `(navigation)` as invisible.

## Review checklist

- Pages: public routes, org routes, settings routes, admin routes, account/auth routes.
- API: webhooks, cron, background workers, public tool endpoints, org endpoints, MCP/API-key endpoints.
- Credits: initial grants, deductions, refunds, transactions, monthly refills, custom API key fallback.
- Billing: checkout, portal, subscription state, Stripe webhook, success/cancel pages, admin billing.
- Auth/org: signup redirect, org creation, invitations, member permissions, private route guards.
- Core product: thumbnails, inspirations, anonymize, persons, videos, images, agent chat.
- Copy/config: plan limits, credit counts, model names, pricing copy, SEO/tool pages.
- Verification: static diff, current link scan, TypeScript/build, and browser checks for user-facing flows.
