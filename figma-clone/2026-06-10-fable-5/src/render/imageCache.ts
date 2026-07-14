import { bumpImagesTick } from '../store/store';

interface CacheEntry {
  img: HTMLImageElement;
  loaded: boolean;
  failed: boolean;
}

const cache = new Map<string, CacheEntry>();

/**
 * Resolve an image fill source. Returns the element once decoded, null while
 * loading (renderer paints a placeholder and repaints on `imagesTick`).
 */
export function getImage(src: string): HTMLImageElement | null {
  const entry = cache.get(src);
  if (entry) return entry.loaded ? entry.img : null;

  const img = new Image();
  const fresh: CacheEntry = { img, loaded: false, failed: false };
  cache.set(src, fresh);
  img.onload = () => {
    fresh.loaded = true;
    bumpImagesTick();
  };
  img.onerror = () => {
    fresh.failed = true;
  };
  img.src = src;
  return null;
}

export function imageFailed(src: string): boolean {
  return cache.get(src)?.failed ?? false;
}

/** Natural size of an image source, decoding it off-DOM. */
export function probeImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Could not decode image'));
    img.src = src;
  });
}
