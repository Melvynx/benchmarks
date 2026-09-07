import { Button } from "@/components/ui/button";
import { Trash2, X } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import {
  HISTORY_KEY,
  HISTORY_MAX_ITEMS,
  type CardTheme,
  type HistoryEntry,
  type VideoData,
} from "./card.types";

const EMPTY_HISTORY: HistoryEntry[] = [];

let listeners: (() => void)[] = [];
let cachedSnapshot: HistoryEntry[] | null = null;

function emitChange() {
  cachedSnapshot = null;
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): HistoryEntry[] {
  if (cachedSnapshot) return cachedSnapshot;
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return EMPTY_HISTORY;
    cachedSnapshot = JSON.parse(raw) as HistoryEntry[];
    return cachedSnapshot;
  } catch {
    return EMPTY_HISTORY;
  }
}

function getServerSnapshot(): HistoryEntry[] {
  return EMPTY_HISTORY;
}

function writeHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
  emitChange();
}

export function useCardHistory() {
  const history = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const addEntry = useCallback(
    (videoData: VideoData, theme: CardTheme, previewDataUrl?: string) => {
      const current = getSnapshot();
      const entry: HistoryEntry = {
        id: crypto.randomUUID(),
        videoData,
        theme,
        timestamp: Date.now(),
        previewDataUrl,
      };
      writeHistory([entry, ...current].slice(0, HISTORY_MAX_ITEMS));
    },
    [],
  );

  const removeEntry = useCallback((id: string) => {
    const current = getSnapshot();
    writeHistory(current.filter((e) => e.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    localStorage.removeItem(HISTORY_KEY);
    emitChange();
  }, []);

  return { history, addEntry, removeEntry, clearHistory };
}

type CardHistoryProps = {
  history: HistoryEntry[];
  onRestore: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export function CardHistory({
  history,
  onRestore,
  onRemove,
  onClear,
}: CardHistoryProps) {
  if (history.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-foreground text-xs font-semibold tracking-widest uppercase">
          History
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-6 text-[11px]"
          onClick={onClear}
        >
          <Trash2 className="size-3" />
          Clear all
        </Button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {history.map((entry) => (
          <div
            key={entry.id}
            role="button"
            tabIndex={0}
            onClick={() => onRestore(entry)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onRestore(entry);
            }}
            className="group relative flex-shrink-0 cursor-pointer"
          >
            <div
              className="flex h-24 w-40 items-center justify-center overflow-hidden rounded-lg border transition-shadow hover:shadow-md"
              style={{ backgroundColor: entry.theme.card.background }}
            >
              {}
              <img
                src={entry.previewDataUrl ?? entry.videoData.thumbnailUrl}
                alt=""
                className={
                  entry.previewDataUrl
                    ? "h-full w-full object-contain"
                    : "h-full w-full object-cover"
                }
              />
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(entry.id);
              }}
              className="bg-background absolute -top-1.5 -right-1.5 hidden size-5 items-center justify-center rounded-full border shadow-sm group-hover:flex"
            >
              <X className="size-3" />
            </button>
            <p className="text-muted-foreground mt-1 max-w-32 truncate text-[10px]">
              {entry.videoData.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
