import { applyM, invertM, type Mat2d } from '../../geometry/mat2d';
import { IDENTITY } from '../../geometry/mat2d';
import { radToDeg } from '../../geometry/math';
import type { Vec2 } from '../../geometry/vec2';
import { findFrameAt } from '../../interaction/dropTarget';
import { addNode, patchBase } from '../../scene/draft';
import {
  createEllipse,
  createFrame,
  createLine,
  createPolygon,
  createRect,
  createStar,
  uniqueName,
} from '../../scene/factories';
import { worldMatrix } from '../../scene/nodeGeometry';
import type { NodeId, SceneDocument, SceneNode } from '../../scene/types';
import { beginGesture, endGesture, updateGesture } from '../../store/docEdit';
import { editorStore, setTool, type ToolId } from '../../store/store';
import type { Tool, ToolPointerEvent } from './types';

type ShapeToolId = Extract<ToolId, 'rect' | 'ellipse' | 'line' | 'polygon' | 'star' | 'frame'>;

const EMPTY_SET: ReadonlySet<NodeId> = new Set();

function makeShape(doc: SceneDocument, tool: ShapeToolId): SceneNode {
  switch (tool) {
    case 'rect':
      return createRect({ name: uniqueName(doc, 'Rectangle') });
    case 'ellipse':
      return createEllipse({ name: uniqueName(doc, 'Ellipse') });
    case 'line':
      return createLine({ name: uniqueName(doc, 'Line') });
    case 'polygon':
      return createPolygon({ name: uniqueName(doc, 'Polygon') });
    case 'star':
      return createStar({ name: uniqueName(doc, 'Star') });
    case 'frame':
      return createFrame({ name: uniqueName(doc, 'Frame') });
  }
}

const LABEL: Record<ShapeToolId, string> = {
  rect: 'Draw rectangle',
  ellipse: 'Draw ellipse',
  line: 'Draw line',
  polygon: 'Draw polygon',
  star: 'Draw star',
  frame: 'Draw frame',
};

/**
 * Shared tool for every shape: click for a default 100×100, drag to size.
 * Shapes drawn over a frame are created inside it; Shift constrains aspect
 * (45° steps for lines), Alt draws from the center.
 */
class DrawTool implements Tool {
  private drawing: {
    nodeId: NodeId;
    tool: ShapeToolId;
    startParent: Vec2;
    parentInverse: Mat2d;
    dragged: boolean;
  } | null = null;

  onPointerDown(e: ToolPointerEvent): void {
    const state = editorStore.getState();
    const tool = state.tool as ShapeToolId;
    if (!LABEL[tool]) return;
    const doc = state.doc;
    // Frames always go to the root; other shapes nest into the frame below.
    const parentId = tool === 'frame' ? null : findFrameAt(doc, e.world, EMPTY_SET);
    const parentInverse = parentId === null ? IDENTITY : invertM(worldMatrix(doc, parentId));
    const startParent = applyM(parentInverse, e.world);

    const node = makeShape(doc, tool);
    beginGesture('draw');
    updateGesture((d) => {
      patchBase(d, node.id, {});
      addNode(d, node, parentId, -1);
      patchBase(d, node.id, {
        x: Math.round(startParent.x),
        y: Math.round(startParent.y),
        width: tool === 'line' ? 0 : 1,
        height: tool === 'line' ? 0 : 1,
      });
    });
    editorStore.setState({ selection: [node.id] });
    this.drawing = { nodeId: node.id, tool, startParent, parentInverse, dragged: false };
  }

  onPointerMove(e: ToolPointerEvent): void {
    const session = this.drawing;
    if (!session) return;
    const point = applyM(session.parentInverse, e.world);
    const start = session.startParent;
    if (!session.dragged && Math.hypot(point.x - start.x, point.y - start.y) < 2) return;
    session.dragged = true;

    if (session.tool === 'line') {
      let dx = point.x - start.x;
      let dy = point.y - start.y;
      if (e.shiftKey) {
        const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
        const length = Math.hypot(dx, dy);
        dx = Math.cos(angle) * length;
        dy = Math.sin(angle) * length;
      }
      const length = Math.hypot(dx, dy);
      const rotation = radToDeg(Math.atan2(dy, dx));
      updateGesture((d) => {
        patchBase(d, session.nodeId, {
          x: start.x + dx / 2 - length / 2,
          y: start.y + dy / 2,
          width: length,
          height: 0,
          rotation: Math.round(rotation * 100) / 100,
        });
      });
      return;
    }

    let x0 = start.x;
    let y0 = start.y;
    let w = point.x - start.x;
    let h = point.y - start.y;
    if (e.shiftKey) {
      const size = Math.max(Math.abs(w), Math.abs(h));
      w = Math.sign(w || 1) * size;
      h = Math.sign(h || 1) * size;
    }
    if (e.altKey) {
      x0 = start.x - w;
      y0 = start.y - h;
      w *= 2;
      h *= 2;
    }
    const rect = {
      x: Math.round(Math.min(x0, x0 + w)),
      y: Math.round(Math.min(y0, y0 + h)),
      width: Math.max(1, Math.round(Math.abs(w))),
      height: Math.max(1, Math.round(Math.abs(h))),
    };
    updateGesture((d) => patchBase(d, session.nodeId, rect));
  }

  onPointerUp(): void {
    const session = this.drawing;
    this.drawing = null;
    if (!session) return;
    if (!session.dragged && session.tool !== 'line') {
      // Plain click: drop a 100×100 default centered on the click.
      updateGesture((d) =>
        patchBase(d, session.nodeId, {
          x: Math.round(session.startParent.x - 50),
          y: Math.round(session.startParent.y - 50),
          width: 100,
          height: 100,
        }),
      );
    } else if (!session.dragged && session.tool === 'line') {
      updateGesture((d) => patchBase(d, session.nodeId, { width: 100, height: 0 }));
    }
    endGesture(LABEL[session.tool]);
    setTool('select');
  }

  getCursor(): string {
    return 'crosshair';
  }

  deactivate(): void {
    if (this.drawing) {
      endGesture('Draw');
      this.drawing = null;
    }
  }
}

export const drawTool = new DrawTool();
