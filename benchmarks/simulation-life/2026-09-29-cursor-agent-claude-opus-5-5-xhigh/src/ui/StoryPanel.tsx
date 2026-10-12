import { useMemo, useState } from "react";
import type { Simulation } from "../sim/engine";
import { fmtTime, runStory, traitRows } from "../sim/summary";
import { COLORS, useCanvas } from "./useCanvas";

type Tab = "story" | "traits";

const SERIES = [
  { key: "blueSpeedGene", color: COLORS.blue, dash: [] as number[] },
  { key: "blueVisionGene", color: COLORS.blue, dash: [4, 3] },
  { key: "redSpeedGene", color: COLORS.red, dash: [] as number[] },
  { key: "redVisionGene", color: COLORS.red, dash: [4, 3] },
] as const;

function TraitChart({ sim, version }: { sim: Simulation; version: number }) {
  const h = sim.history;
  const { ref } = useCanvas(
    (ctx, w, hgt) => {
      const pad = { l: 36, r: 8, t: 8, b: 16 };
      let lo = 0.95;
      let hi = 1.05;
      for (const s of h) {
        for (const { key } of SERIES) {
          if (s[key] < lo) lo = s[key];
          if (s[key] > hi) hi = s[key];
        }
      }
      const span = hi - lo;
      lo -= span * 0.08;
      hi += span * 0.08;
      const pw = w - pad.l - pad.r;
      const ph = hgt - pad.t - pad.b;
      const t0 = h[0]?.t ?? 0;
      const t1 = Math.max(t0 + 30, h[h.length - 1]?.t ?? 30);
      const xOf = (t: number) => pad.l + ((t - t0) / (t1 - t0)) * pw;
      const yOf = (v: number) => pad.t + ph - ((v - lo) / (hi - lo)) * ph;

      ctx.font = "10px ui-rounded, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      for (const v of [lo + (hi - lo) * 0.1, 1, lo + (hi - lo) * 0.9]) {
        const y = yOf(v);
        ctx.strokeStyle = v === 1 ? "rgba(90,70,50,0.25)" : COLORS.grid;
        ctx.beginPath();
        ctx.moveTo(pad.l, y);
        ctx.lineTo(w - pad.r, y);
        ctx.stroke();
        ctx.fillStyle = COLORS.muted;
        ctx.fillText(`${v >= 1 ? "+" : ""}${Math.round((v - 1) * 100)}%`, pad.l - 5, y);
      }
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(fmtTime(t0), pad.l, hgt - 3);
      ctx.textAlign = "right";
      ctx.fillText(fmtTime(t1), w - pad.r, hgt - 3);
      if (h.length < 2) return;
      const stride = Math.max(1, Math.floor(h.length / pw));
      for (const { key, color, dash } of SERIES) {
        ctx.beginPath();
        for (let i = 0; i < h.length; i += stride) {
          const s = h[i];
          if (i === 0) ctx.moveTo(xOf(s.t), yOf(s[key]));
          else ctx.lineTo(xOf(s.t), yOf(s[key]));
        }
        ctx.strokeStyle = color;
        ctx.setLineDash(dash);
        ctx.lineWidth = 1.8;
        ctx.stroke();
      }
      ctx.setLineDash([]);
    },
    [version, h.length],
  );
  return (
    <div className="canvas-box traits-canvas">
      <canvas ref={ref} />
    </div>
  );
}

export function StoryPanel({ sim, version }: { sim: Simulation; version: number }) {
  const [tab, setTab] = useState<Tab>("story");
  const bucket = Math.floor(version / 8);
  // The story scans the whole history, so refresh it about once a second rather than every UI tick.
  const story = useMemo(() => runStory(sim), [sim, bucket]);
  const traits = traitRows(sim);

  return (
    <section className="card story">
      <header className="card-head">
        <div className="seg">
          <button className={tab === "story" ? "on" : ""} onClick={() => setTab("story")}>
            Run story
          </button>
          <button className={tab === "traits" ? "on" : ""} onClick={() => setTab("traits")}>
            Trait trends
          </button>
        </div>
      </header>
      {tab === "story" ? (
        <ul className="story-list">
          {story.map((l, i) => (
            <li key={i} className={`tone-${l.tone}`}>
              {l.text}
            </li>
          ))}
        </ul>
      ) : (
        <div className="traits">
          <TraitChart sim={sim} version={version} />
          <ul className="trait-rows">
            {traits.map((r) => (
              <li key={r.label} className={`tone-${r.tone}`}>
                <span>{r.label}</span>
                <b>{(r.value * 100).toFixed(1)}%</b>
                <em className={r.delta > 0.005 ? "up" : r.delta < -0.005 ? "down" : ""}>
                  {r.delta >= 0 ? "+" : ""}
                  {(r.delta * 100).toFixed(1)} pts
                </em>
              </li>
            ))}
          </ul>
          <p className="fine">
            Solid = speed gene, dashed = vision gene. Copies inherit both with small random drift; faster and farther-seeing blobs
            also burn more energy, so trends here are real selection, not a script.
          </p>
        </div>
      )}
    </section>
  );
}
