import { describe, expect, it } from "vitest";
import { stats, waveReport } from "./analysis";
import { MAX_BLOBS, Simulation } from "./engine";
import { presetParams, type Params } from "./params";
import { runStory } from "./summary";

function run(params: Params, seconds: number) {
  const sim = new Simulation(params);
  for (let t = 0; t < seconds; t++) {
    sim.advance(1);
    const c = sim.counts();
    if (c.blue === 0 && c.red === 0) break;
  }
  return sim;
}

const series = (sim: Simulation, key: "blue" | "red" | "fruit") => sim.history.map((s) => s[key]);

describe("engine", () => {
  it("is deterministic for a given seed", () => {
    const p = presetParams("balanced");
    const a = run(p, 120);
    const b = run(p, 120);
    expect(series(a, "blue")).toEqual(series(b, "blue"));
    expect(series(a, "red")).toEqual(series(b, "red"));
    expect(a.blobs.map((x) => x.energy)).toEqual(b.blobs.map((x) => x.energy));
  });

  it("eating removes fruit from the tree and it regrows later", () => {
    const sim = new Simulation({ ...presetParams("balanced"), startRed: 0 });
    const eaten = sim.trees.map(() => 0);
    let slotEmptied = false;
    for (let i = 0; i < 400; i++) {
      sim.step();
      for (const t of sim.trees) {
        if (t.eatenTotal > eaten[t.id]) {
          eaten[t.id] = t.eatenTotal;
          if (t.slots.some((s) => s.state === "eaten" || s.state === "waiting" || s.state === "growing")) slotEmptied = true;
        }
      }
    }
    expect(sim.totals.fruitEaten).toBeGreaterThan(0);
    expect(slotEmptied).toBe(true);
  });

  it("blues alone level out on fruit instead of growing forever", () => {
    const sim = run({ ...presetParams("balanced"), startRed: 0 }, 1500);
    const late = stats(series(sim, "blue").slice(-600));
    expect(late.mean).toBeGreaterThan(40);
    expect(late.cv).toBeLessThan(0.2);
    expect(sim.peakBlue).toBeLessThan(MAX_BLOBS / 4);
  });
});

describe("presets", () => {
  it("balanced: reds trail blues in repeated waves", () => {
    const sim = run(presetParams("balanced"), 2400);
    const wr = waveReport(sim.history);
    expect(sim.counts().blue).toBeGreaterThan(0);
    expect(wr.pairedWaves).toBeGreaterThanOrEqual(2);
    expect(wr.meanLagSeconds).toBeGreaterThan(20);
    expect(sim.peakBlue).toBeLessThan(250);
  });

  it("fruit-rich: blues grow quickly", () => {
    const p = presetParams("fruit-rich");
    const sim = run(p, 150);
    expect(Math.max(...series(sim, "blue"))).toBeGreaterThan(p.startBlue * 3);
  });

  it("low-fruit: the whole garden stays small", () => {
    const low = run(presetParams("low-fruit"), 1200);
    expect(low.peakBlue).toBeLessThan(45);
    expect(low.peakRed).toBeLessThan(10);
  });

  it("red-heavy: blues dip first, reds fade later", () => {
    const p = presetParams("red-heavy");
    const sim = run(p, 1200);
    const blue = series(sim, "blue");
    const red = series(sim, "red");
    const blueLow = blue.indexOf(Math.min(...blue.slice(0, 600)));
    const redHalf = red.findIndex((v, i) => i > blueLow && v <= p.startRed / 2);
    expect(blue[blueLow]).toBeLessThan(p.startBlue * 0.75);
    expect(redHalf).toBeGreaterThan(blueLow);
  });

  it("writes a story from recorded data", () => {
    const sim = run(presetParams("balanced"), 900);
    const story = runStory(sim);
    expect(story.length).toBeGreaterThan(3);
    expect(story.some((l) => /wave/.test(l.text))).toBe(true);
  });
});
