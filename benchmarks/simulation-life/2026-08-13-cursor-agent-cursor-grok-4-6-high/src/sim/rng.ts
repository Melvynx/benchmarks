/** Deterministic RNG (mulberry32). Same seed + same call order => same world. */
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

  range(min: number, max: number): number {
    return min + this.next() * (max - min)
  }

  int(minInclusive: number, maxExclusive: number): number {
    return Math.floor(this.range(minInclusive, maxExclusive))
  }

  /** Roughly normal, mean 0, sd ~1. */
  normal(): number {
    return (this.next() + this.next() + this.next() - 1.5) * 2
  }

  inDisc(radius: number): { x: number; y: number } {
    const a = this.next() * Math.PI * 2
    const r = radius * Math.sqrt(this.next())
    return { x: Math.cos(a) * r, y: Math.sin(a) * r }
  }
}
