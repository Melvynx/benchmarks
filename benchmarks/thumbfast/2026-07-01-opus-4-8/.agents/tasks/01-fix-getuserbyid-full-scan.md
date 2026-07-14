# 01 - Fix `getUserById` / `getUserByIdAdmin` full-table scan

**Severity**: BLOCKING (3/3 clean-code agents + 3/3 performance agents agreed)
**Depends on**: nothing - independent

## Problem

`convex/auth/queries.ts` exposes two queries that look like point lookups but are O(N) scans:

- `getUserById` (lines ~429-444)
- `getUserByIdAdmin` (lines ~506-525)

Both call `auth.api.listUsers({ headers, query: { limit: MAX_LIST_USERS } })` (where `MAX_LIST_USERS = 500`) and then `.find(u => u.id === args.userId)` in JavaScript.

Every admin user-detail page load reads up to 500 user rows over the wire just to return one. Beyond user #500 the function silently returns `null` even when the user exists.

## Files

| Path | Why |
|------|-----|
| `convex/auth/queries.ts` | Contains both broken functions |
| `convex/feedbacks/queries.ts:14-32` | Reference: `hydrateFeedbackUser` already does the correct adapter pattern with `findOne` by `_id` |
| `convex/auth/queries.ts:365-386` | Reference: `getOrganizationById` already uses `findOne` against `betterAuth.adapter` |

## Acceptance criteria

1. `getUserById` and `getUserByIdAdmin` must do a direct lookup by id - **never** call `auth.api.listUsers` to find one user.
2. Public-facing return shapes (the keys consumers read) must not change. Check every caller before merging:
   - `useQuery(api.auth.queries.getUserById, ...)` and `getUserByIdAdmin` callers in `src/`
3. `getUserByIdAdmin` must still call `requireAdmin(ctx)` first.
4. The `members` field returned by both functions (via `loadUserWithMemberships`) must still be populated.

## Implementation notes

The Better Auth adapter is already used in this file. Pattern to follow:

```ts
const rawUser = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "_id", operator: "eq", value: args.userId }],
});
if (!rawUser) return null;
```

Then map `rawUser` to the same shape the existing `users.find(...)` returned. Read the current code carefully - the `auth.api.listUsers` response includes some computed fields (e.g. `banned`, `banReason`, `banExpires`, `role`); the raw adapter row may name them differently. Inspect a real row at runtime if uncertain (`npx convex run auth:queries:listUsers` against dev).

If a field is genuinely only available via `auth.api.*`, prefer adding a single-user variant to Better Auth instead of fetching all 500. Do **not** keep the fallback "fetch all then filter" path.

## Verification

```bash
pnpm ts
pnpm lint:ci
```

Manually exercise the admin user detail page (`/admin/users/<id>`) for a user known to exist - it must load. Test with a user that does **not** exist - it must return null/404 cleanly, not throw.

Then check `loadUserWithMemberships` is still being called and the `members` array is populated on the returned object.

## Out of scope

- Fixing the N+1 inside `loadUserWithMemberships` (that's task 02).
- Touching `listUsers` / `listUsersAdmin` (the *list* endpoints) - those are real list views and are a separate concern.
