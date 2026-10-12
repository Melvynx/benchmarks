import { presetParams, type Params } from "../src/sim/params";
import { createWorld, step } from "../src/sim/world";

// usage: tsx scripts/bench.ts ['{"redStart":0}'] [preset] [warmup s] [measure s]
const args = process.argv.slice(2);
const cfg: Partial<Params> = JSON.parse(args[0] ?? "{}");
const w = createWorld({ ...presetParams(args[1] ?? "balanced"), ...cfg });
const warm = Number(args[2] ?? "200");
const measure = Number(args[3] ?? "60");

while (w.time < warm) {
  step(w);
  w.events.length = 0;
}
const n0 = w.blobs.length;
// CPU time rather than wall time, so a busy machine doesn't skew comparisons.
const c0 = process.cpuUsage();
let steps = 0;
while (w.time < warm + measure) {
  step(w);
  w.events.length = 0;
  steps++;
}
const c1 = process.cpuUsage(c0);
const ms = (c1.user + c1.system) / 1000;
console.log(
  `blobs ${n0}→${w.blobs.length} | ${(ms / steps).toFixed(3)} ms/step | ${((ms / steps / Math.max(1, w.blobs.length)) * 1000).toFixed(2)} µs/blob | blue ${w.counts.blue} red ${w.counts.red}`,
);
