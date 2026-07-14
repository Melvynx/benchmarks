/**
 * Rotation-aware cursors, generated as inline SVG. Figma rotates its resize
 * cursors with the selection; we do the same, caching per 5° bucket.
 */

const cache = new Map<string, string>();

function svgCursor(svg: string, hotX: number, hotY: number, fallback: string): string {
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") ${hotX} ${hotY}, ${fallback}`;
}

/** Double-headed arrow at `angleDeg` (0 = horizontal ↔). */
export function resizeCursor(angleDeg: number): string {
  const bucket = Math.round(((angleDeg % 180) + 180) % 180 / 5) * 5;
  const key = `resize:${bucket}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
    `<g transform="rotate(${bucket} 12 12)">` +
    `<path d="M3 12 L8 7 L8 10 L16 10 L16 7 L21 12 L16 17 L16 14 L8 14 L8 17 Z" ` +
    `fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/></g></svg>`;
  const value = svgCursor(svg, 12, 12, bucket % 90 < 23 || bucket % 90 > 67 ? (bucket % 180 < 45 || bucket % 180 > 135 ? 'ew-resize' : 'ns-resize') : 'nwse-resize');
  cache.set(key, value);
  return value;
}

/** Curved rotation arrow oriented for a given corner angle. */
export function rotateCursor(angleDeg: number): string {
  const bucket = Math.round((((angleDeg % 360) + 360) % 360) / 10) * 10;
  const key = `rotate:${bucket}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">` +
    `<g transform="rotate(${bucket} 12 12)">` +
    `<path d="M6 14 A 7 7 0 0 1 14 6 L 13 3 L 19 6.5 L 13.5 10 L 14 7.5 A 5.5 5.5 0 0 0 7.5 14 L 10 13.5 L 6.5 19 L 3 13 Z" ` +
    `fill="#fff" stroke="#000" stroke-width="1.1" stroke-linejoin="round"/></g></svg>`;
  const value = svgCursor(svg, 12, 12, 'grab');
  cache.set(key, value);
  return value;
}

export const CURSORS = {
  default: 'default',
  crosshair: 'crosshair',
  text: 'text',
  grab: 'grab',
  grabbing: 'grabbing',
  move: 'default',
  notAllowed: 'not-allowed',
} as const;
