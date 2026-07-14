import type { UIMessage } from "ai";
import { AssistantMessage } from "./assistant-message";
import { UserMessage } from "./user-message";

export function AgentMessage({
  message,
  isStreaming = false,
}: {
  message: UIMessage;
  isStreaming?: boolean;
}) {
  if (message.role === "user") {
    return <UserMessage message={message} />;
  }
  return <AssistantMessage message={message} isStreaming={isStreaming} />;
}
