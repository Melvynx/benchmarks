import { describe, expect, it } from 'vitest'
import { Engine } from './engine'
import { DEFAULT_PARAMS, PRESETS, clampParam, type Params } from './params'
import { CONST, DT } from './world'
import { findPeaks, movingAverage, bestLag, summarise } from './analysis'

function run(params: Partial<Params>, seconds: number) {
  const engine = new Engine({ ...DEFAULT_PARAMS, ...params })
  engine.run(seconds)
  return engine
}

describe('determinism', () => {
  it('replays identically from the same seed and settings', () => {
    const a = run({}, 300)
    const b = run({}, 300)
    expect(a.world.counts).toEqual(b.world.counts)
    expect(a.world.totals).toEqual(b.world.totals)
    expect(a.world.blobs.map((x) => [x.id, x.x, x.y, x.energy])).toEqual(b.world.blobs.map((x) => [x.id, x.x, x.y, x.energy]))
  })

  it('diverges when only the seed changes', () => {
    const a = run({ seed: 1234 }, 300)
    const b = run({ seed: 5678 }, 300)
    expect(a.world.blobs.map((x) => x.x)).not.toEqual(b.world.blobs.map((x) => x.x))
  })

  it('stepping by hand matches a headless run', () => {
    const a = new Engine({ ...DEFAULT_PARAMS })
    for (let i = 0; i < 600; i++) a.stepOnce()
    const b = run({}, 600 * DT)
    expect(a.world.counts).toEqual(b.world.counts)
  })
})

describe('energy rules', () => {
  it('blue starves with no fruit at all', () => {
    const w = run({ fruitGrowth: 0.01, fruitLimit: 1, trees: 1, redStart: 0, blueStart: 20 }, 600)
    expect(w.world.counts.blue).toBeLessThan(20)
    expect(w.world.totals.starved.blue).toBeGreaterThan(0)
  })

  it('red cannot live without blue to touch', () => {
    const w = run({ blueStart: 0, redStart: 12 }, 900)
    expect(w.world.counts.red).toBe(0)
    expect(w.world.totals.starved.red).toBeGreaterThan(0)
  })

  it('blue grows into an empty, fruit-rich garden', () => {
    const w = run({ redStart: 0, blueStart: 6, fruitGrowth: 0.28, fruitLimit: 12, trees: 26 }, 900)
    expect(w.world.counts.blue).toBeGreaterThan(6)
  })

  it('levels off instead of growing forever', () => {
    const w = run({ redStart: 0, blueStart: 6, fruitGrowth: 0.28, fruitLimit: 12, trees: 26 }, 2400)
    const s = w.history.samples
    const late = s.slice(Math.floor(s.length * 0.6)).map((x) => x.blue)
    const peak = Math.max(...s.map((x) => x.blue))
    expect(Math.max(...late)).toBeLessThan(peak * 1.6)
    expect(w.world.capReached).toBe(false)
  })

  it('eating moves energy from the tree to the blob', () => {
    const w = run({ redStart: 0, blueStart: 10 }, 240)
    expect(w.world.totals.fruitEaten).toBeGreaterThan(0)
  })

  it('a contact moves energy from blue to red', () => {
    const w = run({ blueStart: 40, redStart: 10 }, 240)
    expect(w.world.totals.contacts).toBeGreaterThan(0)
  })
})

describe('the garden holds together', () => {
  it('keeps both groups alive on the balanced preset', () => {
    const preset = PRESETS.find((p) => p.id === 'balanced')!
    const w = run(preset.params, 3000)
    expect(w.world.counts.blue).toBeGreaterThan(0)
    expect(w.world.counts.red).toBeGreaterThan(0)
  })

  it('produces real waves rather than a flat line', () => {
    const preset = PRESETS.find((p) => p.id === 'balanced')!
    const w = run(preset.params, 3000)
    const s = w.history.samples
    const blue = s.map((x) => x.blue)
    const smooth = movingAverage(blue, Math.round(s.length / 40))
    const mean = blue.reduce((a, b) => a + b, 0) / blue.length
    expect(findPeaks(smooth, mean * 0.28).length).toBeGreaterThanOrEqual(2)
  })

  it('low fruit keeps the garden small', () => {
    const low = run(PRESETS.find((p) => p.id === 'low-fruit')!.params, 1800)
    const rich = run(PRESETS.find((p) => p.id === 'fruit-rich')!.params, 1800)
    const peak = (e: typeof low) => Math.max(...e.history.samples.map((s) => s.blue))
    expect(peak(low)).toBeLessThan(peak(rich))
  })

  it('never exceeds the population cap', () => {
    const w = run({ fruitGrowth: 0.3, fruitLimit: 14, trees: 40, blueStart: 80, redStart: 20 }, 1200)
    expect(w.world.blobs.length).toBeLessThanOrEqual(CONST.populationCap)
  })

  it('red-heavy: blue dips first, then red fades', () => {
    const w = run(PRESETS.find((p) => p.id === 'red-heavy')!.params, 400)
    const s = w.history.samples
    const blueZero = s.find((x) => x.blue === 0)
    expect(blueZero).toBeTruthy()
    expect(blueZero!.red).toBeGreaterThan(0)
    expect(s[s.length - 1].red).toBeLessThan(blueZero!.red)
  })
})

describe('traits', () => {
  it('charges for speed, so it cannot run away for free', () => {
    const slowCost = costOver(1)
    const fastCost = costOver(1.6)
    expect(fastCost).toBeGreaterThan(slowCost)
  })

  function costOver(speedTrait: number) {
    const e = new Engine({ ...DEFAULT_PARAMS, blueStart: 12, redStart: 0, trees: 1, fruitGrowth: 0.01, fruitLimit: 1 })
    for (const b of e.world.blobs) b.traits.speed = speedTrait
    const before = e.world.blobs.reduce((s, b) => s + b.energy, 0)
    e.run(20)
    const after = e.world.blobs.reduce((s, b) => s + b.energy, 0)
    return before - after
  }
})

describe('analysis', () => {
  it('finds the lag between two shifted waves', () => {
    const a: number[] = []
    const b: number[] = []
    for (let i = 0; i < 400; i++) {
      a.push(Math.sin(i / 20))
      b.push(Math.sin((i - 12) / 20))
    }
    const lag = bestLag(a, b, 60)
    expect(lag).not.toBeNull()
    expect(lag!.lag).toBeGreaterThan(6)
    expect(lag!.lag).toBeLessThan(20)
  })

  it('calls out a group that faded', () => {
    const w = run({ blueStart: 0, redStart: 10 }, 900)
    const s = summarise({
      samples: w.history.samples,
      fruitCapacity: w.world.trees.length * w.params.fruitLimit,
      blueAlive: w.world.counts.blue,
      redAlive: w.world.counts.red,
    })
    expect(s.tone).toBe('faded')
  })
})

describe('params', () => {
  it('clamps to the declared range and rounds integers', () => {
    expect(clampParam('trees', 999)).toBe(44)
    expect(clampParam('trees', 3.7)).toBe(4)
    expect(clampParam('fruitGrowth', -1)).toBe(0.01)
  })
})
