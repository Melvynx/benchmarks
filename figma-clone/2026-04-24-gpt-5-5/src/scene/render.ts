import type { Bounds } from "../geometry/bounds";
import { boundsFromPoints, nodeCorners } from "../geometry/bounds";
import { polygonPoints } from "../geometry/hitTest";
import { nodeMatrix } from "../geometry/matrix";
import { paintOrder } from "../scene/graph";
import type { EditorDocument, Fill, GradientFill, Point, RGBA, SceneNode, Stroke, Viewport } from "../types/nodes";

const imageCache = new Map<string, HTMLImageElement>();

export type RenderOptions = Readonly<{
  viewport: Viewport;
  gridVisible: boolean;
  rulersVisible: boolean;
  selection: readonly string[];
  marquee?: Bounds | null;
  smartGuides?: readonly SmartGuide[];
  editingTextId?: string | null;
}>;

export type SmartGuide = Readonly<{
  kind: "vertical" | "horizontal" | "distance";
  from: Point;
  to: Point;
  label?: string;
}>;

export function renderEditor(ctx: CanvasRenderingContext2D, document: EditorDocument, width: number, height: number, options: RenderOptions): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#eeebe4";
  ctx.fillRect(0, 0, width, height);
  drawGrid(ctx, width, height, options.viewport, options.gridVisible);

  ctx.save();
  ctx.translate(options.viewport.x, options.viewport.y);
  ctx.scale(options.viewport.zoom, options.viewport.zoom);
  for (const node of paintOrder(document)) renderNode(ctx, document, node);
  ctx.restore();

  drawSelection(ctx, document, options);
  drawSmartGuides(ctx, options);
  if (options.marquee) drawMarquee(ctx, options.marquee, options.viewport);
  if (options.rulersVisible) drawRulers(ctx, width, height, options.viewport);
  drawZoomBadge(ctx, options.viewport, width, height);
}

export function renderNode(ctx: CanvasRenderingContext2D, document: EditorDocument, node: SceneNode): void {
  if (!node.visible || node.opacity <= 0) return;
  ctx.save();
  applyAncestorClips(ctx, document, node);
  const matrix = nodeMatrix(node);
  ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
  ctx.globalAlpha *= node.opacity;
  applyEffects(ctx, node, "drop-shadow");
  renderShape(ctx, node);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.restore();
}

export function renderSelectionToCanvas(ctx: CanvasRenderingContext2D, document: EditorDocument, bounds: Bounds, scale = 2): void {
  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-bounds.x, -bounds.y);
  for (const node of paintOrder(document)) {
    if (document.selection.includes(node.id) || document.selection.some((id) => isDescendant(document, node.id, id))) renderNode(ctx, document, node);
  }
  ctx.restore();
}

function renderShape(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  switch (node.type) {
    case "rectangle":
    case "frame":
    case "image":
      roundedRectPath(ctx, 0, 0, node.width, node.height, radii(node.cornerRadius));
      break;
    case "ellipse":
      ctx.beginPath();
      ctx.ellipse(node.width / 2, node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2);
      break;
    case "line":
      drawLinePath(ctx, node);
      break;
    case "polygon": {
      ctx.beginPath();
      for (const [index, point] of polygonPoints(node.width, node.height, node.sides, node.star, node.innerRadius).entries()) {
        if (index === 0) ctx.moveTo(point.x, point.y);
        else ctx.lineTo(point.x, point.y);
      }
      ctx.closePath();
      break;
    }
    case "text":
      drawText(ctx, node);
      return;
  }

  if (node.type === "image") drawImageFill(ctx, node);
  else fillPath(ctx, node.fills, node.width, node.height);
  strokePath(ctx, node.strokes);
}

function drawText(ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { type: "text" }>): void {
  const fill = node.fills[0];
  ctx.fillStyle = fill && fill.kind === "solid" ? rgba(fill.color) : "#1f2123";
  ctx.font = `${node.fontWeight} ${node.fontSize}px "${node.fontFamily}", sans-serif`;
  ctx.textAlign = node.align;
  ctx.textBaseline = "top";
  const lines = node.text.split("\n");
  const linePx = node.fontSize * node.lineHeight;
  const totalHeight = lines.length * linePx;
  let y = node.verticalAlign === "middle" ? (node.height - totalHeight) / 2 : node.verticalAlign === "bottom" ? node.height - totalHeight : 0;
  const x = node.align === "center" ? node.width / 2 : node.align === "right" ? node.width : 0;
  for (const line of lines) {
    if (node.letterSpacing === 0) {
      ctx.fillText(line, x, y);
    } else {
      drawLetterSpaced(ctx, line, x, y, node.letterSpacing, node.align);
    }
    y += linePx;
  }
}

function drawLetterSpaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number, align: CanvasTextAlign): void {
  const chars = [...text];
  const width = chars.reduce((sum, char) => sum + ctx.measureText(char).width, 0) + Math.max(0, chars.length - 1) * spacing;
  let cursor = align === "center" ? x - width / 2 : align === "right" ? x - width : x;
  for (const char of chars) {
    ctx.fillText(char, cursor, y);
    cursor += ctx.measureText(char).width + spacing;
  }
}

function drawImageFill(ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { type: "image" }>): void {
  const image = imageCache.get(node.src) ?? new Image();
  if (!imageCache.has(node.src)) {
    image.src = node.src;
    image.onload = () => window.dispatchEvent(new Event("atelier:image-loaded"));
    imageCache.set(node.src, image);
  }
  if (!image.complete || image.naturalWidth === 0) {
    ctx.fillStyle = "#d8d2c7";
    ctx.fill();
    return;
  }
  ctx.save();
  ctx.clip();
  const scale = node.fit === "contain" ? Math.min(node.width / image.naturalWidth, node.height / image.naturalHeight) : Math.max(node.width / image.naturalWidth, node.height / image.naturalHeight);
  const drawWidth = node.fit === "fill" ? node.width : image.naturalWidth * scale;
  const drawHeight = node.fit === "fill" ? node.height : image.naturalHeight * scale;
  ctx.drawImage(image, (node.width - drawWidth) / 2, (node.height - drawHeight) / 2, drawWidth, drawHeight);
  ctx.restore();
  strokePath(ctx, node.strokes);
}

function fillPath(ctx: CanvasRenderingContext2D, fills: readonly Fill[], width: number, height: number): void {
  if (fills.length === 0) return;
  for (const fill of fills) {
    ctx.fillStyle = paint(ctx, fill, width, height);
    ctx.fill();
  }
}

function strokePath(ctx: CanvasRenderingContext2D, strokes: readonly Stroke[]): void {
  for (const stroke of strokes) {
    if (stroke.width <= 0 || stroke.color.a <= 0) continue;
    ctx.strokeStyle = rgba(stroke.color);
    ctx.lineWidth = stroke.width;
    ctx.setLineDash([...stroke.dash]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function paint(ctx: CanvasRenderingContext2D, fill: Fill, width: number, height: number): string | CanvasGradient {
  if (fill.kind === "solid") return rgba(fill.color);
  return gradient(ctx, fill, width, height);
}

function gradient(ctx: CanvasRenderingContext2D, fill: GradientFill, width: number, height: number): CanvasGradient {
  const result = fill.kind === "linear"
    ? ctx.createLinearGradient(fill.from.x * width, fill.from.y * height, fill.to.x * width, fill.to.y * height)
    : ctx.createRadialGradient(fill.from.x * width, fill.from.y * height, 0, fill.to.x * width, fill.to.y * height, Math.max(width, height));
  for (const stop of fill.stops) result.addColorStop(stop.offset, rgba(stop.color));
  return result;
}

function applyEffects(ctx: CanvasRenderingContext2D, node: SceneNode, kind: "drop-shadow"): void {
  const shadow = node.effects.find((effect) => effect.kind === kind);
  if (!shadow || shadow.kind !== "drop-shadow") return;
  ctx.shadowColor = rgba(shadow.color);
  ctx.shadowBlur = shadow.blur;
  ctx.shadowOffsetX = shadow.offsetX;
  ctx.shadowOffsetY = shadow.offsetY;
}

function applyAncestorClips(ctx: CanvasRenderingContext2D, document: EditorDocument, node: SceneNode): void {
  const ancestors: SceneNode[] = [];
  let current = node.parentId;
  while (current && current !== document.rootId) {
    const ancestor = document.nodes[current];
    if (ancestor) ancestors.unshift(ancestor);
    current = ancestor?.parentId ?? null;
  }
  for (const ancestor of ancestors) {
    if (ancestor.type !== "frame" || !ancestor.clip) continue;
    ctx.save();
    const matrix = nodeMatrix(ancestor);
    ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    roundedRectPath(ctx, 0, 0, ancestor.width, ancestor.height, radii(ancestor.cornerRadius));
    ctx.restore();
    ctx.clip();
  }
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: [number, number, number, number]): void {
  const [tl, tr, br, bl] = radius.map((value) => Math.min(value, width / 2, height / 2)) as [number, number, number, number];
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.lineTo(x + width - tr, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + tr);
  ctx.lineTo(x + width, y + height - br);
  ctx.quadraticCurveTo(x + width, y + height, x + width - br, y + height);
  ctx.lineTo(x + bl, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - bl);
  ctx.lineTo(x, y + tl);
  ctx.quadraticCurveTo(x, y, x + tl, y);
  ctx.closePath();
}

function drawLinePath(ctx: CanvasRenderingContext2D, node: Extract<SceneNode, { type: "line" }>): void {
  ctx.beginPath();
  ctx.moveTo(node.points[0].x, node.points[0].y);
  ctx.lineTo(node.points[1].x, node.points[1].y);
}

function radii(radius: number | { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }): [number, number, number, number] {
  return typeof radius === "number" ? [radius, radius, radius, radius] : [radius.topLeft, radius.topRight, radius.bottomRight, radius.bottomLeft];
}

export function rgba(color: RGBA): string {
  return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
}

function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, viewport: Viewport, visible: boolean): void {
  if (!visible) return;
  const base = chooseGridStep(viewport.zoom);
  const step = base * viewport.zoom;
  const startX = ((viewport.x % step) + step) % step;
  const startY = ((viewport.y % step) + step) % step;
  ctx.save();
  ctx.strokeStyle = "rgba(31, 33, 35, 0.055)";
  ctx.lineWidth = 1;
  for (let x = startX; x < width; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = startY; y < height; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.restore();
}

function chooseGridStep(zoom: number): number {
  if (zoom < 0.2) return 400;
  if (zoom < 0.5) return 200;
  if (zoom < 1) return 100;
  if (zoom < 2) return 50;
  if (zoom < 8) return 10;
  return 1;
}

function drawSelection(ctx: CanvasRenderingContext2D, document: EditorDocument, options: RenderOptions): void {
  for (const id of options.selection) {
    const node = document.nodes[id];
    if (!node) continue;
    const points = nodeCorners(node).map((point) => ({ x: point.x * options.viewport.zoom + options.viewport.x, y: point.y * options.viewport.zoom + options.viewport.y }));
    ctx.save();
    ctx.strokeStyle = "#ec2b76";
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    points.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
    drawHandles(ctx, points, options.editingTextId === id);
    ctx.restore();
  }
}

function drawHandles(ctx: CanvasRenderingContext2D, points: readonly Point[], textEditing: boolean): void {
  if (textEditing) return;
  const bounds = boundsFromPoints(points);
  const handlePoints = [
    points[0],
    midpoint(points[0], points[1]),
    points[1],
    midpoint(points[1], points[2]),
    points[2],
    midpoint(points[2], points[3]),
    points[3],
    midpoint(points[3], points[0]),
  ];
  ctx.fillStyle = "#fffaf2";
  ctx.strokeStyle = "#ec2b76";
  for (const point of handlePoints) {
    ctx.beginPath();
    ctx.rect(point.x - 4, point.y - 4, 8, 8);
    ctx.fill();
    ctx.stroke();
  }
  const rotation = { x: bounds.x + bounds.width / 2, y: bounds.y - 30 };
  ctx.beginPath();
  ctx.moveTo(bounds.x + bounds.width / 2, bounds.y);
  ctx.lineTo(rotation.x, rotation.y);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(rotation.x, rotation.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawSmartGuides(ctx: CanvasRenderingContext2D, options: RenderOptions): void {
  for (const guide of options.smartGuides ?? []) {
    const from = { x: guide.from.x * options.viewport.zoom + options.viewport.x, y: guide.from.y * options.viewport.zoom + options.viewport.y };
    const to = { x: guide.to.x * options.viewport.zoom + options.viewport.x, y: guide.to.y * options.viewport.zoom + options.viewport.y };
    ctx.save();
    ctx.strokeStyle = "#ec2b76";
    ctx.lineWidth = 1;
    ctx.setLineDash(guide.kind === "distance" ? [4, 4] : []);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    if (guide.label) {
      ctx.fillStyle = "#ec2b76";
      ctx.fillRect((from.x + to.x) / 2 - 16, (from.y + to.y) / 2 - 10, 32, 18);
      ctx.fillStyle = "#fff";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(guide.label, (from.x + to.x) / 2, (from.y + to.y) / 2);
    }
    ctx.restore();
  }
}

function drawMarquee(ctx: CanvasRenderingContext2D, marquee: Bounds, viewport: Viewport): void {
  const x = marquee.x * viewport.zoom + viewport.x;
  const y = marquee.y * viewport.zoom + viewport.y;
  ctx.save();
  ctx.fillStyle = "rgba(236, 43, 118, 0.08)";
  ctx.strokeStyle = "#ec2b76";
  ctx.setLineDash([4, 4]);
  ctx.fillRect(x, y, marquee.width * viewport.zoom, marquee.height * viewport.zoom);
  ctx.strokeRect(x, y, marquee.width * viewport.zoom, marquee.height * viewport.zoom);
  ctx.restore();
}

function drawRulers(ctx: CanvasRenderingContext2D, width: number, height: number, viewport: Viewport): void {
  ctx.save();
  ctx.fillStyle = "rgba(248, 246, 240, 0.92)";
  ctx.fillRect(0, 0, width, 24);
  ctx.fillRect(0, 0, 24, height);
  ctx.strokeStyle = "rgba(31, 33, 35, 0.16)";
  ctx.strokeRect(23.5, 23.5, width, height);
  ctx.fillStyle = "rgba(31, 33, 35, 0.62)";
  ctx.font = "10px Inter, sans-serif";
  const step = chooseGridStep(viewport.zoom) * viewport.zoom;
  for (let x = ((viewport.x % step) + step) % step; x < width; x += step) {
    const value = Math.round((x - viewport.x) / viewport.zoom);
    ctx.fillRect(x, 16, 1, 8);
    if (x > 40) ctx.fillText(String(value), x + 4, 13);
  }
  for (let y = ((viewport.y % step) + step) % step; y < height; y += step) {
    const value = Math.round((y - viewport.y) / viewport.zoom);
    ctx.fillRect(16, y, 8, 1);
    if (y > 40) ctx.fillText(String(value), 3, y - 4);
  }
  ctx.restore();
}

function drawZoomBadge(ctx: CanvasRenderingContext2D, viewport: Viewport, width: number, height: number): void {
  const text = `${Math.round(viewport.zoom * 100)}%`;
  ctx.save();
  ctx.fillStyle = "rgba(31, 33, 35, 0.78)";
  ctx.roundRect(width - 86, height - 42, 68, 28, 6);
  ctx.fill();
  ctx.fillStyle = "#fffaf2";
  ctx.font = "12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width - 52, height - 28);
  ctx.restore();
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function isDescendant(document: EditorDocument, nodeId: string, ancestorId: string): boolean {
  let current = document.nodes[nodeId]?.parentId;
  while (current) {
    if (current === ancestorId) return true;
    current = document.nodes[current]?.parentId ?? null;
  }
  return false;
}
