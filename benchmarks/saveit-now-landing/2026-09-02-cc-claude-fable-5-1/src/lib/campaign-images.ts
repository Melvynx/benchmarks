/**
 * The six supplied campaign images and where each one is used.
 * Each image ships as the original PNG plus two web-sized JPEG variants
 * generated from it (1200px and 2400px wide).
 */
export type CampaignImage = {
  id: string;
  alt: string;
  src: string;
  srcSet: string;
  /** Where the focal point sits, used as object-position. */
  focus: string;
};

const image = (
  id: string,
  alt: string,
  focus: string,
): CampaignImage => ({
  id,
  alt,
  focus,
  src: `/images/landing-v2/${id}-2400.jpg`,
  srcSet: `/images/landing-v2/${id}-1200.jpg 1200w, /images/landing-v2/${id}-2400.jpg 2400w`,
});

export const campaignImages = {
  /** Hero. A glowing doorway on a sunset ridge: the moment of saving. */
  portalRidge: image(
    "portal-ridge",
    "A glowing rectangular doorway standing on a mountain ridge at sunset",
    "center 45%",
  ),
  /** Agentic workflow. An observatory that watches and understands. */
  observatory: image(
    "observatory",
    "A white observatory with a glowing arc on a green hill, a person standing in a field of white flowers",
    "center 40%",
  ),
  /** The 100% promise. A pale portal at the end of a path, framed by rocks. */
  portalRocks: image(
    "portal-rocks",
    "A pale glowing portal framed by red rocks with a misty path leading to it",
    "center 55%",
  ),
  /** iOS. A calm mountain lake at golden hour, the outdoors where you save on the go. */
  lake: image(
    "lake",
    "A calm mountain lake reflecting coral-lit peaks and pine trees",
    "center 60%",
  ),
  /** Capture everywhere. A small glowing arch on a flowered hill. */
  portalArch: image(
    "portal-arch",
    "A small glowing arch on a flowered hill at dusk",
    "center 50%",
  ),
  /** Closing. A lit house on a hill: your home for bookmarks. */
  home: image(
    "home",
    "A small illuminated house on top of a flowered hill at dusk",
    "center 55%",
  ),
} satisfies Record<string, CampaignImage>;
