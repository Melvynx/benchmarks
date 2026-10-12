import { describe, expect, it } from 'vitest'
import { BLUE, C, RED, World } from './world'
import { DEFAULT_PARAMS, PRESETS, presetParams, type Params } from './params'
import { autocorr, dominantCycle, findPeaks, smooth } from './signal'
import { summarize } from './analysis'
import { Runner } from './runner'

function run(params: Params, seconds: number): World {
  const w = new World(params)
  w.emit = false
  const ticks = Math.round(seconds / C.DT)
  for (let i = 0; i < ticks; i++) w.step()
  return w
}

describe('determinism and sanity', () => {
  it('replays identically for the same seed', () => {
    const a = run(DEFAULT_PARAMS, 240)
    const b = run(DEFAULT_PARAMS, 240)
    expect(a.history.map((s) => [s.blue, s.red, s.fruit])).toEqual(b.history.map((s) => [s.blue, s.red, s.fruit]))
    expect(a.stats).toEqual(b.stats)
  })

  it('different seeds give different gardens', () => {
    const a = run({ ...DEFAULT_PARAMS, seed: 1 }, 120)
    const b = run({ ...DEFAULT_PARAMS, seed: 2 }, 120)
    expect(a.history.map((s) => s.blue)).not.toEqual(b.history.map((s) => s.blue))
  })

  it('keeps every blob inside the dish with valid energy', () => {
    for (const preset of PRESETS) {
      const w = new World(presetParams(preset.id))
      w.emit = false
      for (let i = 0; i < 30 * 400; i++) {
        w.step()
        if (i % 90 !== 0) continue
        for (const b of w.blobs) {
          expect(Number.isFinite(b.x) && Number.isFinite(b.y)).toBe(true)
          expect(Math.hypot(b.x, b.y)).toBeLessThanOrEqual(w.radius + 1e-6)
          expect(b.energy).toBeGreaterThanOrEqual(0)
          expect(b.energy).toBeLessThanOrEqual(C.MAX_ENERGY + 1e-6)
        }
        for (const t of w.trees) {
          expect(t.fruit).toBeGreaterThanOrEqual(0)
          expect(t.fruit).toBeLessThanOrEqual(w.params.fruitLimit)
        }
      }
    }
  })

  it('never gets free energy: with no fruit, total stored energy only falls', () => {
    const w = new World({ ...DEFAULT_PARAMS, fruitGrowth: 0 })
    w.emit = false
    for (const t of w.trees) t.fruit = 0
    let prev = w.blobs.reduce((s, b) => s + b.energy, 0)
    for (let i = 0; i < 30 * 120; i++) {
      w.step()
      const now = w.blobs.reduce((s, b) => s + b.energy, 0)
      expect(now).toBeLessThanOrEqual(prev + 1e-6)
      prev = now
    }
    expect(w.stats.fruitEaten).toBe(0)
  })

  it('makes a copy only by paying stored energy', () => {
    const w = new World(DEFAULT_PARAMS)
    w.emit = true
    let births = 0
    for (let i = 0; i < 30 * 200; i++) {
      w.step()
      for (const e of w.events) {
        if (e.type !== 'birth') continue
        births++
        const child = w.byId.get(e.blob)
        expect(child).toBeDefined()
        expect(child!.energy).toBeLessThan(child!.kind === BLUE ? w.params.blueCopy : w.params.redCopy)
      }
      w.events.length = 0
    }
    expect(births).toBeGreaterThan(0)
  })
})

describe('fruit and contact mechanics', () => {
  it('shrinks a tree when a blue blob eats, then regrows it after the return delay', () => {
    const params: Params = {
      ...DEFAULT_PARAMS,
      trees: 1,
      startBlue: 1,
      startRed: 0,
      fruitLimit: 4,
      fruitGrowth: 0.5,
      fruitDelay: 3,
      blueEatTime: 0.5,
      worldSize: 14,
    }
    const w = new World(params)
    w.emit = true
    const tree = w.trees[0]
    tree.fruit = 4
    const blue = w.blobs[0]
    blue.energy = 30
    blue.x = tree.x + 2.2
    blue.y = tree.y
    let sawEat = false
    let lowest = 4
    let regrew = false
    for (let i = 0; i < 30 * 40; i++) {
      w.step()
      if (w.events.some((e) => e.type === 'eat')) sawEat = true
      w.events.length = 0
      lowest = Math.min(lowest, tree.fruit)
      if (sawEat && tree.fruit > lowest) regrew = true
    }
    expect(sawEat).toBe(true)
    expect(lowest).toBeLessThan(4)
    expect(regrew).toBe(true)
  })

  it('pauses red after contact so it cannot repeat instantly', () => {
    const w = new World({ ...DEFAULT_PARAMS, trees: 1, startBlue: 1, startRed: 1, redPause: 4, worldSize: 20 })
    w.emit = true
    const [blue, red] = [w.blobs.find((b) => b.kind === BLUE)!, w.blobs.find((b) => b.kind === RED)!]
    blue.x = 0
    blue.y = 5
    blue.energy = 90
    red.x = 0
    red.y = 4.3
    red.energy = 40
    let contactAt = -1
    for (let i = 0; i < 30 * 20; i++) {
      w.step()
      if (contactAt < 0 && w.events.some((e) => e.type === 'contact')) {
        contactAt = w.t
        expect(red.action).toBe('pause')
        expect(red.timer).toBeGreaterThan(3.5)
        expect(blue.action).toBe('stunned')
        expect(blue.immune).toBeGreaterThan(0)
      }
      w.events.length = 0
    }
    expect(contactAt).toBeGreaterThan(0)
    expect(w.stats.energyDrained).toBeGreaterThan(0)
  })
})

describe('signal helpers', () => {
  const wave = Array.from({ length: 900 }, (_, i) => 50 + 20 * Math.sin((2 * Math.PI * i) / 150))
  it('finds evenly spaced peaks', () => {
    const peaks = findPeaks(smooth(wave, 5), 10)
    expect(peaks.length).toBe(6)
  })
  it('recovers the period of a wave', () => {
    const c = dominantCycle(wave, 20, 400)
    expect(Math.abs(c.period - 150)).toBeLessThanOrEqual(3)
    expect(c.strength).toBeGreaterThan(0.8)
    expect(autocorr(wave, 75)).toBeLessThan(-0.5)
  })
})

describe('runner', () => {
  it('advances by real time times speed and pauses', () => {
    const r = new Runner(DEFAULT_PARAMS)
    r.setSpeed(2)
    r.play()
    for (let i = 0; i < 60; i++) r.frame(1 / 60)
    expect(r.world.t).toBeGreaterThan(1.9)
    expect(r.world.t).toBeLessThan(2.1)
    r.pause()
    const t = r.world.t
    r.frame(1)
    expect(r.world.t).toBe(t)
  })

  it('steps a fixed second and then stops', () => {
    const r = new Runner(DEFAULT_PARAMS)
    r.setSpeed(4)
    r.pause()
    r.stepOnce(1)
    for (let i = 0; i < 30; i++) r.frame(1 / 60)
    expect(r.world.t).toBeGreaterThanOrEqual(1)
    expect(r.world.t).toBeLessThan(1.1)
    expect(r.stepping).toBe(false)
  })

  it('applies live tuning at once and stages structural changes for restart', () => {
    const r = new Runner(DEFAULT_PARAMS)
    r.setParam('blueSpeed', 3.3)
    expect(r.world.params.blueSpeed).toBe(3.3)
    r.setParam('trees', 5)
    expect(r.world.params.trees).toBe(DEFAULT_PARAMS.trees)
    expect(r.pendingRestart).toBe(true)
    r.reset()
    expect(r.world.trees.length).toBe(5)
    expect(r.pendingRestart).toBe(false)
  })
})

describe('run summary', () => {
  it('reports from recorded history', () => {
    const w = run(DEFAULT_PARAMS, 400)
    const s = summarize(w)
    expect(s.headline.length).toBeGreaterThan(10)
    expect(s.lines.length).toBeGreaterThan(0)
    expect(s.chips.find((c) => c.label === 'Fruit eaten')?.value).toBe(String(w.stats.fruitEaten))
  })
})
