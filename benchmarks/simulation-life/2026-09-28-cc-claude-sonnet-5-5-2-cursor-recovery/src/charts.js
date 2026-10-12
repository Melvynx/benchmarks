const BLUE = '#2f86ff';
const RED = '#f0405a';
const FRUIT = '#4f9f2c';
const GRID = 'rgba(120,100,60,0.14)';
const INK = '#6f675a';

function setup(canvas) {
  const box = canvas.parentElement;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(50, box.clientWidth),
    h = Math.max(50, box.clientHeight);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function niceMax(v) {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 1.5, 2, 3, 5, 7.5, 10]) if (m * p >= v) return m * p;
  return v;
}

function fmtT(t) {
  const m = Math.floor(t / 60);
  return m + ':' + String(Math.floor(t % 60)).padStart(2, '0');
}

function line(ctx, pts, color, width = 2.2, dash) {
  let started = false;
  ctx.beginPath();
  for (const [x, y] of pts) {
    if (x == null || y == null) {
      started = false;
      continue;
    }
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.setLineDash(dash || []);
  ctx.stroke();
  ctx.setLineDash([]);
}

function decimate(h, maxPts) {
  if (h.length <= maxPts) return h;
  const step = h.length / maxPts;
  const out = [];
  for (let i = 0; i < maxPts; i++) out.push(h[Math.floor(i * step)]);
  out.push(h[h.length - 1]);
  return out;
}

export function drawMain(canvas, history) {
  const { ctx, w, h } = setup(canvas);
  const L = 34,
    Rr = 38,
    T = 8,
    B = 20;
  const pw = w - L - Rr,
    ph = h - T - B;
  const t1 = Math.max(60, history[history.length - 1].t);
  let gmax = 0,
    fmax = 0;
  for (const s of history) {
    gmax = Math.max(gmax, s.blue, s.red);
    fmax = Math.max(fmax, s.fruit);
  }
  gmax = niceMax(gmax * 1.08);
  fmax = niceMax(fmax * 1.08);
  const X = (t) => L + (t / t1) * pw;
  const YL = (v) => T + ph - (v / gmax) * ph;
  const YR = (v) => T + ph - (v / fmax) * ph;

  ctx.font = '600 10.5px ui-rounded, system-ui';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const y = T + (ph * i) / 4;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(L + pw, y);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'right';
    ctx.fillText(String(Math.round(gmax * (1 - i / 4))), L - 5, y);
    ctx.fillStyle = FRUIT;
    ctx.textAlign = 'left';
    ctx.fillText(String(Math.round(fmax * (1 - i / 4))), L + pw + 5, y);
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  const ticks = 6;
  for (let i = 0; i <= ticks; i++) {
    const t = (t1 * i) / ticks;
    ctx.fillText(fmtT(t), X(t), T + ph + 5);
  }

  const hh = decimate(history, Math.max(60, Math.floor(pw * 1.5)));
  // fruit area + line
  ctx.beginPath();
  ctx.moveTo(X(hh[0].t), T + ph);
  for (const s of hh) ctx.lineTo(X(s.t), YR(s.fruit));
  ctx.lineTo(X(hh[hh.length - 1].t), T + ph);
  ctx.closePath();
  ctx.fillStyle = 'rgba(124,201,74,0.16)';
  ctx.fill();
  line(ctx, hh.map((s) => [X(s.t), YR(s.fruit)]), FRUIT, 1.8);
  line(ctx, hh.map((s) => [X(s.t), YL(s.red)]), RED, 2.4);
  line(ctx, hh.map((s) => [X(s.t), YL(s.blue)]), BLUE, 2.4);

  const last = history[history.length - 1];
  for (const [v, c, f] of [
    [last.blue, BLUE, YL],
    [last.red, RED, YL],
    [last.fruit, FRUIT, YR],
  ]) {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(X(last.t), f(v), 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawPhase(canvas, history) {
  const { ctx, w, h } = setup(canvas);
  const L = 32,
    T = 8,
    B = 22,
    Rr = 10;
  const pw = w - L - Rr,
    ph = h - T - B;
  let bm = 0,
    rm = 0;
  for (const s of history) {
    bm = Math.max(bm, s.blue);
    rm = Math.max(rm, s.red);
  }
  bm = niceMax(bm * 1.08);
  rm = niceMax(rm * 1.08);
  const X = (v) => L + (v / bm) * pw;
  const Y = (v) => T + ph - (v / rm) * ph;
  ctx.font = '600 10.5px ui-rounded, system-ui';
  for (let i = 0; i <= 4; i++) {
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, T + (ph * i) / 4);
    ctx.lineTo(L + pw, T + (ph * i) / 4);
    ctx.moveTo(L + (pw * i) / 4, T);
    ctx.lineTo(L + (pw * i) / 4, T + ph);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 2; i++) ctx.fillText(String(Math.round(rm * (1 - i / 2))), L - 5, T + (ph * i) / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= 2; i++) ctx.fillText(String(Math.round((bm * i) / 2)), L + (pw * i) / 2, T + ph + 4);
  ctx.fillStyle = BLUE;
  ctx.textAlign = 'right';
  ctx.fillText('blue', L + pw, T + ph + 4 + 0);
  ctx.save();
  ctx.translate(9, T + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = RED;
  ctx.textAlign = 'center';
  ctx.fillText('red', 0, -4);
  ctx.restore();

  const hh = decimate(history, 500);
  // fading trail: older = lighter
  const n = hh.length;
  const seg = Math.min(40, n - 1);
  for (let k = 0; k < seg; k++) {
    const i0 = Math.floor((k / seg) * (n - 1)),
      i1 = Math.floor(((k + 1) / seg) * (n - 1));
    const pts = [];
    for (let i = i0; i <= i1; i++) pts.push([X(hh[i].blue), Y(hh[i].red)]);
    const a = 0.15 + 0.85 * ((k + 1) / seg);
    line(ctx, pts, `rgba(${Math.round(120 + 60 * (1 - a))},70,${Math.round(190 - 60 * a)},${a})`, 1.8);
  }
  const s0 = hh[0],
    s1 = hh[n - 1];
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#34302a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(X(s0.blue), Y(s0.red), 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#34302a';
  ctx.beginPath();
  ctx.arc(X(s1.blue), Y(s1.red), 4.5, 0, Math.PI * 2);
  ctx.fill();
}

export function drawTraits(canvas, history) {
  const { ctx, w, h } = setup(canvas);
  const L = 34,
    T = 8,
    B = 20,
    Rr = 10;
  const pw = w - L - Rr,
    ph = h - T - B;
  const t1 = Math.max(60, history[history.length - 1].t);
  const first = history.find((s) => s.bs != null) || history[0];
  const base = { bs: first.bs || 1, bv: first.bv || 1, rs: (history.find((s) => s.rs != null) || first).rs || 1, rv: (history.find((s) => s.rv != null) || first).rv || 1 };
  const rel = (s, k) => (s[k] == null ? null : s[k] / base[k]);
  let lo = 1,
    hi = 1;
  for (const s of history)
    for (const k of ['bs', 'bv', 'rs', 'rv']) {
      const v = rel(s, k);
      if (v != null) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
    }
  const pad = Math.max(0.05, (hi - lo) * 0.15);
  lo = Math.max(0, lo - pad);
  hi += pad;
  const X = (t) => L + (t / t1) * pw;
  const Y = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;
  ctx.font = '600 10.5px ui-rounded, system-ui';
  ctx.fillStyle = INK;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 3; i++) {
    const v = lo + ((hi - lo) * i) / 3;
    const y = Y(v);
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L, y);
    ctx.lineTo(L + pw, y);
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillText(v.toFixed(2) + '×', L - 4, y);
  }
  ctx.strokeStyle = 'rgba(60,50,30,0.4)';
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(L, Y(1));
  ctx.lineTo(L + pw, Y(1));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillStyle = INK;
  for (let i = 0; i <= 3; i++) ctx.fillText(fmtT((t1 * i) / 3), X((t1 * i) / 3), T + ph + 5);
  const hh = decimate(history, Math.max(40, Math.floor(pw)));
  const mk = (k) => hh.map((s) => (rel(s, k) == null ? [null, null] : [X(s.t), Y(rel(s, k))]));
  line(ctx, mk('bv'), BLUE, 1.8, [5, 4]);
  line(ctx, mk('rv'), RED, 1.8, [5, 4]);
  line(ctx, mk('bs'), BLUE, 2.2);
  line(ctx, mk('rs'), RED, 2.2);
}
