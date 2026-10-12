export type NodeId = string;

export type RGBA = { r: number; g: number; b: number; a: number };

export type ColorStop = { offset: number; color: RGBA };

export type Fill =
  | { id: string; type: "solid"; color: RGBA; opacity: number; visible: boolean }
  | {
      id: string;
      type: "linear";
      angle: number;
      stops: ColorStop[];
      opacity: number;
      visible: boolean;
    }
  | { id: string; type: "radial"; stops: ColorStop[]; opacity: number; visible: boolean };

export type StrokeAlign = "center" | "inside" | "outside";

export type Stroke = {
  id: string;
  color: RGBA;
  opacity: number;
  width: number;
  align: StrokeAlign;
  dash: number[];
  visible: boolean;
};

export type Effect =
  | {
      id: string;
      type: "drop-shadow";
      color: RGBA;
      x: number;
      y: number;
      blur: number;
      spread: number;
      visible: boolean;
    }
  | {
      id: string;
      type: "inner-shadow";
      color: RGBA;
      x: number;
      y: number;
      blur: number;
      spread: number;
      visible: boolean;
    }
  | { id: string; type: "layer-blur"; radius: number; visible: boolean }
  | { id: string; type: "background-blur"; radius: number; visible: boolean };

export type ConstraintH = "left" | "right" | "center" | "scale" | "left-right";
export type ConstraintV = "top" | "bottom" | "center" | "scale" | "top-bottom";
export type LayoutMode = "none" | "horizontal" | "vertical";
export type PrimaryAlign = "start" | "center" | "end" | "space-between";
export type CounterAlign = "start" | "center" | "end" | "stretch";
export type SizingMode = "fixed" | "hug" | "fill";
export type TextAlign = "left" | "center" | "right";
export type TextAutoResize = "width" | "height" | "none";

export type BaseNode = {
  id: NodeId;
  name: string;
  parentId: NodeId | null;
  childIds: NodeId[];
  visible: boolean;
  locked: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  cornerRadius: [number, number, number, number];
  fills: Fill[];
  strokes: Stroke[];
  effects: Effect[];
  constraintH: ConstraintH;
  constraintV: ConstraintV;
  layoutSizingH: SizingMode;
  layoutSizingV: SizingMode;
  layoutPositioning: "auto" | "absolute";
  fillStyleId: string | null;
  textStyleId: string | null;
  prototypeTargetId: string | null;
  masterNodeId: string | null;
  overriddenKeys: string[];
};

export type CanvasNode = {
  type: "canvas";
  id: NodeId;
  name: string;
  parentId: null;
  childIds: NodeId[];
  visible: true;
  locked: true;
};

export type FrameFields = {
  clip: boolean;
  layoutMode: LayoutMode;
  itemSpacing: number;
  padding: [number, number, number, number];
  primaryAlign: PrimaryAlign;
  counterAlign: CounterAlign;
  primarySizing: "fixed" | "hug";
  counterSizing: "fixed" | "hug";
};

export type FrameNode = BaseNode & FrameFields & { type: "frame"; isComponent: boolean };

export type InstanceNode = BaseNode &
  FrameFields & { type: "instance"; componentId: NodeId };

export type GroupNode = BaseNode & { type: "group" };
export type RectangleNode = BaseNode & { type: "rectangle" };
export type EllipseNode = BaseNode & { type: "ellipse" };
export type LineNode = BaseNode & { type: "line" };
export type PolygonNode = BaseNode & { type: "polygon"; sides: number };
export type StarNode = BaseNode & { type: "star"; points: number; innerRatio: number };
export type ImageNode = BaseNode & { type: "image"; src: string };
export type TextNode = BaseNode & {
  type: "text";
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: TextAlign;
  textAutoResize: TextAutoResize;
};

export type VectorPoint = {
  id: string;
  x: number;
  y: number;
  handleIn: { x: number; y: number } | null;
  handleOut: { x: number; y: number } | null;
};

export type VectorNode = BaseNode & {
  type: "vector";
  closed: boolean;
  contours: { points: VectorPoint[] }[];
};

export type SceneNode =
  | CanvasNode
  | FrameNode
  | InstanceNode
  | GroupNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | StarNode
  | ImageNode
  | TextNode
  | VectorNode;

export type GeometricNode = Exclude<SceneNode, CanvasNode>;

export type Guide = { id: string; axis: "x" | "y"; offset: number };

export type Comment = {
  id: string;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  createdAt: number;
};

export type ColorStyle = { id: string; name: string; color: RGBA };
export type TextStyle = {
  id: string;
  name: string;
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  textAlign: TextAlign;
};

export type Camera = { x: number; y: number; zoom: number };

export type Page = {
  id: string;
  name: string;
  background: RGBA;
  nodes: Record<NodeId, SceneNode>;
  rootId: NodeId;
  guides: Guide[];
  comments: Comment[];
  camera: Camera;
};

export type DesignDocument = {
  id: string;
  name: string;
  pages: Page[];
  currentPageId: string;
  colorStyles: ColorStyle[];
  textStyles: TextStyle[];
};

export type ToolId =
  | "select"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "line"
  | "polygon"
  | "star"
  | "pen"
  | "text"
  | "hand"
  | "comment";

export const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Poppins",
  "Playfair Display",
  "JetBrains Mono",
  "Space Grotesk",
] as const;

export function isGeometric(node: SceneNode): node is GeometricNode {
  return node.type !== "canvas";
}

export function isFrameLike(node: SceneNode): node is FrameNode | InstanceNode {
  return node.type === "frame" || node.type === "instance";
}

export function isContainer(node: SceneNode): boolean {
  return node.type === "canvas" || node.type === "frame" || node.type === "instance" || node.type === "group";
}
