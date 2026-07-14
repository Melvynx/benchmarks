import type { ToolContext, Tool, Modifiers } from './types';
import { modifiersOf } from './types';
import type { ToolId } from '../../state/types';
import { useStore, setTool } from '../../state/store';
import { screenToWorld, zoomAt, MIN_ZOOM, MAX_ZOOM } from '../../state/viewport';
import type { Vec2 } from '../geometry/Vec2';
import { hitTestForSelection, nodeWorldAABB } from '../scene';
import { createHandTool } from '../tools/handTool';

export interface InputControllerOptions {
  canvas: HTMLCanvasElement;
  toolbox: Record<ToolId, Tool>;
}

const PAN_CURSOR = 'grab';
const PANNING_CURSOR = 'grabbing';

export class InputController {
  private canvas: HTMLCanvasElement;
  private toolbox: Record<ToolId, Tool>;
  private activePointerId: number | null = null;
  /** Temporary hand tool instance used for space-drag. */
  private tempHand: Tool;
  private tempHandActive = false;

  private attached = false;

  constructor(opts: InputControllerOptions) {
    this.canvas = opts.canvas;
    this.toolbox = opts.toolbox;
    this.tempHand = createHandTool();
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    this.canvas.addEventListener('pointermove', this.onPointerMove);
    this.canvas.addEventListener('pointerup', this.onPointerUp);
    this.canvas.addEventListener('pointercancel', this.onPointerUp);
    this.canvas.addEventListener('pointerleave', this.onPointerLeave);
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    this.canvas.removeEventListener('pointermove', this.onPointerMove);
    this.canvas.removeEventListener('pointerup', this.onPointerUp);
    this.canvas.removeEventListener('pointercancel', this.onPointerUp);
    this.canvas.removeEventListener('pointerleave', this.onPointerLeave);
    this.canvas.removeEventListener('dblclick', this.onDoubleClick);
    this.canvas.removeEventListener('wheel', this.onWheel);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  /** Space key: set temp hand. */
  setSpaceHeld(held: boolean): void {
    useStore.setState((s) => ({ transient: { ...s.transient, isPanning: held } }));
    if (!held && this.tempHandActive) {
      // If we were actively panning, end it
      this.tempHandActive = false;
    }
    this.updateCursor();
  }

  private pointerToCanvas(e: PointerEvent | MouseEvent | WheelEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private makeCtx(e: PointerEvent | MouseEvent): ToolContext {
    const state = useStore.getState();
    const screen = this.pointerToCanvas(e);
    const world = screenToWorld(state.viewport, screen);
    return {
      state,
      screen,
      world,
      mods: modifiersOf(e),
      button: 'button' in e ? e.button : 0,
      pointerId: 'pointerId' in e ? e.pointerId : 0,
    };
  }

  private activeTool(): Tool {
    const tool = useStore.getState().tool;
    return this.toolbox[tool]!;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.activePointerId !== null) return;
    // Middle mouse or space → pan
    const state = useStore.getState();
    const isPan = e.button === 1 || state.transient.isPanning;
    if (e.button === 2) return;

    const ctx = this.makeCtx(e);
    this.canvas.setPointerCapture(e.pointerId);
    this.activePointerId = e.pointerId;

    if (isPan) {
      this.tempHandActive = true;
      this.tempHand.onPointerDown(ctx);
    } else {
      this.activeTool().onPointerDown(ctx);
    }
    this.updateCursor(ctx);
    e.preventDefault();
  };

  private onPointerMove = (e: PointerEvent): void => {
    const ctx = this.makeCtx(e);
    // Hover tracking (regardless of pointer down)
    if (this.activePointerId === null) {
      const hit = hitTestForSelection(ctx.state.doc, ctx.world, ctx.mods.meta || ctx.mods.ctrl);
      if (hit !== ctx.state.transient.hoverId) {
        useStore.setState((s) => ({ transient: { ...s.transient, hoverId: hit } }));
      }
    }
    if (this.activePointerId !== null) {
      if (this.tempHandActive) this.tempHand.onPointerMove(ctx);
      else this.activeTool().onPointerMove(ctx);
    }
    this.updateCursor(ctx);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (this.activePointerId !== e.pointerId) {
      this.updateCursor();
      return;
    }
    const ctx = this.makeCtx(e);
    if (this.tempHandActive) {
      this.tempHand.onPointerUp(ctx);
      this.tempHandActive = false;
    } else {
      this.activeTool().onPointerUp(ctx);
    }
    this.canvas.releasePointerCapture(e.pointerId);
    this.activePointerId = null;
    this.updateCursor(ctx);
  };

  private onPointerLeave = (_e: PointerEvent): void => {
    const state = useStore.getState();
    if (state.transient.hoverId !== null) {
      useStore.setState((s) => ({ transient: { ...s.transient, hoverId: null } }));
    }
  };

  private onDoubleClick = (e: MouseEvent): void => {
    const ctx = this.makeCtx(e);
    this.activeTool().onDoubleClick?.(ctx);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const state = useStore.getState();
    const v = state.viewport;
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const pivot = this.pointerToCanvas(e);
      const factor = Math.exp(-e.deltaY * 0.002);
      const nextZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, v.zoom * factor));
      useStore.setState({ viewport: zoomAt(v, pivot, nextZoom) });
    } else {
      // Pan
      useStore.setState({
        viewport: {
          x: v.x + e.deltaX / v.zoom,
          y: v.y + e.deltaY / v.zoom,
          zoom: v.zoom,
        },
      });
    }
  };

  private onContextMenu = (e: MouseEvent): void => {
    // Prevent default browser menu (our own menu is handled by React).
    e.preventDefault();
  };

  updateCursor(ctx?: ToolContext): void {
    const state = useStore.getState();
    let cursor: string;
    if (this.tempHandActive || state.transient.isPanning) {
      cursor = this.tempHandActive ? PANNING_CURSOR : PAN_CURSOR;
    } else {
      cursor = ctx ? this.activeTool().cursor(ctx) : 'default';
    }
    this.canvas.style.cursor = cursor;
  }
}

// Re-export types
export type { Modifiers };
void nodeWorldAABB;
void setTool;
