// Factory helpers for creating new drawing elements with sensible defaults,
// plus geometry-preserving duplication.

import {
  DEFAULT_FILL,
  DEFAULT_STROKE,
  DEFAULT_STROKE_WIDTH,
  newElementId,
  type ArrowElement,
  type DrawingElement,
  type DrawingFontFamily,
  type EllipseElement,
  type FreedrawElement,
  type ImageElement,
  type PlaceholderElement,
  type Point,
  type RectangleElement,
  type TextElement,
} from "./drawing-document";
import { translateElement } from "./drawing-geometry";

export type ElementStyle = {
  stroke: string;
  fill: string;
  strokeWidth: number;
  color: string;
  fontSize: number;
  fontFamily: DrawingFontFamily;
  fontWeight: number;
  opacity: number;
};

export const DEFAULT_STYLE: ElementStyle = {
  stroke: DEFAULT_STROKE,
  fill: DEFAULT_FILL,
  strokeWidth: DEFAULT_STROKE_WIDTH,
  color: DEFAULT_STROKE,
  fontSize: 56,
  fontFamily: "hand",
  fontWeight: 700,
  opacity: 1,
};

function normalizeRect(a: Point, b: Point) {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(b.x - a.x),
    height: Math.abs(b.y - a.y),
  };
}

export function createRectangle(
  a: Point,
  b: Point,
  style: ElementStyle,
): RectangleElement {
  return {
    id: newElementId(),
    type: "rectangle",
    ...normalizeRect(a, b),
    rotation: 0,
    opacity: style.opacity,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    fill: style.fill,
    cornerRadius: 14,
  };
}

export function createEllipse(
  a: Point,
  b: Point,
  style: ElementStyle,
): EllipseElement {
  return {
    id: newElementId(),
    type: "ellipse",
    ...normalizeRect(a, b),
    rotation: 0,
    opacity: style.opacity,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    fill: style.fill,
  };
}

export function createArrow(
  start: Point,
  end: Point,
  style: ElementStyle,
): ArrowElement {
  return {
    id: newElementId(),
    type: "arrow",
    start,
    end,
    opacity: style.opacity,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
  };
}

export function createText(
  position: Point,
  style: ElementStyle,
  text = "",
): TextElement {
  const width = 360;
  const height = Math.round(style.fontSize * 1.3);
  return {
    id: newElementId(),
    type: "text",
    x: position.x - width / 2,
    y: position.y - height / 2,
    width,
    height,
    rotation: 0,
    opacity: style.opacity,
    text,
    color: style.color,
    fontSize: style.fontSize,
    fontFamily: style.fontFamily,
    fontWeight: style.fontWeight,
    align: "center",
  };
}

export function createPlaceholder(
  position: Point,
  style: ElementStyle,
): PlaceholderElement {
  const width = 240;
  const height = 340;
  return {
    id: newElementId(),
    type: "placeholder",
    x: position.x - width / 2,
    y: position.y - height / 2,
    width,
    height,
    rotation: 0,
    opacity: style.opacity,
    color: "#94a3b8",
    label: "Subject",
  };
}

export function createImage(
  position: Point,
  url: string,
  naturalRatio: number,
  targetWidth = 420,
): ImageElement {
  const width = targetWidth;
  const height = Math.round(targetWidth / (naturalRatio || 1.6));
  return {
    id: newElementId(),
    type: "image",
    x: position.x - width / 2,
    y: position.y - height / 2,
    width,
    height,
    rotation: 0,
    opacity: 1,
    url,
    naturalRatio,
  };
}

export function createFreedraw(
  points: Point[],
  style: ElementStyle,
): FreedrawElement | null {
  if (points.length < 2) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  const width = Math.max(maxX - minX, 1);
  const height = Math.max(maxY - minY, 1);
  return {
    id: newElementId(),
    type: "freedraw",
    x: minX,
    y: minY,
    width,
    height,
    rotation: 0,
    opacity: style.opacity,
    stroke: style.stroke,
    strokeWidth: style.strokeWidth,
    // Normalize points to 0..1 of the bounding box so resize just scales.
    points: points.map((point) => ({
      x: (point.x - minX) / width,
      y: (point.y - minY) / height,
    })),
  };
}

/** Duplicate elements with fresh ids, offset by (dx, dy). */
export function duplicateElements(
  elements: DrawingElement[],
  dx = 24,
  dy = 24,
): DrawingElement[] {
  return elements.map((element) => {
    const moved = translateElement(element, dx, dy);
    return { ...moved, id: newElementId() };
  });
}
