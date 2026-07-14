import { nodePath } from '../geometry/shapePath';
import type { Rect } from '../geometry/rect';
import { rectsIntersect } from '../geometry/rect';
import { localMatrix } from '../scene/nodeGeometry';
import type { SceneIndexData } from '../scene/sceneIndex';
import type { NodeId, SceneDocument, SceneNode } from '../scene/types';
import { isContainer } from '../scene/types';
import { layoutText, supportsLetterSpacing } from '../text/textLayout';
import {
  acquireScratch,
  drawBackgroundBlur,
  drawDropShadow,
  drawInnerShadow,
  releaseScratch,
  supportsCanvasFilter,
} from './effects';
import { drawImageFill, paintStyle } from './paints';

export interface RenderEnv {
  ctx: CanvasRenderingContext2D;
  doc: SceneDocument;
  index: SceneIndexData;
  /** World-space culling rect; null disables culling (exports). */
  viewRect: Rect | null;
  /** World units → device pixels. */
  scale: number;
  /** Device offset: device = world × scale + origin. */
  originX: number;
  originY: number;
  /** Text node currently edited in the DOM overlay — skipped here. */
  skipTextId: NodeId | null;
  /** Backdrop blur samples the live canvas; disabled inside detached layers. */
  allowBackdrop: boolean;
}

export function drawNodes(env: RenderEnv, ids: readonly NodeId[]): void {
  for (const id of ids) {
    const node = env.doc.nodes[id];
    if (!node || !node.visible) continue;
    if (env.viewRect) {
      const bounds = env.index.subtreeBounds.get(id);
      if (bounds && !rectsIntersect(bounds, env.viewRect)) continue;
    }
    drawNodeTree(env, node);
  }
}

/** True when the node must be composited through an offscreen layer. */
function needsLayer(node: SceneNode): boolean {
  if (node.effects.some((e) => e.enabled && e.type === 'layer-blur' && e.radius > 0)) return true;
  const grouplike = isContainer(node);
  if (grouplike && node.opacity < 1) return true;
  if (node.blendMode !== 'normal') return true;
  return false;
}

function drawNodeTree(env: RenderEnv, node: SceneNode): void {
  if (!needsLayer(node)) {
    drawNodeDirect(env, node);
    return;
  }

  const bounds = env.index.subtreeBounds.get(node.id);
  if (!bounds) return;
  const blur = node.effects.find((e) => e.enabled && e.type === 'layer-blur');
  const blurDevice = blur && blur.type === 'layer-blur' ? blur.radius * env.scale : 0;
  const pad = blurDevice * 2 + 2;

  let dx = bounds.x * env.scale + env.originX - pad;
  let dy = bounds.y * env.scale + env.originY - pad;
  let dw = bounds.width * env.scale + pad * 2;
  let dh = bounds.height * env.scale + pad * 2;
  // Clamp the layer to the visible canvas so zoomed-in giants stay cheap.
  const cw = env.ctx.canvas.width;
  const ch = env.ctx.canvas.height;
  const x1 = Math.min(dx + dw, cw + pad);
  const y1 = Math.min(dy + dh, ch + pad);
  dx = Math.max(dx, -pad);
  dy = Math.max(dy, -pad);
  dw = x1 - dx;
  dh = y1 - dy;
  if (dw <= 0 || dh <= 0) return;

  const scratch = acquireScratch(dw, dh);
  if (!scratch) {
    drawNodeDirect(env, node); // graceful degradation: draw without the layer
    return;
  }

  const parentTransform = env.ctx.getTransform();
  scratch.ctx.setTransform(
    parentTransform.a,
    parentTransform.b,
    parentTransform.c,
    parentTransform.d,
    parentTransform.e - dx,
    parentTransform.f - dy,
  );
  const layerEnv: RenderEnv = { ...env, ctx: scratch.ctx, allowBackdrop: false };
  drawNodeDirect(layerEnv, node, true);

  const ctx = env.ctx;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = isContainer(node) || blurDevice > 0 ? node.opacity : 1;
  ctx.globalCompositeOperation = node.blendMode === 'normal' ? 'source-over' : node.blendMode;
  if (blurDevice > 0 && supportsCanvasFilter(ctx)) ctx.filter = `blur(${blurDevice}px)`;
  ctx.drawImage(scratch.canvas, 0, 0, dw, dh, dx, dy, dw, dh);
  ctx.restore();
  releaseScratch(scratch);
}

function drawNodeDirect(env: RenderEnv, node: SceneNode, insideOwnLayer = false): void {
  const ctx = env.ctx;
  ctx.save();
  const m = localMatrix(node);
  ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);

  // Leaf opacity multiplies paint alpha; containers composite via layers.
  const applyAlpha = !insideOwnLayer && !isContainer(node) ? node.opacity : 1;
  if (applyAlpha < 1) ctx.globalAlpha *= applyAlpha;

  if (node.type !== 'group') {
    paintShape(env, node);
  }

  if (isContainer(node)) {
    if (node.type === 'frame' && node.clipsContent) {
      ctx.clip(nodePath(node));
    }
    for (const childId of node.childIds) {
      const child = env.doc.nodes[childId];
      if (!child || !child.visible) continue;
      if (env.viewRect) {
        const bounds = env.index.subtreeBounds.get(childId);
        if (bounds && !rectsIntersect(bounds, env.viewRect)) continue;
      }
      drawNodeTree(env, child);
    }
  }
  ctx.restore();
}

function paintShape(env: RenderEnv, node: SceneNode): void {
  const ctx = env.ctx;

  // Backdrop blur first: it samples everything painted so far.
  if (env.allowBackdrop) {
    for (const effect of node.effects) {
      if (effect.enabled && effect.type === 'background-blur' && effect.radius > 0) {
        const bounds = env.index.worldBounds.get(node.id);
        if (bounds) {
          drawBackgroundBlur(ctx, node, effect.radius, env.scale, bounds, (x, y) => ({
            x: x * env.scale + env.originX,
            y: y * env.scale + env.originY,
          }));
        }
      }
    }
  }

  for (const effect of node.effects) {
    if (effect.enabled && effect.type === 'drop-shadow') drawDropShadow(ctx, node, effect, env.scale);
  }

  if (node.type === 'text') {
    if (env.skipTextId !== node.id) drawTextNode(ctx, node);
  } else if (node.type !== 'line') {
    const path = nodePath(node);
    for (const fill of node.fills) {
      if (!fill.enabled) continue;
      if (fill.type === 'image') {
        ctx.save();
        ctx.clip(path);
        drawImageFill(ctx, fill, node);
        ctx.restore();
      } else {
        const style = paintStyle(ctx, fill, node.width, node.height);
        if (style) {
          ctx.fillStyle = style;
          ctx.fill(path);
        }
      }
    }
  }

  for (const effect of node.effects) {
    if (effect.enabled && effect.type === 'inner-shadow') drawInnerShadow(ctx, node, effect, env.scale);
  }

  if (node.strokes.length > 0 && node.strokeWeight > 0) strokeShape(ctx, node);
}

function strokeShape(ctx: CanvasRenderingContext2D, node: SceneNode): void {
  const path = nodePath(node);
  for (const stroke of node.strokes) {
    if (!stroke.enabled) continue;
    const style = paintStyle(ctx, stroke, node.width, node.height);
    if (!style) continue;
    ctx.save();
    ctx.strokeStyle = style;
    if (node.strokeDash > 0) {
      ctx.setLineDash([node.strokeDash, node.strokeGap > 0 ? node.strokeGap : node.strokeDash]);
    }
    const align = node.type === 'line' ? 'center' : node.strokeAlign;
    if (align === 'center') {
      ctx.lineWidth = node.strokeWeight;
      ctx.stroke(path);
    } else if (align === 'inside') {
      ctx.clip(path);
      ctx.lineWidth = node.strokeWeight * 2;
      ctx.stroke(path);
    } else {
      // Outside: clip to everything except the shape, stroke at double width.
      const margin = node.strokeWeight * 2 + 4;
      const inverse = new Path2D();
      inverse.rect(-margin, -margin, node.width + margin * 2, node.height + margin * 2);
      inverse.addPath(path);
      ctx.clip(inverse, 'evenodd');
      ctx.lineWidth = node.strokeWeight * 2;
      ctx.stroke(path);
    }
    ctx.restore();
  }
}

function drawTextNode(ctx: CanvasRenderingContext2D, node: SceneNode & { type: 'text' }): void {
  const fill = node.fills.find((f) => f.enabled);
  if (!fill) return;
  const layout = layoutText(node);
  const style = fill.type === 'image' ? null : paintStyle(ctx, fill, node.width, node.height);
  if (!style) return;
  ctx.save();
  ctx.font = layout.font;
  if (supportsLetterSpacing()) {
    ctx.letterSpacing = `${node.letterSpacing}px`;
  }
  ctx.fillStyle = style;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  for (const line of layout.lines) {
    if (line.text !== '') ctx.fillText(line.text, line.x, line.baseline);
  }
  ctx.restore();
}
