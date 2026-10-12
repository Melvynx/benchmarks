# Plan 001: Make agent chats persist and stop duplicating by storing the client chat id

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 360148f0..HEAD -- convex/app/agentChats.ts convex/schema.ts src/routes/orgs/\$orgSlug/agent.tsx 'src/routes/orgs/\$orgSlug/agent/\$chatId.tsx' 'server/api/orgs/[orgSlug]/agent/chat.post.ts'`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `360148f0`, 2026-06-12

## Why this matters

The agent chat (beta "Agents generations" feature) loses every conversation on
page reload, and silently fills the `agentChats` table with duplicate
documents. Root cause: the client generates `crypto.randomUUID()` as the chat
id and puts it in the URL, but the Convex functions look chats up with
`ctx.db.normalizeId("agentChats", chatId)`, which returns `null` for anything
that is not a Convex document id. So `saveAgentChat` never finds the existing
doc (it inserts a NEW document on every save — one conversation produced two
docs in live testing), and `agentChatDetail` returns `null` for the UUID URL,
rendering an empty "Send a message to start" chat even though the conversation
completed seconds earlier. This was reproduced end-to-end in a browser.

## Current state

Files and roles:

- `convex/schema.ts:246-254` — `agentChats` table definition. No field stores
  the client-generated id today:

  ```ts
  agentChats: defineTable({
    ...orgScoped,
    title: v.optional(v.string()),
    // Intentional any: AI SDK UI messages are heterogeneous JSON payloads.
    messages: v.array(v.any()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_legacy", ["legacyId"])
    .index("by_organization_created", ["organizationId", "createdAt"]),
  ```

- `convex/app/agentChats.ts` — all agent-chat Convex functions. Three matter
  here (line numbers as of the planned-at commit):
  - `listAgentChats` (line 11) — returns `id: String(chat._id)` (Convex doc
    id) for each chat; any UI history list links with that id.
  - `agentChatDetail` (line 101) — the broken lookup:

    ```ts
    // convex/app/agentChats.ts:107-108
    const chatId = ctx.db.normalizeId("agentChats", args.chatId);
    const chat = chatId ? await ctx.db.get(chatId) : null;
    ```

  - `saveAgentChat` (line 123) — the duplicating save:

    ```ts
    // convex/app/agentChats.ts:135-138
    const normalizedId = args.chatId
      ? ctx.db.normalizeId("agentChats", args.chatId)
      : null;
    const existing = normalizedId ? await ctx.db.get(normalizedId) : null;
    ```

    When `existing` is null it falls through to `ctx.db.insert(...)`
    (around line 154) — that insert runs on EVERY save for UUID chat ids.

- `src/routes/orgs/$orgSlug/agent.tsx` — agent landing page. `startChat`
  generates the UUID and navigates:

  ```ts
  // agent.tsx (inside AgentLanding)
  const startChat = (message?: string) => {
    const trimmed = (message ?? input).trim();
    if (!trimmed) return;
    const chatId = crypto.randomUUID();
    sessionStorage.setItem(`agent-chat-input-${chatId}`, trimmed);
    void navigate({ to: `/orgs/${orgSlug}/agent/${chatId}` as never });
  };
  ```

- `src/routes/orgs/$orgSlug/agent/$chatId.tsx` — chat page; loads via
  `agentChatDetail` (`makeFunctionReference("app:agentChatDetail")`) and reads
  the one-shot initial input from
  `sessionStorage["agent-chat-input-" + chatId]`.

- `server/api/orgs/[orgSlug]/agent/chat.post.ts` — Nitro endpoint streaming
  the agent. It loads prior messages via `app:agentChatDetail` and persists in
  `onFinish` via `app:saveAgentChat`, passing the same `chatId` string
  through. It does not need to change if lookup/save resolve consistently.

- `convex/app.ts:50-55` — re-export barrel; `agentChatDetail`,
  `agentPromptContext`, `listAgentChats`, `saveAgentChat` are re-exported from
  `./app/agentChats` so they are addressable as `app:*`. No change needed, but
  if you add any NEW exported function you must re-export it here too or the
  server will get "Could not find public function".

Repo conventions that apply:

- Convex functions in `convex/app/*` use `queryGeneric`/`mutationGeneric` and
  `(q: any)` index callbacks — match the existing style in this exact file.
- Every handler starts with
  `requireOrg(appCtx, args.orgSlug)` + `requireThumbnailAgentAccess(appCtx, member)`.
  Keep that intact.
- Project rule: every code change adds a `CHANGELOG.md` entry at the top of
  today's `## YYYY-MM-DD` section, present tense, `FIX:` prefix.

Chosen approach (decided — do not redesign): keep the client-generated UUID as
the *stable public id* in the URL, and persist it on the document as
`clientChatId`. Look up by `clientChatId` first, fall back to
`normalizeId` for old documents whose URLs used Convex doc ids (e.g. links
from `listAgentChats`). This avoids changing the URL mid-conversation and
keeps the sessionStorage initial-input mechanism working unchanged.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Typecheck | `pnpm ts` | exit 0, no output after the tsc banner |
| Lint | `pnpm lint` | exit 0 (note: runs `eslint --fix`, may rewrite files) |
| Unit tests | `pnpm test:ci` | all pass |
| Dev servers | `pnpm start-all` | web on http://localhost:3000, logs in `.logs/convex.txt` and `.logs/web.txt` (check if already running first) |

## Scope

**In scope** (the only files you should modify):

- `convex/schema.ts` (add field + index to `agentChats` only)
- `convex/app/agentChats.ts`
- `CHANGELOG.md` (one entry)

**Out of scope** (do NOT touch, even though they look related):

- `server/api/orgs/[orgSlug]/agent/chat.post.ts` — works unchanged once
  resolution is consistent; touching it risks the streaming path.
- `src/routes/orgs/$orgSlug/agent.tsx` and `agent/$chatId.tsx` — the client
  keeps generating UUIDs; that is now the supported contract.
- `convex/app.ts` — no new exported functions are added by this plan.
- Any other table in `convex/schema.ts`.
- `src/features/agent/message/thumbnail-grid.tsx` and unrelated `CHANGELOG.md`
  hunks — the working tree may contain unrelated uncommitted changes; leave
  them exactly as found.

## Git workflow

- Branch: `advisor/001-agent-chat-persistence` (repo uses conventional-ish
  messages, e.g. `fix: gate thumbnail agent access (#57)`).
- One commit: `fix(agent): persist chats by client chat id to stop duplicates`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Add `clientChatId` to the schema

In `convex/schema.ts`, inside the `agentChats` table (lines ~246-254), add the
optional field and a lookup index:

```ts
agentChats: defineTable({
  ...orgScoped,
  title: v.optional(v.string()),
  // Intentional any: AI SDK UI messages are heterogeneous JSON payloads.
  messages: v.array(v.any()),
  // Client-generated UUID used in the chat URL (crypto.randomUUID()).
  clientChatId: v.optional(v.string()),
})
  .index("by_organization", ["organizationId"])
  .index("by_legacy", ["legacyId"])
  .index("by_organization_created", ["organizationId", "createdAt"])
  .index("by_organization_client_chat_id", ["organizationId", "clientChatId"]),
```

**Verify**: `pnpm ts` → exit 0. If a convex dev process is running, check
`.logs/convex.txt` shows the schema pushed without errors.

### Step 2: Add a shared resolver in `convex/app/agentChats.ts`

Add a module-private helper (not exported — nothing to add in `convex/app.ts`)
above `agentChatDetail`:

```ts
async function findChatForOrg(ctx: any, orgId: string, chatId: string) {
  const byClientId = await ctx.db
    .query("agentChats")
    .withIndex("by_organization_client_chat_id", (q: any) =>
      q.eq("organizationId", orgId).eq("clientChatId", chatId),
    )
    .first();
  if (byClientId) return byClientId;

  // Back-compat: older URLs (and listAgentChats links) use the Convex doc id.
  const normalizedId = ctx.db.normalizeId("agentChats", chatId);
  const byDocId = normalizedId ? await ctx.db.get(normalizedId) : null;
  if (byDocId && byDocId.organizationId !== orgId) return null;
  return byDocId;
}
```

**Verify**: `pnpm ts` → exit 0.

### Step 3: Use the resolver in `agentChatDetail`

Replace the two lines at `convex/app/agentChats.ts:107-108` and the
org-ownership check below them with:

```ts
const chat = await findChatForOrg(ctx, org.id, args.chatId);
if (!chat) {
  return null;
}
```

(The existing code also checks `chat.organizationId !== org.id` — that check
is now inside `findChatForOrg`; do not double-return differently.)

**Verify**: `pnpm ts` → exit 0.

### Step 4: Use the resolver in `saveAgentChat` and store `clientChatId`

In `saveAgentChat` (line ~123):

1. Replace the `normalizedId`/`existing` resolution (lines ~135-138) with:

   ```ts
   const existing = args.chatId
     ? await findChatForOrg(ctx, org.id, args.chatId)
     : null;
   ```

2. Remove the now-redundant
   `if (existing && existing.organizationId !== org.id) throw` block (the
   resolver already returns null for foreign-org docs). Keep the rest of the
   patch branch unchanged.

3. In the insert branch, persist the client id:

   ```ts
   const id = await ctx.db.insert("agentChats", {
     organizationId: org.id,
     title,
     messages: args.messages,
     clientChatId: args.chatId,
     createdAt: now,
     updatedAt: now,
   });
   ```

   Note `args.chatId` is `v.optional(v.string())` — passing `undefined` is
   fine for the optional field.

**Verify**: `pnpm ts` → exit 0, then `pnpm lint` → exit 0.

### Step 5: End-to-end verification in the browser

Use the dev-browser tooling if available (repo rule: `dev-browser --connect`,
email OTP login; OTP code appears in `.logs/convex.txt` after requesting it on
the sign-in page). The `thumbnail-agent` feature flag must be enabled at
`/admin/feature-flags` and the account must be org admin/owner — the account
melvynmal@gmail.com on org `codelynx` satisfied both during the audit.

1. Open `/orgs/codelynx/agent`, type any message, press Enter — you land on
   `/orgs/codelynx/agent/{uuid}`.
2. Wait for the assistant to finish responding.
3. **Reload the page.** Expected: the conversation is still there (before this
   fix it rendered an empty chat).
4. Send a second message, wait, reload again. Expected: full history intact.
5. Count documents: in the Convex dashboard data browser (or a throwaway
   query), confirm exactly ONE `agentChats` document exists with
   `clientChatId === {uuid}` (before this fix every save inserted another).

**Verify**: steps 3-5 behave as described. Capture a screenshot of the
reloaded chat showing history as evidence.

## Test plan

There is no `convex-test` harness in this repo (unit tests in `__tests__/` are
pure-function vitest tests, e.g. `__tests__/billing-renewal.test.ts`), so the
resolver cannot be unit-tested against a real db. Do NOT introduce a new test
framework for this plan. Coverage is:

- `pnpm test:ci` → existing suite still passes (no regressions).
- The browser verification in Step 5 is the acceptance test; its reload check
  is the regression test for this exact bug.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm ts` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test:ci` exits 0
- [ ] `grep -n "clientChatId" convex/schema.ts convex/app/agentChats.ts` shows
      the field in both files
- [ ] Browser check: reload of an active chat URL shows the conversation, and
      exactly one `agentChats` doc exists for that conversation
- [ ] `git status` shows no modified files outside the in-scope list (besides
      pre-existing unrelated worktree changes noted in Scope)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" don't match the live code (drift since
  `360148f0`).
- `agentChats` documents in production-like data already use a `clientChatId`
  field for some other purpose (check the schema and a sample doc first).
- The schema push fails in `.logs/convex.txt` (index conflicts) after one fix
  attempt.
- Fixing the lookup appears to require modifying
  `server/api/orgs/[orgSlug]/agent/chat.post.ts` — it should not; if it does,
  the assumption "lookup/save consistency is sufficient" is false.

## Maintenance notes

- `listAgentChats` still returns Convex doc ids; any future chat-history UI
  should link with `clientChatId ?? _id` so URLs stay uniform — but doc-id
  URLs keep working through the resolver fallback.
- If chat sharing/export is added later, treat `clientChatId` as the public
  identifier and never expose raw doc ids.
- Reviewer should scrutinize: the foreign-org check moved into
  `findChatForOrg` — confirm no path can read another org's chat (the
  `by_organization_client_chat_id` index is org-scoped by construction; the
  doc-id fallback re-checks `organizationId`).
- Deferred: deduplicating the duplicate documents already created by the bug
  (harmless orphans; a cleanup migration is optional and out of scope).
