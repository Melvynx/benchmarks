"use node";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { internal } from "./_generated/api";
import { CREDIT_COST_PER_IMAGE_DESCRIPTION } from "./credits";
import { POSTHOG_EVENTS } from "../src/features/posthog/posthog-events";
import { analyzeUploadedImage } from "../src/lib/ai/gemini";
import { RUNTIME_TEXT_MODEL } from "../src/lib/ai/text-models";
import { decryptApiKey } from "../src/lib/encryption";
import { logger } from "../src/lib/logger";
import { trackServerEvent } from "../src/lib/posthog";
import { actionGeneric, makeFunctionReference } from "convex/server";
import { v } from "convex/values";

const uploadContextRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  {
    orgId: string;
    plan: string;
    shouldDeductCredits: boolean;
    encryptedGeminiKey?: string;
  }
>("userImages:uploadContext");

const createFromUploadRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    storageId: string;
    name?: string;
    description?: string;
    contentType?: string;
  },
  { id: string; imageUrl: string; name: string; description: string | null }
>("userImages:createFromUpload");

export const createFromUpload = actionGeneric({
  args: {
    orgSlug: v.string(),
    storageId: v.id("_storage"),
    name: v.optional(v.string()),
    contentType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const uploadContext = await ctx.runQuery(uploadContextRef, {
      orgSlug: args.orgSlug,
    });

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Uploaded image not found");

    let name = "Image";
    let description: string | undefined;
    const customApiKey =
      uploadContext.shouldDeductCredits || !uploadContext.encryptedGeminiKey
        ? undefined
        : decryptApiKey(uploadContext.encryptedGeminiKey);

    try {
      const analysis = await analyzeUploadedImage(url, customApiKey);
      name = analysis.name;
      description = analysis.description;

      if (customApiKey) {
        await ctx.runMutation(
          (internal as any).userImages.logCustomGeminiUsage,
          {
            orgId: uploadContext.orgId,
            model: RUNTIME_TEXT_MODEL,
          },
        );
      }

      if (uploadContext.shouldDeductCredits) {
        await ctx.runMutation((internal as any).credits.deduct, {
          orgId: uploadContext.orgId,
          amount: CREDIT_COST_PER_IMAGE_DESCRIPTION,
          type: "image_description",
          reason: "image_description",
          referenceId: url,
        });
      }
    } catch (error) {
      logger.error("Failed to analyze uploaded image", error);
    }

    const userImage = await ctx.runMutation(createFromUploadRef, {
      orgSlug: args.orgSlug,
      storageId: args.storageId,
      name: name || args.name,
      description,
      contentType: args.contentType,
    });

    void trackServerEvent(uploadContext.orgId, POSTHOG_EVENTS.IMAGE_UPLOADED, {
      has_auto_analysis: description !== undefined,
    });

    return userImage;
  },
});
