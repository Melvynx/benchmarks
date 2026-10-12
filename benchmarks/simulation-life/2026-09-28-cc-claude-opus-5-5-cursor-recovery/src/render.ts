import { BLOB_R, Rng, type Blob, type SimEvent, type Simulation, type Tree } from './sim.ts';

/** Sprites are drawn larger than their collision size so faces stay readable on big worlds. */
const BLOB_VIS = 1.4;
const TREE_VIS = 1.3;

const COLORS = {
  blue: { light: '#9fd8ff', mid: '#3d9bf0', dark: '#1d5fb8', rim: '#0f3f86' },
  red: { light: '#ffb3a8', mid: '#f25a4e', dark: '#b8262a', rim: '#7d1419' },
};

interface Particle {
  kind: 'sparkle' | 'heart' | 'poof' | 'ring' | 'text' | 'leaf';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  color: string;
  size: number;
  text?: string;
}

interface Deco {
  x: number;
  y: number;
  kind: 'tuft' | 'flower' | 'pebble' | 'mushroom';
  hue: number;
  s: number;
}

interface Drawable {
  depth: number;
  draw: () => void;
}

export class Renderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  yaw = -0.35;
  elev = 0.92;
  zoom = 1;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private S = 1;
  private cx = 0;
  private cy = 0;
  private particles: Particle[] = [];
  private decos: Deco[] = [];
  private decoR = -1;
  private sprites = new Map<string, HTMLCanvasElement>();
  selected = -1;
  hovered = -1;
  /** at high sim speeds, floating labels pile up into noise */
  quietText = false;
  private screenPos = new Map<number, { x: number; y: number; r: number }>();
  private eatingSlots = new Map<number, Blob>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    for (const k of ['blue', 'red'] as const) this.sprites.set(k, this.makeBodySprite(k));
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width;
    this.h = r.height;
    this.canvas.width = Math.round(r.width * this.dpr);
    this.canvas.height = Math.round(r.height * this.dpr);
  }

  private makeBodySprite(kind: 'blue' | 'red'): HTMLCanvasElement {
    const c = document.createElement('canvas');
    const W = 128;
    const H = 150;
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    const col = COLORS[kind];
    const rx = W * 0.44;
    const ry = H * 0.44;
    const cx = W / 2;
    const cy = H / 2;
    const grad = g.createRadialGradient(cx - rx * 0.35, cy - ry * 0.45, rx * 0.1, cx, cy, rx * 1.15);
    grad.addColorStop(0, col.light);
    grad.addColorStop(0.45, col.mid);
    grad.addColorStop(1, col.dark);
    g.fillStyle = grad;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = col.rim;
    g.globalAlpha = 0.35;
    g.stroke();
    g.globalAlpha = 1;
    // glossy highlight
    const hl = g.createRadialGradient(cx - rx * 0.38, cy - ry * 0.5, 1, cx - rx * 0.38, cy - ry * 0.5, rx * 0.42);
    hl.addColorStop(0, 'rgba(255,255,255,0.95)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = hl;
    g.beginPath();
    g.ellipse(cx - rx * 0.36, cy - ry * 0.5, rx * 0.34, ry * 0.22, -0.5, 0, Math.PI * 2);
    g.fill();
    // soft belly bounce light
    const bl = g.createRadialGradient(cx, cy + ry * 0.75, 1, cx, cy + ry * 0.75, rx * 0.8);
    bl.addColorStop(0, 'rgba(255,255,255,0.25)');
    bl.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = bl;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  private ensureDecos(R: number) {
    if (this.decoR === R) return;
    this.decoR = R;
    const rng = new Rng(7331 + R);
    this.decos = [];
    const n = Math.round(R * R * 0.35);
    for (let i = 0; i < n; i++) {
      const a = rng.next() * Math.PI * 2;
      const rr = Math.sqrt(rng.next()) * (R - 0.8);
      const roll = rng.next();
      this.decos.push({
        x: Math.cos(a) * rr,
        y: Math.sin(a) * rr,
        kind: roll < 0.62 ? 'tuft' : roll < 0.85 ? 'flower' : roll < 0.96 ? 'pebble' : 'mushroom',
        hue: rng.next() * 360,
        s: rng.range(0.7, 1.3),
      });
    }
  }

  // ------------------------------------------------------------ projection

  private proj(x: number, y: number, z = 0) {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    const xr = x * c - y * s;
    const yr = x * s + y * c;
    return {
      x: this.cx + xr * this.S,
      y: this.cy + yr * this.S * Math.sin(this.elev) - z * this.S * Math.cos(this.elev),
      depth: yr,
    };
  }

  /** screen-space x direction of a world vector */
  private screenDir(vx: number, vy: number) {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    return { x: vx * c - vy * s, y: vx * s + vy * c };
  }

  pick(px: number, py: number): number {
    let best = -1;
    let bestD = Infinity;
    for (const [id, p] of this.screenPos) {
      const d = Math.hypot(px - p.x, py - p.y);
      if (d < Math.max(12, p.r * 1.3) && d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  // ------------------------------------------------------------ events → particles

  ingest(events: SimEvent[]) {
    for (const e of events) {
      if (this.particles.length > 600) break;
      if (e.type === 'chomp') {
        for (let i = 0; i < 5; i++) this.spawn('sparkle', e.x, e.y, 1.3, '#b6f36b', 0.7);
        if (!this.quietText) this.spawn('text', e.x, e.y, 1.9, '#3f8f1f', 1.1, `+${e.amount ?? ''}`);
      } else if (e.type === 'boop') {
        for (let i = 0; i < 3; i++) this.spawn('heart', e.x, e.y, 1.2, '#ff7aa2', 1.1);
        for (let i = 0; i < 6; i++) this.spawn('sparkle', e.x, e.y, 1, '#bfe6ff', 0.9);
        if (!this.quietText) this.spawn('text', e.x, e.y, 2, '#c0302f', 1.2, `boop! +${e.amount ?? ''}`);
      } else if (e.type === 'birth') {
        this.spawn('ring', e.x, e.y, 0.05, e.kind === 'blue' ? '#6fc0ff' : '#ff8a7d', 0.9);
        for (let i = 0; i < 4; i++) this.spawn('sparkle', e.x, e.y, 1, '#fff3a6', 0.8);
      } else if (e.type === 'fade') {
        for (let i = 0; i < 6; i++) this.spawn('poof', e.x, e.y, 0.6, e.kind === 'blue' ? 'rgba(140,190,240,' : 'rgba(240,150,140,', 1.2);
      } else if (e.type === 'pickup') {
        for (let i = 0; i < 2; i++) this.spawn('leaf', e.x, e.y, 2.4, '#6dbb46', 1.3);
      }
    }
  }

  private spawn(kind: Particle['kind'], x: number, y: number, z: number, color: string, life: number, text?: string) {
    const a = Math.random() * Math.PI * 2;
    const sp = kind === 'text' ? 0 : kind === 'poof' ? 0.9 : kind === 'leaf' ? 0.6 : 1.6;
    this.particles.push({
      kind,
      x: x + (kind === 'text' ? 0 : (Math.random() - 0.5) * 0.4),
      y: y + (kind === 'text' ? 0 : (Math.random() - 0.5) * 0.4),
      z,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      vz: kind === 'text' ? 0.9 : kind === 'heart' ? 1.4 : kind === 'poof' ? 0.9 : kind === 'leaf' ? -0.2 : 2.2,
      life,
      max: life,
      color,
      size: kind === 'poof' ? 0.35 + Math.random() * 0.3 : kind === 'heart' ? 0.28 : 0.12,
      text,
    });
  }

  // ------------------------------------------------------------ main draw

  draw(sim: Simulation, now: number, realDt: number) {
    const ctx = this.ctx;
    const R = sim.R;
    this.ensureDecos(R);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    const se = Math.sin(this.elev);
    const ce = Math.cos(this.elev);
    // vertical extent in world units: dish ellipse + pot wall below + tree tops poking above the back rim
    const extent = 2 * (R + 1) * se + 3.2 * ce + 5 * ce;
    const fitW = (this.w * 0.94) / (2 * (R + 1));
    const fitH = (this.h - 70) / extent;
    this.S = Math.min(fitW, fitH) * this.zoom;
    this.cx = this.w / 2;
    this.cy = 40 + (this.h - 40) / 2 + ((5 - 3.2) * ce * this.S) / 2;

    this.drawDish(R, now);

    this.eatingSlots.clear();
    for (const b of sim.blobs) if (b.action === 'eating' && b.eatSlot >= 0) this.eatingSlots.set(b.targetTree * 64 + b.eatSlot, b);

    // selection helpers under everything
    const sel = this.selected >= 0 ? sim.find(this.selected) : undefined;
    if (sel && sel.alive) this.drawVision(sim, sel);

    const items: Drawable[] = [];
    for (const d of this.decos) {
      const p = this.proj(d.x, d.y);
      items.push({ depth: p.depth - 0.4, draw: () => this.drawDeco(d, p.x, p.y, now) });
    }
    for (const tr of sim.trees) {
      const p = this.proj(tr.x, tr.y);
      items.push({ depth: p.depth, draw: () => this.drawTree(sim, tr, now) });
    }
    this.screenPos.clear();
    for (const b of sim.blobs) {
      const p = this.proj(b.x, b.y);
      items.push({ depth: p.depth + 0.05, draw: () => this.drawBlob(sim, b, now) });
    }
    // shadows first for everything
    for (const tr of sim.trees) this.drawShadow(tr.x + 0.5, tr.y + 0.4, tr.r * 1.05 * TREE_VIS, 0.22);
    for (const b of sim.blobs) {
      const hop = this.hop(b);
      this.drawShadow(b.x, b.y, BLOB_R * BLOB_VIS * (1.05 - hop * 0.5), 0.28 - hop * 0.2);
    }
    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    this.drawParticles(realDt);
    this.drawRimFront(R);
  }

  private drawShadow(x: number, y: number, r: number, alpha: number) {
    const ctx = this.ctx;
    const p = this.proj(x, y);
    ctx.fillStyle = `rgba(35,60,20,${Math.max(0.05, alpha)})`;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * this.S, r * this.S * Math.sin(this.elev), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDish(R: number, now: number) {
    const ctx = this.ctx;
    const S = this.S;
    const se = Math.sin(this.elev);
    const ce = Math.cos(this.elev);
    const rx = (R + 0.9) * S;
    const ry = rx * se;
    const depth = 3.2 * S * ce;
    const cx = this.cx;
    const cy = this.cy;

    // table shadow
    const ts = ctx.createRadialGradient(cx, cy + depth + ry * 0.15, rx * 0.3, cx, cy + depth + ry * 0.15, rx * 1.25);
    ts.addColorStop(0, 'rgba(60,40,30,0.35)');
    ts.addColorStop(1, 'rgba(60,40,30,0)');
    ctx.fillStyle = ts;
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth + ry * 0.12, rx * 1.25, ry * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // clay side wall
    const side = ctx.createLinearGradient(cx - rx, 0, cx + rx, 0);
    side.addColorStop(0, '#9c5a3c');
    side.addColorStop(0.35, '#d98a5f');
    side.addColorStop(0.6, '#c97a52');
    side.addColorStop(1, '#8a4a30');
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth, rx * 0.96, ry * 0.96, 0, 0, Math.PI);
    ctx.lineTo(cx - rx, cy);
    ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    // stripes on the pot
    ctx.strokeStyle = 'rgba(255,230,200,0.35)';
    ctx.lineWidth = Math.max(1.5, S * 0.18);
    ctx.beginPath();
    ctx.ellipse(cx, cy + depth * 0.55, rx * 0.98, ry * 0.98, 0, 0.05, Math.PI - 0.05);
    ctx.stroke();

    // rim lip
    ctx.fillStyle = '#e7a57a';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // soil
    const soil = (R + 0.35) * S;
    ctx.fillStyle = '#7a5236';
    ctx.beginPath();
    ctx.ellipse(cx, cy + S * 0.12 * ce, soil, soil * se, 0, 0, Math.PI * 2);
    ctx.fill();

    // grass top
    const gr = R * S;
    const g = ctx.createRadialGradient(cx - gr * 0.3, cy - gr * se * 0.4, gr * 0.1, cx, cy, gr * 1.05);
    g.addColorStop(0, '#b9ec8a');
    g.addColorStop(0.6, '#8fd46a');
    g.addColorStop(1, '#6db552');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, gr, gr * se, 0, 0, Math.PI * 2);
    ctx.fill();

    // mowing rings for a sense of rotation/perspective
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (let k = 1; k <= 3; k++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, (gr * k) / 4, ((gr * k) / 4) * se, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // drifting sunlight
    const sx = cx + Math.cos(now * 0.00012) * gr * 0.3;
    const sl = ctx.createRadialGradient(sx, cy - gr * se * 0.25, 1, sx, cy - gr * se * 0.25, gr * 0.7);
    sl.addColorStop(0, 'rgba(255,255,220,0.18)');
    sl.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = sl;
    ctx.beginPath();
    ctx.ellipse(cx, cy, gr, gr * se, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawRimFront(R: number) {
    const ctx = this.ctx;
    const S = this.S;
    const se = Math.sin(this.elev);
    const rx = (R + 0.9) * S;
    const ry = rx * se;
    ctx.strokeStyle = 'rgba(255,215,180,0.9)';
    ctx.lineWidth = Math.max(2, S * 0.35);
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, rx - ctx.lineWidth / 2, ry - (ctx.lineWidth / 2) * se, 0, 0.02, Math.PI - 0.02);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = Math.max(1, S * 0.08);
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, rx - S * 0.1, ry - S * 0.1 * se, 0, Math.PI + 0.3, Math.PI * 2 - 0.3);
    ctx.stroke();
  }

  private drawDeco(d: Deco, x: number, y: number, now: number) {
    const ctx = this.ctx;
    const s = this.S * d.s;
    if (d.kind === 'tuft') {
      const sway = Math.sin(now * 0.0015 + d.x * 0.7 + d.y) * 0.08 * s;
      ctx.strokeStyle = '#5da443';
      ctx.lineWidth = Math.max(1, s * 0.07);
      ctx.lineCap = 'round';
      ctx.beginPath();
      for (let i = -1; i <= 1; i++) {
        ctx.moveTo(x + i * s * 0.08, y);
        ctx.quadraticCurveTo(x + i * s * 0.12, y - s * 0.2, x + i * s * 0.18 + sway, y - s * 0.32);
      }
      ctx.stroke();
    } else if (d.kind === 'flower') {
      ctx.strokeStyle = '#5da443';
      ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y - s * 0.3);
      ctx.stroke();
      ctx.fillStyle = `hsl(${d.hue}, 80%, 80%)`;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * s * 0.08, y - s * 0.3 + Math.sin(a) * s * 0.08, s * 0.065, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffd84a';
      ctx.beginPath();
      ctx.arc(x, y - s * 0.3, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === 'pebble') {
      ctx.fillStyle = '#cfc6b8';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.04, s * 0.16, s * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.ellipse(x - s * 0.04, y - s * 0.08, s * 0.06, s * 0.03, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f5ecd8';
      ctx.fillRect(x - s * 0.04, y - s * 0.2, s * 0.08, s * 0.2);
      ctx.fillStyle = '#e8554e';
      ctx.beginPath();
      ctx.ellipse(x, y - s * 0.2, s * 0.17, s * 0.12, 0, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(x - s * 0.06, y - s * 0.26, s * 0.025, 0, Math.PI * 2);
      ctx.arc(x + s * 0.05, y - s * 0.24, s * 0.02, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawTree(sim: Simulation, tr: Tree, now: number) {
    const ctx = this.ctx;
    const S = this.S * TREE_VIS;
    const base = this.proj(tr.x, tr.y, 0);
    const trunkH = 2.1 * TREE_VIS;
    const top = this.proj(tr.x, tr.y, trunkH);
    const sway = Math.sin(now * 0.0011 + tr.sway) * 0.05 * S;
    const tw = 0.34 * S;

    const trunk = ctx.createLinearGradient(base.x - tw, 0, base.x + tw, 0);
    trunk.addColorStop(0, '#6d4424');
    trunk.addColorStop(0.5, '#9a6436');
    trunk.addColorStop(1, '#5c381d');
    ctx.fillStyle = trunk;
    ctx.beginPath();
    ctx.moveTo(base.x - tw, base.y);
    ctx.quadraticCurveTo(base.x - tw * 0.6, (base.y + top.y) / 2, top.x - tw * 0.45 + sway, top.y);
    ctx.lineTo(top.x + tw * 0.45 + sway, top.y);
    ctx.quadraticCurveTo(base.x + tw * 0.6, (base.y + top.y) / 2, base.x + tw, base.y);
    ctx.closePath();
    ctx.fill();

    // canopy as a cluster of soft spheres, lifted a bit above trunk top
    const ccx = top.x + sway;
    const ccy = top.y - tr.r * S * 0.55;
    const cr = tr.r * S;
    const hue = 105 + tr.hue;
    const blobs = [
      [-0.55, 0.2, 0.62],
      [0.55, 0.22, 0.6],
      [0, -0.35, 0.7],
      [0, 0.25, 0.78],
    ];
    for (const [ox, oy, rr] of blobs) {
      const x = ccx + ox * cr;
      const y = ccy + oy * cr;
      const r = rr * cr;
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r);
      g.addColorStop(0, `hsl(${hue}, 60%, 62%)`);
      g.addColorStop(0.7, `hsl(${hue}, 55%, 42%)`);
      g.addColorStop(1, `hsl(${hue + 5}, 55%, 32%)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // fruit
    const lim = Math.round(sim.p.fruitLimit);
    for (let i = 0; i < tr.slots.length; i++) {
      const s = tr.slots[i];
      const fx = ccx + s.ox * S;
      const fy = ccy + s.oy * S + cr * 0.1;
      if (s.reserved) {
        // the eater holds this fruit; the slot shows an empty stem
        this.drawStem(fx, fy);
        continue;
      }
      if (s.g <= 0.02) {
        if (i < lim) this.drawStem(fx, fy);
        continue;
      }
      const ripe = s.g >= 1;
      const r = S * 0.24 * (0.35 + 0.65 * s.g);
      const bob = ripe ? Math.sin(now * 0.003 + i + tr.sway) * S * 0.02 : 0;
      this.drawFruit(fx, fy + bob, r, ripe, s.g);
    }
  }

  private drawStem(x: number, y: number) {
    const ctx = this.ctx;
    ctx.strokeStyle = 'rgba(70,110,40,0.7)';
    ctx.lineWidth = Math.max(1, this.S * 0.04);
    ctx.beginPath();
    ctx.moveTo(x, y - this.S * 0.12);
    ctx.lineTo(x, y - this.S * 0.02);
    ctx.stroke();
  }

  private drawFruit(x: number, y: number, r: number, ripe: boolean, g: number) {
    const ctx = this.ctx;
    const grad = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    if (ripe) {
      grad.addColorStop(0, '#f4ffb0');
      grad.addColorStop(0.45, '#9fe24a');
      grad.addColorStop(1, '#4f9b1f');
    } else {
      const l = 30 + g * 20;
      grad.addColorStop(0, `hsl(95, 50%, ${l + 25}%)`);
      grad.addColorStop(1, `hsl(110, 45%, ${l}%)`);
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (ripe) {
      ctx.strokeStyle = '#3d6b1e';
      ctx.lineWidth = Math.max(1, r * 0.18);
      ctx.beginPath();
      ctx.moveTo(x, y - r * 0.9);
      ctx.lineTo(x + r * 0.2, y - r * 1.35);
      ctx.stroke();
      ctx.fillStyle = '#6ccf3a';
      ctx.beginPath();
      ctx.ellipse(x + r * 0.45, y - r * 1.2, r * 0.38, r * 0.16, -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private hop(b: Blob): number {
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 0.3) return 0;
    const phase = (b.stride / 0.95) * Math.PI;
    return Math.abs(Math.sin(phase)) * Math.min(1, sp / 3) * 0.55;
  }

  private drawBlob(sim: Simulation, b: Blob, now: number) {
    const ctx = this.ctx;
    const S = this.S;
    const hop = this.hop(b);
    const p = this.proj(b.x, b.y, hop);
    const sp = Math.hypot(b.vx, b.vy);
    const dir = this.screenDir(b.vx, b.vy);
    const facing = sp > 0.2 ? Math.max(-1, Math.min(1, dir.x / Math.max(sp, 1e-3))) : 0;
    const away = sp > 0.6 && dir.y < -sp * 0.7;

    // squash & stretch
    let sx = 1;
    let sy = 1;
    const t = now * 0.001;
    const idle = Math.sin(t * 2.4 + b.id) * 0.03;
    sx += idle;
    sy -= idle;
    if (hop > 0) {
      const land = 1 - hop / 0.55;
      sx += land * 0.12;
      sy -= land * 0.12;
    }
    if (b.action === 'eating') {
      const chew = Math.sin(t * 16) * 0.07;
      sx += chew;
      sy -= chew;
    }
    if (b.action === 'resting' || b.action === 'catching breath') {
      const breathe = Math.sin(t * 5) * 0.05;
      sx += breathe;
      sy -= breathe;
    }
    if (b.action === 'budding') {
      const k = b.timerTotal > 0 ? b.timer / b.timerTotal : 0;
      sy += Math.sin(k * Math.PI) * 0.18;
      sx -= Math.sin(k * Math.PI) * 0.1;
    }
    // newborns grow in
    const ageScale = Math.min(1, 0.55 + (sim.t - b.born) * 0.45);
    const bodyW = BLOB_R * BLOB_VIS * 2 * S * sx * ageScale;
    const bodyH = BLOB_R * BLOB_VIS * 2.35 * S * sy * ageScale;
    const lean = b.action === 'fleeing' || b.action === 'hunting' ? facing * 0.22 : facing * 0.1;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(lean);

    // energy glow after gaining energy
    const since = sim.t - b.gainedAt;
    if (since < 1.2) {
      const a = (1 - since / 1.2) * 0.6;
      const glow = ctx.createRadialGradient(0, -bodyH * 0.5, 1, 0, -bodyH * 0.5, bodyW * 1.3);
      glow.addColorStop(0, b.kind === 'blue' ? `rgba(200,255,140,${a})` : `rgba(255,220,120,${a})`);
      glow.addColorStop(1, 'rgba(255,255,200,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -bodyH * 0.5, bodyW * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }

    const sprite = this.sprites.get(b.kind)!;
    // low energy = paler
    const copy = b.kind === 'blue' ? sim.p.blueCopy : sim.p.redCopy;
    const e = Math.max(0, Math.min(1, b.energy / (copy * 0.5)));
    ctx.globalAlpha = 0.55 + 0.45 * e;
    ctx.drawImage(sprite, -bodyW / 2, -bodyH, bodyW, bodyH);
    ctx.globalAlpha = 1;

    const r = bodyW / 2;
    const cy = -bodyH * 0.55;
    if (!away) this.drawFace(b, r, cy, facing, t, sim);
    else {
      // tiny tail tuft seen from behind
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(0, cy + r * 0.5, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // held fruit while eating
    if (b.action === 'eating' && b.timerTotal > 0) {
      const k = b.timer / b.timerTotal;
      const fr = S * TREE_VIS * 0.24 * (0.25 + 0.75 * k);
      this.drawFruit(facing * r * 0.35, cy + r * 0.62, fr, true, 1);
    }

    // action badges
    if (b.action === 'resting' || b.action === 'catching breath') {
      ctx.fillStyle = 'rgba(80,60,120,0.75)';
      ctx.font = `700 ${Math.max(8, S * 0.45)}px ui-rounded, system-ui`;
      const zz = (t * 1.2 + b.id * 0.3) % 1;
      ctx.globalAlpha = 1 - zz;
      ctx.fillText('z', r * 0.6 + zz * r * 0.6, -bodyH - zz * S * 0.8);
      ctx.globalAlpha = 1;
    } else if (b.action === 'fleeing' && b.alert > 1.3) {
      ctx.fillStyle = '#fff';
      ctx.font = `800 ${Math.max(8, S * 0.5)}px ui-rounded, system-ui`;
      ctx.fillText('!', -S * 0.08, -bodyH - S * 0.15);
    }
    ctx.restore();

    this.screenPos.set(b.id, { x: p.x, y: p.y - bodyH / 2, r: Math.max(bodyW, bodyH) / 2 });

    if (b.id === this.selected || b.id === this.hovered) {
      ctx.strokeStyle = b.id === this.selected ? '#fffbe0' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.setLineDash(b.id === this.selected ? [] : [4, 3]);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 2, bodyW * 0.75, bodyW * 0.75 * Math.sin(this.elev), 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawFace(b: Blob, r: number, cy: number, facing: number, t: number, sim: Simulation) {
    const ctx = this.ctx;
    const fx = facing * r * 0.28;
    const eyeDx = r * 0.32;
    const eyeY = cy - r * 0.05;
    const blink = (t * 1000 + b.id * 977) % 3800 < 130;
    const eyeR = r * 0.14;
    const sleepy = b.action === 'resting' || b.action === 'catching breath';
    const scared = b.action === 'fleeing';
    ctx.fillStyle = '#1b1b2b';
    ctx.strokeStyle = '#1b1b2b';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, r * 0.08);
    for (const s of [-1, 1]) {
      const x = fx + s * eyeDx;
      if (blink || sleepy) {
        ctx.beginPath();
        ctx.arc(x, eyeY, eyeR, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
      } else {
        const er = scared ? eyeR * 1.2 : eyeR;
        ctx.beginPath();
        ctx.ellipse(x, eyeY, er * 0.85, er * 1.15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(x - er * 0.3 + facing * er * 0.2, eyeY - er * 0.4, er * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1b1b2b';
      }
    }
    if (b.kind === 'red' && b.action === 'hunting') {
      // determined little brows
      ctx.beginPath();
      ctx.moveTo(fx - eyeDx - eyeR, eyeY - eyeR * 1.8);
      ctx.lineTo(fx - eyeDx + eyeR, eyeY - eyeR * 1.3);
      ctx.moveTo(fx + eyeDx + eyeR, eyeY - eyeR * 1.8);
      ctx.lineTo(fx + eyeDx - eyeR, eyeY - eyeR * 1.3);
      ctx.stroke();
    }
    // cheeks
    ctx.fillStyle = b.kind === 'blue' ? 'rgba(255,150,190,0.45)' : 'rgba(255,210,150,0.5)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(fx + s * r * 0.55, eyeY + r * 0.28, r * 0.13, r * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // mouth
    const my = eyeY + r * 0.32;
    ctx.beginPath();
    if (b.action === 'eating') {
      const open = (Math.sin(t * 16) + 1) * 0.5;
      ctx.ellipse(fx, my, r * 0.12, r * (0.04 + open * 0.08), 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (scared) {
      ctx.ellipse(fx, my + r * 0.02, r * 0.07, r * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const happy = sim.t - b.gainedAt < 2 || b.action === 'budding';
      ctx.arc(fx, my - r * 0.06, r * (happy ? 0.16 : 0.1), 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }

  private drawVision(sim: Simulation, b: Blob) {
    const ctx = this.ctx;
    const vision = (b.kind === 'blue' ? sim.p.blueVision : sim.p.redVision) * b.vGene;
    const p = this.proj(b.x, b.y);
    ctx.fillStyle = b.kind === 'blue' ? 'rgba(80,160,255,0.10)' : 'rgba(255,90,80,0.10)';
    ctx.strokeStyle = b.kind === 'blue' ? 'rgba(40,110,220,0.55)' : 'rgba(210,50,40,0.55)';
    ctx.setLineDash([6, 5]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, vision * this.S, vision * this.S * Math.sin(this.elev), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
    // line to current target
    let tx: number | undefined;
    let ty: number | undefined;
    if (b.kind === 'blue' && b.targetTree >= 0 && sim.trees[b.targetTree]) {
      tx = sim.trees[b.targetTree].x;
      ty = sim.trees[b.targetTree].y;
    } else if (b.kind === 'red' && b.targetBlob >= 0) {
      const q = sim.find(b.targetBlob);
      if (q && q.alive) {
        tx = q.x;
        ty = q.y;
      }
    }
    if (tx !== undefined && ty !== undefined) {
      const q = this.proj(tx, ty);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(q.x, q.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  private drawParticles(dt: number) {
    const ctx = this.ctx;
    const S = this.S;
    const keep: Particle[] = [];
    for (const pt of this.particles) {
      pt.life -= dt;
      if (pt.life <= 0) continue;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += pt.vz * dt;
      if (pt.kind === 'sparkle') pt.vz -= 5 * dt;
      if (pt.kind === 'leaf') {
        pt.vz -= 0.8 * dt;
        pt.x += Math.sin(pt.life * 6) * dt * 0.6;
        if (pt.z < 0) pt.z = 0;
      }
      pt.vx *= 0.96;
      pt.vy *= 0.96;
      keep.push(pt);
      const k = pt.life / pt.max;
      const p = this.proj(pt.x, pt.y, Math.max(0, pt.z));
      ctx.globalAlpha = Math.min(1, k * 1.6);
      if (pt.kind === 'sparkle') {
        const s = pt.size * S * (0.6 + k * 0.6);
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - s);
        ctx.lineTo(p.x + s * 0.3, p.y - s * 0.3);
        ctx.lineTo(p.x + s, p.y);
        ctx.lineTo(p.x + s * 0.3, p.y + s * 0.3);
        ctx.lineTo(p.x, p.y + s);
        ctx.lineTo(p.x - s * 0.3, p.y + s * 0.3);
        ctx.lineTo(p.x - s, p.y);
        ctx.lineTo(p.x - s * 0.3, p.y - s * 0.3);
        ctx.closePath();
        ctx.fill();
      } else if (pt.kind === 'heart') {
        const s = pt.size * S;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y + s * 0.35);
        ctx.bezierCurveTo(p.x - s, p.y - s * 0.3, p.x - s * 0.4, p.y - s, p.x, p.y - s * 0.45);
        ctx.bezierCurveTo(p.x + s * 0.4, p.y - s, p.x + s, p.y - s * 0.3, p.x, p.y + s * 0.35);
        ctx.fill();
      } else if (pt.kind === 'poof') {
        const s = pt.size * S * (1.6 - k * 0.6);
        ctx.fillStyle = `${pt.color}${0.45 * k})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.kind === 'ring') {
        const s = (1 - k) * 1.6 * S + 2;
        ctx.strokeStyle = pt.color;
        ctx.lineWidth = 2.5 * k + 0.5;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, s, s * Math.sin(this.elev), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (pt.kind === 'leaf') {
        const s = S * 0.14;
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, s, s * 0.45, pt.life * 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (pt.kind === 'text' && pt.text) {
        ctx.font = `800 ${Math.max(10, S * 0.5)}px ui-rounded, system-ui`;
        ctx.textAlign = 'center';
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeText(pt.text, p.x, p.y);
        ctx.fillStyle = pt.color;
        ctx.fillText(pt.text, p.x, p.y);
        ctx.textAlign = 'start';
      }
      ctx.globalAlpha = 1;
    }
    this.particles = keep;
  }

  clearParticles() {
    this.particles = [];
  }
}
