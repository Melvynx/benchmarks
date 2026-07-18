export interface Params {
  // garden / fruit
  fruitGrowth: number // fruit per tick regrown per tree
  fruitLimit: number // max fruit a tree can hold
  fruitReturnDelay: number // ticks after a fruit is eaten before regrowth resumes
  // blue blobs
  blueEnergyUse: number // multiplier on all blue energy costs
  blueSpeed: number // base speed (world units / tick)
  blueVision: number // sensing radius
  blueCopyThreshold: number // energy needed to split
  blueEatingTime: number // ticks spent eating one fruit
  // red blobs
  redEnergyUse: number
  redSpeed: number
  redVision: number
  redContactStrength: number // energy gained per contact
  redCopyThreshold: number
  redPauseTime: number // ticks paused after a successful contact
  // setup
  startTrees: number
  startBlue: number
  startRed: number
  worldSize: number // world radius in world units
  seed: number
  simSpeed: number
  contactGrace: number // ticks a blue stays un-drainable after a contact (not a slider)
}

export const PARAM_DEFAULTS: Params = {
  fruitGrowth: 0.028,
  fruitLimit: 9,
  fruitReturnDelay: 150,
  blueEnergyUse: 1.0,
  blueSpeed: 1.8,
  blueVision: 105,
  blueCopyThreshold: 82,
  blueEatingTime: 55,
  redEnergyUse: 1.0,
  redSpeed: 2.2,
  redVision: 100,
  redContactStrength: 24,
  redCopyThreshold: 80,
  redPauseTime: 55,
  startTrees: 9,
  startBlue: 14,
  startRed: 4,
  worldSize: 340,
  seed: 7,
  simSpeed: 1,
  contactGrace: 110,
}

export interface Preset {
  id: string
  label: string
  blurb: string
  params: Partial<Params>
}

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    label: 'Balanced garden',
    blurb: 'Classic predator–prey waves',
    params: {},
  },
  {
    id: 'fruit-rich',
    label: 'Fruit-rich garden',
    blurb: 'Blue blobs boom on abundant fruit',
    params: {
      fruitGrowth: 0.075,
      fruitLimit: 14,
      fruitReturnDelay: 80,
      startTrees: 12,
      startBlue: 16,
      blueCopyThreshold: 80,
    },
  },
  {
    id: 'red-heavy',
    label: 'Red-heavy garden',
    blurb: 'Many reds hunt few blues — then starve',
    params: {
      startRed: 16,
      startBlue: 10,
      redContactStrength: 34,
      redCopyThreshold: 84,
      blueCopyThreshold: 90,
    },
  },
  {
    id: 'fragile',
    label: 'Fragile balance',
    blurb: 'Thin margins, deep swings',
    params: {
      fruitGrowth: 0.02,
      fruitLimit: 7,
      blueEnergyUse: 1.25,
      redEnergyUse: 1.2,
      blueCopyThreshold: 92,
      redCopyThreshold: 95,
      redContactStrength: 26,
    },
  },
  {
    id: 'low-fruit',
    label: 'Low-fruit garden',
    blurb: 'Scarcity keeps everyone small',
    params: {
      fruitGrowth: 0.008,
      fruitLimit: 4,
      fruitReturnDelay: 320,
      startTrees: 6,
      startBlue: 8,
      startRed: 3,
    },
  },
]

export interface ControlMeta {
  key: keyof Params
  label: string
  min: number
  max: number
  step: number
  group: 'garden' | 'blue' | 'red' | 'world'
  format?: (v: number) => string
  applyOn?: 'live' | 'reset'
}

const int = (v: number) => String(Math.round(v))

export const CONTROLS: ControlMeta[] = [
  { key: 'fruitGrowth', label: 'Fruit growth speed', min: 0.002, max: 0.15, step: 0.001, group: 'garden', format: (v) => v.toFixed(3) },
  { key: 'fruitLimit', label: 'Fruit limit per tree', min: 1, max: 24, step: 1, group: 'garden', format: int },
  { key: 'fruitReturnDelay', label: 'Fruit return delay', min: 0, max: 600, step: 10, group: 'garden', format: int },
  { key: 'blueEnergyUse', label: 'Blue energy use', min: 0.2, max: 2.5, step: 0.05, group: 'blue', format: (v) => v.toFixed(2) },
  { key: 'blueSpeed', label: 'Blue speed', min: 0.4, max: 3.6, step: 0.05, group: 'blue', format: (v) => v.toFixed(2) },
  { key: 'blueVision', label: 'Blue vision', min: 30, max: 260, step: 2, group: 'blue', format: int },
  { key: 'blueCopyThreshold', label: 'Blue copy threshold', min: 55, max: 100, step: 1, group: 'blue', format: int },
  { key: 'blueEatingTime', label: 'Blue eating time', min: 5, max: 140, step: 1, group: 'blue', format: int },
  { key: 'redEnergyUse', label: 'Red energy use', min: 0.2, max: 2.5, step: 0.05, group: 'red', format: (v) => v.toFixed(2) },
  { key: 'redSpeed', label: 'Red speed', min: 0.4, max: 3.8, step: 0.05, group: 'red', format: (v) => v.toFixed(2) },
  { key: 'redVision', label: 'Red vision', min: 30, max: 300, step: 2, group: 'red', format: int },
  { key: 'redContactStrength', label: 'Red contact strength', min: 6, max: 60, step: 1, group: 'red', format: int },
  { key: 'redCopyThreshold', label: 'Red copy threshold', min: 55, max: 100, step: 1, group: 'red', format: int },
  { key: 'redPauseTime', label: 'Red pause time', min: 5, max: 200, step: 1, group: 'red', format: int },
  { key: 'startTrees', label: 'Starting fruit trees', min: 2, max: 20, step: 1, group: 'world', format: int, applyOn: 'reset' },
  { key: 'startBlue', label: 'Starting blue blobs', min: 0, max: 60, step: 1, group: 'world', format: int, applyOn: 'reset' },
  { key: 'startRed', label: 'Starting red blobs', min: 0, max: 40, step: 1, group: 'world', format: int, applyOn: 'reset' },
  { key: 'worldSize', label: 'World size', min: 200, max: 520, step: 10, group: 'world', format: int },
]
