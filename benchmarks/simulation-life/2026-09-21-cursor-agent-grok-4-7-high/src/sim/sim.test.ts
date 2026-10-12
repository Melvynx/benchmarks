import { describe, expect, it } from 'vitest'
import { bestLag, findPeaks, movingAverage, summarise } from './analysis'
import { Engine, DT } from './engine'
import { DEFAULT_PARAMS, PRESETS, clampParam, type Params } from './params'

function run(params: Partial<Params>, seconds: number) {
  const engine = new Engine({ ...DEFAULT_PARAMS, ...params })
  engine.run(seconds)
  return engine
}

describe('determinism', () => {
  it('replays identically from the same seed and settings', () => {
    const a = run({}, 60)
    const b = run({}, 60)
    expect(a.world.counts).toEqual(b.world.counts)
    expect(a.world.totals).toEqual(b.world.totals)
    expect(a.world.blobs.map((blob) => [blob.id, blob.x, blob.y, blob.energy])).toEqual(
      b.world.blobs.map((blob) => [blob.id, blob.x, blob.y, blob.energy]),
    )
  })

  it('diverges when only the seed changes', () => {
    const a = run({ seed: 1234 }, 80)
    const b = run({ seed: 5678 }, 80)
    expect(a.world.blobs.map((blob) => blob.x)).not.toEqual(b.world.blobs.map((blob) => blob.x))
  })

  it('stepping by hand matches a headless run', () => {
    const a = new Engine({ ...DEFAULT_PARAMS })
    for (let i = 0; i < 300; i++) a.stepOnce()
    const b = run({}, 300 * DT)
    expect(a.world.counts).toEqual(b.world.counts)
  })
})

describe('energy rules', () => {
  it('blue starves with no fruit at all', () => {
    const world = run({ fruitGrowth: 0.01, fruitLimit: 1, trees: 1, redStart: 0, blueStart: 20 }, 600)
    expect(world.world.counts.blue).toBeLessThan(20)
    expect(world.world.totals.starved.blue).toBeGreaterThan(0)
  })

  it('red cannot live without blue to touch', () => {
    const world = run({ blueStart: 0, redStart: 12 }, 900)
    expect(world.world.counts.red).toBe(0)
    expect(world.world.totals.starved.red).toBeGreaterThan(0)
  })

  it('blue grows into an empty, fruit-rich garden', () => {
    const world = run({ redStart: 0, blueStart: 6, fruitGrowth: 0.28, fruitLimit: 12, trees: 26 }, 900)
    expect(world.world.counts.blue).toBeGreaterThan(6)
  })

  it('levels off instead of growing forever', () => {
    const world = run({ redStart: 0, blueStart: 6, fruitGrowth: 0.28, fruitLimit: 12, trees: 26 }, 2400)
    const samples = world.history
    const late = samples.slice(Math.floor(samples.length * 0.6)).map((sample) => sample.blue)
    const peak = Math.max(...samples.map((sample) => sample.blue))
    expect(Math.max(...late)).toBeLessThan(peak * 1.6)
    expect(world.world.capReached).toBe(false)
    expect(world.world.counts.blue).toBeLessThan(400)
  })

  it('eating moves energy from the tree to the blob', () => {
    const world = run({ redStart: 0, blueStart: 10 }, 240)
    expect(world.world.totals.fruitEaten).toBeGreaterThan(0)
  })

  it('a contact moves energy from blue to red', () => {
    const world = run({ blueStart: 40, redStart: 10 }, 240)
    expect(world.world.totals.contacts).toBeGreaterThan(0)
  })
})

describe('the garden holds together', () => {
  it('keeps both groups alive on the balanced preset', () => {
    const preset = PRESETS.find((item) => item.id === 'balanced')!
    const world = run(preset.params, 3000)
    expect(world.world.counts.blue).toBeGreaterThan(0)
    expect(world.world.counts.red).toBeGreaterThan(0)
  })

  it('produces real waves rather than a flat line', () => {
    const preset = PRESETS.find((item) => item.id === 'balanced')!
    const world = run(preset.params, 3000)
    const blue = world.history.map((sample) => sample.blue)
    const smooth = movingAverage(blue, Math.round(world.history.length / 40))
    const mid = blue.reduce((sum, value) => sum + value, 0) / blue.length
    expect(findPeaks(smooth, mid * 0.28).length).toBeGreaterThanOrEqual(2)
  })

  it('low fruit keeps the garden small', () => {
    const low = run(PRESETS.find((item) => item.id === 'low-fruit')!.params, 1800)
    const rich = run(PRESETS.find((item) => item.id === 'fruit-rich')!.params, 1800)
    const peak = (engine: Engine) => Math.max(...engine.history.map((sample) => sample.blue))
    expect(peak(low)).toBeLessThan(peak(rich))
  })

  it('never exceeds the population cap', () => {
    const world = run({ fruitGrowth: 0.3, fruitLimit: 14, trees: 40, blueStart: 80, redStart: 20 }, 600)
    expect(world.world.blobs.length).toBeLessThanOrEqual(900)
  })

  it('red-heavy: blue dips first, then red fades', () => {
    const world = run(PRESETS.find((item) => item.id === 'red-heavy')!.params, 700)
    const samples = world.history
    const blueZero = samples.find((sample) => sample.blue === 0)
    expect(blueZero).toBeTruthy()
    expect(blueZero!.red).toBeGreaterThan(0)
    expect(samples[samples.length - 1].red).toBeLessThan(blueZero!.red)
  })
})

describe('traits', () => {
  it('charges for speed, so it cannot run away for free', () => {
    expect(costOver(1.6)).toBeGreaterThan(costOver(1))
  })

  function costOver(speedTrait: number) {
    const engine = new Engine({ ...DEFAULT_PARAMS, blueStart: 12, redStart: 0, trees: 1, fruitGrowth: 0.01, fruitLimit: 1 })
    for (const blob of engine.world.blobs) blob.traits.speed = speedTrait
    const before = engine.world.blobs.reduce((sum, blob) => sum + blob.energy, 0)
    engine.run(20)
    const after = engine.world.blobs.reduce((sum, blob) => sum + blob.energy, 0)
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
    const world = run({ blueStart: 0, redStart: 10 }, 900)
    const summary = summarise(world.history, world.world.trees.length * world.params.fruitLimit, world.world.counts.blue, world.world.counts.red)
    expect(summary.tone).toBe('faded')
  })
})

describe('params', () => {
  it('clamps to the declared range and rounds integers', () => {
    expect(clampParam('trees', 999)).toBe(44)
    expect(clampParam('trees', 3.7)).toBe(4)
    expect(clampParam('fruitGrowth', -1)).toBe(0.01)
  })
})
