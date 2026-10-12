import * as THREE from "three";
import { mulberry32 } from "../sim/rng";

function canvas(size: number) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  return { c, ctx };
}

export function grassTexture(seed: number): THREE.CanvasTexture {
  const size = 1024;
  const { c, ctx } = canvas(size);
  const rng = mulberry32(seed * 31 + 5);
  const mid = size / 2;

  const base = ctx.createRadialGradient(mid * 0.85, mid * 0.8, 10, mid, mid, mid);
  base.addColorStop(0, "#9fdc72");
  base.addColorStop(0.7, "#86c95e");
  base.addColorStop(0.93, "#74b851");
  base.addColorStop(0.975, "#6b8f47");
  base.addColorStop(1, "#7a5b3e");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 38; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * mid * 0.9;
    const x = mid + Math.cos(a) * r;
    const y = mid + Math.sin(a) * r;
    const rad = 40 + rng() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const light = rng() < 0.5;
    g.addColorStop(0, light ? "rgba(190,236,130,0.35)" : "rgba(70,140,60,0.28)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const speckles = ["#b7e98a", "#6fb04e", "#5d9e45", "#a4de76", "#8ccc5f"];
  for (let i = 0; i < 9000; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * mid * 0.965;
    const x = mid + Math.cos(a) * r;
    const y = mid + Math.sin(a) * r;
    ctx.fillStyle = speckles[Math.floor(rng() * speckles.length)];
    ctx.globalAlpha = 0.35 + rng() * 0.4;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng() * Math.PI);
    ctx.fillRect(-0.8, -3, 1.6, 4 + rng() * 4);
    ctx.restore();
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function radialTexture(inner = "rgba(0,0,0,0.55)", outer = "rgba(0,0,0,0)"): THREE.CanvasTexture {
  const size = 128;
  const { c, ctx } = canvas(size);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.55, inner.replace(/[\d.]+\)$/, (m) => `${parseFloat(m) * 0.55})`));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
