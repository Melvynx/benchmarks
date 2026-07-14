import { createRect } from '../scene/factories';
import { uniqueName } from '../scene/factories';
import { addNode } from '../scene/draft';
import type { ImagePaint } from '../scene/types';
import { readFileAsDataURL } from '../utils/download';
import { probeImageSize } from '../render/imageCache';
import type { Vec2 } from '../geometry/vec2';
import { editDoc } from './docEdit';
import { editorStore, pushToast } from './store';
import { screenToWorld } from './viewport';

const MAX_PLACED_DIMENSION = 1024;

/**
 * Insert an image file as a rectangle with an image fill (Figma's model).
 * `at` is the world-space center; defaults to the viewport center.
 */
export async function insertImageFile(file: File, at?: Vec2): Promise<void> {
  if (!file.type.startsWith('image/')) {
    pushToast('That file is not an image', 'error');
    return;
  }
  try {
    const src = await readFileAsDataURL(file);
    const natural = await probeImageSize(src);
    const scale = Math.min(1, MAX_PLACED_DIMENSION / Math.max(natural.width, natural.height));
    const width = Math.max(1, Math.round(natural.width * scale));
    const height = Math.max(1, Math.round(natural.height * scale));

    const state = editorStore.getState();
    const stage = document.getElementById('canvas-stage');
    const fallback = screenToWorld(state.viewport, {
      x: (stage?.clientWidth ?? 1200) / 2,
      y: (stage?.clientHeight ?? 800) / 2,
    });
    const center = at ?? fallback;

    const paint: ImagePaint = { type: 'image', enabled: true, opacity: 1, src, scaleMode: 'fill' };
    const baseName = file.name.replace(/\.[a-zA-Z0-9]+$/, '') || 'Image';
    const node = createRect({
      name: uniqueName(state.doc, baseName),
      x: Math.round(center.x - width / 2),
      y: Math.round(center.y - height / 2),
      width,
      height,
      fills: [paint],
    });
    editDoc('Place image', (d) => addNode(d, node, null, -1), { select: [node.id] });
  } catch {
    pushToast('Could not read that image', 'error');
  }
}

export async function insertImageFiles(files: readonly File[], at?: Vec2): Promise<void> {
  let offset = 0;
  for (const file of files) {
    await insertImageFile(file, at ? { x: at.x + offset, y: at.y + offset } : undefined);
    offset += 24;
  }
}
