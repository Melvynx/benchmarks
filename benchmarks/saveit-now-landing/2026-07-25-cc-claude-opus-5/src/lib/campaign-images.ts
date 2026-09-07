/**
 * The six supplied campaign renders, each with the role it plays in the page.
 *
 * All six share one world: a dusk sky, coral light, mossy terrain, and a cold
 * white glow. That glow is the through line of the redesign, standing for the
 * thing you saved and the doorway back to it.
 *
 * Every render is served as responsive WebP (generated into `optimized/`) with
 * a JPEG fallback, so the page ships roughly 2 MB of art instead of 45 MB of
 * source PNG. `tone` is the average dark value of each frame and is painted
 * behind the image so nothing flashes black while it decodes.
 */

const BASE = "/images/landing-v2/optimized";
const WIDTHS = [800, 1400, 2000] as const;

export type CampaignImage = {
  /** File stem, shared by every derivative of the render. */
  id: string;
  /** Fallback source for browsers without WebP support. */
  fallback: string;
  /** WebP candidates across the three generated widths. */
  srcSet: string;
  /** Description of the artwork itself, for assistive technology. */
  alt: string;
  /** Average dark value of the frame, used as a placeholder background. */
  tone: string;
};

function build(id: string, alt: string, tone: string): CampaignImage {
  return {
    id,
    fallback: `${BASE}/${id}-1400.jpg`,
    srcSet: WIDTHS.map((w) => `${BASE}/${id}-${w}.webp ${w}w`).join(", "),
    alt,
    tone,
  };
}

export const campaign = {
  /** Hero. A stone path climbs a ridge to a standing door of white light. */
  ridge: build(
    "portal-ridge",
    "A footpath crossing a flowering ridge at sunset, leading to a tall doorway of white light.",
    "#3a1b25",
  ),

  /** Agentic section. One person below a lit observatory working on its own. */
  observatory: build(
    "observatory",
    "A single figure standing in a meadow below a hilltop observatory crowned with a glowing arc of light.",
    "#2e2430",
  ),

  /** Promise section. Light spills out of the doorway toward the viewer. */
  rocks: build(
    "portal-rocks",
    "A pale luminous doorway framed by boulders, its light spilling down a path toward the viewer.",
    "#3b2b34",
  ),

  /** iOS section. A still lake holding a perfect mirror of the mountains. */
  lake: build(
    "lake",
    "A still mountain lake at dusk reflecting coral peaks and pines with mirror clarity.",
    "#33242e",
  ),

  /** Pricing. Soft focus, shallow depth of field, a distant arch of light. */
  arch: build(
    "portal-arch",
    "A small glowing archway on a distant hill, seen across a softly blurred field of flowers.",
    "#33202a",
  ),

  /** Closing. A single lit house on a dark hill: the home for what you keep. */
  home: build(
    "home",
    "A small house with warm lit windows alone on a flowering hillside under a deep dusk sky.",
    "#241823",
  ),
} satisfies Record<string, CampaignImage>;
