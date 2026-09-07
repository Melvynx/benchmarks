export type Species = "blue" | "red";

export type Action =
  | "wander"
  | "seek-fruit"
  | "eat"
  | "flee"
  | "crowded"
  | "hide"
  | "hunt"
  | "rest";

export const ACTION_LABEL: Record<Action, string> = {
  wander: "Wandering",
  "seek-fruit": "Heading to fruit",
  eat: "Eating fruit",
  flee: "Fleeing a red blob",
  hide: "Hiding under a tree",
  crowded: "Leaving the crowd",
  hunt: "Chasing a blue blob",
  rest: "Resting after contact",
};

export interface Traits {
  /** Multipliers on the group-wide sliders; inherited with small mutations. */
  speed: number;
  vision: number;
  /** Derived at birth from speed + vision: bigger bodies burn more. */
  metabolism: number;
}

export interface Blob {
  id: number;
  species: Species;
  x: number;
  y: number;
  vx: number;
  vy: number;
  heading: number;
  energy: number;
  maxEnergy: number;
  age: number;
  maxAge: number;
  action: Action;
  /** Remaining seconds of the current eat / rest animation. */
  timer: number;
  timerTotal: number;
  targetTree: number;
  targetBlob: number;
  reproCooldown: number;
  /** Red only: seconds spent on the current chase, and how long it will persist. */
  chase: number;
  patience: number;
  /** Red only: a blob it just failed to catch and will skip for a while. */
  ignoreId: number;
  ignoreTime: number;
  traits: Traits;
  generation: number;
  parent: number;
  children: number;
  meals: number;
  /** Blue only: tucked under a canopy, where reds cannot pick it out. */
  hidden: boolean;
  /** Set when a red contact drained this blob to zero, for cause-of-death stats. */
  takenByRed: boolean;
  /** Purely cosmetic state, advanced by the sim so it stays deterministic. */
  bounce: number;
  blink: number;
  glow: number;
  squash: number;
}

export interface Tree {
  id: number;
  x: number;
  y: number;
  fruit: number;
  /** Progress toward the next fruit, 0..1. */
  grow: number;
  /** Seconds left before regrowth resumes after a pick. */
  delay: number;
  /** Number of blobs currently committed to eating here. */
  claimed: number;
  /** Blues sheltering under this canopy this step (capped). */
  shelter: number;
  scale: number;
  kind: number;
  seedAngle: number;
  pop: number;
}

export interface SimEvent {
  type: "eat" | "contact" | "birth" | "death";
  x: number;
  y: number;
  species: Species;
  id: number;
}

export interface HistorySample {
  t: number;
  fruit: number;
  blue: number;
  red: number;
  blueEnergy: number;
  redEnergy: number;
  blueSpeed: number;
  blueVision: number;
  redSpeed: number;
  redVision: number;
  births: number;
  deaths: number;
}
