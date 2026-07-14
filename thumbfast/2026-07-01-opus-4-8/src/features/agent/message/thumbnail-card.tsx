import { ExternalLink } from "lucide-react";
import Image from "@/compat/image";
import Link from "@/compat/link";
import { useParams } from "@/compat/navigation";
import type { ParsedToolPart } from "./utils";
import { getArgsPreview, getResultInfo } from "./utils";

export function ThumbnailCard({
  tool,
  url,
}: {
  tool: ParsedToolPart;
  url: string;
}) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  const argsPreview = getArgsPreview(tool.toolName, tool.input);
  const result = tool.output
    ? getResultInfo(tool.toolName, tool.output, orgSlug)
    : null;

  return (
    <div className="flex flex-col gap-1.5">
      {argsPreview && (
        <p className="text-muted-foreground/50 text-xs">{argsPreview}</p>
      )}
      <Link
        href={result?.href ?? "#"}
        className="group relative overflow-hidden rounded-xl border transition-all hover:shadow-md"
      >
        <Image
          src={url}
          alt="Generated thumbnail"
          width={640}
          height={360}
          className="h-auto w-full"
          unoptimized
        />
        {tool.state === "output-available" && result?.href && (
          <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-xs text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
            Open
            <ExternalLink className="size-3" />
          </div>
        )}
      </Link>
    </div>
  );
}
