export type Action =
  | "seek-fruit"
  | "eat"
  | "wander"
  | "avoid-crowd"
  | "flee"
  | "hunt"
  | "pause"
  | "digest";

export type Params = {
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
  simSpeed: number;
};

export type Sample = {
  t: number;
  fruit: number;
  blue: number;
  red: number;
  blueSpeed: number | null;
  redSpeed: number | null;
  blueVision: number | null;
  redVision: number | null;
};

export type Field = {
  key: keyof Params;
  label: string;
  min: number;
  max: number;
  step: number;
  group: "Garden" | "Blue blobs" | "Red blobs" | "Setup";
  digits: number;
  live: boolean;
};
