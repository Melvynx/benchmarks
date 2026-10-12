import type { Blob, SimEvent, Tree } from '../sim/engine';
import type { Simulator } from '../sim/controller';
import { drawBlob, drawShadow, makeAnim, updateAnim, type Anim } from './blob';
import { Camera, type Pt } from './camera';
import { makeGround } from './ground';
import { Particles } from './particles';
import { drawTree } from './tree';
import { TAU, clamp, hsl } from './util';

interface Drawable {
  depth: number;
  tree: Tree | null;
  blob: Blob | null;
}

export interface ViewOptions {
  energyBars: boolean;
}

const SEGMENTS = 120;
const RIM_TOP = 0.62;
const WALL_DEPTH = 3.1;

const pt: Pt = { x: 0, y: 0, d: 0 };

interface Ring {
  x: Float32Array;
  y: Float32Array;
}

const makeRing = (): Ring => ({ x: new Float32Array(SEGMENTS + 1), y: new Float32Array(SEGMENTS + 1) });

export class WorldView {
  cam = new Camera();
  particles = new Particles();
  anims = new Map<number, Anim>();
  clock = 0;
  selectedId = 0;
  hoverId = 0;
  options: ViewOptions = { energyBars: false };
  width = 0;
  height = 0;
  dpr = 1;

  private ground: HTMLCanvasElement | null = null;
  private groundKey = -1;
  private trail: Array<{ x: number; y: number }> = [];
  private trailId = 0;
  private drawables: Drawable[] = [];
  private prune = 0;
  private hits: Array<{ id: number; x: number; y: number; r: number; d: number }> = [];

  private inner0 = makeRing();
  private inner1 = makeRing();
  private outer1 = makeRing();
  private wallMid = makeRing();
  private wallBottom = makeRing();

  resize(width: number, height: number, dpr: number, radius: number) {
    this.width = width;
    this.height = height;
    this.dpr = dpr;
    this.cam.setViewport(width, height, radius);
  }

  pick(x: number, y: number): number {
    let best = 0;
    let bestScore = Infinity;
    for (const h of this.hits) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d > h.r + 6) continue;
      const score = d / h.r + h.d * 0.0005;
      if (score < bestScore) {
        bestScore = score;
        best = h.id;
      }
    }
    return best;
  }

  render(ctx: CanvasRenderingContext2D, sim: Simulator, dt: number) {
    const world = sim.world;
    const cam = this.cam;
    const dpr = this.dpr;
    const animDt = Math.min(dt, 0.05);
    this.clock += animDt;

    if (this.groundKey !== sim.worldVersion) {
      this.ground = makeGround(world);
      this.groundKey = sim.worldVersion;
      this.anims.clear();
      this.particles.list.length = 0;
      this.selectedId = 0;
      this.trail = [];
      cam.setViewport(this.width, this.height, world.radius);
    }

    this.consumeEvents(sim);
    this.particles.update(animDt);

    // per-blob animation state
    const alpha = sim.alpha;
    for (const b of world.blobs) {
      let a = this.anims.get(b.id);
      if (!a) {
        a = makeAnim(b);
        this.anims.set(b.id, a);
      }
      updateAnim(b, a, animDt, alpha);
    }
    if (++this.prune > 90) {
      this.prune = 0;
      const live = new Set(world.blobs.map((b) => b.id));
      for (const id of this.anims.keys()) if (!live.has(id)) this.anims.delete(id);
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.width, this.height);

    const R = world.radius;
    this.buildRings(R);

    this.drawTableShadow(ctx, R);
    this.drawOuterWall(ctx, true);
    this.drawGround(ctx, R);
    this.drawInnerWall(ctx);
    this.drawRimTop(ctx, false);

    // shadows on the meadow
    this.withGround(ctx, () => {
      for (const t of world.trees) {
        ctx.fillStyle = 'rgba(30,70,25,0.10)';
        ctx.beginPath();
        ctx.ellipse(t.x + 0.6, t.y - 0.2, 3.3 * t.scale, 2.7 * t.scale, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = 'rgba(30,70,25,0.16)';
        ctx.beginPath();
        ctx.ellipse(t.x + 0.4, t.y - 0.1, 2.4 * t.scale, 1.95 * t.scale, 0, 0, TAU);
        ctx.fill();
      }
      for (const b of world.blobs) {
        const a = this.anims.get(b.id);
        if (a) drawShadow(ctx, b, a, b.kind === 'blue');
      }
      this.drawSelectionGround(ctx, world.blobs);
    });

    // depth sorted scene
    const list = this.drawables;
    list.length = 0;
    for (const t of world.trees) list.push({ depth: cam.depthOf(t.x, t.y) - 0.7, tree: t, blob: null });
    for (const b of world.blobs) {
      const a = this.anims.get(b.id)!;
      list.push({ depth: cam.depthOf(a.gx, a.gy), tree: null, blob: b });
    }
    list.sort((p, q) => q.depth - p.depth);

    this.hits.length = 0;
    const params = sim.params;
    for (const d of list) {
      if (d.tree) {
        drawTree(ctx, cam, d.tree, this.clock);
      } else if (d.blob) {
        const b = d.blob;
        const a = this.anims.get(b.id)!;
        const thr = b.kind === 'blue' ? params.blueCopy : params.redCopy;
        const hi = b.id === this.hoverId ? 0.7 : 0;
        drawBlob(ctx, cam, b, a, this.clock, thr, hi);
        if (!b.dead) this.hits.push({ id: b.id, x: a.sx, y: a.sy, r: a.radius, d: d.depth });
        if (this.options.energyBars || b.id === this.selectedId) this.drawEnergyBar(ctx, b, a, thr);
      }
    }

    this.particles.draw(ctx, cam);
    this.drawRimTop(ctx, true);
    this.drawSelectionTag(ctx, world.blobs);
  }

  /* ------------------------------ events ------------------------------ */

  private consumeEvents(sim: Simulator) {
    const world = sim.world;
    const events = world.events;
    if (!events.length) return;
    const fast = sim.params.speed > 8;
    const ps = this.particles;
    for (const e of events) this.spawn(e, ps, fast);
    events.length = 0;
  }

  private spawn(e: SimEvent, ps: Particles, fast: boolean) {
    const many = ps.list.length > 140;
    switch (e.type) {
      case 'eat':
        ps.burst(e.x, e.y, e.z + 0.4, 5, '#d8ff7a', 2.1, 0.3);
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * TAU;
          ps.add({
            type: 'crumb',
            x: e.x,
            y: e.y,
            z: e.z + 0.4,
            vx: Math.cos(a) * 1.4,
            vy: Math.sin(a) * 1.4,
            vz: 2 + Math.random() * 1.5,
            g: 9,
            life: 0.9,
            size: 0.08,
            color: '#7fcf4a',
          });
        }
        if (!many && !fast) ps.add({ type: 'text', x: e.x, y: e.y, z: e.z + 1.3, vz: 1.3, life: 1.1, size: 0.62, color: '#2f9a34', text: `+${Math.round(e.amount)}` });
        break;
      case 'contact':
        ps.add({ type: 'ring', x: e.x, y: e.y, z: 0.05, life: 0.8, size: 1.6, color: 'rgba(255,90,120,0.9)' });
        for (let i = 0; i < 3; i++) {
          ps.add({
            type: 'heart',
            x: e.x,
            y: e.y,
            z: e.z + 0.8,
            vx: (Math.random() - 0.5) * 1.4,
            vy: (Math.random() - 0.5) * 1.4,
            vz: 1.5 + Math.random(),
            life: 1.1,
            size: 0.3,
            color: '#ff6f9a',
          });
        }
        if (!many && !fast) ps.add({ type: 'text', x: e.x, y: e.y, z: e.z + 1.6, vz: 1.2, life: 1.2, size: 0.62, color: '#d9294f', text: `+${Math.round(e.amount)}` });
        break;
      case 'drain':
        ps.burst(e.x, e.y, e.z + 0.3, 4, '#a8d4ff', 1.8, 0.28);
        if (!many && !fast) ps.add({ type: 'text', x: e.x, y: e.y, z: e.z + 0.9, vz: 1.1, life: 1.0, size: 0.56, color: '#2a62d6', text: `-${Math.round(e.amount)}` });
        break;
      case 'birth':
        ps.add({ type: 'ring', x: e.x, y: e.y, z: 0.05, life: 1.0, size: 2.0, color: e.kind === 'blue' ? 'rgba(90,160,255,0.9)' : 'rgba(255,100,130,0.9)' });
        for (let i = 0; i < 4; i++) {
          ps.add({
            type: 'heart',
            x: e.x,
            y: e.y,
            z: e.z + 0.6,
            vx: (Math.random() - 0.5) * 2,
            vy: (Math.random() - 0.5) * 2,
            vz: 1.8 + Math.random() * 1.2,
            life: 1.3,
            size: 0.34,
            color: e.kind === 'blue' ? '#7fb4ff' : '#ff8aa7',
          });
        }
        ps.burst(e.x, e.y, e.z + 0.5, 6, '#fff3a0', 2.4, 0.36);
        break;
      case 'die':
        ps.burst(e.x, e.y, e.z, 5, e.kind === 'blue' ? '#cfe2ff' : '#ffd0d8', 1.6, 0.34);
        if (!many && !fast) {
          ps.add({ type: 'zzz', x: e.x, y: e.y, z: e.z + 1, vz: 0.9, life: 1.2, size: 0.6, color: '#7c86a8', spin: 4 });
        }
        break;
      case 'ripe':
        if (!many && !fast) ps.add({ type: 'spark', x: e.x, y: e.y, z: e.z + 1.6, vz: 0.5, life: 0.9, size: 0.28, color: '#f4ff9c', rot: 0.5, spin: 2 });
        break;
    }
  }

  /* ------------------------------ helpers ----------------------------- */

  private withGround(ctx: CanvasRenderingContext2D, fn: () => void) {
    const m = this.cam.groundMatrix();
    const d = this.dpr;
    ctx.save();
    ctx.setTransform(m[0] * d, m[1] * d, m[2] * d, m[3] * d, m[4] * d, m[5] * d);
    fn();
    ctx.restore();
  }

  private buildRings(R: number) {
    const cam = this.cam;
    const Rout = R + 1.15;
    const Rb = R + 0.75;
    for (let i = 0; i <= SEGMENTS; i++) {
      const a = (i / SEGMENTS) * TAU;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      cam.project(ca * R, sa * R, 0, pt);
      this.inner0.x[i] = pt.x;
      this.inner0.y[i] = pt.y;
      cam.project(ca * R, sa * R, RIM_TOP, pt);
      this.inner1.x[i] = pt.x;
      this.inner1.y[i] = pt.y;
      cam.project(ca * Rout, sa * Rout, RIM_TOP, pt);
      this.outer1.x[i] = pt.x;
      this.outer1.y[i] = pt.y;
      cam.project(ca * (Rout - 0.05), sa * (Rout - 0.05), RIM_TOP - 0.85, pt);
      this.wallMid.x[i] = pt.x;
      this.wallMid.y[i] = pt.y;
      cam.project(ca * Rb, sa * Rb, -WALL_DEPTH, pt);
      this.wallBottom.x[i] = pt.x;
      this.wallBottom.y[i] = pt.y;
    }
  }

  /** How much the outside of segment i faces the viewer (positive = front half). */
  private facing(i: number) {
    const a = ((i + 0.5) / SEGMENTS) * TAU;
    return Math.cos(a) * this.cam.viewX + Math.sin(a) * this.cam.viewY;
  }

  private quad(ctx: CanvasRenderingContext2D, ra: Ring, rb: Ring, i: number) {
    ctx.beginPath();
    ctx.moveTo(ra.x[i], ra.y[i]);
    ctx.lineTo(ra.x[i + 1], ra.y[i + 1]);
    ctx.lineTo(rb.x[i + 1], rb.y[i + 1]);
    ctx.lineTo(rb.x[i], rb.y[i]);
    ctx.closePath();
  }

  private lambert(i: number) {
    const a = ((i + 0.5) / SEGMENTS) * TAU + this.cam.yaw;
    // light comes from the front-left of the screen
    return Math.max(0, Math.cos(a) * -0.55 + Math.sin(a) * -0.83);
  }

  private drawTableShadow(ctx: CanvasRenderingContext2D, R: number) {
    const cam = this.cam;
    cam.project(0.5, -0.6, -WALL_DEPTH - 0.2, pt);
    const rx = (R + 2.6) * cam.scale;
    ctx.save();
    ctx.translate(pt.x, pt.y);
    ctx.scale(1, Math.sin(cam.pitch));
    const g = ctx.createRadialGradient(0, 0, rx * 0.7, 0, 0, rx);
    g.addColorStop(0, 'rgba(60,45,30,0.32)');
    g.addColorStop(1, 'rgba(60,45,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, rx, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  private drawOuterWall(ctx: CanvasRenderingContext2D, front: boolean) {
    for (let i = 0; i < SEGMENTS; i++) {
      const f = this.facing(i);
      if (front ? f < -0.2 : f > 0.2) continue;
      const lam = this.lambert(i);
      const vis = clamp(0.35 + 0.65 * Math.abs(f), 0, 1);
      this.quad(ctx, this.outer1, this.wallMid, i);
      ctx.fillStyle = hsl(22, 60, 74 + lam * 8);
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.6;
      ctx.stroke();
      this.quad(ctx, this.wallMid, this.wallBottom, i);
      ctx.fillStyle = hsl(18, 58, 44 + lam * 18 + vis * 6);
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    }
    // soft ambient darkening near the bottom edge
    ctx.strokeStyle = 'rgba(80,40,20,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= SEGMENTS; i++) {
      const f = this.facing(Math.min(i, SEGMENTS - 1));
      if (f < -0.05) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(this.wallBottom.x[i], this.wallBottom.y[i]);
        started = true;
      } else ctx.lineTo(this.wallBottom.x[i], this.wallBottom.y[i]);
    }
    ctx.stroke();
  }

  private drawGround(ctx: CanvasRenderingContext2D, R: number) {
    if (!this.ground) return;
    const cam = this.cam;
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i <= SEGMENTS; i++) {
      if (i === 0) ctx.moveTo(this.inner0.x[i], this.inner0.y[i]);
      else ctx.lineTo(this.inner0.x[i], this.inner0.y[i]);
    }
    ctx.closePath();
    ctx.clip();
    const m = cam.groundMatrix();
    const d = this.dpr;
    ctx.setTransform(m[0] * d, m[1] * d, m[2] * d, m[3] * d, m[4] * d, m[5] * d);
    ctx.drawImage(this.ground, -R, -R, R * 2, R * 2);
    ctx.restore();
  }

  private drawInnerWall(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < SEGMENTS; i++) {
      const f = this.facing(i);
      if (f > 0.05) continue;
      const lam = this.lambert(i + SEGMENTS / 2);
      this.quad(ctx, this.inner0, this.inner1, i);
      ctx.fillStyle = hsl(28, 42, 52 + lam * 10);
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
  }

  private drawRimTop(ctx: CanvasRenderingContext2D, front: boolean) {
    for (let i = 0; i < SEGMENTS; i++) {
      const f = this.facing(i);
      if (front ? f < 0.0 : f >= 0.0) continue;
      const lam = this.lambert(i);
      this.quad(ctx, this.inner1, this.outer1, i);
      ctx.fillStyle = hsl(40, 70, 90 + lam * 4);
      ctx.fill();
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }
    // crisp outlines
    ctx.strokeStyle = 'rgba(120,80,50,0.4)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i <= SEGMENTS; i++) {
      const f = this.facing(Math.min(i, SEGMENTS - 1));
      const on = front ? f >= 0 : f < 0;
      if (!on) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(this.outer1.x[i], this.outer1.y[i]);
        started = true;
      } else ctx.lineTo(this.outer1.x[i], this.outer1.y[i]);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(120,80,50,0.28)';
    ctx.beginPath();
    started = false;
    for (let i = 0; i <= SEGMENTS; i++) {
      const f = this.facing(Math.min(i, SEGMENTS - 1));
      const on = front ? f >= 0 : f < 0;
      if (!on) {
        started = false;
        continue;
      }
      if (!started) {
        ctx.moveTo(this.inner1.x[i], this.inner1.y[i]);
        started = true;
      } else ctx.lineTo(this.inner1.x[i], this.inner1.y[i]);
    }
    ctx.stroke();
  }

  private drawSelectionGround(ctx: CanvasRenderingContext2D, blobs: Blob[]) {
    if (!this.selectedId) {
      this.trail = [];
      return;
    }
    const b = blobs.find((x) => x.id === this.selectedId);
    const a = b ? this.anims.get(b.id) : undefined;
    if (!b || !a) return;
    if (this.trailId !== b.id) {
      this.trailId = b.id;
      this.trail = [];
    }
    const last = this.trail[this.trail.length - 1];
    if (!last || Math.hypot(last.x - a.gx, last.y - a.gy) > 0.35) {
      this.trail.push({ x: a.gx, y: a.gy });
      if (this.trail.length > 34) this.trail.shift();
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < this.trail.length; i++) {
      const k = i / this.trail.length;
      ctx.strokeStyle = b.kind === 'blue' ? `rgba(60,120,255,${0.55 * k})` : `rgba(235,60,90,${0.55 * k})`;
      ctx.lineWidth = 0.12 + 0.2 * k;
      ctx.beginPath();
      ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
      ctx.lineTo(this.trail[i].x, this.trail[i].y);
      ctx.stroke();
    }
    const r = 2.3 * a.scale + Math.sin(this.clock * 4) * 0.08;
    ctx.setLineDash([0.5, 0.42]);
    ctx.lineDashOffset = -this.clock * 1.6;
    ctx.lineWidth = 0.22;
    ctx.strokeStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(a.gx, a.gy, r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 0.08;
    ctx.strokeStyle = b.kind === 'blue' ? 'rgba(30,80,200,0.7)' : 'rgba(190,30,60,0.7)';
    ctx.beginPath();
    ctx.arc(a.gx, a.gy, r + 0.14, 0, TAU);
    ctx.stroke();
  }

  private drawSelectionTag(ctx: CanvasRenderingContext2D, blobs: Blob[]) {
    if (!this.selectedId) return;
    const b = blobs.find((x) => x.id === this.selectedId);
    const a = b ? this.anims.get(b.id) : undefined;
    if (!b || !a || b.dead) return;
    const y = a.sy - a.radius * 1.9 - 12 + Math.sin(this.clock * 4) * 2;
    ctx.fillStyle = b.kind === 'blue' ? '#2d6cf0' : '#e0304f';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(a.sx - 6, y - 6);
    ctx.lineTo(a.sx + 6, y - 6);
    ctx.lineTo(a.sx, y + 3);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
  }

  private drawEnergyBar(ctx: CanvasRenderingContext2D, b: Blob, a: Anim, thr: number) {
    if (b.dead) return;
    const w = Math.max(20, this.cam.scale * 1.7);
    const h = 4;
    const x = a.sx - w / 2;
    const y = a.sy - a.radius * 1.55 - 8;
    const k = clamp(b.energy / thr, 0, 1);
    ctx.fillStyle = 'rgba(20,30,50,0.55)';
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, w + 2, h + 2, 3);
    ctx.fill();
    ctx.fillStyle = k > 0.55 ? '#59d36a' : k > 0.28 ? '#ffc94a' : '#ff6b5d';
    ctx.beginPath();
    ctx.roundRect(x, y, Math.max(2, w * k), h, 2);
    ctx.fill();
  }
}
