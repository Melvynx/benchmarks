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

/**
 * Balanced garden. Enough trees that blue can hide and feed, enough red
 * that they matter, slow enough fruit that overshoot is possible.
 */
export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 0.11,
  fruitLimit: 4,
  fruitDelay: 6,
  blueUpkeep: 2.6,
  blueSpeed: 28,
  blueVision: 92,
  blueCopy: 86,
  blueEatTime: 1.5,
  redUpkeep: 1.4,
  redSpeed: 33,
  redVision: 52,
  redStrength: 13,
  redCopy: 80,
  redPause: 3.8,
  trees: 20,
  blueStart: 32,
  redStart: 12,
  worldSize: 400,
  seed: 13082026,
}

export const PARAM_GROUPS: { title: string; caption: string; specs: ParamSpec[] }[] = [
  {
    title: 'Fruit',
    caption: 'How the plants refill',
    specs: [
      {
        key: 'fruitGrowth',
        label: 'Growth speed',
        min: 0.02,
        max: 0.4,
        step: 0.01,
        unit: '/s',
        hint: 'How fast a picked berry ripens once its delay is over.',
      },
      {
        key: 'fruitLimit',
        label: 'Fruit limit',
        min: 1,
        max: 12,
        step: 1,
        integer: true,
        hint: 'Ripe berries one plant can hold. Caps stored food.',
      },
      {
        key: 'fruitDelay',
        label: 'Return delay',
        min: 0,
        max: 24,
        step: 0.5,
        unit: 's',
        hint: 'Wait after a berry is taken before it starts growing again.',
      },
    ],
  },
  {
    title: 'Blue blobs',
    caption: 'They eat fruit and dodge red',
    specs: [
      {
        key: 'blueUpkeep',
        label: 'Energy use',
        min: 0.4,
        max: 8,
        step: 0.1,
        unit: '/s',
        hint: 'Energy spent per second at a full run. Waiting costs about a quarter.',
      },
      { key: 'blueSpeed', label: 'Speed', min: 6, max: 55, step: 1, hint: 'Top travel speed. Faster movement burns more energy.' },
      { key: 'blueVision', label: 'Vision', min: 18, max: 180, step: 2, hint: 'How far a blue blob can see fruit and red blobs.' },
      { key: 'blueCopy', label: 'Copy threshold', min: 40, max: 160, step: 1, hint: 'Energy a blue blob needs before it can split.' },
      {
        key: 'blueEatTime',
        label: 'Eating time',
        min: 0.2,
        max: 5,
        step: 0.05,
        unit: 's',
        hint: 'Chew pause. A chewing blob cannot eat again until this ends.',
      },
    ],
  },
  {
    title: 'Red blobs',
    caption: 'They live off gentle contact',
    specs: [
      { key: 'redUpkeep', label: 'Energy use', min: 0.4, max: 8, step: 0.1, unit: '/s', hint: 'Energy spent per second at a full run.' },
      { key: 'redSpeed', label: 'Speed', min: 6, max: 55, step: 1, hint: 'Top travel speed. Faster than blue means more catches in the open.' },
      { key: 'redVision', label: 'Vision', min: 18, max: 180, step: 2, hint: 'How far a red blob can sense blue blobs.' },
      {
        key: 'redStrength',
        label: 'Contact strength',
        min: 3,
        max: 36,
        step: 1,
        hint: 'Energy a blue blob loses on contact. Red keeps a little more than that.',
      },
      { key: 'redCopy', label: 'Copy threshold', min: 40, max: 180, step: 1, hint: 'Energy a red blob needs before it can split.' },
      {
        key: 'redPause',
        label: 'Pause time',
        min: 0.2,
        max: 10,
        step: 0.1,
        unit: 's',
        hint: 'Rest after a successful contact. Stops red from farming one blob.',
      },
    ],
  },
  {
    title: 'World setup',
    caption: 'Takes effect on reset',
    specs: [
      { key: 'trees', label: 'Starting trees', min: 2, max: 48, step: 1, integer: true, setup: true, hint: 'Fruit plants scattered in the dish.' },
      { key: 'blueStart', label: 'Starting blue', min: 0, max: 80, step: 1, integer: true, setup: true, hint: 'Blue blobs at time zero.' },
      { key: 'redStart', label: 'Starting red', min: 0, max: 50, step: 1, integer: true, setup: true, hint: 'Red blobs at time zero.' },
      { key: 'worldSize', label: 'World size', min: 140, max: 460, step: 10, setup: true, hint: 'Radius of the dish. A bigger dish spreads everyone out.' },
      { key: 'seed', label: 'Random seed', min: 1, max: 99999999, step: 1, integer: true, setup: true, hint: 'Same seed and same knobs replay the same garden.' },
    ],
  },
]

export const PARAM_SPECS: Record<ParamKey, ParamSpec> = Object.fromEntries(
  PARAM_GROUPS.flatMap((g) => g.specs).map((s) => [s.key, s]),
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
      fruitGrowth: 0.22,
      fruitLimit: 7,
      fruitDelay: 2.4,
      trees: 30,
      blueStart: 18,
      redStart: 5,
      redVision: 44,
      redPause: 4.6,
      redCopy: 88,
      seed: 441902,
    },
  },
  {
    id: 'red-heavy',
    name: 'Red-heavy garden',
    blurb: 'Blue dips first, then red fades after.',
    params: {
      ...DEFAULT_PARAMS,
      redStart: 18,
      blueStart: 36,
      redStrength: 15,
      redPause: 3.2,
      redVision: 62,
      redSpeed: 35,
      trees: 16,
      fruitDelay: 7,
      fruitGrowth: 0.09,
      worldSize: 380,
      seed: 70707,
    },
  },
  {
    id: 'fragile',
    name: 'Fragile balance',
    blurb: 'Thin margin. Some seeds collapse.',
    params: {
      ...DEFAULT_PARAMS,
      fruitGrowth: 0.09,
      fruitDelay: 7.5,
      blueUpkeep: 2.9,
      redStrength: 14,
      redPause: 3.3,
      redVision: 58,
      trees: 14,
      worldSize: 360,
      blueStart: 26,
      redStart: 8,
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
      fruitLimit: 2,
      fruitDelay: 10,
      trees: 10,
      blueStart: 11,
      redStart: 3,
      worldSize: 380,
      seed: 191919,
    },
  },
]

export function clampParam(key: ParamKey, value: number): number {
  const spec = PARAM_SPECS[key]
  if (!spec) return value
  const clamped = Math.min(spec.max, Math.max(spec.min, value))
  return spec.integer ? Math.round(clamped) : clamped
}

export function isSetupParam(key: ParamKey): boolean {
  return PARAM_SPECS[key]?.setup === true
}

export function randomizeParams(rngSeed: number): Params {
  const rng = {
    s: (rngSeed >>> 0) || 1,
    next() {
      this.s = (this.s + 0x6d2b79f5) >>> 0
      let t = this.s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    },
  }
  const next = { ...DEFAULT_PARAMS }
  for (const spec of Object.values(PARAM_SPECS)) {
    const u = rng.next()
    const raw = spec.min + u * (spec.max - spec.min)
    next[spec.key] = clampParam(spec.key, spec.integer ? Math.round(raw) : Number(raw.toFixed(2)))
  }
  next.seed = 1 + Math.floor(rng.next() * 99999998)
  return next
}
