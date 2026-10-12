export type Params = {
  fruitGrowth: number
  fruitLimit: number
  fruitDelay: number
  blueUpkeep: number
  blueSpeed: number
  blueVision: number
  blueCopy: number
  blueEatTime: number
  redUpkeep: number
  redSpeed: number
  redVision: number
  redStrength: number
  redCopy: number
  redPause: number
  trees: number
  blueStart: number
  redStart: number
  worldSize: number
  seed: number
}

export type ParamKey = keyof Params

export type ParamSpec = {
  key: ParamKey
  label: string
  min: number
  max: number
  step: number
  unit?: string
  hint: string
  setup?: boolean
  integer?: boolean
}

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 0.13,
  fruitLimit: 6,
  fruitDelay: 4,
  blueUpkeep: 2.6,
  blueSpeed: 24,
  blueVision: 90,
  blueCopy: 78,
  blueEatTime: 1.6,
  redUpkeep: 1.4,
  redSpeed: 29,
  redVision: 50,
  redStrength: 12,
  redCopy: 84,
  redPause: 4,
  trees: 36,
  blueStart: 40,
  redStart: 18,
  worldSize: 440,
  seed: 47021,
}

export const PARAM_GROUPS: { title: string; caption: string; specs: ParamSpec[] }[] = [
  {
    title: 'Fruit',
    caption: 'How the trees feed the dish',
    specs: [
      {
        key: 'fruitGrowth',
        label: 'Fruit growth speed',
        min: 0.01,
        max: 0.3,
        step: 0.005,
        unit: '/s',
        hint: 'How fast a tree ripens the next fruit after the return delay.',
      },
      {
        key: 'fruitLimit',
        label: 'Fruit limit',
        min: 1,
        max: 14,
        step: 1,
        integer: true,
        hint: 'Ripe fruit one tree can hold.',
      },
      {
        key: 'fruitDelay',
        label: 'Fruit return delay',
        min: 0,
        max: 30,
        step: 0.5,
        unit: 's',
        hint: 'Pause after a bite before that tree ripens again.',
      },
    ],
  },
  {
    title: 'Blue blobs',
    caption: 'They live on fruit and slip away from red',
    specs: [
      {
        key: 'blueUpkeep',
        label: 'Blue blob energy use',
        min: 0.5,
        max: 9,
        step: 0.1,
        unit: '/s',
        hint: 'Energy burned per second at full speed. Waiting costs much less.',
      },
      { key: 'blueSpeed', label: 'Blue blob speed', min: 5, max: 55, step: 1, hint: 'Top speed. Faster travel burns more energy.' },
      { key: 'blueVision', label: 'Blue blob vision', min: 20, max: 220, step: 5, hint: 'How far a blue blob notices fruit and nearby red blobs.' },
      { key: 'blueCopy', label: 'Blue blob copy threshold', min: 40, max: 200, step: 1, hint: 'Stored energy required before a blue blob can split.' },
      { key: 'blueEatTime', label: 'Blue blob eating time', min: 0.2, max: 6, step: 0.1, unit: 's', hint: 'Chewing lock. A biting blob stands still.' },
    ],
  },
  {
    title: 'Red blobs',
    caption: 'They live on gentle contact with blue',
    specs: [
      { key: 'redUpkeep', label: 'Red blob energy use', min: 0.5, max: 9, step: 0.1, unit: '/s', hint: 'Energy burned per second at full speed.' },
      { key: 'redSpeed', label: 'Red blob speed', min: 5, max: 55, step: 1, hint: 'Top speed. A bit above blue speed lets red catch blobs in the open.' },
      { key: 'redVision', label: 'Red blob vision', min: 20, max: 220, step: 5, hint: 'How far a red blob can sense a blue blob. Trees shorten this.' },
      {
        key: 'redStrength',
        label: 'Red blob contact strength',
        min: 2,
        max: 40,
        step: 1,
        hint: 'Energy a blue blob loses on contact. Red gains a share of it.',
      },
      { key: 'redCopy', label: 'Red blob copy threshold', min: 40, max: 220, step: 1, hint: 'Stored energy required before a red blob can split.' },
      { key: 'redPause', label: 'Red blob pause time', min: 0.2, max: 12, step: 0.1, unit: 's', hint: 'Rest after contact, so a red blob cannot chain bites.' },
    ],
  },
  {
    title: 'Garden setup',
    caption: 'Applied when you reset',
    specs: [
      { key: 'trees', label: 'Starting fruit trees', min: 1, max: 44, step: 1, integer: true, setup: true, hint: 'Trees scattered in the dish.' },
      { key: 'blueStart', label: 'Starting blue blobs', min: 0, max: 90, step: 1, integer: true, setup: true, hint: 'Blue blobs at the start of a run.' },
      { key: 'redStart', label: 'Starting red blobs', min: 0, max: 60, step: 1, integer: true, setup: true, hint: 'Red blobs at the start of a run.' },
      { key: 'worldSize', label: 'World size', min: 140, max: 460, step: 10, setup: true, hint: 'Radius of the dish. A wider dish spreads everyone out.' },
      { key: 'seed', label: 'Random seed', min: 1, max: 99999999, step: 1, integer: true, setup: true, hint: 'Same seed and settings replay the same garden.' },
    ],
  },
]

export const PARAM_SPECS: Record<ParamKey, ParamSpec> = Object.fromEntries(
  PARAM_GROUPS.flatMap((group) => group.specs).map((spec) => [spec.key, spec]),
) as Record<ParamKey, ParamSpec>

export type Preset = {
  id: string
  name: string
  blurb: string
  params: Params
}

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced garden',
    blurb: 'Both groups persist and take turns rising.',
    params: { ...DEFAULT_PARAMS },
  },
  {
    id: 'fruit-rich',
    name: 'Fruit-rich garden',
    blurb: 'Food everywhere, so blue climbs fast.',
    params: {
      ...DEFAULT_PARAMS,
      fruitGrowth: 0.26,
      fruitLimit: 11,
      fruitDelay: 2,
      trees: 42,
      blueStart: 24,
      redStart: 8,
      redVision: 45,
      seed: 771244,
    },
  },
  {
    id: 'red-heavy',
    name: 'Red-heavy garden',
    blurb: 'A crowd of red. Blue dips first, red fades after.',
    params: {
      ...DEFAULT_PARAMS,
      redStart: 26,
      blueStart: 40,
      redStrength: 18,
      redPause: 3.5,
      redVision: 75,
      trees: 24,
      worldSize: 400,
      fruitDelay: 6,
      seed: 5150,
    },
  },
  {
    id: 'fragile',
    name: 'Fragile balance',
    blurb: 'Wide swings on a thin margin.',
    params: {
      ...DEFAULT_PARAMS,
      fruitGrowth: 0.11,
      fruitDelay: 7,
      blueUpkeep: 3.1,
      blueVision: 100,
      redStrength: 14,
      redPause: 3.2,
      redVision: 60,
      trees: 22,
      worldSize: 380,
      blueStart: 30,
      redStart: 10,
      seed: 424242,
    },
  },
  {
    id: 'low-fruit',
    name: 'Low-fruit garden',
    blurb: 'Thin food keeps every group small.',
    params: {
      ...DEFAULT_PARAMS,
      fruitGrowth: 0.06,
      fruitLimit: 3,
      fruitDelay: 8,
      trees: 14,
      blueStart: 12,
      redStart: 4,
      worldSize: 400,
      seed: 90210,
    },
  },
]

export function clampParam(key: ParamKey, value: number): number {
  const spec = PARAM_SPECS[key]
  const clamped = Math.min(spec.max, Math.max(spec.min, value))
  return spec.integer ? Math.round(clamped) : clamped
}

export function isSetupParam(key: ParamKey): boolean {
  return PARAM_SPECS[key].setup === true
}

export function randomParams(rng: () => number = Math.random): Params {
  const next = { ...DEFAULT_PARAMS }
  for (const spec of Object.values(PARAM_SPECS)) {
    const steps = Math.round((spec.max - spec.min) / spec.step)
    const index = Math.floor(rng() * (steps + 1))
    next[spec.key] = clampParam(spec.key, spec.min + index * spec.step)
  }
  return next
}
