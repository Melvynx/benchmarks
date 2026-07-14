import { rectUnionAll, type Rect } from '../geometry/rect';
import { drawNodes, type RenderEnv } from '../render/drawScene';
import { getSceneIndex } from '../scene/sceneIndex';
import { paintOrderIndex, topLevelSelection } from '../scene/traversal';
import type { NodeId } from '../scene/types';
import { editorStore, pushToast } from '../store/store';
import { downloadBlob } from '../utils/download';

const MAX_EXPORT_PIXELS = 8192;

function exportTargets(): { ids: NodeId[]; name: string } | null {
  const state = editorStore.getState();
  const order = paintOrderIndex(state.doc);
  const selected = topLevelSelection(state.doc, state.selection).sort(
    (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
  );
  if (selected.length > 0) {
    const first = state.doc.nodes[selected[0] ?? ''];
    return { ids: selected, name: selected.length === 1 && first ? first.name : state.docName };
  }
  if (state.doc.rootIds.length === 0) return null;
  return { ids: [...state.doc.rootIds], name: state.docName };
}

/** Render the selection (or whole canvas) to a transparent PNG at 1–4×. */
export async function exportSelectionAsPng(scale: number): Promise<void> {
  const state = editorStore.getState();
  const targets = exportTargets();
  if (!targets) {
    pushToast('Nothing to export', 'error');
    return;
  }
  const index = getSceneIndex(state.doc);
  const bounds = rectUnionAll(
    targets.ids.map((id) => index.subtreeBounds.get(id)).filter((r): r is Rect => r !== undefined),
  );
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    pushToast('Nothing to export', 'error');
    return;
  }

  let k = scale;
  while (k > 0.1 && (bounds.width * k > MAX_EXPORT_PIXELS || bounds.height * k > MAX_EXPORT_PIXELS)) {
    k /= 2;
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(bounds.width * k));
  canvas.height = Math.max(1, Math.ceil(bounds.height * k));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    pushToast('Could not create export canvas', 'error');
    return;
  }
  ctx.setTransform(k, 0, 0, k, -bounds.x * k, -bounds.y * k);
  const env: RenderEnv = {
    ctx,
    doc: state.doc,
    index,
    viewRect: null,
    scale: k,
    originX: -bounds.x * k,
    originY: -bounds.y * k,
    skipTextId: null,
    allowBackdrop: true,
  };
  drawNodes(env, targets.ids);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    pushToast('PNG export failed', 'error');
    return;
  }
  const suffix = k !== 1 ? `@${k}x` : '';
  downloadBlob(blob, `${targets.name.replace(/[^\w\- ]+/g, '')}${suffix}.png`);
  pushToast('Exported PNG');
}
