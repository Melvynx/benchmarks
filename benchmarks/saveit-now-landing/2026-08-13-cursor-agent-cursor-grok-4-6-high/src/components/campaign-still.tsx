export const campaignStills = {
  home: {
    webp: "/images/landing-v2/home.webp",
    png: "/images/landing-v2/home.png",
    alt: "A small house glowing on a flowered hill at dusk, with a stone path leading to the door.",
  },
  observatory: {
    webp: "/images/landing-v2/observatory.webp",
    png: "/images/landing-v2/observatory.png",
    alt: "A circular observatory on a hill, a figure in white watching a ring of light rise behind it.",
  },
  portalArch: {
    webp: "/images/landing-v2/portal-arch.webp",
    png: "/images/landing-v2/portal-arch.png",
    alt: "A glowing white arch standing in a meadow of grass and red flowers.",
  },
  lake: {
    webp: "/images/landing-v2/lake.webp",
    png: "/images/landing-v2/lake.png",
    alt: "A mountain peak at sunset, perfectly reflected in a still alpine lake.",
  },
  portalRidge: {
    webp: "/images/landing-v2/portal-ridge.webp",
    png: "/images/landing-v2/portal-ridge.png",
    alt: "A stone path climbing a mossy ridge toward a rectangular doorway of light.",
  },
  portalRocks: {
    webp: "/images/landing-v2/portal-rocks.webp",
    png: "/images/landing-v2/portal-rocks.png",
    alt: "A pale doorway of light among red rocks and moss, opening onto the horizon.",
  },
} as const;

type StillName = keyof typeof campaignStills;

type CampaignStillProps = {
  name: StillName;
  className?: string;
  priority?: boolean;
  objectPosition?: string;
};

export function CampaignStill({
  name,
  className,
  priority = false,
  objectPosition,
}: CampaignStillProps) {
  const still = campaignStills[name];

  return (
    <picture className="contents">
      <source type="image/webp" srcSet={still.webp} />
      <img
        src={still.png}
        alt={still.alt}
        className={className}
        style={objectPosition ? { objectPosition } : undefined}
        width={2400}
        height={1346}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
      />
    </picture>
  );
}
