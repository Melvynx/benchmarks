export type FoodId = 'grass' | 'apple' | 'cookie' | 'milk' | 'chili';
export type StatKey = 'fullness' | 'joy' | 'energy' | 'clean';
export type AccessoryId = 'flowers' | 'party' | 'shades' | 'crown';

export interface FoodDef {
  id: FoodId;
  name: string;
  blurb: string;
  fullness: number;
  joy: number;
  energy: number;
  xp: number;
  chews: number;
}

export const FOODS: FoodDef[] = [
  { id: 'grass', name: 'Clover', blurb: 'Fresh & green', fullness: 16, joy: 2, energy: 2, xp: 4, chews: 5 },
  { id: 'apple', name: 'Apple', blurb: 'Crunchy snack', fullness: 22, joy: 6, energy: 4, xp: 6, chews: 4 },
  { id: 'cookie', name: 'Cookie', blurb: 'Sweet treat', fullness: 10, joy: 16, energy: 8, xp: 5, chews: 4 },
  { id: 'milk', name: 'Milk', blurb: 'Warm & cozy', fullness: 14, joy: 4, energy: 14, xp: 5, chews: 3 },
  { id: 'chili', name: 'Chili', blurb: 'Feeling brave?', fullness: 8, joy: 10, energy: 18, xp: 6, chews: 3 },
];

export const FOOD_BY_ID: Record<FoodId, FoodDef> = Object.fromEntries(FOODS.map((f) => [f.id, f])) as Record<
  FoodId,
  FoodDef
>;

export const FAVORITE_CANDIDATES: FoodId[] = ['grass', 'apple', 'cookie', 'milk'];
export const FAVORITE_BONUS = { fullness: 4, joy: 12, xp: 6 };

export interface AccessoryDef {
  id: AccessoryId;
  name: string;
  level: number;
}

export const ACCESSORIES: AccessoryDef[] = [
  { id: 'flowers', name: 'Flower crown', level: 2 },
  { id: 'party', name: 'Party hat', level: 3 },
  { id: 'shades', name: 'Cool shades', level: 4 },
  { id: 'crown', name: 'Golden crown', level: 6 },
];

export const STAT_META: Record<StatKey, { label: string; hint: string }> = {
  fullness: { label: 'Belly', hint: 'Feed Cowdie' },
  joy: { label: 'Joy', hint: 'Pet & play' },
  energy: { label: 'Energy', hint: 'Let Cowdie sleep' },
  clean: { label: 'Fresh', hint: 'Give a bath' },
};

export const STAGES = [
  { minLevel: 1, name: 'Baby calf' },
  { minLevel: 3, name: 'Young calf' },
  { minLevel: 6, name: 'Big cow' },
  { minLevel: 10, name: 'Legend' },
];

export const MAX_LEVEL = 12;
export const STUFFED_AT = 94;
export const SAVE_KEY = 'cowdie.save.v1';
