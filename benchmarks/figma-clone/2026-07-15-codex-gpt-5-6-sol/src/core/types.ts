export type NodeId = string;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Bounds extends Point {
  readonly width: number;
  readonly height: number;
}

export type RGBA = readonly [number, number, number, number];

export interface GradientStop {
  readonly offset: number;
  readonly color: RGBA;
}

export type Paint =
  | { readonly type: "solid"; readonly color: RGBA; readonly visible: boolean }
  | {
      readonly type: "linear" | "radial";
      readonly stops: readonly GradientStop[];
      readonly start: Point;
      readonly end: Point;
      readonly visible: boolean;
    };

export interface Stroke {
  readonly color: RGBA;
  readonly width: number;
  readonly align: "inside" | "center" | "outside";
  readonly dash: readonly number[];
  readonly visible: boolean;
}

export type Effect =
  | {
      readonly type: "drop-shadow" | "inner-shadow";
      readonly color: RGBA;
      readonly offset: Point;
      readonly blur: number;
      readonly spread: number;
      readonly visible: boolean;
    }
  | { readonly type: "layer-blur" | "background-blur"; readonly radius: number; readonly visible: boolean };

export interface AutoLayout {
  readonly direction: "horizontal" | "vertical";
  readonly gap: number;
  readonly padding: readonly [number, number, number, number];
  readonly align: "start" | "center" | "end" | "space-between";
  readonly sizing: "fixed" | "hug";
}

export interface BaseNode extends Bounds {
  readonly id: NodeId;
  readonly name: string;
  readonly parentId: NodeId | null;
  readonly rotation: number;
  readonly opacity: number;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly fills: readonly Paint[];
  readonly stroke: Stroke;
  readonly effects: readonly Effect[];
  readonly cornerRadius: readonly [number, number, number, number];
  readonly blendMode: GlobalCompositeOperation;
}

export interface FrameNode extends BaseNode {
  readonly type: "frame";
  readonly children: readonly NodeId[];
  readonly clipContent: boolean;
  readonly autoLayout: AutoLayout | null;
  readonly background: RGBA;
}

export interface ComponentNode extends Omit<FrameNode, "type"> {
  readonly type: "component";
}

export interface RectangleNode extends BaseNode {
  readonly type: "rectangle";
}

export interface EllipseNode extends BaseNode {
  readonly type: "ellipse";
}

export interface LineNode extends BaseNode {
  readonly type: "line";
}

export interface StarNode extends BaseNode {
  readonly type: "star";
  readonly points: number;
  readonly innerRatio: number;
}

export interface TextNode extends BaseNode {
  readonly type: "text";
  readonly text: string;
  readonly fontFamily: "Inter" | "Roboto" | "Poppins" | "Playfair Display" | "JetBrains Mono" | "Space Grotesk";
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly textAlign: CanvasTextAlign;
  readonly italic: boolean;
}

export interface ImageNode extends BaseNode {
  readonly type: "image";
  readonly src: string;
  readonly fit: "cover" | "contain" | "fill";
}

export interface GroupNode extends BaseNode {
  readonly type: "group";
  readonly children: readonly NodeId[];
}

export interface InstanceNode extends BaseNode {
  readonly type: "instance";
  readonly componentId: NodeId;
  readonly overrides: Readonly<Record<string, string | number | boolean>>;
}

export type SceneNode = FrameNode | ComponentNode | RectangleNode | EllipseNode | LineNode | StarNode | TextNode | ImageNode | GroupNode | InstanceNode;

export type Tool = "select" | "frame" | "rectangle" | "ellipse" | "line" | "star" | "text" | "hand" | "comment";
export type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w" | "rotate";

export interface Viewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface DesignDocument {
  readonly id: string;
  readonly name: string;
  readonly nodes: Readonly<Record<NodeId, SceneNode>>;
  readonly rootIds: readonly NodeId[];
  readonly background: string;
  readonly updatedAt: number;
  readonly version: number;
}

export interface Guide {
  readonly axis: "x" | "y";
  readonly value: number;
  readonly from: number;
  readonly to: number;
  readonly label?: string;
}

export interface EditorUiState {
  readonly leftPanelOpen: boolean;
  readonly rightPanelOpen: boolean;
  readonly layersTab: "layers" | "assets";
  readonly propertyTab: "design" | "prototype" | "inspect";
  readonly layerQuery: string;
  readonly showGrid: boolean;
  readonly showRulers: boolean;
  readonly pixelPreview: boolean;
  readonly toast: string | null;
}

export interface EditorState {
  readonly document: DesignDocument;
  readonly selection: readonly NodeId[];
  readonly tool: Tool;
  readonly viewport: Viewport;
  readonly ui: EditorUiState;
  readonly previewNodes: Readonly<Record<NodeId, SceneNode>>;
  readonly guides: readonly Guide[];
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly historyLabel: string | null;
  readonly editingTextId: NodeId | null;
}
