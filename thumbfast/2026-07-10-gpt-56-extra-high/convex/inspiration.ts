/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { makeFunctionReference, paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import {
  DrawingDocumentSchema,
  MAX_DRAWING_METADATA_BYTES,
} from "../src/features/inspiration/drawing/drawing-document";
import { components } from "./_generated/api";
import { authComponent } from "./auth/config";
import { internalQuery, mutation, query } from "./_generated/server";
import { getCreditBalance } from "./credits";
import { getApiKeyModeForPlan } from "./generationConfig";
import {
  REVIEW_STATUS,
  canListInCommunity,
  canReadInspiration,
  communityReviewRank,
  getInspirationStoredImages,
  getInspirationImageUrls,
  getReviewStatus,
  publicReviewStatusList,
  resolveHasPlaceholder,
} from "./lib/inspirationAccess";
import { getOrgPlanLimits } from "./orgPlanLimits";

const MAX_ROWS = 500;
const PAGE_SIZE = 60;
const DRAWING_DESCRIPTION =
  "Editable thumbnail composition drawing. Use it as a loose layout blueprint for subject placement, visual hierarchy, text, arrows, and callouts.";
const ONBOARDING_TEMPLATE_REFERENCES = [
  {
    id: "kn74jjrzh1pmge1g7zpfhjryg9879590",
    legacyId: "_dV-2f2Q79I",
  },
  {
    id: "kn73yk92hvy3srg9w8t4ddfayh879zc7",
    legacyId: "VVFHHT2iXfX",
  },
  {
    id: "kn71mhcdm8ptxy654fqns8jbhh87bfey",
    legacyId: undefined,
  },
  {
    id: "kn74zjgz1yazbg8qmkxwyex4gh878abx",
    legacyId: "6IMF_ZhU_TF",
  },
  {
    id: "kn7bwgjjjxdmm89zsdw6q5k6g5879j2f",
    legacyId: "YxQOFQ19Dg8",
  },
  {
    id: "kn7bc60pcpc82y2s47txats6rs87894z",
    legacyId: "hda__HgCuIB",
  },
] as const;
const ACTIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "lifetime",
]);
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
]);
const YOUTUBE_IMAGE_HOSTS = new Set(["i.ytimg.com", "img.youtube.com"]);

type AppCtx = {
  db: any;
  runQuery: (fn: any, args: any) => Promise<any>;
  runMutation?: (fn: any, args: any) => Promise<any>;
};

type StoredImage = {
  url: string;
  key?: string;
  width?: number;
  height?: number;
  contentType?: string;
};

type InspirationRow = {
  _id: string;
  organizationId: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceVideoTitle?: string;
  sourceVideoAuthor?: string;
  sourceVideoThumbnailUrl?: string;
  image?: StoredImage;
  images?: StoredImage[];
  drawing?: string;
  drawingMetadata?: string;
  categories?: string[];
  hasPlaceholder?: boolean;
  anonymizedSubject?: boolean;
  anonymizedText?: boolean;
  anonymizedLogos?: boolean;
  anonymizedTextDescription?: string;
  isPublic?: boolean;
  adminReview?: string;
  reviewedAt?: number;
  deletedAt?: number;
  createdAt: number;
  updatedAt: number;
};

export type DrawingInspirationDetail = {
  id: string;
  name: string;
  previewUrl: string;
  drawingMetadata: string;
};

const createFromUploadedUrlsRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    imageUrls: string[];
    sourceUrl?: string;
    sourceVideoTitle?: string;
    sourceVideoAuthor?: string;
    sourceVideoThumbnailUrl?: string;
    title: string;
    description: string;
    category: string;
    hasPlaceholder?: boolean;
    anonymizedSubject?: boolean;
    anonymizedText?: boolean;
    anonymizedLogos?: boolean;
    anonymizedTextDescription?: string;
  },
  InspirationListItem
>("inspiration:createFromUploadedUrls");

export type InspirationListItem = {
  id: string;
  name: string;
  aiDescription: string;
  category: string | null;
  thumbnailUrls: string[];
  createdAt: string;
  adminReview: "GOOD" | "APPROVED" | "PENDING" | "DENY";
  isPublic: boolean;
  orgId: string;
  hasPlaceholder: boolean;
  anonymizedSubject: boolean;
  anonymizedText: boolean;
  anonymizedLogos: boolean;
  anonymizedTextDescription: string | null;
  youtubeUrl: string | null;
  sourceVideoTitle: string | null;
  sourceVideoAuthor: string | null;
  sourceVideoThumbnailUrl: string | null;
  isDrawing: boolean;
};

async function requireUser(ctx: AppCtx) {
  const user = await authComponent.getAuthUser(ctx as never);
  return { id: String(user._id), email: user.email, name: user.name };
}

async function requireOrg(ctx: AppCtx, orgSlug: string) {
  const user = await requireUser(ctx);
  const org = await ctx.runQuery(
    components.betterAuth.data.getOrganizationBySlug,
    { slug: orgSlug },
  );
  if (!org) throw new Error("Organization not found");

  const member = await ctx.runQuery(
    components.betterAuth.data.getMemberByOrganizationAndUser,
    { organizationId: String(org._id), userId: user.id },
  );
  if (!member) throw new Error("Organization not found");

  return {
    user,
    member,
    org: {
      id: String(org._id),
      name: org.name,
      slug: org.slug,
      logo: org.logo ?? null,
      subscription: null,
    },
  };
}

async function getActiveSubscription(ctx: AppCtx, orgId: string) {
  const subscriptions = await ctx.db
    .query("subscriptions")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
    .take(MAX_ROWS);

  return (
    subscriptions.find((subscription: any) =>
      ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status ?? ""),
    ) ??
    subscriptions.sort((a: any, b: any) => b.createdAt - a.createdAt)[0] ??
    null
  );
}

async function getGeminiProviderKey(ctx: AppCtx, orgId: string) {
  return ctx.db
    .query("customProviderApiKeys")
    .withIndex("by_organization_provider", (q: any) =>
      q.eq("organizationId", orgId).eq("provider", "gemini"),
    )
    .first();
}

function storedImage(url: string, contentType?: string): StoredImage {
  return { url, contentType };
}

function normalizeDrawingName(name: string) {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error("Name is required");
  return normalizedName;
}

function normalizeDrawingPreviewUrl(previewUrl: string, orgId: string) {
  const normalizedUrl = previewUrl.trim();
  if (!normalizedUrl) throw new Error("Preview image is required");
  const r2PublicUrl = process.env.R2_URL;
  if (!r2PublicUrl) throw new Error("Drawing storage is not configured");

  let uploadedUrl: URL;
  let storageUrl: URL;
  try {
    uploadedUrl = new URL(normalizedUrl);
    storageUrl = new URL(r2PublicUrl);
  } catch {
    throw new Error("Preview image URL is invalid");
  }

  const storagePath = storageUrl.pathname.replace(/\/$/, "");
  const expectedPrefix = `${storagePath}/inspirations/${orgId}/`;
  if (
    uploadedUrl.protocol !== "https:" ||
    uploadedUrl.origin !== storageUrl.origin ||
    !uploadedUrl.pathname.startsWith(expectedPrefix)
  ) {
    throw new Error("Preview image must use organization drawing storage");
  }
  return uploadedUrl.toString();
}

function normalizeDrawingMetadata(drawingMetadata: string) {
  if (!drawingMetadata.trim()) throw new Error("Drawing data is required");

  const byteLength = new TextEncoder().encode(drawingMetadata).byteLength;
  if (byteLength > MAX_DRAWING_METADATA_BYTES) {
    throw new Error("Drawing data exceeds the 750 KB limit");
  }

  let metadata: unknown;
  try {
    metadata = JSON.parse(drawingMetadata) as unknown;
  } catch {
    throw new Error("Drawing data must be valid JSON");
  }

  const parsed = DrawingDocumentSchema.safeParse(metadata);
  if (!parsed.success) {
    throw new Error("Drawing data is invalid or uses an unsupported version");
  }

  return {
    drawingMetadata: JSON.stringify(parsed.data),
    hasPlaceholder: parsed.data.objects.some(
      (object) => object.type === "person",
    ),
  };
}

async function assertCanCreateInspiration(ctx: AppCtx, orgId: string) {
  const limits = await getOrgPlanLimits(ctx, orgId);
  const rows = await ctx.db
    .query("inspirations")
    .withIndex("by_organization", (q: any) => q.eq("organizationId", orgId))
    .take(Math.max(MAX_ROWS, limits.maxInspirations));
  const currentCount = rows.filter(
    (row: InspirationRow) => !row.deletedAt,
  ).length;
  if (currentCount >= limits.maxInspirations) {
    throw new Error(
      `You have reached your limit of ${limits.maxInspirations} inspirations. Upgrade to create more.`,
    );
  }
}

function toDrawingInspirationDetail(
  inspiration: InspirationRow,
): DrawingInspirationDetail {
  const previewUrl = getInspirationImageUrls(inspiration)[0];
  if (!previewUrl || !inspiration.drawingMetadata) {
    throw new Error("Drawing inspiration not found");
  }

  return {
    id: String(inspiration._id),
    name: inspiration.title,
    previewUrl,
    drawingMetadata: inspiration.drawingMetadata,
  };
}

function extractYoutubeVideoId(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    if (url.protocol !== "https:") return null;

    if (url.hostname === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId.length === 11 ? videoId : null;
    }

    if (!YOUTUBE_HOSTS.has(url.hostname)) return null;

    const queryVideoId = url.searchParams.get("v");
    if (queryVideoId?.length === 11) return queryVideoId;

    const [, route, videoId] = url.pathname.split("/");
    if ((route === "embed" || route === "shorts") && videoId.length === 11) {
      return videoId;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeYoutubeSourceUrl(sourceUrl?: string) {
  if (!sourceUrl) return undefined;
  const videoId = extractYoutubeVideoId(sourceUrl);
  if (!videoId) throw new Error("Invalid YouTube source URL");
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function normalizeYoutubeThumbnailUrl(
  thumbnailUrl: string | undefined,
  videoId: string | null,
) {
  if (thumbnailUrl) {
    try {
      const url = new URL(thumbnailUrl);
      if (url.protocol === "https:" && YOUTUBE_IMAGE_HOSTS.has(url.hostname)) {
        return url.toString();
      }
    } catch {
      throw new Error("Invalid YouTube thumbnail URL");
    }
  }

  return videoId
    ? `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`
    : undefined;
}

function isPublicInspiration(inspiration: InspirationRow) {
  return inspiration.isPublic ?? true;
}

function toInspirationRow(inspiration: InspirationRow): InspirationListItem {
  const thumbnailUrls = getInspirationImageUrls(inspiration);
  const hasGranularAnonymization =
    inspiration.anonymizedSubject !== undefined ||
    inspiration.anonymizedText !== undefined ||
    inspiration.anonymizedLogos !== undefined;

  return {
    id: String(inspiration._id),
    name: inspiration.title,
    aiDescription: inspiration.description ?? "",
    category: inspiration.categories?.[0] ?? null,
    thumbnailUrls,
    createdAt: new Date(inspiration.createdAt).toISOString(),
    adminReview: getReviewStatus(inspiration),
    isPublic: isPublicInspiration(inspiration),
    orgId: inspiration.organizationId,
    hasPlaceholder: hasGranularAnonymization
      ? Boolean(inspiration.anonymizedSubject)
      : resolveHasPlaceholder(inspiration.hasPlaceholder, thumbnailUrls),
    anonymizedSubject: Boolean(inspiration.anonymizedSubject),
    anonymizedText: Boolean(inspiration.anonymizedText),
    anonymizedLogos: Boolean(inspiration.anonymizedLogos),
    anonymizedTextDescription: inspiration.anonymizedTextDescription ?? null,
    youtubeUrl: inspiration.sourceUrl ?? null,
    sourceVideoTitle: inspiration.sourceVideoTitle ?? null,
    sourceVideoAuthor: inspiration.sourceVideoAuthor ?? null,
    sourceVideoThumbnailUrl: inspiration.sourceVideoThumbnailUrl ?? null,
    isDrawing: Boolean(inspiration.drawingMetadata),
  };
}

function matchesSearch(inspiration: InspirationListItem, search?: string) {
  const normalized = search?.trim().toLowerCase();
  if (!normalized) return true;

  return (
    inspiration.name.toLowerCase().includes(normalized) ||
    inspiration.aiDescription.toLowerCase().includes(normalized) ||
    inspiration.category?.toLowerCase().includes(normalized)
  );
}

function matchesCategory(inspiration: InspirationListItem, category?: string) {
  return !category || inspiration.category === category;
}

function sortCommunityRows(rows: InspirationRow[]) {
  return rows.slice().sort((a, b) => {
    const reviewRank =
      communityReviewRank[getReviewStatus(a)] -
      communityReviewRank[getReviewStatus(b)];

    return reviewRank !== 0 ? reviewRank : b.createdAt - a.createdAt;
  });
}

function resetReviewAfterOwnerEdit(inspiration: InspirationRow) {
  if (
    inspiration.adminReview === REVIEW_STATUS.GOOD ||
    inspiration.adminReview === REVIEW_STATUS.APPROVED ||
    inspiration.isPublic
  ) {
    return {
      adminReview: REVIEW_STATUS.PENDING,
      isPublic: false,
      reviewedAt: undefined,
    };
  }

  return {};
}

async function getRows(
  ctx: AppCtx,
  orgId: string,
  filter: "mine" | "all",
): Promise<InspirationRow[]> {
  if (filter === "mine") {
    const ownRows = await ctx.db
      .query("inspirations")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", orgId),
      )
      .order("desc")
      .take(MAX_ROWS);

    return ownRows as InspirationRow[];
  }

  const publicRowsByStatus = await Promise.all(
    publicReviewStatusList.map((status) =>
      ctx.db
        .query("inspirations")
        .withIndex("by_admin_review_created", (q: any) =>
          q.eq("adminReview", status),
        )
        .order("desc")
        .take(MAX_ROWS),
    ),
  );
  // Legacy rows predate the adminReview field: canListInCommunity derives
  // APPROVED for them from reviewedAt. Scan only rows where adminReview is
  // missing instead of the newest MAX_ROWS of the whole table (which mostly
  // duplicated the status queries above and silently missed older legacy
  // rows once the table outgrew the window).
  const legacyRows = await ctx.db
    .query("inspirations")
    .withIndex("by_admin_review_created", (q: any) =>
      q.eq("adminReview", undefined),
    )
    .order("desc")
    .take(MAX_ROWS);
  const merged = new Map<string, InspirationRow>();
  for (const row of [
    ...publicRowsByStatus.flat(),
    ...legacyRows,
  ] as InspirationRow[]) {
    if (!canListInCommunity(row)) continue;
    merged.set(String(row._id), row);
  }
  return sortCommunityRows([...merged.values()]);
}

export const list = query({
  args: {
    orgSlug: v.string(),
    filter: v.optional(v.union(v.literal("mine"), v.literal("all"))),
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    refreshNonce: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const appCtx = ctx as unknown as AppCtx;
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const limit = Math.max(1, Math.min(args.limit ?? PAGE_SIZE, PAGE_SIZE));
    const offset = args.cursor ? Number(args.cursor) : 0;
    const rows = await getRows(appCtx, org.id, args.filter ?? "mine");
    const items = rows
      .filter((row: InspirationRow) => !row.deletedAt)
      .map(toInspirationRow)
      .filter((row: InspirationListItem) => matchesSearch(row, args.search))
      .filter((row: InspirationListItem) =>
        matchesCategory(row, args.category),
      );

    const page = items.slice(offset, offset + limit);
    const nextOffset = offset + page.length;

    return {
      items: page,
      nextCursor: nextOffset < items.length ? String(nextOffset) : undefined,
    };
  },
});

export const listPaginated = query({
  args: {
    orgSlug: v.string(),
    filter: v.optional(v.union(v.literal("mine"), v.literal("all"))),
    search: v.optional(v.string()),
    category: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const appCtx = ctx as unknown as AppCtx;
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const offset = args.paginationOpts.cursor
      ? Number(args.paginationOpts.cursor)
      : 0;
    const rows = await getRows(appCtx, org.id, args.filter ?? "mine");
    const items = rows
      .filter((row: InspirationRow) => !row.deletedAt)
      .map(toInspirationRow)
      .filter((row: InspirationListItem) => matchesSearch(row, args.search))
      .filter((row: InspirationListItem) =>
        matchesCategory(row, args.category),
      );
    const page = items.slice(offset, offset + args.paginationOpts.numItems);
    const nextOffset = offset + page.length;

    return {
      page,
      isDone: nextOffset >= items.length,
      continueCursor: String(nextOffset),
    };
  },
});

export const detail = query({
  args: { orgSlug: v.string(), inspirationId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const inspirationId = ctx.db.normalizeId(
      "inspirations",
      args.inspirationId,
    );
    const inspiration = inspirationId ? await ctx.db.get(inspirationId) : null;
    if (
      !inspiration ||
      inspiration.deletedAt ||
      !canReadInspiration(inspiration, org.id)
    ) {
      throw new Error("Inspiration not found");
    }
    return toInspirationRow(inspiration);
  },
});

export const drawingDetail = query({
  args: { orgSlug: v.string(), inspirationId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const inspirationId = ctx.db.normalizeId(
      "inspirations",
      args.inspirationId,
    );
    const inspiration = inspirationId ? await ctx.db.get(inspirationId) : null;
    if (
      !inspiration ||
      inspiration.deletedAt ||
      inspiration.organizationId !== org.id ||
      !inspiration.drawingMetadata
    ) {
      throw new Error("Drawing inspiration not found");
    }

    return toDrawingInspirationDetail(inspiration);
  },
});

export const search = query({
  args: {
    orgSlug: v.string(),
    q: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const appCtx = ctx as unknown as AppCtx;
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const rows = await getRows(appCtx, org.id, "all");
    return rows
      .filter((row: InspirationRow) => !row.deletedAt)
      .map(toInspirationRow)
      .filter((row: InspirationListItem) => matchesSearch(row, args.q))
      .slice(0, Math.max(1, Math.min(args.limit ?? 20, 50)));
  },
});

export const onboardingOptions = query({
  args: { orgSlug: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const appCtx = ctx as unknown as AppCtx;
    const { org } = await requireOrg(appCtx, args.orgSlug);
    const limit = Math.max(1, Math.min(args.limit ?? 9, 12));
    const curatedRows = await Promise.all(
      ONBOARDING_TEMPLATE_REFERENCES.map(async (template) => {
        const id = appCtx.db.normalizeId("inspirations", template.id);
        const byId = id ? await appCtx.db.get(id) : null;
        if (byId) return byId;
        if (!template.legacyId) return null;
        return appCtx.db
          .query("inspirations")
          .withIndex("by_legacy", (q: any) =>
            q.eq("legacyId", template.legacyId),
          )
          .first();
      }),
    );
    const curated = curatedRows
      .filter((row): row is InspirationRow => Boolean(row))
      .filter(
        (row) =>
          !row.deletedAt && canReadInspiration(row as InspirationRow, org.id),
      );

    const rows = await getRows(appCtx, org.id, "all");
    const curatedIds = new Set(curated.map((row) => String(row._id)));
    const fallbackRows = rows.filter(
      (row: InspirationRow) =>
        !row.deletedAt && !curatedIds.has(String(row._id)),
    );
    return [...curated, ...fallbackRows].map(toInspirationRow).slice(0, limit);
  },
});

export const orgContext = query({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    return { org };
  },
});

export const geminiFeatureAccess = internalQuery({
  args: {
    orgId: v.string(),
    creditCost: v.number(),
    featureName: v.string(),
  },
  handler: async (ctx, args) => {
    const appCtx = ctx as unknown as AppCtx;
    const subscription = await getActiveSubscription(appCtx, args.orgId);
    const plan = subscription?.plan ?? "free";
    const apiKeyMode = getApiKeyModeForPlan(plan);
    const geminiKey =
      apiKeyMode !== "disabled"
        ? await getGeminiProviderKey(appCtx, args.orgId)
        : null;

    if (apiKeyMode === "required") {
      if (!geminiKey) {
        throw new Error(
          `Your plan requires a Gemini API key for ${args.featureName}. Please add your Gemini API key in Settings > API Keys.`,
        );
      }

      return {
        shouldDeductCredits: false,
        encryptedGeminiKey: geminiKey.encryptedKey as string,
      };
    }

    const balance = await getCreditBalance(appCtx, args.orgId);
    const currentBalance = balance?.balance ?? 0;
    if (currentBalance + Number.EPSILON >= args.creditCost) {
      return {
        shouldDeductCredits: true,
        encryptedGeminiKey: undefined,
      };
    }

    if (apiKeyMode === "fallback" && geminiKey) {
      return {
        shouldDeductCredits: false,
        encryptedGeminiKey: geminiKey.encryptedKey as string,
      };
    }

    throw new Error(
      apiKeyMode === "fallback"
        ? `Insufficient credits for ${args.featureName}. Add credits or configure a Gemini API key.`
        : `Insufficient credits for ${args.featureName}`,
    );
  },
});

export const createFromUploadedUrls = mutation({
  args: {
    orgSlug: v.string(),
    imageUrls: v.array(v.string()),
    sourceUrl: v.optional(v.string()),
    sourceVideoTitle: v.optional(v.string()),
    sourceVideoAuthor: v.optional(v.string()),
    sourceVideoThumbnailUrl: v.optional(v.string()),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    hasPlaceholder: v.optional(v.boolean()),
    anonymizedSubject: v.optional(v.boolean()),
    anonymizedText: v.optional(v.boolean()),
    anonymizedLogos: v.optional(v.boolean()),
    anonymizedTextDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const urls = args.imageUrls.filter(Boolean);
    if (urls.length === 0) throw new Error("At least one image is required");

    const now = Date.now();
    const images = urls.map((url) => storedImage(url));
    const sourceUrl = normalizeYoutubeSourceUrl(args.sourceUrl);
    const sourceVideoId = sourceUrl ? extractYoutubeVideoId(sourceUrl) : null;
    const id = await ctx.db.insert("inspirations", {
      organizationId: org.id,
      title: args.title.trim() || "Imported inspiration",
      description: args.description,
      sourceUrl,
      sourceVideoTitle: args.sourceVideoTitle,
      sourceVideoAuthor: args.sourceVideoAuthor,
      sourceVideoThumbnailUrl: normalizeYoutubeThumbnailUrl(
        args.sourceVideoThumbnailUrl,
        sourceVideoId,
      ),
      image: images[0],
      images,
      categories: [args.category],
      hasPlaceholder: args.hasPlaceholder,
      anonymizedSubject: args.anonymizedSubject,
      anonymizedText: args.anonymizedText,
      anonymizedLogos: args.anonymizedLogos,
      anonymizedTextDescription: args.anonymizedTextDescription,
      isPublic: true,
      adminReview: REVIEW_STATUS.PENDING,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(id);
    if (!created) throw new Error("Inspiration not found");
    return toInspirationRow(created);
  },
});

export const createUploadedWithoutAnalysis = mutation({
  args: {
    orgSlug: v.string(),
    imageUrls: v.array(v.string()),
    sourceUrl: v.optional(v.string()),
    hasPlaceholder: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return ctx.runMutation(createFromUploadedUrlsRef, {
      ...args,
      title: "Imported inspiration",
      description: "",
      category: "Other",
    });
  },
});

export const createDrawing = mutation({
  args: {
    orgSlug: v.string(),
    name: v.string(),
    previewUrl: v.string(),
    drawingMetadata: v.string(),
  },
  handler: async (ctx, args) => {
    const appCtx = ctx as unknown as AppCtx;
    const { org } = await requireOrg(appCtx, args.orgSlug);
    await assertCanCreateInspiration(appCtx, org.id);
    const name = normalizeDrawingName(args.name);
    const previewUrl = normalizeDrawingPreviewUrl(args.previewUrl, org.id);
    const normalizedDrawing = normalizeDrawingMetadata(args.drawingMetadata);
    const previewImage = storedImage(previewUrl);
    const now = Date.now();
    const id = await ctx.db.insert("inspirations", {
      organizationId: org.id,
      title: name,
      description: DRAWING_DESCRIPTION,
      image: previewImage,
      images: [previewImage],
      drawingMetadata: normalizedDrawing.drawingMetadata,
      categories: ["Other"],
      hasPlaceholder: normalizedDrawing.hasPlaceholder,
      anonymizedSubject: false,
      anonymizedText: false,
      anonymizedLogos: false,
      isPublic: false,
      adminReview: REVIEW_STATUS.DENY,
      createdAt: now,
      updatedAt: now,
    });

    const created = await ctx.db.get(id);
    if (!created) throw new Error("Drawing inspiration not found");
    return toDrawingInspirationDetail(created);
  },
});

export const updateDrawing = mutation({
  args: {
    orgSlug: v.string(),
    inspirationId: v.string(),
    name: v.string(),
    previewUrl: v.string(),
    drawingMetadata: v.string(),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const id = ctx.db.normalizeId("inspirations", args.inspirationId);
    const inspiration = id ? await ctx.db.get(id) : null;
    if (
      !id ||
      !inspiration ||
      inspiration.deletedAt ||
      inspiration.organizationId !== org.id ||
      !inspiration.drawingMetadata
    ) {
      throw new Error("Drawing inspiration not found");
    }

    const name = normalizeDrawingName(args.name);
    const previewUrl = normalizeDrawingPreviewUrl(args.previewUrl, org.id);
    const normalizedDrawing = normalizeDrawingMetadata(args.drawingMetadata);
    const previewImage = storedImage(previewUrl);
    await ctx.db.patch(id, {
      title: name,
      description: DRAWING_DESCRIPTION,
      image: previewImage,
      images: [previewImage],
      drawingMetadata: normalizedDrawing.drawingMetadata,
      hasPlaceholder: normalizedDrawing.hasPlaceholder,
      anonymizedSubject: false,
      anonymizedText: false,
      anonymizedLogos: false,
      anonymizedTextDescription: undefined,
      isPublic: false,
      adminReview: REVIEW_STATUS.DENY,
      reviewedAt: undefined,
      updatedAt: Date.now(),
    });

    const updated = await ctx.db.get(id);
    if (!updated) throw new Error("Drawing inspiration not found");
    return toDrawingInspirationDetail(updated);
  },
});

export const updateName = mutation({
  args: {
    orgSlug: v.string(),
    inspirationId: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const id = ctx.db.normalizeId("inspirations", args.inspirationId);
    if (!id) throw new Error("Inspiration not found");
    const inspiration = id ? await ctx.db.get(id) : null;
    if (!inspiration || inspiration.organizationId !== org.id) {
      throw new Error("Inspiration not found");
    }
    const name = args.name.trim();
    if (!name) throw new Error("Name is required");
    await ctx.db.patch(id, {
      title: name,
      ...resetReviewAfterOwnerEdit(inspiration),
      updatedAt: Date.now(),
    });
    return { id: args.inspirationId, name };
  },
});

export const updateImages = mutation({
  args: {
    orgSlug: v.string(),
    inspirationId: v.string(),
    thumbnailUrls: v.array(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const id = ctx.db.normalizeId("inspirations", args.inspirationId);
    if (!id) throw new Error("Inspiration not found");
    const inspiration = id ? await ctx.db.get(id) : null;
    if (!inspiration || inspiration.organizationId !== org.id) {
      throw new Error("Inspiration not found");
    }
    const images = args.thumbnailUrls
      .filter(Boolean)
      .map((url) => storedImage(url));
    if (images.length === 0) throw new Error("At least one image is required");
    await ctx.db.patch(id, {
      image: images[0],
      images,
      drawingMetadata: undefined,
      hasPlaceholder: false,
      anonymizedSubject: false,
      anonymizedText: false,
      anonymizedLogos: false,
      anonymizedTextDescription: undefined,
      ...resetReviewAfterOwnerEdit(inspiration),
      ...(args.isPublic != null ? { isPublic: args.isPublic } : {}),
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get(id);
    if (!updated) throw new Error("Inspiration not found");
    return toInspirationRow(updated);
  },
});

export const deleteOne = mutation({
  args: { orgSlug: v.string(), inspirationId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const id = ctx.db.normalizeId("inspirations", args.inspirationId);
    if (!id) throw new Error("Inspiration not found");
    const inspiration = id ? await ctx.db.get(id) : null;
    if (!inspiration || inspiration.organizationId !== org.id) {
      throw new Error("Inspiration not found");
    }
    await ctx.db.patch(id, { deletedAt: Date.now(), updatedAt: Date.now() });
    return { success: true };
  },
});

export const copy = mutation({
  args: { orgSlug: v.string(), inspirationId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const id = ctx.db.normalizeId("inspirations", args.inspirationId);
    if (!id) throw new Error("Inspiration not found");
    const source = id ? await ctx.db.get(id) : null;
    if (!source || !canReadInspiration(source, org.id)) {
      throw new Error("Inspiration not found");
    }
    if (source.organizationId === org.id) return toInspirationRow(source);

    const images = getInspirationStoredImages(source);
    if (images.length === 0) throw new Error("Inspiration has no image");

    const now = Date.now();
    const copiedId = await ctx.db.insert("inspirations", {
      organizationId: org.id,
      title: source.title,
      description: source.description,
      sourceUrl: source.sourceUrl,
      sourceVideoTitle: source.sourceVideoTitle,
      sourceVideoAuthor: source.sourceVideoAuthor,
      sourceVideoThumbnailUrl: source.sourceVideoThumbnailUrl,
      image: images[0],
      images,
      drawingMetadata: source.drawingMetadata,
      categories: source.categories,
      hasPlaceholder: source.hasPlaceholder,
      anonymizedSubject: source.anonymizedSubject,
      anonymizedText: source.anonymizedText,
      anonymizedLogos: source.anonymizedLogos,
      anonymizedTextDescription: source.anonymizedTextDescription,
      isPublic: false,
      adminReview: REVIEW_STATUS.DENY,
      reviewedAt: undefined,
      createdAt: now,
      updatedAt: now,
    });
    const copied = await ctx.db.get(copiedId);
    if (!copied) throw new Error("Inspiration not found");
    return toInspirationRow(copied);
  },
});

export const replaceWithAnonymized = mutation({
  args: {
    orgSlug: v.string(),
    inspirationId: v.string(),
    anonymizedUrl: v.string(),
    anonymizedSubject: v.optional(v.boolean()),
    anonymizedText: v.optional(v.boolean()),
    anonymizedLogos: v.optional(v.boolean()),
    anonymizedTextDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const id = ctx.db.normalizeId("inspirations", args.inspirationId);
    if (!id) throw new Error("Inspiration not found");
    const inspiration = id ? await ctx.db.get(id) : null;
    if (!inspiration || inspiration.organizationId !== org.id) {
      throw new Error("Inspiration not found");
    }

    const images = getInspirationStoredImages(inspiration);
    const nextImages = [storedImage(args.anonymizedUrl), ...images.slice(1)];
    const anonymizedSubject = args.anonymizedSubject ?? true;
    await ctx.db.patch(id, {
      image: nextImages[0],
      images: nextImages,
      drawingMetadata: undefined,
      hasPlaceholder: anonymizedSubject,
      anonymizedSubject,
      anonymizedText: args.anonymizedText ?? false,
      anonymizedLogos: args.anonymizedLogos ?? false,
      anonymizedTextDescription: args.anonymizedTextDescription,
      isPublic: false,
      adminReview: REVIEW_STATUS.PENDING,
      reviewedAt: undefined,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get(id);
    if (!updated) throw new Error("Inspiration not found");
    return toInspirationRow(updated);
  },
});

export const duplicateWithAnonymized = mutation({
  args: {
    orgSlug: v.string(),
    inspirationId: v.string(),
    anonymizedUrl: v.string(),
    anonymizedSubject: v.optional(v.boolean()),
    anonymizedText: v.optional(v.boolean()),
    anonymizedLogos: v.optional(v.boolean()),
    anonymizedTextDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(ctx as unknown as AppCtx, args.orgSlug);
    const id = ctx.db.normalizeId("inspirations", args.inspirationId);
    if (!id) throw new Error("Inspiration not found");
    const source = id ? await ctx.db.get(id) : null;
    if (!source || !canReadInspiration(source, org.id)) {
      throw new Error("Inspiration not found");
    }

    const images = getInspirationStoredImages(source);
    const nextImages = [storedImage(args.anonymizedUrl), ...images.slice(1)];
    const now = Date.now();
    const anonymizedSubject = args.anonymizedSubject ?? true;
    const copyId = await ctx.db.insert("inspirations", {
      organizationId: org.id,
      title: source.title,
      description: source.description,
      sourceUrl: source.sourceUrl,
      sourceVideoTitle: source.sourceVideoTitle,
      sourceVideoAuthor: source.sourceVideoAuthor,
      sourceVideoThumbnailUrl: source.sourceVideoThumbnailUrl,
      image: nextImages[0],
      images: nextImages,
      categories: source.categories,
      hasPlaceholder: anonymizedSubject,
      anonymizedSubject,
      anonymizedText: args.anonymizedText ?? false,
      anonymizedLogos: args.anonymizedLogos ?? false,
      anonymizedTextDescription: args.anonymizedTextDescription,
      isPublic: false,
      adminReview: REVIEW_STATUS.DENY,
      createdAt: now,
      updatedAt: now,
    });
    const copy = await ctx.db.get(copyId);
    if (!copy) throw new Error("Inspiration not found");
    return toInspirationRow(copy);
  },
});
