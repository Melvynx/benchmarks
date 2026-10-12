import { DEFAULT_PARAMS } from '../src/sim/params';
import { Engine } from '../src/sim/engine';
const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.env.SEED ?? 1);
const every = Number(process.env.EVERY ?? 20);
const e = new Engine({ ...DEFAULT_PARAMS, ...over, seed });
e.playing = true;
const total = Number(process.env.SECONDS ?? 480);
for (let sec = 0; sec < total; sec++) {
  if (sec % every === 0) {
    const s = e.history[e.history.length - 1];
    console.log(`t=${String(sec).padStart(4)} B=${String(s.blue).padStart(3)} R=${String(s.red).padStart(3)} F=${String(s.fruit).padStart(3)} bE=${s.blueEnergy.toFixed(0).padStart(3)} rE=${s.redEnergy.toFixed(0).padStart(3)} births=${e.world.totals.births.blue}/${e.world.totals.births.red} deaths=${e.world.totals.deaths.blue}/${e.world.totals.deaths.red}`);
  }
  e.stepSecond();
}
