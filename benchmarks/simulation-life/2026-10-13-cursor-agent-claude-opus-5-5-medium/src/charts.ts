import type { Sample } from "./sim";

export const COLORS = {
  blue: "#2f7fe0",
  red: "#e5484d",
  fruit: "#58a83a",
  fruitFill: "rgba(120,200,80,0.16)",
  grid: "rgba(80,60,40,0.10)",
  axis: "#8a7a66",
  ink: "#3b3127",
};

const FONT = "11px ui-rounded, 'SF Pro Rounded', system-ui, sans-serif";

export function prepCanvas(c: HTMLCanvasElement) {
  const r = c.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(10, r.width);
  const h = Math.max(10, r.height);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function niceCeil(v: number, min = 5) {
  v = Math.max(min, v);
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function niceStep(range: number, target: number) {
  const raw = range / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

export function fmtTime(t: number) {
  if (t < 120) return `${Math.round(t)}s`;
  const m = Math.floor(t / 60);
  const s = Math.round(t % 60);
  return `${m}m${s ? String(s).padStart(2, "0") : ""}`;
}

/** Thin the series to roughly one point per pixel, keeping extremes. */
function thin(h: Sample[], cols: number): Sample[] {
  if (h.length <= cols * 2) return h;
  const out: Sample[] = [];
  const per = h.length / cols;
  for (let i = 0; i < cols; i++) {
    const a = Math.floor(i * per);
    const b = Math.min(h.length, Math.floor((i + 1) * per));
    let hiB = h[a];
    let loB = h[a];
    for (let j = a; j < b; j++) {
      if (h[j].blue > hiB.blue) hiB = h[j];
      if (h[j].blue < loB.blue) loB = h[j];
    }
    if (hiB.t < loB.t) out.push(hiB, loB);
    else out.push(loB, hiB);
  }
  return out;
}

export interface TimelineOpts {
  hoverX: number | null;
  fruitCap: number;
  marks: { t: number; label: string; color: string }[];
}

export function drawTimeline(c: HTMLCanvasElement, hist: Sample[], o: TimelineOpts) {
  const { ctx, w, h } = prepCanvas(c);
  const L = 38;
  const Rp = 40;
  const T = 12;
  const B = 24;
  const W = w - L - Rp;
  const H = h - T - B;
  if (hist.length < 2 || W < 20) return null;

  const tmax = Math.max(60, hist[hist.length - 1].t);
  let maxBlob = 0;
  let maxFruit = 0;
  for (const s of hist) {
    if (s.blue > maxBlob) maxBlob = s.blue;
    if (s.red > maxBlob) maxBlob = s.red;
    if (s.fruit > maxFruit) maxFruit = s.fruit;
  }
  const yBlob = 4 * niceStep(Math.max(10, maxBlob * 1.08), 4);
  const yFruit = 4 * niceStep(Math.max(10, Math.max(maxFruit, o.fruitCap * 0.5) * 1.05), 4);
  const X = (t: number) => L + (t / tmax) * W;
  const YB = (v: number) => T + H - (v / yBlob) * H;
  const YF = (v: number) => T + H - (v / yFruit) * H;

  ctx.font = FONT;
  ctx.textBaseline = "middle";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = T + (H * i) / 4;
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(L + W, y);
    ctx.stroke();
    ctx.fillStyle = COLORS.axis;
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(yBlob * (1 - i / 4))), L - 6, y);
    ctx.fillStyle = COLORS.fruit;
    ctx.textAlign = "left";
    ctx.fillText(String(Math.round(yFruit * (1 - i / 4))), L + W + 6, y);
  }
  const step = niceStep(tmax, Math.max(3, Math.floor(W / 90)));
  ctx.textAlign = "center";
  ctx.fillStyle = COLORS.axis;
  for (let t = 0; t <= tmax + 1e-6; t += step) ctx.fillText(fmtTime(t), X(t), T + H + 13);

  ctx.save();
  ctx.translate(11, T + H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = COLORS.axis;
  ctx.fillText("blobs", 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(w - 9, T + H / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = COLORS.fruit;
  ctx.fillText("ripe fruit", 0, 0);
  ctx.restore();

  const pts = thin(hist, Math.ceil(W));

  // Fruit as a soft area behind the blobs.
  ctx.beginPath();
  ctx.moveTo(X(pts[0].t), YF(0));
  for (const s of pts) ctx.lineTo(X(s.t), YF(s.fruit));
  ctx.lineTo(X(pts[pts.length - 1].t), YF(0));
  ctx.closePath();
  ctx.fillStyle = COLORS.fruitFill;
  ctx.fill();
  line(ctx, pts, (s) => X(s.t), (s) => YF(s.fruit), COLORS.fruit, 1.4);
  line(ctx, pts, (s) => X(s.t), (s) => YB(s.red), COLORS.red, 2.2);
  line(ctx, pts, (s) => X(s.t), (s) => YB(s.blue), COLORS.blue, 2.2);

  for (const m of o.marks) {
    const x = X(m.t);
    ctx.save();
    ctx.setLineDash([3, 4]);
    ctx.strokeStyle = m.color;
    ctx.beginPath();
    ctx.moveTo(x, T);
    ctx.lineTo(x, T + H);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = m.color;
    ctx.textAlign = x > L + W - 80 ? "right" : "left";
    ctx.fillText(m.label, x + (ctx.textAlign === "right" ? -4 : 4), T + 8);
  }

  if (o.hoverX !== null && o.hoverX >= L && o.hoverX <= L + W) {
    const t = ((o.hoverX - L) / W) * tmax;
    let s = hist[0];
    let lo = 0;
    let hi = hist.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (hist[mid].t < t) lo = mid + 1;
      else hi = mid;
    }
    s = hist[lo];
    const x = X(s.t);
    ctx.strokeStyle = "rgba(60,40,20,0.35)";
    ctx.beginPath();
    ctx.moveTo(x, T);
    ctx.lineTo(x, T + H);
    ctx.stroke();
    dot(ctx, x, YF(s.fruit), COLORS.fruit);
    dot(ctx, x, YB(s.red), COLORS.red);
    dot(ctx, x, YB(s.blue), COLORS.blue);
    return { t: s.t, fruit: s.fruit, blue: s.blue, red: s.red, x };
  }
  return null;
}

function line(
  ctx: CanvasRenderingContext2D,
  pts: Sample[],
  fx: (s: Sample) => number,
  fy: (s: Sample) => number,
  color: string,
  width: number,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = "round";
  ctx.beginPath();
  let started = false;
  for (const s of pts) {
    const y = fy(s);
    if (!Number.isFinite(y)) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(fx(s), y);
      started = true;
    } else ctx.lineTo(fx(s), y);
  }
  ctx.stroke();
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, Math.PI * 2);
  ctx.fill();
}

/** Blue count on x, red count on y: predator-prey loops trace counter-clockwise spirals. */
export function drawPhase(c: HTMLCanvasElement, hist: Sample[]) {
  const { ctx, w, h } = prepCanvas(c);
  const L = 34;
  const B = 26;
  const T = 10;
  const Rp = 12;
  const W = w - L - Rp;
  const H = h - T - B;
  if (hist.length < 2 || W < 20) return;
  let mb = 0;
  let mr = 0;
  for (const s of hist) {
    mb = Math.max(mb, s.blue);
    mr = Math.max(mr, s.red);
  }
  const xb = niceCeil(mb * 1.05, 10);
  const yr = niceCeil(mr * 1.05, 10);
  const X = (v: number) => L + (v / xb) * W;
  const Y = (v: number) => T + H - (v / yr) * H;

  ctx.font = FONT;
  ctx.textBaseline = "middle";
  for (let i = 0; i <= 4; i++) {
    ctx.strokeStyle = COLORS.grid;
    ctx.beginPath();
    ctx.moveTo(L, T + (H * i) / 4);
    ctx.lineTo(L + W, T + (H * i) / 4);
    ctx.moveTo(L + (W * i) / 4, T);
    ctx.lineTo(L + (W * i) / 4, T + H);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.red;
  ctx.textAlign = "right";
  ctx.fillText(String(yr), L - 5, T + 4);
  ctx.fillText("0", L - 5, T + H);
  ctx.fillStyle = COLORS.blue;
  ctx.textAlign = "center";
  ctx.fillText(String(xb), L + W - 8, T + H + 12);
  ctx.fillText("blue →", L + W / 2, T + H + 12);
  ctx.save();
  ctx.translate(10, T + H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = COLORS.red;
  ctx.fillText("red →", 0, 0);
  ctx.restore();

  // Smooth a little so the loop reads instead of the jitter.
  const n = hist.length;
  const win = Math.max(1, Math.round(n / 300));
  const pts: [number, number][] = [];
  const stride = Math.max(1, Math.floor(n / 900));
  for (let i = 0; i < n; i += stride) {
    let sb = 0;
    let sr = 0;
    let k = 0;
    for (let j = Math.max(0, i - win); j <= Math.min(n - 1, i + win); j++) {
      sb += hist[j].blue;
      sr += hist[j].red;
      k++;
    }
    pts.push([sb / k, sr / k]);
  }
  ctx.lineWidth = 1.6;
  ctx.lineCap = "round";
  for (let i = 1; i < pts.length; i++) {
    const f = i / pts.length;
    ctx.strokeStyle = `rgba(${Math.round(120 + 100 * f)}, ${Math.round(80 - 30 * f)}, ${Math.round(200 - 120 * f)}, ${0.12 + 0.8 * f * f})`;
    ctx.beginPath();
    ctx.moveTo(X(pts[i - 1][0]), Y(pts[i - 1][1]));
    ctx.lineTo(X(pts[i][0]), Y(pts[i][1]));
    ctx.stroke();
  }
  const first = hist[0];
  ctx.strokeStyle = COLORS.axis;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(X(first.blue), Y(first.red), 4, 0, Math.PI * 2);
  ctx.stroke();
  const last = hist[n - 1];
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(X(last.blue), Y(last.red), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8a3fd1";
  ctx.beginPath();
  ctx.arc(X(last.blue), Y(last.red), 4, 0, Math.PI * 2);
  ctx.fill();
}

/** Average inherited multipliers (1 = the slider value) over time. */
export function drawTraits(c: HTMLCanvasElement, hist: Sample[]) {
  const { ctx, w, h } = prepCanvas(c);
  const L = 38;
  const B = 22;
  const T = 10;
  const Rp = 10;
  const W = w - L - Rp;
  const H = h - T - B;
  if (hist.length < 2 || W < 20) return;
  let lo = 0.9;
  let hi = 1.1;
  for (const s of hist) {
    for (const v of [s.bs, s.bv, s.rs, s.rv]) {
      if (!Number.isFinite(v)) continue;
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
  }
  lo = Math.floor(lo * 20) / 20;
  hi = Math.ceil(hi * 20) / 20;
  const tmax = Math.max(60, hist[hist.length - 1].t);
  const X = (t: number) => L + (t / tmax) * W;
  const Y = (v: number) => T + H - ((v - lo) / (hi - lo)) * H;

  ctx.font = FONT;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  for (const v of [lo, 1, hi]) {
    ctx.strokeStyle = v === 1 ? "rgba(80,60,40,0.3)" : COLORS.grid;
    ctx.setLineDash(v === 1 ? [4, 4] : []);
    ctx.beginPath();
    ctx.moveTo(L, Y(v));
    ctx.lineTo(L + W, Y(v));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.axis;
    ctx.fillText(`${Math.round(v * 100)}%`, L - 5, Y(v));
  }
  ctx.textAlign = "center";
  ctx.fillText(fmtTime(tmax), L + W - 14, T + H + 12);
  ctx.fillText("0s", L + 6, T + H + 12);

  const pts = hist.length > W * 2 ? hist.filter((_, i) => i % Math.ceil(hist.length / W) === 0) : hist;
  const dashed = (on: boolean) => ctx.setLineDash(on ? [5, 4] : []);
  dashed(false);
  line(ctx, pts, (s) => X(s.t), (s) => Y(s.bs), COLORS.blue, 2);
  line(ctx, pts, (s) => X(s.t), (s) => Y(s.rs), COLORS.red, 2);
  dashed(true);
  line(ctx, pts, (s) => X(s.t), (s) => Y(s.bv), COLORS.blue, 1.6);
  line(ctx, pts, (s) => X(s.t), (s) => Y(s.rv), COLORS.red, 1.6);
  dashed(false);
}
