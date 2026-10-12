export class Rng {
  private state: number

  constructor(seed: number) {
    this.state = seed >>> 0
    if (this.state === 0) this.state = 1
  }

  next(): number {
    this.state |= 0
    this.state = (this.state + 0x6d2b79f5) | 0
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next()
  }

  normal(): number {
    let u = this.next()
    const v = this.next()
    if (u < 1e-8) u = 1e-8
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v)
  }

  inDisc(radius: number): { x: number; y: number } {
    const angle = this.next() * Math.PI * 2
    const r = Math.sqrt(this.next()) * radius
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
  }
}
