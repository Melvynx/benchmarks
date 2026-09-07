import type { CampaignImage } from "../../lib/campaign-images";

type CampaignPictureProps = {
  image: CampaignImage;
  className?: string;
  sizes?: string;
  priority?: boolean;
  /** Extra classes on the img element, for example an ambient drift. */
  imgClassName?: string;
};

/**
 * Renders one of the supplied campaign images with responsive sources.
 */
export function CampaignPicture({
  image,
  className = "",
  sizes = "100vw",
  priority = false,
  imgClassName = "",
}: CampaignPictureProps) {
  return (
    <img
      src={image.src}
      srcSet={image.srcSet}
      sizes={sizes}
      alt={image.alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : "auto"}
      decoding="async"
      draggable={false}
      className={`size-full object-cover ${imgClassName} ${className}`}
      style={{ objectPosition: image.focus }}
    />
  );
}
