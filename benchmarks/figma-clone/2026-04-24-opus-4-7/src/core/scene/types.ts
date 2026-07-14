/** Scene graph types. All node shapes are discriminated unions keyed by `type`. */

import type { Rect } from '../geometry/Rect';

export type NodeId = string;

/* ------------------------------------------------------------------ */
/* Paints (fills & strokes)                                            */
/* ------------------------------------------------------------------ */

export interface SolidPaint {
  type: 'solid';
  color: string; // #rrggbb
  opacity: number; // 0..1
}

export interface GradientStop {
  offset: number; // 0..1
  color: string;
  opacity: number;
}

export interface LinearGradientPaint {
  type: 'linear';
  /** angle in radians. 0 = left→right. */
  angle: number;
  stops: GradientStop[];
  opacity: number;
}

export interface RadialGradientPaint {
  type: 'radial';
  /** center in normalized 0..1 space. */
  cx: number;
  cy: number;
  radius: number; // relative to longer dimension
  stops: GradientStop[];
  opacity: number;
}

export interface ImagePaint {
  type: 'image';
  src: string;
  fit: 'fill' | 'fit' | 'crop' | 'tile';
  opacity: number;
}

export type Paint = SolidPaint | LinearGradientPaint | RadialGradientPaint | ImagePaint;

export type StrokeAlign = 'center' | 'inside' | 'outside';

export interface Stroke {
  paint: Paint;
  width: number;
  align: StrokeAlign;
  dash: number[]; // empty = solid
}

/* ------------------------------------------------------------------ */
/* Effects                                                              */
/* ------------------------------------------------------------------ */

export interface DropShadow {
  type: 'dropShadow';
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  visible: boolean;
}
export interface InnerShadow {
  type: 'innerShadow';
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  opacity: number;
  visible: boolean;
}
export interface LayerBlur {
  type: 'layerBlur';
  radius: number;
  visible: boolean;
}
export interface BackgroundBlur {
  type: 'backgroundBlur';
  radius: number;
  visible: boolean;
}

export type Effect = DropShadow | InnerShadow | LayerBlur | BackgroundBlur;

/* ------------------------------------------------------------------ */
/* Corner radius                                                        */
/* ------------------------------------------------------------------ */

export type CornerRadius =
  | number
  | { tl: number; tr: number; br: number; bl: number };

export const isUniformRadius = (r: CornerRadius): r is number => typeof r === 'number';

export const radiusToIndividual = (r: CornerRadius): { tl: number; tr: number; br: number; bl: number } =>
  isUniformRadius(r) ? { tl: r, tr: r, br: r, bl: r } : r;

/* ------------------------------------------------------------------ */
/* Base node                                                           */
/* ------------------------------------------------------------------ */

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn';

export interface BaseNode {
  id: NodeId;
  type: NodeType;
  parentId: NodeId | null;
  name: string;
  visible: boolean;
  locked: boolean;
  /** position of the node's top-left in parent-local space (before rotation). */
  x: number;
  y: number;
  width: number;
  height: number;
  /** rotation in radians, around the node center. */
  rotation: number;
  opacity: number; // 0..1
  blendMode: BlendMode;
  effects: Effect[];
}

/* ------------------------------------------------------------------ */
/* Shared styling for filled shapes                                    */
/* ------------------------------------------------------------------ */

export interface StyledShape {
  fills: Paint[];
  strokes: Stroke[];
  cornerRadius: CornerRadius;
}

/* ------------------------------------------------------------------ */
/* Auto-layout                                                          */
/* ------------------------------------------------------------------ */

export interface AutoLayout {
  enabled: boolean;
  direction: 'horizontal' | 'vertical';
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  align: 'start' | 'center' | 'end';
  justify: 'start' | 'center' | 'end' | 'space-between';
}

/* ------------------------------------------------------------------ */
/* Node variants                                                       */
/* ------------------------------------------------------------------ */

export interface FrameNode extends BaseNode, StyledShape {
  type: 'frame';
  children: NodeId[];
  clipContent: boolean;
  autoLayout: AutoLayout;
}

export interface RectangleNode extends BaseNode, StyledShape {
  type: 'rectangle';
}

export interface EllipseNode extends BaseNode, StyledShape {
  type: 'ellipse';
}

export interface LineNode extends BaseNode {
  type: 'line';
  strokes: Stroke[];
}

export interface PolygonNode extends BaseNode, StyledShape {
  type: 'polygon';
  pointCount: number; // 3..32
  /** If set, renders a star with this ratio for inner radius (0..1). */
  starRatio: number | null;
}

export interface TextNode extends BaseNode {
  type: 'text';
  text: string;
  fontFamily: string;
  fontWeight: number; // 100..900
  fontSize: number;
  lineHeight: number; // multiplier
  letterSpacing: number; // px
  textAlign: 'left' | 'center' | 'right' | 'justify';
  italic: boolean;
  color: string;
  /** 'auto' means height grows with content, 'fixed' respects height. */
  autoHeight: boolean;
  /** width behaviour: 'auto' hugs content, 'fixed' respects set width */
  autoWidth: boolean;
}

export interface ImageNode extends BaseNode, StyledShape {
  type: 'image';
  src: string;
  /** Natural width/height of the image (used for fit math). */
  naturalWidth: number;
  naturalHeight: number;
  fit: 'fill' | 'contain' | 'cover';
}

export type SceneNode =
  | FrameNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | TextNode
  | ImageNode;

export type NodeType = SceneNode['type'];

/* ------------------------------------------------------------------ */
/* Document                                                            */
/* ------------------------------------------------------------------ */

export interface Page {
  id: NodeId;
  name: string;
  /** Top-level children (frames, free shapes). */
  children: NodeId[];
  background: string;
}

export interface ColorStyle {
  id: string;
  name: string;
  color: string;
}

export interface TextStyle {
  id: string;
  name: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}

export interface Document {
  id: string;
  name: string;
  nodes: Record<NodeId, SceneNode>;
  pages: Record<NodeId, Page>;
  pageOrder: NodeId[];
  currentPageId: NodeId;
  colorStyles: Record<string, ColorStyle>;
  textStyles: Record<string, TextStyle>;
}

/* ------------------------------------------------------------------ */
/* Type guards                                                          */
/* ------------------------------------------------------------------ */

export const isFrame = (n: SceneNode | undefined): n is FrameNode => !!n && n.type === 'frame';
export const isRectangle = (n: SceneNode | undefined): n is RectangleNode => !!n && n.type === 'rectangle';
export const isEllipse = (n: SceneNode | undefined): n is EllipseNode => !!n && n.type === 'ellipse';
export const isLine = (n: SceneNode | undefined): n is LineNode => !!n && n.type === 'line';
export const isPolygon = (n: SceneNode | undefined): n is PolygonNode => !!n && n.type === 'polygon';
export const isText = (n: SceneNode | undefined): n is TextNode => !!n && n.type === 'text';
export const isImage = (n: SceneNode | undefined): n is ImageNode => !!n && n.type === 'image';

export const isStyledShape = (
  n: SceneNode | undefined,
): n is FrameNode | RectangleNode | EllipseNode | PolygonNode | ImageNode =>
  !!n && (n.type === 'frame' || n.type === 'rectangle' || n.type === 'ellipse' || n.type === 'polygon' || n.type === 'image');

export const hasChildren = (n: SceneNode | undefined): n is FrameNode => isFrame(n);

export type NodeWithStrokes =
  | FrameNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | ImageNode;

export const hasStrokes = (n: SceneNode | undefined): n is NodeWithStrokes =>
  !!n && n.type !== 'text';

export type NodeWithFills = FrameNode | RectangleNode | EllipseNode | PolygonNode | ImageNode;

export const hasFills = (n: SceneNode | undefined): n is NodeWithFills =>
  !!n && (n.type === 'frame' || n.type === 'rectangle' || n.type === 'ellipse' || n.type === 'polygon' || n.type === 'image');

export const nodeLocalBounds = (n: SceneNode): Rect => ({
  x: 0,
  y: 0,
  width: n.width,
  height: n.height,
});
