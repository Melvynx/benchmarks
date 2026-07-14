import { Loader2 } from "lucide-react";
import { useParams } from "@/compat/navigation";
import { Fragment, useState } from "react";
import { Check, ChevronDown, ExternalLink, Wrench } from "lucide-react";
import Link from "@/compat/link";
import { GALLERY_TOOLS, TOOL_META, THUMBNAIL_RESULT_TOOLS } from "./constants";
import { ToolResultGallery } from "./tool-result-gallery";
import { ThumbnailCard } from "./thumbnail-card";
import { VideoAnalysisCard } from "./video-analysis-card";
import type { ParsedToolPart } from "./utils";
import { formatToolName, getArgsPreview, getResultInfo } from "./utils";

type ToolRenderedPart = {
  kind: "tool";
  tool: ParsedToolPart;
  key: string;
};

export function ToolGroup({ tools }: { tools: ToolRenderedPart[] }) {
  const [expanded, setExpanded] = useState(false);
  const allComplete = tools.every((t) => t.tool.state === "output-available");

  const shouldCollapse = allComplete && tools.length > 3;
  const visibleTools = shouldCollapse && !expanded ? tools.slice(0, 2) : tools;
  const hiddenCount = tools.length - visibleTools.length;

  return (
    <div className="border-muted-foreground/10 flex flex-col gap-0.5 border-l-2 pl-3">
      {visibleTools.map((part) => (
        <ToolLineWithGallery key={part.key} tool={part.tool} />
      ))}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-muted-foreground/50 hover:text-muted-foreground flex items-center gap-1 py-0.5 text-xs transition-colors"
        >
          <ChevronDown className="size-3" />
          <span>
            {hiddenCount} more step{hiddenCount > 1 ? "s" : ""}
          </span>
        </button>
      )}
    </div>
  );
}

function ToolLineWithGallery({ tool }: { tool: ParsedToolPart }) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const isComplete = tool.state === "output-available";

  const output = tool.output;
  if (!isComplete || !output) {
    return <ToolLine tool={tool} />;
  }

  if (tool.toolName === "analyze_youtube_video") {
    return <VideoAnalysisCard tool={tool} />;
  }

  const isThumbnailResult =
    THUMBNAIL_RESULT_TOOLS.has(tool.toolName) &&
    output.success === true &&
    typeof output.thumbnailUrl === "string";

  const isGalleryResult = GALLERY_TOOLS.has(tool.toolName);

  return (
    <div className="flex flex-col gap-2">
      <ToolLine tool={tool} />
      {isThumbnailResult && (
        <ThumbnailCard tool={tool} url={output.thumbnailUrl as string} />
      )}
      {isGalleryResult && !isThumbnailResult && (
        <ToolResultGallery
          toolName={tool.toolName}
          output={output}
          orgSlug={orgSlug}
        />
      )}
    </div>
  );
}

function ToolLine({ tool }: { tool: ParsedToolPart }) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const meta = TOOL_META[tool.toolName] ?? {
    icon: Wrench,
    label: formatToolName(tool.toolName),
    verb: `Running ${formatToolName(tool.toolName)}`,
  };
  const Icon = meta.icon;
  const isComplete = tool.state === "output-available";
  const argsPreview = getArgsPreview(tool.toolName, tool.input);
  const result = tool.output
    ? getResultInfo(tool.toolName, tool.output, orgSlug)
    : null;

  return (
    <div className="flex items-center gap-2 py-0.5 text-xs">
      {isComplete ? (
        <Check className="size-3 shrink-0 text-green-500" />
      ) : (
        <Loader2 className="size-3 shrink-0 animate-spin" />
      )}
      <Icon className="text-muted-foreground size-3 shrink-0" />
      <span className="text-muted-foreground shrink-0">
        {isComplete ? meta.label : meta.verb}
      </span>
      {argsPreview && (
        <span className="text-muted-foreground/50 min-w-0 truncate">
          {argsPreview}
        </span>
      )}
      {isComplete && result?.summary && (
        <Fragment>
          <span className="text-muted-foreground/30 shrink-0">-</span>
          <span className="text-muted-foreground/50 min-w-0 truncate">
            {result.summary}
          </span>
        </Fragment>
      )}
      {isComplete && result?.href && (
        <Link
          href={result.href}
          className="text-primary ml-auto flex shrink-0 items-center gap-1 hover:underline"
        >
          <ExternalLink className="size-2.5" />
        </Link>
      )}
    </div>
  );
}
