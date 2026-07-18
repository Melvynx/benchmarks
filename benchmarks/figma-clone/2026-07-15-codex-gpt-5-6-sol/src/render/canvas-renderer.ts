import { nodeWorldBounds, transformedBounds, unionBounds, worldMatrix, worldToScreen } from "../core/geometry";
import { rgbaToCss } from "../core/export";
import { orderedNodes } from "../core/scene";
import { SpatialGrid } from "../core/spatial-index";
import type { Bounds, EditorState, Handle, Paint, Point, SceneNode } from "../core/types";

export interface RenderOverlay {
  readonly marquee?: Bounds;
  readonly draft?: SceneNode;
}

const HANDLE_SIZE = 7;
const RULER_SIZE = 24;
const SELECTION_COLOR = "#5f5ce6";
const GUIDE_COLOR = "#f5368c";

function roundedPath(context: CanvasRenderingContext2D, node: SceneNode): void {
  context.beginPath();
  context.roundRect(0, 0, node.width, node.height, [...node.cornerRadius]);
}

function starPath(context: CanvasRenderingContext2D, node: Extract<SceneNode, { type: "star" }>): void {
  const radius = Math.min(node.width, node.height) / 2;
  context.beginPath();
  for (let index = 0; index < node.points * 2; index += 1) {
    const currentRadius = index % 2 === 0 ? radius : radius * node.innerRatio;
    const angle = -Math.PI / 2 + index * Math.PI / node.points;
    const x = node.width / 2 + Math.cos(angle) * currentRadius;
    const y = node.height / 2 + Math.sin(angle) * currentRadius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function paintStyle(context: CanvasRenderingContext2D, paint: Paint, node: SceneNode): string | CanvasGradient {
  if (paint.type === "solid") return rgbaToCss(paint.color);
  const startX = paint.start.x * node.width;
  const startY = paint.start.y * node.height;
  const endX = paint.end.x * node.width;
  const endY = paint.end.y * node.height;
  const gradient = paint.type === "linear"
    ? context.createLinearGradient(startX, startY, endX, endY)
    : context.createRadialGradient(startX, startY, 0, endX, endY, Math.max(node.width, node.height));
  paint.stops.forEach((stop) => gradient.addColorStop(stop.offset, rgbaToCss(stop.color)));
  return gradient;
}

function wrapText(context: CanvasRenderingContext2D, text: string, width: number, letterSpacing: number): readonly string[] {
  const paragraphs = text.split("\n");
  const lines: string[] = [];
  paragraphs.forEach((paragraph) => {
    const words = paragraph.split(" ");
    let line = "";
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      const measured = context.measureText(candidate).width + Math.max(0, candidate.length - 1) * letterSpacing;
      if (measured > width && line) {
        lines.push(line);
        line = word;
      } else line = candidate;
    });
    lines.push(line);
  });
  return lines;
}

export class CanvasRenderer {
  readonly spatialIndex = new SpatialGrid();
  readonly #images = new Map<string, HTMLImageElement>();

  draw(canvas: HTMLCanvasElement, state: EditorState, overlay: RenderOverlay = {}): void {
    const context = canvas.getContext("2d");
    if (!context) return;
    const pixelRatio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== Math.floor(width * pixelRatio) || canvas.height !== Math.floor(height * pixelRatio)) {
      canvas.width = Math.floor(width * pixelRatio);
      canvas.height = Math.floor(height * pixelRatio);
    }
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    context.fillStyle = state.document.background;
    context.fillRect(0, 0, width, height);
    this.#drawGrid(context, width, height, state);
    const nodes = { ...state.document.nodes, ...state.previewNodes };
    this.spatialIndex.rebuild(nodes);
    context.save();
    context.translate(state.viewport.x, state.viewport.y);
    context.scale(state.viewport.zoom, state.viewport.zoom);
    state.document.rootIds.forEach((id) => this.#drawNode(context, nodes[id], nodes));
    if (overlay.draft) this.#drawNode(context, overlay.draft, { ...nodes, [overlay.draft.id]: overlay.draft });
    context.restore();
    this.#drawSelection(context, state, nodes);
    this.#drawGuides(context, state);
    if (overlay.marquee) this.#drawMarquee(context, overlay.marquee, state);
    if (state.ui.showRulers) this.#drawRulers(context, width, height, state);
  }

  #drawGrid(context: CanvasRenderingContext2D, width: number, height: number, state: EditorState): void {
    if (!state.ui.showGrid) return;
    const { viewport } = state;
    const exponent = Math.ceil(Math.log10(14 / viewport.zoom));
    const step = 10 ** exponent;
    const screenStep = step * viewport.zoom;
    const startX = ((viewport.x % screenStep) + screenStep) % screenStep;
    const startY = ((viewport.y % screenStep) + screenStep) % screenStep;
    context.save();
    context.lineWidth = 1;
    for (let x = startX; x < width; x += screenStep) {
      const worldX = Math.round((x - viewport.x) / viewport.zoom / step);
      context.strokeStyle = worldX % 5 === 0 ? "rgba(48,49,55,.12)" : "rgba(48,49,55,.055)";
      context.beginPath(); context.moveTo(Math.round(x) + 0.5, 0); context.lineTo(Math.round(x) + 0.5, height); context.stroke();
    }
    for (let y = startY; y < height; y += screenStep) {
      const worldY = Math.round((y - viewport.y) / viewport.zoom / step);
      context.strokeStyle = worldY % 5 === 0 ? "rgba(48,49,55,.12)" : "rgba(48,49,55,.055)";
      context.beginPath(); context.moveTo(0, Math.round(y) + 0.5); context.lineTo(width, Math.round(y) + 0.5); context.stroke();
    }
    context.restore();
  }

  #drawNode(context: CanvasRenderingContext2D, node: SceneNode | undefined, nodes: Readonly<Record<string, SceneNode>>): void {
    if (!node?.visible) return;
    context.save();
    context.translate(node.x + node.width / 2, node.y + node.height / 2);
    context.rotate(node.rotation * Math.PI / 180);
    context.translate(-node.width / 2, -node.height / 2);
    context.globalAlpha *= node.opacity;
    context.globalCompositeOperation = node.blendMode;
    const blur = node.effects.find((effect) => effect.visible && effect.type === "layer-blur");
    if (blur?.type === "layer-blur") context.filter = `blur(${blur.radius}px)`;
    const shadow = node.effects.find((effect) => effect.visible && effect.type === "drop-shadow");
    if (shadow?.type === "drop-shadow") {
      context.shadowColor = rgbaToCss(shadow.color);
      context.shadowBlur = shadow.blur;
      context.shadowOffsetX = shadow.offset.x;
      context.shadowOffsetY = shadow.offset.y;
    }
    if (node.type !== "group") this.#drawShape(context, node);
    context.shadowColor = "transparent";
    context.filter = "none";
    if ("children" in node) {
      if (node.type !== "group" && node.clipContent) {
        roundedPath(context, node);
        context.clip();
      }
      node.children.forEach((id) => this.#drawNode(context, nodes[id], nodes));
    }
    context.restore();
  }

  #drawShape(context: CanvasRenderingContext2D, node: Exclude<SceneNode, { type: "group" }>): void {
    if (node.type === "text") {
      this.#drawText(context, node);
      return;
    }
    if (node.type === "image") {
      this.#drawImage(context, node);
      return;
    }
    if (node.type === "instance") {
      context.fillStyle = "rgba(95,92,230,.1)";
      context.strokeStyle = SELECTION_COLOR;
      context.setLineDash([5, 4]);
      context.fillRect(0, 0, node.width, node.height);
      context.strokeRect(0, 0, node.width, node.height);
      return;
    }
    if (node.type === "ellipse") {
      context.beginPath();
      context.ellipse(node.width / 2, node.height / 2, node.width / 2, node.height / 2, 0, 0, Math.PI * 2);
    } else if (node.type === "line") {
      context.beginPath(); context.moveTo(0, 0); context.lineTo(node.width, node.height);
    } else if (node.type === "star") starPath(context, node);
    else roundedPath(context, node);
    const paint = node.fills.find((fill) => fill.visible);
    if (paint) {
      context.fillStyle = paintStyle(context, paint, node);
      context.fill();
    }
    if (node.stroke.visible && node.stroke.width > 0) {
      context.strokeStyle = rgbaToCss(node.stroke.color);
      context.lineWidth = node.stroke.width;
      context.setLineDash([...node.stroke.dash]);
      context.stroke();
      context.setLineDash([]);
    }
  }

  #drawText(context: CanvasRenderingContext2D, node: Extract<SceneNode, { type: "text" }>): void {
    const paint = node.fills.find((fill) => fill.visible);
    context.fillStyle = paint ? paintStyle(context, paint, node) : "#1e1e22";
    context.font = `${node.italic ? "italic " : ""}${node.fontWeight} ${node.fontSize}px "${node.fontFamily}", sans-serif`;
    context.textBaseline = "top";
    context.textAlign = node.textAlign;
    const x = node.textAlign === "center" ? node.width / 2 : node.textAlign === "right" || node.textAlign === "end" ? node.width : 0;
    const lines = wrapText(context, node.text, node.width, node.letterSpacing);
    lines.forEach((line, index) => {
      if ("letterSpacing" in context) context.letterSpacing = `${node.letterSpacing}px`;
      context.fillText(line, x, index * node.fontSize * node.lineHeight, node.width);
    });
  }

  #drawImage(context: CanvasRenderingContext2D, node: Extract<SceneNode, { type: "image" }>): void {
    const cached = this.#images.get(node.src);
    if (!cached) {
      const image = new Image();
      image.onload = () => window.dispatchEvent(new Event("editor-image-loaded"));
      image.src = node.src;
      this.#images.set(node.src, image);
      context.fillStyle = "#d9dadd";
      context.fillRect(0, 0, node.width, node.height);
      return;
    }
    if (!cached.complete || cached.naturalWidth === 0) return;
    roundedPath(context, node);
    context.save(); context.clip();
    if (node.fit === "fill") context.drawImage(cached, 0, 0, node.width, node.height);
    else {
      const ratio = node.fit === "cover" ? Math.max(node.width / cached.naturalWidth, node.height / cached.naturalHeight) : Math.min(node.width / cached.naturalWidth, node.height / cached.naturalHeight);
      const width = cached.naturalWidth * ratio;
      const height = cached.naturalHeight * ratio;
      context.drawImage(cached, (node.width - width) / 2, (node.height - height) / 2, width, height);
    }
    context.restore();
  }

  #drawSelection(context: CanvasRenderingContext2D, state: EditorState, nodes: Readonly<Record<string, SceneNode>>): void {
    const selected = state.selection.flatMap((id) => nodes[id] ? [nodes[id]] : []);
    if (selected.length === 0) return;
    context.save();
    context.strokeStyle = SELECTION_COLOR;
    context.fillStyle = "white";
    context.lineWidth = 1;
    if (selected.length === 1) {
      const node = selected[0];
      if (!node) return;
      const matrix = worldMatrix(node, nodes);
      const corners = [
        { x: 0, y: 0 }, { x: node.width / 2, y: 0 }, { x: node.width, y: 0 }, { x: node.width, y: node.height / 2 },
        { x: node.width, y: node.height }, { x: node.width / 2, y: node.height }, { x: 0, y: node.height }, { x: 0, y: node.height / 2 },
      ].map((value) => worldToScreen({ x: matrix.a * value.x + matrix.c * value.y + matrix.e, y: matrix.b * value.x + matrix.d * value.y + matrix.f }, state.viewport));
      context.beginPath();
      corners.filter((_, index) => index % 2 === 0).forEach((corner, index) => index === 0 ? context.moveTo(corner.x, corner.y) : context.lineTo(corner.x, corner.y));
      context.closePath(); context.stroke();
      corners.forEach((corner) => this.#handle(context, corner));
      const top = corners[1];
      if (top) {
        const rotation = node.rotation * Math.PI / 180;
        const rotateHandle = { x: top.x + Math.sin(rotation) * -28, y: top.y + Math.cos(rotation) * -28 };
        context.beginPath(); context.moveTo(top.x, top.y); context.lineTo(rotateHandle.x, rotateHandle.y); context.stroke();
        context.beginPath(); context.arc(rotateHandle.x, rotateHandle.y, HANDLE_SIZE / 2, 0, Math.PI * 2); context.fill(); context.stroke();
      }
    } else {
      const bounds = unionBounds(selected.map((node) => nodeWorldBounds(node, nodes)));
      if (!bounds) return;
      const topLeft = worldToScreen({ x: bounds.x, y: bounds.y }, state.viewport);
      const bottomRight = worldToScreen({ x: bounds.x + bounds.width, y: bounds.y + bounds.height }, state.viewport);
      context.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    }
    context.restore();
  }

  #handle(context: CanvasRenderingContext2D, value: Point): void {
    context.fillRect(value.x - HANDLE_SIZE / 2, value.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
    context.strokeRect(value.x - HANDLE_SIZE / 2, value.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
  }

  #drawGuides(context: CanvasRenderingContext2D, state: EditorState): void {
    if (state.guides.length === 0) return;
    context.save(); context.strokeStyle = GUIDE_COLOR; context.fillStyle = GUIDE_COLOR; context.lineWidth = 1;
    state.guides.forEach((guide) => {
      const start = worldToScreen(guide.axis === "x" ? { x: guide.value, y: guide.from } : { x: guide.from, y: guide.value }, state.viewport);
      const end = worldToScreen(guide.axis === "x" ? { x: guide.value, y: guide.to } : { x: guide.to, y: guide.value }, state.viewport);
      context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
      if (guide.label) {
        const x = (start.x + end.x) / 2;
        const y = (start.y + end.y) / 2;
        context.font = "600 10px Inter, sans-serif";
        const width = context.measureText(guide.label).width + 10;
        context.fillRect(x - width / 2, y - 9, width, 18);
        context.fillStyle = "white"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(guide.label, x, y);
        context.fillStyle = GUIDE_COLOR;
      }
    });
    context.restore();
  }

  #drawMarquee(context: CanvasRenderingContext2D, bounds: Bounds, state: EditorState): void {
    const topLeft = worldToScreen({ x: bounds.x, y: bounds.y }, state.viewport);
    context.save();
    context.fillStyle = "rgba(95,92,230,.10)"; context.strokeStyle = SELECTION_COLOR; context.lineWidth = 1;
    context.fillRect(topLeft.x, topLeft.y, bounds.width * state.viewport.zoom, bounds.height * state.viewport.zoom);
    context.strokeRect(topLeft.x, topLeft.y, bounds.width * state.viewport.zoom, bounds.height * state.viewport.zoom);
    context.restore();
  }

  #drawRulers(context: CanvasRenderingContext2D, width: number, height: number, state: EditorState): void {
    context.save();
    context.fillStyle = "rgba(246,246,248,.96)";
    context.fillRect(0, 0, width, RULER_SIZE); context.fillRect(0, 0, RULER_SIZE, height);
    context.strokeStyle = "rgba(30,30,34,.14)"; context.lineWidth = 1;
    context.beginPath(); context.moveTo(0, RULER_SIZE - .5); context.lineTo(width, RULER_SIZE - .5); context.moveTo(RULER_SIZE - .5, 0); context.lineTo(RULER_SIZE - .5, height); context.stroke();
    const exponent = Math.ceil(Math.log10(52 / state.viewport.zoom));
    const step = 10 ** exponent;
    context.font = "500 9px Inter, sans-serif"; context.fillStyle = "#77777d";
    const startWorldX = Math.floor((-state.viewport.x) / state.viewport.zoom / step) * step;
    for (let value = startWorldX; value < (width - state.viewport.x) / state.viewport.zoom; value += step) {
      const x = value * state.viewport.zoom + state.viewport.x;
      context.beginPath(); context.moveTo(x + .5, RULER_SIZE); context.lineTo(x + .5, RULER_SIZE - 7); context.stroke(); context.fillText(String(Math.round(value)), x + 3, 10);
    }
    const startWorldY = Math.floor((-state.viewport.y) / state.viewport.zoom / step) * step;
    for (let value = startWorldY; value < (height - state.viewport.y) / state.viewport.zoom; value += step) {
      const y = value * state.viewport.zoom + state.viewport.y;
      context.beginPath(); context.moveTo(RULER_SIZE, y + .5); context.lineTo(RULER_SIZE - 7, y + .5); context.stroke();
      context.save(); context.translate(9, y + 3); context.rotate(-Math.PI / 2); context.fillText(String(Math.round(value)), 0, 0); context.restore();
    }
    context.fillStyle = "#eeeef1"; context.fillRect(0, 0, RULER_SIZE, RULER_SIZE);
    context.restore();
  }
}

export function selectionHandleAt(state: EditorState, screen: Point): Handle | null {
  if (state.selection.length !== 1) return null;
  const nodes = { ...state.document.nodes, ...state.previewNodes };
  const node = nodes[state.selection[0] ?? ""];
  if (!node) return null;
  const matrix = worldMatrix(node, nodes);
  const positions: readonly [Handle, Point][] = [
    ["nw", { x: 0, y: 0 }], ["n", { x: node.width / 2, y: 0 }], ["ne", { x: node.width, y: 0 }], ["e", { x: node.width, y: node.height / 2 }],
    ["se", { x: node.width, y: node.height }], ["s", { x: node.width / 2, y: node.height }], ["sw", { x: 0, y: node.height }], ["w", { x: 0, y: node.height / 2 }],
  ];
  const rotation = node.rotation * Math.PI / 180;
  const top = worldToScreen({ x: matrix.a * node.width / 2 + matrix.e, y: matrix.b * node.width / 2 + matrix.f }, state.viewport);
  const rotatePosition = { x: top.x + Math.sin(rotation) * -28, y: top.y + Math.cos(rotation) * -28 };
  if (Math.hypot(screen.x - rotatePosition.x, screen.y - rotatePosition.y) <= 8) return "rotate";
  return positions.find(([, local]) => {
    const world = { x: matrix.a * local.x + matrix.c * local.y + matrix.e, y: matrix.b * local.x + matrix.d * local.y + matrix.f };
    const position = worldToScreen(world, state.viewport);
    return Math.abs(screen.x - position.x) <= 7 && Math.abs(screen.y - position.y) <= 7;
  })?.[0] ?? null;
}
