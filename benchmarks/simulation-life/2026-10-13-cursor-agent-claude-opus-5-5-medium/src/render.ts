import {
  FRUIT_GROWING,
  FRUIT_RIPE,
  MAX_SLOTS,
  mulberry32,
  type Blob,
  type Kind,
  type Sim,
  type SimEvent,
  type Tree,
} from "./sim";

type ParticleKind = "spark" | "heart" | "puff" | "ring" | "zzz" | "leaf";

interface Particle {
  kind: ParticleKind;
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
  spin: number;
}

interface Ghost {
  kind: Kind;
  x: number;
  y: number;
  r: number;
  seed: number;
  t: number;
  max: number;
  mode: "pop" | "fade";
}

interface Decor {
  x: number;
  y: number;
  kind: "tuft" | "flower" | "pebble" | "clover";
  color: string;
  size: number;
  rot: number;
}

interface Hit {
  id: number;
  x: number;
  y: number;
  r: number;
}

const PALETTE = {
  blue: { light: "#bfe6ff", mid: "#4a9ff0", dark: "#1f5bb8", ear: "#2d6fd0", line: "rgba(16,48,110,0.55)" },
  red: { light: "#ffd0c4", mid: "#f0574f", dark: "#a82231", ear: "#c93440", line: "rgba(110,16,26,0.55)" },
};

/** Canopy-local fruit positions, in units of tree size (x right, y up from canopy centre). */
const FRUIT_SPOTS: [number, number][] = [
  [-0.55, 0.05],
  [0.5, 0.2],
  [0.05, -0.45],
  [-0.2, 0.55],
  [0.75, -0.25],
  [-0.8, -0.3],
  [0.3, 0.7],
  [-0.5, -0.65],
  [0.4, -0.75],
  [-0.05, 0.15],
];

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

/** Characters and trees are drawn larger than their footprint so they read as toys on a big dish. */
const TOY_BLOB = 0.95;
const TOY_TREE = 1.35;

export class WorldView {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  dpr = 1;
  yaw = -0.55;
  pitch = 0.8;
  zoom = 1;
  selected: number | null = null;
  hovered: number | null = null;
  clock = 0;
  private particles: Particle[] = [];
  private ghosts: Ghost[] = [];
  private decor: Decor[] = [];
  private decorKey = "";
  private hits: Hit[] = [];
  private scale = 10;
  private cx = 0;
  private cy = 0;
  private sq = 0.8;
  private hf = 0.6;
  private rng = mulberry32(99);

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(10, r.width);
    this.h = Math.max(10, r.height);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  clearEffects() {
    this.particles = [];
    this.ghosts = [];
  }

  private layout(R: number) {
    this.sq = Math.sin(this.pitch);
    this.hf = Math.cos(this.pitch);
    const outer = R + 1.4;
    const byW = (this.w * 0.94) / (2 * outer);
    const byH = (this.h * 0.86) / (2 * outer * this.sq + 4 * this.hf + 2.6);
    this.scale = Math.min(byW, byH) * this.zoom;
    this.cx = this.w / 2;
    this.cy = this.h * 0.54 + 1.2 * this.scale * this.hf;
  }

  project(x: number, y: number, z = 0): [number, number, number] {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    const rx = x * c - y * s;
    const ry = x * s + y * c;
    return [this.cx + rx * this.scale, this.cy + ry * this.scale * this.sq - z * this.scale * this.hf, ry];
  }

  /** Screen-space direction of a world heading. */
  private screenDir(a: number): [number, number] {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const rx = dx * c - dy * s;
    const ry = (dx * s + dy * c) * this.sq;
    const m = Math.hypot(rx, ry) || 1;
    return [rx / m, ry / m];
  }

  hitTest(px: number, py: number): number | null {
    let best: number | null = null;
    let bestD = Infinity;
    for (const h of this.hits) {
      const d = Math.hypot(h.x - px, h.y - py);
      if (d < h.r * 1.5 + 4 && d < bestD) {
        bestD = d;
        best = h.id;
      }
    }
    return best;
  }

  onEvents(events: SimEvent[], sim: Sim) {
    const budget = this.particles.length > 500 ? 0.25 : 1;
    for (const e of events) {
      if (this.rng() > budget) continue;
      if (e.type === "eat") {
        const t = sim.trees[e.tree!];
        const [fx, fy] = FRUIT_SPOTS[e.slot!];
        const tx = t.x + fx * 0.6 * t.size;
        const ty = t.y;
        for (let i = 0; i < 6; i++) this.spawn("spark", tx, ty, 2.6 * t.size + fy, "#b8f55f", 0.9, 0.18);
        this.spawn("leaf", tx, ty, 2.3 * t.size, "#6cc04a", 1.4, 0.2);
      } else if (e.type === "tag") {
        for (let i = 0; i < 7; i++) this.spawn("puff", e.x, e.y, 0.6, "#9fd0ff", 0.7, 0.35);
        for (let i = 0; i < 4; i++) this.spawn("heart", e.x, e.y, 1.2, "#ff7a90", 1.1, 0.3);
        if (e.blob) this.ghosts.push({ kind: "blue", x: e.x, y: e.y, r: 0.55, seed: e.blob.seed, t: 0, max: 0.35, mode: "pop" });
      } else if (e.type === "birth") {
        this.spawn("ring", e.x, e.y, 0, e.kind === "blue" ? "#7cc0ff" : "#ff8a80", 0.7, 0.4);
        for (let i = 0; i < 4; i++) this.spawn("spark", e.x, e.y, 1, "#fff6b0", 0.7, 0.14);
      } else if (e.type === "fade" && e.blob) {
        this.ghosts.push({ kind: e.kind, x: e.x, y: e.y, r: 0.5, seed: e.blob.seed, t: 0, max: 1.3, mode: "fade" });
      }
    }
  }

  private spawn(kind: ParticleKind, x: number, y: number, z: number, color: string, life: number, size: number) {
    if (this.particles.length > 700) return;
    const a = this.rng() * Math.PI * 2;
    const sp = kind === "puff" ? 1.6 : kind === "spark" ? 1.4 : 0.5;
    this.particles.push({
      kind,
      x,
      y,
      z,
      vx: Math.cos(a) * sp * (0.4 + this.rng()),
      vy: Math.sin(a) * sp * (0.4 + this.rng()),
      vz: kind === "leaf" ? -0.6 : kind === "ring" ? 0 : 1 + this.rng() * 1.5,
      life: 0,
      max: life * (0.75 + this.rng() * 0.5),
      color,
      size,
      spin: this.rng() * 6,
    });
  }

  update(dt: number, sim: Sim, speed: number) {
    this.clock += dt;
    const k = clamp(speed, 0.5, 3);
    for (const p of this.particles) {
      p.life += dt * k;
      p.x += p.vx * dt * k;
      p.y += p.vy * dt * k;
      p.z += p.vz * dt * k;
      if (p.kind === "spark" || p.kind === "puff") p.vz -= 2 * dt * k;
      if (p.kind === "leaf") {
        p.vx += Math.sin(this.clock * 3 + p.spin) * dt;
        if (p.z < 0) p.z = 0;
      }
      if (p.kind === "zzz") {
        p.vx = Math.sin(this.clock * 2 + p.spin) * 0.3;
      }
    }
    this.particles = this.particles.filter((p) => p.life < p.max);
    for (const g of this.ghosts) g.t += dt * k;
    this.ghosts = this.ghosts.filter((g) => g.t < g.max);

    // Sleepy reds puff little z's.
    if (this.particles.length < 400) {
      for (const b of sim.blobs) {
        if (b.action === "dozing" && this.rng() < dt * 0.5) this.spawn("zzz", b.x, b.y, 1.8, "#6b5b8a", 2, 0.35);
      }
    }
  }

  private buildDecor(sim: Sim) {
    const key = `${sim.p.seed}:${sim.radius}:${sim.trees.length}`;
    if (key === this.decorKey) return;
    this.decorKey = key;
    const rng = mulberry32(Math.floor(sim.p.seed) * 31 + 5);
    const R = sim.radius;
    const n = Math.round(R * R * 0.35);
    this.decor = [];
    const flowers = ["#ffffff", "#ffd84d", "#ff9ec7", "#c9a8ff", "#ffb36b"];
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2;
      const d = Math.sqrt(rng()) * (R - 0.8);
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const roll = rng();
      const kind: Decor["kind"] = roll < 0.55 ? "tuft" : roll < 0.75 ? "flower" : roll < 0.87 ? "pebble" : "clover";
      this.decor.push({
        x,
        y,
        kind,
        color: kind === "flower" ? flowers[Math.floor(rng() * flowers.length)] : "",
        size: 0.5 + rng() * 0.7,
        rot: rng() * Math.PI,
      });
    }
  }

  draw(sim: Sim, alpha: number) {
    const ctx = this.ctx;
    const R = sim.radius;
    this.layout(R);
    this.buildDecor(sim);
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.hits = [];

    this.drawDish(R);
    this.drawDecor();

    const s = this.scale;
    const lerpPos = (b: Blob): [number, number] => [b.px + (b.x - b.px) * alpha, b.py + (b.y - b.py) * alpha];

    // Ground layer: shadows, selection rings, vision ranges.
    for (const t of sim.trees) {
      const [sx, sy] = this.project(t.x, t.y);
      ctx.fillStyle = "rgba(30,70,25,0.22)";
      ctx.beginPath();
      const ts = s * t.size * TOY_TREE;
      ctx.ellipse(sx + 0.35 * ts, sy + 0.1 * ts, 1.45 * ts, 1.45 * ts * this.sq, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const sel = this.selected !== null ? sim.findBlob(this.selected) : null;
    if (sel) {
      const [x, y] = lerpPos(sel);
      const [sx, sy] = this.project(x, y);
      const vr = sim.visionOf(sel) * s;
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -this.clock * 12;
      ctx.strokeStyle = sel.kind === "blue" ? "rgba(40,110,220,0.55)" : "rgba(220,50,60,0.55)";
      ctx.fillStyle = sel.kind === "blue" ? "rgba(80,150,255,0.08)" : "rgba(255,90,90,0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(sx, sy, vr, vr * this.sq, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (sel.tgtOn) {
        const [tx, ty] = this.project(sel.tgtX, sel.tgtY);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      }
      ctx.restore();
    }

    for (const b of sim.blobs) {
      const [x, y] = lerpPos(b);
      const [sx, sy] = this.project(x, y);
      const r = this.blobRadius(b, sim);
      ctx.fillStyle = "rgba(25,60,20,0.25)";
      ctx.beginPath();
      ctx.ellipse(sx + r * 0.15, sy + r * 0.05, r * 0.95, r * 0.95 * this.sq * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      if (b.id === this.selected || b.id === this.hovered) {
        const pulse = 1.25 + Math.sin(this.clock * 5) * 0.08;
        ctx.strokeStyle = b.id === this.selected ? "#fff7d6" : "rgba(255,255,255,0.6)";
        ctx.lineWidth = b.id === this.selected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.ellipse(sx, sy, r * pulse, r * pulse * this.sq * 0.6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Depth-sorted objects.
    type Item = { d: number; fn: () => void };
    const items: Item[] = [];
    for (const t of sim.trees) {
      const [, , d] = this.project(t.x, t.y);
      items.push({ d, fn: () => this.drawTree(t, sim) });
    }
    for (const b of sim.blobs) {
      const [x, y] = lerpPos(b);
      const [, , d] = this.project(x, y);
      items.push({ d: d + 0.01, fn: () => this.drawBlob(b, x, y, sim) });
    }
    for (const g of this.ghosts) {
      const [, , d] = this.project(g.x, g.y);
      items.push({ d, fn: () => this.drawGhost(g) });
    }
    items.sort((a, b) => a.d - b.d);
    for (const it of items) it.fn();

    this.drawParticles();
  }

  private drawDish(R: number) {
    const ctx = this.ctx;
    const s = this.scale;
    const sq = this.sq;
    const cx = this.cx;
    const cy = this.cy;
    const rim = 1.25;
    const thick = 2.4 * s * this.hf + 6;
    const outer = (R + rim) * s;

    // Table shadow.
    const sh = ctx.createRadialGradient(cx, cy + thick + 6, outer * 0.3, cx, cy + thick + 6, outer * 1.15);
    sh.addColorStop(0, "rgba(90,60,30,0.28)");
    sh.addColorStop(1, "rgba(90,60,30,0)");
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.ellipse(cx, cy + thick + 6, outer * 1.15, outer * 1.15 * sq, 0, 0, Math.PI * 2);
    ctx.fill();

    // Side wall.
    const side = ctx.createLinearGradient(cx - outer, 0, cx + outer, 0);
    side.addColorStop(0, "#9a5a35");
    side.addColorStop(0.35, "#d68a55");
    side.addColorStop(0.6, "#c47643");
    side.addColorStop(1, "#7e4426");
    ctx.fillStyle = side;
    ctx.beginPath();
    ctx.ellipse(cx, cy + thick, outer, outer * sq, 0, 0, Math.PI);
    ctx.lineTo(cx - outer, cy);
    ctx.ellipse(cx, cy, outer, outer * sq, 0, Math.PI, 0, true);
    ctx.closePath();
    ctx.fill();
    // Painted band on the pot.
    ctx.strokeStyle = "rgba(255,235,200,0.35)";
    ctx.lineWidth = Math.max(1.5, thick * 0.12);
    ctx.beginPath();
    ctx.ellipse(cx, cy + thick * 0.55, outer, outer * sq, 0, 0, Math.PI);
    ctx.stroke();

    // Rim top.
    const rimG = ctx.createLinearGradient(0, cy - outer * sq, 0, cy + outer * sq);
    rimG.addColorStop(0, "#f6c99a");
    rimG.addColorStop(1, "#e3a06b");
    ctx.fillStyle = rimG;
    ctx.beginPath();
    ctx.ellipse(cx, cy, outer, outer * sq, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rim studs rotate with the world so spinning reads clearly.
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const [x, y] = this.project(Math.cos(a) * (R + rim * 0.55), Math.sin(a) * (R + rim * 0.55));
      ctx.fillStyle = i % 3 === 0 ? "rgba(255,248,230,0.85)" : "rgba(170,95,50,0.35)";
      ctx.beginPath();
      ctx.ellipse(x, y, s * 0.18, s * 0.18 * sq, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Soil lip and lawn.
    ctx.fillStyle = "#7a5233";
    ctx.beginPath();
    ctx.ellipse(cx, cy, R * s + 2, (R * s + 2) * sq, 0, 0, Math.PI * 2);
    ctx.fill();
    const lawn = ctx.createRadialGradient(cx - R * s * 0.3, cy - R * s * sq * 0.4, R * s * 0.1, cx, cy, R * s * 1.05);
    lawn.addColorStop(0, "#b6ec8a");
    lawn.addColorStop(0.55, "#8fd36c");
    lawn.addColorStop(1, "#5fae4f");
    ctx.fillStyle = lawn;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1.5, R * s, R * s * sq, 0, 0, Math.PI * 2);
    ctx.fill();
    // Inner shading near the far rim.
    const inner = ctx.createLinearGradient(0, cy - R * s * sq, 0, cy - R * s * sq * 0.6);
    inner.addColorStop(0, "rgba(40,80,30,0.35)");
    inner.addColorStop(1, "rgba(40,80,30,0)");
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.ellipse(cx, cy + 1.5, R * s, R * s * sq, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDecor() {
    const ctx = this.ctx;
    const s = this.scale;
    for (const d of this.decor) {
      const [x, y] = this.project(d.x, d.y);
      const z = d.size * s;
      if (d.kind === "tuft") {
        ctx.strokeStyle = "rgba(60,130,50,0.55)";
        ctx.lineWidth = Math.max(1, z * 0.12);
        ctx.beginPath();
        ctx.moveTo(x - z * 0.25, y - z * 0.45);
        ctx.lineTo(x, y);
        ctx.lineTo(x + z * 0.05, y - z * 0.55);
        ctx.moveTo(x, y);
        ctx.lineTo(x + z * 0.3, y - z * 0.4);
        ctx.stroke();
      } else if (d.kind === "flower") {
        ctx.fillStyle = d.color;
        const pr = z * 0.13;
        for (let i = 0; i < 5; i++) {
          const a = d.rot + (i / 5) * Math.PI * 2;
          ctx.beginPath();
          ctx.ellipse(x + Math.cos(a) * pr, y + Math.sin(a) * pr * this.sq, pr, pr * this.sq, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#ffcf3a";
        ctx.beginPath();
        ctx.ellipse(x, y, pr * 0.8, pr * 0.8 * this.sq, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (d.kind === "pebble") {
        ctx.fillStyle = "rgba(200,195,180,0.9)";
        ctx.beginPath();
        ctx.ellipse(x, y, z * 0.28, z * 0.28 * this.sq * 0.75, d.rot, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.beginPath();
        ctx.ellipse(x - z * 0.08, y - z * 0.06, z * 0.08, z * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "rgba(170,230,120,0.45)";
        ctx.beginPath();
        ctx.ellipse(x, y, z * 0.9, z * 0.9 * this.sq, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawTree(t: Tree, sim: Sim) {
    const ctx = this.ctx;
    const [sx, sy] = this.project(t.x, t.y);
    const u = this.scale * t.size * TOY_TREE;
    const lift = 0.45 + 0.55 * this.hf;
    const sway = Math.sin(this.clock * 1.3 + t.id * 1.7) * 0.04 * u;

    // Trunk.
    const th = 1.7 * u * lift;
    const tw = 0.36 * u;
    const tg = ctx.createLinearGradient(sx - tw, 0, sx + tw, 0);
    tg.addColorStop(0, "#7a4a2a");
    tg.addColorStop(0.5, "#a96b3d");
    tg.addColorStop(1, "#6a3d22");
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.moveTo(sx - tw * 0.6, sy);
    ctx.quadraticCurveTo(sx - tw * 0.35, sy - th * 0.5, sx - tw * 0.3 + sway, sy - th);
    ctx.lineTo(sx + tw * 0.3 + sway, sy - th);
    ctx.quadraticCurveTo(sx + tw * 0.35, sy - th * 0.5, sx + tw * 0.6, sy);
    ctx.closePath();
    ctx.fill();

    // Canopy lumps.
    const ccx = sx + sway * 2;
    const ccy = sy - th - 0.75 * u;
    const h = t.hue;
    const lumps: [number, number, number][] = [
      [-0.62, 0.18, 0.72],
      [0.62, 0.18, 0.72],
      [0, 0.32, 0.8],
      [-0.35, -0.38, 0.72],
      [0.38, -0.36, 0.7],
      [0, -0.05, 0.85],
    ];
    ctx.fillStyle = `hsl(${h}, 42%, 26%)`;
    for (const [lx, ly, lr] of lumps) {
      ctx.beginPath();
      ctx.arc(ccx + lx * u, ccy + ly * u + 0.08 * u, lr * u, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const [lx, ly, lr] of lumps) {
      const gx = ccx + lx * u;
      const gy = ccy + ly * u;
      const g = ctx.createRadialGradient(gx - lr * u * 0.35, gy - lr * u * 0.45, lr * u * 0.1, gx, gy, lr * u);
      g.addColorStop(0, `hsl(${h}, 55%, 52%)`);
      g.addColorStop(1, `hsl(${h}, 48%, 33%)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(gx, gy, lr * u * 0.93, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fruit, hanging on the canopy.
    const lim = Math.round(sim.p.fruitLimit);
    for (let i = 0; i < Math.min(lim, MAX_SLOTS); i++) {
      const slot = t.slots[i];
      const [fx, fy] = FRUIT_SPOTS[i];
      const x = ccx + fx * u;
      const y = ccy - fy * u + Math.sin(this.clock * 2 + i) * 0.03 * u;
      const since = sim.time - slot.eatenAt;
      let k = 0;
      let ripe = false;
      if (slot.state === FRUIT_RIPE) {
        k = 1;
        ripe = true;
      } else if (slot.state === FRUIT_GROWING) {
        k = 0.15 + slot.t * 0.7;
      }
      if (since >= 0 && since < 0.45 && slot.state !== FRUIT_RIPE) {
        // Picked fruit shrinks away.
        const f = since / 0.45;
        this.drawFruit(x, y, 0.24 * u * (1 + f * 0.3) * (1 - f), true, 1 - f);
        continue;
      }
      if (k <= 0) {
        ctx.fillStyle = `hsla(${h}, 40%, 22%, 0.8)`;
        ctx.beginPath();
        ctx.arc(x, y - 0.15 * u, Math.max(1, 0.04 * u), 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      this.drawFruit(x, y, 0.24 * u * k, ripe, ripe ? 1 : 0.85);
    }
  }

  private drawFruit(x: number, y: number, r: number, ripe: boolean, a: number) {
    if (r < 0.5) return;
    const ctx = this.ctx;
    ctx.globalAlpha = a;
    ctx.strokeStyle = "rgba(60,40,20,0.7)";
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.beginPath();
    ctx.moveTo(x, y - r * 0.8);
    ctx.lineTo(x + r * 0.15, y - r * 1.35);
    ctx.stroke();
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    if (ripe) {
      g.addColorStop(0, "#f2ffb8");
      g.addColorStop(0.45, "#a6ec4c");
      g.addColorStop(1, "#4d9e24");
    } else {
      g.addColorStop(0, "#f4f9dc");
      g.addColorStop(1, "#b9d88f");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (ripe) {
      ctx.strokeStyle = "rgba(30,70,15,0.55)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private blobRadius(b: Blob, sim: Sim) {
    const copy = b.kind === "blue" ? sim.p.blueCopy : sim.p.redCopy;
    const ef = clamp(b.energy / copy, 0, 1.1);
    const grow = clamp(0.55 + b.age / 0.8, 0.55, 1);
    return TOY_BLOB * this.scale * (0.82 + 0.3 * ef) * (b.kind === "red" ? 1.08 : 1) * grow;
  }

  private drawBlob(b: Blob, x: number, y: number, sim: Sim) {
    const ctx = this.ctx;
    const [sx, sy] = this.project(x, y);
    const r = this.blobRadius(b, sim);
    const v = Math.hypot(b.vx, b.vy);
    const moving = v > 0.35 && b.busy <= 0;
    const lift = 0.45 + 0.55 * this.hf;
    const phase = b.walk * 2.3;
    const hop = moving ? Math.abs(Math.sin(phase)) * r * 0.55 * Math.min(1, v / 2.2) * lift : 0;
    let stretch = moving ? 0.94 + 0.14 * Math.abs(Math.sin(phase)) : 1 + 0.03 * Math.sin(this.clock * 2.2 + b.seed * 6);
    if (b.action === "eating") stretch = 1 + Math.sin(this.clock * 15) * 0.06;
    if (b.action === "resting") stretch = 1 + Math.sin(this.clock * 6) * 0.05;
    if (b.action === "dozing") stretch = 0.92 + Math.sin(this.clock * 1.4 + b.seed * 5) * 0.03;
    const [dxs, dys] = this.screenDir(b.heading);
    const lean = moving ? clamp(dxs * v * 0.07, -0.32, 0.32) : 0;

    const w = r * 0.9 / Math.sqrt(stretch);
    const h = r * 1.12 * stretch;
    const by = sy - hop;
    this.hits.push({ id: b.id, x: sx, y: by - h, r: Math.max(w, h) });

    ctx.save();
    ctx.translate(sx, by);
    ctx.rotate(lean);

    const copy = b.kind === "blue" ? sim.p.blueCopy : sim.p.redCopy;
    const weak = b.energy < copy * 0.2;

    if (b.action === "resting") {
      const k = b.busyTotal > 0 ? b.busy / b.busyTotal : 0;
      const glow = ctx.createRadialGradient(0, -h, h * 0.4, 0, -h, h * 2.1);
      glow.addColorStop(0, `rgba(255,220,120,${0.55 * k + 0.15})`);
      glow.addColorStop(1, "rgba(255,220,120,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -h, h * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }
    if (b.action === "eating") {
      const glow = ctx.createRadialGradient(0, -h, h * 0.5, 0, -h, h * 1.8);
      glow.addColorStop(0, "rgba(200,255,140,0.45)");
      glow.addColorStop(1, "rgba(200,255,140,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, -h, h * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }

    if (weak) ctx.globalAlpha = 0.8;
    this.drawBody(b.kind, w, h);
    ctx.globalAlpha = 1;

    const back = dys < -0.8 && moving;
    if (!back) this.drawFace(b, w, h, dxs, dys);
    else {
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.ellipse(0, -h * 0.55, w * 0.35, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (b.hidden && b.kind === "blue") {
      // A leaf hat: this blob is sheltered under a canopy.
      ctx.fillStyle = "#58b443";
      ctx.strokeStyle = "#2f7a2a";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(w * 0.15, -h * 2.02, w * 0.42, w * 0.18, -0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    if (b.action === "eating") {
      const k = b.busyTotal > 0 ? b.busy / b.busyTotal : 0;
      const fr = w * 0.26 * k;
      if (fr > 0.6) {
        ctx.fillStyle = "#9be347";
        ctx.strokeStyle = "rgba(40,90,20,0.6)";
        ctx.beginPath();
        ctx.arc(dxs * w * 0.55, -h * 0.62, fr, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawBody(kind: Kind, w: number, h: number) {
    const ctx = this.ctx;
    const pal = PALETTE[kind];
    if (kind === "red") {
      ctx.fillStyle = pal.ear;
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(sgn * w * 0.55, -h * 1.78, w * 0.24, w * 0.3, sgn * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.strokeStyle = pal.dark;
      ctx.lineWidth = Math.max(1, w * 0.09);
      ctx.beginPath();
      ctx.moveTo(0, -h * 1.95);
      ctx.quadraticCurveTo(w * 0.1, -h * 2.25, w * 0.28, -h * 2.3);
      ctx.stroke();
      ctx.fillStyle = pal.mid;
      ctx.beginPath();
      ctx.arc(w * 0.3, -h * 2.3, w * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(-w * 0.35, -h * 1.45, h * 0.1, 0, -h, h * 1.25);
    g.addColorStop(0, pal.light);
    g.addColorStop(0.45, pal.mid);
    g.addColorStop(1, pal.dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -h, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = pal.line;
    ctx.lineWidth = 1;
    ctx.stroke();
    // Gloss.
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.ellipse(-w * 0.38, -h * 1.5, w * 0.3, h * 0.17, -0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.arc(-w * 0.12, -h * 1.72, w * 0.07, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawFace(b: Blob, w: number, h: number, dxs: number, dys: number) {
    const ctx = this.ctx;
    const fx = dxs * w * 0.3;
    const fy = -h * 1.08 + dys * h * 0.06;
    const ex = w * 0.3;
    const er = w * 0.17;
    const period = 2.8 + b.seed * 3.5;
    const blink = (this.clock + b.seed * 10) % period < 0.13;
    const a = b.action;
    const ink = "#1d2238";
    ctx.lineCap = "round";

    const happy = a === "eating" || a === "resting";
    const scared = a === "fleeing" || a === "running to cover";
    const sleepy = a === "dozing";

    for (const sgn of [-1, 1]) {
      const x = fx + sgn * ex;
      if (happy) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(1.2, w * 0.08);
        ctx.beginPath();
        ctx.arc(x, fy + er * 0.3, er * 0.7, Math.PI * 1.1, Math.PI * 1.9);
        ctx.stroke();
      } else if (blink || sleepy) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(1.2, w * 0.07);
        ctx.beginPath();
        ctx.moveTo(x - er * 0.7, fy + er * 0.2);
        ctx.quadraticCurveTo(x, fy + er * (sleepy ? 0.7 : 0.4), x + er * 0.7, fy + er * 0.2);
        ctx.stroke();
      } else {
        const big = scared ? 1.25 : 1;
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.ellipse(x, fy, er * big, er * 1.2 * big, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ink;
        const pr = er * (scared ? 0.45 : 0.62);
        ctx.beginPath();
        ctx.arc(x + dxs * er * 0.35, fy + er * 0.15 + dys * er * 0.2, pr, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x + dxs * er * 0.35 - pr * 0.35, fy - pr * 0.2, pr * 0.32, 0, Math.PI * 2);
        ctx.fill();
      }
      if (a === "chasing") {
        ctx.strokeStyle = ink;
        ctx.lineWidth = Math.max(1.2, w * 0.07);
        ctx.beginPath();
        ctx.moveTo(x - sgn * er * 0.9, fy - er * 1.55);
        ctx.lineTo(x + sgn * er * 0.7, fy - er * 1.15);
        ctx.stroke();
      }
    }

    // Cheeks.
    if (happy || a === "hiding" || a === "newborn") {
      ctx.fillStyle = "rgba(255,120,150,0.45)";
      for (const sgn of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(fx + sgn * ex * 1.55, fy + er * 1.3, er * 0.7, er * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mouth.
    const my = fy + er * 1.75;
    ctx.strokeStyle = ink;
    ctx.fillStyle = "#5a1b2a";
    ctx.lineWidth = Math.max(1.1, w * 0.065);
    if (a === "eating") {
      const open = 0.25 + Math.abs(Math.sin(this.clock * 15)) * 0.75;
      ctx.beginPath();
      ctx.ellipse(fx, my, er * 0.5, er * 0.45 * open, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (scared) {
      ctx.beginPath();
      ctx.ellipse(fx, my, er * 0.32, er * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      // Sweat drop.
      ctx.fillStyle = "rgba(170,220,255,0.95)";
      ctx.beginPath();
      ctx.ellipse(fx + w * 0.75, fy - h * 0.25, w * 0.08, w * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (a === "chasing") {
      ctx.beginPath();
      ctx.arc(fx, my - er * 0.4, er * 0.6, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
    } else if (sleepy) {
      ctx.beginPath();
      ctx.arc(fx, my, er * 0.22, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(fx, my - er * 0.45, er * 0.5, Math.PI * 0.2, Math.PI * 0.8);
      ctx.stroke();
    }
  }

  private drawGhost(g: Ghost) {
    const ctx = this.ctx;
    const [sx, sy] = this.project(g.x, g.y);
    const f = g.t / g.max;
    const r = g.r * this.scale;
    ctx.save();
    if (g.mode === "pop") {
      const k = 1 + f * 0.5;
      ctx.globalAlpha = 1 - f;
      ctx.translate(sx, sy);
      ctx.scale(k, 1 / k);
      this.drawBody(g.kind, r * 0.9, r * 1.1);
    } else {
      ctx.globalAlpha = (1 - f) * 0.85;
      ctx.translate(sx, sy - f * r * 2.5);
      ctx.scale(1 - f * 0.4, 1 - f * 0.4);
      ctx.filter = "grayscale(0.85)";
      this.drawBody(g.kind, r * 0.9, r * 1.1);
      ctx.filter = "none";
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1.5;
      const ey = -r * 1.2;
      for (const sgn of [-1, 1]) {
        const ex = sgn * r * 0.27;
        ctx.beginPath();
        ctx.moveTo(ex - 3, ey - 3);
        ctx.lineTo(ex + 3, ey + 3);
        ctx.moveTo(ex + 3, ey - 3);
        ctx.lineTo(ex - 3, ey + 3);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  private drawParticles() {
    const ctx = this.ctx;
    const s = this.scale;
    const lift = 0.45 + 0.55 * this.hf;
    for (const p of this.particles) {
      const f = p.life / p.max;
      const [x, y0] = this.project(p.x, p.y);
      const y = y0 - p.z * s * lift;
      const size = p.size * s;
      ctx.globalAlpha = Math.max(0, 1 - f);
      if (p.kind === "spark") {
        ctx.fillStyle = p.color;
        const k = size * (1 - f * 0.5);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = p.spin + (i / 8) * Math.PI * 2;
          const rr = i % 2 === 0 ? k : k * 0.35;
          ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.kind === "heart") {
        ctx.fillStyle = p.color;
        const k = size * (0.8 + f * 0.5);
        ctx.beginPath();
        ctx.moveTo(x, y + k * 0.35);
        ctx.bezierCurveTo(x - k, y - k * 0.3, x - k * 0.4, y - k, x, y - k * 0.45);
        ctx.bezierCurveTo(x + k * 0.4, y - k, x + k, y - k * 0.3, x, y + k * 0.35);
        ctx.fill();
      } else if (p.kind === "puff") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(x, y, size * (0.6 + f * 1.2), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "ring") {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 2.5 * (1 - f) + 0.5;
        const rr = s * (0.4 + f * 1.6);
        ctx.beginPath();
        ctx.ellipse(x, y0, rr, rr * this.sq, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.kind === "zzz") {
        ctx.fillStyle = p.color;
        ctx.font = `700 ${Math.max(8, size * (0.9 + f))}px ui-rounded, system-ui, sans-serif`;
        ctx.fillText("z", x, y);
      } else if (p.kind === "leaf") {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(x, y, size * 0.9, size * 0.4, p.spin + this.clock * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
}
