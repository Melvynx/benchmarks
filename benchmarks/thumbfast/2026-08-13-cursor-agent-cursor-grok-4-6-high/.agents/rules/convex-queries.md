---
paths:
  - "convex/**/*.ts"
---

# Convex Query Best Practices

**CRITICAL**: Always read `convex/_generated/ai/guidelines.md` before writing Convex functions.

## NEVER use `.filter()` - ALWAYS use `.withIndex()`

Using `.filter()` causes a **full table scan**, reading every document in the table. This wastes database bandwidth and gets exponentially worse as tables grow.

```typescript
// BAD - scans the ENTIRE table every time
const messages = await ctx.db
  .query("messages")
  .filter((q) => q.eq(q.field("channelId"), channelId))
  .collect();

// GOOD - uses an index, only reads matching documents
const messages = await ctx.db
  .query("messages")
  .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
  .collect();
```

## Always define indexes for queried fields

In `convex/schema.ts`, add indexes for any field you query on:

```typescript
messages: defineTable({
  channelId: v.id("channels"),
  body: v.string(),
}).index("by_channelId", ["channelId"]),
```

## Index naming convention

Always include all index fields in the name:

- Single field: `by_fieldName` (e.g., `by_channelId`)
- Multiple fields: `by_field1_and_field2` (e.g., `by_organization_and_status`)

## Use bounded collections

Unless explicitly asked to return all results, prefer `.take(n)` or `.paginate()` over `.collect()`:

```typescript
// Prefer bounded queries
const recent = await ctx.db
  .query("messages")
  .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
  .order("desc")
  .take(50);
```

## Never use `.collect().length` for counting

Maintain a denormalized counter in a separate document instead.

## Mutations on large datasets

Process in batches with `.take(n)` and schedule continuations:

```typescript
const batch = await ctx.db
  .query("messages")
  .withIndex("by_channelId", (q) => q.eq("channelId", channelId))
  .take(100);

for (const msg of batch) {
  await ctx.db.delete(msg._id);
}

if (batch.length === 100) {
  await ctx.scheduler.runAfter(0, api.messages.deleteBatch, { channelId });
}
```
