export type FoodId =
  | "clover"
  | "apple"
  | "carrot"
  | "watermelon"
  | "chili"
  | "cupcake"
  | "golden"
  | "pill";

export type Reaction = "love" | "yum" | "spicy" | "bleh" | "treat";

export interface FoodDef {
  id: FoodId;
  name: string;
  blurb: string;
  level: number;
  hunger: number;
  happy: number;
  health: number;
  hygiene: number;
  energy: number;
  xp: number;
  cooldown: number;
  crumb: string;
}

export const FOODS: Record<FoodId, FoodDef> = {
  clover: {
    id: "clover",
    name: "Clover",
    blurb: "Fresh & crunchy",
    level: 1,
    hunger: 18,
    happy: 3,
    health: 3,
    hygiene: 0,
    energy: 0,
    xp: 5,
    cooldown: 0,
    crumb: "#5dbb63",
  },
  apple: {
    id: "apple",
    name: "Apple",
    blurb: "Sweet & juicy",
    level: 1,
    hunger: 14,
    happy: 7,
    health: 2,
    hygiene: 0,
    energy: 2,
    xp: 5,
    cooldown: 0,
    crumb: "#ff6b6b",
  },
  carrot: {
    id: "carrot",
    name: "Carrot",
    blurb: "Keeps eyes sparkly",
    level: 2,
    hunger: 13,
    happy: 5,
    health: 6,
    hygiene: 0,
    energy: 2,
    xp: 6,
    cooldown: 0,
    crumb: "#ff9f43",
  },
  watermelon: {
    id: "watermelon",
    name: "Watermelon",
    blurb: "Messy. Mysterious.",
    level: 2,
    hunger: 12,
    happy: 12,
    health: 2,
    hygiene: -4,
    energy: 3,
    xp: 7,
    cooldown: 0,
    crumb: "#ff5d73",
  },
  chili: {
    id: "chili",
    name: "Chili",
    blurb: "Spicy energy kick",
    level: 3,
    hunger: 4,
    happy: 8,
    health: 0,
    hygiene: 0,
    energy: 18,
    xp: 8,
    cooldown: 20,
    crumb: "#ff3b30",
  },
  cupcake: {
    id: "cupcake",
    name: "Cupcake",
    blurb: "Pure joy, some sugar",
    level: 4,
    hunger: 8,
    happy: 22,
    health: -3,
    hygiene: 0,
    energy: 4,
    xp: 8,
    cooldown: 25,
    crumb: "#ffb3c7",
  },
  golden: {
    id: "golden",
    name: "Golden Clover",
    blurb: "Legendary luck",
    level: 6,
    hunger: 25,
    happy: 25,
    health: 20,
    hygiene: 0,
    energy: 12,
    xp: 30,
    cooldown: 120,
    crumb: "#ffd54a",
  },
  pill: {
    id: "pill",
    name: "Medicine",
    blurb: "Tastes awful, works great",
    level: 1,
    hunger: 0,
    happy: -3,
    health: 50,
    hygiene: 0,
    energy: 0,
    xp: 10,
    cooldown: 0,
    crumb: "#8ad1ff",
  },
};

export const TRAY_FOODS: FoodId[] = [
  "clover",
  "apple",
  "carrot",
  "watermelon",
  "chili",
  "cupcake",
  "golden",
];

export const FAVORITE_FOOD: FoodId = "watermelon";

export type Slot = "head" | "face" | "neck";
export type AccessoryId =
  | "bell"
  | "flowers"
  | "party"
  | "shades"
  | "straw"
  | "scarf"
  | "crown";

export interface AccessoryDef {
  id: AccessoryId;
  name: string;
  slot: Slot;
  level: number;
}

export const ACCESSORIES: AccessoryDef[] = [
  { id: "bell", name: "Cow Bell", slot: "neck", level: 1 },
  { id: "flowers", name: "Flower Crown", slot: "head", level: 2 },
  { id: "party", name: "Party Hat", slot: "head", level: 3 },
  { id: "shades", name: "Sunnies", slot: "face", level: 4 },
  { id: "straw", name: "Straw Hat", slot: "head", level: 5 },
  { id: "scarf", name: "Cozy Scarf", slot: "neck", level: 6 },
  { id: "crown", name: "Royal Crown", slot: "head", level: 8 },
];

export interface StageDef {
  name: string;
  minLevel: number;
  scale: number;
  head: number;
}

export const STAGES: StageDef[] = [
  { name: "Calf", minLevel: 1, scale: 0.74, head: 1.12 },
  { name: "Young", minLevel: 3, scale: 0.88, head: 1.05 },
  { name: "Grown", minLevel: 6, scale: 1, head: 1 },
];

export function stageIndexFor(level: number): number {
  let idx = 0;
  STAGES.forEach((s, i) => {
    if (level >= s.minLevel) idx = i;
  });
  return idx;
}

export function xpForLevel(level: number): number {
  return 30 + level * 20;
}

export function unlocksAt(level: number): string[] {
  const foods = TRAY_FOODS.filter((f) => FOODS[f].level === level).map(
    (f) => FOODS[f].name,
  );
  const acc = ACCESSORIES.filter((a) => a.level === level).map((a) => a.name);
  return [...foods, ...acc];
}

export type StatKey = "hunger" | "happy" | "energy" | "hygiene" | "health";

export const STAT_META: Record<
  StatKey,
  { label: string; color: string; low: string }
> = {
  hunger: { label: "Fullness", color: "#ffb454", low: "is hungry" },
  happy: { label: "Joy", color: "#ff7eb3", low: "is bored" },
  energy: { label: "Energy", color: "#7aa8ff", low: "is sleepy" },
  hygiene: { label: "Hygiene", color: "#5fd0c9", low: "needs a bath" },
  health: { label: "Health", color: "#7ed67a", low: "feels unwell" },
};
