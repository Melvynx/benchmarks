/** Contiguous runs of hours in 0–23 order, without wrapping — one per band drawn on the grid. */
export function hourSegments(hours: readonly number[]): { start: number; length: number }[] {
  const sorted = [...new Set(hours)].sort((a, b) => a - b);
  const segments: { start: number; length: number }[] = [];
  for (const hour of sorted) {
    const last = segments.at(-1);
    if (last && last.start + last.length === hour) last.length += 1;
    else segments.push({ start: hour, length: 1 });
  }
  return segments;
}
