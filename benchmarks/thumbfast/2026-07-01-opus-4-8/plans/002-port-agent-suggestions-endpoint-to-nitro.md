# Plan 002: Port the dead agent-suggestions endpoint from `app/` to the served Nitro `server/` directory

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 360148f0..HEAD -- 'app/api/orgs/[orgId]/agent/suggestions/route.ts' src/features/agent/follow-ups.tsx 'server/api/orgs/[orgSlug]/agent/' vite.config.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `360148f0`, 2026-06-12

## Why this matters

After every agent reply, the chat UI requests follow-up suggestion chips from
`POST /api/orgs/{orgSlug}/agent/suggestions`. That route only exists as a
Next.js App Router file under `app/api/.../route.ts` — a leftover from the
Next.js → TanStack Start migration. The app's server is Nitro with
`serverDir: "server"` (`vite.config.ts:189`); nothing serves `app/`. The
directory is even excluded from `tsconfig.json` and ignored by ESLint. Result:
every finished agent turn fires a request that 404s, the catch swallows it,
and the suggestions feature silently never works — plus a dead-but-plausible
route file that will keep absorbing future edits that do nothing.

## Current state

Files and roles:

- `app/api/orgs/[orgId]/agent/suggestions/route.ts` — the orphaned Next.js
  handler (78 lines). It is NOT served, NOT typechecked, NOT linted. Its full
  logic, to be ported:

  ```ts
  // app/api/orgs/[orgId]/agent/suggestions/route.ts (abridged)
  import { getAnalysisModel } from "@/lib/ai/gemini";
  import { logger } from "@/lib/logger";
  import { getCurrentOrg } from "@/lib/organizations/get-org"; // Next-era helper — do NOT reuse
  import { generateObject } from "ai";
  import { z } from "zod";

  const RequestSchema = z.object({
    recent: z
      .array(z.object({ role: z.enum(["user", "assistant"]), text: z.string().max(2000) }))
      .min(1)
      .max(8),
  });

  const SuggestionsSchema = z.object({
    suggestions: z.array(z.string().min(2).max(60)).min(2).max(3)
      .describe("Three short follow-up actions (under 60 chars each) the user could take next, written from the user's POV in the imperative."),
  });

  export async function POST(req, { params }) {
    const { orgId } = await params;
    const org = await getCurrentOrg({ orgSlugOrId: orgId });
    if (!org) return new Response("Unauthorized", { status: 401 });
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) return new Response("Invalid request body", { status: 400 });
    const transcript = parsed.data.recent
      .map((m) => `${m.role.toUpperCase()}: ${m.text.slice(0, 1000)}`)
      .join("\n\n");
    try {
      const result = await generateObject({
        model: getAnalysisModel(),
        schema: SuggestionsSchema,
        messages: [{ role: "user", content: `You are helping a YouTube creator decide what to ask a thumbnail-generating AI agent next. Based on the recent conversation below, propose 3 short, distinct follow-up actions.

  Rules:
  - Each suggestion is under 60 characters.
  - Phrase them from the user's perspective ("Make a darker variation of #2", "Edit the background to white", "Try a shocked expression").
  - Suggestions must be specific to the actual conversation, not generic.
  - Do not repeat what was just done. Suggest the obvious next move.

  Conversation:
  ${transcript}` }],
      });
      return Response.json({ suggestions: result.object.suggestions });
    } catch (error) {
      logger.warn("[AgentSuggestions] generation failed", { error });
      return Response.json({ suggestions: [] });
    }
  }
  ```

- `src/features/agent/follow-ups.tsx` — the caller. It debounces 500ms after
  a turn, POSTs `{ recent }` via `upfetch`, expects `{ suggestions: string[] }`,
  and swallows failures (`catch { setSuggestions([]) }`) — which is why the
  404 has been invisible:

  ```ts
  // src/features/agent/follow-ups.tsx:69-76
  const res = (await upfetch(`/api/orgs/${orgSlug}/agent/suggestions`, {
    method: "POST",
    body: { recent },
    signal: controller.signal,
  })) as { suggestions: string[] };
  ```

- `server/api/orgs/[orgSlug]/agent/chat.post.ts` — the exemplar Nitro handler
  in the SAME directory the new file goes into. Match its structure exactly:
  default-exported `async function (event: NitroRequestEvent)`, org resolution
  via `getRequiredOrgForSession`, access gate via `canAccessThumbnailAgent`,
  Zod `safeParse` of `await event.req.json()`, `Response.json(...)` returns.
  Key excerpt:

  ```ts
  // server/api/orgs/[orgSlug]/agent/chat.post.ts (top of handler)
  import { getPathParam } from "../../../../_shared/params";
  import { getRequiredOrgForSession, type NitroRequestEvent } from "../../../../_shared/session";
  import { canAccessThumbnailAgent } from "@/features/agent/thumbnail-agent-access";

  export default async function agentChat(event: NitroRequestEvent) {
    const orgSlug = getPathParam(event.req, 2);
    if (!orgSlug) {
      return Response.json({ message: "Missing organization slug" }, { status: 400 });
    }
    const result = await getRequiredOrgForSession(event, orgSlug);
    if (!result.org) {
      return Response.json(
        { message: result.status === 401 ? "Unauthorized" : "Organization not found" },
        { status: result.status },
      );
    }
    if (!canAccessThumbnailAgent({ role: result.role, features: result.features })) {
      return Response.json({ message: "Forbidden" }, { status: 403 });
    }
    // ... body parse with ChatRequestSchema.safeParse(await event.req.json())
  }
  ```

- `vite.config.ts:189` — `nitro({ serverDir: "server", ... })`: proof that
  only `server/` is served. Nitro file-routing convention in this repo:
  `server/api/orgs/[orgSlug]/agent/<name>.post.ts` →
  `POST /api/orgs/{orgSlug}/agent/<name>`.

Repo conventions that apply:

- Text/analysis model access goes through `getAnalysisModel()` from
  `@/lib/ai/gemini` (already what the orphan uses).
- Never use raw `fetch` — irrelevant here (no outbound HTTP), but keep
  `upfetch` on the client side untouched.
- Project rule: add a `CHANGELOG.md` entry (`FIX:` prefix, present tense)
  under today's date section.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm ts` | exit 0 |
| Lint | `pnpm lint` | exit 0 (runs `eslint --fix`) |
| Unit tests | `pnpm test:ci` | all pass |
| Dev servers | `pnpm start-all` | web on http://localhost:3000 (check if already running) |
| Endpoint smoke | `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/orgs/anything/agent/suggestions -H 'content-type: application/json' -d '{"recent":[]}'` | `401` (unauthenticated) — NOT `404` |

## Scope

**In scope** (the only files you should modify):

- `server/api/orgs/[orgSlug]/agent/suggestions.post.ts` (create)
- `app/` (delete the directory — it contains ONLY
  `api/orgs/[orgId]/agent/suggestions/route.ts`; verify with `find app -type f`
  before deleting; use `trash app` — `rm -rf` is blocked in this environment,
  and plain `git rm -r app` is acceptable too since it's tracked)
- `CHANGELOG.md` (one entry)

**Out of scope** (do NOT touch, even though they look related):

- `src/features/agent/follow-ups.tsx` — its request/response contract is the
  spec; the new endpoint must conform to IT, not the other way around.
- `server/api/orgs/[orgSlug]/agent/chat.post.ts` — exemplar only.
- `src/lib/organizations/get-org.ts` (if it exists) — Next-era helper used by
  the orphan; the port replaces it with `getRequiredOrgForSession`, it does
  not modify it.
- `vite.config.ts`, `tsconfig.json`, `eslint.config.mjs` — after deleting
  `app/`, their `app` excludes become harmless dead config; leave them
  (removing excludes risks churn elsewhere). Exception: if `pnpm lint` or
  `pnpm ts` FAILS because the ignore target vanished, that is a STOP
  condition, not a license to edit configs.

## Git workflow

- Branch: `advisor/002-agent-suggestions-endpoint`
- One commit: `fix(agent): serve follow-up suggestions endpoint via nitro, drop dead app/ dir`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the Nitro endpoint

Create `server/api/orgs/[orgSlug]/agent/suggestions.post.ts`. Structure it
exactly like `chat.post.ts` (same imports for `getPathParam`,
`getRequiredOrgForSession`, `NitroRequestEvent`, `canAccessThumbnailAgent`),
then port the orphan's logic:

- `RequestSchema` and `SuggestionsSchema`: copy verbatim from the excerpt in
  "Current state".
- Auth: `getRequiredOrgForSession(event, orgSlug)` (replaces
  `getCurrentOrg`), then the `canAccessThumbnailAgent` 403 gate — the
  suggestions endpoint is part of the gated agent feature and must be gated
  like `chat.post.ts`.
- Body: `RequestSchema.safeParse(await event.req.json())`; on failure return
  `Response.json({ message: "Invalid request body" }, { status: 400 })`.
- Generation: `generateObject({ model: getAnalysisModel(), schema: SuggestionsSchema, messages: [...] })`
  with the prompt text copied verbatim (including the transcript assembly
  `m.text.slice(0, 1000)` mapping).
- Success: `Response.json({ suggestions: result.object.suggestions })`.
- Failure: `logger.warn("[AgentSuggestions] generation failed", { error })`
  then `Response.json({ suggestions: [] })` — the client treats an empty
  array as "show nothing", which is the intended graceful degradation.
- Drop the Next-only `export const maxDuration = 20;` (Nitro ignores it).

**Verify**: `pnpm ts` → exit 0. `pnpm lint` → exit 0.

### Step 2: Delete the orphaned `app/` directory

First confirm it contains nothing else:

```
find app -type f
```

Expected output is exactly one file:
`app/api/orgs/[orgId]/agent/suggestions/route.ts`. If anything else appears,
STOP. Then `git rm -r app` (or `trash app` then stage the deletion).

**Verify**: `pnpm ts` → exit 0 and `pnpm lint` → exit 0 (both previously
excluded `app/`, so neither should change behavior). `git status` shows the
deletion staged.

### Step 3: Smoke-test the route exists

With dev servers running (`pnpm start-all` if not already; web log at
`.logs/web.txt`):

```
curl -s -o /dev/null -w "%{http_code}" -X POST \
  http://localhost:3000/api/orgs/anything/agent/suggestions \
  -H 'content-type: application/json' -d '{"recent":[]}'
```

**Verify**: prints `401` (unauthorized — proves the route is served and the
auth gate runs). Before this plan it printed `404`.

### Step 4: Verify in the real UI (optional but recommended)

If dev-browser tooling is available (repo rule: `dev-browser --connect`,
email OTP sign-in, OTP visible in `.logs/convex.txt`; needs the
`thumbnail-agent` flag enabled and an org admin account — melvynmal@gmail.com
on org `codelynx` worked during the audit): open an agent chat, send a
message, wait for the reply to finish, and within a few seconds the
"Thinking of next steps..." shimmer should resolve into 2-3 clickable
suggestion chips below the conversation.

**Verify**: suggestion chips render; clicking one sends it as a message.
Screenshot as evidence.

### Step 5: Changelog

Add under today's `## YYYY-MM-DD` section in `CHANGELOG.md` (create the
section if absent):

```
FIX: Serve the agent follow-up suggestions endpoint via Nitro (`server/api/orgs/[orgSlug]/agent/suggestions.post.ts`) - the previous handler lived in the unserved Next.js leftover `app/` directory, so every request 404'd and suggestion chips never appeared; the dead `app/` directory is removed.
```

**Verify**: `git diff CHANGELOG.md` shows only this addition.

## Test plan

- No new unit tests: the handler is a thin Zod + `generateObject` wrapper with
  no extractable pure logic, and the repo has no HTTP-handler test harness
  (unit tests in `__tests__/` are pure-function vitest tests).
- Acceptance = Step 3 curl returning `401` instead of `404`, plus Step 4 UI
  chips.
- `pnpm test:ci` → existing suite passes (no regressions).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm ts` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:ci` exits 0
- [ ] `test -f 'server/api/orgs/[orgSlug]/agent/suggestions.post.ts'` → exists
- [ ] `test -d app` → does NOT exist
- [ ] Step 3 curl returns `401` (not `404`)
- [ ] `git status` shows no modified files outside the in-scope list (besides
      pre-existing unrelated worktree changes)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `find app -type f` lists any file other than the suggestions route.
- The curl smoke test still returns `404` after one restart of the dev server
  (Nitro route registration may need a server restart — try that once).
- `getRequiredOrgForSession` or `canAccessThumbnailAgent` signatures don't
  match the excerpt (drift since `360148f0`).
- Deleting `app/` breaks `pnpm ts` or `pnpm lint` in a way one retry doesn't
  resolve — report rather than editing `tsconfig.json`/`eslint.config.mjs`.

## Maintenance notes

- The endpoint shares the agent's access gate; if gating logic changes
  (e.g. flag renamed), update `chat.post.ts` and `suggestions.post.ts`
  together — consider extracting a shared guard then (deferred now: two call
  sites don't justify it).
- Reviewer should scrutinize: the prompt text and schemas should be verbatim
  from the orphan (behavior-preserving port), and the 403 gate is NEW relative
  to the orphan (which only checked org membership) — that hardening is
  intentional.
- Follow-up explicitly deferred: `tsconfig.json`/`eslint.config.mjs` still
  reference the now-deleted `app/` in their exclude/ignore lists; harmless,
  clean up opportunistically.
