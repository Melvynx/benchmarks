import { components } from "./_generated/api";
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

export const latestEmailOtp = queryGeneric({
  args: {
    email: v.string(),
    type: v.union(v.literal("sign-in"), v.literal("forget-password")),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.startsWith("playwright-test-")) {
      throw new Error("Test OTP lookup is only available for Playwright users");
    }

    const verification = await ctx.runQuery(
      components.betterAuth.data.getLatestVerificationByIdentifier,
      {
        identifier: `${args.type}-otp-${email}`,
      },
    );
    const value = verification?.value;
    return {
      otp: typeof value === "string" ? value.split(":")[0] : null,
    };
  },
});

export const setTestUserRole = mutationGeneric({
  args: {
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const email = args.email.trim().toLowerCase();
    if (!email.startsWith("playwright-test-")) {
      throw new Error("Test role updates are only available for Playwright users");
    }

    const user = await ctx.runQuery(components.betterAuth.data.getUserByEmail, {
      email,
    });
    if (!user) {
      throw new Error("User not found");
    }

    const updated = await ctx.runMutation(components.betterAuth.data.patchUser, {
      userId: String(user._id),
      update: { role: args.role },
    });
    if (!updated) {
      throw new Error("User not found");
    }

    return { id: String(updated._id), role: args.role };
  },
});

export const setTestSubscription = mutationGeneric({
  args: {
    orgSlug: v.string(),
    plan: v.string(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await ctx.runQuery(
      components.betterAuth.data.getOrganizationBySlug,
      { slug: args.orgSlug },
    );
    if (!org) {
      throw new Error("Organization not found");
    }

    const members = await ctx.runQuery(
      components.betterAuth.data.listMembersByOrganization,
      { organizationId: String(org._id), limit: 50 },
    );
    const owners = members.filter(
      (member: { role?: string }) => member.role === "owner",
    );
    const users = await Promise.all(
      owners.map(async (member: { userId: string }) =>
        ctx.runQuery(components.betterAuth.data.getUserById, {
          userId: member.userId,
        }),
      ),
    );
    const hasPlaywrightOwner = users.some((user) =>
      user?.email?.startsWith("playwright-test-"),
    );
    if (!hasPlaywrightOwner) {
      throw new Error(
        "Test subscription updates are only available for Playwright organizations",
      );
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", String(org._id)),
      )
      .first();

    const subscription = {
      organizationId: String(org._id),
      plan: args.plan,
      status: args.status ?? "active",
      stripeCustomerId: "cus_playwright",
      stripeSubscriptionId: `sub_playwright_${String(org._id)}`,
      periodStart: now,
      periodEnd: now + 30 * 24 * 60 * 60 * 1000,
      cancelAtPeriodEnd: false,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, subscription);
      return { id: String(existing._id) };
    }

    const id = await ctx.db.insert("subscriptions", {
      ...subscription,
      createdAt: now,
    });

    return { id: String(id) };
  },
});
