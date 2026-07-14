import type { Rect } from '../geometry/rect';
import { getSceneIndex } from '../scene/sceneIndex';
import { ancestorIds } from '../scene/traversal';
import type { NodeId, SceneDocument } from '../scene/types';
import type { SnapGuide, SnapLabel, SnapVisuals, Viewport } from '../store/store';
import { visibleWorldRect } from '../store/viewport';

const MAX_TARGETS = 240;

export interface SnapEdge {
  /** Coordinate on the snapping axis. */
  value: number;
  /** Extent of the source box along the other axis (for guide length). */
  start: number;
  end: number;
  /** Source box, for distance badges. */
  box: Rect;
}

export interface SnapTargets {
  xs: SnapEdge[];
  ys: SnapEdge[];
}

/**
 * Candidate alignment edges: every visible node in the viewport (capped),
 * minus the moving selection and its descendants, plus the parents of the
 * moving nodes (so children align inside their frame even off-screen).
 */
export function collectSnapTargets(
  doc: SceneDocument,
  movingIds: ReadonlySet<NodeId>,
  viewport: Viewport,
  screenW: number,
  screenH: number,
): SnapTargets {
  const index = getSceneIndex(doc);
  const view = visibleWorldRect(viewport, screenW, screenH);
  const ids = index.grid.queryRect(view);

  const extra = new Set<NodeId>();
  for (const id of movingIds) {
    for (const ancestor of ancestorIds(doc, id)) extra.add(ancestor);
  }

  const xs: SnapEdge[] = [];
  const ys: SnapEdge[] = [];
  let count = 0;
  const push = (bounds: Rect): void => {
    xs.push(
      { value: bounds.x, start: bounds.y, end: bounds.y + bounds.height, box: bounds },
      { value: bounds.x + bounds.width / 2, start: bounds.y, end: bounds.y + bounds.height, box: bounds },
      { value: bounds.x + bounds.width, start: bounds.y, end: bounds.y + bounds.height, box: bounds },
    );
    ys.push(
      { value: bounds.y, start: bounds.x, end: bounds.x + bounds.width, box: bounds },
      { value: bounds.y + bounds.height / 2, start: bounds.x, end: bounds.x + bounds.width, box: bounds },
      { value: bounds.y + bounds.height, start: bounds.x, end: bounds.x + bounds.width, box: bounds },
    );
  };

  const considered = new Set<NodeId>([...ids, ...extra]);
  for (const id of considered) {
    if (count >= MAX_TARGETS) break;
    if (movingIds.has(id)) continue;
    if (index.hidden.has(id)) continue;
    const node = doc.nodes[id];
    if (!node || node.type === 'group') continue;
    let skip = false;
    for (const ancestor of ancestorIds(doc, id)) {
      if (movingIds.has(ancestor)) {
        skip = true;
        break;
      }
    }
    if (skip) continue;
    const bounds = index.worldBounds.get(id);
    if (!bounds) continue;
    push(bounds);
    count++;
  }
  return { xs, ys };
}

interface AxisSnap {
  delta: number;
  edge: SnapEdge;
  movingValue: number;
}

function bestAxisSnap(values: readonly number[], edges: readonly SnapEdge[], threshold: number): AxisSnap | null {
  let best: AxisSnap | null = null;
  for (const value of values) {
    for (const edge of edges) {
      const delta = edge.value - value;
      if (Math.abs(delta) <= threshold && (best === null || Math.abs(delta) < Math.abs(best.delta))) {
        best = { delta, edge, movingValue: value };
      }
    }
  }
  return best;
}

export interface MoveSnapResult {
  dx: number;
  dy: number;
  visuals: SnapVisuals;
}

/** Snap a moving box against targets. Returns the correction + guide visuals. */
export function snapMovingBox(box: Rect, targets: SnapTargets, threshold: number): MoveSnapResult {
  const xValues = [box.x, box.x + box.width / 2, box.x + box.width];
  const yValues = [box.y, box.y + box.height / 2, box.y + box.height];
  const snapX = bestAxisSnap(xValues, targets.xs, threshold);
  const snapY = bestAxisSnap(yValues, targets.ys, threshold);

  const dx = snapX?.delta ?? 0;
  const dy = snapY?.delta ?? 0;
  const snapped: Rect = { ...box, x: box.x + dx, y: box.y + dy };

  const guides: SnapGuide[] = [];
  const labels: SnapLabel[] = [];

  if (snapX) {
    const from = Math.min(snapX.edge.start, snapped.y);
    const to = Math.max(snapX.edge.end, snapped.y + snapped.height);
    guides.push({ axis: 'x', position: snapX.edge.value, from, to });
    addGapLabel(labels, snapped, snapX.edge.box, 'y');
  }
  if (snapY) {
    const from = Math.min(snapY.edge.start, snapped.x);
    const to = Math.max(snapY.edge.end, snapped.x + snapped.width);
    guides.push({ axis: 'y', position: snapY.edge.value, from, to });
    addGapLabel(labels, snapped, snapY.edge.box, 'x');
  }
  return { dx, dy, visuals: { guides, labels } };
}

/** Distance badge between the moved box and the box it snapped to. */
function addGapLabel(labels: SnapLabel[], moved: Rect, target: Rect, gapAxis: 'x' | 'y'): void {
  if (gapAxis === 'y') {
    // Vertical gap between boxes aligned on x.
    let gap: number;
    let mid: number;
    if (target.y + target.height <= moved.y) {
      gap = moved.y - (target.y + target.height);
      mid = (moved.y + target.y + target.height) / 2;
    } else if (moved.y + moved.height <= target.y) {
      gap = target.y - (moved.y + moved.height);
      mid = (target.y + moved.y + moved.height) / 2;
    } else {
      return;
    }
    if (gap > 0.5) {
      labels.push({ x: moved.x + moved.width / 2, y: mid, text: String(Math.round(gap)) });
    }
  } else {
    let gap: number;
    let mid: number;
    if (target.x + target.width <= moved.x) {
      gap = moved.x - (target.x + target.width);
      mid = (moved.x + target.x + target.width) / 2;
    } else if (moved.x + moved.width <= target.x) {
      gap = target.x - (moved.x + moved.width);
      mid = (target.x + moved.x + moved.width) / 2;
    } else {
      return;
    }
    if (gap > 0.5) {
      labels.push({ x: mid, y: moved.y + moved.height / 2, text: String(Math.round(gap)) });
    }
  }
}

export interface PointSnapResult {
  dx: number;
  dy: number;
  visuals: SnapVisuals;
}

/** Snap a single dragged point (resize handle) on both axes. */
export function snapPoint(point: { x: number; y: number }, targets: SnapTargets, threshold: number): PointSnapResult {
  const snapX = bestAxisSnap([point.x], targets.xs, threshold);
  const snapY = bestAxisSnap([point.y], targets.ys, threshold);
  const guides: SnapGuide[] = [];
  if (snapX) {
    guides.push({
      axis: 'x',
      position: snapX.edge.value,
      from: Math.min(snapX.edge.start, point.y),
      to: Math.max(snapX.edge.end, point.y),
    });
  }
  if (snapY) {
    guides.push({
      axis: 'y',
      position: snapY.edge.value,
      from: Math.min(snapY.edge.start, point.x),
      to: Math.max(snapY.edge.end, point.x),
    });
  }
  return { dx: snapX?.delta ?? 0, dy: snapY?.delta ?? 0, visuals: { guides, labels: [] } };
}
