import { ImageOffIcon } from "lucide-react"

import type { RunCover } from "@/lib/runs"

/**
 * Screenshots are captured at 1440x900 and downscaled to 480px WebP, so a tile
 * anchors to the top of the frame: the hero of a page identifies it, the fold
 * below it does not.
 */
function tileClass(extra: string) {
  return `overflow-hidden rounded-md border bg-muted ${extra}`
}

export function RunThumbnail({
  src,
  alt,
  className = "w-28",
}: {
  src: string | null
  alt: string
  className?: string
}) {
  if (!src) {
    return (
      <div
        className={tileClass(
          `flex aspect-16/10 items-center justify-center ${className}`
        )}
      >
        <ImageOffIcon
          aria-label={`${alt} — not captured`}
          className="size-4 text-muted-foreground/50"
        />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={tileClass(`aspect-16/10 object-cover object-top ${className}`)}
    />
  )
}

/** A group runs many apps at once, so its card previews one tile per task. */
export function RunCoverStrip({
  covers,
  extra,
}: {
  covers: RunCover[]
  extra: number
}) {
  // The slot keeps its width even when nothing was captured, so every card in
  // the list aligns on the same text column.
  if (!covers.length) {
    return (
      <div className="w-48 shrink-0">
        <RunThumbnail src={null} alt="No capture" className="w-1/3" />
      </div>
    )
  }

  return (
    <div className="grid w-48 shrink-0 grid-cols-3 gap-1">
      {covers.map((cover) => (
        <RunThumbnail
          key={cover.task}
          src={cover.thumbnail}
          alt={cover.task}
          className="w-full"
        />
      ))}
      {extra > 0 ? (
        <span className="flex aspect-16/10 items-center justify-center rounded-md border border-dashed font-mono text-[10px] text-muted-foreground">
          +{extra}
        </span>
      ) : null}
    </div>
  )
}
