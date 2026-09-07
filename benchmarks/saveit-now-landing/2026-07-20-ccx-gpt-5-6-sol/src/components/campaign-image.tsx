import type { ImgHTMLAttributes } from "react";

type CampaignImageName =
  | "home"
  | "lake"
  | "observatory"
  | "portal-arch"
  | "portal-ridge"
  | "portal-rocks";

type CampaignImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "src" | "srcSet"
> & {
  alt: string;
  image: CampaignImageName;
  pictureClassName?: string;
};

export function CampaignImage({
  alt,
  image,
  pictureClassName,
  sizes = "100vw",
  ...imageProps
}: CampaignImageProps) {
  const base = `/images/landing-v2/${image}`;

  return (
    <picture className={pictureClassName}>
      <source
        type="image/webp"
        srcSet={`${base}-1200.webp 1200w, ${base}-2400.webp 2400w`}
        sizes={sizes}
      />
      <img src={`${base}.png`} alt={alt} sizes={sizes} {...imageProps} />
    </picture>
  );
}
