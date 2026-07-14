import type { Rect } from '../geometry/rect';
import { getSceneIndex } from '../scene/sceneIndex';
import type { NodeId, SceneDocument } from '../scene/types';
import type { Viewport } from '../store/store';
import { worldToScreen } from '../store/viewport';

export interface FrameLabel {
  id: NodeId;
  text: string;
  /** Screen-space hit rect of the label. */
  rect: Rect;
}

let labelCtx: CanvasRenderingContext2D | null = null;

function measure(text: string): number {
  if (!labelCtx) {
    const canvas = document.createElement('canvas');
    labelCtx = canvas.getContext('2d');
  }
  if (!labelCtx) return text.length * 6;
  labelCtx.font = '11px Inter, sans-serif';
  return labelCtx.measureText(text).width;
}

export const FRAME_LABEL_FONT = '11px Inter, sans-serif';

/**
 * Labels for top-level frames, in screen space. Shared by the overlay
 * renderer (drawing) and the select tool (clicking a label selects the frame).
 */
export function computeFrameLabels(doc: SceneDocument, viewport: Viewport, screenW: number, screenH: number): FrameLabel[] {
  const index = getSceneIndex(doc);
  const labels: FrameLabel[] = [];
  for (const id of doc.rootIds) {
    const node = doc.nodes[id];
    if (!node || node.type !== 'frame' || !node.visible) continue;
    const bounds = index.worldBounds.get(id);
    if (!bounds) continue;
    const topLeft = worldToScreen(viewport, { x: bounds.x, y: bounds.y });
    if (topLeft.y < -24 || topLeft.y > screenH + 24) continue;
    const width = Math.min(measure(node.name), bounds.width * viewport.zoom);
    if (topLeft.x + width < 0 || topLeft.x > screenW) continue;
    labels.push({
      id,
      text: node.name,
      rect: { x: topLeft.x, y: topLeft.y - 18, width: Math.max(24, width), height: 16 },
    });
  }
  return labels;
}

export function frameLabelAt(labels: readonly FrameLabel[], x: number, y: number): FrameLabel | null {
  for (const label of labels) {
    const r = label.rect;
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return label;
  }
  return null;
}
