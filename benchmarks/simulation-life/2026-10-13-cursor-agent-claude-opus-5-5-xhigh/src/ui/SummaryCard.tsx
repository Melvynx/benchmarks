import { useMemo } from "react";
import type { Simulation } from "../sim/simulation";
import { summarize } from "../sim/summary";

const TONE_LABEL: Record<string, string> = {
  start: "Starting",
  wave: "Waves",
  calm: "Steady",
  fade: "Shrinking",
  empty: "Empty",
  meadow: "Meadow",
};

export function SummaryCard({ sim }: { sim: Simulation }) {
  const samples = sim.history.t.length;
  const nb = sim.counts[0];
  const nr = sim.counts[1];
  const s = useMemo(
    () => summarize(sim),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sim, samples, nb === 0, nr === 0],
  );
  return (
    <div className={`card summary tone-${s.tone}`} aria-live="polite">
      <div className="card-head">
        <h2>What happened</h2>
        <span className="tone-pill">{TONE_LABEL[s.tone]}</span>
      </div>
      <p className="headline">{s.headline}</p>
      {s.lines.length > 0 && (
        <ul className="story">
          {s.lines.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      )}
      <div className="chips">
        {s.chips.map((c) => (
          <div key={c.label} className="chip">
            <span>{c.label}</span>
            <b>{c.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
