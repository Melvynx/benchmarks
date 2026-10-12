import type { Blob, Tree, World } from "./sim.ts";

const TILT = 0.56;
const BLUE = { hi: "#d7ecff", mid: "#3b82f6", lo: "#1d3f9e", ink: "#15306f" };
const RED = { hi: "#ffd9d6", mid: "#ef4444", lo: "#9a1b1b", ink: "#5a0d0d" };
const FRUIT = { hi: "#f3ffd0", mid: "#8ad83f", lo: "#3f8a1c" };

interface Hit {
  id: number;
  x: number;
  y: number;
  r: number;
}

export class GardenScene {
  yaw = -0.7;
  zoom = 1;
  selectedId: number | null = null;
  private ctx: CanvasRenderingContext2D;
  private cssW = 0;
  private cssH = 0;
  private hits: Hit[] = [];
  private fruitVis = new WeakMap<Tree, number[]>();
  private grass: { x: number; y: number; r: number; tone: number }[] = [];
  private lastTime = 0;

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2d canvas unavailable");
    this.ctx = ctx;
    let seed = 4242;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    for (let i = 0; i < 320; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 0.97;
      this.grass.push({ x: Math.cos(a) * r, y: Math.sin(a) * r, r: 0.008 + rnd() * 0.012, tone: rnd() });
    }
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.cssW = rect.width;
    this.cssH = rect.height;
    this.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private base(): number {
    return Math.min(this.cssW, this.cssH) * 0.42 * this.zoom;
  }

  /** Projects normalized dish coords (radius 1) to screen. */
  private proj(nx: number, ny: number, nz: number): { sx: number; sy: number } {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    const rx = nx * c - ny * s;
    const ry = nx * s + ny * c;
    const b = this.base();
    return { sx: this.cssW / 2 + rx * b, sy: this.cssH * 0.55 + ry * b * TILT - nz * b };
  }

  /** Projects world coords into screen. */
  private projWorld(w: World, x: number, y: number, z: number): { sx: number; sy: number } {
    return this.proj(x / w.R, y / w.R, z);
  }

  pick(px: number, py: number): number | null {
    let best: Hit | null = null;
    for (const h of this.hits) {
      const d = Math.hypot(px - h.x, py - h.y);
      if (d <= h.r && (!best || h.y > best.y)) best = h;
    }
    return best ? best.id : null;
  }

  draw(w: World, time: number): void {
    const ctx = this.ctx;
    const dt = Math.min(0.1, Math.max(0, time - this.lastTime));
    this.lastTime = time;
    ctx.clearRect(0, 0, this.cssW, this.cssH);
    this.drawBackdrop();
    this.drawDish();

    type Item = { sy: number; kind: 0 | 1 | 2; ref: unknown };
    const items: Item[] = [];
    for (const tr of w.trees) items.push({ sy: this.projWorld(w, tr.x, tr.y, 0).sy, kind: 0, ref: tr });
    for (const b of w.reds) items.push({ sy: this.projWorld(w, b.x, b.y, 0).sy, kind: 1, ref: b });
    for (const b of w.blues) items.push({ sy: this.projWorld(w, b.x, b.y, 0).sy, kind: 1, ref: b });
    items.sort((a, b) => a.sy - b.sy);

    this.hits = [];
    const limit = w.s.fruitLimit;
    for (const it of items) {
      if (it.kind === 0) {
        const tr = it.ref as Tree;
        this.drawTree(w, tr, time, dt, limit);
      } else {
        this.drawBlob(w, it.ref as Blob, time);
      }
    }
  }

  private drawBackdrop(): void {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, this.cssH);
    g.addColorStop(0, "#fff6e4");
    g.addColorStop(1, "#f6dcc0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
  }

  private ringPath(z: number, k: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const p = this.proj(Math.cos(a) * k, Math.sin(a) * k, z);
      if (i === 0) ctx.moveTo(p.sx, p.sy);
      else ctx.lineTo(p.sx, p.sy);
    }
    ctx.closePath();
  }

  private drawDish(): void {
    const ctx = this.ctx;
    const b = this.base();
    const center = this.proj(0, 0, 0);

    // Soft shadow on the table.
    ctx.save();
    ctx.fillStyle = "rgba(90,50,20,0.18)";
    ctx.beginPath();
    ctx.ellipse(center.sx + b * 0.03, center.sy + b * 0.08, b * 1.12, b * 0.62 * TILT * 1.9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Wooden side wall, extruded downward.
    this.ringPath(-0.09, 1.06);
    ctx.fillStyle = "#b9743f";
    ctx.fill();
    ctx.strokeStyle = "#8a4d22";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Rim and top surface.
    this.ringPath(0, 1.06);
    ctx.fillStyle = "#e6c48f";
    ctx.fill();

    this.ringPath(0, 1.0);
    const g = ctx.createRadialGradient(center.sx - b * 0.2, center.sy - b * 0.2, b * 0.1, center.sx, center.sy, b * 1.05);
    g.addColorStop(0, "#d8f3a1");
    g.addColorStop(0.7, "#9ed36b");
    g.addColorStop(1, "#6fb557");
    ctx.fillStyle = g;
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = "rgba(60,110,40,0.35)";
    ctx.lineWidth = 1;
    for (const k of [0.33, 0.66]) {
      this.ringPath(0, k);
      ctx.stroke();
    }
    ctx.restore();

    // Grass tufts.
    ctx.fillStyle = "rgba(40,90,30,0.35)";
    for (const gr of this.grass) {
      const p = this.proj(gr.x, gr.y, 0);
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, b * gr.r * 1.6, b * gr.r * 0.7 * TILT * 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Rim highlight.
    this.ringPath(0, 1.06);
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }

  private fruitSlots(tr: Tree): number[] {
    let slots = this.fruitVis.get(tr);
    if (!slots) {
      slots = new Array(8).fill(0);
      this.fruitVis.set(tr, slots);
    }
    return slots;
  }

  private drawTree(w: World, tr: Tree, time: number, dt: number, limit: number): void {
    const ctx = this.ctx;
    const b = this.base();
    const p = this.projWorld(w, tr.x, tr.y, 0);
    const trunkH = b * 0.16;
    const crown = b * 0.12;
    const sway = Math.sin(time * 0.9 + tr.id * 1.3) * b * 0.004;

    // Ground shadow.
    ctx.fillStyle = "rgba(40,60,20,0.22)";
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, crown * 1.1, crown * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Trunk.
    ctx.fillStyle = "#7a4a22";
    ctx.beginPath();
    ctx.moveTo(p.sx - b * 0.011, p.sy);
    ctx.lineTo(p.sx + b * 0.011, p.sy);
    ctx.lineTo(p.sx + b * 0.006 + sway * 0.4, p.sy - trunkH);
    ctx.lineTo(p.sx - b * 0.006 + sway * 0.4, p.sy - trunkH);
    ctx.closePath();
    ctx.fill();

    // Crown: lumpy cluster, paler when the tree is empty.
    const cx = p.sx + sway;
    const cy = p.sy - trunkH - crown * 0.35;
    const fullness = Math.min(1, tr.fruit / Math.max(1, limit));
    const grad = ctx.createRadialGradient(cx - crown * 0.35, cy - crown * 0.4, crown * 0.2, cx, cy, crown * 1.5);
    grad.addColorStop(0, `hsl(96 ${55 + fullness * 10}% ${58 + (1 - fullness) * 8}%)`);
    grad.addColorStop(1, `hsl(120 ${45 + fullness * 15}% ${30 + fullness * 8}%)`);
    ctx.fillStyle = grad;
    const lumps: [number, number, number][] = [
      [0, 0, 1],
      [-0.6, 0.18, 0.72],
      [0.6, 0.14, 0.78],
      [0, -0.5, 0.7],
      [-0.25, -0.2, 0.6],
    ];
    for (const [dx, dy, k] of lumps) {
      ctx.beginPath();
      ctx.arc(cx + dx * crown, cy + dy * crown, crown * k, 0, Math.PI * 2);
      ctx.fill();
    }

    // Fruit: each slot eases toward on/off so picking visibly shrinks it.
    const slots = this.fruitSlots(tr);
    for (let i = 0; i < slots.length; i++) {
      const target = i < tr.fruit ? 1 : 0;
      slots[i] += (target - slots[i]) * Math.min(1, dt * 5);
      const v = slots[i];
      if (v < 0.02) continue;
      const a = i * 2.39996 + tr.id * 0.7;
      const rr = crown * (0.7 + 0.22 * Math.sin(i * 3.1 + tr.id));
      const fx = cx + Math.cos(a) * rr * 1.05;
      const fy = cy + Math.sin(a) * rr * 0.65 + crown * 0.25;
      this.drawFruit(fx, fy, b * 0.017 * v, v);
    }

    // Regrowing bud on the next empty slot.
    if (tr.fruit < limit && tr.fruit < slots.length && tr.cooldown <= 0) {
      const i = tr.fruit;
      const a = i * 2.39996 + tr.id * 0.7;
      const rr = crown * (0.7 + 0.22 * Math.sin(i * 3.1 + tr.id));
      const fx = cx + Math.cos(a) * rr * 1.05;
      const fy = cy + Math.sin(a) * rr * 0.65 + crown * 0.25;
      this.drawFruit(fx, fy, b * 0.006 + b * 0.008 * tr.growth, 0.5 + 0.5 * tr.growth);
    }
  }

  private drawFruit(x: number, y: number, r: number, alpha: number): void {
    if (r <= 0.2) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, FRUIT.hi);
    g.addColorStop(0.5, FRUIT.mid);
    g.addColorStop(1, FRUIT.lo);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawBlob(w: World, bl: Blob, time: number): void {
    const ctx = this.ctx;
    const b = this.base();
    const p = this.projWorld(w, bl.x, bl.y, 0);
    const pal = bl.group === "blue" ? BLUE : RED;
    const speed = Math.hypot(bl.vx, bl.vy) / w.R;
    const phase = time * (4 + speed * 14) + bl.id * 1.7;

    // Hop when chewing or contacting, otherwise a walking bounce.
    let hop = 0.004 * Math.abs(Math.sin(phase)) * Math.min(1, speed * 6 + 0.2);
    if (bl.pauseKind === "eat") hop = 0.006 + 0.006 * Math.abs(Math.sin(time * 9 + bl.id));
    if (bl.pauseKind === "contact") hop = 0.018 * Math.abs(Math.sin(time * 7));
    if (bl.pauseKind === "birth") hop = 0.02 * Math.abs(Math.sin(time * 5));

    const unit = b * (0.058 + 0.012 * (bl.energy / 100));
    const squash = 1 + 0.07 * Math.sin(phase);
    const rx = unit * squash;
    const ry = unit * 0.92 / squash;
    const lean = Math.max(-0.28, Math.min(0.28, -(bl.vx / w.R) * 0.9));
    const cx = p.sx;
    const cy = p.sy - ry - hop * b;
    const facing = bl.vx >= 0 ? 1 : -1;

    // Shadow shrinks with height.
    ctx.fillStyle = `rgba(60,30,10,${0.22 - hop * 4})`;
    ctx.beginPath();
    ctx.ellipse(p.sx, p.sy, rx * (1.05 - hop * 6), rx * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();

    // Selection ring.
    if (bl.id === this.selectedId) {
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(p.sx, p.sy, rx * 1.5, rx * 0.55, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = "rgba(30,30,60,0.8)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(lean);

    // Bean body.
    ctx.beginPath();
    ctx.moveTo(-rx, 0);
    ctx.bezierCurveTo(-rx, -ry * 1.15, rx, -ry * 1.15, rx, 0);
    ctx.bezierCurveTo(rx, ry * 1.1, rx * 0.35, ry * 0.85, 0, ry * 0.85);
    ctx.bezierCurveTo(-rx * 0.35, ry * 0.85, -rx, ry * 1.1, -rx, 0);
    ctx.closePath();
    const g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.5, rx * 0.1, 0, 0, rx * 1.3);
    g.addColorStop(0, pal.hi);
    g.addColorStop(0.45, pal.mid);
    g.addColorStop(1, pal.lo);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(1, rx * 0.07);
    ctx.strokeStyle = pal.ink;
    ctx.stroke();

    // Gloss.
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.ellipse(-rx * 0.38, -ry * 0.48, rx * 0.26, ry * 0.14, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Face.
    const eyeR = Math.max(1.4, rx * 0.2);
    const blinking = (time + bl.id * 0.37) % 3.7 < 0.12;
    const eyeY = -ry * 0.12;
    const eyeXs = [-rx * 0.32, rx * 0.32];
    for (const ex of eyeXs) {
      if (blinking) {
        ctx.strokeStyle = pal.ink;
        ctx.lineWidth = Math.max(1, rx * 0.06);
        ctx.beginPath();
        ctx.moveTo(ex - eyeR, eyeY);
        ctx.lineTo(ex + eyeR, eyeY);
        ctx.stroke();
        continue;
      }
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.ink;
      ctx.beginPath();
      ctx.arc(ex + facing * eyeR * 0.35, eyeY + eyeR * 0.1, eyeR * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mouth tells the current action.
    ctx.strokeStyle = pal.ink;
    ctx.fillStyle = pal.ink;
    ctx.lineWidth = Math.max(1, rx * 0.06);
    const my = ry * 0.32;
    const mx = facing * rx * 0.05;
    if (bl.pauseKind === "eat") {
      const open = rx * (0.1 + 0.07 * Math.abs(Math.sin(time * 12)));
      ctx.beginPath();
      ctx.ellipse(mx, my, rx * 0.12, open, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (bl.state === "flee" || bl.state === "shy") {
      ctx.beginPath();
      ctx.arc(mx, my + rx * 0.15, rx * 0.16, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    } else if (bl.group === "red" && bl.pauseKind === "contact") {
      ctx.beginPath();
      ctx.arc(mx, my - rx * 0.05, rx * 0.22, 0.1, Math.PI - 0.1);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,120,120,0.6)";
      ctx.beginPath();
      ctx.ellipse(-rx * 0.55, eyeY + rx * 0.3, rx * 0.12, rx * 0.07, 0, 0, Math.PI * 2);
      ctx.ellipse(rx * 0.55, eyeY + rx * 0.3, rx * 0.12, rx * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(mx, my - rx * 0.05, rx * 0.16, 0.2, Math.PI - 0.2);
      ctx.stroke();
    }
    ctx.restore();

    // Effects.
    if (bl.pauseKind === "eat") {
      for (let i = 0; i < 3; i++) {
        const k = (time * 0.9 + i / 3 + bl.id * 0.13) % 1;
        ctx.fillStyle = `rgba(160,255,120,${1 - k})`;
        ctx.beginPath();
        ctx.arc(cx + (i - 1) * rx * 0.7, cy - ry * 1.6 - k * rx * 1.2, rx * 0.14 * (1 - k * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (bl.pauseKind === "contact" || bl.flash > 0.2) {
      const k = bl.flash > 0.2 ? bl.flash : 0.4;
      ctx.strokeStyle = `rgba(255,255,255,${k})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx * (1.4 + (1 - k) * 0.6), ry * (1.4 + (1 - k) * 0.6), 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (bl.pauseKind === "birth") {
      ctx.fillStyle = "rgba(255,230,120,0.9)";
      for (let i = 0; i < 4; i++) {
        const a = time * 3 + i * 1.57;
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rx * 1.5, cy + Math.sin(a) * ry * 1.2 - ry * 0.4, rx * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    this.hits.push({ id: bl.id, x: cx, y: cy, r: Math.max(12, rx * 1.4) });
  }

}
