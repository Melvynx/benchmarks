export interface Params {
  fruitGrowth: number
  fruitLimit: number
  fruitDelay: number

  blueUse: number
  blueSpeed: number
  blueVision: number
  blueCopy: number
  blueEatTime: number

  redUse: number
  redSpeed: number
  redVision: number
  redStrength: number
  redCopy: number
  redPause: number

  mutation: number

  trees: number
  startBlue: number
  startRed: number
  worldSize: number
  seed: number
}

export const STRUCTURAL_KEYS: (keyof Params)[] = ['trees', 'startBlue', 'startRed', 'worldSize', 'seed']

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 0.15,
  fruitLimit: 7,
  fruitDelay: 2.5,

  blueUse: 1.0,
  blueSpeed: 2.4,
  blueVision: 8,
  blueCopy: 80,
  blueEatTime: 1.6,

  redUse: 1.3,
  redSpeed: 3.1,
  redVision: 6.5,
  redStrength: 20,
  redCopy: 83,
  redPause: 3.6,

  mutation: 0.02,

  trees: 28,
  startBlue: 90,
  startRed: 14,
  worldSize: 32,
  seed: 7,
}

export interface Preset {
  id: string
  name: string
  emoji: string
  blurb: string
  params: Partial<Params>
}

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced garden',
    emoji: '🌿',
    blurb: 'Blue and red take gentle turns.',
    params: {},
  },
  {
    id: 'fruit-rich',
    name: 'Fruit-rich garden',
    emoji: '🍏',
    blurb: 'Plenty of fruit, so blue grows fast.',
    params: { fruitGrowth: 0.2, fruitLimit: 9, fruitDelay: 2, trees: 18, startBlue: 50, startRed: 6 },
  },
  {
    id: 'red-heavy',
    name: 'Red-heavy garden',
    emoji: '🍓',
    blurb: 'Lots of red. Blue dips first, red fades later.',
    params: { startBlue: 60, startRed: 34 },
  },
  {
    id: 'fragile',
    name: 'Fragile balance',
    emoji: '🫧',
    blurb: 'Hungry, jumpy, and easily tipped over.',
    params: { fruitGrowth: 0.1, fruitLimit: 5, startBlue: 40, startRed: 14, redStrength: 44, redUse: 1.15, blueSpeed: 2.2 },
  },
  {
    id: 'low-fruit',
    name: 'Low-fruit garden',
    emoji: '🍂',
    blurb: 'Little fruit keeps the whole garden small.',
    params: { fruitGrowth: 0.04, fruitLimit: 3, fruitDelay: 8, trees: 8, startBlue: 24, startRed: 4 },
  },
]

export function presetParams(id: string): Params {
  const p = PRESETS.find((x) => x.id === id)
  return { ...DEFAULT_PARAMS, ...(p ? p.params : {}) }
}
