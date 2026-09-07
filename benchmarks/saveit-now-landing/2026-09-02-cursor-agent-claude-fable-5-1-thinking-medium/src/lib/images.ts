export type CampaignImage = {
  key: string;
  alt: string;
  src: string;
  srcSet: string;
  placeholder: string;
  original: string;
};

const BASE = "/images/landing-v2";

const define = (key: string, alt: string): CampaignImage => ({
  key,
  alt,
  src: `${BASE}/web/${key}-1920.webp`,
  srcSet: `${BASE}/web/${key}-1080.webp 1080w, ${BASE}/web/${key}-1920.webp 1920w`,
  placeholder: `${BASE}/web/${key}-tiny.webp`,
  original: `${BASE}/${key}.png`,
});

export const images = {
  ridge: define(
    "portal-ridge",
    "A glowing rectangular doorway standing on a mountain ridge at sunset, surrounded by wildflowers and warm rock.",
  ),
  observatory: define(
    "observatory",
    "A white observatory crowned with a glowing arc of light on a green hilltop, a lone figure walking below through flowers.",
  ),
  arch: define(
    "portal-arch",
    "A luminous white arch on a hill of orange wildflowers under a violet dusk sky.",
  ),
  rocks: define(
    "portal-rocks",
    "A pale glowing portal framed by red rocks and moss, with a path of water leading toward it under a pink sky.",
  ),
  lake: define(
    "lake",
    "A calm alpine lake reflecting a coral lit mountain and pine trees at dawn.",
  ),
  home: define(
    "home",
    "A small house with warm lit windows on top of a flowered hill at dusk, a path winding up to the door.",
  ),
} as const;
