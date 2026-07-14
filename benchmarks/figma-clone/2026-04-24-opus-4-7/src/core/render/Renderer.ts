import type { AppState } from '../../state/types';
import { drawGrid } from './drawGrid';
import { drawNode } from './drawNode';
import {
  computeRotationHandle,
  computeSelectionHandles,
  drawHoverOutline,
  drawMarquee,
  drawSelectionHandles,
  drawSelectionOutlines,
  drawSmartGuides,
} from './drawOverlay';
import { ImageCache } from './ImageCache';

export interface RendererOptions {
  canvas: HTMLCanvasElement;
}

/**
 * Owns a single <canvas>, exposes draw(state) which renders the full scene + overlay.
 * Takes care of devicePixelRatio scaling and redraw scheduling.
 */
export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dpr = 1;

  private needsRedraw = true;
  private lastState: AppState | null = null;
  private raf = 0;
  private unsubImageCache: () => void = () => {};
  private disposed = false;

  constructor(opts: RendererOptions) {
    this.canvas = opts.canvas;
    const ctx = this.canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('2D context unavailable');
    this.ctx = ctx;
    this.unsubImageCache = ImageCache.subscribe(() => {
      if (!this.disposed) this.invalidate();
    });
  }

  dispose(): void {
    this.disposed = true;
    this.unsubImageCache();
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  resize(width: number, height: number): void {
    this.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    this.canvas.width = Math.round(width * this.dpr);
    this.canvas.height = Math.round(height * this.dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.invalidate();
  }

  invalidate(): void {
    this.needsRedraw = true;
    this.scheduleDraw();
  }

  setState(state: AppState): void {
    // A pointer-equality check would be nice. For now, we assume callers only call
    // setState when they want a redraw; the render hook dedupes.
    if (state !== this.lastState) {
      this.lastState = state;
      this.invalidate();
    }
  }

  private scheduleDraw(): void {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      if (this.needsRedraw && this.lastState) {
        this.needsRedraw = false;
        this.draw(this.lastState);
      }
    });
  }

  forceDraw(state: AppState): void {
    this.lastState = state;
    this.needsRedraw = false;
    this.draw(state);
  }

  private draw(state: AppState): void {
    const ctx = this.ctx;
    const { canvas } = this;
    const cssW = canvas.width / this.dpr;
    const cssH = canvas.height / this.dpr;

    // Reset & clear
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    const pageBg = state.doc.pages[state.doc.currentPageId]?.background ?? '#1e1e1e';
    ctx.fillStyle = pageBg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply devicePixelRatio
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    // Apply viewport
    const v = state.viewport;
    ctx.save();
    ctx.scale(v.zoom, v.zoom);
    ctx.translate(-v.x, -v.y);

    // Grid
    if (state.showGrid) {
      drawGrid(ctx, v, cssW, cssH, state.showRulers);
    }

    // Scene
    const page = state.doc.pages[state.doc.currentPageId];
    if (page) {
      for (const id of page.children) {
        const n = state.doc.nodes[id];
        if (n) drawNode(ctx, state.doc, n);
      }
    }

    // Overlay
    const overlayOpts = { zoom: v.zoom };

    // hover outline (skip if hover == selection)
    drawHoverOutline(ctx, state, overlayOpts);

    drawSelectionOutlines(ctx, state, overlayOpts);

    drawSmartGuides(ctx, state, overlayOpts);

    // handles (only when no text editing + not panning)
    if (!state.transient.editingTextId && !state.transient.isPanning) {
      drawSelectionHandles(ctx, state, overlayOpts);
      // rotation handle
      const rot = computeRotationHandle(state, v.zoom);
      if (rot) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0d99ff';
        ctx.lineWidth = 1 / v.zoom;
        ctx.beginPath();
        ctx.arc(rot.x, rot.y, 4 / v.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    drawMarquee(ctx, state, overlayOpts);

    ctx.restore();
  }

  // Expose the computed handles for input detection without double-work.
  selectionHandles(state: AppState) {
    return computeSelectionHandles(state);
  }
}
