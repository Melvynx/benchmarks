import { FormattedPromptText } from "@/features/editor/formatted-prompt-text";
import type { UIMessage } from "ai";

export function UserMessage({ message }: { message: UIMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        {message.parts.map((part, i) => {
          if (part.type !== "text" || !part.text.trim()) return null;
          const text = part.text;
          const hasTranscript = text.includes("[Video transcript attached]");
          const displayText = hasTranscript
            ? text.split("Transcript:")[0].trim()
            : text;

          return (
            <div
              key={`${message.id}-${i}`}
              className="bg-primary text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap"
            >
              <FormattedPromptText text={displayText} />
              {hasTranscript && (
                <span className="mt-1 block text-xs opacity-60">
                  Transcript attached
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
