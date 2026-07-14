import type { Vec2 } from '../../geometry/vec2';

export interface ToolPointerEvent {
  /** CSS px relative to the canvas top-left. */
  screen: Vec2;
  /** World coordinates. */
  world: Vec2;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  button: number;
  raw: PointerEvent;
}

/**
 * Tools are small state machines. The pointer controller owns shared gestures
 * (panning, zooming) and routes everything else to the active tool.
 */
export interface Tool {
  onPointerDown(e: ToolPointerEvent): void;
  onPointerMove(e: ToolPointerEvent): void;
  onPointerUp(e: ToolPointerEvent): void;
  onDoubleClick?(e: ToolPointerEvent): void;
  /** Cursor to show given the latest pointer position. */
  getCursor(screen: Vec2, world: Vec2): string;
  /** Reset internal state when the user switches tools mid-gesture. */
  deactivate(): void;
}
