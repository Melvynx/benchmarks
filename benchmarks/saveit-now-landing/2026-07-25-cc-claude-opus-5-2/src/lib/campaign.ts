/**
 * The six campaign renders, and the role each one plays on the page.
 *
 * Every frame was audited before being assigned. They share one world (dusk
 * sky, warm rock, deep moss, a glowing white light) so the page reads as a
 * single shoot rather than a stock gallery. The `chord` is a three stop
 * gradient sampled from each frame; it paints the container before the bitmap
 * decodes so nothing ever flashes black.
 *
 * Source PNGs are 3272x1834 and up to 9.8MB each, far too heavy to ship. The
 * derivatives under `opt/` are generated from them at 960/1600/2400 wide.
 */

const BASE = "/images/landing-v2/opt";

export type CampaignFrame = {
  /** File stem, matching the source PNG. */
  id: string;
  /** Empty when the frame is purely atmospheric and the copy carries meaning. */
  alt: string;
  /** Gradient stand-in shown until the bitmap paints. */
  chord: string;
  /** object-position, so the subject survives aggressive cropping. */
  focus: string;
};

export const FRAMES = {
  /**
   * Hero. A lit house at the top of a path, under an enormous empty sky.
   * It is the literal picture of "your home for bookmarks", and the sky gives
   * the headline lockup room to breathe without any scrim fighting the art.
   */
  home: {
    id: "home",
    alt: "A small lit house at the top of a flowered hill at dusk, with a path leading up to it.",
    chord:
      "linear-gradient(180deg, #5a3e5e 0%, #a8607080 42%, #c77a6e 58%, #1a1410 100%)",
    focus: "50% 62%",
  },

  /**
   * Agentic workflow. A path running through a pale doorway between two rocks.
   * The clearest "walk through and come out the other side" composition, and
   * the brightest frame, which suits the section that explains the mechanism.
   */
  portalRocks: {
    id: "portal-rocks",
    alt: "",
    chord:
      "linear-gradient(180deg, #c4b0ce 0%, #e3b7b4 46%, #9fae7a 74%, #4a5b33 100%)",
    focus: "50% 50%",
  },

  /**
   * The shift. A lone figure in a meadow below a hilltop observatory with a
   * glowing arc. Human scale plus a system quietly watching over the library.
   */
  observatory: {
    id: "observatory",
    alt: "A person standing in a flowered meadow below a hilltop observatory crowned by a glowing arc.",
    chord:
      "linear-gradient(180deg, #c9afa6 0%, #b79a90 34%, #4e6b4a 62%, #24361f 100%)",
    focus: "50% 45%",
  },

  /**
   * The 100% promise. The most cinematic frame: a lit portal on a ridge with a
   * stone path leading back to it. The thing you walk back through to retrieve.
   */
  portalRidge: {
    id: "portal-ridge",
    alt: "",
    chord:
      "linear-gradient(180deg, #8c5a78 0%, #d97341 44%, #7e3f2c 70%, #2a1712 100%)",
    focus: "50% 48%",
  },

  /**
   * iOS. Shallow depth of field, a glowing arch on a small hill. The most
   * intimate and close of the six, which is why it sits inside the handset.
   */
  portalArch: {
    id: "portal-arch",
    alt: "",
    chord:
      "linear-gradient(180deg, #6b5468 0%, #a2694f 46%, #7d5233 68%, #26301c 100%)",
    focus: "50% 50%",
  },

  /**
   * Closing. A mountain lake holding a perfect reflection: everything above
   * the waterline comes back below it. Calm, resolved, the note to end on.
   */
  lake: {
    id: "lake",
    alt: "",
    chord:
      "linear-gradient(180deg, #a9a8c4 0%, #d08a85 40%, #7d9a86 68%, #3e5a4e 100%)",
    focus: "50% 55%",
  },
} as const satisfies Record<string, CampaignFrame>;

export type FrameKey = keyof typeof FRAMES;

const WIDTHS = [960, 1600, 2400] as const;

export function webpSrcSet(frame: CampaignFrame): string {
  return WIDTHS.map((w) => `${BASE}/${frame.id}-${w}.webp ${w}w`).join(", ");
}

export function jpegFallback(frame: CampaignFrame): string {
  return `${BASE}/${frame.id}-1600.jpg`;
}

/** Single URL for a frame, for CSS backgrounds where srcset is unavailable. */
export function frameUrl(
  frame: CampaignFrame,
  width: (typeof WIDTHS)[number] = 1600,
): string {
  return `${BASE}/${frame.id}-${width}.webp`;
}
