# 04 - Replace 1000-row feedback fetch with proper pagination + search index

**Severity**: BLOCKING (3/3 performance + 2/3 clean-code agreed)
**Depends on**: nothing - independent

## Problem

Two paths over-fetch the entire `feedbacks` table on every render:

1. `convex/feedbacks/queries.ts` -> `listAdmin` (lines ~79-121) calls `.take(MAX_FEEDBACK_FETCH = 1000)` then filters in-memory by search term, then paginates in-memory. Re-runs reactively on every keystroke in the admin search box.
2. `src/query/feedback/get-feedback.ts` -> `getFeedbackList` (lines ~32-56) fetches `limit: 1000` from `feedbacks.queries.list` and slices in JS.

`getFeedbackList` is currently dead-ish (the admin table uses `listAdmin` directly), but the helper is still exported and is one accidental wiring away from re-introducing a 1000-row fetch.

## Files

| Path | Why |
|------|-----|
| `convex/schema.ts` | Add a search index on the `feedbacks` table |
| `convex/feedbacks/queries.ts` | Rewrite `listAdmin` to use `.paginate()` + the new search index |
| `src/query/feedback/get-feedback.ts` | Either fix or delete `getFeedbackList` (search callers first) |
| `src/routes/admin/feedback/_components/feedback-table.tsx` | Current admin caller - confirm new shape works |
| `.agents/rules/convex-queries.md` | Project rules - bounded queries, indexes |

## Acceptance criteria

1. `listAdmin` no longer calls `.take(1000)`. It uses Convex `.paginate({ cursor, numItems })` with cursor-based pagination.
2. Search uses a Convex `searchIndex` on the `message` field, not in-memory `.includes`.
3. The admin feedback table's behavior (search, paginate) still works exactly as before. Test with empty search, multi-word search, and pagination across pages.
4. `getFeedbackList` either:
   - Deleted, plus all callers grepped and removed/migrated, OR
   - Rewritten to call `listAdmin` with the new cursor-based shape.
5. The result shape returned to the React component layer changes only as much as needed to support cursor pagination - update the consumer.

## Implementation notes

Add the search index in `convex/schema.ts`:

```ts
feedbacks: defineTable({
  review: v.number(),
  message: v.string(),
  email: v.optional(v.string()),
  userId: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .searchIndex("by_message", { searchField: "message" })
  .index("by_created", ["createdAt"]),
```

Check what existing indexes the table already has before adding `by_created` - do not duplicate.

Rewrite `listAdmin`:

```ts
export const listAdmin = query({
  args: {
    cursor: v.optional(v.string()),
    pageSize: v.number(),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const baseQuery = args.search
      ? ctx.db.query("feedbacks").withSearchIndex("by_message", q => q.search("message", args.search!))
      : ctx.db.query("feedbacks").withIndex("by_created").order("desc");
    const result = await baseQuery.paginate({ cursor: args.cursor ?? null, numItems: args.pageSize });
    // hydrate users for the *page* only (not the whole table)
    const feedbackWithUsers = await Promise.all(
      result.page.map(async (f) => ({
        ...f,
        user: f.userId ? await hydrateFeedbackUser(ctx, f.userId) : null,
      })),
    );
    return { ...result, page: feedbackWithUsers };
  },
});
```

Note: search-index queries do not support `.order()` - the index handles ranking. Adjust the table component if it currently expects descending date ordering during search.

Validate input bounds: `pageSize` must be 1..100. The previous `page=0` / `pageSize=0` edge case (flagged by Logic/Edge Cases) is killed automatically by switching to cursor pagination.

## Verification

```bash
pnpm ts
pnpm lint:ci
npx convex dev   # let it push the schema + index, watch for backfill errors
```

Manual:
- Navigate to `/admin/feedback`. Confirm the table loads.
- Type into the search box - results should filter and pagination should reset.
- Click next/prev page (or the equivalent UI) - should advance via cursor.
- With a fresh dev DB, seed >25 feedback rows and confirm only one page is fetched per render in `.logs/convex.txt`.

## Out of scope

- Removing in-memory search from any *unrelated* admin view.
- The `feedbacks.queries.list` endpoint that the rest of the app uses - leave its bounded pagination alone unless touched as part of `getFeedbackList` cleanup.
