import { FOODS } from './foods.js';

export const STORAGE_KEY = 'cowdie.save.v1';
const MAX_OFFLINE_SECONDS = 3 * 3600;
export const BUSY_MS = { feed: 2400, play: 2200, wash: 2300 };

export const DEFAULT_STATS = { fullness: 75, joy: 75, energy: 75, clean: 75 };

// Points lost per second while awake / asleep.
const AWAKE_RATE = { fullness: 0.035, joy: 0.025, energy: 0.03, clean: 0.012 };
const ASLEEP_RATE = { fullness: 0.018, joy: 0.008, energy: -0.25, clean: 0.004 };

const clamp = (v) => Math.min(100, Math.max(0, v));

export function decayStats(stats, sleeping, seconds) {
  const r = sleeping ? ASLEEP_RATE : AWAKE_RATE;
  return {
    fullness: clamp(stats.fullness - r.fullness * seconds),
    joy: clamp(stats.joy - r.joy * seconds),
    energy: clamp(stats.energy - r.energy * seconds),
    clean: clamp(stats.clean - r.clean * seconds),
  };
}

export function getMood(stats, sleeping) {
  if (sleeping) return 'sleeping';
  if (stats.fullness < 30) return 'hungry';
  if (stats.clean < 25) return 'dirty';
  if (stats.joy < 30) return 'sad';
  if (stats.energy < 25) return 'tired';
  return 'happy';
}

const MOOD_LINES = {
  hungry: 'My tummy is rumbling...',
  dirty: 'Ew, I am sticky. Wash me?',
  sad: 'Play with me?',
  tired: 'So sleepy... maybe a nap?',
  sleeping: 'zzz...',
  happy: 'Yay! Feeling great!',
};

let msgCounter = 0;
const makeMsg = (text, ttl = 3.2) => ({ text, ttl, id: ++msgCounter });

function sanitize(stats) {
  const out = { ...DEFAULT_STATS };
  for (const k of Object.keys(out)) {
    const v = Number(stats?.[k]);
    if (Number.isFinite(v)) out[k] = clamp(v);
  }
  return out;
}

export function loadState(now = Date.now()) {
  let stats = { ...DEFAULT_STATS };
  let sleeping = false;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved?.stats) {
      sleeping = Boolean(saved.sleeping);
      const elapsed = Math.min(Math.max(0, (now - saved.savedAt) / 1000), MAX_OFFLINE_SECONDS);
      stats = decayStats(sanitize(saved.stats), sleeping, elapsed);
    }
  } catch {
    // Corrupt save: start fresh.
  }
  return {
    stats,
    sleeping,
    mood: getMood(stats, sleeping),
    busyUntil: 0,
    clock: now,
    lastTick: now,
    msg: makeMsg("Moo! Hi, I'm Cowdie!", 4),
  };
}

// Pure reducer. `now` is always passed in via the action so reducers stay deterministic.
export function reducer(state, action) {
  const now = action.now ?? state.clock;
  const base = { ...state, clock: now };

  switch (action.type) {
    case 'tick': {
      const seconds = Math.min(Math.max(0, (now - state.lastTick) / 1000), 2);
      let sleeping = state.sleeping;
      let stats = decayStats(state.stats, sleeping, seconds);
      let msg = state.msg ? { ...state.msg, ttl: state.msg.ttl - seconds } : null;
      if (msg && msg.ttl <= 0) msg = null;

      if (sleeping && stats.energy >= 98) {
        sleeping = false;
        msg = makeMsg('Good morning! Ready to play!');
      }

      const mood = getMood(stats, sleeping);
      if (mood !== state.mood && state.busyUntil <= now) {
        msg = makeMsg(MOOD_LINES[mood]);
      }
      return { ...base, stats, sleeping, mood, msg, lastTick: now };
    }

    case 'feed': {
      const food = FOODS[action.id];
      const stats = applyDelta(state.stats, food);
      return withMood({
        ...base,
        stats,
        busyUntil: now + BUSY_MS.feed,
        msg: makeMsg(food.message, 3.4),
      });
    }

    case 'play':
      return withMood({
        ...base,
        stats: applyDelta(state.stats, { joy: 14, energy: -8, fullness: -4 }),
        busyUntil: now + BUSY_MS.play,
        msg: makeMsg('Ball! Ball! Ball!'),
      });

    case 'wash':
      return withMood({
        ...base,
        stats: applyDelta(state.stats, { clean: 70, joy: 4, energy: -2 }),
        busyUntil: now + BUSY_MS.wash,
        msg: makeMsg('Squeaky clean! Bubbles!'),
      });

    case 'pet':
      return withMood({
        ...base,
        stats: applyDelta(state.stats, { joy: 3 }),
        msg: makeMsg(action.text),
      });

    case 'sleep': {
      const sleeping = !state.sleeping;
      return withMood({
        ...base,
        sleeping,
        msg: makeMsg(sleeping ? 'Night night... zzz' : 'Yawn! Good morning.'),
      });
    }

    case 'note':
      return { ...base, msg: makeMsg(action.text, 2.5) };

    default:
      return state;
  }
}

function applyDelta(stats, d) {
  return {
    fullness: clamp(stats.fullness + (d.fullness ?? 0)),
    joy: clamp(stats.joy + (d.joy ?? 0)),
    energy: clamp(stats.energy + (d.energy ?? 0)),
    clean: clamp(stats.clean + (d.clean ?? 0)),
  };
}

function withMood(state) {
  return { ...state, mood: getMood(state.stats, state.sleeping) };
}
