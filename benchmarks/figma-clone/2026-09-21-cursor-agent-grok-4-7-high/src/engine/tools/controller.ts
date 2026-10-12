import type { Editor } from "../editor";
import { apply, invert, localMatrix, worldVectorToParent, IDENTITY, type Vec } from "../geometry/matrix";
import { handleCursor, handles, resizeBox, type HandleId } from "../geometry/resize";
import { applyConstraints } from "../layout/constraints";
import { snapMove } from "../snap/snap";
import { reflowGroups } from "../commands/actions";
import {
  createEllipse,
  createFrame,
  createLine,
  createPolygon,
  createRectangle,
  createStar,
  createText,
  createVector,
} from "../scene/factory";
import { addNode } from "../commands/actions";
import type { Mutation } from "../commands/mutation";
import { aabbOfBox, containsRect, type AABB } from "../geometry/bounds";
import { createId } from "../ids";
import type { ToolId } from "../types";
import { isFrameLike, isGeometric } from "../types";

export type PointerInput = {
  x: number;
  y: number;
  button: number;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  clicks: number;
};

type Drag =
  | { kind: "down"; screen: Vec; world: Vec; hit: string | null; additive: boolean }
  | { kind: "move"; ids: string[]; startWorld: Vec; origins: Record<string, { x: number; y: number }> }
  | { kind: "marquee"; start: Vec; additive: boolean; base: string[] }
  | {
      kind: "resize";
      id: string;
      handle: HandleId;
      start: { x: number; y: number; width: number; height: number; rotation: number };
      children: Record<string, { x: number; y: number; width: number; height: number; constraintH: "left" | "right" | "center" | "scale" | "left-right"; constraintV: "top" | "bottom" | "center" | "scale" | "top-bottom" }>;
    }
  | { kind: "resize-multi"; handle: HandleId; ids: string[]; box: AABB; origins: Record<string, { x: number; y: number; width: number; height: number; cx: number; cy: number }> }
  | { kind: "rotate"; ids: string[]; center: Vec; startAngle: number; origins: Record<string, { x: number; y: number; rotation: number; cx: number; cy: number }> }
  | null;

export class ToolController {
  private drag: Drag = null;
  private panning: { x: number; y: number } | null = null;
  private penPoints: { x: number; y: number; handleIn: Vec | null; handleOut: Vec | null }[] = [];
  private penClosed = false;

  constructor(private editor: Editor) {}

  pointerDown(input: PointerInput): void {
    const world = this.editor.screenToWorld(input.x, input.y);
    if (input.button === 1 || this.editor.spaceDown) {
      this.panning = { x: input.x, y: input.y };
      this.editor.ephemeral = { ...this.editor.ephemeral, cursor: "grabbing" };
      return;
    }
    if (input.y < 22) {
      this.editor.addGuide("y", world.y);
      return;
    }
    if (input.x < 22) {
      this.editor.addGuide("x", world.x);
      return;
    }
    const tool = this.editor.tool;
    if (tool === "hand") {
      this.panning = { x: input.x, y: input.y };
      return;
    }
    if (tool === "select") this.selectDown(input, world);
    else if (tool === "text") this.textDown(world);
    else if (tool === "pen") this.penDown(input, world);
    else if (tool === "comment") this.editor.addComment(world.x, world.y, "Note");
    else this.drawDown(input, world);
  }

  pointerMove(input: PointerInput): void {
    const world = this.editor.screenToWorld(input.x, input.y);
    if (this.panning) {
      this.editor.panBy(input.x - this.panning.x, input.y - this.panning.y);
      this.panning = { x: input.x, y: input.y };
      return;
    }
    if (!this.drag && this.editor.tool === "select") {
      this.updateHover(input, world);
      return;
    }
    if (this.drag?.kind === "down") this.promote(input, world);
    if (this.drag?.kind === "move") this.moveDrag(input, world);
    if (this.drag?.kind === "marquee") this.marqueeDrag(world);
    if (this.drag?.kind === "resize") this.resizeDrag(input, world);
    if (this.drag?.kind === "resize-multi") this.resizeMulti(input, world);
    if (this.drag?.kind === "rotate") this.rotateDrag(input, world);
    if (this.editor.tool === "pen") {
      this.editor.ephemeral = { ...this.editor.ephemeral, pen: { points: this.penPoints.map((p) => ({ x: p.x, y: p.y })), cursor: world, closed: this.penClosed } };
    }
    if (this.drawStart) this.drawMove(input, world);
    this.editor.requestRender();
  }

  pointerUp(input: PointerInput): void {
    const world = this.editor.screenToWorld(input.x, input.y);
    if (this.panning) {
      this.panning = null;
      this.editor.ephemeral = { ...this.editor.ephemeral, cursor: this.editor.tool === "hand" ? "grab" : "default" };
      return;
    }
    if (this.drag?.kind === "down") this.clickSelect(input);
    if (this.drag?.kind === "move" || this.drag?.kind === "resize" || this.drag?.kind === "resize-multi" || this.drag?.kind === "rotate") {
      this.editor.commitGesture(this.drag.kind === "rotate" ? "Rotate" : this.drag.kind === "move" ? "Move" : "Resize");
    }
    if (this.drag?.kind === "marquee") {
      this.editor.ephemeral = { ...this.editor.ephemeral, marquee: null };
      this.editor.requestRender();
    }
    if (this.drawStart) this.drawUp(input, world);
    this.drag = null;
    this.editor.ephemeral = { ...this.editor.ephemeral, snapLines: [], sizeLabel: null };
  }

  keyDown(key: string, shift: boolean): void {
    if (key === "Escape") {
      if (this.editor.editingTextId) {
        this.editor.commitGesture("Edit text");
        this.editor.editingTextId = null;
        this.editor.requestRender();
        this.editor.touch("chrome");
        return;
      }
      this.drag = null;
      this.penPoints = [];
      this.drawStart = null;
      this.editor.cancelGesture();
      this.editor.editingTextId = null;
      this.editor.vectorEditId = null;
      this.editor.playFrameId = null;
      this.editor.ephemeral = { ...this.editor.ephemeral, pen: null, draft: null, draftParent: null, marquee: null };
      this.editor.setSelection([]);
      this.editor.setTool("select");
    }
    if (key === "Enter" && this.editor.tool === "pen") this.finishPen(false);
    if ((key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") && this.editor.selection.length) {
      const step = shift ? 10 : 1;
      const dx = key === "ArrowLeft" ? -step : key === "ArrowRight" ? step : 0;
      const dy = key === "ArrowUp" ? -step : key === "ArrowDown" ? step : 0;
      this.editor.nudge(dx, dy);
    }
  }

  private selectDown(input: PointerInput, world: Vec): void {
    const handle = this.hitHandle(input);
    if (handle?.kind === "rotate" && this.editor.selection.length) {
      const center = this.selectionCenter();
      const origins: Record<string, { x: number; y: number; rotation: number; cx: number; cy: number }> = {};
      for (const id of this.editor.selection) {
        const node = this.editor.node(id);
        const geom = this.editor.geomOf(id);
        const matrix = this.editor.world.get(id);
        if (!node || !geom || !matrix || !isGeometric(node)) continue;
        const c = apply(matrix, geom.width / 2, geom.height / 2);
        origins[id] = { x: node.x, y: node.y, rotation: node.rotation, cx: c.x, cy: c.y };
      }
      this.editor.beginGesture();
      this.drag = { kind: "rotate", ids: [...this.editor.selection], center, startAngle: Math.atan2(world.y - center.y, world.x - center.x), origins };
      return;
    }
    if (handle && handle.kind === "handle") {
      if (this.editor.selection.length === 1) {
        const id = this.editor.selection[0]!;
        const geom = this.editor.geomOf(id);
        const node = this.editor.node(id);
        if (!geom || !node || !isGeometric(node)) return;
        const children: Drag & { kind: "resize" } extends never ? never : Record<string, { x: number; y: number; width: number; height: number; constraintH: "left" | "right" | "center" | "scale" | "left-right"; constraintV: "top" | "bottom" | "center" | "scale" | "top-bottom" }> = {};
        if (isFrameLike(node)) {
          for (const childId of node.childIds) {
            const child = this.editor.node(childId);
            if (!child || !isGeometric(child)) continue;
            children[childId] = {
              x: child.x,
              y: child.y,
              width: child.width,
              height: child.height,
              constraintH: child.constraintH,
              constraintV: child.constraintV,
            };
          }
        }
        this.editor.beginGesture();
        this.drag = { kind: "resize", id, handle: handle.handle, start: { ...geom }, children };
      } else {
        const box = this.multiBox();
        if (!box) return;
        const origins: Record<string, { x: number; y: number; width: number; height: number; cx: number; cy: number }> = {};
        for (const id of this.editor.selection) {
          const node = this.editor.node(id);
          const matrix = this.editor.world.get(id);
          const geom = this.editor.geomOf(id);
          if (!node || !matrix || !geom || !isGeometric(node)) continue;
          const c = apply(matrix, geom.width / 2, geom.height / 2);
          origins[id] = { x: node.x, y: node.y, width: node.width, height: node.height, cx: c.x, cy: c.y };
        }
        this.editor.beginGesture();
        this.drag = { kind: "resize-multi", handle: handle.handle, ids: [...this.editor.selection], box, origins };
      }
      return;
    }
    const deep = input.meta;
    const raw = this.editor.hitDeep(world);
    const hit = raw ? this.editor.selectionTarget(raw, deep) : null;
    if (input.clicks >= 2 && raw) {
      this.drag = null;
      const node = this.editor.node(raw);
      if (node?.type === "text") {
        this.editor.setSelection([raw]);
        this.editor.editingTextId = raw;
        this.editor.touch("chrome");
        return;
      }
      if (node?.type === "vector") {
        this.editor.setSelection([raw]);
        this.editor.vectorEditId = raw;
        this.editor.setTool("pen");
        return;
      }
      this.editor.setSelection([raw]);
      return;
    }
    this.drag = { kind: "down", screen: { x: input.x, y: input.y }, world, hit, additive: input.shift };
  }

  private promote(input: PointerInput, _world: Vec): void {
    if (this.drag?.kind !== "down") return;
    if (Math.hypot(input.x - this.drag.screen.x, input.y - this.drag.screen.y) < 3) return;
    if (this.drag.hit) {
      if (!this.editor.selection.includes(this.drag.hit)) this.editor.setSelection(this.drag.additive ? [...this.editor.selection, this.drag.hit] : [this.drag.hit]);
      const origins: Record<string, { x: number; y: number }> = {};
      for (const id of this.editor.selection) {
        const node = this.editor.node(id);
        if (node && isGeometric(node)) origins[id] = { x: node.x, y: node.y };
      }
      this.editor.beginGesture();
      this.drag = { kind: "move", ids: [...this.editor.selection], startWorld: this.drag.world, origins };
    } else {
      this.drag = {
        kind: "marquee",
        start: this.drag.world,
        additive: this.drag.additive,
        base: this.drag.additive ? [...this.editor.selection] : [],
      };
    }
  }

  private clickSelect(input: PointerInput): void {
    if (this.drag?.kind !== "down") return;
    const { hit, additive } = this.drag;
    if (!hit) {
      if (!additive) this.editor.setSelection([]);
      return;
    }
    if (additive) {
      const next = this.editor.selection.includes(hit) ? this.editor.selection.filter((id) => id !== hit) : [...this.editor.selection, hit];
      this.editor.setSelection(next);
    } else this.editor.setSelection([hit]);
    void input;
  }

  private moveDrag(input: PointerInput, world: Vec): void {
    if (this.drag?.kind !== "move") return;
    let dx = world.x - this.drag.startWorld.x;
    let dy = world.y - this.drag.startWorld.y;
    if (input.shift) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    const moving = this.movingAabb(dx, dy);
    const others = this.otherBoxes(new Set(this.drag.ids));
    const snap = snapMove({ box: moving, others, guides: this.editor.page().guides, threshold: 5 / this.editor.camera.zoom });
    dx += snap.dx;
    dy += snap.dy;
    const origins = this.drag.origins;
    const ids = this.drag.ids;
    this.editor.gesture((m) => {
      for (const id of ids) {
        const origin = origins[id];
        if (!origin) continue;
        const delta = worldVectorToParent(this.editor.parentWorld(id), dx, dy);
        m.update(id, (node) => {
          node.x = origin.x + delta.x;
          node.y = origin.y + delta.y;
          if (node.masterNodeId) m.markOverride(id, ["x", "y"]);
        });
      }
      reflowGroups(m, ids);
    });
    this.editor.ephemeral = { ...this.editor.ephemeral, snapLines: snap.lines, sizeLabel: null };
  }

  private marqueeDrag(world: Vec): void {
    if (this.drag?.kind !== "marquee") return;
    const x = Math.min(this.drag.start.x, world.x);
    const y = Math.min(this.drag.start.y, world.y);
    const box = { x, y, width: Math.abs(world.x - this.drag.start.x), height: Math.abs(world.y - this.drag.start.y) };
    const mode = world.x >= this.drag.start.x ? "contain" : "intersect";
    const hits = this.editor.nodesInRect(box, mode).map((id) => this.editor.selectionTarget(id, false));
    this.editor.setSelection([...new Set([...this.drag.base, ...hits])]);
    this.editor.ephemeral = { ...this.editor.ephemeral, marquee: box, marqueeMode: mode };
  }

  private resizeDrag(input: PointerInput, world: Vec): void {
    if (this.drag?.kind !== "resize") return;
    const parent = this.editor.parentWorld(this.drag.id);
    const inv = invert(parent) ?? IDENTITY;
    const pointer = apply(inv, world.x, world.y);
    const next = resizeBox({ start: this.drag.start, handle: this.drag.handle, pointer, shift: input.shift, alt: input.alt });
    const start = this.drag.start;
    const children = this.drag.children;
    const id = this.drag.id;
    this.editor.gesture((m) => {
      m.update(id, (node) => {
        node.x = next.x;
        node.y = next.y;
        node.width = Math.max(1, next.width);
        node.height = Math.max(1, next.height);
        if (node.type === "text") {
          const corner = this.drag?.kind === "resize" && ["nw", "ne", "se", "sw"].includes(this.drag.handle);
          node.textAutoResize = corner ? "none" : "height";
        }
        if (isFrameLike(node) && node.layoutMode !== "none") {
          const horizontal = node.layoutMode === "horizontal";
          if (Math.abs(next.width - start.width) > 0.1) {
            if (horizontal) node.primarySizing = "fixed";
            else node.counterSizing = "fixed";
          }
          if (Math.abs(next.height - start.height) > 0.1) {
            if (horizontal) node.counterSizing = "fixed";
            else node.primarySizing = "fixed";
          }
        }
        if (node.masterNodeId) m.markOverride(id, ["x", "y", "width", "height"]);
      });
      const current = m.node(id);
      if (current && isFrameLike(current) && current.layoutMode === "none") {
        for (const [childId, childStart] of Object.entries(children)) {
          const box = applyConstraints(childStart, start, next);
          m.update(childId, (child) => {
            child.x = box.x;
            child.y = box.y;
            child.width = box.width;
            child.height = box.height;
          });
        }
      }
      reflowGroups(m, [id]);
    });
    this.editor.ephemeral = { ...this.editor.ephemeral, sizeLabel: `${Math.round(next.width)} × ${Math.round(next.height)}` };
  }

  private resizeMulti(input: PointerInput, world: Vec): void {
    if (this.drag?.kind !== "resize-multi") return;
    const box = this.drag.box;
    const handle = this.drag.handle;
    const anchor = this.anchorOf(box, handle);
    let sx = 1;
    let sy = 1;
    if (handle.includes("e")) sx = (world.x - anchor.x) / Math.max(1, box.x + box.width - anchor.x);
    if (handle.includes("w")) sx = (anchor.x - world.x) / Math.max(1, anchor.x - box.x);
    if (handle.includes("s")) sy = (world.y - anchor.y) / Math.max(1, box.y + box.height - anchor.y);
    if (handle.includes("n")) sy = (anchor.y - world.y) / Math.max(1, anchor.y - box.y);
    if (!handle.includes("e") && !handle.includes("w")) sx = 1;
    if (!handle.includes("n") && !handle.includes("s")) sy = 1;
    sx = Math.max(0.02, Math.abs(sx));
    sy = Math.max(0.02, Math.abs(sy));
    if (input.shift) {
      const uniform = Math.max(sx, sy);
      sx = uniform;
      sy = uniform;
    }
    const origins = this.drag.origins;
    this.editor.gesture((m) => {
      for (const id of this.drag && this.drag.kind === "resize-multi" ? this.drag.ids : []) {
        const origin = origins[id];
        if (!origin) continue;
        const cx = anchor.x + (origin.cx - anchor.x) * sx;
        const cy = anchor.y + (origin.cy - anchor.y) * sy;
        const parent = this.editor.parentWorld(id);
        const inv = invert(parent) ?? IDENTITY;
        const local = apply(inv, cx, cy);
        m.update(id, (node) => {
          node.width = Math.max(1, origin.width * sx);
          node.height = Math.max(1, origin.height * sy);
          node.x = local.x - node.width / 2;
          node.y = local.y - node.height / 2;
        });
      }
    });
  }

  private rotateDrag(input: PointerInput, world: Vec): void {
    if (this.drag?.kind !== "rotate") return;
    let delta = Math.atan2(world.y - this.drag.center.y, world.x - this.drag.center.x) - this.drag.startAngle;
    let deg = (delta * 180) / Math.PI;
    if (input.shift) deg = Math.round(deg / 15) * 15;
    delta = (deg * Math.PI) / 180;
    const cos = Math.cos(delta);
    const sin = Math.sin(delta);
    const center = this.drag.center;
    const origins = this.drag.origins;
    this.editor.gesture((m) => {
      for (const [id, origin] of Object.entries(origins)) {
        const dx = origin.cx - center.x;
        const dy = origin.cy - center.y;
        const cx = center.x + dx * cos - dy * sin;
        const cy = center.y + dx * sin + dy * cos;
        const parent = this.editor.parentWorld(id);
        const inv = invert(parent) ?? IDENTITY;
        const local = apply(inv, cx, cy);
        m.update(id, (node) => {
          node.rotation = origin.rotation + deg;
          node.x = local.x - node.width / 2;
          node.y = local.y - node.height / 2;
        });
      }
    });
    const base = origins[this.editor.selection[0] ?? ""]?.rotation ?? 0;
    this.editor.ephemeral = { ...this.editor.ephemeral, sizeLabel: `${Math.round(base + deg)}°` };
  }

  private drawStart: { parent: string; world: Vec; pointer: Vec } | null = null;

  private drawDown(input: PointerInput, world: Vec): void {
    const parent = this.editor.containerAt(world);
    this.drawStart = { parent, world, pointer: { x: input.x, y: input.y } };
  }

  private drawMove(input: PointerInput, world: Vec): void {
    if (!this.drawStart) return;
    const geom = this.drawGeom(input, world);
    this.editor.ephemeral = {
      ...this.editor.ephemeral,
      draft: geom,
      draftParent: this.drawStart.parent,
      draftShape: this.editor.tool,
      sizeLabel: `${Math.round(Math.abs(geom.width))} × ${Math.round(Math.abs(geom.height))}`,
    };
  }

  private drawUp(input: PointerInput, world: Vec): void {
    if (!this.drawStart) return;
    const start = this.drawStart;
    const dragged = Math.hypot(input.x - start.pointer.x, input.y - start.pointer.y) > 3;
    const geom = dragged ? this.drawGeom(input, world) : { x: this.parentPoint(start.parent, world).x, y: this.parentPoint(start.parent, world).y, width: 120, height: this.editor.tool === "line" ? 0 : 80, rotation: 0 };
    this.drawStart = null;
    const tool = this.editor.tool;
    this.editor.change("Create", (m) => {
      const node = this.makeShape(tool, geom);
      if (!node) return;
      addNode(m, node, start.parent);
      if (tool === "frame") this.adopt(m, node.id, start.parent, geom);
      this.editor.selection = [node.id];
    }, "structure");
    this.editor.ephemeral = { ...this.editor.ephemeral, draft: null, draftParent: null, draftShape: null, sizeLabel: null };
    this.editor.setTool("select");
  }

  private textDown(world: Vec): void {
    const parent = this.editor.containerAt(world);
    const local = this.parentPoint(parent, world);
    const node = createText({ x: local.x, y: local.y, text: "Text" });
    this.editor.change("Text", (m) => {
      addNode(m, node, parent);
      this.editor.selection = [node.id];
    }, "structure");
    this.editor.editingTextId = node.id;
    this.editor.setTool("select");
  }

  private penDown(input: PointerInput, world: Vec): void {
    if (this.penPoints.length > 2) {
      const first = this.penPoints[0]!;
      const screen = this.editor.worldToScreen(first.x, first.y);
      if (Math.hypot(screen.x - input.x, screen.y - input.y) < 8) {
        this.finishPen(true);
        return;
      }
    }
    const previous = this.penPoints[this.penPoints.length - 1];
    let point = world;
    if (input.shift && previous) {
      const angle = Math.atan2(world.y - previous.y, world.x - previous.x);
      const snapped = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
      const dist = Math.hypot(world.x - previous.x, world.y - previous.y);
      point = { x: previous.x + Math.cos(snapped) * dist, y: previous.y + Math.sin(snapped) * dist };
    }
    this.penPoints.push({ ...point, handleIn: null, handleOut: input.alt ? { x: 24, y: 0 } : null });
    this.editor.ephemeral = { ...this.editor.ephemeral, pen: { points: this.penPoints.map((p) => ({ x: p.x, y: p.y })), cursor: null, closed: false } };
  }

  private finishPen(closed: boolean): void {
    if (this.penPoints.length < 2) {
      this.penPoints = [];
      return;
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const point of this.penPoints) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
    const node = createVector({
      x: minX,
      y: minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    });
    if (node.type !== "vector") return;
    node.closed = closed;
    node.contours = [
      {
        points: this.penPoints.map((point) => ({
          id: createId("pt"),
          x: point.x - minX,
          y: point.y - minY,
          handleIn: point.handleIn,
          handleOut: point.handleOut,
        })),
      },
    ];
    this.editor.change("Pen", (m) => {
      addNode(m, node, this.editor.page().rootId);
      this.editor.selection = [node.id];
    }, "structure");
    this.penPoints = [];
    this.editor.ephemeral = { ...this.editor.ephemeral, pen: null };
    this.editor.setTool("select");
  }

  private makeShape(tool: ToolId, geom: { x: number; y: number; width: number; height: number; rotation: number }) {
    const box = { x: geom.x, y: geom.y, width: Math.max(1, Math.abs(geom.width)), height: Math.max(tool === "line" ? 0 : 1, Math.abs(geom.height)), rotation: geom.rotation };
    if (tool === "rectangle") return createRectangle(box);
    if (tool === "ellipse") return createEllipse(box);
    if (tool === "frame") return createFrame({ ...box, name: "Frame" });
    if (tool === "line") return createLine(box);
    if (tool === "polygon") return createPolygon(5, box);
    if (tool === "star") return createStar(box);
    return null;
  }

  private adopt(m: Mutation, frameId: string, parentId: string, geom: { x: number; y: number; width: number; height: number }): void {
    const page = m.page();
    const parent = page.nodes[parentId];
    if (!parent) return;
    const frameBox = { x: geom.x, y: geom.y, width: Math.abs(geom.width), height: Math.abs(geom.height) };
    for (const childId of [...parent.childIds]) {
      if (childId === frameId) continue;
      const child = page.nodes[childId];
      if (!child || !isGeometric(child) || child.locked) continue;
      const box = aabbOfBox(localMatrix({ x: child.x, y: child.y, width: child.width, height: child.height, rotation: child.rotation }), Math.max(child.width, 1), Math.max(child.height, 1));
      if (!containsRect(frameBox, box)) continue;
      m.remember(childId);
      m.remember(frameId);
      m.remember(parentId);
      parent.childIds = parent.childIds.filter((id) => id !== childId);
      child.parentId = frameId;
      child.x -= frameBox.x;
      child.y -= frameBox.y;
      const frame = page.nodes[frameId];
      if (frame) frame.childIds = [...frame.childIds, childId];
    }
  }

  private drawGeom(input: PointerInput, world: Vec): { x: number; y: number; width: number; height: number; rotation: number } {
    if (!this.drawStart) return { x: 0, y: 0, width: 1, height: 1, rotation: 0 };
    const a = this.parentPoint(this.drawStart.parent, this.drawStart.world);
    let b = this.parentPoint(this.drawStart.parent, world);
    if (this.editor.tool === "line") {
      let dx = b.x - a.x;
      let dy = b.y - a.y;
      if (input.shift) {
        const angle = Math.atan2(dy, dx);
        const snapped = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
        const dist = Math.hypot(dx, dy);
        dx = Math.cos(snapped) * dist;
        dy = Math.sin(snapped) * dist;
      }
      const length = Math.max(1, Math.hypot(dx, dy));
      const rotation = (Math.atan2(dy, dx) * 180) / Math.PI;
      const cx = a.x + dx / 2;
      const cy = a.y + dy / 2;
      return { x: cx - length / 2, y: cy, width: length, height: 0, rotation };
    }
    if (input.shift) {
      const size = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y));
      b = { x: a.x + Math.sign(b.x - a.x || 1) * size, y: a.y + Math.sign(b.y - a.y || 1) * size };
    }
    let x1 = a.x;
    let y1 = a.y;
    const x2 = b.x;
    const y2 = b.y;
    if (input.alt) {
      x1 = a.x - (b.x - a.x);
      y1 = a.y - (b.y - a.y);
    }
    return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1), rotation: 0 };
  }

  private parentPoint(parentId: string, world: Vec): Vec {
    const matrix = parentId === this.editor.page().rootId ? IDENTITY : (this.editor.world.get(parentId) ?? IDENTITY);
    return apply(invert(matrix) ?? IDENTITY, world.x, world.y);
  }

  private updateHover(input: PointerInput, world: Vec): void {
    const handle = this.hitHandle(input);
    const raw = this.editor.hitDeep(world);
    const hover = raw ? this.editor.selectionTarget(raw, input.meta) : null;
    let cursor = "default";
    if (handle?.kind === "rotate") cursor = "crosshair";
    else if (handle?.kind === "handle") {
      const rotation = this.editor.selection.length === 1 ? (this.editor.geomOf(this.editor.selection[0]!)?.rotation ?? 0) : 0;
      cursor = handleCursor(handle.handle, rotation);
    } else if (hover) cursor = "move";
    this.editor.ephemeral = { ...this.editor.ephemeral, hoverId: hover, cursor };
  }

  private hitHandle(input: PointerInput): { kind: "handle"; handle: HandleId } | { kind: "rotate" } | null {
    if (!this.editor.selection.length) return null;
    if (this.editor.selection.length === 1) {
      const id = this.editor.selection[0]!;
      const geom = this.editor.geomOf(id);
      const world = this.editor.world.get(id);
      if (!geom || !world) return null;
      const knob = apply(world, geom.width / 2, -28 / this.editor.camera.zoom);
      const screen = this.editor.worldToScreen(knob.x, knob.y);
      if (Math.hypot(screen.x - input.x, screen.y - input.y) < 8) return { kind: "rotate" };
      for (const handle of handles()) {
        const local = handlePoint(handle, geom.width, geom.height);
        const p = this.editor.worldToScreen(...xy(apply(world, local.x, local.y)));
        if (Math.hypot(p.x - input.x, p.y - input.y) < 7) return { kind: "handle", handle };
      }
      return null;
    }
    const box = this.multiBox();
    if (!box) return null;
    for (const handle of handles()) {
      const local = handlePoint(handle, box.width, box.height);
      const p = this.editor.worldToScreen(box.x + local.x, box.y + local.y);
      if (Math.hypot(p.x - input.x, p.y - input.y) < 7) return { kind: "handle", handle };
    }
    return null;
  }

  private movingAabb(dx: number, dy: number): AABB {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of this.editor.selection) {
      const box = this.editor.aabb.get(id);
      if (!box) continue;
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }
    return { x: minX + dx, y: minY + dy, width: maxX - minX, height: maxY - minY };
  }

  private otherBoxes(exclude: Set<string>): AABB[] {
    const boxes: AABB[] = [];
    for (const [id, box] of this.editor.aabb) {
      if (exclude.has(id)) continue;
      const node = this.editor.node(id);
      if (!node || !node.visible) continue;
      boxes.push(box);
    }
    return boxes;
  }

  private multiBox(): AABB | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of this.editor.selection) {
      const box = this.editor.aabb.get(id);
      if (!box) continue;
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }
    if (!Number.isFinite(minX)) return null;
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  private selectionCenter(): Vec {
    const box = this.multiBox();
    if (!box) return { x: 0, y: 0 };
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  }

  private anchorOf(box: AABB, handle: HandleId): Vec {
    const local = handlePoint(opposite(handle), box.width, box.height);
    return { x: box.x + local.x, y: box.y + local.y };
  }
}

function handlePoint(handle: HandleId, w: number, h: number): Vec {
  const map: Record<HandleId, Vec> = {
    nw: { x: 0, y: 0 },
    n: { x: w / 2, y: 0 },
    ne: { x: w, y: 0 },
    e: { x: w, y: h / 2 },
    se: { x: w, y: h },
    s: { x: w / 2, y: h },
    sw: { x: 0, y: h },
    w: { x: 0, y: h / 2 },
  };
  return map[handle];
}

function opposite(handle: HandleId): HandleId {
  const map: Record<HandleId, HandleId> = { n: "s", s: "n", e: "w", w: "e", ne: "sw", sw: "ne", nw: "se", se: "nw" };
  return map[handle];
}

function xy(point: Vec): [number, number] {
  return [point.x, point.y];
}
