/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { components } from "./_generated/api";
import { actionGeneric, mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { Lumail, LumailNotFoundError } from "lumail";

const _appTables = [
  "people",
  "inspirations",
  "prompts",
  "generations",
  "generationNotificationAcknowledgements",
  "thumbnails",
  "videos",
  "videoGenerations",
  "videoTitles",
  "userImages",
  "thumbnailErrors",
  "agentChats",
  "featureFlags",
  "feedbacks",
  "creditBalances",
  "creditTransactions",
  "signupCreditGrants",
  "subscriptions",
  "customProviderApiKeys",
  "customApiKeyUsage",
  "customApiKeyUsageStats",
  "referralProfiles",
  "referralRecords",
  "referralSettings",
] as const;

const _resetAppTables = [
  "thumbnailErrors",
  "generationRoutingEvents",
  "videoGenerations",
  "videoTitles",
  "videos",
  "thumbnails",
  "generationNotificationAcknowledgements",
  "generations",
  "prompts",
  "people",
  "inspirations",
  "userImages",
  "creditTransactions",
  "signupCreditGrants",
  "creditBalances",
  "subscriptions",
  "customApiKeyUsage",
  "customApiKeyUsageStats",
  "customProviderApiKeys",
  "referralRecords",
  "referralProfiles",
  "referralSettings",
  "feedbacks",
  "agentChats",
  "featureFlags",
  "generationRoutingSettings",
  "onboardingResponses",
  "onboardingStates",
  "newsletterSubscriptions",
  "changelogDismissals",
  "changelogStates",
] as const;

const _resetAuthTables = [
  "session",
  "account",
  "member",
  "invitation",
  "apikey",
  "verification",
  "rateLimit",
  "jwks",
  "organization",
  "user",
] as const;

const LUMAIL_BACKFILL_DEFAULT_LIMIT = 50;
const LUMAIL_BACKFILL_MAX_LIMIT = 100;

const assertMigrationSecret = (secret: string) => {
  const expected = process.env.MIGRATION_SECRET;
  if (!expected || secret !== expected) {
    throw new Error("Invalid migration secret");
  }
};

const appTableValidator = v.union(
  v.literal("people"),
  v.literal("inspirations"),
  v.literal("prompts"),
  v.literal("generations"),
  v.literal("generationNotificationAcknowledgements"),
  v.literal("thumbnails"),
  v.literal("videos"),
  v.literal("videoGenerations"),
  v.literal("videoTitles"),
  v.literal("userImages"),
  v.literal("thumbnailErrors"),
  v.literal("agentChats"),
  v.literal("featureFlags"),
  v.literal("feedbacks"),
  v.literal("creditBalances"),
  v.literal("creditTransactions"),
  v.literal("signupCreditGrants"),
  v.literal("subscriptions"),
  v.literal("customProviderApiKeys"),
  v.literal("customApiKeyUsage"),
  v.literal("customApiKeyUsageStats"),
  v.literal("referralProfiles"),
  v.literal("referralRecords"),
  v.literal("referralSettings"),
);

type AppTable = (typeof _appTables)[number];
type ResetAppTable = (typeof _resetAppTables)[number];
type _ResetAuthTable = (typeof _resetAuthTables)[number];
type LumailBackfillUser = {
  id: string;
  email: string;
  name: string;
  organization: { id: string; name: string } | null;
};
type LumailBackfillResult =
  | { status: "existing" }
  | { status: "missing" }
  | { status: "created" }
  | { status: "failed"; email: string; message: string };

const resetAppTableValidator = v.union(
  v.literal("thumbnailErrors"),
  v.literal("generationRoutingEvents"),
  v.literal("videoGenerations"),
  v.literal("videoTitles"),
  v.literal("videos"),
  v.literal("thumbnails"),
  v.literal("generationNotificationAcknowledgements"),
  v.literal("generations"),
  v.literal("prompts"),
  v.literal("people"),
  v.literal("inspirations"),
  v.literal("userImages"),
  v.literal("creditTransactions"),
  v.literal("signupCreditGrants"),
  v.literal("creditBalances"),
  v.literal("subscriptions"),
  v.literal("customApiKeyUsage"),
  v.literal("customApiKeyUsageStats"),
  v.literal("customProviderApiKeys"),
  v.literal("referralRecords"),
  v.literal("referralProfiles"),
  v.literal("referralSettings"),
  v.literal("feedbacks"),
  v.literal("agentChats"),
  v.literal("featureFlags"),
  v.literal("generationRoutingSettings"),
  v.literal("onboardingResponses"),
  v.literal("onboardingStates"),
  v.literal("newsletterSubscriptions"),
  v.literal("changelogDismissals"),
  v.literal("changelogStates"),
);

const resetAuthTableValidator = v.union(
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

const getLumailBackfillLimit = (limit?: number) =>
  Math.max(
    1,
    Math.min(
      Math.trunc(limit ?? LUMAIL_BACKFILL_DEFAULT_LIMIT),
      LUMAIL_BACKFILL_MAX_LIMIT,
    ),
  );

const buildLumailSubscriberPayload = (user: LumailBackfillUser) => {
  const fields: Record<string, string> = {};

  if (user.organization?.name) {
    fields.Organization = user.organization.name;
  }
  if (user.organization?.id) {
    fields.OrganizationId = user.organization.id;
  }

  return {
    email: user.email,
    name: user.name,
    tags: ["onboarding"],
    fields,
    resubscribe: true,
    triggerWorkflows: true,
  };
};

const syncLumailBackfillUser = async (
  lumail: Lumail,
  user: LumailBackfillUser,
  dryRun: boolean,
): Promise<LumailBackfillResult> => {
  try {
    await lumail.subscribers.get(user.email);
    return { status: "existing" };
  } catch (error) {
    if (!(error instanceof LumailNotFoundError)) {
      return {
        status: "failed",
        email: user.email,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  }

  if (dryRun) return { status: "missing" };

  try {
    await lumail.subscribers.create(buildLumailSubscriberPayload(user));
    return { status: "created" };
  } catch (error) {
    return {
      status: "failed",
      email: user.email,
      message: error instanceof Error ? error.message : String(error),
    };
  }
};

export const backfillLumailSubscribers = actionGeneric({
  args: {
    secret: v.string(),
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    const apiKey = process.env.LUMAIL_API_TOKEN;
    if (!apiKey) throw new Error("Lumail API token is not configured");

    const page = await (ctx as any).runQuery(
      (components.betterAuth.data as any).listUsersForLumailBackfill,
      {
        cursor: args.cursor ?? null,
        limit: getLumailBackfillLimit(args.limit),
      },
    );
    const lumail = new Lumail({ apiKey });
    const results = await Promise.all(
      (page.users as LumailBackfillUser[]).map(async (user) =>
        syncLumailBackfillUser(lumail, user, Boolean(args.dryRun)),
      ),
    );
    const failures = results.flatMap((result) =>
      result.status === "failed"
        ? [{ email: result.email, message: result.message }]
        : [],
    );

    return {
      dryRun: Boolean(args.dryRun),
      scanned: page.users.length,
      existing: results.filter((result) => result.status === "existing").length,
      missing: results.filter((result) => result.status === "missing").length,
      created: results.filter((result) => result.status === "created").length,
      failed: failures.length,
      failures,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

export const deleteAppTableBatch = mutationGeneric({
  args: {
    secret: v.string(),
    table: resetAppTableValidator,
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    const db = ctx.db as any;
    const table = args.table as ResetAppTable;
    const limit = Math.max(1, Math.min(Math.trunc(args.limit), 200));
    const rows = await db.query(table).take(limit);

    await Promise.all(rows.map((row: any) => db.delete(row._id)));

    return { deleted: rows.length };
  },
});

export const deleteAuthTableBatch = mutationGeneric({
  args: {
    secret: v.string(),
    table: resetAuthTableValidator,
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    return (ctx as any).runMutation(
      (components.betterAuth.data as any).deleteMigrationTableBatch,
      args,
    );
  },
});

export const importAppBatch = mutationGeneric({
  args: {
    secret: v.string(),
    table: appTableValidator,
    rows: v.array(
      v.object({
        legacyId: v.string(),
        data: v.any(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    const db = ctx.db as any;
    const table = args.table as AppTable;

    return Promise.all(
      args.rows.map(async (row) => {
        const existing = await db
          .query(table)
          .withIndex("by_legacy", (q: any) => q.eq("legacyId", row.legacyId))
          .first();
        const data = { ...row.data, legacyId: row.legacyId };

        if (existing) {
          await db.patch(existing._id, data);
          return { legacyId: row.legacyId, id: String(existing._id) };
        }

        const id = await db.insert(table, data);
        return { legacyId: row.legacyId, id: String(id) };
      }),
    );
  },
});

export const resolveAuthUsers = queryGeneric({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        email: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    const resolved = await Promise.all(
      args.rows.map(async (row) => {
        const user = await (ctx as any).runQuery(
          components.betterAuth.data.getUserByEmail,
          { email: row.email },
        );
        return user ? { legacyId: row.legacyId, id: String(user._id) } : null;
      }),
    );

    return resolved.filter(Boolean);
  },
});

export const resolveAuthOrganizations = queryGeneric({
  args: {
    secret: v.string(),
    rows: v.array(
      v.object({
        legacyId: v.string(),
        slug: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);

    const resolved = await Promise.all(
      args.rows.map(async (row) => {
        const organization = await (ctx as any).runQuery(
          components.betterAuth.data.getOrganizationBySlug,
          { slug: row.slug },
        );
        return organization
          ? { legacyId: row.legacyId, id: String(organization._id) }
          : null;
      }),
    );

    return resolved.filter(Boolean);
  },
});

export const importAuthUsers = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    return (ctx as any).runMutation(
      components.betterAuth.data.upsertMigratedUsers,
      args,
    );
  },
});

export const importAuthOrganizations = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    return (ctx as any).runMutation(
      components.betterAuth.data.upsertMigratedOrganizations,
      args,
    );
  },
});

export const importAuthAccounts = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    return (ctx as any).runMutation(
      components.betterAuth.data.upsertMigratedAccounts,
      args,
    );
  },
});

export const importAuthMembers = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    return (ctx as any).runMutation(
      components.betterAuth.data.upsertMigratedMembers,
      args,
    );
  },
});

export const importAuthInvitations = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    return (ctx as any).runMutation(
      components.betterAuth.data.upsertMigratedInvitations,
      args,
    );
  },
});

export const importAuthApiKeys = mutationGeneric({
  args: {
    secret: v.string(),
    rows: v.array(v.any()),
  },
  handler: async (ctx, args) => {
    assertMigrationSecret(args.secret);
    return (ctx as any).runMutation(
      (components.betterAuth.data as any).upsertMigratedApiKeys,
      args,
    );
  },
});
