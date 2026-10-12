export interface Params {
  /** Fraction of a full fruit grown per second. */
  fruitGrowth: number
  /** Fruit each tree can hold at once. */
  fruitLimit: number
  /** Seconds a stem rests after its fruit is used before a new fruit starts. */
  fruitDelay: number

  blueEnergyUse: number
  blueSpeed: number
  blueVision: number
  blueCopyAt: number
  blueEatTime: number

  redEnergyUse: number
  redSpeed: number
  redVision: number
  redContact: number
  redCopyAt: number
  redPause: number

  trees: number
  blue0: number
  red0: number
  worldSize: number
  seed: number
  /** How much traits wobble between parent and copy (0 = exact copies). */
  mutation: number
}

export type ParamKey = keyof Params

export type ParamGroup = 'garden' | 'blue' | 'red' | 'world'

export interface ParamDef {
  key: ParamKey
  label: string
  group: ParamGroup
  min: number
  max: number
  step: number
  unit?: string
  /** Starting conditions only take effect after a reset. */
  onReset?: boolean
  hint: string
  format?: (v: number) => string
}

const pct = (v: number) => `${Math.round(v * 100)}%`
const x = (v: number) => `×${v.toFixed(2)}`

export const PARAM_DEFS: ParamDef[] = [
  { key: 'fruitGrowth', label: 'Fruit growth speed', group: 'garden', min: 0.02, max: 0.5, step: 0.01, hint: 'How fast a new fruit swells from bud to ripe.', format: (v) => `${(1 / v).toFixed(1)}s to ripen` },
  { key: 'fruitLimit', label: 'Fruit limit', group: 'garden', min: 1, max: 12, step: 1, unit: 'per tree', hint: 'The most fruit one tree can carry at once.' },
  { key: 'fruitDelay', label: 'Fruit return delay', group: 'garden', min: 0, max: 40, step: 0.5, unit: 's', hint: 'How long an empty stem rests before a new fruit starts.' },

  { key: 'blueEnergyUse', label: 'Energy use', group: 'blue', min: 0.3, max: 2.5, step: 0.05, hint: 'Energy burned per second moving and waiting.', format: x },
  { key: 'blueSpeed', label: 'Speed', group: 'blue', min: 0.8, max: 5, step: 0.1, unit: 'u/s', hint: 'Top speed. Faster costs more energy per second.' },
  { key: 'blueVision', label: 'Vision', group: 'blue', min: 2, max: 18, step: 0.5, unit: 'u', hint: 'How far a blue blob can spot fruit and red blobs.' },
  { key: 'blueCopyAt', label: 'Copy threshold', group: 'blue', min: 35, max: 98, step: 1, unit: 'energy', hint: 'Stored energy needed to split into two blobs.' },
  { key: 'blueEatTime', label: 'Eating time', group: 'blue', min: 0.2, max: 6, step: 0.1, unit: 's', hint: 'How long a blob chews one fruit (it cannot move meanwhile).' },

  { key: 'redEnergyUse', label: 'Energy use', group: 'red', min: 0.3, max: 2.5, step: 0.05, hint: 'Energy burned per second moving and waiting.', format: x },
  { key: 'redSpeed', label: 'Speed', group: 'red', min: 0.8, max: 5, step: 0.1, unit: 'u/s', hint: 'Top speed while chasing. Faster costs more energy.' },
  { key: 'redVision', label: 'Vision', group: 'red', min: 2, max: 18, step: 0.5, unit: 'u', hint: 'How far a red blob can spot blue blobs.' },
  { key: 'redContact', label: 'Contact strength', group: 'red', min: 5, max: 100, step: 1, unit: 'energy', hint: 'Glow a red blob draws from a blue blob per boop. A blue blob at zero fades.' },
  { key: 'redCopyAt', label: 'Copy threshold', group: 'red', min: 35, max: 98, step: 1, unit: 'energy', hint: 'Stored energy needed to split into two blobs.' },
  { key: 'redPause', label: 'Pause time', group: 'red', min: 0.2, max: 12, step: 0.1, unit: 's', hint: 'Rest after each boop. Blue blobs ignore resting reds.' },

  { key: 'trees', label: 'Starting fruit trees', group: 'world', min: 2, max: 40, step: 1, onReset: true, hint: 'Trees planted when the garden resets.' },
  { key: 'blue0', label: 'Starting blue blobs', group: 'world', min: 0, max: 200, step: 1, onReset: true, hint: 'Blue blobs placed when the garden resets.' },
  { key: 'red0', label: 'Starting red blobs', group: 'world', min: 0, max: 100, step: 1, onReset: true, hint: 'Red blobs placed when the garden resets.' },
  { key: 'worldSize', label: 'World size', group: 'world', min: 12, max: 40, step: 1, unit: 'u radius', onReset: true, hint: 'Radius of the garden dish.' },
  { key: 'mutation', label: 'Trait wobble', group: 'world', min: 0, max: 0.2, step: 0.01, hint: 'How much speed and vision drift from parent to copy.', format: pct },
  { key: 'seed', label: 'Random seed', group: 'world', min: 1, max: 99999, step: 1, onReset: true, hint: 'Same seed + same settings = the same story.' },
]

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 0.12,
  fruitLimit: 6,
  fruitDelay: 6,
  blueEnergyUse: 1,
  blueSpeed: 2.2,
  blueVision: 7,
  blueCopyAt: 70,
  blueEatTime: 1.5,
  redEnergyUse: 1,
  redSpeed: 2.6,
  redVision: 8,
  redContact: 50,
  redCopyAt: 80,
  redPause: 4,
  trees: 14,
  blue0: 40,
  red0: 8,
  worldSize: 26,
  seed: 7,
  mutation: 0.05,
}

export interface Preset {
  id: string
  name: string
  blurb: string
  params: Params
}

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced garden',
    blurb: 'Blue and red take turns rising and falling.',
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: 'rich',
    name: 'Fruit-rich garden',
    blurb: 'Fast, heavy fruit. Blue blobs boom first.',
    params: { ...DEFAULT_PARAMS, fruitGrowth: 0.3, fruitLimit: 9, fruitDelay: 2, trees: 18, blue0: 20, red0: 4 },
  },
  {
    id: 'redheavy',
    name: 'Red-heavy garden',
    blurb: 'Too many reds: blue dips first, red fades later.',
    params: { ...DEFAULT_PARAMS, blue0: 40, red0: 45 },
  },
  {
    id: 'fragile',
    name: 'Fragile balance',
    blurb: 'Big swings on a knife edge. Either side can blink out.',
    params: { ...DEFAULT_PARAMS, redContact: 70, redPause: 1.5, redVision: 10, red0: 10 },
  },
  {
    id: 'lowfruit',
    name: 'Low-fruit garden',
    blurb: 'Sparse, slow fruit keeps everyone few. Reds struggle to find enough blues.',
    params: { ...DEFAULT_PARAMS, fruitGrowth: 0.06, fruitLimit: 3, fruitDelay: 14, trees: 8, blue0: 20, red0: 4 },
  },
]
