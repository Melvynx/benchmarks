import { Sim, DEFAULTS, TUNING } from "../src/sim";

const argv = (globalThis as { process?: { argv: string[] } }).process?.argv ?? [];
const over = argv[2] ? JSON.parse(argv[2]) : {};
if (argv[3]) Object.assign(TUNING, JSON.parse(argv[3]));
const until = Number(argv[4] ?? 200);

const sim = new Sim({ ...DEFAULTS, ...over });
let tick = 0;
let tagged: Record<string, number> = {};
let starved: Record<string, number> = {};
while (sim.time < until) {
  sim.step();
  tick++;
  for (const e of sim.events) {
    if (e.type === "tag" && e.blob) {
      const k = `${e.blob.action}${e.blob.hidden ? "(hid)" : ""}`;
      tagged[k] = (tagged[k] ?? 0) + 1;
    }
    if (e.type === "fade" && e.blob && e.kind === "blue") starved[e.blob.action] = (starved[e.blob.action] ?? 0) + 1;
  }
  sim.events.length = 0;
  if (tick % 400 === 0) {
    const c = sim.counts();
    const acts: Record<string, number> = {};
    let hid = 0;
    for (const b of sim.blobs) {
      acts[`${b.kind[0]}:${b.action}`] = (acts[`${b.kind[0]}:${b.action}`] ?? 0) + 1;
      if (b.hidden) hid++;
    }
    console.log(sim.time.toFixed(0), c, "fruit", sim.totalFruit(), "hidden", hid);
    console.log("   acts", JSON.stringify(acts));
    console.log("   tagged while", JSON.stringify(tagged), "starved while", JSON.stringify(starved));
    tagged = {};
    starved = {};
  }
}
