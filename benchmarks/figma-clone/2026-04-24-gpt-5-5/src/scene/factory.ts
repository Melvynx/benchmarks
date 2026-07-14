import { nanoid } from "nanoid";
import type {
  AutoLayout,
  BaseNode,
  Constraints,
  EditorDocument,
  Fill,
  FontFamily,
  FrameNode,
  RectangleNode,
  EllipseNode,
  LineNode,
  PolygonNode,
  TextNode,
  ImageNode,
  NodeId,
  SceneNode,
  SolidFill,
  Stroke,
} from "../types/nodes";

export const whiteFill: SolidFill = { kind: "solid", color: { r: 248, g: 246, b: 240, a: 1 } };
export const inkFill: SolidFill = { kind: "solid", color: { r: 31, g: 33, b: 35, a: 1 } };
export const accentFill: SolidFill = { kind: "solid", color: { r: 236, g: 43, b: 118, a: 1 } };

const defaultConstraints: Constraints = { horizontal: "left", vertical: "top" };

export function makeId(prefix: string): NodeId {
  return `${prefix}_${nanoid(8)}`;
}

export function defaultStroke(): Stroke {
  return { color: { r: 42, g: 45, b: 50, a: 1 }, width: 1, align: "inside", dash: [] };
}

export function baseNode(input: {
  id?: NodeId;
  name: string;
  parentId: NodeId | null;
  x: number;
  y: number;
  width: number;
  height: number;
  fills?: readonly Fill[];
  strokes?: readonly Stroke[];
}): BaseNode {
  return {
    id: input.id ?? makeId("node"),
    name: input.name,
    parentId: input.parentId,
    children: [],
    x: input.x,
    y: input.y,
    width: Math.max(1, input.width),
    height: Math.max(1, input.height),
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    blendMode: "normal",
    constraints: defaultConstraints,
    fills: input.fills ?? [whiteFill],
    strokes: input.strokes ?? [],
    effects: [],
  };
}

export function createRectangle(parentId: NodeId | null, x: number, y: number, width: number, height: number): RectangleNode {
  return { ...baseNode({ name: "Rectangle", parentId, x, y, width, height, fills: [whiteFill], strokes: [defaultStroke()] }), type: "rectangle", cornerRadius: 8 };
}

export function createFrame(parentId: NodeId | null, x: number, y: number, width: number, height: number): FrameNode {
  const autoLayout: AutoLayout = {
    direction: "vertical",
    gap: 16,
    padding: { top: 24, right: 24, bottom: 24, left: 24 },
    alignItems: "stretch",
    justifyContent: "start",
    hugContents: false,
  };
  return {
    ...baseNode({ name: "Frame", parentId, x, y, width, height, fills: [{ kind: "solid", color: { r: 255, g: 255, b: 255, a: 1 } }], strokes: [defaultStroke()] }),
    type: "frame",
    clip: true,
    autoLayout,
    cornerRadius: 12,
  };
}

export function createEllipse(parentId: NodeId | null, x: number, y: number, width: number, height: number): EllipseNode {
  return {
    ...baseNode({
      name: "Ellipse",
      parentId,
      x,
      y,
      width,
      height,
      fills: [{ kind: "radial", from: { x: 0.3, y: 0.25 }, to: { x: 0.9, y: 0.9 }, stops: [{ offset: 0, color: { r: 255, g: 229, b: 148, a: 1 } }, { offset: 1, color: { r: 236, g: 43, b: 118, a: 1 } }] }],
    }),
    type: "ellipse",
  };
}

export function createLine(parentId: NodeId | null, x: number, y: number, width: number, height: number): LineNode {
  return {
    ...baseNode({ name: "Line", parentId, x, y, width, height, fills: [], strokes: [{ ...defaultStroke(), width: 3 }] }),
    type: "line",
    points: [
      { x: 0, y: 0 },
      { x: width, y: height },
    ],
  };
}

export function createPolygon(parentId: NodeId | null, x: number, y: number, width: number, height: number): PolygonNode {
  return {
    ...baseNode({ name: "Star", parentId, x, y, width, height, fills: [accentFill], strokes: [] }),
    type: "polygon",
    sides: 5,
    star: true,
    innerRadius: 0.45,
  };
}

export function createText(parentId: NodeId | null, x: number, y: number, text = "Text"): TextNode {
  return {
    ...baseNode({ name: "Text", parentId, x, y, width: 220, height: 72, fills: [inkFill], strokes: [] }),
    type: "text",
    text,
    fontFamily: "Inter" satisfies FontFamily,
    fontWeight: 600,
    fontSize: 32,
    lineHeight: 1.15,
    letterSpacing: 0,
    align: "left",
    verticalAlign: "top",
  };
}

export function createImage(parentId: NodeId | null, x: number, y: number, src: string): ImageNode {
  return {
    ...baseNode({ name: "Image", parentId, x, y, width: 360, height: 240, fills: [], strokes: [defaultStroke()] }),
    type: "image",
    src,
    fit: "cover",
    cornerRadius: 8,
  };
}

export function createSeedDocument(): EditorDocument {
  const rootId = makeId("root");
  const heroId = makeId("frame");
  const cardId = makeId("rect");
  const titleId = makeId("text");
  const ellipseId = makeId("ellipse");
  const buttonId = makeId("rect");
  const buttonTextId = makeId("text");

  const root: Extract<SceneNode, { type: "frame" }> = {
    ...baseNode({ id: rootId, name: "Page", parentId: null, x: 0, y: 0, width: 0, height: 0, fills: [], strokes: [] }),
    type: "frame",
    clip: false,
    autoLayout: null,
    cornerRadius: 0,
    children: [heroId],
  };
  const hero: Extract<SceneNode, { type: "frame" }> = {
    ...createFrame(rootId, 120, 100, 820, 520),
    id: heroId,
    name: "Product frame",
    children: [ellipseId, cardId, titleId, buttonId, buttonTextId],
    fills: [{ kind: "solid", color: { r: 248, g: 246, b: 240, a: 1 } }],
  };
  const ellipse: SceneNode = { ...createEllipse(heroId, 668, 142, 220, 220), id: ellipseId, name: "Accent orb", opacity: 0.84 };
  const card: SceneNode = {
    ...createRectangle(heroId, 184, 360, 460, 148),
    id: cardId,
    name: "Content surface",
    fills: [{ kind: "solid", color: { r: 255, g: 255, b: 255, a: 1 } }],
    effects: [{ kind: "drop-shadow", color: { r: 31, g: 33, b: 35, a: 0.14 }, offsetX: 0, offsetY: 20, blur: 45, spread: 0 }],
  };
  const title: SceneNode = {
    ...createText(heroId, 184, 170, "Precise tools,\nquiet surface."),
    id: titleId,
    name: "Headline",
    width: 520,
    height: 116,
    fontFamily: "Space Grotesk" satisfies FontFamily,
    fontWeight: 700,
    fontSize: 56,
  };
  const button: SceneNode = {
    ...createRectangle(heroId, 212, 422, 168, 46),
    id: buttonId,
    name: "Button fill",
    cornerRadius: 23,
    fills: [accentFill],
    strokes: [],
  };
  const buttonText: SceneNode = {
    ...createText(heroId, 243, 433, "Inspect"),
    id: buttonTextId,
    name: "Button label",
    width: 110,
    height: 24,
    fills: [{ kind: "solid", color: { r: 255, g: 255, b: 255, a: 1 } }],
    fontSize: 16,
    fontWeight: 700,
  };

  return {
    id: makeId("doc"),
    name: "Untitled canvas",
    rootId,
    nodes: {
      [rootId]: root,
      [heroId]: hero,
      [ellipseId]: ellipse,
      [cardId]: card,
      [titleId]: title,
      [buttonId]: button,
      [buttonTextId]: buttonText,
    },
    selection: [heroId],
    colorStyles: [
      { id: makeId("style"), name: "Canvas / Warm paper", fill: whiteFill },
      { id: makeId("style"), name: "Accent / Magenta", fill: accentFill },
      { id: makeId("style"), name: "Ink / Charcoal", fill: inkFill },
    ],
    textStyles: [
      { id: makeId("textstyle"), name: "Display / Space Grotesk 56", fontFamily: "Space Grotesk", fontWeight: 700, fontSize: 56, lineHeight: 1.04, letterSpacing: 0 },
      { id: makeId("textstyle"), name: "UI / Inter 13", fontFamily: "Inter", fontWeight: 600, fontSize: 13, lineHeight: 1.25, letterSpacing: 0 },
    ],
    comments: [{ id: makeId("comment"), x: 964, y: 140, text: "Try dragging, duplicating, and exporting this frame.", resolved: false, createdAt: new Date().toISOString() }],
    prototypeLinks: [],
    updatedAt: new Date().toISOString(),
  };
}
