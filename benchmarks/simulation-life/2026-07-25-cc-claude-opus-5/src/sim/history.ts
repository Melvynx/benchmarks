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
  blueThrift: number
  redThrift: number
}

const MAX_SAMPLES = 1400
const BASE_INTERVAL = 0.5

/**
 * Rolling record of the run. When it fills up it halves its own resolution
 * instead of dropping the start, so the whole run stays on one timeline.
 */
export class History {
  samples: Sample[] = []
  interval = BASE_INTERVAL
  /**
   * Bumped every time `samples` changes. The array is appended to in place, so
   * its identity is useless as a change signal — anything memoising over the
   * samples has to key on this instead, or it silently keeps its first result.
   */
  version = 0
  private nextAt = 0

  reset() {
    this.samples = []
    this.interval = BASE_INTERVAL
    this.nextAt = 0
    this.version++
  }

  maybeSample(world: World) {
    if (world.t < this.nextAt) return
    this.nextAt = world.t + this.interval
    this.samples.push(snapshot(world))
    if (this.samples.length > MAX_SAMPLES) {
      this.samples = this.samples.filter((_, i) => i % 2 === 0)
      this.interval *= 2
    }
    this.version++
  }

  last(): Sample | undefined {
    return this.samples[this.samples.length - 1]
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
    blueThrift: meanTrait(world, 'blue', 'thrift'),
    redThrift: meanTrait(world, 'red', 'thrift'),
  }
}

export function seriesOf(samples: Sample[], key: keyof Sample): number[] {
  return samples.map((s) => s[key])
}

export function kindKey(kind: Kind): 'blue' | 'red' {
  return kind
}
