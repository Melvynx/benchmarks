import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import { Badge } from "@/components/ui/badge";
import { YoutubeThumbnail } from "@/features/inspiration/youtube-thumbnail";
import type { YoutubeVideoAnalysisResult } from "@/lib/ai/youtube-video";
import type { DynamicToolUIPart } from "ai";
import type { ParsedToolPart } from "./utils";

export function VideoAnalysisCard({ tool }: { tool: ParsedToolPart }) {
  const output = tool.output as YoutubeVideoAnalysisResult | null;
  if (!output) return null;

  const analysis = output.analysis;

  return (
    <Tool defaultOpen={Boolean(analysis)}>
      <ToolHeader
        type="dynamic-tool"
        toolName="analyze_youtube_video"
        title={output.title ?? "YouTube video"}
        state={tool.state as DynamicToolUIPart["state"]}
      />
      <ToolContent>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            {output.videoId && (
              <YoutubeThumbnail videoId={output.videoId} className="w-40" />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              {output.title && (
                <p className="text-sm leading-snug font-medium">
                  {output.title}
                </p>
              )}
              {output.author && (
                <p className="text-muted-foreground text-xs">{output.author}</p>
              )}
              {output.error && (
                <p className="text-destructive text-xs">{output.error}</p>
              )}
            </div>
          </div>

          {analysis && (
            <div className="flex flex-col gap-3 text-sm">
              <p className="border-primary/40 bg-muted/40 rounded-r-md border-l-2 px-3 py-2 italic">
                {analysis.hook}
              </p>
              <p className="text-muted-foreground">{analysis.summary}</p>

              {analysis.thumbnailConcepts.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                    Thumbnail concepts
                  </p>
                  <ol className="flex list-inside list-decimal flex-col gap-1">
                    {analysis.thumbnailConcepts.map((concept, index) => (
                      <li key={`concept-${index}`} className="leading-relaxed">
                        {concept.concept}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {analysis.overlayTextIdeas.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {analysis.overlayTextIdeas.map((text, index) => (
                    <Badge key={`overlay-${index}`} variant="secondary">
                      {text}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </ToolContent>
    </Tool>
  );
}
