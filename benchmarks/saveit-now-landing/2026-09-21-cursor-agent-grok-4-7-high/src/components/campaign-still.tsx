export type CampaignName =
  | "observatory"
  | "lake"
  | "home"
  | "portal-arch"
  | "portal-ridge"
  | "portal-rocks";

type CampaignStillProps = {
  name: CampaignName;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

export function CampaignStill({
  name,
  alt,
  sizes,
  priority = false,
  className = "",
}: CampaignStillProps) {
  return (
    <img
      src={`/images/campaign/${name}.jpg`}
      srcSet={`/images/campaign/${name}-1200.jpg 1200w, /images/campaign/${name}.jpg 2200w`}
      sizes={sizes}
      alt={alt}
      width={2200}
      height={1233}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      className={className}
    />
  );
}
