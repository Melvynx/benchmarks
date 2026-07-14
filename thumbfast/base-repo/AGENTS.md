# Thumbfa.st

AI-powered YouTube thumbnail generator SaaS.

## AI Models

**Image Generation (ONLY these):**

- `gemini-3-pro-image-preview` - Google Gemini 3 Pro (Nano Banana Pro)
- `gemini-3.1-flash-image-preview` - Google Gemini 3.1 Flash (Nano Banana 2)
- `gpt-image-2` - OpenAI GPT Image 2

**Text:** `gemini-3.1-flash-lite-preview` (analysis/titles/descriptions)

**CRITICAL**: NEVER use image generation models for text. NEVER use text models for image generation.

## Important Files

- `convex/auth/config.ts` - Auth config (Better Auth with org support on Convex)
- `src/lib/auth-server.ts` - TanStack Start auth bridge for Convex Better Auth
- `src/lib/actions/safe-actions.ts` - Server action wrapper
- `src/lib/zod-route.ts` - API route wrapper (read before creating routes)
- `src/lib/up-fetch.ts` - Fetch wrapper (`upfetch`)
- `src/features/form/tanstack-form.tsx` - TanStack Form setup
- `src/features/dialog-manager/` - Global dialog system (`dialogManager`)
- `src/site-config.ts` - Site configuration

## Auth Helpers

- `fetchAuthQuery()` / `fetchAuthMutation()` from `src/lib/auth-server.ts` - Server-side Convex auth calls
- `useSession()` from `auth-client.ts` - Client-side
- `api.app.orgSettings` - Current org

## Rules

Detailed focused rules live in `.agents/rules/`. Read the relevant file before acting:

- **Migration Diff Review** - [.agents/rules/migration-diff.md](.agents/rules/migration-diff.md) - Compare previous and current versions to find missed routes, APIs, credits, billing, auth, and product gaps.
- **Verification Browser** - [.agents/rules/verification-browser.md](.agents/rules/verification-browser.md) - Browser verification must use `dev-browser --connect` with email OTP and Convex OTP evidence when login is needed.

- **CRITICAL**: Read at least 3 similar files BEFORE editing any code
- **NEVER** use `fetch` — use `upfetch` from `@/lib/up-fetch`
- **NEVER** use React Hook Form — use TanStack Form from `@/features/form/tanstack-form`
- **ALWAYS** use `safe-actions.ts` for server actions
- **ALWAYS** use `zod-route.ts` for API routes
- **NEVER** add Prisma/Postgres/Neon runtime code; use Convex queries/mutations.
- No enums — use maps instead
- Prefer `??` over `||`
- Server action files: `*.action.ts`
- Never use emojis in UI (use Lucide icons)
- Never use gradients unless explicitly asked

## Debugging

For complex logic: add logs at each step, then ASK ME TO SEND the logs.
