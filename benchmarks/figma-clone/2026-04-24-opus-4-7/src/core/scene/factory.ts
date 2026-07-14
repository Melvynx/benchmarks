import { nanoid } from 'nanoid';
import type {
  AutoLayout,
  ColorStyle,
  Document,
  EllipseNode,
  FrameNode,
  ImageNode,
  LineNode,
  NodeId,
  Page,
  Paint,
  PolygonNode,
  RectangleNode,
  Stroke,
  TextNode,
  TextStyle,
} from './types';

export const makeId = (): NodeId => nanoid(10);

export const solidPaint = (color: string, opacity = 1): Paint => ({
  type: 'solid',
  color,
  opacity,
});

export const defaultStroke = (color = '#000000', width = 1): Stroke => ({
  paint: solidPaint(color, 1),
  width,
  align: 'center',
  dash: [],
});

export const defaultAutoLayout = (): AutoLayout => ({
  enabled: false,
  direction: 'horizontal',
  gap: 10,
  padding: { top: 10, right: 10, bottom: 10, left: 10 },
  align: 'start',
  justify: 'start',
});

const baseNode = (parentId: NodeId | null) => ({
  id: makeId(),
  parentId,
  visible: true,
  locked: false,
  rotation: 0,
  opacity: 1,
  blendMode: 'normal' as const,
  effects: [],
});

export const createFrame = (opts: Partial<FrameNode> & { parentId: NodeId | null }): FrameNode => ({
  ...baseNode(opts.parentId),
  type: 'frame',
  name: opts.name ?? 'Frame',
  x: opts.x ?? 0,
  y: opts.y ?? 0,
  width: opts.width ?? 400,
  height: opts.height ?? 300,
  fills: opts.fills ?? [solidPaint('#ffffff', 1)],
  strokes: opts.strokes ?? [],
  cornerRadius: opts.cornerRadius ?? 0,
  children: [],
  clipContent: opts.clipContent ?? true,
  autoLayout: opts.autoLayout ?? defaultAutoLayout(),
  ...opts,
});

export const createRectangle = (opts: Partial<RectangleNode> & { parentId: NodeId | null }): RectangleNode => ({
  ...baseNode(opts.parentId),
  type: 'rectangle',
  name: opts.name ?? 'Rectangle',
  x: opts.x ?? 0,
  y: opts.y ?? 0,
  width: opts.width ?? 100,
  height: opts.height ?? 100,
  fills: opts.fills ?? [solidPaint('#d9d9d9', 1)],
  strokes: opts.strokes ?? [],
  cornerRadius: opts.cornerRadius ?? 0,
  ...opts,
});

export const createEllipse = (opts: Partial<EllipseNode> & { parentId: NodeId | null }): EllipseNode => ({
  ...baseNode(opts.parentId),
  type: 'ellipse',
  name: opts.name ?? 'Ellipse',
  x: opts.x ?? 0,
  y: opts.y ?? 0,
  width: opts.width ?? 100,
  height: opts.height ?? 100,
  fills: opts.fills ?? [solidPaint('#d9d9d9', 1)],
  strokes: opts.strokes ?? [],
  cornerRadius: 0,
  ...opts,
});

export const createLine = (opts: Partial<LineNode> & { parentId: NodeId | null }): LineNode => ({
  ...baseNode(opts.parentId),
  type: 'line',
  name: opts.name ?? 'Line',
  x: opts.x ?? 0,
  y: opts.y ?? 0,
  width: opts.width ?? 100,
  height: opts.height ?? 0,
  strokes: opts.strokes ?? [defaultStroke('#000000', 1)],
  ...opts,
});

export const createPolygon = (opts: Partial<PolygonNode> & { parentId: NodeId | null }): PolygonNode => ({
  ...baseNode(opts.parentId),
  type: 'polygon',
  name: opts.name ?? 'Polygon',
  x: opts.x ?? 0,
  y: opts.y ?? 0,
  width: opts.width ?? 100,
  height: opts.height ?? 100,
  fills: opts.fills ?? [solidPaint('#d9d9d9', 1)],
  strokes: opts.strokes ?? [],
  cornerRadius: 0,
  pointCount: opts.pointCount ?? 6,
  starRatio: opts.starRatio ?? null,
  ...opts,
});

export const createText = (opts: Partial<TextNode> & { parentId: NodeId | null }): TextNode => ({
  ...baseNode(opts.parentId),
  type: 'text',
  name: opts.name ?? 'Text',
  x: opts.x ?? 0,
  y: opts.y ?? 0,
  width: opts.width ?? 120,
  height: opts.height ?? 24,
  text: opts.text ?? 'Text',
  fontFamily: opts.fontFamily ?? 'Inter',
  fontWeight: opts.fontWeight ?? 400,
  fontSize: opts.fontSize ?? 16,
  lineHeight: opts.lineHeight ?? 1.2,
  letterSpacing: opts.letterSpacing ?? 0,
  textAlign: opts.textAlign ?? 'left',
  italic: opts.italic ?? false,
  color: opts.color ?? '#000000',
  autoHeight: opts.autoHeight ?? true,
  autoWidth: opts.autoWidth ?? true,
  ...opts,
});

export const createImage = (opts: Partial<ImageNode> & { parentId: NodeId | null; src: string }): ImageNode => {
  const { src, ...rest } = opts;
  return {
    ...baseNode(opts.parentId),
    type: 'image',
    name: opts.name ?? 'Image',
    x: opts.x ?? 0,
    y: opts.y ?? 0,
    width: opts.width ?? 200,
    height: opts.height ?? 200,
    fills: [],
    strokes: [],
    cornerRadius: opts.cornerRadius ?? 0,
    naturalWidth: opts.naturalWidth ?? 200,
    naturalHeight: opts.naturalHeight ?? 200,
    fit: opts.fit ?? 'cover',
    ...rest,
    src,
  };
};

export const createPage = (name = 'Page 1'): Page => ({
  id: makeId(),
  name,
  children: [],
  background: '#1e1e1e',
});

export const createColorStyle = (name: string, color: string): ColorStyle => ({
  id: makeId(),
  name,
  color,
});

export const createTextStyle = (name: string, base?: Partial<TextStyle>): TextStyle => ({
  id: makeId(),
  name,
  fontFamily: base?.fontFamily ?? 'Inter',
  fontWeight: base?.fontWeight ?? 400,
  fontSize: base?.fontSize ?? 16,
  lineHeight: base?.lineHeight ?? 1.2,
  letterSpacing: base?.letterSpacing ?? 0,
});

export const createEmptyDocument = (): Document => {
  const page = createPage('Page 1');
  return {
    id: makeId(),
    name: 'Untitled',
    nodes: {},
    pages: { [page.id]: page },
    pageOrder: [page.id],
    currentPageId: page.id,
    colorStyles: {},
    textStyles: {},
  };
};
