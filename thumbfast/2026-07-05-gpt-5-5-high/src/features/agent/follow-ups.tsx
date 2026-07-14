"use client";

import { upfetch } from "@/lib/up-fetch";
import { cn } from "@/lib/utils";
import type { UIMessage } from "ai";
import { Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

function extractText(message: UIMessage): string {
  let out = "";
  for (const part of message.parts) {
    if (part.type === "text" && part.text) {
      out += `${part.text}\n`;
    }
  }
  return out.trim();
}

function buildPayload(messages: UIMessage[]) {
  const trimmed: { role: "user" | "assistant"; text: string }[] = [];
  const recent = messages.slice(-6);
  for (const m of recent) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const text = extractText(m);
    if (!text) continue;
    trimmed.push({ role: m.role, text: text.slice(0, 1500) });
  }
  return trimmed;
}

export function FollowUps({
  messages,
  orgSlug,
  isLoading,
  onPick,
}: {
  messages: UIMessage[];
  orgSlug: string;
  isLoading: boolean;
  onPick: (text: string) => void;
}) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [fetching, setFetching] = useState(false);
  const lastSignatureRef = useRef<string | null>(null);

  const signature = useMemo(() => {
    if (isLoading) return null;
    if (messages.length === 0) return null;
    const last = messages[messages.length - 1];
    if (last.role !== "assistant") return null;
    return `${messages.length}:${last.id}`;
  }, [messages, isLoading]);

  useEffect(() => {
    if (!signature) return;
    if (signature === lastSignatureRef.current) return;

    const recent = buildPayload(messages);
    if (recent.length === 0) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      lastSignatureRef.current = signature;
      setFetching(true);
      setSuggestions([]);

      void (async () => {
        try {
          const res = (await upfetch(`/api/orgs/${orgSlug}/agent/suggestions`, {
            method: "POST",
            body: { recent },
            signal: controller.signal,
          })) as { suggestions: string[] };
          if (controller.signal.aborted) return;
          setSuggestions(Array.isArray(res.suggestions) ? res.suggestions : []);
        } catch {
          if (controller.signal.aborted) return;
          setSuggestions([]);
        } finally {
          if (!controller.signal.aborted) setFetching(false);
        }
      })();
    }, 500);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [signature, messages, orgSlug]);

  if (isLoading) return null;
  if (!fetching && suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {fetching ? (
        <span className="text-muted-foreground/60 flex items-center gap-1.5 text-[11px]">
          <Loader2 className="size-3 animate-spin" />
          Thinking of next steps...
        </span>
      ) : (
        suggestions.map((suggestion, i) => (
          <button
            key={`${i}-${suggestion}`}
            type="button"
            onClick={() => onPick(suggestion)}
            className={cn(
              "border-border/50 hover:bg-muted hover:border-border bg-muted/40 flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
            )}
          >
            <Sparkles className="text-muted-foreground/70 size-3" />
            <span>{suggestion}</span>
          </button>
        ))
      )}
    </div>
  );
}
