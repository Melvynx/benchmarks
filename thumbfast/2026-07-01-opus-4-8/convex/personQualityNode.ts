"use node";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this Convex module reuses dynamic generated component/table APIs that cannot be typed precisely without a larger generated-API migration.
import { internal } from "./_generated/api";
import { CREDIT_COST_PER_PERSON_IMAGE_CHECK } from "./credits";
import {
  analyzePersonImageQuality,
  type PersonImageQuality,
} from "../src/lib/ai/gemini";
import { RUNTIME_TEXT_MODEL } from "../src/lib/ai/text-models";
import { decryptApiKey } from "../src/lib/encryption";
import { logger } from "../src/lib/logger";
import { actionGeneric, makeFunctionReference } from "convex/server";
import { v } from "convex/values";

const FEATURE_NAME = "person_image_check";

const orgContextRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  { org: { id: string } }
>("inspiration:orgContext");

const geminiFeatureAccessRef = makeFunctionReference<
  "query",
  { orgId: string; creditCost: number; featureName: string },
  { shouldDeductCredits: boolean; encryptedGeminiKey?: string }
>("inspiration:geminiFeatureAccess");

export const checkPersonImageQuality = actionGeneric({
  args: { orgSlug: v.string(), imageUrl: v.string() },
  handler: async (ctx, args): Promise<PersonImageQuality> => {
    const { org } = await ctx.runQuery(orgContextRef, {
      orgSlug: args.orgSlug,
    });

    const access = await ctx.runQuery(geminiFeatureAccessRef, {
      orgId: org.id,
      creditCost: CREDIT_COST_PER_PERSON_IMAGE_CHECK,
      featureName: FEATURE_NAME,
    });

    const customApiKey =
      access.shouldDeductCredits || !access.encryptedGeminiKey
        ? undefined
        : decryptApiKey(access.encryptedGeminiKey);

    const quality = await analyzePersonImageQuality(
      args.imageUrl,
      customApiKey,
    );

    if (customApiKey) {
      await ctx.runMutation((internal as any).userImages.logCustomGeminiUsage, {
        orgId: org.id,
        model: RUNTIME_TEXT_MODEL,
      });
    }

    if (access.shouldDeductCredits) {
      await ctx.runMutation((internal as any).credits.deduct, {
        orgId: org.id,
        amount: CREDIT_COST_PER_PERSON_IMAGE_CHECK,
        type: FEATURE_NAME,
        reason: FEATURE_NAME,
        referenceId: args.imageUrl,
      });
    }

    logger.info(`[Person Quality] Completed check for org ${org.id}`);
    return quality;
  },
});
