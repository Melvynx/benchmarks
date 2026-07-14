import { v } from "convex/values";
import { components } from "../_generated/api";
import { query } from "../_generated/server";
import { requireAdmin } from "../auth/config";
import {
  authId,
  toAdminAccount,
  toAdminInvitation,
  toAdminMember,
  toAdminOrganization,
  toAdminSession,
  toAdminUser,
} from "./dto";
import { FEATURE_FLAG_REGISTRY } from "../featureFlags";
import { getOrgStats } from "../orgStats";
import { includesSearch, normalizeSearchTerm } from "../utils/search";
import {
  REFERRAL_SETTINGS_DEFAULTS,
  REFERRAL_SETTINGS_KEY,
} from "../app/shared";

const PAGE_SIZE_MAX = 50;
const AUTH_LIMIT = 500;
// Generous bound for the admin inspiration review list: large enough to cover
// the review backlog, small enough to stay under Convex query read limits.
const INSPIRATION_SCAN_LIMIT = 2000;
const LEAD_CHART_DAY_COUNT = 30;
const inspirationReviewRank = new Map([
  ["PENDING", 0],
  ["GOOD", 1],
  ["APPROVED", 2],
  ["DENY", 3],
]);
const leadReferralLabels = new Map([
  ["melvynx", "Melvynx"],
  ["twitter", "Twitter / X"],
  ["youtube", "YouTube"],
  ["google", "Google"],
  ["friend", "Friend"],
  ["other", "Other"],
]);
const leadUserTypeLabels = new Map([
  ["youtuber", "YouTuber"],
  ["agency", "Agency"],
  ["curious", "Curious"],
]);

const pageSize = (value: number) => Math.max(1, Math.min(value, PAGE_SIZE_MAX));
const pageStart = (page: number, size: number) =>
  (Math.max(1, page) - 1) * size;
const totalPages = (total: number, size: number) =>
  Math.max(1, Math.ceil(total / size));

const getPage = <T>(items: T[], page: number, size: number) =>
  items.slice(pageStart(page, size), pageStart(page, size) + size);

const sortCreated = <T extends { createdAt: number }>(
  rows: T[],
  direction: "asc" | "desc",
) =>
  rows
    .slice()
    .sort((a, b) =>
      direction === "asc"
        ? a.createdAt - b.createdAt
        : b.createdAt - a.createdAt,
    );

const getInspirationReviewStatus = (row: {
  adminReview?: string;
  reviewedAt?: number;
  deletedAt?: number;
}) => {
  if (
    row.adminReview === "GOOD" ||
    row.adminReview === "APPROVED" ||
    row.adminReview === "PENDING" ||
    row.adminReview === "DENY"
  ) {
    return row.adminReview;
  }
  if (row.deletedAt) return "DENY";
  if (row.reviewedAt) return "APPROVED";
  return "PENDING";
};

const sortInspirationsForReview = <
  T extends { adminReview: string; createdAt: number },
>(
  rows: T[],
) =>
  rows
    .slice()
    .sort(
      (a, b) =>
        (inspirationReviewRank.get(a.adminReview) ?? 99) -
          (inspirationReviewRank.get(b.adminReview) ?? 99) ||
        b.createdAt - a.createdAt,
    );

const getLeadDays = () => {
  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return Array.from({ length: LEAD_CHART_DAY_COUNT }, (_, index) => {
    const offset = LEAD_CHART_DAY_COUNT - 1 - index;
    const startMs = todayUtc - offset * 24 * 60 * 60 * 1000;
    const endMs = startMs + 24 * 60 * 60 * 1000;
    const start = new Date(startMs);
    return {
      key: `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}-${String(start.getUTCDate()).padStart(2, "0")}`,
      start: startMs,
      end: endMs,
    };
  });
};

const getLeadStatus = (row: {
  userType: string;
  videosPerMonth?: number;
  youtubeSubscriberCount?: number;
}) => {
  if (row.userType === "curious") return "cold";
  if ((row.videosPerMonth ?? 0) >= 10) return "hot";
  if ((row.youtubeSubscriberCount ?? 0) >= 10000) return "hot";
  return "cold";
};

const storedImageUrl = (value: unknown) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "url" in value) {
    return typeof value.url === "string" ? value.url : null;
  }
  return null;
};

const toOnboardingPerson = (person: {
  _id: unknown;
  organizationId: string;
  name: string;
  description?: string;
  images?: unknown[];
  createdAt: number;
  updatedAt: number;
}) => ({
  id: String(person._id),
  orgId: person.organizationId,
  name: person.name,
  description: person.description ?? "",
  images: (person.images ?? []).map(storedImageUrl).filter(Boolean),
  createdAt: new Date(person.createdAt).toISOString(),
  updatedAt: new Date(person.updatedAt).toISOString(),
});

const toOnboardingInspiration = (inspiration: {
  _id: unknown;
  organizationId: string;
  title: string;
  description?: string;
  image?: unknown;
  images?: unknown[];
}) => {
  const images =
    inspiration.images && inspiration.images.length > 0
      ? inspiration.images
      : inspiration.image
        ? [inspiration.image]
        : [];

  return {
    id: String(inspiration._id),
    name: inspiration.title,
    aiDescription: inspiration.description ?? "",
    thumbnailUrls: images.map(storedImageUrl).filter(Boolean),
    orgId: inspiration.organizationId,
  };
};

export const listUsers = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    search: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    status: v.optional(v.union(v.literal("active"), v.literal("banned"))),
    sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const size = pageSize(args.pageSize);
    const sort = args.sort ?? "desc";
    const usersResult = await ctx.runQuery(
      components.betterAuth.data.listUsersForAdmin,
      {
        limit: AUTH_LIMIT,
        sort,
        search: normalizeSearchTerm(args.search),
        role: args.role,
        status: args.status,
      },
    );
    const users = sortCreated(
      ((usersResult ?? []) as Record<string, unknown>[]).map(toAdminUser),
      sort,
    );

    return {
      users: getPage(users, args.page, size),
      total: users.length,
      totalPages: totalPages(users.length, size),
    };
  },
});

export const getOnboardingDebugContext = query({
  args: { orgSlug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const rawOrg = await ctx.runQuery(
      components.betterAuth.data.getOrganizationBySlug,
      { slug: args.orgSlug },
    );
    if (!rawOrg) return null;

    const organization = toAdminOrganization(rawOrg);
    const limit = Math.max(1, Math.min(args.limit ?? 9, 12));
    const [state, people, orgInspirations, publicInspirations, succeeded] =
      await Promise.all([
        ctx.db
          .query("onboardingStates")
          .withIndex("by_organization", (q) =>
            q.eq("organizationId", organization.id),
          )
          .first(),
        ctx.db
          .query("people")
          .withIndex("by_organization_created", (q) =>
            q.eq("organizationId", organization.id),
          )
          .order("desc")
          .take(AUTH_LIMIT),
        ctx.db
          .query("inspirations")
          .withIndex("by_organization_created", (q) =>
            q.eq("organizationId", organization.id),
          )
          .order("desc")
          .take(AUTH_LIMIT),
        ctx.db
          .query("inspirations")
          .withIndex("by_created")
          .order("desc")
          .take(AUTH_LIMIT),
        ctx.db
          .query("thumbnails")
          .withIndex("by_organization_status", (q) =>
            q.eq("organizationId", organization.id).eq("status", "succeeded"),
          )
          .take(AUTH_LIMIT),
      ]);

    const inspirationIds = new Set<string>();
    const inspirations = [...orgInspirations, ...publicInspirations]
      .filter((inspiration) => !inspiration.deletedAt)
      .filter((inspiration) => {
        if (inspiration.organizationId === organization.id) return true;
        return inspiration.isPublic ?? true;
      })
      .filter((inspiration) => {
        const id = String(inspiration._id);
        if (inspirationIds.has(id)) return false;
        inspirationIds.add(id);
        return true;
      })
      .map(toOnboardingInspiration)
      .slice(0, limit);

    return {
      status: {
        completedAt: state?.completedAt ?? null,
        questionsAnsweredAt: state?.questionsAnsweredAt ?? null,
      },
      summary: {
        stats: {
          thumbnailCount: succeeded.length,
        },
      },
      persons: people
        .filter((person) => !person.deletedAt)
        .map(toOnboardingPerson),
      inspirations,
    };
  },
});

export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const rawUser = await ctx.runQuery(components.betterAuth.data.getUserById, {
      userId: args.userId,
    });
    if (!rawUser) return null;

    const [membersResult, accountsResult, sessionsResult] = await Promise.all([
      ctx.runQuery(components.betterAuth.data.listMembersByUser, {
        userId: args.userId,
        limit: AUTH_LIMIT,
      }),
      ctx.runQuery(components.betterAuth.data.listAccountsByUser, {
        userId: args.userId,
        limit: AUTH_LIMIT,
      }),
      ctx.runQuery(components.betterAuth.data.listSessionsByUser, {
        userId: args.userId,
        limit: AUTH_LIMIT,
      }),
    ]);

    const members = (membersResult ?? []) as Record<string, unknown>[];
    const organizations = await ctx.runQuery(
      components.betterAuth.data.listOrganizationsByIds,
      {
        organizationIds: members.map((member) =>
          String(member.organizationId ?? ""),
        ),
      },
    );
    const orgById = new Map(
      ((organizations ?? []) as Record<string, unknown>[]).map((org) => [
        authId(org),
        toAdminOrganization(org),
      ]),
    );

    return {
      ...toAdminUser(rawUser),
      members: members.map((member) => ({
        ...toAdminMember(member, rawUser),
        organization: orgById.get(String(member.organizationId ?? "")) ?? null,
      })),
      accounts: ((accountsResult ?? []) as Record<string, unknown>[]).map(
        toAdminAccount,
      ),
      sessions: ((sessionsResult ?? []) as Record<string, unknown>[]).map(
        toAdminSession,
      ),
    };
  },
});

export const listOrganizations = query({
  args: {
    page: v.number(),
    pageSize: v.number(),
    search: v.optional(v.string()),
    plan: v.optional(v.string()),
    sort: v.optional(v.union(v.literal("asc"), v.literal("desc"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const size = pageSize(args.pageSize);
    const sort = args.sort ?? "desc";
    const organizationsResult = await ctx.runQuery(
      components.betterAuth.data.listOrganizationsForAdmin,
      {
        limit: AUTH_LIMIT,
        sort,
        search: normalizeSearchTerm(args.search),
      },
    );
    const planSubscriptions = args.plan
      ? await ctx.db
          .query("subscriptions")
          .withIndex("by_plan", (q) => q.eq("plan", args.plan as string))
          .take(AUTH_LIMIT)
      : null;
    const planByOrg = new Map(
      (planSubscriptions ?? []).map((subscription) => [
        subscription.organizationId,
        subscription.plan,
      ]),
    );
    const organizations = sortCreated(
      ((organizationsResult ?? []) as Record<string, unknown>[])
        .map((org) => {
          const mapped = toAdminOrganization(org);
          const plan = planByOrg.get(mapped.id) ?? "free";
          return { ...mapped, plan };
        })
        .filter((org) => !args.plan || org.plan === args.plan),
      sort,
    );

    const pageOrganizations = getPage(organizations, args.page, size);
    const organizationsWithCounts = await Promise.all(
      pageOrganizations.map(async (organization) => {
        const members = await ctx.runQuery(
          components.betterAuth.data.listMembersByOrganization,
          {
            organizationId: organization.id,
            limit: AUTH_LIMIT,
          },
        );
        const [subscription, orgStats, credits] = await Promise.all([
          ctx.db
            .query("subscriptions")
            .withIndex("by_organization", (q) =>
              q.eq("organizationId", organization.id),
            )
            .first(),
          getOrgStats(ctx, organization.id),
          ctx.db
            .query("creditBalances")
            .withIndex("by_organization", (q) =>
              q.eq("organizationId", organization.id),
            )
            .first(),
        ]);
        // Orgs without a stats row fall back to the legacy capped scans;
        // counters avoid reading up to 1000 docs per org per page.
        const counts = orgStats
          ? {
              generations: orgStats.generationCount,
              thumbnails: orgStats.thumbnailCount,
            }
          : await (async () => {
              const [generations, thumbnails] = await Promise.all([
                ctx.db
                  .query("generations")
                  .withIndex("by_organization", (q) =>
                    q.eq("organizationId", organization.id),
                  )
                  .take(AUTH_LIMIT),
                ctx.db
                  .query("thumbnails")
                  .withIndex("by_organization", (q) =>
                    q.eq("organizationId", organization.id),
                  )
                  .take(AUTH_LIMIT),
              ]);
              return {
                generations: generations.length,
                thumbnails: thumbnails.length,
              };
            })();
        return {
          ...organization,
          subscription,
          plan: subscription?.plan ?? organization.plan,
          _count: {
            members: (members ?? []).length,
            generations: counts.generations,
            thumbnails: counts.thumbnails,
          },
          credits: credits?.balance ?? 0,
        };
      }),
    );

    return {
      organizations: organizationsWithCounts,
      total: organizations.length,
      totalPages: totalPages(organizations.length, size),
    };
  },
});

export const getOrganizationById = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const rawOrg = await ctx.runQuery(
      components.betterAuth.data.getOrganizationById,
      { organizationId: args.organizationId },
    );
    if (!rawOrg) return null;

    const [
      membersResult,
      invitationsResult,
      subscription,
      credits,
      generations,
      orgStats,
    ] = await Promise.all([
      ctx.runQuery(components.betterAuth.data.listMembersByOrganization, {
        organizationId: args.organizationId,
        limit: AUTH_LIMIT,
      }),
      ctx.runQuery(components.betterAuth.data.listInvitationsByOrganization, {
        organizationId: args.organizationId,
        limit: AUTH_LIMIT,
      }),
      ctx.db
        .query("subscriptions")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .first(),
      ctx.db
        .query("creditBalances")
        .withIndex("by_organization", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .first(),
      ctx.db
        .query("generations")
        .withIndex("by_organization_created", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .order("desc")
        .take(20),
      getOrgStats(ctx, args.organizationId),
    ]);
    const thumbnailCount = orgStats
      ? orgStats.thumbnailCount
      : (
          await ctx.db
            .query("thumbnails")
            .withIndex("by_organization", (q) =>
              q.eq("organizationId", args.organizationId),
            )
            .take(AUTH_LIMIT)
        ).length;

    const members = (membersResult ?? []) as Record<string, unknown>[];
    const users = await ctx.runQuery(
      components.betterAuth.data.listUsersByIds,
      {
        userIds: members.map((member) => String(member.userId ?? "")),
      },
    );
    const userById = new Map(
      ((users ?? []) as Record<string, unknown>[]).map((user) => [
        authId(user),
        user,
      ]),
    );

    return {
      ...toAdminOrganization(rawOrg),
      subscription,
      credits: credits?.balance ?? 0,
      members: members.map((member) =>
        toAdminMember(member, userById.get(String(member.userId ?? ""))),
      ),
      invitations: ((invitationsResult ?? []) as Record<string, unknown>[]).map(
        toAdminInvitation,
      ),
      recentGenerations: generations.map((generation) => ({
        id: String(generation._id),
        prompt: generation.prompt,
        model: generation.model,
        status: generation.status,
        createdAt: generation.createdAt,
        completedAt: generation.completedAt ?? null,
      })),
      _count: {
        generations: orgStats ? orgStats.generationCount : generations.length,
        thumbnails: thumbnailCount,
        members: members.length,
      },
    };
  },
});

export const listOrganizationCreditTransactions = query({
  args: { organizationId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const take = Math.max(1, Math.min(args.limit ?? 50, AUTH_LIMIT));
    const rows = await ctx.db
      .query("creditTransactions")
      .withIndex("by_organization_created", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(take);

    return rows.map((row) => ({
      id: String(row._id),
      amount: row.amount,
      type: row.type,
      reason: row.reason,
      referenceId: row.referenceId ?? null,
      createdAt: row.createdAt,
    }));
  },
});

export const getFeedbackDashboard = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("all"),
        v.literal("open"),
        v.literal("replied"),
        v.literal("closed"),
      ),
    ),
    rating: v.optional(v.number()),
    sort: v.optional(
      v.union(
        v.literal("newest"),
        v.literal("oldest"),
        v.literal("rating-desc"),
        v.literal("rating-asc"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const rows = await ctx.db
      .query("feedbacks")
      .withIndex("by_created")
      .order("desc")
      .take(AUTH_LIMIT);

    const users = await ctx.runQuery(
      components.betterAuth.data.listUsersByIds,
      {
        userIds: rows.flatMap((row) => (row.userId ? [row.userId] : [])),
      },
    );
    const userById = new Map(
      ((users ?? []) as Record<string, unknown>[]).map((user) => [
        authId(user),
        toAdminUser(user),
      ]),
    );

    // Compute stats over all rows
    const total = rows.length;
    const openCount = rows.filter((r) => !r.reply && !r.closedAt).length;
    const repliedCount = rows.filter((r) => r.reply && !r.closedAt).length;
    const closedCount = rows.filter((r) => r.closedAt).length;
    const ratingRows = rows.filter((r) => r.rating !== undefined);
    const avgRating =
      ratingRows.length > 0
        ? ratingRows.reduce((sum, r) => sum + (r.rating ?? 0), 0) /
          ratingRows.length
        : null;
    const ratingDistribution = [0, 1, 2, 3, 4, 5].map((rating) => ({
      rating,
      label: `${rating}★`,
      count: rows.filter((r) => r.rating === rating).length,
    }));

    const search = normalizeSearchTerm(args.search);
    const statusFilter = args.status ?? "all";

    const mapped = rows.map((row) => ({
      id: String(row._id),
      message: row.message,
      rating: row.rating ?? null,
      reply: row.reply ?? null,
      closedAt: row.closedAt ?? null,
      user: row.userId ? (userById.get(row.userId) ?? null) : null,
      organizationId: row.organizationId ?? null,
      createdAt: row.createdAt,
    }));

    const filtered = mapped
      .filter((row) => {
        if (statusFilter === "open") return !row.reply && !row.closedAt;
        if (statusFilter === "replied") return !!row.reply && !row.closedAt;
        if (statusFilter === "closed") return !!row.closedAt;
        return true;
      })
      .filter(
        (row) =>
          !search ||
          includesSearch(row.message, search) ||
          includesSearch(row.user?.email, search),
      )
      .filter((row) => args.rating === undefined || row.rating === args.rating);

    const sorted = (() => {
      const sort = args.sort ?? "newest";
      if (sort === "oldest")
        return [...filtered].sort((a, b) => a.createdAt - b.createdAt);
      if (sort === "rating-desc")
        return [...filtered].sort(
          (a, b) => (b.rating ?? -1) - (a.rating ?? -1),
        );
      if (sort === "rating-asc")
        return [...filtered].sort(
          (a, b) => (a.rating ?? 99) - (b.rating ?? 99),
        );
      return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    })();

    return {
      stats: {
        total,
        openCount,
        repliedCount,
        closedCount,
        avgRating,
        ratingDistribution,
      },
      feedbacks: sorted,
    };
  },
});

export const listFeedbacks = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const rows = await ctx.db
      .query("feedbacks")
      .withIndex("by_created")
      .order("desc")
      .take(AUTH_LIMIT);
    const users = await ctx.runQuery(
      components.betterAuth.data.listUsersByIds,
      {
        userIds: rows.flatMap((row) => (row.userId ? [row.userId] : [])),
      },
    );
    const userById = new Map(
      ((users ?? []) as Record<string, unknown>[]).map((user) => [
        authId(user),
        toAdminUser(user),
      ]),
    );
    const search = normalizeSearchTerm(args.search);
    return sortCreated(
      rows
        .map((row) => ({
          id: String(row._id),
          message: row.message,
          rating: row.rating ?? null,
          reply: row.reply ?? null,
          user: row.userId ? (userById.get(row.userId) ?? null) : null,
          organizationId: row.organizationId ?? null,
          createdAt: row.createdAt,
        }))
        .filter(
          (row) =>
            !search ||
            includesSearch(row.message, search) ||
            includesSearch(row.user?.email, search),
        ),
      "desc",
    );
  },
});

export const getFeedbackById = query({
  args: { feedbackId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const feedbackId = ctx.db.normalizeId("feedbacks", args.feedbackId);
    const feedback = feedbackId ? await ctx.db.get(feedbackId) : null;
    if (!feedback) return null;

    const user = feedback.userId
      ? await ctx.runQuery(components.betterAuth.data.getUserById, {
          userId: feedback.userId,
        })
      : null;
    const organization = feedback.organizationId
      ? await ctx.runQuery(components.betterAuth.data.getOrganizationById, {
          organizationId: feedback.organizationId,
        })
      : null;

    return {
      id: String(feedback._id),
      message: feedback.message,
      rating: feedback.rating ?? null,
      reply: feedback.reply ?? null,
      user: user ? toAdminUser(user) : null,
      organization: organization ? toAdminOrganization(organization) : null,
      organizationId: feedback.organizationId ?? null,
      createdAt: feedback.createdAt,
      updatedAt: feedback.updatedAt,
    };
  },
});

export const listGenerations = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    organizationSearch: v.optional(v.string()),
    page: v.optional(v.number()),
    pageSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const size = pageSize(args.pageSize ?? 20);
    const rows = args.status
      ? await ctx.db
          .query("generations")
          .withIndex("by_status_created", (q) =>
            q.eq("status", args.status as string),
          )
          .order("desc")
          .take(AUTH_LIMIT)
      : await ctx.db
          .query("generations")
          .withIndex("by_created")
          .order("desc")
          .take(AUTH_LIMIT);
    const search = normalizeSearchTerm(args.search);
    const organizationSearch = normalizeSearchTerm(args.organizationSearch);
    const organizations = await ctx.runQuery(
      components.betterAuth.data.listOrganizationsByIds,
      {
        organizationIds: [...new Set(rows.map((row) => row.organizationId))],
      },
    );
    const users = await ctx.runQuery(
      components.betterAuth.data.listUsersByIds,
      {
        userIds: [
          ...new Set(
            rows.flatMap((row) =>
              row.createdByUserId ? [row.createdByUserId] : [],
            ),
          ),
        ],
      },
    );
    const orgById = new Map(
      ((organizations ?? []) as Record<string, unknown>[]).map((org) => [
        authId(org),
        toAdminOrganization(org),
      ]),
    );
    const userById = new Map(
      ((users ?? []) as Record<string, unknown>[]).map((user) => [
        authId(user),
        toAdminUser(user),
      ]),
    );
    const filteredRows = rows
      .filter((row) => !args.status || row.status === args.status)
      .filter((row) => {
        if (!organizationSearch) return true;
        const organization = orgById.get(row.organizationId);
        return (
          includesSearch(row.organizationId, organizationSearch) ||
          includesSearch(organization?.name, organizationSearch) ||
          includesSearch(organization?.slug, organizationSearch)
        );
      })
      .filter((row) => {
        if (!search) return true;
        const user = row.createdByUserId
          ? userById.get(row.createdByUserId)
          : null;
        const organization = orgById.get(row.organizationId);
        return (
          includesSearch(row.prompt, search) ||
          includesSearch(row.model, search) ||
          includesSearch(row.requestedModel, search) ||
          includesSearch(row._id, search) ||
          includesSearch(row.promptId, search) ||
          includesSearch(row.organizationId, search) ||
          includesSearch(organization?.name, search) ||
          includesSearch(organization?.slug, search) ||
          includesSearch(row.createdByUserId, search) ||
          includesSearch(user?.name, search) ||
          includesSearch(user?.email, search)
        );
      });
    const summary = filteredRows.reduce(
      (acc, row) => {
        acc.total += 1;
        if (row.status === "succeeded") acc.succeeded += 1;
        if (row.status === "failed") acc.failed += 1;
        if (row.status === "pending" || row.status === "processing") {
          acc.inFlight += 1;
        }
        return acc;
      },
      { total: 0, succeeded: 0, failed: 0, inFlight: 0 },
    );
    const page = Math.min(
      Math.max(1, args.page ?? 1),
      totalPages(filteredRows.length, size),
    );
    const visibleRows = getPage(filteredRows, page, size);
    const generationIds = visibleRows.map((row) => row._id);
    const [routingEvents, thumbnails] = await Promise.all([
      Promise.all(
        generationIds.map(async (generationId) =>
          ctx.db
            .query("generationRoutingEvents")
            .withIndex("by_generation", (q) =>
              q.eq("generationId", generationId),
            )
            .take(8),
        ),
      ),
      Promise.all(
        generationIds.map(async (generationId) =>
          ctx.db
            .query("thumbnails")
            .withIndex("by_generation", (q) =>
              q.eq("generationId", generationId),
            )
            .order("desc")
            .take(8),
        ),
      ),
    ]);
    const routingByGeneration = new Map(
      generationIds.map((generationId, index) => [
        String(generationId),
        routingEvents[index] ?? [],
      ]),
    );
    const thumbnailsByGeneration = new Map(
      generationIds.map((generationId, index) => [
        String(generationId),
        thumbnails[index] ?? [],
      ]),
    );

    return {
      summary,
      total: filteredRows.length,
      page,
      pageSize: size,
      totalPages: totalPages(filteredRows.length, size),
      items: sortCreated(
        visibleRows.map((row) => {
          const generationThumbnails =
            thumbnailsByGeneration.get(String(row._id)) ?? [];
          const generationDurations = generationThumbnails
            .map((thumbnail) => thumbnail.generationTimeMs)
            .filter((value): value is number => typeof value === "number");
          const averageDuration =
            generationDurations.length > 0
              ? Math.round(
                  generationDurations.reduce((acc, value) => acc + value, 0) /
                    generationDurations.length,
                )
              : null;
          const fallbackUsed = generationThumbnails.some(
            (thumbnail) => thumbnail.routingFallbackUsed,
          );
          return {
            id: String(row._id),
            organizationId: row.organizationId,
            organization: orgById.get(row.organizationId) ?? null,
            createdByUserId: row.createdByUserId ?? null,
            createdByUser: row.createdByUserId
              ? (userById.get(row.createdByUserId) ?? null)
              : null,
            promptId: row.promptId ? String(row.promptId) : null,
            prompt: row.prompt,
            model: row.model,
            requestedModel: row.requestedModel ?? row.model,
            routingDefaultModel: row.routingDefaultModel ?? row.model,
            routingForceOfficialFirst: Boolean(row.routingForceOfficialFirst),
            routingEvents: (routingByGeneration.get(String(row._id)) ?? []).map(
              (event) => ({
                id: String(event._id),
                model: event.model,
                provider: event.provider,
                api: event.api,
                apiModelId: event.apiModelId,
                status: event.status,
                durationMs: event.durationMs ?? null,
                fallbackUsed: event.fallbackUsed,
                attemptIndex: event.attemptIndex,
                error: event.error ?? null,
                createdAt: event.createdAt,
              }),
            ),
            thumbnails: generationThumbnails.map((thumbnail) => ({
              id: String(thumbnail._id),
              url: thumbnail.url ?? null,
              watermarkedUrl: thumbnail.watermarkedUrl ?? null,
              status: thumbnail.status,
              generationTimeMs: thumbnail.generationTimeMs ?? null,
            })),
            aspectRatio: row.aspectRatio ?? null,
            chargedCreditCost: row.chargedCreditCost ?? null,
            fallbackUsed,
            averageDurationMs: averageDuration,
            status: row.status,
            errorMessage: row.errorMessage ?? null,
            createdAt: row.createdAt,
            completedAt: row.completedAt ?? null,
          };
        }),
        "desc",
      ),
    };
  },
});

export const listGenerationRoutingLogs = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    api: v.optional(v.string()),
    fallback: v.optional(v.union(v.literal("yes"), v.literal("no"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const rows = args.status
      ? await ctx.db
          .query("generationRoutingEvents")
          .withIndex("by_status_created", (q) =>
            q.eq("status", args.status as string),
          )
          .order("desc")
          .take(AUTH_LIMIT)
      : await ctx.db
          .query("generationRoutingEvents")
          .withIndex("by_created")
          .order("desc")
          .take(AUTH_LIMIT);
    const search = normalizeSearchTerm(args.search);
    const filtered = rows
      .filter((row) => !args.api || row.api === args.api)
      .filter((row) =>
        args.fallback === "yes"
          ? row.fallbackUsed
          : args.fallback === "no"
            ? !row.fallbackUsed
            : true,
      )
      .filter(
        (row) =>
          !search ||
          includesSearch(row.generationId, search) ||
          includesSearch(row.thumbnailId, search) ||
          includesSearch(row.organizationId, search) ||
          includesSearch(row.model, search) ||
          includesSearch(row.apiModelId, search) ||
          includesSearch(row.error, search) ||
          includesSearch(row.provider, search),
      )
      .slice(0, 200);

    return sortCreated(
      filtered.map((row) => ({
        id: String(row._id),
        organizationId: row.organizationId,
        generationId: row.generationId ? String(row.generationId) : null,
        thumbnailId: row.thumbnailId ? String(row.thumbnailId) : null,
        requestedModel: row.requestedModel,
        defaultModel: row.defaultModel,
        model: row.model,
        provider: row.provider,
        api: row.api,
        apiModelId: row.apiModelId,
        status: row.status,
        durationMs: row.durationMs ?? null,
        fallbackUsed: row.fallbackUsed,
        attemptIndex: row.attemptIndex,
        error: row.error ?? null,
        createdAt: row.createdAt,
      })),
      "desc",
    );
  },
});

export const getGenerationRoutingDashboard = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx as never);
    const [settings, events, recentThumbnails] = await Promise.all([
      ctx.db
        .query("generationRoutingSettings")
        .withIndex("by_key", (q) => q.eq("key", "default"))
        .first(),
      ctx.db
        .query("generationRoutingEvents")
        .withIndex("by_created")
        .order("desc")
        .take(AUTH_LIMIT),
      ctx.db
        .query("thumbnails")
        .withIndex("by_created")
        .order("desc")
        .take(AUTH_LIMIT),
    ]);
    const routedThumbnails = recentThumbnails.filter((thumbnail) =>
      Boolean(thumbnail.routingFinalApi),
    );
    const fallbackCount = routedThumbnails.filter(
      (thumbnail) => thumbnail.routingFallbackUsed,
    ).length;
    const apiCounts = events.reduce<Record<string, number>>((counts, event) => {
      counts[event.api] = (counts[event.api] ?? 0) + 1;
      return counts;
    }, {});
    const failedEvents = events.filter((event) => event.status === "failed");
    const successfulEvents = events.filter(
      (event) => event.status === "succeeded",
    );

    return {
      settings: {
        forceOfficialFirst: Boolean(settings?.forceOfficialFirst),
        updatedAt: settings?.updatedAt ?? null,
      },
      totals: {
        attempts: events.length,
        successfulAttempts: successfulEvents.length,
        failedAttempts: failedEvents.length,
        routedThumbnails: routedThumbnails.length,
        fallbackCount,
      },
      apiCounts,
      recentEvents: events.slice(0, 80).map((event) => ({
        id: String(event._id),
        organizationId: event.organizationId,
        generationId: event.generationId ? String(event.generationId) : null,
        thumbnailId: event.thumbnailId ? String(event.thumbnailId) : null,
        requestedModel: event.requestedModel,
        defaultModel: event.defaultModel,
        model: event.model,
        provider: event.provider,
        api: event.api,
        apiModelId: event.apiModelId,
        status: event.status,
        durationMs: event.durationMs ?? null,
        fallbackUsed: event.fallbackUsed,
        attemptIndex: event.attemptIndex,
        error: event.error ?? null,
        createdAt: event.createdAt,
      })),
    };
  },
});

export const listGenerationsByOrganization = query({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const rows = await ctx.db
      .query("generations")
      .withIndex("by_organization_created", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .order("desc")
      .take(AUTH_LIMIT);

    const generationIds = rows.map((row) => row._id);
    const thumbnails = await Promise.all(
      generationIds.map(async (generationId) =>
        ctx.db
          .query("thumbnails")
          .withIndex("by_generation", (q) => q.eq("generationId", generationId))
          .take(1),
      ),
    );
    const thumbnailsByGeneration = new Map(
      generationIds.map((generationId, index) => [
        String(generationId),
        thumbnails[index] ?? [],
      ]),
    );

    return rows.map((row) => ({
      id: String(row._id),
      organizationId: row.organizationId,
      prompt: row.prompt,
      model: row.model,
      status: row.status,
      errorMessage: row.errorMessage ?? null,
      createdAt: row.createdAt,
      completedAt: row.completedAt ?? null,
      chargedCreditCost: row.chargedCreditCost ?? null,
      thumbnailUrl:
        (thumbnailsByGeneration.get(String(row._id)) ?? [])
          .map((thumbnail) =>
            typeof thumbnail.watermarkedUrl === "string"
              ? thumbnail.watermarkedUrl
              : typeof thumbnail.url === "string"
                ? thumbnail.url
                : null,
          )
          .find((value): value is string => Boolean(value)) ?? null,
    }));
  },
});

export const listInspirations = query({
  args: { search: v.optional(v.string()), review: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    // Bounded scan: an unbounded collect() would eventually hit Convex's
    // 16k-doc/8MB query limits as the inspirations table grows.
    const rows = await ctx.db
      .query("inspirations")
      .withIndex("by_created")
      .order("desc")
      .take(INSPIRATION_SCAN_LIMIT);
    const search = normalizeSearchTerm(args.search);
    const review = args.review?.toUpperCase();
    return sortInspirationsForReview(
      rows
        .map((row) => ({
          id: String(row._id),
          organizationId: row.organizationId,
          title: row.title,
          description: row.description ?? null,
          image: row.image,
          images: row.images ?? null,
          sourceUrl: row.sourceUrl ?? null,
          category: row.categories?.[0] ?? null,
          isPublic: row.isPublic ?? true,
          hasPlaceholder: Boolean(row.hasPlaceholder),
          adminReview: getInspirationReviewStatus(row),
          reviewedAt: row.reviewedAt ?? null,
          deletedAt: row.deletedAt ?? null,
          createdAt: row.createdAt,
        }))
        .filter((row) => !review || row.adminReview === review)
        .filter(
          (row) =>
            !search ||
            includesSearch(row.title, search) ||
            includesSearch(row.description, search) ||
            includesSearch(row.organizationId, search) ||
            includesSearch(row.category, search),
        ),
    );
  },
});

export const listThumbnailErrors = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const search = normalizeSearchTerm(args.search);
    const rows = await ctx.db
      .query("thumbnailErrors")
      .withIndex("by_created")
      .order("desc")
      .take(AUTH_LIMIT);
    return sortCreated(
      rows
        .filter((row) => !search || includesSearch(row.message, search))
        .slice(0, AUTH_LIMIT)
        .map((row) => ({
          id: String(row._id),
          organizationId: row.organizationId,
          thumbnailId: row.thumbnailId ? String(row.thumbnailId) : null,
          generationId: row.generationId ? String(row.generationId) : null,
          message: row.message,
          stack: row.stack ?? null,
          createdAt: row.createdAt,
        })),
      "desc",
    );
  },
});

export const listLeads = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx as never);
    const rows = await ctx.db
      .query("onboardingResponses")
      .withIndex("by_created")
      .order("desc")
      .take(AUTH_LIMIT);

    const organizations = await ctx.runQuery(
      components.betterAuth.data.listOrganizationsByIds,
      {
        organizationIds: [
          ...new Set(
            rows.slice(0, AUTH_LIMIT).map((row) => row.organizationId),
          ),
        ],
      },
    );
    const orgById = new Map(
      ((organizations ?? []) as Record<string, unknown>[]).map((org) => {
        const mapped = toAdminOrganization(org);
        return [mapped.id, mapped];
      }),
    );

    const leads = sortCreated(
      rows.map((row) => {
        const status = getLeadStatus(row);
        const organization = orgById.get(row.organizationId) ?? null;

        return {
          id: String(row._id),
          organizationId: row.organizationId,
          organizationName: organization?.name ?? null,
          organizationSlug: organization?.slug ?? null,
          referralSource: row.referralSource,
          referralSourceLabel:
            leadReferralLabels.get(row.referralSource) ?? row.referralSource,
          userType: row.userType,
          userTypeLabel: leadUserTypeLabels.get(row.userType) ?? row.userType,
          status,
          youtubeChannelUrl: row.youtubeChannelUrl ?? null,
          youtubeChannelTitle: row.youtubeChannelTitle ?? null,
          youtubeSubscriberCount: row.youtubeSubscriberCount ?? null,
          youtubeVideoCount: row.youtubeVideoCount ?? null,
          youtubeViewCount: row.youtubeViewCount ?? null,
          videosPerMonth: row.videosPerMonth ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };
      }),
      "desc",
    );

    const days = getLeadDays();
    const stats = {
      total: 0,
      hot: 0,
      cold: 0,
      youtuber: 0,
      agency: 0,
      fromMelvynx: 0,
    };
    const dayBuckets = new Map(
      days.map((day) => [
        day.key,
        { date: day.key, leads: 0, hot: 0, youtuber: 0, agency: 0 },
      ]),
    );
    const sourceBuckets = new Map(
      [...leadReferralLabels.entries()].map(([source, label]) => [
        source,
        { source, label, count: 0 },
      ]),
    );
    const typeBuckets = new Map(
      [...leadUserTypeLabels.entries()].map(([type, label]) => [
        type,
        { type, label, count: 0 },
      ]),
    );

    for (const lead of leads) {
      stats.total += 1;
      if (lead.status === "hot") stats.hot += 1;
      if (lead.status === "cold") stats.cold += 1;
      if (lead.userType === "youtuber") stats.youtuber += 1;
      if (lead.userType === "agency") stats.agency += 1;
      if (lead.referralSource === "melvynx") stats.fromMelvynx += 1;

      const day = days.find(
        (bucket) =>
          lead.createdAt >= bucket.start && lead.createdAt < bucket.end,
      );
      if (day) {
        const bucket = dayBuckets.get(day.key);
        if (bucket) {
          bucket.leads += 1;
          if (lead.status === "hot") bucket.hot += 1;
          if (lead.userType === "youtuber") bucket.youtuber += 1;
          if (lead.userType === "agency") bucket.agency += 1;
        }
      }

      const source = sourceBuckets.get(lead.referralSource) ?? {
        source: lead.referralSource,
        label: lead.referralSourceLabel,
        count: 0,
      };
      source.count += 1;
      sourceBuckets.set(lead.referralSource, source);

      const type = typeBuckets.get(lead.userType) ?? {
        type: lead.userType,
        label: lead.userTypeLabel,
        count: 0,
      };
      type.count += 1;
      typeBuckets.set(lead.userType, type);
    }

    const chartData = [...dayBuckets.values()];
    const sourceChart = [...sourceBuckets.values()];
    const typeChart = [...typeBuckets.values()];

    return {
      stats,
      chartData,
      sourceChart,
      typeChart,
      leads: leads.slice(0, AUTH_LIMIT),
    };
  },
});

export const listFeatureFlags = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx as never);
    const rows = await ctx.db
      .query("featureFlags")
      .withIndex("by_key")
      .take(AUTH_LIMIT);
    const rowByKey = new Map(rows.map((row) => [row.key, row]));

    // Declared flags are always shown (with their default state when no DB row
    // exists yet) so admins toggle a known flag instead of typing its key.
    const declared = FEATURE_FLAG_REGISTRY.map((def) => {
      const row = rowByKey.get(def.key);
      rowByKey.delete(def.key);
      return {
        id: row ? String(row._id) : null,
        key: def.key,
        label: def.label,
        enabled: row?.enabled ?? def.defaultEnabled,
        // Registry is the source of truth for label/description so edits to the
        // copy take effect even when a stale DB row exists.
        description: def.description,
        managed: true,
        updatedAt: row?.updatedAt ?? null,
      };
    });

    // Any remaining DB-only (ad-hoc) flags not in the registry.
    const adhoc = sortCreated([...rowByKey.values()], "asc").map((row) => ({
      id: String(row._id),
      key: row.key,
      label: null,
      enabled: row.enabled,
      description: row.description ?? null,
      managed: false,
      updatedAt: row.updatedAt,
    }));

    return [...declared, ...adhoc];
  },
});

export const getReferralStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx as never);
    const [profiles, records, settings] = await Promise.all([
      ctx.db
        .query("referralProfiles")
        .withIndex("by_created")
        .order("desc")
        .take(AUTH_LIMIT),
      ctx.db
        .query("referralRecords")
        .withIndex("by_created")
        .order("desc")
        .take(AUTH_LIMIT),
      ctx.db.query("referralSettings").withIndex("by_key").take(AUTH_LIMIT),
    ]);
    return {
      profiles: profiles.length,
      records: records.length,
      pending: records.filter((record) => record.status === "pending").length,
      rewarded: records.filter((record) =>
        ["rewarded", "credited"].includes(record.status),
      ).length,
      settings: settings.map((setting) => ({
        id: String(setting._id),
        key: setting.key,
        value: setting.value,
        updatedAt: setting.updatedAt,
      })),
    };
  },
});

type ReferralSettingNumericKey = Exclude<
  keyof typeof REFERRAL_SETTINGS_DEFAULTS,
  "requireProductAction"
>;

const isReferralCredited = (status: string) =>
  status === "credited" || status === "rewarded";

export const getReferralDashboard = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx as never);
    const [profiles, records, settingsRow] = await Promise.all([
      ctx.db
        .query("referralProfiles")
        .withIndex("by_created")
        .order("desc")
        .take(AUTH_LIMIT),
      ctx.db
        .query("referralRecords")
        .withIndex("by_created")
        .order("desc")
        .take(AUTH_LIMIT),
      ctx.db
        .query("referralSettings")
        .withIndex("by_key", (q) => q.eq("key", REFERRAL_SETTINGS_KEY))
        .first(),
    ]);

    const profileById = new Map(
      profiles.map((profile) => [String(profile._id), profile]),
    );
    const userIds = [
      ...new Set([
        ...profiles.map((profile) => profile.userId),
        ...records.flatMap((record) =>
          record.referredUserId ? [record.referredUserId] : [],
        ),
      ]),
    ];
    const users = await ctx.runQuery(
      components.betterAuth.data.listUsersByIds,
      { userIds },
    );
    const userById = new Map(
      ((users ?? []) as Record<string, unknown>[]).map((user) => [
        authId(user),
        toAdminUser(user),
      ]),
    );

    const recordsByProfile = new Map<string, typeof records>();
    for (const record of records) {
      const key = String(record.profileId);
      const list = recordsByProfile.get(key);
      if (list) list.push(record);
      else recordsByProfile.set(key, [record]);
    }

    const search = normalizeSearchTerm(args.search);
    const referrers = profiles
      .map((profile) => {
        const rows = recordsByProfile.get(String(profile._id)) ?? [];
        const credited = rows.filter((row) => isReferralCredited(row.status));
        return {
          id: String(profile._id),
          code: profile.code,
          user: userById.get(profile.userId) ?? null,
          referrals: rows.length,
          pending: rows.filter((row) => row.status === "pending").length,
          credited: credited.length,
          creditsEarned: credited.reduce(
            (sum, row) => sum + (row.rewardAmount ?? 0),
            0,
          ),
          createdAt: profile.createdAt,
        };
      })
      .filter(
        (row) =>
          !search ||
          includesSearch(row.code, search) ||
          includesSearch(row.user?.email, search) ||
          includesSearch(row.user?.name, search),
      )
      .sort(
        (a, b) =>
          b.creditsEarned - a.creditsEarned ||
          b.referrals - a.referrals ||
          b.createdAt - a.createdAt,
      );

    const stored = (
      typeof settingsRow?.value === "object" && settingsRow.value !== null
        ? settingsRow.value
        : {}
    ) as Record<string, unknown>;
    const settingNumber = (key: ReferralSettingNumericKey) => {
      const value = Number(stored[key]);
      return Number.isFinite(value) && value > 0
        ? value
        : REFERRAL_SETTINGS_DEFAULTS[key];
    };

    const creditedRecords = records.filter((record) =>
      isReferralCredited(record.status),
    );

    return {
      stats: {
        referrers: profiles.length,
        referrals: records.length,
        pending: records.filter((record) => record.status === "pending").length,
        credited: creditedRecords.length,
        creditsGranted: creditedRecords.reduce(
          (sum, record) => sum + (record.rewardAmount ?? 0),
          0,
        ),
      },
      settings: {
        creditsPerReferral: settingNumber("creditsPerReferral"),
        dailyCreditCap: settingNumber("dailyCreditCap"),
        monthlyCreditCap: settingNumber("monthlyCreditCap"),
        cookieExpiryDays: settingNumber("cookieExpiryDays"),
        pendingExpiryDays: settingNumber("pendingExpiryDays"),
        burstSignupThreshold: settingNumber("burstSignupThreshold"),
        sameIpSignupThreshold: settingNumber("sameIpSignupThreshold"),
        requireProductAction:
          typeof stored.requireProductAction === "boolean"
            ? stored.requireProductAction
            : REFERRAL_SETTINGS_DEFAULTS.requireProductAction,
        updatedAt: settingsRow?.updatedAt ?? null,
      },
      referrers,
      records: records.slice(0, 25).map((record) => {
        const profile = profileById.get(String(record.profileId));
        return {
          id: String(record._id),
          referrer: profile ? (userById.get(profile.userId) ?? null) : null,
          referrerCode: profile?.code ?? null,
          referredUser: record.referredUserId
            ? (userById.get(record.referredUserId) ?? null)
            : null,
          status: record.status,
          rewardAmount: record.rewardAmount ?? null,
          createdAt: record.createdAt,
        };
      }),
    };
  },
});
