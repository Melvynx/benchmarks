import { Line, Rect, Textbox, type Canvas } from "fabric";
import { tagObject } from "./drawing-object-factory";
import {
  createBadge,
  createCallout,
  createPlaceholderPerson,
} from "./drawing-placeholders";
import { createArrowObject } from "./drawing-shapes";

export type DrawingTemplate = {
  id: string;
  name: string;
  description: string;
  build: (canvas: Canvas, width: number, height: number) => void;
};

function addPanel(
  canvas: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
) {
  const rect = new Rect({ left: x, top: y, width: w, height: h, fill });
  tagObject(rect, { kind: "shape", name: "Panel" });
  canvas.add(rect);
  canvas.sendObjectToBack(rect);
}

function addHeadline(
  canvas: Canvas,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  color = "#111111",
) {
  const textbox = new Textbox(text, {
    left: x,
    top: y,
    width,
    fontSize,
    fontWeight: "800",
    fontFamily: "Arial",
    fill: color,
    textAlign: "center",
    stroke: "#ffffff",
    strokeWidth: 6,
    paintFirst: "stroke",
  });
  tagObject(textbox, { kind: "text", name: "Headline" });
  canvas.add(textbox);
}

function addLabel(
  canvas: Canvas,
  text: string,
  x: number,
  y: number,
  width: number,
  color = "#111111",
) {
  const textbox = new Textbox(text, {
    left: x,
    top: y,
    width,
    fontSize: 32,
    fontWeight: "700",
    fontFamily: "Arial",
    fill: color,
    textAlign: "center",
  });
  tagObject(textbox, { kind: "text", name: "Label" });
  canvas.add(textbox);
}

function addPerson(canvas: Canvas, x: number, y: number, scale = 1) {
  const person = createPlaceholderPerson(x, y);
  person.set({ scaleX: scale, scaleY: scale });
  canvas.add(person);
  return person;
}

function addArrow(
  canvas: Canvas,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  canvas.add(createArrowObject(x1, y1, x2, y2, { strokeWidth: 8 }));
}

export const DRAWING_TEMPLATES: DrawingTemplate[] = [
  {
    id: "before-after",
    name: "Before / After",
    description: "Split comparison with a subject on each side.",
    build: (canvas, width, height) => {
      addPanel(canvas, 0, 0, width / 2, height, "#fee2e2");
      addPanel(canvas, width / 2, 0, width / 2, height, "#dcfce7");
      const divider = new Line([width / 2, 0, width / 2, height], {
        stroke: "#111111",
        strokeWidth: 6,
      });
      tagObject(divider, { kind: "shape", name: "Divider" });
      canvas.add(divider);
      addLabel(canvas, "BEFORE", 40, 40, width / 2 - 80, "#b91c1c");
      addLabel(canvas, "AFTER", width / 2 + 40, 40, width / 2 - 80, "#15803d");
      addPerson(canvas, width * 0.25, height * 0.65, 0.85);
      addPerson(canvas, width * 0.75, height * 0.65, 1.1);
    },
  },
  {
    id: "versus",
    name: "Versus",
    description: "Two subjects facing off with a VS badge.",
    build: (canvas, width, height) => {
      addPanel(canvas, 0, 0, width / 2, height, "#dbeafe");
      addPanel(canvas, width / 2, 0, width / 2, height, "#fee2e2");
      addPerson(canvas, width * 0.24, height * 0.62, 1.1);
      addPerson(canvas, width * 0.76, height * 0.62, 1.1);
      const badge = createBadge(width / 2, height / 2, "VS");
      badge.set({ scaleX: 1.4, scaleY: 1.4 });
      canvas.add(badge);
    },
  },
  {
    id: "shocked-arrow",
    name: "Shocked face + arrow",
    description: "Reacting subject pointing at the subject of the reaction.",
    build: (canvas, width, height) => {
      addPanel(canvas, 0, 0, width, height, "#fef9c3");
      addPerson(canvas, width * 0.22, height * 0.6, 1.3);
      addHeadline(
        canvas,
        "WHAT?!",
        width * 0.5,
        height * 0.12,
        width * 0.4,
        72,
        "#dc2626",
      );
      addArrow(
        canvas,
        width * 0.42,
        height * 0.55,
        width * 0.72,
        height * 0.55,
      );
      addPanel(
        canvas,
        width * 0.72,
        height * 0.35,
        width * 0.22,
        height * 0.4,
        "#ffffff",
      );
    },
  },
  {
    id: "big-text-subject",
    name: "Big text + subject",
    description: "Bold headline over a single subject.",
    build: (canvas, width, height) => {
      addPanel(canvas, 0, 0, width, height, "#e0e7ff");
      addHeadline(
        canvas,
        "YOU WON'T BELIEVE THIS",
        width * 0.5 - width * 0.4,
        height * 0.1,
        width * 0.8,
        76,
        "#1e1b4b",
      );
      addPerson(canvas, width * 0.7, height * 0.68, 1.4);
    },
  },
  {
    id: "split-screen",
    name: "Split screen",
    description: "Two equal panels for a direct comparison.",
    build: (canvas, width, height) => {
      addPanel(canvas, 0, 0, width / 2 - 4, height, "#f1f5f9");
      addPanel(canvas, width / 2 + 4, 0, width / 2 - 4, height, "#f8fafc");
      const divider = new Rect({
        left: width / 2 - 4,
        top: 0,
        width: 8,
        height,
        fill: "#111111",
      });
      tagObject(divider, { kind: "shape", name: "Divider" });
      canvas.add(divider);
      addPerson(canvas, width * 0.25, height * 0.6, 1);
      addPerson(canvas, width * 0.75, height * 0.6, 1);
      addLabel(canvas, "OPTION A", 40, height - 90, width / 2 - 80);
      addLabel(canvas, "OPTION B", width / 2 + 40, height - 90, width / 2 - 80);
    },
  },
  {
    id: "podcast-guest-swap",
    name: "Podcast guest swap",
    description: "Two speakers with callouts, host and guest.",
    build: (canvas, width, height) => {
      addPanel(canvas, 0, 0, width, height, "#1f2937");
      addPerson(canvas, width * 0.3, height * 0.68, 1.1);
      addPerson(canvas, width * 0.7, height * 0.68, 1.1);
      const hostCallout = createCallout(width * 0.3, height * 0.25, "Host");
      canvas.add(hostCallout);
      const guestCallout = createCallout(width * 0.7, height * 0.25, "Guest");
      canvas.add(guestCallout);
      const badge = createBadge(width * 0.5, height * 0.15, "NEW EP");
      canvas.add(badge);
    },
  },
  {
    id: "tutorial-callout",
    name: "Tutorial callout",
    description: "Presenter pointing at a highlighted UI element.",
    build: (canvas, width, height) => {
      addPanel(canvas, 0, 0, width, height, "#ecfeff");
      addPerson(canvas, width * 0.18, height * 0.65, 1.05);
      const target = new Rect({
        left: width * 0.45,
        top: height * 0.3,
        width: width * 0.4,
        height: height * 0.4,
        rx: 16,
        ry: 16,
        fill: "#ffffff",
        stroke: "#0891b2",
        strokeWidth: 6,
      });
      tagObject(target, { kind: "shape", name: "Highlighted area" });
      canvas.add(target);
      addArrow(canvas, width * 0.32, height * 0.5, width * 0.44, height * 0.5);
      const callout = createCallout(width * 0.5, height * 0.18, "Click here");
      canvas.add(callout);
    },
  },
  {
    id: "product-comparison",
    name: "Product comparison",
    description: "Two product cards side by side with a VS divider.",
    build: (canvas, width, height) => {
      addPanel(canvas, 0, 0, width, height, "#f5f5f4");
      const cardWidth = width * 0.32;
      const cardHeight = height * 0.6;
      const leftCard = new Rect({
        left: width * 0.08,
        top: height * 0.2,
        width: cardWidth,
        height: cardHeight,
        rx: 24,
        ry: 24,
        fill: "#ffffff",
        stroke: "#111111",
        strokeWidth: 4,
      });
      tagObject(leftCard, { kind: "shape", name: "Product A card" });
      const rightCard = new Rect({
        left: width * 0.6,
        top: height * 0.2,
        width: cardWidth,
        height: cardHeight,
        rx: 24,
        ry: 24,
        fill: "#ffffff",
        stroke: "#111111",
        strokeWidth: 4,
      });
      tagObject(rightCard, { kind: "shape", name: "Product B card" });
      canvas.add(leftCard, rightCard);
      addLabel(canvas, "Product A", width * 0.08, height * 0.24, cardWidth);
      addLabel(canvas, "Product B", width * 0.6, height * 0.24, cardWidth);
      const badge = createBadge(width / 2, height / 2, "VS");
      canvas.add(badge);
    },
  },
];

export function getDrawingTemplate(id: string | undefined) {
  return DRAWING_TEMPLATES.find((template) => template.id === id);
}
