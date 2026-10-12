import type { Snapshot } from "./sim.ts";

export interface EventMark {
  t: number;
  label: string;
}

export const COLORS = {
  blue: "#3b82f6",
  red: "#ef4444",
  fruit: "#65b52e",
  ink: "#3b2a1c",
  grid: "rgba(90,60,30,0.12)",
};

function setup(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  if (rect.width === 0 || rect.height === 0) return null;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.font = "12px ui-rounded, system-ui, sans-serif";
  return ctx;
}

function niceMax(v: number): number {
  if (v <= 10) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nice * exp;
}

export interface TimelineView {
  hover: number | null;
}

export function drawTimeline(canvas: HTMLCanvasElement, hist: Snapshot[], events: EventMark[], view: TimelineView): void {
  const ctx = setup(canvas);
  if (!ctx) return;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const m = { l: 44, r: 14, t: 26, b: 24 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  if (hist.length < 2) {
    ctx.fillStyle = COLORS.ink;
    ctx.fillText("Press play to start the story.", m.l, H / 2);
    return;
  }
  const tMax = Math.max(60, hist[hist.length - 1].t);
  let vMax = 10;
  for (const s of hist) vMax = Math.max(vMax, s.blue, s.red, s.fruit);
  const yMax = niceMax(vMax * 1.08);
  const X = (t: number) => m.l + (t / tMax) * pw;
  const Y = (v: number) => m.t + ph - (v / yMax) * ph;

  ctx.strokeStyle = COLORS.grid;
  ctx.fillStyle = COLORS.ink;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const v = (yMax / 4) * i;
    ctx.beginPath();
    ctx.moveTo(m.l, Y(v));
    ctx.lineTo(W - m.r, Y(v));
    ctx.stroke();
    ctx.fillText(String(Math.round(v)), 8, Y(v) + 4);
  }
  const span = tMax;
  const step = span > 1200 ? 300 : span > 400 ? 120 : span > 120 ? 60 : 20;
  for (let t = 0; t <= tMax; t += step) {
    ctx.fillText(`${Math.round(t)}s`, X(t) - 8, H - 6);
  }

  // Area fills behind lines.
  const area = (key: "blue" | "red", color: string) => {
    ctx.beginPath();
    ctx.moveTo(X(hist[0].t), Y(0));
    for (const s of hist) ctx.lineTo(X(s.t), Y(s[key]));
    ctx.lineTo(X(hist[hist.length - 1].t), Y(0));
    ctx.closePath();
    ctx.fillStyle = color + "22";
    ctx.fill();
  };
  area("blue", COLORS.blue);
  area("red", COLORS.red);

  const line = (key: "blue" | "red" | "fruit", color: string, dash: number[], width: number) => {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    let started = false;
    for (const s of hist) {
      const v = s[key];
      if (Number.isNaN(v)) continue;
      if (!started) {
        ctx.moveTo(X(s.t), Y(v));
        started = true;
      } else ctx.lineTo(X(s.t), Y(v));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  };
  line("fruit", COLORS.fruit, [5, 4], 2);
  line("blue", COLORS.blue, [], 2.5);
  line("red", COLORS.red, [], 2.5);

  // Event markers from live setting changes.
  ctx.font = "11px ui-rounded, system-ui, sans-serif";
  for (const ev of events) {
    if (ev.t > tMax) continue;
    ctx.strokeStyle = "rgba(60,40,20,0.35)";
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(X(ev.t), m.t);
    ctx.lineTo(X(ev.t), m.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COLORS.ink;
    ctx.beginPath();
    ctx.moveTo(X(ev.t) - 4, m.t - 10);
    ctx.lineTo(X(ev.t) + 4, m.t - 10);
    ctx.lineTo(X(ev.t), m.t - 3);
    ctx.closePath();
    ctx.fill();
  }

  // Legend.
  ctx.font = "12px ui-rounded, system-ui, sans-serif";
  const legend: [string, string][] = [
    ["Blue", COLORS.blue],
    ["Red", COLORS.red],
    ["Fruit", COLORS.fruit],
  ];
  let lx = m.l;
  for (const [label, color] of legend) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, 8, 12, 4);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(label, lx + 17, 14);
    lx += 70;
  }

  if (view.hover !== null) {
    const t = ((view.hover - m.l) / pw) * tMax;
    let best = hist[0];
    for (const s of hist) if (Math.abs(s.t - t) < Math.abs(best.t - t)) best = s;
    ctx.strokeStyle = "rgba(60,40,20,0.5)";
    ctx.beginPath();
    ctx.moveTo(X(best.t), m.t);
    ctx.lineTo(X(best.t), m.t + ph);
    ctx.stroke();
    const text = `t ${Math.round(best.t)}s  blue ${best.blue}  red ${best.red}  fruit ${best.fruit}`;
    const tw = ctx.measureText(text).width + 14;
    const bx = Math.min(W - tw - 6, Math.max(m.l, X(best.t) + 8));
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.fillRect(bx, m.t + 4, tw, 22);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(text, bx + 7, m.t + 19);
  }
}

export function drawPhase(canvas: HTMLCanvasElement, hist: Snapshot[]): void {
  const ctx = setup(canvas);
  if (!ctx) return;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const m = { l: 40, r: 14, t: 14, b: 30 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  let vMax = 10;
  for (const s of hist) vMax = Math.max(vMax, s.blue, s.red);
  const max = niceMax(vMax * 1.1);
  const X = (v: number) => m.l + (v / max) * pw;
  const Y = (v: number) => m.t + ph - (v / max) * ph;
  ctx.strokeStyle = COLORS.grid;
  for (let i = 0; i <= 4; i++) {
    const v = (max / 4) * i;
    ctx.beginPath();
    ctx.moveTo(m.l, Y(v));
    ctx.lineTo(W - m.r, Y(v));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(X(v), m.t);
    ctx.lineTo(X(v), m.t + ph);
    ctx.stroke();
  }
  ctx.fillStyle = COLORS.ink;
  ctx.fillText("red", 6, m.t + 10);
  ctx.fillText("blue →", W - 56, H - 8);
  if (hist.length < 2) return;
  const tail = hist.slice(-600);
  for (let i = 1; i < tail.length; i++) {
    const a = tail[i - 1];
    const b = tail[i];
    const k = i / tail.length;
    ctx.strokeStyle = `rgba(90,50,40,${0.08 + k * 0.7})`;
    ctx.lineWidth = 1 + k * 2;
    ctx.beginPath();
    ctx.moveTo(X(a.blue), Y(a.red));
    ctx.lineTo(X(b.blue), Y(b.red));
    ctx.stroke();
  }
  const last = tail[tail.length - 1];
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(X(last.blue), Y(last.red), 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = COLORS.ink;
  ctx.fillText(`B${last.blue} · R${last.red}`, X(last.blue) + 9, Y(last.red) - 8);
}

export function drawTraits(canvas: HTMLCanvasElement, hist: Snapshot[]): void {
  const ctx = setup(canvas);
  if (!ctx) return;
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  const m = { l: 40, r: 14, t: 26, b: 24 };
  const pw = W - m.l - m.r;
  const ph = H - m.t - m.b;
  const lo = 0.5;
  const hi = 1.6;
  if (hist.length < 2) return;
  const tMax = Math.max(60, hist[hist.length - 1].t);
  const X = (t: number) => m.l + (t / tMax) * pw;
  const Y = (v: number) => m.t + ph - ((v - lo) / (hi - lo)) * ph;
  ctx.strokeStyle = COLORS.grid;
  ctx.fillStyle = COLORS.ink;
  for (const v of [0.5, 1, 1.5]) {
    ctx.beginPath();
    ctx.moveTo(m.l, Y(v));
    ctx.lineTo(W - m.r, Y(v));
    ctx.stroke();
    ctx.fillText(v.toFixed(1), 6, Y(v) + 4);
  }
  const series: [keyof Snapshot, string, number[]][] = [
    ["blueSpeed", COLORS.blue, []],
    ["blueVision", "#7fb0ff", [6, 4]],
    ["redSpeed", COLORS.red, []],
    ["redVision", "#ff9a9a", [6, 4]],
  ];
  for (const [key, color, dash] of series) {
    ctx.beginPath();
    ctx.setLineDash(dash);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    let started = false;
    for (const s of hist) {
      const v = s[key] as number;
      if (Number.isNaN(v)) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(X(s.t), Y(v));
        started = true;
      } else ctx.lineTo(X(s.t), Y(v));
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.font = "11px ui-rounded, system-ui, sans-serif";
  const legend: [string, string][] = [
    ["blue speed", COLORS.blue],
    ["blue vision", "#7fb0ff"],
    ["red speed", COLORS.red],
    ["red vision", "#ff9a9a"],
  ];
  let lx = m.l;
  for (const [label, color] of legend) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, 9, 12, 4);
    ctx.fillStyle = COLORS.ink;
    ctx.fillText(label, lx + 16, 15);
    lx += 92;
  }
}
