import type { RGBA } from '../utils/color';

export type NodeId = string;

// ---------------------------------------------------------------------------
// Paints
// ---------------------------------------------------------------------------

export interface GradientStop {
  position: number; // 0..1
  color: RGBA;
}

export interface SolidPaint {
  type: 'solid';
  enabled: boolean;
  opacity: number; // 0..1, multiplied with color alpha
  color: RGBA;
}

export interface GradientPaint {
  type: 'gradient-linear' | 'gradient-radial';
  enabled: boolean;
  opacity: number;
  stops: GradientStop[];
  /** Linear: direction in degrees (0 = left→right). Radial: ignored (center-out). */
  angle: number;
}

export interface ImagePaint {
  type: 'image';
  enabled: boolean;
  opacity: number;
  /** data: URL (persisted) or blob: URL (session-only). */
  src: string;
  scaleMode: 'fill' | 'fit';
}

export type Paint = SolidPaint | GradientPaint | ImagePaint;

// ---------------------------------------------------------------------------
// Effects
// ---------------------------------------------------------------------------

export interface ShadowEffect {
  type: 'drop-shadow' | 'inner-shadow';
  enabled: boolean;
  color: RGBA;
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
}

export interface BlurEffect {
  type: 'layer-blur' | 'background-blur';
  enabled: boolean;
  radius: number;
}

export type Effect = ShadowEffect | BlurEffect;
export type EffectType = Effect['type'];

export function isShadowEffect(effect: Effect): effect is ShadowEffect {
  return effect.type === 'drop-shadow' || effect.type === 'inner-shadow';
}

// ---------------------------------------------------------------------------
// Shared node properties
// ---------------------------------------------------------------------------

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export type StrokeAlign = 'inside' | 'center' | 'outside';

export interface CornerRadius {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

/** Sizing behavior when the node is a child of an auto-layout frame. */
export type SizingMode = 'fixed' | 'hug' | 'fill';

export interface BaseNodeProps {
  id: NodeId;
  name: string;
  parentId: NodeId | null;
  /** Top-left of the unrotated box, in parent space. Rotation pivots on the box center. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Degrees, counter-clockwise negative / clockwise positive (screen coords). */
  rotation: number;
  opacity: number; // 0..1
  blendMode: BlendMode;
  visible: boolean;
  locked: boolean;
  fills: Paint[];
  strokes: Paint[];
  strokeWeight: number;
  strokeAlign: StrokeAlign;
  /** Dash length in px; 0 means solid. */
  strokeDash: number;
  strokeGap: number;
  effects: Effect[];
  sizingX: SizingMode;
  sizingY: SizingMode;
}

// ---------------------------------------------------------------------------
// Auto-layout
// ---------------------------------------------------------------------------

export type LayoutDirection = 'horizontal' | 'vertical';
export type MainAxisAlign = 'start' | 'center' | 'end' | 'space-between';
export type CrossAxisAlign = 'start' | 'center' | 'end';

export interface AutoLayout {
  direction: LayoutDirection;
  gap: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  alignMain: MainAxisAlign;
  alignCross: CrossAxisAlign;
}

// ---------------------------------------------------------------------------
// Node types (discriminated union)
// ---------------------------------------------------------------------------

export interface FrameNode extends BaseNodeProps {
  type: 'frame';
  childIds: NodeId[];
  clipsContent: boolean;
  cornerRadius: CornerRadius;
  layout: AutoLayout | null;
}

export interface GroupNode extends BaseNodeProps {
  type: 'group';
  childIds: NodeId[];
}

export interface RectNode extends BaseNodeProps {
  type: 'rect';
  cornerRadius: CornerRadius;
}

export interface EllipseNode extends BaseNodeProps {
  type: 'ellipse';
}

/** A line spans (0,0) → (width,0); height is always 0. Rendered from strokes. */
export interface LineNode extends BaseNodeProps {
  type: 'line';
}

export interface PolygonNode extends BaseNodeProps {
  type: 'polygon';
  pointCount: number; // >= 3
}

export interface StarNode extends BaseNodeProps {
  type: 'star';
  pointCount: number; // >= 3
  innerRatio: number; // 0..1
}

export type TextAlignH = 'left' | 'center' | 'right';
export type TextAlignV = 'top' | 'middle' | 'bottom';
/** width: grows horizontally; height: fixed width, grows down; none: fixed box. */
export type TextAutoResize = 'width' | 'height' | 'none';

export interface TextNode extends BaseNodeProps {
  type: 'text';
  characters: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  /** null = auto (1.2 × size). */
  lineHeightPx: number | null;
  letterSpacing: number;
  textAlign: TextAlignH;
  textAlignVertical: TextAlignV;
  autoResize: TextAutoResize;
}

export type SceneNode =
  | FrameNode
  | GroupNode
  | RectNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | StarNode
  | TextNode;

export type NodeType = SceneNode['type'];
export type ContainerNode = FrameNode | GroupNode;

export function isContainer(node: SceneNode): node is ContainerNode {
  return node.type === 'frame' || node.type === 'group';
}

export function hasCornerRadius(node: SceneNode): node is FrameNode | RectNode {
  return node.type === 'frame' || node.type === 'rect';
}

export function childIdsOf(node: SceneNode): readonly NodeId[] {
  return isContainer(node) ? node.childIds : EMPTY_IDS;
}

const EMPTY_IDS: readonly NodeId[] = Object.freeze([]);

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

export interface SceneDocument {
  nodes: Record<NodeId, SceneNode>;
  /** Top-level z-order; index 0 paints first (bottom). */
  rootIds: NodeId[];
}

export function emptyDocument(): SceneDocument {
  return { nodes: {}, rootIds: [] };
}
