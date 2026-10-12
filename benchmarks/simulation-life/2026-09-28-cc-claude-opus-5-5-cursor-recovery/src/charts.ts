import type { Sample } from './sim.ts';

export const CHART_COLORS = {
  fruit: '#5fae2e',
  blue: '#2f86e6',
  red: '#e2493f',
  grid: 'rgba(90,70,50,0.12)',
  text: '#6b5a4a',
};

function setup(canvas: HTMLCanvasElement) {
  const r = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(10, r.width);
  const h = Math.max(10, r.height);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function niceMax(v: number): number {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

function fmtTime(s: number): string {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return r ? `${m}m${String(r).padStart(2, '0')}` : `${m}m`;
}

/** Bucket samples so each pixel column draws once, keeping min/max to preserve spikes. */
function bucket(h: Sample[], cols: number, key: 'fruit' | 'blue' | 'red') {
  const out: { i: number; lo: number; hi: number; avg: number }[] = [];
  const n = h.length;
  if (n === 0) return out;
  const per = Math.max(1, n / cols);
  for (let c = 0; c * per < n; c++) {
    const a = Math.floor(c * per);
    const b = Math.min(n, Math.floor((c + 1) * per));
    let lo = Infinity, hi = -Infinity, sum = 0;
    for (let i = a; i < Math.max(b, a + 1); i++) {
      const v = h[i][key];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      sum += v;
    }
    out.push({ i: a, lo, hi, avg: sum / Math.max(1, b - a) });
  }
  return out;
}

export interface TimelineOpts {
  hover?: number;
}

export function drawTimeline(canvas: HTMLCanvasElement, h: Sample[], opts: TimelineOpts = {}) {
  const { ctx, w, h: H } = setup(canvas);
  const L = 38, Rp = 40, T = 12, B = 22;
  const pw = w - L - Rp;
  const ph = H - T - B;
  if (h.length < 2) return;
  const t0 = h[0].t;
  const t1 = Math.max(h[h.length - 1].t, t0 + 10);

  let popMax = 0, fruitMax = 0;
  for (const s of h) {
    popMax = Math.max(popMax, s.blue, s.red);
    fruitMax = Math.max(fruitMax, s.fruit);
  }
  popMax = niceMax(popMax * 1.08);
  fruitMax = niceMax(fruitMax * 1.08);

  const X = (t: number) => L + ((t - t0) / (t1 - t0)) * pw;
  const Yp = (v: number) => T + ph - (v / popMax) * ph;
  const Yf = (v: number) => T + ph - (v / fruitMax) * ph;

  ctx.font = '600 10px ui-rounded, system-ui, sans-serif';
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.lineWidth = 1;
  for (let k = 0; k <= 4; k++) {
    const y = T + (ph * k) / 4;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(L + pw, y);
    ctx.stroke();
    ctx.fillStyle = CHART_COLORS.blue;
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(popMax * (1 - k / 4))), L - 6, y + 3);
    ctx.fillStyle = CHART_COLORS.fruit;
    ctx.textAlign = 'left';
    ctx.fillText(String(Math.round(fruitMax * (1 - k / 4))), L + pw + 6, y + 3);
  }
  ctx.fillStyle = CHART_COLORS.text;
  ctx.textAlign = 'center';
  const span = t1 - t0;
  const step = [10, 20, 30, 60, 120, 300, 600, 1200, 1800, 3600].find((s) => span / s <= 7) ?? 7200;
  for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) {
    ctx.fillText(fmtTime(t), X(t), H - 6);
  }
  ctx.save();
  ctx.translate(10, T + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = CHART_COLORS.text;
  ctx.fillText('blobs', 0, 0);
  ctx.restore();
  ctx.save();
  ctx.translate(w - 8, T + ph / 2);
  ctx.rotate(Math.PI / 2);
  ctx.fillStyle = CHART_COLORS.fruit;
  ctx.fillText('ripe fruit', 0, 0);
  ctx.restore();

  const cols = Math.max(20, Math.floor(pw));
  const series: { key: 'fruit' | 'blue' | 'red'; y: (v: number) => number; color: string; fill: string }[] = [
    { key: 'fruit', y: Yf, color: CHART_COLORS.fruit, fill: 'rgba(95,174,46,0.13)' },
    { key: 'blue', y: Yp, color: CHART_COLORS.blue, fill: 'rgba(47,134,230,0.10)' },
    { key: 'red', y: Yp, color: CHART_COLORS.red, fill: 'rgba(226,73,63,0.10)' },
  ];
  for (const s of series) {
    const pts = bucket(h, cols, s.key);
    // min/max envelope
    ctx.fillStyle = s.fill;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = X(h[p.i].t);
      if (i === 0) ctx.moveTo(x, s.y(p.hi));
      else ctx.lineTo(x, s.y(p.hi));
    });
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(X(h[pts[i].i].t), s.y(pts[i].lo));
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.key === 'fruit' ? 1.6 : 2.2;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = X(h[p.i].t);
      if (i === 0) ctx.moveTo(x, s.y(p.avg));
      else ctx.lineTo(x, s.y(p.avg));
    });
    ctx.stroke();
  }

  if (opts.hover !== undefined && opts.hover >= L && opts.hover <= L + pw) {
    const t = t0 + ((opts.hover - L) / pw) * (t1 - t0);
    let lo = 0, hi = h.length - 1;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (h[m].t < t) lo = m + 1;
      else hi = m;
    }
    const s = h[lo];
    const x = X(s.t);
    ctx.strokeStyle = 'rgba(60,40,30,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(x, T);
    ctx.lineTo(x, T + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    for (const [v, y, c] of [
      [s.fruit, Yf(s.fruit), CHART_COLORS.fruit],
      [s.blue, Yp(s.blue), CHART_COLORS.blue],
      [s.red, Yp(s.red), CHART_COLORS.red],
    ] as const) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      void v;
    }
    const label = `${fmtTime(s.t)} · fruit ${s.fruit} · blue ${s.blue} · red ${s.red}`;
    ctx.font = '700 11px ui-rounded, system-ui, sans-serif';
    const tw = ctx.measureText(label).width + 14;
    const bx = Math.min(Math.max(L, x - tw / 2), L + pw - tw);
    ctx.fillStyle = 'rgba(255,251,242,0.95)';
    ctx.strokeStyle = 'rgba(90,70,50,0.25)';
    ctx.beginPath();
    ctx.roundRect(bx, T + 2, tw, 20, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = CHART_COLORS.text;
    ctx.textAlign = 'left';
    ctx.fillText(label, bx + 7, T + 16);
  }
}

export function drawPhase(canvas: HTMLCanvasElement, h: Sample[]) {
  const { ctx, w, h: H } = setup(canvas);
  const L = 34, Rp = 10, T = 10, B = 26;
  const pw = w - L - Rp;
  const ph = H - T - B;
  if (h.length < 2) return;
  let bm = 0, rm = 0;
  for (const s of h) {
    bm = Math.max(bm, s.blue);
    rm = Math.max(rm, s.red);
  }
  bm = niceMax(bm * 1.05);
  rm = niceMax(rm * 1.05);
  const X = (v: number) => L + (v / bm) * pw;
  const Y = (v: number) => T + ph - (v / rm) * ph;

  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.font = '600 10px ui-rounded, system-ui, sans-serif';
  for (let k = 0; k <= 4; k++) {
    ctx.beginPath();
    ctx.moveTo(L, T + (ph * k) / 4);
    ctx.lineTo(L + pw, T + (ph * k) / 4);
    ctx.moveTo(L + (pw * k) / 4, T);
    ctx.lineTo(L + (pw * k) / 4, T + ph);
    ctx.stroke();
  }
  ctx.fillStyle = CHART_COLORS.blue;
  ctx.textAlign = 'center';
  ctx.fillText('0', L, T + ph + 12);
  ctx.fillText(String(bm), L + pw, T + ph + 12);
  ctx.fillText('blue blobs →', L + pw / 2, H - 4);
  ctx.fillStyle = CHART_COLORS.red;
  ctx.textAlign = 'right';
  ctx.fillText(String(rm), L - 5, T + 8);
  ctx.save();
  ctx.translate(12, T + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillText('red blobs →', 0, 0);
  ctx.restore();

  // smooth a little so the loop reads as a loop instead of noise
  const step = Math.max(1, Math.floor(h.length / 900));
  const win = 6;
  const n = h.length;
  let prev: { x: number; y: number } | null = null;
  ctx.lineWidth = 1.8;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i += step) {
    let sb = 0, sr = 0, c = 0;
    for (let j = Math.max(0, i - win); j <= Math.min(n - 1, i + win); j++) {
      sb += h[j].blue;
      sr += h[j].red;
      c++;
    }
    const p = { x: X(sb / c), y: Y(sr / c) };
    if (prev) {
      const age = i / n;
      ctx.strokeStyle = `hsla(${280 - age * 250}, 65%, ${58 - age * 18}%, ${0.25 + age * 0.75})`;
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    prev = p;
  }
  const last = h[n - 1];
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#3a2d22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(X(last.blue), Y(last.red), 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const first = h[0];
  ctx.fillStyle = '#3a2d22';
  ctx.beginPath();
  ctx.arc(X(first.blue), Y(first.red), 3, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTraits(canvas: HTMLCanvasElement, h: Sample[]) {
  const { ctx, w, h: H } = setup(canvas);
  const L = 34, Rp = 8, T = 10, B = 20;
  const pw = w - L - Rp;
  const ph = H - T - B;
  if (h.length < 2) return;
  let lo = 0.9, hi = 1.1;
  for (const s of h) {
    for (const v of [s.blueSpeed, s.blueVision, s.redSpeed, s.redVision]) {
      if (Number.isFinite(v)) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  }
  const pad = (hi - lo) * 0.1;
  lo -= pad;
  hi += pad;
  const t0 = h[0].t;
  const t1 = Math.max(h[h.length - 1].t, t0 + 10);
  const X = (t: number) => L + ((t - t0) / (t1 - t0)) * pw;
  const Y = (v: number) => T + ph - ((v - lo) / (hi - lo)) * ph;
  ctx.font = '600 10px ui-rounded, system-ui, sans-serif';
  ctx.strokeStyle = CHART_COLORS.grid;
  ctx.fillStyle = CHART_COLORS.text;
  ctx.textAlign = 'right';
  for (const v of [lo + pad, 1, hi - pad]) {
    ctx.beginPath();
    ctx.moveTo(L, Y(v));
    ctx.lineTo(L + pw, Y(v));
    ctx.stroke();
    ctx.fillText(`${v.toFixed(2)}×`, L - 4, Y(v) + 3);
  }
  const lines: { key: 'blueSpeed' | 'blueVision' | 'redSpeed' | 'redVision'; color: string; dash: number[] }[] = [
    { key: 'blueSpeed', color: CHART_COLORS.blue, dash: [] },
    { key: 'blueVision', color: CHART_COLORS.blue, dash: [5, 4] },
    { key: 'redSpeed', color: CHART_COLORS.red, dash: [] },
    { key: 'redVision', color: CHART_COLORS.red, dash: [5, 4] },
  ];
  const step = Math.max(1, Math.floor(h.length / Math.max(50, pw)));
  for (const l of lines) {
    ctx.strokeStyle = l.color;
    ctx.setLineDash(l.dash);
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i < h.length; i += step) {
      const v = h[i][l.key];
      if (!Number.isFinite(v)) {
        pen = false;
        continue;
      }
      if (!pen) ctx.moveTo(X(h[i].t), Y(v));
      else ctx.lineTo(X(h[i].t), Y(v));
      pen = true;
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.fillStyle = CHART_COLORS.text;
  ctx.fillText(fmtTime(t0), L + 10, H - 5);
  ctx.fillText(fmtTime(t1), L + pw - 14, H - 5);
}

// ---------------------------------------------------------------- summary

export interface SummaryLine {
  icon: string;
  text: string;
  tone: 'good' | 'warn' | 'info';
}

function amax(a: number[]): number {
  let m = -Infinity;
  for (const v of a) if (v > m) m = v;
  return m;
}

function amin(a: number[]): number {
  let m = Infinity;
  for (const v of a) if (v < m) m = v;
  return m;
}

function smooth(v: number[], win: number): number[] {
  const out: number[] = [];
  let sum = 0;
  for (let i = 0; i < v.length; i++) {
    sum += v[i];
    if (i >= win) sum -= v[i - win];
    out.push(sum / Math.min(i + 1, win));
  }
  return out;
}

function peaks(v: number[], minProm: number): number[] {
  const idx: number[] = [];
  let lastLow = v[0] ?? 0;
  let cand = -1;
  let candV = -Infinity;
  for (let i = 1; i < v.length; i++) {
    if (v[i] > candV) {
      candV = v[i];
      cand = i;
    }
    if (cand >= 0 && candV - lastLow >= minProm && candV - v[i] >= minProm) {
      idx.push(cand);
      lastLow = v[i];
      cand = -1;
      candV = -Infinity;
    }
    if (cand < 0 || v[i] < lastLow) lastLow = Math.min(lastLow, v[i]);
    if (cand < 0) {
      cand = i;
      candV = v[i];
    }
  }
  return idx;
}

export function summarize(h: Sample[], capacity: number): SummaryLine[] {
  const out: SummaryLine[] = [];
  if (h.length < 20) {
    out.push({ icon: '🌱', text: 'The garden just woke up. Press play and let a few seasons pass.', tone: 'info' });
    return out;
  }
  const dur = h[h.length - 1].t - h[0].t;
  const blue = h.map((s) => s.blue);
  const red = h.map((s) => s.red);
  const fruit = h.map((s) => s.fruit);
  const bMax = amax(blue);
  const rMax = amax(red);
  const bNow = blue[blue.length - 1];
  const rNow = red[red.length - 1];
  const red0 = red[0];
  const blue0 = blue[0];

  const goneAt = (v: number[]) => {
    let i = v.length - 1;
    while (i >= 0 && v[i] === 0) i--;
    return h[Math.min(h.length - 1, i + 1)].t;
  };
  const blueGoneAt = bNow === 0 && bMax > 0 ? goneAt(blue) : undefined;
  const redGoneAt = rNow === 0 && rMax > 0 ? goneAt(red) : undefined;

  // early boom
  const firstMin = h.findIndex((s) => s.t - h[0].t >= 60);
  if (firstMin > 0) {
    const early = amax(blue.slice(0, firstMin + 1));
    if (blue0 > 0 && early >= blue0 * 2.2) {
      out.push({ icon: '🍏', text: `Plenty of fruit let blue blobs boom early: ${blue0} → ${early} in the first minute.`, tone: 'good' });
    }
  }

  // who leads: lag of red behind blue via cross-correlation of smoothed, detrended series
  const win = 20;
  const sb = smooth(blue, win);
  const sr = smooth(red, win);
  const mb = sb.reduce((a, v) => a + v, 0) / sb.length;
  const mr = sr.reduce((a, v) => a + v, 0) / sr.length;
  let bestLag = 0;
  let bestC = -Infinity;
  if (rMax > 2 && bMax > 2) {
    const maxLag = Math.min(240, Math.floor(sb.length / 3));
    for (let lag = 0; lag <= maxLag; lag += 2) {
      let c = 0, nb = 0, nr = 0;
      for (let i = 0; i + lag < sb.length; i++) {
        const a = sb[i] - mb;
        const b = sr[i + lag] - mr;
        c += a * b;
        nb += a * a;
        nr += b * b;
      }
      const cc = c / Math.sqrt(nb * nr || 1);
      if (cc > bestC) {
        bestC = cc;
        bestLag = lag;
      }
    }
  }
  const lagS = bestLag * 0.5;
  const rPeaks = peaks(sr, Math.max(3, rMax * 0.18));
  const bPeaks = peaks(sb, Math.max(4, bMax * 0.18));

  let redDip = false;
  if (red0 > 0 && rMax > 0) {
    const bDipIdx = sb.indexOf(Math.min(...sb.slice(0, Math.min(sb.length, 400))));
    const rPeakIdx = sr.indexOf(Math.max(...sr.slice(0, Math.min(sr.length, 400))));
    if (red0 >= blue0 * 0.5 && bDipIdx > 0 && sb[bDipIdx] < blue0 * 0.6 && rPeakIdx <= bDipIdx + 40) {
      redDip = true;
      out.push({ icon: '🔴', text: `Too many reds: blues dipped to ${Math.round(sb[bDipIdx])} first, then hungry reds thinned out.`, tone: 'warn' });
    }
  }

  if (!redDip && bestC > 0.3 && lagS >= 5) {
    out.push({
      icon: '🌊',
      text: `Blue blobs grew first, then red blobs followed about ${Math.round(lagS)}s later${rPeaks.length >= 2 ? ` — ${rPeaks.length} red waves so far` : ''}.`,
      tone: 'good',
    });
  }

  if (redGoneAt !== undefined && bNow > 0) {
    out.push({
      icon: '🍃',
      text: `Red blobs ran short of blues to boop and faded at ${Math.round(redGoneAt)}s. The world settled into a simpler blue-and-fruit state.`,
      tone: 'warn',
    });
  }
  if (bNow === 0 && blueGoneAt !== undefined) {
    out.push({
      icon: '🫧',
      text: rNow > 0 ? 'Every blue blob is gone, so the reds are running on empty.' : 'Both groups faded. Only the trees remain, heavy with fruit.',
      tone: 'warn',
    });
  }

  // leveling out / balance
  const third = Math.floor(h.length * 0.66);
  const tailB = blue.slice(third);
  const tailR = red.slice(third);
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const tb = avg(tailB);
  const tr = avg(tailR);
  if (bNow > 0 && rNow > 0 && dur > 150) {
    const cv = (a: number[], m: number) => Math.sqrt(avg(a.map((v) => (v - m) ** 2))) / Math.max(1, m);
    const swing = Math.max(cv(tailB, tb), cv(tailR, tr));
    if (swing < 0.45) {
      out.push({ icon: '⚖️', text: `The garden stayed balanced: lately about ${Math.round(tb)} blues and ${Math.round(tr)} reds.`, tone: 'good' });
    } else {
      out.push({ icon: '🎢', text: `Both groups are still alive but swinging hard (blues ${amin(tailB)}–${amax(tailB)}).`, tone: 'info' });
    }
    if (bPeaks.length >= 2 && bMax > tb * 1.6) {
      out.push({ icon: '📉', text: `Group sizes level out instead of growing forever: blues peaked at ${bMax} but hover near ${Math.round(tb)}.`, tone: 'info' });
    }
  }

  // fruit limitation
  const fruitFrac = avg(fruit.slice(third)) / Math.max(1, capacity);
  if (bMax < 35 && dur > 60) {
    out.push({ icon: '🍂', text: `Low fruit kept the garden small: blues never passed ${bMax}.`, tone: 'warn' });
  } else if (fruitFrac < 0.12 && bNow > 0) {
    out.push({ icon: '🧺', text: 'Trees are picked almost bare — fruit is what limits the blues now.', tone: 'info' });
  } else if (fruitFrac > 0.7 && bNow > 0 && rNow > 0) {
    out.push({ icon: '🌳', text: 'Fruit is piling up on the trees — the reds are keeping blues in check.', tone: 'info' });
  }

  if (out.length === 0) {
    out.push({ icon: '👀', text: `After ${Math.round(dur)}s: ${bNow} blues, ${rNow} reds. Keep watching — waves take a few minutes to form.`, tone: 'info' });
  }
  return out;
}
