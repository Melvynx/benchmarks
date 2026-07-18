import { clonePaint, cloneSceneNode } from './clone';
import {
  SCENE_SCHEMA_VERSION,
  type AutoLayoutSettings,
  type BaseNode,
  type DocumentId,
  type EllipseNode,
  type FrameNode,
  type GroupNode,
  type ImageNode,
  type LayerBlurEffect,
  type LineNode,
  type LinearGradientPaint,
  type NodeFactoryInput,
  type NodeId,
  type Paint,
  type PolygonNode,
  type RadialGradientPaint,
  type RectangleNode,
  type RgbaColor,
  type SceneDocument,
  type SceneNode,
  type SolidPaint,
  type StarNode,
  type Stroke,
  type TextNode,
  type DropShadowEffect,
} from './types';

let fallbackIdCounter = 0;

function nextFallbackId(): string {
  fallbackIdCounter += 1;
  return `${Date.now().toString(36)}-${fallbackIdCounter.toString(36)}`;
}

function createUniqueSuffix(): string {
  try {
    return globalThis.crypto.randomUUID();
  } catch {
    return nextFallbackId();
  }
}

export function createNodeId(prefix = 'node'): NodeId {
  return `${prefix}:${createUniqueSuffix()}`;
}

export function createDocumentId(): DocumentId {
  return `document:${createUniqueSuffix()}`;
}

export function createPaintId(): string {
  return `paint:${createUniqueSuffix()}`;
}

export function createResourceId(prefix: 'stroke' | 'effect'): string {
  return `${prefix}:${createUniqueSuffix()}`;
}

export const DEFAULT_BLACK: RgbaColor = Object.freeze({ r: 0, g: 0, b: 0, a: 1 });
export const DEFAULT_WHITE: RgbaColor = Object.freeze({ r: 1, g: 1, b: 1, a: 1 });

export function createSolidPaint(color: RgbaColor = DEFAULT_BLACK, opacity = 1): SolidPaint {
  return {
    id: createPaintId(),
    type: 'solid',
    visible: true,
    opacity,
    blendMode: 'normal',
    color: { ...color },
  };
}

export function createLinearGradientPaint(
  stops: LinearGradientPaint['stops'] = [
    { position: 0, color: DEFAULT_WHITE },
    { position: 1, color: DEFAULT_BLACK },
  ],
): LinearGradientPaint {
  return {
    id: createPaintId(),
    type: 'linear-gradient',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    start: { x: 0, y: 0.5 },
    end: { x: 1, y: 0.5 },
    stops: stops.map((stop) => ({ ...stop, color: { ...stop.color } })),
  };
}

export function createRadialGradientPaint(
  stops: RadialGradientPaint['stops'] = [
    { position: 0, color: DEFAULT_WHITE },
    { position: 1, color: DEFAULT_BLACK },
  ],
): RadialGradientPaint {
  return {
    id: createPaintId(),
    type: 'radial-gradient',
    visible: true,
    opacity: 1,
    blendMode: 'normal',
    center: { x: 0.5, y: 0.5 },
    radius: { x: 0.5, y: 0.5 },
    focalPoint: { x: 0.5, y: 0.5 },
    stops: stops.map((stop) => ({ ...stop, color: { ...stop.color } })),
  };
}

export function createStroke(paint: Paint = createSolidPaint(), width = 1): Stroke {
  return {
    id: createResourceId('stroke'),
    visible: true,
    paint: clonePaint(paint),
    width,
    align: 'center',
    cap: 'none',
    join: 'miter',
    dash: [],
    miterLimit: 4,
  };
}

export function createDropShadowEffect(): DropShadowEffect {
  return {
    id: createResourceId('effect'),
    type: 'drop-shadow',
    visible: true,
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    blur: 12,
    spread: 0,
    blendMode: 'normal',
  };
}

export function createLayerBlurEffect(radius = 4): LayerBlurEffect {
  return {
    id: createResourceId('effect'),
    type: 'layer-blur',
    visible: true,
    radius,
  };
}

export function createDefaultAutoLayout(): AutoLayoutSettings {
  return {
    direction: 'horizontal',
    gap: 8,
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    primaryAlignment: 'start',
    counterAlignment: 'start',
    wrap: false,
    counterAxisGap: 8,
    horizontalSizing: 'fixed',
    verticalSizing: 'fixed',
    reverse: false,
  };
}

function createBaseNode(
  id: NodeId,
  name: string,
  width: number,
  height: number,
  fills: readonly Paint[],
): BaseNode {
  return {
    id,
    type: 'rectangle',
    name,
    parentId: null,
    visible: true,
    locked: false,
    x: 0,
    y: 0,
    width,
    height,
    rotation: 0,
    opacity: 1,
    blendMode: 'normal',
    cornerRadii: { topLeft: 0, topRight: 0, bottomRight: 0, bottomLeft: 0 },
    fills,
    strokes: [],
    effects: [],
    constraints: { horizontal: 'left', vertical: 'top' },
    layoutItem: {
      positioning: 'auto',
      horizontalSizing: 'fixed',
      verticalSizing: 'fixed',
      grow: 0,
      alignSelf: 'auto',
      minWidth: null,
      maxWidth: null,
      minHeight: null,
      maxHeight: null,
    },
  };
}

function finalizeNode<Node extends SceneNode>(node: Node): Node {
  return cloneSceneNode(node);
}

export function createFrameNode(input: NodeFactoryInput<FrameNode> = {}): FrameNode {
  const id = input.id ?? createNodeId('frame');
  const node: FrameNode = {
    ...createBaseNode(id, 'Frame', 800, 600, [createSolidPaint(DEFAULT_WHITE)]),
    ...input,
    id,
    type: 'frame',
    childIds: input.childIds ?? [],
    clipContent: input.clipContent ?? true,
    autoLayout: input.autoLayout ?? null,
  };
  return finalizeNode(node);
}

export function createGroupNode(input: NodeFactoryInput<GroupNode> = {}): GroupNode {
  const id = input.id ?? createNodeId('group');
  const node: GroupNode = {
    ...createBaseNode(id, 'Group', 100, 100, []),
    ...input,
    id,
    type: 'group',
    childIds: input.childIds ?? [],
  };
  return finalizeNode(node);
}

export function createRectangleNode(input: NodeFactoryInput<RectangleNode> = {}): RectangleNode {
  const id = input.id ?? createNodeId('rectangle');
  const node: RectangleNode = {
    ...createBaseNode(id, 'Rectangle', 160, 100, [
      createSolidPaint({ r: 0.77, g: 0.8, b: 0.86, a: 1 }),
    ]),
    ...input,
    id,
    type: 'rectangle',
  };
  return finalizeNode(node);
}

export function createEllipseNode(input: NodeFactoryInput<EllipseNode> = {}): EllipseNode {
  const id = input.id ?? createNodeId('ellipse');
  const node: EllipseNode = {
    ...createBaseNode(id, 'Ellipse', 120, 120, [
      createSolidPaint({ r: 0.77, g: 0.8, b: 0.86, a: 1 }),
    ]),
    ...input,
    id,
    type: 'ellipse',
    arcStart: input.arcStart ?? 0,
    arcEnd: input.arcEnd ?? 360,
    innerRadius: input.innerRadius ?? 0,
  };
  return finalizeNode(node);
}

export function createLineNode(input: NodeFactoryInput<LineNode> = {}): LineNode {
  const id = input.id ?? createNodeId('line');
  const node: LineNode = {
    ...createBaseNode(id, 'Line', 120, 0, []),
    ...input,
    id,
    type: 'line',
    start: input.start ?? { x: 0, y: 0 },
    end: input.end ?? { x: 120, y: 0 },
    startCap: input.startCap ?? 'none',
    endCap: input.endCap ?? 'none',
  };
  return finalizeNode(node);
}

export function createTextNode(input: NodeFactoryInput<TextNode> = {}): TextNode {
  const id = input.id ?? createNodeId('text');
  const node: TextNode = {
    ...createBaseNode(id, 'Text', 180, 29, [createSolidPaint(DEFAULT_BLACK)]),
    ...input,
    id,
    type: 'text',
    content: input.content ?? 'Text',
    fontFamily: input.fontFamily ?? 'Inter',
    fontWeight: input.fontWeight ?? 400,
    fontStyle: input.fontStyle ?? 'normal',
    fontSize: input.fontSize ?? 24,
    lineHeight: input.lineHeight ?? 28.8,
    letterSpacing: input.letterSpacing ?? 0,
    textAlign: input.textAlign ?? 'left',
    verticalAlign: input.verticalAlign ?? 'top',
    textDecoration: input.textDecoration ?? 'none',
    textCase: input.textCase ?? 'original',
    autoResize: input.autoResize ?? 'width-and-height',
  };
  return finalizeNode(node);
}

export type CreateImageNodeInput = NodeFactoryInput<ImageNode> & Pick<ImageNode, 'source'>;

export function createImageNode(input: CreateImageNodeInput): ImageNode {
  const id = input.id ?? createNodeId('image');
  const node: ImageNode = {
    ...createBaseNode(id, 'Image', 320, 240, []),
    ...input,
    id,
    type: 'image',
    fit: input.fit ?? 'fill',
    crop: input.crop ?? { x: 0, y: 0, width: 1, height: 1 },
    smoothing: input.smoothing ?? true,
  };
  return finalizeNode(node);
}

export function createPolygonNode(input: NodeFactoryInput<PolygonNode> = {}): PolygonNode {
  const id = input.id ?? createNodeId('polygon');
  const node: PolygonNode = {
    ...createBaseNode(id, 'Polygon', 120, 120, [
      createSolidPaint({ r: 0.77, g: 0.8, b: 0.86, a: 1 }),
    ]),
    ...input,
    id,
    type: 'polygon',
    pointCount: input.pointCount ?? 3,
  };
  return finalizeNode(node);
}

export function createStarNode(input: NodeFactoryInput<StarNode> = {}): StarNode {
  const id = input.id ?? createNodeId('star');
  const node: StarNode = {
    ...createBaseNode(id, 'Star', 120, 120, [createSolidPaint({ r: 0.77, g: 0.8, b: 0.86, a: 1 })]),
    ...input,
    id,
    type: 'star',
    pointCount: input.pointCount ?? 5,
    innerRadius: input.innerRadius ?? 0.5,
  };
  return finalizeNode(node);
}

export interface CreateSceneDocumentInput {
  readonly id?: DocumentId;
  readonly name?: string;
  readonly nodes?: Readonly<Record<NodeId, SceneNode>>;
  readonly rootIds?: readonly NodeId[];
  readonly revision?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly background?: RgbaColor;
}

export function createSceneDocument(input: CreateSceneDocumentInput = {}): SceneDocument {
  const now = new Date().toISOString();
  const nodes: Record<NodeId, SceneNode> = {};
  for (const [nodeId, node] of Object.entries(input.nodes ?? {})) {
    nodes[nodeId] = cloneSceneNode(node);
  }

  return {
    schemaVersion: SCENE_SCHEMA_VERSION,
    id: input.id ?? createDocumentId(),
    name: input.name ?? 'Untitled',
    nodes,
    rootIds: [...(input.rootIds ?? [])],
    revision: input.revision ?? 0,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    background: { ...(input.background ?? { r: 0.118, g: 0.125, b: 0.145, a: 1 }) },
  };
}
