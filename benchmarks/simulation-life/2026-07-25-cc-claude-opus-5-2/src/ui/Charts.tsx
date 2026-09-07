import { useMemo, useState } from "react";
import type { HistorySample } from "../sim/types";
import type { RunStats } from "../sim/world";
import { summarize } from "../analysis/summary";

const W = 640;
const H = 210;
const PAD = { l: 34, r: 38, t: 12, b: 22 };

/** Keeps long runs cheap to draw without hiding the shape of the curve. */
function thin<T>(rows: T[], max = 420): T[] {
  if (rows.length <= max) return rows;
  const step = rows.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(rows[Math.floor(i * step)]);
  out.push(rows[rows.length - 1]);
  return out;
}

/** Smallest friendly round number at or above v, on a fine ladder so the
 *  curves actually fill the box instead of hugging the floor. */
function niceTop(v: number) {
  if (v <= 5) return 5;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  for (const step of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10])
    if (n <= step) return step * mag;
  return 10 * mag;
}

function line(pts: { x: number; y: number }[]) {
  return pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}

function clock(t: number) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return m > 0 ? `${m}m${s.toString().padStart(2, "0")}` : `${s}s`;
}

interface DataProps {
  history: HistorySample[];
  version: number;
}

export function PopulationChart({ history, version }: DataProps) {
  const [hover, setHover] = useState<number | null>(null);

  const view = useMemo(() => {
    const rows = thin(history);
    const span = history.length ? history[history.length - 1].t : 1;
    const topBlobs = niceTop(
      Math.max(5, ...rows.map((r) => Math.max(r.blue, r.red))) * 1.06,
    );
    const topFruit = niceTop(Math.max(5, ...rows.map((r) => r.fruit)) * 1.06);
    const iw = W - PAD.l - PAD.r;
    const ih = H - PAD.t - PAD.b;
    const x = (t: number) => PAD.l + (span > 0 ? (t / span) * iw : 0);
    const yb = (v: number) => PAD.t + ih - (v / topBlobs) * ih;
    const yf = (v: number) => PAD.t + ih - (v / topFruit) * ih;
    return {
      rows,
      span,
      topBlobs,
      topFruit,
      ih,
      blue: line(rows.map((r) => ({ x: x(r.t), y: yb(r.blue) }))),
      red: line(rows.map((r) => ({ x: x(r.t), y: yb(r.red) }))),
      fruit:
        rows.length > 1
          ? `${line(rows.map((r) => ({ x: x(r.t), y: yf(r.fruit) })))} L${x(
              rows[rows.length - 1].t,
            ).toFixed(1)} ${PAD.t + ih} L${PAD.l} ${PAD.t + ih} Z`
          : "",
      x,
      yb,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const at = hover === null ? null : view.rows[Math.min(view.rows.length - 1, hover)];

  return (
    <div className="chart-body">
      <div className="legend">
        <span>
          <i className="swatch" style={{ background: "#8dc26a", height: 8, opacity: 0.55 }} />
          Fruit on trees (right)
        </span>
        <span>
          <i className="swatch" style={{ background: "var(--blue)" }} />
          Blue blobs (left)
        </span>
        <span>
          <i className="swatch" style={{ background: "var(--red)" }} />
          Red blobs (left)
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const k = (px - PAD.l) / (W - PAD.l - PAD.r);
          setHover(Math.round(Math.max(0, Math.min(1, k)) * (view.rows.length - 1)));
        }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((k) => (
          <g key={k}>
            <line
              x1={PAD.l}
              x2={W - PAD.r}
              y1={PAD.t + view.ih * k}
              y2={PAD.t + view.ih * k}
              stroke="#e8eee7"
            />
            <text className="axis" x={PAD.l - 6} y={PAD.t + view.ih * k + 3} textAnchor="end">
              {Math.round(view.topBlobs * (1 - k))}
            </text>
            <text className="axis" x={W - PAD.r + 6} y={PAD.t + view.ih * k + 3} fill="#6f9155">
              {Math.round(view.topFruit * (1 - k))}
            </text>
          </g>
        ))}
        <path d={view.fruit} fill="rgba(141,194,106,0.28)" stroke="#7cb35c" strokeWidth={1} />
        <path d={view.blue} fill="none" stroke="var(--blue)" strokeWidth={1.9} />
        <path d={view.red} fill="none" stroke="var(--red)" strokeWidth={1.9} />
        {[0, 0.5, 1].map((k) => (
          <text
            key={k}
            className="axis"
            x={PAD.l + (W - PAD.l - PAD.r) * k}
            y={H - 6}
            textAnchor={k === 0 ? "start" : k === 1 ? "end" : "middle"}
          >
            {clock(view.span * k)}
          </text>
        ))}
        {at && (
          <g>
            <line
              x1={view.x(at.t)}
              x2={view.x(at.t)}
              y1={PAD.t}
              y2={PAD.t + view.ih}
              stroke="#9fb3a4"
              strokeDasharray="3 3"
            />
            <circle cx={view.x(at.t)} cy={view.yb(at.blue)} r={3} fill="var(--blue)" />
            <circle cx={view.x(at.t)} cy={view.yb(at.red)} r={3} fill="var(--red)" />
            <text
              className="axis"
              x={Math.min(W - PAD.r, view.x(at.t) + 6)}
              y={PAD.t + 10}
              textAnchor={view.x(at.t) > W * 0.7 ? "end" : "start"}
              fill="#33473a"
            >
              {clock(at.t)} · {at.blue} blue · {at.red} red · {at.fruit} fruit
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

const PW = 260;
const PH = 210;

export function PhasePlot({ history, version }: DataProps) {
  const view = useMemo(() => {
    const rows = thin(history, 300);
    const mb = Math.max(5, ...rows.map((r) => r.blue));
    const mr = Math.max(5, ...rows.map((r) => r.red));
    const topB = niceTop(mb * 1.08);
    const topR = niceTop(mr * 1.08);
    const x = (v: number) => 30 + (v / topB) * (PW - 42);
    const y = (v: number) => PH - 24 - (v / topR) * (PH - 40);
    const segs = rows.slice(1).map((r, i) => ({
      d: `M${x(rows[i].blue).toFixed(1)} ${y(rows[i].red).toFixed(1)} L${x(r.blue).toFixed(
        1,
      )} ${y(r.red).toFixed(1)}`,
      k: (i + 1) / rows.length,
    }));
    const last = rows[rows.length - 1];
    return { segs, topB, topR, last: last ? { x: x(last.blue), y: y(last.red) } : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <div className="chart-body">
      <svg viewBox={`0 0 ${PW} ${PH}`}>
        <line x1={30} x2={PW - 12} y1={PH - 24} y2={PH - 24} stroke="#dbe5da" />
        <line x1={30} x2={30} y1={16} y2={PH - 24} stroke="#dbe5da" />
        {view.segs.map((s, i) => (
          <path
            key={i}
            d={s.d}
            stroke="#4d7f8f"
            strokeOpacity={0.12 + s.k * 0.75}
            strokeWidth={1.4}
            fill="none"
          />
        ))}
        {view.last && <circle cx={view.last.x} cy={view.last.y} r={4} fill="#e2604a" />}
        <text className="axis" x={PW - 12} y={PH - 10} textAnchor="end">
          blue → {view.topB}
        </text>
        <text className="axis" x={26} y={14} textAnchor="end" transform={`rotate(-90 26 14)`}>
          red → {view.topR}
        </text>
      </svg>
      <p className="ctl-hint" style={{ marginTop: -4 }}>
        Each loop drawn counter-clockwise is one full wave: blue rises, red follows,
        blue falls, red fades. Brighter is more recent.
      </p>
    </div>
  );
}

export function TraitChart({ history, version }: DataProps) {
  const view = useMemo(() => {
    const rows = thin(history, 300).filter((r) => r.blue > 0 || r.red > 0);
    const vals = rows.flatMap((r) =>
      [r.blueSpeed, r.redSpeed, r.blueVision, r.redVision].filter((v) => v > 0),
    );
    const lo = Math.min(0.94, ...vals) - 0.02;
    const hi = Math.max(1.06, ...vals) + 0.02;
    const span = rows.length ? rows[rows.length - 1].t : 1;
    const x = (t: number) => 30 + (span ? t / span : 0) * (PW - 42);
    const y = (v: number) => PH - 24 - ((v - lo) / (hi - lo)) * (PH - 40);
    const series = (pick: (r: HistorySample) => number, alive: (r: HistorySample) => number) =>
      line(rows.filter((r) => alive(r) > 0).map((r) => ({ x: x(r.t), y: y(pick(r)) })));
    return {
      lo,
      hi,
      blueSpeed: series((r) => r.blueSpeed, (r) => r.blue),
      redSpeed: series((r) => r.redSpeed, (r) => r.red),
      blueVision: series((r) => r.blueVision, (r) => r.blue),
      redVision: series((r) => r.redVision, (r) => r.red),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return (
    <div className="chart-body">
      <svg viewBox={`0 0 ${PW} ${PH}`}>
        {[0, 0.5, 1].map((k) => (
          <g key={k}>
            <line
              x1={30}
              x2={PW - 12}
              y1={16 + (PH - 40) * k}
              y2={16 + (PH - 40) * k}
              stroke="#eef2ed"
            />
            <text className="axis" x={26} y={19 + (PH - 40) * k} textAnchor="end">
              {(view.hi - (view.hi - view.lo) * k).toFixed(2)}
            </text>
          </g>
        ))}
        <path d={view.blueSpeed} fill="none" stroke="var(--blue)" strokeWidth={1.7} />
        <path d={view.redSpeed} fill="none" stroke="var(--red)" strokeWidth={1.7} />
        <path
          d={view.blueVision}
          fill="none"
          stroke="var(--blue)"
          strokeWidth={1.4}
          strokeDasharray="4 3"
          opacity={0.75}
        />
        <path
          d={view.redVision}
          fill="none"
          stroke="var(--red)"
          strokeWidth={1.4}
          strokeDasharray="4 3"
          opacity={0.75}
        />
      </svg>
      <p className="ctl-hint" style={{ marginTop: -4 }}>
        Average inherited multipliers. Solid is speed, dashed is sensing range — they
        drift as the blobs that survive pass their traits on.
      </p>
    </div>
  );
}

export function SummaryPanel({
  history,
  stats,
  version,
}: DataProps & { stats: RunStats }) {
  const s = useMemo(
    () => summarize(history, stats),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [version],
  );
  return (
    <div className="summary">
      <p className="headline">{s.headline}</p>
      <ul>
        {s.notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
      <div className="chips">
        {s.tags.map((t) => (
          <span className="chip" key={t}>
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export function StatGrid({ stats }: { stats: RunStats }) {
  const cells: [string, string | number][] = [
    ["Peak blue", stats.peakBlue],
    ["Peak red", stats.peakRed],
    ["Fruit eaten", stats.meals],
    ["Contacts", stats.contacts],
    ["Chases dropped", stats.giveUps],
    ["Blue born", stats.blueBirths],
    ["Red born", stats.redBirths],
    ["Blue taken by red", stats.blueTaken],
    ["Blue out of energy", stats.blueStarved],
    ["Red out of energy", stats.redStarved],
    ["Died of old age", stats.blueAged + stats.redAged],
    ["Longest family line", `gen ${stats.maxGeneration}`],
  ];
  return (
    <div className="stat-grid">
      {cells.map(([label, v]) => (
        <div className="stat" key={label}>
          <b>{v}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
