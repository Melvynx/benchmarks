import { buildAgentSystemPrompt } from "@/features/agent/agent-system-prompt";
import { canAccessThumbnailAgent } from "@/features/agent/thumbnail-agent-access";
import { createAgentTools } from "@/features/agent/tools";
import {
  TEXT_MODELS,
  resolveTextModelId,
  type TextModelId,
} from "@/lib/ai/text-models";
import {
  fetchAuthMutationForRequest,
  fetchAuthQueryForRequest,
} from "@/lib/auth-server";
import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { makeFunctionReference } from "convex/server";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { z } from "zod";
import { getPathParam } from "../../../../_shared/params";
import {
  getRequiredOrgForSession,
  type NitroRequestEvent,
} from "../../../../_shared/session";

type AgentProviderOptions = NonNullable<
  Parameters<typeof streamText>[0]["providerOptions"]
>;

const ChatRequestSchema = z.object({
  chatId: z.string().min(1),
  model: z.string().optional(),
  thinkingEnabled: z.boolean().default(false),
  messages: z.array(z.custom<UIMessage>()).default([]),
});

const agentChatDetailRef = makeFunctionReference<
  "query",
  { orgSlug: string; chatId: string },
  { messages: UIMessage[] } | null
>("app:agentChatDetail");

const agentPromptContextRef = makeFunctionReference<
  "query",
  { orgSlug: string },
  {
    personCount: number;
    recentPromptCount: number;
    topInspirationCategories: string[];
    topUserImageNames: string[];
  }
>("app:agentPromptContext");

const saveAgentChatRef = makeFunctionReference<
  "mutation",
  {
    orgSlug: string;
    chatId: string;
    title?: string;
    messages: unknown;
  },
  null
>("app:saveAgentChat");

function firstUserText(messages: UIMessage[]) {
  const firstUser = messages.find((message) => message.role === "user");
  if (!firstUser) return undefined;

  const textPart = firstUser.parts.find(
    (part): part is { type: "text"; text: string } => part.type === "text",
  );
  return textPart ? textPart.text.slice(0, 100) : undefined;
}

function getAgentModel(model: TextModelId) {
  const config = TEXT_MODELS[model];
  return config.provider === "openai"
    ? openai(config.apiModelId)
    : google(config.apiModelId);
}

function getAgentProviderOptions(
  model: TextModelId,
  thinkingEnabled: boolean,
): AgentProviderOptions {
  const config = TEXT_MODELS[model];

  if (config.provider === "openai") {
    const reasoningEffort = thinkingEnabled ? "medium" : "none";
    return {
      openai: {
        reasoningEffort,
      },
    };
  }

  if (thinkingEnabled) {
    return {
      google: {
        thinkingConfig: {
          includeThoughts: true,
          thinkingLevel: "medium",
        },
      },
    };
  }

  return {
    google: {
      thinkingConfig: {
        includeThoughts: false,
        thinkingBudget: 0,
      },
    },
  };
}

export default async function agentChat(event: NitroRequestEvent) {
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

  if (
    !canAccessThumbnailAgent({ role: result.role, features: result.features })
  ) {
    return Response.json({ message: "Forbidden" }, { status: 403 });
  }

  const parsed = ChatRequestSchema.safeParse(await event.req.json());
  if (!parsed.success) {
    return Response.json({ message: "Invalid request body" }, { status: 400 });
  }

  const { chatId, messages, thinkingEnabled } = parsed.data;
  const selectedModel = resolveTextModelId(parsed.data.model);

  let existingChat: { messages: UIMessage[] } | null;
  let promptContext: {
    personCount: number;
    recentPromptCount: number;
    topInspirationCategories: string[];
    topUserImageNames: string[];
  };
  try {
    [existingChat, promptContext] = await Promise.all([
      fetchAuthQueryForRequest(event.req, agentChatDetailRef, {
        orgSlug,
        chatId,
      }),
      fetchAuthQueryForRequest(event.req, agentPromptContextRef, { orgSlug }),
    ]);
  } catch {
    return Response.json(
      { message: "Failed to load agent context" },
      { status: 500 },
    );
  }
  const originalMessages = existingChat?.messages.length
    ? existingChat.messages
    : messages;

  const stream = createUIMessageStream({
    originalMessages,
    execute: async ({ writer }) => {
      const textStream = streamText({
        model: getAgentModel(selectedModel),
        system: buildAgentSystemPrompt({
          orgName: result.org.name,
          personCount: promptContext.personCount,
          recentPromptCount: promptContext.recentPromptCount,
          topInspirationCategories: promptContext.topInspirationCategories,
          topUserImageNames: promptContext.topUserImageNames,
          todayIso: new Date().toISOString().slice(0, 10),
        }),
        messages: await convertToModelMessages(messages),
        providerOptions: getAgentProviderOptions(
          selectedModel,
          thinkingEnabled,
        ),
        tools: createAgentTools({
          request: event.req,
          orgId: result.org.id,
          orgSlug,
          plan: "free",
        }),
        stopWhen: stepCountIs(16),
      });

      writer.merge(textStream.toUIMessageStream({ originalMessages }));
    },
    onFinish: async ({ messages: uiMessages }) => {
      await fetchAuthMutationForRequest(event.req, saveAgentChatRef, {
        orgSlug,
        chatId,
        title: firstUserText(uiMessages),
        messages: JSON.parse(JSON.stringify(uiMessages)),
      });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
