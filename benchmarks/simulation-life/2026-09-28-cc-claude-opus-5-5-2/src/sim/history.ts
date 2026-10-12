export interface Sample {
  t: number
  fruit: number
  cap: number
  blue: number
  red: number
  blueSpeed: number
  blueVision: number
  redSpeed: number
  redVision: number
  blueEnergy: number
  redEnergy: number
}

export const SAMPLE_KEYS = [
  't',
  'fruit',
  'cap',
  'blue',
  'red',
  'blueSpeed',
  'blueVision',
  'redSpeed',
  'redVision',
  'blueEnergy',
  'redEnergy',
] as const satisfies readonly (keyof Sample)[]

const MAX_POINTS = 6000

/**
 * Column store of recorded samples. Long runs are thinned by keeping every
 * other point (and then accepting every other new point), so memory stays
 * bounded while the whole run stays on the chart.
 */
export class History {
  cols: Record<keyof Sample, number[]> = Object.fromEntries(SAMPLE_KEYS.map((k) => [k, []])) as unknown as Record<keyof Sample, number[]>
  version = 0
  private stride = 1
  private pushes = 0

  get length(): number {
    return this.cols.t.length
  }

  push(s: Sample) {
    const keep = this.pushes % this.stride === 0
    this.pushes++
    if (!keep) return
    for (const k of SAMPLE_KEYS) this.cols[k].push(s[k])
    if (this.length > MAX_POINTS) {
      for (const k of SAMPLE_KEYS) this.cols[k] = this.cols[k].filter((_, i) => i % 2 === 0)
      this.stride *= 2
    }
    this.version++
  }

  at(i: number): Sample {
    const out = {} as Sample
    for (const k of SAMPLE_KEYS) out[k] = this.cols[k][i]
    return out
  }

  /** Index of the sample closest to time t. */
  indexAt(t: number): number {
    const ts = this.cols.t
    let lo = 0
    let hi = ts.length - 1
    if (hi < 0) return -1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (ts[mid] < t) lo = mid + 1
      else hi = mid
    }
    if (lo > 0 && Math.abs(ts[lo - 1] - t) < Math.abs(ts[lo] - t)) return lo - 1
    return lo
  }
}
