import { booleanPolygons, polygonAABB, type BooleanOp } from "./boolean";
import {
  applyPatch,
  cmdAddPage,
  cmdAlign,
  cmdBringForward,
  cmdBringToFront,
  cmdDelete,
  cmdDuplicate,
  cmdGroup,
  cmdInsertNodes,
  cmdRename,
  cmdReorder,
  cmdSendBackward,
  cmdSendToBack,
  cmdSetColorStyles,
  cmdSetComments,
  cmdSetLinks,
  cmdSetName,
  cmdSetProps,
  cmdToggleLocked,
  cmdToggleVisible,
  cmdUngroup,
  cmdUpdateNodes,
  emptyHistory,
  pushHistory,
  type Command,
  type History,
} from "./commands";
import { BLACK, cloneColor, rgb } from "./color";
import { createBlankDocument } from "./demo-document";
import {
  createEllipse,
  createFrame,
  createGroup,
  createImage,
  createLine,
  createPage,
  createPath,
  createPolygon,
  createRectangle,
  createStar,
  createText,
  defaultPoint,
  uniformCorners,
} from "./factories";
import { apply, nodeLocalMatrix } from "./geometry";
import { nid } from "./ids";
import {
  checkpoint,
  deleteDocument,
  duplicateDocument,
  loadIndex,
  loadLastOrDemo,
  loadVersions,
  newUntitled,
  parseDocument,
  restoreVersion,
  saveDocument,
  serializeDocument,
  type VersionSnapshot,
} from "./persistence";
import {
  activePage,
  allNodeIds,
  selectionAABB,
  shapePolygon,
  topLevelSelection,
  worldAABB,
} from "./scene";
import { SpatialIndex } from "./spatial-index";
import type {
  AABB,
  Camera,
  Color,
  Document,
  DocumentMeta,
  Guide,
  NodeId,
  PageId,
  PathPoint,
  SceneNode,
  Tool,
  Vec2,
} from "./types";

export interface UiState {
  leftOpen: boolean;
  rightOpen: boolean;
  rulers: boolean;
  grid: boolean;
  helpOpen: boolean;
  paletteOpen: boolean;
  playMode: boolean;
  playFrameId: NodeId | null;
  contextMenu: { x: number; y: number } | null;
  layerQuery: string;
  renamingId: NodeId | null;
}

export interface EditorState {
  document: Document;
  history: History;
  selection: NodeId[];
  hoveredId: NodeId | null;
  tool: Tool;
  camera: Camera;
  preview: Record<NodeId, SceneNode> | null;
  guides: Guide[];
  marquee: AABB | null;
  lasso: Vec2[] | null;
  editingTextId: NodeId | null;
  penDraft: PathPoint[] | null;
  prototypeFrom: NodeId | null;
  ui: UiState;
  recentColors: Color[];
  documents: DocumentMeta[];
  status: string;
  revision: number;
}

type Listener = () => void;
const listeners = new Set<Listener>();

function defaultUi(): UiState {
  return {
    leftOpen: true,
    rightOpen: true,
    rulers: true,
    grid: true,
    helpOpen: false,
    paletteOpen: false,
    playMode: false,
    playFrameId: null,
    contextMenu: null,
    layerQuery: "",
    renamingId: null,
  };
}

let lastSaved = "";
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let versionTimer: ReturnType<typeof setTimeout> | null = null;
const spatial = new SpatialIndex(256);

function rebuildSpatial(doc: Document): void {
  spatial.clear();
  for (const id of allNodeIds(doc)) spatial.insert(id, worldAABB(doc, id));
}

function initialFrom(document: Document, keepColors?: Color[]): EditorState {
  lastSaved = serializeDocument(document);
  return {
    document,
    history: emptyHistory(),
    selection: [],
    hoveredId: null,
    tool: "select",
    camera: { x: 720, y: 480, zoom: 0.55 },
    preview: null,
    guides: [],
    marquee: null,
    lasso: null,
    editingTextId: null,
    penDraft: null,
    prototypeFrom: null,
    ui: defaultUi(),
    recentColors: keepColors ?? [rgb(36, 48, 64), rgb(201, 132, 76), rgb(246, 245, 242), BLACK],
    documents: loadIndex(),
    status: "Ready",
    revision: 1,
  };
}

let state: EditorState = initialFrom(loadLastOrDemo());
rebuildSpatial(state.document);

function emit(): void {
  state = { ...state, revision: state.revision + 1 };
  for (const l of listeners) l();
  scheduleSave();
}

function scheduleSave(): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const json = serializeDocument(state.document);
    if (json === lastSaved) return;
    lastSaved = json;
    saveDocument(state.document);
    state = { ...state, documents: loadIndex() };
    for (const l of listeners) l();
  }, 400);
  if (versionTimer) clearTimeout(versionTimer);
  versionTimer = setTimeout(() => checkpoint(state.document), 12_000);
}

export function getState(): EditorState {
  return state;
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function viewDocument(): Document {
  if (!state.preview) return state.document;
  const nodes = { ...state.document.nodes };
  for (const n of Object.values(state.preview)) nodes[n.id] = n;
  return { ...state.document, nodes };
}

export function getSpatial(): SpatialIndex {
  return spatial;
}

export function dispatch(command: Command | null): void {
  if (!command) return;
  const document = applyPatch(state.document, command.redo);
  rebuildSpatial(document);
  state = {
    ...state,
    document,
    history: pushHistory(state.history, command),
    preview: null,
    status: command.label,
  };
  emit();
}

export function undo(): void {
  const cmd = state.history.past[state.history.past.length - 1];
  if (!cmd) return;
  const document = applyPatch(state.document, cmd.undo);
  rebuildSpatial(document);
  state = {
    ...state,
    document,
    history: { past: state.history.past.slice(0, -1), future: [cmd, ...state.history.future] },
    status: `Undo ${cmd.label}`,
  };
  emit();
}

export function redo(): void {
  const cmd = state.history.future[0];
  if (!cmd) return;
  const document = applyPatch(state.document, cmd.redo);
  rebuildSpatial(document);
  state = {
    ...state,
    document,
    history: { past: [...state.history.past, cmd], future: state.history.future.slice(1) },
    status: `Redo ${cmd.label}`,
  };
  emit();
}

export function setSelection(ids: NodeId[], additive = false): void {
  const toggle = additive && ids.length === 1 && state.selection.includes(ids[0]!);
  const next = toggle
    ? state.selection.filter((id) => id !== ids[0])
    : additive
      ? Array.from(new Set([...state.selection, ...ids]))
      : ids;
  state = { ...state, selection: next, ui: { ...state.ui, contextMenu: null } };
  emit();
}

export function setHovered(id: NodeId | null): void {
  if (state.hoveredId === id) return;
  state = { ...state, hoveredId: id };
  emit();
}

export function setTool(tool: Tool): void {
  state = {
    ...state,
    tool,
    penDraft: tool === "pen" ? state.penDraft : null,
    prototypeFrom: tool === "prototype" ? state.prototypeFrom : null,
    status: tool,
  };
  emit();
}

export function setCamera(camera: Camera): void {
  state = { ...state, camera };
  emit();
}

export function setCameraLive(camera: Camera): void {
  state = { ...state, camera };
}

export function setPreview(nodes: Record<NodeId, SceneNode> | null, guides: Guide[] = []): void {
  state = { ...state, preview: nodes, guides };
  emit();
}

/** Pointer-frequency updates: skip React subscribers, canvas rAF reads getState(). */
export function setPreviewLive(nodes: Record<NodeId, SceneNode> | null, guides: Guide[] = []): void {
  state = { ...state, preview: nodes, guides };
}

export function commitPreview(label: string): void {
  if (!state.preview) {
    state = { ...state, guides: [] };
    emit();
    return;
  }
  const next = Object.values(state.preview);
  const cmd = cmdUpdateNodes(state.document, next, label);
  state = { ...state, preview: null, guides: [] };
  dispatch(cmd);
}

export function setMarquee(aabb: AABB | null): void {
  state = { ...state, marquee: aabb };
  emit();
}

export function setMarqueeLive(aabb: AABB | null): void {
  state = { ...state, marquee: aabb };
}

export function setLasso(pts: Vec2[] | null): void {
  state = { ...state, lasso: pts };
  emit();
}

export function setEditingText(id: NodeId | null): void {
  state = { ...state, editingTextId: id };
  emit();
}

export function patchUi(partial: Partial<UiState>): void {
  state = { ...state, ui: { ...state.ui, ...partial } };
  emit();
}

export function setStatus(status: string): void {
  state = { ...state, status };
  emit();
}

export function rememberColor(c: Color): void {
  const next = [cloneColor(c), ...state.recentColors.filter((x) => x.r !== c.r || x.g !== c.g || x.b !== c.b)].slice(
    0,
    16,
  );
  state = { ...state, recentColors: next };
  emit();
}

export function insertNode(node: SceneNode, parentId: NodeId | null = null): void {
  dispatch(cmdInsertNodes(state.document, [node], parentId));
  setSelection([node.id]);
}

export function insertMany(nodes: SceneNode[], parentId: NodeId | null = null): void {
  dispatch(cmdInsertNodes(state.document, nodes, parentId));
  setSelection(nodes.filter((n) => n.parentId === parentId).map((n) => n.id));
}

export function deleteSelection(): void {
  const cmd = cmdDelete(state.document, state.selection);
  if (!cmd) return;
  state = { ...state, selection: [] };
  dispatch(cmd);
}

export function duplicateSelection(): void {
  dispatch(cmdDuplicate(state.document, state.selection));
}

export function groupSelection(): void {
  const ids = topLevelSelection(state.document, state.selection);
  if (ids.length < 2) return;
  const aabb = selectionAABB(state.document, ids);
  if (!aabb) return;
  const first = state.document.nodes[ids[0]!];
  const group = createGroup({
    name: "Group",
    x: aabb.minX,
    y: aabb.minY,
    width: aabb.maxX - aabb.minX,
    height: aabb.maxY - aabb.minY,
    parentId: first?.parentId ?? null,
  });
  const cmd = cmdGroup(state.document, ids, group);
  if (!cmd) return;
  const shifted = ids.map((id) => {
    const n = structuredClone(state.document.nodes[id]!);
    n.x -= group.x;
    n.y -= group.y;
    n.parentId = group.id;
    return n;
  });
  cmd.redo.nodesUpsert = [...(cmd.redo.nodesUpsert ?? []), ...shifted];
  dispatch(cmd);
  setSelection([group.id]);
}

export function ungroupSelection(): void {
  for (const id of [...state.selection]) {
    const n = state.document.nodes[id];
    if (n?.type === "group") {
      const children = [...n.children];
      dispatch(cmdUngroup(state.document, id));
      setSelection(children);
    }
  }
}

export function updateSelected(mutate: (n: SceneNode) => void, label = "Edit"): void {
  dispatch(cmdSetProps(state.document, state.selection, mutate, label));
}

export function renameNode(id: NodeId, name: string): void {
  dispatch(cmdRename(state.document, id, name));
}

export function reorderNode(id: NodeId, parentId: NodeId | null, index: number): void {
  dispatch(cmdReorder(state.document, id, parentId, index));
}

export function toggleVisible(ids: NodeId[]): void {
  dispatch(cmdToggleVisible(state.document, ids));
}

export function toggleLocked(ids: NodeId[]): void {
  dispatch(cmdToggleLocked(state.document, ids));
}

export function align(mode: Parameters<typeof cmdAlign>[2]): void {
  dispatch(cmdAlign(state.document, state.selection, mode));
}

export function stack(kind: "forward" | "backward" | "front" | "back"): void {
  const fn =
    kind === "forward"
      ? cmdBringForward
      : kind === "backward"
        ? cmdSendBackward
        : kind === "front"
          ? cmdBringToFront
          : cmdSendToBack;
  dispatch(fn(state.document, state.selection));
}

export function addPage(): void {
  dispatch(cmdAddPage(state.document, createPage(`Page ${state.document.pages.length + 1}`)));
}

export function switchPage(id: PageId): void {
  if (id === state.document.activePageId) return;
  state = { ...state, document: { ...state.document, activePageId: id }, selection: [], history: emptyHistory() };
  rebuildSpatial(state.document);
  emit();
}

export function createShape(
  tool: "frame" | "rectangle" | "ellipse" | "line" | "polygon" | "star" | "text",
  x: number,
  y: number,
  w: number,
  h: number,
  parentId: NodeId | null = null,
): SceneNode {
  const box = { x, y, width: Math.max(1, w), height: Math.max(1, h), parentId };
  switch (tool) {
    case "frame":
      return createFrame({ name: "Frame", ...box });
    case "rectangle":
      return createRectangle({ name: "Rectangle", ...box });
    case "ellipse":
      return createEllipse({ name: "Ellipse", ...box });
    case "line":
      return createLine({ name: "Line", ...box, height: 0 });
    case "polygon":
      return createPolygon({ name: "Polygon", ...box });
    case "star":
      return createStar({ name: "Star", ...box });
    case "text":
      return createText({ name: "Text", ...box, height: Math.max(24, h) });
  }
}

export function addImage(src: string, x: number, y: number, w: number, h: number): void {
  insertNode(createImage({ name: "Image", src, x, y, width: w, height: h }));
}

export function addComment(x: number, y: number, body: string): void {
  dispatch(
    cmdSetComments(state.document, [
      ...state.document.comments,
      {
        id: nid("c"),
        x,
        y,
        resolved: false,
        messages: [{ id: nid("m"), author: "You", body, createdAt: Date.now() }],
      },
    ]),
  );
}

export function setPenDraft(points: PathPoint[] | null): void {
  state = { ...state, penDraft: points };
  emit();
}

export function commitPen(closed: boolean): void {
  const pts = state.penDraft;
  if (!pts || pts.length < 2) {
    state = { ...state, penDraft: null };
    emit();
    return;
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const node = createPath({
    name: "Path",
    x: minX,
    y: minY,
    width: Math.max(1, Math.max(...xs) - minX),
    height: Math.max(1, Math.max(...ys) - minY),
    points: pts.map((p) => ({ ...p, x: p.x - minX, y: p.y - minY })),
    closed,
  });
  state = { ...state, penDraft: null, tool: "select" };
  insertNode(node);
}

export function setPrototypeFrom(id: NodeId | null): void {
  state = { ...state, prototypeFrom: id };
  emit();
}

export function addPrototypeLink(fromId: NodeId, toId: NodeId): void {
  const links = state.document.prototypeLinks.filter((l) => l.fromId !== fromId);
  links.push({ id: nid("link"), fromId, toId, animation: "dissolve" });
  dispatch(cmdSetLinks(state.document, links));
  state = { ...state, prototypeFrom: null, tool: "select" };
  emit();
}

export function booleanSelection(op: BooleanOp): void {
  const ids = topLevelSelection(state.document, state.selection);
  if (ids.length !== 2) {
    setStatus("Boolean needs exactly two shapes");
    return;
  }
  const a = state.document.nodes[ids[0]!];
  const b = state.document.nodes[ids[1]!];
  if (!a || !b) return;
  const polyA = shapePolygon(a).map((p) => apply(nodeLocalMatrix(a), p));
  const polyB = shapePolygon(b).map((p) => apply(nodeLocalMatrix(b), p));
  const result = booleanPolygons(polyA, polyB, op);
  if (result.length === 0) {
    setStatus("Boolean produced an empty shape");
    return;
  }
  const created = result.map((poly) => {
    const box = polygonAABB(poly);
    return createPath({
      name: op,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      closed: true,
      points: poly.map((p) => defaultPoint(p.x - box.x, p.y - box.y)),
      fills: a.fills.length ? a.fills.map((f) => structuredClone(f)) : b.fills.map((f) => structuredClone(f)),
    });
  });
  dispatch(cmdDelete(state.document, ids));
  insertMany(created);
}

export function makeComponent(): void {
  const ids = topLevelSelection(state.document, state.selection);
  const first = ids[0] ? state.document.nodes[ids[0]] : undefined;
  if (ids.length === 1 && first && (first.type === "frame" || first.type === "group")) {
    const next = structuredClone(first);
    (next as { type: string }).type = "component";
    next.name = `Component / ${first.name}`;
    dispatch(cmdUpdateNodes(state.document, [next], "Create component"));
    return;
  }
  if (ids.length >= 2) groupSelection();
}

export function newFile(): void {
  const document = newUntitled();
  state = initialFrom(document, state.recentColors);
  rebuildSpatial(document);
  emit();
}

export function openFile(id: string): void {
  const raw = localStorage.getItem(`cursor-grok-46:doc:${id}`);
  const document = raw ? parseDocument(raw) : null;
  if (!document) return;
  state = initialFrom(document, state.recentColors);
  rebuildSpatial(document);
  emit();
}

export function duplicateFile(): void {
  const document = duplicateDocument(state.document);
  state = initialFrom(document, state.recentColors);
  rebuildSpatial(document);
  emit();
}

export function removeFile(id: string): void {
  deleteDocument(id);
  if (state.document.id === id) {
    const document = loadLastOrDemo();
    state = initialFrom(document, state.recentColors);
    rebuildSpatial(document);
  } else {
    state = { ...state, documents: loadIndex() };
  }
  emit();
}

export function renameFile(name: string): void {
  dispatch(cmdSetName(state.document, name));
}

export function importJson(raw: string): boolean {
  const document = parseDocument(raw);
  if (!document) return false;
  document.id = nid("doc");
  saveDocument(document);
  state = initialFrom(document, state.recentColors);
  rebuildSpatial(document);
  emit();
  return true;
}

export function restoreCheckpoint(snap: VersionSnapshot): void {
  const document = restoreVersion(snap);
  if (!document) return;
  state = initialFrom(document, state.recentColors);
  rebuildSpatial(document);
  emit();
}

export function listVersions(): VersionSnapshot[] {
  return loadVersions(state.document.id);
}

export function seedStress(count = 1000): void {
  const nodes: SceneNode[] = [];
  for (let i = 0; i < count; i++) {
    const col = i % 40;
    const row = Math.floor(i / 40);
    nodes.push(
      createRectangle({
        name: `R${i}`,
        x: 2000 + col * 28,
        y: 80 + row * 28,
        width: 22,
        height: 22,
        fills: [{ type: "solid", color: { r: (col % 8) / 8, g: (row % 8) / 8, b: 0.55, a: 1 }, opacity: 1 }],
        cornerRadius: uniformCorners(4),
      }),
    );
  }
  insertMany(nodes);
}

export function addColorStyle(name: string, color: Color): void {
  dispatch(
    cmdSetColorStyles(state.document, [
      ...state.document.colorStyles,
      { id: nid("style"), name, paint: { type: "solid", color: cloneColor(color), opacity: 1 } },
    ]),
  );
}

export function selectedNodes(): SceneNode[] {
  const doc = viewDocument();
  return state.selection.map((id) => doc.nodes[id]).filter((n): n is SceneNode => n !== undefined);
}

export { activePage, createBlankDocument };
