import type { Canvas } from "fabric";
import { DRAWING_SCENE_VERSION, type DrawingSceneData } from "./drawing.types";

export function sceneFromCanvas(
  canvas: Canvas,
  width: number,
  height: number,
  templateId?: string,
): DrawingSceneData {
  return {
    version: DRAWING_SCENE_VERSION,
    width,
    height,
    templateId,
    scene: canvas.toObject(["data"]),
  };
}

export async function loadSceneIntoCanvas(
  canvas: Canvas,
  scene: DrawingSceneData,
) {
  await canvas.loadFromJSON(scene.scene as Record<string, unknown>);
  canvas.requestRenderAll();
}

/**
 * Exports only the fixed artboard (0,0 - width,height) at 2x, regardless of
 * the editor's current pan/zoom — fabric's crop options are expressed in the
 * *current* viewport space, so the transform is reset to identity first.
 */
export function exportPreviewDataUrl(
  canvas: Canvas,
  width: number,
  height: number,
): string {
  const previousViewportTransform = canvas.viewportTransform.slice() as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  canvas.discardActiveObject();
  canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
  try {
    return canvas.toDataURL({
      format: "png",
      multiplier: 2,
      left: 0,
      top: 0,
      width,
      height,
    });
  } finally {
    canvas.setViewportTransform(previousViewportTransform);
    canvas.requestRenderAll();
  }
}
