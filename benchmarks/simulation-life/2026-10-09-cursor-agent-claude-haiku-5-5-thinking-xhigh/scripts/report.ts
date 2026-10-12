import { PRESETS, DEFAULT_PARAMS, type Params } from '../src/sim/params';
import { Engine } from '../src/sim/engine';
import { summarize, fmtTime } from '../src/sim/analysis';

const minutes = Number(process.env.MINUTES ?? 6);
const seeds = (process.env.SEEDS ?? '4242,7,99,1234').split(',').map(Number);
const only = process.env.PRESET;

for (const preset of PRESETS) {
  if (only && preset.id !== only) continue;
  for (const seed of seeds) {
    const params: Params = { ...DEFAULT_PARAMS, ...preset.params, seed };
    const e = new Engine(params);
    e.playing = true;
    e.speed = 1;
    const t0 = Date.now();
    const steps = Math.round(minutes * 60); // stepSecond() = 1 sim second
    for (let i = 0; i < steps; i++) e.stepSecond();
    const s = summarize(e.history);
    const m = s.metrics;
    const last = e.history[e.history.length - 1];
    console.log(
      `${preset.id.padEnd(12)} seed=${String(seed).padEnd(5)} ${((Date.now() - t0) / 1000).toFixed(1)}s | ` +
        `blue pk ${m.peakBlue}@${fmtTime(m.peakBlueAt)} red pk ${m.peakRed}@${fmtTime(m.peakRedAt)} fruit mean ${m.meanFruit.toFixed(1)} | ` +
        `end b${last.blue} r${last.red} f${last.fruit} | cyc ${m.blueCycles} trend ${m.swingTrend?.toFixed(2)} | ` +
        `ext b=${m.blueExtinctAt ?? '-'} r=${m.redExtinctAt ?? '-'} | ${s.headline}`,
    );
  }
}
