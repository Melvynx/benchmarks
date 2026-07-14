import type { DocCommand, HistoryEntry, UpdateEntry } from './types';

const MAX_HISTORY = 250;
const MERGE_WINDOW_MS = 900;

/**
 * Undo/redo stacks of serializable commands. The history never touches the
 * document itself — the store applies/inverts commands and reports back.
 */
export class History {
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];

  push(entry: HistoryEntry): void {
    this.redoStack = [];
    const previous = this.undoStack[this.undoStack.length - 1];
    if (
      previous &&
      entry.mergeKey !== null &&
      previous.mergeKey === entry.mergeKey &&
      entry.time - previous.time < MERGE_WINDOW_MS
    ) {
      previous.command = mergeCommands(previous.command, entry.command);
      previous.time = entry.time;
      previous.selectionAfter = entry.selectionAfter;
      return;
    }
    this.undoStack.push(entry);
    if (this.undoStack.length > MAX_HISTORY) this.undoStack.shift();
  }

  popUndo(): HistoryEntry | null {
    const entry = this.undoStack.pop() ?? null;
    if (entry) this.redoStack.push(entry);
    return entry;
  }

  popRedo(): HistoryEntry | null {
    const entry = this.redoStack.pop() ?? null;
    if (entry) this.undoStack.push(entry);
    return entry;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoLabel(): string | null {
    return this.undoStack[this.undoStack.length - 1]?.label ?? null;
  }

  get redoLabel(): string | null {
    return this.redoStack[this.redoStack.length - 1]?.label ?? null;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  /** Stop merging into the latest entry (e.g. when an input field blurs). */
  breakMerge(): void {
    const top = this.undoStack[this.undoStack.length - 1];
    if (top) top.mergeKey = null;
  }
}

/**
 * Merge two sequential commands into one. Update entries collapse per node
 * (first `before`, last `after`); anything else concatenates as a composite.
 */
function mergeCommands(first: DocCommand, second: DocCommand): DocCommand {
  if (first.kind === 'update' && second.kind === 'update') {
    const byId = new Map<string, UpdateEntry>();
    for (const entry of first.entries) byId.set(entry.id, { ...entry });
    for (const entry of second.entries) {
      const existing = byId.get(entry.id);
      if (existing) {
        existing.after = { ...existing.after, ...entry.after };
        // Keep the earliest `before` for keys we have; adopt new keys' befores.
        existing.before = { ...entry.before, ...existing.before };
      } else {
        byId.set(entry.id, { ...entry });
      }
    }
    return { kind: 'update', entries: [...byId.values()] };
  }
  const firstList = first.kind === 'composite' ? first.commands : [first];
  const secondList = second.kind === 'composite' ? second.commands : [second];
  return { kind: 'composite', commands: [...firstList, ...secondList] };
}
