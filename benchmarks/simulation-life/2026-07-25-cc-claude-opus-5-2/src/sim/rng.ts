/** Small deterministic PRNG (mulberry32) so a seed always replays the same garden. */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = (seed >>> 0) || 1;
  }

  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }

  /** Roughly normal, mean 0, sd 1. */
  normal(): number {
    return (this.next() + this.next() + this.next() + this.next() - 2) * 1.1;
  }

  int(n: number): number {
    return Math.floor(this.next() * n) % Math.max(1, n);
  }
}
