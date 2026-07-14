import type { Camera } from "./camera";
import type { World } from "../sim/world";
import type { Creature, Plant } from "../sim/types";

interface DrawItem {
  depth: number;
  draw: () => void;
}

export class DishRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  camera: Camera;
  selectedId: number | null = null;
  private particles: { x: number; y: number; z: number; life: number; color: string; vx: number; vy: number }[] = [];

  constructor(canvas: HTMLCanvasElement, camera: Camera) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.camera = camera;
  }

  resize(w: number, h: number): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  screenToWorld(sx: number, sy: number, _world: World): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2 + 18;
    const px = sx - cx;
    const py = (sy - cy) / 0.72;

    const cosZ = Math.cos(-this.camera.rotZ);
    const sinZ = Math.sin(-this.camera.rotZ);
    const scale = this.camera.zoom;
    const x1 = px / scale;
    const y1 = py / scale;
    // inverse rotX approx ignoring z
    const cosX = Math.cos(this.camera.rotX) || 0.5;
    const y2 = y1 / cosX;
    return {
      x: x1 * cosZ - y2 * sinZ,
      y: x1 * sinZ + y2 * cosZ,
    };
  }

  burst(x: number, y: number, color: string): void {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x,
        y,
        z: 8,
        life: 0.45 + Math.random() * 0.3,
        color,
        vx: Math.cos(a) * (20 + Math.random() * 30),
        vy: Math.sin(a) * (20 + Math.random() * 30),
      });
    }
  }

  render(world: World, dt: number): void {
    const ctx = this.ctx;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);

    // ambient backdrop
    const g = ctx.createRadialGradient(w * 0.5, h * 0.35, 20, w * 0.5, h * 0.55, Math.max(w, h) * 0.7);
    g.addColorStop(0, "#e8f4ef");
    g.addColorStop(0.45, "#c5ddd4");
    g.addColorStop(1, "#8fb0a6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // soft vignette pattern
    ctx.save();
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(
        (i * 97) % w,
        (i * 53) % h,
        8 + (i % 5) * 3,
        0,
        Math.PI * 2,
      );
      ctx.fillStyle = i % 2 ? "#2a6b5e" : "#f4fff8";
      ctx.fill();
    }
    ctx.restore();

    const cx = w / 2;
    const cy = h / 2 + 18;
    ctx.save();
    ctx.translate(cx, cy);

    this.drawDishBase(world);

    const items: DrawItem[] = [];

    for (const pl of world.plants) {
      const p = this.camera.project(pl.x, pl.y, 0);
      items.push({
        depth: p.depth,
        draw: () => this.drawPlant(pl, p.x, p.y),
      });
    }

    for (const c of world.creatures) {
      const hop = Math.sin(c.bounce) * 4 * (c.behavior === "eating" ? 0.3 : 1);
      const p = this.camera.project(c.x, c.y, 6 + hop);
      items.push({
        depth: p.depth + 2,
        draw: () => this.drawCreature(c, p.x, p.y, hop),
      });
    }

    // particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i]!;
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.z += 20 * dt;
      if (pt.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      const p = this.camera.project(pt.x, pt.y, pt.z);
      items.push({
        depth: p.depth + 5,
        draw: () => {
          ctx.globalAlpha = Math.max(0, pt.life * 1.5);
          ctx.fillStyle = pt.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        },
      });
    }

    items.sort((a, b) => a.depth - b.depth);
    for (const it of items) it.draw();

    this.drawDishRim(world);
    ctx.restore();
  }

  private drawDishBase(world: World): void {
    const ctx = this.ctx;
    const R = world.params.worldRadius;
    const steps = 64;
    const rim: { x: number; y: number }[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const p = this.camera.project(Math.cos(a) * R, Math.sin(a) * R, 0);
      rim.push(p);
    }

    // underside shadow
    ctx.beginPath();
    for (let i = 0; i < rim.length; i++) {
      const p = rim[i]!;
      if (i === 0) ctx.moveTo(p.x + 8, p.y + 22);
      else ctx.lineTo(p.x + 8, p.y + 22);
    }
    ctx.closePath();
    ctx.fillStyle = "rgba(40, 70, 60, 0.18)";
    ctx.fill();

    // agar floor
    ctx.beginPath();
    for (let i = 0; i < rim.length; i++) {
      const p = rim[i]!;
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    const floor = ctx.createRadialGradient(0, 0, R * 0.1, 0, 10, R * this.camera.zoom);
    floor.addColorStop(0, "#f3faf6");
    floor.addColorStop(0.55, "#d7ebe2");
    floor.addColorStop(1, "#b7d4c8");
    ctx.fillStyle = floor;
    ctx.fill();

    // subtle grid rings
    ctx.strokeStyle = "rgba(42, 107, 94, 0.08)";
    ctx.lineWidth = 1;
    for (const frac of [0.33, 0.66, 0.95]) {
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const p = this.camera.project(Math.cos(a) * R * frac, Math.sin(a) * R * frac, 0.5);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  private drawDishRim(world: World): void {
    const ctx = this.ctx;
    const R = world.params.worldRadius;
    const steps = 64;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const p = this.camera.project(Math.cos(a) * R, Math.sin(a) * R, 10);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 5;
    ctx.stroke();

    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const p = this.camera.project(Math.cos(a) * R, Math.sin(a) * R, 14);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "rgba(42, 107, 94, 0.35)";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  private drawPlant(pl: Plant, x: number, y: number): void {
    const ctx = this.ctx;
    const foodFrac = pl.food / pl.maxFood;
    const sway = Math.sin(pl.sway) * 2.5;
    const s = pl.size * 10;

    // shadow
    ctx.fillStyle = "rgba(40,70,60,0.12)";
    ctx.beginPath();
    ctx.ellipse(x, y + 4, s * 0.7, s * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    if (pl.kind === "tree") {
      // trunk
      ctx.strokeStyle = "#7a5a3a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + sway * 0.3, y - s * 1.1);
      ctx.stroke();

      const canopy = 0.45 + foodFrac * 0.55;
      ctx.fillStyle = `rgba(${40 + foodFrac * 40}, ${120 + foodFrac * 80}, ${70}, ${0.75 + foodFrac * 0.2})`;
      ctx.beginPath();
      ctx.ellipse(x + sway, y - s * 1.35, s * 0.95 * canopy, s * 0.7 * canopy, 0, 0, Math.PI * 2);
      ctx.fill();

      if (foodFrac > 0.15) {
        const n = Math.ceil(foodFrac * 4);
        for (let i = 0; i < n; i++) {
          const ang = (i / n) * Math.PI * 2 + pl.sway * 0.2;
          ctx.fillStyle = "#7dcf4a";
          ctx.beginPath();
          ctx.arc(
            x + sway + Math.cos(ang) * s * 0.45,
            y - s * 1.35 + Math.sin(ang) * s * 0.3,
            2.4 + foodFrac,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.35)";
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    } else if (pl.kind === "bush") {
      ctx.fillStyle = `rgba(${50 + foodFrac * 30}, ${130 + foodFrac * 70}, ${80}, 0.9)`;
      ctx.beginPath();
      ctx.ellipse(x + sway * 0.5, y - s * 0.45, s * 0.85, s * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      if (foodFrac > 0.12) {
        const n = Math.ceil(foodFrac * 3);
        for (let i = 0; i < n; i++) {
          ctx.fillStyle = "#8fe05a";
          ctx.beginPath();
          ctx.arc(
            x + sway * 0.5 + (i - 1) * 4,
            y - s * 0.55 - (i % 2) * 3,
            2.2,
            0,
            Math.PI * 2,
          );
          ctx.fill();
        }
      } else {
        // bare twigs hint
        ctx.strokeStyle = "rgba(90,70,50,0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x - 4, y - 2);
        ctx.lineTo(x - 2, y - s * 0.7);
        ctx.moveTo(x + 3, y - 1);
        ctx.lineTo(x + 5, y - s * 0.55);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = "#5a9a4a";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + sway, y - s * 0.5, x + sway * 0.5, y - s);
      ctx.stroke();
      if (foodFrac > 0.2) {
        ctx.fillStyle = "#9ae05e";
        ctx.beginPath();
        ctx.ellipse(x + sway * 0.5, y - s, 3.5 * foodFrac + 1.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawCreature(c: Creature, x: number, y: number, hop: number): void {
    const ctx = this.ctx;
    const isPrey = c.species === "prey";
    const bodyW = (isPrey ? 9 : 11) * c.traits.size * c.squash;
    const bodyH = (isPrey ? 7 : 8) * c.traits.size * (2 - c.squash * 0.85);
    const selected = c.id === this.selectedId;

    // shadow
    ctx.fillStyle = "rgba(40,70,60,0.16)";
    ctx.beginPath();
    ctx.ellipse(x, y + 6 + hop * 0.2, bodyW * 0.7, bodyH * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y - hop);
    ctx.rotate(c.facing * 0.15);

    if (selected) {
      ctx.strokeStyle = "rgba(255,220,80,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyW + 5, bodyH + 4, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (c.glow > 0) {
      ctx.fillStyle = isPrey
        ? `rgba(120, 255, 200, ${c.glow * 0.35})`
        : `rgba(255, 180, 200, ${c.glow * 0.35})`;
      ctx.beginPath();
      ctx.ellipse(0, 0, bodyW + 6, bodyH + 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // body gradient
    const grad = ctx.createLinearGradient(-bodyW, -bodyH, bodyW, bodyH);
    if (isPrey) {
      grad.addColorStop(0, "#7ef0e8");
      grad.addColorStop(0.5, "#2bb8b8");
      grad.addColorStop(1, "#1a8a8a");
    } else {
      grad.addColorStop(0, "#ffb0c0");
      grad.addColorStop(0.5, "#e85a7a");
      grad.addColorStop(1, "#c23055");
    }
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyW, bodyH, 0, 0, Math.PI * 2);
    ctx.fill();

    // gloss
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(-bodyW * 0.25, -bodyH * 0.35, bodyW * 0.35, bodyH * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // face
    const eyeY = -1;
    const eyeSpread = bodyW * 0.32;
    const blinking = c.blink < 0.12;
    ctx.fillStyle = "#1a2a28";
    if (blinking) {
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "#1a2a28";
      ctx.beginPath();
      ctx.moveTo(-eyeSpread - 2, eyeY);
      ctx.lineTo(-eyeSpread + 2, eyeY);
      ctx.moveTo(eyeSpread - 2, eyeY);
      ctx.lineTo(eyeSpread + 2, eyeY);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(-eyeSpread, eyeY, 1.6, 0, Math.PI * 2);
      ctx.arc(eyeSpread, eyeY, 1.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(-eyeSpread - 0.4, eyeY - 0.5, 0.55, 0, Math.PI * 2);
      ctx.arc(eyeSpread - 0.4, eyeY - 0.5, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // mouth / expression
    ctx.strokeStyle = "#1a2a28";
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    if (c.behavior === "eating" || c.behavior === "digesting") {
      ctx.arc(0, 2.2, 2.2, 0.15, Math.PI - 0.15);
    } else if (c.fear > 0.3) {
      ctx.moveTo(-2, 2.5);
      ctx.quadraticCurveTo(0, 1, 2, 2.5);
    } else if (c.behavior === "hunting") {
      ctx.moveTo(-1.8, 2.8);
      ctx.lineTo(1.8, 2.8);
    } else {
      ctx.arc(0, 1.8, 2, 0.2, Math.PI - 0.2);
    }
    ctx.stroke();

    // cheek blush when feeding
    if (c.glow > 0.3) {
      ctx.fillStyle = isPrey ? "rgba(255,180,160,0.35)" : "rgba(255,220,180,0.4)";
      ctx.beginPath();
      ctx.ellipse(-bodyW * 0.55, 1, 2.2, 1.4, 0, 0, Math.PI * 2);
      ctx.ellipse(bodyW * 0.55, 1, 2.2, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // little ears / antenna for predators
    if (!isPrey) {
      ctx.fillStyle = "#e85a7a";
      ctx.beginPath();
      ctx.ellipse(-bodyW * 0.55, -bodyH * 0.7, 2.2, 3.2, -0.4, 0, Math.PI * 2);
      ctx.ellipse(bodyW * 0.55, -bodyH * 0.7, 2.2, 3.2, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
