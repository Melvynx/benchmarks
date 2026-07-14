import { applyM, invertM, mul, rotationOf, translation, type Mat2d } from '../../geometry/mat2d';
import { IDENTITY } from '../../geometry/mat2d';
import { degToRad, normalizeDeg, radToDeg, snapAngle } from '../../geometry/math';
import { rectContainsRect, rectFromPoints, type Rect } from '../../geometry/rect';
import type { Vec2 } from '../../geometry/vec2';
import { addV, rotV, subV } from '../../geometry/vec2';
import { findFrameAt } from '../../interaction/dropTarget';
import {
  getSelectionBox,
  handleCursorAngle,
  hitTestHandles,
  selectionBoxToAABB,
  type HandleHit,
  type HandleKind,
} from '../../interaction/handles';
import { resizeAlignedRect, resizeRotatedBox } from '../../interaction/resizeMath';
import { collectSnapTargets, snapMovingBox, snapPoint, type SnapTargets } from '../../interaction/snapping';
import { autoLayoutInsertionIndex } from '../../layout/autoLayout';
import { computeFrameLabels, frameLabelAt } from '../../render/frameLabels';
import { resizeCursor, rotateCursor } from '../../render/cursors';
import { getN, moveNode, patchBase, patchNode, cloneSubtree, addNode } from '../../scene/draft';
import { applyWorldPlacement, parentWorldMatrix, selectionWorldBounds, worldCorners, worldMatrix } from '../../scene/nodeGeometry';
import { getSceneIndex, hitChain, nodesIntersectingRect } from '../../scene/sceneIndex';
import { ancestorIds, descendantIds, getNode, siblingIdsOf, topLevelSelection } from '../../scene/traversal';
import type { NodeId, SceneDocument, SceneNode, TextNode } from '../../scene/types';
import { pickDeeperFromChain, pickFromChain } from '../../store/actions';
import { beginGesture, endGesture, updateGesture } from '../../store/docEdit';
import { editorStore, setHover, setSelection } from '../../store/store';
import type { Tool, ToolPointerEvent } from './types';

const DRAG_THRESHOLD = 3;

interface MoveItem {
  id: NodeId;
  startWorld: Mat2d;
  originalParent: NodeId | null;
  isFrame: boolean;
}

interface RotateItem {
  id: NodeId;
  rotation0: number;
  center0: Vec2;
  parentWorld: Mat2d;
  width: number;
  height: number;
}

type Phase =
  | { kind: 'idle' }
  | {
      kind: 'pressed';
      startWorld: Vec2;
      startScreen: Vec2;
      hitId: NodeId | null;
      handle: HandleHit | null;
      pendingShiftRemove: NodeId | null;
      wasAlreadySelected: boolean;
    }
  | {
      kind: 'moving';
      startPointer: Vec2;
      startDoc: SceneDocument;
      movingIds: NodeId[];
      movingSet: Set<NodeId>;
      items: MoveItem[];
      startBounds: Rect;
      targets: SnapTargets;
    }
  | {
      kind: 'resizing';
      handle: HandleKind;
      startDoc: SceneDocument;
      box0: Rect;
      single: { id: NodeId; node0: SceneNode; world0: Mat2d; parentWorld: Mat2d; worldRotation: number } | null;
      ids: NodeId[];
      targets: SnapTargets;
    }
  | {
      kind: 'rotating';
      center: Vec2;
      startAngle: number;
      items: RotateItem[];
    }
  | { kind: 'marquee'; start: Vec2; baseSelection: NodeId[]; scopeId: NodeId | null };

function stageSize(): { width: number; height: number } {
  const el = document.getElementById('canvas-stage');
  return { width: el?.clientWidth ?? 1200, height: el?.clientHeight ?? 800 };
}

class SelectTool implements Tool {
  private phase: Phase = { kind: 'idle' };

  // -------------------------------------------------------------------------
  // Pointer down
  // -------------------------------------------------------------------------

  onPointerDown(e: ToolPointerEvent): void {
    if (e.button !== 0) return;
    const state = editorStore.getState();
    const { doc, viewport, selection } = state;
    const stage = stageSize();

    // Frame labels select their frame.
    const label = frameLabelAt(computeFrameLabels(doc, viewport, stage.width, stage.height), e.screen.x, e.screen.y);
    if (label) {
      if (!selection.includes(label.id)) setSelection([label.id]);
      this.phase = {
        kind: 'pressed',
        startWorld: e.world,
        startScreen: e.screen,
        hitId: label.id,
        handle: null,
        pendingShiftRemove: null,
        wasAlreadySelected: selection.includes(label.id),
      };
      return;
    }

    // Transform handles.
    const box = getSelectionBox(doc, selection);
    if (box && state.editingTextId === null) {
      const handle = hitTestHandles(box, e.screen, viewport);
      if (handle) {
        this.phase = {
          kind: 'pressed',
          startWorld: e.world,
          startScreen: e.screen,
          hitId: null,
          handle,
          pendingShiftRemove: null,
          wasAlreadySelected: false,
        };
        return;
      }
    }

    // Node hit.
    const chain = hitChain(doc, e.world, { slop: 4 / viewport.zoom });
    if (!chain) {
      if (!e.shiftKey) setSelection([]);
      this.phase = {
        kind: 'pressed',
        startWorld: e.world,
        startScreen: e.screen,
        hitId: null,
        handle: null,
        pendingShiftRemove: null,
        wasAlreadySelected: false,
      };
      return;
    }

    const pick = pickFromChain(doc, chain, selection, e.metaKey);
    if (!pick) return;
    let pendingShiftRemove: NodeId | null = null;
    const wasAlreadySelected = selection.includes(pick);
    if (e.shiftKey) {
      if (wasAlreadySelected) pendingShiftRemove = pick;
      else setSelection([...selection, pick]);
    } else if (!wasAlreadySelected) {
      setSelection([pick]);
    }
    this.phase = {
      kind: 'pressed',
      startWorld: e.world,
      startScreen: e.screen,
      hitId: pick,
      handle: null,
      pendingShiftRemove,
      wasAlreadySelected,
    };
  }

  // -------------------------------------------------------------------------
  // Pointer move
  // -------------------------------------------------------------------------

  onPointerMove(e: ToolPointerEvent): void {
    const phase = this.phase;
    if (phase.kind === 'idle') {
      this.updateHover(e);
      return;
    }
    if (phase.kind === 'pressed') {
      const moved = Math.hypot(e.screen.x - phase.startScreen.x, e.screen.y - phase.startScreen.y);
      if (moved < DRAG_THRESHOLD) return;
      if (phase.handle?.type === 'resize') this.startResize(phase.handle.handle);
      else if (phase.handle?.type === 'rotate') this.startRotate(phase.startWorld);
      else if (phase.hitId) this.startMove(phase.startWorld, e.altKey);
      else this.startMarquee(phase.startWorld, e.shiftKey);
      // Fall through so the first drag frame applies immediately.
    }
    const active = this.phase;
    if (active.kind === 'moving') this.onMove(e);
    else if (active.kind === 'resizing') this.onResize(e);
    else if (active.kind === 'rotating') this.onRotate(e);
    else if (active.kind === 'marquee') this.onMarquee(e);
  }

  private updateHover(e: ToolPointerEvent): void {
    const state = editorStore.getState();
    const chain = hitChain(state.doc, e.world, { slop: 4 / state.viewport.zoom });
    if (!chain) {
      const stage = stageSize();
      const label = frameLabelAt(
        computeFrameLabels(state.doc, state.viewport, stage.width, stage.height),
        e.screen.x,
        e.screen.y,
      );
      setHover(label ? label.id : null);
      return;
    }
    setHover(pickFromChain(state.doc, chain, state.selection, e.metaKey));
  }

  // -------------------------------------------------------------------------
  // Move
  // -------------------------------------------------------------------------

  private startMove(startPointer: Vec2, altDuplicate: boolean): void {
    const state = editorStore.getState();
    beginGesture('move');
    let movingIds = topLevelSelection(state.doc, state.selection);
    if (movingIds.length === 0) {
      this.phase = { kind: 'idle' };
      return;
    }

    if (altDuplicate) {
      const cloneIds: NodeId[] = [];
      updateGesture((d) => {
        for (const id of movingIds) {
          const source = getN(d, id);
          if (!source) continue;
          const cloned = cloneSubtree(d, id);
          if (!cloned) continue;
          for (const node of cloned.nodes) {
            if (node.id !== cloned.rootId) d.nodes[node.id] = node;
          }
          const root = cloned.nodes.find((n) => n.id === cloned.rootId);
          if (!root) continue;
          addNode(d, root, source.parentId, siblingIdsOf(d, id).indexOf(id) + 1);
          cloneIds.push(root.id);
        }
      });
      if (cloneIds.length > 0) {
        setSelection(cloneIds);
        movingIds = cloneIds;
      }
    }

    const startDoc = editorStore.getState().doc;
    const movingSet = new Set<NodeId>(movingIds);
    for (const id of movingIds) for (const child of descendantIds(startDoc, id)) movingSet.add(child);

    const items: MoveItem[] = movingIds.map((id) => {
      const node = getNode(startDoc, id);
      return {
        id,
        startWorld: worldMatrix(startDoc, id),
        originalParent: node?.parentId ?? null,
        isFrame: node?.type === 'frame',
      };
    });

    const stage = stageSize();
    const startBounds =
      selectionWorldBounds(startDoc, movingIds) ?? ({ x: startPointer.x, y: startPointer.y, width: 0, height: 0 } as Rect);
    this.phase = {
      kind: 'moving',
      startPointer,
      startDoc,
      movingIds,
      movingSet,
      items,
      startBounds,
      targets: collectSnapTargets(startDoc, movingSet, state.viewport, stage.width, stage.height),
    };
  }

  private onMove(e: ToolPointerEvent): void {
    const phase = this.phase;
    if (phase.kind !== 'moving') return;
    const state = editorStore.getState();
    const zoom = state.viewport.zoom;

    let dx = e.world.x - phase.startPointer.x;
    let dy = e.world.y - phase.startPointer.y;
    const lockX = e.shiftKey && Math.abs(dy) >= Math.abs(dx);
    const lockY = e.shiftKey && Math.abs(dx) > Math.abs(dy);
    if (lockX) dx = 0;
    if (lockY) dy = 0;

    const candidate: Rect = { ...phase.startBounds, x: phase.startBounds.x + dx, y: phase.startBounds.y + dy };
    const snap = snapMovingBox(candidate, phase.targets, 6 / zoom);
    const snappedX = !lockX && snap.dx !== 0;
    const snappedY = !lockY && snap.dy !== 0;
    if (snappedX) dx += snap.dx;
    if (snappedY) dy += snap.dy;
    // Pixel-round unsnapped axes so positions stay clean.
    if (!snappedX) dx = Math.round(phase.startBounds.x + dx) - phase.startBounds.x;
    if (!snappedY) dy = Math.round(phase.startBounds.y + dy) - phase.startBounds.y;

    const targetFrame = findFrameAt(state.doc, e.world, phase.movingSet);
    const delta = translation(dx, dy);

    updateGesture((d) => {
      for (const item of phase.items) {
        const node = getN(d, item.id);
        if (!node) continue;
        const effectiveTarget = item.isFrame ? item.originalParent : (targetFrame ?? null);
        if (node.parentId !== effectiveTarget) {
          moveNode(d, item.id, effectiveTarget, -1);
        }
        const parentWorld = effectiveTarget === null ? IDENTITY : worldMatrix(phase.startDoc, effectiveTarget);
        applyWorldPlacement(d, item.id, mul(delta, item.startWorld), parentWorld);
      }

      // Auto-layout reorder when dragging a single child inside its layout frame.
      if (phase.items.length === 1) {
        const item = phase.items[0];
        if (!item) return;
        const node = getN(d, item.id);
        const parent = node?.parentId ? getN(d, node.parentId) : null;
        if (node && parent && parent.type === 'frame' && parent.layout) {
          const local = applyM(invertM(worldMatrix(phase.startDoc, parent.id)), e.world);
          const desired = autoLayoutInsertionIndex(d, parent, parent.layout, local, item.id);
          const current = parent.childIds.indexOf(item.id);
          const fullIndex = desired > current ? desired + 1 : desired;
          if (desired !== current) moveNode(d, item.id, parent.id, fullIndex);
        }
      }
    });

    const crossing = phase.items.some((item) => !item.isFrame && item.originalParent !== (targetFrame ?? null));
    editorStore.setState({
      snap: snap.visuals.guides.length > 0 || snap.visuals.labels.length > 0 ? snap.visuals : null,
      dropTargetId: crossing ? targetFrame : null,
    });
  }

  // -------------------------------------------------------------------------
  // Resize
  // -------------------------------------------------------------------------

  private startResize(handle: HandleKind): void {
    const state = editorStore.getState();
    beginGesture('resize');
    const startDoc = state.doc;
    const ids = topLevelSelection(startDoc, state.selection);
    const box = getSelectionBox(startDoc, state.selection);
    if (!box || ids.length === 0) {
      this.phase = { kind: 'idle' };
      return;
    }
    const movingSet = new Set<NodeId>(ids);
    for (const id of ids) for (const child of descendantIds(startDoc, id)) movingSet.add(child);
    const stage = stageSize();

    let single: Extract<Phase, { kind: 'resizing' }>['single'] = null;
    const onlyId = state.selection.length === 1 ? state.selection[0] : undefined;
    if (onlyId) {
      const node0 = getNode(startDoc, onlyId);
      if (node0) {
        const world0 = worldMatrix(startDoc, onlyId);
        single = {
          id: onlyId,
          node0,
          world0,
          parentWorld: parentWorldMatrix(startDoc, onlyId),
          worldRotation: radToDeg(rotationOf(world0)),
        };
      }
    }

    this.phase = {
      kind: 'resizing',
      handle,
      startDoc,
      box0: selectionBoxToAABB(box),
      single,
      ids,
      targets: collectSnapTargets(startDoc, movingSet, state.viewport, stage.width, stage.height),
    };
  }

  private onResize(e: ToolPointerEvent): void {
    const phase = this.phase;
    if (phase.kind !== 'resizing') return;
    const state = editorStore.getState();
    const zoom = state.viewport.zoom;
    const options = { aspect: e.shiftKey, fromCenter: e.altKey };

    let pointer = e.world;
    const axisAligned = !phase.single || Math.abs(normalizeDeg(phase.single.worldRotation)) < 0.01;
    if (axisAligned) {
      const snap = snapPoint(pointer, phase.targets, 6 / zoom);
      const movesX = phase.handle.includes('e') || phase.handle.includes('w');
      const movesY = phase.handle.includes('n') || phase.handle.includes('s');
      pointer = {
        x: pointer.x + (movesX ? snap.dx : 0),
        y: pointer.y + (movesY ? snap.dy : 0),
      };
      const guides = snap.visuals.guides.filter((g) => (g.axis === 'x' ? movesX && snap.dx !== 0 : movesY && snap.dy !== 0));
      editorStore.setState({ snap: guides.length > 0 ? { guides, labels: [] } : null });
    }

    if (phase.single) {
      const { id, node0, world0, parentWorld } = phase.single;
      const placed = resizeRotatedBox(
        { width: node0.width, height: node0.height },
        world0,
        parentWorld,
        pointer,
        phase.handle,
        options,
      );
      const movesX = phase.handle.includes('e') || phase.handle.includes('w') || options.aspect;
      const movesY = phase.handle.includes('n') || phase.handle.includes('s') || options.aspect;
      updateGesture((d) => {
        const node = getN(d, id);
        if (!node) return;
        patchBase(d, id, {
          x: round2(placed.x),
          y: round2(placed.y),
          width: round2(placed.width),
          height: node.type === 'line' ? 0 : round2(placed.height),
          rotation: placed.rotation,
          ...(movesX && node.sizingX !== 'fixed' ? { sizingX: 'fixed' as const } : {}),
          ...(movesY && node.sizingY !== 'fixed' ? { sizingY: 'fixed' as const } : {}),
        });
        const fresh = getN(d, id);
        if (fresh && fresh.type === 'text') {
          const next: Partial<TextNode> = {};
          if (movesX && fresh.autoResize === 'width') next.autoResize = 'height';
          if (movesY) next.autoResize = 'none';
          if (Object.keys(next).length > 0) patchNode(d, fresh, next);
        }
      });
    } else {
      const { rect, sx, sy } = resizeAlignedRect(phase.box0, pointer, phase.handle, options);
      updateGesture((d) => {
        for (const id of phase.ids) {
          scalePlacedNode(d, phase.startDoc, id, phase.box0, rect, sx < 0, sy < 0);
        }
      });
    }
  }

  // -------------------------------------------------------------------------
  // Rotate
  // -------------------------------------------------------------------------

  private startRotate(startPointer: Vec2): void {
    const state = editorStore.getState();
    beginGesture('rotate');
    const startDoc = state.doc;
    const ids = topLevelSelection(startDoc, state.selection);
    const box = getSelectionBox(startDoc, state.selection);
    if (!box || ids.length === 0) {
      this.phase = { kind: 'idle' };
      return;
    }
    const items: RotateItem[] = [];
    for (const id of ids) {
      const node = getNode(startDoc, id);
      if (!node) continue;
      const corners = worldCorners(startDoc, node);
      items.push({
        id,
        rotation0: node.rotation,
        center0: { x: (corners[0].x + corners[2].x) / 2, y: (corners[0].y + corners[2].y) / 2 },
        parentWorld: parentWorldMatrix(startDoc, id),
        width: node.width,
        height: node.height,
      });
    }
    this.phase = {
      kind: 'rotating',
      center: box.center,
      startAngle: Math.atan2(startPointer.y - box.center.y, startPointer.x - box.center.x),
      items,
    };
  }

  private onRotate(e: ToolPointerEvent): void {
    const phase = this.phase;
    if (phase.kind !== 'rotating') return;
    const angle = Math.atan2(e.world.y - phase.center.y, e.world.x - phase.center.x);
    let delta = radToDeg(angle - phase.startAngle);
    const single = phase.items.length === 1;

    if (e.shiftKey) {
      if (single) {
        const item = phase.items[0];
        if (item) delta = snapAngle(item.rotation0 + delta, 15) - item.rotation0;
      } else {
        delta = snapAngle(delta, 15);
      }
    }

    let hud = delta;
    updateGesture((d) => {
      for (const item of phase.items) {
        const rotation = normalizeDeg(item.rotation0 + delta);
        if (single) {
          patchBase(d, item.id, { rotation });
          hud = rotation;
        } else {
          const orbited = addV(phase.center, rotV(subV(item.center0, phase.center), degToRad(delta)));
          const localCenter = applyM(invertM(item.parentWorld), orbited);
          patchBase(d, item.id, {
            rotation,
            x: localCenter.x - item.width / 2,
            y: localCenter.y - item.height / 2,
          });
        }
      }
    });
    editorStore.setState({ rotationHud: Math.round(hud * 10) / 10 });
  }

  // -------------------------------------------------------------------------
  // Marquee
  // -------------------------------------------------------------------------

  private startMarquee(start: Vec2, additive: boolean): void {
    const state = editorStore.getState();
    this.phase = {
      kind: 'marquee',
      start,
      baseSelection: additive ? [...state.selection] : [],
      scopeId: findFrameAt(state.doc, start, new Set()),
    };
  }

  private onMarquee(e: ToolPointerEvent): void {
    const phase = this.phase;
    if (phase.kind !== 'marquee') return;
    const state = editorStore.getState();
    const doc = state.doc;
    const area = rectFromPoints(phase.start, e.world);
    editorStore.setState({ marquee: area });

    const index = getSceneIndex(doc);
    const picked = new Set<NodeId>(phase.baseSelection);
    for (const id of nodesIntersectingRect(doc, area)) {
      const target = bubbleForMarquee(doc, id, phase.scopeId);
      if (!target || target === phase.scopeId) continue;
      const node = getNode(doc, target);
      if (!node) continue;
      // Don't select containers that completely enclose the marquee.
      const bounds = index.worldBounds.get(target);
      if (node.type === 'frame' && bounds && rectContainsRect(bounds, area)) continue;
      picked.add(target);
    }
    setSelection([...picked]);
  }

  // -------------------------------------------------------------------------
  // Pointer up / double click
  // -------------------------------------------------------------------------

  onPointerUp(e: ToolPointerEvent): void {
    const phase = this.phase;
    this.phase = { kind: 'idle' };

    if (phase.kind === 'pressed') {
      const state = editorStore.getState();
      if (phase.pendingShiftRemove) {
        setSelection(state.selection.filter((id) => id !== phase.pendingShiftRemove));
      } else if (!e.shiftKey && phase.hitId && phase.wasAlreadySelected && state.selection.length > 1) {
        setSelection([phase.hitId]);
      }
      endGesture('Select');
      return;
    }
    if (phase.kind === 'moving') {
      endGesture('Move');
      return;
    }
    if (phase.kind === 'resizing') {
      endGesture('Resize');
      return;
    }
    if (phase.kind === 'rotating') {
      endGesture('Rotate');
      return;
    }
    if (phase.kind === 'marquee') {
      editorStore.setState({ marquee: null });
    }
  }

  onDoubleClick(e: ToolPointerEvent): void {
    const state = editorStore.getState();
    const chain = hitChain(state.doc, e.world, { slop: 4 / state.viewport.zoom });
    if (!chain) return;
    const deeper = pickDeeperFromChain(state.doc, chain, state.selection);
    if (!deeper) return;
    const node = getNode(state.doc, deeper);
    if (!node) return;
    setSelection([deeper]);
    if (node.type === 'text') {
      editorStore.setState({ editingTextId: deeper });
    }
  }

  getCursor(screen: Vec2): string {
    const state = editorStore.getState();
    if (state.activeGesture === 'move') return 'default';
    if (this.phase.kind === 'rotating') return rotateCursor(0);
    if (this.phase.kind === 'resizing') {
      const box = getSelectionBox(state.doc, state.selection);
      return box ? resizeCursor(handleCursorAngle(box, this.phase.handle)) : 'default';
    }
    const box = getSelectionBox(state.doc, state.selection);
    if (box && state.editingTextId === null) {
      const hit = hitTestHandles(box, screen, state.viewport);
      if (hit?.type === 'resize') return resizeCursor(handleCursorAngle(box, hit.handle));
      if (hit?.type === 'rotate') return rotateCursor(handleCursorAngle(box, hit.handle));
    }
    return 'default';
  }

  deactivate(): void {
    if (this.phase.kind !== 'idle' && this.phase.kind !== 'pressed') {
      endGesture('Edit');
    }
    this.phase = { kind: 'idle' };
    editorStore.setState({ marquee: null, snap: null, dropTargetId: null, rotationHud: null });
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/** Map a marquee candidate to the layer that should actually be selected. */
function bubbleForMarquee(doc: SceneDocument, id: NodeId, scopeId: NodeId | null): NodeId | null {
  const chain = [id, ...ancestorIds(doc, id)];
  if (scopeId) {
    const scopeIndex = chain.indexOf(scopeId);
    if (scopeIndex > 0) return chain[scopeIndex - 1] ?? null;
  }
  return chain[chain.length - 1] ?? null;
}

/**
 * Multi-selection resize: scale every node's center and size inside the
 * selection box mapping (box0 → rect). Rotated nodes scale their box; this is
 * the standard approximation (no skew is introduced).
 */
function scalePlacedNode(
  d: Parameters<typeof getN>[0],
  startDoc: SceneDocument,
  id: NodeId,
  box0: Rect,
  rect: Rect,
  flipX: boolean,
  flipY: boolean,
): void {
  const node0 = getNode(startDoc, id);
  const node = getN(d, id);
  if (!node0 || !node) return;
  const corners = worldCorners(startDoc, node0);
  const center0 = { x: (corners[0].x + corners[2].x) / 2, y: (corners[0].y + corners[2].y) / 2 };

  const sx = box0.width < 1e-9 ? 1 : rect.width / box0.width;
  const sy = box0.height < 1e-9 ? 1 : rect.height / box0.height;
  let tx = box0.width < 1e-9 ? 0.5 : (center0.x - box0.x) / box0.width;
  let ty = box0.height < 1e-9 ? 0.5 : (center0.y - box0.y) / box0.height;
  if (flipX) tx = 1 - tx;
  if (flipY) ty = 1 - ty;

  const newCenter = { x: rect.x + tx * rect.width, y: rect.y + ty * rect.height };
  const width = Math.max(0.01, node0.width * sx);
  const height = node0.type === 'line' ? 0 : Math.max(0.01, node0.height * sy);

  const parentWorld = parentWorldMatrix(startDoc, id);
  const localCenter = applyM(invertM(parentWorld), newCenter);
  patchBase(d, id, {
    x: round2(localCenter.x - width / 2),
    y: round2(localCenter.y - height / 2),
    width: round2(width),
    height: round2(height),
    sizingX: 'fixed',
    sizingY: 'fixed',
  });
}

export const selectTool = new SelectTool();
