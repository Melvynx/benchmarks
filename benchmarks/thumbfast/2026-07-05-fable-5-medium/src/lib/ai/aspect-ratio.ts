export type AspectRatio = "16:9" | "9:16" | "1:1";

// Gemini ignores the `gptSize` field; it follows the textual prompt directions.
export const ASPECT_RATIO_CONFIG: Record<
  AspectRatio,
  {
    width: number;
    height: number;
    gptSize: `${number}x${number}`;
    gptSafeZone: string;
    label: string;
    promptText: string;
  }
> = {
  "16:9": {
    width: 1280,
    height: 720,
    gptSize: "1280x720",
    gptSafeZone: "full 1280x720 canvas",
    label: "YouTube",
    promptText: "1280x720 pixels, 16:9 aspect ratio",
  },
  "9:16": {
    width: 720,
    height: 1280,
    gptSize: "720x1280",
    gptSafeZone: "full 720x1280 canvas",
    label: "Story",
    promptText: "720x1280 pixels, 9:16 aspect ratio (vertical/portrait)",
  },
  "1:1": {
    width: 1024,
    height: 1024,
    gptSize: "1024x1024",
    gptSafeZone: "full 1024x1024 canvas (no cropping)",
    label: "Square",
    promptText: "1024x1024 pixels, 1:1 aspect ratio (square)",
  },
};

export function parseAspectRatio(value: string): AspectRatio {
  if (value in ASPECT_RATIO_CONFIG) return value as AspectRatio;
  return "16:9";
}

export function getAspectRatioClass(ratio?: string): string {
  switch (ratio) {
    case "9:16":
      return "aspect-[9/16]";
    case "1:1":
      return "aspect-square";
    default:
      return "aspect-video";
  }
}
