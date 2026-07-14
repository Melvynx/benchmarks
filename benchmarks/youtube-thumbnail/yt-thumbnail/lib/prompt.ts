export const THUMBNAIL_PROMPT_SUFFIX =
  "Create a YouTube thumbnail in 16:9 ratio, photorealistic, high quality, vibrant colors";

export function buildThumbnailPrompt(userPrompt: string): string {
  const trimmed = userPrompt.trim();
  if (!trimmed) {
    return THUMBNAIL_PROMPT_SUFFIX;
  }
  return `${trimmed}\n\n${THUMBNAIL_PROMPT_SUFFIX}`;
}
