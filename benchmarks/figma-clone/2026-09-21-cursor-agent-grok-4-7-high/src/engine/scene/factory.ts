import { createId } from "../ids";
import type {
  BaseNode,
  Camera,
  ColorStyle,
  DesignDocument,
  Effect,
  Fill,
  FrameNode,
  GeometricNode,
  Page,
  RGBA,
  SceneNode,
  Stroke,
  TextNode,
  TextStyle,
} from "../types";

export const DEFAULT_CAMERA: Camera = { x: 160, y: 96, zoom: 1 };

export function rgba(r: number, g: number, b: number, a = 1): RGBA {
  return { r, g, b, a };
}

export function solidFill(color: RGBA, opacity = 1): Fill {
  return { id: createId("fill"), type: "solid", color, opacity, visible: true };
}

export function defaultStroke(color: RGBA = rgba(20, 20, 24, 1), width = 1): Stroke {
  return {
    id: createId("stroke"),
    color,
    opacity: 1,
    width,
    align: "center",
    dash: [],
    visible: true,
  };
}

function base(partial: Partial<BaseNode> & Pick<BaseNode, "name" | "width" | "height">): BaseNode {
  return {
    id: partial.id ?? createId("n"),
    name: partial.name,
    parentId: partial.parentId ?? null,
    childIds: partial.childIds ?? [],
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    x: partial.x ?? 0,
    y: partial.y ?? 0,
    width: partial.width,
    height: partial.height,
    rotation: partial.rotation ?? 0,
    opacity: partial.opacity ?? 1,
    cornerRadius: partial.cornerRadius ?? [0, 0, 0, 0],
    fills: partial.fills ?? [],
    strokes: partial.strokes ?? [],
    effects: partial.effects ?? [],
    constraintH: partial.constraintH ?? "left",
    constraintV: partial.constraintV ?? "top",
    layoutSizingH: partial.layoutSizingH ?? "fixed",
    layoutSizingV: partial.layoutSizingV ?? "fixed",
    layoutPositioning: partial.layoutPositioning ?? "auto",
    fillStyleId: partial.fillStyleId ?? null,
    textStyleId: partial.textStyleId ?? null,
    prototypeTargetId: partial.prototypeTargetId ?? null,
    masterNodeId: partial.masterNodeId ?? null,
    overriddenKeys: partial.overriddenKeys ?? [],
  };
}

const frameFields = {
  clip: true,
  layoutMode: "none" as const,
  itemSpacing: 10,
  padding: [0, 0, 0, 0] as [number, number, number, number],
  primaryAlign: "start" as const,
  counterAlign: "start" as const,
  primarySizing: "fixed" as const,
  counterSizing: "fixed" as const,
};

export function createCanvas(): SceneNode {
  return {
    type: "canvas",
    id: createId("canvas"),
    name: "Canvas",
    parentId: null,
    childIds: [],
    visible: true,
    locked: true,
  };
}

export function createFrame(partial: Partial<FrameNode> = {}): FrameNode {
  return {
    ...base({ name: "Frame", width: 200, height: 160, fills: [solidFill(rgba(255, 255, 255))], ...partial }),
    ...frameFields,
    type: "frame",
    isComponent: partial.isComponent ?? false,
    clip: partial.clip ?? true,
    layoutMode: partial.layoutMode ?? "none",
    itemSpacing: partial.itemSpacing ?? 10,
    padding: partial.padding ?? [0, 0, 0, 0],
    primaryAlign: partial.primaryAlign ?? "start",
    counterAlign: partial.counterAlign ?? "start",
    primarySizing: partial.primarySizing ?? "fixed",
    counterSizing: partial.counterSizing ?? "fixed",
  };
}

export function createRectangle(partial: Partial<GeometricNode> = {}): GeometricNode {
  return {
    ...base({
      name: "Rectangle",
      width: 120,
      height: 80,
      fills: [solidFill(rgba(196, 201, 214))],
      ...partial,
    }),
    type: "rectangle",
  };
}

export function createEllipse(partial: Partial<GeometricNode> = {}): GeometricNode {
  return {
    ...base({
      name: "Ellipse",
      width: 100,
      height: 100,
      fills: [solidFill(rgba(176, 186, 210))],
      ...partial,
    }),
    type: "ellipse",
  };
}

export function createLine(partial: Partial<GeometricNode> = {}): GeometricNode {
  return {
    ...base({
      name: "Line",
      width: 160,
      height: 0,
      strokes: [defaultStroke(rgba(28, 28, 34), 2)],
      ...partial,
    }),
    type: "line",
  };
}

export function createPolygon(sides = 5, partial: Partial<GeometricNode> = {}): GeometricNode {
  return {
    ...base({
      name: "Polygon",
      width: 120,
      height: 120,
      fills: [solidFill(rgba(186, 176, 214))],
      ...partial,
    }),
    type: "polygon",
    sides,
  };
}

export function createStar(partial: Partial<GeometricNode> = {}): GeometricNode {
  return {
    ...base({
      name: "Star",
      width: 120,
      height: 120,
      fills: [solidFill(rgba(214, 186, 140))],
      ...partial,
    }),
    type: "star",
    points: 5,
    innerRatio: 0.45,
  };
}

export function createText(partial: Partial<TextNode> = {}): TextNode {
  return {
    ...base({
      name: "Text",
      width: 80,
      height: 22,
      fills: [solidFill(rgba(22, 22, 26))],
      ...partial,
    }),
    type: "text",
    text: partial.text ?? "Text",
    fontFamily: partial.fontFamily ?? "Inter",
    fontWeight: partial.fontWeight ?? 400,
    fontSize: partial.fontSize ?? 16,
    lineHeight: partial.lineHeight ?? 22,
    letterSpacing: partial.letterSpacing ?? 0,
    textAlign: partial.textAlign ?? "left",
    textAutoResize: partial.textAutoResize ?? "width",
  };
}

export function createImage(src: string, partial: Partial<GeometricNode> = {}): GeometricNode {
  return {
    ...base({
      name: "Image",
      width: partial.width ?? 240,
      height: partial.height ?? 180,
      ...partial,
    }),
    type: "image",
    src,
  };
}

export function createGroup(partial: Partial<GeometricNode> = {}): GeometricNode {
  return {
    ...base({ name: "Group", width: 100, height: 100, ...partial }),
    type: "group",
  };
}

export function createVector(partial: Partial<GeometricNode> = {}): GeometricNode {
  return {
    ...base({
      name: "Path",
      width: 1,
      height: 1,
      strokes: [defaultStroke(rgba(22, 22, 26), 2)],
      ...partial,
    }),
    type: "vector",
    closed: false,
    contours: [{ points: [] }],
  };
}

export function createPage(name: string): Page {
  const canvas = createCanvas();
  return {
    id: createId("page"),
    name,
    background: rgba(228, 228, 234),
    nodes: { [canvas.id]: canvas },
    rootId: canvas.id,
    guides: [],
    comments: [],
    camera: { ...DEFAULT_CAMERA },
  };
}

export function createDocument(name = "Untitled"): DesignDocument {
  const page = createPage("Page 1");
  return {
    id: createId("doc"),
    name,
    pages: [page],
    currentPageId: page.id,
    colorStyles: [],
    textStyles: [],
  };
}

export function createColorStyle(name: string, color: RGBA): ColorStyle {
  return { id: createId("cs"), name, color };
}

export function createTextStyle(partial: Partial<TextStyle> & Pick<TextStyle, "name">): TextStyle {
  return {
    id: createId("ts"),
    name: partial.name,
    fontFamily: partial.fontFamily ?? "Inter",
    fontWeight: partial.fontWeight ?? 400,
    fontSize: partial.fontSize ?? 16,
    lineHeight: partial.lineHeight ?? 22,
    letterSpacing: partial.letterSpacing ?? 0,
    textAlign: partial.textAlign ?? "left",
  };
}

export function dropShadow(partial: Partial<Extract<Effect, { type: "drop-shadow" }>> = {}): Effect {
  return {
    id: createId("fx"),
    type: "drop-shadow",
    color: partial.color ?? rgba(0, 0, 0, 0.25),
    x: partial.x ?? 0,
    y: partial.y ?? 4,
    blur: partial.blur ?? 12,
    spread: partial.spread ?? 0,
    visible: partial.visible ?? true,
  };
}
