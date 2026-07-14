// A few editable starter layouts. Each template returns a fresh set of
// elements (with new ids) laid out on the 1280x720 stage. Everything inserted
// is a normal element the user can then move, resize, edit, and delete.

import {
  newElementId,
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type DrawingElement,
} from "./drawing-document";

export type DrawingTemplate = {
  id: string;
  name: string;
  description: string;
  build: () => DrawingElement[];
};

function id(): string {
  return newElementId();
}

function text(
  partial: Partial<Extract<DrawingElement, { type: "text" }>> & {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
  },
): DrawingElement {
  return {
    id: id(),
    type: "text",
    rotation: 0,
    opacity: 1,
    color: "#1e1e1e",
    fontSize: 64,
    fontFamily: "hand",
    fontWeight: 800,
    align: "center",
    ...partial,
  };
}

function rectangle(
  partial: Partial<Extract<DrawingElement, { type: "rectangle" }>> & {
    x: number;
    y: number;
    width: number;
    height: number;
  },
): DrawingElement {
  return {
    id: id(),
    type: "rectangle",
    rotation: 0,
    opacity: 1,
    stroke: "#1e1e1e",
    strokeWidth: 3,
    fill: "transparent",
    cornerRadius: 16,
    ...partial,
  };
}

function placeholder(
  partial: Partial<Extract<DrawingElement, { type: "placeholder" }>> & {
    x: number;
    y: number;
    width: number;
    height: number;
  },
): DrawingElement {
  return {
    id: id(),
    type: "placeholder",
    rotation: 0,
    opacity: 1,
    color: "#94a3b8",
    label: "Subject",
    ...partial,
  };
}

function arrow(
  start: { x: number; y: number },
  end: { x: number; y: number },
  stroke = "#e03131",
  strokeWidth = 6,
): DrawingElement {
  return {
    id: id(),
    type: "arrow",
    start,
    end,
    opacity: 1,
    stroke,
    strokeWidth,
  };
}

function ellipse(
  partial: Partial<Extract<DrawingElement, { type: "ellipse" }>> & {
    x: number;
    y: number;
    width: number;
    height: number;
  },
): DrawingElement {
  return {
    id: id(),
    type: "ellipse",
    rotation: 0,
    opacity: 1,
    stroke: "#1e1e1e",
    strokeWidth: 3,
    fill: "transparent",
    ...partial,
  };
}

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: "big-text-subject",
    name: "Big text + subject",
    description: "Bold headline with a subject placeholder.",
    build: () => [
      text({
        x: 60,
        y: 120,
        width: 720,
        height: 260,
        text: "YOUR BIG\nIDEA HERE",
        fontSize: 110,
        align: "left",
        color: "#1e1e1e",
      }),
      text({
        x: 60,
        y: 430,
        width: 640,
        height: 90,
        text: "A punchy subtitle",
        fontSize: 44,
        fontWeight: 600,
        align: "left",
        color: "#e03131",
      }),
      placeholder({ x: 900, y: 150, width: 300, height: 430 }),
    ],
  },
  {
    id: "reaction-arrow",
    name: "Reaction + arrow",
    description: "A person reacting to something, with an arrow.",
    build: () => [
      placeholder({ x: 90, y: 170, width: 320, height: 440, label: "You" }),
      arrow({ x: 470, y: 360 }, { x: 780, y: 360 }),
      rectangle({
        x: 820,
        y: 200,
        width: 380,
        height: 320,
        cornerRadius: 20,
        strokeWidth: 4,
      }),
      text({
        x: 830,
        y: 300,
        width: 360,
        height: 120,
        text: "THIS?!",
        fontSize: 88,
        color: "#e03131",
      }),
    ],
  },
  {
    id: "versus",
    name: "Split-screen VS",
    description: "Two options facing off.",
    build: () => [
      rectangle({
        x: 60,
        y: 90,
        width: 520,
        height: 540,
        cornerRadius: 24,
        stroke: "#1971c2",
        strokeWidth: 5,
      }),
      rectangle({
        x: 700,
        y: 90,
        width: 520,
        height: 540,
        cornerRadius: 24,
        stroke: "#e03131",
        strokeWidth: 5,
      }),
      text({
        x: 120,
        y: 300,
        width: 400,
        height: 120,
        text: "OPTION A",
        fontSize: 60,
        color: "#1971c2",
      }),
      text({
        x: 760,
        y: 300,
        width: 400,
        height: 120,
        text: "OPTION B",
        fontSize: 60,
        color: "#e03131",
      }),
      ellipse({
        x: 570,
        y: 280,
        width: 140,
        height: 140,
        fill: "#1e1e1e",
        stroke: "#1e1e1e",
      }),
      text({
        x: 570,
        y: 305,
        width: 140,
        height: 90,
        text: "VS",
        fontSize: 56,
        color: "#ffffff",
      }),
    ],
  },
  {
    id: "tutorial-callout",
    name: "Tutorial callout",
    description: "Screenshot area with a highlighted callout.",
    build: () => [
      rectangle({
        x: 60,
        y: 90,
        width: 760,
        height: 540,
        cornerRadius: 18,
        stroke: "#adb5bd",
        strokeWidth: 3,
      }),
      text({
        x: 120,
        y: 130,
        width: 640,
        height: 70,
        text: "Your screenshot",
        fontSize: 40,
        fontWeight: 600,
        align: "left",
        color: "#adb5bd",
      }),
      ellipse({
        x: 520,
        y: 360,
        width: 220,
        height: 150,
        stroke: "#e03131",
        strokeWidth: 6,
      }),
      arrow({ x: 980, y: 300 }, { x: 720, y: 430 }),
      text({
        x: 860,
        y: 150,
        width: 360,
        height: 140,
        text: "STEP 1:\nCLICK HERE",
        fontSize: 52,
        color: "#e03131",
        align: "left",
      }),
    ],
  },
];

export function getTemplateById(templateId: string): DrawingTemplate | null {
  return (
    DRAWING_TEMPLATES.find((template) => template.id === templateId) ?? null
  );
}

export const TEMPLATE_STAGE = { width: STAGE_WIDTH, height: STAGE_HEIGHT };
