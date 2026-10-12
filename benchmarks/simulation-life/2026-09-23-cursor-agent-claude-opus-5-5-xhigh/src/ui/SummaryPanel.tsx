import { MOOD_LABEL } from "../sim/summary";
import { ctrl, fmtTime, shallowEqual, useSim } from "./sim";

export function SummaryPanel() {
  useSim((x) => ({ hv: Math.floor(x.historyVersion / 2), wv: x.worldVersion }), shallowEqual);
  const w = ctrl.world;
  const st = w.stats;
  const sum = ctrl.summary();

  const stats: [string, string, string?][] = [
    ["Blue now", String(w.counts.blue), `peak ${st.blueMax}${st.blueMax > 0 ? ` at ${fmtTime(st.blueMaxAt)}` : ""}`],
    ["Red now", String(w.counts.red), `peak ${st.redMax}${st.redMax > 0 ? ` at ${fmtTime(st.redMaxAt)}` : ""}`],
    ["Copies", `${st.bornBlue} / ${st.bornRed}`, "blue / red"],
    ["Blue fades", `${st.fadedBlueHungry} / ${st.fadedBlueContact}`, "hunger / contact"],
    ["Fruit eaten", String(st.fruitEaten), `${Math.round(sum.fruitPerMinute)} regrow per min`],
    ["Red waves", String(sum.waves), sum.lagSeconds !== null ? `red trails by ~${Math.round(sum.lagSeconds)}s` : "peaks so far"],
  ];

  return (
    <section className="card summary-card" aria-live="polite">
      <header className="card-head">
        <div>
          <h2 className="card-title">What happened</h2>
          <p className="card-sub">Run summary after {fmtTime(w.time)}</p>
        </div>
        <span className={`mood mood-${sum.mood}`}>{MOOD_LABEL[sum.mood]}</span>
      </header>
      <p className="summary-headline">{sum.headline}</p>
      <ul className="summary-lines">
        {sum.lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
      <dl className="summary-stats">
        {stats.map(([k, v, sub]) => (
          <div key={k} className="stat">
            <dt>{k}</dt>
            <dd>
              {v}
              {sub && <small>{sub}</small>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
