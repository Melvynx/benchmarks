import { useEffect, useRef, useState } from "react";

import {
  jpegFallback,
  webpSrcSet,
  type CampaignFrame,
} from "../lib/campaign";
import { cx } from "../lib/cx";

type CampaignImageProps = {
  frame: CampaignFrame;
  /** Wrapper classes. The wrapper owns the crop and the colour stand-in. */
  className?: string;
  /** Extra classes on the bitmap, for drift or custom object-fit. */
  imgClassName?: string;
  sizes?: string;
  /** Hero only. Loads eagerly and skips lazy decoding. */
  priority?: boolean;
  /** Slow push, used on full bleed frames. Honours reduced motion via CSS. */
  drift?: boolean;
  /** Overlaid on top of the bitmap, typically a scrim or a grade. */
  children?: React.ReactNode;
};

/**
 * Responsive campaign frame with a gradient stand-in and a soft fade up.
 *
 * The wrapper is painted with the frame's colour chord immediately, so the
 * section is never a black hole while a 100KB bitmap decodes; the image then
 * cross fades in over it.
 */
export function CampaignImage({
  frame,
  className,
  imgClassName,
  sizes = "100vw",
  priority = false,
  drift = false,
  children,
}: CampaignImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // A cached image can finish before React attaches onLoad, in which case the
  // event never fires and the frame would stay hidden. Check on mount.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div
      className={cx("relative overflow-hidden", className)}
      style={{ background: frame.chord }}
    >
      <picture>
        <source type="image/webp" srcSet={webpSrcSet(frame)} sizes={sizes} />
        <img
          ref={imgRef}
          src={jpegFallback(frame)}
          alt={frame.alt}
          sizes={sizes}
          width={3272}
          height={1834}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          fetchPriority={priority ? "high" : "auto"}
          onLoad={() => setLoaded(true)}
          style={{ objectPosition: frame.focus }}
          className={cx(
            "absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-out",
            loaded ? "opacity-100" : "opacity-0",
            drift && "animate-drift",
            imgClassName,
          )}
        />
      </picture>
      {children}
    </div>
  );
}
