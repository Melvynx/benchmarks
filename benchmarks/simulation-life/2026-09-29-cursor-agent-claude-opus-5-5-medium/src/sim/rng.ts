export interface Rng {
  (): number;
  range(min: number, max: number): number;
  gauss(): number;
  int(maxExclusive: number): number;
}

export function createRng(seed: number): Rng {
  let a = (seed >>> 0) || 0x9e3779b9;
  const next = (() => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }) as Rng;
  next.range = (min, max) => min + (max - min) * next();
  next.int = (n) => Math.floor(next() * n);
  next.gauss = () => {
    const u = Math.max(1e-9, next());
    const v = next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };
  return next;
}
