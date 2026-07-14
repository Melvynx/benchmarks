import { create } from "zustand";
import type { Command } from "../commands/commands";
import { createSeedDocument } from "../scene/factory";
import { paintOrder } from "../scene/graph";
import { SpatialHash } from "../scene/spatialIndex";
import { nodeBounds } from "../geometry/bounds";
import type { EditorDocument, NodeId, SerializedEditor, Tool, Viewport } from "../types/nodes";
import { loadSerializedEditor, saveSerializedEditor } from "../persistence/storage";

type Clipboard = Readonly<{ nodeIds: readonly NodeId[] }> | null;

export type EditorState = Readonly<{
  documents: readonly EditorDocument[];
  activeDocumentId: string;
  tool: Tool;
  viewport: Viewport;
  historyPast: readonly Command[];
  historyFuture: readonly Command[];
  clipboard: Clipboard;
  recentColors: readonly string[];
  gridVisible: boolean;
  rulersVisible: boolean;
  spatialIndex: SpatialHash;
  setTool(tool: Tool): void;
  setViewport(viewport: Viewport): void;
  select(ids: readonly NodeId[]): void;
  setActiveDocument(documentId: string): void;
  execute(command: Command): void;
  undo(): void;
  redo(): void;
  setDocument(document: EditorDocument): void;
  newDocument(): void;
  importSerialized(serialized: SerializedEditor): void;
  setClipboard(clipboard: Clipboard): void;
  addRecentColor(color: string): void;
  toggleGrid(): void;
  toggleRulers(): void;
}>;

const loaded = loadSerializedEditor();
const initialDocument = loaded?.documents[0] ?? createSeedDocument();

export const useEditorStore = create<EditorState>((set, get) => ({
  documents: loaded?.documents ?? [initialDocument],
  activeDocumentId: loaded?.activeDocumentId ?? initialDocument.id,
  tool: "select",
  viewport: { x: 360, y: 160, zoom: 1 },
  historyPast: [],
  historyFuture: [],
  clipboard: null,
  recentColors: ["#ec2b76", "#f8f6f0", "#1f2123", "#ffe594"],
  gridVisible: true,
  rulersVisible: true,
  spatialIndex: buildSpatialIndex(initialDocument),
  setTool(tool) {
    set({ tool });
  },
  setViewport(viewport) {
    set({ viewport: { ...viewport, zoom: Math.min(64, Math.max(0.1, viewport.zoom)) } });
  },
  select(ids) {
    const document = activeDocument(get());
    const next = { ...document, selection: ids };
    setDocumentInState(set, get, next, false);
  },
  setActiveDocument(documentId) {
    const document = get().documents.find((item) => item.id === documentId);
    if (document) set({ activeDocumentId: documentId, spatialIndex: buildSpatialIndex(document), historyPast: [], historyFuture: [] });
  },
  execute(command) {
    const current = activeDocument(get());
    const next = command.apply(current);
    setDocumentInState(set, get, next, true, command);
  },
  undo() {
    const state = get();
    const command = state.historyPast[state.historyPast.length - 1];
    if (!command) return;
    const next = command.revert(activeDocument(state));
    set({
      documents: replaceDocument(state.documents, next),
      historyPast: state.historyPast.slice(0, -1),
      historyFuture: [command, ...state.historyFuture].slice(0, 100),
      spatialIndex: buildSpatialIndex(next),
    });
  },
  redo() {
    const state = get();
    const command = state.historyFuture[0];
    if (!command) return;
    const next = command.apply(activeDocument(state));
    set({
      documents: replaceDocument(state.documents, next),
      historyPast: [...state.historyPast, command].slice(-100),
      historyFuture: state.historyFuture.slice(1),
      spatialIndex: buildSpatialIndex(next),
    });
  },
  setDocument(document) {
    setDocumentInState(set, get, document, false);
  },
  newDocument() {
    const document = createSeedDocument();
    set((state) => ({
      documents: [...state.documents, document],
      activeDocumentId: document.id,
      historyPast: [],
      historyFuture: [],
      spatialIndex: buildSpatialIndex(document),
    }));
  },
  importSerialized(serialized) {
    const active = serialized.documents.find((document) => document.id === serialized.activeDocumentId) ?? serialized.documents[0];
    if (!active) return;
    set({ documents: serialized.documents, activeDocumentId: active.id, historyPast: [], historyFuture: [], spatialIndex: buildSpatialIndex(active) });
  },
  setClipboard(clipboard) {
    set({ clipboard });
  },
  addRecentColor(color) {
    set((state) => ({ recentColors: [color, ...state.recentColors.filter((item) => item !== color)].slice(0, 8) }));
  },
  toggleGrid() {
    set((state) => ({ gridVisible: !state.gridVisible }));
  },
  toggleRulers() {
    set((state) => ({ rulersVisible: !state.rulersVisible }));
  },
}));

export function activeDocument(state: Pick<EditorState, "documents" | "activeDocumentId">): EditorDocument {
  return state.documents.find((document) => document.id === state.activeDocumentId) ?? state.documents[0] ?? createSeedDocument();
}

export function serializeState(state: EditorState): SerializedEditor {
  return { version: 1, activeDocumentId: state.activeDocumentId, documents: state.documents };
}

function replaceDocument(documents: readonly EditorDocument[], document: EditorDocument): EditorDocument[] {
  return documents.map((item) => (item.id === document.id ? document : item));
}

function buildSpatialIndex(document: EditorDocument): SpatialHash {
  const index = new SpatialHash();
  for (const node of paintOrder(document)) index.insert(node.id, nodeBounds(node));
  return index;
}

function setDocumentInState(
  set: (partial: Partial<EditorState> | ((state: EditorState) => Partial<EditorState>)) => void,
  get: () => EditorState,
  document: EditorDocument,
  recordHistory: boolean,
  command?: Command,
): void {
  set((state) => ({
    documents: replaceDocument(state.documents, document),
    historyPast: recordHistory && command ? [...state.historyPast, command].slice(-100) : state.historyPast,
    historyFuture: recordHistory ? [] : state.historyFuture,
    spatialIndex: buildSpatialIndex(document),
  }));
  window.setTimeout(() => saveSerializedEditor(serializeState(get())), 0);
}
