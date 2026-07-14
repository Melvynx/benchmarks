import {
  createArrow,
  createEmptyDrawingDocument,
  createPerson,
  createRectangle,
  createText,
} from "./drawing.document";
import type { DrawingDocument } from "./drawing.types";

export type DrawingTemplate = {
  id: string;
  name: string;
  description: string;
  create: () => DrawingDocument;
};

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: "big-text-subject",
    name: "Big text + subject",
    description: "Bold headline with a person placeholder",
    create: () =>
      createEmptyDrawingDocument({
        elements: [
          createText({
            x: 64,
            y: 80,
            text: "BIG HOOK",
            fontSize: 96,
            fontWeight: 700,
            width: 620,
            height: 120,
            strokeColor: "#1e1e1e",
          }),
          createText({
            x: 64,
            y: 220,
            text: "Subtitle goes here",
            fontSize: 40,
            fontWeight: 400,
            width: 520,
            height: 56,
            strokeColor: "#495057",
          }),
          createPerson({
            x: 900,
            y: 160,
            width: 280,
            height: 460,
            label: "Subject",
          }),
        ],
      }),
  },
  {
    id: "reaction-arrow",
    name: "Reaction + arrow",
    description: "Person reacting with a pointed callout",
    create: () =>
      createEmptyDrawingDocument({
        elements: [
          createPerson({
            x: 80,
            y: 140,
            width: 240,
            height: 420,
            label: "Reactor",
          }),
          createArrow({
            x: 360,
            y: 280,
            points: [
              { x: 360, y: 340 },
              { x: 720, y: 220 },
            ],
            strokeColor: "#e03131",
            strokeWidth: 6,
          }),
          createText({
            x: 760,
            y: 160,
            text: "WAIT…",
            fontSize: 88,
            fontWeight: 700,
            width: 420,
            height: 110,
            strokeColor: "#e03131",
          }),
          createRectangle({
            x: 760,
            y: 300,
            width: 420,
            height: 160,
            fillColor: "#fff3bf",
            strokeColor: "#f08c00",
            cornerRadius: 16,
          }),
          createText({
            x: 790,
            y: 345,
            text: "Plot twist",
            fontSize: 48,
            fontWeight: 700,
            width: 360,
            height: 70,
            strokeColor: "#1e1e1e",
          }),
        ],
      }),
  },
  {
    id: "versus-split",
    name: "Versus split",
    description: "Two sides facing off",
    create: () =>
      createEmptyDrawingDocument({
        elements: [
          createRectangle({
            x: 0,
            y: 0,
            width: 640,
            height: 720,
            fillColor: "#dbe4ff",
            strokeColor: "transparent",
            strokeWidth: 0,
            cornerRadius: 0,
          }),
          createRectangle({
            x: 640,
            y: 0,
            width: 640,
            height: 720,
            fillColor: "#ffe3e3",
            strokeColor: "transparent",
            strokeWidth: 0,
            cornerRadius: 0,
          }),
          createPerson({
            x: 160,
            y: 180,
            width: 280,
            height: 420,
            label: "A",
            fillColor: "#bac8ff",
            strokeColor: "#364fc7",
          }),
          createPerson({
            x: 840,
            y: 180,
            width: 280,
            height: 420,
            label: "B",
            fillColor: "#ffa8a8",
            strokeColor: "#c92a2a",
          }),
          createText({
            x: 560,
            y: 300,
            text: "VS",
            fontSize: 96,
            fontWeight: 700,
            width: 160,
            height: 120,
            align: "center",
            strokeColor: "#1e1e1e",
          }),
        ],
      }),
  },
  {
    id: "tutorial-callout",
    name: "Tutorial callout",
    description: "Step callout with subject and tip box",
    create: () =>
      createEmptyDrawingDocument({
        elements: [
          createText({
            x: 72,
            y: 64,
            text: "STEP 1",
            fontSize: 40,
            fontWeight: 700,
            width: 220,
            height: 52,
            strokeColor: "#1971c2",
          }),
          createText({
            x: 72,
            y: 130,
            text: "Do this first",
            fontSize: 72,
            fontWeight: 700,
            width: 640,
            height: 96,
            strokeColor: "#1e1e1e",
          }),
          createRectangle({
            x: 72,
            y: 280,
            width: 560,
            height: 200,
            fillColor: "#e7f5ff",
            strokeColor: "#1971c2",
            cornerRadius: 20,
          }),
          createText({
            x: 104,
            y: 330,
            text: "Tip: keep it simple\nand readable",
            fontSize: 36,
            fontWeight: 400,
            width: 500,
            height: 110,
            strokeColor: "#1864ab",
          }),
          createPerson({
            x: 820,
            y: 160,
            width: 320,
            height: 480,
            label: "Host",
          }),
          createArrow({
            x: 640,
            y: 360,
            points: [
              { x: 640, y: 380 },
              { x: 800, y: 300 },
            ],
            strokeColor: "#1971c2",
            strokeWidth: 5,
          }),
        ],
      }),
  },
];

export function getDrawingTemplate(id: string) {
  return DRAWING_TEMPLATES.find((template) => template.id === id) ?? null;
}
