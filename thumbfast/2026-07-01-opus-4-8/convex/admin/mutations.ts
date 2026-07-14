import { v } from "convex/values";
import { components } from "../_generated/api";
import { mutation } from "../_generated/server";
import { requireAdmin } from "../auth/config";
import { throwNotFound, throwValidationError } from "../utils/errors";
import { REFERRAL_SETTINGS_KEY } from "../app/shared";

const organizationRoleValidator = v.union(
  v.literal("member"),
  v.literal("admin"),
  v.literal("owner"),
);
const inspirationReviewStatusValidator = v.union(
  v.literal("PENDING"),
  v.literal("APPROVED"),
  v.literal("GOOD"),
  v.literal("DENY"),
);

type AdminApi = {
  createUser: (args: {
    headers: Headers;
    body: {
      email: string;
      password: string;
      name: string;
      role: "admin" | "user";
    };
  }) => Promise<unknown>;
  setRole: (args: {
    headers: Headers;
    body: { userId: string; role: "admin" | "user" };
  }) => Promise<unknown>;
  banUser: (args: {
    headers: Headers;
    body: { userId: string; banReason: string };
  }) => Promise<unknown>;
  unbanUser: (args: {
    headers: Headers;
    body: { userId: string };
  }) => Promise<unknown>;
  setUserPassword: (args: {
    headers: Headers;
    body: { userId: string; newPassword: string };
  }) => Promise<unknown>;
  revokeUserSessions: (args: {
    headers: Headers;
    body: { userId: string };
  }) => Promise<unknown>;
  revokeUserSession: (args: {
    headers: Headers;
    body: { sessionToken: string };
  }) => Promise<unknown>;
};

const getAdminApi = (auth: { api: unknown }) => auth.api as AdminApi;

export const createUser = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await requireAdmin(ctx as never);
    return getAdminApi(auth).createUser({
      headers,
      body: {
        email: args.email,
        password: args.password,
        name: args.name,
        role: args.role,
      },
    });
  },
});

export const setUserRole = mutation({
  args: {
    userId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  },
  handler: async (ctx, args) => {
    const { auth, headers } = await requireAdmin(ctx as never);
    return getAdminApi(auth).setRole({
      headers,
      body: { userId: args.userId, role: args.role },
    });
  },
});

export const banUser = mutation({
  args: { userId: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const { auth, headers } = await requireAdmin(ctx as never);
    return getAdminApi(auth).banUser({
      headers,
      body: {
        userId: args.userId,
        banReason: args.reason ?? "Admin initiated ban",
      },
    });
  },
});

export const unbanUser = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await requireAdmin(ctx as never);
    return getAdminApi(auth).unbanUser({
      headers,
      body: { userId: args.userId },
    });
  },
});

export const setUserPassword = mutation({
  args: { userId: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await requireAdmin(ctx as never);
    return getAdminApi(auth).setUserPassword({
      headers,
      body: { userId: args.userId, newPassword: args.password },
    });
  },
});

export const revokeUserSessions = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await requireAdmin(ctx as never);
    return getAdminApi(auth).revokeUserSessions({
      headers,
      body: { userId: args.userId },
    });
  },
});

export const revokeUserSession = mutation({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const { auth, headers } = await requireAdmin(ctx as never);
    return getAdminApi(auth).revokeUserSession({
      headers,
      body: { sessionToken: args.sessionToken },
    });
  },
});

export const updateOrganization = mutation({
  args: {
    organizationId: v.string(),
    data: v.object({
      name: v.optional(v.string()),
      logo: v.optional(v.union(v.string(), v.null())),
      stripeCustomerId: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    return ctx.runMutation(components.betterAuth.data.patchOrganization, {
      organizationId: args.organizationId,
      update: args.data,
    });
  },
});

export const updateOrganizationMemberRole = mutation({
  args: {
    organizationId: v.string(),
    memberId: v.string(),
    role: organizationRoleValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const member = await ctx.runMutation(
      components.betterAuth.data.patchMemberRoleForAdmin,
      args,
    );
    if (!member) throwNotFound("Member not found");
    return { member };
  },
});

export const removeOrganizationMember = mutation({
  args: { organizationId: v.string(), memberId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const member = await ctx.runMutation(
      components.betterAuth.data.deleteMemberForAdmin,
      args,
    );
    if (!member) throwNotFound("Member not found");
    return { member };
  },
});

export const updateCredits = mutation({
  args: {
    organizationId: v.string(),
    balance: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const now = Date.now();
    const existing = await ctx.db
      .query("creditBalances")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();
    const previousBalance = existing?.balance ?? 0;

    if (existing) {
      await ctx.db.patch(existing._id, {
        balance: args.balance,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("creditBalances", {
        organizationId: args.organizationId,
        balance: args.balance,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("creditTransactions", {
      organizationId: args.organizationId,
      amount: args.balance - previousBalance,
      type: "admin_adjustment",
      reason: args.reason ?? "Admin credit adjustment",
      createdAt: now,
      updatedAt: now,
    });

    return { balance: args.balance };
  },
});

export const updateOverrideLimits = mutation({
  args: {
    organizationId: v.string(),
    // Intentional any: admin override values mirror flexible plan-limit JSON.
    overrideLimits: v.union(v.record(v.string(), v.any()), v.null()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const now = Date.now();
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    if (!existing) {
      const id = await ctx.db.insert("subscriptions", {
        organizationId: args.organizationId,
        plan: "free",
        overrideLimits: args.overrideLimits ?? undefined,
        createdAt: now,
        updatedAt: now,
      });
      return { id: String(id) };
    }

    await ctx.db.patch(existing._id, {
      overrideLimits: args.overrideLimits ?? undefined,
      updatedAt: now,
    });

    return { id: String(existing._id) };
  },
});

const MANUAL_GRANT_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

export const grantOrganizationPlan = mutation({
  args: {
    organizationId: v.string(),
    plan: v.string(),
    lifetime: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const now = Date.now();
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .first();

    if (existing?.stripeSubscriptionId) {
      throwValidationError(
        "This organization is on a Stripe subscription. Use the Stripe plan controls instead.",
      );
    }

    if (args.plan === "free") {
      if (existing) {
        await ctx.db.patch(existing._id, {
          plan: "free",
          status: "canceled",
          periodStart: undefined,
          periodEnd: undefined,
          cancelAtPeriodEnd: undefined,
          updatedAt: now,
        });
      }
      return { plan: "free", status: "canceled" };
    }

    const status = args.lifetime ? "lifetime" : "active";
    const periodEnd = args.lifetime ? undefined : now + MANUAL_GRANT_PERIOD_MS;

    if (existing) {
      await ctx.db.patch(existing._id, {
        plan: args.plan,
        status,
        stripeSubscriptionId: undefined,
        periodStart: now,
        periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      });
      return { plan: args.plan, status };
    }

    await ctx.db.insert("subscriptions", {
      organizationId: args.organizationId,
      plan: args.plan,
      status,
      periodStart: now,
      periodEnd,
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    });
    return { plan: args.plan, status };
  },
});

export const replyFeedback = mutation({
  args: { feedbackId: v.id("feedbacks"), reply: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    if (!args.reply.trim()) throwValidationError("Reply cannot be empty");
    await ctx.db.patch(args.feedbackId, {
      reply: args.reply.trim(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const closeFeedback = mutation({
  args: { feedbackId: v.id("feedbacks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    await ctx.db.patch(args.feedbackId, {
      closedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const reopenFeedback = mutation({
  args: { feedbackId: v.id("feedbacks") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    await ctx.db.patch(args.feedbackId, {
      closedAt: undefined,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const setInspirationReviewed = mutation({
  args: { inspirationId: v.id("inspirations"), reviewed: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const now = Date.now();
    await ctx.db.patch(args.inspirationId, {
      adminReview: args.reviewed ? "APPROVED" : "PENDING",
      isPublic: args.reviewed,
      reviewedAt: args.reviewed ? now : undefined,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const setInspirationReviewStatus = mutation({
  args: {
    inspirationId: v.id("inspirations"),
    status: inspirationReviewStatusValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const now = Date.now();
    const approved = args.status === "GOOD" || args.status === "APPROVED";

    await ctx.db.patch(args.inspirationId, {
      adminReview: args.status,
      isPublic: approved,
      reviewedAt: approved ? now : undefined,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const setFeatureFlag = mutation({
  args: {
    key: v.string(),
    enabled: v.boolean(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const now = Date.now();
    const existing = await ctx.db
      .query("featureFlags")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        description: args.description ?? existing.description,
        updatedAt: now,
      });
      return { id: String(existing._id) };
    }

    const id = await ctx.db.insert("featureFlags", {
      key: args.key,
      enabled: args.enabled,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
    return { id: String(id) };
  },
});

export const setGenerationRoutingSettings = mutation({
  args: {
    forceOfficialFirst: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const now = Date.now();
    const existing = await ctx.db
      .query("generationRoutingSettings")
      .withIndex("by_key", (q) => q.eq("key", "default"))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        forceOfficialFirst: args.forceOfficialFirst,
        updatedAt: now,
      });
      return { id: String(existing._id) };
    }

    const id = await ctx.db.insert("generationRoutingSettings", {
      key: "default",
      forceOfficialFirst: args.forceOfficialFirst,
      createdAt: now,
      updatedAt: now,
    });
    return { id: String(id) };
  },
});

export const updateReferralSettings = mutation({
  args: {
    creditsPerReferral: v.number(),
    dailyCreditCap: v.number(),
    monthlyCreditCap: v.number(),
    cookieExpiryDays: v.number(),
    pendingExpiryDays: v.number(),
    burstSignupThreshold: v.number(),
    sameIpSignupThreshold: v.number(),
    requireProductAction: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const { requireProductAction, ...numericSettings } = args;
    for (const [key, value] of Object.entries(numericSettings)) {
      if (!Number.isInteger(value) || value < 1) {
        throwValidationError(`${key} must be a positive integer`);
      }
    }

    const now = Date.now();
    const existing = await ctx.db
      .query("referralSettings")
      .withIndex("by_key", (q) => q.eq("key", REFERRAL_SETTINGS_KEY))
      .first();
    const storedValue =
      typeof existing?.value === "object" && existing.value !== null
        ? (existing.value as Record<string, unknown>)
        : {};
    const value = { ...storedValue, ...numericSettings, requireProductAction };

    if (existing) {
      await ctx.db.patch(existing._id, { value, updatedAt: now });
      return { id: String(existing._id) };
    }

    const id = await ctx.db.insert("referralSettings", {
      key: REFERRAL_SETTINGS_KEY,
      value,
      createdAt: now,
      updatedAt: now,
    });
    return { id: String(id) };
  },
});
