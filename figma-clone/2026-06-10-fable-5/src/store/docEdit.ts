import { applyCommand, diffDocuments, invertCommand } from '../commands/apply';
import { History } from '../commands/history';
import { runLayout } from '../layout/autoLayout';
import type { DraftDoc } from '../scene/draft';
import { makeDraft } from '../scene/draft';
import type { NodeId, SceneDocument } from '../scene/types';
import { scheduleAutosave } from './autosave';
import type { GestureKind } from './store';
import { editorStore } from './store';

const history = new History();

export function getHistory(): History {
  return history;
}

function bumpHistory(): void {
  editorStore.setState((s) => ({ historyVersion: s.historyVersion + 1 }));
}

function finalizeDraft(draft: DraftDoc): SceneDocument {
  runLayout(draft);
  return { nodes: draft.nodes, rootIds: draft.rootIds };
}

function survivingSelection(doc: SceneDocument, ids: readonly NodeId[]): NodeId[] {
  return ids.filter((id) => doc.nodes[id] !== undefined);
}

export interface EditOptions {
  /** Same key + <900ms apart → commands coalesce into one undo step. */
  mergeKey?: string;
  /** Selection to apply after the edit (defaults to current, pruned of deleted ids). */
  select?: NodeId[];
}

/**
 * The single entry point for undoable document mutations. `fn` edits a draft;
 * the layout pass resolves derived fields; the result is diffed into a
 * command and pushed to history (already applied).
 */
export function editDoc(label: string, fn: (d: DraftDoc) => void, options: EditOptions = {}): void {
  const state = editorStore.getState();
  const before = state.doc;
  const draft = makeDraft(before);
  fn(draft);
  const after = finalizeDraft(draft);
  const command = diffDocuments(before, after);

  const selectionAfter = options.select
    ? survivingSelection(after, options.select)
    : survivingSelection(after, state.selection);

  if (!command) {
    if (options.select) editorStore.setState({ selection: selectionAfter });
    return;
  }

  editorStore.setState((s) => ({
    doc: after,
    docVersion: s.docVersion + 1,
    selection: selectionAfter,
    editingTextId: s.editingTextId && !after.nodes[s.editingTextId] ? null : s.editingTextId,
  }));
  history.push({
    command,
    label,
    time: performance.now(),
    mergeKey: options.mergeKey ?? null,
    selectionBefore: [...state.selection],
    selectionAfter,
  });
  bumpHistory();
  scheduleAutosave();
}

// ---------------------------------------------------------------------------
// Gestures: many transient frames, one history entry
// ---------------------------------------------------------------------------

interface GestureSnapshot {
  doc: SceneDocument;
  selection: NodeId[];
}

let gestureSnapshot: GestureSnapshot | null = null;

export function isGestureActive(): boolean {
  return gestureSnapshot !== null;
}

export function beginGesture(kind: GestureKind): void {
  if (gestureSnapshot) return;
  const state = editorStore.getState();
  gestureSnapshot = { doc: state.doc, selection: [...state.selection] };
  editorStore.setState({ activeGesture: kind });
}

/** Apply a transient mutation during a gesture (no history entry). */
export function updateGesture(fn: (d: DraftDoc) => void): void {
  const state = editorStore.getState();
  const draft = makeDraft(state.doc);
  fn(draft);
  const after = finalizeDraft(draft);
  editorStore.setState((s) => ({
    doc: after,
    docVersion: s.docVersion + 1,
    selection: survivingSelection(after, s.selection),
  }));
}

const gestureUiReset = {
  activeGesture: null as GestureKind,
  snap: null,
  dropTargetId: null,
  rotationHud: null,
  marquee: null,
};

export function endGesture(label: string, options: { mergeKey?: string } = {}): void {
  if (!gestureSnapshot) {
    editorStore.setState(gestureUiReset);
    return;
  }
  const snapshot = gestureSnapshot;
  gestureSnapshot = null;
  const state = editorStore.getState();
  const command = diffDocuments(snapshot.doc, state.doc);
  if (command) {
    history.push({
      command,
      label,
      time: performance.now(),
      mergeKey: options.mergeKey ?? null,
      selectionBefore: snapshot.selection,
      selectionAfter: [...state.selection],
    });
    bumpHistory();
    scheduleAutosave();
  }
  editorStore.setState(gestureUiReset);
}

/** Restore the pre-gesture document (Escape while dragging). */
export function cancelGesture(): void {
  if (!gestureSnapshot) {
    editorStore.setState(gestureUiReset);
    return;
  }
  const snapshot = gestureSnapshot;
  gestureSnapshot = null;
  editorStore.setState((s) => ({
    doc: snapshot.doc,
    docVersion: s.docVersion + 1,
    selection: snapshot.selection,
    ...gestureUiReset,
  }));
}

// ---------------------------------------------------------------------------
// Undo / redo
// ---------------------------------------------------------------------------

function applyToState(doc: SceneDocument, selection: readonly NodeId[]): void {
  const draft = makeDraft(doc);
  const after = finalizeDraft(draft);
  editorStore.setState((s) => ({
    doc: after,
    docVersion: s.docVersion + 1,
    selection: survivingSelection(after, selection),
    editingTextId: null,
  }));
}

export function undo(): void {
  if (gestureSnapshot) {
    cancelGesture();
    return;
  }
  const entry = history.popUndo();
  if (!entry) return;
  const next = applyCommand(editorStore.getState().doc, invertCommand(entry.command));
  applyToState(next, entry.selectionBefore);
  bumpHistory();
  scheduleAutosave();
}

export function redo(): void {
  if (gestureSnapshot) return;
  const entry = history.popRedo();
  if (!entry) return;
  const next = applyCommand(editorStore.getState().doc, entry.command);
  applyToState(next, entry.selectionAfter);
  bumpHistory();
  scheduleAutosave();
}

export function breakHistoryMerge(): void {
  history.breakMerge();
}

/** Re-run the layout pass without touching history (e.g. after a webfont loads). */
export function reflowDocument(): void {
  const state = editorStore.getState();
  const draft = makeDraft(state.doc);
  const after = finalizeDraft(draft);
  editorStore.setState((s) => ({ doc: after, docVersion: s.docVersion + 1 }));
}

/** Replace the whole document (doc switch / import / boot). Clears history. */
export function loadDocument(doc: SceneDocument, meta: { docId: string; docName: string }): void {
  gestureSnapshot = null;
  history.clear();
  const draft = makeDraft(doc);
  const after = finalizeDraft(draft);
  editorStore.setState((s) => ({
    doc: after,
    docVersion: s.docVersion + 1,
    docId: meta.docId,
    docName: meta.docName,
    selection: [],
    hoverId: null,
    editingTextId: null,
    ...gestureUiReset,
  }));
  bumpHistory();
}
