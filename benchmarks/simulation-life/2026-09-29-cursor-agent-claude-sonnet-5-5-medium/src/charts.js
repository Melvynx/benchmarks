const BLUE = '#2f7bff', RED = '#ee4347', GREEN = '#5fb842', INK = '#2c3a2a', GRID = '#ece4cd', MUTED = '#8a927f';

export function prep(canvas) {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(50, r.width), h = Math.max(50, r.height);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);
  return { g, w, h };
}

export const fmtT = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

function niceMax(v) {
  if (v <= 5) return 5;
  const p = Math.pow(10, Math.floor(Math.log10(v))), n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function line(g, pts, color, width, dash) {
  g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.lineCap = 'round';
  g.setLineDash(dash || []);
  g.beginPath();
  let pen = false;
  for (const p of pts) { if (!p) { pen = false; continue; } if (pen) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); pen = true; }
  g.stroke(); g.setLineDash([]);
}

function stride(hist, max) {
  if (hist.length <= max) return hist;
  const k = Math.ceil(hist.length / max), out = [];
  for (let i = 0; i < hist.length; i += k) out.push(hist[i]);
  if (out[out.length - 1] !== hist[hist.length - 1]) out.push(hist[hist.length - 1]);
  return out;
}

export function drawTimeline(canvas, hist, fruitCap, hoverX) {
  const { g, w, h } = prep(canvas);
  const L = 36, R = 40, T = 10, B = 24, pw = w - L - R, ph = h - T - B;
  const tEnd = Math.max(60, hist[hist.length - 1].t);
  let pm = 5, fm = fruitCap;
  for (const s of hist) { pm = Math.max(pm, s.blue, s.red); fm = Math.max(fm, s.fruit); }
  pm = niceMax(pm * 1.08); fm = niceMax(fm);
  const X = (t) => L + (t / tEnd) * pw, YP = (v) => T + ph - (v / pm) * ph, YF = (v) => T + ph - (v / fm) * ph;
  g.font = '11px ui-rounded, system-ui, sans-serif'; g.fillStyle = MUTED; g.strokeStyle = GRID; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = T + (ph * i) / 4;
    g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(L + pw, y + 0.5); g.stroke();
    g.textAlign = 'right'; g.fillText(String(Math.round(pm * (1 - i / 4))), L - 6, y + 4);
    g.textAlign = 'left'; g.fillStyle = '#7fae5c'; g.fillText(String(Math.round(fm * (1 - i / 4))), L + pw + 6, y + 4); g.fillStyle = MUTED;
  }
  g.textAlign = 'center';
  const ticks = 6;
  for (let i = 0; i <= ticks; i++) { const t = (tEnd * i) / ticks; g.fillText(fmtT(t), X(t), h - 7); }
  const d = stride(hist, Math.max(60, pw * 1.2));
  const gr = g.createLinearGradient(0, T, 0, T + ph);
  gr.addColorStop(0, 'rgba(120,200,70,.35)'); gr.addColorStop(1, 'rgba(120,200,70,.03)');
  g.beginPath(); g.moveTo(X(d[0].t), T + ph);
  for (const s of d) g.lineTo(X(s.t), YF(s.fruit));
  g.lineTo(X(d[d.length - 1].t), T + ph); g.closePath(); g.fillStyle = gr; g.fill();
  line(g, d.map((s) => [X(s.t), YF(s.fruit)]), '#7fc14f', 1.6);
  line(g, d.map((s) => [X(s.t), YP(s.blue)]), BLUE, 2.6);
  line(g, d.map((s) => [X(s.t), YP(s.red)]), RED, 2.6);
  if (hoverX != null && hoverX >= L && hoverX <= L + pw) {
    const t = ((hoverX - L) / pw) * tEnd;
    let best = hist[0];
    for (const s of hist) if (Math.abs(s.t - t) < Math.abs(best.t - t)) best = s;
    const x = X(best.t);
    g.strokeStyle = 'rgba(44,58,42,.35)'; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(x, T); g.lineTo(x, T + ph); g.stroke(); g.setLineDash([]);
    for (const [v, c, Y] of [[best.blue, BLUE, YP], [best.red, RED, YP], [best.fruit, '#7fc14f', YF]]) { g.fillStyle = c; g.beginPath(); g.arc(x, Y(v), 4, 0, 6.3); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke(); }
    const txt = [`${fmtT(best.t)}`, `blue ${best.blue}`, `red ${best.red}`, `fruit ${best.fruit}`];
    g.font = '600 12px ui-rounded, system-ui, sans-serif';
    const bw = 92, bh = 68, bx = x + 12 + bw > L + pw ? x - 12 - bw : x + 12;
    g.fillStyle = 'rgba(255,253,246,.96)'; g.strokeStyle = '#e4dcc6'; g.lineWidth = 1;
    g.beginPath(); g.roundRect(bx, T + 6, bw, bh, 8); g.fill(); g.stroke();
    g.textAlign = 'left';
    txt.forEach((s, i) => { g.fillStyle = [INK, BLUE, RED, '#5f9a3a'][i]; g.fillText(s, bx + 10, T + 24 + i * 15); });
  }
}

export function drawPhase(canvas, hist) {
  const { g, w, h } = prep(canvas);
  const L = 34, R = 12, T = 10, B = 26, pw = w - L - R, ph = h - T - B;
  let bm = 5, rm = 5;
  for (const s of hist) { bm = Math.max(bm, s.blue); rm = Math.max(rm, s.red); }
  bm = niceMax(bm * 1.05); rm = niceMax(rm * 1.05);
  const X = (v) => L + (v / bm) * pw, Y = (v) => T + ph - (v / rm) * ph;
  g.font = '11px ui-rounded, system-ui, sans-serif'; g.strokeStyle = GRID; g.fillStyle = MUTED; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = T + (ph * i) / 4, x = L + (pw * i) / 4;
    g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(L + pw, y + 0.5); g.moveTo(x + 0.5, T); g.lineTo(x + 0.5, T + ph); g.stroke();
    g.textAlign = 'right'; g.fillText(String(Math.round(rm * (1 - i / 4))), L - 5, y + 4);
    g.textAlign = 'center'; g.fillText(String(Math.round((bm * i) / 4)), x, h - 12);
  }
  g.fillStyle = BLUE; g.textAlign = 'right'; g.fillText('blue blobs', L + pw, h - 1);
  g.save(); g.translate(9, T + 4); g.rotate(-Math.PI / 2); g.fillStyle = RED; g.textAlign = 'right'; g.fillText('red blobs', 0, 0); g.restore();
  const d = stride(hist, 500);
  g.lineCap = 'round'; g.lineWidth = 2.2;
  for (let i = 1; i < d.length; i++) {
    const u = i / d.length;
    g.strokeStyle = `hsla(${270 - u * 250}, 65%, ${62 - u * 18}%, ${0.35 + u * 0.65})`;
    g.beginPath(); g.moveTo(X(d[i - 1].blue), Y(d[i - 1].red)); g.lineTo(X(d[i].blue), Y(d[i].red)); g.stroke();
  }
  const a = d[0], z = d[d.length - 1];
  g.fillStyle = '#fff'; g.strokeStyle = INK; g.lineWidth = 2;
  g.beginPath(); g.arc(X(a.blue), Y(a.red), 4, 0, 6.3); g.fill(); g.stroke();
  g.fillStyle = INK; g.beginPath(); g.arc(X(z.blue), Y(z.red), 5, 0, 6.3); g.fill();
  g.fillStyle = MUTED; g.textAlign = 'left'; g.fillText('start', X(a.blue) + 7, Y(a.red) - 6);
}

export function drawTraits(canvas, hist) {
  const { g, w, h } = prep(canvas);
  const L = 34, R = 10, T = 10, B = 24, pw = w - L - R, ph = h - T - B;
  const tEnd = Math.max(60, hist[hist.length - 1].t);
  let lo = 0.85, hi = 1.15;
  for (const s of hist) for (const k of ['bSp', 'bVi', 'rSp', 'rVi']) if (s[k] != null) { lo = Math.min(lo, s[k] - 0.03); hi = Math.max(hi, s[k] + 0.03); }
  const X = (t) => L + (t / tEnd) * pw, Y = (v) => T + ph - ((v - lo) / (hi - lo)) * ph;
  g.font = '11px ui-rounded, system-ui, sans-serif'; g.strokeStyle = GRID; g.fillStyle = MUTED; g.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = T + (ph * i) / 4;
    g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(L + pw, y + 0.5); g.stroke();
    g.textAlign = 'right'; g.fillText((hi - ((hi - lo) * i) / 4).toFixed(2), L - 5, y + 4);
  }
  g.textAlign = 'center';
  for (let i = 0; i <= 3; i++) { const t = (tEnd * i) / 3; g.fillText(fmtT(t), X(t), h - 7); }
  g.strokeStyle = 'rgba(44,58,42,.4)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(L, Y(1)); g.lineTo(L + pw, Y(1)); g.stroke(); g.setLineDash([]);
  const d = stride(hist, Math.max(60, pw));
  const ser = (k) => d.map((s) => (s[k] == null ? null : [X(s.t), Y(s[k])]));
  line(g, ser('bSp'), BLUE, 2); line(g, ser('bVi'), BLUE, 2, [5, 4]);
  line(g, ser('rSp'), RED, 2); line(g, ser('rVi'), RED, 2, [5, 4]);
}

function smooth(a, k) {
  return a.map((_, i) => { let s = 0, n = 0; for (let j = -k; j <= k; j++) if (a[i + j] != null) { s += a[i + j]; n++; } return s / n; });
}
function zigzag(a, thr) {
  const peaks = [];
  let hiI = 0, loI = 0, mode = 0;
  for (let i = 0; i < a.length; i++) {
    if (mode >= 0) {
      if (a[i] > a[hiI]) hiI = i;
      if (a[hiI] - a[i] >= thr) { peaks.push(hiI); mode = -1; loI = i; }
    } else {
      if (a[i] < a[loI]) loI = i;
      if (a[i] - a[loI] >= thr) { mode = 1; hiI = i; }
    }
  }
  return peaks;
}
function corr(a, b, lag) {
  let sa = 0, sb = 0, n = 0;
  const A = [], B = [];
  for (let i = 0; i < a.length; i++) { const j = i + lag; if (j >= 0 && j < b.length) { A.push(a[i]); B.push(b[j]); } }
  n = A.length; if (n < 10) return 0;
  for (let i = 0; i < n; i++) { sa += A[i]; sb += B[i]; }
  const ma = sa / n, mb = sb / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { num += (A[i] - ma) * (B[i] - mb); da += (A[i] - ma) ** 2; db += (B[i] - mb) ** 2; }
  return num / (Math.sqrt(da * db) || 1);
}

export function summarize(sim) {
  const hist = sim.history, last = hist[hist.length - 1], p = sim.p, st = sim.stats;
  const cap = p.trees * p.fruitLimit;
  const stats = [
    ['Elapsed', fmtT(sim.t)], ['Fruit eaten', st.eaten],
    ['Peak blue', `${st.peakBlue} @ ${fmtT(st.peakBlueT)}`], ['Peak red', `${st.peakRed} @ ${fmtT(st.peakRedT)}`],
    ['New blue / red', `${st.born.blue} / ${st.born.red}`], ['Contacts', st.contacts],
    ['Faded blue / red', `${st.starved.blue} / ${st.starved.red}`], ['Visitors', `${st.visitors.blue + st.visitors.red}`],
  ];
  if (sim.t < 45) return { mood: ['Warming up', ''], lines: ['Let it run for a minute; the story needs some history.'], stats };
  const lines = [];
  const bl = hist.map((s) => s.blue), rd = hist.map((s) => s.red);
  const bs = smooth(bl, 3), rs = smooth(rd, 3);
  const bmax = Math.max(...bl), rmax = Math.max(...rd);
  const bp = zigzag(bs, Math.max(4, bmax * 0.3)), rp = zigzag(rs, Math.max(3, rmax * 0.3));
  const dt = hist.length > 1 ? hist[1].t - hist[0].t : 1;
  let mood = ['Settling', ''];
  const blueGone = last.blue === 0, redGone = last.red === 0;
  const tail = hist.slice(Math.floor(hist.length * 0.6));
  const cv = (k) => { const m = tail.reduce((s, x) => s + x[k], 0) / tail.length; const v = tail.reduce((s, x) => s + (x[k] - m) ** 2, 0) / tail.length; return m > 0 ? Math.sqrt(v) / m : 9; };

  if (blueGone && redGone) { lines.push('Both groups faded. Only fruit trees are left, the simplest world.'); mood = ['Empty garden', 'bad']; }
  else if (blueGone) { lines.push('Blue blobs ran out. Red blobs have nothing to contact and are running low.'); mood = ['Blue faded', 'bad']; }
  else if (redGone) { lines.push(`Red blobs faded, so blue blobs are growing toward what the fruit can feed (${last.blue} now).`); mood = ['Red faded', 'warn']; }
  else if (cv('blue') < 0.18 && cv('red') < 0.25 && sim.t > 240) { lines.push('The garden stayed balanced: both groups levelled out instead of growing forever.'); mood = ['Balanced', '']; }
  else if (bp.length + rp.length >= 3) { lines.push('The groups keep rising and falling in waves.'); mood = ['Waves', '']; }
  else lines.push('Still finding its rhythm.');

  if (bp.length && rp.length) {
    const lagT = (hist[rp[0]].t - hist[bp[0]].t);
    if (lagT > 8) lines.push(`Blue grew first, then red followed about ${fmtT(lagT)} later.`);
    else if (lagT < -8) lines.push('Red numbers peaked before blue this time; the starting mix leaned red.');
  } else if (bp.length && bl[0] < bmax * 0.7) lines.push(`Blue blobs grew from ${bl[0]} to ${bmax}.`);
  const rounds = Math.min(bp.length, rp.length);
  if (rounds >= 2) lines.push(`${rounds} boom-and-fade rounds so far.`);
  if (hist.length > 100 && !blueGone && !redGone) {
    const n = Math.min(hist.length, 1500), off = hist.length - n;
    const B = bs.slice(off), Rr = rs.slice(off), maxLag = Math.floor(n * 0.3);
    let bestLag = 0, best = -2;
    for (let l = 0; l <= maxLag; l++) { const c = corr(B, Rr, l); if (c > best) { best = c; bestLag = l; } }
    const c0 = corr(B, Rr, 0);
    if (best > 0.35 && bestLag * dt > 10 && (bp.length + rp.length) >= 3) lines.push(`Red trails blue by roughly ${fmtT(bestLag * dt)}; the waves run out of phase.`);
    else if (c0 < -0.3 && (bp.length + rp.length) >= 3) lines.push('When blue is high, red is low, and the other way around.');
  }
  let mf = 0; for (const s of hist) mf += s.fruit; mf /= hist.length;
  if (mf < cap * 0.12) lines.push('Low fruit kept the garden small; food is the limit here.');
  else if (mf > cap * 0.65) lines.push('Trees stayed loaded. Fruit is not what holds blue back.');
  if (st.visitors.blue + st.visitors.red > 0) lines.push(`${st.visitors.blue + st.visitors.red} visitor(s) wandered in after a group was gone for a while.`);
  const tr = (k) => (last[k] != null ? Math.round((last[k] - 1) * 100) : null);
  const bv = tr('bVi'), bsp = tr('bSp');
  if (bv != null && Math.abs(bv) >= 6 && sim.t > 300) lines.push(`Blue vision drifted ${bv > 0 ? '+' : ''}${bv}% and speed ${bsp > 0 ? '+' : ''}${bsp}% from inheritance.`);
  return { mood, lines: lines.slice(0, 6), stats };
}
