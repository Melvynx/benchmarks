import { useSyncExternalStore } from 'react';

import {
  BatchCommand,
  CommandHistory,
  createDeleteNodesCommand,
  createGroupNodesCommand,
  createNodeCommand,
  createReorderNodeCommand,
  createReparentNodesCommand,
  createSetNodePropertiesCommand,
  createUngroupNodeCommand,
  createUpdateNodesCommand,
} from '@/core/commands';
import {
  assertSceneInvariants,
  cloneSceneNode,
  createNodeId,
  getAncestorIds,
  getDescendantIds,
  getNode,
  getSiblingIds,
  resolveGroupBounds,
} from '@/core/model';

import { SceneRuntime } from './sceneRuntime';
import { DEFAULT_SESSION, MAX_ZOOM, MIN_ZOOM } from './sessionTypes';

import type { HistoryState, SceneCommand } from '@/core/commands';
import type { CommonNodeChanges, NodeId, SceneDocument, SceneNode } from '@/core/model';
import type { NodeRenderOverrides } from './rendering/SceneRenderer';
import type {
  Camera,
  EditorSession,
  InteractionState,
  SnapGuide,
  ToastMessage,
  Tool,
} from './sessionTypes';

interface ClipboardPayload {
  readonly rootIds: readonly NodeId[];
  readonly nodes: readonly SceneNode[];
}

export type DocumentChanges = Partial<Pick<SceneDocument, 'name' | 'background'>>;

export interface EditorSnapshot {
  readonly document: SceneDocument;
  readonly session: EditorSession;
  readonly history: HistoryState;
  readonly runtime: SceneRuntime;
  readonly renderOverrides: NodeRenderOverrides;
  readonly toasts: readonly ToastMessage[];
  readonly lastActionLabel: string | null;
}

type Listener = () => void;

function clampZoom(zoom: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

function topLevelSelection(document: SceneDocument, selectedIds: ReadonlySet<string>) {
  return [...selectedIds].filter(
    (id) => !getAncestorIds(document, id).some((ancestorId) => selectedIds.has(ancestorId)),
  );
}

function cloneNodeForPaste(
  node: SceneNode,
  id: string,
  parentId: string | null,
  offsetRoot: boolean,
): SceneNode {
  const x = node.x + (offsetRoot ? 16 : 0);
  const y = node.y + (offsetRoot ? 16 : 0);
  if (node.type === 'frame') {
    return cloneSceneNode({ ...node, id, parentId, x, y, childIds: [] });
  }
  if (node.type === 'group') {
    return cloneSceneNode({ ...node, id, parentId, x, y, childIds: [] });
  }
  return cloneSceneNode({ ...node, id, parentId, x, y });
}

function isEditableNode(document: SceneDocument, id: string) {
  const node = document.nodes[id];
  return (
    node !== undefined &&
    !node.locked &&
    !getAncestorIds(document, id).some((ancestorId) => document.nodes[ancestorId]?.locked)
  );
}

export class EditorStore {
  readonly #listeners = new Set<Listener>();
  readonly #uiListeners = new Set<Listener>();
  readonly #history = new CommandHistory(300);
  #document: SceneDocument;
  #session: EditorSession;
  #runtime: SceneRuntime;
  #renderOverrides: NodeRenderOverrides = new Map();
  #toasts: readonly ToastMessage[] = [];
  #clipboard: ClipboardPayload | null = null;
  #lastActionLabel: string | null = null;
  #snapshot: EditorSnapshot;

  constructor(document: SceneDocument) {
    assertSceneInvariants(document);
    this.#document = resolveGroupBounds(document);
    this.#session = { ...DEFAULT_SESSION, selectedIds: new Set(document.rootIds.slice(0, 1)) };
    this.#runtime = new SceneRuntime(this.#document);
    this.#snapshot = this.#createSnapshot();
  }

  readonly subscribe = (listener: Listener) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  readonly subscribeUi = (listener: Listener) => {
    this.#uiListeners.add(listener);
    return () => this.#uiListeners.delete(listener);
  };

  readonly getSnapshot = () => this.#snapshot;

  get document() {
    return this.#document;
  }

  get session() {
    return this.#session;
  }

  setTool(tool: Tool) {
    this.#setSession({ activeTool: tool, interaction: { kind: 'idle' } });
  }

  setViewport(width: number, height: number) {
    if (this.#session.viewport.width === width && this.#session.viewport.height === height) return;
    this.#setSession({ viewport: { width, height } }, false);
  }

  setCamera(camera: Camera) {
    this.#setSession({ camera: { ...camera, zoom: clampZoom(camera.zoom) } }, false);
  }

  panBy(deltaX: number, deltaY: number) {
    const { camera } = this.#session;
    this.setCamera({ ...camera, x: camera.x + deltaX, y: camera.y + deltaY });
  }

  zoomAt(screenX: number, screenY: number, nextZoom: number) {
    const { camera } = this.#session;
    const zoom = clampZoom(nextZoom);
    const worldX = (screenX - camera.x) / camera.zoom;
    const worldY = (screenY - camera.y) / camera.zoom;
    this.setCamera({ x: screenX - worldX * zoom, y: screenY - worldY * zoom, zoom });
  }

  fitBounds(bounds: {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
  }) {
    const { viewport } = this.#session;
    if (viewport.width <= 0 || viewport.height <= 0) return;
    const padding = 74;
    const width = Math.max(1, bounds.maxX - bounds.minX);
    const height = Math.max(1, bounds.maxY - bounds.minY);
    const zoom = clampZoom(
      Math.min((viewport.width - padding * 2) / width, (viewport.height - padding * 2) / height),
    );
    this.setCamera({
      zoom,
      x: (viewport.width - width * zoom) / 2 - bounds.minX * zoom,
      y: (viewport.height - height * zoom) / 2 - bounds.minY * zoom,
    });
  }

  fitAll() {
    const bounds = this.#runtime.getSelectionBounds(this.#document.rootIds);
    if (bounds) this.fitBounds(bounds);
  }

  fitSelection() {
    const bounds = this.#runtime.getSelectionBounds(this.#session.selectedIds);
    if (bounds) this.fitBounds(bounds);
  }

  setSelection(ids: Iterable<string>) {
    const selectedIds = new Set([...ids].filter((id) => this.#document.nodes[id] !== undefined));
    this.#setSession({ selectedIds });
  }

  select(id: string, additive = false) {
    if (!this.#document.nodes[id]) return;
    if (!additive) {
      this.setSelection([id]);
      return;
    }
    const selectedIds = new Set(this.#session.selectedIds);
    if (selectedIds.has(id)) selectedIds.delete(id);
    else selectedIds.add(id);
    this.#setSession({ selectedIds });
  }

  clearSelection() {
    this.setSelection([]);
  }

  setHoveredId(hoveredId: string | null) {
    if (this.#session.hoveredId === hoveredId) return;
    this.#setSession({ hoveredId }, false);
  }

  setCursorWorld(x: number, y: number) {
    const previous = this.#session.cursorWorld;
    if (Math.abs(previous.x - x) < 0.05 && Math.abs(previous.y - y) < 0.05) return;
    this.#setSession({ cursorWorld: { x, y } }, false);
  }

  setInteraction(interaction: InteractionState) {
    this.#setSession({ interaction }, false);
  }

  setRenderPreview(overrides: NodeRenderOverrides, guides: readonly SnapGuide[] = []) {
    this.#renderOverrides = overrides;
    this.#session = { ...this.#session, snapGuides: guides };
    this.#emit(false);
  }

  clearRenderPreview() {
    this.#renderOverrides = new Map();
    this.#session = { ...this.#session, interaction: { kind: 'idle' }, snapGuides: [] };
    this.#emit(false);
  }

  toggleGrid() {
    this.#setSession({ isGridVisible: !this.#session.isGridVisible });
  }

  toggleRulers() {
    this.#setSession({ areRulersVisible: !this.#session.areRulersVisible });
  }

  toggleSnapping() {
    this.#setSession({ isSnappingEnabled: !this.#session.isSnappingEnabled });
  }

  toggleLeftPanel() {
    this.#setSession({ isLeftPanelOpen: !this.#session.isLeftPanelOpen });
  }

  toggleRightPanel() {
    this.#setSession({ isRightPanelOpen: !this.#session.isRightPanelOpen });
  }

  setCommandPaletteOpen(isCommandPaletteOpen: boolean) {
    this.#setSession({ isCommandPaletteOpen });
  }

  markSaved(savedAt = Date.now()) {
    this.#setSession({ saveState: { status: 'saved', savedAt } });
  }

  markSaveError(message: string) {
    this.#setSession({ saveState: { status: 'error', message } });
  }

  execute(command: SceneCommand, nextSelection?: Iterable<string>) {
    try {
      this.#document = resolveGroupBounds(this.#history.execute(this.#document, command));
      this.#lastActionLabel = command.label;
      this.#afterDocumentChange(nextSelection);
      return true;
    } catch (error: unknown) {
      this.addToast(
        error instanceof Error ? error.message : 'The editor could not apply that change.',
        'error',
      );
      return false;
    }
  }

  undo() {
    const label = this.#history.getState().nextUndoLabel;
    const document = this.#history.undo(this.#document);
    if (document === this.#document) return;
    this.#document = resolveGroupBounds(document);
    this.#lastActionLabel = label ? `Undo ${label}` : 'Undo';
    this.#afterDocumentChange();
  }

  redo() {
    const label = this.#history.getState().nextRedoLabel;
    const document = this.#history.redo(this.#document);
    if (document === this.#document) return;
    this.#document = resolveGroupBounds(document);
    this.#lastActionLabel = label ? `Redo ${label}` : 'Redo';
    this.#afterDocumentChange();
  }

  replaceDocument(document: SceneDocument) {
    assertSceneInvariants(document);
    this.#history.clear();
    this.#document = resolveGroupBounds(document);
    this.#runtime = new SceneRuntime(this.#document);
    this.#session = { ...this.#session, selectedIds: new Set(), interaction: { kind: 'idle' } };
    this.#lastActionLabel = 'Open document';
    this.#emit();
  }

  updateDocument(changes: DocumentChanges, label = 'Update document') {
    const before = {
      name: this.#document.name,
      background: this.#document.background,
    };
    const command: SceneCommand = {
      id: createNodeId('document-command'),
      label,
      createdAt: new Date().toISOString(),
      patches: [],
      execute: (scene) => ({
        ...scene,
        ...changes,
        revision: scene.revision + 1,
        updatedAt: new Date().toISOString(),
      }),
      undo: (scene) => ({
        ...scene,
        ...before,
        revision: scene.revision + 1,
        updatedAt: new Date().toISOString(),
      }),
    };
    this.execute(command);
  }

  createNode(node: SceneNode, parentId: string | null = node.parentId) {
    if (parentId && !isEditableNode(this.#document, parentId)) {
      this.addToast('Unlock the parent frame before adding a layer.', 'neutral');
      return false;
    }
    return this.execute(createNodeCommand(this.#document, node, { parentId }), [node.id]);
  }

  updateSelection(changes: CommonNodeChanges, label = 'Update layers') {
    const ids = [...this.#session.selectedIds].filter((id) => isEditableNode(this.#document, id));
    if (ids.length === 0) return false;
    return this.execute(createSetNodePropertiesCommand(this.#document, ids, changes, label));
  }

  updateNodes(nodes: readonly SceneNode[], label = 'Update layers') {
    const editableNodes = nodes.filter((node) => isEditableNode(this.#document, node.id));
    if (editableNodes.length === 0) return false;
    return this.execute(createUpdateNodesCommand(this.#document, editableNodes, label));
  }

  deleteSelection() {
    const ids = [...this.#session.selectedIds].filter((id) => isEditableNode(this.#document, id));
    if (ids.length === 0) return;
    this.execute(createDeleteNodesCommand(this.#document, ids), []);
    this.addToast(ids.length === 1 ? 'Layer deleted' : `${ids.length} layers deleted`, 'neutral');
  }

  nudgeSelection(x: number, y: number) {
    const replacements = [...this.#session.selectedIds]
      .map((id) => this.#document.nodes[id])
      .filter(
        (node): node is SceneNode => node !== undefined && isEditableNode(this.#document, node.id),
      )
      .map((node) => cloneSceneNode({ ...node, x: node.x + x, y: node.y + y }));
    if (replacements.length > 0) this.updateNodes(replacements, 'Nudge layers');
  }

  groupSelection() {
    const editableSelection = new Set(
      [...this.#session.selectedIds].filter((id) => isEditableNode(this.#document, id)),
    );
    const ids = topLevelSelection(this.#document, editableSelection);
    if (ids.length < 1) return;
    const groupId = createNodeId('group');
    this.execute(createGroupNodesCommand(this.#document, ids, { id: groupId }), [groupId]);
  }

  ungroupSelection() {
    const groupIds = [...this.#session.selectedIds].filter(
      (id) => this.#document.nodes[id]?.type === 'group' && isEditableNode(this.#document, id),
    );
    if (groupIds.length === 0) return;
    let scene = this.#document;
    const commands: SceneCommand[] = [];
    const childIds: string[] = [];
    for (const groupId of groupIds) {
      const group = getNode(scene, groupId);
      if (group.type !== 'group') continue;
      childIds.push(...group.childIds);
      const command = createUngroupNodeCommand(scene, groupId);
      commands.push(command);
      scene = command.execute(scene);
    }
    if (commands.length > 0) this.execute(new BatchCommand('Ungroup layers', commands), childIds);
  }

  reorderSelection(direction: 'forward' | 'backward' | 'front' | 'back') {
    const id = [...this.#session.selectedIds][0];
    if (!id || !isEditableNode(this.#document, id)) return;
    const siblings = getSiblingIds(this.#document, id);
    const index = siblings.indexOf(id);
    const targetIndex =
      direction === 'front'
        ? siblings.length
        : direction === 'back'
          ? 0
          : direction === 'forward'
            ? index + 1
            : index - 1;
    if (targetIndex < 0 || (direction === 'forward' && index === siblings.length - 1)) return;
    this.execute(createReorderNodeCommand(this.#document, id, targetIndex));
  }

  reparent(ids: readonly string[], parentId: string | null, index?: number) {
    if (parentId && !isEditableNode(this.#document, parentId)) return;
    const editableIds = ids.filter((id) => isEditableNode(this.#document, id));
    if (editableIds.length === 0) return;
    const options =
      index === undefined
        ? { preserveWorldPosition: true }
        : { index, preserveWorldPosition: true };
    this.execute(
      createReparentNodesCommand(this.#document, editableIds, parentId, options),
      editableIds,
    );
  }

  renameNode(id: string, name: string) {
    const node = this.#document.nodes[id];
    if (!node || !isEditableNode(this.#document, id) || name.trim().length === 0) return;
    this.execute(
      createSetNodePropertiesCommand(this.#document, [id], { name: name.trim() }, 'Rename layer'),
    );
  }

  toggleNodeVisibility(id: string) {
    const node = this.#document.nodes[id];
    if (!node) return;
    this.execute(
      createSetNodePropertiesCommand(
        this.#document,
        [id],
        { visible: !node.visible },
        'Toggle layer visibility',
      ),
    );
  }

  toggleNodeLock(id: string) {
    const node = this.#document.nodes[id];
    if (!node) return;
    this.execute(
      createSetNodePropertiesCommand(
        this.#document,
        [id],
        { locked: !node.locked },
        'Toggle layer lock',
      ),
    );
  }

  copySelection() {
    const rootIds = topLevelSelection(this.#document, this.#session.selectedIds);
    if (rootIds.length === 0) return;
    const ids = rootIds.flatMap((id) => [id, ...getDescendantIds(this.#document, id)]);
    this.#clipboard = {
      rootIds,
      nodes: ids.map((id) => cloneSceneNode(getNode(this.#document, id))),
    };
    this.addToast(
      rootIds.length === 1 ? 'Layer copied' : `${rootIds.length} layers copied`,
      'neutral',
    );
  }

  cutSelection() {
    this.copySelection();
    this.deleteSelection();
  }

  paste() {
    const clipboard = this.#clipboard;
    if (!clipboard) {
      this.addToast('Nothing has been copied yet.', 'neutral');
      return;
    }
    const idMap = new Map(clipboard.nodes.map((node) => [node.id, createNodeId(node.type)]));
    let scene = this.#document;
    const commands: SceneCommand[] = [];
    const pastedRootIds: string[] = [];
    const clipboardRootSet = new Set(clipboard.rootIds);

    for (const original of clipboard.nodes) {
      const nextId = idMap.get(original.id);
      if (!nextId) continue;
      const mappedParent = original.parentId ? idMap.get(original.parentId) : undefined;
      const parentId =
        mappedParent ??
        (original.parentId && scene.nodes[original.parentId] ? original.parentId : null);
      const isRoot = clipboardRootSet.has(original.id);
      const clone = cloneNodeForPaste(original, nextId, parentId, isRoot);
      const command = createNodeCommand(scene, clone, { parentId });
      commands.push(command);
      scene = command.execute(scene);
      if (isRoot) pastedRootIds.push(nextId);
    }

    if (commands.length === 0) return;
    this.execute(new BatchCommand('Paste layers', commands), pastedRootIds);
    this.addToast(
      pastedRootIds.length === 1 ? 'Layer pasted' : `${pastedRootIds.length} layers pasted`,
      'success',
    );
  }

  duplicateSelection() {
    this.copySelection();
    this.paste();
  }

  selectAll() {
    this.setSelection(this.#document.rootIds);
  }

  addToast(message: string, tone: ToastMessage['tone'] = 'neutral') {
    const id = createNodeId('toast');
    this.#toasts = [...this.#toasts, { id, message, tone }];
    this.#emit();
    window.setTimeout(() => this.dismissToast(id), tone === 'error' ? 6000 : 3600);
  }

  dismissToast(id: string) {
    const nextToasts = this.#toasts.filter((toast) => toast.id !== id);
    if (nextToasts.length === this.#toasts.length) return;
    this.#toasts = nextToasts;
    this.#emit();
  }

  #setSession(changes: Partial<EditorSession>, notifyUi = true) {
    this.#session = { ...this.#session, ...changes };
    this.#emit(notifyUi);
  }

  #afterDocumentChange(nextSelection?: Iterable<string>) {
    this.#runtime = new SceneRuntime(this.#document);
    const selectedIds =
      nextSelection === undefined
        ? new Set(
            [...this.#session.selectedIds].filter((id) => this.#document.nodes[id] !== undefined),
          )
        : new Set([...nextSelection].filter((id) => this.#document.nodes[id] !== undefined));
    this.#session = {
      ...this.#session,
      selectedIds,
      interaction: { kind: 'idle' },
      snapGuides: [],
      saveState: { status: 'saving' },
    };
    this.#renderOverrides = new Map();
    this.#emit();
  }

  #createSnapshot(): EditorSnapshot {
    return {
      document: this.#document,
      session: this.#session,
      history: this.#history.getState(),
      runtime: this.#runtime,
      renderOverrides: this.#renderOverrides,
      toasts: this.#toasts,
      lastActionLabel: this.#lastActionLabel,
    };
  }

  #emit(notifyUi = true) {
    this.#snapshot = this.#createSnapshot();
    for (const listener of this.#listeners) listener();
    if (notifyUi) {
      for (const listener of this.#uiListeners) listener();
    }
  }
}

export function useEditorSnapshot(store: EditorStore) {
  return useSyncExternalStore(store.subscribeUi, store.getSnapshot, store.getSnapshot);
}

export function useCanvasSnapshot(store: EditorStore) {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
