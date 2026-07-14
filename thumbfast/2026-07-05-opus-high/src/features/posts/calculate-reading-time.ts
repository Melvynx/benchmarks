export function calculateReadingTime(markdownText: string): number {
  const textOnly = markdownText.replaceAll(/[\n#()*+<>[\]-]/g, " ");

  const wordCount = textOnly
    .split(/\s+/)
    .filter((word) => word.length > 0).length;

  const readingTimeMinutes = Math.ceil(wordCount / 200);

  return readingTimeMinutes;
}
