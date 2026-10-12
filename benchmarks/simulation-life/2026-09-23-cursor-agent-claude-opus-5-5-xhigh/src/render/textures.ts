import * as THREE from "three";
import { createRng } from "../sim/rng";

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d")!;
  return [c, ctx];
}

export function makeGrassTexture(seed: number): THREE.CanvasTexture {
  const size = 1024;
  const [c, ctx] = canvas(size);
  const rng = createRng(seed * 31 + 5);
  ctx.fillStyle = "#8cc76b";
  ctx.fillRect(0, 0, size, size);

  const tones = ["#7fbd61", "#98d276", "#86c267", "#a3d77f", "#76b35a", "#90cc70"];
  for (let i = 0; i < 700; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    const r = 18 + rng.next() * 80;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = rng.pick(tones);
    g.addColorStop(0, col + "88");
    g.addColorStop(1, col + "00");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 5000; i++) {
    const x = rng.next() * size;
    const y = rng.next() * size;
    ctx.fillStyle = rng.chance(0.5) ? "rgba(60,110,50,0.18)" : "rgba(210,240,170,0.2)";
    ctx.fillRect(x, y, 1 + rng.next() * 2, 1 + rng.next() * 2);
  }
  const edge = ctx.createRadialGradient(size / 2, size / 2, size * 0.36, size / 2, size / 2, size * 0.5);
  edge.addColorStop(0, "rgba(40,80,30,0)");
  edge.addColorStop(1, "rgba(40,80,30,0.32)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function makeSoftShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const [c, ctx] = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(0,0,0,1)");
  g.addColorStop(0.45, "rgba(0,0,0,0.55)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

export const ATLAS_COLS = 4;
export const ATLAS_ROWS = 2;
export const SHAPE = {
  sparkle: 0,
  heart: 1,
  bang: 2,
  zzz: 3,
  puff: 4,
  dot: 5,
  star: 6,
  leaf: 7,
} as const;

/** White sprite shapes, tinted per particle in the shader. */
export function makeParticleAtlas(): THREE.CanvasTexture {
  const cell = 128;
  const c = document.createElement("canvas");
  c.width = cell * ATLAS_COLS;
  c.height = cell * ATLAS_ROWS;
  const ctx = c.getContext("2d")!;
  const at = (i: number) => [(i % ATLAS_COLS) * cell + cell / 2, Math.floor(i / ATLAS_COLS) * cell + cell / 2] as const;

  {
    const [x, y] = at(SHAPE.sparkle);
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 46);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      const r = k % 2 === 0 ? 58 : 12;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  {
    const [x, y] = at(SHAPE.heart);
    ctx.save();
    ctx.translate(x, y + 6);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(0, 38);
    ctx.bezierCurveTo(-60, -2, -34, -52, 0, -22);
    ctx.bezierCurveTo(34, -52, 60, -2, 0, 38);
    ctx.fill();
    ctx.restore();
  }
  {
    const [x, y] = at(SHAPE.bang);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(70,40,20,0.9)";
    ctx.lineWidth = 8;
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.roundRect(-11, -50, 22, 66, 11);
    ctx.stroke();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 38, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
  {
    const [x, y] = at(SHAPE.zzz);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(60,60,110,0.8)";
    ctx.lineWidth = 7;
    ctx.font = "900 86px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeText("z", 0, 4);
    ctx.fillText("z", 0, 4);
    ctx.restore();
  }
  {
    const [x, y] = at(SHAPE.puff);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 60);
    g.addColorStop(0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.6, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(x - 64, y - 64, 128, 128);
  }
  {
    const [x, y] = at(SHAPE.dot);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x, y, 40, 0, Math.PI * 2);
    ctx.fill();
  }
  {
    const [x, y] = at(SHAPE.star);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "rgba(120,80,0,0.6)";
    ctx.lineWidth = 6;
    ctx.lineJoin = "round";
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + (k / 10) * Math.PI * 2;
      const r = k % 2 === 0 ? 54 : 24;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
  {
    const [x, y] = at(SHAPE.leaf);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.6);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.quadraticCurveTo(40, 0, 0, 50);
    ctx.quadraticCurveTo(-40, 0, 0, -50);
    ctx.fill();
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
