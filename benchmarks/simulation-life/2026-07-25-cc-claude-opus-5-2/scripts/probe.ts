/**
 * Dumps per-blob foraging state at a chosen moment, to find out why blobs
 * starve. Development tool; not part of the app.
 *
 *   pnpm exec tsx scripts/probe.ts 350 worldSize=40 ...
 */
import { DEFAULTS, type Params } from "../src/sim/params";
import { World, DT } from "../src/sim/world";

const seconds = Number(process.argv[2] ?? 350);
const over: Record<string, number> = {};
for (const arg of process.argv.slice(3)) {
  const [k, v] = arg.split("=");
  if (k && v !== undefined) over[k] = Number(v);
}
const params: Params = { ...DEFAULTS, ...(over as Partial<Params>) };
const w = new World(params);
for (let i = 0; i < Math.round(seconds / DT); i++) w.step();

const fruited = w.trees.filter((t) => t.fruit > 0);
console.log(
  `t=${w.time.toFixed(0)} blobs=${w.blobs.length} trees with fruit=${fruited.length}/${w.trees.length} total fruit=${w.trees.reduce((a, t) => a + t.fruit, 0)}`,
);
console.log("\nid    sp   energy age   action       vision reach  nearestFruitTree  targetTree");
for (const b of w.blobs.slice(0, 30)) {
  const vision = (b.species === "blue" ? params.blueVision : params.redVision) * b.traits.vision;
  let nearest = Infinity;
  for (const t of fruited) nearest = Math.min(nearest, Math.hypot(t.x - b.x, t.y - b.y));
  console.log(
    `${String(b.id).padStart(5)} ${b.species.padEnd(4)} ${b.energy
      .toFixed(0)
      .padStart(5)} ${b.age.toFixed(0).padStart(4)} ${b.action.padEnd(12)} ${vision
      .toFixed(1)
      .padStart(5)} ${(vision * 1.7).toFixed(1).padStart(6)} ${nearest
      .toFixed(1)
      .padStart(6)}            ${b.targetTree}`,
  );
}

// How far is fruit from a typical point in the dish?
let sum = 0;
let n = 0;
for (const b of w.blobs) {
  let nearest = Infinity;
  for (const t of fruited) nearest = Math.min(nearest, Math.hypot(t.x - b.x, t.y - b.y));
  if (Number.isFinite(nearest)) {
    sum += nearest;
    n++;
  }
}
console.log(`\nmean distance to nearest fruited tree: ${(sum / (n || 1)).toFixed(1)}`);
console.log(
  `fruit per tree: ${w.trees.map((t) => t.fruit).join(",")}`,
);
