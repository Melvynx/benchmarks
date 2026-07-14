import type { AppState, SmartGuide, SpacingBadge } from '../../state/types';
import { nodeWorldAABB, descendantIds, getChildrenIds } from '../scene';
import type { NodeId } from '../scene';

interface Edge {
  pos: number;
  from: number;
  to: number;
  orientation: 'vertical' | 'horizontal';
  source: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'middle-v';
  nodeId: string;
}

/** Snap distance in world units (depends on zoom when called). */
const SNAP_DIST = 6;

/** For a set of moving nodes, return snapping delta + guides to draw. */
export const computeSnap = (
  state: AppState,
  movingIds: NodeId[],
  snapDist: number = SNAP_DIST,
): { dx: number; dy: number; guides: SmartGuide[]; badges: SpacingBadge[] } => {
  const doc = state.doc;
  if (movingIds.length === 0) return { dx: 0, dy: 0, guides: [], badges: [] };

  const movingSet = new Set<NodeId>();
  for (const id of movingIds) for (const did of descendantIds(doc, id)) movingSet.add(did);

  // Moving bounding box (union AABB)
  let mMinX = Infinity;
  let mMinY = Infinity;
  let mMaxX = -Infinity;
  let mMaxY = -Infinity;
  for (const id of movingIds) {
    const b = nodeWorldAABB(doc, id);
    if (b.width <= 0 && b.height <= 0) continue;
    mMinX = Math.min(mMinX, b.x);
    mMinY = Math.min(mMinY, b.y);
    mMaxX = Math.max(mMaxX, b.x + b.width);
    mMaxY = Math.max(mMaxY, b.y + b.height);
  }
  if (!isFinite(mMinX)) return { dx: 0, dy: 0, guides: [], badges: [] };

  const mCx = (mMinX + mMaxX) / 2;
  const mCy = (mMinY + mMaxY) / 2;

  // Collect candidate edges from non-moving siblings + parent frame.
  const edges: Edge[] = [];

  // Get candidate roots = top-level children on current page + siblings within frame
  const referenceIds: NodeId[] = [];
  // Use siblings of the first moving node
  const first = doc.nodes[movingIds[0]!];
  const parentId = first?.parentId ?? null;
  const candIds = getChildrenIds(doc, parentId);
  for (const cid of candIds) {
    if (!movingSet.has(cid)) referenceIds.push(cid);
  }

  for (const id of referenceIds) {
    const b = nodeWorldAABB(doc, id);
    const cx = b.x + b.width / 2;
    const cy = b.y + b.height / 2;
    // Vertical edges (x positions)
    edges.push({ pos: b.x, from: b.y, to: b.y + b.height, orientation: 'vertical', source: 'left', nodeId: id });
    edges.push({ pos: b.x + b.width, from: b.y, to: b.y + b.height, orientation: 'vertical', source: 'right', nodeId: id });
    edges.push({ pos: cx, from: b.y, to: b.y + b.height, orientation: 'vertical', source: 'center-h', nodeId: id });
    // Horizontal edges (y positions)
    edges.push({ pos: b.y, from: b.x, to: b.x + b.width, orientation: 'horizontal', source: 'top', nodeId: id });
    edges.push({ pos: b.y + b.height, from: b.x, to: b.x + b.width, orientation: 'horizontal', source: 'bottom', nodeId: id });
    edges.push({ pos: cy, from: b.x, to: b.x + b.width, orientation: 'horizontal', source: 'middle-v', nodeId: id });
  }

  // Check moving box edges against candidate edges on same orientation.
  const movingVEdges = [
    { pos: mMinX, label: 'left' as const },
    { pos: mMaxX, label: 'right' as const },
    { pos: mCx, label: 'center-h' as const },
  ];
  const movingHEdges = [
    { pos: mMinY, label: 'top' as const },
    { pos: mMaxY, label: 'bottom' as const },
    { pos: mCy, label: 'middle-v' as const },
  ];

  let bestDx = 0;
  let bestDxDist = Infinity;
  let bestDxEdge: Edge | null = null;
  let bestDxMoving: { pos: number; label: 'left' | 'right' | 'center-h' } | null = null;

  let bestDy = 0;
  let bestDyDist = Infinity;
  let bestDyEdge: Edge | null = null;
  let bestDyMoving: { pos: number; label: 'top' | 'bottom' | 'middle-v' } | null = null;

  for (const e of edges) {
    if (e.orientation === 'vertical') {
      for (const m of movingVEdges) {
        const d = e.pos - m.pos;
        if (Math.abs(d) < bestDxDist && Math.abs(d) < snapDist) {
          bestDxDist = Math.abs(d);
          bestDx = d;
          bestDxEdge = e;
          bestDxMoving = m;
        }
      }
    } else {
      for (const m of movingHEdges) {
        const d = e.pos - m.pos;
        if (Math.abs(d) < bestDyDist && Math.abs(d) < snapDist) {
          bestDyDist = Math.abs(d);
          bestDy = d;
          bestDyEdge = e;
          bestDyMoving = m;
        }
      }
    }
  }

  const guides: SmartGuide[] = [];
  const badges: SpacingBadge[] = [];

  if (bestDxEdge && bestDxMoving) {
    const appliedMovingEdge = bestDxMoving.pos + bestDx;
    const from = Math.min(mMinY + bestDy, bestDxEdge.from);
    const to = Math.max(mMaxY + bestDy, bestDxEdge.to);
    guides.push({ orientation: 'vertical', position: appliedMovingEdge, from, to });
  }
  if (bestDyEdge && bestDyMoving) {
    const appliedMovingEdge = bestDyMoving.pos + bestDy;
    const from = Math.min(mMinX + bestDx, bestDyEdge.from);
    const to = Math.max(mMaxX + bestDx, bestDyEdge.to);
    guides.push({ orientation: 'horizontal', position: appliedMovingEdge, from, to });
  }

  return { dx: bestDx, dy: bestDy, guides, badges };
};

export { SNAP_DIST };
