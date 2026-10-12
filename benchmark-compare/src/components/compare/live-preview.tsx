import { ImageOffIcon, MousePointerClickIcon } from "lucide-react"
import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * A 16:10 view of a generated app: its captured screenshot only. Generated
 * apps are heavy (WebGL, audio), so galleries never boot them; an app loads
 * only once someone clicks to open or compare it. Runs without a recorded
 * (or unreadable) thumbnail fall back to the headless capture cached in public/thumbs.
 */
export function cachedThumbnail(id: string) {
  return `/thumbs/${id.replaceAll("/", "__")}.webp`
}

export function LivePreview({
  id,
  thumbnail,
  label,
  canPreview,
  className,
}: {
  id?: string
  thumbnail: string | null
  url?: string
  label: string
  canPreview: boolean
  className?: string
}) {
  // Try the run's recorded capture, then the headless one; a broken image
  // steps to the next source and finally to the placeholder.
  const [failed, setFailed] = useState<string[]>([])
  const sources = [thumbnail, id && canPreview ? cachedThumbnail(id) : null].filter(
    (source): source is string => Boolean(source)
  )
  const src = sources.find((source) => !failed.includes(source)) ?? null

  return (
    <div className={cn("relative aspect-16/10 w-full overflow-hidden bg-muted/40", className)}>
      {src ? (
        <img
          key={src}
          src={src}
          alt={label}
          loading="lazy"
          decoding="async"
          // A server-rendered image can fail before hydration, when onError
          // isn't attached yet: check its state once it mounts.
          ref={(image) => {
            if (image?.complete && image.naturalWidth === 0) setFailed((list) => [...list, src])
          }}
          onError={() => setFailed((list) => [...list, src])}
          className="absolute inset-0 size-full object-cover object-top"
        />
      ) : (
        <div className="preview-placeholder absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground/70">
          {canPreview ? (
            <>
              <MousePointerClickIcon className="size-4" aria-hidden="true" />
              <span className="text-[11px]">No screenshot · click to load</span>
            </>
          ) : (
            <>
              <ImageOffIcon className="size-4" aria-hidden="true" />
              <span className="text-[11px]">No app output</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
