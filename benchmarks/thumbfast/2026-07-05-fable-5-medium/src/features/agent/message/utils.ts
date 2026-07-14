import type { UIMessage } from "ai";

export type ParsedToolPart = {
  toolName: string;
  state: string;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
};

export function parseToolPart(
  part: UIMessage["parts"][number],
): ParsedToolPart | null {
  if (part.type === "dynamic-tool" && "toolName" in part) {
    const p = part as Record<string, unknown>;
    const state = String(p.state ?? "input-streaming");
    const isComplete = state === "output-available";
    return {
      toolName: String(p.toolName),
      state,
      input: (p.input as Record<string, unknown> | null) ?? null,
      output: isComplete
        ? ((p.output as Record<string, unknown> | null) ?? null)
        : null,
    };
  }

  if (part.type.startsWith("tool-") && part.type !== "tool-invocation") {
    const p = part as Record<string, unknown>;
    const toolName = part.type.slice(5);
    const state = String(p.state ?? "input-streaming");
    const isComplete = state === "output-available";
    return {
      toolName,
      state,
      input: (p.input as Record<string, unknown> | null) ?? null,
      output: isComplete
        ? ((p.output as Record<string, unknown> | null) ?? null)
        : null,
    };
  }

  return null;
}

export type ResultInfo = {
  summary: string | null;
  href: string | null;
};

export function getResultInfo(
  toolName: string,
  output: Record<string, unknown>,
  orgSlug: string,
): ResultInfo {
  if (
    toolName === "search_inspirations" &&
    Array.isArray(output.inspirations)
  ) {
    const names = output.inspirations
      .slice(0, 3)
      .map((i: { name?: string }) => i.name)
      .filter(Boolean);
    return {
      summary:
        names.length > 0
          ? `Found: ${names.join(", ")}`
          : `Found ${output.inspirations.length} inspiration(s)`,
      href: null,
    };
  }

  if (toolName === "get_persons" && Array.isArray(output.persons)) {
    const names = output.persons
      .slice(0, 3)
      .map((p: { name?: string }) => p.name)
      .filter(Boolean);
    return {
      summary:
        names.length > 0
          ? `Found: ${names.join(", ")}`
          : `Found ${output.persons.length} person(s)`,
      href: null,
    };
  }

  if (toolName === "get_user_images" && Array.isArray(output.images)) {
    return { summary: `Found ${output.images.length} image(s)`, href: null };
  }

  if (toolName === "get_prompt_examples" && Array.isArray(output.examples)) {
    return {
      summary: `Loaded ${output.examples.length} example(s)`,
      href: null,
    };
  }

  if (toolName === "generate_thumbnails") {
    if (output.success === false)
      return { summary: `Failed: ${output.error}`, href: null };
    if (Array.isArray(output.thumbnails)) {
      const successCount = output.thumbnails.filter(
        (t: { success: boolean }) => t.success,
      ).length;
      const promptId = output.promptId ? String(output.promptId) : null;
      return {
        summary: `${successCount}/${output.thumbnails.length} generated`,
        href: promptId ? `/orgs/${orgSlug}/thumbnails/${promptId}` : null,
      };
    }
  }

  if (toolName === "generate_thumbnail" || toolName === "edit_thumbnail") {
    if (output.success === false)
      return { summary: `Failed: ${output.error}`, href: null };
    if (output.success) {
      const promptId = output.promptId ? String(output.promptId) : null;
      return {
        summary:
          toolName === "edit_thumbnail"
            ? "Thumbnail edited"
            : "Thumbnail generated",
        href: promptId ? `/orgs/${orgSlug}/thumbnails/${promptId}` : null,
      };
    }
  }

  if (toolName === "create_video") {
    if (output.success === false)
      return { summary: `Failed: ${output.error}`, href: null };
    if (output.success) {
      const videoId = output.videoId ? String(output.videoId) : null;
      return {
        summary: "Video created",
        href: videoId ? `/orgs/${orgSlug}/videos/${videoId}` : null,
      };
    }
  }

  if (toolName === "fetch_youtube_transcript") {
    if (output.error) return { summary: String(output.error), href: null };
    if (output.title) return { summary: String(output.title), href: null };
    if (output.transcript)
      return { summary: "Transcript extracted", href: null };
  }

  if (toolName === "analyze_youtube_video") {
    if (output.error) return { summary: String(output.error), href: null };
    if (output.title) return { summary: String(output.title), href: null };
    return { summary: "Video analyzed", href: null };
  }

  if (
    toolName === "get_recent_thumbnails" &&
    Array.isArray(output.thumbnails)
  ) {
    return {
      summary: `Found ${output.thumbnails.length} thumbnail(s)`,
      href: null,
    };
  }

  return { summary: null, href: null };
}

export function getArgsPreview(
  toolName: string,
  input: Record<string, unknown> | null,
): string | null {
  if (!input || Object.keys(input).length === 0) return null;

  if (toolName === "generate_thumbnails" && Array.isArray(input.thumbnails)) {
    const count = input.thumbnails.length;
    const hasPersons =
      Array.isArray(input.personIds) && input.personIds.length > 0;
    const tags = [hasPersons && "person"].filter(Boolean);
    const tagStr = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
    return `${count} thumbnails${tagStr}`;
  }
  if (
    (toolName === "generate_thumbnail" || toolName === "edit_thumbnail") &&
    (input.prompt || input.editPrompt)
  ) {
    const prompt = String(input.prompt ?? input.editPrompt);
    const hasInspirations =
      Array.isArray(input.inspirationIds) && input.inspirationIds.length > 0;
    const hasPersons =
      Array.isArray(input.personIds) && input.personIds.length > 0;
    const tags = [
      hasPersons && "person",
      hasInspirations && "inspiration",
    ].filter(Boolean);
    const tagStr = tags.length > 0 ? ` [${tags.join(", ")}]` : "";
    return prompt.slice(0, 150) + (prompt.length > 150 ? "..." : "") + tagStr;
  }
  if (toolName === "search_inspirations") {
    const parts: string[] = [];
    if (input.query) parts.push(`"${input.query}"`);
    if (input.category) parts.push(`category: ${input.category}`);
    return parts.join(", ") || null;
  }
  if (toolName === "create_video" && input.title) {
    return `"${input.title}"`;
  }
  if (
    (toolName === "fetch_youtube_transcript" ||
      toolName === "analyze_youtube_video") &&
    input.youtubeUrl
  ) {
    return String(input.youtubeUrl);
  }
  return null;
}

export function formatToolName(name: string): string {
  return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
