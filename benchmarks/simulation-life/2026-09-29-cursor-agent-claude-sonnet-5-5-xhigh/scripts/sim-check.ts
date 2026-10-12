import { K, World } from '../src/sim/engine';
import { DEFAULT_PARAMS, PRESETS, type Params } from '../src/sim/params';

const args = process.argv.slice(2);
const presetId = args[0] ?? 'balanced';
const duration = Number(args[1] ?? 1800);
const seeds = (args[2] ?? '7').split(',').map(Number);
const overrides: Partial<Params> = {};
for (const a of args.slice(3)) {
  const [k, v] = a.split('=');
  if (k.startsWith('K.')) (K as Record<string, number>)[k.slice(2)] = Number(v);
  else (overrides as Record<string, number>)[k] = Number(v);
}

const preset = PRESETS.find((p) => p.id === presetId);
if (!preset) throw new Error(`unknown preset ${presetId}`);

for (const seed of seeds) {
  const params: Params = { ...DEFAULT_PARAMS, ...preset.params, ...overrides, seed };
  const world = new World(params);
  world.emitEvents = false;
  const lines: string[] = [];
  let next = 0;
  const step = 30;
  const t0 = Date.now();
  while (world.time < duration) {
    world.step();
    if (world.time >= next) {
      const s = world.history.samples[world.history.samples.length - 1];
      lines.push(
        `${String(Math.round(world.time)).padStart(5)}s  fruit ${String(world.fruitCount).padStart(3)}/${world.fruitCapacity}  blue ${String(world.blueCount).padStart(3)}  red ${String(world.redCount).padStart(3)}  bE ${s.blueEnergy.toFixed(0).padStart(3)} rE ${s.redEnergy.toFixed(0).padStart(3)}`,
      );
      next += step;
    }
  }
  const st = world.stats;
  console.log(`== ${presetId} seed ${seed} (${((Date.now() - t0) / 1000).toFixed(1)}s cpu)`);
  console.log(lines.join('\n'));
  console.log(
    `born b/r ${st.blueBorn}/${st.redBorn}  starved b ${st.blueStarved} drained b ${st.blueDrained} starved r ${st.redStarved}  fruit eaten ${st.fruitEaten}  contacts ${st.contacts}`,
  );
}
