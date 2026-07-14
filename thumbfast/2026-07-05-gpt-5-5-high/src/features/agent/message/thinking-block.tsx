import { cn } from "@/lib/utils";
import { Brain, ChevronDown } from "lucide-react";
import { useState } from "react";

export function ThinkingBlock({
  text,
  defaultOpen = false,
}: {
  text: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="text-muted-foreground w-full">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 text-left text-xs"
      >
        <Brain className={cn("size-3", defaultOpen && "animate-pulse")} />
        <span>{defaultOpen ? "Thinking..." : "Thought for a moment"}</span>
        <ChevronDown
          className={cn("size-3 transition-transform", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="text-muted-foreground/70 mt-1.5 max-h-48 overflow-y-auto border-l-2 pl-3 text-xs leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
