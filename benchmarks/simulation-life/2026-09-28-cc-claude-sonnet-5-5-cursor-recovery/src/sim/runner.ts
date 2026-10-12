import { C, World } from './world'
import { PRESETS, STRUCTURAL_KEYS, presetParams, type Params } from './params'

export const SPEEDS = [0.5, 1, 2, 4, 8, 16, 32]

const MAX_FRAME = 0.1
const BUDGET_MS = 14

export class Runner {
  world: World
  staged: Params
  presetId = 'balanced'
  playing = true
  speed = 4
  alpha = 1
  frameSpeed = 1

  private acc = 0
  private stepUntil = -1
  private lastTickCost = 0

  constructor(params: Params) {
    this.staged = { ...params }
    this.world = new World(params)
    this.world.emit = true
  }

  get pendingRestart(): boolean {
    for (const k of STRUCTURAL_KEYS) if (this.staged[k] !== this.world.params[k]) return true
    return false
  }

  get stepping(): boolean {
    return this.stepUntil >= 0
  }

  setParam<K extends keyof Params>(key: K, value: Params[K]) {
    this.staged[key] = value
    if (!STRUCTURAL_KEYS.includes(key)) this.world.params[key] = value
  }

  reset() {
    this.world = new World({ ...this.staged })
    this.world.emit = true
    this.acc = 0
    this.alpha = 1
    this.stepUntil = -1
  }

  loadPreset(id: string) {
    const preset = PRESETS.find((p) => p.id === id)
    if (!preset) return
    this.presetId = id
    const keepSeed = this.staged.seed
    this.staged = { ...presetParams(id), seed: keepSeed }
    this.reset()
  }

  randomize(rand: () => number = Math.random) {
    const p = { ...this.staged }
    const jitter = (v: number, spread: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, v * (1 + (rand() * 2 - 1) * spread)))
    p.seed = Math.floor(rand() * 9999) + 1
    p.fruitGrowth = +jitter(p.fruitGrowth, 0.3, 0.03, 0.3).toFixed(3)
    p.fruitLimit = Math.round(jitter(p.fruitLimit, 0.3, 2, 12))
    p.blueSpeed = +jitter(p.blueSpeed, 0.15, 1.2, 4).toFixed(2)
    p.blueVision = +jitter(p.blueVision, 0.2, 4, 14).toFixed(1)
    p.redSpeed = +jitter(p.redSpeed, 0.12, 1.5, 4.5).toFixed(2)
    p.redVision = +jitter(p.redVision, 0.2, 4, 14).toFixed(1)
    p.redStrength = Math.round(jitter(p.redStrength, 0.22, 8, 45))
    p.redPause = +jitter(p.redPause, 0.3, 1.5, 8).toFixed(1)
    p.trees = Math.round(jitter(p.trees, 0.25, 6, 30))
    p.startBlue = Math.round(jitter(p.startBlue, 0.3, 20, 160))
    p.startRed = Math.round(jitter(p.startRed, 0.4, 3, 40))
    this.presetId = 'custom'
    this.staged = p
    this.reset()
  }

  play() {
    this.playing = true
    this.stepUntil = -1
  }

  pause() {
    this.playing = false
    this.stepUntil = -1
  }

  toggle() {
    if (this.playing) this.pause()
    else this.play()
  }

  stepOnce(seconds = 1) {
    this.playing = false
    this.stepUntil = this.world.t + seconds
  }

  setSpeed(s: number) {
    this.speed = s
  }

  /** Advances the simulation by real elapsed seconds. Returns ticks executed. */
  frame(dtReal: number): number {
    const running = this.playing || this.stepUntil >= 0
    if (!running) {
      this.frameSpeed = 0
      return 0
    }
    const dt = Math.min(dtReal, MAX_FRAME)
    this.acc += dt * this.speed
    this.frameSpeed = this.speed
    const t0 = performance.now()
    let steps = 0
    const w = this.world
    while (this.acc >= C.DT) {
      w.step()
      this.acc -= C.DT
      steps++
      if (this.stepUntil >= 0 && w.t >= this.stepUntil) {
        this.stepUntil = -1
        this.acc = 0
        break
      }
      if ((steps & 7) === 0 && performance.now() - t0 > BUDGET_MS) {
        this.acc = 0
        break
      }
    }
    this.lastTickCost = performance.now() - t0
    this.alpha = this.stepUntil >= 0 || this.playing ? Math.min(1, this.acc / C.DT) : 1
    return steps
  }

  get cost() {
    return this.lastTickCost
  }
}
