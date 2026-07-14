# Architecture Template & Guidelines (NowStack)

Reference for designing technical architecture on top of the NowStack boilerplate.

---

## Architecture Philosophy

**Good architecture is:**
- Simple (minimum complexity for requirements)
- Documented (decisions and rationale)
- Cost-aware (solo dev budget reality)
- Practical (uses proven NowStack patterns)

**Over-engineering signs:**
- Tools you don't need yet
- "Future-proofing" for unknown requirements
- Complex patterns for simple problems
- More than 2 weeks to MVP
- Re-implementing something NowStack already provides

---

## Architecture Document Structure

```markdown
# Technical Architecture: {Product Name}

## Overview

**Stack Summary:**
- Frontend: TanStack Start (Vite SSR) + React 19 + Tailwind v4 + shadcn/base-ui
- Backend: Convex (queries / mutations / actions / crons / http)
- Auth: Better Auth via `@convex-dev/better-auth`
- Payments: Stripe via Convex internal actions
- Email: Resend via Convex actions + React Email
- Storage: Cloudflare R2 via `convex/files/actions.ts`
- Deployment: Vercel (frontend) + Convex (backend)

## Frontend Architecture

### Core Stack
| Tool | Purpose |
|------|---------|
| TanStack Start | Framework |
| TypeScript (strict) | Type safety |
| TailwindCSS v4 | Styling |
| shadcn/base-ui | Components |
| Lucide React | Icons (no emojis) |

### State Management
| Type | Solution |
|------|----------|
| Server state | Convex `useQuery` / `useMutation` |
| URL state | TanStack Router search params |
| Form state | TanStack Form + Zod |
| Client state | Zustand (only when global UI state truly needed) |

### Data Fetching
- Default: Convex `useQuery` (reactive, SSR-friendly)
- Mutations: Convex `useMutation`
- External HTTP: `up-fetch` from `@/lib/up-fetch.ts` (never raw fetch)

## Backend Architecture (Convex)

### Module Layout
| Path | Contents |
|------|----------|
| `convex/schema.ts` | All tables + indexes |
| `convex/<feature>/queries.ts` | Reactive reads |
| `convex/<feature>/mutations.ts` | Transactional writes |
| `convex/<feature>/dto/<name>.ts` | DTO mappers (one shape per file) |
| `convex/<feature>.ts` | Single-file modules (e.g. `stripe.ts`, `email.ts`) |
| `convex/http.ts` | Inbound webhooks |
| `convex/crons.ts` | Scheduled jobs |
| `convex/auth/` | Better Auth wiring |
| `convex/betterAuth/` | Better Auth Convex component |
| `convex/_generated/` | DO NOT EDIT |

### Schema Example
```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  posts: defineTable({
    organizationId: v.id("organizations"),
    authorId: v.id("users"),
    title: v.string(),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_org", ["organizationId"])
    .index("by_author", ["authorId"]),
});
```

### Function Pattern
```ts
// convex/posts/queries.ts
import { query } from "@convex/_generated/server";
import { v } from "convex/values";
import { getOrgMember } from "@convex/auth/helpers";
import { toPostDto } from "@convex/posts/dto/post";

export const listByOrg = query({
  args: { organizationId: v.id("organizations") },
  handler: async (ctx, { organizationId }) => {
    await getOrgMember(ctx, organizationId);

    const posts = await ctx.db
      .query("posts")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .order("desc")
      .take(50);

    return posts.map(toPostDto);
  },
});
```

## Infrastructure

### Deployment
- Frontend: Vercel
- Backend: Convex (`pnpm convex:deploy` or `/publish-to-production`)
- Environments: dev (local Convex dev deployment), production (separate Convex deployment + Vercel project)

### External Services
| Service | Purpose | Status |
|---------|---------|--------|
| Better Auth (Convex component) | Auth | ✅ Built-in |
| Stripe | Payments | ✅ Built-in |
| Resend | Email | ✅ Built-in |
| Cloudflare R2 | File storage | ✅ Built-in |
| PostHog | Analytics | ✅ Built-in |
| LLM provider | AI features | Add only if PRD needs it |
| Sentry | Error tracking | Optional post-launch |

## Folder Structure

```
.
├── convex/
│   ├── schema.ts
│   ├── http.ts
│   ├── crons.ts
│   ├── stripe.ts
│   ├── email.ts
│   ├── files/actions.ts
│   ├── auth/
│   ├── betterAuth/
│   ├── {feature}/
│   │   ├── queries.ts
│   │   ├── mutations.ts
│   │   └── dto/<name>.ts
│   ├── convex.config.ts
│   └── _generated/
├── src/
│   ├── routes/
│   │   ├── __root.tsx
│   │   ├── (logged-in)/account/...
│   │   └── orgs/$orgSlug/(navigation)/...
│   ├── components/
│   │   ├── ui/         # shadcn primitives
│   │   └── nowts/      # custom shared
│   ├── features/{feature}/
│   ├── hooks/use-*.ts
│   ├── lib/up-fetch.ts
│   └── lib/auth/stripe/auth-plans.ts
├── emails/
├── __tests__/
└── e2e/
```

## Feature Implementation Map

| PRD Feature | Convex Tables / Functions | Routes / Components |
|-------------|----------------------------|---------------------|
| {Feature 1} | tables + queries/mutations | route + feature folder |
| {Feature 2} | ... | ... |

## Architecture Decisions

### ADR-001: {Decision Title}
- **Context**: {Why needed}
- **Decision**: {What we chose}
- **Rationale**: {Why this choice}
- **Trade-offs**: {What we give up}

## Cost Estimation

| Service | Monthly Cost |
|---------|-------------|
| Vercel | $0-20 |
| Convex | $0-25 |
| Resend | $0-20 |
| Cloudflare R2 | $0 (free tier) |
| PostHog | $0 (free tier) |
| **Total** | ~$0-65 |
```

---

## Common Patterns

### Authentication
```
User → Login route → Better Auth (Convex component) → Session cookie → Protected routes
```
Identity is read inside every Convex function via the helpers in `convex/auth/`.

### Data Mutation
```
Form (TanStack Form + Zod) → Convex `useMutation(api.<feature>.<name>)` → Convex mutation
  → Zod-validated args → identity + role check → ctx.db.insert/patch/delete
  → reactive subscribers re-render automatically
```

### Webhook
```
Stripe / external → POST <convex-site>/<path> → handler in `convex/http.ts`
  → internal action → schedule follow-up via `scheduler.runAfter(...)`
```

### File Upload
```
Client → action in `convex/files/actions.ts` → S3 SDK against R2 → returns public URL
```

---

## Decision Checklist

Before adding any tool, ask:

1. **Does NowStack already provide this?**
   - If yes, configure it - do not rebuild
2. **Can Convex do it natively?**
   - Reactive reads, scheduling, search, vector, HTTP - usually yes
3. **Does the PRD require this?**
   - If no, don't add it
4. **What's the cost?**
   - Free tier limits? Scaling costs?
5. **What's the trade-off?**
   - Complexity added? Vendor lock-in?

---

## Plans & Limits (Better Auth on NowStack)

**🚨 CRITICAL: Keep it simple - NO extra abstraction layers!**

### Data Model
```
Organization → Resources (projects, files, etc.)
Organization → Subscription → Plan → Limits
```

**❌ NEVER add:** workspace level, team level (separate from Organization), project-level plans, any other layer.

### Where Plans Live
- Plan config: `src/lib/auth/stripe/auth-plans.ts` (or equivalent in `convex/`)
- Stripe price IDs flow in through Convex env (`STRIPE_<PLAN>_PLAN_ID`, `STRIPE_<PLAN>_YEARLY_PLAN_ID`)
- Better Auth `freeTrial` config is supported per plan

### Example (do not copy verbatim - adapt to PRD)

```ts
const DEFAULT_LIMIT = {
  projects: 5,
  storage: 10,    // GB
  members: 3,
  aiCredits: 20,
};

export type PlanLimit = typeof DEFAULT_LIMIT;
export type OverrideLimits = Partial<PlanLimit>;

export const AUTH_PLANS = [
  {
    name: "free",
    description: "For individuals and small projects",
    limits: DEFAULT_LIMIT,
    price: 0,
    currency: "USD",
  },
  {
    name: "pro",
    isPopular: true,
    description: "For growing teams",
    priceId: process.env.STRIPE_PRO_PLAN_ID ?? "",
    annualDiscountPriceId: process.env.STRIPE_PRO_YEARLY_PLAN_ID ?? "",
    limits: { projects: 20, storage: 50, members: 10, aiCredits: 50 },
    freeTrial: { days: 14 },
    price: 49,
    yearlyPrice: 400,
    currency: "USD",
  },
] as const;

export const getPlanLimits = (
  plan = "free",
  overrideLimits?: OverrideLimits | null,
): PlanLimit => {
  const planLimits = AUTH_PLANS.find((p) => p.name === plan)?.limits;
  const baseLimits = planLimits ?? DEFAULT_LIMIT;
  return overrideLimits ? { ...baseLimits, ...overrideLimits } : baseLimits;
};
```

### Enforcing Limits Inside Convex
```ts
// convex/projects/mutations.ts
export const create = mutation({
  args: { organizationId: v.id("organizations"), name: v.string() },
  handler: async (ctx, { organizationId, name }) => {
    const member = await getOrgMember(ctx, organizationId);
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .unique();

    const limits = getPlanLimits(subscription?.plan ?? "free", subscription?.overrideLimits);

    const count = await ctx.db
      .query("projects")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    if (count.length >= limits.projects) {
      throw new ConvexError("Project limit reached. Please upgrade your plan.");
    }

    return ctx.db.insert("projects", { organizationId, name, ownerId: member.userId });
  },
});
```

### Key Principles
1. **Organization is the billing entity** - plans are on Organizations, not Users
2. **Limits live in `auth-plans.ts`** (centralized)
3. **Override support** - allow per-organization limit overrides (for custom deals)
4. **No extra layers** - Organization → Resources, full stop

---

## Anti-Patterns

❌ **Prisma / PostgreSQL / Supabase** - NowStack is Convex-only
❌ **Upstash QStash / Redis / Realtime** - Convex covers all these natively
❌ **Vercel Cron / Trigger.dev / Inngest** - use `convex/crons.ts`
❌ **Custom WebSocket server** - Convex queries are reactive by default
❌ **Raw `fetch`** - use `@/lib/up-fetch.ts`
❌ **Server actions / TanStack server functions for app data** - put it in Convex
❌ **Microservices for MVP** - one Convex deployment is enough
❌ **Workspace abstraction** - Organization is the only tenant boundary
❌ **User-level plans** - plans belong to Organizations
❌ **1-1 relationships just for "organization"** - put fields directly on the parent table
❌ **Routes without `pendingComponent`** - mandatory per `.agents/rules/page-skeletons.md`
❌ **`react-hook-form` in new code** - use TanStack Form

### 1-1 Relationships Anti-Pattern

**❌ BAD - Separate table for no reason:**
```ts
users: defineTable({ /* ... */ }),
userProfiles: defineTable({
  userId: v.id("users"),
  bio: v.optional(v.string()),
  avatar: v.optional(v.string()),
}).index("by_user", ["userId"]),
```

**✅ GOOD - Fields directly on the parent table:**
```ts
users: defineTable({
  bio: v.optional(v.string()),
  avatar: v.optional(v.string()),
  // ...
}),
```

**When 1-1 IS acceptable:**
- External system integration (e.g. `StripeCustomer` row keyed to a user/org)
- Better Auth managed tables (session, account, etc.)
- Genuinely optional large data rarely loaded
