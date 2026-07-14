import type { Vec2 } from '../geometry/vec2';
import { editorStore, type ToolId } from '../store/store';
import { panBy, screenToWorld, zoomAt } from '../store/viewport';
import { drawTool } from './tools/drawTool';
import { handTool } from './tools/handTool';
import { selectTool } from './tools/selectTool';
import { textTool } from './tools/textTool';
import type { Tool, ToolPointerEvent } from './tools/types';

const toolRegistry: Record<ToolId, Tool> = {
  select: selectTool,
  hand: handTool,
  frame: drawTool,
  rect: drawTool,
  ellipse: drawTool,
  line: drawTool,
  polygon: drawTool,
  star: drawTool,
  text: textTool,
};

/**
 * Owns raw pointer/wheel events on the canvas and the gestures every tool
 * shares: space/middle-button panning and wheel pan/zoom. Everything else is
 * routed to the active tool. Keeping this layer dumb is what makes adding a
 * tool a small, local change.
 */
export class PointerController {
  private element: HTMLElement;
  private panning: { last: Vec2 } | null = null;
  private lastScreen: Vec2 = { x: 0, y: 0 };
  private activeTool: Tool;
  private unsubscribe: (() => void) | null = null;
  private disposers: Array<() => void> = [];

  constructor(element: HTMLElement) {
    this.element = element;
    this.activeTool = toolRegistry[editorStore.getState().tool];
  }

  attach(): void {
    const el = this.element;
    const on = <K extends keyof HTMLElementEventMap>(
      type: K,
      handler: (ev: HTMLElementEventMap[K]) => void,
      options?: AddEventListenerOptions,
    ): void => {
      el.addEventListener(type, handler as EventListener, options);
      this.disposers.push(() => el.removeEventListener(type, handler as EventListener, options));
    };

    on('pointerdown', (e) => this.handlePointerDown(e));
    on('pointermove', (e) => this.handlePointerMove(e));
    on('pointerup', (e) => this.handlePointerUp(e));
    on('pointercancel', (e) => this.handlePointerUp(e));
    on('dblclick', (e) => this.handleDoubleClick(e));
    on('wheel', (e) => this.handleWheel(e), { passive: false });
    on('contextmenu', (e) => e.preventDefault());

    this.unsubscribe = editorStore.subscribe((state, prev) => {
      if (state.tool !== prev.tool) {
        this.activeTool.deactivate();
        this.activeTool = toolRegistry[state.tool];
        this.applyCursor();
      }
      if (state.spacePanning !== prev.spacePanning || state.activeGesture !== prev.activeGesture) {
        this.applyCursor();
      }
    });
    this.applyCursor();
  }

  detach(): void {
    for (const dispose of this.disposers) dispose();
    this.disposers = [];
    this.unsubscribe?.();
  }

  private toToolEvent(e: PointerEvent | MouseEvent): ToolPointerEvent {
    const rect = this.element.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    return {
      screen,
      world: screenToWorld(editorStore.getState().viewport, screen),
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey || e.ctrlKey,
      button: 'button' in e ? e.button : 0,
      raw: e as PointerEvent,
    };
  }

  private handlePointerDown(e: PointerEvent): void {
    this.element.setPointerCapture(e.pointerId);
    const event = this.toToolEvent(e);
    this.lastScreen = event.screen;

    const spaceHeld = editorStore.getState().spacePanning;
    if (e.button === 1 || (e.button === 0 && spaceHeld)) {
      this.panning = { last: event.screen };
      this.applyCursor();
      e.preventDefault();
      return;
    }
    if (e.button !== 0) return;
    this.activeTool.onPointerDown(event);
    this.applyCursor();
  }

  private handlePointerMove(e: PointerEvent): void {
    const event = this.toToolEvent(e);
    this.lastScreen = event.screen;
    if (this.panning) {
      panBy(event.screen.x - this.panning.last.x, event.screen.y - this.panning.last.y);
      this.panning.last = event.screen;
      return;
    }
    this.activeTool.onPointerMove(event);
    this.applyCursor();
  }

  private handlePointerUp(e: PointerEvent): void {
    const event = this.toToolEvent(e);
    if (this.panning) {
      this.panning = null;
      this.applyCursor();
      return;
    }
    this.activeTool.onPointerUp(event);
    this.applyCursor();
  }

  private handleDoubleClick(e: MouseEvent): void {
    if (editorStore.getState().spacePanning) return;
    this.activeTool.onDoubleClick?.(this.toToolEvent(e));
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const rect = this.element.getBoundingClientRect();
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (e.ctrlKey || e.metaKey) {
      // Trackpad pinch arrives as ctrl+wheel; mice use cmd/ctrl+scroll.
      const factor = Math.exp(-e.deltaY * 0.0024);
      zoomAt(screen, factor);
      return;
    }
    let dx = e.deltaX;
    let dy = e.deltaY;
    if (e.shiftKey && dx === 0) {
      dx = dy;
      dy = 0;
    }
    panBy(-dx, -dy);
  }

  /** Cursor priority: panning > space > tool. */
  private applyCursor(): void {
    const state = editorStore.getState();
    let cursor: string;
    if (this.panning) cursor = 'grabbing';
    else if (state.spacePanning) cursor = 'grab';
    else cursor = this.activeTool.getCursor(this.lastScreen, screenToWorld(state.viewport, this.lastScreen));
    if (this.element.style.cursor !== cursor) this.element.style.cursor = cursor;
  }
}
