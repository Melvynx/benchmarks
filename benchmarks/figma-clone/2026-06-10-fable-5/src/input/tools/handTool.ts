import type { Vec2 } from '../../geometry/vec2';
import { panBy } from '../../store/viewport';
import type { Tool, ToolPointerEvent } from './types';

class HandTool implements Tool {
  private panning = false;
  private last: Vec2 | null = null;

  onPointerDown(e: ToolPointerEvent): void {
    this.panning = true;
    this.last = e.screen;
  }

  onPointerMove(e: ToolPointerEvent): void {
    if (!this.panning || !this.last) return;
    panBy(e.screen.x - this.last.x, e.screen.y - this.last.y);
    this.last = e.screen;
  }

  onPointerUp(): void {
    this.panning = false;
    this.last = null;
  }

  getCursor(): string {
    return this.panning ? 'grabbing' : 'grab';
  }

  deactivate(): void {
    this.panning = false;
    this.last = null;
  }
}

export const handTool = new HandTool();
