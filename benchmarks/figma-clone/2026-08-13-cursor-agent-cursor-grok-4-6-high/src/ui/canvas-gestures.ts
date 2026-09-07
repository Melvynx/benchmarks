import { dist, resizeRotated, snapAngle } from "../core/geometry";
import { nodesInMarquee, parentWorldMatrix, pickTopNode, requireNode, worldAABB } from "../core/scene";
import { snapMove } from "../core/snapping";
import {
  addComment,
  addPrototypeLink,
  commitPen,
  commitPreview,
  createShape,
  getSpatial,
  getState,
  insertNode,
  setCamera,
  setCameraLive,
  setEditingText,
  setMarquee,
  setMarqueeLive,
  setPenDraft,
  setPreviewLive,
  setPrototypeFrom,
  setSelection,
  setTool,
  viewDocument,
} from "../core/store";
import type { Handle, NodeId, PathPoint, SceneNode, Vec2 } from "../core/types";
import { MIN_SIZE } from "../core/types";
import { zoomAt } from "../input/camera";
import { hitHandle } from "../render/overlay-renderer";

export type Gesture =
  | { kind: "none" }
  | { kind: "pan"; last: Vec2 }
  | { kind: "marquee"; start: Vec2 }
  | { kind: "move"; startWorld: Vec2; startNodes: SceneNode[] }
  | { kind: "resize"; handle: Handle; startNodes: SceneNode[] }
  | { kind: "rotate"; startAngle: number; center: Vec2; startRot: number; id: NodeId }
  | {
      kind: "create";
      tool: "frame" | "rectangle" | "ellipse" | "line" | "polygon" | "star" | "text";
      start: Vec2;
    };

export function beginPointer(
  gesture: { current: Gesture },
  world: Vec2,
  screen: Vec2,
  view: { width: number; height: number; rulers: boolean },
  mods: { shift: boolean; alt: boolean; space: boolean; button: number },
  onText: (id: NodeId, value: string) => void,
): void {
  const st = getState();
  const doc = viewDocument();

  if (mods.button === 1 || mods.space || st.tool === "hand") {
    gesture.current = { kind: "pan", last: screen };
    return;
  }
  if (mods.button !== 0) return;

  if (st.tool === "zoom") {
    setCamera(zoomAt(st.camera, screen.x, screen.y, st.camera.zoom * (mods.alt ? 0.8 : 1.25), view.width, view.height, view.rulers));
    return;
  }
  if (st.tool === "comment") {
    const body = window.prompt("Comment");
    if (body) addComment(world.x, world.y, body);
    setTool("select");
    return;
  }
  if (st.tool === "pen") {
    const pts = [...(st.penDraft ?? [])];
    if (pts.length > 2 && dist(world, { x: pts[0]!.x, y: pts[0]!.y }) < 8 / st.camera.zoom) {
      commitPen(true);
      return;
    }
    const point: PathPoint = { x: world.x, y: world.y, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 }, kind: "corner" };
    pts.push(point);
    setPenDraft(pts);
    return;
  }
  if (st.tool === "prototype") {
    const hit = pickTopNode(doc, world, st.camera.zoom, { ignoreLocked: true });
    if (!st.prototypeFrom) {
      if (hit) setPrototypeFrom(hit);
    } else if (hit) addPrototypeLink(st.prototypeFrom, hit);
    return;
  }
  if (st.tool === "text") {
    const hit = pickTopNode(doc, world, st.camera.zoom);
    const node = hit ? doc.nodes[hit] : undefined;
    if (node?.type === "text") {
      setSelection([hit!]);
      setEditingText(hit!);
      onText(hit!, node.characters);
      return;
    }
    const t = createShape("text", world.x, world.y, 200, 28);
    insertNode(t);
    setEditingText(t.id);
    onText(t.id, "Text");
    return;
  }

  const shapeTools = ["frame", "rectangle", "ellipse", "line", "polygon", "star"] as const;
  if ((shapeTools as readonly string[]).includes(st.tool)) {
    gesture.current = { kind: "create", tool: st.tool as (typeof shapeTools)[number], start: world };
    return;
  }

  if (st.selection.length === 1) {
    const hid = hitHandle(doc, st.selection[0]!, screen, st.camera, view);
    if (hid === "rotate") {
      const b = worldAABB(doc, st.selection[0]!);
      const center = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      const node = requireNode(doc, st.selection[0]!);
      gesture.current = {
        kind: "rotate",
        startAngle: Math.atan2(world.y - center.y, world.x - center.x),
        center,
        startRot: node.rotation,
        id: node.id,
      };
      return;
    }
    if (hid) {
      gesture.current = {
        kind: "resize",
        handle: hid,
        startNodes: st.selection.map((id) => structuredClone(requireNode(doc, id))),
      };
      return;
    }
  }

  const hit = pickTopNode(doc, world, st.camera.zoom, { ignoreLocked: true });
  if (hit) {
    if (mods.shift) setSelection([hit], true);
    else if (!st.selection.includes(hit)) setSelection([hit]);
    const ids = mods.shift ? [...new Set([...getState().selection, hit])] : getState().selection.includes(hit) ? getState().selection : [hit];
    gesture.current = {
      kind: "move",
      startWorld: world,
      startNodes: ids.map((id) => structuredClone(requireNode(viewDocument(), id))),
    };
    return;
  }

  if (!mods.shift) setSelection([]);
  gesture.current = { kind: "marquee", start: world };
}

export function movePointer(
  gesture: { current: Gesture },
  world: Vec2,
  screen: Vec2,
  mods: { shift: boolean; alt: boolean },
): void {
  const st = getState();
  const g = gesture.current;

  if (g.kind === "pan") {
    const dx = screen.x - g.last.x;
    const dy = screen.y - g.last.y;
    setCameraLive({ ...st.camera, x: st.camera.x - dx / st.camera.zoom, y: st.camera.y - dy / st.camera.zoom });
    g.last = screen;
    return;
  }
  if (g.kind === "marquee") {
    setMarqueeLive({
      minX: Math.min(g.start.x, world.x),
      minY: Math.min(g.start.y, world.y),
      maxX: Math.max(g.start.x, world.x),
      maxY: Math.max(g.start.y, world.y),
    });
    return;
  }
  if (g.kind === "create") {
    const x = Math.min(g.start.x, world.x);
    const y = Math.min(g.start.y, world.y);
    let wdt = Math.abs(world.x - g.start.x);
    let hgt = Math.abs(world.y - g.start.y);
    if (mods.shift && g.tool !== "line") {
      const s = Math.max(wdt, hgt);
      wdt = s;
      hgt = s;
    }
    const node = createShape(g.tool, x, y, Math.max(MIN_SIZE, wdt), Math.max(MIN_SIZE, hgt));
    setPreviewLive({ [node.id]: node });
    return;
  }
  if (g.kind === "move") {
    let dx = world.x - g.startWorld.x;
    let dy = world.y - g.startWorld.y;
    if (mods.shift) {
      if (Math.abs(dx) > Math.abs(dy)) dy = 0;
      else dx = 0;
    }
    const preview: Record<string, SceneNode> = {};
    const movingIds = new Set(g.startNodes.map((n) => n.id));
    const boxes = g.startNodes.map((n) => worldAABB(st.document, n.id));
    const union = boxes.reduce((a, b) => ({
      minX: Math.min(a.minX, b.minX),
      minY: Math.min(a.minY, b.minY),
      maxX: Math.max(a.maxX, b.maxX),
      maxY: Math.max(a.maxY, b.maxY),
    }));
    const moved = { minX: union.minX + dx, minY: union.minY + dy, maxX: union.maxX + dx, maxY: union.maxY + dy };
    const candidates = getSpatial()
      .query({ minX: moved.minX - 200, minY: moved.minY - 200, maxX: moved.maxX + 200, maxY: moved.maxY + 200 })
      .map((id) => {
        const aabb = getSpatial().getAABB(id);
        return aabb ? { id, aabb } : null;
      })
      .filter((c): c is { id: string; aabb: NonNullable<ReturnType<ReturnType<typeof getSpatial>["getAABB"]>> } => Boolean(c));
    const snap = snapMove(moved, candidates, movingIds, st.camera.zoom);
    dx += snap.dx;
    dy += snap.dy;
    for (const n of g.startNodes) {
      const c = structuredClone(n);
      const parentM = parentWorldMatrix(st.document, n.id);
      const det = parentM[0] * parentM[3] - parentM[1] * parentM[2];
      const inv = 1 / (det || 1);
      c.x = n.x + (parentM[3] * dx - parentM[2] * dy) * inv;
      c.y = n.y + (-parentM[1] * dx + parentM[0] * dy) * inv;
      preview[c.id] = c;
    }
    setPreviewLive(preview, snap.guides);
    return;
  }
  if (g.kind === "resize") {
    const start = g.startNodes[0];
    if (!start) return;
    const parentM = parentWorldMatrix(st.document, start.id);
    const det = parentM[0] * parentM[3] - parentM[1] * parentM[2];
    const inv = 1 / (det || 1);
    const parentPtr = {
      x: (parentM[3] * (world.x - parentM[4]) - parentM[2] * (world.y - parentM[5])) * inv,
      y: (-parentM[1] * (world.x - parentM[4]) + parentM[0] * (world.y - parentM[5])) * inv,
    };
    const box = resizeRotated(start, g.handle, parentPtr, { keepRatio: mods.shift, fromCenter: mods.alt });
    const next = structuredClone(start);
    next.x = box.x;
    next.y = box.y;
    next.width = box.width;
    next.height = box.height;
    setPreviewLive({ [next.id]: next });
    return;
  }
  if (g.kind === "rotate") {
    const ang = Math.atan2(world.y - g.center.y, world.x - g.center.x);
    let deg = g.startRot + ((ang - g.startAngle) * 180) / Math.PI;
    if (mods.shift) deg = snapAngle(deg, 15);
    const node = structuredClone(requireNode(st.document, g.id));
    node.rotation = deg;
    setPreviewLive({ [node.id]: node });
  }
}

export function endPointer(gesture: { current: Gesture }, shift: boolean): void {
  const g = gesture.current;
  gesture.current = { kind: "none" };
  const st = getState();
  if (g.kind === "pan") {
    setCamera(st.camera);
    return;
  }
  if (g.kind === "marquee") {
    const m = st.marquee;
    setMarquee(null);
    if (m) {
      const hits = nodesInMarquee(viewDocument(), m);
      setSelection(shift ? [...new Set([...st.selection, ...hits])] : hits);
    }
    return;
  }
  if (g.kind === "create") {
    const node = st.preview ? Object.values(st.preview)[0] : null;
    setPreviewLive(null);
    if (node && node.width > 2 && node.height > 2) insertNode(node);
    setTool("select");
    return;
  }
  if (g.kind === "move") commitPreview("Move");
  if (g.kind === "resize") commitPreview("Resize");
  if (g.kind === "rotate") commitPreview("Rotate");
}
