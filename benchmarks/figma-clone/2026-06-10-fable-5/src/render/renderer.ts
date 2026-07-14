import { getSceneIndex } from '../scene/sceneIndex';
import type { EditorState } from '../store/store';
import { editorStore } from '../store/store';
import { visibleWorldRect } from '../store/viewport';
import { drawNodes, type RenderEnv } from './drawScene';
import { drawGrid } from './grid';
import { drawOverlay } from './overlay';

const CANVAS_BG = '#1e1e1e';

/**
 * Owns the two stacked canvases (scene below, overlay chrome above), a dirty
 * flag per layer, and a rAF loop that only repaints what changed. The scene
 * canvas repaints on document/viewport changes; the overlay also repaints on
 * selection/hover/guide changes — so hovering layers never re-renders 1k nodes.
 */
export class CanvasRenderer {
  private sceneCtx: CanvasRenderingContext2D;
  private overlayCtx: CanvasRenderingContext2D;
  private rafId = 0;
  private sceneDirty = true;
  private overlayDirty = true;
  private unsubscribe: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(
    private sceneCanvas: HTMLCanvasElement,
    private overlayCanvas: HTMLCanvasElement,
    private container: HTMLElement,
  ) {
    const scene = sceneCanvas.getContext('2d');
    const overlay = overlayCanvas.getContext('2d');
    if (!scene || !overlay) throw new Error('Canvas 2D is not available in this browser');
    this.sceneCtx = scene;
    this.overlayCtx = overlay;
  }

  start(): void {
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    this.handleResize();
    this.unsubscribe = editorStore.subscribe((state, previous) => this.onStateChange(state, previous));
    const tick = (): void => {
      this.rafId = requestAnimationFrame(tick);
      this.drawIfDirty();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
  }

  private handleResize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.max(1, Math.round(rect.width));
    this.height = Math.max(1, Math.round(rect.height));
    this.dpr = Math.min(window.devicePixelRatio || 1, 3);
    for (const canvas of [this.sceneCanvas, this.overlayCanvas]) {
      canvas.width = Math.round(this.width * this.dpr);
      canvas.height = Math.round(this.height * this.dpr);
      canvas.style.width = `${this.width}px`;
      canvas.style.height = `${this.height}px`;
    }
    this.sceneDirty = true;
    this.overlayDirty = true;
  }

  private onStateChange(state: EditorState, previous: EditorState): void {
    if (
      state.doc !== previous.doc ||
      state.viewport !== previous.viewport ||
      state.showGrid !== previous.showGrid ||
      state.editingTextId !== previous.editingTextId ||
      state.imagesTick !== previous.imagesTick ||
      state.fontsTick !== previous.fontsTick
    ) {
      this.sceneDirty = true;
      this.overlayDirty = true;
      return;
    }
    if (state !== previous) this.overlayDirty = true;
  }

  private drawIfDirty(): void {
    if (this.sceneDirty) {
      this.sceneDirty = false;
      this.drawSceneLayer();
    }
    if (this.overlayDirty) {
      this.overlayDirty = false;
      this.drawOverlayLayer();
    }
  }

  private drawSceneLayer(): void {
    const state = editorStore.getState();
    const ctx = this.sceneCtx;
    const { viewport } = state;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, this.width, this.height);
    if (state.showGrid) drawGrid(ctx, viewport, this.width, this.height);

    const scale = this.dpr * viewport.zoom;
    ctx.setTransform(scale, 0, 0, scale, viewport.panX * this.dpr, viewport.panY * this.dpr);
    const env: RenderEnv = {
      ctx,
      doc: state.doc,
      index: getSceneIndex(state.doc),
      viewRect: visibleWorldRect(viewport, this.width, this.height),
      scale,
      originX: viewport.panX * this.dpr,
      originY: viewport.panY * this.dpr,
      skipTextId: state.editingTextId,
      allowBackdrop: true,
    };
    drawNodes(env, state.doc.rootIds);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  private drawOverlayLayer(): void {
    const state = editorStore.getState();
    const ctx = this.overlayCtx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);
    drawOverlay(ctx, state, this.width, this.height);
  }
}
