import { cloneNode, isParent } from "./factories";
import { nid } from "./ids";
import { applyConstraintsRecursive, resolveAutoLayout } from "./layout";
import {
  activePage,
  ancestors,
  childIds,
  deepCloneSubtree,
  descendants,
  isAncestor,
  parentOf,
  requireNode,
  topLevelSelection,
} from "./scene";
import type {
  ColorStyle,
  CommentThread,
  Document,
  NodeId,
  Page,
  PageId,
  ParentNode,
  PrototypeLink,
  SceneNode,
  TextStyle,
} from "./types";
import { HISTORY_LIMIT } from "./types";

export interface Patch {
  nodesUpsert?: SceneNode[];
  nodesRemove?: NodeId[];
  pageChildren?: { pageId: PageId; children: NodeId[] };
  pages?: Page[];
  activePageId?: PageId;
  name?: string;
  colorStyles?: ColorStyle[];
  textStyles?: TextStyle[];
  prototypeLinks?: PrototypeLink[];
  comments?: CommentThread[];
}

export interface Command {
  label: string;
  redo: Patch;
  undo: Patch;
}

export interface History {
  past: Command[];
  future: Command[];
}

export function emptyHistory(): History {
  return { past: [], future: [] };
}

export function applyPatch(doc: Document, patch: Patch): Document {
  const nodes: Record<NodeId, SceneNode> = { ...doc.nodes };
  if (patch.nodesRemove) {
    for (const id of patch.nodesRemove) delete nodes[id];
  }
  if (patch.nodesUpsert) {
    for (const n of patch.nodesUpsert) nodes[n.id] = cloneNode(n);
  }

  let pages = doc.pages.map((p) => ({ ...p, children: [...p.children] }));
  if (patch.pages) pages = patch.pages.map((p) => ({ ...p, children: [...p.children] }));
  if (patch.pageChildren) {
    pages = pages.map((p) =>
      p.id === patch.pageChildren?.pageId ? { ...p, children: [...patch.pageChildren.children] } : p,
    );
  }

  const next: Document = {
    ...doc,
    nodes,
    pages,
    activePageId: patch.activePageId ?? doc.activePageId,
    name: patch.name ?? doc.name,
    colorStyles: patch.colorStyles ? patch.colorStyles.map((s) => structuredClone(s)) : doc.colorStyles,
    textStyles: patch.textStyles ? patch.textStyles.map((s) => structuredClone(s)) : doc.textStyles,
    prototypeLinks: patch.prototypeLinks
      ? patch.prototypeLinks.map((s) => structuredClone(s))
      : doc.prototypeLinks,
    comments: patch.comments ? patch.comments.map((s) => structuredClone(s)) : doc.comments,
  };
  resolveAutoLayout(next);
  return next;
}

export function pushHistory(history: History, command: Command): History {
  const past = [...history.past, command];
  if (past.length > HISTORY_LIMIT) past.splice(0, past.length - HISTORY_LIMIT);
  return { past, future: [] };
}

export function snapshotNodes(doc: Document, ids: Iterable<NodeId>): SceneNode[] {
  const out: SceneNode[] = [];
  for (const id of ids) {
    const n = doc.nodes[id];
    if (n) out.push(cloneNode(n));
  }
  return out;
}

function pageChildrenPatch(doc: Document, children: NodeId[]): Patch {
  return { pageChildren: { pageId: activePage(doc).id, children: [...children] } };
}

export function cmdInsertNodes(
  doc: Document,
  nodes: SceneNode[],
  parentId: NodeId | null,
  index?: number,
): Command {
  const ids = new Set(nodes.map((n) => n.id));
  const roots = nodes.filter((n) => !n.parentId || !ids.has(n.parentId));
  const parent = parentId ? doc.nodes[parentId] : null;
  const current = parent && isParent(parent) ? [...parent.children] : [...activePage(doc).children];
  const at = index ?? current.length;
  const nextChildren = [...current.slice(0, at), ...roots.map((r) => r.id), ...current.slice(at)];

  const placed = nodes.map((n) => {
    const c = cloneNode(n);
    if (roots.some((r) => r.id === n.id)) c.parentId = parentId;
    return c;
  });

  const redo: Patch = { nodesUpsert: placed };
  const undo: Patch = { nodesRemove: placed.map((n) => n.id) };

  if (parent && isParent(parent)) {
    const after = cloneNode(parent);
    after.children = nextChildren;
    redo.nodesUpsert = [...(redo.nodesUpsert ?? []), after];
    undo.nodesUpsert = [cloneNode(parent)];
  } else {
    redo.pageChildren = { pageId: activePage(doc).id, children: nextChildren };
    undo.pageChildren = { pageId: activePage(doc).id, children: [...activePage(doc).children] };
  }

  return { label: "Insert", redo, undo };
}

export function cmdDelete(doc: Document, ids: NodeId[]): Command | null {
  const roots = topLevelSelection(doc, ids);
  if (roots.length === 0) return null;
  const remove = new Set<NodeId>();
  for (const id of roots) {
    remove.add(id);
    for (const d of descendants(doc, id)) remove.add(d);
  }
  const upsertParents: SceneNode[] = [];
  const undoParents: SceneNode[] = [];
  let pageChildren: NodeId[] | null = null;
  const undoPage = [...activePage(doc).children];

  const grouped = new Map<string, NodeId[]>();
  for (const id of roots) {
    const n = requireNode(doc, id);
    const key = n.parentId ?? `__page__:${activePage(doc).id}`;
    const list = grouped.get(key) ?? [];
    list.push(id);
    grouped.set(key, list);
  }

  for (const [key] of grouped) {
    if (key.startsWith("__page__:")) {
      pageChildren = undoPage.filter((id) => !remove.has(id));
    } else {
      const parent = doc.nodes[key];
      if (parent && isParent(parent)) {
        undoParents.push(cloneNode(parent));
        const after = cloneNode(parent);
        after.children = parent.children.filter((id) => !remove.has(id));
        upsertParents.push(after);
      }
    }
  }

  const saved = snapshotNodes(doc, remove);
  const redo: Patch = { nodesRemove: [...remove], nodesUpsert: upsertParents };
  const undo: Patch = { nodesUpsert: [...saved, ...undoParents] };
  if (pageChildren) {
    redo.pageChildren = { pageId: activePage(doc).id, children: pageChildren };
    undo.pageChildren = { pageId: activePage(doc).id, children: undoPage };
  }

  const links = doc.prototypeLinks.filter((l) => !remove.has(l.fromId) && !remove.has(l.toId));
  if (links.length !== doc.prototypeLinks.length) {
    redo.prototypeLinks = links;
    undo.prototypeLinks = doc.prototypeLinks.map((l) => structuredClone(l));
  }

  return { label: roots.length > 1 ? "Delete layers" : "Delete", redo, undo };
}

export function cmdUpdateNodes(
  doc: Document,
  nextNodes: SceneNode[],
  label = "Update",
): Command {
  const ids = nextNodes.map((n) => n.id);
  const prev = snapshotNodes(doc, ids);
  const resizedParents: SceneNode[] = [];
  const resizedUndo: SceneNode[] = [];

  for (const n of nextNodes) {
    const old = doc.nodes[n.id];
    if (!old) continue;
    if (isParent(old) && (old.width !== n.width || old.height !== n.height)) {
      const temp = structuredClone(doc);
      temp.nodes[n.id] = cloneNode(n);
      applyConstraintsRecursive(temp, n.id, { width: old.width, height: old.height }, { width: n.width, height: n.height });
      for (const cid of old.type === "frame" || old.type === "group" || old.type === "component" ? old.children : []) {
        const updated = temp.nodes[cid];
        const before = doc.nodes[cid];
        if (updated && before && (updated.x !== before.x || updated.y !== before.y || updated.width !== before.width || updated.height !== before.height)) {
          resizedParents.push(cloneNode(updated));
          resizedUndo.push(cloneNode(before));
          for (const d of descendants(temp, cid)) {
            const u = temp.nodes[d];
            const b = doc.nodes[d];
            if (u && b) {
              resizedParents.push(cloneNode(u));
              resizedUndo.push(cloneNode(b));
            }
          }
        }
      }
    }
  }

  return {
    label,
    redo: { nodesUpsert: [...nextNodes.map(cloneNode), ...resizedParents] },
    undo: { nodesUpsert: [...prev, ...resizedUndo] },
  };
}

export function cmdSetProps(
  doc: Document,
  ids: NodeId[],
  mutate: (n: SceneNode) => void,
  label = "Edit",
): Command | null {
  const next: SceneNode[] = [];
  for (const id of ids) {
    const n = doc.nodes[id];
    if (!n) continue;
    const c = cloneNode(n);
    mutate(c);
    next.push(c);
  }
  if (next.length === 0) return null;
  return cmdUpdateNodes(doc, next, label);
}

export function cmdReorder(
  doc: Document,
  id: NodeId,
  targetParentId: NodeId | null,
  index: number,
): Command | null {
  const node = doc.nodes[id];
  if (!node) return null;
  if (targetParentId && (targetParentId === id || isAncestor(doc, id, targetParentId))) return null;

  const fromParent = parentOf(doc, node);
  const toParent = targetParentId ? doc.nodes[targetParentId] : null;
  if (targetParentId && (!toParent || !isParent(toParent))) return null;

  const undoUpsert: SceneNode[] = [cloneNode(node)];
  const redoUpsert: SceneNode[] = [];
  let undoPage: NodeId[] | undefined;
  let redoPage: NodeId[] | undefined;

  const fromList = fromParent ? [...fromParent.children] : [...activePage(doc).children];
  const fromIndex = fromList.indexOf(id);
  if (fromIndex < 0) return null;

  if (fromParent) undoUpsert.push(cloneNode(fromParent));
  else undoPage = [...fromList];

  const sameParent = (fromParent?.id ?? null) === targetParentId;

  if (!sameParent && toParent && isParent(toParent)) undoUpsert.push(cloneNode(toParent));
  if (!sameParent && !toParent) undoPage = undoPage ?? [...activePage(doc).children];

  const workingFrom = [...fromList];
  workingFrom.splice(fromIndex, 1);

  if (sameParent) {
    const clamped = Math.max(0, Math.min(index, workingFrom.length));
    workingFrom.splice(clamped, 0, id);
    if (fromParent) {
      const after = cloneNode(fromParent);
      after.children = workingFrom;
      redoUpsert.push(after);
    } else {
      redoPage = workingFrom;
    }
  } else {
    const dest = [...(toParent && isParent(toParent) ? toParent.children : activePage(doc).children)];
    const clamped = Math.max(0, Math.min(index, dest.length));
    dest.splice(clamped, 0, id);
    const moved = cloneNode(node);
    moved.parentId = targetParentId;
    redoUpsert.push(moved);
    if (fromParent) {
      const afterFrom = cloneNode(fromParent);
      afterFrom.children = workingFrom;
      redoUpsert.push(afterFrom);
    } else {
      redoPage = workingFrom;
    }
    if (toParent && isParent(toParent)) {
      const afterTo = cloneNode(toParent);
      afterTo.children = dest;
      redoUpsert.push(afterTo);
    } else {
      redoPage = dest;
    }
  }

  const redo: Patch = { nodesUpsert: redoUpsert };
  const undo: Patch = { nodesUpsert: undoUpsert };
  if (redoPage) redo.pageChildren = { pageId: activePage(doc).id, children: redoPage };
  if (undoPage) undo.pageChildren = { pageId: activePage(doc).id, children: undoPage };
  return { label: "Reorder", redo, undo };
}

export function cmdGroup(doc: Document, ids: NodeId[], group: ParentNode): Command | null {
  const roots = topLevelSelection(doc, ids);
  if (roots.length === 0) return null;
  const first = requireNode(doc, roots[0] ?? ids[0]!);
  const parent = parentOf(doc, first);
  const siblings = parent ? [...parent.children] : [...activePage(doc).children];
  const indexes = roots.map((id) => siblings.indexOf(id)).filter((i) => i >= 0);
  const insertAt = indexes.length ? Math.min(...indexes) : siblings.length;
  const without = siblings.filter((id) => !roots.includes(id));
  without.splice(insertAt, 0, group.id);

  const moved = roots.map((id) => {
    const n = cloneNode(requireNode(doc, id));
    n.parentId = group.id;
    return n;
  });
  group.children = roots;
  group.parentId = parent?.id ?? null;

  const redo: Patch = { nodesUpsert: [group, ...moved] };
  const undo: Patch = {
    nodesRemove: [group.id],
    nodesUpsert: roots.map((id) => cloneNode(requireNode(doc, id))),
  };

  if (parent) {
    const after = cloneNode(parent);
    after.children = without;
    redo.nodesUpsert = [...(redo.nodesUpsert ?? []), after];
    undo.nodesUpsert = [...(undo.nodesUpsert ?? []), cloneNode(parent)];
  } else {
    redo.pageChildren = { pageId: activePage(doc).id, children: without };
    undo.pageChildren = { pageId: activePage(doc).id, children: siblings };
  }
  return { label: "Group", redo, undo };
}

export function cmdUngroup(doc: Document, groupId: NodeId): Command | null {
  const group = doc.nodes[groupId];
  if (!group || !isParent(group)) return null;
  const parent = parentOf(doc, group);
  const siblings = parent ? [...parent.children] : [...activePage(doc).children];
  const at = siblings.indexOf(groupId);
  if (at < 0) return null;
  const nextSiblings = [...siblings.slice(0, at), ...group.children, ...siblings.slice(at + 1)];
  const children = group.children.map((id) => {
    const n = cloneNode(requireNode(doc, id));
    n.parentId = parent?.id ?? null;
    n.x += group.x;
    n.y += group.y;
    n.rotation += group.rotation;
    return n;
  });

  const redo: Patch = { nodesRemove: [groupId], nodesUpsert: children };
  const undo: Patch = { nodesUpsert: [cloneNode(group), ...group.children.map((id) => cloneNode(requireNode(doc, id)))] };

  if (parent) {
    const after = cloneNode(parent);
    after.children = nextSiblings;
    redo.nodesUpsert = [...(redo.nodesUpsert ?? []), after];
    undo.nodesUpsert = [...(undo.nodesUpsert ?? []), cloneNode(parent)];
  } else {
    redo.pageChildren = { pageId: activePage(doc).id, children: nextSiblings };
    undo.pageChildren = { pageId: activePage(doc).id, children: siblings };
  }
  return { label: "Ungroup", redo, undo };
}

export function cmdDuplicate(doc: Document, ids: NodeId[], offset = 16): Command | null {
  const roots = topLevelSelection(doc, ids);
  if (roots.length === 0) return null;
  const created: SceneNode[] = [];
  const idMap = new Map<NodeId, NodeId>();
  const makeId = () => nid();
  for (const id of roots) {
    const { root, extras } = deepCloneSubtree(doc, id, idMap, makeId);
    root.x += offset;
    root.y += offset;
    created.push(root, ...extras);
  }
  const first = requireNode(doc, roots[0]!);
  const parent = parentOf(doc, first);
  const siblings = parent ? [...parent.children] : [...activePage(doc).children];
  const lastIndex = Math.max(...roots.map((id) => siblings.indexOf(id)));
  const newRootIds = roots.map((id) => idMap.get(id)).filter((id): id is NodeId => Boolean(id));
  const nextSiblings = [...siblings];
  nextSiblings.splice(lastIndex + 1, 0, ...newRootIds);

  const redo: Patch = { nodesUpsert: created };
  const undo: Patch = { nodesRemove: created.map((n) => n.id) };
  if (parent) {
    const after = cloneNode(parent);
    after.children = nextSiblings;
    redo.nodesUpsert = [...created, after];
    undo.nodesUpsert = [cloneNode(parent)];
  } else {
    redo.pageChildren = { pageId: activePage(doc).id, children: nextSiblings };
    undo.pageChildren = { pageId: activePage(doc).id, children: siblings };
  }
  return { label: "Duplicate", redo, undo };
}

export function cmdBringForward(doc: Document, ids: NodeId[]): Command | null {
  return shiftOrder(doc, ids, 1, "Bring forward");
}

export function cmdSendBackward(doc: Document, ids: NodeId[]): Command | null {
  return shiftOrder(doc, ids, -1, "Send backward");
}

export function cmdBringToFront(doc: Document, ids: NodeId[]): Command | null {
  return shiftOrder(doc, ids, Infinity, "Bring to front");
}

export function cmdSendToBack(doc: Document, ids: NodeId[]): Command | null {
  return shiftOrder(doc, ids, -Infinity, "Send to back");
}

function shiftOrder(doc: Document, ids: NodeId[], delta: number, label: string): Command | null {
  const roots = topLevelSelection(doc, ids);
  if (roots.length === 0) return null;
  const first = requireNode(doc, roots[0]!);
  const parent = parentOf(doc, first);
  const siblings = parent ? [...parent.children] : [...activePage(doc).children];
  const set = new Set(roots);
  const selected = siblings.filter((id) => set.has(id));
  const rest = siblings.filter((id) => !set.has(id));
  if (selected.length === 0) return null;

  let next: NodeId[];
  if (!Number.isFinite(delta)) {
    next = delta > 0 ? [...rest, ...selected] : [...selected, ...rest];
  } else {
    const min = Math.min(...selected.map((id) => siblings.indexOf(id)));
    const insert = Math.max(0, Math.min(rest.length, min + delta));
    next = [...rest.slice(0, insert), ...selected, ...rest.slice(insert)];
  }

  if (next.join() === siblings.join()) return null;
  if (parent) {
    const after = cloneNode(parent);
    after.children = next;
    return {
      label,
      redo: { nodesUpsert: [after] },
      undo: { nodesUpsert: [cloneNode(parent)] },
    };
  }
  return {
    label,
    redo: pageChildrenPatch(doc, next),
    undo: pageChildrenPatch(doc, siblings),
  };
}

export function cmdAlign(
  doc: Document,
  ids: NodeId[],
  mode:
    | "left"
    | "center"
    | "right"
    | "top"
    | "middle"
    | "bottom"
    | "distribute-x"
    | "distribute-y",
): Command | null {
  const roots = topLevelSelection(doc, ids);
  if (roots.length < 2) return null;
  const boxes = roots.map((id) => {
    const n = requireNode(doc, id);
    return { id, n, x: n.x, y: n.y, w: n.width, h: n.height };
  });
  const minX = Math.min(...boxes.map((b) => b.x));
  const maxX = Math.max(...boxes.map((b) => b.x + b.w));
  const minY = Math.min(...boxes.map((b) => b.y));
  const maxY = Math.max(...boxes.map((b) => b.y + b.h));
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const next: SceneNode[] = [];
  if (mode === "distribute-x" || mode === "distribute-y") {
    const sorted = [...boxes].sort((a, b) => (mode === "distribute-x" ? a.x - b.x : a.y - b.y));
    const firstB = sorted[0];
    const lastB = sorted[sorted.length - 1];
    if (!firstB || !lastB) return null;
    const total = sorted.reduce((s, b) => s + (mode === "distribute-x" ? b.w : b.h), 0);
    const span = mode === "distribute-x" ? lastB.x + lastB.w - firstB.x : lastB.y + lastB.h - firstB.y;
    const gap = (span - total) / (sorted.length - 1);
    let cursor = mode === "distribute-x" ? firstB.x : firstB.y;
    for (const b of sorted) {
      const c = cloneNode(b.n);
      if (mode === "distribute-x") c.x = cursor;
      else c.y = cursor;
      next.push(c);
      cursor += (mode === "distribute-x" ? b.w : b.h) + gap;
    }
  } else {
    for (const b of boxes) {
      const c = cloneNode(b.n);
      if (mode === "left") c.x = minX;
      if (mode === "center") c.x = cx - b.w / 2;
      if (mode === "right") c.x = maxX - b.w;
      if (mode === "top") c.y = minY;
      if (mode === "middle") c.y = cy - b.h / 2;
      if (mode === "bottom") c.y = maxY - b.h;
      next.push(c);
    }
  }
  return cmdUpdateNodes(doc, next, "Align");
}

export function cmdToggleVisible(doc: Document, ids: NodeId[]): Command | null {
  return cmdSetProps(doc, ids, (n) => {
    n.visible = !n.visible;
  }, "Toggle visibility");
}

export function cmdToggleLocked(doc: Document, ids: NodeId[]): Command | null {
  return cmdSetProps(doc, ids, (n) => {
    n.locked = !n.locked;
  }, "Toggle lock");
}

export function cmdRename(doc: Document, id: NodeId, name: string): Command | null {
  return cmdSetProps(doc, [id], (n) => {
    n.name = name;
  }, "Rename");
}

export function cmdAddPage(doc: Document, page: Page): Command {
  return {
    label: "Add page",
    redo: { pages: [...doc.pages, page], activePageId: page.id },
    undo: { pages: doc.pages.map((p) => ({ ...p, children: [...p.children] })), activePageId: doc.activePageId },
  };
}

export function cmdSwitchPage(doc: Document, pageId: PageId): Command | null {
  if (pageId === doc.activePageId) return null;
  return {
    label: "Switch page",
    redo: { activePageId: pageId },
    undo: { activePageId: doc.activePageId },
  };
}

export function cmdSetComments(doc: Document, comments: CommentThread[]): Command {
  return {
    label: "Comment",
    redo: { comments: comments.map((c) => structuredClone(c)) },
    undo: { comments: doc.comments.map((c) => structuredClone(c)) },
  };
}

export function cmdSetLinks(doc: Document, links: PrototypeLink[]): Command {
  return {
    label: "Prototype link",
    redo: { prototypeLinks: links.map((l) => structuredClone(l)) },
    undo: { prototypeLinks: doc.prototypeLinks.map((l) => structuredClone(l)) },
  };
}

export function cmdSetColorStyles(doc: Document, styles: ColorStyle[]): Command {
  return {
    label: "Color styles",
    redo: { colorStyles: styles.map((s) => structuredClone(s)) },
    undo: { colorStyles: doc.colorStyles.map((s) => structuredClone(s)) },
  };
}

export function cmdSetTextStyles(doc: Document, styles: TextStyle[]): Command {
  return {
    label: "Text styles",
    redo: { textStyles: styles.map((s) => structuredClone(s)) },
    undo: { textStyles: doc.textStyles.map((s) => structuredClone(s)) },
  };
}

export function cmdSetName(doc: Document, name: string): Command {
  return {
    label: "Rename file",
    redo: { name },
    undo: { name: doc.name },
  };
}

export { childIds, ancestors };
