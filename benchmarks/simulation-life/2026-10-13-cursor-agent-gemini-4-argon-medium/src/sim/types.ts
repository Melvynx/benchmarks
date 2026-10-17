export type BlobSpecies = 'blue' | 'red'

export type BlobAction =
  | 'wandering'
  | 'seeking_fruit'
  | 'gathering'
  | 'avoiding_crowd'
  | 'fleeing'
  | 'eating'
  | 'hunting'
  | 'pausing'

export interface SimConfig {
  // Fruit parameters
  fruitGrowthSpeed: number // 0.2 to 3.0 (multiplier on regrowth rate)
  fruitLimit: number // 10 to 160 (max total ripe fruit in garden)
  fruitReturnDelay: number // 1.0 to 16.0 seconds before eaten slot can start regrowing

  // Blue blob parameters
  blueEnergyUse: number // 1.5 to 12.0 energy/sec base burn
  blueSpeed: number // 15 to 75 units/sec
  blueVision: number // 30 to 160 units sensing radius
  blueCopyThreshold: number // 60 to 180 energy needed to reproduce
  blueEatTime: number // 0.4 to 4.0 seconds pause while eating fruit

  // Red blob parameters
  redEnergyUse: number // 1.5 to 12.0 energy/sec base burn
  redSpeed: number // 15 to 85 units/sec
  redVision: number // 35 to 180 units sensing radius
  redContactStrength: number // 15 to 90 energy drained/gained on contact
  redCopyThreshold: number // 70 to 200 energy needed to reproduce
  redPauseTime: number // 0.6 to 5.0 seconds pause after contact interaction

  // World & Initial setup
  startingTrees: number // 3 to 28 trees
  startingBlue: number // 2 to 60 blue blobs
  startingRed: number // 0 to 40 red blobs
  worldSize: number // 150 to 300 world radius
  seed: number // integer seed
}

export interface FruitSlot {
  id: string
  localAngle: number
  localRadius: number
  localHeight: number
  state: 'ripe' | 'being_eaten' | 'cooldown' | 'regrowing'
  cooldownRemaining: number // seconds left before regrowing starts
  growProgress: number // 0..1
  eatenByBlobId: string | null
}

export interface TreeEntity {
  id: string
  x: number
  y: number
  canopyRadius: number
  trunkHeight: number
  hueShift: number
  slots: FruitSlot[]
}

export interface BlobTraits {
  speedTrait: number // multiplier around 1.0
  visionTrait: number // multiplier around 1.0
  sizeTrait: number // visual & slight capacity trait around 1.0
}

export interface BlobEntity {
  id: string
  name: string
  species: BlobSpecies
  x: number
  y: number
  vx: number
  vy: number
  heading: number
  energy: number
  maxEnergy: number
  age: number // seconds alive
  generation: number
  parentId: string | null
  childrenCount: number
  fruitsEaten: number
  contactsMade: number
  action: BlobAction
  actionTimer: number // seconds left in eating or pausing animation
  actionDuration: number // total duration of current eating or pausing animation
  targetId: string | null // tree id or blob id
  graceTimer: number // brief immunity after being contacted
  reproCooldown: number
  wanderAngle: number
  bouncePhase: number
  blinkTimer: number
  isBlinking: number
  traits: BlobTraits
}

export interface SimEffect {
  id: string
  type: 'eat' | 'contact' | 'birth_blue' | 'birth_red' | 'fade'
  x: number
  y: number
  age: number
  duration: number
}

export interface HistoryPoint {
  time: number
  fruitCount: number
  regrowingFruitCount: number
  blueCount: number
  redCount: number
  avgBlueSpeed: number
  avgBlueVision: number
  avgRedSpeed: number
  avgRedVision: number
  avgBlueEnergy: number
  avgRedEnergy: number
}

export interface SimSummary {
  headline: string
  detail: string
  regime: 'balanced' | 'boom_bust' | 'blue_dominant' | 'small_garden' | 'red_collapse' | 'collapsed' | 'warming_up'
  waveCount: number
  peakBlue: number
  peakRed: number
  peakFruit: number
}

export interface PresetDefinition {
  id: string
  name: string
  tagline: string
  badge: string
  config: SimConfig
}
