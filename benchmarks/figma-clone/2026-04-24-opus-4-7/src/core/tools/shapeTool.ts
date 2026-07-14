import type { Tool, ToolContext } from '../input/types';
import type { ToolId } from '../../state/types';
import type { NodeId, SceneNode } from '../scene';
import {
  createEllipse,
  createFrame,
  createLine,
  createPolygon,
  createRectangle,
  createText,
  isFrame,
  hitTestForSelection,
} from '../scene';
import type { Vec2 } from '../geometry/Vec2';
import { rectFromPoints } from '../geometry/Rect';
import { useStore } from '../../state/store';
import { addNode, setTool } from '../../state';

type DrawState =
  | { kind: 'idle' }
  | { kind: 'drawing'; start: Vec2; nodeId: NodeId };

const MIN_SIZE = 2;

/** Shared drawing behavior for rectangle/ellipse/frame/polygon tools. */
export const createShapeTool = (
  id: Exclude<ToolId, 'select' | 'hand' | 'text' | 'line' | 'image' | 'pen'>,
): Tool => {
  let state: DrawState = { kind: 'idle' };

  return {
    id,
    cursor: () => 'crosshair',

    onPointerDown(ctx) {
      if (ctx.button !== 0) return;
      // Determine parent: hovered frame if the pointer lands inside one, else page
      const parentId = getPotentialParent(ctx);
      const parentOrigin = parentId ? parentOriginWorld(ctx, parentId) : { x: 0, y: 0 };
      const x = ctx.world.x - parentOrigin.x;
      const y = ctx.world.y - parentOrigin.y;
      let node: SceneNode;
      switch (id) {
        case 'rectangle':
          node = createRectangle({ parentId, x, y, width: 0, height: 0 });
          break;
        case 'ellipse':
          node = createEllipse({ parentId, x, y, width: 0, height: 0 });
          break;
        case 'frame':
          node = createFrame({ parentId, x, y, width: 0, height: 0 });
          break;
        case 'polygon':
          node = createPolygon({ parentId, x, y, width: 0, height: 0, starRatio: ctx.mods.shift ? 0.5 : null });
          break;
      }
      addNode(node, parentId);
      state = { kind: 'drawing', start: { x: ctx.world.x, y: ctx.world.y }, nodeId: node.id };
    },

    onPointerMove(ctx) {
      if (state.kind !== 'drawing') return;
      const rect = rectFromPoints(state.start, ctx.world);
      let w = rect.width;
      let h = rect.height;
      let x = rect.x;
      let y = rect.y;
      if (ctx.mods.shift) {
        const s = Math.max(w, h);
        // Keep anchored at start point
        if (ctx.world.x >= state.start.x) x = state.start.x;
        else x = state.start.x - s;
        if (ctx.world.y >= state.start.y) y = state.start.y;
        else y = state.start.y - s;
        w = s;
        h = s;
      }
      if (ctx.mods.alt) {
        // Scale from center (start point)
        x = state.start.x - w;
        y = state.start.y - h;
        w = w * 2;
        h = h * 2;
      }
      // Parent-local coords
      const parentId = useStore.getState().doc.nodes[state.nodeId]?.parentId ?? null;
      const parentOrigin = parentId ? parentOriginWorld(ctx, parentId) : { x: 0, y: 0 };
      useStore.getState().mutateCoalesced('Draw', (draft) => {
        const n = draft.nodes[state.kind === 'drawing' ? state.nodeId : ''];
        if (!n) return;
        n.x = x - parentOrigin.x;
        n.y = y - parentOrigin.y;
        n.width = Math.max(MIN_SIZE, w);
        n.height = Math.max(MIN_SIZE, h);
      });
    },

    onPointerUp(_ctx) {
      if (state.kind === 'drawing') {
        // If the shape is too small (user just clicked), delete it and fall back
        const doc = useStore.getState().doc;
        const n = doc.nodes[state.nodeId];
        if (n && (n.width <= MIN_SIZE + 1 && n.height <= MIN_SIZE + 1)) {
          // set to default size
          useStore.getState().mutate('Draw', (draft) => {
            const nn = draft.nodes[state.kind === 'drawing' ? state.nodeId : ''];
            if (!nn) return;
            nn.width = 100;
            nn.height = 100;
          });
        }
      }
      state = { kind: 'idle' };
      // Switch back to select tool
      setTool('select');
    },
  };
};

export const createTextTool = (): Tool => {
  let drawState: DrawState = { kind: 'idle' };
  return {
    id: 'text',
    cursor: () => 'text',
    onPointerDown(ctx) {
      if (ctx.button !== 0) return;
      const parentId = getPotentialParent(ctx);
      const parentOrigin = parentId ? parentOriginWorld(ctx, parentId) : { x: 0, y: 0 };
      const node = createText({
        parentId,
        x: ctx.world.x - parentOrigin.x,
        y: ctx.world.y - parentOrigin.y,
        text: '',
        width: 120,
        height: 24,
        autoWidth: true,
        autoHeight: true,
      });
      addNode(node, parentId);
      drawState = { kind: 'drawing', start: { x: ctx.world.x, y: ctx.world.y }, nodeId: node.id };
      // Immediately enter edit mode
      useStore.setState((s) => ({ transient: { ...s.transient, editingTextId: node.id } }));
    },
    onPointerMove(ctx) {
      if (drawState.kind !== 'drawing') return;
      // Allow drag to create a fixed-width text box
      const rect = rectFromPoints(drawState.start, ctx.world);
      if (rect.width < 8 && rect.height < 8) return;
      useStore.getState().mutateCoalesced('Draw text', (draft) => {
        const n = draft.nodes[drawState.kind === 'drawing' ? drawState.nodeId : ''];
        if (!n || n.type !== 'text') return;
        n.x = rect.x;
        n.y = rect.y;
        n.width = Math.max(20, rect.width);
        n.height = Math.max(20, rect.height);
        n.autoWidth = false;
        n.autoHeight = true;
      });
    },
    onPointerUp(_ctx) {
      drawState = { kind: 'idle' };
      setTool('select');
    },
  };
};

export const createLineTool = (): Tool => {
  let drawing: { startWorld: Vec2; nodeId: NodeId } | null = null;
  return {
    id: 'line',
    cursor: () => 'crosshair',
    onPointerDown(ctx) {
      if (ctx.button !== 0) return;
      const parentId = getPotentialParent(ctx);
      const parentOrigin = parentId ? parentOriginWorld(ctx, parentId) : { x: 0, y: 0 };
      const node = createLine({
        parentId,
        x: ctx.world.x - parentOrigin.x,
        y: ctx.world.y - parentOrigin.y,
        width: 0,
        height: 0,
      });
      addNode(node, parentId);
      drawing = { startWorld: ctx.world, nodeId: node.id };
    },
    onPointerMove(ctx) {
      if (!drawing) return;
      let dx = ctx.world.x - drawing.startWorld.x;
      let dy = ctx.world.y - drawing.startWorld.y;
      if (ctx.mods.shift) {
        const angle = Math.atan2(dy, dx);
        const step = Math.PI / 4;
        const snap = Math.round(angle / step) * step;
        const len = Math.hypot(dx, dy);
        dx = Math.cos(snap) * len;
        dy = Math.sin(snap) * len;
      }
      useStore.getState().mutateCoalesced('Draw line', (draft) => {
        const n = draft.nodes[drawing!.nodeId];
        if (!n) return;
        n.width = dx;
        n.height = dy;
      });
    },
    onPointerUp(_ctx) {
      drawing = null;
      setTool('select');
    },
  };
};

const getPotentialParent = (ctx: ToolContext): NodeId | null => {
  const hit = hitTestForSelection(ctx.state.doc, ctx.world, false);
  if (hit) {
    const n = ctx.state.doc.nodes[hit];
    if (n && isFrame(n)) return hit;
  }
  return null;
};

const parentOriginWorld = (ctx: ToolContext, parentId: NodeId): Vec2 => {
  const chain: NodeId[] = [];
  let cur: NodeId | null = parentId;
  while (cur) {
    chain.unshift(cur);
    cur = ctx.state.doc.nodes[cur]?.parentId ?? null;
  }
  // Compute cumulative top-left in world space (approximation: ignores rotation)
  let x = 0;
  let y = 0;
  for (const id of chain) {
    const n = ctx.state.doc.nodes[id];
    if (!n) continue;
    x += n.x;
    y += n.y;
  }
  return { x, y };
};
