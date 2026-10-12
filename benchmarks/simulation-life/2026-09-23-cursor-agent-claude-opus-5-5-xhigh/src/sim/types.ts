export type Species = "blue" | "red";

export type BlobAction =
  | "wander"
  | "seek"
  | "eat"
  | "wait"
  | "flee"
  | "hide"
  | "startled"
  | "rest"
  | "hunt"
  | "lurk"
  | "chase"
  | "pause"
  | "tired"
  | "lounge"
  | "fade";

export interface Genes {
  speed: number;
  vision: number;
}

export interface Blob {
  id: number;
  species: Species;
  name: string;
  x: number;
  y: number;
  px: number;
  py: number;
  heading: number;
  pheading: number;
  speed: number;
  energy: number;
  age: number;
  action: BlobAction;
  timer: number;
  timerTotal: number;
  thinkIn: number;
  /** Tree id for blue (seek/eat/wait), blue blob id for red (chase). */
  targetId: number;
  targetSlot: number;
  fleeX: number;
  fleeY: number;
  wanderAngle: number;
  homeTree: number;
  genes: Genes;
  generation: number;
  parentId: number;
  founderId: number;
  children: number;
  bornAt: number;
  lastFleeAt: number;
  /** Blue only: last time a red was in sight; drives how long it stays hidden. */
  lastThreatAt: number;
  /** Seconds spent on the current chase (red only). */
  chaseFor: number;
  /** Blue only: tucked under a tree canopy where reds cannot spot it. */
  sheltered: boolean;
  /** Seconds of visual "glow" left after a meal or contact. */
  glow: number;
  fadeCause: "hungry" | "contact" | null;
  contacts: number;
  meals: number;
}

export interface FruitSlot {
  growth: number;
  cooldown: number;
  claimedBy: number;
  eatProgress: number;
}

export interface Tree {
  id: number;
  x: number;
  y: number;
  scale: number;
  slots: FruitSlot[];
  meals: number;
}

export type SimEvent =
  | { type: "birth"; id: number; parentId: number; species: Species; x: number; y: number }
  | { type: "eatStart"; blobId: number; treeId: number; slot: number }
  | { type: "eatDone"; blobId: number; treeId: number; slot: number; x: number; y: number }
  | { type: "contact"; redId: number; blueId: number; x: number; y: number; drained: number; faded: boolean }
  | { type: "fade"; id: number; species: Species; x: number; y: number; cause: "hungry" | "contact" }
  | { type: "flee"; id: number; x: number; y: number }
  | { type: "ripe"; treeId: number; slot: number };

export interface Counters {
  bornBlue: number;
  bornRed: number;
  fadedBlueHungry: number;
  fadedBlueContact: number;
  fadedRed: number;
  contacts: number;
  fruitEaten: number;
  blueMax: number;
  blueMaxAt: number;
  redMax: number;
  redMaxAt: number;
  blueGoneAt: number | null;
  redGoneAt: number | null;
  maxGeneration: number;
  capped: boolean;
}
