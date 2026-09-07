import { History } from './history'
import { clampParam, DEFAULT_PARAMS, type ParamKey, type Params } from './params'
import { Rng } from './rng'
import type { World } from './types'
import { createWorld, DT, step } from './world'

const REALTIME_STEPS = 1 / DT

export class Engine {
  params: Params
  world: World
  history = new History()
  running = true
  speed = 1
  version = 0
  selectedId: number | null = null

  private rng: Rng
  private accumulator = 0
  private listeners = new Set<() => void>()

  constructor(params: Params = DEFAULT_PARAMS) {
    this.params = { ...params }
    this.world = createWorld(this.params)
    this.rng = new Rng((this.params.seed ^ 0x9e3779b9) >>> 0)
    this.history.maybeSample(this.world)
  }

  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  getSnapshot = () => this.version

  notify() {
    this.version++
    for (const fn of this.listeners) fn()
  }

  reset(params: Params = this.params) {
    this.params = { ...params }
    this.world = createWorld(this.params)
    this.rng = new Rng((this.params.seed ^ 0x9e3779b9) >>> 0)
    this.history.reset()
    this.history.maybeSample(this.world)
    this.accumulator = 0
    this.selectedId = null
    this.notify()
  }

  setParam(key: ParamKey, value: number) {
    this.params = { ...this.params, [key]: clampParam(key, value) }
    this.notify()
  }

  setParams(params: Params) {
    this.params = { ...params }
    this.notify()
  }

  setRunning(running: boolean) {
    this.running = running
    this.accumulator = 0
    this.notify()
  }

  setSpeed(speed: number) {
    this.speed = speed
    this.notify()
  }

  select(id: number | null) {
    this.selectedId = id
    this.notify()
  }

  selected() {
    if (this.selectedId === null) return null
    return this.world.blobs.find((b) => b.id === this.selectedId) ?? null
  }

  stepOnce() {
    step(this.world, this.params, this.rng)
    this.history.maybeSample(this.world)
    this.accumulator = 0
    this.notify()
  }

  advance(realSeconds: number): number {
    if (!this.running) return 0
    const budget = Math.min(realSeconds, 0.25) * this.speed * REALTIME_STEPS
    this.accumulator += budget
    let steps = Math.floor(this.accumulator)
    const maxSteps = Math.ceil(24 * Math.max(1, this.speed))
    if (steps > maxSteps) {
      steps = maxSteps
      this.accumulator = 0
    } else {
      this.accumulator -= steps
    }
    for (let i = 0; i < steps; i++) {
      step(this.world, this.params, this.rng)
      this.history.maybeSample(this.world)
    }
    return this.accumulator
  }

  run(seconds: number) {
    const steps = Math.round(seconds / DT)
    for (let i = 0; i < steps; i++) {
      step(this.world, this.params, this.rng)
      this.history.maybeSample(this.world)
    }
  }
}
