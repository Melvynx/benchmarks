export type Kind = 'blue' | 'red'

export type Action =
  | 'wander'
  | 'seek-fruit'
  | 'gather'
  | 'eat'
  | 'flee'
  | 'avoid'
  | 'hunt'
  | 'contact'
  | 'rest'

export type Traits = {
  speed: number
  vision: number
  nerve: number
}

export type Berry = {
  angle: number
  lift: number
  spread: number
  ripe: boolean
  cool: number
  grow: number
  size: number
}

export type Blob = {
  id: number
  kind: Kind
  x: number
  y: number
  vx: number
  vy: number
  heading: number
  energy: number
  age: number
  action: Action
  actionTimer: number
  actionTotal: number
  copyCool: number
  targetTree: number
  targetBlob: number
  targetBerry: number
  immunity: number
  traits: Traits
  generation: number
  parentId: number
  family: number
  meals: number
  children: number
  phase: number
  blink: number
  blinkFor: number
  squash: number
  glow: number
  hop: number
}

export type Tree = {
  id: number
  x: number
  y: number
  scale: number
  lean: number
  berries: Berry[]
  canopy: number
}

export type Spark = {
  kind: 'eat' | 'contact' | 'birth' | 'pop'
  x: number
  y: number
  z: number
  life: number
  max: number
  hue: Kind | 'fruit'
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
  sparks: Spark[]
  nextId: number
  counts: Counts
  totals: {
    births: Counts
    deaths: Counts
    eaten: number
    contacts: number
  }
  extinctAt: { blue: number | null; red: number | null }
  peaked: boolean
}

export const ACTIONS: Record<Action, string> = {
  wander: 'wandering',
  'seek-fruit': 'looking for fruit',
  gather: 'near a plant',
  eat: 'chewing',
  flee: 'dodging red',
  avoid: 'giving space',
  hunt: 'looking for blue',
  contact: 'a gentle bump',
  rest: 'resting after contact',
}
