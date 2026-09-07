import { colorToCss } from "../core/color";
import { isParent } from "../core/factories";
import {
  flattenPath,
  regularPolygon,
  roundRectPath,
  starPolygon,
} from "../core/geometry";
import { activePage, worldAABB } from "../core/scene";
import { fontCss, lineOffsetX, wrapLines } from "../core/text-layout";
import type { Camera, Document, Effect, SceneNode } from "../core/types";
import { GRID_MAJOR, GRID_MINOR, RULER_SIZE } from "../core/types";
import { applyPaint, strokeOffset } from "./paints";

const imageCache = new Map<string, HTMLImageElement>();

export function preloadImage(src: string): HTMLImageElement | null {
  const hit = imageCache.get(src);
  if (hit && hit.complete) return hit;
  if (hit) return null;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  imageCache.set(src, img);
  return img.complete ? img : null;
}

export interface RenderView {
  width: number;
  height: number;
  rulers: boolean;
  grid: boolean;
  pixelPreview: boolean;
}

function cameraTransform(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  view: RenderView,
): void {
  const ox = view.rulers ? RULER_SIZE : 0;
  const oy = view.rulers ? RULER_SIZE : 0;
  const w = view.width - ox;
  const h = view.height - oy;
  ctx.setTransform(camera.zoom, 0, 0, camera.zoom, ox + w / 2 - camera.x * camera.zoom, oy + h / 2 - camera.y * camera.zoom);
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  view: RenderView,
): void {
  if (!view.grid) return;
  const ox = view.rulers ? RULER_SIZE : 0;
  const oy = view.rulers ? RULER_SIZE : 0;
  const w = view.width - ox;
  const h = view.height - oy;
  const worldLeft = camera.x - w / 2 / camera.zoom;
  const worldTop = camera.y - h / 2 / camera.zoom;
  const worldRight = camera.x + w / 2 / camera.zoom;
  const worldBottom = camera.y + h / 2 / camera.zoom;

  const minor = camera.zoom < 0.35 ? GRID_MAJOR : GRID_MINOR;
  const major = minor * 10;

  ctx.save();
  cameraTransform(ctx, camera, view);
  ctx.lineWidth = 1 / camera.zoom;

  const draw = (step: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.beginPath();
    const x0 = Math.floor(worldLeft / step) * step;
    for (let x = x0; x <= worldRight; x += step) {
      ctx.moveTo(x, worldTop);
      ctx.lineTo(x, worldBottom);
    }
    const y0 = Math.floor(worldTop / step) * step;
    for (let y = y0; y <= worldBottom; y += step) {
      ctx.moveTo(worldLeft, y);
      ctx.lineTo(worldRight, y);
    }
    ctx.stroke();
  };

  draw(minor, "rgba(255,255,255,0.035)");
  draw(major, "rgba(255,255,255,0.07)");
  ctx.restore();
}

function viewportWorld(camera: Camera, view: RenderView): { minX: number; minY: number; maxX: number; maxY: number } {
  const ox = view.rulers ? RULER_SIZE : 0;
  const oy = view.rulers ? RULER_SIZE : 0;
  const w = view.width - ox;
  const h = view.height - oy;
  const hw = w / 2 / camera.zoom;
  const hh = h / 2 / camera.zoom;
  return { minX: camera.x - hw, minY: camera.y - hh, maxX: camera.x + hw, maxY: camera.y + hh };
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  doc: Document,
  camera: Camera,
  view: RenderView,
): void {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(0, 0, view.width, view.height);
  drawGrid(ctx, camera, view);

  const vp = viewportWorld(camera, view);
  ctx.save();
  cameraTransform(ctx, camera, view);
  if (view.pixelPreview && camera.zoom >= 2) {
    ctx.imageSmoothingEnabled = false;
  } else {
    ctx.imageSmoothingEnabled = true;
  }

  const page = activePage(doc);
  const walk = (ids: string[]) => {
    for (const id of ids) {
      const node = doc.nodes[id];
      if (!node || !node.visible) continue;
      const aabb = worldAABB(doc, id);
      if (aabb.maxX < vp.minX || aabb.maxY < vp.minY || aabb.minX > vp.maxX || aabb.minY > vp.maxY) {
        continue;
      }
      drawNode(ctx, doc, node, camera.zoom);
    }
  };
  walk(page.children);
  ctx.restore();
}

function drawNode(ctx: CanvasRenderingContext2D, doc: Document, node: SceneNode, zoom: number): void {
  ctx.save();
  ctx.translate(node.x + node.width / 2, node.y + node.height / 2);
  ctx.rotate((node.rotation * Math.PI) / 180);
  ctx.translate(-node.width / 2, -node.height / 2);
  ctx.globalAlpha *= node.opacity;
  ctx.globalCompositeOperation = node.blendMode;

  const blur = node.effects.find((e): e is Extract<Effect, { type: "layer-blur" }> => e.type === "layer-blur" && e.visible);
  if (blur && blur.radius > 0) ctx.filter = `blur(${blur.radius}px)`;

  const drop = node.effects.find((e) => e.type === "drop-shadow" && e.visible);
  if (drop && drop.type === "drop-shadow") {
    ctx.save();
    ctx.shadowColor = colorToCss(drop.color);
    ctx.shadowBlur = drop.blur;
    ctx.shadowOffsetX = drop.x;
    ctx.shadowOffsetY = drop.y;
    fillShape(ctx, node);
    ctx.restore();
  } else {
    fillShape(ctx, node);
  }

  strokeShape(ctx, node);

  if (node.type === "text") drawText(ctx, node);
  if (node.type === "image") drawImage(ctx, node);

  const inner = node.effects.find((e) => e.type === "inner-shadow" && e.visible);
  if (inner && inner.type === "inner-shadow") drawInnerShadow(ctx, node, inner);

  if (isParent(node)) {
    const clip = (node.type === "frame" || node.type === "component") && node.clipContent;
    if (clip) {
      ctx.beginPath();
      pathFor(ctx, node);
      ctx.clip();
    }
    for (const cid of node.children) {
      const child = doc.nodes[cid];
      if (child && child.visible) drawNode(ctx, doc, child, zoom);
    }
  }

  ctx.filter = "none";
  ctx.restore();
}

function pathFor(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  ctx.beginPath();
  switch (node.type) {
    case "ellipse":
      ctx.ellipse(node.width / 2, node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2);
      break;
    case "polygon": {
      const pts = regularPolygon(node.sides, node.width, node.height);
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      break;
    }
    case "star": {
      const pts = starPolygon(node.points, node.innerRatio, node.width, node.height);
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      break;
    }
    case "path": {
      const pts = flattenPath(node.points, node.closed);
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      if (node.closed) ctx.closePath();
      break;
    }
    case "line":
      ctx.moveTo(0, node.height / 2);
      ctx.lineTo(node.width, node.height / 2);
      break;
    default: {
      const r =
        "cornerRadius" in node
          ? node.cornerRadius
          : { tl: 0, tr: 0, br: 0, bl: 0 };
      roundRectPath(ctx, 0, 0, node.width, node.height, r);
    }
  }
}

function fillShape(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  if (node.type === "line" || node.type === "text" || node.fills.length === 0) return;
  for (const paint of node.fills) {
    pathFor(ctx, node);
    ctx.fillStyle = applyPaint(ctx, paint, node.width, node.height);
    ctx.fill();
  }
}

function strokeShape(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  for (const stroke of node.strokes) {
    const o = strokeOffset(stroke, node.width, node.height);
    ctx.save();
    ctx.translate(o.x, o.y);
    ctx.scale(o.w / node.width || 1, o.h / node.height || 1);
    pathFor(ctx, node);
    ctx.strokeStyle = applyPaint(ctx, stroke.paint, node.width, node.height);
    ctx.lineWidth = stroke.thickness * (node.width / (o.w || 1));
    ctx.lineCap = stroke.cap;
    ctx.lineJoin = stroke.join;
    ctx.setLineDash(stroke.dash);
    ctx.stroke();
    ctx.restore();
  }
}

function drawText(ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { type: "text" }>): void {
  const t = node.text;
  ctx.font = fontCss(t);
  ctx.fillStyle = colorToCss(t.color);
  ctx.textBaseline = "alphabetic";
  const lines = wrapLines(node.characters, node.width, t.letterSpacing, (s) => ctx.measureText(s).width);
  const lh = t.fontSize * t.lineHeight;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, node.width, node.height);
  ctx.clip();
  lines.forEach((line, i) => {
    const x = lineOffsetX(t.align, line.width, node.width);
    const y = (i + 0.85) * lh;
    if (t.letterSpacing === 0) {
      ctx.fillText(line.text, x, y);
    } else {
      let cx = x;
      for (const ch of line.text) {
        ctx.fillText(ch, cx, y);
        cx += ctx.measureText(ch).width + t.letterSpacing;
      }
    }
  });
  ctx.restore();
}

function drawImage(ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { type: "image" }>): void {
  const img = preloadImage(node.src);
  pathFor(ctx, node);
  ctx.save();
  ctx.clip();
  if (!img) {
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(0, 0, node.width, node.height);
    ctx.restore();
    return;
  }
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (node.fit === "fill") {
    ctx.drawImage(img, 0, 0, node.width, node.height);
  } else {
    const scale =
      node.fit === "fit" ? Math.min(node.width / iw, node.height / ih) : Math.max(node.width / iw, node.height / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    ctx.drawImage(img, (node.width - dw) / 2, (node.height - dh) / 2, dw, dh);
  }
  ctx.restore();
}

function drawInnerShadow(
  ctx: CanvasRenderingContext2D,
  node: SceneNode,
  effect: Extract<Effect, { type: "inner-shadow" }>,
): void {
  ctx.save();
  pathFor(ctx, node);
  ctx.clip();
  ctx.shadowColor = colorToCss(effect.color);
  ctx.shadowBlur = effect.blur;
  ctx.shadowOffsetX = effect.x;
  ctx.shadowOffsetY = effect.y;
  ctx.strokeStyle = colorToCss(effect.color);
  ctx.lineWidth = 20 + effect.spread;
  pathFor(ctx, node);
  ctx.stroke();
  ctx.restore();
}
