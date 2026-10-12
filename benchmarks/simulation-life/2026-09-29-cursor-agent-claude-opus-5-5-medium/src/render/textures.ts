import * as THREE from "three";

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeShadowTexture() {
  return canvasTexture(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(20,40,20,0.55)");
    g.addColorStop(0.45, "rgba(20,40,20,0.28)");
    g.addColorStop(1, "rgba(20,40,20,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

export function makeDishShadowTexture() {
  return canvasTexture(256, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, s * 0.2, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(60,40,70,0.35)");
    g.addColorStop(0.6, "rgba(60,40,70,0.14)");
    g.addColorStop(1, "rgba(60,40,70,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

export function makeSparkleTexture() {
  return canvasTexture(64, (ctx, s) => {
    const c = s / 2;
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.25, "rgba(255,255,255,0.8)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? c : c * 0.28;
      ctx.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });
}

export function makeHeartTexture() {
  return canvasTexture(64, (ctx, s) => {
    ctx.translate(s / 2, s / 2 + 4);
    ctx.scale(s / 70, s / 70);
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.bezierCurveTo(-34, -6, -18, -34, 0, -16);
    ctx.bezierCurveTo(18, -34, 34, -6, 0, 18);
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(255,255,255,0.8)";
    ctx.shadowBlur = 6;
    ctx.fill();
  });
}

export function makeDotTexture() {
  return canvasTexture(32, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.6, "rgba(255,255,255,0.9)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  });
}

const emojiCache = new Map<string, THREE.Texture>();

export function emojiTexture(emoji: string) {
  let tex = emojiCache.get(emoji);
  if (tex) return tex;
  tex = canvasTexture(128, (ctx, s) => {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    ctx.beginPath();
    ctx.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${Math.round(s * 0.56)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, s / 2, s / 2 + s * 0.04);
  });
  emojiCache.set(emoji, tex);
  return tex;
}

export function makeGrassTexture() {
  return canvasTexture(512, (ctx, s) => {
    ctx.fillStyle = "#8fd07a";
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * s;
      const y = Math.random() * s;
      const l = 45 + Math.random() * 22;
      ctx.fillStyle = `hsla(${100 + Math.random() * 20}, 50%, ${l}%, ${0.15 + Math.random() * 0.25})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 2 + Math.random() * 6, 1 + Math.random() * 3, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}
