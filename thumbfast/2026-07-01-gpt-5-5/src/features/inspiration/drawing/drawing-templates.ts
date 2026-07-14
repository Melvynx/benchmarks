import {
  DRAWING_CANVAS,
  createDrawingId,
  createEmptyDrawingDocument,
  type DrawingDocument,
  type DrawingObject,
  type DrawingPlaceholderVariant,
} from "./drawing-types";

type WithoutId<T> = T extends { id: string } ? Omit<T, "id"> : never;
type TemplateObjectInput = WithoutId<DrawingObject>;

export type DrawingTemplate = {
  id: string;
  name: string;
  description: string;
  objects: TemplateObjectInput[];
};

const baseStyle = {
  fill: "#ffffff",
  stroke: "#111827",
  strokeWidth: 4,
  opacity: 1,
};

function object(input: TemplateObjectInput): DrawingObject {
  return {
    ...input,
    id: createDrawingId(input.type),
    visible: input.visible ?? true,
    locked: input.locked ?? false,
  } as DrawingObject;
}

function text(
  name: string,
  textValue: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize = 76,
): TemplateObjectInput {
  return {
    type: "text",
    name,
    text: textValue,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    style: {
      fill: "#111827",
      stroke: "#ffffff",
      strokeWidth: 8,
      fontSize,
      fontWeight: 900,
      align: "center",
      outline: true,
      shadow: true,
    },
  };
}

function placeholder(
  variant: DrawingPlaceholderVariant,
  name: string,
  x: number,
  y: number,
  width: number,
  height: number,
): TemplateObjectInput {
  return {
    type: "placeholder",
    variant,
    name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    style: {
      fill: "#d1d5db",
      stroke: "#374151",
      strokeWidth: 5,
      opacity: 1,
    },
  };
}

export const drawingTemplates: DrawingTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start with an empty 16:9 frame.",
    objects: [],
  },
  {
    id: "before-after",
    name: "Before / After",
    description: "Two clear halves with a strong center divider.",
    objects: [
      {
        type: "rect",
        name: "Before panel",
        x: 60,
        y: 70,
        width: 540,
        height: 560,
        rotation: 0,
        opacity: 1,
        style: { ...baseStyle, fill: "#e5e7eb", stroke: "#111827" },
      },
      {
        type: "rect",
        name: "After panel",
        x: 680,
        y: 70,
        width: 540,
        height: 560,
        rotation: 0,
        opacity: 1,
        style: { ...baseStyle, fill: "#fef3c7", stroke: "#111827" },
      },
      {
        type: "line",
        name: "Center divider",
        x: 640,
        y: 60,
        width: 0,
        height: 600,
        rotation: 0,
        opacity: 1,
        style: { stroke: "#111827", strokeWidth: 8, opacity: 1 },
      },
      text("Before label", "BEFORE", 95, 520, 470, 80, 54),
      text("After label", "AFTER", 715, 520, 470, 80, 54),
    ],
  },
  {
    id: "versus",
    name: "Versus",
    description: "Left and right subjects with a central VS badge.",
    objects: [
      placeholder("person", "Left subject", 120, 155, 310, 420),
      placeholder("person", "Right subject", 850, 155, 310, 420),
      {
        type: "ellipse",
        name: "VS badge",
        x: 515,
        y: 230,
        width: 250,
        height: 250,
        rotation: 0,
        opacity: 1,
        style: { ...baseStyle, fill: "#ef4444", stroke: "#111827" },
      },
      text("VS text", "VS", 535, 300, 210, 105, 90),
    ],
  },
  {
    id: "shocked-face-arrow",
    name: "Shocked Face + Arrow",
    description: "Reaction face, big arrow, and target callout.",
    objects: [
      placeholder("reaction", "Reaction pose", 70, 115, 380, 500),
      {
        type: "arrow",
        name: "Attention arrow",
        x: 475,
        y: 360,
        width: 320,
        height: -140,
        rotation: 0,
        opacity: 1,
        style: { stroke: "#dc2626", strokeWidth: 24, arrowHead: true },
      },
      placeholder("burst", "Highlight burst", 805, 130, 360, 320),
      text("Headline", "WHAT?!", 730, 505, 430, 110, 84),
    ],
  },
  {
    id: "big-text-subject",
    name: "Big Text + Subject",
    description: "Large text block beside a clear hero subject.",
    objects: [
      text("Main headline", "BIG RESULT", 70, 95, 560, 210, 86),
      text("Second line", "IN 7 DAYS", 70, 305, 560, 150, 72),
      placeholder("person", "Hero subject", 750, 105, 365, 510),
      placeholder("badge", "Proof badge", 555, 470, 210, 130),
    ],
  },
  {
    id: "split-screen",
    name: "Split Screen",
    description: "Two competing scenes with angled tension.",
    objects: [
      {
        type: "rect",
        name: "Left screen",
        x: 0,
        y: 0,
        width: 640,
        height: DRAWING_CANVAS.height,
        rotation: 0,
        opacity: 1,
        style: { ...baseStyle, fill: "#dbeafe", strokeWidth: 0 },
      },
      {
        type: "rect",
        name: "Right screen",
        x: 640,
        y: 0,
        width: 640,
        height: DRAWING_CANVAS.height,
        rotation: 0,
        opacity: 1,
        style: { ...baseStyle, fill: "#fee2e2", strokeWidth: 0 },
      },
      placeholder("face", "Left face", 135, 140, 330, 330),
      placeholder("face", "Right face", 815, 140, 330, 330),
      text("Left label", "OLD", 120, 525, 400, 80, 62),
      text("Right label", "NEW", 760, 525, 400, 80, 62),
    ],
  },
  {
    id: "tutorial-callout",
    name: "Tutorial Callout",
    description: "Product or screen focus with numbered callouts.",
    objects: [
      {
        type: "rect",
        name: "Screen area",
        x: 135,
        y: 95,
        width: 720,
        height: 430,
        rotation: 0,
        opacity: 1,
        style: { ...baseStyle, fill: "#f3f4f6", stroke: "#111827" },
      },
      placeholder("callout", "Step 1 callout", 835, 125, 270, 90),
      placeholder("callout", "Step 2 callout", 875, 330, 270, 90),
      {
        type: "arrow",
        name: "Callout arrow",
        x: 845,
        y: 365,
        width: -210,
        height: -80,
        rotation: 0,
        opacity: 1,
        style: { stroke: "#2563eb", strokeWidth: 14, arrowHead: true },
      },
      text("Title", "DO THIS", 120, 550, 610, 90, 72),
    ],
  },
  {
    id: "product-comparison",
    name: "Product Comparison",
    description: "Three product columns with a clear winner.",
    objects: [
      ...[90, 455, 820].map((x, index) => ({
        type: "rect" as const,
        name: `Product ${index + 1}`,
        x,
        y: 130,
        width: 300,
        height: 380,
        rotation: 0,
        opacity: 1,
        style: {
          ...baseStyle,
          fill: index === 1 ? "#dcfce7" : "#f8fafc",
          stroke: "#111827",
        },
      })),
      text("Winner", "BEST", 445, 50, 320, 85, 66),
      text("Comparison title", "WHICH ONE?", 170, 550, 940, 95, 74),
    ],
  },
];

export function createDocumentFromTemplate(
  templateId: string,
): DrawingDocument {
  const template =
    drawingTemplates.find((item) => item.id === templateId) ??
    drawingTemplates[0];
  const document = createEmptyDrawingDocument(template.id);
  document.objects = template.objects.map(object);
  return document;
}
