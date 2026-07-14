import { canAccessThumbnailAgent } from "@/features/agent/thumbnail-agent-access";
import type { ThumbnailAgentAccessSettings } from "@/features/agent/thumbnail-agent-access";
import { VideoPreviewCard } from "@/features/agent/video-preview-card";
import { useAutosizeTextareaFallback } from "@/hooks/use-autosize-textarea-fallback";
import { extractVideoId } from "@/features/inspiration/youtube-utils";
import { LoadingState } from "@/features/organization/loading-state";
import { cn } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import {
  createFileRoute,
  Outlet,
  useChildMatches,
  useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
  ArrowUp,
  Brain,
  Image as ImageIcon,
  Link2,
  Sparkles,
  Wand2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  readSavedThinkingMode,
  writeSavedThinkingMode,
} from "@/features/agent/agent-preferences";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/orgs/$orgSlug/agent")({
  component: AgentRoute,
});

function AgentRoute() {
  const childMatches = useChildMatches();
  if (childMatches.length > 0) {
    return <Outlet />;
  }
  return <AgentLanding />;
}

function AgentLanding() {
  const { orgSlug } = Route.useParams();
  const navigate = useNavigate({ from: "/orgs/$orgSlug/agent" });
  const orgSettings = useQuery(api.app.orgSettings, {
    orgSlug,
  }) as ThumbnailAgentAccessSettings | undefined;
  const canAccessAgent = canAccessThumbnailAgent(orgSettings);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [input, setInput] = useState("");
  const [thinkingEnabled, setThinkingEnabled] = useState(() =>
    readSavedThinkingMode(),
  );
  useAutosizeTextareaFallback(textareaRef, input);

  useEffect(() => {
    if (!orgSettings || canAccessAgent) return;

    void navigate({
      to: `/orgs/${orgSlug}` as never,
      replace: true,
    });
  }, [canAccessAgent, navigate, orgSettings, orgSlug]);

  const startChat = (message?: string) => {
    const trimmed = (message ?? input).trim();
    if (!trimmed) return;
    const chatId = crypto.randomUUID();
    sessionStorage.setItem(`agent-chat-input-${chatId}`, trimmed);
    void navigate({
      to: `/orgs/${orgSlug}/agent/${chatId}` as never,
    });
  };

  const handleThinkingChange = (checked: boolean) => {
    setThinkingEnabled(checked);
    writeSavedThinkingMode(checked);
  };

  const detectedVideoId = extractVideoId(input.trim());

  if (!orgSettings || !canAccessAgent) {
    return <LoadingState label="Opening workspace" />;
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-8rem)] flex-col overflow-hidden">
      <div className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex w-full max-w-2xl flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
              <Sparkles className="size-6" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Thumbnail Agent
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Generate, edit, and explore thumbnails through conversation
              </p>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              { label: "Paste a YouTube URL", icon: Link2 },
              { label: "Create a thumbnail from scratch", icon: Wand2 },
              { label: "Browse my inspirations", icon: Sparkles },
              { label: "Show my recent thumbnails", icon: ImageIcon },
            ].map((suggestion) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={suggestion.label}
                  type="button"
                  onClick={() => textareaRef.current?.focus()}
                  className="border-border/50 hover:bg-muted/50 flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors"
                >
                  <Icon className="text-muted-foreground size-4 shrink-0" />
                  <span>{suggestion.label}</span>
                </button>
              );
            })}
          </div>

          <div className="w-full">
            <div
              className={cn(
                "bg-muted/50 relative flex rounded-2xl border transition-all",
                "focus-within:bg-background focus-within:ring-ring/30 focus-within:shadow-sm focus-within:ring-2",
              )}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    startChat();
                  }
                }}
                aria-label="Ask anything about thumbnails"
                placeholder="Ask anything about thumbnails..."
                rows={3}
                className="placeholder:text-muted-foreground/50 long-input-scroll field-sizing-content min-h-[96px] flex-1 resize-none bg-transparent pt-3 pr-12 pb-12 pl-4 text-sm leading-relaxed outline-none"
              />
              <div className="absolute bottom-2 left-3 flex items-center">
                <label
                  className={cn(
                    "flex h-8 cursor-pointer items-center gap-2 rounded-md px-2.5 text-xs font-medium transition-colors",
                    thinkingEnabled
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
                  )}
                  title={
                    thinkingEnabled
                      ? "Disable agent thinking"
                      : "Enable agent thinking"
                  }
                >
                  <Brain className="size-3.5 shrink-0" />
                  <span className="hidden sm:inline">Thinking</span>
                  <Switch
                    checked={thinkingEnabled}
                    onCheckedChange={handleThinkingChange}
                    aria-label={
                      thinkingEnabled
                        ? "Disable agent thinking"
                        : "Enable agent thinking"
                    }
                    className="h-4 w-7"
                  />
                </label>
              </div>
              <div className="absolute right-2 bottom-1.5 flex items-center">
                <button
                  type="button"
                  disabled={!input.trim()}
                  onClick={() => startChat()}
                  aria-label="Send message"
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full transition-all",
                    input.trim()
                      ? "bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                      : "bg-muted-foreground/10 text-muted-foreground/30 cursor-default",
                  )}
                >
                  <ArrowUp className="size-4" strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {detectedVideoId && (
              <VideoPreviewCard
                videoId={detectedVideoId}
                onAutoGenerate={() =>
                  startChat(
                    `Auto-generate 3 thumbnails for this YouTube video: https://www.youtube.com/watch?v=${detectedVideoId}`,
                  )
                }
              />
            )}

            <p className="text-muted-foreground mt-2 text-center text-[11px]">
              Each conversation uses a fraction of a thumbnail from your plan
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
