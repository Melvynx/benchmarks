import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMS, PRESETS, clampParam, presetParams, type Params } from "../src/sim/params";
import {
  BLUE,
  DT,
  RED,
  SLOT_EAT,
  SLOT_GROW,
  SLOT_RIPE,
  SLOT_WAIT,
  Simulation,
  blobMaxSpeed,
  energyCost,
} from "../src/sim/simulation";
import { smooth, summarize, turningPoints, waveStats } from "../src/sim/summary";

const preset = (id: string, seed?: number, extra: Partial<Params> = {}): Params => ({
  ...presetParams(PRESETS.find((p) => p.id === id)!, seed),
  ...extra,
});

function run(params: Params, seconds: number, collectEvents = false): Simulation {
  const sim = new Simulation(params);
  sim.collectEvents = collectEvents;
  const ticks = Math.round(seconds / DT);
  for (let i = 0; i < ticks; i++) {
    sim.step();
    if (sim.counts[BLUE] === 0 && sim.counts[RED] === 0) break;
  }
  return sim;
}

describe("determinism", () => {
  it("same seed and settings replay the exact same story", () => {
    const a = run(DEFAULT_PARAMS, 240);
    const b = run(DEFAULT_PARAMS, 240);
    expect(a.history).toEqual(b.history);
    expect(a.stats).toEqual(b.stats);
  });

  it("a different seed tells a different story", () => {
    const a = run(DEFAULT_PARAMS, 120);
    const b = run({ ...DEFAULT_PARAMS, seed: 7 }, 120);
    expect(a.history.blue).not.toEqual(b.history.blue);
  });
});

describe("energy rules", () => {
  it("moving costs more than waiting, and waiting still costs a little", () => {
    const sim = new Simulation(DEFAULT_PARAMS);
    for (const b of [sim.blobs.find((x) => x.kind === BLUE)!, sim.blobs.find((x) => x.kind === RED)!]) {
      const idle = energyCost(sim.params, b, 0);
      const moving = energyCost(sim.params, b, blobMaxSpeed(sim.params, b));
      expect(idle).toBeGreaterThan(0);
      expect(moving).toBeGreaterThan(idle * 1.5);
    }
  });

  it("reds cannot gain energy without blues to boop", () => {
    const sim = run({ ...DEFAULT_PARAMS, blueStart: 0, redStart: 12 }, 400);
    expect(sim.stats.boops).toBe(0);
    expect(sim.stats.births[RED]).toBe(0);
    expect(sim.counts[RED]).toBe(0);
    expect(sim.markers.some((m) => m.kind === RED && m.type === "vanished")).toBe(true);
  });

  it("blues only grow by eating fruit", () => {
    const sim = run(preset("meadow"), 300);
    expect(sim.stats.births[BLUE]).toBeGreaterThan(0);
    expect(sim.stats.fruitsEaten).toBeGreaterThan(sim.stats.births[BLUE]);
  });
});

describe("fruit", () => {
  it("eaten fruit disappears, waits, then slowly regrows", () => {
    const sim = new Simulation({ ...DEFAULT_PARAMS, redStart: 0 });
    const seen = new Map<string, number[]>();
    for (let i = 0; i < 1600; i++) {
      sim.step();
      expect(sim.fruitCount).toBeLessThanOrEqual(sim.fruitCapacity);
      sim.trees.forEach((t, ti) =>
        t.slots.slice(0, sim.params.fruitLimit).forEach((s, si) => {
          const k = `${ti}:${si}`;
          const seq = seen.get(k) ?? [];
          if (seq[seq.length - 1] !== s.state) seq.push(s.state);
          seen.set(k, seq);
        }),
      );
    }
    const cycles = [...seen.values()].filter((seq) =>
      seq.join(",").includes([SLOT_RIPE, SLOT_EAT, SLOT_WAIT, SLOT_GROW, SLOT_RIPE].join(",")),
    );
    expect(cycles.length).toBeGreaterThan(5);
  });

  it("ripe fruit stays within the limit as it changes live", () => {
    const sim = new Simulation({ ...DEFAULT_PARAMS, blueStart: 0, redStart: 0 });
    for (let i = 0; i < 2000; i++) sim.step();
    expect(sim.fruitCount).toBe(sim.fruitCapacity);
    sim.setParams({ ...sim.params, fruitLimit: 3 });
    for (let i = 0; i < 20; i++) sim.step();
    expect(sim.fruitCount).toBeLessThanOrEqual(sim.trees.length * 3);
  });
});

describe("behavior timers", () => {
  it("eating blues stand still for the eating time", () => {
    const p = { ...DEFAULT_PARAMS, redStart: 0, blueEatTime: 2 };
    const sim = new Simulation(p);
    let checked = 0;
    const eatingAt = new Map<number, [number, number]>();
    for (let i = 0; i < 1200 && checked < 200; i++) {
      sim.step();
      for (const b of sim.blobs) {
        if (b.action !== "eat") {
          eatingAt.delete(b.id);
          continue;
        }
        expect(b.timerTotal).toBeCloseTo(2);
        expect(b.timer).toBeLessThanOrEqual(2);
        const at = eatingAt.get(b.id);
        if (at) {
          expect(Math.hypot(b.x - at[0], b.z - at[1])).toBeLessThan(1e-6);
          checked++;
        } else eatingAt.set(b.id, [b.x, b.z]);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("reds pause after a boop", () => {
    const sim = new Simulation({ ...DEFAULT_PARAMS, redPauseTime: 3 });
    sim.collectEvents = true;
    for (let i = 0; i < 4000; i++) {
      sim.step();
      const boop = sim.drainEvents().find((e) => e.type === "boop");
      if (boop) {
        const red = sim.byId.get(boop.id)!;
        expect(red.action).toBe("rest");
        expect(red.timer).toBeCloseTo(3);
        return;
      }
    }
    throw new Error("no boop happened");
  });
});

describe("population dynamics", () => {
  it("a blue-only meadow levels off instead of growing forever", () => {
    const sim = run(preset("meadow"), 1500);
    const tail = sim.history.blue.slice(-500);
    const lo = Math.min(...tail);
    const hi = Math.max(...tail);
    expect(lo).toBeGreaterThan(150);
    expect(hi).toBeLessThan(320);
    expect(hi - lo).toBeLessThan(0.4 * hi);
  });

  it("balanced gardens keep both groups alive with out-of-phase waves", () => {
    for (const seed of [4242, 2, 5]) {
      const sim = run(preset("balanced", seed), 1500);
      expect(sim.counts[BLUE]).toBeGreaterThan(0);
      expect(sim.counts[RED]).toBeGreaterThan(0);
      const w = waveStats(sim);
      expect(w.waves).toBeGreaterThanOrEqual(2);
      expect(w.lag!).toBeGreaterThan(20);
      expect(Math.max(...sim.history.blue)).toBeLessThan(260);
    }
  });

  it("red-heavy: blues dip first, then reds fade", () => {
    const sim = run(preset("redheavy"), 300);
    const h = sim.history;
    const blueTrough = turningPoints(h.t, smooth(h.blue, 9), 8).find((t) => !t.peak)!;
    const redSeries = smooth(h.red, 9);
    const redMaxBeforeBlueTrough = Math.max(...redSeries.slice(0, blueTrough.i + 1));
    const redLater = Math.min(...redSeries.slice(blueTrough.i));
    expect(blueTrough.t).toBeLessThan(200);
    expect(redLater).toBeLessThan(redMaxBeforeBlueTrough * 0.75);
    expect(summarize(sim).headline).toMatch(/Blues dipped first/);
  });

  it("fruit-rich gardens boom harder than balanced ones", () => {
    const rich = run(preset("rich", 4242), 400);
    const base = run(preset("balanced", 4242), 400);
    expect(rich.stats.peak[BLUE]).toBeGreaterThan(base.stats.peak[BLUE] * 1.4);
  });

  it("low-fruit gardens stay small", () => {
    const sim = run(preset("lowfruit", 4242), 900);
    expect(sim.stats.peak[BLUE]).toBeLessThan(70);
    expect(sim.counts[BLUE]).toBeGreaterThan(0);
    expect(summarize(sim).lines.join(" ")).toMatch(/Low fruit kept the garden small/);
  });
});

describe("params", () => {
  it("clamps and snaps to slider steps", () => {
    expect(clampParam("trees", 999)).toBe(60);
    expect(clampParam("blueSpeed", 2.637)).toBeCloseTo(2.6, 5);
  });

  it("every preset builds a valid garden", () => {
    for (const p of PRESETS) {
      const sim = new Simulation(presetParams(p));
      expect(sim.trees.length).toBe(sim.params.trees);
      expect(sim.blobs.length).toBe(sim.params.blueStart + sim.params.redStart);
      for (const b of sim.blobs) expect(Math.hypot(b.x, b.z)).toBeLessThan(sim.radius);
    }
  });
});
