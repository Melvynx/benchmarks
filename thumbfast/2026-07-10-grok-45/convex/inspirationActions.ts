"use node";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { anonymizeImage } from "../src/features/anonymize/anonymize-image";
import {
  CREDIT_COST_PER_ANONYMIZATION,
  CREDIT_COST_PER_INSPIRATION,
} from "./credits";
import { internal } from "./_generated/api";
import { POSTHOG_EVENTS } from "../src/features/posthog/posthog-events";
import { IMAGE_MODELS } from "../src/lib/ai/image-models";
import { ContentPolicyError, describeImage } from "../src/lib/ai/gemini";
import { uploadBufferToS3 } from "../src/lib/aws/aws-s3-upload-files";
import { decryptApiKey } from "../src/lib/encryption";
import { ActionError } from "../src/lib/errors/action-error";
import { logger } from "../src/lib/logger";
import { trackServerEvent } from "../src/lib/posthog";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { action } from "./_generated/server";
import {
  extractVideoId,
  getFallbackThumbnailUrl,
  getThumbnailUrl,
  getYoutubeVideoInfo,
} from "../src/features/inspiration/youtube-utils";
import type { InspirationListItem } from "./inspiration";

const geminiFeatureAccessRef = makeFunctionReference<
  "query",
  {
    orgId: string;
    creditCost: number;
    featureName: string;
  },
  { shouldDeductCredits: boolean; encryptedGeminiKey?: string }
>("inspiration:geminiFeatureAccess");

type ActionCtx = {
  runQuery: (fn: any, args: any) => Promise<any>;
  runMutation: (fn: any, args: any) => Promise<any>;
};

async function validateCreditForFeature(
  ctx: ActionCtx,
  args: {
    orgId: string;
    creditCost: number;
    featureName: string;
  },
) {
  return ctx.runQuery(geminiFeatureAccessRef, args);
}

async function getGeminiApiKeyIfNeeded(
  shouldDeductCredits: boolean,
  encryptedGeminiKey?: string,
) {
  if (shouldDeductCredits) return undefined;
  return encryptedGeminiKey ? decryptApiKey(encryptedGeminiKey) : undefined;
}

async function logGeminiUsageIfCustomKey(
  ctx: ActionCtx,
  orgId: string,
  customApiKey: string | undefined,
  model?: string,
) {
  if (!customApiKey) return;
  await ctx.runMutation((internal as any).userImages.logCustomGeminiUsage, {
    orgId,
    model,
  });
}

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
    sourceType?: string;
    drawingData?: string;
  },
  InspirationListItem
>("inspiration:createFromUploadedUrls");

const updateDrawingRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    inspirationId: string;
    title: string;
    imageUrl: string;
    drawingData: string;
    description?: string;
  },
  InspirationListItem
>("inspiration:updateDrawing");

const detailRef = makeFunctionReference<
  "query",
  { orgSlug: string; inspirationId: string },
  InspirationListItem
>("inspiration:detail");

const orgContextRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  { org: { id: string; subscription: { plan?: string } | null } }
>("inspiration:orgContext");

const replaceWithAnonymizedRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    inspirationId: string;
    anonymizedUrl: string;
    anonymizedSubject?: boolean;
    anonymizedText?: boolean;
    anonymizedLogos?: boolean;
    anonymizedTextDescription?: string;
  },
  InspirationListItem
>("inspiration:replaceWithAnonymized");

const duplicateWithAnonymizedRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    inspirationId: string;
    anonymizedUrl: string;
    anonymizedSubject?: boolean;
    anonymizedText?: boolean;
    anonymizedLogos?: boolean;
    anonymizedTextDescription?: string;
  },
  InspirationListItem
>("inspiration:duplicateWithAnonymized");

type AnonymizationOptions = {
  subject: boolean;
  text: boolean;
  logos: boolean;
};

function getAnonymizationOptions(args: {
  anonymize?: boolean;
  anonymizeSubject?: boolean;
  anonymizeText?: boolean;
  anonymizeLogos?: boolean;
}): AnonymizationOptions {
  return {
    subject: args.anonymizeSubject ?? args.anonymize === true,
    text: args.anonymizeText === true,
    logos: args.anonymizeLogos === true,
  };
}

function hasAnonymization(options: AnonymizationOptions) {
  return options.subject || options.text || options.logos;
}

function getAnonymizedTextDescription(options: AnonymizationOptions) {
  if (!options.text) return undefined;
  return "Readable text replaced by numbered lorem placeholder text while preserving color, size, layout, and typography style.";
}

async function uploadBytes(params: {
  bytes: ArrayBuffer;
  contentType: string;
  prefix: string;
  fileName?: string;
}) {
  const url = await uploadBufferToS3({
    buffer: Buffer.from(params.bytes),
    prefix: params.prefix,
    fileName: params.fileName ?? `${Date.now()}`,
    contentType: params.contentType,
  });
  if (!url) throw new ActionError("Failed to upload image");
  return url;
}

async function downloadAndUploadImage(imageUrl: string, fallbackUrl?: string) {
  let response = await fetch(imageUrl);
  if (!response.ok && fallbackUrl) {
    response = await fetch(fallbackUrl);
  }
  if (!response.ok) {
    throw new ActionError("Failed to fetch YouTube thumbnail");
  }

  const contentType = response.headers.get("content-type") ?? "image/jpeg";
  return uploadBytes({
    bytes: await response.arrayBuffer(),
    contentType,
    prefix: "inspirations",
    fileName: `thumbnail-${Date.now()}`,
  });
}

function validateImageUpload(args: {
  bytes: ArrayBuffer;
  contentType: string;
  fileName: string;
  maxBytes: number;
}) {
  if (!args.contentType.startsWith("image/")) {
    throw new ActionError("Only images are allowed");
  }
  if (
    args.contentType === "image/svg+xml" ||
    args.contentType === "image/gif" ||
    args.fileName.endsWith(".svg") ||
    args.fileName.endsWith(".gif")
  ) {
    throw new ActionError("SVG and GIF files are not allowed");
  }
  if (args.bytes.byteLength > args.maxBytes) {
    throw new ActionError(
      `File too large (max ${Math.floor(args.maxBytes / 1024 / 1024)}MB)`,
    );
  }
}

export const uploadImage = action({
  args: {
    orgSlug: v.string(),
    bytes: v.bytes(),
    fileName: v.string(),
    contentType: v.string(),
  },
  handler: async (_ctx, args) => {
    validateImageUpload({ ...args, maxBytes: 5 * 1024 * 1024 });
    return uploadBytes({
      bytes: args.bytes,
      contentType: args.contentType,
      prefix: "inspirations",
      fileName: `${Date.now()}-${args.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
    });
  },
});

export const uploadPixelatedImage = action({
  args: {
    orgSlug: v.string(),
    imageDataUrl: v.string(),
    originalUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const matches = args.imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) throw new ActionError("Invalid image data URL format");

    const [, format, base64Data] = matches;
    const url = await uploadBufferToS3({
      buffer: Buffer.from(base64Data, "base64"),
      prefix: `inspirations/${args.orgSlug}/pixelated`,
      fileName: `${Date.now()}`,
      contentType: `image/${format}`,
    });
    if (!url) throw new ActionError("Failed to upload pixelated image");
    return url;
  },
});

export const create = action({
  args: {
    orgSlug: v.string(),
    type: v.union(v.literal("youtube"), v.literal("upload")),
    youtubeUrl: v.optional(v.string()),
    imageUrls: v.optional(v.array(v.string())),
    anonymize: v.optional(v.boolean()),
    anonymizeSubject: v.optional(v.boolean()),
    anonymizeText: v.optional(v.boolean()),
    anonymizeLogos: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { org } = await ctx.runQuery(orgContextRef, {
      orgSlug: args.orgSlug,
    });
    const anonymizationOptions = getAnonymizationOptions(args);
    const shouldAnonymize = hasAnonymization(anonymizationOptions);
    const creditCost = shouldAnonymize
      ? CREDIT_COST_PER_ANONYMIZATION
      : CREDIT_COST_PER_INSPIRATION;
    const featureName = shouldAnonymize ? "anonymization" : "inspiration";
    const orgId = org.id;

    const { shouldDeductCredits, encryptedGeminiKey } =
      await validateCreditForFeature(ctx, {
        orgId,
        creditCost,
        featureName,
      });

    let imageUrls: string[];
    let sourceUrl: string | undefined;
    let sourceVideoTitle: string | undefined;
    let sourceVideoAuthor: string | undefined;
    let sourceVideoThumbnailUrl: string | undefined;
    let inspirationName: string | null = null;

    if (args.type === "youtube") {
      if (!args.youtubeUrl) throw new ActionError("YouTube URL is required");
      const videoId = extractVideoId(args.youtubeUrl);
      if (!videoId) throw new ActionError("Invalid YouTube URL");

      imageUrls = [
        await downloadAndUploadImage(
          getThumbnailUrl(videoId),
          getFallbackThumbnailUrl(videoId),
        ),
      ];
      sourceUrl = args.youtubeUrl;

      const videoInfo = await getYoutubeVideoInfo(args.youtubeUrl);
      if (videoInfo) {
        sourceVideoTitle = videoInfo.title;
        sourceVideoAuthor = videoInfo.author ? videoInfo.author : undefined;
        sourceVideoThumbnailUrl = getThumbnailUrl(videoId);
        inspirationName = videoInfo.author
          ? `${videoInfo.title} - ${videoInfo.author}`
          : videoInfo.title;
      }
    } else {
      imageUrls = args.imageUrls ?? [];
    }

    if (imageUrls.length === 0) {
      throw new ActionError("At least one image is required");
    }

    const geminiApiKey = await getGeminiApiKeyIfNeeded(
      shouldDeductCredits,
      encryptedGeminiKey,
    );

    if (shouldAnonymize) {
      try {
        imageUrls = [
          await anonymizeImage(imageUrls[0], {
            customApiKey: geminiApiKey,
            subject: anonymizationOptions.subject,
            text: anonymizationOptions.text,
            logos: anonymizationOptions.logos,
          }),
          ...imageUrls.slice(1),
        ];
        await logGeminiUsageIfCustomKey(
          ctx,
          orgId,
          geminiApiKey,
          IMAGE_MODELS["gemini-3.1-flash"].apiModelId,
        );
      } catch (error) {
        logger.error("[Anonymize] Failed to anonymize image", error);
        throw error instanceof Error
          ? error
          : new ActionError("Failed to anonymize image. Please try again.");
      }
    }

    let analysis;
    try {
      analysis = await describeImage({
        imageUrl: imageUrls[0],
        customApiKey: geminiApiKey,
      });
      await logGeminiUsageIfCustomKey(ctx, orgId, geminiApiKey);
    } catch (error) {
      if (error instanceof ContentPolicyError) {
        throw new ActionError(
          "This image cannot be used as inspiration due to content policy restrictions. Please use an appropriate image.",
        );
      }
      throw error;
    }

    if (shouldDeductCredits) {
      await ctx.runMutation((internal as any).credits.deduct, {
        orgId,
        amount: creditCost,
        type: featureName,
        reason: featureName,
      });
    }

    const created = await ctx.runMutation(createFromUploadedUrlsRef, {
      orgSlug: args.orgSlug,
      imageUrls,
      sourceUrl,
      sourceVideoTitle,
      sourceVideoAuthor,
      sourceVideoThumbnailUrl,
      title: inspirationName ?? analysis.name,
      description: analysis.description,
      category: analysis.category,
      hasPlaceholder: anonymizationOptions.subject,
      anonymizedSubject: anonymizationOptions.subject,
      anonymizedText: anonymizationOptions.text,
      anonymizedLogos: anonymizationOptions.logos,
      anonymizedTextDescription:
        getAnonymizedTextDescription(anonymizationOptions),
      sourceType: args.type,
    });

    void trackServerEvent(orgId, POSTHOG_EVENTS.INSPIRATION_CREATED, {
      type: args.type,
      has_anonymization: shouldAnonymize,
      anonymized_subject: anonymizationOptions.subject,
      anonymized_text: anonymizationOptions.text,
      anonymized_logos: anonymizationOptions.logos,
    });

    return created;
  },
});

export const createDrawing = action({
  args: {
    orgSlug: v.string(),
    title: v.string(),
    imageUrl: v.string(),
    drawingData: v.string(),
  },
  handler: async (ctx, args) => {
    const { org } = await ctx.runQuery(orgContextRef, {
      orgSlug: args.orgSlug,
    });
    const orgId = org.id;
    const creditCost = CREDIT_COST_PER_INSPIRATION;

    const { shouldDeductCredits, encryptedGeminiKey } =
      await validateCreditForFeature(ctx, {
        orgId,
        creditCost,
        featureName: "inspiration",
      });

    if (!args.imageUrl) throw new ActionError("Preview image is required");
    if (!args.drawingData) throw new ActionError("Drawing data is required");

    const geminiApiKey = await getGeminiApiKeyIfNeeded(
      shouldDeductCredits,
      encryptedGeminiKey,
    );

    let analysis: { name: string; description: string; category: string };
    try {
      analysis = await describeImage({
        imageUrl: args.imageUrl,
        customApiKey: geminiApiKey,
      });
      await logGeminiUsageIfCustomKey(ctx, orgId, geminiApiKey);
    } catch (error) {
      if (error instanceof ContentPolicyError) {
        throw new ActionError(
          "This drawing cannot be saved as inspiration due to content policy restrictions.",
        );
      }
      analysis = {
        name: args.title.trim() || "Untitled drawing",
        description: "Hand-drawn thumbnail inspiration composition.",
        category: "Other",
      };
    }

    if (shouldDeductCredits) {
      await ctx.runMutation((internal as any).credits.deduct, {
        orgId,
        amount: creditCost,
        type: "inspiration",
        reason: "inspiration",
      });
    }

    const created = await ctx.runMutation(createFromUploadedUrlsRef, {
      orgSlug: args.orgSlug,
      imageUrls: [args.imageUrl],
      title: args.title.trim() || analysis.name,
      description: analysis.description,
      category: analysis.category,
      sourceType: "drawing",
      drawingData: args.drawingData,
      hasPlaceholder: true,
    });

    void trackServerEvent(orgId, POSTHOG_EVENTS.INSPIRATION_CREATED, {
      type: "drawing",
      has_anonymization: false,
    });

    return created;
  },
});

export const updateDrawingInspiration = action({
  args: {
    orgSlug: v.string(),
    inspirationId: v.string(),
    title: v.string(),
    imageUrl: v.string(),
    drawingData: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.imageUrl) throw new ActionError("Preview image is required");
    if (!args.drawingData) throw new ActionError("Drawing data is required");

    return ctx.runMutation(updateDrawingRef, {
      orgSlug: args.orgSlug,
      inspirationId: args.inspirationId,
      title: args.title,
      imageUrl: args.imageUrl,
      drawingData: args.drawingData,
    });
  },
});

export const anonymize = action({
  args: {
    orgSlug: v.string(),
    inspirationId: v.string(),
    mode: v.union(v.literal("replace"), v.literal("duplicate")),
  },
  handler: async (ctx, args) => {
    const { org } = await ctx.runQuery(orgContextRef, {
      orgSlug: args.orgSlug,
    });
    const inspiration = await ctx.runQuery(detailRef, {
      orgSlug: args.orgSlug,
      inspirationId: args.inspirationId,
    });
    if (inspiration.hasPlaceholder) {
      throw new ActionError("This inspiration is already anonymized");
    }

    const orgId = org.id;
    const { shouldDeductCredits, encryptedGeminiKey } =
      await validateCreditForFeature(ctx, {
        orgId,
        creditCost: CREDIT_COST_PER_ANONYMIZATION,
        featureName: "anonymization",
      });
    const geminiApiKey = await getGeminiApiKeyIfNeeded(
      shouldDeductCredits,
      encryptedGeminiKey,
    );

    let anonymizedUrl: string;
    try {
      anonymizedUrl = await anonymizeImage(inspiration.thumbnailUrls[0], {
        customApiKey: geminiApiKey,
        subject: true,
        text: false,
        logos: false,
      });
    } catch (error) {
      logger.error("[Anonymize] Failed to anonymize inspiration", error);
      throw error instanceof Error
        ? error
        : new ActionError("Failed to anonymize image. Please try again.");
    }

    await logGeminiUsageIfCustomKey(
      ctx,
      orgId,
      geminiApiKey,
      IMAGE_MODELS["gemini-3.1-flash"].apiModelId,
    );

    if (shouldDeductCredits) {
      await ctx.runMutation((internal as any).credits.deduct, {
        orgId,
        amount: CREDIT_COST_PER_ANONYMIZATION,
        type: "anonymization",
        reason: "anonymization",
        referenceId: args.inspirationId,
      });
    }

    const updated = await ctx.runMutation(
      args.mode === "replace"
        ? replaceWithAnonymizedRef
        : duplicateWithAnonymizedRef,
      {
        orgSlug: args.orgSlug,
        inspirationId: args.inspirationId,
        anonymizedUrl,
        anonymizedSubject: true,
        anonymizedText: inspiration.anonymizedText,
        anonymizedLogos: inspiration.anonymizedLogos,
        anonymizedTextDescription:
          inspiration.anonymizedTextDescription ?? undefined,
      },
    );

    void trackServerEvent(orgId, POSTHOG_EVENTS.INSPIRATION_ANONYMIZED, {
      mode: args.mode,
    });

    return updated;
  },
});

export const anonymizeTool = action({
  args: {
    orgSlug: v.string(),
    type: v.union(v.literal("youtube"), v.literal("upload")),
    youtubeUrl: v.optional(v.string()),
    bytes: v.optional(v.bytes()),
    fileName: v.optional(v.string()),
    contentType: v.optional(v.string()),
  },
  handler: async (_ctx, args) => {
    const { org } = await _ctx.runQuery(orgContextRef, {
      orgSlug: args.orgSlug,
    });
    let sourceImageUrl: string;

    if (args.type === "youtube") {
      if (!args.youtubeUrl) throw new ActionError("YouTube URL is required");
      const videoId = extractVideoId(args.youtubeUrl);
      if (!videoId) throw new ActionError("Invalid YouTube URL");
      sourceImageUrl = await downloadAndUploadImage(
        getThumbnailUrl(videoId),
        getFallbackThumbnailUrl(videoId),
      );
    } else {
      if (!args.bytes || !args.fileName || !args.contentType) {
        throw new ActionError("Invalid file");
      }
      validateImageUpload({
        bytes: args.bytes,
        fileName: args.fileName,
        contentType: args.contentType,
        maxBytes: 5 * 1024 * 1024,
      });
      sourceImageUrl = await uploadBytes({
        bytes: args.bytes,
        contentType: args.contentType,
        prefix: "anonymize-tool",
        fileName: `${Date.now()}-${args.fileName.replace(/[^a-zA-Z0-9._-]/g, "-")}`,
      });
    }

    const orgId = org.id;
    const { shouldDeductCredits, encryptedGeminiKey } =
      await validateCreditForFeature(_ctx, {
        orgId,
        creditCost: CREDIT_COST_PER_ANONYMIZATION,
        featureName: "anonymization",
      });
    const geminiApiKey = await getGeminiApiKeyIfNeeded(
      shouldDeductCredits,
      encryptedGeminiKey,
    );
    const anonymizedUrl = await anonymizeImage(sourceImageUrl, {
      customApiKey: geminiApiKey,
      prefix: "anonymize-tool",
    });

    await logGeminiUsageIfCustomKey(
      _ctx,
      orgId,
      geminiApiKey,
      IMAGE_MODELS["gemini-3.1-flash"].apiModelId,
    );

    if (shouldDeductCredits) {
      await _ctx.runMutation((internal as any).credits.deduct, {
        orgId,
        amount: CREDIT_COST_PER_ANONYMIZATION,
        type: "anonymization",
        reason: "anonymize tool",
      });
    }

    void trackServerEvent(orgId, "inspiration:anonymized", {
      source: "anonymize-tool",
      input_type: args.type,
    });

    return { sourceImageUrl, anonymizedUrl };
  },
});
