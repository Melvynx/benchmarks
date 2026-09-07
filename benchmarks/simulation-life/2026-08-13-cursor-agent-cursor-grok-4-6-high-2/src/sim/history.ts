import type { Kind, World } from './types'
import { meanEnergy, meanTrait } from './world'

export type Sample = {
  t: number
  fruit: number
  blue: number
  red: number
  blueEnergy: number
  redEnergy: number
  blueSpeed: number
  redSpeed: number
  blueVision: number
  redVision: number
  blueNerve: number
  redNerve: number
}

const MAX = 1600
const BASE = 0.5

export class History {
  samples: Sample[] = []
  interval = BASE
  version = 0
  private nextAt = 0

  reset() {
    this.samples = []
    this.interval = BASE
    this.nextAt = 0
    this.version++
  }

  maybeSample(world: World) {
    if (world.t + 1e-9 < this.nextAt) return
    this.nextAt = world.t + this.interval
    this.samples.push(snapshot(world))
    if (this.samples.length > MAX) {
      this.samples = this.samples.filter((_, i) => i % 2 === 0)
      this.interval *= 2
    }
    this.version++
  }
}

function snapshot(world: World): Sample {
  return {
    t: world.t,
    fruit: world.counts.fruit,
    blue: world.counts.blue,
    red: world.counts.red,
    blueEnergy: meanEnergy(world, 'blue'),
    redEnergy: meanEnergy(world, 'red'),
    blueSpeed: meanTrait(world, 'blue', 'speed'),
    redSpeed: meanTrait(world, 'red', 'speed'),
    blueVision: meanTrait(world, 'blue', 'vision'),
    redVision: meanTrait(world, 'red', 'vision'),
    blueNerve: meanTrait(world, 'blue', 'nerve'),
    redNerve: meanTrait(world, 'red', 'nerve'),
  }
}

export function seriesOf(samples: Sample[], key: keyof Sample): number[] {
  return samples.map((s) => s[key])
}

export function kindKey(kind: Kind): 'blue' | 'red' {
  return kind
}
