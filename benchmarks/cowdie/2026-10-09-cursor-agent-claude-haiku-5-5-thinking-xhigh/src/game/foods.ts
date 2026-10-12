export type FoodId = "apple" | "carrot" | "cookie" | "fish" | "cupcake";

export interface FoodEffect {
  fullness: number;
  happiness: number;
  energy: number;
  hygiene: number;
  xp: number;
}

export interface FoodDef {
  id: FoodId;
  name: string;
  emoji: string;
  unlockLevel: number;
  color: string;
  blurb: string;
  effect: FoodEffect;
  quips: readonly string[];
}

export const FOODS: readonly FoodDef[] = [
  {
    id: "apple",
    name: "Apple",
    emoji: "🍎",
    unlockLevel: 1,
    color: "#ff5a5f",
    blurb: "Fullness +22",
    effect: { fullness: 22, happiness: 4, energy: 0, hygiene: 0, xp: 8 },
    quips: ["Crunchy! Mmm.", "Apple a day, Cowdie-approved."],
  },
  {
    id: "carrot",
    name: "Carrot",
    emoji: "🥕",
    unlockLevel: 1,
    color: "#ff9f1c",
    blurb: "Fullness +16 · Energy +8",
    effect: { fullness: 16, happiness: 2, energy: 8, hygiene: 0, xp: 8 },
    quips: ["Crisp and sweet!", "Vitamins, yum!"],
  },
  {
    id: "cookie",
    name: "Cookie",
    emoji: "🍪",
    unlockLevel: 2,
    color: "#d9925a",
    blurb: "Happy +14 · Crumbs cost Clean",
    effect: { fullness: 12, happiness: 14, energy: 0, hygiene: -8, xp: 10 },
    quips: ["Chocolate chip!", "Oops, crumbs everywhere."],
  },
  {
    id: "fish",
    name: "Fish",
    emoji: "🐟",
    unlockLevel: 3,
    color: "#ff8f7a",
    blurb: "Fullness +30 · Energy +4",
    effect: { fullness: 30, happiness: 6, energy: 4, hygiene: -2, xp: 12 },
    quips: ["Fresh catch!", "Salmon? Nice choice."],
  },
  {
    id: "cupcake",
    name: "Cupcake",
    emoji: "🧁",
    unlockLevel: 4,
    color: "#f48fb1",
    blurb: "Happy +20 · Crumbs cost Clean",
    effect: { fullness: 14, happiness: 20, energy: 0, hygiene: -10, xp: 14 },
    quips: ["Sprinkles!!", "Best day ever."],
  },
];

export function getFood(id: FoodId): FoodDef {
  const food = FOODS.find((f) => f.id === id);
  if (!food) throw new Error(`Unknown food: ${id}`);
  return food;
}
