import {
  createArrowElement,
  createEllipseElement,
  createPersonElement,
  createRectElement,
  createTextElement,
} from "./drawing.document";
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DRAWING_VERSION,
  type DrawingDocument,
} from "./drawing.schema";

export const DRAWING_TEMPLATE_IDS = [
  "big-text-subject",
  "reaction-arrow",
  "split-versus",
  "tutorial-callout",
] as const;

export type DrawingTemplateId = (typeof DRAWING_TEMPLATE_IDS)[number];

export const DRAWING_TEMPLATES: {
  id: DrawingTemplateId;
  label: string;
  description: string;
}[] = [
  {
    id: "big-text-subject",
    label: "Big text + subject",
    description: "Headline on the left, person placeholder on the right",
  },
  {
    id: "reaction-arrow",
    label: "Reaction + arrow",
    description: "Person reacting toward a pointed callout",
  },
  {
    id: "split-versus",
    label: "Split versus",
    description: "Two subjects facing off with a VS label",
  },
  {
    id: "tutorial-callout",
    label: "Tutorial callout",
    description: "Numbered step, arrow, and subject frame",
  },
];

export function createTemplateDocument(
  templateId: DrawingTemplateId,
): DrawingDocument {
  return {
    version: DRAWING_VERSION,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    background: "#fafafa",
    elements: createTemplateElements(templateId),
  };
}

function createTemplateElements(templateId: DrawingTemplateId) {
  switch (templateId) {
    case "big-text-subject":
      return [
        createTextElement({
          x: 64,
          y: 88,
          width: 720,
          height: 120,
          text: "BIG HOOK",
          fontSize: 96,
        }),
        createTextElement({
          x: 64,
          y: 230,
          width: 640,
          height: 72,
          text: "One line that sells the click",
          fontSize: 36,
          fontWeight: 600,
          fill: "#374151",
        }),
        createPersonElement({ x: 860, y: 120, width: 320, height: 520 }),
      ];
    case "reaction-arrow":
      return [
        createPersonElement({ x: 72, y: 140, width: 280, height: 500 }),
        createArrowElement({
          x: 390,
          y: 340,
          width: 280,
          height: -40,
          strokeWidth: 8,
        }),
        createTextElement({
          x: 700,
          y: 250,
          width: 500,
          height: 160,
          text: "WAIT WHAT",
          fontSize: 88,
        }),
      ];
    case "split-versus":
      return [
        createRectElement({
          x: 40,
          y: 40,
          width: 560,
          height: 640,
          fill: "#f3f4f6",
          stroke: "#d1d5db",
        }),
        createRectElement({
          x: 680,
          y: 40,
          width: 560,
          height: 640,
          fill: "#f3f4f6",
          stroke: "#d1d5db",
        }),
        createPersonElement({ x: 140, y: 160, width: 360, height: 460 }),
        createPersonElement({ x: 780, y: 160, width: 360, height: 460 }),
        createEllipseElement({
          x: 575,
          y: 300,
          width: 130,
          height: 130,
          fill: "#111827",
          stroke: "#111827",
        }),
        createTextElement({
          x: 575,
          y: 328,
          width: 130,
          height: 80,
          text: "VS",
          fontSize: 48,
          align: "center",
          fill: "#fafafa",
        }),
      ];
    case "tutorial-callout":
      return [
        createEllipseElement({
          x: 56,
          y: 56,
          width: 96,
          height: 96,
          fill: "#111827",
          stroke: "#111827",
        }),
        createTextElement({
          x: 56,
          y: 72,
          width: 96,
          height: 72,
          text: "1",
          fontSize: 52,
          align: "center",
          fill: "#fafafa",
        }),
        createTextElement({
          x: 176,
          y: 64,
          width: 640,
          height: 80,
          text: "Do this first",
          fontSize: 56,
        }),
        createArrowElement({
          x: 220,
          y: 200,
          width: 40,
          height: 180,
          strokeWidth: 6,
        }),
        createRectElement({
          x: 80,
          y: 400,
          width: 620,
          height: 240,
          fill: "transparent",
          stroke: "#1a1a1a",
          strokeWidth: 4,
        }),
        createTextElement({
          x: 104,
          y: 480,
          width: 560,
          height: 80,
          text: "Step detail",
          fontSize: 40,
          fontWeight: 600,
        }),
        createPersonElement({ x: 860, y: 140, width: 320, height: 500 }),
      ];
  }
}
