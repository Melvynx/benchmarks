import { mutationGeneric, queryGeneric, type IndexRange } from "convex/server";
import { v } from "convex/values";
import { throwValidationError } from "../utils/errors";
import { includesSearch, normalizeSearchTerm } from "../utils/search";

const MAX_AUTH_ROWS = 500;
const DASHBOARD_PAGE_SIZE = 500;
// Cap for admin search scans: keeps queries under Convex's 16k-doc/8MB read
// limits as the user/organization tables grow.
const SEARCH_SCAN_LIMIT = 4000;

type ChainedIndexRange = {
  eq: (field: string, value: string) => unknown;
};

const chainEq = (range: unknown, field: string, value: string): IndexRange =>
  (range as ChainedIndexRange).eq(field, value) as IndexRange;

const sortByCreatedAt = <T extends { createdAt: number }>(
  rows: T[],
  direction: "asc" | "desc",
) =>
  rows
    .slice()
    .sort((a, b) =>
      direction === "asc"
        ? Number(a.createdAt) - Number(b.createdAt)
        : Number(b.createdAt) - Number(a.createdAt),
    );

const boundedLimit = (limit: number) =>
  Math.max(1, Math.min(Math.trunc(limit), MAX_AUTH_ROWS));

const assertMigrationSecret = (secret: string) => {
  const expected = process.env.MIGRATION_SECRET;
  // The root migrations module validates the secret before calling these
  // component mutations. Component deployments do not always receive root envs.
  if (expected && secret !== expected) {
    throwValidationError("Invalid migration secret");
  }
};

const nullableNumber = v.optional(v.union(v.null(), v.number()));
const nullableString = v.optional(v.union(v.null(), v.string()));

const resetTableValidator = v.union(
  v.literal("session"),
  v.literal("account"),
  v.literal("member"),
  v.literal("invitation"),
  v.literal("apikey"),
  v.literal("verification"),
  v.literal("rateLimit"),
  v.literal("jwks"),
  v.literal("organization"),
  v.literal("user"),
);

type ResetTable =
  | "session"
  | "account"
  | "member"
  | "invitation"
  | "apikey"
  | "verification"
  | "rateLimit"
  | "jwks"
  | "organization"
  | "user";

export const deleteMigrationTableBatch = mutationGeneric({
  args: {
    secret: v.string(),
    table: resetTableValidator,
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    const limit = Math.max(1, Math.min(Math.trunc(args.limit), 200));
    const table = args.table as ResetTable;
    const rows = await ctx.db.query(table).take(limit);

    await Promise.all(rows.map(async (row) => ctx.db.delete(row._id)));

    return { deleted: rows.length };
  },
});

export const getOrganizationById = queryGeneric({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("organization", args.organizationId);
    return id ? ctx.db.get(id) : null;
  },
});

export const getOrganizationBySlug = queryGeneric({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("organization")
      .withIndex("slug", (q) => q.eq("slug", args.slug))
      .unique();
  },
});

export const getOrganizationByName = queryGeneric({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("organization")
      .withIndex("name", (q) => q.eq("name", args.name))
      .first();
  },
});

export const getOrganizationByStripeCustomerId = queryGeneric({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("organization")
      .withIndex("stripeCustomerId", (q) =>
        q.eq("stripeCustomerId", args.stripeCustomerId),
      )
      .first();
  },
});

export const listOrganizationsByIds = queryGeneric({
  args: { organizationIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.organizationIds.map(async (organizationId) => {
        const id = ctx.db.normalizeId("organization", organizationId);
        return id ? ctx.db.get(id) : null;
      }),
    );

    return rows.flatMap((row) => (row ? [row] : []));
  },
});

export const listOrganizationsForAdmin = queryGeneric({
  args: {
    limit: v.number(),
    sort: v.union(v.literal("asc"), v.literal("desc")),
    search: v.optional(v.string()),
    includeIds: v.optional(v.array(v.string())),
    excludeIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = boundedLimit(args.limit);
    const search = normalizeSearchTerm(args.search);
    const query = ctx.db
      .query("organization")
      .withIndex("createdAt")
      .order(args.sort);
    const rows = search
      ? await query.take(SEARCH_SCAN_LIMIT)
      : await query.take(limit);
    const includeIds = args.includeIds ? new Set(args.includeIds) : null;
    const excludeIds = args.excludeIds ? new Set(args.excludeIds) : null;

    return rows.filter((row) => {
      if (includeIds && !includeIds.has(row._id)) return false;
      if (excludeIds?.has(row._id)) return false;
      if (!search) return true;
      return (
        includesSearch(row.name, search) ||
        includesSearch(row.slug, search) ||
        includesSearch(row._id, search)
      );
    });
  },
});

export const getAdminAuthDashboardPage = queryGeneric({
  args: {
    kind: v.union(
      v.literal("user"),
      v.literal("organization"),
      v.literal("activeSession"),
    ),
    afterValue: v.optional(v.union(v.number(), v.null())),
    afterSeen: v.optional(v.number()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const afterValue = args.afterValue ?? null;
    const afterSeen = Math.max(0, Math.trunc(args.afterSeen ?? 0));
    const sliceRows = <T>(rows: T[], getBoundaryValue: (row: T) => number) => {
      let skipped = 0;
      const page = rows.filter((row) => {
        if (afterValue === null) return true;
        if (getBoundaryValue(row) !== afterValue) return true;
        skipped += 1;
        return skipped > afterSeen;
      });
      const visiblePage = page.slice(0, DASHBOARD_PAGE_SIZE);
      const lastValue =
        visiblePage.length > 0
          ? getBoundaryValue(visiblePage[visiblePage.length - 1])
          : null;
      const nextSeen =
        lastValue === null
          ? 0
          : (lastValue === afterValue ? afterSeen : 0) +
            visiblePage.filter((row) => getBoundaryValue(row) === lastValue)
              .length;

      return {
        page: visiblePage,
        isDone: page.length <= DASHBOARD_PAGE_SIZE,
        nextAfterValue: lastValue,
        nextAfterSeen: nextSeen,
      };
    };

    if (args.kind === "user") {
      const rows = await ctx.db
        .query("user")
        .withIndex("createdAt", (q) =>
          afterValue === null ? q : q.gte("createdAt", afterValue),
        )
        .take(DASHBOARD_PAGE_SIZE + afterSeen + 1);
      const result = sliceRows(rows, (row) => row.createdAt);
      return {
        createdAt: result.page.map((row) => row.createdAt),
        count: result.page.length,
        isDone: result.isDone,
        nextAfterValue: result.nextAfterValue,
        nextAfterSeen: result.nextAfterSeen,
      };
    }

    if (args.kind === "organization") {
      const rows = await ctx.db
        .query("organization")
        .withIndex("createdAt", (q) =>
          afterValue === null ? q : q.gte("createdAt", afterValue),
        )
        .take(DASHBOARD_PAGE_SIZE + afterSeen + 1);
      const result = sliceRows(rows, (row) => row.createdAt);
      return {
        createdAt: result.page.map((row) => row.createdAt),
        count: result.page.length,
        isDone: result.isDone,
        nextAfterValue: result.nextAfterValue,
        nextAfterSeen: result.nextAfterSeen,
      };
    }

    const rows = await ctx.db
      .query("session")
      .withIndex("expiresAt", (q) =>
        afterValue !== null
          ? q.gte("expiresAt", afterValue)
          : q.gte("expiresAt", args.now),
      )
      .take(DASHBOARD_PAGE_SIZE + afterSeen + 1);
    const result = sliceRows(rows, (row) => row.expiresAt);
    return {
      createdAt: [],
      count: result.page.length,
      isDone: result.isDone,
      nextAfterValue: result.nextAfterValue,
      nextAfterSeen: result.nextAfterSeen,
    };
  },
});

export const patchOrganization = mutationGeneric({
  args: {
    organizationId: v.string(),
    update: v.object({
      name: v.optional(v.string()),
      slug: v.optional(v.union(v.string(), v.null())),
      logo: v.optional(v.union(v.string(), v.null())),
      stripeCustomerId: v.optional(v.union(v.string(), v.null())),
    }),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("organization", args.organizationId);
    if (!id) return null;

    const update: Record<string, string | null> = {};
    if (args.update.name !== undefined) update.name = args.update.name;
    if (args.update.slug !== undefined) update.slug = args.update.slug;
    if (args.update.logo !== undefined) update.logo = args.update.logo;
    if (args.update.stripeCustomerId !== undefined) {
      update.stripeCustomerId = args.update.stripeCustomerId;
    }

    if (Object.keys(update).length > 0) {
      await ctx.db.patch(id, update);
    }

    return ctx.db.get(id);
  },
});

export const deleteOrganization = mutationGeneric({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("organization", args.organizationId);
    if (!id) return { success: true };

    const [members, invitations, apiKeys] = await Promise.all([
      ctx.db
        .query("member")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .collect(),
      ctx.db
        .query("invitation")
        .withIndex("organizationId", (q) =>
          q.eq("organizationId", args.organizationId),
        )
        .collect(),
      ctx.db
        .query("apikey")
        .withIndex("referenceId", (q) =>
          q.eq("referenceId", args.organizationId),
        )
        .collect(),
    ]);

    await Promise.all([
      ...members.map(async (member) => ctx.db.delete(member._id)),
      ...invitations.map(async (invitation) => ctx.db.delete(invitation._id)),
      ...apiKeys.map(async (apiKey) => ctx.db.delete(apiKey._id)),
    ]);
    await ctx.db.delete(id);

    return { success: true };
  },
});

export const createOrganization = mutationGeneric({
  args: {
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const organizationId = await ctx.db.insert("organization", {
      name: args.name,
      slug: args.slug,
      logo: args.logo ?? null,
      createdAt: now,
      metadata: null,
    });

    return ctx.db.get(organizationId);
  },
});

export const getUserById = queryGeneric({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("user", args.userId);
    return id ? ctx.db.get(id) : null;
  },
});

export const getUserByEmail = queryGeneric({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("user")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();
  },
});

export const listUsersByIds = queryGeneric({
  args: { userIds: v.array(v.string()) },
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.userIds.map(async (userId) => {
        const id = ctx.db.normalizeId("user", userId);
        return id ? ctx.db.get(id) : null;
      }),
    );

    return rows.flatMap((row) => (row ? [row] : []));
  },
});

export const patchUser = mutationGeneric({
  args: {
    userId: v.string(),
    update: v.object({
      name: v.optional(v.string()),
      image: v.optional(v.union(v.null(), v.string())),
      emailVerified: v.optional(v.boolean()),
      role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    }),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("user", args.userId);
    if (!id) return null;

    const update: Record<string, string | boolean | number | null> = {
      updatedAt: Date.now(),
    };
    if (args.update.name !== undefined) update.name = args.update.name;
    if (args.update.image !== undefined) update.image = args.update.image;
    if (args.update.emailVerified !== undefined) {
      update.emailVerified = args.update.emailVerified;
    }
    if (args.update.role !== undefined) update.role = args.update.role;

    await ctx.db.patch(id, update);
    return ctx.db.get(id);
  },
});

export const listUsersForAdmin = queryGeneric({
  args: {
    limit: v.number(),
    sort: v.union(v.literal("asc"), v.literal("desc")),
    search: v.optional(v.string()),
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    status: v.optional(v.union(v.literal("active"), v.literal("banned"))),
  },
  handler: async (ctx, args) => {
    const limit = boundedLimit(args.limit);
    const query = ctx.db.query("user").withIndex("createdAt").order(args.sort);
    const search = normalizeSearchTerm(args.search);
    const rows = search
      ? await query.take(SEARCH_SCAN_LIMIT)
      : await query.take(limit);
    const users = rows.filter((row) => {
      if (args.role && row.role !== args.role) return false;
      if (args.status === "banned" && row.banned !== true) return false;
      if (args.status === "active" && row.banned === true) return false;
      if (!search) return true;
      return (
        includesSearch(row.email, search) ||
        includesSearch(row.name, search) ||
        includesSearch(row._id, search)
      );
    });

    return sortByCreatedAt(users, args.sort);
  },
});

export const listUsersForLumailBackfill = queryGeneric({
  args: {
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    const limit = boundedLimit(args.limit);
    const offset = Math.max(0, Number(args.cursor ?? 0));
    // Read only up to the end of the requested page instead of collecting the
    // whole table on every cursor step.
    const rows = await ctx.db
      .query("user")
      .withIndex("createdAt")
      .order("asc")
      .take(offset + limit);
    const page = rows.slice(offset);
    const nextOffset = offset + page.length;

    const users = await Promise.all(
      page.map(async (user) => {
        const member = await ctx.db
          .query("member")
          .withIndex("userId", (q) => q.eq("userId", String(user._id)))
          .first();
        const organizationId = member
          ? ctx.db.normalizeId("organization", member.organizationId)
          : null;
        const organization = organizationId
          ? await ctx.db.get(organizationId)
          : null;

        return {
          id: String(user._id),
          email: user.email,
          name: user.name,
          organization: organization
            ? {
                id: String(organization._id),
                name: organization.name,
              }
            : null,
        };
      }),
    );

    return {
      users,
      isDone: rows.length < offset + limit,
      continueCursor: String(nextOffset),
    };
  },
});

export const getSessionById = queryGeneric({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("session", args.sessionId);
    return id ? ctx.db.get(id) : null;
  },
});

export const listSessionsByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("session")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .take(boundedLimit(args.limit));
  },
});

export const listAccountsByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("account")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .take(boundedLimit(args.limit));
  },
});

export const getMemberById = queryGeneric({
  args: { memberId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("member", args.memberId);
    return id ? ctx.db.get(id) : null;
  },
});

export const patchMemberRoleForAdmin = mutationGeneric({
  args: {
    memberId: v.string(),
    organizationId: v.string(),
    role: v.union(v.literal("member"), v.literal("admin"), v.literal("owner")),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("member", args.memberId);
    if (!id) return null;

    const member = await ctx.db.get(id);
    if (member?.organizationId !== args.organizationId) return null;

    await ctx.db.patch(id, {
      role: args.role,
      updatedAt: Date.now(),
    });

    return ctx.db.get(id);
  },
});

export const deleteMemberForAdmin = mutationGeneric({
  args: {
    memberId: v.string(),
    organizationId: v.string(),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("member", args.memberId);
    if (!id) return null;

    const member = await ctx.db.get(id);
    if (member?.organizationId !== args.organizationId) return null;

    await ctx.db.delete(id);
    return member;
  },
});

export const getMemberByOrganizationAndUser = queryGeneric({
  args: { organizationId: v.string(), userId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        chainEq(
          q.eq("organizationId", args.organizationId),
          "userId",
          args.userId,
        ),
      )
      .unique();
  },
});

export const listMembersByOrganization = queryGeneric({
  args: { organizationId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("member")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(boundedLimit(args.limit));
  },
});

export const listMembersByUser = queryGeneric({
  args: { userId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("member")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .take(boundedLimit(args.limit));
  },
});

export const getInvitationById = queryGeneric({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("invitation", args.invitationId);
    return id ? ctx.db.get(id) : null;
  },
});

export const listInvitationsByOrganization = queryGeneric({
  args: { organizationId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("invitation")
      .withIndex("organizationId", (q) =>
        q.eq("organizationId", args.organizationId),
      )
      .take(boundedLimit(args.limit));
  },
});

export const createInvitationForAdmin = mutationGeneric({
  args: {
    organizationId: v.string(),
    email: v.string(),
    role: v.union(v.literal("member"), v.literal("admin"), v.literal("owner")),
    inviterId: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const organizationId = ctx.db.normalizeId(
      "organization",
      args.organizationId,
    );
    if (!organizationId) return null;

    const existingUser = await ctx.db
      .query("user")
      .withIndex("email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      const existingMember = await ctx.db
        .query("member")
        .withIndex("organizationId_userId", (q) =>
          chainEq(
            q.eq("organizationId", organizationId),
            "userId",
            existingUser._id,
          ),
        )
        .unique();

      if (existingMember) {
        throwValidationError("User is already a member of this organization");
      }
    }

    const pendingInvitations = await ctx.db
      .query("invitation")
      .withIndex("email_organizationId_status", (q) =>
        chainEq(
          chainEq(q.eq("email", args.email), "organizationId", organizationId),
          "status",
          "pending",
        ),
      )
      .take(10);

    if (
      pendingInvitations.some(
        (invitation) => Number(invitation.expiresAt) > args.createdAt,
      )
    ) {
      throwValidationError("User already has a pending invitation");
    }

    const id = await ctx.db.insert("invitation", {
      organizationId,
      email: args.email,
      role: args.role,
      status: "pending",
      expiresAt: args.expiresAt,
      inviterId: args.inviterId,
      createdAt: args.createdAt,
      teamId: null,
    });

    const invitation = await ctx.db.get(id);
    return invitation
      ? {
          id: String(invitation._id),
          email: invitation.email,
          role: invitation.role ?? null,
          status: invitation.status,
          organizationId: invitation.organizationId,
          expiresAt: invitation.expiresAt,
          inviterId: invitation.inviterId,
          createdAt: invitation.createdAt,
        }
      : null;
  },
});

export const upsertMember = mutationGeneric({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const organizationId = ctx.db.normalizeId(
      "organization",
      args.organizationId,
    );
    const userId = ctx.db.normalizeId("user", args.userId);
    if (!organizationId || !userId) return null;

    const existing = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        chainEq(chainEq(q, "organizationId", organizationId), "userId", userId),
      )
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { role: args.role, updatedAt: now });
      return ctx.db.get(existing._id);
    }

    const id = await ctx.db.insert("member", {
      organizationId,
      userId,
      role: args.role,
      createdAt: now,
      updatedAt: now,
      teamId: null,
    });
    return ctx.db.get(id);
  },
});

export const createMember = mutationGeneric({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("member")
      .withIndex("organizationId_userId", (q) =>
        chainEq(
          q.eq("organizationId", args.organizationId),
          "userId",
          args.userId,
        ),
      )
      .unique();

    if (existing) return existing;

    const now = Date.now();
    const memberId = await ctx.db.insert("member", {
      organizationId: args.organizationId,
      userId: args.userId,
      role: args.role,
      createdAt: now,
      updatedAt: now,
    });

    return ctx.db.get(memberId);
  },
});

export const patchInvitation = mutationGeneric({
  args: {
    invitationId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("invitation", args.invitationId);
    if (!id) return null;
    await ctx.db.patch(id, { status: args.status });
    return ctx.db.get(id);
  },
});

export const hasPendingInvitationForEmail = queryGeneric({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const invitation = await ctx.db
      .query("invitation")
      .withIndex("email_status", (q) =>
        chainEq(q.eq("email", args.email), "status", "pending"),
      )
      .first();

    return invitation !== null;
  },
});

export const getLatestVerificationByIdentifier = queryGeneric({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("verification")
      .withIndex("identifier", (q) => q.eq("identifier", args.identifier))
      .order("desc")
      .first();
  },
});

export const listApiKeysByOrganization = queryGeneric({
  args: { organizationId: v.string(), limit: v.number() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("apikey")
      .withIndex("referenceId_createdAt", (q) =>
        q.eq("referenceId", args.organizationId),
      )
      .order("desc")
      .take(boundedLimit(args.limit));
  },
});

export const getApiKeyForOrganization = queryGeneric({
  args: { keyId: v.string(), organizationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("apikey", args.keyId);
    if (!id) return null;

    const apiKey = await ctx.db.get(id);
    if (apiKey?.referenceId !== args.organizationId) return null;
    return apiKey;
  },
});

export const createApiKey = mutationGeneric({
  args: {
    data: v.object({
      configId: v.string(),
      name: v.optional(v.union(v.null(), v.string())),
      start: v.optional(v.union(v.null(), v.string())),
      referenceId: v.string(),
      prefix: v.optional(v.union(v.null(), v.string())),
      key: v.string(),
      refillInterval: v.optional(v.union(v.null(), v.number())),
      refillAmount: v.optional(v.union(v.null(), v.number())),
      lastRefillAt: v.optional(v.union(v.null(), v.number())),
      enabled: v.boolean(),
      rateLimitEnabled: v.boolean(),
      rateLimitTimeWindow: v.optional(v.union(v.null(), v.number())),
      rateLimitMax: v.optional(v.union(v.null(), v.number())),
      requestCount: v.number(),
      remaining: v.optional(v.union(v.null(), v.number())),
      lastRequest: v.optional(v.union(v.null(), v.number())),
      expiresAt: v.optional(v.union(v.null(), v.number())),
      createdAt: v.number(),
      updatedAt: v.number(),
      permissions: v.optional(v.union(v.null(), v.string())),
      metadata: v.optional(v.union(v.null(), v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("apikey", args.data);
    return ctx.db.get(id);
  },
});

export const upsertMigratedApiKeys = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        name: v.string(),
        referenceId: v.string(),
        key: v.string(),
        start: nullableString,
        lastRequest: nullableNumber,
        expiresAt: nullableNumber,
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    return Promise.all(
      args.rows.map(async (row) => {
        const data = {
          configId: "default",
          name: row.name,
          start: row.start ?? null,
          referenceId: row.referenceId,
          prefix: "tf",
          key: row.key,
          enabled: true,
          rateLimitEnabled: false,
          requestCount: 0,
          lastRequest: row.lastRequest ?? null,
          expiresAt: row.expiresAt ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          metadata: JSON.stringify({ legacyId: row.legacyId }),
        };

        const existing = await ctx.db
          .query("apikey")
          .withIndex("key", (q) => q.eq("key", row.key))
          .first();

        if (existing) {
          await ctx.db.patch(existing._id, data);
          return { legacyId: row.legacyId, id: String(existing._id) };
        }

        const id = await ctx.db.insert("apikey", data);
        return { legacyId: row.legacyId, id: String(id) };
      }),
    );
  },
});

export const deleteApiKeyForOrganization = mutationGeneric({
  args: { keyId: v.string(), organizationId: v.string() },
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("apikey", args.keyId);
    if (!id) return false;

    const apiKey = await ctx.db.get(id);
    if (apiKey?.referenceId !== args.organizationId) return false;

    await ctx.db.delete(id);
    return true;
  },
});

export const upsertMigratedUsers = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        name: v.string(),
        email: v.string(),
        emailVerified: v.boolean(),
        image: nullableString,
        createdAt: v.number(),
        updatedAt: v.number(),
        role: nullableString,
        banned: v.optional(v.union(v.null(), v.boolean())),
        banReason: nullableString,
        banExpires: nullableNumber,
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    return Promise.all(
      args.rows.map(async (row) => {
        const existing = await ctx.db
          .query("user")
          .withIndex("email", (q) => q.eq("email", row.email))
          .first();
        const data = {
          name: row.name,
          email: row.email,
          emailVerified: row.emailVerified,
          image: row.image ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          userId: row.legacyId,
          role: row.role ?? "user",
          banned: row.banned ?? false,
          banReason: row.banReason ?? null,
          banExpires: row.banExpires ?? null,
        };

        if (existing) {
          await ctx.db.patch(existing._id, data);
          return { legacyId: row.legacyId, id: String(existing._id) };
        }

        const id = await ctx.db.insert("user", data);
        return { legacyId: row.legacyId, id: String(id) };
      }),
    );
  },
});

export const upsertMigratedOrganizations = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        name: v.string(),
        slug: nullableString,
        logo: nullableString,
        createdAt: v.number(),
        metadata: nullableString,
        stripeCustomerId: nullableString,
        email: nullableString,
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    return Promise.all(
      args.rows.map(async (row) => {
        const metadata = JSON.stringify({
          ...(row.metadata ? { legacyMetadata: row.metadata } : {}),
          legacyId: row.legacyId,
        });
        const data = {
          name: row.name,
          slug: row.slug ?? null,
          logo: row.logo ?? null,
          createdAt: row.createdAt,
          metadata,
          stripeCustomerId: row.stripeCustomerId ?? null,
          email: row.email ?? null,
        };
        const existing = row.slug
          ? await ctx.db
              .query("organization")
              .withIndex("slug", (q) => q.eq("slug", row.slug))
              .unique()
          : null;

        if (existing) {
          await ctx.db.patch(existing._id, data);
          return { legacyId: row.legacyId, id: String(existing._id) };
        }

        const id = await ctx.db.insert("organization", data);
        return { legacyId: row.legacyId, id: String(id) };
      }),
    );
  },
});

export const upsertMigratedAccounts = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        accountId: v.string(),
        providerId: v.string(),
        userId: v.string(),
        accessToken: nullableString,
        refreshToken: nullableString,
        idToken: nullableString,
        accessTokenExpiresAt: nullableNumber,
        refreshTokenExpiresAt: nullableNumber,
        scope: nullableString,
        password: nullableString,
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    return Promise.all(
      args.rows.map(async (row) => {
        const existing = await ctx.db
          .query("account")
          .withIndex("accountId_providerId", (q) =>
            chainEq(
              q.eq("accountId", row.accountId),
              "providerId",
              row.providerId,
            ),
          )
          .unique();
        const data = {
          accountId: row.accountId,
          providerId: row.providerId,
          userId: row.userId,
          accessToken: row.accessToken ?? null,
          refreshToken: row.refreshToken ?? null,
          idToken: row.idToken ?? null,
          accessTokenExpiresAt: row.accessTokenExpiresAt ?? null,
          refreshTokenExpiresAt: row.refreshTokenExpiresAt ?? null,
          scope: row.scope ?? null,
          password: row.password ?? null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        };

        if (existing) {
          await ctx.db.patch(existing._id, data);
          return { accountId: row.accountId, id: String(existing._id) };
        }

        const id = await ctx.db.insert("account", data);
        return { accountId: row.accountId, id: String(id) };
      }),
    );
  },
});

export const upsertMigratedMembers = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        organizationId: v.string(),
        userId: v.string(),
        role: v.string(),
        createdAt: v.number(),
        updatedAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    return Promise.all(
      args.rows.map(async (row) => {
        const existing = await ctx.db
          .query("member")
          .withIndex("organizationId_userId", (q) =>
            chainEq(
              q.eq("organizationId", row.organizationId),
              "userId",
              row.userId,
            ),
          )
          .unique();
        const data = {
          organizationId: row.organizationId,
          userId: row.userId,
          role: row.role,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          teamId: null,
        };

        if (existing) {
          await ctx.db.patch(existing._id, data);
          return { id: String(existing._id) };
        }

        const id = await ctx.db.insert("member", data);
        return { id: String(id) };
      }),
    );
  },
});

export const upsertMigratedInvitations = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        organizationId: v.string(),
        email: v.string(),
        role: nullableString,
        status: v.string(),
        expiresAt: v.number(),
        inviterId: v.string(),
        createdAt: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    return Promise.all(
      args.rows.map(async (row) => {
        const existing = await ctx.db
          .query("invitation")
          .withIndex("email_organizationId_status", (q) =>
            chainEq(
              chainEq(
                q.eq("email", row.email),
                "organizationId",
                row.organizationId,
              ),
              "status",
              row.status,
            ),
          )
          .first();
        const data = {
          organizationId: row.organizationId,
          email: row.email,
          role: row.role ?? null,
          status: row.status,
          expiresAt: row.expiresAt,
          inviterId: row.inviterId,
          createdAt: row.createdAt,
          teamId: null,
        };

        if (existing) {
          await ctx.db.patch(existing._id, data);
          return { id: String(existing._id) };
        }

        const id = await ctx.db.insert("invitation", data);
        return { id: String(id) };
      }),
    );
  },
});
