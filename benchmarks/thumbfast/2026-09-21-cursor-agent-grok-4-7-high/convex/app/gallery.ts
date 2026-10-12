/* eslint-disable @typescript-eslint/no-explicit-any */
import { queryGeneric } from "convex/server";
import { v } from "convex/values";
import { resolveHasPlaceholder } from "../lib/inspirationAccess";
import { MAX_ROWS, asCtx, requireOrg, toStoredImageUrl } from "./shared";

function toInspirationRow(inspiration: any, includeDrawing = false) {
  const images =
    inspiration.images && inspiration.images.length > 0
      ? inspiration.images
      : inspiration.image
        ? [inspiration.image]
        : [];
  const thumbnailUrls = images.map(toStoredImageUrl).filter(Boolean);
  const hasGranularAnonymization =
    inspiration.anonymizedSubject !== undefined ||
    inspiration.anonymizedText !== undefined ||
    inspiration.anonymizedLogos !== undefined;
  const adminReview =
    inspiration.adminReview === "GOOD" ||
    inspiration.adminReview === "APPROVED" ||
    inspiration.adminReview === "PENDING" ||
    inspiration.adminReview === "DENY"
      ? inspiration.adminReview
      : inspiration.deletedAt
        ? "DENY"
        : inspiration.reviewedAt
          ? "APPROVED"
          : "PENDING";

  return {
    id: String(inspiration._id),
    name: inspiration.title,
    aiDescription: inspiration.description ?? "",
    category: inspiration.categories?.[0] ?? null,
    thumbnailUrls,
    createdAt: new Date(inspiration.createdAt).toISOString(),
    adminReview,
    isPublic: inspiration.isPublic ?? true,
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
    hasDrawing: Boolean(inspiration.drawing),
    drawing: includeDrawing ? (inspiration.drawing ?? null) : null,
  };
}

function toUserImageRow(image: any) {
  return {
    id: String(image._id),
    orgId: image.organizationId,
    imageUrl: toStoredImageUrl(image.image) ?? "",
    name: image.label ?? "Untitled image",
    description: image.description ?? null,
    createdAt: new Date(image.createdAt).toISOString(),
  };
}

export const listInspirations = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const inspirations = await ctx.db
      .query("inspirations")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .take(MAX_ROWS);

    return {
      items: inspirations
        .filter((inspiration: any) => !inspiration.deletedAt)
        .map((inspiration) => toInspirationRow(inspiration)),
      nextCursor: undefined,
    };
  },
});

export const inspirationDetail = queryGeneric({
  args: { orgSlug: v.string(), inspirationId: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const inspirationId = ctx.db.normalizeId(
      "inspirations",
      args.inspirationId,
    );
    const inspiration = inspirationId ? await ctx.db.get(inspirationId) : null;
    if (
      !inspiration ||
      inspiration.organizationId !== org.id ||
      inspiration.deletedAt
    ) {
      throw new Error("Inspiration not found");
    }

    return toInspirationRow(inspiration, true);
  },
});

export const listUserImages = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const images = await ctx.db
      .query("userImages")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .take(MAX_ROWS);

    return images.filter((image: any) => !image.deletedAt).map(toUserImageRow);
  },
});

export const listVideos = queryGeneric({
  args: { orgSlug: v.string() },
  handler: async (ctx, args) => {
    const { org } = await requireOrg(asCtx(ctx), args.orgSlug);
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_organization_created", (q: any) =>
        q.eq("organizationId", org.id),
      )
      .order("desc")
      .take(MAX_ROWS);

    return {
      items: videos
        .filter((video: any) => !video.deletedAt)
        .map((video: any) => ({
          id: String(video._id),
          internalTitle: video.title,
          youtubeUrl: video.youtubeUrl ?? null,
          description: video.description ?? "",
          createdAt: new Date(video.createdAt).toISOString(),
          updatedAt: new Date(video.updatedAt).toISOString(),
          generations: [],
          _count: { generations: 0 },
        })),
      nextCursor: undefined,
    };
  },
});
