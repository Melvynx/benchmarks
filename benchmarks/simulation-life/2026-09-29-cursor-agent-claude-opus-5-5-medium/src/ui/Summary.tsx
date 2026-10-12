import { useMemo } from "react";
import type { Simulation } from "../sim/simulation";
import { summarize, type Tone } from "../sim/summary";
import { fmtTime } from "./charts";

const TONE_EMOJI: Record<Tone, string> = {
  calm: "⚖️",
  wavy: "🌊",
  boom: "🚀",
  small: "🌱",
  fade: "🌙",
  empty: "🍃",
  early: "🌅",
};

export function Summary({ sim, version }: { sim: Simulation; version: number }) {
  const bucket = Math.floor(sim.history.length / 6);
  const summary = useMemo(
    () => summarize(sim.history, sim.stats, sim.params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bucket, sim.stats.extinctAt.blue, sim.stats.extinctAt.red, sim],
  );
  void version;
  const s = sim.stats;
  return (
    <div className="summary">
      <div className={`summary-head tone-${summary.tone}`}>
        <span className="summary-emoji">{TONE_EMOJI[summary.tone]}</span>
        <p>{summary.headline}</p>
      </div>
      <ul className="summary-lines">
        {summary.lines.slice(0, 4).map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
      <div className="stat-grid">
        <div>
          <small>Peak blue</small>
          <strong className="c-blue">{s.peak.blue.value}</strong>
          <em>at {fmtTime(s.peak.blue.t)}</em>
        </div>
        <div>
          <small>Peak red</small>
          <strong className="c-red">{s.peak.red.value}</strong>
          <em>at {fmtTime(s.peak.red.t)}</em>
        </div>
        <div>
          <small>Waves</small>
          <strong>{summary.waves}</strong>
          <em>{summary.lag ? `red lags ~${Math.round(summary.lag)}s` : "—"}</em>
        </div>
        <div>
          <small>Fruit eaten</small>
          <strong className="c-fruit">{s.fruitEaten}</strong>
          <em>{s.contacts} boops</em>
        </div>
        <div>
          <small>Born</small>
          <strong>
            <span className="c-blue">{s.births.blue}</span>/<span className="c-red">{s.births.red}</span>
          </strong>
          <em>blue / red</em>
        </div>
        <div>
          <small>Faded</small>
          <strong>
            <span className="c-blue">{s.deaths.blue.starved + s.deaths.blue.old + s.deaths.blue.contact}</span>/
            <span className="c-red">{s.deaths.red.starved + s.deaths.red.old}</span>
          </strong>
          <em>{s.deaths.blue.contact} blue by boops</em>
        </div>
      </div>
    </div>
  );
}
