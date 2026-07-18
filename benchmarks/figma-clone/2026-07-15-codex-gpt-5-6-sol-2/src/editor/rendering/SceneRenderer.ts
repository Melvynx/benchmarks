import { transformRectBounds, transformRectCorners } from '@/core/geometry/bounds';
import {
  composeMatrices,
  degreesToRadians,
  IDENTITY_MATRIX,
  rotationMatrixDegrees,
  translationMatrix,
} from '@/core/geometry/matrix2d';
import { unionAabb } from '@/core/geometry/rect';

import type { Matrix2D } from '@/core/geometry/matrix2d';
import type { AABB } from '@/core/geometry/rect';
import type { Vec2 } from '@/core/geometry/vec2';
import type {
  BlendMode,
  Paint,
  RgbaColor,
  SceneDocument,
  SceneNode,
  Stroke,
} from '@/core/model/types';
import type { EditorSession } from '@/editor/sessionTypes';
import type { SceneRuntime } from '@/editor/sceneRuntime';

const RULER_SIZE = 20;
const HANDLE_SIZE = 7;
const HANDLE_HIT_SIZE = 18;
const ROTATION_HANDLE_OFFSET = 25;
const GRID_MIN_SCREEN_SPACING = 22;
const GRID_MAJOR_EVERY = 5;

const BLEND_MODES = {
  normal: 'source-over',
  multiply: 'multiply',
  screen: 'screen',
  overlay: 'overlay',
  darken: 'darken',
  lighten: 'lighten',
  'color-dodge': 'color-dodge',
  'color-burn': 'color-burn',
  'hard-light': 'hard-light',
  'soft-light': 'soft-light',
  difference: 'difference',
  exclusion: 'exclusion',
  hue: 'hue',
  saturation: 'saturation',
  color: 'color',
  luminosity: 'luminosity',
} as const satisfies Record<BlendMode, GlobalCompositeOperation>;

export type TransformHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotate';

export interface NodeRenderOverride {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly rotation?: number;
  readonly opacity?: number;
}

export type NodeRenderOverrides = ReadonlyMap<string, NodeRenderOverride>;

interface DrawnNode {
  readonly node: SceneNode;
  /** The effective geometry after the current non-destructive transform preview. */
  readonly values: DrawValues;
  readonly matrix: Matrix2D;
  readonly bounds: AABB;
}

interface HandleLocation {
  readonly kind: TransformHandle;
  readonly point: Vec2;
}

interface DrawValues {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly opacity: number;
}

function getDrawValues(node: SceneNode, override: NodeRenderOverride | undefined): DrawValues {
  return {
    x: override?.x ?? node.x,
    y: override?.y ?? node.y,
    width: Math.max(0.01, override?.width ?? node.width),
    height: Math.max(0.01, override?.height ?? node.height),
    rotation: override?.rotation ?? node.rotation,
    opacity: override?.opacity ?? node.opacity,
  };
}

function rgba(color: RgbaColor, opacity = 1) {
  const red = Math.round(Math.max(0, Math.min(1, color.r)) * 255);
  const green = Math.round(Math.max(0, Math.min(1, color.g)) * 255);
  const blue = Math.round(Math.max(0, Math.min(1, color.b)) * 255);
  const alpha = Math.max(0, Math.min(1, color.a * opacity));
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

function normalizePaintPoint(value: number, size: number) {
  return Math.abs(value) <= 1 ? value * size : value;
}

function paintStyle(
  context: CanvasRenderingContext2D,
  paint: Paint,
  width: number,
  height: number,
): string | CanvasGradient {
  if (paint.type === 'solid') return rgba(paint.color, paint.opacity);

  if (paint.type === 'linear-gradient') {
    const gradient = context.createLinearGradient(
      normalizePaintPoint(paint.start.x, width),
      normalizePaintPoint(paint.start.y, height),
      normalizePaintPoint(paint.end.x, width),
      normalizePaintPoint(paint.end.y, height),
    );
    for (const stop of paint.stops)
      gradient.addColorStop(stop.position, rgba(stop.color, paint.opacity));
    return gradient;
  }

  const centerX = normalizePaintPoint(paint.center.x, width);
  const centerY = normalizePaintPoint(paint.center.y, height);
  const radius = Math.max(
    0.01,
    normalizePaintPoint(Math.max(paint.radius.x, paint.radius.y), Math.max(width, height)),
  );
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  for (const stop of paint.stops)
    gradient.addColorStop(stop.position, rgba(stop.color, paint.opacity));
  return gradient;
}

function createNodePath(context: CanvasRenderingContext2D, node: SceneNode, values: DrawValues) {
  context.beginPath();
  appendNodePath(context, node, values);
}

/** Appends a closed silhouette where one exists. Lines intentionally remain open paths. */
function appendNodePath(context: CanvasRenderingContext2D, node: SceneNode, values: DrawValues) {
  const { width, height } = values;

  switch (node.type) {
    case 'ellipse': {
      const start = degreesToRadians(node.arcStart);
      const end = degreesToRadians(node.arcEnd);
      context.ellipse(width / 2, height / 2, width / 2, height / 2, 0, start, end || Math.PI * 2);
      if (node.innerRadius > 0) {
        context.ellipse(
          width / 2,
          height / 2,
          (width / 2) * node.innerRadius,
          (height / 2) * node.innerRadius,
          0,
          end || Math.PI * 2,
          start,
          true,
        );
      }
      context.closePath();
      break;
    }
    case 'line':
      context.moveTo(
        scaleLineCoordinate(node.start.x, node.width, values.width),
        scaleLineCoordinate(node.start.y, node.height, values.height),
      );
      context.lineTo(
        scaleLineCoordinate(node.end.x, node.width, values.width),
        scaleLineCoordinate(node.end.y, node.height, values.height),
      );
      break;
    case 'polygon':
      tracePolygon(context, width, height, node.pointCount, 1);
      break;
    case 'star':
      tracePolygon(context, width, height, node.pointCount, node.innerRadius);
      break;
    default:
      context.roundRect(0, 0, width, height, [
        node.cornerRadii.topLeft,
        node.cornerRadii.topRight,
        node.cornerRadii.bottomRight,
        node.cornerRadii.bottomLeft,
      ]);
  }
}

function scaleLineCoordinate(coordinate: number, originalSize: number, renderedSize: number) {
  // Lines created by the editor use (0, 0) -> (width, height). Preserve that local
  // endpoint contract during transform previews; a zero-size axis stays degenerate.
  return Math.abs(originalSize) < 0.0001 ? coordinate : coordinate * (renderedSize / originalSize);
}

function supportsClosedPath(node: SceneNode) {
  return node.type !== 'group' && node.type !== 'line' && node.type !== 'text';
}

function createInverseNodePath(
  context: CanvasRenderingContext2D,
  node: SceneNode,
  values: DrawValues,
  padding: number,
) {
  context.beginPath();
  context.rect(-padding, -padding, values.width + padding * 2, values.height + padding * 2);
  appendNodePath(context, node, values);
}

function tracePolygon(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pointCount: number,
  innerRatio: number,
) {
  const count = innerRatio < 1 ? pointCount * 2 : pointCount;
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (index / count) * Math.PI * 2;
    const radius = innerRatio < 1 && index % 2 === 1 ? innerRatio : 1;
    const x = width / 2 + Math.cos(angle) * (width / 2) * radius;
    const y = height / 2 + Math.sin(angle) * (height / 2) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
}

function applyStroke(
  context: CanvasRenderingContext2D,
  node: SceneNode,
  stroke: Stroke,
  width: number,
  height: number,
) {
  if (!stroke.visible || stroke.width <= 0 || !stroke.paint.visible) return;
  context.save();
  context.strokeStyle = paintStyle(context, stroke.paint, width, height);
  context.lineWidth = stroke.width;
  context.lineJoin = stroke.join;
  context.lineCap =
    stroke.cap === 'none' || stroke.cap === 'arrow' || stroke.cap === 'triangle'
      ? 'butt'
      : stroke.cap;
  context.miterLimit = stroke.miterLimit;
  context.setLineDash([...stroke.dash]);

  // Canvas only has centered strokes. Clipping the centered stroke gives exact inside
  // and outside semantics for every closed Canvas path without changing the fill.
  if (stroke.align !== 'center' && supportsClosedPath(node)) {
    const padding = Math.max(stroke.width * 2, width, height, 1);
    if (stroke.align === 'inside') {
      createNodePath(context, node, { ...getDrawValues(node, undefined), width, height });
      context.clip();
    } else {
      createInverseNodePath(
        context,
        node,
        { ...getDrawValues(node, undefined), width, height },
        padding,
      );
      context.clip('evenodd');
      createNodePath(context, node, { ...getDrawValues(node, undefined), width, height });
    }
  }
  context.stroke();
  context.restore();
}

function getAdaptiveGridStep(zoom: number) {
  const targetWorldStep = GRID_MIN_SCREEN_SPACING / zoom;
  const exponent = 10 ** Math.floor(Math.log10(targetWorldStep));
  const normalized = targetWorldStep / exponent;
  const multiplier = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return multiplier * exponent;
}

function worldToScreen(point: Vec2, session: EditorSession): Vec2 {
  return {
    x: point.x * session.camera.zoom + session.camera.x,
    y: point.y * session.camera.zoom + session.camera.y,
  };
}

export function screenToWorld(point: Vec2, session: EditorSession): Vec2 {
  return {
    x: (point.x - session.camera.x) / session.camera.zoom,
    y: (point.y - session.camera.y) / session.camera.zoom,
  };
}

export class SceneRenderer {
  readonly #sceneCanvas: HTMLCanvasElement;
  readonly #overlayCanvas: HTMLCanvasElement;
  readonly #backdropCanvas: HTMLCanvasElement;
  readonly #imageCache = new Map<string, HTMLImageElement>();
  readonly #drawnNodes = new Map<string, DrawnNode>();
  readonly #handleLocations: HandleLocation[] = [];
  #devicePixelRatio = 1;
  #width = 0;
  #height = 0;
  #invalidate: () => void;

  constructor(
    sceneCanvas: HTMLCanvasElement,
    overlayCanvas: HTMLCanvasElement,
    invalidate: () => void,
  ) {
    this.#sceneCanvas = sceneCanvas;
    this.#overlayCanvas = overlayCanvas;
    this.#backdropCanvas = document.createElement('canvas');
    this.#invalidate = invalidate;
  }

  resize(width: number, height: number) {
    this.#width = Math.max(1, width);
    this.#height = Math.max(1, height);
    this.#devicePixelRatio = Math.max(1, window.devicePixelRatio || 1);
    for (const canvas of [this.#sceneCanvas, this.#overlayCanvas]) {
      canvas.width = Math.round(this.#width * this.#devicePixelRatio);
      canvas.height = Math.round(this.#height * this.#devicePixelRatio);
      canvas.style.width = `${this.#width}px`;
      canvas.style.height = `${this.#height}px`;
    }
    this.#backdropCanvas.width = this.#sceneCanvas.width;
    this.#backdropCanvas.height = this.#sceneCanvas.height;
  }

  render(
    runtime: SceneRuntime,
    session: EditorSession,
    overrides: NodeRenderOverrides = new Map(),
  ) {
    this.#drawScene(runtime.document, runtime, session, overrides);
    this.#drawOverlay(session);
  }

  hitTransformHandle(screenPoint: Vec2): TransformHandle | null {
    for (const handle of this.#handleLocations.toReversed()) {
      if (
        Math.abs(screenPoint.x - handle.point.x) <= HANDLE_HIT_SIZE / 2 &&
        Math.abs(screenPoint.y - handle.point.y) <= HANDLE_HIT_SIZE / 2
      ) {
        return handle.kind;
      }
    }
    return null;
  }

  getDrawnNode(id: string) {
    return this.#drawnNodes.get(id) ?? null;
  }

  #sceneContext() {
    const context = this.#sceneCanvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available for the scene renderer.');
    return context;
  }

  #overlayContext() {
    const context = this.#overlayCanvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is not available for the overlay renderer.');
    return context;
  }

  #prepareContext(context: CanvasRenderingContext2D) {
    context.setTransform(this.#devicePixelRatio, 0, 0, this.#devicePixelRatio, 0, 0);
    context.clearRect(0, 0, this.#width, this.#height);
  }

  #drawScene(
    document: SceneDocument,
    runtime: SceneRuntime,
    session: EditorSession,
    overrides: NodeRenderOverrides,
  ) {
    const context = this.#sceneContext();
    this.#prepareContext(context);
    this.#drawnNodes.clear();

    context.fillStyle = rgba(document.background);
    context.fillRect(0, 0, this.#width, this.#height);
    if (session.isGridVisible) this.#drawGrid(context, session);

    context.save();
    context.setTransform(
      this.#devicePixelRatio * session.camera.zoom,
      0,
      0,
      this.#devicePixelRatio * session.camera.zoom,
      this.#devicePixelRatio * session.camera.x,
      this.#devicePixelRatio * session.camera.y,
    );

    const viewportWorld = {
      minX: -session.camera.x / session.camera.zoom,
      minY: -session.camera.y / session.camera.zoom,
      maxX: (this.#width - session.camera.x) / session.camera.zoom,
      maxY: (this.#height - session.camera.y) / session.camera.zoom,
    };
    const visibleIds = new Set(
      runtime.getVisibleRuntimeNodes(viewportWorld).map(({ node }) => node.id),
    );
    for (const rootId of document.rootIds) {
      this.#drawNodeTree(
        context,
        document,
        rootId,
        IDENTITY_MATRIX,
        overrides,
        visibleIds,
        session.camera.zoom,
      );
    }
    context.restore();

    if (session.areRulersVisible) this.#drawRulers(context, session);
  }

  #drawNodeTree(
    context: CanvasRenderingContext2D,
    document: SceneDocument,
    nodeId: string,
    parentMatrix: Matrix2D,
    overrides: NodeRenderOverrides,
    visibleIds: ReadonlySet<string>,
    zoom: number,
  ) {
    const node = document.nodes[nodeId];
    if (!node?.visible) return;

    const values = getDrawValues(node, overrides.get(node.id));
    const localMatrix = composeMatrices(
      translationMatrix(values.x, values.y),
      rotationMatrixDegrees(values.rotation),
    );
    const worldMatrix = composeMatrices(parentMatrix, localMatrix);
    const bounds = transformRectBounds(
      { x: 0, y: 0, width: values.width, height: values.height },
      worldMatrix,
    );
    this.#drawnNodes.set(node.id, { node, values, matrix: worldMatrix, bounds });

    const isContainer = node.type === 'frame' || node.type === 'group';
    const shouldDrawSelf = visibleIds.has(node.id) || overrides.has(node.id);
    const shouldTraverse = isContainer && node.childIds.length > 0;
    if (!shouldDrawSelf && !shouldTraverse) return;

    context.save();
    context.transform(
      localMatrix.a,
      localMatrix.b,
      localMatrix.c,
      localMatrix.d,
      localMatrix.e,
      localMatrix.f,
    );
    context.globalAlpha *= values.opacity;
    context.globalCompositeOperation = BLEND_MODES[node.blendMode];

    // Effects belong to this layer, not to its descendants. Keeping this save/restore
    // boundary is especially important for a blurred or shadowed frame.
    if (shouldDrawSelf) {
      context.save();
      this.#drawBackgroundBlur(context, node, values, zoom);
      this.#applyEffects(context, node, zoom);
      if (node.type === 'text') this.#drawText(context, node, values);
      else if (node.type === 'image') this.#drawImage(context, node, values);
      else if (node.type !== 'group') this.#drawShape(context, node, values);
      this.#drawInnerShadows(context, node, values);
      context.restore();
    }

    if (shouldTraverse) {
      if (node.type === 'frame' && node.clipContent) {
        createNodePath(context, node, values);
        context.clip();
      }
      for (const childId of node.childIds) {
        this.#drawNodeTree(context, document, childId, worldMatrix, overrides, visibleIds, zoom);
      }
    }

    context.restore();
  }

  #drawShape(context: CanvasRenderingContext2D, node: SceneNode, values: DrawValues) {
    createNodePath(context, node, values);
    for (const fill of node.fills) {
      if (!fill.visible || fill.opacity <= 0 || node.type === 'line') continue;
      context.save();
      context.fillStyle = paintStyle(context, fill, values.width, values.height);
      context.globalCompositeOperation = BLEND_MODES[fill.blendMode];
      context.fill('evenodd');
      context.restore();
    }
    for (const stroke of node.strokes)
      applyStroke(context, node, stroke, values.width, values.height);
  }

  #applyEffects(context: CanvasRenderingContext2D, node: SceneNode, zoom: number) {
    const shadow = node.effects.find((effect) => effect.visible && effect.type === 'drop-shadow');
    if (shadow?.type === 'drop-shadow') {
      context.shadowColor = rgba(shadow.color);
      context.shadowOffsetX = shadow.offset.x;
      context.shadowOffsetY = shadow.offset.y;
      context.shadowBlur = shadow.blur;
    }
    const blur = node.effects.find((effect) => effect.visible && effect.type === 'layer-blur');
    if (blur?.type === 'layer-blur' && zoom > 0.2) context.filter = `blur(${blur.radius}px)`;
  }

  /**
   * Canvas has no backdrop-filter equivalent. A snapshot taken immediately before a
   * layer is rendered is the actual already-painted backdrop, so filtering that image
   * inside a closed layer silhouette is faithful for Canvas2D's painter's model.
   */
  #drawBackgroundBlur(
    context: CanvasRenderingContext2D,
    node: SceneNode,
    values: DrawValues,
    zoom: number,
  ) {
    const blur = node.effects.find((effect) => effect.visible && effect.type === 'background-blur');
    if (blur?.type !== 'background-blur' || blur.radius <= 0 || !supportsClosedPath(node)) return;

    const backdropContext = this.#backdropCanvas.getContext('2d');
    if (!backdropContext || this.#backdropCanvas.width === 0 || this.#backdropCanvas.height === 0)
      return;

    backdropContext.save();
    backdropContext.setTransform(1, 0, 0, 1, 0, 0);
    backdropContext.globalCompositeOperation = 'copy';
    backdropContext.drawImage(this.#sceneCanvas, 0, 0);
    backdropContext.restore();

    context.save();
    createNodePath(context, node, values);
    context.clip();
    // The path is already captured in backing-store coordinates by clip(), allowing a
    // screen-space backdrop image to be drawn without re-projecting it through the node.
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'source-over';
    context.filter = `blur(${blur.radius * zoom * this.#devicePixelRatio}px)`;
    context.drawImage(this.#backdropCanvas, 0, 0);
    context.restore();
  }

  #drawInnerShadows(context: CanvasRenderingContext2D, node: SceneNode, values: DrawValues) {
    if (!supportsClosedPath(node)) return;
    const shadows = node.effects.filter(
      (effect): effect is Extract<(typeof node.effects)[number], { type: 'inner-shadow' }> =>
        effect.visible && effect.type === 'inner-shadow',
    );
    for (const shadow of shadows) {
      const padding = Math.max(
        shadow.blur * 3 + Math.abs(shadow.offset.x) + Math.abs(shadow.offset.y) + shadow.spread,
        values.width,
        values.height,
        1,
      );
      context.save();
      createNodePath(context, node, values);
      context.clip();
      // Render only the exterior ring and retain its shadow where it falls inside the
      // silhouette. This avoids painting an opaque fill over the layer itself.
      createInverseNodePath(context, node, values, padding);
      context.shadowColor = rgba(shadow.color);
      context.shadowOffsetX = shadow.offset.x;
      context.shadowOffsetY = shadow.offset.y;
      context.shadowBlur = shadow.blur;
      context.fillStyle = 'rgb(0 0 0)';
      context.fill('evenodd');
      context.restore();
    }
  }

  #drawText(
    context: CanvasRenderingContext2D,
    node: Extract<SceneNode, { type: 'text' }>,
    values: DrawValues,
  ) {
    const visibleFills = node.fills.filter((fill) => fill.visible && fill.opacity > 0);
    const visibleStrokes = node.strokes.filter(
      (stroke) => stroke.visible && stroke.width > 0 && stroke.paint.visible,
    );
    context.font = `${node.fontStyle} ${node.fontWeight} ${node.fontSize}px "${node.fontFamily}", sans-serif`;
    context.textBaseline = 'top';
    context.textAlign = 'left';
    const resolvedLineHeight =
      node.lineHeight <= 4 ? node.fontSize * node.lineHeight : node.lineHeight;
    const lines = wrapText(
      context,
      applyTextCase(node.content, node.textCase),
      values.width,
      node.letterSpacing,
    );
    const blockHeight = lines.length * resolvedLineHeight;
    const y =
      node.verticalAlign === 'center'
        ? (values.height - blockHeight) / 2
        : node.verticalAlign === 'bottom'
          ? values.height - blockHeight
          : 0;

    for (const [index, line] of lines.entries()) {
      const lineWidth = measureTrackedText(context, line, node.letterSpacing);
      const whitespaceCount = segmentGraphemes(line).filter((character) =>
        /\s/u.test(character),
      ).length;
      const justify =
        node.textAlign === 'justify' && index < lines.length - 1 && whitespaceCount > 0;
      const wordSpacing = justify ? Math.max(0, (values.width - lineWidth) / whitespaceCount) : 0;
      const renderedWidth = justify ? values.width : lineWidth;
      const x =
        node.textAlign === 'center'
          ? (values.width - renderedWidth) / 2
          : node.textAlign === 'right'
            ? values.width - renderedWidth
            : 0;
      const lineY = y + index * resolvedLineHeight;
      if (visibleFills.length === 0) {
        context.fillStyle = 'rgb(0 0 0)';
        drawTrackedText(context, line, x, lineY, node.letterSpacing, wordSpacing, 'fill');
      }
      for (const fill of visibleFills) {
        context.save();
        context.fillStyle = paintStyle(context, fill, values.width, values.height);
        context.globalCompositeOperation = BLEND_MODES[fill.blendMode];
        drawTrackedText(context, line, x, lineY, node.letterSpacing, wordSpacing, 'fill');
        context.restore();
      }
      for (const stroke of visibleStrokes) {
        context.save();
        applyTextStrokeStyle(context, stroke, values.width, values.height);
        drawTrackedText(context, line, x, lineY, node.letterSpacing, wordSpacing, 'stroke');
        context.restore();
      }
      if (node.textDecoration !== 'none') {
        const decorationFill = visibleFills.at(-1);
        context.fillStyle = decorationFill
          ? paintStyle(context, decorationFill, values.width, values.height)
          : 'rgb(0 0 0)';
        drawTextDecoration(context, node.textDecoration, x, lineY, renderedWidth, node.fontSize);
      }
    }
  }

  #drawImage(
    context: CanvasRenderingContext2D,
    node: Extract<SceneNode, { type: 'image' }>,
    values: DrawValues,
  ) {
    createNodePath(context, node, values);
    context.save();
    context.clip();
    const image = this.#loadImage(node.source.uri);
    if (!image.complete || image.naturalWidth === 0) {
      context.fillStyle = 'oklch(0.24 0.012 260)';
      context.fillRect(0, 0, values.width, values.height);
      context.restore();
      return;
    }

    context.imageSmoothingEnabled = node.smoothing;
    const intrinsicRatio = image.naturalWidth / image.naturalHeight;
    const boxRatio = values.width / values.height;
    let drawWidth = values.width;
    let drawHeight = values.height;
    let drawX = 0;
    let drawY = 0;

    if (node.fit === 'fit') {
      if (intrinsicRatio > boxRatio) drawHeight = values.width / intrinsicRatio;
      else drawWidth = values.height * intrinsicRatio;
      drawX = (values.width - drawWidth) / 2;
      drawY = (values.height - drawHeight) / 2;
    } else if (node.fit === 'crop') {
      if (intrinsicRatio > boxRatio) drawWidth = values.height * intrinsicRatio;
      else drawHeight = values.width / intrinsicRatio;
      drawX = (values.width - drawWidth) / 2;
      drawY = (values.height - drawHeight) / 2;
    }
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    context.restore();
    for (const stroke of node.strokes) {
      createNodePath(context, node, values);
      applyStroke(context, node, stroke, values.width, values.height);
    }
  }

  #loadImage(source: string) {
    const cached = this.#imageCache.get(source);
    if (cached) return cached;
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => this.#invalidate();
    image.onerror = () => this.#invalidate();
    image.src = source;
    this.#imageCache.set(source, image);
    return image;
  }

  #drawGrid(context: CanvasRenderingContext2D, session: EditorSession) {
    const step = getAdaptiveGridStep(session.camera.zoom);
    const screenStep = step * session.camera.zoom;
    const majorStep = screenStep * GRID_MAJOR_EVERY;
    const offsetX = ((session.camera.x % screenStep) + screenStep) % screenStep;
    const offsetY = ((session.camera.y % screenStep) + screenStep) % screenStep;

    context.save();
    context.lineWidth = 1;
    context.strokeStyle = 'oklch(1 0 0 / 0.035)';
    context.beginPath();
    for (let x = offsetX; x <= this.#width; x += screenStep) {
      context.moveTo(Math.round(x) + 0.5, 0);
      context.lineTo(Math.round(x) + 0.5, this.#height);
    }
    for (let y = offsetY; y <= this.#height; y += screenStep) {
      context.moveTo(0, Math.round(y) + 0.5);
      context.lineTo(this.#width, Math.round(y) + 0.5);
    }
    context.stroke();

    if (majorStep >= 40) {
      const majorOffsetX = ((session.camera.x % majorStep) + majorStep) % majorStep;
      const majorOffsetY = ((session.camera.y % majorStep) + majorStep) % majorStep;
      context.strokeStyle = 'oklch(1 0 0 / 0.075)';
      context.beginPath();
      for (let x = majorOffsetX; x <= this.#width; x += majorStep) {
        context.moveTo(Math.round(x) + 0.5, 0);
        context.lineTo(Math.round(x) + 0.5, this.#height);
      }
      for (let y = majorOffsetY; y <= this.#height; y += majorStep) {
        context.moveTo(0, Math.round(y) + 0.5);
        context.lineTo(this.#width, Math.round(y) + 0.5);
      }
      context.stroke();
    }
    context.restore();
  }

  #drawRulers(context: CanvasRenderingContext2D, session: EditorSession) {
    const step = getAdaptiveGridStep(session.camera.zoom);
    const screenStep = step * session.camera.zoom;
    const labelEvery = screenStep < 42 ? 2 : 1;

    context.save();
    context.fillStyle = 'oklch(0.135 0.006 260 / 0.97)';
    context.fillRect(0, 0, this.#width, RULER_SIZE);
    context.fillRect(0, 0, RULER_SIZE, this.#height);
    context.strokeStyle = 'oklch(1 0 0 / 0.11)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(0, RULER_SIZE - 0.5);
    context.lineTo(this.#width, RULER_SIZE - 0.5);
    context.moveTo(RULER_SIZE - 0.5, 0);
    context.lineTo(RULER_SIZE - 0.5, this.#height);
    context.stroke();

    context.font = '9px Inter, sans-serif';
    context.fillStyle = 'oklch(0.7 0.018 260)';
    context.textBaseline = 'top';
    const startWorldX = Math.floor(-session.camera.x / session.camera.zoom / step) * step;
    const endWorldX = (this.#width - session.camera.x) / session.camera.zoom;
    let index = 0;
    for (let worldX = startWorldX; worldX <= endWorldX; worldX += step) {
      const x = worldX * session.camera.zoom + session.camera.x;
      const tick = index % labelEvery === 0 ? 7 : 4;
      context.beginPath();
      context.moveTo(Math.round(x) + 0.5, RULER_SIZE - tick);
      context.lineTo(Math.round(x) + 0.5, RULER_SIZE);
      context.stroke();
      if (index % labelEvery === 0 && x > RULER_SIZE + 2) {
        context.fillText(formatRulerValue(worldX), x + 3, 2);
      }
      index += 1;
    }

    const startWorldY = Math.floor(-session.camera.y / session.camera.zoom / step) * step;
    const endWorldY = (this.#height - session.camera.y) / session.camera.zoom;
    index = 0;
    for (let worldY = startWorldY; worldY <= endWorldY; worldY += step) {
      const y = worldY * session.camera.zoom + session.camera.y;
      const tick = index % labelEvery === 0 ? 7 : 4;
      context.beginPath();
      context.moveTo(RULER_SIZE - tick, Math.round(y) + 0.5);
      context.lineTo(RULER_SIZE, Math.round(y) + 0.5);
      context.stroke();
      if (index % labelEvery === 0 && y > RULER_SIZE + 4) {
        context.save();
        context.translate(2, y + 3);
        context.rotate(-Math.PI / 2);
        context.fillText(formatRulerValue(worldY), 0, 0);
        context.restore();
      }
      index += 1;
    }

    context.fillStyle = 'oklch(0.135 0.006 260)';
    context.fillRect(0, 0, RULER_SIZE, RULER_SIZE);
    context.restore();
  }

  #drawOverlay(session: EditorSession) {
    const context = this.#overlayContext();
    this.#prepareContext(context);
    this.#handleLocations.length = 0;

    if (session.hoveredId && !session.selectedIds.has(session.hoveredId)) {
      const hovered = this.#drawnNodes.get(session.hoveredId);
      if (hovered) this.#drawNodeOutline(context, hovered, session, 'oklch(0.72 0.16 260 / 0.72)');
    }

    const selectedNodes = [...session.selectedIds]
      .map((id) => this.#drawnNodes.get(id))
      .filter((node): node is DrawnNode => node !== undefined);

    if (selectedNodes.length === 1) {
      const selected = selectedNodes[0];
      if (selected) this.#drawSingleSelection(context, selected, session);
    } else if (selectedNodes.length > 1) {
      this.#drawMultiSelection(context, selectedNodes, session);
    }

    for (const guide of session.snapGuides) {
      context.save();
      context.strokeStyle = 'oklch(0.69 0.22 342)';
      context.lineWidth = 1;
      context.setLineDash([]);
      context.beginPath();
      if (guide.axis === 'x') {
        const x = worldToScreen({ x: guide.position, y: 0 }, session).x;
        const start = worldToScreen({ x: 0, y: guide.start }, session).y;
        const end = worldToScreen({ x: 0, y: guide.end }, session).y;
        context.moveTo(Math.round(x) + 0.5, start);
        context.lineTo(Math.round(x) + 0.5, end);
      } else {
        const y = worldToScreen({ x: 0, y: guide.position }, session).y;
        const start = worldToScreen({ x: guide.start, y: 0 }, session).x;
        const end = worldToScreen({ x: guide.end, y: 0 }, session).x;
        context.moveTo(start, Math.round(y) + 0.5);
        context.lineTo(end, Math.round(y) + 0.5);
      }
      context.stroke();
      if (guide.label) this.#drawGuideLabel(context, guide.label, guide, session);
      context.restore();
    }

    if (session.interaction.kind === 'marquee') {
      const origin = worldToScreen(session.interaction.marquee.origin, session);
      const current = worldToScreen(session.interaction.marquee.current, session);
      const x = Math.min(origin.x, current.x);
      const y = Math.min(origin.y, current.y);
      const width = Math.abs(current.x - origin.x);
      const height = Math.abs(current.y - origin.y);
      context.fillStyle = 'oklch(0.62 0.18 260 / 0.1)';
      context.strokeStyle = 'oklch(0.72 0.16 260)';
      context.lineWidth = 1;
      context.fillRect(x, y, width, height);
      context.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, width, height);
    }

    if (session.interaction.kind === 'drawing') {
      const { bounds } = session.interaction.preview;
      if (bounds) this.#drawDrawingPreview(context, bounds, session);
    }

    if (
      (session.interaction.kind === 'transform' || session.interaction.kind === 'drawing') &&
      session.interaction.preview.bounds
    ) {
      this.#drawMeasurementBadge(context, session.interaction.preview.bounds, session);
    }
  }

  #drawGuideLabel(
    context: CanvasRenderingContext2D,
    label: string,
    guide: EditorSession['snapGuides'][number],
    session: EditorSession,
  ) {
    const anchor =
      guide.axis === 'x'
        ? {
            x: worldToScreen({ x: guide.position, y: 0 }, session).x + 7,
            y: worldToScreen({ x: 0, y: guide.start }, session).y + 7,
          }
        : {
            x: worldToScreen({ x: guide.start, y: 0 }, session).x + 7,
            y: worldToScreen({ x: 0, y: guide.position }, session).y - 7,
          };
    context.save();
    context.font = '600 10px JetBrains Mono, monospace';
    const labelWidth = context.measureText(label).width + 10;
    const labelHeight = 18;
    const x = Math.max(RULER_SIZE + 2, Math.min(anchor.x, this.#width - labelWidth - 2));
    const y = Math.max(
      RULER_SIZE + 2,
      Math.min(anchor.y - labelHeight, this.#height - labelHeight - 2),
    );
    context.fillStyle = 'oklch(0.62 0.2 342 / 0.96)';
    context.beginPath();
    context.roundRect(x, y, labelWidth, labelHeight, 4);
    context.fill();
    context.fillStyle = 'white';
    context.textBaseline = 'middle';
    context.fillText(label, x + 5, y + labelHeight / 2);
    context.restore();
  }

  #drawDrawingPreview(
    context: CanvasRenderingContext2D,
    bounds: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    },
    session: EditorSession,
  ) {
    const topLeft = worldToScreen({ x: bounds.x, y: bounds.y }, session);
    const bottomRight = worldToScreen(
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
      session,
    );
    const x = Math.min(topLeft.x, bottomRight.x);
    const y = Math.min(topLeft.y, bottomRight.y);
    const width = Math.abs(bottomRight.x - topLeft.x);
    const height = Math.abs(bottomRight.y - topLeft.y);

    context.save();
    context.fillStyle = 'oklch(0.64 0.19 260 / 0.14)';
    context.strokeStyle = 'oklch(0.72 0.16 260)';
    context.lineWidth = 1;
    context.setLineDash([4, 3]);
    context.fillRect(x, y, width, height);
    context.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, width, height);
    context.restore();
  }

  #drawNodeOutline(
    context: CanvasRenderingContext2D,
    drawnNode: DrawnNode,
    session: EditorSession,
    strokeStyle: string,
  ) {
    const corners = transformRectCorners(
      { x: 0, y: 0, width: drawnNode.values.width, height: drawnNode.values.height },
      drawnNode.matrix,
    ).map((point) => worldToScreen(point, session));
    context.save();
    context.strokeStyle = strokeStyle;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(corners[0]?.x ?? 0, corners[0]?.y ?? 0);
    for (const point of corners.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.stroke();
    context.restore();
  }

  #drawSingleSelection(
    context: CanvasRenderingContext2D,
    drawnNode: DrawnNode,
    session: EditorSession,
  ) {
    const corners = transformRectCorners(
      { x: 0, y: 0, width: drawnNode.values.width, height: drawnNode.values.height },
      drawnNode.matrix,
    ).map((point) => worldToScreen(point, session)) as [Vec2, Vec2, Vec2, Vec2];
    this.#drawSelectionPolygon(context, corners);

    const [topLeft, topRight, bottomRight, bottomLeft] = corners;
    const top = midpoint(topLeft, topRight);
    const right = midpoint(topRight, bottomRight);
    const bottom = midpoint(bottomLeft, bottomRight);
    const left = midpoint(topLeft, bottomLeft);
    const center = midpoint(topLeft, bottomRight);
    const topNormal = normalize({ x: top.x - center.x, y: top.y - center.y });
    const rotation = {
      x: top.x + topNormal.x * ROTATION_HANDLE_OFFSET,
      y: top.y + topNormal.y * ROTATION_HANDLE_OFFSET,
    };

    context.save();
    context.strokeStyle = 'oklch(0.72 0.16 260)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(top.x, top.y);
    context.lineTo(rotation.x, rotation.y);
    context.stroke();
    context.restore();

    const resizable = drawnNode.node.type !== 'group' && drawnNode.node.type !== 'line';
    const handles = [
      ...(resizable
        ? [
            { kind: 'nw' as const, point: topLeft },
            { kind: 'n' as const, point: top },
            { kind: 'ne' as const, point: topRight },
            { kind: 'e' as const, point: right },
            { kind: 'se' as const, point: bottomRight },
            { kind: 's' as const, point: bottom },
            { kind: 'sw' as const, point: bottomLeft },
            { kind: 'w' as const, point: left },
          ]
        : []),
      { kind: 'rotate' as const, point: rotation },
    ] satisfies readonly HandleLocation[];
    this.#handleLocations.push(...handles);
    this.#drawHandles(context, handles);
  }

  #drawMultiSelection(
    context: CanvasRenderingContext2D,
    selectedNodes: readonly DrawnNode[],
    session: EditorSession,
  ) {
    let bounds = selectedNodes[0]?.bounds;
    if (!bounds) return;
    for (const selectedNode of selectedNodes.slice(1))
      bounds = unionAabb(bounds, selectedNode.bounds);
    const topLeft = worldToScreen({ x: bounds.minX, y: bounds.minY }, session);
    const bottomRight = worldToScreen({ x: bounds.maxX, y: bounds.maxY }, session);
    const topRight = { x: bottomRight.x, y: topLeft.y };
    const bottomLeft = { x: topLeft.x, y: bottomRight.y };
    const corners = [topLeft, topRight, bottomRight, bottomLeft] as const;
    this.#drawSelectionPolygon(context, corners);

    const containsUnsupportedResize = selectedNodes.some(
      (selected) => selected.node.type === 'group' || selected.node.type === 'line',
    );
    const handles = (
      containsUnsupportedResize
        ? []
        : [
            { kind: 'nw' as const, point: topLeft },
            { kind: 'n' as const, point: midpoint(topLeft, topRight) },
            { kind: 'ne' as const, point: topRight },
            { kind: 'e' as const, point: midpoint(topRight, bottomRight) },
            { kind: 'se' as const, point: bottomRight },
            { kind: 's' as const, point: midpoint(bottomLeft, bottomRight) },
            { kind: 'sw' as const, point: bottomLeft },
            { kind: 'w' as const, point: midpoint(topLeft, bottomLeft) },
          ]
    ) satisfies readonly HandleLocation[];
    this.#handleLocations.push(...handles);
    this.#drawHandles(context, handles);
  }

  #drawSelectionPolygon(context: CanvasRenderingContext2D, corners: readonly Vec2[]) {
    const first = corners[0];
    if (!first) return;
    context.save();
    context.strokeStyle = 'oklch(0.72 0.16 260)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(first.x, first.y);
    for (const point of corners.slice(1)) context.lineTo(point.x, point.y);
    context.closePath();
    context.stroke();
    context.restore();
  }

  #drawHandles(context: CanvasRenderingContext2D, handles: readonly HandleLocation[]) {
    context.save();
    context.fillStyle = 'oklch(1 0 0)';
    context.strokeStyle = 'oklch(0.53 0.19 260)';
    context.lineWidth = 1.25;
    for (const handle of handles) {
      if (handle.kind === 'rotate') {
        context.beginPath();
        context.arc(handle.point.x, handle.point.y, HANDLE_SIZE / 2, 0, Math.PI * 2);
        context.fill();
        context.stroke();
        continue;
      }
      context.beginPath();
      context.rect(
        handle.point.x - HANDLE_SIZE / 2,
        handle.point.y - HANDLE_SIZE / 2,
        HANDLE_SIZE,
        HANDLE_SIZE,
      );
      context.fill();
      context.stroke();
    }
    context.restore();
  }

  #drawMeasurementBadge(
    context: CanvasRenderingContext2D,
    bounds: {
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
    },
    session: EditorSession,
  ) {
    const anchor = worldToScreen(
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      session,
    );
    const label = `${formatMeasurement(bounds.width)} × ${formatMeasurement(bounds.height)}`;
    context.save();
    context.font = '500 11px JetBrains Mono, monospace';
    const textWidth = context.measureText(label).width;
    const width = textWidth + 12;
    const height = 22;
    const x = anchor.x - width / 2;
    const y = anchor.y + 10;
    context.fillStyle = 'oklch(0.17 0.009 260 / 0.96)';
    context.strokeStyle = 'oklch(0.69 0.22 342)';
    context.beginPath();
    context.roundRect(x, y, width, height, 5);
    context.fill();
    context.stroke();
    context.fillStyle = 'oklch(0.83 0.12 342)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(label, anchor.x, y + height / 2);
    context.restore();
  }
}

function midpoint(first: Vec2, second: Vec2): Vec2 {
  return { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
}

function normalize(vector: Vec2): Vec2 {
  const length = Math.hypot(vector.x, vector.y);
  return length === 0 ? { x: 0, y: -1 } : { x: vector.x / length, y: vector.y / length };
}

function formatRulerValue(value: number) {
  return Math.abs(value) >= 1000
    ? `${Math.round(value / 100) / 10}k`
    : `${Math.round(value * 10) / 10}`;
}

function formatMeasurement(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function applyTextCase(
  content: string,
  textCase: Extract<SceneNode, { type: 'text' }>['textCase'],
) {
  switch (textCase) {
    case 'upper':
      return content.toUpperCase();
    case 'lower':
      return content.toLowerCase();
    case 'title':
      return content.replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
    case 'original':
      return content;
  }
}

function wrapText(
  context: CanvasRenderingContext2D,
  content: string,
  maxWidth: number,
  letterSpacing: number,
) {
  const explicitLines = content.split('\n');
  const lines: string[] = [];
  for (const explicitLine of explicitLines) {
    const words = explicitLine.split(/\s+/);
    let currentLine = '';
    for (const word of words) {
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      const measured = measureTrackedText(context, candidate, letterSpacing);
      if (measured > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = candidate;
      }
    }
    lines.push(currentLine);
  }
  return lines.length === 0 ? [''] : lines;
}

function measureTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
) {
  return (
    context.measureText(text).width + Math.max(0, segmentGraphemes(text).length - 1) * letterSpacing
  );
}

/**
 * Canvas2D's optional letterSpacing property is not consistently available. Positioning
 * each grapheme cluster from the measured prefix keeps browser kerning advances while
 * making tracking deterministic across the supported browser set.
 */
function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  letterSpacing: number,
  wordSpacing: number,
  operation: 'fill' | 'stroke',
) {
  const draw = (value: string, drawX: number) => {
    if (operation === 'fill') context.fillText(value, drawX, y);
    else context.strokeText(value, drawX, y);
  };
  if (letterSpacing === 0 && wordSpacing === 0) {
    draw(text, x);
    return;
  }

  const characters = segmentGraphemes(text);
  let cursor = x;
  let prefix = '';
  for (const [index, character] of characters.entries()) {
    draw(character, cursor);
    const nextPrefix = prefix + character;
    const advance =
      context.measureText(nextPrefix).width - context.measureText(prefix).width + letterSpacing;
    cursor += advance;
    if (/\s/u.test(character) && index < characters.length - 1) cursor += wordSpacing;
    prefix = nextPrefix;
  }
}

function applyTextStrokeStyle(
  context: CanvasRenderingContext2D,
  stroke: Stroke,
  width: number,
  height: number,
) {
  context.strokeStyle = paintStyle(context, stroke.paint, width, height);
  context.globalCompositeOperation = BLEND_MODES[stroke.paint.blendMode];
  context.lineWidth = stroke.width;
  context.lineJoin = stroke.join;
  context.lineCap =
    stroke.cap === 'none' || stroke.cap === 'arrow' || stroke.cap === 'triangle'
      ? 'butt'
      : stroke.cap;
  context.miterLimit = stroke.miterLimit;
  context.setLineDash([...stroke.dash]);
}

function segmentGraphemes(text: string) {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(
      new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
      ({ segment }) => segment,
    );
  }
  // Supported browsers provide Intl.Segmenter; Array.from is a standards-compliant fallback
  // for older engines where complex emoji shaping is not otherwise available to Canvas2D.
  return Array.from(text);
}

function drawTextDecoration(
  context: CanvasRenderingContext2D,
  decoration: Extract<SceneNode, { type: 'text' }>['textDecoration'],
  x: number,
  y: number,
  width: number,
  fontSize: number,
) {
  const lineY = decoration === 'underline' ? y + fontSize * 0.91 : y + fontSize * 0.54;
  context.save();
  context.strokeStyle = context.fillStyle;
  context.lineWidth = Math.max(1, fontSize / 15);
  context.beginPath();
  context.moveTo(x, lineY);
  context.lineTo(x + width, lineY);
  context.stroke();
  context.restore();
}
