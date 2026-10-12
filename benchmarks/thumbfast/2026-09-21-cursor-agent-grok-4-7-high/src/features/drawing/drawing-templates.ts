import { nanoid } from "nanoid";
import {
  DRAWING_WIDTH,
  type DrawingDocument,
  type DrawingObject,
  createEmptyDrawing,
} from "./drawing.schema";

export type DrawingTemplate = {
  id: string;
  name: string;
  description: string;
  create: () => DrawingObject[];
};

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: "big-text-subject",
    name: "Big text + subject",
    description: "Large headline beside a person placeholder",
    create: bigTextSubject,
  },
  {
    id: "reaction-arrow",
    name: "Reaction + arrow",
    description: "Person, arrow, and a short reaction",
    create: reactionArrow,
  },
  {
    id: "split-versus",
    name: "Split versus",
    description: "Two sides with a VS mark",
    create: splitVersus,
  },
  {
    id: "tutorial-callout",
    name: "Tutorial callout",
    description: "Numbered step with an arrow",
    create: tutorialCallout,
  },
];

export function documentFromTemplate(templateId: string): DrawingDocument | null {
  const template = DRAWING_TEMPLATES.find((item) => item.id === templateId);
  if (!template) return null;
  return { ...createEmptyDrawing(), objects: template.create() };
}

function bigTextSubject(): DrawingObject[] {
  return [
    rect({
      x: 48,
      y: 180,
      width: 620,
      height: 220,
      fill: "#fff3bf",
      stroke: "#1e1e1e",
    }),
    text({
      x: 72,
      y: 210,
      width: 560,
      height: 160,
      text: "BIG IDEA",
      fontSize: 92,
    }),
    text({
      x: 76,
      y: 430,
      width: 520,
      height: 70,
      text: "why it matters",
      fontSize: 36,
      color: "#1971c2",
    }),
    person({ x: 740, y: 90, width: 460, height: 560 }),
  ];
}

function reactionArrow(): DrawingObject[] {
  return [
    person({ x: 70, y: 120, width: 420, height: 520 }),
    arrow({ x: 500, y: 250, width: 280, height: 36, rotation: -8 }),
    rect({
      x: 790,
      y: 150,
      width: 420,
      height: 180,
      fill: "#ffd8d8",
      stroke: "#e03131",
    }),
    text({
      x: 820,
      y: 190,
      width: 360,
      height: 110,
      text: "WAIT,\nWHAT?",
      fontSize: 54,
      color: "#e03131",
    }),
  ];
}

function splitVersus(): DrawingObject[] {
  return [
    rect({
      x: 36,
      y: 36,
      width: 580,
      height: 648,
      fill: "#d0ebff",
      stroke: "#1971c2",
    }),
    rect({
      x: 664,
      y: 36,
      width: 580,
      height: 648,
      fill: "#ffd8d8",
      stroke: "#e03131",
    }),
    text({
      x: 80,
      y: 70,
      width: 480,
      height: 80,
      text: "BEFORE",
      fontSize: 48,
      color: "#1971c2",
    }),
    text({
      x: 720,
      y: 70,
      width: 480,
      height: 80,
      text: "AFTER",
      fontSize: 48,
      color: "#e03131",
    }),
    ellipse({
      x: DRAWING_WIDTH / 2 - 90,
      y: 280,
      width: 180,
      height: 180,
      fill: "#fffef9",
      stroke: "#1e1e1e",
    }),
    text({
      x: DRAWING_WIDTH / 2 - 70,
      y: 330,
      width: 140,
      height: 90,
      text: "VS",
      fontSize: 64,
    }),
    person({ x: 150, y: 220, width: 340, height: 420 }),
    person({ x: 790, y: 220, width: 340, height: 420 }),
  ];
}

function tutorialCallout(): DrawingObject[] {
  return [
    rect({
      x: 48,
      y: 48,
      width: 1184,
      height: 624,
      fill: "transparent",
      stroke: "#1e1e1e",
    }),
    ellipse({
      x: 90,
      y: 110,
      width: 140,
      height: 140,
      fill: "#fff3bf",
      stroke: "#1e1e1e",
    }),
    text({
      x: 118,
      y: 140,
      width: 90,
      height: 90,
      text: "1",
      fontSize: 72,
    }),
    arrow({ x: 250, y: 160, width: 220, height: 36, rotation: 12 }),
    text({
      x: 500,
      y: 120,
      width: 420,
      height: 140,
      text: "Do this first",
      fontSize: 64,
    }),
    text({
      x: 500,
      y: 270,
      width: 460,
      height: 90,
      text: "Keep the step short and obvious",
      fontSize: 28,
      color: "#1971c2",
    }),
    person({ x: 820, y: 250, width: 360, height: 380 }),
  ];
}

function rect(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
}): DrawingObject {
  return {
    id: nanoid(10),
    type: "rect",
    rotation: 0,
    strokeWidth: 4,
    ...input,
  };
}

function ellipse(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
}): DrawingObject {
  return {
    id: nanoid(10),
    type: "ellipse",
    rotation: 0,
    strokeWidth: 4,
    ...input,
  };
}

function text(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color?: string;
}): DrawingObject {
  return {
    id: nanoid(10),
    type: "text",
    rotation: 0,
    ...input,
    color: input.color ?? "#1e1e1e",
  };
}

function arrow(input: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}): DrawingObject {
  return {
    id: nanoid(10),
    type: "arrow",
    stroke: "#1e1e1e",
    strokeWidth: 4,
    ...input,
  };
}

function person(input: {
  x: number;
  y: number;
  width: number;
  height: number;
}): DrawingObject {
  return {
    id: nanoid(10),
    type: "person",
    rotation: 0,
    label: "Subject",
    stroke: "#1e1e1e",
    fill: "#fffef9",
    strokeWidth: 4,
    ...input,
  };
}
