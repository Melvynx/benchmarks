export type NodeId = string;
export type PageId = string;
export type DocumentId = string;
export type StyleId = string;

export type Tool =
  | "select"
  | "hand"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "line"
  | "polygon"
  | "star"
  | "text"
  | "pen"
  | "comment"
  | "prototype"
  | "zoom";

export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface Vec2 {
  x: number;
  y: number;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Canvas/SVG 2D matrix: [a, b, c, d, e, f] maps (x,y) → (ax+cy+e, bx+dy+f). */
export type Mat2D = readonly [number, number, number, number, number, number];

export interface Corners {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface ColorStop {
  offset: number;
  color: Color;
}

export type Paint =
  | { type: "solid"; color: Color; opacity: number }
  | {
      type: "linear";
      stops: ColorStop[];
      opacity: number;
      start: Vec2;
      end: Vec2;
    }
  | {
      type: "radial";
      stops: ColorStop[];
      opacity: number;
      center: Vec2;
      radius: number;
    };

export interface Stroke {
  paint: Paint;
  thickness: number;
  align: "inside" | "center" | "outside";
  cap: "butt" | "round" | "square";
  join: "miter" | "bevel" | "round";
  dash: number[];
}

export type Effect =
  | {
      type: "drop-shadow";
      color: Color;
      x: number;
      y: number;
      blur: number;
      spread: number;
      visible: boolean;
    }
  | {
      type: "inner-shadow";
      color: Color;
      x: number;
      y: number;
      blur: number;
      spread: number;
      visible: boolean;
    }
  | { type: "layer-blur"; radius: number; visible: boolean }
  | { type: "background-blur"; radius: number; visible: boolean };

export interface Constraints {
  horizontal: "left" | "right" | "center" | "left-right" | "scale";
  vertical: "top" | "bottom" | "center" | "top-bottom" | "scale";
}

export type AlignPrimary = "start" | "center" | "end" | "space-between";
export type AlignCounter = "start" | "center" | "end";
export type LayoutSizing = "hug" | "fixed" | "fill";

export interface AutoLayout {
  direction: "horizontal" | "vertical";
  gap: number;
  padding: { top: number; right: number; bottom: number; left: number };
  primaryAlign: AlignPrimary;
  counterAlign: AlignCounter;
  wrap: boolean;
  childSizing: { horizontal: LayoutSizing; vertical: LayoutSizing };
}

export interface TextProps {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  align: "left" | "center" | "right" | "justify";
  color: Color;
}

export interface PathPoint {
  x: number;
  y: number;
  handleIn: Vec2;
  handleOut: Vec2;
  kind: "corner" | "smooth" | "mirrored";
}

export interface ColorStyle {
  id: StyleId;
  name: string;
  paint: Paint;
}

export interface TextStyle {
  id: StyleId;
  name: string;
  text: TextProps;
}

export interface PrototypeLink {
  id: string;
  fromId: NodeId;
  toId: NodeId;
  animation: "instant" | "dissolve";
}

export interface CommentThread {
  id: string;
  x: number;
  y: number;
  resolved: boolean;
  messages: { id: string; author: string; body: string; createdAt: number }[];
}

export interface BaseNode {
  id: NodeId;
  name: string;
  parentId: NodeId | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  fills: Paint[];
  strokes: Stroke[];
  effects: Effect[];
  blendMode: GlobalCompositeOperation;
  constraints: Constraints;
  fillStyleId: StyleId | null;
  textStyleId: StyleId | null;
}

export interface FrameNode extends BaseNode {
  type: "frame";
  children: NodeId[];
  clipContent: boolean;
  layout: AutoLayout | null;
  cornerRadius: Corners;
}

export interface GroupNode extends BaseNode {
  type: "group";
  children: NodeId[];
}

export interface RectangleNode extends BaseNode {
  type: "rectangle";
  cornerRadius: Corners;
}

export interface EllipseNode extends BaseNode {
  type: "ellipse";
}

export interface LineNode extends BaseNode {
  type: "line";
}

export interface PolygonNode extends BaseNode {
  type: "polygon";
  sides: number;
  cornerRadius: number;
}

export interface StarNode extends BaseNode {
  type: "star";
  points: number;
  innerRatio: number;
}

export interface TextNode extends BaseNode {
  type: "text";
  characters: string;
  text: TextProps;
}

export interface ImageNode extends BaseNode {
  type: "image";
  src: string;
  fit: "fill" | "fit" | "crop";
  cornerRadius: Corners;
}

export interface PathNode extends BaseNode {
  type: "path";
  points: PathPoint[];
  closed: boolean;
}

export interface ComponentNode extends BaseNode {
  type: "component";
  children: NodeId[];
  clipContent: boolean;
  layout: AutoLayout | null;
  cornerRadius: Corners;
}

export interface InstanceNode extends BaseNode {
  type: "instance";
  componentId: NodeId;
  overrides: InstanceOverrides;
}

export interface InstanceOverrides {
  characters?: Record<NodeId, string>;
  fills?: Record<NodeId, Paint[]>;
  width?: number;
  height?: number;
}

export type SceneNode =
  | FrameNode
  | GroupNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | StarNode
  | TextNode
  | ImageNode
  | PathNode
  | ComponentNode
  | InstanceNode;

export type ParentNode = FrameNode | GroupNode | ComponentNode;

export interface Page {
  id: PageId;
  name: string;
  children: NodeId[];
  background: Color;
}

export interface Document {
  id: DocumentId;
  name: string;
  pages: Page[];
  activePageId: PageId;
  nodes: Record<NodeId, SceneNode>;
  colorStyles: ColorStyle[];
  textStyles: TextStyle[];
  prototypeLinks: PrototypeLink[];
  comments: CommentThread[];
  schema: 1;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Guide {
  axis: "x" | "y";
  position: number;
  kind: "align" | "distance";
  label?: string;
}

export interface DocumentMeta {
  id: DocumentId;
  name: string;
  updatedAt: number;
}

export const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Poppins",
  "Playfair Display",
  "JetBrains Mono",
  "Space Grotesk",
] as const;

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 64;
export const HISTORY_LIMIT = 150;
export const SNAP_PX = 5;
export const HANDLE_SIZE = 8;
export const ROTATE_HANDLE_OFFSET = 28;
export const MIN_SIZE = 1;
export const RULER_SIZE = 20;
export const GRID_MINOR = 8;
export const GRID_MAJOR = 80;
