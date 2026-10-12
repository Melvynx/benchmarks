export interface Params {
  fruitGrowth: number;
  fruitLimit: number;
  fruitDelay: number;

  blueUse: number;
  blueSpeed: number;
  blueVision: number;
  blueCopy: number;
  blueEat: number;

  redUse: number;
  redSpeed: number;
  redVision: number;
  redContact: number;
  redCopy: number;
  redPause: number;

  trees: number;
  blueStart: number;
  redStart: number;
  worldSize: number;
  seed: number;
  speed: number;
}

export type ParamKey = keyof Params;

export interface ParamSpec {
  key: ParamKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  digits?: number;
  /** Changing this value rebuilds the world (it only makes sense at the start). */
  rebuilds?: boolean;
}

export const DEFAULT_PARAMS: Params = {
  fruitGrowth: 1,
  fruitLimit: 5,
  fruitDelay: 8,

  blueUse: 1,
  blueSpeed: 2.6,
  blueVision: 9,
  blueCopy: 95,
  blueEat: 1.6,

  redUse: 1,
  redSpeed: 3.2,
  redVision: 10,
  redContact: 1,
  redCopy: 100,
  redPause: 3,

  trees: 9,
  blueStart: 40,
  redStart: 4,
  worldSize: 24,
  seed: 7,
  speed: 4,
};

export const FRUIT_SPECS: ParamSpec[] = [
  { key: 'fruitGrowth', label: 'Growth speed', hint: 'How fast unripe fruit swells.', min: 0.2, max: 3, step: 0.05, unit: '×', digits: 2 },
  { key: 'fruitLimit', label: 'Fruit limit', hint: 'Most fruit one tree can hold at once.', min: 1, max: 12, step: 1, digits: 0 },
  { key: 'fruitDelay', label: 'Return delay', hint: 'Seconds a tree rests before regrowing eaten fruit.', min: 0, max: 60, step: 1, unit: 's', digits: 0 },
];

export const BLUE_SPECS: ParamSpec[] = [
  { key: 'blueUse', label: 'Energy use', hint: 'How hungry living is for a blue blob.', min: 0.3, max: 2.5, step: 0.05, unit: '×', digits: 2 },
  { key: 'blueSpeed', label: 'Speed', hint: 'Walking speed in garden units per second.', min: 1, max: 6, step: 0.1, unit: 'u/s', digits: 1 },
  { key: 'blueVision', label: 'Vision', hint: 'How far a blue blob can spot fruit and red blobs.', min: 3, max: 20, step: 0.5, unit: 'u', digits: 1 },
  { key: 'blueCopy', label: 'Copy threshold', hint: 'Stored energy needed before making a new blue blob.', min: 50, max: 130, step: 1, digits: 0 },
  { key: 'blueEat', label: 'Eating time', hint: 'Seconds a blue blob is busy chewing (and easy to catch).', min: 0.3, max: 6, step: 0.1, unit: 's', digits: 1 },
];

export const RED_SPECS: ParamSpec[] = [
  { key: 'redUse', label: 'Energy use', hint: 'How hungry living is for a red blob.', min: 0.3, max: 2.5, step: 0.05, unit: '×', digits: 2 },
  { key: 'redSpeed', label: 'Speed', hint: 'Walking speed in garden units per second.', min: 1, max: 7, step: 0.1, unit: 'u/s', digits: 1 },
  { key: 'redVision', label: 'Vision', hint: 'How far a red blob can spot blue blobs.', min: 3, max: 24, step: 0.5, unit: 'u', digits: 1 },
  { key: 'redContact', label: 'Contact strength', hint: 'How much energy a red blob takes from a blue blob per touch.', min: 0.2, max: 2.5, step: 0.05, unit: '×', digits: 2 },
  { key: 'redCopy', label: 'Copy threshold', hint: 'Stored energy needed before making a new red blob.', min: 50, max: 130, step: 1, digits: 0 },
  { key: 'redPause', label: 'Pause time', hint: 'Seconds a red blob rests after a contact.', min: 0, max: 15, step: 0.5, unit: 's', digits: 1 },
];

export const WORLD_SPECS: ParamSpec[] = [
  { key: 'trees', label: 'Starting fruit trees', hint: 'Number of fruit trees planted at reset.', min: 1, max: 30, step: 1, digits: 0, rebuilds: true },
  { key: 'blueStart', label: 'Starting blue blobs', hint: 'Blue blobs at reset.', min: 0, max: 200, step: 1, digits: 0, rebuilds: true },
  { key: 'redStart', label: 'Starting red blobs', hint: 'Red blobs at reset.', min: 0, max: 100, step: 1, digits: 0, rebuilds: true },
  { key: 'worldSize', label: 'World size', hint: 'Radius of the round garden.', min: 12, max: 44, step: 1, unit: 'u', digits: 0, rebuilds: true },
];

export const SPEED_SPEC: ParamSpec = {
  key: 'speed',
  label: 'Simulation speed',
  hint: 'How many simulated seconds pass per real second.',
  min: 0.5,
  max: 40,
  step: 0.5,
  unit: '×',
  digits: 1,
};

export const REBUILD_KEYS: ParamKey[] = ['trees', 'blueStart', 'redStart', 'worldSize', 'seed'];

export interface Preset {
  id: string;
  name: string;
  blurb: string;
  params: Partial<Params>;
}

export const PRESETS: Preset[] = [
  {
    id: 'balanced',
    name: 'Balanced garden',
    blurb: 'Blue and red rise and fall in a lagged dance.',
    params: {},
  },
  {
    id: 'fruit-rich',
    name: 'Fruit-rich garden',
    blurb: 'Plenty of fruit. Blue booms first.',
    params: { fruitGrowth: 1.8, fruitLimit: 8, fruitDelay: 4, trees: 12 },
  },
  {
    id: 'red-heavy',
    name: 'Red-heavy garden',
    blurb: 'Red crowd at the start. Blue dips first, red fades later.',
    params: { redStart: 14, blueStart: 46 },
  },
  {
    id: 'fragile',
    name: 'Fragile balance',
    blurb: 'Quick, touchy reds. Swings get wild and may collapse.',
    params: { redContact: 1.2, redSpeed: 3.4, redVision: 10, redPause: 2 },
  },
  {
    id: 'low-fruit',
    name: 'Low-fruit garden',
    blurb: 'Little fruit keeps the whole garden small.',
    params: { fruitGrowth: 0.7, fruitLimit: 4, fruitDelay: 12, trees: 5, blueStart: 25, redStart: 4 },
  },
];
