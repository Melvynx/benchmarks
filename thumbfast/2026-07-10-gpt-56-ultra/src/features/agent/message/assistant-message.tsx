import type { UIMessage } from "ai";
import { THUMBNAIL_RESULT_TOOLS } from "./constants";
import { MessageMarkdown } from "./message-markdown";
import { ThinkingBlock } from "./thinking-block";
import { ThumbnailCard } from "./thumbnail-card";
import { ThumbnailGrid } from "./thumbnail-grid";
import { ToolGroup } from "./tool-group";
import type { ParsedToolPart } from "./utils";
import { parseToolPart } from "./utils";

type RenderedPart =
  | { kind: "text"; text: string; key: string }
  | { kind: "reasoning"; text: string; key: string }
  | { kind: "tool"; tool: ParsedToolPart; key: string };

function classifyParts(message: UIMessage): RenderedPart[] {
  const result: RenderedPart[] = [];

  for (let i = 0; i < message.parts.length; i++) {
    const part = message.parts[i];
    const key = `${message.id}-${i}`;

    if (part.type === "text" && part.text.trim()) {
      result.push({ kind: "text", text: part.text, key });
      continue;
    }

    if (part.type === "reasoning" && part.text.trim()) {
      result.push({ kind: "reasoning", text: part.text, key });
      continue;
    }

    if (part.type === "step-start") continue;

    const toolData = parseToolPart(part);
    if (!toolData) continue;

    result.push({ kind: "tool", tool: toolData, key });
  }

  return result;
}

export function AssistantMessage({
  message,
  isStreaming = false,
}: {
  message: UIMessage;
  isStreaming?: boolean;
}) {
  const parts = classifyParts(message);
  if (parts.length === 0) return null;

  const lastReasoningKey = (() => {
    for (let i = parts.length - 1; i >= 0; i--) {
      if (parts[i].kind === "reasoning") return parts[i].key;
    }
    return null;
  })();

  const groups: RenderedPart[][] = [];
  let currentToolGroup: RenderedPart[] = [];

  const flushTools = () => {
    if (currentToolGroup.length > 0) {
      groups.push([...currentToolGroup]);
      currentToolGroup = [];
    }
  };

  for (const part of parts) {
    if (part.kind === "tool") {
      currentToolGroup.push(part);
    } else {
      flushTools();
      groups.push([part]);
    }
  }
  flushTools();

  return (
    <div className="flex flex-col gap-3">
      {groups.map((group, gi) => {
        if (group.length === 1 && group[0].kind !== "tool") {
          const part = group[0];
          if (part.kind === "text") {
            return <MessageMarkdown key={part.key} text={part.text} />;
          }
          const isCurrent = isStreaming && part.key === lastReasoningKey;
          return (
            <ThinkingBlock
              key={part.key}
              text={part.text}
              defaultOpen={isCurrent}
            />
          );
        }

        const toolParts = group as (RenderedPart & { kind: "tool" })[];

        const standaloneVisuals: (RenderedPart & { kind: "tool" })[] = [];
        const collapsedTools: (RenderedPart & { kind: "tool" })[] = [];

        for (const part of toolParts) {
          const isComplete = part.tool.state === "output-available";
          const output = part.tool.output;
          const isBatchThumbnail =
            isComplete &&
            output != null &&
            part.tool.toolName === "generate_thumbnails" &&
            output.success === true &&
            Array.isArray(output.thumbnails);

          const isThumbnailResult =
            isBatchThumbnail ||
            (isComplete &&
              output != null &&
              THUMBNAIL_RESULT_TOOLS.has(part.tool.toolName) &&
              output.success === true &&
              typeof output.thumbnailUrl === "string");

          if (isThumbnailResult) {
            standaloneVisuals.push(part);
          } else {
            collapsedTools.push(part);
          }
        }

        return (
          <div key={`group-${gi}`} className="flex flex-col gap-3">
            {collapsedTools.length > 0 && <ToolGroup tools={collapsedTools} />}
            {standaloneVisuals.map((part) =>
              part.tool.toolName === "generate_thumbnails" ? (
                <ThumbnailGrid key={part.key} tool={part.tool} />
              ) : (
                <StandaloneThumbnail key={part.key} tool={part.tool} />
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}

function StandaloneThumbnail({ tool }: { tool: ParsedToolPart }) {
  const url = tool.output?.thumbnailUrl as string;
  return <ThumbnailCard tool={tool} url={url} />;
}
