export const SCENE_SCHEMA_VERSION = 1 as const;

export type SceneSchemaVersion = typeof SCENE_SCHEMA_VERSION;
export type NodeId = string;
export type DocumentId = string;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface RgbaColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

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

interface PaintBase {
  readonly id: string;
  readonly visible: boolean;
  readonly opacity: number;
  readonly blendMode: BlendMode;
}

export interface SolidPaint extends PaintBase {
  readonly type: 'solid';
  readonly color: RgbaColor;
}

export interface GradientStop {
  readonly position: number;
  readonly color: RgbaColor;
}

export interface LinearGradientPaint extends PaintBase {
  readonly type: 'linear-gradient';
  readonly start: Point;
  readonly end: Point;
  readonly stops: readonly GradientStop[];
}

export interface RadialGradientPaint extends PaintBase {
  readonly type: 'radial-gradient';
  readonly center: Point;
  readonly radius: Point;
  readonly focalPoint: Point;
  readonly stops: readonly GradientStop[];
}

export type Paint = SolidPaint | LinearGradientPaint | RadialGradientPaint;

export type StrokeAlign = 'inside' | 'center' | 'outside';
export type StrokeCap = 'none' | 'round' | 'square' | 'arrow' | 'triangle';
export type StrokeJoin = 'miter' | 'round' | 'bevel';

export interface Stroke {
  readonly id: string;
  readonly visible: boolean;
  readonly paint: Paint;
  readonly width: number;
  readonly align: StrokeAlign;
  readonly cap: StrokeCap;
  readonly join: StrokeJoin;
  readonly dash: readonly number[];
  readonly miterLimit: number;
}

interface ShadowEffectBase {
  readonly id: string;
  readonly visible: boolean;
  readonly color: RgbaColor;
  readonly offset: Point;
  readonly blur: number;
  readonly spread: number;
  readonly blendMode: BlendMode;
}

export interface DropShadowEffect extends ShadowEffectBase {
  readonly type: 'drop-shadow';
}

export interface InnerShadowEffect extends ShadowEffectBase {
  readonly type: 'inner-shadow';
}

export interface LayerBlurEffect {
  readonly id: string;
  readonly type: 'layer-blur';
  readonly visible: boolean;
  readonly radius: number;
}

export interface BackgroundBlurEffect {
  readonly id: string;
  readonly type: 'background-blur';
  readonly visible: boolean;
  readonly radius: number;
}

export type Effect = DropShadowEffect | InnerShadowEffect | LayerBlurEffect | BackgroundBlurEffect;

export interface CornerRadii {
  readonly topLeft: number;
  readonly topRight: number;
  readonly bottomRight: number;
  readonly bottomLeft: number;
}

export interface Constraints {
  readonly horizontal: 'left' | 'right' | 'left-right' | 'center' | 'scale';
  readonly vertical: 'top' | 'bottom' | 'top-bottom' | 'center' | 'scale';
}

export type LayoutSizing = 'fixed' | 'hug' | 'fill';

export interface LayoutItemSettings {
  readonly positioning: 'auto' | 'absolute';
  readonly horizontalSizing: LayoutSizing;
  readonly verticalSizing: LayoutSizing;
  readonly grow: number;
  readonly alignSelf: 'auto' | 'start' | 'center' | 'end' | 'stretch';
  readonly minWidth: number | null;
  readonly maxWidth: number | null;
  readonly minHeight: number | null;
  readonly maxHeight: number | null;
}

export interface AutoLayoutPadding {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface AutoLayoutSettings {
  readonly direction: 'horizontal' | 'vertical';
  readonly gap: number;
  readonly padding: AutoLayoutPadding;
  readonly primaryAlignment: 'start' | 'center' | 'end' | 'space-between';
  readonly counterAlignment: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  readonly wrap: boolean;
  readonly counterAxisGap: number;
  readonly horizontalSizing: LayoutSizing;
  readonly verticalSizing: LayoutSizing;
  readonly reverse: boolean;
}

export interface BaseNode {
  readonly id: NodeId;
  readonly type: SceneNodeType;
  readonly name: string;
  readonly parentId: NodeId | null;
  readonly visible: boolean;
  readonly locked: boolean;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly opacity: number;
  readonly blendMode: BlendMode;
  readonly cornerRadii: CornerRadii;
  readonly fills: readonly Paint[];
  readonly strokes: readonly Stroke[];
  readonly effects: readonly Effect[];
  readonly constraints: Constraints;
  readonly layoutItem: LayoutItemSettings;
}

export interface FrameNode extends BaseNode {
  readonly type: 'frame';
  readonly childIds: readonly NodeId[];
  readonly clipContent: boolean;
  readonly autoLayout: AutoLayoutSettings | null;
}

export interface GroupNode extends BaseNode {
  readonly type: 'group';
  readonly childIds: readonly NodeId[];
}

export interface RectangleNode extends BaseNode {
  readonly type: 'rectangle';
}

export interface EllipseNode extends BaseNode {
  readonly type: 'ellipse';
  readonly arcStart: number;
  readonly arcEnd: number;
  readonly innerRadius: number;
}

export interface LineNode extends BaseNode {
  readonly type: 'line';
  readonly start: Point;
  readonly end: Point;
  readonly startCap: StrokeCap;
  readonly endCap: StrokeCap;
}

export const PRELOADED_FONT_FAMILIES = [
  'Inter',
  'Roboto',
  'Poppins',
  'Playfair Display',
  'JetBrains Mono',
  'Space Grotesk',
] as const;

export type FontFamily = string;

export interface TextNode extends BaseNode {
  readonly type: 'text';
  readonly content: string;
  readonly fontFamily: FontFamily;
  readonly fontWeight: number;
  readonly fontStyle: 'normal' | 'italic';
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly textAlign: 'left' | 'center' | 'right' | 'justify';
  readonly verticalAlign: 'top' | 'center' | 'bottom';
  readonly textDecoration: 'none' | 'underline' | 'line-through';
  readonly textCase: 'original' | 'upper' | 'lower' | 'title';
  readonly autoResize: 'none' | 'width-and-height' | 'height';
}

export interface ImageSource {
  readonly kind: 'data-url' | 'remote-url' | 'blob-url';
  readonly uri: string;
  readonly mimeType: string;
  readonly intrinsicWidth: number;
  readonly intrinsicHeight: number;
}

export interface ImageCrop {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ImageNode extends BaseNode {
  readonly type: 'image';
  readonly source: ImageSource;
  readonly fit: 'fill' | 'fit' | 'crop' | 'tile';
  readonly crop: ImageCrop;
  readonly smoothing: boolean;
}

export interface PolygonNode extends BaseNode {
  readonly type: 'polygon';
  readonly pointCount: number;
}

export interface StarNode extends BaseNode {
  readonly type: 'star';
  readonly pointCount: number;
  readonly innerRadius: number;
}

export type SceneNode =
  | FrameNode
  | GroupNode
  | RectangleNode
  | EllipseNode
  | LineNode
  | TextNode
  | ImageNode
  | PolygonNode
  | StarNode;

export type SceneNodeType = SceneNode['type'];
export type ContainerNode = FrameNode | GroupNode;

export interface SceneDocument {
  readonly schemaVersion: SceneSchemaVersion;
  readonly id: DocumentId;
  readonly name: string;
  readonly nodes: Readonly<Record<NodeId, SceneNode>>;
  readonly rootIds: readonly NodeId[];
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly background: RgbaColor;
}

export type CommonNodeChanges = Partial<
  Pick<
    BaseNode,
    | 'name'
    | 'visible'
    | 'locked'
    | 'x'
    | 'y'
    | 'width'
    | 'height'
    | 'rotation'
    | 'opacity'
    | 'blendMode'
    | 'cornerRadii'
    | 'fills'
    | 'strokes'
    | 'effects'
    | 'constraints'
    | 'layoutItem'
  >
>;

export type NodeFactoryInput<Node extends SceneNode> = Partial<Omit<Node, 'id' | 'type'>> & {
  readonly id?: NodeId;
};
