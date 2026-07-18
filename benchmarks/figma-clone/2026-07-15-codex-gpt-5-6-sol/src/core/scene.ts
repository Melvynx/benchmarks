import type {
  AutoLayout,
  BaseNode,
  DesignDocument,
  EllipseNode,
  ComponentNode,
  FrameNode,
  ImageNode,
  LineNode,
  Paint,
  RectangleNode,
  RGBA,
  SceneNode,
  StarNode,
  TextNode,
} from "./types";

export const rgba = (red: number, green: number, blue: number, alpha = 1): RGBA => [red, green, blue, alpha];
export const solid = (color: RGBA): Paint => ({ type: "solid", color, visible: true });

const transparentStroke = {
  color: rgba(0, 0, 0, 0),
  width: 0,
  align: "inside" as const,
  dash: [] as readonly number[],
  visible: false,
};

function baseNode(id: string, name: string, parentId: string | null, x: number, y: number, width: number, height: number): BaseNode {
  return {
    id,
    name,
    parentId,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fills: [solid(rgba(248, 248, 250))],
    stroke: transparentStroke,
    effects: [],
    cornerRadius: [0, 0, 0, 0],
    blendMode: "source-over",
  };
}

export function createRectangle(
  id: string,
  name: string,
  parentId: string | null,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGBA,
  radius = 0,
): RectangleNode {
  return { ...baseNode(id, name, parentId, x, y, width, height), type: "rectangle", fills: [solid(color)], cornerRadius: [radius, radius, radius, radius] };
}

export function createEllipse(
  id: string,
  name: string,
  parentId: string | null,
  x: number,
  y: number,
  width: number,
  height: number,
  color: RGBA,
): EllipseNode {
  return { ...baseNode(id, name, parentId, x, y, width, height), type: "ellipse", fills: [solid(color)] };
}

export function createText(
  id: string,
  name: string,
  parentId: string | null,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  color: RGBA,
  weight = 500,
): TextNode {
  return {
    ...baseNode(id, name, parentId, x, y, width, fontSize * 1.35),
    type: "text",
    text,
    fills: [solid(color)],
    fontFamily: "Inter",
    fontSize,
    fontWeight: weight,
    lineHeight: 1.25,
    letterSpacing: 0,
    textAlign: "left",
    italic: false,
  };
}

export function createFrame(
  id: string,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
  children: readonly string[],
  background = rgba(255, 255, 255),
  parentId: string | null = null,
  autoLayout: AutoLayout | null = null,
): FrameNode {
  return {
    ...baseNode(id, name, parentId, x, y, width, height),
    type: "frame",
    children,
    fills: [solid(background)],
    background,
    clipContent: true,
    autoLayout,
  };
}

export function createNodeForTool(type: "rectangle" | "ellipse" | "line" | "star" | "frame" | "text", x: number, y: number): SceneNode {
  const id = crypto.randomUUID();
  if (type === "ellipse") return createEllipse(id, "Ellipse", null, x, y, 120, 120, rgba(178, 99, 255));
  if (type === "line") {
    const node: LineNode = { ...baseNode(id, "Line", null, x, y, 160, 1), type: "line", fills: [], stroke: { color: rgba(30, 30, 34), width: 2, align: "center", dash: [], visible: true } };
    return node;
  }
  if (type === "star") {
    const node: StarNode = { ...baseNode(id, "Star", null, x, y, 140, 140), type: "star", fills: [solid(rgba(255, 197, 61))], points: 5, innerRatio: 0.45 };
    return node;
  }
  if (type === "frame") return createFrame(id, "Frame", x, y, 360, 480, [], rgba(255, 255, 255));
  if (type === "text") return createText(id, "Text", null, "Type something", x, y, 220, 28, rgba(30, 30, 34), 600);
  return createRectangle(id, "Rectangle", null, x, y, 160, 120, rgba(95, 92, 230), 12);
}

export function createImageNode(src: string, x: number, y: number, width: number, height: number): ImageNode {
  return {
    ...baseNode(crypto.randomUUID(), "Image", null, x, y, width, height),
    type: "image",
    src,
    fit: "cover",
    fills: [],
    cornerRadius: [12, 12, 12, 12],
  };
}

function initialNodes(): readonly SceneNode[] {
  const canvas = "frame-dashboard";
  const phone = "frame-mobile";
  const sidebar = "dashboard-sidebar";
  const chart = "chart-card";
  const chartLine = "chart-line";
  const phoneCard = "phone-card";
  return [
    createFrame(canvas, "Financial dashboard", 520, 80, 1080, 720, [sidebar, "brand", "nav-1", "nav-2", "nav-3", "nav-4", "greeting", "avatar", "metric-a", "metric-b", "metric-c", chart, chartLine, "chart-title", "chart-value", "chart-pill", "bar-1", "bar-2", "bar-3", "bar-4", "bar-5", "activity-title", "activity-row-1", "activity-row-2"], rgba(247, 248, 250)),
    createRectangle(sidebar, "Sidebar", canvas, 0, 0, 232, 720, rgba(24, 25, 29)),
    createText("brand", "Brand", canvas, "NORTHSTAR", 34, 34, 150, 17, rgba(255, 255, 255), 800),
    createText("nav-1", "Overview", canvas, "⌂   Overview", 32, 112, 160, 14, rgba(255, 255, 255), 650),
    createText("nav-2", "Payments", canvas, "◫   Payments", 32, 160, 160, 14, rgba(162, 164, 173), 550),
    createText("nav-3", "Analytics", canvas, "⌁   Analytics", 32, 208, 160, 14, rgba(162, 164, 173), 550),
    createText("nav-4", "Customers", canvas, "♙   Customers", 32, 256, 160, 14, rgba(162, 164, 173), 550),
    createText("greeting", "Page title", canvas, "Good morning, Alex", 280, 42, 380, 30, rgba(25, 26, 30), 750),
    createEllipse("avatar", "Avatar", canvas, 990, 38, 42, 42, rgba(255, 178, 145)),
    { ...createRectangle("metric-a", "Revenue card", canvas, 280, 112, 224, 136, rgba(255, 255, 255), 18), effects: [{ type: "drop-shadow", color: rgba(24, 25, 29, 0.08), offset: { x: 0, y: 6 }, blur: 18, spread: 0, visible: true }] },
    { ...createRectangle("metric-b", "Orders card", canvas, 524, 112, 224, 136, rgba(95, 92, 230), 18), effects: [{ type: "drop-shadow", color: rgba(95, 92, 230, 0.18), offset: { x: 0, y: 8 }, blur: 20, spread: 0, visible: true }] },
    { ...createRectangle("metric-c", "Customers card", canvas, 768, 112, 264, 136, rgba(255, 255, 255), 18), effects: [{ type: "drop-shadow", color: rgba(24, 25, 29, 0.08), offset: { x: 0, y: 6 }, blur: 18, spread: 0, visible: true }] },
    createRectangle(chart, "Revenue chart", canvas, 280, 276, 488, 378, rgba(255, 255, 255), 18),
    { ...createRectangle(chartLine, "Chart gradient", canvas, 320, 426, 405, 3, rgba(95, 92, 230), 2), rotation: -8 },
    createText("chart-title", "Chart title", canvas, "Revenue overview", 312, 306, 230, 17, rgba(30, 31, 35), 700),
    createText("chart-value", "Chart value", canvas, "$128,420", 312, 346, 230, 32, rgba(30, 31, 35), 750),
    createRectangle("chart-pill", "Growth badge", canvas, 622, 310, 104, 30, rgba(226, 249, 238), 15),
    createRectangle("bar-1", "Bar 1", canvas, 332, 535, 36, 78, rgba(219, 218, 252), 8),
    createRectangle("bar-2", "Bar 2", canvas, 402, 493, 36, 120, rgba(165, 162, 242), 8),
    createRectangle("bar-3", "Bar 3", canvas, 472, 463, 36, 150, rgba(95, 92, 230), 8),
    createRectangle("bar-4", "Bar 4", canvas, 542, 517, 36, 96, rgba(165, 162, 242), 8),
    createRectangle("bar-5", "Bar 5", canvas, 612, 442, 36, 171, rgba(95, 92, 230), 8),
    createText("activity-title", "Activity title", canvas, "Recent activity", 812, 294, 180, 18, rgba(30, 31, 35), 700),
    createRectangle("activity-row-1", "Activity row", canvas, 800, 338, 208, 84, rgba(255, 255, 255), 14),
    createRectangle("activity-row-2", "Activity row", canvas, 800, 438, 208, 84, rgba(255, 255, 255), 14),
    createFrame(phone, "Travel mobile app", 80, 80, 360, 720, ["phone-bg", "phone-kicker", "phone-title", "phone-subtitle", phoneCard, "phone-orb-a", "phone-orb-b", "phone-price", "phone-button", "phone-tab-1", "phone-tab-2", "phone-tab-3"], rgba(15, 18, 29)),
    createRectangle("phone-bg", "Background", phone, 0, 0, 360, 720, rgba(15, 18, 29)),
    createText("phone-kicker", "Kicker", phone, "AURORA TRAVEL", 28, 42, 220, 12, rgba(172, 169, 255), 750),
    createText("phone-title", "Headline", phone, "Find your next\nextraordinary place.", 28, 84, 304, 31, rgba(255, 255, 255), 760),
    { ...createText("phone-subtitle", "Subtitle", phone, "Curated escapes for people who would rather wander than wait.", 28, 178, 290, 15, rgba(170, 174, 190), 450), height: 44 },
    { ...createRectangle(phoneCard, "Destination card", phone, 28, 252, 304, 304, rgba(91, 78, 180), 24), fills: [{ type: "linear", visible: true, start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, stops: [{ offset: 0, color: rgba(117, 101, 222) }, { offset: 1, color: rgba(29, 31, 58) }] }] },
    createEllipse("phone-orb-a", "Orb", phone, 68, 292, 196, 196, rgba(252, 180, 144, 0.9)),
    createEllipse("phone-orb-b", "Orb highlight", phone, 116, 328, 164, 164, rgba(141, 218, 220, 0.62)),
    createText("phone-price", "Destination", phone, "SANTORINI  ·  FROM $240", 52, 506, 250, 13, rgba(255, 255, 255), 700),
    createRectangle("phone-button", "Explore button", phone, 28, 580, 304, 52, rgba(255, 255, 255), 16),
    createText("phone-tab-1", "Home tab", phone, "⌂", 62, 670, 32, 18, rgba(255, 255, 255), 650),
    createText("phone-tab-2", "Search tab", phone, "⌕", 168, 670, 32, 18, rgba(117, 120, 135), 650),
    createText("phone-tab-3", "Profile tab", phone, "○", 272, 670, 32, 18, rgba(117, 120, 135), 650),
  ];
}

export function createInitialDocument(): DesignDocument {
  const nodes = initialNodes();
  return {
    id: crypto.randomUUID(),
    name: "Untitled design",
    nodes: Object.fromEntries(nodes.map((node) => [node.id, node])),
    rootIds: ["frame-mobile", "frame-dashboard"],
    background: "#e8e9ec",
    updatedAt: Date.now(),
    version: 1,
  };
}

export function orderedNodes(document: DesignDocument): readonly SceneNode[] {
  const result: SceneNode[] = [];
  const visit = (id: string): void => {
    const node = document.nodes[id];
    if (!node) return;
    result.push(node);
    if ("children" in node) node.children.forEach(visit);
  };
  document.rootIds.forEach(visit);
  return result;
}

export function isContainer(node: SceneNode): node is FrameNode | ComponentNode | Extract<SceneNode, { type: "group" }> {
  return "children" in node;
}
