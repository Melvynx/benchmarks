type ThumbnailUrlSource = {
  url?: string | null;
  watermarkedUrl?: string | null;
};

export function getDisplayThumbnailUrl(
  thumbnail: ThumbnailUrlSource | null | undefined,
  options: { canViewCleanImage: boolean },
) {
  if (!thumbnail) return null;
  if (options.canViewCleanImage) {
    return thumbnail.url ?? thumbnail.watermarkedUrl ?? null;
  }
  // Prefer the watermarked image, but fall back to the clean url when no
  // watermark exists. Thumbnails generated while an org was on a paid plan have
  // no watermarkedUrl; without this fallback they render blank for viewers who
  // later churn/downgrade to free, instead of showing the image they own.
  return thumbnail.watermarkedUrl ?? thumbnail.url ?? null;
}

export function getDisplayThumbnailFields(
  thumbnail: ThumbnailUrlSource | null | undefined,
  options: { canViewCleanImage: boolean },
) {
  return {
    imageUrl: getDisplayThumbnailUrl(thumbnail, options),
    watermarkedImageUrl: thumbnail?.watermarkedUrl ?? null,
  };
}

export function getGenerationSourceThumbnailUrl(
  thumbnail: ThumbnailUrlSource | null | undefined,
) {
  return thumbnail?.url ?? thumbnail?.watermarkedUrl ?? null;
}
