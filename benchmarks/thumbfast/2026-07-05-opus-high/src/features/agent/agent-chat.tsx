import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import {
  TEXT_MODELS,
  getDefaultTextModelId,
  getPublicTextModels,
  resolveTextModelId,
  type TextModelId,
} from "@/lib/ai/text-models";
import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import {
  AlertCircle,
  ArrowUp,
  Brain,
  Clock,
  Cpu,
  RefreshCw,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import { useParams } from "@/compat/navigation";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  readSavedThinkingMode,
  writeSavedThinkingMode,
} from "./agent-preferences";
import { FollowUps } from "./follow-ups";
import { AgentMessage } from "./message";

type AgentChatProps = {
  chatId: string;
  initialMessages: UIMessage[];
  initialInput: string | null;
};

const AGENT_MODEL_STORAGE_KEY = "thumbfast-agent-text-model";

function getSavedTextModel(): TextModelId {
  if (typeof window === "undefined") return getDefaultTextModelId();

  const saved = window.localStorage.getItem(AGENT_MODEL_STORAGE_KEY);
  const model = resolveTextModelId(saved);
  if (saved !== model) {
    window.localStorage.setItem(AGENT_MODEL_STORAGE_KEY, model);
  }
  return model;
}

export function AgentChat({
  chatId,
  initialMessages,
  initialInput,
}: AgentChatProps) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const hasSentInitial = useRef(false);
  const hasRestoredMessages = useRef(false);
  const [input, setInput] = useState("");
  const [model, setModel] = useState<TextModelId>(() => getSavedTextModel());
  const [thinkingEnabled, setThinkingEnabled] = useState(() =>
    readSavedThinkingMode(),
  );
  const [queued, setQueued] = useState<string[]>([]);
  const prevStatusRef = useRef<string>("ready");
  const lastUserMessageRef = useRef<string | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `/api/orgs/${orgSlug}/agent/chat`,
        body: { chatId, model, thinkingEnabled },
      }),
    [orgSlug, chatId, model, thinkingEnabled],
  );

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    stop,
    error,
    regenerate,
  } = useChat({
    transport,
  });

  // Restore messages from DB on mount (page reload)
  useEffect(() => {
    if (hasRestoredMessages.current) return;
    hasRestoredMessages.current = true;

    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages]);

  // Auto-send initial input for new chats
  useEffect(() => {
    if (hasSentInitial.current || !initialInput) return;
    if (initialMessages.length > 0 && messages.length === 0) return;
    hasSentInitial.current = true;

    lastUserMessageRef.current = initialInput;
    void sendMessage({ text: initialInput });
  }, [initialInput, initialMessages.length, messages.length, sendMessage]);

  // Auto-send queued messages when agent finishes
  useEffect(() => {
    const wasLoading =
      prevStatusRef.current === "streaming" ||
      prevStatusRef.current === "submitted";
    prevStatusRef.current = status;

    if (wasLoading && status === "ready" && queued.length > 0) {
      const next = queued[0];
      let cancelled = false;
      const id = setTimeout(() => {
        if (cancelled) return;
        setQueued((prev) => prev.slice(1));
        lastUserMessageRef.current = next;
        void sendMessage({ text: next });
      }, 0);
      return () => {
        cancelled = true;
        clearTimeout(id);
      };
    }
  }, [status, queued, sendMessage]);

  const isLoading = status === "streaming" || status === "submitted";

  const sendText = useCallback(
    (text: string) => {
      lastUserMessageRef.current = text;
      void sendMessage({ text });
    },
    [sendMessage],
  );

  const handleSubmit = (_message: PromptInputMessage) => {
    const text = input.trim();
    if (!text) return;
    if (isLoading) {
      setQueued((prev) => [...prev, text]);
    } else {
      sendText(text);
    }
    setInput("");
  };

  const removeFromQueue = (index: number) => {
    setQueued((prev) => prev.filter((_, i) => i !== index));
  };

  const handleModelChange = (value: string) => {
    const nextModel = resolveTextModelId(value);
    setModel(nextModel);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(AGENT_MODEL_STORAGE_KEY, nextModel);
    }
  };

  const handleThinkingChange = (checked: boolean) => {
    setThinkingEnabled(checked);
    writeSavedThinkingMode(checked);
  };

  const hasMessages = messages.length > 0;
  const hasAssistantContent = useMemo(
    () =>
      messages.some(
        (m) =>
          m.role === "assistant" &&
          m.parts.some(
            (p) =>
              p.type !== "step-start" &&
              (p.type !== "text" || p.text.trim().length > 0),
          ),
      ),
    [messages],
  );

  const lastMessageId = messages[messages.length - 1]?.id;

  const handleRetry = () => {
    if (isLoading) return;
    const hasAssistant = messages.some((m) => m.role === "assistant");
    if (hasAssistant) {
      void regenerate();
      return;
    }
    const fallback = lastUserMessageRef.current;
    if (fallback) {
      sendText(fallback);
    }
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 pt-8 pb-6">
          {hasMessages ? (
            <>
              {messages.map((msg) => (
                <AgentMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isLoading && msg.id === lastMessageId}
                />
              ))}

              {/* Queued messages */}
              {queued.map((text, i) => (
                <div key={`queued-${i}`} className="flex justify-end">
                  <div className="flex max-w-[85%] items-start gap-2">
                    <div className="bg-primary/60 text-primary-foreground rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed">
                      <p className="whitespace-pre-wrap">{text}</p>
                      <div className="mt-1 flex items-center gap-1 opacity-60">
                        <Clock className="size-3" />
                        <span className="text-[10px]">Queued</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromQueue(i)}
                      className="text-muted-foreground hover:text-foreground mt-1 shrink-0 transition-colors"
                      aria-label="Remove from queue"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && !hasAssistantContent && (
                <Shimmer className="text-sm">Agent is thinking...</Shimmer>
              )}

              {/* Suggested follow-ups */}
              {!isLoading && messages.length > 0 && (
                <FollowUps
                  messages={messages}
                  orgSlug={orgSlug}
                  isLoading={isLoading}
                  onPick={sendText}
                />
              )}
            </>
          ) : (
            <ConversationEmptyState
              className="min-h-[50dvh]"
              icon={<Sparkles className="size-8" />}
              title={initialInput ? "Starting agent..." : "Thumbnail Agent"}
              description={
                initialInput
                  ? "Analyzing your request"
                  : "Send a message to start"
              }
            />
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-2" />
      </Conversation>

      {/* Error banner */}
      {error && (
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 py-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
            <AlertCircle className="size-4 shrink-0" />
            <span className="flex-1">
              Something went wrong while talking to the agent.
            </span>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-red-100 dark:hover:bg-red-900/50"
              aria-label="Retry last response"
            >
              <RefreshCw className="size-3" />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Input area */}
      <div className="px-4 pt-2 pb-4">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            inputGroupClassName="rounded-2xl border-border/80 bg-background shadow-sm dark:bg-card/80"
            onSubmit={handleSubmit}
          >
            <PromptInputBody>
              <PromptInputTextarea
                className="min-h-24 px-4 pt-4 pb-2"
                value={input}
                onChange={(e) => setInput(e.currentTarget.value)}
                aria-label="Message to agent"
                placeholder={
                  isLoading
                    ? "Queue a follow-up message..."
                    : "Ask the agent anything about thumbnails..."
                }
              />
            </PromptInputBody>
            <PromptInputFooter className="px-3 pb-3 sm:px-4">
              <PromptInputTools className="flex-wrap gap-1.5">
                <PromptInputSelect
                  value={model}
                  onValueChange={handleModelChange}
                >
                  <PromptInputSelectTrigger
                    className="text-foreground h-8 max-w-[11.5rem] px-2.5 sm:max-w-[18rem]"
                    aria-label="Agent model"
                    title={`${TEXT_MODELS[model].label}, ${TEXT_MODELS[model].pickerDetails}`}
                  >
                    <PromptInputSelectValue>
                      <span className="flex min-w-0 items-center gap-2">
                        <Cpu className="text-muted-foreground size-3.5 shrink-0" />
                        <span className="truncate">
                          {TEXT_MODELS[model].shortLabel}
                        </span>
                      </span>
                    </PromptInputSelectValue>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent className="w-72">
                    {getPublicTextModels().map((option) => (
                      <PromptInputSelectItem key={option.id} value={option.id}>
                        <div className="flex min-w-0 items-start gap-2.5">
                          <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md border">
                            <Cpu className="text-muted-foreground size-4" />
                          </span>
                          <div className="flex min-w-0 flex-col">
                            <span>{option.label}</span>
                            <span className="text-muted-foreground text-xs">
                              {option.pickerDetails}
                            </span>
                          </div>
                        </div>
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
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
              </PromptInputTools>
              <PromptInputTools>
                {isLoading && (
                  <PromptInputButton
                    onClick={() => void stop()}
                    aria-label="Stop generation"
                    tooltip="Stop generation"
                  >
                    <Square className="size-3" fill="currentColor" />
                  </PromptInputButton>
                )}
                <PromptInputSubmit
                  disabled={!input.trim()}
                  aria-label={isLoading ? "Queue message" : "Send message"}
                >
                  <ArrowUp className="size-4" strokeWidth={2.5} />
                </PromptInputSubmit>
              </PromptInputTools>
            </PromptInputFooter>
          </PromptInput>
          <p className="text-muted-foreground mt-2 text-center text-[11px]">
            Generations and edits cost credits per image. The agent itself runs
            on a small flat fee.
          </p>
        </div>
      </div>
    </div>
  );
}
