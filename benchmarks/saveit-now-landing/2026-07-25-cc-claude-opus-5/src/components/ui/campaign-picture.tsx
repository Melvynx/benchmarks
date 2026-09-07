import { useState } from "react";

import type { CampaignImage } from "../../lib/campaign-images";

type Props = {
  image: CampaignImage;
  /** Layout hint for the browser's source selection. */
  sizes?: string;
  /** Only the hero should load eagerly; everything else waits. */
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /**
   * Marks the render as decoration when the surrounding copy already carries
   * the meaning, so screen readers are not read a scenery description twice.
   */
  decorative?: boolean;
};

/**
 * Responsive campaign artwork: WebP candidates with a JPEG fallback, painted
 * over the frame's average tone and faded in once decoded.
 */
export function CampaignPicture({
  image,
  sizes = "100vw",
  priority = false,
  className = "",
  imgClassName = "",
  decorative = false,
}: Props) {
  const [loaded, setLoaded] = useState(false);

  return (
    <picture
      className={`block ${className}`}
      style={{ backgroundColor: image.tone }}
    >
      <source type="image/webp" srcSet={image.srcSet} sizes={sizes} />
      <img
        src={image.fallback}
        alt={decorative ? "" : image.alt}
        aria-hidden={decorative || undefined}
        width={3272}
        height={1834}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-700 ${
          loaded ? "opacity-100" : "opacity-0"
        } ${imgClassName}`}
      />
    </picture>
  );
}
