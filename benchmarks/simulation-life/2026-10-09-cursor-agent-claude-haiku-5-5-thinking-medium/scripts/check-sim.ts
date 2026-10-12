import { DEFAULTS, PRESETS, type Settings } from "../src/settings.ts";
import { createWorld, step, snapshot, SIM_DT } from "../src/sim.ts";

const seconds = Number(process.env.SECONDS ?? 600);
const seeds = (process.env.SEEDS ?? "1,2,3").split(",").map(Number);
const only = process.env.PRESET;

for (const p of PRESETS) {
  if (only && p.id !== only) continue;
  for (const seed of seeds) {
    const s: Settings = { ...DEFAULTS, ...p.values, ...JSON.parse(process.env.OVR ?? "{}"), seed };
    const w = createWorld(s);
    const series = [];
    const steps = Math.round(seconds / SIM_DT);
    for (let i = 0; i < steps; i++) {
      step(w, SIM_DT);
      if (i % 20 === 0) series.push(snapshot(w));
    }
    const half = series.slice(series.length / 2);
    const mm = (k: "blue" | "red" | "fruit") => {
      const v = half.map((x) => x[k]);
      return `${Math.min(...v)}-${Math.max(...v)}`;
    };
    // count local peaks in blue & red over second half (crude oscillation indicator)
    const peaks = (k: "blue" | "red") => {
      const v = half.map((x) => x[k]);
      let n = 0;
      for (let i = 1; i < v.length - 1; i++) if (v[i] > v[i - 1] && v[i] >= v[i + 1] && v[i] > 3) n++;
      return n;
    };
    const last = series[series.length - 1];
    const bs = series.map((x) => x.blue).filter((_, i) => i % 3 === 0).join(" ");
    const rs = series.map((x) => x.red).filter((_, i) => i % 3 === 0).join(" ");
    console.log(
      `${p.id} seed=${seed} t=${last.t.toFixed(0)} end: F=${last.fruit} B=${last.blue} R=${last.red} | 2nd-half range B ${mm("blue")} R ${mm("red")} F ${mm("fruit")} | peaks B=${peaks("blue")} R=${peaks("red")} | births B${w.totals.blueBirths}/R${w.totals.redBirths} deaths B${w.totals.blueDeaths}/R${w.totals.redDeaths}`,
    );
    if (process.env.TRACE) {
      console.log("  B:", bs);
      console.log("  R:", rs);
    }
  }
}
