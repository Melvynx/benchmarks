import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Vector3 } from "three";
import {
  FOODS,
  FAVORITE_FOOD,
  STAT_META,
  stageIndexFor,
  STAGES,
  unlocksAt,
  xpForLevel,
  type AccessoryId,
  type FoodId,
  type Reaction,
  type Slot,
  type StatKey,
} from "./content";
import { ball, constrain, cowEvents, forward, pet, rand, view } from "./runtime";
import { sfx } from "./audio";

export type Stats = Record<StatKey, number>;
export interface Poop {
  id: number;
  x: number;
  z: number;
  born: number;
}
export type ToastTone = "info" | "good" | "warn" | "level";
export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}
export interface FloatText {
  id: number;
  text: string;
  color: string;
  pos: [number, number, number];
}
export interface WorldFood {
  id: number;
  food: FoodId;
  pos: Vector3;
  vel: Vector3;
  from: Vector3;
  state: "homing" | "falling" | "rest";
  t: number;
  dur: number;
  spin: number;
  bounces: number;
}
export type Panel = "feed" | "style" | "settings" | null;
export type Mode = "normal" | "play" | "clean";
export type EatCheck = "ok" | "full" | "asleep" | "busy" | "cooldown" | "locked";
export interface LevelUpInfo {
  level: number;
  unlocks: string[];
  stage: string | null;
}

interface Persisted {
  name: string;
  hatched: boolean;
  bornAt: number;
  stats: Stats;
  xp: number;
  level: number;
  sick: boolean;
  asleep: boolean;
  poops: Poop[];
  digestion: number;
  poopDueAt: number | null;
  lastTick: number;
  equipped: Record<Slot, AccessoryId | null>;
  lastFed: Partial<Record<FoodId, number>>;
  favoriteFound: boolean;
  bestRally: number;
  sound: boolean;
  music: boolean;
  totals: { fed: number; pets: number; cleans: number; rallies: number };
}

interface Transient {
  panel: Panel;
  mode: Mode;
  drag: FoodId | null;
  foods: WorldFood[];
  toasts: Toast[];
  floats: FloatText[];
  rally: number;
  levelUp: LevelUpInfo | null;
  naming: boolean;
  petFatigue: number;
  warned: Partial<Record<StatKey, boolean>>;
  eggCracks: number;
}

interface Actions {
  tick: (now: number) => void;
  catchUp: (now: number) => void;
  hatch: () => void;
  crackEgg: () => void;
  rename: (name: string) => void;
  setNaming: (v: boolean) => void;
  setPanel: (p: Panel) => void;
  startPlay: () => void;
  endPlay: (reason?: "done" | "tired" | "hungry" | "sleep") => void;
  rallyHit: (by: "cow" | "user") => void;
  startClean: () => void;
  endClean: () => void;
  toggleSleep: () => void;
  canEat: (food: FoodId) => EatCheck;
  feed: (food: FoodId, ground?: boolean) => EatCheck;
  toss: (food: FoodId) => void;
  heal: () => void;
  startDrag: (food: FoodId) => void;
  endDrag: (drop: Vector3 | null) => void;
  addFood: (f: Omit<WorldFood, "id">) => void;
  removeFood: (id: number) => void;
  petStroke: (at: Vector3) => boolean;
  boop: () => void;
  scrub: (amount: number) => void;
  cleanPoop: (id: number) => void;
  equip: (slot: Slot, id: AccessoryId | null) => void;
  toggleSound: () => void;
  toggleMusic: () => void;
  toast: (text: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
  float: (text: string, color: string, pos: Vector3) => void;
  dismissLevelUp: () => void;
  reset: () => void;
}

export type GameState = Persisted & Transient & Actions;

const clamp = (v: number) => Math.max(0, Math.min(100, v));
let uid = 1;
const nextId = () => uid++;
const bath = { armed: false };

const freshPersisted = (): Persisted => ({
  name: "Cowdie",
  hatched: false,
  bornAt: Date.now(),
  stats: { hunger: 72, happy: 80, energy: 90, hygiene: 100, health: 100 },
  xp: 0,
  level: 1,
  sick: false,
  asleep: false,
  poops: [],
  digestion: 0,
  poopDueAt: null,
  lastTick: Date.now(),
  equipped: { head: null, face: null, neck: null },
  lastFed: {},
  favoriteFound: false,
  bestRally: 0,
  sound: true,
  music: true,
  totals: { fed: 0, pets: 0, cleans: 0, rallies: 0 },
});

const freshTransient = (): Transient => ({
  panel: null,
  mode: "normal",
  drag: null,
  foods: [],
  toasts: [],
  floats: [],
  rally: 0,
  levelUp: null,
  naming: false,
  petFatigue: 0,
  warned: {},
  eggCracks: 0,
});

type SimEvent = "sick" | "woke" | "exhausted";

/** Advances stats by `minutes`. `factor` slows decay (used for offline catch-up). */
function simulate(s: Persisted, minutes: number, factor: number) {
  const st = { ...s.stats };
  const events: SimEvent[] = [];
  let { sick, asleep } = s;
  const poops = s.poops.length;
  const m = minutes * factor;

  st.hunger -= (asleep ? 0.7 : 1.5) * m;
  st.happy -=
    ((asleep ? 0.2 : 1.0) +
      (st.hunger < 25 ? 0.6 : 0) +
      (st.hygiene < 25 ? 0.4 : 0) +
      (sick ? 0.8 : 0)) *
    m;
  if (asleep) st.energy += 15 * minutes;
  else st.energy -= (0.75 + (sick ? 0.4 : 0)) * m;
  st.hygiene -= (0.5 + poops * 0.9) * (asleep ? 0.5 : 1) * m;

  let dh = 0;
  if (st.hunger < 15) dh -= 1.4;
  if (st.hygiene < 15) dh -= 0.9;
  if (poops >= 3) dh -= 0.7;
  if (st.energy < 5) dh -= 0.5;
  if (st.happy < 10) dh -= 0.4;
  if (dh === 0 && !sick && st.hunger > 45 && st.hygiene > 45 && st.energy > 30) dh = 0.8;
  st.health += dh * m;

  (Object.keys(st) as StatKey[]).forEach((k) => (st[k] = clamp(st[k])));

  if (!sick && st.health < 30) {
    sick = true;
    events.push("sick");
  }
  if (asleep && st.energy >= 100) {
    asleep = false;
    events.push("woke");
  } else if (!asleep && st.energy <= 0) {
    asleep = true;
    events.push("exhausted");
  }
  return { stats: st, sick, asleep, events };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => {
      const toast = (text: string, tone: ToastTone = "info") => {
        if (get().toasts.some((t) => t.text === text)) return;
        const id = nextId();
        set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, tone }] }));
        window.setTimeout(() => get().dismissToast(id), tone === "level" ? 4200 : 3200);
      };

      const float = (text: string, color: string, pos: Vector3) => {
        const id = nextId();
        set((s) => ({
          floats: [
            ...s.floats.slice(-10),
            { id, text, color, pos: [pos.x + rand(-0.15, 0.15), pos.y, pos.z] },
          ],
        }));
        window.setTimeout(
          () => set((s) => ({ floats: s.floats.filter((f) => f.id !== id) })),
          1300,
        );
      };

      const addXp = (amount: number) => {
        if (amount <= 0) return;
        let { xp, level } = get();
        const startLevel = level;
        xp += amount;
        while (xp >= xpForLevel(level)) {
          xp -= xpForLevel(level);
          level++;
        }
        set({ xp, level });
        if (level > startLevel) {
          const grewFrom = stageIndexFor(startLevel);
          const grewTo = stageIndexFor(level);
          const unlocks: string[] = [];
          for (let l = startLevel + 1; l <= level; l++) unlocks.push(...unlocksAt(l));
          const stage = grewTo > grewFrom ? STAGES[grewTo].name : null;
          set({ levelUp: { level, unlocks, stage } });
          sfx.levelUp();
          cowEvents.emit({ type: "levelup", grew: stage !== null });
        }
      };

      const bump = (patch: Partial<Stats>) => {
        const stats = { ...get().stats };
        (Object.keys(patch) as StatKey[]).forEach((k) => {
          stats[k] = clamp(stats[k] + (patch[k] ?? 0));
        });
        set({ stats });
      };

      const floatAtHead = (text: string, color: string) => {
        float(text, color, pet.head.clone().add(new Vector3(0, 0.55 * pet.scale, 0)));
      };

      const handleSimEvents = (events: SimEvent[]) => {
        const { name } = get();
        for (const e of events) {
          if (e === "sick") {
            toast(`${name} feels sick. Time for medicine!`, "warn");
            cowEvents.emit({ type: "sick" });
          } else if (e === "woke") {
            toast(`${name} woke up fully rested!`, "good");
            cowEvents.emit({ type: "wake" });
            addXp(6);
          } else if (e === "exhausted") {
            if (get().mode !== "normal") set({ mode: "normal" });
            toast(`${name} was so tired they fell asleep`, "info");
            cowEvents.emit({ type: "sleep" });
          }
        }
      };

      return {
        ...freshPersisted(),
        ...freshTransient(),

        tick: (now) => {
          const s = get();
          if (!s.hatched) {
            set({ lastTick: now });
            return;
          }
          const minutes = Math.min((now - s.lastTick) / 60000, 5);
          if (minutes <= 0) return;
          const r = simulate(s, minutes, 1);
          const warned = { ...s.warned };
          (Object.keys(r.stats) as StatKey[]).forEach((k) => {
            if (r.stats[k] < 22 && !warned[k] && k !== "health") {
              warned[k] = true;
              if (!(k === "energy" && r.asleep)) toast(`${s.name} ${STAT_META[k].low}`, "warn");
            } else if (r.stats[k] > 40 && warned[k]) {
              warned[k] = false;
            }
          });
          set({
            stats: r.stats,
            sick: r.sick,
            asleep: r.asleep,
            lastTick: now,
            warned,
            petFatigue: Math.max(0, s.petFatigue - (now - s.lastTick) / 20000),
          });
          handleSimEvents(r.events);

          if (s.poopDueAt && now >= s.poopDueAt && !r.asleep && !pet.eating) {
            if (s.poops.length < 6) {
              const back = forward(pet.heading).multiplyScalar(-0.8 * pet.scale);
              const p = constrain({ x: pet.pos.x + back.x, z: pet.pos.z + back.z }, 0.2);
              set({ poops: [...get().poops, { id: nextId(), x: p.x, z: p.z, born: now }] });
              sfx.plop();
              cowEvents.emit({ type: "poop" });
            }
            set({ poopDueAt: null });
          }
          if (s.mode === "play" && r.stats.hunger < 6) get().endPlay("hungry");
        },

        catchUp: (now) => {
          const s = get();
          const elapsed = now - s.lastTick;
          if (!s.hatched || elapsed < 60000) {
            set({ lastTick: now });
            return;
          }
          const minutes = Math.min(elapsed / 60000, 12 * 60);
          let state: Persisted = { ...s };
          const events = new Set<SimEvent>();
          for (let i = 0; i < minutes; i++) {
            const r = simulate(state, Math.min(1, minutes - i), 0.4);
            state = { ...state, stats: r.stats, sick: r.sick, asleep: r.asleep };
            r.events.forEach((e) => events.add(e));
          }
          let poops = s.poops;
          if (s.poopDueAt || s.digestion > 20) {
            const p = constrain({ x: rand(-2, 2), z: rand(-1, 2) }, 0.2);
            poops = [...poops, { id: nextId(), x: p.x, z: p.z, born: now }].slice(-6);
          }
          set({
            stats: state.stats,
            sick: state.sick,
            asleep: state.asleep,
            poops,
            poopDueAt: null,
            digestion: 0,
            lastTick: now,
          });
          const h = Math.floor(minutes / 60);
          const mm = Math.round(minutes % 60);
          const away = h > 0 ? `${h}h ${mm}m` : `${mm}m`;
          toast(`Welcome back! You were away ${away}. ${s.name} missed you.`, "info");
          if (events.has("sick")) window.setTimeout(() => toast(`${s.name} got sick while you were gone`, "warn"), 600);
        },

        crackEgg: () => {
          const cracks = get().eggCracks + 1;
          set({ eggCracks: cracks });
          if (cracks >= 3) window.setTimeout(() => get().hatch(), 450);
        },

        hatch: () => {
          const now = Date.now();
          set({
            ...freshPersisted(),
            sound: get().sound,
            music: get().music,
            hatched: true,
            bornAt: now,
            lastTick: now,
            naming: true,
            eggCracks: 0,
          });
          sfx.sparkle();
          cowEvents.emit({ type: "hatch" });
        },

        rename: (name) => {
          const clean = name.trim().slice(0, 16) || "Cowdie";
          set({ name: clean, naming: false });
        },

        setNaming: (v) => set({ naming: v }),

        setPanel: (p) => {
          const s = get();
          if (p && s.mode !== "normal") {
            if (s.mode === "play") get().endPlay("done");
            else get().endClean();
          }
          set({ panel: s.panel === p ? null : p });
        },

        startPlay: () => {
          const s = get();
          if (s.asleep) return;
          if (s.sick) {
            toast(`${s.name} is too sick to play`, "warn");
            return;
          }
          if (s.stats.energy < 12) {
            toast(`${s.name} is too tired to play. Try a nap!`, "warn");
            return;
          }
          const f = forward(pet.heading);
          const p = constrain({ x: pet.pos.x + f.x * 1.6, z: pet.pos.z + f.z * 1.6 }, 0.5);
          ball.pos.set(p.x, 2.2, p.z);
          ball.vel.set(0, 0, 0);
          set({ mode: "play", panel: null, rally: 0 });
          sfx.pop();
        },

        endPlay: (reason = "done") => {
          const s = get();
          if (s.mode !== "play") return;
          const best = Math.max(s.bestRally, s.rally);
          set({ mode: "normal", bestRally: best });
          if (reason === "tired") toast(`${s.name} is all played out! ${s.rally} boops`, "info");
          else if (reason === "hungry") toast(`${s.name} is too hungry to keep playing`, "warn");
          else if (s.rally > 0) {
            toast(
              s.rally > s.bestRally && s.bestRally > 0
                ? `New record: ${s.rally} boops!`
                : `Fun session: ${s.rally} boops`,
              "good",
            );
          }
        },

        rallyHit: (by) => {
          const s = get();
          if (s.mode !== "play") return;
          set({ rally: s.rally + 1, totals: { ...s.totals, rallies: s.totals.rallies + 1 } });
          bump({ happy: by === "cow" ? 4 : 2.5, energy: -1.6, hunger: -0.5 });
          addXp(by === "cow" ? 2 : 1);
          if (get().stats.energy < 8) get().endPlay("tired");
        },

        startClean: () => {
          const s = get();
          if (s.asleep) return;
          set({ mode: "clean", panel: null });
          bath.armed = s.stats.hygiene < 95;
          if (s.stats.hygiene >= 99 && s.poops.length === 0) {
            toast(`${s.name} is already spotless, but scrubs are nice`, "info");
          }
        },

        endClean: () => {
          if (get().mode === "clean") set({ mode: "normal" });
        },

        toggleSleep: () => {
          const s = get();
          if (!s.hatched) return;
          if (s.asleep) {
            set({ asleep: false });
            cowEvents.emit({ type: "wake" });
            if (s.stats.energy < 40) {
              bump({ happy: -5 });
              toast(`"Five more minutes..." ${s.name} is groggy`, "info");
            } else {
              toast(`Good morning, ${s.name}!`, "good");
            }
          } else {
            if (s.mode === "play") get().endPlay("sleep");
            set({ asleep: true, panel: null, mode: "normal", drag: null });
            cowEvents.emit({ type: "sleep" });
            toast("Lights out. Sweet dreams!", "info");
          }
        },

        canEat: (food) => {
          const s = get();
          if (!s.hatched) return "busy";
          if (s.asleep) return "asleep";
          if (pet.eating) return "busy";
          if (food === "pill") return "ok";
          const def = FOODS[food];
          if (def.level > s.level) return "locked";
          const last = s.lastFed[food];
          if (def.cooldown && last && Date.now() - last < def.cooldown * 1000) return "cooldown";
          if (s.stats.hunger >= 96 && food !== "cupcake") return "full";
          return "ok";
        },

        feed: (food, ground = false) => {
          const s = get();
          const check = s.canEat(food);
          if (check !== "ok") return check;
          const def = FOODS[food];
          const fav = food === FAVORITE_FOOD;
          const reaction: Reaction =
            food === "pill"
              ? "bleh"
              : food === "chili"
                ? "spicy"
                : fav || food === "golden"
                  ? "love"
                  : food === "cupcake"
                    ? "treat"
                    : "yum";
          const hungryBonus = s.stats.hunger < 50 ? 1.5 : 1;
          const now = Date.now();
          let digestion = s.digestion + def.hunger;
          let poopDueAt = s.poopDueAt;
          if (digestion >= 42 && !poopDueAt) {
            poopDueAt = now + rand(18000, 40000);
            digestion -= 42;
          }
          set({
            digestion,
            poopDueAt,
            lastFed: { ...s.lastFed, [food]: now },
            totals: { ...s.totals, fed: s.totals.fed + 1 },
            sick: food === "pill" ? false : s.sick,
          });
          bump({
            hunger: def.hunger,
            happy: def.happy + (fav ? 8 : 0),
            health: def.health,
            hygiene: def.hygiene,
            energy: def.energy,
          });
          addXp(Math.round(def.xp * hungryBonus));
          if (def.hunger > 0) floatAtHead(`+${def.hunger}`, STAT_META.hunger.color);
          else if (food === "pill") floatAtHead(`+${def.health}`, STAT_META.health.color);
          if (fav && !s.favoriteFound) {
            set({ favoriteFound: true });
            window.setTimeout(() => toast(`Favorite food discovered: ${s.name} adores watermelon!`, "good"), 900);
          }
          if (food === "pill") window.setTimeout(() => toast(`${s.name} is feeling much better`, "good"), 1400);
          cowEvents.emit({ type: "eat", food, reaction, ground });
          return "ok";
        },

        toss: (food) => {
          const s = get();
          const check = s.canEat(food);
          if (check === "asleep") return toast(`Shh... ${s.name} is sleeping`, "info");
          if (check === "locked") return toast(`${FOODS[food].name} unlocks at level ${FOODS[food].level}`, "info");
          if (check === "cooldown") return toast(`${FOODS[food].name} is still being prepared`, "info");
          const cam = view.camera;
          if (!cam) return;
          const from = new Vector3(rand(-0.25, 0.25), -1.1, -2.6).applyMatrix4(cam.matrixWorld);
          get().addFood({
            food,
            pos: from.clone(),
            from,
            vel: new Vector3(),
            state: "homing",
            t: 0,
            dur: 0.85,
            spin: rand(-8, 8),
            bounces: 0,
          });
          sfx.whoosh();
        },

        heal: () => {
          const s = get();
          if (!s.sick && s.stats.health > 85) {
            toast(`${s.name} is healthy, no medicine needed`, "info");
            return;
          }
          get().toss("pill");
        },

        startDrag: (food) => {
          const s = get();
          const check = s.canEat(food);
          if (check === "asleep") return toast(`Shh... ${s.name} is sleeping`, "info");
          if (check === "locked") return toast(`${FOODS[food].name} unlocks at level ${FOODS[food].level}`, "info");
          if (check === "cooldown") return toast(`${FOODS[food].name} is still being prepared`, "info");
          set({ drag: food });
          sfx.pop();
        },

        endDrag: (drop) => {
          const s = get();
          if (!s.drag) return;
          const food = s.drag;
          set({ drag: null });
          if (!drop) return;
          get().addFood({
            food,
            pos: drop.clone(),
            from: drop.clone(),
            vel: new Vector3(rand(-0.3, 0.3), 0.5, rand(-0.3, 0.3)),
            state: "falling",
            t: 0,
            dur: 0,
            spin: rand(-4, 4),
            bounces: 0,
          });
        },

        addFood: (f) => {
          set((s) => ({ foods: [...s.foods.slice(-7), { ...f, id: nextId() }] }));
        },

        removeFood: (id) => set((s) => ({ foods: s.foods.filter((f) => f.id !== id) })),

        petStroke: () => {
          const s = get();
          if (s.asleep || !s.hatched) return false;
          const gain = 2.2 * (1 - s.petFatigue);
          set({
            petFatigue: Math.min(1, s.petFatigue + 0.06),
            totals: { ...s.totals, pets: s.totals.pets + 1 },
          });
          bump({ happy: gain });
          if (s.totals.pets % 3 === 0 && s.petFatigue < 0.8) addXp(1);
          return true;
        },

        boop: () => {
          const s = get();
          if (s.asleep) {
            bump({ happy: -1 });
            return;
          }
          bump({ happy: 1 });
          cowEvents.emit({ type: "boop" });
        },

        scrub: (amount) => {
          const s = get();
          if (s.mode !== "clean") return;
          if (s.stats.hygiene < 95) bath.armed = true;
          bump({ hygiene: amount, happy: amount * 0.15 });
          if (bath.armed && get().stats.hygiene >= 100) {
            bath.armed = false;
            set({ totals: { ...s.totals, cleans: s.totals.cleans + 1 } });
            addXp(8);
            cowEvents.emit({ type: "rinse" });
            window.setTimeout(() => {
              toast(`Squeaky clean! ${s.name} sparkles`, "good");
              get().endClean();
            }, 2600);
          }
        },

        cleanPoop: (id) => {
          const s = get();
          const poop = s.poops.find((p) => p.id === id);
          if (!poop) return;
          set({ poops: s.poops.filter((p) => p.id !== id) });
          bump({ hygiene: 4, happy: 2 });
          addXp(4);
          sfx.sweep();
          float("+4", STAT_META.hygiene.color, new Vector3(poop.x, 0.6, poop.z));
        },

        equip: (slot, id) => {
          const s = get();
          set({ equipped: { ...s.equipped, [slot]: s.equipped[slot] === id ? null : id } });
          sfx.pop();
        },

        toggleSound: () => set((s) => ({ sound: !s.sound })),
        toggleMusic: () => set((s) => ({ music: !s.music })),
        toast,
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        float,
        dismissLevelUp: () => set({ levelUp: null }),

        reset: () => {
          const { sound, music } = get();
          set({ ...freshPersisted(), ...freshTransient(), sound, music });
        },
      };
    },
    {
      name: "cowdie-save-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (s): Persisted => ({
        name: s.name,
        hatched: s.hatched,
        bornAt: s.bornAt,
        stats: s.stats,
        xp: s.xp,
        level: s.level,
        sick: s.sick,
        asleep: s.asleep,
        poops: s.poops,
        digestion: s.digestion,
        poopDueAt: s.poopDueAt,
        lastTick: s.lastTick,
        equipped: s.equipped,
        lastFed: s.lastFed,
        favoriteFound: s.favoriteFound,
        bestRally: s.bestRally,
        sound: s.sound,
        music: s.music,
        totals: s.totals,
      }),
    },
  ),
);

export function needOf(s: Pick<GameState, "stats" | "sick" | "asleep" | "poops">) {
  if (s.asleep) return null;
  if (s.sick) return "sick" as const;
  const order: StatKey[] = ["hunger", "energy", "hygiene", "happy"];
  let worst: StatKey | null = null;
  for (const k of order) {
    if (s.stats[k] < 30 && (!worst || s.stats[k] < s.stats[worst])) worst = k;
  }
  if (worst) return worst;
  if (s.poops.length >= 2) return "poop" as const;
  return null;
}

export type Need = ReturnType<typeof needOf>;

export function moodOf(s: Pick<GameState, "stats" | "sick" | "asleep">) {
  if (s.asleep) return "Sweet dreams";
  if (s.sick) return "Feeling unwell";
  const { hunger, happy, energy, hygiene, health } = s.stats;
  if (hunger < 22) return "Tummy rumbling";
  if (energy < 20) return "Can barely keep eyes open";
  if (hygiene < 20) return "A little stinky";
  const avg = (hunger + happy + energy + hygiene + health) / 5;
  if (avg > 82 && happy > 75) return "Over the moon";
  if (avg > 62) return "Happy & content";
  if (avg > 42) return "Doing okay";
  if (avg > 25) return "Needs some love";
  return "Miserable";
}
