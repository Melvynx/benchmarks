# Issue 46 Verification Evidence

Captured with `dev-browser --headless` against the migrated TanStack Start/Nitro app on `http://localhost:3037`.

## Summary

- Public route crawl: `38` pages checked, `38` HTTP 200 responses, `0` app 404 pages.
- Screenshots: [`screenshots/`](./screenshots/).
- Legacy Next app tree is deleted; current `app/` file count is `0`.
- Prisma schema, migrations, generated client, Prisma scripts, and Prisma dependencies are deleted.
- Active runtime scan across `src`, `server`, `convex`, tests, workflows, and scripts found no Prisma/Neon runtime references. The only `DATABASE_URL`/Postgres reference left is the explicit one-shot `scripts/migrate-prod-to-convex.ts` import script.
- `pnpm ts`, `pnpm lint:ci`, `pnpm test:ci`, and `pnpm build` pass locally.
- Auth E2E root cause found: `/api/auth/sign-up/email` was returning 404 because the Convex Better Auth HTTP functions for this branch were not deployed to the configured Convex site. The Playwright workflow now deploys Convex before building and testing, and Vite exposes `NEXT_PUBLIC_*` envs to the client.
- Authenticated private route sweep: dashboard, thumbnails, new thumbnail form, prompt detail, generations, persons, inspirations, images, videos, and settings all loaded without `Checking your session`, sign-in redirects, or app error text.
- Generation E2E: signed up a new user, auto-created the organization, verified `~4 thumbnails`, generated a prompt, redirected to the prompt detail, and rendered 4 generated CDN images.
- SPA navigation E2E: sidebar links and legacy `next/link` shim links keep the JS probe alive and do not force full document reloads.

## Private App Screenshots

![Dashboard](./screenshots/dashboard.png)
![Thumbnails](./screenshots/thumbnails.png)
![New thumbnail form](./screenshots/new-thumbnail-form.png)
![Generated detail with 4 images](./screenshots/generated-detail-4-images.png)
![Generations](./screenshots/generations.png)
![Persons](./screenshots/persons.png)
![Inspirations](./screenshots/inspirations.png)
![Images](./screenshots/images.png)
![Videos](./screenshots/videos.png)
![Settings](./screenshots/settings.png)
![SPA navigation](./screenshots/spa-navigation.png)

## Public Route Screenshots

![Home](./screenshots/thumbfast-issue46-verified.png)
![About](./screenshots/thumbfast-issue46-verifiedabout.png)
![Sign in](./screenshots/thumbfast-issue46-verifiedauth-signin.png)
![Sign up](./screenshots/thumbfast-issue46-verifiedauth-signup.png)
![Docs](./screenshots/thumbfast-issue46-verifieddocs.png)
![API reference](./screenshots/thumbfast-issue46-verifieddocs-api-reference.png)
![Tools](./screenshots/thumbfast-issue46-verifiedtools.png)
![Anonymize tool](./screenshots/thumbfast-issue46-verifiedtools-anonymize.png)
![YouTube thumbnail tool](./screenshots/thumbfast-issue46-verifiedtools-youtube-thumbnail.png)
![Video card tool](./screenshots/thumbfast-issue46-verifiedtools-youtube-video-card.png)
![Generate thumbnail](./screenshots/thumbfast-issue46-verifiedgenerate-thumbnail.png)
![Thumbnail generator](./screenshots/thumbfast-issue46-verifiedthumbnail-generator.png)
![Posts](./screenshots/thumbfast-issue46-verifiedposts.png)
![Changelog](./screenshots/thumbfast-issue46-verifiedchangelog.png)
![Contact](./screenshots/thumbfast-issue46-verifiedcontact.png)
