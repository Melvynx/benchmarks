import { applyMVector, invertM, mul } from '../geometry/mat2d';
import type { Rect } from '../geometry/rect';
import { rectUnionAll } from '../geometry/rect';
import { createFrame, createGroup, uniqueName } from '../scene/factories';
import type { DraftDoc } from '../scene/draft';
import { addNode, cloneSubtree, getN, moveNode, patchBase, removeSubtree } from '../scene/draft';
import { applyWorldPlacement, childBoundsInParent, localMatrix, parentWorldMatrix, worldMatrix } from '../scene/nodeGeometry';
import { getSceneIndex } from '../scene/sceneIndex';
import {
  getNode,
  indexInParent,
  isAncestorOf,
  paintOrderIndex,
  siblingIdsOf,
  topLevelSelection,
} from '../scene/traversal';
import type { BaseNodeProps, NodeId, SceneDocument } from '../scene/types';
import { isContainer } from '../scene/types';
import { editDoc } from './docEdit';
import { editorStore, setSelection } from './store';

// ---------------------------------------------------------------------------
// Selection policy (Figma-style click bubbling)
// ---------------------------------------------------------------------------

/**
 * Given a hit chain (deepest → outermost), decide what a single click should
 * select: the top-level node by default, one level into any selected/entered
 * ancestor, or the deepest node when `deep` (Cmd) is held.
 */
export function pickFromChain(
  doc: SceneDocument,
  chain: readonly NodeId[],
  currentSelection: readonly NodeId[],
  deep: boolean,
): NodeId | null {
  if (chain.length === 0) return null;
  if (deep) return chain[0] ?? null;

  const selected = new Set(currentSelection);
  // Clicking inside an already-selected node keeps that node active.
  for (const id of chain) {
    if (selected.has(id)) return id;
  }
  // If the current selection lives somewhere in this chain's parent, stay at that depth.
  for (const sel of currentSelection) {
    const parent = getNode(doc, sel)?.parentId;
    if (!parent) continue;
    const idx = chain.indexOf(parent);
    if (idx > 0) return chain[idx - 1] ?? null;
  }
  return chain[chain.length - 1] ?? null;
}

/** Double-click: descend one level toward the deepest hit. */
export function pickDeeperFromChain(
  _doc: SceneDocument,
  chain: readonly NodeId[],
  currentSelection: readonly NodeId[],
): NodeId | null {
  if (chain.length === 0) return null;
  const selected = new Set(currentSelection);
  for (let i = chain.length - 1; i >= 0; i--) {
    const id = chain[i];
    if (id && selected.has(id)) return i > 0 ? (chain[i - 1] ?? id) : id;
  }
  return chain.length > 1 ? (chain[chain.length - 2] ?? null) : (chain[0] ?? null);
}

export function selectAll(): void {
  const state = editorStore.getState();
  const first = state.selection[0];
  const parentScope = first ? (getNode(state.doc, first)?.parentId ?? null) : null;
  const scopeIds =
    parentScope === null
      ? state.doc.rootIds
      : (() => {
          const parent = getNode(state.doc, parentScope);
          return parent && isContainer(parent) ? parent.childIds : state.doc.rootIds;
        })();
  const index = getSceneIndex(state.doc);
  setSelection(scopeIds.filter((id) => !index.locked.has(id) && !index.hidden.has(id)));
}

// ---------------------------------------------------------------------------
// Structure edits
// ---------------------------------------------------------------------------

export function deleteSelection(): void {
  const state = editorStore.getState();
  const targets = topLevelSelection(state.doc, state.selection);
  if (targets.length === 0) return;
  editDoc(
    targets.length === 1 ? 'Delete layer' : `Delete ${targets.length} layers`,
    (d) => {
      for (const id of targets) removeSubtree(d, id);
    },
    { select: [] },
  );
}

/** Duplicate in place (Cmd+D). Returns the ids of the clones. */
export function duplicateSelection(): NodeId[] {
  const state = editorStore.getState();
  const order = paintOrderIndex(state.doc);
  const targets = topLevelSelection(state.doc, state.selection).sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
  );
  if (targets.length === 0) return [];
  const cloneIds: NodeId[] = [];
  editDoc(
    'Duplicate',
    (d) => {
      for (const id of targets) {
        const source = getN(d, id);
        if (!source) continue;
        const cloned = cloneSubtree(d, id);
        if (!cloned) continue;
        for (const node of cloned.nodes) {
          if (node.id !== cloned.rootId) d.nodes[node.id] = node;
        }
        const root = cloned.nodes.find((n) => n.id === cloned.rootId);
        if (!root) continue;
        root.name = uniqueName(d, baseNameOf(root.name));
        const at = siblingIdsOf(d, id).indexOf(id) + 1;
        addNode(d, root, source.parentId, at);
        cloneIds.push(root.id);
      }
    },
    { select: cloneIds },
  );
  return cloneIds;
}

function baseNameOf(name: string): string {
  const match = /^(.*?)\s+\d+$/.exec(name);
  return match?.[1] ?? name;
}

function selectionInPaintOrder(doc: SceneDocument, ids: readonly NodeId[]): NodeId[] {
  const order = paintOrderIndex(doc);
  return [...ids].sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0));
}

/** Union of the selection's bounds, expressed in `parentId`'s local space. */
function boundsInParentSpace(doc: SceneDocument, ids: readonly NodeId[], parentId: NodeId | null): Rect | null {
  const parentWorld = parentId === null ? null : worldMatrix(doc, parentId);
  const rects: Rect[] = [];
  for (const id of ids) {
    const node = getNode(doc, id);
    if (!node) continue;
    if (node.parentId === parentId) {
      rects.push(childBoundsInParent(node));
    } else {
      const intoParent = parentWorld
        ? mul(invertM(parentWorld), worldMatrix(doc, id))
        : worldMatrix(doc, id);
      const m = intoParent;
      const pts = [
        { x: m.e, y: m.f },
        { x: m.a * node.width + m.e, y: m.b * node.width + m.f },
        { x: m.a * node.width + m.c * node.height + m.e, y: m.b * node.width + m.d * node.height + m.f },
        { x: m.c * node.height + m.e, y: m.d * node.height + m.f },
      ];
      const xs = pts.map((p) => p.x);
      const ys = pts.map((p) => p.y);
      rects.push({
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      });
    }
  }
  return rectUnionAll(rects);
}

function wrapSelection(kind: 'group' | 'frame'): void {
  const state = editorStore.getState();
  const doc = state.doc;
  const targets = selectionInPaintOrder(doc, topLevelSelection(doc, state.selection));
  if (targets.length === 0) return;
  const topId = targets[targets.length - 1];
  if (!topId) return;
  const topNode = getNode(doc, topId);
  if (!topNode) return;
  const parentId = topNode.parentId;
  const bounds = boundsInParentSpace(doc, targets, parentId);
  if (!bounds) return;

  const container =
    kind === 'group'
      ? createGroup({ name: uniqueName(doc, 'Group'), ...bounds })
      : createFrame({ name: uniqueName(doc, 'Frame'), ...bounds, fills: [], clipsContent: true });

  editDoc(
    kind === 'group' ? 'Group selection' : 'Frame selection',
    (d) => {
      const insertAt = indexInParent(doc, topId);
      addNode(d, container, parentId, insertAt);
      const containerWorld = mul(
        parentId === null ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : worldMatrix(doc, parentId),
        localMatrix(container),
      );
      for (const id of targets) {
        const world = worldMatrix(doc, id);
        moveNode(d, id, container.id, -1);
        applyWorldPlacement(d, id, world, containerWorld);
      }
    },
    { select: [container.id] },
  );
}

export function groupSelection(): void {
  wrapSelection('group');
}

export function frameSelection(): void {
  wrapSelection('frame');
}

export function ungroupSelection(): void {
  const state = editorStore.getState();
  const doc = state.doc;
  const containers = topLevelSelection(doc, state.selection).filter((id) => {
    const node = getNode(doc, id);
    return node !== null && isContainer(node);
  });
  if (containers.length === 0) return;
  const released: NodeId[] = [];
  editDoc(
    'Ungroup',
    (d) => {
      for (const containerId of containers) {
        const container = getN(d, containerId);
        if (!container || !isContainer(container)) continue;
        const parentId = container.parentId;
        const parentWorld =
          parentId === null ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : worldMatrix(doc, parentId);
        let at = siblingIdsOf(d, containerId).indexOf(containerId);
        for (const childId of [...container.childIds]) {
          const world = worldMatrix(doc, childId);
          moveNode(d, childId, parentId, at++);
          applyWorldPlacement(d, childId, world, parentWorld);
          released.push(childId);
        }
        removeSubtree(d, containerId);
      }
    },
    { select: released },
  );
}

// ---------------------------------------------------------------------------
// Z-order
// ---------------------------------------------------------------------------

type ZAction = 'forward' | 'backward' | 'front' | 'back';

const Z_LABEL: Record<ZAction, string> = {
  forward: 'Bring forward',
  backward: 'Send backward',
  front: 'Bring to front',
  back: 'Send to back',
};

export function reorderSelection(action: ZAction): void {
  const state = editorStore.getState();
  const doc = state.doc;
  const targets = selectionInPaintOrder(doc, topLevelSelection(doc, state.selection));
  if (targets.length === 0) return;
  editDoc(Z_LABEL[action], (d) => {
    if (action === 'forward') {
      for (const id of [...targets].reverse()) {
        const node = getN(d, id);
        if (!node) continue;
        const siblings = siblingIdsOf(d, id);
        const i = siblings.indexOf(id);
        if (i >= 0 && i < siblings.length - 1) moveNode(d, id, node.parentId, i + 2);
      }
    } else if (action === 'backward') {
      for (const id of targets) {
        const node = getN(d, id);
        if (!node) continue;
        const i = siblingIdsOf(d, id).indexOf(id);
        if (i > 0) moveNode(d, id, node.parentId, i - 1);
      }
    } else if (action === 'front') {
      for (const id of targets) {
        const node = getN(d, id);
        if (node) moveNode(d, id, node.parentId, siblingIdsOf(d, id).length);
      }
    } else {
      for (const id of [...targets].reverse()) {
        const node = getN(d, id);
        if (node) moveNode(d, id, node.parentId, 0);
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Geometry edits (translate, align, distribute)
// ---------------------------------------------------------------------------

/** Translate nodes by a world-space delta, mapped into each node's parent space. */
export function translateNodes(d: DraftDoc, doc: SceneDocument, ids: readonly NodeId[], dx: number, dy: number): void {
  for (const id of ids) {
    const node = getN(d, id);
    if (!node) continue;
    const inverseParent = invertM(parentWorldMatrix(doc, id));
    const delta = applyMVector(inverseParent, { x: dx, y: dy });
    patchBase(d, id, { x: node.x + delta.x, y: node.y + delta.y });
  }
}

export function nudgeSelection(dx: number, dy: number): void {
  const state = editorStore.getState();
  const targets = topLevelSelection(state.doc, state.selection);
  if (targets.length === 0) return;
  editDoc('Move', (d) => translateNodes(d, state.doc, targets, dx, dy), { mergeKey: 'nudge' });
}

export type AlignKind = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';

export function alignSelection(kind: AlignKind): void {
  const state = editorStore.getState();
  const doc = state.doc;
  const targets = topLevelSelection(doc, state.selection);
  if (targets.length === 0) return;
  const index = getSceneIndex(doc);

  let frame: Rect | null = null;
  if (targets.length === 1) {
    const only = targets[0];
    const parentId = only ? getNode(doc, only)?.parentId : null;
    if (!parentId) return;
    frame = index.worldBounds.get(parentId) ?? null;
  } else {
    frame = rectUnionAll(targets.map((id) => index.worldBounds.get(id)).filter((r): r is Rect => r !== undefined));
  }
  if (!frame) return;
  const target = frame;

  editDoc('Align', (d) => {
    for (const id of targets) {
      const b = index.worldBounds.get(id);
      if (!b) continue;
      let dx = 0;
      let dy = 0;
      if (kind === 'left') dx = target.x - b.x;
      else if (kind === 'right') dx = target.x + target.width - (b.x + b.width);
      else if (kind === 'center-h') dx = target.x + target.width / 2 - (b.x + b.width / 2);
      else if (kind === 'top') dy = target.y - b.y;
      else if (kind === 'bottom') dy = target.y + target.height - (b.y + b.height);
      else dy = target.y + target.height / 2 - (b.y + b.height / 2);
      translateNodes(d, doc, [id], dx, dy);
    }
  });
}

export function distributeSelection(axis: 'horizontal' | 'vertical'): void {
  const state = editorStore.getState();
  const doc = state.doc;
  const targets = topLevelSelection(doc, state.selection);
  if (targets.length < 3) return;
  const index = getSceneIndex(doc);
  const items = targets
    .map((id) => ({ id, b: index.worldBounds.get(id) }))
    .filter((it): it is { id: NodeId; b: Rect } => it.b !== undefined)
    .sort((a, b) => (axis === 'horizontal' ? a.b.x - b.b.x : a.b.y - b.b.y));
  if (items.length < 3) return;

  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return;
  const span =
    axis === 'horizontal' ? last.b.x + last.b.width - first.b.x : last.b.y + last.b.height - first.b.y;
  const sizes = items.reduce((sum, it) => sum + (axis === 'horizontal' ? it.b.width : it.b.height), 0);
  const gap = (span - sizes) / (items.length - 1);

  editDoc('Distribute', (d) => {
    let cursor = axis === 'horizontal' ? first.b.x + first.b.width + gap : first.b.y + first.b.height + gap;
    for (let i = 1; i < items.length - 1; i++) {
      const item = items[i];
      if (!item) continue;
      const delta = axis === 'horizontal' ? cursor - item.b.x : cursor - item.b.y;
      translateNodes(d, doc, [item.id], axis === 'horizontal' ? delta : 0, axis === 'horizontal' ? 0 : delta);
      cursor += (axis === 'horizontal' ? item.b.width : item.b.height) + gap;
    }
  });
}

// ---------------------------------------------------------------------------
// Misc node edits
// ---------------------------------------------------------------------------

export function patchSelectionBase(label: string, patch: Partial<BaseNodeProps>, mergeKey?: string): void {
  const state = editorStore.getState();
  if (state.selection.length === 0) return;
  editDoc(
    label,
    (d) => {
      for (const id of state.selection) patchBase(d, id, patch);
    },
    mergeKey !== undefined ? { mergeKey } : {},
  );
}

export function renameNode(id: NodeId, name: string): void {
  const trimmed = name.trim();
  if (trimmed === '') return;
  editDoc('Rename', (d) => patchBase(d, id, { name: trimmed }));
}

export function toggleVisibility(ids: readonly NodeId[]): void {
  const state = editorStore.getState();
  const anyVisible = ids.some((id) => getNode(state.doc, id)?.visible);
  editDoc(anyVisible ? 'Hide' : 'Show', (d) => {
    for (const id of ids) patchBase(d, id, { visible: !anyVisible });
  });
}

export function toggleLock(ids: readonly NodeId[]): void {
  const state = editorStore.getState();
  const anyUnlocked = ids.some((id) => !getNode(state.doc, id)?.locked);
  editDoc(anyUnlocked ? 'Lock' : 'Unlock', (d) => {
    for (const id of ids) patchBase(d, id, { locked: anyUnlocked });
  });
}

/**
 * Reparent nodes (layers-panel drag & drop), preserving each node's world
 * placement. Rejects drops into a node's own subtree.
 */
export function reparentNodes(ids: readonly NodeId[], newParentId: NodeId | null, index: number): void {
  const state = editorStore.getState();
  const doc = state.doc;
  const targets = selectionInPaintOrder(doc, topLevelSelection(doc, ids)).filter((id) => {
    if (id === newParentId) return false;
    if (newParentId !== null && isAncestorOf(doc, id, newParentId)) return false;
    return true;
  });
  if (targets.length === 0) return;
  if (newParentId !== null) {
    const parent = getNode(doc, newParentId);
    if (!parent || !isContainer(parent)) return;
  }
  const parentWorld =
    newParentId === null ? { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } : worldMatrix(doc, newParentId);

  editDoc(
    'Move layer',
    (d) => {
      let at = index;
      for (const id of targets) {
        const world = worldMatrix(doc, id);
        const node = getN(d, id);
        if (!node) continue;
        // Dropping within the same parent above its own slot: account for removal.
        const sameParent = node.parentId === newParentId;
        const oldIndex = sameParent ? siblingIdsOf(d, id).indexOf(id) : -1;
        moveNode(d, id, newParentId, at);
        if (!(sameParent && oldIndex >= 0 && oldIndex < at)) at++;
        if (!sameParent) applyWorldPlacement(d, id, world, parentWorld);
      }
    },
    { select: [...targets] },
  );
}
