export type StatKey = 'hunger' | 'happy' | 'energy' | 'clean';
export const STAT_KEYS: StatKey[] = ['hunger', 'happy', 'energy', 'clean'];

export interface SaveData {
  v: 1;
  name: string;
  stats: Record<StatKey, number>;
  xp: number;
  level: number;
  born: number;
  last: number;
  asleep: boolean;
  poops: { x: number; z: number }[];
  fed: number;
  muted: boolean;
  introSeen: boolean;
}

const KEY = 'cowdie.save.v1';

/** Per-second drain while awake. Hunger empties in ~35 min of real time. */
export const RATE = {
  hunger: 100 / (60 * 35),
  happy: 100 / (60 * 45),
  energy: 100 / (60 * 50),
  clean: 100 / (60 * 60),
  sleepRegen: 100 / (60 * 2.5),
};

export const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

export function freshSave(): SaveData {
  const now = Date.now();
  return {
    v: 1,
    name: 'Cowdie',
    stats: { hunger: 62, happy: 70, energy: 80, clean: 88 },
    xp: 0,
    level: 1,
    born: now,
    last: now,
    asleep: false,
    poops: [],
    fed: 0,
    muted: false,
    introSeen: false,
  };
}

export function applyDecay(s: SaveData, dt: number, factor = 1) {
  const st = s.stats;
  const poops = s.poops.length;
  if (s.asleep) {
    st.energy += RATE.sleepRegen * dt;
    st.hunger -= RATE.hunger * 0.5 * dt * factor;
    st.clean -= RATE.clean * 0.4 * dt * factor;
  } else {
    st.hunger -= RATE.hunger * dt * factor;
    st.energy -= RATE.energy * dt * factor;
    st.clean -= RATE.clean * (1 + poops * 0.6) * dt * factor;
    const misery = 1 + (st.hunger < 25 ? 1 : 0) + (st.clean < 25 ? 0.5 : 0) + (st.energy < 15 ? 0.5 : 0);
    st.happy -= RATE.happy * misery * dt * factor;
  }
  for (const k of STAT_KEYS) st[k] = clamp(st[k]);
}

export function loadSave(): SaveData {
  let s: SaveData;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as SaveData) : null;
    s = parsed && parsed.v === 1 && parsed.stats ? { ...freshSave(), ...parsed } : freshSave();
  } catch {
    s = freshSave();
  }
  const away = clamp((Date.now() - s.last) / 1000, 0, 12 * 3600);
  if (away > 5) {
    const step = 30;
    for (let t = 0; t < away; t += step) applyDecay(s, Math.min(step, away - t), 0.35);
    s.stats.hunger = Math.max(s.stats.hunger, 10);
    s.stats.happy = Math.max(s.stats.happy, 12);
    s.stats.clean = Math.max(s.stats.clean, 10);
  }
  s.last = Date.now();
  return s;
}

export function persist(s: SaveData) {
  s.last = Date.now();
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or disabled */
  }
}

export function wipeSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export const xpForLevel = (level: number) => 45 + level * 30;

export interface Stage {
  name: string;
  scale: number;
}

export function stageFor(level: number): Stage {
  if (level < 3) return { name: 'Calf', scale: 0.78 };
  if (level < 6) return { name: 'Heifer', scale: 0.9 };
  return { name: 'Grand Cow', scale: 1.02 };
}

export interface Mood {
  key: string;
  label: string;
  emoji: string;
}

export function moodOf(s: SaveData): Mood {
  const st = s.stats;
  if (s.asleep) return { key: 'sleep', label: 'Fast asleep', emoji: '😴' };
  if (st.hunger < 18) return { key: 'starving', label: 'Starving', emoji: '😫' };
  if (st.energy < 16) return { key: 'exhausted', label: 'Exhausted', emoji: '🥱' };
  if (st.clean < 20) return { key: 'stinky', label: 'Stinky', emoji: '🤢' };
  if (st.happy < 25) return { key: 'lonely', label: 'Lonely', emoji: '🥺' };
  if (st.hunger < 40) return { key: 'peckish', label: 'Peckish', emoji: '😋' };
  if (st.energy < 30) return { key: 'sleepy', label: 'Sleepy', emoji: '😪' };
  const avg = (st.hunger + st.happy + st.energy + st.clean) / 4;
  if (avg > 82) return { key: 'overjoyed', label: 'Over the moon', emoji: '🥰' };
  if (avg > 62) return { key: 'happy', label: 'Happy', emoji: '😊' };
  return { key: 'okay', label: 'Doing okay', emoji: '🙂' };
}
