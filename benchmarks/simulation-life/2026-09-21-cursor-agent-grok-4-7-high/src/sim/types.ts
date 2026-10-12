export type Group = 'blue' | 'red'

export type Action =
  | 'wander'
  | 'seek'
  | 'gather'
  | 'avoid'
  | 'flee'
  | 'eat'
  | 'digest'
  | 'hunt'
  | 'contact'
  | 'rest'
  | 'birth'

export type Traits = {
  speed: number
  vision: number
  thrift: number
}

export type FruitSlot = {
  x: number
  y: number
  z: number
  r: number
  pop: number
}

export type Tree = {
  id: number
  x: number
  y: number
  scale: number
  fruit: number
  growth: number
  delay: number
  slots: FruitSlot[]
  leanSeed: number
}

export type Blob = {
  id: number
  group: Group
  x: number
  y: number
  vx: number
  vy: number
  energy: number
  age: number
  lifespan: number
  action: Action
  actionTimer: number
  actionTotal: number
  copyCooldown: number
  immunity: number
  panic: number
  sheltered: boolean
  crowding: number
  traits: Traits
  generation: number
  parentId: number
  children: number
  meals: number
  phase: number
  blinkTimer: number
  blinkFor: number
  squash: number
  glow: number
  face: number
  targetTree: number
  targetBlob: number
}

export type Spark = {
  kind: 'eat' | 'contact' | 'birth' | 'death' | 'ripen'
  x: number
  y: number
  z: number
  life: number
  max: number
  tint: 'blue' | 'red' | 'fruit'
}

export type Decor = {
  x: number
  y: number
  kind: 'tuft' | 'pebble' | 'flower' | 'moss'
  rot: number
  scale: number
  tint: number
}

export type Totals = {
  births: Record<Group, number>
  deaths: Record<Group, number>
  starved: Record<Group, number>
  aged: Record<Group, number>
  fruitEaten: number
  contacts: number
}

export type World = {
  t: number
  steps: number
  radius: number
  trees: Tree[]
  blobs: Blob[]
  nextId: number
  sparks: Spark[]
  decor: Decor[]
  counts: { fruit: number; blue: number; red: number }
  totals: Totals
  capReached: boolean
}

export type Sample = {
  t: number
  fruit: number
  blue: number
  red: number
  blueSpeed: number | null
  redSpeed: number | null
  blueVision: number | null
  redVision: number | null
}
