import type { Patch } from 'immer';

export interface HistoryEntry {
  label: string;
  timestamp: number;
  patches: Patch[];
  inversePatches: Patch[];
}

export interface HistoryOptions {
  maxEntries?: number;
}

/**
 * Pure patch-based history manager. Stores a list of committed entries
 * (each holding forward & inverse patches), plus a redo stack.
 *
 * The store is responsible for applying patches via `applyPatches`.
 */
export class History {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private readonly maxEntries: number;

  constructor(options: HistoryOptions = {}) {
    this.maxEntries = options.maxEntries ?? 200;
  }

  commit(entry: HistoryEntry): void {
    if (entry.patches.length === 0) return;
    this.undoStack.push(entry);
    this.redoStack.length = 0;
    if (this.undoStack.length > this.maxEntries) {
      this.undoStack.shift();
    }
  }

  /** Merge a patch set into the top entry (for coalesced continuous gestures). */
  appendToTop(entry: HistoryEntry): void {
    const top = this.undoStack[this.undoStack.length - 1];
    if (!top) {
      this.commit(entry);
      return;
    }
    top.patches.push(...entry.patches);
    // inverses need to be prepended, since we want to undo newest→oldest
    top.inversePatches = [...entry.inversePatches, ...top.inversePatches];
    top.timestamp = entry.timestamp;
  }

  undo(): HistoryEntry | null {
    const entry = this.undoStack.pop();
    if (!entry) return null;
    this.redoStack.push(entry);
    return entry;
  }

  redo(): HistoryEntry | null {
    const entry = this.redoStack.pop();
    if (!entry) return null;
    this.undoStack.push(entry);
    return entry;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  peekUndo(): HistoryEntry | null {
    return this.undoStack[this.undoStack.length - 1] ?? null;
  }
  peekRedo(): HistoryEntry | null {
    return this.redoStack[this.redoStack.length - 1] ?? null;
  }

  /** Snapshot sizes. Used for status-bar indicators. */
  stats(): { undo: number; redo: number } {
    return { undo: this.undoStack.length, redo: this.redoStack.length };
  }
}
