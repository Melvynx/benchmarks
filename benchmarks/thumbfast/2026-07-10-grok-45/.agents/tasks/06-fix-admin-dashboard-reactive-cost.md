# 06 - Replace `getAdminDashboard` reactive scan with denormalized counters

**Severity**: CRITICAL (2/3 performance agents agreed)
**Depends on**: nothing structural

## Problem

`convex/auth/queries.ts` -> `getAdminDashboard` (lines ~656-720) is a live Convex query that on every reactive update:

- Loads **all** organizations via `auth.api.listOrganizations`
- Loads up to **500** users via `auth.api.listUsers`
- Loads up to 500 subscriptions via `ctx.db.query("subscriptions").take(500)`
- Iterates the user array twice per month for `userGrowth` (6 months × 2 passes = 12 full passes over 500 users)
- Computes MRR from a hardcoded `PLAN_PRICES_IN_CENTS` (lines 12-15) that is divorced from `src/lib/auth/stripe/auth-plans.ts`

Because it is a `query` (not a one-shot action), it re-runs on every auth state change and every subscription update across the entire app. Cost grows as users × orgs × time.

## Files

| Path | Why |
|------|-----|
| `convex/auth/queries.ts` | `getAdminDashboard` lives here |
| `src/lib/auth/stripe/auth-plans.ts` | Canonical plan prices - source of truth |
| `src/routes/admin/index.tsx` | Consumer (the admin dashboard) |
| `convex/schema.ts` | Where any new denormalized stats table goes |

## Acceptance criteria

1. `getAdminDashboard` no longer fetches all users / orgs / subscriptions on every reactive tick. It either:
   - Reads from a denormalized `dashboardStats` doc maintained by mutation hooks, OR
   - Is converted to an `internalAction` that runs on a schedule (e.g. every 10 min) and writes its result to a stats doc that the query reads cheaply, OR
   - Is downgraded to a non-reactive cached server-side computation if the live-update behavior is not actually needed by the admin dashboard.
2. The `userGrowth` chart still shows monthly counts and totals.
3. MRR is computed using `AUTH_PLANS` as the source of truth (or, if Convex genuinely cannot import from `src/`, a duplicated table with a one-line `// keep in sync with AUTH_PLANS in src/lib/auth/stripe/auth-plans.ts` comment that an ESLint rule or test enforces).
4. The admin dashboard returns the same shape so the React component does not need to change.

## Implementation notes

Easiest path: **convert to non-reactive**. The admin dashboard is opened occasionally; live reactivity is overkill. Two options:

**A. Server-side fetch in the route loader**
- Move the heavy computation to a TanStack Start `loader` in `src/routes/admin/index.tsx`.
- The loader calls `fetchAuthQuery(api.auth.queries.getAdminDashboard)` once per page load (still expensive but no longer recomputed reactively).

**B. Denormalized stats**
- New table `dashboardStats` with one document per snapshot or one rolling document.
- A scheduled `internalAction` (Convex cron) recomputes it every N minutes.
- `getAdminDashboard` becomes a tiny query that just `.first()`s the stats doc.

Pick A if you want minimal change, B if you want it to scale to 10k users.

Either way - **fix the MRR data source first**: import `AUTH_PLANS` from a Convex-readable path or replicate it as JSON inside `convex/`. Drop `PLAN_PRICES_IN_CENTS`. Bonus: cancel-aware MRR (Logic Reader/Reader flagged that the calculation never subtracts canceled subs - decide whether that is intentional and add a comment).

For the `userGrowth` two-pass-per-month loop:
```ts
// before: for each month, filter users twice
// after: sort users by createdAt once, walk months in one pass
const sorted = [...users].sort((a, b) => a.createdAt - b.createdAt);
let i = 0;
const growth = months.map((m) => {
  while (i < sorted.length && sorted[i].createdAt <= m.end) i++;
  return { month: m.label, count: <new>, total: i };
});
```

## Verification

```bash
pnpm ts
pnpm lint:ci
```

Manual:
- Open `/admin` - dashboard should load with all charts populated.
- Compare values before/after on a real dataset to confirm no regression.
- Watch `.logs/convex.txt` while sitting on the page idle - the query should not be re-running on unrelated subscription updates.

## Out of scope

- Re-architecting the entire admin charts pipeline.
- Removing other admin queries that have similar issues (`listUsersAdmin`, `listOrganizationsAdmin`) - those are separate and will need their own task.
