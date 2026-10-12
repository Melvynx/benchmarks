import { MAXE, mulberry32 } from './sim.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const LIGHT = -2.3;

const PAL = {
  blue: { top: '#a4dcff', mid: '#4a92ff', bot: '#2a56d6', feet: '#2447b3', glow: '120,180,255' },
  red: { top: '#ffb3a4', mid: '#f2504a', bot: '#b8222f', feet: '#98202b', glow: '255,140,120' },
};

export class WorldView {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.yaw = 0.55; this.el = 0.92; this.zoom = 1;
    this.parts = [];
    this.time = 0;
    this.selectedId = null; this.hoverId = null;
    this.deco = null; this.decoKey = '';
    this.treeFx = new Map();
    this.anim = new Map();
    this.onSpecial = null;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const r = this.c.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(200, r.width); this.h = Math.max(200, r.height);
    this.c.width = Math.round(this.w * dpr); this.c.height = Math.round(this.h * dpr);
    this.dpr = dpr;
  }

  setup(R) {
    this.R = R;
    this.cs = Math.cos(this.yaw); this.sn = Math.sin(this.yaw);
    this.se = Math.sin(this.el); this.ce = Math.cos(this.el);
    const T = 1.8;
    const fit = Math.min((this.w * 0.47) / (R + 1), (this.h * 0.86) / (2 * (R + 1) * this.se + T * this.ce + 5 * this.ce));
    this.S = fit * this.zoom;
    this.cx = this.w / 2;
    this.cy = this.h * 0.5 + (T * this.ce * this.S) * 0.35 - 3 * this.ce * this.S * 0.4;
    this.T = T;
  }

  proj(x, y, z = 0) {
    const rx = x * this.cs - y * this.sn, ry = x * this.sn + y * this.cs;
    return [this.cx + rx * this.S, this.cy + ry * this.S * this.se - z * this.S * this.ce, ry];
  }

  build(R, seed) {
    const key = R + ':' + seed;
    if (key === this.decoKey) return;
    this.decoKey = key;
    const rng = mulberry32(seed * 31 + R);
    const items = [];
    for (let i = 0; i < 190; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * (R - 0.8), k = rng();
      items.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, k, s: 0.6 + rng() * 0.7, r: rng(), a: rng() * TAU });
    }
    this.deco = items;
  }

  ingest(sim) {
    const evs = sim.events;
    const start = Math.max(0, evs.length - 70);
    for (let i = start; i < evs.length; i++) this.handle(evs[i], sim);
    evs.length = 0;
  }

  handle(e, sim) {
    const col = e.c === 'red' ? '255,120,110' : '110,170,255';
    if (e.type === 'eat') {
      const tr = sim.trees.find((t) => Math.hypot(t.x - e.x, t.y - e.y) < 0.01);
      if (tr) this.fx(tr).wob = 1;
      for (let i = 0; i < 4; i++) this.spawn({ t: 'spark', x: e.x, y: e.y, z: 3 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 1.5 + Math.random() * 2, life: 0.8, col: '190,240,110' });
    } else if (e.type === 'energy') {
      this.spawn({ t: 'text', x: e.x, y: e.y, z: 2.6, vz: 2.2, life: 1.1, text: '+' + e.v, col: '70,150,50' });
      this.spawn({ t: 'ring', x: e.x, y: e.y, z: 0, r: 0.5, vr: 4, life: 0.6, col });
    } else if (e.type === 'contact') {
      for (let i = 0; i < 7; i++) {
        const a = Math.random() * TAU;
        this.spawn({ t: 'spark', x: e.x, y: e.y, z: 1.6, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: 2 + Math.random() * 2, life: 0.7, col: i % 2 ? '255,120,110' : '120,180,255' });
      }
      this.spawn({ t: 'ring', x: e.x, y: e.y, z: 0, r: 0.4, vr: 5, life: 0.55, col: '255,140,120' });
    } else if (e.type === 'birth') {
      this.spawn({ t: 'heart', x: e.x, y: e.y, z: 3, vz: 1.8, life: 1.3, col });
      this.spawn({ t: 'ring', x: e.x, y: e.y, z: 0, r: 0.6, vr: 3.5, life: 0.8, col });
      for (let i = 0; i < 5; i++) this.spawn({ t: 'spark', x: e.x, y: e.y, z: 1.5, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 2 + Math.random() * 2, life: 0.9, col: '255,235,140' });
    } else if (e.type === 'poof') {
      for (let i = 0; i < 6; i++) this.spawn({ t: 'puff', x: e.x, y: e.y, z: 1, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 1 + Math.random(), life: 0.9, col: '235,235,240' });
    } else if (e.type === 'visitor') {
      this.spawn({ t: 'ring', x: e.x, y: e.y, z: 0, r: 0.5, vr: 6, life: 1.2, col });
      if (this.onSpecial) this.onSpecial(e);
    }
  }

  fx(tr) {
    let f = this.treeFx.get(tr.id);
    if (!f) { f = { wob: 0 }; this.treeFx.set(tr.id, f); }
    return f;
  }

  spawn(p) { if (this.parts.length < 500) { p.age = 0; this.parts.push(p); } }

  st(b) {
    let s = this.anim.get(b.id);
    if (!s) { s = { ph: b.phase, hop: 0 }; this.anim.set(b.id, s); }
    return s;
  }

  pick(sim, mx, my, alpha) {
    let best = null, bd = 1e9;
    this.setup(sim.p.worldSize);
    for (const arr of [sim.blues, sim.reds]) for (const b of arr) {
      const x = b.px + (b.x - b.px) * alpha, y = b.py + (b.y - b.py) * alpha;
      const [sx, sy] = this.proj(x, y, 0);
      const hh = this.S * 1.0;
      const d = Math.hypot(sx - mx, sy - hh - my);
      const lim = Math.max(14, this.S * 1.3);
      if (d < lim && d < bd) { bd = d; best = b; }
    }
    return best;
  }

  draw(sim, alpha, dt) {
    const g = this.g, R = sim.p.worldSize;
    this.time += dt;
    this.build(R, sim.p.seed);
    this.setup(R);
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.parts.forEach((p) => { p.age += dt; p.x += (p.vx || 0) * dt; p.y += (p.vy || 0) * dt; p.z += (p.vz || 0) * dt; if (p.t === 'spark' || p.t === 'puff') p.vz -= 5 * dt; if (p.t === 'ring') p.r += p.vr * dt; });
    this.parts = this.parts.filter((p) => p.age < p.life);
    for (const [id, f] of this.treeFx) f.wob = Math.max(0, f.wob - dt * 2.2);

    this.drawTable(g);
    this.drawDish(g, R);
    this.drawGround(g, R);

    const items = [];
    for (const t of sim.trees) items.push({ d: this.proj(t.x, t.y)[2], tree: t });
    const cache = [];
    for (const arr of [sim.blues, sim.reds]) for (const b of arr) {
      const x = b.px + (b.x - b.px) * alpha, y = b.py + (b.y - b.py) * alpha;
      const d = this.proj(x, y)[2];
      items.push({ d, blob: b, x, y });
      cache.push(b);
    }
    items.sort((a, b) => a.d - b.d);
    if (this.selectedId != null) {
      const sb = cache.find((b) => b.id === this.selectedId);
      if (sb) this.drawSelectionGround(g, sb, sim, alpha);
    }
    for (const it of items) {
      if (it.tree) this.drawTree(g, it.tree, sim);
      else this.drawBlob(g, it.blob, it.x, it.y, dt);
    }
    this.drawParticles(g);
    if (this.anim.size > cache.length * 2 + 50) {
      const live = new Set(cache.map((b) => b.id));
      for (const k of this.anim.keys()) if (!live.has(k)) this.anim.delete(k);
    }
  }

  drawTable(g) {
    const grd = g.createRadialGradient(this.w / 2, this.h * 0.45, 40, this.w / 2, this.h * 0.5, Math.max(this.w, this.h) * 0.75);
    grd.addColorStop(0, '#f6ecd0'); grd.addColorStop(1, '#d9c69a');
    g.fillStyle = grd; g.fillRect(0, 0, this.w, this.h);
    g.globalAlpha = 0.07; g.fillStyle = '#7a5a20';
    for (let y = 0; y < this.h; y += 26) g.fillRect(0, y, this.w, 1);
    g.globalAlpha = 1;
  }

  ring(R, z, n = 96) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * TAU; pts.push(this.proj(Math.cos(a) * R, Math.sin(a) * R, z)); }
    return pts;
  }
  poly(g, pts) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); }

  drawDish(g, R) {
    const Rr = R + 0.9, T = this.T;
    const sh = this.ring(Rr + 1.2, -T - 0.2);
    this.poly(g, sh); g.fillStyle = 'rgba(90,60,20,.22)'; g.filter = 'blur(10px)'; g.fill(); g.filter = 'none';
    const N = 96, segs = [];
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU, a1 = ((i + 1) / N) * TAU, am = (a0 + a1) / 2;
      const p0 = this.proj(Math.cos(a0) * Rr, Math.sin(a0) * Rr, 0), p1 = this.proj(Math.cos(a1) * Rr, Math.sin(a1) * Rr, 0);
      const q0 = this.proj(Math.cos(a0) * Rr, Math.sin(a0) * Rr, -T), q1 = this.proj(Math.cos(a1) * Rr, Math.sin(a1) * Rr, -T);
      segs.push({ d: this.proj(Math.cos(am) * Rr, Math.sin(am) * Rr)[2], p0, p1, q0, q1, am });
    }
    segs.sort((a, b) => a.d - b.d);
    for (const s of segs) {
      const l = 0.78 + 0.22 * Math.cos(s.am - LIGHT);
      g.beginPath(); g.moveTo(s.p0[0], s.p0[1]); g.lineTo(s.p1[0], s.p1[1]); g.lineTo(s.q1[0], s.q1[1]); g.lineTo(s.q0[0], s.q0[1]); g.closePath();
      const c = (v) => Math.round(v * l);
      g.fillStyle = `rgb(${c(196)},${c(128)},${c(84)})`; g.strokeStyle = g.fillStyle; g.lineWidth = 1; g.fill(); g.stroke();
    }
    this.poly(g, this.ring(Rr, 0)); g.fillStyle = '#fbf1d6'; g.fill();
    g.strokeStyle = 'rgba(160,110,60,.55)'; g.lineWidth = 1.5; g.stroke();
    const grass = this.ring(R, 0);
    this.poly(g, grass);
    const gc = this.proj(0, 0, 0);
    const grd = g.createRadialGradient(gc[0] - this.S * R * 0.2, gc[1] - this.S * R * 0.2 * this.se, 4, gc[0], gc[1], this.S * R * 1.05);
    grd.addColorStop(0, '#b4e27a'); grd.addColorStop(0.6, '#86c95a'); grd.addColorStop(1, '#68ad48');
    g.fillStyle = grd; g.fill();
    g.strokeStyle = 'rgba(40,90,30,.28)'; g.lineWidth = 3; g.stroke();
  }

  drawGround(g, R) {
    g.save();
    this.poly(g, this.ring(R - 0.05, 0)); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.13)'; g.lineWidth = 2;
    for (const f of [0.33, 0.66]) { this.poly(g, this.ring(R * f, 0, 72)); g.stroke(); }
    g.strokeStyle = 'rgba(60,110,40,.10)';
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + 0.3; const p = this.proj(Math.cos(a) * R, Math.sin(a) * R), o = this.proj(0, 0); g.beginPath(); g.moveTo(o[0], o[1]); g.lineTo(p[0], p[1]); g.stroke(); }
    const S = this.S;
    const items = this.deco.map((d) => ({ d, p: this.proj(d.x, d.y) })).sort((a, b) => a.p[2] - b.p[2]);
    for (const { d, p } of items) {
      const [sx, sy] = p;
      if (d.k < 0.55) {
        g.strokeStyle = d.r > 0.5 ? '#4d9a3a' : '#5eb04a'; g.lineWidth = Math.max(1, S * 0.11); g.lineCap = 'round';
        for (let j = -1; j <= 1; j++) {
          g.beginPath(); g.moveTo(sx + j * S * 0.16, sy); g.quadraticCurveTo(sx + j * S * 0.3, sy - S * 0.35 * d.s, sx + j * S * 0.42 + Math.sin(this.time * 1.5 + d.a) * S * 0.08, sy - S * 0.62 * d.s); g.stroke();
        }
      } else if (d.k < 0.8) {
        const col = ['#fff7f0', '#ffd6e6', '#ffe36b', '#e6d4ff'][Math.floor(d.r * 4)];
        g.strokeStyle = '#4d9a3a'; g.lineWidth = Math.max(1, S * 0.08);
        g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx, sy - S * 0.5); g.stroke();
        g.fillStyle = col;
        for (let j = 0; j < 5; j++) { g.beginPath(); g.arc(sx + Math.cos(j * 1.256) * S * 0.16, sy - S * 0.55 + Math.sin(j * 1.256) * S * 0.16, S * 0.13, 0, TAU); g.fill(); }
        g.fillStyle = '#f5a623'; g.beginPath(); g.arc(sx, sy - S * 0.55, S * 0.09, 0, TAU); g.fill();
      } else if (d.k < 0.9) {
        g.fillStyle = 'rgba(70,90,60,.35)'; g.beginPath(); g.ellipse(sx, sy + 1, S * 0.32 * d.s, S * 0.16 * d.s, 0, 0, TAU); g.fill();
        g.fillStyle = '#c9cfc0'; g.beginPath(); g.ellipse(sx, sy - 1, S * 0.3 * d.s, S * 0.2 * d.s, 0, 0, TAU); g.fill();
      }
    }
    g.restore();
  }

  drawTree(g, tr, sim) {
    const S = this.S, sz = tr.size;
    const f = this.fx(tr);
    const [bx, by] = this.proj(tr.x, tr.y, 0);
    g.fillStyle = 'rgba(30,70,20,.28)';
    g.beginPath(); g.ellipse(bx, by + 2, S * 2.4 * sz, S * 2.4 * sz * this.se * 0.9, 0, 0, TAU); g.fill();
    const sway = Math.sin(this.time * 1.2 + tr.phase) * 0.12 + Math.sin(this.time * 38) * 0.22 * f.wob * f.wob;
    const top = this.proj(tr.x + sway, tr.y, 2.2 * sz);
    g.strokeStyle = '#8a5a34'; g.lineCap = 'round'; g.lineWidth = S * 0.7 * sz;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(top[0], top[1]); g.stroke();
    g.strokeStyle = '#a8724a'; g.lineWidth = S * 0.22 * sz;
    g.beginPath(); g.moveTo(bx - S * 0.15, by); g.lineTo(top[0] - S * 0.15, top[1]); g.stroke();
    const cz = 3.6 * sz, Rc = 2.15 * sz;
    const center = this.proj(tr.x + sway, tr.y, cz);
    const limit = sim.p.fruitLimit;
    const slotPos = (k) => {
      const phi = k * 2.399 + tr.phase, ct = 0.62 - (k % 5) * 0.2;
      const hr = Math.sqrt(1 - ct * ct) * Rc * 0.98;
      return this.proj(tr.x + sway + Math.cos(phi) * hr, tr.y + Math.sin(phi) * hr, cz + ct * Rc * 0.95);
    };
    const drawFruit = (k, scale, alpha, pale) => {
      const p = slotPos(k), r = Math.max(2.4, S * 0.5) * scale;
      if (r < 0.6) return;
      g.globalAlpha = alpha;
      g.fillStyle = 'rgba(20,60,10,.25)'; g.beginPath(); g.arc(p[0] + 1, p[1] + 1.5, r, 0, TAU); g.fill();
      const gr = g.createRadialGradient(p[0] - r * 0.35, p[1] - r * 0.4, r * 0.1, p[0], p[1], r);
      gr.addColorStop(0, pale ? '#e6ffb8' : '#dfff9a'); gr.addColorStop(1, pale ? '#9bd85c' : '#5cb932');
      g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], r, 0, TAU); g.fill();
      g.strokeStyle = 'rgba(40,110,20,.55)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.85)'; g.beginPath(); g.arc(p[0] - r * 0.35, p[1] - r * 0.4, r * 0.24, 0, TAU); g.fill();
      g.globalAlpha = 1;
    };
    const all = [];
    for (let k = 0; k < Math.min(tr.fruit, limit, 10); k++) all.push({ k, s: 1, a: 1, back: slotPos(k)[2] < center[2] - 0.2 });
    for (const e of tr.eaten) { if (e.slot < 10) { const u = e.t / e.dur; all.push({ k: e.slot, s: Math.max(0, 1 - u) * (1 + 0.25 * Math.sin(u * 20)), a: 1 - u * 0.6, back: slotPos(e.slot)[2] < center[2] - 0.2 }); } }
    if (tr.cool <= 0 && tr.fruit < limit && tr.fruit < 10) all.push({ k: tr.fruit, s: 0.2 + 0.7 * tr.grow, a: 0.9, pale: true, back: slotPos(tr.fruit)[2] < center[2] - 0.2 });
    for (const a of all) if (a.back) drawFruit(a.k, a.s, a.a, a.pale);
    const lobes = [[0, 0, 0, 1], [-0.75, 0.2, -0.35, 0.72], [0.75, -0.1, -0.25, 0.75], [0.1, 0.6, 0.45, 0.62]];
    const rr = S * Rc;
    for (const [dx, dy, dz, sc] of lobes) {
      const p = this.proj(tr.x + sway + dx * sz, tr.y + dy * sz, cz + dz * sz);
      g.fillStyle = '#3f9a48'; g.beginPath(); g.arc(p[0], p[1], rr * sc, 0, TAU); g.fill();
    }
    for (const [dx, dy, dz, sc] of lobes) {
      const p = this.proj(tr.x + sway + dx * sz, tr.y + dy * sz, cz + dz * sz);
      const gr = g.createRadialGradient(p[0] - rr * sc * 0.35, p[1] - rr * sc * 0.4, rr * sc * 0.1, p[0], p[1], rr * sc);
      gr.addColorStop(0, '#95dd70'); gr.addColorStop(0.6, '#55b352'); gr.addColorStop(1, '#3a9046');
      g.fillStyle = gr; g.beginPath(); g.arc(p[0], p[1], rr * sc * 0.97, 0, TAU); g.fill();
    }
    g.strokeStyle = 'rgba(25,80,30,.35)'; g.lineWidth = 1.2;
    g.beginPath(); g.arc(center[0], center[1], rr * 1.0, 0.2, 2.9); g.stroke();
    for (const a of all) if (!a.back) drawFruit(a.k, a.s, a.a, a.pale);
    if (tr.cool > 0 && tr.fruit < limit && sim.p.fruitDelay > 0) {
      g.fillStyle = 'rgba(255,255,255,.75)'; g.font = `700 ${Math.max(9, S * 0.7)}px ui-rounded, system-ui`; g.textAlign = 'center';
      g.fillText('z', center[0] + rr * 0.7, center[1] - rr * 0.75 - Math.sin(this.time * 2 + tr.phase) * 2);
    }
  }

  drawBlob(g, b, x, y, dt) {
    const S = this.S, pal = PAL[b.kind], a = this.st(b);
    const [bx, by] = this.proj(x, y, 0);
    const moving = b.speedNow > 0.6;
    a.ph += dt * (moving ? 5 + b.speedNow * 1.6 : 2.2);
    const busy = b.busy > 0, k = busy ? b.busyKind : b.action;
    const prog = busy && b.busyMax > 0 ? 1 - b.busy / b.busyMax : 0;
    const hopAmt = moving && !busy ? Math.abs(Math.sin(a.ph)) * 0.42 : 0;
    const land = moving && !busy ? Math.max(0, 0.22 - Math.abs(Math.sin(a.ph))) * 2.2 : 0;
    let sx = 1 + land * 0.35 - hopAmt * 0.18, sy = 1 - land * 0.4 + hopAmt * 0.22;
    let shake = 0, tilt = 0;
    const e = b.energy / MAXE;
    if (!moving) { const br = Math.sin(a.ph) * 0.03; sy += br; sx -= br * 0.6; }
    if (k === 'eating') { const c = Math.sin(this.time * 24 + b.id); sy += c * 0.07; sx -= c * 0.05; tilt = 0.12; }
    if (k === 'startled') { shake = Math.sin(this.time * 55) * S * 0.14 * (1 - prog); sy += 0.12 * (1 - prog); }
    if (k === 'making a friend') { const p = Math.sin(prog * Math.PI); sx += p * 0.22; sy += p * 0.22; }
    if (k === 'digesting') { const c = Math.sin(this.time * 6); sy += c * 0.04 - 0.03; sx += 0.05; }
    if (k === 'waking up') { const s = 0.45 + prog * 0.55; sx *= s; sy *= s; }
    const grow = clamp(0.7 + b.age * 0.05, 0.7, 1) * (0.86 + 0.22 * e);
    const W = S * 1.55 * grow, H = S * 2.05 * grow;
    const vsx = b.vx * this.cs - b.vy * this.sn;
    const lean = clamp(vsx * 0.07, -0.4, 0.4) + tilt;
    const hop = hopAmt * S;
    const drawnAlpha = 1;
    g.globalAlpha = drawnAlpha;
    g.fillStyle = 'rgba(30,60,20,.3)';
    const shw = W * 0.55 * (1 - hopAmt * 0.3);
    g.beginPath(); g.ellipse(bx, by + 1, shw, shw * this.se * 0.75, 0, 0, TAU); g.fill();
    if (this.selectedId === b.id || this.hoverId === b.id) {
      g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineWidth = 2.5;
      g.beginPath(); g.ellipse(bx, by + 1, shw * 1.35, shw * 1.35 * this.se * 0.75, 0, 0, TAU); g.stroke();
    }
    if (k === 'eating' || k === 'making a friend' || k === 'digesting') {
      const gr = g.createRadialGradient(bx, by - H * 0.5, W * 0.2, bx, by - H * 0.5, W * (1.2 + 0.25 * Math.sin(this.time * 9)));
      const gcol = k === 'eating' ? '190,255,120' : k === 'digesting' ? '255,150,130' : '255,230,130';
      gr.addColorStop(0, `rgba(${gcol},.6)`); gr.addColorStop(1, `rgba(${gcol},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(bx, by - H * 0.5, W * 1.5, 0, TAU); g.fill();
    }
    g.save();
    g.translate(bx + shake, by - hop);
    g.rotate(lean);
    g.scale(sx, sy);
    g.fillStyle = pal.feet;
    g.beginPath(); g.ellipse(-W * 0.22, -H * 0.03, W * 0.16, H * 0.06, 0, 0, TAU); g.ellipse(W * 0.22, -H * 0.03, W * 0.16, H * 0.06, 0, 0, TAU); g.fill();
    const bean = () => {
      g.beginPath();
      g.moveTo(0, -H * 0.02);
      g.bezierCurveTo(W * 0.62, -H * 0.02, W * 0.58, -H * 0.98, W * 0.05, -H);
      g.bezierCurveTo(-W * 0.55, -H * 1.0, -W * 0.64, -H * 0.02, 0, -H * 0.02);
      g.closePath();
    };
    const gr = g.createLinearGradient(-W * 0.5, -H, W * 0.5, 0);
    gr.addColorStop(0, pal.top); gr.addColorStop(0.45, pal.mid); gr.addColorStop(1, pal.bot);
    bean(); g.fillStyle = gr; g.fill();
    g.strokeStyle = 'rgba(0,0,30,.28)'; g.lineWidth = 1.2; g.stroke();
    if (e < 0.5) { bean(); g.fillStyle = `rgba(235,235,245,${(0.5 - e) * 0.6})`; g.fill(); }
    g.save(); bean(); g.clip();
    g.fillStyle = 'rgba(0,0,40,.16)'; g.beginPath(); g.ellipse(W * 0.28, -H * 0.3, W * 0.5, H * 0.6, 0, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = 'rgba(255,255,255,.75)';
    g.beginPath(); g.ellipse(-W * 0.22, -H * 0.78, W * 0.11, H * 0.15, -0.4, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.arc(-W * 0.06, -H * 0.93, W * 0.045, 0, TAU); g.fill();
    this.face(g, b, W, H, k, prog, e, a);
    g.restore();
    if (k === 'fleeing red') {
      g.fillStyle = '#9fd8ff'; g.beginPath(); g.ellipse(bx + W * 0.55, by - H * 0.9 - hop, W * 0.07, W * 0.11, 0.3, 0, TAU); g.fill();
    }
    if (k === 'eating' || k === 'digesting' || k === 'making a friend' || k === 'startled') {
      const w = W * 1.1, y0 = by - H * 1.28 - hop;
      g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(bx - w / 2, y0, w, 3.5);
      g.fillStyle = k === 'startled' ? '#ff7a70' : k === 'eating' ? '#7cd44a' : k === 'digesting' ? '#ff9c8a' : '#ffd24a';
      g.fillRect(bx - w / 2, y0, w * prog, 3.5);
    }
    if (this.selectedId === b.id || this.hoverId === b.id) {
      g.font = `700 ${Math.max(11, S * 0.9)}px ui-rounded, system-ui`; g.textAlign = 'center';
      g.lineWidth = 4; g.strokeStyle = 'rgba(255,255,255,.9)'; g.strokeText(b.name, bx, by - H * 1.42 - hop);
      g.fillStyle = '#2c3a2a'; g.fillText(b.name, bx, by - H * 1.42 - hop);
    }
  }

  face(g, b, W, H, k, prog, e, a) {
    const scared = k === 'fleeing red' || k === 'startled';
    const eatingF = k === 'eating';
    const content = k === 'digesting' || k === 'making a friend' || k === 'full & lazy';
    const hunting = k === 'hunting blue';
    const sleepy = e < 0.28;
    const blinkT = (this.time * 0.6 + b.id * 1.37) % 3.3;
    const blink = blinkT < 0.13 || sleepy && Math.sin(this.time * 1.5 + b.id) > 0.3;
    const ey = -H * 0.62, ex = W * 0.19;
    const vsx = b.vx * this.cs - b.vy * this.sn, vsy = (b.vx * this.sn + b.vy * this.cs) * this.se;
    const m = Math.hypot(vsx, vsy) + 0.001;
    const lx = (vsx / m) * Math.min(1, m / 2) * W * 0.05, ly = (vsy / m) * Math.min(1, m / 2) * W * 0.04;
    const er = W * (scared ? 0.2 : 0.16);
    for (const s of [-1, 1]) {
      const cx = s * ex + lx * 0.4;
      if (content || blink) {
        g.strokeStyle = '#1d2233'; g.lineWidth = Math.max(1.4, W * 0.055); g.lineCap = 'round';
        g.beginPath();
        if (content) g.arc(cx, ey + er * 0.4, er * 0.8, Math.PI * 1.1, Math.PI * 1.9); else { g.moveTo(cx - er * 0.8, ey); g.lineTo(cx + er * 0.8, ey); }
        g.stroke();
      } else {
        g.fillStyle = '#fff'; g.beginPath(); g.ellipse(cx, ey, er, er * (sleepy ? 0.7 : 1.1), 0, 0, TAU); g.fill();
        g.strokeStyle = 'rgba(0,0,30,.25)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = '#1d2233'; g.beginPath(); g.arc(cx + lx, ey + ly + (sleepy ? er * 0.25 : 0), er * (scared ? 0.42 : 0.56), 0, TAU); g.fill();
        g.fillStyle = '#fff'; g.beginPath(); g.arc(cx + lx - er * 0.18, ey + ly - er * 0.2, er * 0.17, 0, TAU); g.fill();
      }
      if (hunting) {
        g.strokeStyle = '#5c1018'; g.lineWidth = Math.max(1.5, W * 0.07);
        g.beginPath(); g.moveTo(cx - s * er * 1.2, ey - er * 1.9 - s * 0); g.lineTo(cx + s * er * 1.1, ey - er * 1.2); g.stroke();
      }
    }
    g.fillStyle = b.kind === 'red' ? 'rgba(255,200,190,.5)' : 'rgba(255,150,190,.45)';
    for (const s of [-1, 1]) { g.beginPath(); g.ellipse(s * W * 0.33, -H * 0.5, W * 0.08, W * 0.05, 0, 0, TAU); g.fill(); }
    const my = -H * 0.47;
    g.strokeStyle = '#1d2233'; g.lineWidth = Math.max(1.4, W * 0.055); g.lineCap = 'round';
    if (eatingF) {
      const o = 0.5 + 0.5 * Math.sin(this.time * 24 + b.id);
      g.fillStyle = '#5a1a22'; g.beginPath(); g.ellipse(0, my, W * 0.13, W * (0.05 + 0.1 * o), 0, 0, TAU); g.fill();
    } else if (scared) {
      g.fillStyle = '#5a1a22'; g.beginPath(); g.ellipse(0, my + W * 0.03, W * 0.07, W * 0.1, 0, 0, TAU); g.fill();
    } else if (hunting) {
      g.beginPath(); g.moveTo(-W * 0.12, my + W * 0.02); g.quadraticCurveTo(0, my - W * 0.05, W * 0.12, my + W * 0.02); g.stroke();
    } else if (sleepy) {
      g.beginPath(); g.moveTo(-W * 0.07, my + W * 0.03); g.quadraticCurveTo(0, my - W * 0.01, W * 0.07, my + W * 0.03); g.stroke();
    } else {
      g.beginPath(); g.arc(0, my - W * 0.04, W * (content ? 0.15 : 0.1), 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    }
  }

  drawSelectionGround(g, b, sim, alpha) {
    const vis = (b.kind === 'blue' ? sim.p.blueVision : sim.p.redVision) * b.vi;
    const x = b.px + (b.x - b.px) * alpha, y = b.py + (b.y - b.py) * alpha;
    const pts = [];
    for (let i = 0; i < 64; i++) { const t = (i / 64) * TAU; pts.push(this.proj(x + Math.cos(t) * vis, y + Math.sin(t) * vis, 0)); }
    this.poly(g, pts);
    g.fillStyle = b.kind === 'blue' ? 'rgba(90,150,255,.14)' : 'rgba(255,100,100,.14)'; g.fill();
    g.setLineDash([6, 6]); g.lineDashOffset = -this.time * 12;
    g.strokeStyle = b.kind === 'blue' ? 'rgba(40,90,220,.7)' : 'rgba(200,40,50,.7)'; g.lineWidth = 2; g.stroke(); g.setLineDash([]);
  }

  drawParticles(g) {
    const S = this.S;
    for (const p of this.parts) {
      const u = p.age / p.life, [sx, sy] = this.proj(p.x, p.y, p.z || 0);
      const al = 1 - u * u;
      if (p.t === 'ring') {
        const pts = []; for (let i = 0; i < 32; i++) { const t = (i / 32) * TAU; pts.push(this.proj(p.x + Math.cos(t) * p.r, p.y + Math.sin(t) * p.r, 0.05)); }
        this.poly(g, pts); g.strokeStyle = `rgba(${p.col},${al * 0.9})`; g.lineWidth = 3 * (1 - u) + 1; g.stroke();
      } else if (p.t === 'spark') {
        g.fillStyle = `rgba(${p.col},${al})`; const r = S * 0.2 * (1 - u * 0.5);
        g.beginPath(); for (let i = 0; i < 8; i++) { const rad = i % 2 ? r * 0.35 : r; const t = (i / 8) * TAU + u * 3; g.lineTo(sx + Math.cos(t) * rad, sy + Math.sin(t) * rad); } g.closePath(); g.fill();
      } else if (p.t === 'puff') {
        g.fillStyle = `rgba(${p.col},${al * 0.7})`; g.beginPath(); g.arc(sx, sy, S * (0.25 + u * 0.5), 0, TAU); g.fill();
      } else if (p.t === 'text') {
        g.font = `800 ${Math.max(12, S * 1.05)}px ui-rounded, system-ui`; g.textAlign = 'center';
        g.lineWidth = 4; g.strokeStyle = `rgba(255,255,255,${al})`; g.strokeText(p.text, sx, sy);
        g.fillStyle = `rgba(${p.col},${al})`; g.fillText(p.text, sx, sy);
      } else if (p.t === 'heart') {
        const r = S * 0.5 * (0.6 + 0.4 * Math.sin(Math.min(1, u * 3) * 1.57));
        g.fillStyle = `rgba(255,110,150,${al})`; g.beginPath();
        g.moveTo(sx, sy + r * 0.9);
        g.bezierCurveTo(sx - r * 1.6, sy - r * 0.3, sx - r * 0.6, sy - r * 1.4, sx, sy - r * 0.45);
        g.bezierCurveTo(sx + r * 0.6, sy - r * 1.4, sx + r * 1.6, sy - r * 0.3, sx, sy + r * 0.9);
        g.fill();
      }
    }
  }
}
