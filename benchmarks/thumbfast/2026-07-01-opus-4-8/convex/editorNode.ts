"use node";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Intentional any: this legacy Convex module still uses dynamic component and table APIs that cannot be typed precisely without a larger generated-API migration.
import { internal } from "./_generated/api";
import { internalActionGeneric, makeFunctionReference } from "convex/server";
import { v } from "convex/values";

const preparePromptAutoNameRef = makeFunctionReference<
  "mutation",
  { orgId: string; promptId: string },
  | { shouldGenerate: false }
  | {
      shouldGenerate: true;
      orgId: string;
      promptId: string;
      textPrompt: string;
      personDescriptions: string[];
      inspirationDescription: string;
      encryptedGeminiKey?: string;
      shouldDeductCredits: boolean;
    }
>("editor:preparePromptAutoName");

const applyPromptAutoNameRef = makeFunctionReference<
  "mutation",
  {
    orgId: string;
    promptId: string;
    name: string;
    shouldDeductCredits: boolean;
    usedCustomApiKey: boolean;
  },
  { skipped: boolean; name?: string }
>("editor:applyPromptAutoName");

export const autoNamePrompt = internalActionGeneric({
  args: { orgId: v.string(), promptId: v.string() },
  handler: async (ctx, args) => {
    const job = await ctx.runMutation(preparePromptAutoNameRef, {
      orgId: args.orgId,
      promptId: args.promptId,
    });

    if (!job.shouldGenerate) return { skipped: true };

    try {
      const { decryptApiKey } = await import("../src/lib/encryption");
      const { generatePromptName } = await import("../src/lib/ai/gemini");
      const customApiKey = job.encryptedGeminiKey
        ? decryptApiKey(job.encryptedGeminiKey)
        : undefined;
      const name = await generatePromptName({
        textPrompt: job.textPrompt,
        personDescriptions:
          job.personDescriptions.length > 0
            ? job.personDescriptions
            : undefined,
        inspirationDescription: job.inspirationDescription || undefined,
        customApiKey,
      });

      return ctx.runMutation(applyPromptAutoNameRef, {
        orgId: job.orgId,
        promptId: job.promptId,
        name,
        shouldDeductCredits: job.shouldDeductCredits,
        usedCustomApiKey: Boolean(customApiKey),
      });
    } catch {
      return { skipped: true };
    }
  },
});

export const runThumbnailGeneration = internalActionGeneric({
  args: {
    orgId: v.string(),
    generationId: v.string(),
    thumbnailId: v.string(),
  },
  handler: async (ctx, args) => {
    const job = await ctx.runMutation(
      (internal as any).editor.claimThumbnailGeneration,
      {
        orgId: args.orgId,
        generationId: args.generationId,
        thumbnailId: args.thumbnailId,
      },
    );

    if (!job.claimed) return { skipped: true };

    let generated:
      | {
          success: true;
          url: string;
          watermarkedUrl?: string;
          generationTimeMs: number;
          model: string;
          requestedModel: string;
          routingDefaultModel: string;
          routingFinalProvider: string;
          routingFinalApi: string;
          routingFinalApiModelId: string;
          routingFallbackUsed: boolean;
          routingAttempts: {
            model: string;
            provider: string;
            api: string;
            apiModelId: string;
            status: "succeeded" | "failed";
            durationMs: number;
            error?: string;
            customKeyProvider?: "openai" | "gemini" | "apiyi";
          }[];
        }
      | {
          success: false;
          error: string;
          requestedModel?: string;
          routingDefaultModel?: string;
          routingAttempts?: {
            model: string;
            provider: string;
            api: string;
            apiModelId: string;
            status: "succeeded" | "failed";
            durationMs: number;
            error?: string;
            customKeyProvider?: "openai" | "gemini" | "apiyi";
          }[];
        };
    let customKeyUsages: {
      provider: "openai" | "gemini" | "apiyi";
      model: string;
    }[] = [];

    try {
      const { decryptApiKey } = await import("../src/lib/encryption");
      const { getConvexModelProvider, getConvexModelRoute } =
        await import("./generationConfig");
      const { generateThumbnail } = await import("../src/lib/ai/images");
      const customApiKeys = job.useCustomApiKey
        ? {
            openaiApiKey: job.encryptedApiKeys.openai
              ? decryptApiKey(job.encryptedApiKeys.openai)
              : undefined,
            geminiApiKey: job.encryptedApiKeys.gemini
              ? decryptApiKey(job.encryptedApiKeys.gemini)
              : undefined,
            apiyiApiKey: job.encryptedApiKeys.apiyi
              ? decryptApiKey(job.encryptedApiKeys.apiyi)
              : undefined,
          }
        : undefined;
      const hasCustomKeyForProvider = (
        provider: "openai" | "gemini" | "apiyi",
      ) => {
        if (provider === "openai") return Boolean(customApiKeys?.openaiApiKey);
        if (provider === "gemini") return Boolean(customApiKeys?.geminiApiKey);
        return Boolean(customApiKeys?.apiyiApiKey);
      };
      const routeProviders = getConvexModelRoute(
        job.model,
        Boolean(job.routingForceOfficialFirst),
      ).map((model) => getConvexModelProvider(model));
      const defaultProvider = getConvexModelProvider(
        job.routingDefaultModel ?? job.model,
      );
      if (
        job.useCustomApiKey &&
        ![defaultProvider, ...routeProviders].some(hasCustomKeyForProvider)
      ) {
        throw new Error(
          "Matching custom API key is missing for this generation",
        );
      }

      generated = await generateThumbnail({
        prompt: job.prompt,
        orgId: args.orgId,
        model: job.model,
        aspectRatio: job.aspectRatio,
        personDescriptions: job.personDescriptions,
        personImages: job.personImages,
        inspirationDescription: job.inspirationDescription || undefined,
        inspirationImages: job.inspirationImages,
        userImages: job.userImages,
        baseImageUrl: job.baseImageUrl ?? undefined,
        editPrompt: job.editPrompt ?? undefined,
        hasPlaceholderMannequin: job.hasPlaceholderMannequin,
        hasAnonymizedTextPlaceholders: job.hasAnonymizedTextPlaceholders,
        hasAnonymizedLogoPlaceholders: job.hasAnonymizedLogoPlaceholders,
        customApiKeys,
        applyWatermark: job.applyWatermark,
        routingDefaultModel: job.routingDefaultModel,
        routingForceOfficialFirst: job.routingForceOfficialFirst,
      });

      customKeyUsages = getCustomKeyUsages(generated.routingAttempts);
    } catch (error) {
      generated = {
        success: false,
        error: error instanceof Error ? error.message : "Generation failed",
      };
    }

    await ctx.runMutation((internal as any).editor.finishGeneration, {
      orgId: args.orgId,
      generationId: args.generationId,
      thumbnailId: args.thumbnailId,
      status: generated.success ? "succeeded" : "failed",
      model: generated.success ? generated.model : job.model,
      url: generated.success ? generated.url : undefined,
      watermarkedUrl: generated.success ? generated.watermarkedUrl : undefined,
      errorMessage: generated.success ? undefined : generated.error,
      generationTimeMs: generated.success
        ? generated.generationTimeMs
        : undefined,
      customKeyUsages,
      requestedModel: generated.success
        ? generated.requestedModel
        : generated.requestedModel,
      routingDefaultModel: generated.success
        ? generated.routingDefaultModel
        : generated.routingDefaultModel,
      routingFinalProvider: generated.success
        ? generated.routingFinalProvider
        : undefined,
      routingFinalApi: generated.success
        ? generated.routingFinalApi
        : undefined,
      routingFinalApiModelId: generated.success
        ? generated.routingFinalApiModelId
        : undefined,
      routingFallbackUsed: generated.success
        ? generated.routingFallbackUsed
        : (generated.routingAttempts?.length ?? 0) > 1,
      routingAttempts: generated.success
        ? generated.routingAttempts
        : generated.routingAttempts,
    });

    return { skipped: false };
  },
});

export function getCustomKeyUsages(
  attempts:
    | { model: string; customKeyProvider?: "openai" | "gemini" | "apiyi" }[]
    | undefined,
) {
  if (!attempts) return [];
  return attempts.flatMap((attempt) =>
    attempt.customKeyProvider
      ? [{ provider: attempt.customKeyProvider, model: attempt.model }]
      : [],
  );
}
