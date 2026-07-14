import { AgentChat } from "@/features/agent/agent-chat";
import { canAccessThumbnailAgent } from "@/features/agent/thumbnail-agent-access";
import type { ThumbnailAgentAccessSettings } from "@/features/agent/thumbnail-agent-access";
import { useCurrentOrg } from "@/features/organization/current-org-store";
import { LoadingState } from "@/features/organization/loading-state";
import { formatScopedTitle } from "@/lib/metadata";
import { usePageMetadata } from "@/lib/use-page-metadata";
import { api } from "@convex/_generated/api";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import type { UIMessage } from "ai";
import { useEffect, useMemo } from "react";

const agentChatDetailRef = makeFunctionReference<
  "query",
  { orgSlug: string; chatId: string },
  { id: string; messages: UIMessage[] } | null
>("app:agentChatDetail");

export const Route = createFileRoute("/orgs/$orgSlug/agent/$chatId")({
  component: AgentChatRoute,
});

function getAndClearSessionInput(chatId: string) {
  if (typeof window === "undefined") return null;
  const key = `agent-chat-input-${chatId}`;
  const stored = sessionStorage.getItem(key);
  if (!stored) return null;
  sessionStorage.removeItem(key);
  return stored;
}

function AgentChatRoute() {
  const { orgSlug, chatId } = Route.useParams();
  const navigate = useNavigate({ from: "/orgs/$orgSlug/agent/$chatId" });
  const orgSettings = useQuery(api.app.orgSettings, {
    orgSlug,
  }) as ThumbnailAgentAccessSettings | undefined;
  const canAccessAgent = canAccessThumbnailAgent(orgSettings);
  const chat = useQuery(
    agentChatDetailRef,
    canAccessAgent ? { orgSlug, chatId } : "skip",
  );
  const currentOrg = useCurrentOrg();
  const initialInput = useMemo(
    () => (canAccessAgent ? getAndClearSessionInput(chatId) : null),
    [canAccessAgent, chatId],
  );
  const chatTitle =
    chat && chat.messages.length > 0
      ? getAgentChatTitle(chat.messages)
      : "Agent Chat";

  usePageMetadata(
    canAccessAgent && chat !== undefined
      ? {
          title: formatScopedTitle([chatTitle, currentOrg?.name ?? orgSlug]),
          description: "Thumbnail generation chat.",
          path: `/orgs/${orgSlug}/agent/${chatId}`,
          noIndex: true,
        }
      : null,
  );

  useEffect(() => {
    if (!orgSettings || canAccessAgent) return;

    void navigate({
      to: `/orgs/${orgSlug}` as never,
      replace: true,
    });
  }, [canAccessAgent, navigate, orgSettings, orgSlug]);

  if (!orgSettings || !canAccessAgent || chat === undefined) {
    return <LoadingState label="Loading agent chat" />;
  }

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] flex-col">
      <AgentChat
        chatId={chatId}
        initialMessages={chat?.messages ?? []}
        initialInput={initialInput}
      />
    </div>
  );
}

function getAgentChatTitle(messages: UIMessage[]) {
  const text = extractMessageText(
    messages.find((message) => message.role === "user"),
  );
  if (!text) return "Agent Chat";
  return text.replace(/\s+/g, " ").slice(0, 80);
}

function extractMessageText(message: UIMessage | undefined) {
  if (!message) return "";
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join(" ")
    .trim();
}
