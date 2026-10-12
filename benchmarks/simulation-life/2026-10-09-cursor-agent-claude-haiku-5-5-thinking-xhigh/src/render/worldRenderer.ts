import { BLOB_RADIUS, RULES, TREE_REACH } from '../sim/world';
import { mulberry32 } from '../sim/rng';
import type { Blob, SimEvent, Tree, World } from '../sim/types';

export interface Camera {
  yaw: number;
  tilt: number;
  zoom: number;
}

export interface Pick {
  kind: 'blue' | 'red' | 'tree';
  id: number;
}

interface Proj {
  cx: number;
  cy: number;
  s: number;
  cosY: number;
  sinY: number;
  st: number;
  ct: number;
}

interface BlobVis {
  x: number;
  z: number;
  hop: number;
  phase: number;
  heading: number;
  squash: number;
  glow: number;
  glowColor: string;
  blink: number;
  blinkT: number;
  seen: boolean;
}

interface TreeVis {
  wobble: number;
  slots: number[];
  seen: boolean;
}

interface Particle {
  kind: 'spark' | 'text' | 'ring' | 'puff' | 'heart';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  color: string;
  text: string;
}

interface Decor {
  x: number;
  z: number;
  kind: 'tuft' | 'flower' | 'pebble';
  hue: number;
}

interface Hit {
  kind: Pick['kind'];
  id: number;
  sx: number;
  sy: number;
  r: number;
}

interface Item {
  d: number;
  draw: () => void;
}

const TAU = Math.PI * 2;
const WALL_H = 1.1;
const TRUNK_H = 1.9;
const TREE_TOP = 3.2;
const FRUIT_R = 1.45;
const FRUIT_Y = 1.35;
const MAX_PARTICLES = 500;
const FLOWER_COLORS = ['#ff9ecb', '#ffe27a', '#c9a4ff', '#ffffff'];
const WALL_DARK: [number, number, number] = [112, 74, 43];
const WALL_LIT: [number, number, number] = [226, 176, 112];

const BLUE_PAL = { base: '#3f8ffb', light: '#d3eaff', dark: '#1d4cad' };
const RED_PAL = { base: '#ff5a5f', light: '#ffd0cc', dark: '#a81f30' };

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function angDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

function mixRgb(a: [number, number, number], b: [number, number, number], t: number): string {
  const r = Math.round(a[0] + (b[0] - a[0]) * t);
  const g = Math.round(a[1] + (b[1] - a[1]) * t);
  const bl = Math.round(a[2] + (b[2] - a[2]) * t);
  return `rgb(${r},${g},${bl})`;
}

/**
 * Pseudo-3D renderer for the garden dish.
 * World: ground is y = 0, walls hang down to y = -WALL_H, trees rise to y ~ 3.
 * Camera: yaw spins the dish, tilt sets elevation. Depth d grows toward the viewer.
 * Objects are painted far to near using the depth of their ground point.
 */
export class WorldRenderer {
  private vis = new Map<number, BlobVis>();
  private treeVis = new Map<number, TreeVis>();
  private particles: Particle[] = [];
  private decor: Decor[] = [];
  private decorKey = '';
  private hits: Hit[] = [];
  private world: World | null = null;
  private time = 0;

  pick(x: number, y: number): Pick | null {
    let best: Hit | null = null;
    let bestScore = Infinity;
    for (const h of this.hits) {
      const d = Math.hypot(h.sx - x, h.sy - y);
      if (d > h.r) continue;
      const score = d / h.r + (h.kind === 'tree' ? 0.25 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = h;
      }
    }
    return best ? { kind: best.kind, id: best.id } : null;
  }

  draw(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    world: World,
    cam: Camera,
    dt: number,
    selected: Pick | null,
    hovered: Pick | null,
  ): void {
    if (world !== this.world) this.resetFor(world);
    this.time += dt;
    this.hits = [];
    this.ensureDecor(world);
    this.consumeEvents(world);
    this.advanceParticles(dt);
    this.updateVisuals(world, dt);

    const P = this.projection(W, H, world, cam);
    this.drawBackground(ctx, W, H);
    this.drawDishShadow(ctx, P, world);
    this.drawWall(ctx, P, world);
    this.drawTop(ctx, P, world);
    this.drawDecor(ctx, P);

    const rings: (() => void)[] = [];
    const items: Item[] = [];

    for (const t of world.trees) {
      const tv = this.treeVis.get(t.id);
      if (!tv) continue;
      const isSel = selected?.kind === 'tree' && selected.id === t.id;
      const isHov = hovered?.kind === 'tree' && hovered.id === t.id;
      rings.push(() => {
        this.groundEllipse(ctx, P, t.x, t.z, 1.6, 'rgba(60,80,30,0.2)');
        if (isSel || isHov) this.ringAt(ctx, P, t.x, t.z, 1.9, isSel ? 'rgba(255,190,40,0.95)' : 'rgba(255,255,255,0.9)', isSel ? 3 : 2);
      });
      const limit = Math.max(1, world.params.fruitLimit);
      items.push({ d: this.depth(P, t.x, 0, t.z), draw: () => this.drawTree(ctx, P, t, tv, limit) });
    }

    for (const group of [world.blue, world.red]) {
      for (const b of group) this.addBlob(ctx, P, b, rings, items, selected, hovered);
    }

    for (const r of rings) r();
    items.sort((a, b) => a.d - b.d);
    for (const it of items) it.draw();

    this.drawSelectionRange(ctx, P, world, selected);
    this.drawParticles(ctx, P);
  }

  // ---------- projection ----------

  private projection(W: number, H: number, world: World, cam: Camera): Proj {
    const R = world.params.worldSize;
    const st = Math.sin(cam.tilt);
    const ct = Math.cos(cam.tilt);
    const fitW = (W * 0.44) / R;
    const fitH = (H * 0.86) / (2 * R * st + (WALL_H + TREE_TOP) * ct);
    const s = Math.min(fitW, fitH) * cam.zoom;
    return {
      cx: W / 2,
      cy: H / 2 + ((TREE_TOP - WALL_H) * ct * s) / 2,
      s,
      cosY: Math.cos(cam.yaw),
      sinY: Math.sin(cam.yaw),
      st,
      ct,
    };
  }

  private project(P: Proj, x: number, y: number, z: number): { sx: number; sy: number; d: number } {
    const xr = x * P.cosY - z * P.sinY;
    const zr = x * P.sinY + z * P.cosY;
    return {
      sx: P.cx + xr * P.s,
      sy: P.cy + (zr * P.st - y * P.ct) * P.s,
      d: zr * P.ct + y * P.st,
    };
  }

  private depth(P: Proj, x: number, y: number, z: number): number {
    return this.project(P, x, y, z).d;
  }

  // ---------- static scenery ----------

  private resetFor(world: World): void {
    this.world = world;
    this.vis.clear();
    this.treeVis.clear();
    this.particles = [];
  }

  private ensureDecor(world: World): void {
    const key = `${world.params.seed}:${world.params.worldSize}`;
    if (key === this.decorKey) return;
    this.decorKey = key;
    const rng = mulberry32(world.params.seed ^ 0x5bd1e995);
    const R = world.params.worldSize;
    this.decor = [];
    const count = Math.round(R * 6);
    for (let i = 0; i < count; i++) {
      const a = rng() * TAU;
      const d = Math.sqrt(rng()) * R * 0.92;
      const roll = rng();
      const kind: Decor['kind'] = roll < 0.5 ? 'tuft' : roll < 0.8 ? 'flower' : 'pebble';
      this.decor.push({ x: Math.cos(a) * d, z: Math.sin(a) * d, kind, hue: rng() });
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#e9f6ff');
    g.addColorStop(0.55, '#fff6e6');
    g.addColorStop(1, '#ffe9d2');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let i = 0; i < 26; i++) {
      const x = ((i * 137.5) % 100) / 100;
      const y = ((i * 61.3) % 100) / 100;
      ctx.beginPath();
      ctx.arc(x * W, y * H, 2 + (i % 3), 0, TAU);
      ctx.fill();
    }
  }

  private drawDishShadow(ctx: CanvasRenderingContext2D, P: Proj, world: World): void {
    const R = world.params.worldSize;
    const c = this.project(P, 0, -WALL_H - 0.2, 0);
    const rx = R * P.s * 1.1;
    const ry = rx * P.st;
    const g = ctx.createRadialGradient(c.sx, c.sy, rx * 0.2, c.sx, c.sy, rx);
    g.addColorStop(0, 'rgba(120,80,40,0.25)');
    g.addColorStop(1, 'rgba(120,80,40,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(c.sx, c.sy, rx, ry, 0, 0, TAU);
    ctx.fill();
  }

  private drawWall(ctx: CanvasRenderingContext2D, P: Proj, world: World): void {
    const R = world.params.worldSize;
    const N = 120;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * TAU;
      const a1 = ((i + 1) / N) * TAU;
      const am = (a0 + a1) / 2;
      const facing = Math.cos(am) * P.sinY + Math.sin(am) * P.cosY;
      if (facing <= 0) continue;
      const t0 = this.project(P, R * Math.cos(a0), 0, R * Math.sin(a0));
      const t1 = this.project(P, R * Math.cos(a1), 0, R * Math.sin(a1));
      const b1 = this.project(P, R * Math.cos(a1), -WALL_H, R * Math.sin(a1));
      const b0 = this.project(P, R * Math.cos(a0), -WALL_H, R * Math.sin(a0));
      const color = mixRgb(WALL_DARK, WALL_LIT, Math.pow(facing, 0.8));
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(t0.sx, t0.sy);
      ctx.lineTo(t1.sx, t1.sy);
      ctx.lineTo(b1.sx, b1.sy);
      ctx.lineTo(b0.sx, b0.sy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  private drawTop(ctx: CanvasRenderingContext2D, P: Proj, world: World): void {
    const R = world.params.worldSize;
    const c = this.project(P, 0, 0, 0);
    const g = ctx.createRadialGradient(c.sx, c.sy, 0, c.sx, c.sy, R * P.s);
    g.addColorStop(0, '#d9f8b8');
    g.addColorStop(0.6, '#a6e083');
    g.addColorStop(1, '#84c964');
    ctx.fillStyle = g;
    ctx.beginPath();
    this.circlePath(ctx, P, R, 0, 160);
    ctx.fill();

    ctx.lineWidth = Math.max(2, 0.16 * P.s);
    ctx.strokeStyle = '#f3d19b';
    ctx.beginPath();
    this.circlePath(ctx, P, R, 0, 160);
    ctx.stroke();

    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(70,120,50,0.22)';
    for (const f of [0.35, 0.7]) {
      ctx.beginPath();
      this.circlePath(ctx, P, R * f, 0, 120);
      ctx.stroke();
    }
  }

  private circlePath(ctx: CanvasRenderingContext2D, P: Proj, r: number, y: number, n: number): void {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const p = this.project(P, Math.cos(a) * r, y, Math.sin(a) * r);
      if (i === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.closePath();
  }

  private groundEllipse(ctx: CanvasRenderingContext2D, P: Proj, x: number, z: number, r: number, fill: string): void {
    const c = this.project(P, x, 0, z);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.ellipse(c.sx, c.sy, r * P.s, r * P.s * P.st, 0, 0, TAU);
    ctx.fill();
  }

  private ringAt(
    ctx: CanvasRenderingContext2D,
    P: Proj,
    x: number,
    z: number,
    r: number,
    color: string,
    width: number,
  ): void {
    const c = this.project(P, x, 0, z);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.ellipse(c.sx, c.sy, r * P.s, r * P.s * P.st, 0, 0, TAU);
    ctx.stroke();
  }

  private drawDecor(ctx: CanvasRenderingContext2D, P: Proj): void {
    const k = P.s / 22;
    for (const d of this.decor) {
      const p = this.project(P, d.x, 0, d.z);
      if (d.kind === 'tuft') {
        ctx.strokeStyle = 'rgba(60,120,50,0.5)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (const dx of [-3, 0, 3]) {
          ctx.moveTo(p.sx + dx * k, p.sy);
          ctx.lineTo(p.sx + (dx * 1.4 + (d.hue - 0.5) * 2) * k, p.sy - (5 + d.hue * 3) * k);
        }
        ctx.stroke();
      } else if (d.kind === 'flower') {
        ctx.fillStyle = FLOWER_COLORS[Math.floor(d.hue * FLOWER_COLORS.length)];
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * TAU;
          ctx.beginPath();
          ctx.arc(p.sx + Math.cos(a) * 2.6 * k, p.sy - 4 * k + Math.sin(a) * 2.6 * k, 2.2 * k, 0, TAU);
          ctx.fill();
        }
        ctx.fillStyle = '#ffd34d';
        ctx.beginPath();
        ctx.arc(p.sx, p.sy - 4 * k, 1.8 * k, 0, TAU);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(150,140,130,0.6)';
        ctx.beginPath();
        ctx.ellipse(p.sx, p.sy, 3.5 * k, 2.2 * k, 0, 0, TAU);
        ctx.fill();
      }
    }
  }

  // ---------- events and smoothing ----------

  private consumeEvents(world: World): void {
    const events: SimEvent[] = world.events.splice(0, world.events.length);
    for (const ev of events) this.applyEvent(ev, world);
  }

  private advanceParticles(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.kind === 'spark') p.vy -= 5 * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > MAX_PARTICLES) this.particles.splice(0, this.particles.length - MAX_PARTICLES);
  }

  private applyEvent(ev: SimEvent, world: World): void {
    if (ev.type === 'eat') {
      const tv = this.treeVis.get(ev.treeId);
      if (tv) tv.wobble = 1;
      const bv = this.vis.get(ev.id);
      if (bv) {
        bv.glow = 1;
        bv.glowColor = '120,230,120';
        bv.squash = 0.6;
      }
      const tree = world.trees.find((t) => t.id === ev.treeId);
      this.spawnSparks(tree ? tree.x : ev.x, 2, tree ? tree.z : ev.z, '#8ee04f', 7);
      this.particles.push(this.text(ev.x, 1.9, ev.z, `+${Math.round(ev.gain)}`, '#2f9e44', 1.1));
    } else if (ev.type === 'bite') {
      const rv = this.vis.get(ev.redId);
      const bv = this.vis.get(ev.blueId);
      if (rv) {
        rv.glow = 1;
        rv.glowColor = '255,150,170';
        rv.squash = 0.5;
      }
      if (bv) {
        bv.squash = 1;
        bv.glow = 0.5;
        bv.glowColor = '255,150,170';
      }
      this.spawnHearts(ev.x, 1.4, ev.z, 2);
      this.particles.push(this.text(ev.x, 1.8, ev.z, `+${Math.round(ev.gain)}`, '#d6336c', 1));
    } else if (ev.type === 'birth') {
      const color = ev.group === 'blue' ? '#5aa7ff' : '#ff7a7a';
      this.particles.push({
        kind: 'ring',
        x: ev.x,
        y: 0.05,
        z: ev.z,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0.9,
        max: 0.9,
        color,
        text: '',
      });
      this.spawnSparks(ev.x, 1, ev.z, color, 6);
    } else {
      for (let i = 0; i < 3; i++) {
        this.particles.push({
          kind: 'puff',
          x: ev.x + (Math.random() - 0.5) * 0.4,
          y: 0.5,
          z: ev.z + (Math.random() - 0.5) * 0.4,
          vx: 0,
          vy: 0.8 + Math.random() * 0.4,
          vz: 0,
          life: 0.8,
          max: 0.8,
          color: '120,120,130',
          text: '',
        });
      }
    }
  }

  private text(x: number, y: number, z: number, text: string, color: string, life: number): Particle {
    return { kind: 'text', x, y, z, vx: 0, vy: 0, vz: 0, life, max: life, color, text };
  }

  private spawnSparks(x: number, y: number, z: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU;
      const v = 1 + Math.random() * 1.6;
      this.particles.push({
        kind: 'spark',
        x,
        y,
        z,
        vx: Math.cos(a) * v,
        vy: 2 + Math.random() * 2,
        vz: Math.sin(a) * v,
        life: 0.7 + Math.random() * 0.4,
        max: 1.1,
        color,
        text: '',
      });
    }
  }

  private spawnHearts(x: number, y: number, z: number, n: number): void {
    for (let i = 0; i < n; i++) {
      this.particles.push({
        kind: 'heart',
        x: x + (Math.random() - 0.5) * 0.6,
        y,
        z: z + (Math.random() - 0.5) * 0.6,
        vx: 0,
        vy: 1.4,
        vz: 0,
        life: 1.1,
        max: 1.1,
        color: '#ff5c8a',
        text: '',
      });
    }
  }

  private updateVisuals(world: World, dt: number): void {
    for (const v of this.vis.values()) v.seen = false;
    for (const t of world.trees) {
      let tv = this.treeVis.get(t.id);
      if (!tv) {
        tv = { wobble: 0, slots: [], seen: false };
        this.treeVis.set(t.id, tv);
      }
      tv.seen = true;
      tv.wobble = Math.max(0, tv.wobble - dt * 2.5);
      while (tv.slots.length < world.params.fruitLimit) tv.slots.push(0);
      for (let k = 0; k < tv.slots.length; k++) {
        const target = k < t.fruit ? 1 : 0;
        tv.slots[k] += (target - tv.slots[k]) * Math.min(1, dt * 9);
      }
    }
    for (const [id, tv] of this.treeVis) if (!tv.seen) this.treeVis.delete(id);

    for (const group of [world.blue, world.red]) {
      for (const b of group) this.updateBlob(b, dt);
    }
    for (const [id, v] of this.vis) if (!v.seen) this.vis.delete(id);
  }

  private updateBlob(b: Blob, dt: number): void {
    let v = this.vis.get(b.id);
    if (!v) {
      v = {
        x: b.x,
        z: b.z,
        hop: 0,
        phase: Math.random() * TAU,
        heading: Math.atan2(b.vz, b.vx) || 0,
        squash: 0,
        glow: 0,
        glowColor: '255,255,255',
        blink: 1,
        blinkT: 2 + Math.random() * 3,
        seen: true,
      };
      this.vis.set(b.id, v);
    }
    v.seen = true;
    const k = Math.min(1, dt * 14);
    v.x += (b.x - v.x) * k;
    v.z += (b.z - v.z) * k;
    v.phase += dt * (3 + b.moved * 7);

    const walking = Math.min(1, b.moved / 0.5);
    const bob = Math.abs(Math.sin(v.phase));
    const eatWiggle = b.action === 'eat' ? Math.sin(this.time * 9 + b.id) * 0.05 : 0;
    const targetHop = b.action === 'pause' ? 0.06 : bob * 0.16 * walking + eatWiggle;
    v.hop += (targetHop - v.hop) * Math.min(1, dt * 12);

    if (b.moved > 0.08) {
      const tgt = Math.atan2(b.vz, b.vx);
      v.heading += angDiff(tgt, v.heading) * Math.min(1, dt * 6);
    }
    v.squash = Math.max(0, v.squash - dt * 3);
    v.glow = Math.max(0, v.glow - dt * 1.2);
    v.blinkT -= dt;
    if (v.blinkT <= 0) {
      v.blink = 0;
      v.blinkT = 2.4 + Math.random() * 2.6;
    }
    v.blink = Math.min(1, v.blink + dt * 9);
  }

  // ---------- blobs ----------

  private blobRadius(b: Blob): number {
    const maturity = b.group === 'blue' ? RULES.blueMaturity : RULES.redMaturity;
    return BLOB_RADIUS * (0.55 + 0.45 * Math.min(1, b.age / maturity));
  }

  private addBlob(
    ctx: CanvasRenderingContext2D,
    P: Proj,
    b: Blob,
    rings: (() => void)[],
    items: Item[],
    selected: Pick | null,
    hovered: Pick | null,
  ): void {
    const v = this.vis.get(b.id);
    if (!v) return;
    const rb = this.blobRadius(b);
    const isSel = selected?.kind === b.group && selected.id === b.id;
    const isHov = hovered?.kind === b.group && hovered.id === b.id;
    const hopFade = clamp(1 - v.hop * 2.4, 0.35, 1);

    rings.push(() => {
      this.groundEllipse(ctx, P, v.x, v.z, rb * 1.05 * hopFade, 'rgba(60,50,40,0.2)');
      if (isSel) this.ringAt(ctx, P, v.x, v.z, rb * 1.5, 'rgba(255,190,40,0.95)', 3);
      else if (isHov) this.ringAt(ctx, P, v.x, v.z, rb * 1.5, 'rgba(255,255,255,0.9)', 2);
    });

    const center = this.project(P, v.x, rb * 0.82 + v.hop, v.z);
    const rpx = rb * P.s;
    const ahead = this.project(P, v.x + Math.cos(v.heading), 0, v.z + Math.sin(v.heading));
    const ground = this.project(P, v.x, 0, v.z);
    const screenHeading = Math.atan2(ahead.sy - ground.sy, ahead.sx - ground.sx);

    this.hits.push({ kind: b.group, id: b.id, sx: center.sx, sy: center.sy, r: Math.max(14, rpx * 1.3) });
    items.push({
      d: ground.d,
      draw: () => this.drawBlob(ctx, b, v, center.sx, center.sy, rpx, screenHeading),
    });
  }

  private drawBlob(
    ctx: CanvasRenderingContext2D,
    b: Blob,
    v: BlobVis,
    sx: number,
    sy: number,
    rpx: number,
    heading: number,
  ): void {
    const pal = b.group === 'blue' ? BLUE_PAL : RED_PAL;
    const stretch = clamp(b.moved / 1.6, 0, 0.3);
    const breathe = 1 + Math.sin(this.time * 2.5 + b.id) * 0.02;
    const rx = rpx * (1 + stretch * 0.5 + v.squash * 0.18) * breathe;
    const ry = rpx * (1 - stretch * 0.3 - v.squash * 0.2) * breathe * 0.94;

    if (v.glow > 0.01) {
      const halo = ctx.createRadialGradient(sx, sy, rx * 0.6, sx, sy, rx * 2.1);
      halo.addColorStop(0, `rgba(${v.glowColor},${0.55 * v.glow})`);
      halo.addColorStop(1, `rgba(${v.glowColor},0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(sx, sy, rx * 2.1, 0, TAU);
      ctx.fill();
    }

    const cosH = Math.cos(heading);
    const sinH = Math.sin(heading);
    ctx.beginPath();
    const N = 48;
    for (let i = 0; i <= N; i++) {
      const th = (i / N) * TAU;
      const dent = 1 - 0.13 * Math.exp(-(angDiff(th, Math.PI) ** 2) / 0.35);
      const lx = Math.cos(th) * rx * dent;
      const ly = Math.sin(th) * ry * dent;
      const px = sx + lx * cosH - ly * sinH;
      const py = sy + lx * sinH + ly * cosH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    const body = ctx.createRadialGradient(sx - rx * 0.35, sy - ry * 0.45, rx * 0.1, sx, sy, rx * 1.25);
    body.addColorStop(0, pal.light);
    body.addColorStop(0.35, pal.base);
    body.addColorStop(1, pal.dark);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, rpx * 0.08);
    ctx.strokeStyle = 'rgba(40,30,30,0.35)';
    ctx.stroke();

    ctx.save();
    ctx.translate(sx - rx * 0.36, sy - ry * 0.46);
    ctx.rotate(-0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    ctx.ellipse(0, 0, rx * 0.26, ry * 0.14, 0, 0, TAU);
    ctx.fill();
    ctx.restore();

    this.drawFace(ctx, b, v, sx + cosH * rx * 0.1, sy - ry * 0.05, rx, ry, heading);
  }

  private drawFace(
    ctx: CanvasRenderingContext2D,
    b: Blob,
    v: BlobVis,
    fx: number,
    fy: number,
    rx: number,
    ry: number,
    heading: number,
  ): void {
    const eyeOpen = b.action === 'idle' ? 0.45 : 1;
    const wide = b.action === 'flee' ? 1.25 : 1;
    const happy = b.action === 'pause' || (v.glow > 0.2 && b.action !== 'eat');
    const ew = rx * 0.21 * wide;
    const eh = ry * 0.3 * wide * eyeOpen * v.blink;
    const eyeY = fy - ry * 0.12;
    const gaze = Math.cos(heading) * ew * 0.35;

    ctx.fillStyle = 'rgba(255,120,140,0.42)';
    ctx.beginPath();
    ctx.ellipse(fx - rx * 0.56, fy + ry * 0.12, rx * 0.13, ry * 0.09, 0, 0, TAU);
    ctx.ellipse(fx + rx * 0.56, fy + ry * 0.12, rx * 0.13, ry * 0.09, 0, 0, TAU);
    ctx.fill();

    for (const side of [-1, 1]) {
      const ex = fx + side * rx * 0.31;
      if (happy) {
        ctx.strokeStyle = '#2b2233';
        ctx.lineWidth = Math.max(1.6, rx * 0.09);
        ctx.beginPath();
        ctx.arc(ex, eyeY + eh * 0.2, ew * 0.9, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#fffdf7';
        ctx.beginPath();
        ctx.ellipse(ex, eyeY, ew, Math.max(0.8, eh), 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#2b2233';
        ctx.beginPath();
        ctx.arc(ex + gaze, eyeY + eh * 0.12, ew * 0.55, 0, TAU);
        ctx.fill();
      }
    }

    const mouthY = fy + ry * 0.28;
    ctx.strokeStyle = '#2b2233';
    ctx.fillStyle = '#2b2233';
    ctx.lineWidth = Math.max(1.4, rx * 0.08);
    if (b.action === 'eat') {
      const open = 0.35 + 0.35 * Math.abs(Math.sin(this.time * 10 + b.id));
      ctx.beginPath();
      ctx.ellipse(fx, mouthY, rx * 0.13, ry * 0.11 * open + 1, 0, 0, TAU);
      ctx.fill();
    } else if (b.action === 'flee') {
      ctx.beginPath();
      ctx.ellipse(fx, mouthY + ry * 0.04, rx * 0.1, ry * 0.12, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(fx - rx * 0.22, mouthY);
      ctx.quadraticCurveTo(fx, mouthY + ry * (happy ? 0.32 : 0.16), fx + rx * 0.22, mouthY);
      ctx.stroke();
    }
  }

  // ---------- trees ----------

  private drawTree(ctx: CanvasRenderingContext2D, P: Proj, t: Tree, tv: TreeVis, limit: number): void {
    const s = P.s;
    const sway = Math.sin(this.time * 1.2 + t.id) * 0.025 + Math.sin(this.time * 26 + t.id) * tv.wobble * 0.06;
    const tx = t.x + sway;
    const base = this.project(P, t.x, 0, t.z);
    const top = this.project(P, tx, TRUNK_H, t.z);
    const half = 0.16 * s;

    const trunk = ctx.createLinearGradient(base.sx - half, 0, base.sx + half, 0);
    trunk.addColorStop(0, '#7a4f2e');
    trunk.addColorStop(0.5, '#b07a4c');
    trunk.addColorStop(1, '#7a4f2e');
    ctx.fillStyle = trunk;
    ctx.beginPath();
    ctx.moveTo(base.sx - half, base.sy);
    ctx.lineTo(top.sx - half * 0.7, top.sy);
    ctx.lineTo(top.sx + half * 0.7, top.sy);
    ctx.lineTo(base.sx + half, base.sy);
    ctx.closePath();
    ctx.fill();

    const canopyD = this.depth(P, tx, 2.4, t.z);
    const fruit: { sx: number; sy: number; d: number; sc: number }[] = [];
    for (let k = 0; k < limit; k++) {
      const a = (k / limit) * TAU + t.phase;
      const p = this.project(P, tx + Math.cos(a) * FRUIT_R, FRUIT_Y, t.z + Math.sin(a) * FRUIT_R);
      fruit.push({ sx: p.sx, sy: p.sy, d: p.d, sc: tv.slots[k] ?? 0 });
    }
    if (t.fruit < limit && t.growth > 0) {
      const a = (t.fruit / limit) * TAU + t.phase;
      const p = this.project(P, tx + Math.cos(a) * FRUIT_R, FRUIT_Y, t.z + Math.sin(a) * FRUIT_R);
      fruit.push({ sx: p.sx, sy: p.sy, d: p.d, sc: -t.growth });
    }
    for (const f of fruit) if (f.d < canopyD && f.sc !== 0) this.drawFruit(ctx, f.sx, f.sy, f.sc, s);

    const lobes = [
      { x: 0, y: 2.7, z: 0, r: 1.0 },
      { x: -0.85, y: 2.3, z: 0.1, r: 0.78 },
      { x: 0.85, y: 2.3, z: -0.1, r: 0.78 },
      { x: 0, y: 2.25, z: -0.8, r: 0.72 },
      { x: 0.1, y: 2.3, z: 0.8, r: 0.78 },
    ]
      .map((l) => {
        const p = this.project(P, tx + l.x, l.y, t.z + l.z);
        return { sx: p.sx, sy: p.sy, d: p.d, r: l.r * s };
      })
      .sort((a, b) => a.d - b.d);
    for (const l of lobes) this.drawLobe(ctx, l.sx, l.sy, l.r);

    for (const f of fruit) if (f.d >= canopyD && f.sc !== 0) this.drawFruit(ctx, f.sx, f.sy, f.sc, s);

    const hit = this.project(P, tx, 2.5, t.z);
    this.hits.push({ kind: 'tree', id: t.id, sx: hit.sx, sy: hit.sy, r: 1.6 * s });
  }

  private drawLobe(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number): void {
    const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.45, r * 0.1, sx, sy, r * 1.1);
    g.addColorStop(0, '#e4fbc4');
    g.addColorStop(0.35, '#7ccc6f');
    g.addColorStop(1, '#2c7d47');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, TAU);
    ctx.fill();
  }

  private drawFruit(ctx: CanvasRenderingContext2D, sx: number, sy: number, sc: number, s: number): void {
    if (sc > 0) {
      const r = 0.3 * s * sc;
      if (r < 0.5) return;
      ctx.strokeStyle = '#6b4a2b';
      ctx.lineWidth = Math.max(1, 0.05 * s);
      ctx.beginPath();
      ctx.moveTo(sx, sy - r * 0.5);
      ctx.lineTo(sx + r * 0.2, sy - r * 1.4);
      ctx.stroke();
      const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.3, r * 0.1, sx, sy, r * 1.1);
      g.addColorStop(0, '#f0ffd8');
      g.addColorStop(0.35, '#8ee04f');
      g.addColorStop(1, '#3f9a33');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, TAU);
      ctx.fill();
    } else {
      const p = -sc;
      ctx.fillStyle = '#c8f0a8';
      ctx.beginPath();
      ctx.arc(sx, sy, Math.max(1.5, (0.06 + 0.12 * p) * s), 0, TAU);
      ctx.fill();
    }
  }

  // ---------- overlays ----------

  private drawSelectionRange(ctx: CanvasRenderingContext2D, P: Proj, world: World, sel: Pick | null): void {
    if (!sel) return;
    let x = 0;
    let z = 0;
    let range = 0;
    let color = 'rgba(100,180,80,0.6)';
    if (sel.kind === 'tree') {
      const t = world.trees.find((tr) => tr.id === sel.id);
      if (!t) return;
      x = t.x;
      z = t.z;
      range = TREE_REACH;
    } else {
      const b = (sel.kind === 'blue' ? world.blue : world.red).find((o) => o.id === sel.id);
      if (!b) return;
      const vision = sel.kind === 'blue' ? world.params.blueVision : world.params.redVision;
      x = b.x;
      z = b.z;
      range = vision * b.visionTrait;
      color = sel.kind === 'red' ? 'rgba(255,90,95,0.55)' : 'rgba(63,143,251,0.55)';
    }
    ctx.save();
    ctx.setLineDash([6, 6]);
    this.ringAt(ctx, P, x, z, range, color, 2);
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D, P: Proj): void {
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === 'ring') {
        ctx.save();
        ctx.globalAlpha = a * 0.8;
        this.ringAt(ctx, P, p.x, p.z, 0.3 + (1 - a) * 1.8, p.color, 3);
        ctx.restore();
        continue;
      }
      const c = this.project(P, p.x, p.y, p.z);
      ctx.save();
      if (p.kind === 'spark') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(c.sx, c.sy, 2.6 + 2 * a, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'puff') {
        ctx.globalAlpha = a * 0.5;
        ctx.fillStyle = `rgba(${p.color},1)`;
        ctx.beginPath();
        ctx.arc(c.sx, c.sy, (1 - a) * 12 + 6, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'heart') {
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        this.heart(ctx, c.sx, c.sy, 7);
      } else {
        ctx.globalAlpha = Math.min(1, a * 1.6);
        ctx.font = '800 15px ui-rounded, "SF Pro Rounded", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        const rise = (1 - a) * 26;
        ctx.strokeText(p.text, c.sx, c.sy - rise);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, c.sx, c.sy - rise);
      }
      ctx.restore();
    }
  }

  private heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.3);
    ctx.bezierCurveTo(x - s, y - s * 0.6, x - s * 0.3, y - s * 1.2, x, y - s * 0.4);
    ctx.bezierCurveTo(x + s * 0.3, y - s * 1.2, x + s, y - s * 0.6, x, y + s * 0.3);
    ctx.fill();
  }
}
