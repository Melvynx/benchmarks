import type { Params } from './params'
import { meanTrait, createSimulation, stepSimulation, DT } from './world'
import type { Sample, World } from './types'
import type { Rng } from './rng'

export { DT }

export class Engine {
  params: Params
  world: World
  rng: Rng
  history: Sample[]
  private sinceSample = 0

  constructor(params: Params) {
    this.params = { ...params }
    const created = createSimulation(this.params)
    this.world = created.world
    this.rng = created.rng
    this.history = []
    this.pushSample()
  }

  setParams(params: Params) {
    this.params = { ...params }
  }

  reset() {
    const created = createSimulation(this.params)
    this.world = created.world
    this.rng = created.rng
    this.history = []
    this.sinceSample = 0
    this.pushSample()
  }

  stepOnce() {
    stepSimulation(this.world, this.params, this.rng)
    this.sinceSample++
    if (this.sinceSample >= 15) {
      this.sinceSample = 0
      this.pushSample()
    }
  }

  run(seconds: number) {
    const steps = Math.max(0, Math.round(seconds / DT))
    for (let i = 0; i < steps; i++) this.stepOnce()
  }

  private pushSample() {
    const world = this.world
    this.history.push({
      t: world.t,
      fruit: world.counts.fruit,
      blue: world.counts.blue,
      red: world.counts.red,
      blueSpeed: meanTrait(world, 'blue', 'speed'),
      redSpeed: meanTrait(world, 'red', 'speed'),
      blueVision: meanTrait(world, 'blue', 'vision'),
      redVision: meanTrait(world, 'red', 'vision'),
    })
  }
}
