import { clamp, mulberry32 } from './rng'
import type { Params } from './types'

export type Range = { min: number; max: number; step: number; digits: number }

export const RANGES: Record<keyof Params, Range> = {
  fruitGrowth: { min: 0.002, max: 0.06, step: 0.001, digits: 3 },
  fruitLimit: { min: 1, max: 12, step: 1, digits: 0 },
  fruitDelay: { min: 8, max: 420, step: 1, digits: 0 },
  blueEnergyUse: { min: 0.3, max: 2.5, step: 0.05, digits: 2 },
  blueSpeed: { min: 0.4, max: 2, step: 0.05, digits: 2 },
  blueVision: { min: 1.5, max: 14, step: 0.1, digits: 1 },
  blueCopy: { min: 40, max: 150, step: 1, digits: 0 },
  blueEatTime: { min: 8, max: 120, step: 1, digits: 0 },
  redEnergyUse: { min: 0.3, max: 2.5, step: 0.05, digits: 2 },
  redSpeed: { min: 0.4, max: 2.2, step: 0.05, digits: 2 },
  redVision: { min: 2, max: 16, step: 0.1, digits: 1 },
  redContact: { min: 4, max: 40, step: 1, digits: 0 },
  redCopy: { min: 40, max: 170, step: 1, digits: 0 },
  redPause: { min: 4, max: 100, step: 1, digits: 0 },
  startTrees: { min: 1, max: 14, step: 1, digits: 0 },
  startBlue: { min: 1, max: 36, step: 1, digits: 0 },
  startRed: { min: 0, max: 28, step: 1, digits: 0 },
  worldSize: { min: 7, max: 16, step: 0.5, digits: 1 },
  seed: { min: 1, max: 999999, step: 1, digits: 0 },
  simSpeed: { min: 1, max: 16, step: 1, digits: 0 },
}

export const LABELS: Record<keyof Params, string> = {
  fruitGrowth: 'Fruit growth speed',
  fruitLimit: 'Fruit limit',
  fruitDelay: 'Fruit return delay',
  blueEnergyUse: 'Blue blob energy use',
  blueSpeed: 'Blue blob speed',
  blueVision: 'Blue blob vision',
  blueCopy: 'Blue blob copy threshold',
  blueEatTime: 'Blue blob eating time',
  redEnergyUse: 'Red blob energy use',
  redSpeed: 'Red blob speed',
  redVision: 'Red blob vision',
  redContact: 'Red blob contact strength',
  redCopy: 'Red blob copy threshold',
  redPause: 'Red blob pause time',
  startTrees: 'Starting fruit trees',
  startBlue: 'Starting blue blobs',
  startRed: 'Starting red blobs',
  worldSize: 'World size',
  seed: 'Random seed',
  simSpeed: 'Simulation speed',
}

export type ControlGroup = {
  id: string
  title: string
  hint: string
  keys: (keyof Params)[]
}

export const GROUPS: ControlGroup[] = [
  {
    id: 'fruit',
    title: 'Fruit',
    hint: 'Blue blobs refill on fruit. Used fruit waits, then grows back.',
    keys: ['fruitGrowth', 'fruitLimit', 'fruitDelay'],
  },
  {
    id: 'blue',
    title: 'Blue blobs',
    hint: 'Moving costs more than waiting. Eating refills them. Copying spends stored energy.',
    keys: ['blueEnergyUse', 'blueSpeed', 'blueVision', 'blueCopy', 'blueEatTime'],
  },
  {
    id: 'red',
    title: 'Red blobs',
    hint: 'They hunt blue blobs. A visit feeds the red blob, tires the blue one, then the red one pauses.',
    keys: ['redEnergyUse', 'redSpeed', 'redVision', 'redContact', 'redCopy', 'redPause'],
  },
  {
    id: 'setup',
    title: 'Garden setup',
    hint: 'Trees, starting groups, size, and seed plant a new dish when you reset.',
    keys: ['startTrees', 'startBlue', 'startRed', 'worldSize', 'seed'],
  },
  {
    id: 'time',
    title: 'Time',
    hint: 'Beats per frame. The rules stay the same; the dish just runs faster.',
    keys: ['simSpeed'],
  },
]

export type Preset = {
  id: string
  name: string
  blurb: string
  params: Params
}

const balanced: Params = {
  fruitGrowth: 0.011,
  fruitLimit: 6,
  fruitDelay: 95,
  blueEnergyUse: 0.95,
  blueSpeed: 1,
  blueVision: 5.4,
  blueCopy: 70,
  blueEatTime: 34,
  redEnergyUse: 1.45,
  redSpeed: 1.2,
  redVision: 7.6,
  redContact: 12,
  redCopy: 150,
  redPause: 48,
  startTrees: 8,
  startBlue: 12,
  startRed: 2,
  worldSize: 10,
  seed: 7,
  simSpeed: 3,
}

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced garden',
    blurb: 'Fruit, blue blobs, and red blobs should take turns.',
    params: balanced,
  },
  {
    id: 'fruit-rich',
    name: 'Fruit-rich garden',
    blurb: 'Food comes back fast, so blue blobs get bold.',
    params: {
      ...balanced,
      fruitGrowth: 0.032,
      fruitLimit: 8,
      fruitDelay: 20,
      blueEnergyUse: 0.72,
      blueCopy: 66,
      blueEatTime: 22,
      redEnergyUse: 1.25,
      redContact: 11,
      redCopy: 145,
      redPause: 52,
      startTrees: 10,
      startBlue: 9,
      startRed: 2,
      seed: 11,
    },
  },
  {
    id: 'red-heavy',
    name: 'Red-heavy garden',
    blurb: 'A crowd of red blobs puts the blue group under pressure.',
    params: {
      ...balanced,
      fruitGrowth: 0.012,
      fruitLimit: 5,
      fruitDelay: 70,
      blueEnergyUse: 1.05,
      blueCopy: 96,
      blueEatTime: 22,
      redEnergyUse: 1.05,
      redSpeed: 1.3,
      redVision: 9,
      redContact: 18,
      redCopy: 88,
      redPause: 22,
      startTrees: 6,
      startBlue: 10,
      startRed: 8,
      seed: 21,
    },
  },
  {
    id: 'fragile',
    name: 'Fragile balance',
    blurb: 'The swing is wider. A bad streak can empty the dish.',
    params: {
      ...balanced,
      fruitLimit: 5,
      blueEnergyUse: 1.35,
      blueCopy: 64,
      redEnergyUse: 1.65,
      redSpeed: 1.26,
      redContact: 15,
      redCopy: 118,
      redPause: 28,
      startBlue: 10,
      startRed: 4,
      worldSize: 11,
      seed: 18,
    },
  },
  {
    id: 'low-fruit',
    name: 'Low-fruit garden',
    blurb: 'Scarce fruit keeps every group small.',
    params: {
      ...balanced,
      fruitGrowth: 0.004,
      fruitLimit: 2,
      fruitDelay: 260,
      blueEnergyUse: 0.9,
      blueCopy: 92,
      redEnergyUse: 1.05,
      redContact: 14,
      redCopy: 130,
      redPause: 40,
      startTrees: 3,
      startBlue: 5,
      startRed: 1,
      worldSize: 12,
      seed: 5,
    },
  },
]

export function presetById(id: string) {
  return PRESETS.find((preset) => preset.id === id) ?? PRESETS[0]
}

export function formatValue(key: keyof Params, value: number) {
  const digits = RANGES[key].digits
  return digits === 0 ? String(Math.round(value)) : value.toFixed(digits)
}

export function randomParams(): Params {
  const rng = mulberry32((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0)
  const pick = (key: keyof Params) => {
    const range = RANGES[key]
    const span = range.max - range.min
    const min = range.min + span * 0.1
    const max = range.max - span * 0.1
    const steps = Math.max(1, Math.round((max - min) / range.step))
    const snapped = min + Math.floor(rng() * (steps + 1)) * range.step
    return clamp(Number(snapped.toFixed(range.digits)), range.min, range.max)
  }
  const params = {} as Params
  ;(Object.keys(RANGES) as (keyof Params)[]).forEach((key) => {
    params[key] = pick(key)
  })
  params.seed = 1 + Math.floor(rng() * 99998)
  params.simSpeed = 2 + Math.floor(rng() * 5)
  params.startRed = Math.floor(rng() * 12)
  return params
}
