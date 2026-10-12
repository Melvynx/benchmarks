import { rgbaCss } from "../color";
import { polygonLocal, starLocal } from "../geometry/hit";
import type { Matrix } from "../geometry/matrix";
import type { Geom } from "../layout/layout";
import { fontCss, wrapText } from "../text/measure";
import type { Camera, Fill, GeometricNode, Page } from "../types";
import { isFrameLike, isGeometric } from "../types";
import type { AABB } from "../geometry/bounds";

export type SceneSnapshot = {
  page: Page;
  geom: Map<string, Geom>;
  world: Map<string, Matrix>;
  subtree: Map<string, AABB>;
  camera: Camera;
  dpr: number;
};

const images = new Map<string, HTMLImageElement>();

export function paintScene(
  ctx: CanvasRenderingContext2D,
  snap: SceneSnapshot,
  width: number,
  height: number,
  options: { grid: boolean } = { grid: true },
): void {
  const { dpr, camera, page } = snap;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = rgbaCss(page.background);
  ctx.fillRect(0, 0, width, height);
  if (options.grid) drawGrid(ctx, camera, width, height);
  const view = viewportWorld(camera, width, height);
  drawNode(ctx, snap, page.rootId, true, view, false);
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  snap: SceneSnapshot,
  id: string,
  visible: boolean,
  view: AABB,
  skipIsolate: boolean,
): void {
  const node = snap.page.nodes[id];
  if (!node) return;
  if (node.type === "canvas") {
    for (const child of node.childIds) drawNode(ctx, snap, child, visible, view, skipIsolate);
    return;
  }
  if (!visible || !node.visible || !isGeometric(node)) return;
  const bounds = snap.subtree.get(id);
  if (bounds && !overlaps(bounds, view)) return;
  const blur = node.effects.find((effect) => effect.type === "layer-blur" && effect.visible && effect.radius > 0);
  const isolate = !skipIsolate && (blur?.type === "layer-blur" || (node.opacity < 0.999 && node.childIds.length > 0));
  if (isolate) {
    drawIsolated(ctx, snap, id, blur?.type === "layer-blur" ? blur.radius : 0, node.opacity, view);
    return;
  }
  drawDirect(ctx, snap, node, view, skipIsolate);
}

function drawDirect(
  ctx: CanvasRenderingContext2D,
  snap: SceneSnapshot,
  node: GeometricNode,
  view: AABB,
  skipIsolate: boolean,
): void {
  const geom = snap.geom.get(node.id);
  const world = snap.world.get(node.id);
  if (!geom || !world) return;
  const backdrop = node.effects.find((effect) => effect.type === "background-blur" && effect.visible && effect.radius > 0);
  if (backdrop?.type === "background-blur") drawBackdropBlur(ctx, snap, node, geom, world, backdrop.radius);

  ctx.save();
  ctx.globalAlpha = node.opacity;
  setWorld(ctx, snap, world);
  if (node.type !== "text") {
    trace(ctx, node, geom);
    fillShape(ctx, node, geom);
  }
  if (node.type === "text" && node.id !== editingSkip) drawText(ctx, node, geom);
  if (node.type === "image") drawImageNode(ctx, node, geom);
  ctx.restore();

  if (isFrameLike(node) || node.type === "group") {
    ctx.save();
    if (isFrameLike(node) && node.clip) {
      setWorld(ctx, snap, world);
      trace(ctx, node, geom);
      ctx.clip();
    }
    for (const child of node.childIds) drawNode(ctx, snap, child, true, view, skipIsolate);
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = node.opacity;
  setWorld(ctx, snap, world);
  strokeShape(ctx, node, geom);
  ctx.restore();
}

let editingSkip: string | null = null;
export function setEditingText(id: string | null): void {
  editingSkip = id;
}

function drawIsolated(
  ctx: CanvasRenderingContext2D,
  snap: SceneSnapshot,
  id: string,
  blur: number,
  alpha: number,
  view: AABB,
): void {
  const bounds = snap.subtree.get(id);
  if (!bounds) return;
  const pad = blur * snap.camera.zoom + 24;
  const screen = worldToScreenBox(bounds, snap.camera);
  const x = Math.floor(screen.x - pad);
  const y = Math.floor(screen.y - pad);
  const w = Math.max(1, Math.ceil(screen.width + pad * 2));
  const h = Math.max(1, Math.ceil(screen.height + pad * 2));
  if (w * snap.dpr > 4096 || h * snap.dpr > 4096) {
    const node = snap.page.nodes[id];
    if (node && isGeometric(node)) drawDirect(ctx, snap, node, view, true);
    return;
  }
  const scratch = scratchCanvas(Math.ceil(w * snap.dpr), Math.ceil(h * snap.dpr));
  const sctx = scratch.getContext("2d");
  if (!sctx) return;
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.clearRect(0, 0, scratch.width, scratch.height);
  const shifted: SceneSnapshot = {
    ...snap,
    camera: { ...snap.camera, x: snap.camera.x - x, y: snap.camera.y - y },
  };
  const node = snap.page.nodes[id];
  if (node && isGeometric(node)) drawDirect(sctx, shifted, { ...node, opacity: 1, effects: node.effects.filter((effect) => effect.type !== "layer-blur") }, view, true);
  ctx.save();
  ctx.setTransform(snap.dpr, 0, 0, snap.dpr, 0, 0);
  ctx.globalAlpha = alpha;
  ctx.filter = blur > 0 ? `blur(${blur * snap.camera.zoom}px)` : "none";
  ctx.drawImage(scratch, x, y, w, h);
  ctx.restore();
}

function drawBackdropBlur(
  ctx: CanvasRenderingContext2D,
  snap: SceneSnapshot,
  node: GeometricNode,
  geom: Geom,
  world: Matrix,
  radius: number,
): void {
  const snapshot = snapshotCanvas(ctx.canvas);
  ctx.save();
  setWorld(ctx, snap, world);
  trace(ctx, node, geom);
  ctx.clip();
  ctx.setTransform(snap.dpr, 0, 0, snap.dpr, 0, 0);
  ctx.filter = `blur(${radius * snap.camera.zoom}px)`;
  ctx.drawImage(snapshot, 0, 0, ctx.canvas.width / snap.dpr, ctx.canvas.height / snap.dpr);
  ctx.restore();
}

function fillShape(ctx: CanvasRenderingContext2D, node: GeometricNode, geom: Geom): void {
  if (node.type === "line" || node.type === "group") return;
  const drop = node.effects.find((effect) => effect.type === "drop-shadow" && effect.visible);
  for (const fill of node.fills) {
    if (!fill.visible || fill.opacity <= 0) continue;
    ctx.save();
    if (drop?.type === "drop-shadow") {
      ctx.shadowColor = rgbaCss(drop.color);
      ctx.shadowBlur = drop.blur;
      ctx.shadowOffsetX = drop.x;
      ctx.shadowOffsetY = drop.y;
    }
    ctx.globalAlpha *= fill.opacity;
    ctx.fillStyle = fillStyle(ctx, fill, geom);
    ctx.fill();
    ctx.restore();
  }
  const inner = node.effects.find((effect) => effect.type === "inner-shadow" && effect.visible);
  if (inner?.type === "inner-shadow") {
    ctx.save();
    trace(ctx, node, geom);
    ctx.clip();
    ctx.shadowColor = rgbaCss(inner.color);
    ctx.shadowBlur = inner.blur;
    ctx.shadowOffsetX = inner.x;
    ctx.shadowOffsetY = inner.y;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    const pad = inner.blur + Math.abs(inner.x) + Math.abs(inner.y) + 40;
    ctx.rect(-pad, -pad, geom.width + pad * 2, geom.height + pad * 2);
    trace(ctx, node, geom);
    ctx.fill("evenodd");
    ctx.restore();
  }
}

function strokeShape(ctx: CanvasRenderingContext2D, node: GeometricNode, geom: Geom): void {
  for (const stroke of node.strokes) {
    if (!stroke.visible || stroke.width <= 0 || stroke.opacity <= 0) continue;
    ctx.save();
    ctx.globalAlpha *= stroke.opacity;
    ctx.strokeStyle = rgbaCss(stroke.color);
    ctx.lineWidth = stroke.width;
    ctx.setLineDash(stroke.dash);
    ctx.lineJoin = "round";
    ctx.lineCap = node.type === "line" ? "round" : "butt";
    if (stroke.align === "center" || node.type === "line") {
      trace(ctx, node, geom);
      ctx.stroke();
    } else if (stroke.align === "inside") {
      trace(ctx, node, geom);
      ctx.clip();
      ctx.lineWidth = stroke.width * 2;
      trace(ctx, node, geom);
      ctx.stroke();
    } else {
      ctx.lineWidth = stroke.width * 2;
      trace(ctx, node, geom);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function trace(ctx: CanvasRenderingContext2D, node: GeometricNode, geom: Geom): void {
  ctx.beginPath();
  if (node.type === "ellipse") {
    ctx.ellipse(geom.width / 2, geom.height / 2, Math.max(geom.width / 2, 0.01), Math.max(geom.height / 2, 0.01), 0, 0, Math.PI * 2);
    return;
  }
  if (node.type === "line") {
    ctx.moveTo(0, geom.height / 2);
    ctx.lineTo(geom.width, geom.height / 2);
    return;
  }
  if (node.type === "polygon") {
    polygonPath(ctx, polygonLocal(node.sides, geom.width, geom.height));
    return;
  }
  if (node.type === "star") {
    polygonPath(ctx, starLocal(node.points, node.innerRatio, geom.width, geom.height));
    return;
  }
  if (node.type === "vector") {
    vectorPath(ctx, node);
    return;
  }
  roundRect(ctx, geom.width, geom.height, node.cornerRadius);
}

function polygonPath(ctx: CanvasRenderingContext2D, points: { x: number; y: number }[]): void {
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
}

function vectorPath(ctx: CanvasRenderingContext2D, node: Extract<GeometricNode, { type: "vector" }>): void {
  for (const contour of node.contours) {
    const points = contour.points;
    const first = points[0];
    if (!first) continue;
    ctx.moveTo(first.x, first.y);
    for (let i = 0; i < points.length - 1; i += 1) {
      const a = points[i];
      const b = points[i + 1];
      if (!a || !b) continue;
      const c1 = a.handleOut ? { x: a.x + a.handleOut.x, y: a.y + a.handleOut.y } : a;
      const c2 = b.handleIn ? { x: b.x + b.handleIn.x, y: b.y + b.handleIn.y } : b;
      if (!a.handleOut && !b.handleIn) ctx.lineTo(b.x, b.y);
      else ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);
    }
    if (node.closed) ctx.closePath();
  }
}

function roundRect(ctx: CanvasRenderingContext2D, w: number, h: number, radius: [number, number, number, number]): void {
  const tl = Math.max(0, Math.min(radius[0], w / 2, h / 2));
  const tr = Math.max(0, Math.min(radius[1], w / 2, h / 2));
  const br = Math.max(0, Math.min(radius[2], w / 2, h / 2));
  const bl = Math.max(0, Math.min(radius[3], w / 2, h / 2));
  ctx.moveTo(tl, 0);
  ctx.lineTo(w - tr, 0);
  ctx.arcTo(w, 0, w, tr, tr);
  ctx.lineTo(w, h - br);
  ctx.arcTo(w, h, w - br, h, br);
  ctx.lineTo(bl, h);
  ctx.arcTo(0, h, 0, h - bl, bl);
  ctx.lineTo(0, tl);
  ctx.arcTo(0, 0, tl, 0, tl);
  ctx.closePath();
}

function drawText(ctx: CanvasRenderingContext2D, node: Extract<GeometricNode, { type: "text" }>, geom: Geom): void {
  const fill = node.fills.find((item) => item.visible);
  ctx.fillStyle = fill ? rgbaCss(fill.type === "solid" ? fill.color : { r: 20, g: 20, b: 24, a: 1 }, fill.opacity) : "#16161a";
  ctx.font = fontCss(node);
  ctx.textBaseline = "top";
  const maxWidth = node.textAutoResize === "width" ? null : geom.width;
  const lines = wrapText(node, maxWidth);
  lines.forEach((line, index) => {
    const width = lineWidth(ctx, node.letterSpacing, line);
    let x = 0;
    if (node.textAlign === "center") x = (geom.width - width) / 2;
    if (node.textAlign === "right") x = geom.width - width;
    if (node.letterSpacing === 0) ctx.fillText(line, x, index * node.lineHeight);
    else {
      let cursor = x;
      for (const ch of line) {
        ctx.fillText(ch, cursor, index * node.lineHeight);
        cursor += ctx.measureText(ch).width + node.letterSpacing;
      }
    }
  });
}

function lineWidth(ctx: CanvasRenderingContext2D, spacing: number, line: string): number {
  if (spacing === 0) return ctx.measureText(line).width;
  let width = 0;
  for (const ch of line) width += ctx.measureText(ch).width + spacing;
  return width - (line.length ? spacing : 0);
}

function drawImageNode(ctx: CanvasRenderingContext2D, node: Extract<GeometricNode, { type: "image" }>, geom: Geom): void {
  const image = getImage(node.src);
  if (!image) return;
  ctx.save();
  roundRect(ctx, geom.width, geom.height, node.cornerRadius);
  ctx.clip();
  ctx.drawImage(image, 0, 0, geom.width, geom.height);
  ctx.restore();
}

function fillStyle(ctx: CanvasRenderingContext2D, fill: Fill, geom: Geom): string | CanvasGradient {
  if (fill.type === "solid") return rgbaCss(fill.color);
  const stops = fill.stops.length ? fill.stops : [{ offset: 0, color: { r: 0, g: 0, b: 0, a: 1 } }];
  if (fill.type === "linear") {
    const angle = (fill.angle * Math.PI) / 180;
    const cx = geom.width / 2;
    const cy = geom.height / 2;
    const len = Math.abs(geom.width * Math.cos(angle)) + Math.abs(geom.height * Math.sin(angle));
    const gradient = ctx.createLinearGradient(cx - Math.cos(angle) * len / 2, cy - Math.sin(angle) * len / 2, cx + Math.cos(angle) * len / 2, cy + Math.sin(angle) * len / 2);
    for (const stop of stops) gradient.addColorStop(clamp01(stop.offset), rgbaCss(stop.color));
    return gradient;
  }
  const gradient = ctx.createRadialGradient(geom.width / 2, geom.height / 2, 0, geom.width / 2, geom.height / 2, Math.max(geom.width, geom.height) / 2);
  for (const stop of stops) gradient.addColorStop(clamp01(stop.offset), rgbaCss(stop.color));
  return gradient;
}

function drawGrid(ctx: CanvasRenderingContext2D, camera: Camera, width: number, height: number): void {
  const step = niceStep(camera.zoom);
  const left = -camera.x / camera.zoom;
  const top = -camera.y / camera.zoom;
  const right = (width - camera.x) / camera.zoom;
  const bottom = (height - camera.y) / camera.zoom;
  ctx.save();
  ctx.setTransform(ctx.getTransform());
  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(20, 20, 28, 0.06)";
  for (let x = Math.floor(left / step) * step; x <= right; x += step) {
    const sx = Math.round(x * camera.zoom + camera.x) + 0.5;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx, height);
  }
  for (let y = Math.floor(top / step) * step; y <= bottom; y += step) {
    const sy = Math.round(y * camera.zoom + camera.y) + 0.5;
    ctx.moveTo(0, sy);
    ctx.lineTo(width, sy);
  }
  ctx.stroke();
  ctx.restore();
}

export function niceStep(zoom: number): number {
  const raw = 80 / Math.max(zoom, 0.0001);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const n = raw / pow;
  const nice = n < 2 ? 1 : n < 5 ? 2 : 5;
  return nice * pow;
}

function setWorld(ctx: CanvasRenderingContext2D, snap: SceneSnapshot, world: Matrix): void {
  const { camera, dpr } = snap;
  const z = camera.zoom;
  ctx.setTransform(
    dpr * z * world.a,
    dpr * z * world.b,
    dpr * z * world.c,
    dpr * z * world.d,
    dpr * (z * world.e + camera.x),
    dpr * (z * world.f + camera.y),
  );
}

function viewportWorld(camera: Camera, width: number, height: number): AABB {
  return {
    x: -camera.x / camera.zoom,
    y: -camera.y / camera.zoom,
    width: width / camera.zoom,
    height: height / camera.zoom,
  };
}

function worldToScreenBox(box: AABB, camera: Camera): AABB {
  return {
    x: box.x * camera.zoom + camera.x,
    y: box.y * camera.zoom + camera.y,
    width: box.width * camera.zoom,
    height: box.height * camera.zoom,
  };
}

function overlaps(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function getImage(src: string): HTMLImageElement | null {
  let image = images.get(src);
  if (!image) {
    image = new Image();
    image.src = src;
    images.set(src, image);
  }
  return image.complete && image.naturalWidth > 0 ? image : null;
}

let scratch: HTMLCanvasElement | null = null;
function scratchCanvas(width: number, height: number): HTMLCanvasElement {
  if (!scratch) scratch = document.createElement("canvas");
  if (scratch.width !== width) scratch.width = width;
  if (scratch.height !== height) scratch.height = height;
  return scratch;
}

let snapCanvas: HTMLCanvasElement | null = null;
function snapshotCanvas(source: HTMLCanvasElement): HTMLCanvasElement {
  if (!snapCanvas) snapCanvas = document.createElement("canvas");
  if (snapCanvas.width !== source.width) snapCanvas.width = source.width;
  if (snapCanvas.height !== source.height) snapCanvas.height = source.height;
  snapCanvas.getContext("2d")?.drawImage(source, 0, 0);
  return snapCanvas;
}
