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
 * Balanced garden. A wide, well-treed dish gives blue blobs canopy cover so
 * red cannot vacuum the whole group in one pass. Spatial lag between corners
 * is what keeps the waves from lining up and wiping a side out.
 */
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
  seed: 20260813,
}

export const PARAM_GROUPS: { title: string; caption: string; specs: ParamSpec[] }[] = [
  {
    title: 'Fruit',
    caption: 'How fast the garden feeds itself',
    specs: [
      {
        key: 'fruitGrowth',
        label: 'Growth speed',
        min: 0.01,
        max: 0.3,
        step: 0.005,
        unit: '/s',
        hint: 'Fruit ripening rate on every tree. The tap that feeds the whole garden.',
      },
      {
        key: 'fruitLimit',
        label: 'Fruit limit',
        min: 1,
        max: 14,
        step: 1,
        integer: true,
        hint: 'How much fruit one tree can hold. Sets the ceiling on stored food.',
      },
      {
        key: 'fruitDelay',
        label: 'Return delay',
        min: 0,
        max: 30,
        step: 0.5,
        unit: 's',
        hint: 'Pause before a picked tree starts ripening again.',
      },
    ],
  },
  {
    title: 'Blue blobs',
    caption: 'They eat fruit and flee red',
    specs: [
      {
        key: 'blueUpkeep',
        label: 'Energy use',
        min: 0.5,
        max: 9,
        step: 0.1,
        unit: '/s',
        hint: 'Energy burnt per second at full sprint. Standing still costs under a third of it.',
      },
      { key: 'blueSpeed', label: 'Speed', min: 5, max: 55, step: 1, hint: 'Top travel speed. Faster blobs burn more energy per step.' },
      { key: 'blueVision', label: 'Vision', min: 20, max: 220, step: 5, hint: 'How far a blue blob can spot fruit and danger.' },
      { key: 'blueCopy', label: 'Copy threshold', min: 40, max: 200, step: 1, hint: 'Energy needed before a blue blob splits into two.' },
      { key: 'blueEatTime', label: 'Eating time', min: 0.2, max: 6, step: 0.1, unit: 's', hint: 'Chewing time. A chewing blob is standing still and easy to reach.' },
    ],
  },
  {
    title: 'Red blobs',
    caption: 'They live off contact with blue',
    specs: [
      { key: 'redUpkeep', label: 'Energy use', min: 0.5, max: 9, step: 0.1, unit: '/s', hint: 'Energy burnt per second at full speed.' },
      { key: 'redSpeed', label: 'Speed', min: 5, max: 55, step: 1, hint: 'Top travel speed. Above blue speed, red catches blue in the open.' },
      { key: 'redVision', label: 'Vision', min: 20, max: 220, step: 5, hint: 'How far a red blob can sense blue blobs.' },
      {
        key: 'redStrength',
        label: 'Contact strength',
        min: 2,
        max: 40,
        step: 1,
        hint: 'Energy a blue blob loses per contact. Red keeps a little over half again as much.',
      },
      { key: 'redCopy', label: 'Copy threshold', min: 40, max: 220, step: 1, hint: 'Energy needed before a red blob splits into two.' },
      { key: 'redPause', label: 'Pause time', min: 0.2, max: 12, step: 0.1, unit: 's', hint: 'Rest after a contact. Long pauses stop red from farming one blob.' },
    ],
  },
  {
    title: 'World setup',
    caption: 'Applied on reset',
    specs: [
      { key: 'trees', label: 'Starting trees', min: 1, max: 44, step: 1, integer: true, setup: true, hint: 'Fruit trees scattered across the dish.' },
      { key: 'blueStart', label: 'Starting blue', min: 0, max: 90, step: 1, integer: true, setup: true, hint: 'Blue blobs placed at time zero.' },
      { key: 'redStart', label: 'Starting red', min: 0, max: 60, step: 1, integer: true, setup: true, hint: 'Red blobs placed at time zero.' },
      { key: 'worldSize', label: 'World size', min: 140, max: 460, step: 10, setup: true, hint: 'Radius of the dish. A bigger dish spreads everyone out.' },
      { key: 'seed', label: 'Random seed', min: 1, max: 99999999, step: 1, integer: true, setup: true, hint: 'Same seed and same settings replay the exact same garden.' },
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
    blurb: 'Food everywhere, so blue climbs fast and high.',
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
    blurb: 'A crowd of hungry red. Blue dips first, red fades after.',
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
    blurb: 'Big swings on a thin margin. Some seeds collapse.',
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
    blurb: 'Thin food supply keeps every group small.',
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
  if (!spec) return value
  const clamped = Math.min(spec.max, Math.max(spec.min, value))
  return spec.integer ? Math.round(clamped) : clamped
}

export function isSetupParam(key: ParamKey): boolean {
  return PARAM_SPECS[key]?.setup === true
}
