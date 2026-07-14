import { getDefaultModelId, resolveModelId } from "@/lib/ai/image-models";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import { tool } from "ai";
import { makeFunctionReference } from "convex/server";
import { z } from "zod";
import type {
  BatchThumbnailResult,
  GenerateBatchResult,
  GenerateParams,
  GenerateResult,
  ToolContext,
} from "./types";

const createThumbnailGenerationRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    promptId?: string;
    prompt: string;
    model: string;
    aspectRatio: "16:9";
    count: number;
    personIds?: string[];
    inspirationIds?: string[];
    userImageIds?: string[];
    baseImageUrl?: string;
    editPrompt?: string;
  },
  {
    promptId: string;
    generationId: string;
    thumbnailId: string;
  }
>("editor:createThumbnailGeneration");

async function executeGeneration(
  ctx: ToolContext,
  params: GenerateParams,
): Promise<GenerateResult> {
  try {
    const result = await fetchAuthMutationForRequest(
      ctx.request,
      createThumbnailGenerationRef,
      {
        orgSlug: ctx.orgSlug,
        promptId: params.promptId,
        prompt: params.prompt,
        model: resolveModelId(params.model ?? getDefaultModelId()),
        aspectRatio: "16:9",
        count: 1,
        personIds: params.personIds,
        inspirationIds: params.inspirationIds,
        userImageIds: params.imageIds,
        baseImageUrl: params.baseImageUrl,
        editPrompt: params.editPrompt,
      },
    );

    return {
      success: true,
      thumbnailUrl: null,
      promptId: result.promptId,
      generationId: result.generationId,
      thumbnailId: result.thumbnailId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
    };
  }
}

type BatchConcept = {
  prompt: string;
  inspirationIds?: string[];
};

async function executeBatchGeneration(
  ctx: ToolContext,
  concepts: BatchConcept[],
  sharedParams: {
    personIds?: string[];
    imageIds?: string[];
    model?: string;
  },
): Promise<GenerateBatchResult> {
  const thumbnails = await Promise.all(
    concepts.map(async (concept): Promise<BatchThumbnailResult> => {
      const result = await executeGeneration(ctx, {
        prompt: concept.prompt,
        personIds: sharedParams.personIds,
        inspirationIds: concept.inspirationIds,
        imageIds: sharedParams.imageIds,
        model: sharedParams.model,
        source: "agent_batch",
      });

      if (!result.success) {
        return {
          success: false,
          generationId: "",
          prompt: concept.prompt,
          error: result.error,
        };
      }

      return {
        success: true,
        thumbnailUrl: result.thumbnailUrl ?? undefined,
        promptId: result.promptId,
        generationId: result.generationId,
        prompt: concept.prompt,
      };
    }),
  );

  const firstSuccess = thumbnails.find((thumbnail) => thumbnail.success);
  if (!firstSuccess) {
    return {
      success: false,
      error: thumbnails[0]?.error ?? "No thumbnails were generated",
    };
  }

  return {
    success: true,
    promptId: firstSuccess.promptId ?? "",
    thumbnails,
  };
}

export function createGenerationTools(ctx: ToolContext) {
  return {
    generate_thumbnail: tool({
      description:
        "Generate a single YouTube thumbnail from a prompt and optional references. The result is queued and appears in the thumbnail history.",
      inputSchema: z.object({
        prompt: z.string().describe("Detailed thumbnail generation prompt"),
        personIds: z.array(z.string()).optional(),
        inspirationIds: z.array(z.string()).optional(),
        imageIds: z.array(z.string()).optional(),
        model: z.string().optional(),
      }),
      execute: async (params) =>
        executeGeneration(ctx, { ...params, source: "agent_single" }),
    }),

    generate_thumbnails: tool({
      description:
        "Generate multiple thumbnail concepts for the same video idea. Use this when the user asks for several options.",
      inputSchema: z.object({
        concepts: z
          .array(
            z.object({
              prompt: z.string(),
              inspirationIds: z.array(z.string()).optional(),
            }),
          )
          .min(1)
          .max(4),
        personIds: z.array(z.string()).optional(),
        imageIds: z.array(z.string()).optional(),
        model: z.string().optional(),
      }),
      execute: async ({ concepts, personIds, imageIds, model }) =>
        executeBatchGeneration(ctx, concepts, { personIds, imageIds, model }),
    }),

    edit_thumbnail: tool({
      description:
        "Create an edited version of an existing thumbnail or image using a prompt.",
      inputSchema: z.object({
        prompt: z.string().describe("Edit prompt"),
        baseImageUrl: z.string().url().optional(),
        promptId: z.string().optional(),
        personIds: z.array(z.string()).optional(),
        inspirationIds: z.array(z.string()).optional(),
        imageIds: z.array(z.string()).optional(),
        model: z.string().optional(),
      }),
      execute: async (params) =>
        executeGeneration(ctx, {
          ...params,
          editPrompt: params.prompt,
          source: "agent_edit",
        }),
    }),
  };
}
