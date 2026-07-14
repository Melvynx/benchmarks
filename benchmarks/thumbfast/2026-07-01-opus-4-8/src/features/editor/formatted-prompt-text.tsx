import type { ReactNode } from "react";
import {
  type PromptMentionKind,
  PROMPT_MENTION_RE,
} from "@/lib/prompt-mentions";
import { cn } from "@/lib/utils";

const MENTION_COLORS: Record<PromptMentionKind, string> = {
  person: "mention-person",
  inspiration: "mention-inspiration",
  image: "mention-image",
};

type FormattedPromptTextProps = {
  text: string;
  className?: string;
  /** Badges tuned for dark image overlays (generations / thumbnails grids) */
  variant?: "default" | "onDark";
};

export function FormattedPromptText({
  text,
  className,
  variant = "default",
}: FormattedPromptTextProps) {
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(PROMPT_MENTION_RE.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const type = match[1] as PromptMentionKind;
    const label = match[3];
    const colorClass = MENTION_COLORS[type];

    parts.push(
      <span key={match.index} className={`mention-tag ${colorClass}`}>
        @{label}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  const onDark =
    variant === "onDark"
      ? "[&_.mention-person]:border-white/40 [&_.mention-person]:bg-white/15 [&_.mention-person]:text-white [&_.mention-inspiration]:border-white/40 [&_.mention-inspiration]:bg-white/15 [&_.mention-inspiration]:text-white [&_.mention-image]:border-white/40 [&_.mention-image]:bg-white/15 [&_.mention-image]:text-white"
      : undefined;

  const inner = <>{parts}</>;

  if (className ?? onDark) {
    return <span className={cn(onDark, className)}>{inner}</span>;
  }

  return inner;
}
