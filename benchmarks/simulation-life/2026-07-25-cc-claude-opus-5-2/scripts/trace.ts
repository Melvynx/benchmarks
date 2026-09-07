/**
 * Prints one run as a table plus an ASCII plot, so the energy rules can be
 * debugged directly. Development tool; not part of the app.
 *
 *   pnpm exec tsx scripts/trace.ts [seconds] [key=value ...]
 */
import { DEFAULTS, type Params } from "../src/sim/params";
import { World, DT } from "../src/sim/world";

const seconds = Number(process.argv[2] ?? 600);
const over: Record<string, number> = {};
for (const arg of process.argv.slice(3)) {
  const [k, v] = arg.split("=");
  if (k && v !== undefined) over[k] = Number(v);
}
const params: Params = { ...DEFAULTS, ...(over as Partial<Params>) };
console.log("params:", JSON.stringify(over));

const w = new World(params);
const steps = Math.round(seconds / DT);
for (let i = 0; i < steps; i++) w.step();

const actions = new Map<string, number>();
for (const b of w.blobs)
  actions.set(`${b.species}:${b.action}`, (actions.get(`${b.species}:${b.action}`) ?? 0) + 1);
console.log("final actions:", JSON.stringify(Object.fromEntries(actions)));
console.log(
  "final blue energies:",
  w.blobs
    .filter((b) => b.species === "blue")
    .slice(0, 12)
    .map((b) => `${b.energy.toFixed(0)}/${b.meals}m/${b.age.toFixed(0)}s`)
    .join(" "),
);

const every = Math.max(1, Math.round(w.history.length / 60));
console.log("\n   t   blue  red  fruit | blueE redE | bSpd bVis rSpd | bars");
for (let i = 0; i < w.history.length; i += every) {
  const s = w.history[i];
  const bar =
    "#".repeat(Math.min(40, s.blue)) + "·".repeat(Math.min(20, s.red));
  console.log(
    `${s.t.toFixed(0).padStart(5)} ${s.blue.toString().padStart(4)} ${s.red
      .toString()
      .padStart(4)} ${s.fruit.toString().padStart(6)} | ${s.blueEnergy
      .toFixed(0)
      .padStart(5)} ${s.redEnergy.toFixed(0).padStart(4)} | ${s.blueSpeed
      .toFixed(2)} ${s.blueVision.toFixed(2)} ${s.redSpeed.toFixed(2)} | ${bar}`,
  );
}
const st = w.stats;
console.log(
  `\nblue: ${st.blueBirths} born, ${st.blueTaken} taken, ${st.blueStarved} starved, ${st.blueAged} aged`,
);
console.log(
  `red:  ${st.redBirths} born, ${st.redStarved} starved, ${st.redAged} aged, ${st.contacts} contacts`,
);
const reds = w.history.reduce((a, h) => a + h.red, 0) * 0.5;
console.log(
  `contacts ${st.contacts}, give-ups ${st.giveUps}, catch rate ${(
    (st.contacts / Math.max(1, st.contacts + st.giveUps)) * 100
  ).toFixed(0)}%, contacts per red-minute ${(st.contacts / Math.max(1, reds / 60)).toFixed(2)}`,
);
console.log(`meals ${st.meals}, peak blue ${st.peakBlue}, peak red ${st.peakRed}`);
