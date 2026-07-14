export type ContentText = { type: "text"; text: string };
export type ContentImage = { type: "image-url"; url: string };
export type ContentItem = ContentText | ContentImage;

type ToolResultContentOutput = {
  type: "content";
  value: ({ type: "text"; text: string } | { type: "image-url"; url: string })[];
};

export function buildContentOutput(
  items: ContentItem[],
): ToolResultContentOutput {
  return { type: "content", value: items };
}

export function truncate(value: string, max: number): string {
  if (!value) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}
