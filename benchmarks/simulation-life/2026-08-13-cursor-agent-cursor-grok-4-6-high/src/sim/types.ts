export type Kind = 'blue' | 'red'

export type Action =
  | 'wander'
  | 'seek'
  | 'eat'
  | 'flee'
  | 'avoid'
  | 'gather'
  | 'hunt'
  | 'contact'
  | 'rest'

export type Traits = {
  speed: number
  vision: number
  thrift: number
}

export type Blob = {
  id: number
  kind: Kind
  x: number
  y: number
  px: number
  py: number
  vx: number
  vy: number
  energy: number
  age: number
  lifespan: number
  action: Action
  actionTimer: number
  actionTotal: number
  copyCooldown: number
  targetTree: number
  targetBlob: number
  immunity: number
  panic: number
  sheltered: boolean
  crowding: number
  traits: Traits
  generation: number
  parentId: number
  bornAt: number
  meals: number
  children: number
  phase: number
  blinkTimer: number
  blinkFor: number
  squash: number
  glow: number
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

export type EffectKind = 'eat' | 'contact' | 'birth' | 'death' | 'ripen'

export type Effect = {
  kind: EffectKind
  x: number
  y: number
  z: number
  life: number
  maxLife: number
  color: Kind | 'fruit'
  seed: number
}

export type Counts = {
  fruit: number
  blue: number
  red: number
}

export type World = {
  t: number
  steps: number
  radius: number
  trees: Tree[]
  blobs: Blob[]
  nextId: number
  effects: Effect[]
  counts: Counts
  totals: {
    births: { blue: number; red: number }
    deaths: { blue: number; red: number }
    starved: { blue: number; red: number }
    aged: { blue: number; red: number }
    fruitEaten: number
    contacts: number
  }
  extinct: { blue: number | null; red: number | null }
  capReached: boolean
}
