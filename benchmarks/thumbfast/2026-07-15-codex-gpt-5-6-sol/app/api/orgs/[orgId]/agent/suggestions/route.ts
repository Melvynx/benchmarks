import { getAnalysisModel } from "@/lib/ai/gemini";
import { logger } from "@/lib/logger";
import { getCurrentOrg } from "@/lib/organizations/get-org";
import { generateObject } from "ai";
import { z } from "zod";

export const maxDuration = 20;

const RequestSchema = z.object({
  recent: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string().max(2000),
      }),
    )
    .min(1)
    .max(8),
});

const SuggestionsSchema = z.object({
  suggestions: z
    .array(z.string().min(2).max(60))
    .min(2)
    .max(3)
    .describe(
      "Three short follow-up actions (under 60 chars each) the user could take next, written from the user's POV in the imperative.",
    ),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;

  const org = await getCurrentOrg({ orgSlugOrId: orgId });
  if (!org) {
    return new Response("Unauthorized", { status: 401 });
  }

  const parsed = RequestSchema.safeParse(await req.json());
  if (!parsed.success) {
    return new Response("Invalid request body", { status: 400 });
  }

  const transcript = parsed.data.recent
    .map((m) => `${m.role.toUpperCase()}: ${m.text.slice(0, 1000)}`)
    .join("\n\n");

  try {
    const result = await generateObject({
      model: getAnalysisModel(),
      schema: SuggestionsSchema,
      messages: [
        {
          role: "user",
          content: `You are helping a YouTube creator decide what to ask a thumbnail-generating AI agent next. Based on the recent conversation below, propose 3 short, distinct follow-up actions.

Rules:
- Each suggestion is under 60 characters.
- Phrase them from the user's perspective ("Make a darker variation of #2", "Edit the background to white", "Try a shocked expression").
- Suggestions must be specific to the actual conversation, not generic.
- Do not repeat what was just done. Suggest the obvious next move.

Conversation:
${transcript}`,
        },
      ],
    });

    return Response.json({ suggestions: result.object.suggestions });
  } catch (error) {
    logger.warn("[AgentSuggestions] generation failed", { error });
    return Response.json({ suggestions: [] });
  }
}
