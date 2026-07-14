/* eslint-disable @typescript-eslint/no-explicit-any */
import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import { getApiKeyModeForPlan } from "../generationConfig";
import { getActiveSubscription, getOrgPlanLimits } from "../orgPlanLimits";
import { getOrgStats } from "../orgStats";
import {
  getDisplayThumbnailFields,
  getDisplayThumbnailUrl,
} from "../thumbnailUrls";
import { MAX_ROWS, asCtx, requireOrg } from "./shared";

const DASHBOARD_ANALYTICS_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function utcDayStart(timestamp: number) {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function buildDashboardAnalytics(args: {
  prompts: any[];
  thumbnails: any[];
  now: number;
}) {
  const todayStart = utcDayStart(args.now);
  const start = todayStart - (DASHBOARD_ANALYTICS_DAYS - 1) * DAY_MS;
  const end = todayStart + DAY_MS;
  const days = Array.from({ length: DASHBOARD_ANALYTICS_DAYS }, (_, index) => {
    const date = utcDayKey(start + index * DAY_MS);
    return {
      date,
      promptCount: 0,
      thumbnailCount: 0,
      cumulativeThumbnails: 0,
      active: false,
    };
  });
  const byDate = new Map(days.map((day) => [day.date, day]));

  for (const prompt of args.prompts) {
    if (prompt.deletedAt) continue;
    if (prompt.createdAt < start || prompt.createdAt >= end) continue;
    const day = byDate.get(utcDayKey(prompt.createdAt));
    if (day) {
      day.promptCount += 1;
      day.active = true;
    }
  }

  for (const thumbnail of args.thumbnails) {
    if (thumbnail.status !== "succeeded") continue;
    if (thumbnail.hiddenAt || thumbnail.publicHiddenAt) continue;
    if (thumbnail.createdAt < start || thumbnail.createdAt >= end) continue;
    const day = byDate.get(utcDayKey(thumbnail.createdAt));
    if (day) {
      day.thumbnailCount += 1;
    }
  }

  let cumulativeThumbnails = 0;
  for (const day of days) {
    cumulativeThumbnails += day.thumbnailCount;
    day.cumulativeThumbnails = cumulativeThumbnails;
  }

  const promptsLast30Days = days.reduce(
    (total, day) => total + day.promptCount,
    0,
  );
  const thumbnailsLast30Days = days.reduce(
    (total, day) => total + day.thumbnailCount,
    0,
  );

  return {
    days,
    activeDays: days.filter((day) => day.active).length,
    promptsLast30Days,
    thumbnailsLast30Days,
    averageThumbnailsPerPrompt:
      promptsLast30Days > 0 ? thumbnailsLast30Days / promptsLast30Days : 0,
  };
}

function toPromptRow(prompt: any, generations: any[]) {
  return {
    id: String(prompt._id),
    orgId: prompt.organizationId,
    name: prompt.title,
    textPrompt: prompt.prompt,
    personIds: prompt.personIds ?? [],
    inspirationIds: prompt.inspirationIds ?? [],
    userImageIds: prompt.userImageIds ?? [],
    userImages: [],
    createdAt: new Date(prompt.createdAt).toISOString(),
    generations,
    _count: { generations: generations.length },
  };
}

function toThumbnailRow(thumbnail: any, noWatermark: boolean) {
  return {
    id: String(thumbnail._id),
    ...getDisplayThumbnailFields(thumbnail, {
      canViewCleanImage: noWatermark,
    }),
    status: thumbnail.status,
    error: thumbnail.errorMessage ?? null,
    model: thumbnail.model ?? null,
    generationTimeMs: null,
    createdAt: new Date(thumbnail.createdAt).toISOString(),
  };
}

async function generationsForPrompt(
  ctx: any,
  prompt: any,
  noWatermark: boolean,
) {
  const id = prompt?._id;
  if (!id) return [];
  const promptId = String(id);

  const generations = await ctx.db
    .query("generations")
    .withIndex("by_prompt", (q: any) => q.eq("promptId", id))
    .order("desc")
    .take(MAX_ROWS);

  return Promise.all(
    generations.map(async (generation: any, index: number) => {
      const thumbnails = await ctx.db
        .query("thumbnails")
        .withIndex("by_generation", (q: any) =>
          q.eq("generationId", generation._id),
        )
        .order("desc")
        .take(MAX_ROWS);

      let baseImageUrl = generation.baseImageUrl ?? null;
      if (generation.baseThumbnailId) {
        const baseThumbnailId = ctx.db.normalizeId(
          "thumbnails",
          generation.baseThumbnailId,
        );
        const baseThumbnail = baseThumbnailId
          ? await ctx.db.get(baseThumbnailId)
          : null;
        if (baseThumbnail?.organizationId === generation.organizationId) {
          baseImageUrl = getDisplayThumbnailUrl(baseThumbnail, {
            canViewCleanImage: noWatermark,
          });
        }
      }

      return {
        id: String(generation._id),
        promptId: generation.promptId ? String(generation.promptId) : promptId,
        generationNumber: index + 1,
        pendingCount: thumbnails.filter((thumbnail: any) =>
          ["pending", "processing"].includes(thumbnail.status),
        ).length,
        textPrompt: generation.prompt,
        personIds: generation.personIds ?? [],
        inspirationIds: generation.inspirationIds ?? [],
        userImageIds: generation.userImageIds ?? [],
        userImages: [],
        personImageUrls: generation.personImageUrls ?? [],
        inspirationUrls: generation.inspirationUrls ?? [],
        baseImageUrl,
        baseThumbnailId: generation.baseThumbnailId
          ? String(generation.baseThumbnailId)
          : null,
        editPrompt: generation.editPrompt ?? null,
        model: generation.model,
        aspectRatio: generation.aspectRatio ?? "16:9",
        createdAt: new Date(generation.createdAt).toISOString(),
        thumbnails: thumbnails.map((thumbnail: any) =>
          toThumbnailRow(thumbnail, noWatermark),
        ),
      };
    }),
  );
}

export const listThumbnails = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const limits = await getOrgPlanLimits(appCtx, org.id);
    const noWatermark = Boolean(limits.noWatermark);
    const prompts = await ctx.db
      .query("prompts")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .take(60);

    const rows = await Promise.all(
      prompts
        .filter((prompt: any) => !prompt.deletedAt)
        .map(async (prompt: any) =>
          toPromptRow(
            prompt,
            await generationsForPrompt(appCtx, prompt, noWatermark),
          ),
        ),
    );

    return { org, prompts: rows };
  },
});

export const listGenerations = queryGeneric({
  args: {
    orgSlug: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    starred: v.optional(v.boolean()),
    refreshNonce: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const limits = await getOrgPlanLimits(appCtx, org.id);
    const cursorCreatedAt = args.cursor ? Number(args.cursor) : null;
    const batchSize = Math.min(limit * 3, 100);
    let nextCreatedAt = Number.isFinite(cursorCreatedAt)
      ? cursorCreatedAt
      : null;
    let hasMoreRows = false;
    const maxBatches = Math.ceil(MAX_ROWS / batchSize);
    const rows: any[] = [];
    const docCache = new Map<string, Promise<any>>();
    const getCachedDoc = async (id: any) => {
      const key = String(id);
      let entry = docCache.get(key);
      if (!entry) {
        entry = ctx.db.get(id);
        docCache.set(key, entry);
      }
      return entry;
    };

    const loadGenerationRows = async (
      remainingBatches: number,
    ): Promise<void> => {
      if (remainingBatches <= 0 || rows.length >= limit + 1) return;

      const thumbnails = await ctx.db
        .query("thumbnails")
        .withIndex("by_organization_created", (q: any) => {
          const organizationQuery = q.eq("organizationId", org.id);
          return nextCreatedAt == null
            ? organizationQuery
            : organizationQuery.lt("createdAt", nextCreatedAt);
        })
        .order("desc")
        .take(batchSize);

      hasMoreRows = thumbnails.length === batchSize;
      if (thumbnails.length === 0) return;

      nextCreatedAt = thumbnails[thumbnails.length - 1]?.createdAt ?? null;

      const visibleThumbnails = thumbnails.filter((thumbnail: any) => {
        if (thumbnail.hiddenAt) return false;
        if (!thumbnail.url && !thumbnail.watermarkedUrl) return false;
        if (args.starred != null) {
          return Boolean(thumbnail.starredAt) === args.starred;
        }
        return true;
      });

      const batchRows = await Promise.all(
        visibleThumbnails.map(async (thumbnail: any) => {
          const generation = thumbnail.generationId
            ? await getCachedDoc(thumbnail.generationId)
            : null;
          const prompt =
            generation?.promptId != null
              ? await getCachedDoc(generation.promptId)
              : null;

          if (generation?.hiddenAt || prompt?.deletedAt) return null;

          const imageUrl = getDisplayThumbnailUrl(thumbnail, {
            canViewCleanImage: limits.noWatermark,
          });

          return {
            cursor: thumbnail.createdAt,
            id: String(thumbnail._id),
            imageUrl: imageUrl ?? "",
            isStarred: Boolean(thumbnail.starredAt),
            createdAt: new Date(thumbnail.createdAt).toISOString(),
            generation: {
              id: generation ? String(generation._id) : String(thumbnail._id),
              promptId: prompt ? String(prompt._id) : "",
              generationNumber: generation?.generationNumber ?? 1,
              textPrompt: generation?.prompt ?? prompt?.prompt ?? "",
              aspectRatio: generation?.aspectRatio ?? "16:9",
            },
          };
        }),
      );

      rows.push(...batchRows.filter(Boolean));
      await loadGenerationRows(remainingBatches - 1);
    };

    await loadGenerationRows(maxBatches);

    const pageRows = rows.slice(0, limit);
    const items = pageRows.map(({ cursor: _cursor, ...row }) => row);
    const hasNextPage = rows.length > limit || hasMoreRows;

    return {
      items,
      nextCursor:
        hasNextPage && pageRows.length > 0
          ? String(pageRows[pageRows.length - 1]?.cursor)
          : undefined,
    };
  },
});

export const thumbnailDetail = queryGeneric({
  args: { orgSlug: v.string(), promptId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const promptId = ctx.db.normalizeId("prompts", args.promptId);
    const prompt = promptId ? await ctx.db.get(promptId) : null;
    if (!prompt || prompt.organizationId !== org.id) {
      throw new Error("Prompt not found");
    }
    if (!promptId) throw new Error("Prompt not found");

    const limits = await getOrgPlanLimits(appCtx, org.id);

    return {
      org,
      prompt: toPromptRow(
        prompt,
        await generationsForPrompt(appCtx, prompt, Boolean(limits.noWatermark)),
      ),
    };
  },
});

export const orgSummary = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const now = Date.now();
    const analyticsStart =
      utcDayStart(now) - (DASHBOARD_ANALYTICS_DAYS - 1) * DAY_MS;
    const [limits, orgStats, recentThumbnails] = await Promise.all([
      getOrgPlanLimits(appCtx, org.id),
      getOrgStats(appCtx, org.id),
      ctx.db
        .query("thumbnails")
        .withIndex("by_organization_created", (q: any) =>
          q.eq("organizationId", org.id).gte("createdAt", analyticsStart),
        )
        .order("desc")
        .take(MAX_ROWS),
    ]);
    const noWatermark = Boolean(limits.noWatermark);

    let promptCount: number;
    let thumbnailCount: number;
    let analyticsPrompts: any[];
    let recentPromptCandidates: any[];
    if (orgStats) {
      const [recentPromptRows, windowPrompts] = await Promise.all([
        ctx.db
          .query("prompts")
          .withIndex("by_organization_created", (q: any) =>
            q.eq("organizationId", org.id),
          )
          .order("desc")
          .take(50),
        ctx.db
          .query("prompts")
          .withIndex("by_organization_created", (q: any) =>
            q.eq("organizationId", org.id).gte("createdAt", analyticsStart),
          )
          .take(MAX_ROWS),
      ]);
      promptCount = orgStats.promptCount;
      thumbnailCount = orgStats.succeededThumbnailCount;
      analyticsPrompts = windowPrompts;
      recentPromptCandidates = recentPromptRows;
    } else {
      // Legacy fallback for orgs without a stats row yet (no counted write
      // since orgStats shipped): capped scans, same behavior as before.
      const [prompts, succeeded] = await Promise.all([
        ctx.db
          .query("prompts")
          .withIndex("by_organization_created", (q: any) =>
            q.eq("organizationId", org.id),
          )
          .order("desc")
          .take(MAX_ROWS),
        ctx.db
          .query("thumbnails")
          .withIndex("by_organization_status", (q: any) =>
            q.eq("organizationId", org.id).eq("status", "succeeded"),
          )
          .take(MAX_ROWS),
      ]);
      promptCount = prompts.length;
      thumbnailCount = succeeded.length;
      analyticsPrompts = prompts;
      recentPromptCandidates = prompts;
    }

    const recentPrompts = await Promise.all(
      recentPromptCandidates
        .filter((prompt: any) => !prompt.deletedAt)
        .slice(0, 3)
        .map(async (prompt: any) =>
          toPromptRow(
            prompt,
            await generationsForPrompt(appCtx, prompt, noWatermark),
          ),
        ),
    );

    return {
      org,
      stats: {
        thumbnailCount,
        promptCount,
      },
      analytics: buildDashboardAnalytics({
        prompts: analyticsPrompts,
        thumbnails: recentThumbnails,
        now,
      }),
      recentPrompts,
    };
  },
});

export const getCredits = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const [balance, transactions, apiKeys, subscription] = await Promise.all([
      ctx.db
        .query("creditBalances")
        .withIndex("by_organization", (q: any) =>
          q.eq("organizationId", org.id),
        )
        .first(),
      ctx.db
        .query("creditTransactions")
        .withIndex("by_organization_created", (q: any) =>
          q.eq("organizationId", org.id),
        )
        .order("desc")
        .take(50),
      ctx.db
        .query("customProviderApiKeys")
        .withIndex("by_organization", (q: any) =>
          q.eq("organizationId", org.id),
        )
        .take(MAX_ROWS),
      getActiveSubscription(appCtx, org.id),
    ]);
    const plan = subscription?.plan ?? "free";
    const limits = await getOrgPlanLimits(appCtx, org.id);

    return {
      plan,
      balance: balance?.balance ?? 0,
      transactions: transactions.map((transaction: any) => ({
        id: String(transaction._id),
        orgId: transaction.organizationId,
        amount: transaction.amount,
        type: transaction.type,
        createdAt: new Date(transaction.createdAt).toISOString(),
      })),
      maxGenerations: limits.maxGenerations,
      gptImageAccess: limits.gptImageAccess,
      apiKeyMode: getApiKeyModeForPlan(plan),
      hasCustomApiKeys: {
        openai: apiKeys.some((key: any) => key.provider === "openai"),
        gemini: apiKeys.some((key: any) => key.provider === "gemini"),
        apiyi: apiKeys.some((key: any) => key.provider === "apiyi"),
      },
    };
  },
});

export const createThumbnailGeneration = mutationGeneric({
  args: {
    orgSlug: v.string(),
    promptId: v.optional(v.string()),
    prompt: v.string(),
    model: v.string(),
    aspectRatio: v.string(),
    count: v.optional(v.number()),
    personIds: v.optional(v.array(v.string())),
    inspirationIds: v.optional(v.array(v.string())),
    userImageIds: v.optional(v.array(v.string())),
    baseImageUrl: v.optional(v.string()),
    baseThumbnailId: v.optional(v.string()),
    editPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    void ctx;
    void args;
    throw new Error("Use editor:createThumbnailGeneration");
  },
});

export const updatePromptName = mutationGeneric({
  args: { orgSlug: v.string(), promptId: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const promptId = ctx.db.normalizeId("prompts", args.promptId);
    const prompt = promptId ? await ctx.db.get(promptId) : null;
    if (!prompt || prompt.organizationId !== org.id) {
      throw new Error("Prompt not found");
    }
    if (!promptId) throw new Error("Prompt not found");

    const name = args.name.trim();
    await ctx.db.patch(promptId, {
      title: name || "Untitled",
      updatedAt: Date.now(),
    });

    return { id: String(promptId), name: name || "Untitled" };
  },
});

export const deletePrompt = mutationGeneric({
  args: { orgSlug: v.string(), promptId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const promptId = ctx.db.normalizeId("prompts", args.promptId);
    const prompt = promptId ? await ctx.db.get(promptId) : null;
    if (!prompt || prompt.organizationId !== org.id) {
      throw new Error("Prompt not found");
    }
    if (!promptId) throw new Error("Prompt not found");

    await ctx.db.patch(promptId, {
      updatedAt: Date.now(),
      deletedAt: Date.now(),
    });
    return { id: String(promptId) };
  },
});
