import type { Tool } from '../input/types';
import type { AppState } from '../../state/types';
import type { NodeId } from '../scene';
import {
  hitTestForSelection,
  isAncestor,
  nodeWorldAABB,
  nodeWorldMatrix,
  descendantIds,
} from '../scene';
import { matApply, matInvert, matRotate } from '../geometry/Mat2D';
import type { Vec2 } from '../geometry/Vec2';
import { vSub, vRotate } from '../geometry/Vec2';
import type { Rect } from '../geometry/Rect';
import { rectFromPoints, rectIntersects } from '../geometry/Rect';
import { computeRotationHandle, computeSelectionHandles, type Handle } from '../render/drawOverlay';
import { updateNodes, updateNodesCoalesced, duplicateSelection, reparent } from '../../state/actions';
import { useStore, setSelection } from '../../state/store';
import { computeSnap } from '../input/snapping';

type Mode =
  | { kind: 'idle' }
  | { kind: 'marquee'; start: Vec2; initialSelection: NodeId[]; additive: boolean }
  | {
      kind: 'translate';
      start: Vec2;
      initial: Map<NodeId, { x: number; y: number }>;
      ids: NodeId[];
      duplicated: boolean;
      movedSinceDown: boolean;
    }
  | {
      kind: 'resize';
      anchor: Handle;
      initial: NodeSnapshot;
      /** Node's world matrix captured at pointer-down. */
      nodeWorldStart: { a: number; b: number; c: number; d: number; tx: number; ty: number };
      startWorld: Vec2;
    }
  | { kind: 'rotate'; initial: NodeSnapshot; center: Vec2; startAngle: number };

interface NodeSnapshot {
  id: NodeId;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  // World-space center at start and parent matrix for deriving rotation frame
  parentWorldMatrix: { a: number; b: number; c: number; d: number; tx: number; ty: number };
}

const HANDLE_HIT_PX = 10; // in screen pixels

export const createSelectTool = (): Tool => {
  let mode: Mode = { kind: 'idle' };

  return {
    id: 'select',

    cursor(ctx) {
      const { state } = ctx;
      // Rotation handle hover?
      const rot = computeRotationHandle(state, state.viewport.zoom);
      if (rot && distToPx(ctx.world, rot) * state.viewport.zoom <= HANDLE_HIT_PX) {
        return 'crosshair';
      }
      // Handle hover?
      const info = computeSelectionHandles(state);
      if (info) {
        for (const h of info.handles) {
          if (distToPx(ctx.world, h.pos) * state.viewport.zoom <= HANDLE_HIT_PX) {
            return h.cursor ?? 'default';
          }
        }
      }
      return 'default';
    },

    onPointerDown(ctx) {
      if (ctx.button !== 0) return;
      const state = ctx.state;

      // Priority 1: Rotation handle
      const rot = computeRotationHandle(state, state.viewport.zoom);
      if (rot && distToPx(ctx.world, rot) * state.viewport.zoom <= HANDLE_HIT_PX) {
        const id = state.selection[0];
        if (!id) return;
        const node = state.doc.nodes[id];
        if (!node) return;
        const centerWorld = centerOfNodeWorld(state, id);
        const startAngle = Math.atan2(ctx.world.y - centerWorld.y, ctx.world.x - centerWorld.x);
        mode = {
          kind: 'rotate',
          initial: snapshot(state, id),
          center: centerWorld,
          startAngle: startAngle - node.rotation,
        };
        return;
      }

      // Priority 2: Resize handles
      const info = computeSelectionHandles(state);
      if (info) {
        for (const h of info.handles) {
          if (distToPx(ctx.world, h.pos) * state.viewport.zoom <= HANDLE_HIT_PX) {
            // Resize
            if (state.selection.length !== 1) {
              // For multi-selection we only translate via AABB for now (TODO: proportional group resize)
              // Fallback: do nothing on edge drag for multi-select to avoid confusing math
              return;
            }
            const id = state.selection[0]!;
            const snap = snapshot(state, id);
            const nodeWorld = nodeWorldMatrix(state.doc, id);
            mode = {
              kind: 'resize',
              anchor: h,
              initial: snap,
              nodeWorldStart: nodeWorld,
              startWorld: ctx.world,
            };
            return;
          }
        }
      }

      // Priority 3: hit test scene
      const hit = hitTestForSelection(state.doc, ctx.world, ctx.mods.meta || ctx.mods.ctrl);

      if (hit) {
        const already = state.selection.includes(hit);
        if (ctx.mods.shift) {
          if (already) {
            setSelection(state.selection.filter((x) => x !== hit));
          } else {
            setSelection([...state.selection, hit]);
          }
        } else if (!already) {
          setSelection([hit]);
        }
        // Start translating
        const ids = useStore.getState().selection;
        const initial = new Map<NodeId, { x: number; y: number }>();
        for (const id of ids) {
          const n = state.doc.nodes[id];
          if (n) initial.set(id, { x: n.x, y: n.y });
        }
        mode = {
          kind: 'translate',
          start: ctx.world,
          initial,
          ids,
          duplicated: false,
          movedSinceDown: false,
        };
        return;
      }

      // Priority 4: marquee
      const initialSelection = ctx.mods.shift ? [...state.selection] : [];
      if (!ctx.mods.shift) setSelection([]);
      mode = { kind: 'marquee', start: ctx.world, initialSelection, additive: ctx.mods.shift };
    },

    onPointerMove(ctx) {
      if (mode.kind === 'idle') return;
      const state = ctx.state;

      if (mode.kind === 'marquee') {
        const rect = rectFromPoints(mode.start, ctx.world);
        useStore.setState((s) => ({
          transient: { ...s.transient, marquee: rect },
        }));
        // Recompute selection based on marquee
        const hits: NodeId[] = [];
        const page = state.doc.pages[state.doc.currentPageId];
        if (page) {
          for (const id of page.children) {
            collectMarqueeHits(state, id, rect, hits);
          }
        }
        setSelection(mode.additive ? unique([...mode.initialSelection, ...hits]) : hits);
        return;
      }

      if (mode.kind === 'translate') {
        let dx = ctx.world.x - mode.start.x;
        let dy = ctx.world.y - mode.start.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) mode.movedSinceDown = true;

        // Alt-drag duplicate: trigger once
        if (ctx.mods.alt && !mode.duplicated && mode.movedSinceDown) {
          duplicateSelection();
          mode.duplicated = true;
          // New selection IDs are the duplicates; update initial positions.
          const newIds = useStore.getState().selection;
          const initial = new Map<NodeId, { x: number; y: number }>();
          for (const id of newIds) {
            const n = useStore.getState().doc.nodes[id];
            if (n) initial.set(id, { x: n.x - 10, y: n.y - 10 }); // duplicate already offset by 10
          }
          mode.ids = newIds;
          mode.initial = initial;
        }

        // Constrain axis if shift
        if (ctx.mods.shift) {
          if (Math.abs(dx) > Math.abs(dy)) dy = 0;
          else dx = 0;
        }

        // First, apply the delta to see the un-snapped position
        updateNodesCoalesced(
          mode.ids,
          (n) => {
            const init = mode.kind === 'translate' ? mode.initial.get(n.id) : undefined;
            if (!init) return;
            n.x = init.x + dx;
            n.y = init.y + dy;
          },
          'Move',
        );

        // Then snap (only if not shift-constrained, to allow precise axis-aligned moves)
        if (!ctx.mods.shift) {
          const snap = computeSnap(useStore.getState(), mode.ids);
          if (snap.dx !== 0 || snap.dy !== 0) {
            updateNodesCoalesced(
              mode.ids,
              (n) => {
                n.x += snap.dx;
                n.y += snap.dy;
              },
              'Move',
            );
          }
          useStore.setState((s) => ({
            transient: { ...s.transient, guides: { guides: snap.guides, badges: snap.badges } },
          }));
        } else {
          useStore.setState((s) => ({
            transient: { ...s.transient, guides: { guides: [], badges: [] } },
          }));
        }
        return;
      }

      if (mode.kind === 'resize') {
        const snap = mode.initial;
        const anchor = mode.anchor;
        const fromCenter = ctx.mods.alt;

        // Choose the pivot: opposite corner (default) or center (alt).
        const pivotLocalInitial = fromCenter
          ? { x: snap.width / 2, y: snap.height / 2 }
          : {
              x: ((-anchor.ax + 1) / 2) * snap.width,
              y: ((-anchor.ay + 1) / 2) * snap.height,
            };
        const pivotWorld = matApply(mode.nodeWorldStart, pivotLocalInitial);

        // Delta in the node's rotation frame.
        const worldDelta = vSub(ctx.world, mode.startWorld);
        const deltaLocal = vRotate(worldDelta, -snap.rotation);

        const signX = anchor.ax;
        const signY = anchor.ay;
        const scaleFactor = fromCenter ? 2 : 1;

        let newW = snap.width + (signX !== 0 ? scaleFactor * signX * deltaLocal.x : 0);
        let newH = snap.height + (signY !== 0 ? scaleFactor * signY * deltaLocal.y : 0);

        // Shift: preserve aspect ratio for corner handles.
        if (ctx.mods.shift && anchor.kind === 'corner' && snap.width > 0 && snap.height > 0) {
          const ratio = snap.width / snap.height;
          // Preserve sign; match to the larger absolute scale.
          const scaleW = newW / snap.width;
          const scaleH = newH / snap.height;
          const k = Math.abs(scaleW) >= Math.abs(scaleH) ? scaleW : scaleH;
          newW = snap.width * k;
          newH = (snap.width * k) / ratio;
        }

        // Minimum size (preserve sign)
        const minAbs = 1;
        if (Math.abs(newW) < minAbs) newW = (newW < 0 ? -1 : 1) * minAbs;
        if (Math.abs(newH) < minAbs) newH = (newH < 0 ? -1 : 1) * minAbs;

        const fixedLocalNew = fromCenter
          ? { x: newW / 2, y: newH / 2 }
          : {
              x: ((1 - anchor.ax) / 2) * newW,
              y: ((1 - anchor.ay) / 2) * newH,
            };
        const centerLocalNew = { x: newW / 2, y: newH / 2 };
        const diffLocal = {
          x: fixedLocalNew.x - centerLocalNew.x,
          y: fixedLocalNew.y - centerLocalNew.y,
        };
        const diffParent = vRotate(diffLocal, snap.rotation);
        const newCenter = { x: pivotWorld.x - diffParent.x, y: pivotWorld.y - diffParent.y };
        const newX = newCenter.x - centerLocalNew.x;
        const newY = newCenter.y - centerLocalNew.y;

        // Canvas stores positive width/height; if flipped, offset x/y accordingly.
        const finalW = Math.abs(newW);
        const finalH = Math.abs(newH);
        const flippedX = newW < 0;
        const flippedY = newH < 0;

        updateNodesCoalesced(
          [snap.id],
          (n) => {
            n.x = newX + (flippedX ? -finalW : 0);
            n.y = newY + (flippedY ? -finalH : 0);
            n.width = finalW;
            n.height = finalH;
          },
          'Resize',
        );
        return;
      }

      if (mode.kind === 'rotate') {
        const angle = Math.atan2(ctx.world.y - mode.center.y, ctx.world.x - mode.center.x);
        let newRot = angle - mode.startAngle;
        if (ctx.mods.shift) {
          const step = (15 * Math.PI) / 180;
          newRot = Math.round(newRot / step) * step;
        }
        updateNodesCoalesced(
          [mode.initial.id],
          (n) => {
            n.rotation = newRot;
          },
          'Rotate',
        );
      }
    },

    onPointerUp(_ctx) {
      // Clear marquee / guides
      useStore.setState((s) => ({
        transient: {
          ...s.transient,
          marquee: null,
          guides: { guides: [], badges: [] },
        },
      }));
      mode = { kind: 'idle' };
    },

    onDoubleClick(ctx) {
      const state = ctx.state;
      const hit = hitTestForSelection(state.doc, ctx.world, true);
      if (!hit) return;
      const node = state.doc.nodes[hit];
      if (!node) return;
      if (node.type === 'text') {
        useStore.setState((s) => ({ transient: { ...s.transient, editingTextId: hit } }));
      } else if (node.type === 'frame') {
        // Dive-in: select topmost child
        const inside = hitTestForSelection(state.doc, ctx.world, true);
        if (inside && inside !== hit) setSelection([inside]);
      }
    },

    onDeactivate() {
      mode = { kind: 'idle' };
    },
  };

  function snapshot(state: AppState, id: NodeId): NodeSnapshot {
    const n = state.doc.nodes[id]!;
    // Parent world matrix (not used currently but kept for future extensions)
    const parentM = n.parentId ? nodeWorldMatrix(state.doc, n.parentId) : { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };
    return {
      id,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      rotation: n.rotation,
      parentWorldMatrix: parentM,
    };
  }
};

const centerOfNodeWorld = (state: AppState, id: NodeId): Vec2 => {
  const m = nodeWorldMatrix(state.doc, id);
  const n = state.doc.nodes[id]!;
  return matApply(m, { x: n.width / 2, y: n.height / 2 });
};

const distToPx = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

const unique = <T>(arr: T[]): T[] => Array.from(new Set(arr));

const collectMarqueeHits = (
  state: AppState,
  id: NodeId,
  rect: Rect,
  out: NodeId[],
): void => {
  const node = state.doc.nodes[id];
  if (!node || !node.visible || node.locked) return;
  const aabb = nodeWorldAABB(state.doc, id);
  if (rectIntersects(rect, aabb)) {
    out.push(id);
  }
};

// Suppress unused warnings
void matInvert;
void matRotate;
void reparent;
void updateNodes;
void isAncestor;
void descendantIds;
