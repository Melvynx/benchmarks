export type Kind = 'blue' | 'red'

/** What a blob is doing right now. Drives both behaviour and the inspector. */
export type Action =
  | 'wander'
  | 'seek' // blue: heading for a tree with fruit
  | 'eat' // blue: locked, chewing
  | 'flee' // blue: a red blob is too close
  | 'avoid' // blue: shoving out of a crowded patch
  | 'gather' // blue: drifting toward a tree with nothing ripe yet
  | 'hunt' // red: closing on a blue blob
  | 'contact' // red: locked, the contact moment
  | 'rest' // red: locked, resting it off

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
  /** Position at the start of the current step, for render interpolation. */
  px: number
  py: number
  vx: number
  vy: number
  energy: number
  age: number
  lifespan: number
  action: Action
  /** Seconds left on a locked action (eat / contact / rest). 0 when free. */
  actionTimer: number
  actionTotal: number
  copyCooldown: number
  targetTree: number
  targetBlob: number
  /** Blue only: grace period after a contact. Red cannot touch it again yet. */
  immunity: number
  /** Blue only: startled burst of speed and nerve after a contact. */
  panic: number
  /** Blue only: tucked under a canopy, so red has to be close to notice it. */
  sheltered: boolean
  /** Red only: how many other red blobs are working the same patch. */
  crowding: number
  traits: Traits
  generation: number
  parentId: number
  bornAt: number
  /** Fruit eaten (blue) or contacts made (red). */
  meals: number
  children: number
  // Presentation only — never read by the rules.
  phase: number
  blinkTimer: number
  blinkFor: number
  squash: number
  glow: number
}

export type Tree = {
  id: number
  x: number
  y: number
  scale: number
  /** Whole fruit hanging on the tree right now. */
  fruit: number
  /** Progress toward the next fruit, 0..1. */
  growth: number
  /** Seconds before ripening resumes after a pick. */
  delay: number
  anchors: { x: number; y: number; z: number; r: number }[]
  /** Per-anchor pop-in scale, 0..1. */
  pop: number[]
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
  /** Running tallies, useful for the summary. */
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
