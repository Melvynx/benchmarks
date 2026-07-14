import { useStore, setSelection } from './store';
import type { Draft } from 'immer';
import { current } from 'immer';
import type {
  ColorStyle,
  Document,
  NodeId,
  SceneNode,
  TextStyle,
} from '../core/scene';
import {
  descendantIds,
  getChildrenIds,
  isAncestor,
  isFrame,
  isStyledShape,
  isText,
  makeId,
  nodeWorldAABB,
  nodeWorldMatrix,
  solidPaint,
  createFrame,
  unionWorldAABB,
} from '../core/scene';
import { matInvert, matApply } from '../core/geometry/Mat2D';
import type { Rect } from '../core/geometry/Rect';

/* ================================================================ */
/* Helpers                                                            */
/* ================================================================ */

const removeFromParent = (doc: Draft<Document>, id: NodeId): void => {
  const node = doc.nodes[id];
  if (!node) return;
  if (node.parentId === null) {
    const page = doc.pages[doc.currentPageId];
    if (page) page.children = page.children.filter((c) => c !== id);
  } else {
    const parent = doc.nodes[node.parentId];
    if (parent && parent.type === 'frame') {
      parent.children = parent.children.filter((c) => c !== id);
    }
  }
};

const insertIntoParent = (
  doc: Draft<Document>,
  id: NodeId,
  parentId: NodeId | null,
  index?: number,
): void => {
  if (parentId === null) {
    const page = doc.pages[doc.currentPageId];
    if (!page) return;
    const idx = index === undefined ? page.children.length : index;
    page.children.splice(idx, 0, id);
  } else {
    const parent = doc.nodes[parentId];
    if (parent && parent.type === 'frame') {
      const idx = index === undefined ? parent.children.length : index;
      parent.children.splice(idx, 0, id);
    }
  }
};

const deleteSubtree = (doc: Draft<Document>, id: NodeId): void => {
  const node = doc.nodes[id];
  if (!node) return;
  if (node.type === 'frame') {
    for (const cid of [...node.children]) deleteSubtree(doc, cid);
  }
  removeFromParent(doc, id);
  delete doc.nodes[id];
};

/* ================================================================ */
/* Node creation / deletion                                            */
/* ================================================================ */

export const addNode = (node: SceneNode, parentId: NodeId | null = null, index?: number): void => {
  useStore.getState().mutate(`Create ${node.type}`, (doc) => {
    const n: SceneNode = { ...node, parentId };
    doc.nodes[n.id] = n;
    insertIntoParent(doc, n.id, parentId, index);
  });
  setSelection([node.id]);
};

export const addNodes = (nodes: SceneNode[], parentId: NodeId | null = null): void => {
  useStore.getState().mutate('Create nodes', (doc) => {
    for (const n of nodes) {
      doc.nodes[n.id] = { ...n, parentId };
      insertIntoParent(doc, n.id, parentId);
    }
  });
  setSelection(nodes.map((n) => n.id));
};

export const deleteNodes = (ids: NodeId[]): void => {
  if (ids.length === 0) return;
  useStore.getState().mutate('Delete', (doc) => {
    for (const id of ids) deleteSubtree(doc, id);
  });
  setSelection([]);
};

export const deleteSelection = (): void => deleteNodes(useStore.getState().selection);

/* ================================================================ */
/* Property updates                                                    */
/* ================================================================ */

export const updateNodes = (
  ids: NodeId[],
  updater: (n: Draft<SceneNode>) => void,
  label = 'Update',
): void => {
  useStore.getState().mutate(label, (doc) => {
    for (const id of ids) {
      const n = doc.nodes[id];
      if (n) updater(n);
    }
  });
};

export const updateNodesCoalesced = (
  ids: NodeId[],
  updater: (n: Draft<SceneNode>) => void,
  label = 'Update',
): void => {
  useStore.getState().mutateCoalesced(label, (doc) => {
    for (const id of ids) {
      const n = doc.nodes[id];
      if (n) updater(n);
    }
  });
};

/* ================================================================ */
/* Translation / geometry (world-space)                               */
/* ================================================================ */

export const translateSelection = (dx: number, dy: number, label = 'Move'): void => {
  const ids = useStore.getState().selection;
  if (ids.length === 0) return;
  useStore.getState().mutateCoalesced(label, (doc) => {
    for (const id of ids) {
      const n = doc.nodes[id];
      if (!n || n.locked) continue;
      n.x += dx;
      n.y += dy;
    }
  });
};

/* ================================================================ */
/* Z-order                                                             */
/* ================================================================ */

const siblingList = (doc: Draft<Document>, id: NodeId): string[] | null => {
  const node = doc.nodes[id];
  if (!node) return null;
  if (node.parentId === null) {
    const page = doc.pages[doc.currentPageId];
    return page ? page.children : null;
  }
  const parent = doc.nodes[node.parentId];
  if (parent && parent.type === 'frame') return parent.children;
  return null;
};

export const bringForward = (ids: NodeId[]): void => {
  useStore.getState().mutate('Bring forward', (doc) => {
    for (const id of ids) {
      const list = siblingList(doc, id);
      if (!list) continue;
      const i = list.indexOf(id);
      if (i < 0 || i >= list.length - 1) continue;
      const tmp = list[i]!;
      list[i] = list[i + 1]!;
      list[i + 1] = tmp;
    }
  });
};

export const sendBackward = (ids: NodeId[]): void => {
  useStore.getState().mutate('Send backward', (doc) => {
    for (const id of ids) {
      const list = siblingList(doc, id);
      if (!list) continue;
      const i = list.indexOf(id);
      if (i <= 0) continue;
      const tmp = list[i]!;
      list[i] = list[i - 1]!;
      list[i - 1] = tmp;
    }
  });
};

export const bringToFront = (ids: NodeId[]): void => {
  useStore.getState().mutate('Bring to front', (doc) => {
    for (const id of ids) {
      const list = siblingList(doc, id);
      if (!list) continue;
      const i = list.indexOf(id);
      if (i < 0) continue;
      list.splice(i, 1);
      list.push(id);
    }
  });
};

export const sendToBack = (ids: NodeId[]): void => {
  useStore.getState().mutate('Send to back', (doc) => {
    for (const id of ids) {
      const list = siblingList(doc, id);
      if (!list) continue;
      const i = list.indexOf(id);
      if (i < 0) continue;
      list.splice(i, 1);
      list.unshift(id);
    }
  });
};

/* ================================================================ */
/* Reparenting                                                         */
/* ================================================================ */

export const reparent = (ids: NodeId[], newParentId: NodeId | null, index?: number): void => {
  useStore.getState().mutate('Reparent', (doc) => {
    for (const id of ids) {
      // Prevent cycles
      if (newParentId && isAncestor(current(doc), id, newParentId)) continue;
      removeFromParent(doc, id);
      const node = doc.nodes[id];
      if (!node) continue;
      node.parentId = newParentId;
      insertIntoParent(doc, id, newParentId, index);
    }
  });
};

/* ================================================================ */
/* Grouping (frame-wrap)                                              */
/* ================================================================ */

export const groupSelection = (): void => {
  const state = useStore.getState();
  const ids = state.selection;
  if (ids.length === 0) return;
  const doc = state.doc;
  const bounds = unionWorldAABB(doc, ids);
  if (!bounds) return;

  // Determine common parent
  const firstNode = doc.nodes[ids[0]!];
  if (!firstNode) return;
  const parentId = firstNode.parentId;
  const parentSameForAll = ids.every((id) => doc.nodes[id]?.parentId === parentId);
  if (!parentSameForAll) return;

  const frame = createFrame({
    parentId,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    name: 'Group',
    fills: [],
    clipContent: false,
  });

  useStore.getState().mutate('Group', (draft) => {
    draft.nodes[frame.id] = { ...frame };
    insertIntoParent(draft, frame.id, parentId);
    // Move all selected into the frame and reposition to local space
    for (const id of ids) {
      const n = draft.nodes[id];
      if (!n) continue;
      // Compute world matrix before reparent, derive new x/y relative to frame
      const worldM = nodeWorldMatrix(current(draft), id);
      const topLeft = matApply(worldM, { x: 0, y: 0 });
      removeFromParent(draft, id);
      n.parentId = frame.id;
      const f = draft.nodes[frame.id];
      if (f && f.type === 'frame') {
        f.children.push(id);
      }
      // New local coords: subtract frame top-left (in world)
      // frame is axis-aligned at (bounds.x, bounds.y), rotation 0
      n.x = topLeft.x - bounds.x;
      n.y = topLeft.y - bounds.y;
    }
  });
  setSelection([frame.id]);
};

export const ungroupSelection = (): void => {
  const state = useStore.getState();
  const ids = state.selection;
  const newSelection: NodeId[] = [];
  useStore.getState().mutate('Ungroup', (doc) => {
    for (const id of ids) {
      const frame = doc.nodes[id];
      if (!frame || frame.type !== 'frame') continue;
      const parentId = frame.parentId;
      const children = [...frame.children];
      // For each child, compute its world matrix (before moving), then attach to grandparent preserving position
      for (const cid of children) {
        const child = doc.nodes[cid];
        if (!child) continue;
        // world matrix before move
        const cw = nodeWorldMatrix(current(doc), cid);
        // frame's world matrix (parent of parent's local)
        // Reparent
        child.parentId = parentId;
        // remove from frame.children done below
        // Compute new local coords in new parent space
        let topLeft = { x: cw.tx, y: cw.ty };
        if (parentId) {
          const parentW = nodeWorldMatrix(current(doc), parentId);
          const inv = matInvert(parentW);
          topLeft = matApply(inv, { x: cw.tx, y: cw.ty });
        }
        child.x = topLeft.x;
        child.y = topLeft.y;
        // rotation preserved from cw? For simplicity, keep current rotation.
        insertIntoParent(doc, cid, parentId);
        newSelection.push(cid);
      }
      // Now remove the frame
      deleteSubtree(doc, id);
    }
  });
  setSelection(newSelection);
};

/* ================================================================ */
/* Duplicate / clipboard                                              */
/* ================================================================ */

const cloneNodeDeep = (doc: Document, id: NodeId, newParentId: NodeId | null): SceneNode[] => {
  const source = doc.nodes[id];
  if (!source) return [];
  const clone = { ...source, id: makeId(), parentId: newParentId };
  const out: SceneNode[] = [clone];
  if (isFrame(source)) {
    const frameClone = clone as typeof source;
    frameClone.children = [];
    for (const cid of source.children) {
      const children = cloneNodeDeep(doc, cid, clone.id);
      if (children.length > 0) {
        frameClone.children.push(children[0]!.id);
        out.push(...children);
      }
    }
  }
  return out;
};

export const duplicateSelection = (): void => {
  const state = useStore.getState();
  const doc = state.doc;
  const ids = state.selection;
  if (ids.length === 0) return;

  const newIds: NodeId[] = [];
  useStore.getState().mutate('Duplicate', (draft) => {
    for (const id of ids) {
      const n = doc.nodes[id];
      if (!n) continue;
      const clones = cloneNodeDeep(doc, id, n.parentId);
      for (const c of clones) draft.nodes[c.id] = c;
      // Slight offset
      const top = clones[0]!;
      draft.nodes[top.id]!.x += 10;
      draft.nodes[top.id]!.y += 10;
      insertIntoParent(draft, top.id, n.parentId);
      newIds.push(top.id);
    }
  });
  setSelection(newIds);
};

export const copySelection = (): void => {
  const state = useStore.getState();
  const doc = state.doc;
  const ids = state.selection;
  if (ids.length === 0) return;
  // flatten subtrees
  const nodes: SceneNode[] = [];
  for (const id of ids) {
    for (const did of descendantIds(doc, id)) {
      const n = doc.nodes[did];
      if (n) nodes.push(structuredClone(n));
    }
  }
  useStore.setState({ clipboard: nodes });
};

export const cutSelection = (): void => {
  copySelection();
  deleteSelection();
};

export const pasteClipboard = (atWorld?: { x: number; y: number }): void => {
  const state = useStore.getState();
  const clip = state.clipboard;
  if (!clip || clip.length === 0) return;

  // ids in clipboard -> new ids
  const idMap = new Map<NodeId, NodeId>();
  for (const n of clip) idMap.set(n.id, makeId());

  // First-level roots: those whose parent isn't in the clip set
  const clipIds = new Set(clip.map((n) => n.id));
  const roots = clip.filter((n) => !n.parentId || !clipIds.has(n.parentId));

  useStore.getState().mutate('Paste', (draft) => {
    for (const n of clip) {
      const newNode: SceneNode = { ...structuredClone(n), id: idMap.get(n.id)! };
      if (newNode.parentId && idMap.has(newNode.parentId)) {
        newNode.parentId = idMap.get(newNode.parentId)!;
      } else {
        newNode.parentId = null;
      }
      if (newNode.type === 'frame') {
        newNode.children = newNode.children.map((cid) => idMap.get(cid) ?? cid);
      }
      draft.nodes[newNode.id] = newNode;
    }
    // Add roots to current page, offset by a small amount or placed at atWorld
    let offsetX = 10;
    let offsetY = 10;
    if (atWorld && roots.length > 0) {
      const first = roots[0]!;
      offsetX = atWorld.x - first.x;
      offsetY = atWorld.y - first.y;
    }
    for (const r of roots) {
      const newId = idMap.get(r.id)!;
      const n = draft.nodes[newId];
      if (!n) continue;
      n.parentId = null;
      n.x += offsetX;
      n.y += offsetY;
      insertIntoParent(draft, newId, null);
    }
  });
  setSelection(roots.map((r) => idMap.get(r.id)!));
};

/* ================================================================ */
/* Selection                                                           */
/* ================================================================ */

export const selectAll = (): void => {
  const state = useStore.getState();
  const page = state.doc.pages[state.doc.currentPageId];
  if (!page) return;
  setSelection([...page.children]);
};

export const deselect = (): void => setSelection([]);

/* ================================================================ */
/* Alignment / distribution                                           */
/* ================================================================ */

type AlignDir = 'left' | 'center-h' | 'right' | 'top' | 'middle-v' | 'bottom';

export const alignSelection = (dir: AlignDir): void => {
  const state = useStore.getState();
  const ids = state.selection;
  if (ids.length < 2) return;
  const doc = state.doc;

  // Compute bounds of selection
  const bounds: Rect[] = ids
    .map((id) => nodeWorldAABB(doc, id))
    .filter((b) => b.width > 0 && b.height > 0);
  if (bounds.length < 2) return;

  const minX = Math.min(...bounds.map((b) => b.x));
  const maxX = Math.max(...bounds.map((b) => b.x + b.width));
  const minY = Math.min(...bounds.map((b) => b.y));
  const maxY = Math.max(...bounds.map((b) => b.y + b.height));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  useStore.getState().mutate(`Align ${dir}`, (draft) => {
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]!;
      const n = draft.nodes[id];
      if (!n || n.locked) continue;
      const b = bounds[i]!;
      let dx = 0;
      let dy = 0;
      switch (dir) {
        case 'left':
          dx = minX - b.x;
          break;
        case 'right':
          dx = maxX - (b.x + b.width);
          break;
        case 'center-h':
          dx = cx - (b.x + b.width / 2);
          break;
        case 'top':
          dy = minY - b.y;
          break;
        case 'bottom':
          dy = maxY - (b.y + b.height);
          break;
        case 'middle-v':
          dy = cy - (b.y + b.height / 2);
          break;
      }
      n.x += dx;
      n.y += dy;
    }
  });
};

type DistributeDir = 'horizontal' | 'vertical';

export const distributeSelection = (dir: DistributeDir): void => {
  const state = useStore.getState();
  const ids = state.selection;
  if (ids.length < 3) return;
  const doc = state.doc;

  const entries = ids.map((id) => ({ id, b: nodeWorldAABB(doc, id) }));
  entries.sort((a, b) =>
    dir === 'horizontal' ? a.b.x - b.b.x : a.b.y - b.b.y,
  );

  const first = entries[0]!;
  const last = entries[entries.length - 1]!;
  const startEdge =
    dir === 'horizontal' ? first.b.x + first.b.width : first.b.y + first.b.height;
  const endEdge = dir === 'horizontal' ? last.b.x : last.b.y;
  const totalInnerSize = entries
    .slice(1, -1)
    .reduce((acc, e) => acc + (dir === 'horizontal' ? e.b.width : e.b.height), 0);
  const gap = (endEdge - startEdge - totalInnerSize) / (entries.length - 1);

  useStore.getState().mutate('Distribute', (draft) => {
    let cursor = startEdge;
    for (let i = 1; i < entries.length - 1; i++) {
      cursor += gap;
      const e = entries[i]!;
      const n = draft.nodes[e.id];
      if (!n) continue;
      if (dir === 'horizontal') {
        n.x += cursor - e.b.x;
        cursor += e.b.width;
      } else {
        n.y += cursor - e.b.y;
        cursor += e.b.height;
      }
    }
  });
};

/* ================================================================ */
/* Styles                                                              */
/* ================================================================ */

export const addColorStyle = (name: string, color: string): ColorStyle => {
  const style: ColorStyle = { id: makeId(), name, color };
  useStore.getState().mutate('Add color style', (doc) => {
    doc.colorStyles[style.id] = style;
  });
  return style;
};

export const removeColorStyle = (id: string): void => {
  useStore.getState().mutate('Remove color style', (doc) => {
    delete doc.colorStyles[id];
  });
};

export const applyColorStyleToSelection = (styleId: string): void => {
  const state = useStore.getState();
  const style = state.doc.colorStyles[styleId];
  if (!style) return;
  const ids = state.selection;
  useStore.getState().mutate('Apply color style', (draft) => {
    for (const id of ids) {
      const n = draft.nodes[id];
      if (!n) continue;
      if (isStyledShape(n)) {
        n.fills = [solidPaint(style.color, 1)];
      } else if (isText(n)) {
        n.color = style.color;
      }
    }
  });
};

export const addTextStyle = (name: string, base: Partial<TextStyle>): TextStyle => {
  const style: TextStyle = {
    id: makeId(),
    name,
    fontFamily: base.fontFamily ?? 'Inter',
    fontWeight: base.fontWeight ?? 400,
    fontSize: base.fontSize ?? 16,
    lineHeight: base.lineHeight ?? 1.2,
    letterSpacing: base.letterSpacing ?? 0,
  };
  useStore.getState().mutate('Add text style', (doc) => {
    doc.textStyles[style.id] = style;
  });
  return style;
};

export const applyTextStyleToSelection = (styleId: string): void => {
  const state = useStore.getState();
  const style = state.doc.textStyles[styleId];
  if (!style) return;
  const ids = state.selection;
  useStore.getState().mutate('Apply text style', (draft) => {
    for (const id of ids) {
      const n = draft.nodes[id];
      if (n && n.type === 'text') {
        n.fontFamily = style.fontFamily;
        n.fontWeight = style.fontWeight;
        n.fontSize = style.fontSize;
        n.lineHeight = style.lineHeight;
        n.letterSpacing = style.letterSpacing;
      }
    }
  });
};

/* ================================================================ */
/* Page helpers                                                        */
/* ================================================================ */

export const setPageBackground = (color: string): void => {
  useStore.getState().mutate('Page background', (doc) => {
    const page = doc.pages[doc.currentPageId];
    if (page) page.background = color;
  });
};

/* ================================================================ */
/* Frame clipping / name rename                                        */
/* ================================================================ */

export const renameNode = (id: NodeId, name: string): void => {
  useStore.getState().mutate('Rename', (doc) => {
    const n = doc.nodes[id];
    if (n) n.name = name;
  });
};

export const setVisibility = (id: NodeId, visible: boolean): void => {
  useStore.getState().mutate(visible ? 'Show' : 'Hide', (doc) => {
    const n = doc.nodes[id];
    if (n) n.visible = visible;
  });
};

export const setLocked = (id: NodeId, locked: boolean): void => {
  useStore.getState().mutate(locked ? 'Lock' : 'Unlock', (doc) => {
    const n = doc.nodes[id];
    if (n) n.locked = locked;
  });
};

/* ================================================================ */
/* Parent-of-point helpers (for drawing new shapes inside frames)      */
/* ================================================================ */

export { getChildrenIds };
