import type { CSSProperties } from "react";

import type { CampaignImage } from "../lib/images";

type CampaignImageProps = {
  image: CampaignImage;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  priority?: boolean;
  style?: CSSProperties;
  /** Decorative images inside a text section get an empty alt. */
  decorative?: boolean;
};

export function CampaignPicture({
  image,
  className = "",
  imgClassName = "",
  sizes = "100vw",
  priority = false,
  style,
  decorative = false,
}: CampaignImageProps) {
  return (
    <div
      className={`overflow-hidden bg-ink-2 ${className}`}
      style={{
        backgroundImage: `url(${image.placeholder})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        ...style,
      }}
    >
      <img
        src={image.src}
        srcSet={image.srcSet}
        sizes={sizes}
        alt={decorative ? "" : image.alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        fetchPriority={priority ? "high" : "auto"}
        className={`block h-full w-full object-cover ${imgClassName}`}
        draggable={false}
      />
    </div>
  );
}
