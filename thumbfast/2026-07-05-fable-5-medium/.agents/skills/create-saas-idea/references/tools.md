# Recommended Tools & Stack (NowStack)

Reference document for technical decisions inside the NowStack boilerplate.

---

## Core Framework

| Tool | Purpose | Why |
|------|---------|-----|
| **TanStack Start (Vite + SSR)** | Full-stack framework | File-based routing, fast Vite dev loop, typed routes |
| **React 19** | UI runtime | Server / client components, suspense, transitions |
| **TypeScript (strict)** | Type safety | Catch errors early, end-to-end inference with Convex |
| **TailwindCSS v4** | Styling | Project standard, mobile-first |

## UI & Components

| Tool | Purpose | When to use |
|------|---------|-------------|
| **shadcn/base-ui** | Primitives | `src/components/ui/` - always reuse, never reinvent |
| **Project components** | Reusable nowts components | `src/components/nowts/` |
| **Feature components** | Domain-specific | `src/features/<feature>/<name>.tsx` |
| **Lucide React** | Icons | Default icon set (NO emojis in UI per project rule) |
| **Sonner** | Toast notifications | User feedback |
| **Typography components** | Headings/paragraphs | `@/components/nowts/typography.tsx` (don't use raw `<p>` / `<h1>`) |

## State & Data Fetching

| Tool | Purpose | When to use |
|------|---------|-------------|
| **Convex `useQuery` / `useMutation`** | Server state | Default for ALL server data - reactive |
| **TanStack Router search params** | URL state | Filters, pagination, tabs (NO `nuqs`) |
| **Zustand** | Client state | Global UI (dialog manager, transient state) |
| **TanStack Form** | Forms | All NEW forms - `react-hook-form` is deprecated |
| **Zod v4** | Validation | Schemas everywhere (forms, Convex args, HTTP) |

## Backend (Convex)

| Concept | Tool | When to use |
|---------|------|-------------|
| **Schema** | `convex/schema.ts` | All persistent data |
| **Reads** | `query` / `internalQuery` | Reactive reads |
| **Writes** | `mutation` / `internalMutation` | Transactional writes |
| **Long / external work** | `action` / `internalAction` | LLM calls, third-party APIs, multi-step flows |
| **Webhooks / HTTP** | `convex/http.ts` | Stripe webhook + any inbound HTTP |
| **Cron / scheduling** | `convex/crons.ts` + `scheduler` | Daily jobs, reminders, retries |
| **DTO mappers** | `convex/<feature>/dto/<name>.ts` | One response shape per file |
| **Search** | Convex search indexes | Full-text on a field |
| **Vector** | Convex vector indexes | Semantic / AI search |

**Always import from Convex via the `@convex/*` alias.** Never use relative paths to `convex/`.

## Database

| Option | Status |
|--------|--------|
| **Convex** | ✅ The only database in NowStack |
| Prisma / PostgreSQL / Neon / Supabase / PlanetScale | ❌ Excluded - do NOT propose |

## Authentication

| Tool | Status |
|------|--------|
| **Better Auth via `@convex-dev/better-auth`** | ✅ Built-in, pre-configured |
| Clerk / Auth0 / NextAuth | ❌ Not in NowStack |

### Auth Methods (configurable in Better Auth)

| Method | Complexity | UX |
|--------|------------|-----|
| Email + password | 🟢 Low | Traditional, with verification |
| Magic link | 🟢 Low | Modern, passwordless |
| OAuth (Google / GitHub) | 🟡 Medium | Lower friction for devs |
| All combined | 🟡 Medium | Maximum flexibility |

## Email

| Tool | Purpose | Free tier |
|------|---------|-----------|
| **Resend** (via Convex action) | Transactional email | 3,000/month |
| **React Email** | Templates | Unlimited (preview with `pnpm email`) |

## Payments

| Tool | Status |
|------|--------|
| **Stripe** (via Convex internal actions) | ✅ Built-in - configure via `/setup-stripe` |
| Lemon Squeezy / Paddle | ❌ Not in NowStack |

Webhooks always go to the **Convex** deployment URL (`POST /stripe/webhook`), never to a TanStack route.

## File Storage

| Tool | Status |
|------|--------|
| **Cloudflare R2** (S3-compatible, via `convex/files/actions.ts`) | ✅ The only storage backend |
| Vercel Blob / S3 / Cloudinary / Uploadthing | ❌ Do NOT add |

Required Convex env vars: `R2_S3_URL`, `R2_S3_ACCESS_KEY_ID`, `R2_S3_SECRET_ACCESS_KEY`, `R2_S3_BUCKET_NAME`, `R2_URL`.

## Real-Time, Cron, Background Jobs

| Need | Tool |
|------|------|
| Real-time updates | Convex reactive queries (built-in) |
| Scheduled jobs | `convex/crons.ts` |
| Async work / retries | `scheduler.runAfter(...)` + actions |
| Message queue | Not needed (use scheduler) |

**Excluded**: Upstash Realtime, Upstash QStash, Upstash Redis, Vercel Cron, Trigger.dev, Inngest, BullMQ. Convex covers all of these natively.

## Outbound HTTP

| Tool | Status |
|------|--------|
| **`up-fetch`** (`@/lib/up-fetch.ts`) | ✅ Required for all HTTP calls |
| Raw `fetch` | ❌ Banned by project rule |

## Analytics & Monitoring

| Tool | Purpose | Status |
|------|---------|--------|
| **PostHog** | Product analytics | ✅ Pre-configured |
| **Sentry** | Error tracking | Optional - add post-launch |
| **Convex dashboard** | Function logs | Built-in |

## Deployment

| Tool | Purpose | Why |
|------|---------|-----|
| **Vercel** | Frontend hosting | Used for TanStack Start app |
| **Convex** | Backend deployment | `pnpm convex:deploy` or `/publish-to-production` |
| **GitHub Actions** | CI | Linting, type-checking, tests |

---

## Decision Matrix

### When to use what (NowStack)

| Need | Solution |
|------|----------|
| Simple CRUD | Convex schema + queries + mutations |
| Real-time updates | Convex queries (already reactive) |
| Background / scheduled jobs | `convex/crons.ts` + scheduler |
| AI / LLM features | Convex action calling OpenAI / Anthropic / Gemini SDK |
| File uploads | `convex/files/actions.ts` → Cloudflare R2 |
| Search | Convex search indexes |
| Multi-tenant orgs | Already built-in - put `organizationId` on every domain table |
| Payments | Stripe via Convex action - configure with `/setup-stripe` |
| Email | Resend via Convex action + React Email template |

---

## Cost Estimation Template

### At ~1,000 users/month

| Service | Free tier | Paid |
|---------|-----------|------|
| Vercel (frontend) | 100 GB bandwidth | $20/mo |
| Convex (backend) | generous free tier | $25+/mo |
| Resend (email) | 3,000 emails | $20/mo |
| Cloudflare R2 | 10 GB free, no egress | usage-based |
| PostHog | 1M events free | $0+ |
| Stripe | - | 2.9% + $0.30/txn |
| **Total** | ~$0 | ~$65/mo |

### At ~10,000 users/month

| Service | Estimate |
|---------|----------|
| Vercel | $20-50/mo |
| Convex | $25-100/mo |
| Resend | $20-50/mo |
| Cloudflare R2 | low (no egress fees) |
| **Total** | ~$70-200/mo |
