/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { authComponent } from "./auth/config";

async function requireUser(ctx: any) {
  const user = await authComponent.getAuthUser(ctx as never);
  return { id: String(user._id) };
}

export const getDismissedChangelogs = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("changelogDismissals")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .collect();
    return rows.map((row) => row.slug);
  },
});

export const getLastSeenChangelog = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const state = await ctx.db
      .query("changelogStates")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .first();
    return state?.latestSeenSlug ?? null;
  },
});

export const dismissChangelog = mutation({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("changelogDismissals")
      .withIndex("by_user_slug", (q) =>
        q.eq("userId", user.id).eq("slug", args.slug),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { updatedAt: now });
      return { success: true };
    }

    await ctx.db.insert("changelogDismissals", {
      userId: user.id,
      slug: args.slug,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const dismissAllChangelogs = mutation({
  args: { latestSlug: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const now = Date.now();
    const existing = await ctx.db
      .query("changelogStates")
      .withIndex("by_user", (q) => q.eq("userId", user.id))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        latestSeenSlug: args.latestSlug,
        updatedAt: now,
      });
      return { success: true };
    }

    await ctx.db.insert("changelogStates", {
      userId: user.id,
      latestSeenSlug: args.latestSlug,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true };
  },
});
