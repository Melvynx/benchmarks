export type DrawingTool =
  | "select"
  | "text"
  | "arrow"
  | "rectangle"
  | "ellipse"
  | "pencil"
  | "placeholder"
  | "image";

export type DrawingPoint = {
  x: number;
  y: number;
};

type DrawingObjectBase = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  stroke: string;
  fill: string;
  strokeWidth: number;
  opacity?: number;
};

export type DrawingRectangle = DrawingObjectBase & {
  type: "rectangle";
};

export type DrawingEllipse = DrawingObjectBase & {
  type: "ellipse";
};

export type DrawingArrow = DrawingObjectBase & {
  type: "arrow";
  endX: number;
  endY: number;
};

export type DrawingText = DrawingObjectBase & {
  type: "text";
  text: string;
  fontSize: number;
  fontWeight: number;
  align: "left" | "center";
};

export type DrawingPencil = DrawingObjectBase & {
  type: "pencil";
  points: DrawingPoint[];
};

export type DrawingImage = DrawingObjectBase & {
  type: "image";
  src: string;
  fileName?: string;
};

export type DrawingPlaceholder = DrawingObjectBase & {
  type: "placeholder";
  label: string;
  pose: "front" | "reaction";
};

export type DrawingObject =
  | DrawingRectangle
  | DrawingEllipse
  | DrawingArrow
  | DrawingText
  | DrawingPencil
  | DrawingImage
  | DrawingPlaceholder;

export type DrawingDocument = {
  version: 1;
  width: 1280;
  height: 720;
  background: string;
  objects: DrawingObject[];
};

export type DrawingTemplateId =
  | "text-subject"
  | "reaction-arrow"
  | "versus"
  | "tutorial-callout";
