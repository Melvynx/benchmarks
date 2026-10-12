import { create } from 'zustand';
import {
  ACCESSORIES,
  FAVORITE_CANDIDATES,
  SAVE_KEY,
  type AccessoryId,
  type FoodId,
  type StatKey,
} from './config';
import { bus } from './bus';
import { applyFood, catchUp, clamp, decay, levelInfo, type FoodOutcome, type Stats } from './logic';

export type Mode = 'idle' | 'wash' | 'play';
export type Panel = 'none' | 'feed' | 'wardrobe' | 'menu';

interface Persisted extends Stats {
  xp: number;
  sleeping: boolean;
  poops: number;
  favorite: FoodId;
  favoriteKnown: boolean;
  worn: AccessoryId | null;
  born: number;
  lastSeen: number;
  meals: number;
  muted: boolean;
}

interface Ephemeral {
  mode: Mode;
  panel: Panel;
  eating: boolean;
  washProgress: number;
  ballActive: boolean;
}

interface Actions {
  eatFood: (food: FoodId) => FoodOutcome & { leveledUp: boolean };
  adjust: (delta: Partial<Stats>, xp?: number) => void;
  gainXp: (amount: number) => boolean;
  requestSleep: () => boolean;
  wake: (reason?: 'manual' | 'rested' | 'hungry') => void;
  addPoop: () => void;
  removePoop: () => void;
  setMode: (mode: Mode) => void;
  setPanel: (panel: Panel) => void;
  togglePanel: (panel: Exclude<Panel, 'none'>) => void;
  setEating: (eating: boolean) => void;
  setWashProgress: (p: number) => void;
  setBallActive: (b: boolean) => void;
  wear: (id: AccessoryId | null) => void;
  toggleMuted: () => void;
  reset: () => void;
  tick: () => void;
}

export type GameState = Persisted & Ephemeral & Actions;

const freshPet = (): Persisted => ({
  fullness: 52,
  joy: 68,
  energy: 78,
  clean: 88,
  xp: 0,
  sleeping: false,
  poops: 0,
  favorite: FAVORITE_CANDIDATES[Math.floor(Math.random() * FAVORITE_CANDIDATES.length)],
  favoriteKnown: false,
  worn: null,
  born: Date.now(),
  lastSeen: Date.now(),
  meals: 0,
  muted: false,
});

function loadPet(): { pet: Persisted; awayMinutes: number; poopsAdded: number } {
  const fresh = freshPet();
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { pet: fresh, awayMinutes: 0, poopsAdded: 0 };
    const saved = { ...fresh, ...(JSON.parse(raw) as Partial<Persisted>) };
    const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
    const pet: Persisted = {
      ...saved,
      fullness: clamp(num(saved.fullness, fresh.fullness)),
      joy: clamp(num(saved.joy, fresh.joy)),
      energy: clamp(num(saved.energy, fresh.energy)),
      clean: clamp(num(saved.clean, fresh.clean)),
      xp: Math.max(0, num(saved.xp, 0)),
      poops: Math.min(4, Math.max(0, Math.round(num(saved.poops, 0)))),
      favorite: FAVORITE_CANDIDATES.includes(saved.favorite) ? saved.favorite : fresh.favorite,
      worn: ACCESSORIES.some((a) => a.id === saved.worn) ? saved.worn : null,
      born: num(saved.born, fresh.born),
      lastSeen: num(saved.lastSeen, Date.now()),
      meals: Math.max(0, Math.round(num(saved.meals, 0))),
    };
    const result = catchUp(pet, pet.sleeping, pet.poops, Date.now() - pet.lastSeen);
    return {
      pet: {
        ...pet,
        ...result.stats,
        sleeping: result.sleeping,
        poops: Math.min(4, pet.poops + result.poopsAdded),
        lastSeen: Date.now(),
      },
      awayMinutes: result.awayMinutes,
      poopsAdded: result.poopsAdded,
    };
  } catch {
    return { pet: fresh, awayMinutes: 0, poopsAdded: 0 };
  }
}

const loaded = loadPet();
let lastTick = Date.now();
let poopQueue: number[] = [];

const persistedKeys: (keyof Persisted)[] = [
  'fullness',
  'joy',
  'energy',
  'clean',
  'xp',
  'sleeping',
  'poops',
  'favorite',
  'favoriteKnown',
  'worn',
  'born',
  'lastSeen',
  'meals',
  'muted',
];

export const useGame = create<GameState>((set, get) => ({
  ...loaded.pet,
  mode: 'idle',
  panel: 'none',
  eating: false,
  washProgress: 0,
  ballActive: false,

  eatFood: (food) => {
    const s = get();
    const outcome = applyFood(s, food, s.favorite);
    set({
      ...outcome.stats,
      meals: s.meals + 1,
      favoriteKnown: s.favoriteKnown || outcome.loved,
    });
    if (Math.random() < 0.72) poopQueue.push(Date.now() + 18000 + Math.random() * 30000);
    const leveledUp = get().gainXp(outcome.xp);
    return { ...outcome, leveledUp };
  },

  adjust: (delta, xp = 0) => {
    const s = get();
    const next: Partial<Stats> = {};
    (Object.keys(delta) as StatKey[]).forEach((k) => {
      next[k] = clamp(s[k] + (delta[k] ?? 0));
    });
    set(next);
    if (xp > 0) get().gainXp(xp);
  },

  gainXp: (amount) => {
    const before = levelInfo(get().xp).level;
    const xp = get().xp + amount;
    set({ xp });
    const after = levelInfo(xp).level;
    if (after > before) {
      const unlocked = ACCESSORIES.find((a) => a.level > before && a.level <= after);
      bus.emit('levelup', { level: after, unlocked: unlocked ? unlocked.name : null });
      return true;
    }
    return false;
  },

  requestSleep: () => {
    const s = get();
    if (s.sleeping) return true;
    if (s.energy >= 92) {
      bus.emit('say', { text: "I'm not sleepy yet! Let's play?" });
      return false;
    }
    if (s.fullness < 8) {
      bus.emit('say', { text: 'My tummy is too empty to sleep...' });
      return false;
    }
    set({ sleeping: true, mode: 'idle', panel: 'none' });
    return true;
  },

  wake: (reason = 'manual') => {
    const s = get();
    if (!s.sleeping) return;
    set({ sleeping: false });
    bus.emit('wake', { reason, grumpy: reason === 'manual' && s.energy < 55 });
  },

  addPoop: () => set((s) => ({ poops: Math.min(4, s.poops + 1) })),
  removePoop: () => set((s) => ({ poops: Math.max(0, s.poops - 1) })),

  setMode: (mode) => set({ mode, panel: mode === 'idle' ? get().panel : 'none', washProgress: 0 }),
  setPanel: (panel) => set({ panel }),
  togglePanel: (panel) => set((s) => ({ panel: s.panel === panel ? 'none' : panel })),
  setEating: (eating) => set({ eating }),
  setWashProgress: (washProgress) => set({ washProgress }),
  setBallActive: (ballActive) => set({ ballActive }),
  wear: (worn) => set({ worn }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),

  reset: () => {
    poopQueue = [];
    set({
      ...freshPet(),
      muted: get().muted,
      mode: 'idle',
      panel: 'none',
      eating: false,
      washProgress: 0,
      ballActive: false,
    });
  },

  tick: () => {
    const now = Date.now();
    const elapsed = now - lastTick;
    lastTick = now;
    const s = get();
    if (elapsed > 45000) {
      const r = catchUp(s, s.sleeping, s.poops, elapsed);
      set({ ...r.stats, sleeping: r.sleeping, poops: Math.min(4, s.poops + r.poopsAdded) });
      if (s.sleeping && !r.sleeping) bus.emit('wake', { reason: 'rested', grumpy: false });
      return;
    }
    const next = decay(s, elapsed / 60000, { sleeping: s.sleeping, poops: s.poops });
    const patch: Partial<Persisted> = { ...next, lastSeen: now };

    if (poopQueue.length && poopQueue[0] <= now) {
      poopQueue.shift();
      if (s.poops < 4) patch.poops = s.poops + 1;
    }

    if (s.sleeping) {
      if (next.energy >= 100) {
        patch.sleeping = false;
        set(patch);
        bus.emit('wake', { reason: 'rested', grumpy: false });
        return;
      }
      if (next.fullness <= 4) {
        patch.sleeping = false;
        set(patch);
        bus.emit('wake', { reason: 'hungry', grumpy: true });
        return;
      }
    } else if (next.energy <= 3) {
      patch.sleeping = true;
      set({ ...patch, mode: 'idle', panel: 'none' });
      bus.emit('autosleep', {});
      return;
    }
    set(patch);
  },
}));

export const bootInfo = { awayMinutes: loaded.awayMinutes, poopsAdded: loaded.poopsAdded };

let started = false;
export function startGameLoop() {
  if (started) return;
  started = true;
  lastTick = Date.now();
  setInterval(() => useGame.getState().tick(), 1000);

  let saveTimer: number | undefined;
  const save = () => {
    const s = useGame.getState();
    const out: Partial<Persisted> = {};
    persistedKeys.forEach((k) => {
      (out as Record<string, unknown>)[k] = s[k];
    });
    out.lastSeen = Date.now();
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(out));
    } catch {
      /* storage may be unavailable */
    }
  };
  useGame.subscribe(() => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(save, 400);
  });
  window.addEventListener('beforeunload', save);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') save();
  });
}
