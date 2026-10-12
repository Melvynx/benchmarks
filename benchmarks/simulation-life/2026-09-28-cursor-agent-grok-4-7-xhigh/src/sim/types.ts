export type Kind = 'blue' | 'red'

export type Action =
  | 'wander'
  | 'seek-fruit'
  | 'eat'
  | 'avoid'
  | 'flee'
  | 'seek-blue'
  | 'contact'
  | 'pause'

export type Params = {
  fruitGrowth: number
  fruitLimit: number
  fruitDelay: number
  blueEnergyUse: number
  blueSpeed: number
  blueVision: number
  blueCopy: number
  blueEatTime: number
  redEnergyUse: number
  redSpeed: number
  redVision: number
  redContact: number
  redCopy: number
  redPause: number
  startTrees: number
  startBlue: number
  startRed: number
  worldSize: number
  seed: number
  simSpeed: number
}

export type Baked = {
  startTrees: number
  startBlue: number
  startRed: number
  worldSize: number
  seed: number
}

export type Fruit = {
  id: number
  treeId: number
  index: number
  lx: number
  ly: number
  lz: number
  x: number
  z: number
  growth: number
  delay: number
  reservedBy: number | null
}

export type Tree = {
  id: number
  x: number
  z: number
  yaw: number
  scale: number
  fruits: Fruit[]
}

export type Agent = {
  id: number
  kind: Kind
  x: number
  z: number
  vx: number
  vz: number
  energy: number
  age: number
  action: Action
  detail: string
  timer: number
  timerMax: number
  targetFruit: number | null
  targetAgent: number | null
  contactCd: number
  birthCd: number
  wanderT: number
  wanderAngle: number
  chaseStall: number
  chaseDist: number
  ignoreId: number | null
  ignoreUntil: number
  generation: number
  parentId: number | null
  bornTick: number
  traitSpeed: number
  traitVision: number
  traitMetabolism: number
  phase: number
  hue: number
  scale: number
}

export type SimEvent =
  | { kind: 'eat'; x: number; z: number }
  | { kind: 'contact'; x: number; z: number }
  | { kind: 'born'; x: number; z: number; group: Kind }
  | { kind: 'fade'; x: number; z: number; group: Kind }

export type Sample = {
  tick: number
  fruit: number
  ripe: number
  blue: number
  red: number
  blueSpeed: number | null
  redSpeed: number | null
  blueVision: number | null
  redVision: number | null
  blueMetabolism: number | null
  redMetabolism: number | null
}

export type World = {
  epoch: number
  params: Params
  baked: Baked
  radius: number
  tick: number
  rng: () => number
  trees: Tree[]
  agents: Agent[]
  nextId: number
  nextFruitId: number
  history: Sample[]
  sampleStride: number
  events: SimEvent[]
  bornBlue: number
  bornRed: number
  diedBlue: number
  diedRed: number
  hitCap: boolean
}

export const ACTION_LABELS: Record<Action, string> = {
  wander: 'Wandering',
  'seek-fruit': 'Looking for fruit',
  eat: 'Eating',
  avoid: 'Avoiding the crowd',
  flee: 'Moving away from red blobs',
  'seek-blue': 'Looking for a blue blob',
  contact: 'Gentle contact',
  pause: 'Pausing after contact',
}
