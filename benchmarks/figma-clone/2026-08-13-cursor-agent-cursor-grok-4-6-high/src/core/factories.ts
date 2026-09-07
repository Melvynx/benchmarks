import { BLACK, WHITE, clonePaint, color, rgb, solid } from "./color";
import { nid } from "./ids";
import type {
  AutoLayout,
  BaseNode,
  ComponentNode,
  Constraints,
  Corners,
  Document,
  Effect,
  EllipseNode,
  FrameNode,
  GroupNode,
  ImageNode,
  InstanceNode,
  LineNode,
  Page,
  PathNode,
  PathPoint,
  PolygonNode,
  RectangleNode,
  SceneNode,
  StarNode,
  Stroke,
  TextNode,
  TextProps,
} from "./types";

export function defaultConstraints(): Constraints {
  return { horizontal: "left", vertical: "top" };
}

export function uniformCorners(n: number): Corners {
  return { tl: n, tr: n, br: n, bl: n };
}

export function defaultStroke(): Stroke {
  return {
    paint: solid(BLACK),
    thickness: 1,
    align: "inside",
    cap: "butt",
    join: "miter",
    dash: [],
  };
}

export function defaultText(): TextProps {
  return {
    fontFamily: "Inter",
    fontWeight: 400,
    fontSize: 16,
    lineHeight: 1.2,
    letterSpacing: 0,
    align: "left",
    color: BLACK,
  };
}

export function defaultLayout(): AutoLayout {
  return {
    direction: "horizontal",
    gap: 8,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    primaryAlign: "start",
    counterAlign: "start",
    wrap: false,
    childSizing: { horizontal: "hug", vertical: "hug" },
  };
}

function base(
  partial: Partial<BaseNode> & Pick<BaseNode, "name">,
): Omit<BaseNode, "id"> & { id: string } {
  return {
    id: partial.id ?? nid(),
    name: partial.name,
    parentId: partial.parentId ?? null,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width ?? 100,
    height: partial.height ?? 100,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    fills: partial.fills ?? [solid(rgb(217, 217, 217))],
    strokes: partial.strokes ?? [],
    effects: partial.effects ?? [],
    blendMode: partial.blendMode ?? "source-over",
    constraints: partial.constraints ?? defaultConstraints(),
    fillStyleId: partial.fillStyleId ?? null,
    textStyleId: partial.textStyleId ?? null,
  };
}

export function createRectangle(p: Partial<RectangleNode> & Pick<RectangleNode, "name">): RectangleNode {
  return { ...base(p), type: "rectangle", cornerRadius: p.cornerRadius ?? uniformCorners(0) };
}

export function createEllipse(p: Partial<EllipseNode> & Pick<EllipseNode, "name">): EllipseNode {
  return { ...base(p), type: "ellipse" };
}

export function createLine(p: Partial<LineNode> & Pick<LineNode, "name">): LineNode {
  return {
    ...base({ ...p, fills: p.fills ?? [], height: p.height ?? 0, width: p.width ?? 120 }),
    type: "line",
    strokes: p.strokes ?? [defaultStroke()],
  };
}

export function createPolygon(p: Partial<PolygonNode> & Pick<PolygonNode, "name">): PolygonNode {
  return { ...base(p), type: "polygon", sides: p.sides ?? 6, cornerRadius: p.cornerRadius ?? 0 };
}

export function createStar(p: Partial<StarNode> & Pick<StarNode, "name">): StarNode {
  return { ...base(p), type: "star", points: p.points ?? 5, innerRatio: p.innerRatio ?? 0.4 };
}

export function createText(p: Partial<TextNode> & Pick<TextNode, "name">): TextNode {
  return {
    ...base({
      ...p,
      fills: p.fills ?? [],
      width: p.width ?? 200,
      height: p.height ?? 24,
    }),
    type: "text",
    characters: p.characters ?? "Text",
    text: p.text ?? defaultText(),
  };
}

export function createImage(p: Partial<ImageNode> & Pick<ImageNode, "name" | "src">): ImageNode {
  return {
    ...base({ ...p, fills: p.fills ?? [] }),
    type: "image",
    src: p.src,
    fit: p.fit ?? "fill",
    cornerRadius: p.cornerRadius ?? uniformCorners(0),
  };
}

export function createPath(p: Partial<PathNode> & Pick<PathNode, "name">): PathNode {
  return {
    ...base({ ...p, fills: p.fills ?? [solid(rgb(13, 153, 255))], width: p.width ?? 1, height: p.height ?? 1 }),
    type: "path",
    points: p.points ?? [],
    closed: p.closed ?? false,
  };
}

export function createFrame(p: Partial<FrameNode> & Pick<FrameNode, "name">): FrameNode {
  return {
    ...base({
      ...p,
      fills: p.fills ?? [solid(WHITE)],
      width: p.width ?? 390,
      height: p.height ?? 844,
    }),
    type: "frame",
    children: p.children ?? [],
    clipContent: p.clipContent ?? true,
    layout: p.layout ?? null,
    cornerRadius: p.cornerRadius ?? uniformCorners(0),
  };
}

export function createGroup(p: Partial<GroupNode> & Pick<GroupNode, "name">): GroupNode {
  return {
    ...base({ ...p, fills: p.fills ?? [], strokes: p.strokes ?? [] }),
    type: "group",
    children: p.children ?? [],
  };
}

export function createComponent(p: Partial<ComponentNode> & Pick<ComponentNode, "name">): ComponentNode {
  return {
    ...base({
      ...p,
      fills: p.fills ?? [solid(WHITE)],
    }),
    type: "component",
    children: p.children ?? [],
    clipContent: p.clipContent ?? true,
    layout: p.layout ?? null,
    cornerRadius: p.cornerRadius ?? uniformCorners(0),
  };
}

export function createInstance(
  p: Partial<InstanceNode> & Pick<InstanceNode, "name" | "componentId">,
): InstanceNode {
  return {
    ...base(p),
    type: "instance",
    componentId: p.componentId,
    overrides: p.overrides ?? {},
  };
}

export function createPage(name = "Page 1"): Page {
  return {
    id: nid("page"),
    name,
    children: [],
    background: color(0.18, 0.18, 0.19, 1),
  };
}

export function emptyDocument(name = "Untitled"): Document {
  const page = createPage("Page 1");
  return {
    id: nid("doc"),
    name,
    pages: [page],
    activePageId: page.id,
    nodes: {},
    colorStyles: [],
    textStyles: [],
    prototypeLinks: [],
    comments: [],
    schema: 1,
  };
}

export function isParent(n: SceneNode): n is FrameNode | GroupNode | ComponentNode {
  return n.type === "frame" || n.type === "group" || n.type === "component";
}

export function hasCornerRadius(
  n: SceneNode,
): n is FrameNode | RectangleNode | ImageNode | ComponentNode {
  return n.type === "frame" || n.type === "rectangle" || n.type === "image" || n.type === "component";
}

export function cloneNode<T extends SceneNode>(n: T): T {
  return structuredClone(n);
}

export function dropShadow(x = 0, y = 4, blur = 12, a = 0.18): Effect {
  return {
    type: "drop-shadow",
    color: color(0, 0, 0, a),
    x,
    y,
    blur,
    spread: 0,
    visible: true,
  };
}

export function clonePaints(paints: SceneNode["fills"]): SceneNode["fills"] {
  return paints.map(clonePaint);
}

export function defaultPoint(x: number, y: number): PathPoint {
  return { x, y, handleIn: { x: 0, y: 0 }, handleOut: { x: 0, y: 0 }, kind: "corner" };
}
