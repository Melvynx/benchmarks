/** Deterministic mulberry32. Same seed + same call order = same garden. */
export class Rng {
  private s: number

  constructor(seed: number) {
    this.s = (seed >>> 0) || 1
  }

  /** [0, 1) */
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0
    let t = this.s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(lo: number, hi: number): number {
    return lo + this.next() * (hi - lo)
  }

  int(lo: number, hiExclusive: number): number {
    return Math.floor(this.range(lo, hiExclusive))
  }

  /** Mean 0, sd ~1. */
  normal(): number {
    return (this.next() + this.next() + this.next() - 1.5) * 2
  }

  pick<T>(items: T[]): T {
    return items[this.int(0, items.length)]!
  }

  inDisc(radius: number): { x: number; y: number } {
    const a = this.next() * Math.PI * 2
    const r = radius * Math.sqrt(this.next())
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  }
}
