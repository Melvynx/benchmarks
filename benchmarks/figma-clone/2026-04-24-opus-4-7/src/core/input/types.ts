import type { Vec2 } from '../geometry/Vec2';
import type { AppState, ToolId } from '../../state/types';

export interface Modifiers {
  shift: boolean;
  alt: boolean;
  meta: boolean; // cmd on mac
  ctrl: boolean;
}

export const modifiersOf = (e: MouseEvent | KeyboardEvent | PointerEvent | WheelEvent): Modifiers => ({
  shift: e.shiftKey,
  alt: e.altKey,
  meta: e.metaKey,
  ctrl: e.ctrlKey,
});

export interface ToolContext {
  state: AppState;
  /** Pointer position in canvas CSS pixels. */
  screen: Vec2;
  /** Pointer position in world (page-local) coordinates. */
  world: Vec2;
  /** Modifiers at time of event. */
  mods: Modifiers;
  /** Which mouse button (for down/up). 0=left, 1=mid, 2=right. */
  button: number;
  /** pointerId, for capture. */
  pointerId: number;
}

export interface Tool {
  id: ToolId;
  cursor: (ctx: ToolContext) => string;
  onPointerDown(ctx: ToolContext): void;
  onPointerMove(ctx: ToolContext): void;
  onPointerUp(ctx: ToolContext): void;
  onDoubleClick?(ctx: ToolContext): void;
  /** Called when tool becomes inactive. */
  onDeactivate?(): void;
  /** Called when tool becomes active. */
  onActivate?(): void;
}
