import type { Vec2 } from '../../geometry/vec2';
import { rectFromPoints } from '../../geometry/rect';
import { findFrameAt } from '../../interaction/dropTarget';
import { applyM, invertM, IDENTITY } from '../../geometry/mat2d';
import { addNode } from '../../scene/draft';
import { createText, uniqueName } from '../../scene/factories';
import { worldMatrix } from '../../scene/nodeGeometry';
import type { NodeId } from '../../scene/types';
import { editDoc } from '../../store/docEdit';
import { editorStore, setTool } from '../../store/store';
import type { Tool, ToolPointerEvent } from './types';

const EMPTY_SET: ReadonlySet<NodeId> = new Set();

/**
 * Text tool: click places an auto-width text and opens the editor; dragging
 * defines a fixed-width box (auto-height) first, like Figma.
 */
class TextTool implements Tool {
  private start: Vec2 | null = null;
  private dragged = false;

  onPointerDown(e: ToolPointerEvent): void {
    this.start = e.world;
    this.dragged = false;
  }

  onPointerMove(e: ToolPointerEvent): void {
    if (!this.start) return;
    if (!this.dragged && Math.hypot(e.world.x - this.start.x, e.world.y - this.start.y) < 4) return;
    this.dragged = true;
    editorStore.setState({ marquee: rectFromPoints(this.start, e.world) });
  }

  onPointerUp(e: ToolPointerEvent): void {
    const start = this.start;
    this.start = null;
    editorStore.setState({ marquee: null });
    if (!start) return;

    const state = editorStore.getState();
    const doc = state.doc;
    const parentId = findFrameAt(doc, start, EMPTY_SET);
    const parentInverse = parentId === null ? IDENTITY : invertM(worldMatrix(doc, parentId));
    const local = applyM(parentInverse, start);
    const localEnd = applyM(parentInverse, e.world);

    const node = this.dragged
      ? createText({
          name: uniqueName(doc, 'Text'),
          x: Math.round(Math.min(local.x, localEnd.x)),
          y: Math.round(Math.min(local.y, localEnd.y)),
          width: Math.max(24, Math.round(Math.abs(localEnd.x - local.x))),
          autoResize: 'height',
        })
      : createText({
          name: uniqueName(doc, 'Text'),
          x: Math.round(local.x),
          y: Math.round(local.y - 10),
          autoResize: 'width',
        });

    editDoc('Add text', (d) => addNode(d, node, parentId, -1), { select: [node.id] });
    setTool('select');
    editorStore.setState({ editingTextId: node.id });
  }

  getCursor(): string {
    return 'text';
  }

  deactivate(): void {
    this.start = null;
    editorStore.setState({ marquee: null });
  }
}

export const textTool = new TextTool();
