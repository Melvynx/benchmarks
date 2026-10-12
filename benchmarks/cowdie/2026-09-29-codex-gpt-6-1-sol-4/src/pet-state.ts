export type CareAction = 'feed' | 'pet' | 'play' | 'clean' | 'sleep' | 'wake';
export type Food = 'apple' | 'carrot' | 'berry';
export type Needs = { fullness: number; happiness: number; energy: number; cleanliness: number };
export type Memory = { id: string; action: CareAction; title: string; time: number; food?: Food };
export type PetState = {
  name: string;
  needs: Needs;
  xp: number;
  birthday: number;
  updatedAt: number;
  asleep: boolean;
  memories: Memory[];
  careToday: string[];
  careDate: string;
  sound: boolean;
};

export const STORAGE_KEY = 'cowdie-pet-v1';
export const foodInfo: Record<Food, { name: string; benefit: number; description: string; color: string }> = {
  apple: { name: 'Apple', benefit: 18, description: 'A crisp little pick-me-up', color: '#e87860' },
  carrot: { name: 'Carrot', benefit: 25, description: 'Fresh from the garden', color: '#e5a054' },
  berry: { name: 'Strawberry', benefit: 12, description: 'A berry sweet treat', color: '#dc7f95' },
};

export function localDate(time = Date.now()) {
  return new Date(time).toLocaleDateString('en-CA');
}

export function newPet(): PetState {
  const now = Date.now();
  return { name: 'Clover', needs: { fullness: 64, happiness: 85, energy: 78, cleanliness: 92 }, xp: 24,
    birthday: now, updatedAt: now, asleep: false, memories: [], careToday: [], careDate: localDate(), sound: false };
}

export function advanceNeeds(pet: PetState, now = Date.now()): PetState {
  const hours = Math.min(6, Math.max(0, now - pet.updatedAt) / 3600000);
  const bound = (value: number) => Math.min(100, Math.max(10, value));
  return { ...pet, updatedAt: now,
    careDate: localDate(now), careToday: pet.careDate === localDate(now) ? pet.careToday : [],
    needs: {
      fullness: bound(pet.needs.fullness - hours * 5),
      happiness: bound(pet.needs.happiness - hours * 3),
      energy: bound(pet.needs.energy + hours * (pet.asleep ? 32 : -3)),
      cleanliness: bound(pet.needs.cleanliness - hours * 2),
    },
  };
}

export function loadPet(): PetState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return newPet();
    const pet = JSON.parse(stored) as PetState;
    if (typeof pet.name !== 'string' || !pet.name.trim() || !Number.isFinite(pet.xp) || pet.xp < 0 || !Number.isFinite(pet.updatedAt) ||
      !Number.isFinite(pet.birthday) || !pet.needs || !(['fullness', 'happiness', 'energy', 'cleanliness'] as const).every(key => Number.isFinite(pet.needs[key])) ||
      !Array.isArray(pet.memories) || !Array.isArray(pet.careToday) || typeof pet.careDate !== 'string' || typeof pet.asleep !== 'boolean') return newPet();
    return advanceNeeds(pet);
  } catch { return newPet(); }
}

export function careForPet(pet: PetState, action: CareAction, food: Food = 'apple'): PetState {
  const next = advanceNeeds(pet);
  const n = { ...next.needs };
  const add = (key: keyof Needs, amount: number) => { n[key] = Math.min(100, Math.max(10, n[key] + amount)); };
  const titles: Record<CareAction, string> = {
    feed: `A ${foodInfo[food].name.toLowerCase()} made ${pet.name}'s day`,
    pet: 'A little love goes a long way', play: 'The happiest little hops',
    clean: 'Squeaky clean and feeling fresh', sleep: 'Sweet dreams in the meadow', wake: 'Hello, sleepy sunshine',
  };
  if (action === 'feed') { add('fullness', foodInfo[food].benefit); add('happiness', 5); }
  if (action === 'pet') add('happiness', 8);
  if (action === 'play') { add('happiness', 18); add('energy', -9); add('fullness', -4); }
  if (action === 'clean') { add('cleanliness', 30); add('happiness', 5); }
  if (action === 'sleep') add('energy', 8);
  const memory = { id: crypto.randomUUID(), action, title: titles[action], time: Date.now(), ...(action === 'feed' ? { food } : {}) };
  return { ...next, needs: n, asleep: action === 'sleep' ? true : action === 'wake' ? false : next.asleep,
    xp: next.xp + (action === 'wake' ? 0 : action === 'pet' ? 5 : 12),
    careToday: [...new Set([...next.careToday, action])], memories: [memory, ...next.memories].slice(0, 30),
  };
}
