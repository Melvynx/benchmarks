// Duplicated as a literal in src/features/inspiration/drawing-description.ts
// (that file is bundled into a Convex Node action via a relative import and
// cannot resolve the "@/" alias used here) — keep both in sync.
export const PLACEHOLDER_PERSON_KIND = "placeholder-person";

export type DrawingObjectKind =
  | "shape"
  | "text"
  | "image"
  | "arrow"
  | "freehand"
  | typeof PLACEHOLDER_PERSON_KIND
  | "badge"
  | "explosion"
  | "callout"
  | "group";

/** Custom metadata every drawing object carries under fabric's `data` property. */
export type DrawingObjectData = {
  id: string;
  kind: DrawingObjectKind;
  name: string;
  locked?: boolean;
};

export type DrawingTool =
  | "select"
  | "pan"
  | "rect"
  | "roundedRect"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "freehand";

/** Structured, re-editable drawing document persisted on an inspiration row. */
export type DrawingSceneData = {
  version: number;
  width: number;
  height: number;
  templateId?: string;
  /** fabric Canvas#toObject(["data"]) output. */
  scene: unknown;
};

export const DRAWING_SCENE_VERSION = 1;
export const DRAWING_CANVAS_WIDTH = 1280;
export const DRAWING_CANVAS_HEIGHT = 720;
