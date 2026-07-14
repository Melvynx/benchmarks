import { describe, expect, it } from "vitest";

import {
  getDisplayThumbnailFields,
  getDisplayThumbnailUrl,
  getGenerationSourceThumbnailUrl,
} from "../convex/thumbnailUrls";

describe("thumbnail URL selection", () => {
  const thumbnail = {
    url: "https://cdn.example.com/clean.png",
    watermarkedUrl: "https://cdn.example.com/watermarked.png",
  };

  it("returns the watermarked image for free-plan display", () => {
    expect(
      getDisplayThumbnailUrl(thumbnail, { canViewCleanImage: false }),
    ).toBe("https://cdn.example.com/watermarked.png");
  });

  it("returns shared display fields for free-plan row mappers", () => {
    expect(
      getDisplayThumbnailFields(thumbnail, { canViewCleanImage: false }),
    ).toEqual({
      imageUrl: "https://cdn.example.com/watermarked.png",
      watermarkedImageUrl: "https://cdn.example.com/watermarked.png",
    });
  });

  it("returns the clean image for paid-plan display", () => {
    expect(getDisplayThumbnailUrl(thumbnail, { canViewCleanImage: true })).toBe(
      "https://cdn.example.com/clean.png",
    );
  });

  it("falls back to the clean image for free-plan display when a watermark is missing", () => {
    expect(
      getDisplayThumbnailUrl(
        { url: "https://cdn.example.com/legacy-clean.png" },
        { canViewCleanImage: false },
      ),
    ).toBe("https://cdn.example.com/legacy-clean.png");
  });

  it("falls back to the watermarked image for paid-plan display when legacy rows have no clean image", () => {
    expect(
      getDisplayThumbnailUrl(
        { watermarkedUrl: "https://cdn.example.com/legacy-watermarked.png" },
        { canViewCleanImage: true },
      ),
    ).toBe("https://cdn.example.com/legacy-watermarked.png");
  });

  it("uses the clean image as the generation source even when a watermark exists", () => {
    expect(getGenerationSourceThumbnailUrl(thumbnail)).toBe(
      "https://cdn.example.com/clean.png",
    );
  });

  it("falls back to the watermarked image as a source only for legacy rows without clean images", () => {
    expect(
      getGenerationSourceThumbnailUrl({
        watermarkedUrl: "https://cdn.example.com/legacy-watermarked.png",
      }),
    ).toBe("https://cdn.example.com/legacy-watermarked.png");
  });
});
