import { applyM, invertM } from '../geometry/mat2d';
import { nodePath } from '../geometry/shapePath';
import type { Vec2 } from '../geometry/vec2';
import { getSceneIndex } from '../scene/sceneIndex';
import { ancestorIds } from '../scene/traversal';
import type { NodeId, SceneDocument } from '../scene/types';

let probeCtx: CanvasRenderingContext2D | null = null;

function getProbeCtx(): CanvasRenderingContext2D {
  if (!probeCtx) {
    probeCtx = document.createElement('canvas').getContext('2d');
    if (!probeCtx) throw new Error('Canvas 2D unavailable');
  }
  return probeCtx;
}

/**
 * Deepest visible frame whose shape contains the world point, skipping the
 * excluded set (the nodes being dragged + their descendants). Used for
 * drop-target highlighting and reparent-on-drop.
 */
export function findFrameAt(doc: SceneDocument, point: Vec2, exclude: ReadonlySet<NodeId>): NodeId | null {
  const index = getSceneIndex(doc);
  const ctx = getProbeCtx();
  const candidates = index.grid
    .queryPoint(point)
    .filter((id) => {
      if (index.hidden.has(id) || index.locked.has(id)) return false;
      if (exclude.has(id)) return false;
      const node = doc.nodes[id];
      if (!node || node.type !== 'frame') return false;
      for (const ancestor of ancestorIds(doc, id)) {
        if (exclude.has(ancestor)) return false;
      }
      return true;
    })
    .sort((a, b) => (index.paintIndex.get(b) ?? 0) - (index.paintIndex.get(a) ?? 0));

  for (const id of candidates) {
    const node = doc.nodes[id];
    const m = index.worldMatrices.get(id);
    if (!node || !m) continue;
    const local = applyM(invertM(m), point);
    if (ctx.isPointInPath(nodePath(node), local.x, local.y)) return id;
  }
  return null;
}
