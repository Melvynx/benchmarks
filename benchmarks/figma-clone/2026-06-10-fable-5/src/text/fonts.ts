export interface FontFamilyDef {
  family: string;
  /** Weights actually shipped by Google Fonts for this family. */
  weights: number[];
  fallback: string;
}

export const FONT_FAMILIES: FontFamilyDef[] = [
  { family: 'Inter', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], fallback: 'sans-serif' },
  { family: 'Roboto', weights: [100, 300, 400, 500, 700, 900], fallback: 'sans-serif' },
  { family: 'Poppins', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900], fallback: 'sans-serif' },
  { family: 'Playfair Display', weights: [400, 500, 600, 700, 800, 900], fallback: 'serif' },
  { family: 'JetBrains Mono', weights: [100, 200, 300, 400, 500, 600, 700, 800], fallback: 'monospace' },
  { family: 'Space Grotesk', weights: [300, 400, 500, 600, 700], fallback: 'sans-serif' },
];

export function familyDef(family: string): FontFamilyDef {
  return FONT_FAMILIES.find((f) => f.family === family) ?? FONT_FAMILIES[0]!;
}

/** Closest weight the family actually provides. */
export function nearestWeight(family: string, weight: number): number {
  const def = familyDef(family);
  let best = def.weights[0] ?? 400;
  for (const w of def.weights) {
    if (Math.abs(w - weight) < Math.abs(best - weight)) best = w;
  }
  return best;
}

export function fontString(weight: number, sizePx: number, family: string): string {
  const def = familyDef(family);
  return `${weight} ${sizePx}px "${family}", ${def.fallback}`;
}

type FontsChangedListener = () => void;
const listeners = new Set<FontsChangedListener>();
const requested = new Set<string>();

export function onFontsChanged(listener: FontsChangedListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  for (const listener of listeners) listener();
}

/**
 * Ensure a face is loaded; returns true if it is usable right now. When the
 * async load resolves, listeners fire so text can re-measure and re-render.
 */
export function ensureFontLoaded(family: string, weight: number): boolean {
  const spec = `${weight} 16px "${family}"`;
  if (document.fonts.check(spec)) return true;
  if (!requested.has(spec)) {
    requested.add(spec);
    document.fonts
      .load(spec)
      .then(() => notify())
      .catch(() => {
        // Face unavailable — text falls back to the generic family silently.
      });
  }
  return false;
}

/** Warm the caches for every family at common weights before first paint. */
export async function preloadCoreFonts(): Promise<void> {
  const loads: Promise<unknown>[] = [];
  for (const def of FONT_FAMILIES) {
    for (const weight of [400, 500, 700]) {
      if (def.weights.includes(weight)) {
        loads.push(document.fonts.load(`${weight} 16px "${def.family}"`).catch(() => undefined));
      }
    }
  }
  await Promise.allSettled(loads);
  notify();
}
