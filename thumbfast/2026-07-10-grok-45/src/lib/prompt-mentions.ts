export type PromptMentionKind = "person" | "inspiration" | "image";

/** Stored prompt mention tokens: @{{type:id:label}} */
export const PROMPT_MENTION_RE =
  /@\{\{(person|inspiration|image):([^:]+):([^}]+)\}\}/g;

export function replacePromptMentions(
  text: string,
  replacer: (type: PromptMentionKind, id: string, label: string) => string,
): string {
  return text.replace(
    PROMPT_MENTION_RE,
    (_full, type: string, id: string, label: string) =>
      replacer(type as PromptMentionKind, id, label),
  );
}

/** Plain text with @Label instead of full token (dialog defaults, titles, etc.) */
export function promptMentionsToDisplayLabels(text: string): string {
  return replacePromptMentions(text, (_type, _id, label) => `@${label}`);
}

export function promptMentionsToAiFormat(text: string): string {
  return replacePromptMentions(
    text,
    (type, _id, label) => `[${type.toUpperCase()}: ${label}]`,
  );
}

export function truncatePromptPlain(text: string, maxLen: number): string {
  const plain = promptMentionsToDisplayLabels(text);
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, maxLen)}\u2026`;
}
