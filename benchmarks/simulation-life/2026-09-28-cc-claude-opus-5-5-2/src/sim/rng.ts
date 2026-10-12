/** Small, fast, seedable PRNG (mulberry32) with a few helpers. */
export class Rng {
  private s: number

  constructor(seed: number) {
    this.s = seed >>> 0 || 0x9e3779b9
  }

  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(a: number, b: number): number {
    return a + (b - a) * this.next()
  }

  int(a: number, b: number): number {
    return Math.floor(this.range(a, b + 1))
  }

  /** Standard normal via Box–Muller. */
  normal(): number {
    const u = Math.max(1e-9, this.next())
    const v = this.next()
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
  }

  pick<T>(list: readonly T[]): T {
    return list[Math.floor(this.next() * list.length)]
  }
}
