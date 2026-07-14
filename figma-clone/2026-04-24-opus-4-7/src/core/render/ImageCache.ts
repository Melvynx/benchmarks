interface CacheEntry {
  status: 'loading' | 'loaded' | 'error';
  img: HTMLImageElement | null;
}

/** Singleton image cache so we don't repaint broken. */
class ImageCacheClass {
  private cache = new Map<string, CacheEntry>();
  private listeners = new Set<() => void>();

  get(src: string): HTMLImageElement | null {
    const existing = this.cache.get(src);
    if (existing) return existing.status === 'loaded' ? existing.img : null;

    const img = new Image();
    const entry: CacheEntry = { status: 'loading', img };
    this.cache.set(src, entry);
    img.onload = () => {
      entry.status = 'loaded';
      this.notify();
    };
    img.onerror = () => {
      entry.status = 'error';
      entry.img = null;
      this.notify();
    };
    img.src = src;
    return null;
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return (): void => {
      this.listeners.delete(fn);
    };
  }

  private notify(): void {
    for (const fn of this.listeners) fn();
  }
}

export const ImageCache = new ImageCacheClass();
