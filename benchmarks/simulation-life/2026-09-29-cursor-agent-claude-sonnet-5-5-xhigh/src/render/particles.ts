import type { Camera, Pt } from './camera';
import { TAU, clamp } from './util';

export type ParticleType = 'spark' | 'heart' | 'ring' | 'text' | 'crumb' | 'zzz';

export interface Particle {
  type: ParticleType;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  g: number;
  life: number;
  max: number;
  size: number;
  color: string;
  text: string;
  rot: number;
  spin: number;
}

const pt: Pt = { x: 0, y: 0, d: 0 };

export class Particles {
  list: Particle[] = [];
  limit = 380;

  add(p: Partial<Particle> & { type: ParticleType; x: number; y: number; z: number }) {
    if (this.list.length >= this.limit) return;
    this.list.push({
      vx: 0,
      vy: 0,
      vz: 0,
      g: 0,
      life: 1,
      max: 1,
      size: 1,
      color: '#fff',
      text: '',
      rot: 0,
      spin: 0,
      ...p,
    });
    const last = this.list[this.list.length - 1];
    last.max = last.life;
  }

  burst(x: number, y: number, z: number, count: number, color: string, speed = 2.2, size = 0.4) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const s = speed * (0.4 + Math.random() * 0.8);
      this.add({
        type: 'spark',
        x,
        y,
        z,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        vz: 1.2 + Math.random() * 2,
        g: 4.5,
        life: 0.7 + Math.random() * 0.5,
        size: size * (0.7 + Math.random() * 0.7),
        color,
        rot: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 6,
      });
    }
  }

  update(dt: number) {
    let w = 0;
    for (let i = 0; i < this.list.length; i++) {
      const p = this.list[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vz -= p.g * dt;
      p.z += p.vz * dt;
      if (p.type === 'crumb' && p.z < 0.08) {
        p.z = 0.08;
        p.vz *= -0.35;
        p.vx *= 0.6;
        p.vy *= 0.6;
      }
      p.rot += p.spin * dt;
      this.list[w++] = p;
    }
    this.list.length = w;
  }

  draw(ctx: CanvasRenderingContext2D, cam: Camera) {
    const S = cam.scale;
    for (const p of this.list) {
      const k = clamp(p.life / p.max, 0, 1);
      const alpha = Math.min(1, k * 2.2);
      cam.project(p.x, p.y, p.z, pt);
      ctx.globalAlpha = alpha;
      switch (p.type) {
        case 'spark': {
          const r = p.size * S * (0.5 + 0.5 * k);
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.moveTo(0, -r);
          ctx.quadraticCurveTo(r * 0.15, -r * 0.15, r, 0);
          ctx.quadraticCurveTo(r * 0.15, r * 0.15, 0, r);
          ctx.quadraticCurveTo(-r * 0.15, r * 0.15, -r, 0);
          ctx.quadraticCurveTo(-r * 0.15, -r * 0.15, 0, -r);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'heart': {
          const r = p.size * S;
          ctx.fillStyle = p.color;
          ctx.save();
          ctx.translate(pt.x, pt.y);
          ctx.scale(r, r);
          ctx.beginPath();
          ctx.moveTo(0, 0.35);
          ctx.bezierCurveTo(-1, -0.25, -0.5, -0.9, 0, -0.4);
          ctx.bezierCurveTo(0.5, -0.9, 1, -0.25, 0, 0.35);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'ring': {
          const grow = 1 - k;
          const r = p.size * (0.4 + grow * 1.6) * S;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = Math.max(1.5, 0.16 * S * k);
          ctx.beginPath();
          ctx.ellipse(pt.x, pt.y, r, r * Math.sin(cam.pitch), 0, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'crumb': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, Math.max(1, p.size * S), 0, TAU);
          ctx.fill();
          break;
        }
        case 'text': {
          ctx.font = `800 ${Math.round(p.size * S)}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.lineWidth = 3.5;
          ctx.strokeStyle = 'rgba(255,255,255,0.92)';
          ctx.lineJoin = 'round';
          ctx.strokeText(p.text, pt.x, pt.y);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, pt.x, pt.y);
          break;
        }
        case 'zzz': {
          ctx.font = `800 ${Math.round(p.size * S)}px ui-rounded, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillStyle = p.color;
          ctx.fillText('z', pt.x + Math.sin(p.rot) * 3, pt.y);
          break;
        }
      }
    }
    ctx.globalAlpha = 1;
  }
}
