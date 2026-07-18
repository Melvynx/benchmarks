import { useSyncExternalStore } from "react";

import {
  addNodesCommand,
  batchCommand,
  CommandHistory,
  duplicateNodesCommand,
  graphCommand,
  patchNodesCommand,
  removeNodesCommand,
  type EditorCommand,
} from "./commands";
import { invert, nodeWorldBounds, transformPoint, unionBounds, worldMatrix } from "./geometry";
import { resolveAutoLayout } from "./layout";
import { DocumentRepository } from "./persistence";
import { createInitialDocument, isContainer } from "./scene";
import type { DesignDocument, EditorState, EditorUiState, Guide, NodeId, Point, SceneNode, Tool, Viewport } from "./types";

const DEFAULT_UI: EditorUiState = {
  leftPanelOpen: true,
  rightPanelOpen: true,
  layersTab: "layers",
  propertyTab: "design",
  layerQuery: "",
  showGrid: true,
  showRulers: true,
  pixelPreview: false,
  toast: null,
};

type Listener = () => void;
type UiPatch = Partial<EditorUiState>;

export class EditorStore {
  readonly #listeners = new Set<Listener>();
  readonly #history = new CommandHistory(150);
  readonly #repository = new DocumentRepository();
  #clipboard: readonly NodeId[] = [];
  #toastTimer: number | null = null;
  #state: EditorState;

  constructor() {
    const document = this.#repository.loadActive() ?? createInitialDocument();
    this.#state = {
      document,
      selection: [],
      tool: "select",
      viewport: { x: 330, y: 92, zoom: 0.72 },
      ui: DEFAULT_UI,
      previewNodes: {},
      guides: [],
      canUndo: false,
      canRedo: false,
      historyLabel: null,
      editingTextId: null,
    };
  }

  getState = (): EditorState => this.#state;
  subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  execute(command: EditorCommand): void {
    const document = this.#history.execute(command, this.#state.document);
    this.#replace({ document, previewNodes: {}, guides: [], ...this.#historyState() });
    this.#repository.scheduleSave(document);
  }

  undo = (): void => {
    if (!this.#history.canUndo) return;
    const document = this.#history.undo(this.#state.document);
    this.#replace({ document, selection: this.#state.selection.filter((id) => Boolean(document.nodes[id])), ...this.#historyState() });
    this.#repository.scheduleSave(document);
  };

  redo = (): void => {
    if (!this.#history.canRedo) return;
    const document = this.#history.redo(this.#state.document);
    this.#replace({ document, ...this.#historyState() });
    this.#repository.scheduleSave(document);
  };

  setSelection = (ids: readonly NodeId[]): void => this.#replace({ selection: [...new Set(ids)].filter((id) => Boolean(this.#state.document.nodes[id])) });
  toggleSelection = (id: NodeId): void => this.setSelection(this.#state.selection.includes(id) ? this.#state.selection.filter((item) => item !== id) : [...this.#state.selection, id]);
  clearSelection = (): void => this.#replace({ selection: [] });
  selectAll = (): void => this.setSelection(this.#state.document.rootIds);
  setTool = (tool: Tool): void => this.#replace({ tool, editingTextId: null });
  setEditingText = (id: NodeId | null): void => this.#replace({ editingTextId: id });
  setViewport = (viewport: Viewport): void => this.#replace({ viewport: { ...viewport, zoom: Math.min(64, Math.max(0.1, viewport.zoom)) } });
  setUi = (patch: UiPatch): void => this.#replace({ ui: { ...this.#state.ui, ...patch } });
  setGuides = (guides: readonly Guide[]): void => this.#replace({ guides });

  toast(message: string): void {
    if (this.#toastTimer !== null) window.clearTimeout(this.#toastTimer);
    this.setUi({ toast: message });
    this.#toastTimer = window.setTimeout(() => this.setUi({ toast: null }), 2200);
  }

  updateNodes(label: string, patches: Readonly<Record<NodeId, Partial<SceneNode>>>): void {
    this.execute(patchNodesCommand(label, this.#state.document, patches));
    const frameIds = Object.keys(patches).filter((id) => {
      const node = this.#state.document.nodes[id];
      return node?.type === "frame" && node.autoLayout;
    });
    frameIds.forEach((id) => {
      const frame = this.#state.document.nodes[id];
      if (frame?.type === "frame" && frame.autoLayout) this.execute(patchNodesCommand("Resolve auto layout", this.#state.document, resolveAutoLayout(frame, this.#state.document)));
    });
  }

  setPreview(patches: Readonly<Record<NodeId, Partial<SceneNode>>>, guides: readonly Guide[] = []): void {
    const previewNodes: Record<NodeId, SceneNode> = {};
    Object.entries(patches).forEach(([id, patch]) => {
      const node = this.#state.document.nodes[id];
      if (node) previewNodes[id] = { ...node, ...patch } as SceneNode;
    });
    this.#replace({ previewNodes, guides });
  }

  commitPreview(label: string): void {
    const patches = Object.fromEntries(Object.entries(this.#state.previewNodes).map(([id, node]) => [id, node]));
    if (Object.keys(patches).length === 0) return;
    this.execute(patchNodesCommand(label, this.#state.document, patches));
  }

  cancelPreview = (): void => this.#replace({ previewNodes: {}, guides: [] });

  addNodes(nodes: readonly SceneNode[], select = true): void {
    this.execute(addNodesCommand(nodes.length === 1 ? `Create ${nodes[0]?.type ?? "layer"}` : "Create layers", this.#state.document, nodes));
    if (select) this.setSelection(nodes.map((node) => node.id));
  }

  removeSelection = (): void => {
    if (this.#state.selection.length === 0) return;
    this.execute(removeNodesCommand("Delete", this.#state.document, this.#state.selection));
    this.clearSelection();
  };

  duplicateSelection = (): void => {
    if (this.#state.selection.length === 0) return;
    const result = duplicateNodesCommand(this.#state.document, this.#state.selection);
    this.execute(result.command);
    this.setSelection(result.ids);
  };

  copySelection = (): void => {
    this.#clipboard = this.#state.selection;
    const nodes = this.#state.selection.flatMap((id) => this.#state.document.nodes[id] ? [this.#state.document.nodes[id]] : []);
    void navigator.clipboard?.writeText(JSON.stringify({ type: "gpt56-layers", nodes })).catch(() => undefined);
    this.toast(`${nodes.length} layer${nodes.length === 1 ? "" : "s"} copied`);
  };

  cutSelection = (): void => {
    this.copySelection();
    this.removeSelection();
  };

  paste = (): void => {
    if (this.#clipboard.length === 0) return;
    const existing = this.#clipboard.filter((id) => Boolean(this.#state.document.nodes[id]));
    if (existing.length === 0) return;
    const result = duplicateNodesCommand(this.#state.document, existing);
    this.execute(result.command);
    this.setSelection(result.ids);
  };

  groupSelection = (): void => {
    const nodes = this.#state.selection.flatMap((id) => this.#state.document.nodes[id] ? [this.#state.document.nodes[id]] : []);
    if (nodes.length < 2 || new Set(nodes.map((node) => node.parentId)).size > 1) return;
    const parentId = nodes[0]?.parentId ?? null;
    const localBounds = unionBounds(nodes.map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height })));
    if (!localBounds) return;
    const groupId = crypto.randomUUID();
    const template = nodes[0];
    if (!template) return;
    const group: SceneNode = {
      ...template,
      id: groupId,
      type: "group",
      name: "Group",
      parentId,
      x: localBounds.x,
      y: localBounds.y,
      width: localBounds.width,
      height: localBounds.height,
      rotation: 0,
      fills: [],
      stroke: { ...template.stroke, visible: false },
      effects: [],
      children: nodes.map((node) => node.id),
    };
    const addCommand = addNodesCommand("Create group", this.#state.document, [group]);
    const patches = Object.fromEntries(nodes.map((node) => [node.id, { parentId: groupId, x: node.x - localBounds.x, y: node.y - localBounds.y }]));
    this.execute(batchCommand("Group selection", [addCommand, patchNodesCommand("Move into group", this.#state.document, patches)]));
    this.setSelection([groupId]);
  };

  ungroupSelection = (): void => {
    const groups = this.#state.selection.flatMap((id) => {
      const node = this.#state.document.nodes[id];
      return node?.type === "group" ? [node] : [];
    });
    if (groups.length === 0) return;
    const before: Record<NodeId, SceneNode> = {};
    const after: Record<NodeId, SceneNode> = {};
    const removed: Record<NodeId, SceneNode> = {};
    let roots = [...this.#state.document.rootIds];
    const selected: NodeId[] = [];
    groups.forEach((group) => {
      removed[group.id] = group;
      group.children.forEach((id) => {
        const child = this.#state.document.nodes[id];
        if (!child) return;
        before[id] = child;
        after[id] = { ...child, parentId: group.parentId, x: child.x + group.x, y: child.y + group.y };
        selected.push(id);
      });
      if (group.parentId) {
        const parent = this.#state.document.nodes[group.parentId];
        if (parent && isContainer(parent)) {
          before[parent.id] = parent;
          after[parent.id] = { ...parent, children: parent.children.flatMap((id) => id === group.id ? group.children : [id]) };
        }
      } else roots = roots.flatMap((id) => id === group.id ? group.children : [id]);
    });
    this.execute(graphCommand("Ungroup", { before, after, added: {}, removed, rootIdsBefore: this.#state.document.rootIds, rootIdsAfter: roots }));
    this.setSelection(selected);
  };

  reorder(id: NodeId, targetId: NodeId, position: "before" | "after" | "inside"): void {
    const node = this.#state.document.nodes[id];
    const target = this.#state.document.nodes[targetId];
    if (!node || !target || node.id === target.id) return;
    const newParentId = position === "inside" && isContainer(target) ? target.id : target.parentId;
    const before: Record<NodeId, SceneNode> = {};
    const after: Record<NodeId, SceneNode> = {};
    let roots = this.#state.document.rootIds.filter((rootId) => rootId !== id);
    if (node.parentId) {
      const oldParent = this.#state.document.nodes[node.parentId];
      if (oldParent && isContainer(oldParent)) {
        before[oldParent.id] = oldParent;
        after[oldParent.id] = { ...oldParent, children: oldParent.children.filter((childId) => childId !== id) };
      }
    }
    const updatedNode = this.#reparentPosition(node, newParentId);
    before[id] = node;
    after[id] = updatedNode;
    if (newParentId) {
      const parent = this.#state.document.nodes[newParentId];
      if (parent && isContainer(parent)) {
        before[parent.id] ??= parent;
        const changedParent = after[parent.id];
        const baseChildren = changedParent && isContainer(changedParent) ? changedParent.children : parent.children.filter((childId) => childId !== id);
        const targetIndex = position === "inside" ? baseChildren.length : Math.max(0, baseChildren.indexOf(targetId) + (position === "after" ? 1 : 0));
        const children = [...baseChildren];
        children.splice(targetIndex, 0, id);
        after[parent.id] = { ...parent, children };
      }
    } else {
      const targetIndex = Math.max(0, roots.indexOf(targetId) + (position === "after" ? 1 : 0));
      roots = [...roots.slice(0, targetIndex), id, ...roots.slice(targetIndex)];
    }
    this.execute(graphCommand("Reorder layer", { before, after, added: {}, removed: {}, rootIdsBefore: this.#state.document.rootIds, rootIdsAfter: roots }));
  }

  moveLayerOrder(direction: "front" | "forward" | "backward" | "back"): void {
    const id = this.#state.selection[0];
    const node = id ? this.#state.document.nodes[id] : undefined;
    if (!node) return;
    const siblings = node.parentId ? (() => { const parent = this.#state.document.nodes[node.parentId]; return parent && isContainer(parent) ? parent.children : []; })() : this.#state.document.rootIds;
    const index = siblings.indexOf(node.id);
    const targetIndex = direction === "front" ? siblings.length - 1 : direction === "back" ? 0 : direction === "forward" ? Math.min(siblings.length - 1, index + 1) : Math.max(0, index - 1);
    const targetId = siblings[targetIndex];
    if (!targetId || targetId === id) return;
    this.reorder(node.id, targetId, targetIndex > index ? "after" : "before");
  }

  fitToBounds(bounds: { x: number; y: number; width: number; height: number }, surface: { width: number; height: number }): void {
    const padding = 120;
    const zoom = Math.min(4, Math.max(0.1, Math.min((surface.width - padding) / Math.max(1, bounds.width), (surface.height - padding) / Math.max(1, bounds.height))));
    this.setViewport({ x: surface.width / 2 - (bounds.x + bounds.width / 2) * zoom, y: surface.height / 2 - (bounds.y + bounds.height / 2) * zoom, zoom });
  }

  fitAll(surface: { width: number; height: number }): void {
    const bounds = unionBounds(this.#state.document.rootIds.flatMap((id) => this.#state.document.nodes[id] ? [nodeWorldBounds(this.#state.document.nodes[id], this.#state.document.nodes)] : []));
    if (bounds) this.fitToBounds(bounds, surface);
  }

  newDocument = (): void => {
    const document = createInitialDocument();
    this.#replace({ document, selection: [], viewport: { x: 330, y: 92, zoom: 0.72 } });
    this.#repository.save(document);
  };

  importDocument(document: DesignDocument): void {
    this.#replace({ document: { ...document, id: crypto.randomUUID(), updatedAt: Date.now() }, selection: [] });
    this.#repository.save(this.#state.document);
  }

  #reparentPosition(node: SceneNode, parentId: NodeId | null): SceneNode {
    const origin = transformPoint(worldMatrix(node, this.#state.document.nodes), { x: 0, y: 0 });
    if (!parentId) return { ...node, parentId, x: origin.x, y: origin.y };
    const parent = this.#state.document.nodes[parentId];
    if (!parent) return node;
    const local = transformPoint(invert(worldMatrix(parent, this.#state.document.nodes)), origin);
    return { ...node, parentId, x: local.x, y: local.y };
  }

  #historyState(): Pick<EditorState, "canUndo" | "canRedo" | "historyLabel"> {
    return { canUndo: this.#history.canUndo, canRedo: this.#history.canRedo, historyLabel: this.#history.label };
  }

  #replace(patch: Partial<EditorState>): void {
    this.#state = { ...this.#state, ...patch };
    this.#listeners.forEach((listener) => listener());
  }
}

export const editorStore = new EditorStore();

export function useEditorStore<T>(selector: (state: EditorState) => T): T {
  return useSyncExternalStore(editorStore.subscribe, () => selector(editorStore.getState()), () => selector(editorStore.getState()));
}
