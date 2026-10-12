import { PRESETS } from "../src/presets.ts";
import { countGroup, createSim, fruitTotal, stepSim, type Sim } from "../src/sim.ts";
import { summarize } from "../src/summary.ts";
import type { Params, Sample } from "../src/types.ts";

const failures: string[] = [];

function assert(cond: boolean, message: string) {
  if (!cond) failures.push(message);
}

function run(params: Params, seconds: number) {
  const sim = createSim(params);
  const marks: Sample[] = [];
  const stride = 5;
  for (let t = 0; t < seconds; t += stride) {
    stepSim(sim, stride);
    const last = sim.history[sim.history.length - 1];
    if (last) marks.push(last);
  }
  return { sim, marks };
}

function series(marks: Sample[]) {
  return marks.map((m) => `${m.t.toFixed(0).padStart(4)} f=${m.fruit.toFixed(1).padStart(5)} b=${String(m.blue).padStart(3)} r=${String(m.red).padStart(3)}`).join("\n");
}

function peaks(values: number[], minGap: number) {
  let count = 0;
  let last = -999;
  for (let i = 1; i < values.length - 1; i += 1) {
    if (values[i] >= values[i - 1] && values[i] > values[i + 1] && values[i] >= 4 && i - last >= minGap) {
      count += 1;
      last = i;
    }
  }
  return count;
}

function slope(values: number[]) {
  const n = values.length;
  if (n < 2) return 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let sxy = 0;
  for (let i = 0; i < n; i += 1) {
    sx += i;
    sy += values[i];
    sxx += i * i;
    sxy += i * values[i];
  }
  return (n * sxy - sx * sy) / (n * sxx - sx * sx + 1e-9);
}

const balanced = PRESETS[0].params;
const rich = PRESETS[1].params;
const heavy = PRESETS[2].params;
const low = PRESETS[4].params;

{
  const sim = createSim({ ...balanced, trees: 1, blues: 1, reds: 0, fruitDelay: 2, fruitLimit: 6, blueEat: 0.4 });
  const tree = sim.trees[0];
  const blob = sim.blobs[0];
  blob.x = tree.x;
  blob.z = tree.z;
  blob.energy = 2;
  blob.action = "wander";
  const before = tree.fruit;
  stepSim(sim, 0.05);
  assert(tree.fruit === before - 1, `eat should take a fruit, before ${before} after ${tree.fruit}`);
  assert(blob.action === "eat", `blob should be eating, got ${blob.action}`);
  stepSim(sim, 0.5);
  assert(sim.meals === 1, `meal should finish, meals=${sim.meals} energy=${blob.energy}`);
  assert(blob.energy > 2, "meal should raise energy");
  tree.fruit = 0;
  tree.regen = 0;
  const fruitAt = tree.fruit;
  stepSim(sim, 1);
  assert(tree.fruit > fruitAt, `fruit should regrow, ${fruitAt} -> ${tree.fruit}`);
}

{
  const sim = createSim({ ...balanced, trees: 0, blues: 1, reds: 1 });
  const blue = sim.blobs.find((b) => b.group === "blue")!;
  const red = sim.blobs.find((b) => b.group === "red")!;
  blue.x = 0;
  blue.z = 0;
  blue.energy = 8;
  red.x = 0.2;
  red.z = 0;
  red.energy = 3;
  red.action = "hunt";
  stepSim(sim, 0.05);
  assert(sim.contacts === 1, `contact should happen, contacts=${sim.contacts}`);
  assert(red.action === "pause", `red should pause, got ${red.action}`);
  assert(red.energy > 3, "red should gain energy from contact");
  assert(blue.energy < 8, "blue should lose energy on contact");
  const paused = red.actionTimer;
  stepSim(sim, 0.05);
  assert(sim.contacts === 1, "pause should block an immediate second contact");
  assert(red.actionTimer < paused, "pause timer should count down");
}

{
  const sim = createSim({ ...balanced, blues: 1, reds: 0, trees: 0 });
  const blue = sim.blobs[0];
  blue.energy = 30;
  blue.birthCd = 0;
  blue.action = "wander";
  const before = blue.energy;
  stepSim(sim, 0.05);
  assert(countGroup(sim, "blue") === 2, `birth should add a blob, count=${countGroup(sim, "blue")}`);
  assert(blue.energy < before - 1, "birth should spend parent energy");
  const child = sim.blobs.find((b) => b.id !== blue.id)!;
  assert(child.generation === blue.generation + 1, "child generation should increase");
  assert(child.family === blue.family, "child should keep the family");
  const pool = sim.blobs.reduce((s, b) => s + b.energy, 0);
  assert(pool < before, `birth should not create free energy, before ${before} pool ${pool}`);
}

function report(name: string, seconds: number, params: Params) {
  const { sim, marks } = run(params, seconds);
  const blue = marks.map((m) => m.blue);
  const red = marks.map((m) => m.red);
  const fruit = marks.map((m) => m.fruit);
  const pop = marks.map((m) => m.blue + m.red);
  const text = summarize(sim.history, params.trees * params.fruitLimit).join(" | ");
  console.log(`\n== ${name} ==`);
  console.log(series(marks.filter((_, i) => i % 2 === 0)));
  console.log(
    `meals=${sim.meals} contacts=${sim.contacts} births=${sim.births} deaths=${sim.deaths} maxB=${Math.max(...blue)} maxR=${Math.max(...red)} maxPop=${Math.max(...pop)} endB=${blue.at(-1)} endR=${red.at(-1)} peaksB=${peaks(blue, 3)} peaksR=${peaks(red, 3)} slope=${slope(pop.slice(-12)).toFixed(3)}`,
  );
  console.log(text);
  return { sim, marks, blue, red, fruit, pop };
}

const bal = report("balanced", 360, balanced);
const richRun = report("fruit-rich", 40, rich);
const balShort = report("balanced-short", 40, balanced);
const lowRun = report("low-fruit", 120, low);
const heavyRun = report("red-heavy", 140, heavy);

assert(bal.sim.meals > 40, "balanced garden should eat fruit");
assert(bal.sim.contacts > 15, "balanced garden should have contacts");
assert(Math.max(...bal.pop) < 160, `population ran away: ${Math.max(...bal.pop)}`);
assert(peaks(bal.blue, 4) >= 2, `balanced blue waves missing, peaks=${peaks(bal.blue, 4)}`);
assert((bal.blue.at(-1) ?? 0) > 0 && (bal.red.at(-1) ?? 0) > 0, "balanced garden should keep both groups");
assert(Math.abs(slope(bal.pop.slice(-16))) < 1.2, "balanced population should level off");

const richBlue = richRun.blue.reduce((s, v) => s + v, 0) / richRun.blue.length;
const balBlue = balShort.blue.reduce((s, v) => s + v, 0) / balShort.blue.length;
assert(richBlue > balBlue * 1.15, `fruit-rich blues should grow faster (${richBlue.toFixed(1)} vs ${balBlue.toFixed(1)})`);

const lowPop = lowRun.pop.reduce((s, v) => s + v, 0) / lowRun.pop.length;
const balPop = bal.marks.slice(0, lowRun.marks.length).reduce((s, m) => s + m.blue + m.red, 0) / lowRun.marks.length;
assert(lowPop < balPop * 0.75, `low fruit should stay smaller (${lowPop.toFixed(1)} vs ${balPop.toFixed(1)})`);

const heavyEarly = heavyRun.marks.find((m) => m.t >= 15) ?? heavyRun.marks[3];
assert(heavyEarly.blue < heavy.blues, `red-heavy blues should dip first (${heavyEarly.blue} vs start ${heavy.blues})`);
const redPeak = Math.max(...heavyRun.red);
const redEnd = heavyRun.red.at(-1) ?? 0;
assert(redEnd < redPeak * 0.7, `red-heavy reds should fade later (peak ${redPeak} end ${redEnd})`);

const phraseHistory: Sample[] = [];
for (let i = 0; i < 80; i += 1) {
  phraseHistory.push({
    t: i * 0.5,
    fruit: 14,
    blue: 14 + Math.sin(i / 6) * 5,
    red: 11 + Math.sin(i / 6 - 1.4) * 4,
    blueSpeed: 1,
    redSpeed: 1,
    blueVision: 1,
    redVision: 1,
  });
}
const phrases = summarize(phraseHistory, 40).join(" ");
assert(phrases.includes("Blue blobs grew first"), `phase phrase missing: ${phrases}`);
assert(phrases.includes("The garden stayed balanced"), `balance phrase missing: ${phrases}`);

const quiet: Sample[] = Array.from({ length: 30 }, (_, i) => ({
  t: i,
  fruit: 2,
  blue: i < 10 ? 6 - i * 0.5 : 0,
  red: i < 20 ? 8 : 0,
  blueSpeed: null,
  redSpeed: null,
  blueVision: null,
  redVision: null,
}));
assert(summarize(quiet, 8).some((line) => line.includes("faded")), "fade phrase missing");

const small: Sample[] = Array.from({ length: 30 }, (_, i) => ({
  t: i,
  fruit: 3,
  blue: 4,
  red: 2,
  blueSpeed: 1,
  redSpeed: 1,
  blueVision: 1,
  redVision: 1,
}));
assert(summarize(small, 8).some((line) => line.includes("Low fruit")), "low fruit phrase missing");

if (failures.length) {
  console.error("\nFAILURES");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log("\nAll checks passed.");

void (null as Sim | null);
