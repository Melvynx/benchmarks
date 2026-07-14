import { z } from "zod";
import {
  getDefaultModelId,
  resolveModelId,
  type ImageModel,
} from "@/lib/ai/image-models";
import { api } from "@convex/_generated/api";
import { fetchAuthMutationForRequest } from "@/lib/auth-server";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../../_shared/session";
import { getPathParam } from "../../../../_shared/params";

const GenerateBodySchema = z.object({
  promptId: z.string().optional(),
  prompt: z.string().trim().min(8).max(2000),
  model: z
    .string()
    .optional()
    .transform((value) => resolveModelId(value ?? getDefaultModelId())),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
  count: z.number().int().min(1).max(4).default(1),
  personIds: z.array(z.string()).default([]),
  inspirationIds: z.array(z.string()).default([]),
  userImageIds: z.array(z.string()).default([]),
  baseImageUrl: z.string().optional(),
  baseThumbnailId: z.string().optional(),
  editPrompt: z.string().optional(),
});

export default async function generate(event: NitroRequestEvent) {
  const orgSlug = getPathParam(event.req, 2);

  if (!orgSlug) {
    return Response.json(
      { message: "Missing organization slug" },
      { status: 400 },
    );
  }

  const result = await getRequiredOrgForSession(event, orgSlug);

  if (!result.org) {
    return Response.json(
      {
        message:
          result.status === 401 ? "Unauthorized" : "Organization not found",
      },
      { status: result.status },
    );
  }

  const parsed = GenerateBodySchema.safeParse(await event.req.json());

  if (!parsed.success) {
    return Response.json(
      {
        message: parsed.error.issues[0]?.message ?? "Invalid generation input",
      },
      { status: 400 },
    );
  }

  const {
    promptId,
    prompt: textPrompt,
    model,
    aspectRatio,
    count,
    personIds,
    inspirationIds,
    userImageIds,
    baseImageUrl,
    baseThumbnailId,
    editPrompt,
  } = parsed.data as {
    promptId?: string;
    prompt: string;
    model: ImageModel;
    aspectRatio: "16:9" | "9:16" | "1:1";
    count: number;
    personIds: string[];
    inspirationIds: string[];
    userImageIds: string[];
    baseImageUrl?: string;
    baseThumbnailId?: string;
    editPrompt?: string;
  };

  const created = await fetchAuthMutationForRequest(
    event.req,
    api.editor.createThumbnailGeneration,
    {
      orgSlug,
      promptId,
      prompt: textPrompt,
      model,
      aspectRatio,
      count,
      personIds,
      inspirationIds,
      userImageIds,
      baseImageUrl,
      baseThumbnailId,
      editPrompt,
    },
  );

  return Response.json({
    promptId: created.promptId,
    generationId: created.generationId,
    thumbnailIds: created.thumbnailIds,
  });
}
