import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Simulation } from "../sim/simulation";
import { smooth } from "../sim/summary";

const PHASE_SMOOTH = 9;

export const C = {
  fruit: "#74b52a",
  fruitFill: "rgba(181, 242, 58, 0.22)",
  blue: "#3f88ff",
  red: "#ff5263",
  grid: "rgba(60, 50, 80, 0.08)",
  axis: "rgba(60, 50, 80, 0.45)",
  ink: "#2c2a3d",
};

const FONT = "600 11px Nunito Variable, ui-rounded, system-ui, sans-serif";

/** Round up to a friendly axis maximum, keeping ~8% headroom so lines never hug the top edge. */
function niceMax(raw: number): number {
  const v = raw * 1.08;
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function lowerBound(xs: number[], v: number): number {
  let lo = 0;
  let hi = xs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function fmtClock(s: number): string {
  const t = Math.max(0, Math.round(s));
  const m = Math.floor(t / 60);
  return `${m}:${(t % 60).toString().padStart(2, "0")}`;
}

function useCanvas(
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  deps: unknown[],
): React.RefObject<HTMLCanvasElement | null> {
  const ref = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const c = ref.current;
    if (!c || size.w < 10 || size.h < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (c.width !== Math.round(size.w * dpr) || c.height !== Math.round(size.h * dpr)) {
      c.width = Math.round(size.w * dpr);
      c.height = Math.round(size.h * dpr);
      c.style.width = `${size.w}px`;
      c.style.height = `${size.h}px`;
    }
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size.w, size.h);
    draw(ctx, size.w, size.h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, ...deps]);
  return ref;
}

function Toggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg small" role="group" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" className={v === value ? "on" : ""} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function LegendChip({ color, label, on, onClick, children }: { color: string; label: string; on: boolean; onClick: () => void; children?: ReactNode }) {
  return (
    <button type="button" className={`legend-chip ${on ? "" : "off"}`} onClick={onClick} style={{ "--c": color } as CSSProperties} aria-pressed={on}>
      <span className="sw" />
      {label}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- timeline

export function TimelineChart({ sim, version }: { sim: Simulation; version: number }) {
  const [show, setShow] = useState({ fruit: true, blue: true, red: true });
  const [scale, setScale] = useState<"split" | "shared">("split");
  const [range, setRange] = useState<"all" | "5m">("all");
  const [hover, setHover] = useState<number | null>(null);

  const ref = useCanvas(
    (ctx, w, h) => {
      const H = sim.history;
      const n = H.t.length;
      ctx.font = FONT;
      if (n < 2) {
        ctx.fillStyle = C.axis;
        ctx.fillText("Press play: the story starts here.", 16, h / 2);
        return;
      }
      const tEnd = H.t[n - 1];
      const tStart = range === "all" ? 0 : Math.max(0, tEnd - 300);
      const i0 = lowerBound(H.t, tStart);
      const split = scale === "split" && show.red;
      const padL = 38;
      const padR = split ? 38 : 14;
      const padT = 12;
      const padB = 24;
      const pw = w - padL - padR;
      const ph = h - padT - padB;
      const span = Math.max(30, tEnd - tStart);
      const xOf = (t: number) => padL + ((t - tStart) / span) * pw;

      let mf = 0;
      let mb = 0;
      let mr = 0;
      for (let i = i0; i < n; i++) {
        if (H.fruit[i] > mf) mf = H.fruit[i];
        if (H.blue[i] > mb) mb = H.blue[i];
        if (H.red[i] > mr) mr = H.red[i];
      }
      const leftMax = niceMax(
        Math.max(show.fruit ? mf : 0, show.blue ? mb : 0, !split && show.red ? mr : 0, 1),
      );
      const rightMax = niceMax(Math.max(mr, 1));
      const yL = (v: number) => padT + ph - (v / leftMax) * ph;
      const yR = (v: number) => padT + ph - (v / (split ? rightMax : leftMax)) * ph;

      ctx.lineWidth = 1;
      for (let k = 0; k <= 4; k++) {
        const y = padT + (ph * k) / 4;
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + pw, y);
        ctx.stroke();
        ctx.fillStyle = C.axis;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(String(Math.round(leftMax * (1 - k / 4))), padL - 6, y);
        if (split) {
          ctx.fillStyle = C.red;
          ctx.textAlign = "left";
          ctx.fillText(String(Math.round(rightMax * (1 - k / 4))), padL + pw + 6, y);
        }
      }

      const stepChoices = [15, 30, 60, 120, 300, 600, 1200, 1800, 3600];
      const tick = stepChoices.find((s) => span / s <= 7) ?? 7200;
      ctx.fillStyle = C.axis;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (let t = Math.ceil(tStart / tick) * tick; t <= tEnd + 0.001; t += tick) {
        const x = xOf(t);
        ctx.fillText(fmtClock(t), x, padT + ph + 7);
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(x, padT + ph);
        ctx.lineTo(x, padT + ph + 4);
        ctx.stroke();
      }

      const bucket = Math.max(1, Math.floor((n - i0) / Math.max(50, pw)));
      const series = (data: number[], y: (v: number) => number) => {
        const pts: [number, number][] = [];
        for (let i = i0; i < n; i += bucket) {
          let s = 0;
          let c = 0;
          for (let j = i; j < Math.min(n, i + bucket); j++) {
            s += data[j];
            c++;
          }
          pts.push([xOf(H.t[Math.min(n - 1, i + (bucket >> 1))]), y(s / c)]);
        }
        pts.push([xOf(H.t[n - 1]), y(data[n - 1])]);
        return pts;
      };
      const line = (pts: [number, number][], color: string, width: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";
        ctx.beginPath();
        pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
      };

      for (const m of sim.markers) {
        if (m.t < tStart) continue;
        const x = xOf(m.t);
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = m.kind === 0 ? C.blue : C.red;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + ph);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.fillStyle = m.kind === 0 ? C.blue : C.red;
        ctx.textAlign = x > padL + pw - 90 ? "right" : "left";
        ctx.textBaseline = "top";
        ctx.fillText(m.kind === 0 ? "blues vanished" : "reds vanished", x + (ctx.textAlign === "left" ? 4 : -4), padT + 2);
      }

      if (show.fruit) {
        const pts = series(H.fruit, yL);
        ctx.fillStyle = C.fruitFill;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], padT + ph);
        for (const [x, y] of pts) ctx.lineTo(x, y);
        ctx.lineTo(pts[pts.length - 1][0], padT + ph);
        ctx.closePath();
        ctx.fill();
        line(pts, C.fruit, 1.6);
      }
      if (show.blue) line(series(H.blue, yL), C.blue, 2.6);
      if (show.red) line(series(H.red, yR), C.red, 2.6);

      if (hover != null && hover >= padL && hover <= padL + pw) {
        const t = tStart + ((hover - padL) / pw) * span;
        const i = Math.min(n - 1, Math.max(i0, lowerBound(H.t, t)));
        const x = xOf(H.t[i]);
        ctx.strokeStyle = "rgba(44,42,61,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + ph);
        ctx.stroke();
        const rows: [string, string, number, number][] = [];
        if (show.fruit) rows.push([C.fruit, "Fruit", H.fruit[i], yL(H.fruit[i])]);
        if (show.blue) rows.push([C.blue, "Blue", H.blue[i], yL(H.blue[i])]);
        if (show.red) rows.push([C.red, "Red", H.red[i], yR(H.red[i])]);
        for (const [c, , , y] of rows) {
          ctx.fillStyle = "#fff";
          ctx.beginPath();
          ctx.arc(x, y, 4.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        const bw = 104;
        const bh = 20 + rows.length * 16;
        const bx = x + 12 + bw > w ? x - 12 - bw : x + 12;
        const by = padT + 6;
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.strokeStyle = "rgba(44,42,61,0.12)";
        ctx.beginPath();
        ctx.roundRect(bx, by, bw, bh, 8);
        ctx.fill();
        ctx.stroke();
        ctx.textAlign = "left";
        ctx.textBaseline = "top";
        ctx.fillStyle = C.ink;
        ctx.fillText(`t = ${fmtClock(H.t[i])}`, bx + 10, by + 6);
        rows.forEach(([c, label, v], k) => {
          ctx.fillStyle = c;
          ctx.fillRect(bx + 10, by + 25 + k * 16, 8, 8);
          ctx.fillStyle = C.ink;
          ctx.fillText(`${label}  ${v}`, bx + 24, by + 22 + k * 16);
        });
      }
    },
    [version, show, scale, range, hover, sim],
  );

  return (
    <div className="card chart timeline">
      <div className="card-head">
        <h2>Garden story</h2>
        <div className="legend">
          <LegendChip color={C.fruit} label="Ripe fruit" on={show.fruit} onClick={() => setShow((s) => ({ ...s, fruit: !s.fruit }))} />
          <LegendChip color={C.blue} label="Blue blobs" on={show.blue} onClick={() => setShow((s) => ({ ...s, blue: !s.blue }))} />
          <LegendChip color={C.red} label={scale === "split" ? "Red blobs (right axis)" : "Red blobs"} on={show.red} onClick={() => setShow((s) => ({ ...s, red: !s.red }))} />
        </div>
        <div className="chart-tools">
          <Toggle label="Scale" value={scale} options={[["split", "Split axes"], ["shared", "Shared"]]} onChange={setScale} />
          <Toggle label="Range" value={range} options={[["all", "All"], ["5m", "Last 5 min"]]} onChange={setRange} />
        </div>
      </div>
      <div
        className="canvas-wrap"
        onMouseMove={(e) => setHover(e.clientX - e.currentTarget.getBoundingClientRect().left)}
        onMouseLeave={() => setHover(null)}
      >
        <canvas ref={ref} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- phase plot

export function PhasePlot({ sim, version }: { sim: Simulation; version: number }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      const H = sim.history;
      const n = H.t.length;
      ctx.font = FONT;
      const pad = { l: 34, r: 12, t: 10, b: 28 };
      const pw = w - pad.l - pad.r;
      const ph = h - pad.t - pad.b;
      let mb = 1;
      let mr = 1;
      for (let i = 0; i < n; i++) {
        if (H.blue[i] > mb) mb = H.blue[i];
        if (H.red[i] > mr) mr = H.red[i];
      }
      const xm = niceMax(mb);
      const ym = niceMax(mr);
      const X = (v: number) => pad.l + (v / xm) * pw;
      const Y = (v: number) => pad.t + ph - (v / ym) * ph;

      ctx.lineWidth = 1;
      for (let k = 0; k <= 4; k++) {
        ctx.strokeStyle = C.grid;
        const x = pad.l + (pw * k) / 4;
        const y = pad.t + (ph * k) / 4;
        ctx.beginPath();
        ctx.moveTo(x, pad.t);
        ctx.lineTo(x, pad.t + ph);
        ctx.moveTo(pad.l, y);
        ctx.lineTo(pad.l + pw, y);
        ctx.stroke();
        ctx.fillStyle = C.blue;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        if (k % 2 === 0) ctx.fillText(String(Math.round((xm * k) / 4)), x, pad.t + ph + 5);
        ctx.fillStyle = C.red;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        if (k % 2 === 0) ctx.fillText(String(Math.round(ym * (1 - k / 4))), pad.l - 5, y);
      }
      ctx.fillStyle = C.axis;
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText("blue →", pad.l + pw, pad.t + ph + 26);
      ctx.save();
      ctx.translate(10, pad.t);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText("red →", 0, 0);
      ctx.restore();

      if (n < 2) return;
      const sb = smooth(H.blue, PHASE_SMOOTH);
      const sr = smooth(H.red, PHASE_SMOOTH);
      const step = Math.max(1, Math.floor(n / 900));
      let px = X(sb[0]);
      let py = Y(sr[0]);
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = step; i < n; i += step) {
        const x = X(sb[i]);
        const y = Y(sr[i]);
        const age = i / n;
        ctx.strokeStyle = `rgba(${Math.round(190 - 80 * age)}, ${Math.round(170 - 110 * age)}, ${Math.round(230 - 20 * age)}, ${0.15 + 0.85 * age * age})`;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
        px = x;
        py = y;
      }
      ctx.strokeStyle = "rgba(120,100,170,0.6)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(X(sb[0]), Y(sr[0]), 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = C.axis;
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";
      ctx.fillText("start", X(sb[0]) + 6, Y(sr[0]) - 2);

      const cx = X(H.blue[n - 1]);
      const cy = Y(H.red[n - 1]);
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fill();
      const grad = ctx.createLinearGradient(cx - 5, cy, cx + 5, cy);
      grad.addColorStop(0.5, C.blue);
      grad.addColorStop(0.5, C.red);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 5, 0, Math.PI * 2);
      ctx.fill();
    },
    [version, sim],
  );
  return (
    <div className="card chart phase">
      <div className="card-head">
        <h2>Blue vs red</h2>
        <span className="muted small">Loops = waves</span>
      </div>
      <div className="canvas-wrap square">
        <canvas ref={ref} />
      </div>
      <p className="chart-note">
        Counter-clockwise loops mean blues rise first, reds follow, then blues fall and reds fade. The trail is a{" "}
        {PHASE_SMOOTH}-second average; the dot is the live count.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- traits

export function TraitChart({ sim, version, mutation }: { sim: Simulation; version: number; mutation: number }) {
  const ref = useCanvas(
    (ctx, w, h) => {
      const H = sim.history;
      const n = H.t.length;
      ctx.font = FONT;
      const pad = { l: 38, r: 10, t: 10, b: 22 };
      const pw = w - pad.l - pad.r;
      const ph = h - pad.t - pad.b;
      const all = [H.blueSpeed, H.blueVision, H.redSpeed, H.redVision];
      let lo = 0.95;
      let hi = 1.05;
      for (const s of all) for (let i = 0; i < n; i++) if (Number.isFinite(s[i])) {
        if (s[i] < lo) lo = s[i];
        if (s[i] > hi) hi = s[i];
      }
      const padY = (hi - lo) * 0.12;
      lo -= padY;
      hi += padY;
      const tEnd = Math.max(30, n ? H.t[n - 1] : 30);
      const X = (t: number) => pad.l + (t / tEnd) * pw;
      const Y = (v: number) => pad.t + ph - ((v - lo) / (hi - lo)) * ph;

      ctx.lineWidth = 1;
      for (let k = 0; k <= 3; k++) {
        const v = lo + ((hi - lo) * k) / 3;
        const y = Y(v);
        ctx.strokeStyle = C.grid;
        ctx.beginPath();
        ctx.moveTo(pad.l, y);
        ctx.lineTo(pad.l + pw, y);
        ctx.stroke();
        ctx.fillStyle = C.axis;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText(`×${v.toFixed(2)}`, pad.l - 5, y);
      }
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = "rgba(44,42,61,0.3)";
      ctx.beginPath();
      ctx.moveTo(pad.l, Y(1));
      ctx.lineTo(pad.l + pw, Y(1));
      ctx.stroke();
      ctx.setLineDash([]);

      const step = Math.max(1, Math.floor(n / Math.max(50, pw)));
      const draw = (data: number[], color: string, dash: number[]) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.setLineDash(dash);
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < n; i += step) {
          const v = data[i];
          if (!Number.isFinite(v)) {
            started = false;
            continue;
          }
          if (started) ctx.lineTo(X(H.t[i]), Y(v));
          else ctx.moveTo(X(H.t[i]), Y(v));
          started = true;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      };
      draw(H.blueSpeed, C.blue, []);
      draw(H.blueVision, C.blue, [5, 4]);
      draw(H.redSpeed, C.red, []);
      draw(H.redVision, C.red, [5, 4]);

      ctx.fillStyle = C.axis;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(fmtClock(0), pad.l, pad.t + ph + 6);
      ctx.fillText(fmtClock(tEnd), pad.l + pw - 12, pad.t + ph + 6);
    },
    [version, sim],
  );
  return (
    <div className="card chart traits">
      <div className="card-head">
        <h2>Inherited traits</h2>
        <span className="muted small">Average multiplier vs. base</span>
      </div>
      <div className="trait-legend">
        <span><i className="ln" style={{ background: C.blue }} /> blue speed</span>
        <span><i className="ln dash" style={{ color: C.blue }} /> blue vision</span>
        <span><i className="ln" style={{ background: C.red }} /> red speed</span>
        <span><i className="ln dash" style={{ color: C.red }} /> red vision</span>
      </div>
      <div className="canvas-wrap">
        <canvas ref={ref} />
        {mutation === 0 && <div className="canvas-note">Trait drift is off. Babies are exact copies of their parent.</div>}
      </div>
      <p className="chart-note">
        Babies copy their parent's speed and vision with a small random drift. Faster legs and sharper eyes cost
        extra energy, so traits only spread if they pay off.
      </p>
    </div>
  );
}
