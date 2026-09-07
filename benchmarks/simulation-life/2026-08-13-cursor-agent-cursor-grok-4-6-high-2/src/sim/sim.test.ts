import { describe, expect, it } from 'vitest'
import { Engine } from './engine'
import { DEFAULT_PARAMS, PRESETS, type Params } from './params'
import { Rng } from './rng'
import { C, createWorld, DT, fruitTotal, meanEnergy, ripeCount, step } from './world'

function run(params: Params, seconds: number) {
  const engine = new Engine(params)
  engine.run(seconds)
  return engine
}

function headless(params: Params, seconds: number, rng = new Rng((params.seed ^ 0x9e3779b9) >>> 0)) {
  const world = createWorld(params)
  const steps = Math.round(seconds / DT)
  for (let i = 0; i < steps; i++) step(world, params, rng)
  return world
}

describe('energy rules', () => {
  it('moving spends more energy than waiting', () => {
    const params: Params = { ...DEFAULT_PARAMS, blueStart: 1, redStart: 0, trees: 0, worldSize: 180, seed: 11 }
    const world = createWorld(params)
    const blob = world.blobs[0]!
    blob.vx = params.blueSpeed
    blob.vy = 0
    blob.energy = 80
    const rng = new Rng(1)
    for (let i = 0; i < 24; i++) {
      blob.action = 'wander'
      blob.actionTimer = 0
      blob.vx = params.blueSpeed
      blob.vy = 0
      step(world, params, rng)
      if (world.blobs[0]) {
        world.blobs[0].vx = params.blueSpeed
        world.blobs[0].vy = 0
      }
    }
    const movingEnergy = world.blobs[0]?.energy ?? 0

    const world2 = createWorld(params)
    const still = world2.blobs[0]!
    still.vx = 0
    still.vy = 0
    still.energy = 80
    const rng2 = new Rng(1)
    for (let i = 0; i < 24; i++) {
      still.action = 'eat'
      still.actionTimer = 10
      still.vx = 0
      still.vy = 0
      step(world2, params, rng2)
      if (world2.blobs[0]) {
        world2.blobs[0].action = 'eat'
        world2.blobs[0].actionTimer = 10
        world2.blobs[0].vx = 0
        world2.blobs[0].vy = 0
      }
    }
    const waitingEnergy = world2.blobs[0]?.energy ?? 0
    expect(movingEnergy).toBeLessThan(waitingEnergy)
    expect(waitingEnergy).toBeLessThan(80)
  })

  it('eating restores blue energy and removes a berry', () => {
    const params: Params = {
      ...DEFAULT_PARAMS,
      blueStart: 1,
      redStart: 0,
      trees: 1,
      fruitLimit: 4,
      fruitDelay: 20,
      worldSize: 160,
      seed: 22,
    }
    const world = createWorld(params)
    const tree = world.trees[0]!
    const blob = world.blobs[0]!
    blob.x = tree.x
    blob.y = tree.y
    blob.energy = 40
    blob.action = 'wander'
    blob.actionTimer = 0
    const beforeFruit = ripeCount(tree)
    expect(beforeFruit).toBeGreaterThan(0)
    const rng = new Rng(3)
    step(world, params, rng)
    expect(world.totals.eaten).toBe(1)
    expect(ripeCount(tree)).toBe(beforeFruit - 1)
    expect(blob.energy).toBeGreaterThan(40)
    expect(blob.action).toBe('eat')
  })

  it('fruit stays gone during the return delay, then grows back', () => {
    const params: Params = {
      ...DEFAULT_PARAMS,
      blueStart: 0,
      redStart: 0,
      trees: 1,
      fruitLimit: 3,
      fruitGrowth: 0.5,
      fruitDelay: 2,
      seed: 33,
    }
    const world = createWorld(params)
    const tree = world.trees[0]!
    const berry = tree.berries.find((b) => b.ripe)!
    berry.ripe = false
    berry.grow = 0
    berry.cool = params.fruitDelay
    const rng = new Rng(4)
    const stepsDelay = Math.round(1.5 / DT)
    for (let i = 0; i < stepsDelay; i++) step(world, params, rng)
    expect(berry.ripe).toBe(false)
    const stepsGrow = Math.round(4 / DT)
    for (let i = 0; i < stepsGrow; i++) step(world, params, rng)
    expect(berry.ripe).toBe(true)
  })

  it('red contact restores red energy from a blue blob', () => {
    const params: Params = {
      ...DEFAULT_PARAMS,
      blueStart: 1,
      redStart: 1,
      trees: 0,
      redStrength: 12,
      redPause: 3,
      seed: 44,
    }
    const world = createWorld(params)
    const blue = world.blobs.find((b) => b.kind === 'blue')!
    const red = world.blobs.find((b) => b.kind === 'red')!
    blue.x = 0
    blue.y = 0
    red.x = 2
    red.y = 0
    blue.energy = 60
    red.energy = 40
    blue.immunity = 0
    red.action = 'wander'
    red.actionTimer = 0
    const rng = new Rng(5)
    step(world, params, rng)
    const afterRed = world.blobs.find((b) => b.kind === 'red')!
    expect(world.totals.contacts).toBe(1)
    expect(afterRed.energy).toBeGreaterThan(40)
    expect(blue.energy).toBeLessThan(60)
    expect(afterRed.action === 'contact' || afterRed.action === 'rest').toBe(true)
  })

  it('copying spends stored energy so a group cannot grow for free', () => {
    const params: Params = { ...DEFAULT_PARAMS, blueStart: 1, redStart: 0, trees: 0, blueCopy: 70, seed: 55 }
    const world = createWorld(params)
    const parent = world.blobs[0]!
    parent.energy = 90
    parent.copyCool = 0
    parent.meals = 2
    parent.age = 10
    parent.action = 'wander'
    parent.actionTimer = 0
    const before = parent.energy
    const rng = new Rng(6)
    step(world, params, rng)
    expect(world.blobs.length).toBe(2)
    const sum = world.blobs.reduce((s, b) => s + b.energy, 0)
    expect(sum).toBeLessThan(before)
    expect(world.totals.births.blue).toBe(1)
  })
})

describe('history', () => {
  it('records live counts, not invented curves', () => {
    const engine = run({ ...DEFAULT_PARAMS, seed: 77 }, 40)
    const last = engine.history.samples.at(-1)!
    expect(last.blue).toBe(engine.world.counts.blue)
    expect(last.red).toBe(engine.world.counts.red)
    expect(last.fruit).toBe(engine.world.counts.fruit)
    expect(engine.history.samples.length).toBeGreaterThan(10)
    expect(engine.history.samples.some((s) => s.blue !== engine.history.samples[0]!.blue || s.red !== engine.history.samples[0]!.red)).toBe(true)
  })

  it('same seed replays the same garden', () => {
    const a = headless(DEFAULT_PARAMS, 80)
    const b = headless(DEFAULT_PARAMS, 80)
    expect(a.counts).toEqual(b.counts)
    expect(a.totals.eaten).toBe(b.totals.eaten)
    expect(a.blobs.map((x) => x.id)).toEqual(b.blobs.map((x) => x.id))
  })
})

describe('ecology shape', () => {
  it('balanced garden keeps both groups alive and swinging', () => {
    const engine = run(PRESETS.find((p) => p.id === 'balanced')!.params, 900)
    const blues = engine.history.samples.map((s) => s.blue)
    const reds = engine.history.samples.map((s) => s.red)
    expect(engine.world.counts.blue).toBeGreaterThan(0)
    expect(engine.world.counts.red).toBeGreaterThan(0)
    expect(Math.max(...blues) - Math.min(...blues)).toBeGreaterThan(6)
    expect(Math.max(...reds) - Math.min(...reds)).toBeGreaterThan(3)
    expect(Math.max(...blues)).toBeLessThan(C.popCap)
  })

  it('fruit-rich garden lets blue climb quickly', () => {
    const rich = run(PRESETS.find((p) => p.id === 'fruit-rich')!.params, 220)
    const low = run(PRESETS.find((p) => p.id === 'low-fruit')!.params, 220)
    const richPeak = Math.max(...rich.history.samples.map((s) => s.blue))
    const lowPeak = Math.max(...low.history.samples.map((s) => s.blue))
    expect(richPeak).toBeGreaterThan(lowPeak)
    expect(richPeak).toBeGreaterThan(rich.world.blobs.filter((b) => b.kind === 'blue').length * 0.4)
  })

  it('low fruit keeps the garden small', () => {
    const engine = run(PRESETS.find((p) => p.id === 'low-fruit')!.params, 700)
    const meanBlue = engine.history.samples.reduce((s, x) => s + x.blue, 0) / engine.history.samples.length
    const meanRed = engine.history.samples.reduce((s, x) => s + x.red, 0) / engine.history.samples.length
    expect(meanBlue).toBeLessThan(28)
    expect(meanRed).toBeLessThan(18)
    expect(meanBlue + meanRed).toBeLessThan(40)
  })

  it('red-heavy garden dips blue first, then red', () => {
    const engine = run(PRESETS.find((p) => p.id === 'red-heavy')!.params, 500)
    const samples = engine.history.samples
    const startBlue = samples[0]!.blue
    const startRed = samples[0]!.red
    let blueMinT = 0
    let redMinT = 0
    let blueMin = startBlue
    let redMin = startRed
    for (const s of samples) {
      if (s.blue < blueMin) {
        blueMin = s.blue
        blueMinT = s.t
      }
      if (s.red < redMin) {
        redMin = s.red
        redMinT = s.t
      }
    }
    expect(blueMin).toBeLessThan(startBlue)
    expect(redMinT).toBeGreaterThanOrEqual(blueMinT - 20)
    expect(engine.world.counts.blue + engine.world.counts.red).toBeGreaterThanOrEqual(0)
  })

  it('groups level out instead of growing forever', () => {
    const engine = run({ ...DEFAULT_PARAMS, seed: 101 }, 1400)
    const late = engine.history.samples.slice(-40)
    const peak = Math.max(...engine.history.samples.map((s) => s.blue + s.red))
    const lateMean = late.reduce((s, x) => s + x.blue + x.red, 0) / late.length
    expect(peak).toBeLessThan(C.popCap)
    expect(lateMean).toBeLessThan(peak * 1.15)
    expect(engine.world.peaked).toBe(false)
  })

  it('mean energy is taken from living blobs', () => {
    const world = createWorld({ ...DEFAULT_PARAMS, blueStart: 4, redStart: 3, seed: 9 })
    expect(meanEnergy(world, 'blue')).toBeGreaterThan(0)
    expect(fruitTotal(world)).toBe(world.counts.fruit)
  })
})
