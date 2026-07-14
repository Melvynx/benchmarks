import type { DrawingElement } from "./drawing.schema";
import { createElementId } from "./drawing.schema";
import { measureDrawingText } from "./drawing-geometry";

export type DrawingTemplate = {
  key: string;
  name: string;
  description: string;
  createElements: () => DrawingElement[];
};

const base = {
  angle: 0,
  stroke: "#1e1e1e",
  fill: "transparent",
  strokeWidth: 4,
} as const;

function text(
  content: string,
  x: number,
  y: number,
  fontSize: number,
  stroke = "#1e1e1e",
): DrawingElement {
  const size = measureDrawingText(content, fontSize);
  return {
    ...base,
    id: createElementId(),
    type: "text",
    text: content,
    fontSize,
    x,
    y,
    width: size.width,
    height: size.height,
    stroke,
  };
}

function person(
  x: number,
  y: number,
  width: number,
  height: number,
): DrawingElement {
  return {
    ...base,
    id: createElementId(),
    type: "person",
    x,
    y,
    width,
    height,
    fill: "#e9ecef",
  };
}

function arrow(
  x: number,
  y: number,
  width: number,
  height: number,
  stroke = "#e03131",
): DrawingElement {
  return {
    ...base,
    id: createElementId(),
    type: "arrow",
    x,
    y,
    width,
    height,
    stroke,
    strokeWidth: 8,
  };
}

function rectangle(
  x: number,
  y: number,
  width: number,
  height: number,
  options: Partial<
    Pick<DrawingElement, "stroke" | "fill" | "strokeWidth">
  > = {},
): DrawingElement {
  return {
    ...base,
    id: createElementId(),
    type: "rectangle",
    x,
    y,
    width,
    height,
    ...options,
  };
}

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    key: "big-text-subject",
    name: "Big text + subject",
    description: "Large headline with a subject placeholder on the right",
    createElements: () => [
      text("BIG BOLD\nHEADLINE", 80, 200, 80),
      person(820, 140, 340, 500),
    ],
  },
  {
    key: "reaction-arrow",
    name: "Reaction + arrow",
    description: "Person reacting to something pointed at by an arrow",
    createElements: () => [
      person(80, 220, 300, 440),
      rectangle(760, 160, 420, 300, { fill: "#ffec99" }),
      text("THE THING", 800, 280, 48),
      arrow(430, 300, 280, -60),
      text("WAIT WHAT?!", 80, 90, 48, "#e03131"),
    ],
  },
  {
    key: "split-versus",
    name: "Split-screen versus",
    description: "Two sides compared with a VS in the middle",
    createElements: () => [
      rectangle(40, 40, 560, 640, { fill: "#a5d8ff", strokeWidth: 4 }),
      rectangle(680, 40, 560, 640, { fill: "#ffc9c9", strokeWidth: 4 }),
      person(160, 200, 280, 420),
      person(840, 200, 280, 420),
      text("VS", 585, 300, 80, "#e03131"),
      text("OPTION A", 180, 80, 48),
      text("OPTION B", 820, 80, 48),
    ],
  },
  {
    key: "tutorial-callout",
    name: "Tutorial callout",
    description: "Screenshot area with a step callout and arrow",
    createElements: () => [
      rectangle(80, 120, 760, 480, { fill: "#e9ecef" }),
      text("SCREEN / DEMO", 320, 330, 48),
      rectangle(900, 140, 300, 140, { fill: "#b2f2bb" }),
      text("STEP 1", 960, 180, 48),
      arrow(920, 300, -180, 120),
      text("FULL TUTORIAL", 80, 630, 48, "#1971c2"),
    ],
  },
];
