import { usePrompt } from "@/features/editor/editor.query";
import type { ThumbnailData } from "@/features/editor/editor.query";
import { getAspectRatioClass } from "@/lib/ai/aspect-ratio";
import { AlertCircle, Loader2 } from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { useParams } from "@/compat/navigation";
import type { ParsedToolPart } from "./utils";

type ThumbnailResult = {
  success: boolean;
  thumbnailUrl?: string;
  generationId: string;
  prompt: string;
  error?: string;
};

export function ThumbnailGrid({ tool }: { tool: ParsedToolPart }) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const output = tool.output;
  const promptId = output?.promptId ? String(output.promptId) : null;

  // Generations are queued asynchronously; subscribe to the prompt so cards
  // upgrade live from "Generating" to the final image.
  const { data: livePrompt } = usePrompt(orgSlug, promptId ?? "", {
    enabled: Boolean(promptId),
  });

  if (!output?.thumbnails || !Array.isArray(output.thumbnails)) return null;

  const thumbnails = output.thumbnails as ThumbnailResult[];
  const aspectRatio = tool.input?.aspectRatio as string | undefined;

  const liveByGenerationId = new Map<string, ThumbnailData>();
  for (const generation of livePrompt?.generations ?? []) {
    const liveThumbnail = generation.thumbnails.at(0);
    if (liveThumbnail) {
      liveByGenerationId.set(generation.id, liveThumbnail);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2">
        {thumbnails.map((thumb) => {
          const href = promptId
            ? `/orgs/${orgSlug}/thumbnails/${promptId}?generation=${thumb.generationId}`
            : "#";
          const live = liveByGenerationId.get(thumb.generationId);
          const imageUrl = thumb.thumbnailUrl ?? live?.imageUrl ?? null;
          const hasFailed =
            !thumb.success || (live ? live.status === "failed" : false);

          return (
            <div key={thumb.generationId} className="flex flex-col gap-1">
              {imageUrl && !hasFailed ? (
                <Link
                  href={href}
                  className="group relative overflow-hidden rounded-lg border transition-all hover:shadow-md"
                >
                  <Image
                    src={imageUrl}
                    alt="Generated thumbnail"
                    width={420}
                    height={236}
                    className={`${getAspectRatioClass(aspectRatio)} w-full object-cover`}
                    unoptimized
                  />
                </Link>
              ) : hasFailed ? (
                <div
                  className={`flex ${getAspectRatioClass(aspectRatio)} items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30`}
                >
                  <div className="flex flex-col items-center gap-1 px-2 text-center">
                    <AlertCircle className="size-4 text-red-400" />
                    <span className="text-[10px] text-red-500">
                      {thumb.error ?? live?.error ?? "Failed"}
                    </span>
                  </div>
                </div>
              ) : (
                <Link
                  href={href}
                  className={`bg-muted/40 flex ${getAspectRatioClass(aspectRatio)} items-center justify-center rounded-lg border`}
                >
                  <div className="flex flex-col items-center gap-1 px-2 text-center">
                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                    <span className="text-muted-foreground text-[10px]">
                      Generating...
                    </span>
                  </div>
                </Link>
              )}
              <p className="text-muted-foreground/50 line-clamp-2 text-[10px] leading-tight">
                {thumb.prompt}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
