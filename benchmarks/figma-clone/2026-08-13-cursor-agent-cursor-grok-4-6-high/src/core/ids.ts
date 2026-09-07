let seq = 0;

export function nid(prefix = "n"): string {
  seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${seq.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function resetIdSeq(value = 0): void {
  seq = value;
}
