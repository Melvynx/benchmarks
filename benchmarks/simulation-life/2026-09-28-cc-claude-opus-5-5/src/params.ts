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
  blues: number;
  reds: number;
  worldSize: number;
  seed: number;
}

export type ParamKey = keyof Params;

export interface ParamDef {
  key: ParamKey;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  unit?: string;
  /** Only takes effect when the world is reset. */
  onReset?: boolean;
}

export interface ParamGroup {
  id: string;
  title: string;
  accent: string;
  defs: ParamDef[];
}

export const PARAM_GROUPS: ParamGroup[] = [
  {
    id: 'fruit',
    title: 'Fruit trees',
    accent: 'fruit',
    defs: [
      { key: 'fruitGrowth', label: 'Fruit growth speed', hint: 'How fast a fruit swells to ripeness once it starts growing.', min: 0.02, max: 0.4, step: 0.01, unit: '/s' },
      { key: 'fruitLimit', label: 'Fruit limit', hint: 'Most fruit a single tree can hold at once.', min: 1, max: 12, step: 1, unit: ' per tree' },
      { key: 'fruitDelay', label: 'Fruit return delay', hint: 'Rest time before a picked spot starts growing again.', min: 0, max: 20, step: 0.5, unit: 's' },
    ],
  },
  {
    id: 'blue',
    title: 'Blue blobs',
    accent: 'blue',
    defs: [
      { key: 'blueUse', label: 'Energy use', hint: 'Multiplier on how much energy blues burn waiting and moving.', min: 0.3, max: 2.5, step: 0.05, unit: '×' },
      { key: 'blueSpeed', label: 'Speed', hint: 'Base top speed. Faster blobs burn more energy while moving.', min: 1, max: 7, step: 0.1, unit: ' u/s' },
      { key: 'blueVision', label: 'Vision', hint: 'How far a blue can see fruit and red blobs.', min: 2, max: 14, step: 0.5, unit: ' u' },
      { key: 'blueCopy', label: 'Copy threshold', hint: 'Energy needed to bud a new blue. Budding spends that stored energy.', min: 30, max: 140, step: 1, unit: ' E' },
      { key: 'blueEat', label: 'Eating time', hint: 'How long a blue sits and chews. It cannot move meanwhile.', min: 0.2, max: 5, step: 0.1, unit: 's' },
    ],
  },
  {
    id: 'red',
    title: 'Red blobs',
    accent: 'red',
    defs: [
      { key: 'redUse', label: 'Energy use', hint: 'Multiplier on how much energy reds burn waiting and moving.', min: 0.3, max: 2.5, step: 0.05, unit: '×' },
      { key: 'redSpeed', label: 'Speed', hint: 'Base top speed while roaming or chasing.', min: 1, max: 8, step: 0.1, unit: ' u/s' },
      { key: 'redVision', label: 'Vision', hint: 'How far a red can spot blue blobs.', min: 2, max: 16, step: 0.5, unit: ' u' },
      { key: 'redContact', label: 'Contact strength', hint: 'Energy a red gains from one gentle boop with a blue. The booped blue floats away.', min: 5, max: 80, step: 1, unit: ' E' },
      { key: 'redCopy', label: 'Copy threshold', hint: 'Energy needed to bud a new red.', min: 30, max: 180, step: 1, unit: ' E' },
      { key: 'redPause', label: 'Pause time', hint: 'Rest after each boop. The red cannot chase during this time.', min: 0, max: 8, step: 0.1, unit: 's' },
    ],
  },
  {
    id: 'start',
    title: 'Starting world',
    accent: 'start',
    defs: [
      { key: 'trees', label: 'Fruit trees', hint: 'Number of trees planted.', min: 1, max: 30, step: 1, onReset: true },
      { key: 'blues', label: 'Blue blobs', hint: 'Blues at the start.', min: 0, max: 150, step: 1, onReset: true },
      { key: 'reds', label: 'Red blobs', hint: 'Reds at the start.', min: 0, max: 80, step: 1, onReset: true },
      { key: 'worldSize', label: 'World size', hint: 'Radius of the garden dish.', min: 14, max: 40, step: 1, unit: ' u', onReset: true },
      { key: 'seed', label: 'Random seed', hint: 'Same seed + same settings = same story.', min: 1, max: 9999, step: 1, onReset: true },
    ],
  },
];

export const ALL_DEFS: ParamDef[] = PARAM_GROUPS.flatMap((g) => g.defs);

export const DEFAULTS: Params = {
  fruitGrowth: 0.1,
  fruitLimit: 5,
  fruitDelay: 4,
  blueUse: 1,
  blueSpeed: 3.2,
  blueVision: 6,
  blueCopy: 60,
  blueEat: 1.2,
  redUse: 1,
  redSpeed: 3,
  redVision: 5,
  redContact: 16,
  redCopy: 80,
  redPause: 3,
  trees: 16,
  blues: 40,
  reds: 8,
  worldSize: 30,
  seed: 42,
};

export interface Preset {
  id: string;
  name: string;
  emoji: string;
  blurb: string;
  params: Partial<Params>;
}

export const PRESETS: Preset[] = [
  { id: 'balanced', name: 'Balanced garden', emoji: '🌿', blurb: 'Blues and reds chase each other in slow, repeating waves.', params: {} },
  {
    id: 'rich',
    name: 'Fruit-rich garden',
    emoji: '🍏',
    blurb: 'Fruit everywhere. Blues boom fast; reds race to catch up.',
    params: { fruitGrowth: 0.26, fruitLimit: 9, fruitDelay: 1, trees: 18, reds: 4, blues: 30 },
  },
  {
    id: 'redheavy',
    name: 'Red-heavy garden',
    emoji: '🔴',
    blurb: 'Too many reds. Blues dip first, then hungry reds fade.',
    params: { reds: 45, blues: 40, redPause: 1.2 },
  },
  {
    id: 'fragile',
    name: 'Fragile balance',
    emoji: '🪶',
    blurb: 'Efficient hunters on a thin food supply. Wild swings, close calls.',
    params: { trees: 12, redSpeed: 3.2, redVision: 5.5, redContact: 18, redPause: 2.5, reds: 6 },
  },
  {
    id: 'lowfruit',
    name: 'Low-fruit garden',
    emoji: '🍂',
    blurb: 'Stingy trees keep the whole garden small.',
    params: { fruitGrowth: 0.04, fruitLimit: 3, fruitDelay: 9, trees: 7, blues: 20, reds: 4 },
  },
];

export function presetParams(id: string, seed?: number): Params {
  const pr = PRESETS.find((p) => p.id === id) ?? PRESETS[0];
  return { ...DEFAULTS, ...pr.params, seed: seed ?? DEFAULTS.seed };
}

export function clampParam(def: ParamDef, v: number): number {
  const c = Math.min(def.max, Math.max(def.min, v));
  return Math.round(c / def.step) * def.step;
}
