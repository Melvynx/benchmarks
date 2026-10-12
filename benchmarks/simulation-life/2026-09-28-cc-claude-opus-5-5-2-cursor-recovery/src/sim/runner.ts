import { World, DT, type SimEvent } from './world.ts'
import type { Params } from './params.ts'

/** Owns the world and turns real time into fixed simulation steps. */
export class Runner {
  world: World
  params: Params
  playing = false
  speed = 1
  private acc = 0

  constructor(params: Params) {
    this.params = { ...params }
    this.world = new World(this.params)
  }

  reset(params: Params = this.params) {
    this.params = { ...params }
    this.world = new World(this.params)
    this.acc = 0
  }

  setParams(params: Params) {
    this.params = { ...params }
    this.world.setParams(this.params)
  }

  /** Runs as many fixed steps as `realDt` (scaled by speed) allows. */
  advance(realDt: number, onEvents: (e: SimEvent[]) => void): number {
    if (!this.playing) return 0
    this.acc += Math.min(realDt, 0.1) * this.speed
    let n = 0
    const max = 800
    while (this.acc >= DT && n < max) {
      this.world.step()
      if (this.world.events.length) onEvents(this.world.events)
      this.acc -= DT
      n++
    }
    if (n === max) this.acc = 0
    return n
  }

  stepBy(seconds: number, onEvents: (e: SimEvent[]) => void) {
    const n = Math.max(1, Math.round(seconds / DT))
    for (let i = 0; i < n; i++) {
      this.world.step()
      if (this.world.events.length) onEvents(this.world.events)
    }
    this.acc = 0
  }

  /** 0..1 progress between the last two steps, for smooth rendering. */
  get alpha(): number {
    return this.playing ? Math.min(1, this.acc / DT) : 1
  }
}
