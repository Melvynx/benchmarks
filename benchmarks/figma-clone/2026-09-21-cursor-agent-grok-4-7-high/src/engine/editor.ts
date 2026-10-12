import { booleanVector, type BoolOp } from "./boolean/boolean";
import { resolveLayout, type Geom } from "./layout/layout";
import { measureText } from "./text/measure";
import {
  addNode,
  cloneTree,
  deleteSubtree,
  duplicateSelection,
  groupNodes,
  moveZ,
  reflowGroups,
  reparent,
  syncInstances,
  topmost,
  ungroupNode,
} from "./commands/actions";
import { History, type Command } from "./commands/history";
import { applyMeta, applyNodeDiff, Mutation, type MetaDiff, type NodeDiff } from "./commands/mutation";
import { bytesToBase64, base64ToBytes, DocumentSync } from "./collab/sync";
import { aabbOfBox, inflate, unionAabb, type AABB } from "./geometry/bounds";
import { flatten, hitLocal, polygonLocal, starLocal } from "./geometry/hit";
import {
  apply,
  decompose,
  IDENTITY,
  invert,
  localMatrix,
  mul,
  worldVectorToParent,
  type Matrix,
  type Vec,
} from "./geometry/matrix";
import { Quadtree } from "./spatial/quadtree";
import { createDocument, createPage, createRectangle, solidFill, rgba } from "./scene/factory";
import type { RGBA } from "./types";
import { createId } from "./ids";
import type {
  Camera,
  DesignDocument,
  FrameNode,
  GeometricNode,
  NodeId,
  Page,
  SceneNode,
  ToolId,
} from "./types";
import { isFrameLike, isGeometric } from "./types";
import type { SnapLine } from "./snap/snap";

export type EmitLevel = "render" | "chrome" | "structure";

export type Ephemeral = {
  marquee: AABB | null;
  marqueeMode: "contain" | "intersect";
  snapLines: SnapLine[];
  draft: Geom | null;
  draftParent: NodeId | null;
  draftShape: string | null;
  pen: { points: { x: number; y: number }[]; cursor: Vec | null; closed: boolean } | null;
  sizeLabel: string | null;
  hoverId: NodeId | null;
  cursor: string;
  peers: { id: number; x: number; y: number }[];
};

export type Toast = { id: string; message: string };
export type VersionSnap = { id: string; label: string; at: number; doc: DesignDocument };

const STORAGE_KEY = "grok47.design.v1";
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 64;

type Envelope = {
  activeId: string;
  index: { id: string; name: string }[];
  docs: Record<string, string>;
};

export class Editor {
  doc: DesignDocument;
  selection: NodeId[] = [];
  tool: ToolId = "select";
  camera: Camera;
  viewport = { width: 1200, height: 800 };
  dpr = 1;
  spaceDown = false;
  editingTextId: NodeId | null = null;
  vectorEditId: NodeId | null = null;
  ephemeral: Ephemeral = emptyEphemeral();
  toasts: Toast[] = [];
  versions: VersionSnap[] = [];
  showShortcuts = false;
  showVersions = false;
  contextMenu: { x: number; y: number } | null = null;
  playFrameId: NodeId | null = null;
  fps = 0;
  objectCount = 0;
  geom = new Map<NodeId, Geom>();
  world = new Map<NodeId, Matrix>();
  aabb = new Map<NodeId, AABB>();
  subtree = new Map<NodeId, AABB>();
  order: NodeId[] = [];
  private orderIndex = new Map<NodeId, number>();
  private spatial = new Quadtree();
  private history = new History(200);
  private draft: Mutation | null = null;
  private sync: DocumentSync;
  private saveTimer = 0;
  private remoteQueued = false;
  private clipboard: { roots: NodeId[]; nodes: SceneNode[] } | null = null;
  private lastDuplicate = { x: 16, y: 16 };
  private structureV = 0;
  private chromeV = 0;
  private structureListeners = new Set<() => void>();
  private chromeListeners = new Set<() => void>();
  private renderListeners = new Set<() => void>();
  private applyingRemote = false;

  constructor() {
    this.sync = new DocumentSync(() => this.pullRemote());
    const saved = readEnvelope();
    const bytes = saved ? saved.docs[saved.activeId] : undefined;
    const hydrated = bytes ? this.sync.load(base64ToBytes(bytes)) : null;
    if (hydrated) this.doc = hydrated;
    else {
      this.doc = createDocument();
      this.sync.seed(this.doc);
    }
    this.camera = { ...this.page().camera };
    this.rebuild();
    this.sync.connect(this.doc.id);
    this.sync.onCursor((msg) => {
      const peers = this.ephemeral.peers.filter((peer) => peer.id !== msg.from);
      peers.push({ id: msg.from, x: msg.x, y: msg.y });
      this.ephemeral = { ...this.ephemeral, peers };
      this.emitRender();
    });
  }

  page(): Page {
    return this.doc.pages.find((page) => page.id === this.doc.currentPageId) ?? this.doc.pages[0]!;
  }

  node(id: NodeId): SceneNode | null {
    return this.page().nodes[id] ?? null;
  }

  geomOf(id: NodeId): Geom | null {
    return this.geom.get(id) ?? null;
  }

  parentWorld(id: NodeId): Matrix {
    const parentId = this.node(id)?.parentId;
    if (!parentId) return IDENTITY;
    const parent = this.node(parentId);
    if (!parent || parent.type === "canvas") return IDENTITY;
    return this.world.get(parentId) ?? IDENTITY;
  }

  subscribeStructure = (fn: () => void): (() => void) => {
    this.structureListeners.add(fn);
    return () => this.structureListeners.delete(fn);
  };

  subscribeChrome = (fn: () => void): (() => void) => {
    this.chromeListeners.add(fn);
    return () => this.chromeListeners.delete(fn);
  };

  getStructureVersion = (): number => this.structureV;
  getChromeVersion = (): number => this.chromeV;

  onRender(fn: () => void): () => void {
    this.renderListeners.add(fn);
    return () => this.renderListeners.delete(fn);
  }

  requestRender(): void {
    this.emitRender();
  }

  touch(level: EmitLevel = "chrome"): void {
    this.bump(level);
  }

  setViewport(width: number, height: number, dpr: number): void {
    if (this.viewport.width === width && this.viewport.height === height && this.dpr === dpr) return;
    this.viewport = { width, height };
    this.dpr = dpr;
    this.emitRender();
  }

  setTool(tool: ToolId): void {
    this.tool = tool;
    this.ephemeral = { ...this.ephemeral, cursor: cursorForTool(tool) };
    this.bump("chrome");
  }

  setSelection(ids: NodeId[]): void {
    const page = this.page();
    this.selection = [...new Set(ids)].filter((id) => {
      const node = page.nodes[id];
      return !!node && node.type !== "canvas";
    });
    this.bump("structure");
  }

  screenToWorld(x: number, y: number): Vec {
    return { x: (x - this.camera.x) / this.camera.zoom, y: (y - this.camera.y) / this.camera.zoom };
  }

  worldToScreen(x: number, y: number): Vec {
    return { x: x * this.camera.zoom + this.camera.x, y: y * this.camera.zoom + this.camera.y };
  }

  zoomAt(sx: number, sy: number, next: number): void {
    const world = this.screenToWorld(sx, sy);
    this.camera.zoom = clamp(next, ZOOM_MIN, ZOOM_MAX);
    this.camera.x = sx - world.x * this.camera.zoom;
    this.camera.y = sy - world.y * this.camera.zoom;
    this.page().camera = { ...this.camera };
    this.bump("chrome");
  }

  zoomBy(factor: number): void {
    this.zoomAt(this.viewport.width / 2, this.viewport.height / 2, this.camera.zoom * factor);
  }

  zoom100(): void {
    this.zoomAt(this.viewport.width / 2, this.viewport.height / 2, 1);
  }

  zoomToFit(ids?: NodeId[]): void {
    const boxes = (ids?.length ? ids : this.order).map((id) => this.subtree.get(id) ?? this.aabb.get(id)).filter((box): box is AABB => !!box);
    const bounds = unionAabb(boxes);
    if (bounds.width < 1 && bounds.height < 1) {
      this.zoom100();
      return;
    }
    const pad = 80;
    const zoom = clamp(
      Math.min((this.viewport.width - pad) / Math.max(bounds.width, 1), (this.viewport.height - pad) / Math.max(bounds.height, 1)),
      ZOOM_MIN,
      ZOOM_MAX,
    );
    this.camera.zoom = zoom;
    this.camera.x = (this.viewport.width - bounds.width * zoom) / 2 - bounds.x * zoom;
    this.camera.y = (this.viewport.height - bounds.height * zoom) / 2 - bounds.y * zoom;
    this.page().camera = { ...this.camera };
    this.bump("chrome");
  }

  panBy(dx: number, dy: number): void {
    this.camera.x += dx;
    this.camera.y += dy;
    this.page().camera = { ...this.camera };
    this.emitRender();
  }

  hitDeep(world: Vec): NodeId | null {
    const pad = 4 / this.camera.zoom;
    const ids = this.spatial.queryPoint(world.x, world.y, pad);
    const sorted = ids.sort((a, b) => (this.orderIndex.get(b) ?? 0) - (this.orderIndex.get(a) ?? 0));
    for (const id of sorted) {
      if (!this.pointInNode(world, id, pad)) continue;
      if (!this.insideClips(id, world)) continue;
      return id;
    }
    return null;
  }

  selectionTarget(id: NodeId, deep: boolean): NodeId {
    if (deep) return id;
    let current = this.node(id);
    let boundary: NodeId | null = null;
    while (current?.parentId) {
      const parent = this.node(current.parentId);
      if (!parent) break;
      if (parent.type === "group") {
        boundary = parent.id;
        current = parent;
        continue;
      }
      break;
    }
    return boundary ?? id;
  }

  nodesInRect(rect: AABB, mode: "contain" | "intersect"): NodeId[] {
    const ids = this.spatial.query(rect);
    return ids.filter((id) => {
      const box = this.aabb.get(id);
      const node = this.node(id);
      if (!box || !node || !isGeometric(node) || node.locked) return false;
      if (mode === "contain") {
        return box.x >= rect.x && box.y >= rect.y && box.x + box.width <= rect.x + rect.width && box.y + box.height <= rect.y + rect.height;
      }
      return true;
    });
  }

  containerAt(world: Vec): NodeId {
    const hit = this.hitDeep(world);
    let current = hit ? this.node(hit) : null;
    while (current) {
      if (current.type === "frame" || current.type === "instance") return current.id;
      if (!current.parentId) break;
      current = this.node(current.parentId);
    }
    return this.page().rootId;
  }

  change(label: string, fn: (m: Mutation) => void, level: EmitLevel = "chrome"): void {
    if (this.draft) this.commitGesture(label, level);
    const mutation = new Mutation(this.doc, this.page().id);
    fn(mutation);
    this.finish(mutation, label, level);
  }

  beginGesture(): void {
    if (!this.draft) this.draft = new Mutation(this.doc, this.page().id);
  }

  gesture(fn: (m: Mutation) => void): void {
    if (!this.draft) this.draft = new Mutation(this.doc, this.page().id);
    else this.draft.restore();
    fn(this.draft);
    this.rebuild();
    this.bump("chrome");
  }

  commitGesture(label: string, level: EmitLevel = "chrome"): void {
    const mutation = this.draft;
    this.draft = null;
    if (!mutation || mutation.isEmpty()) {
      this.rebuild();
      this.flushRemote();
      return;
    }
    this.finish(mutation, label, level);
  }

  cancelGesture(): void {
    if (!this.draft) return;
    this.draft.restore();
    this.draft = null;
    this.ephemeral = { ...this.ephemeral, marquee: null, snapLines: [], draft: null, sizeLabel: null };
    this.rebuild();
    this.bump("chrome");
    this.flushRemote();
  }

  undo(): void {
    if (this.draft) this.cancelGesture();
    const command = this.history.undo();
    if (!command) return;
    this.afterHistory();
  }

  redo(): void {
    if (this.draft) this.cancelGesture();
    const command = this.history.redo();
    if (!command) return;
    this.afterHistory();
  }

  get canUndo(): boolean {
    return this.history.canUndo;
  }

  get canRedo(): boolean {
    return this.history.canRedo;
  }

  deleteSelection(): void {
    const ids = topmost(this.page().nodes, this.selection);
    if (!ids.length) return;
    this.change("Delete", (m) => {
      for (const id of ids) deleteSubtree(m, id);
    }, "structure");
    this.selection = [];
    this.bump("structure");
  }

  selectAll(): void {
    const root = this.page().rootId;
    this.setSelection(this.page().nodes[root]?.childIds.filter((id) => !this.node(id)?.locked) ?? []);
  }

  copy(): void {
    const roots = topmost(this.page().nodes, this.selection);
    const nodes: SceneNode[] = [];
    const walk = (id: NodeId) => {
      const node = this.node(id);
      if (!node) return;
      nodes.push(structuredClone(node));
      node.childIds.forEach(walk);
    };
    roots.forEach(walk);
    this.clipboard = { roots, nodes };
  }

  cut(): void {
    this.copy();
    this.deleteSelection();
  }

  paste(): void {
    if (!this.clipboard) return;
    const source: Record<NodeId, SceneNode> = {};
    for (const node of this.clipboard.nodes) source[node.id] = node;
    this.change("Paste", (m) => {
      const created = duplicateSelectionFrom(m, source, this.clipboard!.roots, this.lastDuplicate.x, this.lastDuplicate.y);
      this.selection = created;
    }, "structure");
  }

  duplicate(): void {
    const ids = topmost(this.page().nodes, this.selection);
    if (!ids.length) return;
    this.change("Duplicate", (m) => {
      const created = duplicateSelection(m, ids, this.lastDuplicate.x, this.lastDuplicate.y);
      this.selection = created;
    }, "structure");
  }

  group(): void {
    const ids = topmost(this.page().nodes, this.selection);
    if (ids.length < 2) return;
    const boxes = ids.map((id) => this.parentAabb(id)).filter((box): box is AABB => !!box);
    this.change("Group", (m) => {
      const id = groupNodes(m, ids, boxes);
      if (id) this.selection = [id];
    }, "structure");
  }

  ungroup(): void {
    const ids = [...this.selection];
    this.change("Ungroup", (m) => {
      const released: NodeId[] = [];
      for (const id of ids) released.push(...ungroupNode(m, id));
      this.selection = released;
    }, "structure");
  }

  arrange(direction: "forward" | "backward" | "front" | "back"): void {
    this.change("Reorder", (m) => moveZ(m, this.selection, direction), "structure");
  }

  nudge(dx: number, dy: number): void {
    if (!this.selection.length) return;
    this.change("Nudge", (m) => {
      for (const id of this.selection) {
        const delta = worldVectorToParent(this.parentWorld(id), dx, dy);
        m.update(id, (node) => {
          node.x += delta.x;
          node.y += delta.y;
        });
      }
      reflowGroups(m, this.selection);
    });
  }

  align(mode: "left" | "center" | "right" | "top" | "middle" | "bottom"): void {
    const ids = this.selection.filter((id) => this.sameParent(this.selection[0] ?? id, id));
    if (ids.length < 2) return;
    const boxes = ids.map((id) => ({ id, box: this.parentAabb(id) })).filter((item): item is { id: NodeId; box: AABB } => !!item.box);
    const union = unionAabb(boxes.map((item) => item.box));
    this.change("Align", (m) => {
      for (const item of boxes) {
        let dx = 0;
        let dy = 0;
        if (mode === "left") dx = union.x - item.box.x;
        if (mode === "right") dx = union.x + union.width - (item.box.x + item.box.width);
        if (mode === "center") dx = union.x + union.width / 2 - (item.box.x + item.box.width / 2);
        if (mode === "top") dy = union.y - item.box.y;
        if (mode === "bottom") dy = union.y + union.height - (item.box.y + item.box.height);
        if (mode === "middle") dy = union.y + union.height / 2 - (item.box.y + item.box.height / 2);
        m.update(item.id, (node) => {
          node.x += dx;
          node.y += dy;
        });
      }
      reflowGroups(m, ids);
    });
  }

  distribute(axis: "x" | "y"): void {
    const ids = [...this.selection];
    if (ids.length < 3) return;
    const items = ids
      .map((id) => ({ id, box: this.parentAabb(id) }))
      .filter((item): item is { id: NodeId; box: AABB } => !!item.box)
      .sort((a, b) => (axis === "x" ? a.box.x - b.box.x : a.box.y - b.box.y));
    if (items.length < 3) return;
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const span =
      axis === "x"
        ? last.box.x + last.box.width - first.box.x
        : last.box.y + last.box.height - first.box.y;
    const total = items.reduce((sum, item) => sum + (axis === "x" ? item.box.width : item.box.height), 0);
    const gap = (span - total) / (items.length - 1);
    let cursor = axis === "x" ? first.box.x : first.box.y;
    this.change("Distribute", (m) => {
      for (const item of items) {
        const delta = cursor - (axis === "x" ? item.box.x : item.box.y);
        m.update(item.id, (node) => {
          if (axis === "x") node.x += delta;
          else node.y += delta;
        });
        cursor += (axis === "x" ? item.box.width : item.box.height) + gap;
      }
      reflowGroups(m, ids);
    });
  }

  boolean(op: BoolOp): void {
    const items = this.selection
      .map((id) => {
        const node = this.node(id);
        const matrix = this.world.get(id);
        const geom = this.geomOf(id);
        if (!node || !isGeometric(node) || !matrix || !geom) return null;
        return { id, node, matrix, geom };
      })
      .filter((item): item is NonNullable<typeof item> => !!item);
    if (items.length < 2) return;
    const vector = booleanVector(items, op);
    if (!vector) {
      this.notify("Those layers don't form a boolean shape.");
      return;
    }
    const parentId = items[0]?.node.parentId ?? this.page().rootId;
    const parentWorld = parentId === this.page().rootId ? IDENTITY : (this.world.get(parentId) ?? IDENTITY);
    const world = localMatrix({ ...vector, rotation: 0 });
    const local = decompose(mul(invert(parentWorld) ?? IDENTITY, world), vector.width, vector.height);
    vector.x = local.x;
    vector.y = local.y;
    vector.rotation = local.rotation;
    this.change("Boolean", (m) => {
      for (const item of items) deleteSubtree(m, item.id);
      addNode(m, vector, parentId);
      this.selection = [vector.id];
    }, "structure");
  }

  createComponent(): void {
    const ids = topmost(this.page().nodes, this.selection);
    if (!ids.length) return;
    if (ids.length === 1) {
      const only = this.node(ids[0]!);
      if (only?.type === "frame") {
        this.change("Create component", (m) => {
          const node = m.node(only.id);
          if (node?.type === "frame") {
            m.remember(node.id);
            node.isComponent = true;
          }
        }, "structure");
        return;
      }
    }
    const boxes = ids.map((id) => this.parentAabb(id)).filter((box): box is AABB => !!box);
    this.change("Create component", (m) => {
      const id = groupNodes(m, ids, boxes);
      if (!id) return;
      const group = m.node(id);
      if (!group || group.type !== "group") return;
      const frame: FrameNode = {
        ...group,
        type: "frame",
        name: "Component",
        fills: [solidFill(rgba(255, 255, 255))],
        clip: true,
        layoutMode: "none",
        itemSpacing: 10,
        padding: [0, 0, 0, 0],
        primaryAlign: "start",
        counterAlign: "start",
        primarySizing: "fixed",
        counterSizing: "fixed",
        isComponent: true,
      };
      m.page().nodes[id] = frame;
      this.selection = [id];
    }, "structure");
  }

  createInstance(): void {
    const selected = this.selection[0];
    const node = selected ? this.node(selected) : null;
    const componentId = node?.type === "instance" ? node.componentId : node?.type === "frame" && node.isComponent ? node.id : null;
    if (!componentId) {
      this.notify("Select a component first.");
      return;
    }
    const master = this.node(componentId);
    if (!master || !isGeometric(master) || !master.parentId) return;
    const cloned = cloneTree(this.page().nodes, componentId);
    if (!cloned || cloned.root.type !== "frame") return;
    const { isComponent: _ignored, ...rest } = cloned.root;
    const instance = {
      ...rest,
      type: "instance" as const,
      componentId,
      x: master.x + 24,
      y: master.y + 24,
      name: `${master.name} instance`,
    };
    bindMasters(componentId, instance.id, this.page().nodes, [instance, ...cloned.nodes.filter((item) => item.id !== cloned.root.id)]);
    this.change("Create instance", (m) => {
      m.remember(instance.id);
      m.page().nodes[instance.id] = instance;
      for (const child of cloned.nodes) {
        if (child.id === cloned.root.id) continue;
        m.remember(child.id);
        m.page().nodes[child.id] = child;
      }
      const parent = m.node(master.parentId!);
      if (parent) {
        m.remember(parent.id);
        instance.parentId = parent.id;
        parent.childIds = [...parent.childIds, instance.id];
      }
      this.selection = [instance.id];
    }, "structure");
  }

  detachInstance(): void {
    const id = this.selection[0];
    const node = id ? this.node(id) : null;
    if (!id || node?.type !== "instance") return;
    this.change("Detach instance", (m) => {
      const current = m.node(id);
      if (current?.type !== "instance") return;
      m.remember(id);
      const { componentId: _component, ...rest } = current;
      m.page().nodes[id] = { ...rest, type: "frame", isComponent: false };
      const clear = (nid: NodeId) => {
        const child = m.node(nid);
        if (!child || !isGeometric(child)) return;
        m.remember(nid);
        child.masterNodeId = null;
        child.overriddenKeys = [];
        child.childIds.forEach(clear);
      };
      clear(id);
    }, "structure");
  }

  patch(id: NodeId, keys: Partial<GeometricNode>, label = "Edit"): void {
    this.change(label, (m) => {
      const node = m.node(id);
      if (!node || !isGeometric(node)) return;
      m.remember(id);
      assignPatch(node, keys);
      if (node.masterNodeId) m.markOverride(id, Object.keys(keys));
      const componentId = componentOf(m.page().nodes, id);
      if (componentId) syncInstances(m, componentId);
      reflowGroups(m, [id]);
    }, "chrome");
  }

  rename(id: NodeId, name: string): void {
    this.change("Rename", (m) => {
      const node = m.node(id);
      if (!node || node.type === "canvas") return;
      m.remember(id);
      node.name = name;
    }, "structure");
  }

  toggleVisible(id: NodeId): void {
    const node = this.node(id);
    if (!node || !isGeometric(node)) return;
    this.patch(id, { visible: !node.visible }, "Toggle visibility");
    this.bump("structure");
  }

  toggleLock(id: NodeId): void {
    const node = this.node(id);
    if (!node || !isGeometric(node)) return;
    this.patch(id, { locked: !node.locked }, "Toggle lock");
    this.bump("structure");
  }

  reparentNode(id: NodeId, parentId: NodeId, index: number): void {
    const world = this.world.get(id) ?? IDENTITY;
    const parentWorld = parentId === this.page().rootId ? IDENTITY : (this.world.get(parentId) ?? IDENTITY);
    this.change("Move layer", (m) => reparent(m, id, parentId, index, world, parentWorld), "structure");
  }

  addPage(): void {
    this.change("Add page", (m) => {
      m.touchPages();
      const page = createPage(`Page ${this.doc.pages.length + 1}`);
      this.doc.pages.push(page);
      this.doc.currentPageId = page.id;
    }, "structure");
    this.camera = { ...this.page().camera };
    this.selection = [];
    this.bump("structure");
  }

  switchPage(id: NodeId): void {
    if (!this.doc.pages.some((page) => page.id === id)) return;
    this.page().camera = { ...this.camera };
    this.doc.currentPageId = id;
    this.camera = { ...this.page().camera };
    this.selection = [];
    this.editingTextId = null;
    this.rebuild();
    this.bump("structure");
    this.scheduleSave();
  }

  renamePage(id: NodeId, name: string): void {
    this.change("Rename page", (m) => {
      m.touchPages();
      const page = this.doc.pages.find((item) => item.id === id);
      if (page) page.name = name;
    }, "structure");
  }

  renameDocument(name: string): void {
    this.change("Rename document", (m) => {
      m.touchName();
      this.doc.name = name;
    }, "chrome");
  }

  newDocument(): void {
    this.persistNow();
    this.doc = createDocument();
    this.sync.seed(this.doc);
    this.sync.connect(this.doc.id);
    this.selection = [];
    this.camera = { ...this.page().camera };
    this.history.clear();
    this.rebuild();
    this.bump("structure");
    this.scheduleSave();
  }

  openDocument(id: string): void {
    const saved = readEnvelope();
    const bytes = saved?.docs[id];
    if (!bytes) return;
    this.persistNow();
    this.sync.destroy();
    this.sync = new DocumentSync(() => this.pullRemote());
    const hydrated = this.sync.load(base64ToBytes(bytes));
    if (!hydrated) return;
    this.doc = hydrated;
    this.sync.connect(this.doc.id);
    this.selection = [];
    this.camera = { ...this.page().camera };
    this.history.clear();
    this.rebuild();
    this.bump("structure");
  }

  documentIndex(): { id: string; name: string }[] {
    const saved = readEnvelope();
    const index = saved?.index ?? [];
    if (!index.some((item) => item.id === this.doc.id)) index.push({ id: this.doc.id, name: this.doc.name });
    return index.map((item) => (item.id === this.doc.id ? { id: item.id, name: this.doc.name } : item));
  }

  notify(message: string): void {
    const id = createId("toast");
    this.toasts = [...this.toasts, { id, message }];
    this.bump("chrome");
    setTimeout(() => {
      this.toasts = this.toasts.filter((toast) => toast.id !== id);
      this.bump("chrome");
    }, 3200);
  }

  saveVersion(label?: string): void {
    this.versions = [
      ...this.versions,
      { id: createId("ver"), label: label ?? `Version ${this.versions.length + 1}`, at: Date.now(), doc: structuredClone(this.doc) },
    ].slice(-20);
    this.notify("Version saved for this session.");
    this.bump("chrome");
  }

  restoreVersion(id: string): void {
    const version = this.versions.find((item) => item.id === id);
    if (!version) return;
    const before = structuredClone(this.doc);
    const after = structuredClone(version.doc);
    const command: Command = {
      label: "Restore version",
      undo: () => this.replaceDocument(structuredClone(before)),
      redo: () => this.replaceDocument(structuredClone(after)),
    };
    this.replaceDocument(after);
    this.history.push(command);
    this.bump("structure");
  }

  setPageBackground(color: RGBA): void {
    this.change("Canvas background", (m) => {
      m.touchPages();
      this.page().background = color;
    }, "chrome");
  }

  addComment(x: number, y: number, text: string): void {
    this.change("Comment", (m) => {
      m.touchComments();
      this.page().comments.push({ id: createId("c"), x, y, text, resolved: false, createdAt: Date.now() });
    }, "structure");
  }

  setComment(id: string, text: string, resolved?: boolean): void {
    this.change("Edit comment", (m) => {
      m.touchComments();
      const comment = this.page().comments.find((item) => item.id === id);
      if (!comment) return;
      comment.text = text;
      if (resolved !== undefined) comment.resolved = resolved;
    }, "chrome");
  }

  addGuide(axis: "x" | "y", offset: number): void {
    this.change("Guide", (m) => {
      m.touchGuides();
      this.page().guides.push({ id: createId("g"), axis, offset });
    }, "chrome");
  }

  applyTextStyle(styleId: string): void {
    const style = this.doc.textStyles.find((item) => item.id === styleId);
    if (!style) return;
    this.change("Apply text style", (m) => {
      for (const id of this.selection) {
        const node = m.node(id);
        if (node?.type !== "text") continue;
        m.remember(id);
        node.fontFamily = style.fontFamily;
        node.fontWeight = style.fontWeight;
        node.fontSize = style.fontSize;
        node.lineHeight = style.lineHeight;
        node.letterSpacing = style.letterSpacing;
        node.textAlign = style.textAlign;
        node.textStyleId = style.id;
      }
    });
  }

  createTextStyle(): void {
    const id = this.selection.find((nodeId) => this.node(nodeId)?.type === "text");
    const node = id ? this.node(id) : null;
    if (node?.type !== "text") return;
    this.change("Create text style", (m) => {
      m.touchStyles();
      this.doc.textStyles.push({
        id: createId("ts"),
        name: node.name,
        fontFamily: node.fontFamily,
        fontWeight: node.fontWeight,
        fontSize: node.fontSize,
        lineHeight: node.lineHeight,
        letterSpacing: node.letterSpacing,
        textAlign: node.textAlign,
      });
    }, "structure");
  }

  createColorStyle(): void {
    const id = this.selection[0];
    const node = id ? this.node(id) : null;
    if (!node || !isGeometric(node)) return;
    const fill = node.fills.find((item) => item.visible && item.type === "solid");
    if (!fill || fill.type !== "solid") return;
    this.change("Create color style", (m) => {
      m.touchStyles();
      this.doc.colorStyles.push({ id: createId("cs"), name: `${node.name} fill`, color: { ...fill.color } });
    }, "structure");
  }

  applyColorStyle(styleId: string): void {
    const style = this.doc.colorStyles.find((item) => item.id === styleId);
    if (!style) return;
    this.change("Apply color style", (m) => {
      for (const id of this.selection) {
        const node = m.node(id);
        if (!node || !isGeometric(node)) continue;
        m.remember(id);
        node.fills = [solidFill({ ...style.color })];
        node.fillStyleId = style.id;
      }
    });
  }

  insertStress(): void {
    this.change("Insert 1,200 rectangles", (m) => {
      const root = this.page().rootId;
      for (let i = 0; i < 1200; i += 1) {
        const col = i % 40;
        const row = Math.floor(i / 40);
        const tone = 120 + ((i * 17) % 100);
        const rect = createRectangle({
          name: `Rect ${i + 1}`,
          x: col * 28,
          y: row * 28,
          width: 22,
          height: 22,
          fills: [solidFill(rgba(tone, tone - 20, 180 + (i % 40)))],
        });
        addNode(m, rect, root);
      }
    }, "structure");
  }

  publishCursor(world: Vec): void {
    this.sync.publishCursor(world.x, world.y);
  }

  parentAabb(id: NodeId): AABB | null {
    const geom = this.geomOf(id);
    if (!geom) return null;
    return aabbOfBox(localMatrix(geom), Math.max(geom.width, 0.01), Math.max(geom.height, 0.01));
  }

  pointInNode(world: Vec, id: NodeId, pad = 0): boolean {
    const node = this.node(id);
    const matrix = this.world.get(id);
    const geom = this.geomOf(id);
    if (!node || !isGeometric(node) || !matrix || !geom || node.locked) return false;
    const inv = invert(matrix);
    if (!inv) return false;
    return hitLocal(node, geom, apply(inv, world.x, world.y), pad);
  }

  outlinePoints(id: NodeId): Vec[] {
    const node = this.node(id);
    const geom = this.geomOf(id);
    const matrix = this.world.get(id);
    if (!node || !geom || !matrix || !isGeometric(node)) return [];
    const local =
      node.type === "ellipse"
        ? Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return { x: geom.width / 2 + (Math.cos(a) * geom.width) / 2, y: geom.height / 2 + (Math.sin(a) * geom.height) / 2 };
          })
        : node.type === "polygon"
          ? polygonLocal(node.sides, geom.width, geom.height)
          : node.type === "star"
            ? starLocal(node.points, node.innerRatio, geom.width, geom.height)
            : node.type === "vector"
              ? flatten(node.contours[0]?.points ?? [])
              : [
                  { x: 0, y: 0 },
                  { x: geom.width, y: 0 },
                  { x: geom.width, y: geom.height },
                  { x: 0, y: geom.height },
                ];
    return local.map((point) => apply(matrix, point.x, point.y));
  }

  private insideClips(id: NodeId, world: Vec): boolean {
    let parentId = this.node(id)?.parentId ?? null;
    while (parentId) {
      const parent = this.node(parentId);
      if (!parent) break;
      if (isFrameLike(parent) && parent.clip) {
        if (!this.pointInNode(world, parent.id, 0) && parent.id !== id) {
          const geom = this.geomOf(parent.id);
          const matrix = this.world.get(parent.id);
          if (geom && matrix) {
            const inv = invert(matrix);
            if (inv) {
              const local = apply(inv, world.x, world.y);
              if (local.x < 0 || local.y < 0 || local.x > geom.width || local.y > geom.height) return false;
            }
          }
        }
      }
      parentId = parent.parentId;
    }
    return true;
  }

  private sameParent(a: NodeId, b: NodeId): boolean {
    return this.node(a)?.parentId === this.node(b)?.parentId;
  }

  private finish(mutation: Mutation, label: string, level: EmitLevel): void {
    if (mutation.isEmpty()) return;
    const pageId = mutation.pageId;
    const pages = mutation.pagesBefore;
    const diff = pages ? {} : mutation.nodeDiff();
    const meta = mutation.metaDiff();
    const command: Command = {
      label,
      undo: () => this.applyPatch(pageId, diff, meta, "before"),
      redo: () => this.applyPatch(pageId, diff, meta, "after"),
    };
    this.history.push(command);
    this.rebuild();
    this.selection = this.selection.filter((id) => this.page().nodes[id]);
    if (!this.applyingRemote) this.sync.write(this.doc);
    this.scheduleSave();
    this.bump(level);
    this.flushRemote();
  }

  private applyPatch(pageId: string, diff: NodeDiff, meta: MetaDiff | null, side: "before" | "after"): void {
    if (meta?.pages) {
      applyMeta(this.doc, pageId, meta, side);
    } else {
      const page = this.doc.pages.find((item) => item.id === pageId);
      if (page) applyNodeDiff(page, diff, side);
      if (meta) applyMeta(this.doc, pageId, meta, side);
    }
  }

  private afterHistory(): void {
    if (!this.doc.pages.some((page) => page.id === this.doc.currentPageId)) {
      this.doc.currentPageId = this.doc.pages[0]?.id ?? this.doc.currentPageId;
    }
    this.camera = { ...this.page().camera };
    this.selection = this.selection.filter((id) => this.page().nodes[id]);
    this.rebuild();
    this.sync.write(this.doc);
    this.scheduleSave();
    this.bump("structure");
  }

  private replaceDocument(doc: DesignDocument): void {
    this.doc = doc;
    this.camera = { ...this.page().camera };
    this.rebuild();
    this.sync.write(this.doc);
  }

  rebuild(): void {
    const page = this.page();
    this.geom = resolveLayout(page, measureText);
    this.world.clear();
    this.aabb.clear();
    this.subtree.clear();
    this.order = [];
    this.spatial.clear();
    const walk = (id: NodeId, parentWorld: Matrix, visible: boolean) => {
      const node = page.nodes[id];
      if (!node) return;
      if (node.type === "canvas") {
        for (const child of node.childIds) walk(child, IDENTITY, visible);
        return;
      }
      const geom = this.geom.get(id);
      if (!geom || !isGeometric(node)) return;
      const world = mul(parentWorld, localMatrix(geom));
      this.world.set(id, world);
      const box = aabbOfBox(world, Math.max(geom.width, 0.01), Math.max(geom.height, 0.01));
      this.aabb.set(id, box);
      this.order.push(id);
      const boxes = [box];
      const childVisible = visible && node.visible;
      for (const child of node.childIds) {
        walk(child, world, childVisible);
        const sub = this.subtree.get(child);
        if (sub) boxes.push(sub);
      }
      const sub = unionAabb(boxes);
      this.subtree.set(id, sub);
      if (childVisible) this.spatial.insert(id, inflate(box, 8));
    };
    walk(page.rootId, IDENTITY, true);
    this.orderIndex = new Map(this.order.map((id, index) => [id, index]));
    this.objectCount = this.order.length;
  }

  private pullRemote(): void {
    if (this.draft) {
      this.remoteQueued = true;
      return;
    }
    const next = this.sync.hydrate();
    if (!next || next.id !== this.doc.id) return;
    this.applyingRemote = true;
    const camera = this.camera;
    const pageId = this.doc.currentPageId;
    this.doc = next;
    if (this.doc.pages.some((page) => page.id === pageId)) this.doc.currentPageId = pageId;
    this.camera = camera;
    this.page().camera = camera;
    this.selection = this.selection.filter((id) => this.page().nodes[id]);
    this.rebuild();
    this.applyingRemote = false;
    this.bump("structure");
  }

  private bump(level: EmitLevel): void {
    if (level === "structure") this.structureV += 1;
    if (level !== "render") this.chromeV += 1;
    for (const listener of this.renderListeners) listener();
    if (level !== "render") {
      for (const listener of this.chromeListeners) listener();
    }
    if (level === "structure") {
      for (const listener of this.structureListeners) listener();
    }
  }

  private emitRender(): void {
    for (const listener of this.renderListeners) listener();
  }

  private flushRemote(): void {
    if (!this.remoteQueued) return;
    this.remoteQueued = false;
    this.pullRemote();
  }

  private scheduleSave(): void {
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => this.persistNow(), 400);
  }

  persistNow(): void {
    try {
      const envelope = readEnvelope() ?? { activeId: this.doc.id, index: [], docs: {} };
      envelope.activeId = this.doc.id;
      envelope.docs[this.doc.id] = bytesToBase64(this.sync.encode());
      envelope.index = envelope.index.filter((item) => item.id !== this.doc.id);
      envelope.index.unshift({ id: this.doc.id, name: this.doc.name });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
    } catch {
      this.notify("Auto-save failed. Storage is full — export JSON to keep a copy.");
    }
  }

  exportJSON(): string {
    return JSON.stringify(this.doc, null, 2);
  }

  importJSON(raw: string): void {
    const parsed = JSON.parse(raw) as DesignDocument;
    if (!parsed.pages || !parsed.id) throw new Error("Not a document");
    this.doc = parsed;
    this.sync.seed(this.doc);
    this.sync.connect(this.doc.id);
    this.camera = { ...this.page().camera };
    this.selection = [];
    this.history.clear();
    this.rebuild();
    this.scheduleSave();
    this.bump("structure");
  }
}

function emptyEphemeral(): Ephemeral {
  return {
    marquee: null,
    marqueeMode: "intersect",
    snapLines: [],
    draft: null,
    draftParent: null,
    draftShape: null,
    pen: null,
    sizeLabel: null,
    hoverId: null,
    cursor: "default",
    peers: [],
  };
}

function cursorForTool(tool: ToolId): string {
  if (tool === "hand") return "grab";
  if (tool === "text") return "text";
  if (tool === "comment") return "crosshair";
  if (tool === "select") return "default";
  return "crosshair";
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function readEnvelope(): Envelope | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Envelope;
  } catch {
    return null;
  }
}

function assignPatch(node: GeometricNode, patch: Partial<GeometricNode>): void {
  const target = node as GeometricNode & Record<string, unknown>;
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) target[key] = value;
  }
}

function componentOf(nodes: Record<string, SceneNode>, id: NodeId): NodeId | null {
  let current: SceneNode | undefined = nodes[id];
  while (current) {
    if (current.type === "frame" && current.isComponent) return current.id;
    current = current.parentId ? nodes[current.parentId] : undefined;
  }
  return null;
}

function bindMasters(masterId: NodeId, instanceId: NodeId, nodes: Record<string, SceneNode>, copies: GeometricNode[]): void {
  const master = nodes[masterId];
  const instance = copies.find((node) => node.id === instanceId) ?? null;
  if (!master || !instance) return;
  const walk = (src: SceneNode, copy: GeometricNode) => {
    copy.masterNodeId = src.id;
    src.childIds.forEach((childId, index) => {
      const child = nodes[childId];
      const copyChild = copies.find((node) => node.id === copy.childIds[index]);
      if (child && copyChild) walk(child, copyChild);
    });
  };
  walk(master, instance);
}

function duplicateSelectionFrom(m: Mutation, source: Record<NodeId, SceneNode>, roots: NodeId[], dx: number, dy: number): NodeId[] {
  const created: NodeId[] = [];
  for (const id of roots) {
    const cloned = cloneTree(source, id);
    if (!cloned) continue;
    const original = source[id];
    if (!original?.parentId) continue;
    cloned.root.x += dx;
    cloned.root.y += dy;
    for (const node of cloned.nodes) {
      m.remember(node.id);
      m.page().nodes[node.id] = node;
    }
    const parent = m.node(original.parentId);
    if (!parent) continue;
    m.remember(parent.id);
    cloned.root.parentId = parent.id;
    parent.childIds = [...parent.childIds, cloned.root.id];
    created.push(cloned.root.id);
  }
  return created;
}
