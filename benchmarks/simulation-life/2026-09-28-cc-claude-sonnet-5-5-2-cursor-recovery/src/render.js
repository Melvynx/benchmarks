import { MAX_SLOTS } from './sim.js';

const TAU = Math.PI * 2;

// unit bean outline (kidney-ish oval)
const BEAN = (() => {
  const pts = [];
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    let x = Math.cos(a),
      y = Math.sin(a);
    const dent = Math.exp(-Math.pow((a - Math.PI * 0.95) / 0.55, 2));
    x += 0.13 * dent;
    y *= 1 + 0.04 * Math.cos(a + 0.6);
    x *= 1 - 0.05 * Math.sin(a);
    pts.push([x, y]);
  }
  return pts;
})();

const PALETTE = {
  blue: { hi: '#a9dcff', mid: '#4a9bff', lo: '#2760d8', edge: '#1c47a8', glow: '96,170,255' },
  red: { hi: '#ffb1b8', mid: '#ff5570', lo: '#cf2a4a', edge: '#9c1c38', glow: '255,110,130' },
};

// fruit/leaf slot layout in tree-local screen space (fractions of canopy radius)
const SLOTS = (() => {
  const s = [];
  for (let i = 0; i < MAX_SLOTS; i++) {
    const a = i * 2.39996;
    const r = Math.sqrt((i + 0.6) / MAX_SLOTS) * 0.82;
    s.push([Math.cos(a) * r * 1.05, Math.sin(a) * r * 0.78 + 0.08]);
  }
  return s;
})();

function hash(n) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export class WorldView {
  constructor(canvas, sim) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sim = sim;
    this.yaw = 0.55;
    this.tilt = 0.95;
    this.zoom = 1;
    this.selected = null;
    this.hover = null;
    this.particles = [];
    this.time = 0;
    this.tufts = [];
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.alpha = 1;
    this.treeFx = new Map();
    this.buildGround();
    this.resize();
    this.bindPointer();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  setSim(sim) {
    this.sim = sim;
    this.particles.length = 0;
    this.selected = null;
    this.buildGround();
  }

  buildGround() {
    const R = this.sim.R;
    this.tufts = [];
    for (let i = 0; i < 260; i++) {
      const a = hash(i + 1) * TAU;
      const r = Math.sqrt(hash(i + 500)) * (R - 1.5);
      this.tufts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, k: hash(i + 900), f: hash(i + 1300) < 0.14 });
    }
  }

  resize() {
    const p = this.canvas.parentElement;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(200, p.clientWidth),
      h = Math.max(200, p.clientHeight);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.w = w;
    this.h = h;
    this.dpr = dpr;
  }

  bindPointer() {
    const c = this.canvas;
    let drag = null;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      drag = { x: e.clientX, y: e.clientY, moved: 0, yaw: this.yaw, tilt: this.tilt };
    });
    c.addEventListener('pointermove', (e) => {
      if (drag) {
        const dx = e.clientX - drag.x,
          dy = e.clientY - drag.y;
        drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
        if (drag.moved > 4) {
          c.classList.add('dragging');
          this.yaw = drag.yaw + dx * 0.008;
          this.tilt = Math.min(1.3, Math.max(0.5, drag.tilt + dy * 0.004));
        }
      } else {
        const r = c.getBoundingClientRect();
        this.hover = this.pick(e.clientX - r.left, e.clientY - r.top);
        c.style.cursor = this.hover ? 'pointer' : 'grab';
      }
    });
    const end = (e) => {
      if (!drag) return;
      c.classList.remove('dragging');
      if (drag.moved <= 4) {
        const r = c.getBoundingClientRect();
        const b = this.pick(e.clientX - r.left, e.clientY - r.top);
        this.selected = b ? b.id : null;
        this.onSelect && this.onSelect(this.selected);
      }
      drag = null;
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', () => {
      drag = null;
      c.classList.remove('dragging');
    });
    c.addEventListener('pointerleave', () => (this.hover = null));
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.zoom = Math.min(2.4, Math.max(0.7, this.zoom * Math.exp(-e.deltaY * 0.0012)));
      },
      { passive: false },
    );
  }

  // --- projection ---
  cam() {
    const R = this.sim.R;
    const sinT = Math.sin(this.tilt),
      cosT = Math.cos(this.tilt);
    const S = Math.min(this.w / (2 * R * 1.16), this.h / (2 * R * sinT * 1.1 + R * 0.5)) * this.zoom;
    return { S, sinT, cosT, c: Math.cos(this.yaw), s: Math.sin(this.yaw), cx: this.w / 2, cy: this.h * 0.54 + R * 0.06 * S };
  }
  proj(cam, x, y, z = 0) {
    const xr = x * cam.c - y * cam.s;
    const yr = x * cam.s + y * cam.c;
    return { x: cam.cx + cam.S * xr, y: cam.cy + cam.S * (yr * cam.sinT - z * cam.cosT), d: yr };
  }

  blobPos(b) {
    const a = this.alpha;
    const px = b.px ?? b.x,
      py = b.py ?? b.y;
    return [px + (b.x - px) * a, py + (b.y - py) * a];
  }

  pick(mx, my) {
    const cam = this.cam();
    let best = null,
      bd = 1e9;
    const u = cam.S;
    for (const b of this.sim.blobs) {
      const [x, y] = this.blobPos(b);
      const p = this.proj(cam, x, y, 0);
      const cy = p.y - u * 1.1;
      const dx = mx - p.x,
        dy = my - cy;
      const d = (dx * dx) / (u * u * 1.6) + (dy * dy) / (u * u * 2.6);
      if (d < 1 && d < bd) {
        bd = d;
        best = b;
      }
    }
    return best;
  }

  // --- effects ---
  consumeEvents(events) {
    for (const e of events) {
      if (e.type === 'eat') {
        for (let i = 0; i < 7; i++) this.spark(e.bx, e.by, 1.6, '#ffe36a', 0.9);
        this.particles.push({ k: 'text', x: e.bx, y: e.by, z: 3.2, vz: 2.2, life: 1.1, max: 1.1, text: '+' + Math.round(this.sim.p.blueEat > 0 ? 30 : 30), color: '#3d8f1c' });
        this.particles.push({ k: 'ring', x: e.bx, y: e.by, z: 0.2, life: 0.7, max: 0.7, r0: 1, r1: 4.2, color: '255,235,120' });
        const fx = this.treeFx.get(e.tree) || {};
        fx.shake = 0.5;
        this.treeFx.set(e.tree, fx);
      } else if (e.type === 'contact') {
        this.particles.push({ k: 'ring', x: e.x, y: e.y, z: 0.2, life: 0.8, max: 0.8, r0: 1, r1: 5, color: '255,110,140' });
        const n = Math.min(9, 3 + Math.round(e.amount / 5));
        for (let i = 0; i < n; i++)
          this.particles.push({ k: 'orb', x: e.tx, y: e.ty, z: 1.8, tx: e.x, ty: e.y, life: 0.5 + i * 0.05, max: 0.5 + i * 0.05, delay: i * 0.04, color: '#ffc94d' });
        this.particles.push({ k: 'text', x: e.tx, y: e.ty, z: 3.4, vz: 2, life: 1, max: 1, text: '-' + Math.round(e.amount), color: '#c22f4f' });
      } else if (e.type === 'birth') {
        this.particles.push({ k: 'ring', x: e.x, y: e.y, z: 0.2, life: 0.9, max: 0.9, r0: 1, r1: 5.5, color: e.kind === 'blue' ? '120,190,255' : '255,140,160' });
        for (let i = 0; i < 6; i++) this.spark(e.x, e.y, 1.4, e.kind === 'blue' ? '#8fd0ff' : '#ff9aac', 0.8);
      } else if (e.type === 'death') {
        this.particles.push({ k: 'ghost', x: e.x, y: e.y, z: 1, vz: 2.4, life: 1.4, max: 1.4, kind: e.kind });
      }
    }
    events.length = 0;
    if (this.particles.length > 500) this.particles.splice(0, this.particles.length - 500);
  }

  spark(x, y, z, color, life) {
    const a = Math.random() * TAU,
      s = 2 + Math.random() * 3;
    this.particles.push({ k: 'spark', x, y, z: z + Math.random(), vx: Math.cos(a) * s * 0.5, vy: Math.sin(a) * s * 0.5, vz: 3 + Math.random() * 3, life: life * (0.6 + Math.random() * 0.6), max: life, color });
  }

  stepParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      if (p.k === 'spark') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        p.vz -= 9 * dt;
        if (p.z < 0.2) {
          p.z = 0.2;
          p.vz *= -0.3;
        }
      } else if (p.k === 'text' || p.k === 'ghost') {
        p.z += p.vz * dt;
        p.vz *= 0.97;
      }
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  // --- drawing ---
  draw(dt) {
    this.time += dt;
    this.stepParticles(dt);
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const cam = this.cam();
    this.drawBackdrop(ctx, cam);
    this.drawDish(ctx, cam);

    const items = [];
    for (const tr of this.sim.trees) {
      const p = this.proj(cam, tr.x, tr.y, 0);
      items.push({ d: p.d, f: () => this.drawTree(ctx, cam, tr, p) });
    }
    for (const b of this.sim.blobs) {
      const [x, y] = this.blobPos(b);
      const p = this.proj(cam, x, y, 0);
      items.push({ d: p.d, f: () => this.drawBlob(ctx, cam, b, p, x, y) });
    }
    for (const q of this.particles) {
      const p = this.proj(cam, q.x, q.y, 0);
      items.push({ d: p.d + 0.5, f: () => this.drawParticle(ctx, cam, q) });
    }
    items.sort((a, b) => a.d - b.d);

    if (this.selected != null) this.drawSelection(ctx, cam, false);
    for (const it of items) it.f();
    if (this.selected != null) this.drawSelection(ctx, cam, true);
  }

  drawBackdrop(ctx, cam) {
    const g = ctx.createRadialGradient(this.w / 2, this.h * 0.45, 40, this.w / 2, this.h * 0.5, Math.max(this.w, this.h) * 0.75);
    g.addColorStop(0, '#f3e6c8');
    g.addColorStop(1, '#dcc9a1');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  ring(ctx, cam, R, z, n = 72) {
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const p = this.proj(cam, Math.cos(a) * R, Math.sin(a) * R, z);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.closePath();
  }

  drawDish(ctx, cam) {
    const R = this.sim.R;
    const rimR = R + 2.6;
    const thick = 4.5;
    const c0 = this.proj(cam, 0, 0, 0);
    // soft table shadow
    ctx.save();
    ctx.translate(c0.x + cam.S * 1.5, c0.y + cam.S * (thick * cam.cosT + 3));
    ctx.scale(1, cam.sinT);
    ctx.filter = `blur(${Math.max(6, cam.S * 2)}px)`;
    ctx.fillStyle = 'rgba(90,60,20,0.32)';
    ctx.beginPath();
    ctx.arc(0, 0, cam.S * (rimR + 1.5), 0, TAU);
    ctx.fill();
    ctx.restore();
    ctx.filter = 'none';

    // outer wall strips
    const n = 90;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * TAU,
        a1 = ((i + 1) / n) * TAU;
      const am = (a0 + a1) / 2;
      const p0 = this.proj(cam, Math.cos(a0) * rimR, Math.sin(a0) * rimR, 0);
      const p1 = this.proj(cam, Math.cos(a1) * rimR, Math.sin(a1) * rimR, 0);
      const q1 = this.proj(cam, Math.cos(a1) * (rimR - 0.6), Math.sin(a1) * (rimR - 0.6), -thick);
      const q0 = this.proj(cam, Math.cos(a0) * (rimR - 0.6), Math.sin(a0) * (rimR - 0.6), -thick);
      const facing = this.proj(cam, Math.cos(am), Math.sin(am), 0).d - this.proj(cam, 0, 0, 0).d;
      if (facing < -0.05) continue;
      const light = 0.5 + 0.5 * Math.cos(am + this.yaw + 2.4);
      const l = 34 + 20 * light;
      ctx.fillStyle = `hsl(28 42% ${l}%)`;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.lineTo(q1.x, q1.y);
      ctx.lineTo(q0.x, q0.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // rim top
    this.ring(ctx, cam, rimR, 0);
    ctx.fillStyle = '#e8c88a';
    ctx.fill();
    this.ring(ctx, cam, rimR, 0);
    ctx.strokeStyle = '#b88a4a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // soil inner wall + grass top
    ctx.save();
    ctx.translate(c0.x, c0.y);
    ctx.scale(1, cam.sinT);
    const gr = ctx.createRadialGradient(-cam.S * R * 0.25, -cam.S * R * 0.3, cam.S * 4, 0, 0, cam.S * R);
    gr.addColorStop(0, '#bfe58a');
    gr.addColorStop(0.65, '#9bd16a');
    gr.addColorStop(1, '#79b653');
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(0, 0, cam.S * R, 0, TAU);
    ctx.fill();
    // lawn stripes / soft patches
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 5; i++) {
      const a = i * 1.7 + this.yaw * 0.0;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * cam.S * R * 0.35, Math.sin(a) * cam.S * R * 0.3, cam.S * R * 0.22, cam.S * R * 0.14, a, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // inner edge shadow
    this.ring(ctx, cam, R, 0);
    ctx.strokeStyle = 'rgba(60,110,40,0.45)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // tufts and flowers
    for (const t of this.tufts) {
      const p = this.proj(cam, t.x, t.y, 0);
      const u = cam.S * (0.5 + t.k * 0.4);
      if (t.f) {
        ctx.fillStyle = t.k > 0.5 ? '#fff6c9' : '#ffd3e0';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(p.x + Math.cos(i * 1.256) * u * 0.32, p.y - u * 0.25 + Math.sin(i * 1.256) * u * 0.2, u * 0.2, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#f4b73c';
        ctx.beginPath();
        ctx.arc(p.x, p.y - u * 0.25, u * 0.14, 0, TAU);
        ctx.fill();
      } else {
        ctx.strokeStyle = t.k > 0.5 ? '#6fae48' : '#84c25a';
        ctx.lineWidth = Math.max(1, u * 0.14);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(p.x - u * 0.4, p.y);
        ctx.lineTo(p.x - u * 0.55, p.y - u * 0.7);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + 0.05 * u, p.y - u * 0.95);
        ctx.moveTo(p.x + u * 0.4, p.y);
        ctx.lineTo(p.x + u * 0.55, p.y - u * 0.65);
        ctx.stroke();
      }
    }
  }

  drawTree(ctx, cam, tr, p) {
    const u = cam.S;
    const fx = this.treeFx.get(tr.id);
    let shake = 0;
    if (fx && fx.shake > 0) {
      fx.shake -= 0.016;
      shake = Math.sin(this.time * 40) * fx.shake * 0.5 * u;
    }
    const sc = tr.scale * 1.15;
    const sway = Math.sin(this.time * 0.9 + tr.sway) * 0.12 * u * sc + shake;
    // shadow
    ctx.fillStyle = 'rgba(40,80,20,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x + u * 0.8, p.y + u * 0.2, u * 3.6 * sc, u * 3.6 * sc * cam.sinT * 0.75, 0, 0, TAU);
    ctx.fill();
    // trunk
    const th = u * 4.6 * sc;
    ctx.strokeStyle = '#8a5a34';
    ctx.lineCap = 'round';
    ctx.lineWidth = u * 1.05 * sc;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo(p.x + sway * 0.3, p.y - th * 0.55, p.x + sway * 0.6, p.y - th);
    ctx.stroke();
    ctx.strokeStyle = '#a36f42';
    ctx.lineWidth = u * 0.35 * sc;
    ctx.beginPath();
    ctx.moveTo(p.x - u * 0.2, p.y - u * 0.3);
    ctx.quadraticCurveTo(p.x - u * 0.1 + sway * 0.3, p.y - th * 0.55, p.x + sway * 0.5, p.y - th * 0.9);
    ctx.stroke();

    // canopy
    const cxp = p.x + sway,
      cyp = p.y - th - u * 1.6 * sc;
    const R = u * 3.7 * sc;
    const lobes = [
      [0, 0, 1],
      [-0.62, 0.22, 0.72],
      [0.64, 0.2, 0.74],
      [-0.28, -0.42, 0.7],
      [0.32, -0.45, 0.66],
    ];
    const col = [
      ['#5fb04a', '#3f8a37', '#7ccb5e'],
      ['#58b46b', '#37894a', '#78d089'],
      ['#6bb845', '#469030', '#8bd45a'],
    ][tr.variant];
    for (const [ox, oy, r] of lobes) {
      const g = ctx.createRadialGradient(cxp + ox * R - R * 0.2, cyp + oy * R - R * 0.3, R * 0.1, cxp + ox * R, cyp + oy * R, R * r);
      g.addColorStop(0, col[2]);
      g.addColorStop(0.55, col[0]);
      g.addColorStop(1, col[1]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cxp + ox * R, cyp + oy * R, R * r * 0.98, 0, TAU);
      ctx.fill();
    }
    // fruit
    for (let i = 0; i < MAX_SLOTS; i++) {
      const st = tr.state[i];
      if (!st) continue;
      const [fx0, fy0] = SLOTS[i];
      let s = tr.size[i];
      let wob = 0;
      if (st === 2) {
        const e = tr.eatT[i];
        s *= Math.max(0.05, 1 - e);
        wob = Math.sin(this.time * 30 + i) * 0.06 * u;
      }
      const fr = u * 0.62 * sc * (0.28 + 0.72 * s);
      const x = cxp + fx0 * R + wob,
        y = cyp + fy0 * R;
      const ripe = tr.size[i] > 0.85;
      ctx.fillStyle = 'rgba(30,70,20,0.28)';
      ctx.beginPath();
      ctx.ellipse(x + fr * 0.15, y + fr * 0.2, fr * 1.05, fr * 1.05, 0, 0, TAU);
      ctx.fill();
      const g = ctx.createRadialGradient(x - fr * 0.35, y - fr * 0.4, fr * 0.1, x, y, fr);
      g.addColorStop(0, ripe ? '#eaff9a' : '#f6ffc0');
      g.addColorStop(0.5, ripe ? '#98dc3c' : '#b9e56a');
      g.addColorStop(1, ripe ? '#4f9f1f' : '#7fbd45');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, fr, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.ellipse(x - fr * 0.35, y - fr * 0.4, fr * 0.24, fr * 0.16, -0.6, 0, TAU);
      ctx.fill();
      if (s > 0.5) {
        ctx.strokeStyle = '#5a7a25';
        ctx.lineWidth = Math.max(1, fr * 0.14);
        ctx.beginPath();
        ctx.moveTo(x, y - fr * 0.9);
        ctx.lineTo(x + fr * 0.15, y - fr * 1.35);
        ctx.stroke();
      }
    }
    // leaf sparkle when it just grew? small highlight on canopy
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.ellipse(cxp - R * 0.35, cyp - R * 0.5, R * 0.35, R * 0.18, -0.5, 0, TAU);
    ctx.fill();
  }

  drawBlob(ctx, cam, b, p, wx, wy) {
    const u = cam.S;
    const pal = PALETTE[b.kind];
    const t = this.time;
    const moving = b.speedNow > 0.6;
    const maxE = b.kind === 'blue' ? this.sim.p.blueCopy : this.sim.p.redCopy;
    const energyK = Math.min(1, Math.max(0, b.energy / maxE));
    const kindScale = b.kind === 'red' ? 1.1 : 1;
    let grow = Math.min(1, 0.45 + b.age / 4 * 0.55);
    const size = (0.86 + 0.24 * energyK) * kindScale * grow;

    // action-driven animation
    let hop = 0,
      sq = 1,
      lean = 0;
    const ph = t * (b.action === 'fleeing' ? 13 : b.kind === 'red' ? 8 : 9) + b.seed;
    if (moving) {
      const s = Math.abs(Math.sin(ph));
      hop = s * 0.85 * Math.min(1, b.speedNow / 4);
      sq = 1 + 0.12 * (1 - s) - 0.08 * s;
    } else {
      sq = 1 + Math.sin(t * 2.2 + b.seed) * 0.03;
    }
    let mouth = 'smile',
      eyes = 'open';
    const timerK = b.timerMax > 0 ? Math.max(0, b.timer) / b.timerMax : 0;
    if (b.action === 'eating') {
      const c = Math.sin(t * 16 + b.seed);
      sq = 1 - 0.09 * (c * 0.5 + 0.5);
      hop = 0.05;
      mouth = c > 0 ? 'chew-open' : 'chew-closed';
      eyes = 'happy';
    } else if (b.action === 'pausing') {
      sq = 1 + Math.sin(t * 5 + b.seed) * 0.05;
      mouth = 'content';
      eyes = 'happy';
    } else if (b.action === 'fleeing') {
      mouth = 'o';
      eyes = 'wide';
      lean = 0;
    } else if (b.action === 'chasing') {
      mouth = 'grin';
      eyes = 'sharp';
    } else if (b.action === 'resting') {
      eyes = 'sleepy';
    }
    if (b.splitFx > 0) {
      const k = b.splitFx / 0.8;
      sq *= 1 + Math.sin(k * 12) * 0.12 * k;
      hop += Math.sin((1 - k) * Math.PI) * 0.9;
    }
    if (b.startle > 0 && b.action !== 'eating') {
      eyes = 'wide';
    }

    // facing → screen space
    const fvx = Math.cos(b.face),
      fvy = Math.sin(b.face);
    const sxv = fvx * cam.c - fvy * cam.s;
    const syv = (fvx * cam.s + fvy * cam.c) * cam.sinT;
    const sm = Math.hypot(sxv, syv) || 1;
    const lx = moving ? sxv / sm : 0,
      ly = moving ? syv / sm : 0.3;
    lean = moving ? lx * 0.18 : 0;

    const bw = u * 1.15 * size,
      bh = u * 1.5 * size;
    const z = hop * u;

    // shadow
    const shadowK = 1 - Math.min(0.5, hop * 0.5);
    ctx.fillStyle = `rgba(30,60,20,${0.3 * shadowK})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + u * 0.05, bw * 1.0 * shadowK, bw * 0.42 * shadowK * (cam.sinT + 0.2), 0, 0, TAU);
    ctx.fill();

    ctx.save();
    ctx.translate(p.x, p.y - z - bh * 0.92);
    ctx.rotate(lean);
    ctx.scale(1 / sq, sq);

    // glow (eating / pausing)
    if (b.action === 'eating' || b.action === 'pausing' || b.splitFx > 0) {
      const gl = 0.35 + 0.25 * Math.sin(t * 10);
      const g = ctx.createRadialGradient(0, 0, bw * 0.4, 0, 0, bw * 2.2);
      g.addColorStop(0, `rgba(${b.action === 'pausing' ? '255,140,170' : '255,236,140'},${gl})`);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, bw * 2.2, 0, TAU);
      ctx.fill();
    }

    // body
    ctx.beginPath();
    for (let i = 0; i < BEAN.length; i++) {
      const [x, y] = BEAN[i];
      i ? ctx.lineTo(x * bw, y * bh) : ctx.moveTo(x * bw, y * bh);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(-bw * 0.6, -bh, bw * 0.7, bh);
    g.addColorStop(0, pal.hi);
    g.addColorStop(0.42, pal.mid);
    g.addColorStop(1, pal.lo);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, u * 0.12);
    ctx.strokeStyle = pal.edge;
    ctx.stroke();
    // gloss
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-bw * 0.42, -bh * 0.5, bw * 0.2, bh * 0.28, -0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-bw * 0.16, -bh * 0.78, bw * 0.08, 0, TAU);
    ctx.fill();

    // face
    const fx = lx * bw * 0.26,
      fy = -bh * 0.08 + ly * bh * 0.05;
    const eyeDx = bw * 0.34,
      eyeR = bw * 0.2;
    const blink = ((t + b.seed * 3.7) % 4.3) < 0.12;
    ctx.fillStyle = 'rgba(255,120,140,0.35)';
    if (b.kind === 'blue') ctx.fillStyle = 'rgba(255,150,190,0.35)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(fx + s * eyeDx * 1.35, fy + bh * 0.2, bw * 0.13, bw * 0.08, 0, 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = '#1d2333';
    ctx.lineWidth = Math.max(1.2, u * 0.12);
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const ex = fx + s * eyeDx,
        ey = fy;
      if (blink || eyes === 'happy') {
        ctx.beginPath();
        ctx.arc(ex, ey + eyeR * 0.3, eyeR * 0.8, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (eyes === 'sleepy') {
        ctx.beginPath();
        ctx.moveTo(ex - eyeR * 0.8, ey);
        ctx.lineTo(ex + eyeR * 0.8, ey + eyeR * 0.15);
        ctx.stroke();
      } else {
        const er = eyes === 'wide' ? eyeR * 1.3 : eyeR;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, er, er * 1.2, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#1d2333';
        ctx.beginPath();
        ctx.arc(ex + lx * er * 0.35, ey + ly * er * 0.3 + er * 0.1, er * (eyes === 'wide' ? 0.42 : 0.6), 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex + lx * er * 0.35 - er * 0.18, ey + ly * er * 0.3 - er * 0.15, er * 0.16, 0, TAU);
        ctx.fill();
      }
      if (eyes === 'sharp') {
        ctx.strokeStyle = '#5a1020';
        ctx.lineWidth = Math.max(1.4, u * 0.14);
        ctx.beginPath();
        ctx.moveTo(ex - s * eyeR * 1.3, ey - eyeR * 1.9 - s * 0 + (s < 0 ? 0 : 0));
        ctx.lineTo(ex + s * eyeR * 0.9, ey - eyeR * 1.2);
        ctx.stroke();
        ctx.strokeStyle = '#1d2333';
        ctx.lineWidth = Math.max(1.2, u * 0.12);
      }
    }
    // mouth
    const my = fy + bh * 0.3;
    ctx.strokeStyle = '#1d2333';
    ctx.fillStyle = '#7a1f34';
    ctx.lineWidth = Math.max(1.2, u * 0.12);
    if (mouth === 'smile' || mouth === 'content') {
      ctx.beginPath();
      ctx.arc(fx, my - bw * 0.08, bw * (mouth === 'content' ? 0.22 : 0.16), 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    } else if (mouth === 'grin') {
      ctx.beginPath();
      ctx.arc(fx, my - bw * 0.12, bw * 0.24, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.closePath();
      ctx.fillStyle = '#7a1f34';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.fillRect(fx - bw * 0.12, my + bw * 0.02, bw * 0.24, bw * 0.05);
    } else if (mouth === 'o') {
      ctx.beginPath();
      ctx.ellipse(fx, my, bw * 0.1, bw * 0.14, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else if (mouth === 'chew-open') {
      ctx.beginPath();
      ctx.ellipse(fx, my, bw * 0.17, bw * 0.15, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(fx - bw * 0.14, my);
      ctx.lineTo(fx + bw * 0.14, my);
      ctx.stroke();
    }
    // holding fruit while eating
    if (b.action === 'eating' && b.target) {
      const e = 1 - timerK;
      const fr = bw * 0.28 * (1 - e * 0.9);
      ctx.fillStyle = '#98dc3c';
      ctx.strokeStyle = '#4f9f1f';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(fx + bw * 0.55, my + bw * 0.08, Math.max(0.5, fr), 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    // sleepy zzz
    if (b.action === 'resting') {
      ctx.fillStyle = 'rgba(60,70,110,0.6)';
      ctx.font = `800 ${Math.max(8, u * 0.9)}px system-ui`;
      ctx.fillText('z', bw * 0.7, -bh * 0.95 - Math.sin(t * 2 + b.seed) * 2);
    }
    ctx.restore();

    // hover / selected outline label
    if (this.hover === b && this.selected !== b.id) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - z - bh * 0.92, bw * 1.25, bh * 1.2, 0, 0, TAU);
      ctx.stroke();
    }
    // energy pip for selected
    if (this.selected === b.id) {
      const w = u * 3,
        y = p.y - z - bh * 1.95 - u * 0.5;
      ctx.fillStyle = 'rgba(40,30,10,0.45)';
      roundRect(ctx, p.x - w / 2, y, w, u * 0.5, u * 0.25);
      ctx.fill();
      ctx.fillStyle = '#ffc94d';
      roundRect(ctx, p.x - w / 2, y, w * Math.min(1, b.energy / 120), u * 0.5, u * 0.25);
      ctx.fill();
    }
  }

  drawSelection(ctx, cam, front) {
    const b = this.sim.blobs.find((o) => o.id === this.selected);
    if (!b) return;
    const [x, y] = this.blobPos(b);
    const vis = this.sim.visionOf(b);
    if (!front) {
      // sensing range on the ground
      ctx.save();
      this.ringAt(ctx, cam, x, y, vis);
      ctx.fillStyle = b.kind === 'blue' ? 'rgba(80,160,255,0.13)' : 'rgba(255,90,110,0.13)';
      ctx.fill();
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -this.time * 10;
      ctx.strokeStyle = b.kind === 'blue' ? 'rgba(30,100,220,0.75)' : 'rgba(220,40,70,0.75)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      this.ringAt(ctx, cam, x, y, 1.9);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }

  ringAt(ctx, cam, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * TAU;
      const p = this.proj(cam, x + Math.cos(a) * r, y + Math.sin(a) * r, 0);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.closePath();
  }

  drawParticle(ctx, cam, q) {
    const u = cam.S;
    const k = Math.max(0, q.life / q.max);
    if (q.k === 'spark') {
      const p = this.proj(cam, q.x, q.y, q.z);
      ctx.fillStyle = q.color;
      ctx.globalAlpha = Math.min(1, k * 1.5);
      star(ctx, p.x, p.y, u * 0.34 * (0.5 + k), this.time * 6 + q.x);
      ctx.globalAlpha = 1;
    } else if (q.k === 'ring') {
      const r = q.r0 + (q.r1 - q.r0) * (1 - k);
      ctx.save();
      this.ringAt(ctx, cam, q.x, q.y, r);
      ctx.strokeStyle = `rgba(${q.color},${k * 0.9})`;
      ctx.lineWidth = 3 * k + 1;
      ctx.stroke();
      ctx.restore();
    } else if (q.k === 'orb') {
      const e = 1 - k;
      if (q.delay > 0) {
        q.delay -= 0.016;
        return;
      }
      const ee = e * e * (3 - 2 * e);
      const x = q.x + (q.tx - q.x) * ee,
        y = q.y + (q.ty - q.y) * ee;
      const z = 1.8 + Math.sin(e * Math.PI) * 1.6;
      const p = this.proj(cam, x, y, z);
      ctx.fillStyle = q.color;
      ctx.shadowColor = '#ffb020';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, u * 0.28, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
    } else if (q.k === 'text') {
      const p = this.proj(cam, q.x, q.y, q.z);
      ctx.globalAlpha = Math.min(1, k * 2);
      ctx.font = `800 ${Math.max(11, u * 1.15)}px ui-rounded, system-ui`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.strokeText(q.text, p.x, p.y);
      ctx.fillStyle = q.color;
      ctx.fillText(q.text, p.x, p.y);
      ctx.textAlign = 'start';
      ctx.globalAlpha = 1;
    } else if (q.k === 'ghost') {
      const p = this.proj(cam, q.x, q.y, q.z);
      const pal = PALETTE[q.kind];
      ctx.globalAlpha = k * 0.6;
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = pal.mid;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y - u * 1.4, u * 0.9 * (1 + (1 - k) * 0.4), u * 1.2 * (1 + (1 - k) * 0.4), 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#556';
      ctx.beginPath();
      ctx.arc(p.x - u * 0.3, p.y - u * 1.5, u * 0.09, 0, TAU);
      ctx.arc(p.x + u * 0.3, p.y - u * 1.5, u * 0.09, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function star(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = rot + (i * Math.PI) / 4;
    const rr = i % 2 ? r * 0.35 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
