/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { api, components, internal } from "./_generated/api";
import { authComponent } from "./auth/config";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import {
  actionGeneric,
  internalMutationGeneric,
  mutationGeneric,
  queryGeneric,
} from "convex/server";
import { v } from "convex/values";
import { z } from "zod";
import { getOrgPlanLimits } from "./orgPlanLimits";
import { getDisplayThumbnailUrl } from "./thumbnailUrls";

type Ctx = {
  db: any;
  runQuery: (fn: any, args: any) => Promise<any>;
};

const MAX_ROWS = 500;
const RUNTIME_TEXT_MODEL = "gemini-3.1-flash-lite";
const CREDIT_COST_PER_AUTO_NAME = 0.1;

const TitlesSchema = z.object({
  titles: z.array(z.string().min(3)).length(3),
});

const asCtx = (ctx: unknown) => ctx as Ctx;

async function requireUser(ctx: Ctx) {
  const user = await authComponent.getAuthUser(ctx as never);
  return { id: String(user._id) };
}

async function requireOrg(ctx: Ctx, orgSlug: string) {
  const user = await requireUser(ctx);
  const org = await ctx.runQuery(
    components.betterAuth.data.getOrganizationBySlug,
    { slug: orgSlug },
  );
  if (!org) throw new Error("Organization not found");

  const member = await ctx.runQuery(
    components.betterAuth.data.getMemberByOrganizationAndUser,
    {
      organizationId: String(org._id),
      userId: user.id,
    },
  );
  if (!member) throw new Error("Organization not found");

  return { id: String(org._id), slug: org.slug, name: org.name };
}

function toIso(value: number) {
  return new Date(value).toISOString();
}

function toOptionalIso(value: number | null | undefined) {
  return typeof value === "number" ? toIso(value) : null;
}

async function getOrgNoWatermark(ctx: Ctx, orgId: string) {
  const limits = await getOrgPlanLimits(ctx, orgId);
  return limits.noWatermark;
}

function thumbnailRow(thumbnail: any, noWatermark: boolean) {
  if (!thumbnail) return null;
  return {
    id: String(thumbnail._id),
    imageUrl: getDisplayThumbnailUrl(thumbnail, {
      canViewCleanImage: noWatermark,
    }),
  };
}

async function generationThumbnails(
  ctx: Ctx,
  generationId: any,
  noWatermark: boolean,
) {
  const thumbnails = await ctx.db
    .query("thumbnails")
    .withIndex("by_generation", (q: any) => q.eq("generationId", generationId))
    .order("desc")
    .take(MAX_ROWS);

  return thumbnails.map((thumbnail: any) => ({
    id: String(thumbnail._id),
    imageUrl: getDisplayThumbnailUrl(thumbnail, {
      canViewCleanImage: noWatermark,
    }),
    createdAt: toIso(thumbnail.createdAt),
  }));
}

async function firstGenerationThumbnail(ctx: Ctx, generationId: any) {
  const thumbnails = await ctx.db
    .query("thumbnails")
    .withIndex("by_generation", (q: any) => q.eq("generationId", generationId))
    .order("desc")
    .take(MAX_ROWS);

  return thumbnails.find(
    (thumbnail: any) =>
      !thumbnail.hiddenAt && (thumbnail.url || thumbnail.watermarkedUrl),
  );
}

async function videoTitles(ctx: Ctx, videoId: any) {
  const rows = await ctx.db
    .query("videoTitles")
    .withIndex("by_video", (q: any) => q.eq("videoId", videoId))
    .order("desc")
    .take(MAX_ROWS);

  return rows.sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0));
}

async function videoGenerations(ctx: Ctx, videoId: any) {
  return ctx.db
    .query("videoGenerations")
    .withIndex("by_video", (q: any) => q.eq("videoId", videoId))
    .order("desc")
    .take(MAX_ROWS);
}

function withFallbackSlots(rows: any[]) {
  const usedSlots = new Set<number>(
    rows
      .map((row: any) => row.slot)
      .filter((slot: unknown): slot is number => typeof slot === "number"),
  );
  const fallbackSlots = [1, 2, 3].filter((slot) => !usedSlots.has(slot));
  let fallbackIndex = 0;

  return rows.map((row: any) => ({
    ...row,
    slot:
      typeof row.slot === "number"
        ? row.slot
        : row.slot === null
          ? null
        : (fallbackSlots[fallbackIndex++] ?? null),
  }));
}

async function listVideoGenerations(
  ctx: Ctx,
  videoId: any,
  noWatermark: boolean,
) {
  const rows = withFallbackSlots(await videoGenerations(ctx, videoId));
  const rowsWithThumbnails = await Promise.all(
    rows.map(async (row: any) => {
      const selectedThumbnail = row.selectedThumbnailId
        ? await ctx.db.get(row.selectedThumbnailId)
        : null;
      const previewThumbnail =
        selectedThumbnail && !selectedThumbnail.hiddenAt
          ? selectedThumbnail
          : await firstGenerationThumbnail(ctx, row.generationId);
      return {
        id: String(row._id),
        slot: row.slot ?? null,
        selectedThumbnail: thumbnailRow(previewThumbnail, noWatermark),
      };
    }),
  );

  return rowsWithThumbnails
    .filter((row) => row.slot != null)
    .sort((a, b) => Number(a.slot) - Number(b.slot))
    .slice(0, 3);
}

async function toListItem(ctx: Ctx, video: any, noWatermark: boolean) {
  const generations = await listVideoGenerations(ctx, video._id, noWatermark);
  const count = await videoGenerations(ctx, video._id);

  return {
    id: video.legacyId ?? String(video._id),
    internalTitle: video.title,
    youtubeUrl: video.youtubeUrl ?? null,
    description: video.description ?? "",
    closedAt: toOptionalIso(video.closedAt),
    createdAt: toIso(video.createdAt),
    updatedAt: toIso(video.updatedAt),
    generations,
    _count: { generations: count.length },
  };
}

async function requireVideo(ctx: Ctx, orgId: string, videoId: string) {
  const id = ctx.db.normalizeId("videos", videoId);
  const videoById = id ? await ctx.db.get(id) : null;
  const video =
    videoById ??
    (await ctx.db
      .query("videos")
      .withIndex("by_legacy", (q: any) => q.eq("legacyId", videoId))
      .first());
  if (!video || video.organizationId !== orgId || video.deletedAt) {
    throw new Error("Video not found");
  }
  return video;
}

function pickFirstFreeSlot(used: Set<number>) {
  for (const slot of [1, 2, 3]) {
    if (!used.has(slot)) return slot;
  }
  return null;
}

export const list = queryGeneric({
  args: {
    orgSlug: v.string(),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    refreshNonce: v.optional(v.number()),
    finished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const org = await requireOrg(appCtx, args.orgSlug);
    const noWatermark = await getOrgNoWatermark(appCtx, org.id);
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 100);
    const cursorCreatedAt = args.cursor ? Number(args.cursor) : null;
    const batchSize = Math.min(limit * 3, 100);
    let nextCreatedAt = Number.isFinite(cursorCreatedAt)
      ? cursorCreatedAt
      : null;
    const scanState = { hasMoreRows: false };
    const maxBatches = Math.ceil(MAX_ROWS / batchSize);
    const rows: any[] = [];

    const loadVideoRows = async (remainingBatches: number): Promise<void> => {
      if (remainingBatches <= 0 || rows.length >= limit + 1) return;

      const videos = await ctx.db
        .query("videos")
        .withIndex("by_organization_created", (q: any) => {
          const organizationQuery = q.eq("organizationId", org.id);
          return nextCreatedAt == null
            ? organizationQuery
            : organizationQuery.lt("createdAt", nextCreatedAt);
        })
        .order("desc")
        .take(batchSize);

      scanState.hasMoreRows = videos.length === batchSize;
      if (videos.length === 0) return;

      nextCreatedAt = videos[videos.length - 1]?.createdAt ?? null;
      rows.push(
        ...videos.filter(
          (video: any) =>
            !video.deletedAt &&
            (args.finished === undefined ||
              Boolean(video.closedAt) === args.finished),
        ),
      );

      await loadVideoRows(remainingBatches - 1);
    };

    await loadVideoRows(maxBatches);

    const pageRows = rows.slice(0, limit);
    const cursorRow = pageRows[pageRows.length - 1] as
      | { createdAt: number }
      | undefined;
    const nextCursor =
      rows.length > limit
        ? cursorRow?.createdAt
        : scanState.hasMoreRows
          ? nextCreatedAt
          : undefined;

    return {
      items: await Promise.all(
        pageRows.map(async (video: any) =>
          toListItem(appCtx, video, noWatermark),
        ),
      ),
      nextCursor: nextCursor === undefined ? undefined : String(nextCursor),
    };
  },
});

export const detail = queryGeneric({
  args: { orgSlug: v.string(), videoId: v.string() },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const org = await requireOrg(appCtx, args.orgSlug);
    const video = await requireVideo(appCtx, org.id, args.videoId);
    const noWatermark = await getOrgNoWatermark(appCtx, org.id);
    const rows = withFallbackSlots(await videoGenerations(appCtx, video._id));
    const titles = await videoTitles(appCtx, video._id);

    const generations = await Promise.all(
      rows.map(async (row: any, index: number) => {
        const [generation, selectedThumbnail, thumbnails] = await Promise.all([
          ctx.db.get(row.generationId),
          row.selectedThumbnailId ? ctx.db.get(row.selectedThumbnailId) : null,
          generationThumbnails(appCtx, row.generationId, noWatermark),
        ]);
        const previewThumbnail =
          selectedThumbnail && !selectedThumbnail.hiddenAt
            ? selectedThumbnail
            : await firstGenerationThumbnail(appCtx, row.generationId);

        return {
          id: String(row._id),
          slot: row.slot ?? null,
          addedAt: toIso(row.createdAt),
          selectedThumbnailId: row.selectedThumbnailId
            ? String(row.selectedThumbnailId)
            : null,
          selectedThumbnail: thumbnailRow(previewThumbnail, noWatermark),
          generation: {
            id: generation ? String(generation._id) : String(row.generationId),
            promptId: generation?.promptId ? String(generation.promptId) : null,
            textPrompt: generation?.prompt ?? "",
            generationNumber: index + 1,
            thumbnails,
          },
          titles:
            index === 0
              ? titles.map((title: any) => ({
                  id: String(title._id),
                  text: title.title,
                  thumbnailId: row.selectedThumbnailId
                    ? String(row.selectedThumbnailId)
                    : "",
                  createdAt: toIso(title.createdAt),
                }))
              : [],
        };
      }),
    );

    return {
      id: video.legacyId ?? String(video._id),
      organizationId: org.id,
      internalTitle: video.title,
      youtubeUrl: video.youtubeUrl ?? null,
      description: video.description ?? "",
      closedAt: toOptionalIso(video.closedAt),
      createdAt: toIso(video.createdAt),
      updatedAt: toIso(video.updatedAt),
      generations,
    };
  },
});

export const create = mutationGeneric({
  args: {
    orgSlug: v.string(),
    youtubeUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    internalTitle: v.optional(v.string()),
    generationIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const now = Date.now();
    const id = await ctx.db.insert("videos", {
      organizationId: org.id,
      title: args.internalTitle ?? "",
      youtubeUrl: args.youtubeUrl,
      description: args.description ?? "",
      createdAt: now,
      updatedAt: now,
    });

    await Promise.all(
      (args.generationIds ?? [])
        .slice(0, 3)
        .map(async (generationId, index) => {
          const normalizedGenerationId = ctx.db.normalizeId(
            "generations",
            generationId,
          );
          const generation = normalizedGenerationId
            ? await ctx.db.get(normalizedGenerationId)
            : null;
          if (!generation || generation.organizationId !== org.id) return;

          const thumbnails = await ctx.db
            .query("thumbnails")
            .withIndex("by_generation", (q: any) =>
              q.eq("generationId", normalizedGenerationId),
            )
            .order("desc")
            .take(MAX_ROWS);
          const selectedThumbnail = thumbnails.find(
            (thumbnail: any) => !thumbnail.hiddenAt,
          );

          await ctx.db.insert("videoGenerations", {
            organizationId: org.id,
            videoId: id,
            generationId: normalizedGenerationId,
            slot: index + 1,
            selectedThumbnailId: selectedThumbnail?._id,
            createdAt: now,
            updatedAt: now,
          });
        }),
    );

    return { id: String(id), internalTitle: args.internalTitle ?? "" };
  },
});

export const update = mutationGeneric({
  args: {
    orgSlug: v.string(),
    videoId: v.string(),
    youtubeUrl: v.optional(v.string()),
    description: v.optional(v.string()),
    internalTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const video = await requireVideo(asCtx(ctx), org.id, args.videoId);
    await ctx.db.patch(video._id, {
      ...(args.youtubeUrl !== undefined ? { youtubeUrl: args.youtubeUrl } : {}),
      ...(args.description !== undefined
        ? { description: args.description }
        : {}),
      ...(args.internalTitle !== undefined
        ? { title: args.internalTitle }
        : {}),
      updatedAt: Date.now(),
    });

    return {
      id: String(video._id),
      internalTitle: args.internalTitle ?? video.title,
    };
  },
});

export const saveGeneratedTitles = internalMutationGeneric({
  args: {
    orgId: v.string(),
    videoId: v.string(),
    titles: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const video = await requireVideo(appCtx, args.orgId, args.videoId);
    const now = Date.now();
    const existingTitles = await videoTitles(appCtx, video._id);

    await Promise.all(
      existingTitles.map(async (title: any) => ctx.db.delete(title._id)),
    );
    await Promise.all(
      args.titles.map(async (title, index) =>
        ctx.db.insert("videoTitles", {
          organizationId: args.orgId,
          videoId: video._id,
          title,
          score: args.titles.length - index,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );
    await ctx.db.patch(video._id, {
      title: args.titles[0] ?? video.title,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const generateTitles = actionGeneric({
  args: { orgSlug: v.string(), videoId: v.string() },
  handler: async (ctx, args) => {
    const detail = await ctx.runQuery((api as any).video.detail, {
      orgSlug: args.orgSlug,
      videoId: args.videoId,
    });

    const slotGenerations = [1, 2, 3].map((slot) =>
      detail.generations.find((generation: any) => generation.slot === slot),
    );

    if (
      slotGenerations.length !== 3 ||
      slotGenerations.some(
        (generation) => !generation?.selectedThumbnail?.imageUrl,
      )
    ) {
      throw new Error("Select exactly 3 generations before generating titles");
    }

    const contextParts: string[] = [];
    if (detail.description.trim()) {
      contextParts.push(`Video description:\n${detail.description.trim()}`);
    }
    slotGenerations.forEach((generation, index) => {
      contextParts.push(
        `Thumbnail ${index + 1} generation prompt:\n${generation.generation.textPrompt}`,
      );
    });

    const result = await generateObject({
      model: google(RUNTIME_TEXT_MODEL),
      schema: TitlesSchema,
      messages: [
        {
          role: "user",
          content: [
            ...slotGenerations.map((generation) => ({
              type: "image" as const,
              image: generation.selectedThumbnail.imageUrl,
            })),
            {
              type: "text",
              text: `<role>
You are an expert YouTube copywriter specialized in creating viral, high-CTR titles.
Analyze the three thumbnail options and context to generate optimized titles for the video.
</role>

<thinking_process>
Before generating titles, mentally analyze:
1. Key visual elements: What in the thumbnails can create a catchy title?
2. Dominant emotion: What emotions do these thumbnails convey? (surprise, curiosity, FOMO, etc.)
3. Unique angle: What differentiates this content from others?
4. Power words: Which high-impact words match this visual?
5. Optimal format: Which viral template best fits this content?
</thinking_process>

<viral_formulas>
Use these proven formulas (adapt to the language detected in the context):

**Curiosity/Mystery**:
- "The [X] Nobody Knows About (Here's Why)"
- "Why [surprising claim]..."
- "[X] Doesn't Want You to Know [secret]"

**Challenge/Transformation**:
- "I [action] for [duration] — Here's What Happened"
- "[Result] in [time] with [method]"

**Numbers/Listicles**:
- "[Odd number] [things] That [result]"
- "Top [N] [topics] (#[X] Will Shock You)"

**Comparison/Confrontation**:
- "[A] vs [B] — The Winner Is [surprising]"
- "Stop [bad practice] — Do This Instead"

**Authority/Insider**:
- "Ex-[profession] Reveals [secret]"
- "[Expert] Told Me [shocking truth]"

**Regret/Prevention**:
- "I Wish I Knew This BEFORE [action]"
- "Don't [do X] Without Watching This"
</viral_formulas>

<rules>
- Length: 40-60 characters optimal (max 70 to avoid truncation)
- Language: ALL titles in the SAME language as the context/prompt (auto-detect from context)
- Authenticity: Titles must match the thumbnail visual content
- No empty clickbait: Each title must be deliverable by the content
- Capitalization: First Letter Of Each Word Capitalized (YouTube style)
- Punctuation: Use | : — to separate ideas effectively
- No emojis in titles
- Generate exactly 3 varied titles covering different emotional triggers
- Put the strongest title first. It will become the video's title.
- Each title must be distinct in approach and formula used
</rules>

<context>
${contextParts.join("\n\n")}
</context>`,
            },
          ],
        },
      ],
    });

    await ctx.runMutation((internal as any).credits.deduct, {
      orgId: detail.organizationId,
      amount: CREDIT_COST_PER_AUTO_NAME,
      type: "auto_name",
      reason: "video_titles",
      referenceId: args.videoId,
    });

    await ctx.runMutation((internal as any).video.saveGeneratedTitles, {
      orgId: detail.organizationId,
      videoId: args.videoId,
      titles: result.object.titles,
    });

    return { success: true };
  },
});

export const remove = mutationGeneric({
  args: { orgSlug: v.string(), videoId: v.string() },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const video = await requireVideo(asCtx(ctx), org.id, args.videoId);
    await ctx.db.patch(video._id, {
      deletedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const setClosed = mutationGeneric({
  args: {
    orgSlug: v.string(),
    videoId: v.string(),
    closed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const video = await requireVideo(asCtx(ctx), org.id, args.videoId);
    const now = Date.now();
    await ctx.db.patch(video._id, {
      closedAt: args.closed ? now : undefined,
      updatedAt: now,
    });
    return {
      id: video.legacyId ?? String(video._id),
      closedAt: args.closed ? toIso(now) : null,
    };
  },
});

export const addThumbnail = mutationGeneric({
  args: {
    orgSlug: v.string(),
    thumbnailId: v.string(),
    videoId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const org = await requireOrg(appCtx, args.orgSlug);
    const thumbnailId = ctx.db.normalizeId("thumbnails", args.thumbnailId);
    const thumbnail = thumbnailId ? await ctx.db.get(thumbnailId) : null;
    const generation = thumbnail?.generationId
      ? await ctx.db.get(thumbnail.generationId)
      : null;

    if (
      !thumbnail ||
      !generation ||
      thumbnail.organizationId !== org.id ||
      generation.organizationId !== org.id
    ) {
      throw new Error("Thumbnail not found");
    }

    let video =
      args.videoId != null
        ? await requireVideo(appCtx, org.id, args.videoId)
        : null;

    const now = Date.now();
    if (!video) {
      const id = await ctx.db.insert("videos", {
        organizationId: org.id,
        title:
          generation.prompt.split(/\s+/).slice(0, 5).join(" ") || "New video",
        description: "",
        createdAt: now,
        updatedAt: now,
      });
      video = await ctx.db.get(id);
    }

    if (args.videoId != null && video.closedAt) {
      throw new Error("Video is finished");
    }

    const existingRows = await videoGenerations(appCtx, video._id);
    const existing = existingRows.find(
      (row: any) => String(row.generationId) === String(generation._id),
    );
    const usedSlots = new Set<number>(
      existingRows
        .map((row: any) => row.slot)
        .filter((slot: unknown): slot is number => typeof slot === "number"),
    );
    const freeSlot = pickFirstFreeSlot(usedSlots);
    if (!existing && freeSlot == null) {
      throw new Error("Video already has 3 thumbnails");
    }

    const videoGenerationId = existing
      ? existing._id
      : await ctx.db.insert("videoGenerations", {
          organizationId: org.id,
          videoId: video._id,
          generationId: generation._id,
          slot: freeSlot ?? undefined,
          selectedThumbnailId: thumbnail._id,
          createdAt: now,
          updatedAt: now,
        });

    if (existing) {
      await ctx.db.patch(existing._id, {
        selectedThumbnailId: thumbnail._id,
        ...(existing.slot == null && freeSlot != null
          ? { slot: freeSlot }
          : {}),
        updatedAt: now,
      });
    }

    const filledSlots =
      usedSlots.size +
      (!existing || (existing.slot == null && freeSlot != null) ? 1 : 0);
    await ctx.db.patch(video._id, {
      ...(filledSlots >= 3 ? { closedAt: video.closedAt ?? now } : {}),
      updatedAt: now,
    });

    return {
      videoId: video.legacyId ?? String(video._id),
      videoGenerationId: String(videoGenerationId),
      assignedSlot: existing?.slot ?? freeSlot,
      selectedThumbnailId: String(thumbnail._id),
    };
  },
});

export const removeGeneration = mutationGeneric({
  args: { orgSlug: v.string(), videoGenerationId: v.string() },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const videoGenerationId = ctx.db.normalizeId(
      "videoGenerations",
      args.videoGenerationId,
    );
    const row = videoGenerationId ? await ctx.db.get(videoGenerationId) : null;
    if (!row || row.organizationId !== org.id) {
      throw new Error("Video generation not found");
    }

    await ctx.db.delete(row._id);
    await ctx.db.patch(row.videoId, { updatedAt: Date.now() });
    return { success: true };
  },
});

export const setGenerationSlot = mutationGeneric({
  args: {
    orgSlug: v.string(),
    videoId: v.string(),
    videoGenerationId: v.string(),
    slot: v.union(v.literal(1), v.literal(2), v.literal(3), v.null()),
  },
  handler: async (ctx, args) => {
    const appCtx = asCtx(ctx);
    const org = await requireOrg(appCtx, args.orgSlug);
    const video = await requireVideo(appCtx, org.id, args.videoId);
    const videoGenerationId = ctx.db.normalizeId(
      "videoGenerations",
      args.videoGenerationId,
    );
    const target = videoGenerationId
      ? await ctx.db.get(videoGenerationId)
      : null;
    if (!target || String(target.videoId) !== String(video._id)) {
      throw new Error("Video generation not found");
    }

    if (args.slot != null) {
      const rows = await videoGenerations(appCtx, video._id);
      const occupant = rows.find(
        (row: any) =>
          row.slot === args.slot && String(row._id) !== String(target._id),
      );
      if (occupant) {
        await ctx.db.patch(occupant._id, {
          slot: undefined,
          updatedAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(target._id, {
      slot: args.slot,
      updatedAt: Date.now(),
    });
    return { id: String(target._id), slot: args.slot ?? null };
  },
});

export const setSelectedThumbnail = mutationGeneric({
  args: {
    orgSlug: v.string(),
    videoGenerationId: v.string(),
    thumbnailId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const org = await requireOrg(asCtx(ctx), args.orgSlug);
    const videoGenerationId = ctx.db.normalizeId(
      "videoGenerations",
      args.videoGenerationId,
    );
    const row = videoGenerationId ? await ctx.db.get(videoGenerationId) : null;
    if (!row || row.organizationId !== org.id) {
      throw new Error("Video generation not found");
    }

    const thumbnailId =
      args.thumbnailId != null
        ? ctx.db.normalizeId("thumbnails", args.thumbnailId)
        : null;
    const thumbnail = thumbnailId ? await ctx.db.get(thumbnailId) : null;
    if (
      thumbnailId &&
      (!thumbnail ||
        String(thumbnail.generationId) !== String(row.generationId))
    ) {
      throw new Error("Thumbnail not found for this generation");
    }

    await ctx.db.patch(row._id, {
      selectedThumbnailId: thumbnailId ?? undefined,
      updatedAt: Date.now(),
    });
    return {
      id: String(row._id),
      selectedThumbnailId: thumbnailId ? String(thumbnailId) : null,
    };
  },
});
