---
name: step-05-architecture
description: Design technical architecture based on PRD and the NowStack boilerplate
prev_step: steps/step-04-prd.md
next_step: steps/step-06-tasks.md
---

# Step 5: Technical Architecture (NowStack)

## MANDATORY EXECUTION RULES (READ FIRST):

- 🛑 NEVER recommend tools not in the NowStack stack without strong justification
- ✅ ALWAYS base decisions on PRD requirements
- ✅ ALWAYS respond in `{user_language}`
- 📋 YOU ARE A solutions architect, making practical decisions
- 💬 FOCUS on what the PRD requires, not hypothetical future needs
- 🚫 FORBIDDEN to over-engineer - keep it simple for solo dev
- 🚫 FORBIDDEN to introduce Prisma, raw PostgreSQL, Redis or any DB-mirroring layer - NowStack is Convex-only

## EXECUTION PROTOCOLS:

- 🎯 Read PRD first, then map features to technical needs
- 💾 Reference `tools.md` and `architecture-template.md` for stack decisions
- 📖 Every tool choice needs "Why" and "Trade-off"
- 🚫 FORBIDDEN to load step-06 until architecture is validated

## CONTEXT BOUNDARIES:

- Variables from previous steps: `{validated_idea}`, `{prd_content}`, `{user_language}`, `{output_dir}`, `{save_mode}`
- Base project: **NowStack** boilerplate (this repo). The user is already inside the codebase.

## REFERENCE:

Load `../references/tools.md` for:
- The NowStack tech stack
- Tool decision matrix on Convex / TanStack Start
- Cost estimation templates

Load `../references/architecture-template.md` for:
- Architecture document structure
- Convex schema and folder patterns
- Common patterns and anti-patterns

Also re-read project rules under `.agents/rules/` (especially `code-conventions.md`, `convex-imports.md`, `convex-queries.md`, `file-naming.md`, `authentication.md`, `stripe-billing.md`, `tanstack-form.md`) when generating the architecture - the user will live with those rules.

## YOUR TASK:

Design the technical architecture that implements the PRD using the **NowStack** boilerplate as the foundation.

---

## PHASE 0: RESEARCH & UNDERSTANDING

### NowStack Built-In Capabilities

NowStack is a complete TanStack Start + Convex boilerplate that provides **everything needed for a SaaS**. It saves ~12 days of foundation work by providing:

**✅ Already Built-In (FREE):**

**Frontend / Runtime:**
- TanStack Start (Vite + SSR + file-based router) with TanStack Router and TanStack Query
- React 19, TypeScript strict mode
- TailwindCSS v4 + shadcn/base-ui components in `src/components/ui/`
- Project components in `src/components/nowts/`, feature folders in `src/features/<feature>/`
- TanStack Form (the only supported form pattern, `react-hook-form` is deprecated)
- Zustand for global UI state (e.g. `src/features/dialog-manager/dialog-store.ts`)
- URL state via TanStack Router search params (no `nuqs`)
- Shared typography components in `@/components/nowts/typography.tsx`

**Backend (Convex):**
- Reactive Convex backend: queries, mutations, actions, internal actions
- Schema defined in `convex/schema.ts`
- DTO mapper convention in `convex/<domain>/dto/<name>.ts`
- Convex components: `convex/betterAuth/`, registered through `convex/convex.config.ts`
- Stripe handled through Convex internal actions in `convex/stripe/actions.ts` + webhooks at `POST /stripe/webhook` (Convex HTTP)
- Emails via Resend through Convex actions (`convex/email/actions.tsx`)
- File uploads through Convex actions (`convex/files/actions.ts`) into **Cloudflare R2** (S3-compatible) - returns the public URL

**Authentication (Better Auth via `@convex-dev/better-auth`):**
- Email + password, email verification, password reset, magic links (configurable)
- Organizations and multi-tenant invitations (`convex/auth/`)
- Identity helpers + role/permission checks per Convex function
- Session and account tables managed by the Better Auth Convex component

**Payments (Stripe via Convex internal actions):**
- Stripe configured through Convex env (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, price IDs)
- Webhook endpoint: `POST <convex-site>/stripe/webhook`
- Subscription plans / limits live in `src/lib/auth/stripe/auth-plans.ts` (or equivalent in `convex/`)
- Stripe endpoint registered at `https://<deployment>.convex.site/stripe/webhook`; `STRIPE_WEBHOOK_SECRET` stored in Convex env

**Organizations & Multi-Tenancy:**
- Organization slugs, members, invitations, role-based access
- Routes: `src/routes/orgs/$orgSlug/(navigation)/...`
- Plans are tied to **Organizations**, not Users (don't add workspace/team abstractions)

**Admin Dashboard:**
- Account routes: `src/routes/(logged-in)/account/...`
- Org admin views inside `orgs/$orgSlug/(navigation)`
- Members management, role updates, subscription view

**Developer Experience:**
- `pnpm start-all` boots Convex + Vite with combined logs in `.logs/web.txt` and `.logs/convex.txt`
- Vitest unit tests in `__tests__/`, Playwright E2E in `e2e/`
- ESLint + Prettier, `pnpm ts` for type-check, `pnpm clean`, `pnpm knip`
- TanStack Router auto-typed routes via `routeTree.gen.ts`
- Skills: `/init-project`, `/setup-stripe`, `/publish-to-production`, `/convex-quickstart`, etc.

**Page Skeletons:**
- Every route is expected to have a custom `pendingComponent` (see `.agents/rules/page-skeletons.md`)
- Reusable: `AccountCardSkeleton`, `OrgLayoutSkeleton`, etc.

**Analytics & Observability:**
- PostHog wiring ready (frontend + Convex)
- Convex dashboard for function logs

**🚨 IMPORTANT: If the PRD requires auth, payments, organizations, file uploads, email, or multi-tenant features, you DON'T need to build them - they are already in NowStack. Plan to *configure* them, not rebuild them.**

### Convex Capabilities That Replace Common Add-Ons

NowStack already covers things that typically require extra services on a Next.js stack:

| Need | Convex equivalent |
|------|-------------------|
| Real-time updates / live queries | Convex queries are reactive by default - subscribe via `useQuery` |
| Background jobs / scheduled tasks | `crons.ts` + `scheduler.runAfter(...)` in Convex |
| Retry / async processing | Convex actions with internal retries, or scheduled re-tries |
| File uploads | `convex/files/actions.ts` uploading to Cloudflare R2 |
| Cron jobs | Convex `crons.ts` |
| Search | Convex search indexes on tables |
| Vector / AI search | Convex vector indexes |
| Webhooks | Convex `http.ts` HTTP actions (already used for Stripe) |

**Do NOT add** Upstash QStash, Upstash Redis, Trigger.dev, Inngest, BullMQ, Vercel Cron, or a separate WebSocket server unless the PRD has a hard requirement Convex genuinely cannot satisfy.

---

## NOWSTACK BASE STACK

**Core Framework:**
- TanStack Start (Vite + SSR) with file-based routing in `src/routes/`
- React 19 + TypeScript (strict)
- TailwindCSS v4 + shadcn/base-ui

**UI & Frontend:**
- shadcn/ui primitives in `src/components/ui/`
- Lucide icons (project rule: never emojis in UI, never gradients unless explicitly asked)
- Typography components in `@/components/nowts/typography.tsx`
- Sonner for toasts
- TanStack Query for any non-Convex async data (rare on NowStack)

**State Management:**
- Convex `useQuery` / `useMutation` for server state (default for everything)
- Zustand for global UI state (e.g. dialog manager)
- TanStack Router search params for URL state
- TanStack Form + Zod for forms (NO `react-hook-form` in new code)

**Backend:**
- Convex functions: `query`, `mutation`, `action`, `internalQuery`, `internalMutation`, `internalAction`
- Schema in `convex/schema.ts`
- DTO mappers per response shape in `convex/<domain>/dto/<name>.ts`
- HTTP entrypoints in `convex/http.ts`
- Cron jobs in `convex/crons.ts` (if used)
- Always import via the `@convex/*` path alias

**Authentication (Already Built-In):**
- Better Auth through `@convex-dev/better-auth`
- Email + password, magic links, email verification, organization invitations
- Org-scoped role/permission checks

**Payments (Already Built-In):**
- Stripe through Convex internal actions
- Webhook: `POST <convex-site>/stripe/webhook`
- Plans configured in `src/lib/auth/stripe/auth-plans.ts`

**Email (Already Built-In):**
- Resend through Convex actions
- React Email templates in `emails/` (preview with `pnpm email`)

**File Storage (Already Built-In):**
- Cloudflare R2 via S3 SDK in `convex/files/actions.ts`
- Env vars: `R2_S3_URL`, `R2_S3_ACCESS_KEY_ID`, `R2_S3_SECRET_ACCESS_KEY`, `R2_S3_BUCKET_NAME`, `R2_URL`

**Real-Time:**
- Native to Convex - any `useQuery` is reactive (no WebSocket / SSE service needed)

**Background Jobs:**
- Convex `scheduler` + `crons.ts` (no QStash needed)

**HTTP API:**
- `up-fetch` (`@/lib/up-fetch.ts`) for any outbound HTTP - never raw `fetch`

**Infrastructure:**
- Vercel (frontend) + Convex (backend) - both wired through `/publish-to-production`
- CI: GitHub Actions
- PostHog analytics integrated

---

## ARCHITECTURE PROCESS

### Phase 1: PRD to Technical Requirements

**FIRST: Check what NowStack already provides.**

Go through each PRD feature and mark its status:

| PRD Feature | NowStack Status | Additional Work Needed? |
|-------------|-----------------|-------------------------|
| User authentication | ✅ Built-in (Better Auth) | Just choose enabled methods |
| Payments / subscriptions | ✅ Built-in (Stripe via Convex) | Configure Stripe products + `auth-plans.ts` |
| Organizations / multi-tenant | ✅ Built-in | Customize roles/permissions if needed |
| Email notifications | ✅ Built-in (Resend) | Add React Email templates |
| File uploads | ✅ Built-in (R2) | Wire feature-specific actions |
| Real-time updates | ✅ Native to Convex | None (use `useQuery`) |
| Scheduled tasks / background jobs | ✅ Convex scheduler / crons | Add cron entries |
| Webhooks | ✅ Convex HTTP actions | Add route in `convex/http.ts` |
| {custom feature} | ❌ Need to build | {Convex schema + functions + UI} |

**🎯 CRITICAL: If a feature is built-in, DON'T plan to rebuild it. Plan to configure it.**

**SECOND: Map remaining features to Convex concepts:**

| PRD Feature | Convex Tables | Convex Functions | Frontend Surface |
|-------------|---------------|------------------|------------------|
| {feature 1} | {tables} | queries / mutations / actions | route + components |
| {feature 2} | ... | ... | ... |

**THIRD: Identify the genuinely external needs:**

- **AI features?** → `ai` SDK called from a Convex action (server-side). Never call LLM APIs from the browser.
- **Heavy/long-running work?** → Convex actions (longer timeout) or scheduled functions. Chunk if needed.
- **External APIs?** → Convex action using `up-fetch` (the project rule for outbound HTTP).
- **Search?** → Convex search indexes on a field of an existing table.
- **Vector / semantic search?** → Convex vector indexes.

### Phase 2: Stack Decisions

**For each technical decision, ask:**
1. Is this already in NowStack? → Use it.
2. Does Convex provide this natively? → Use Convex.
3. Does the PRD genuinely require this?
4. What's the simplest solution within NowStack's conventions?
5. What's the trade-off?

**🚨 IMPORTANT: Only ask about things NOT already covered by NowStack or Convex.**

**Authentication** - ✅ Already in NowStack (Better Auth). Just ask which methods to enable:

```yaml
questions:
  - header: "Auth methods"
    question: "Which auth methods do you want enabled for the MVP?"
    options:
      - label: "Email + password"
        description: "Classic email/password with verification"
      - label: "Magic link"
        description: "Passwordless email login"
      - label: "OAuth (Google/GitHub)"
        description: "Social login - more setup but lower friction"
    multiSelect: true
```

**Payments** - ✅ Already in NowStack (Stripe). Don't ask about provider, just about plan structure:

```yaml
questions:
  - header: "Pricing model"
    question: "Which billing shape fits the PRD?"
    options:
      - label: "Free + paid tiers (subscriptions)"
        description: "Default NowStack pattern via auth-plans.ts"
      - label: "Usage-based"
        description: "Convex tracks usage, Stripe meters it"
      - label: "One-time purchase"
        description: "Lifetime / pay-once products"
      - label: "Free trial then paid"
        description: "Use Better Auth `freeTrial` in plan config"
    multiSelect: false
```

**Organizations / Multi-tenant** - ✅ Already in NowStack. Don't rebuild. Ask only:

```yaml
questions:
  - header: "Tenancy"
    question: "Is this product team-based (orgs) or single-user?"
    options:
      - label: "Team-based (organizations)"
        description: "Use NowStack's organization model - default"
      - label: "Single-user"
        description: "Keep the org model but treat each user as their own org, or hide org UI"
    multiSelect: false
```

**File Storage** - ✅ Already in NowStack (Cloudflare R2). Don't ask which provider - it's R2.

**Real-Time / Background Jobs / Cron** - ✅ Already in Convex. Don't ask about Upstash, QStash, Vercel Cron.

**Database** - Always **Convex**. Don't ask. Never suggest Prisma / PostgreSQL / Supabase / Neon - those are explicitly excluded from NowStack.

**Domain-specific external services** - Ask only if PRD genuinely needs them:

```yaml
questions:
  - header: "External services"
    question: "Does the PRD require any of these third-party services?"
    options:
      - label: "LLM provider (OpenAI / Anthropic / Gemini)"
        description: "Called from a Convex action"
      - label: "Search (Algolia / Typesense)"
        description: "Only if Convex search indexes are not enough"
      - label: "Maps / geocoding"
        description: "Mapbox / Google Maps"
      - label: "None - all internal"
        description: "Pure NowStack"
    multiSelect: true
```

### Phase 3: Generate Architecture Document

**Create `{output_dir}/archi.md`:**

```markdown
---
project_id: {project_id}
created: {timestamp}
status: complete
stack: nowstack
stepsCompleted: [0, 1, 2, 3, 4, 5]
---

# Technical Architecture: {Product Name}

## Architecture Overview

**Philosophy**: Build on top of NowStack. Use Convex for everything backend. Only add external services for PRD requirements Convex truly cannot cover.

**Tech Stack Summary**:
- **Frontend**: TanStack Start (Vite SSR) + React 19 + TailwindCSS v4 + shadcn/base-ui
- **Backend**: Convex (queries / mutations / actions, reactive, schema in `convex/schema.ts`)
- **Auth**: Better Auth via `@convex-dev/better-auth` ({chosen methods})
- **Payments**: Stripe via Convex internal actions ({chosen billing model})
- **Email**: Resend via Convex actions + React Email templates
- **Storage**: Cloudflare R2 via `convex/files/actions.ts`
- **Deployment**: Vercel (web) + Convex (backend)

## Frontend Architecture

### Core Stack
| Tool | Purpose | Why |
|------|---------|-----|
| TanStack Start | Framework | SSR + file-based routing, fast Vite dev loop |
| TanStack Router | Routing | File-based, typed search params |
| React 19 + TS strict | UI | Modern features, type safety |
| TailwindCSS v4 | Styling | Project standard |
| shadcn/base-ui | Components | NowStack ships them in `src/components/ui/` |
| Lucide React | Icons | Project rule: no emojis in UI |

### State Management
| Type | Solution | When to use |
|------|----------|-------------|
| Server state | Convex `useQuery` / `useMutation` | Default for ALL server data |
| URL state | TanStack Router search params | Filters, pagination, tabs |
| Client state | Zustand | Global UI state (dialogs, transient) |
| Form state | TanStack Form + Zod | All NEW forms (no react-hook-form) |

### Routes
- File-based under `src/routes/`
- Layout routes via `route.tsx`, leaves via `index.tsx`
- Dynamic segments with `$param` (NOT `[param]`)
- Route groups with `(group)/`
- Private dirs: `_components/`, `_actions/`
- **Every route MUST define a custom `pendingComponent`** (see `.agents/rules/page-skeletons.md`)

## Backend Architecture (Convex)

### Module Layout
- `convex/<feature>/{queries,mutations,actions}.ts` for feature modules
- root `convex/*.ts` files only for Convex entrypoints/config (e.g. `schema.ts`, `http.ts`, `auth.config.ts`, `convex.config.ts`)
- DTO mappers in `convex/<feature>/dto/<name>.ts` (`to<Name>Dto` + `type <Name>Dto`)
- Never edit `convex/_generated/**` (regenerated automatically)

### Schema (`convex/schema.ts`)
```typescript
// Add tables required by the PRD beyond what NowStack already ships.
// NowStack already defines: users (via Better Auth), organizations, members,
// invitations, subscriptions, etc.

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // {feature 1} table
  {tableName}: defineTable({
    organizationId: v.id("organizations"),
    // ...fields
  }).index("by_org", ["organizationId"]),

  // {feature 2} table...
});
```

### Auth & Identity
- Read identity inside every function via the Better Auth helpers exported in `convex/auth/`
- All org-scoped tables MUST have an `organizationId` field and an `by_org` index
- Always assert `member.role` for write paths that need elevated access

### Real-Time
- All Convex queries are reactive - subscribed components re-render automatically
- No separate SSE/WebSocket layer needed

### Background Work
- Scheduled jobs in `convex/crons.ts`
- One-off async work via `scheduler.runAfter(0, internal.<feature>.<fn>, args)`

### External HTTP
- Use `up-fetch` from `@/lib/up-fetch.ts` (project rule, never raw `fetch`)
- Long-running external calls live in Convex `action`s, not `mutation`s

## Infrastructure

### Deployment
- **Frontend**: Vercel via `/publish-to-production`
- **Backend**: Convex deployment (dev + prod)
- Webhooks (Stripe, etc.) point at the Convex deployment URL, NOT Vercel

### External Services

**Built-in to NowStack:**
| Service | Purpose | Status |
|---------|---------|--------|
| Better Auth (Convex component) | Authentication | ✅ Pre-configured |
| Stripe | Payments | ✅ Pre-configured (webhook → Convex) |
| Resend | Email | ✅ Pre-configured |
| Cloudflare R2 | File storage | ✅ Pre-configured |
| PostHog | Analytics | ✅ Pre-configured |

**Add only if PRD requires:**
| Service | Purpose | When to add |
|---------|---------|-------------|
| OpenAI / Anthropic / Gemini | LLM features | Called from a Convex action |
| Algolia / Typesense | Full-text search | Only if Convex search indexes aren't enough |
| Mapbox / Google Maps | Maps / geocoding | If PRD has geo features |
| Sentry | Error tracking | Post-launch |

## Folder Structure (NowStack conventions)

```
.
├── convex/
│   ├── schema.ts
│   ├── http.ts
│   ├── crons.ts
│   ├── stripe.ts
│   ├── email.ts
│   ├── files/
│   │   └── actions.ts
│   ├── auth/
│   │   ├── config.ts
│   │   ├── queries.ts
│   │   └── mutations.ts
│   ├── betterAuth/
│   ├── {feature}/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── dto/<name>.ts
│   ├── convex.config.ts
│   └── _generated/        # do NOT edit
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── (logged-in)/
│   │   │   └── account/...
│   │   └── orgs/$orgSlug/(navigation)/...
│   ├── components/
│   │   ├── ui/             # shadcn primitives
│   │   └── nowts/          # shared custom components
│   ├── features/
│   │   └── {feature}/      # feature-local components, hooks, stores
│   ├── hooks/use-*.ts
│   ├── lib/up-fetch.ts
│   └── lib/auth/stripe/auth-plans.ts
├── emails/                 # React Email templates
├── __tests__/              # Vitest
└── e2e/                    # Playwright
```

## Feature → Implementation Map

| PRD Feature | Convex Tables | Convex Functions | Routes / Components |
|-------------|---------------|------------------|---------------------|
| {Feature 1} | {tables} | {queries/mutations/actions} | {routes + components} |
| {Feature 2} | ... | ... | ... |

## Architecture Decision Records

### ADR-001: Convex as single backend
- **Context**: Need data layer + real-time + scheduled tasks + file uploads
- **Decision**: Use Convex for everything (no Prisma, no separate queue, no separate real-time service)
- **Alternatives**: Next.js + Prisma + Upstash + Pusher
- **Rationale**: NowStack is Convex-only; reactive queries replace real-time; scheduler replaces queue
- **Consequences**: Lock-in to Convex; gain end-to-end type safety and zero infra to operate

### ADR-002: {next decision}
- **Context**: ...
- **Decision**: ...

## Cost Estimation

### Monthly at ~1,000 users
| Service | Cost | Notes |
|---------|------|-------|
| Vercel | $0 (hobby) / $20 (pro) | Frontend hosting only |
| Convex | $0 (free tier) / $25+ | Free tier generous for MVPs |
| Resend | $0 (3k/month free) | Then pay-as-you-go |
| Stripe | 2.9% + $0.30/txn | Standard fees |
| Cloudflare R2 | ~$0 | 10 GB free, no egress fees |
| PostHog | $0 (free tier) | 1M events/mo free |
| **Base total** | ~$0-45/month | Without optional LLM/search |

### Optional Services (if PRD requires)
| Service | Typical cost | Free tier |
|---------|--------------|-----------|
| OpenAI / Anthropic / Gemini | usage-based | minimal trial credits |
| Algolia | $0.50 / 1k searches | 10k records free |
| Sentry | $0 - $26 | Free dev tier |

## Implementation Order

**🚀 With NowStack: most foundation work is already done.**

### Phase 1: Project setup (Hour 1-2)
1. ✅ Repo already cloned (you are inside NowStack)
2. Run `pnpm install` and `pnpm start-all` to boot Convex + Vite
3. Run `/init-project` to apply branding, theme, AGENTS.md, Convex env
4. Run `/setup-stripe` if billing is in the MVP

### Phase 2: Schema + Convex functions (Day 1-2)
1. Add tables in `convex/schema.ts`
2. Create `convex/{feature}/queries.ts` + `mutations.ts`
3. Add DTO mappers in `convex/{feature}/dto/`
4. Wire `up-fetch` calls in actions if external APIs are needed

### Phase 3: Routes + UI (Day 2-4)
1. Add routes under `src/routes/...` with `pendingComponent` skeletons
2. Build feature components in `src/features/{feature}/`
3. Connect to Convex via `useQuery` / `useMutation`
4. Forms via TanStack Form + Zod

### Phase 4: Polish + launch (Day 5-7)
1. Stripe plans in `src/lib/auth/stripe/auth-plans.ts` (if monetizing)
2. Email templates in `emails/`
3. Add Playwright happy-path test in `e2e/`
4. Run `/publish-to-production`
```

---

### Phase 4: Present Summary

**Display in `{user_language}`:**
```
🏗️ Architecture Summary for {Product Name}

🚀 Foundation (NowStack - already done):
- ✅ TanStack Start + Tailwind v4 + shadcn (pre-configured)
- ✅ Convex backend (reactive queries, schema, actions, crons)
- ✅ Better Auth + Stripe + Resend + Cloudflare R2
- ✅ Organizations, payments, admin views, PostHog (built-in)

⚡ Additional services (only if PRD needs):
- LLM: {OpenAI / Anthropic / Not needed}
- Search: {Convex search index / External / Not needed}
- Other: {...}

Key decisions:
1. {decision 1} - {why}
2. {decision 2} - {why}
3. {decision 3} - {why}

Implementation order:
1. Setup (Hour 1-2): /init-project, /setup-stripe if needed
2. Schema + Convex (Day 1-2): {core feature}
3. Routes + UI (Day 2-4): TanStack routes + features
4. Launch (Day 5-7): templates, e2e, /publish-to-production

Time saved with NowStack: ~10-12 days
Estimated cost: $0-45/month at ~1k users (free tiers cover MVP)
```

### Phase 5: User Validation

Use AskUserQuestion:
```yaml
questions:
  - header: "Approve"
    question: "Does this architecture look good for your project?"
    options:
      - label: "Yes, let's create tasks (Recommended)"
        description: "Architecture approved, move to implementation tasks"
      - label: "I have questions"
        description: "I want to discuss some decisions"
      - label: "Need changes"
        description: "Some decisions need to be different"
    multiSelect: false
```

---

## SUCCESS METRICS:

✅ All PRD features mapped to Convex tables / functions or to NowStack built-ins
✅ Stack decisions justified with "Why" and trade-offs
✅ Folder structure follows NowStack conventions (`convex/<feature>/`, `src/routes/`, `src/features/`)
✅ No Prisma, no PostgreSQL, no Upstash, no Vercel Cron in the architecture
✅ Cost estimation included
✅ Implementation order references NowStack skills (`/init-project`, `/setup-stripe`, `/publish-to-production`)
✅ Architecture saved to archi.md (if save_mode)
✅ User explicitly approved architecture

## FAILURE MODES:

❌ Suggesting Prisma, Neon, Supabase, or any non-Convex database
❌ Suggesting Upstash QStash / Redis when Convex scheduler covers it
❌ Adding a separate WebSocket / SSE service when Convex queries are reactive
❌ Recommending raw `fetch` instead of `up-fetch`
❌ Inventing a "workspace" or "team" abstraction on top of organizations
❌ Skipping the `pendingComponent` rule for new routes
❌ **CRITICAL**: Not using AskUserQuestion for approval
❌ **CRITICAL**: Not responding in user's detected language

## ARCHITECTURE PROTOCOLS:

- Start with NowStack defaults, only add what is needed
- Every tool choice needs justification
- Simple is better than clever
- Cost matters for solo devs
- Implementation order should reference NowStack skills

---

## NEXT STEP:

After user approves architecture via AskUserQuestion, load `./step-06-tasks.md`

<critical>
🚀 NOWSTACK ADVANTAGE:
- Auth, payments, organizations, email, storage, analytics, real-time = ALREADY BUILT
- Convex replaces Prisma + queue + cron + WebSocket server
- Focus architecture on UNIQUE features only
- Solo dev + NowStack = 2-7 day timeline is realistic

Remember:
- The goal is to define HOW to build what the PRD specifies on NowStack
- Check NowStack first before adding any service
- Convex queries are reactive - no separate real-time service
- Convex scheduler / crons handle background jobs
- Cloudflare R2 is the canonical file storage
</critical>

---

## Sources

**NowStack Conventions (read these from the repo):**
- `AGENTS.md` (entrypoint)
- `.agents/rules/code-conventions.md`
- `.agents/rules/convex-imports.md`
- `.agents/rules/convex-queries.md`
- `.agents/rules/file-naming.md`
- `.agents/rules/authentication.md`
- `.agents/rules/stripe-billing.md`
- `.agents/rules/tanstack-form.md`
- `.agents/rules/page-skeletons.md`
- `.agents/rules/start-commands.md`
- `convex/_generated/ai/guidelines.md`

**External:**
- [TanStack Start docs](https://tanstack.com/start)
- [Convex docs](https://docs.convex.dev/)
- [Better Auth + Convex component](https://www.better-auth.com/docs/integrations/convex)
