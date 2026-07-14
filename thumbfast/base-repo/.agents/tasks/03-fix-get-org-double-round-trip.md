# 03 - Eliminate `getOrg` double Convex round-trip

**Severity**: CRITICAL (3/3 clean-code + 2/3 performance agreed)
**Depends on**: best done after task 02 (otherwise the second query still triggers an N+1 over members)

## Problem

`src/lib/organizations/get-org.ts` (lines ~78-91) loads the org twice on every server-rendered page that calls `getCurrentOrg`:

1. `fetchAuthQuery(api.auth.queries.getCurrentOrganization, { organizationSlug })` -> Better Auth `getFullOrganization` by slug.
2. `fetchAuthQuery(api.auth.queries.getOrganizationById, { organizationId: org.id })` -> needed **only** to read `stripeCustomerId`.

Because every authenticated route gates on `getCurrentOrg`, this doubles SSR latency for org pages. The second call also triggers the N+1 inside `getOrganizationMembers` (see task 02).

## Files

| Path | Why |
|------|-----|
| `src/lib/organizations/get-org.ts` | The caller making both round-trips |
| `convex/auth/queries.ts` -> `getCurrentOrganization` | Source of the first query - extend this to expose `stripeCustomerId` |
| `convex/auth/queries.ts` -> `getOrganizationById` | Source of the second query - keep it (admin views still use it), just stop calling it from `getOrg` |

## Acceptance criteria

1. `getOrg` makes **one** Convex round-trip to load the org + its `stripeCustomerId`.
2. `getOrganizationById` continues to exist and continues to work for direct admin lookups.
3. `getCurrentOrg` / `getRequiredCurrentOrg` return shape (`CurrentOrgPayload`) is unchanged.
4. The slug-vs-id consistency concern raised by Logic/Correctness is also addressed: the `stripeCustomerId` returned must come from the same org row resolved by slug, not a second lookup.

## Implementation notes

Two paths - pick one:

**Option A** (preferred): Modify `getCurrentOrganization` in `convex/auth/queries.ts` to include `stripeCustomerId` directly. Read the existing implementation - it already calls `auth.api.getFullOrganization`; the response is a Better Auth org object that **does** carry the `stripeCustomerId` custom attribute. Just expose it.

**Option B**: Replace the second `fetchAuthQuery` with a tiny dedicated query that fetches *only* `stripeCustomerId` for a given org id (skip the member hydration). Cheaper than the current double-round-trip, but not as good as Option A.

Check `convex/betterAuth/schema.ts` for the org schema - confirm `stripeCustomerId` is a real field there before assuming.

The fix in `get-org.ts` then becomes:

```ts
const authOrg = await fetchAuthQuery(api.auth.queries.getCurrentOrganization, {
  organizationSlug,
});
if (!authOrg) return null;
// authOrg.stripeCustomerId is now present - delete the second fetchAuthQuery call
```

Also fix the existing bug at `src/lib/organizations/get-org.ts:108`: `updatedAt: new Date(m.createdAt).getTime()` is a typo (uses `createdAt` for `updatedAt`). Use `m.updatedAt ?? m.createdAt`.

## Verification

```bash
pnpm ts
pnpm lint:ci
```

Manual: navigate to `/orgs/<slug>` while watching `.logs/convex.txt`. The page load should fire one `auth.queries.getCurrentOrganization` request, not one of those plus `auth.queries.getOrganizationById`.

Confirm `getCurrentOrg().stripeCustomerId` is still populated for an org with a Stripe customer (e.g. one that has gone through upgrade flow).

## Out of scope

- Caching / memoizing `getCurrentOrg` results across server function calls - separate concern.
- The `getOrganizationById` endpoint itself - leave it alone (admin views use it).
