export type NodeId = string;

export type Point = Readonly<{ x: number; y: number }>;
export type Size = Readonly<{ width: number; height: number }>;

export type RGBA = Readonly<{ r: number; g: number; b: number; a: number }>;

export type GradientStop = Readonly<{ offset: number; color: RGBA }>;

export type SolidFill = Readonly<{
  kind: "solid";
  color: RGBA;
}>;

export type GradientFill = Readonly<{
  kind: "linear" | "radial";
  from: Point;
  to: Point;
  stops: readonly GradientStop[];
}>;

export type Fill = SolidFill | GradientFill;

export type Stroke = Readonly<{
  color: RGBA;
  width: number;
  align: "inside" | "center" | "outside";
  dash: readonly number[];
}>;

export type Effect =
  | Readonly<{
      kind: "drop-shadow" | "inner-shadow";
      color: RGBA;
      offsetX: number;
      offsetY: number;
      blur: number;
      spread: number;
    }>
  | Readonly<{
      kind: "layer-blur" | "background-blur";
      radius: number;
    }>;

export type CornerRadius =
  | number
  | Readonly<{ topLeft: number; topRight: number; bottomRight: number; bottomLeft: number }>;

export type BlendMode = "normal" | "multiply" | "screen" | "overlay";

export type Constraints = Readonly<{
  horizontal: "left" | "right" | "left-right" | "center" | "scale";
  vertical: "top" | "bottom" | "top-bottom" | "center" | "scale";
}>;

export type BaseNode = Readonly<{
  id: NodeId;
  name: string;
  parentId: NodeId | null;
  children: readonly NodeId[];
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  visible: boolean;
  locked: boolean;
  blendMode: BlendMode;
  constraints: Constraints;
  fills: readonly Fill[];
  strokes: readonly Stroke[];
  effects: readonly Effect[];
}>;

export type FrameNode = BaseNode &
  Readonly<{
    type: "frame";
    clip: boolean;
    autoLayout: AutoLayout | null;
    cornerRadius: CornerRadius;
  }>;

export type RectangleNode = BaseNode &
  Readonly<{
    type: "rectangle";
    cornerRadius: CornerRadius;
  }>;

export type EllipseNode = BaseNode &
  Readonly<{
    type: "ellipse";
  }>;

export type LineNode = BaseNode &
  Readonly<{
    type: "line";
    points: readonly [Point, Point];
  }>;

export type PolygonNode = BaseNode &
  Readonly<{
    type: "polygon";
    sides: number;
    star: boolean;
    innerRadius: number;
  }>;

export type TextNode = BaseNode &
  Readonly<{
    type: "text";
    text: string;
    fontFamily: FontFamily;
    fontWeight: number;
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    align: "left" | "center" | "right";
    verticalAlign: "top" | "middle" | "bottom";
  }>;

export type ImageNode = BaseNode &
  Readonly<{
    type: "image";
    src: string;
    fit: "fill" | "contain" | "cover";
    cornerRadius: CornerRadius;
  }>;

export type SceneNode =
  | FrameNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | PolygonNode
  | TextNode
  | ImageNode;

export type FontFamily =
  | "Inter"
  | "Roboto"
  | "Poppins"
  | "Playfair Display"
  | "JetBrains Mono"
  | "Space Grotesk";

export type AutoLayout = Readonly<{
  direction: "horizontal" | "vertical";
  gap: number;
  padding: Readonly<{ top: number; right: number; bottom: number; left: number }>;
  alignItems: "start" | "center" | "end" | "stretch";
  justifyContent: "start" | "center" | "end" | "space-between";
  hugContents: boolean;
}>;

export type ColorStyle = Readonly<{
  id: string;
  name: string;
  fill: SolidFill;
}>;

export type TextStyle = Readonly<{
  id: string;
  name: string;
  fontFamily: FontFamily;
  fontWeight: number;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
}>;

export type Comment = Readonly<{
  id: string;
  x: number;
  y: number;
  text: string;
  resolved: boolean;
  createdAt: string;
}>;

export type PrototypeLink = Readonly<{
  id: string;
  fromFrameId: NodeId;
  toFrameId: NodeId;
  trigger: "click";
}>;

export type EditorDocument = Readonly<{
  id: string;
  name: string;
  rootId: NodeId;
  nodes: Readonly<Record<NodeId, SceneNode>>;
  selection: readonly NodeId[];
  colorStyles: readonly ColorStyle[];
  textStyles: readonly TextStyle[];
  comments: readonly Comment[];
  prototypeLinks: readonly PrototypeLink[];
  updatedAt: string;
}>;

export type Tool =
  | "select"
  | "frame"
  | "rectangle"
  | "ellipse"
  | "line"
  | "polygon"
  | "text"
  | "image"
  | "comment"
  | "hand";

export type Viewport = Readonly<{
  x: number;
  y: number;
  zoom: number;
}>;

export type SerializedEditor = Readonly<{
  version: 1;
  activeDocumentId: string;
  documents: readonly EditorDocument[];
}>;
