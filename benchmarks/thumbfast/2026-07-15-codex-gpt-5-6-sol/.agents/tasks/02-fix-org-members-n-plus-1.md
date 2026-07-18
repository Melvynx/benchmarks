# 02 - Fix N+1 in `getOrganizationMembers` / `loadUserWithMemberships`

**Severity**: BLOCKING (3/3 performance agents + clean-code maintainer agreed)
**Depends on**: nothing - independent

## Problem

Two helpers in `convex/auth/queries.ts` issue one `ctx.runQuery(...findOne)` per item inside a `Promise.all` map:

- `getOrganizationMembers` (lines ~59-101): one `findOne` per **member** to hydrate the user. Capped at `MAX_LIST_MEMBERS = 100` -> up to 100 sequential cross-component queries per call.
- `loadUserWithMemberships` (lines ~115-150): one `findOne` per **org membership** to hydrate the org. Capped at `MAX_USER_MEMBERSHIPS = 50` -> up to 50 cross-component queries per call.

Both are called inside live Convex queries (`getOrganizationById`, `getOrganizationByIdAdmin`, `listOrganizationsAdmin`, `getUserById`, `getUserByIdAdmin`), so they re-run on every reactive update.

## Files

| Path | Why |
|------|-----|
| `convex/auth/queries.ts` | Both helpers live here |
| `convex/_generated/ai/guidelines.md` | **Read first** - rules around `runQuery` / adapter calls |
| `.agents/rules/convex-queries.md` | Project rules for indexed queries vs filter |

## Acceptance criteria

1. `getOrganizationMembers` must batch-fetch all member users in **one** query, not one per member.
2. `loadUserWithMemberships` must batch-fetch all orgs in **one** query, not one per membership.
3. Returned shape unchanged - downstream consumers must keep working.
4. Both functions must still cap results at the existing `MAX_LIST_MEMBERS` / `MAX_USER_MEMBERSHIPS` constants.
5. If the Better Auth adapter `findMany` does **not** support `operator: "in"`, fall back to chunked parallel `findOne` calls (e.g. 10 at a time) and **document the cap in a one-line comment**. Do not silently pretend the fix is complete.

## Implementation notes

Try this first:

```ts
const userIds = rawMembers.map(m => m.userId);
const usersResult = await ctx.runQuery(components.betterAuth.adapter.findMany, {
  model: "user",
  where: [{ field: "_id", operator: "in", value: userIds }],
  paginationOpts: { cursor: null, numItems: MAX_LIST_MEMBERS },
});
const users = (usersResult?.page ?? []) as Array<{ _id: string; name?: string; email?: string; image?: string | null }>;
const userMap = new Map(users.map(u => [String(u._id), u]));
// then build the response by .get(member.userId) on the map
```

If `operator: "in"` is rejected at runtime by Better Auth's adapter (some versions only support `eq`), the fallback is acceptable but must be tested. **Verify which operators are supported** before assuming - the `betterAuth` component is at `convex/betterAuth/`.

Same pattern for `loadUserWithMemberships`, just on `model: "organization"`.

## Verification

```bash
pnpm ts
pnpm lint:ci
```

Manual: load `/admin/organizations/<orgId>` for an org with several members. Check Convex dashboard function logs for the query - the number of nested `runQuery` calls should drop to 1 (or N/CHUNK_SIZE if chunking).

Compare before/after using `npx convex insights` if available, or just compare the function execution time in the Convex dashboard.

## Out of scope

- Fixing `getUserById`'s outer 500-user scan (that's task 01).
- Replacing `MAX_LIST_MEMBERS` with cursor pagination - the cap is intentional for now.
