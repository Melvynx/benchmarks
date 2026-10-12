import * as THREE from 'three';

function canvas(w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  draw(ctx, w, h);
  return c;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function blob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, seed: number, wrapW: number) {
  const rnd = mulberry(seed);
  const harmonics = [2, 3, 5].map((k) => ({ k, a: 0.1 + rnd() * 0.16, p: rnd() * Math.PI * 2 }));
  const draw = (ox: number) => {
    ctx.beginPath();
    const n = 64;
    for (let i = 0; i <= n; i++) {
      const th = (i / n) * Math.PI * 2;
      let m = 1;
      harmonics.forEach((h) => (m += h.a * Math.sin(h.k * th + h.p) * 0.6));
      const x = ox + cx + Math.cos(th) * rx * m;
      const y = cy + Math.sin(th) * ry * m;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  };
  draw(0);
  draw(-wrapW);
  draw(wrapW);
}

const CREAM = '#fff6e8';
const PATCH = '#3b3036';

export function bodyTexture() {
  const c = canvas(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PATCH;
    blob(ctx, w * 0.56, h * 0.34, 120, 78, 11, w);
    blob(ctx, w * 0.96, h * 0.5, 96, 86, 23, w);
    blob(ctx, w * 0.76, h * 0.3, 130, 64, 37, w);
    blob(ctx, w * 0.4, h * 0.68, 62, 50, 41, w);
    blob(ctx, w * 0.12, h * 0.26, 70, 48, 53, w);
    blob(ctx, w * 0.66, h * 0.72, 54, 40, 67, w);
    ctx.fillStyle = 'rgba(255,190,190,0.0)';
  });
  return tex(c);
}

export function headTexture() {
  const c = canvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = PATCH;
    blob(ctx, w * 0.5, h * 0.3, 62, 84, 71, w);
    blob(ctx, w * 0.02, h * 0.22, 46, 50, 83, w);
    blob(ctx, w * 0.78, h * 0.34, 44, 56, 97, w);
  });
  return tex(c);
}

export function groundTexture() {
  const c = canvas(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#8fd45f';
    ctx.fillRect(0, 0, w, h);
    const rnd = mulberry(5);
    for (let i = 0; i < 140; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 20 + rnd() * 60;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const light = rnd() > 0.5;
      g.addColorStop(0, light ? 'rgba(190,240,110,0.35)' : 'rgba(70,160,70,0.28)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) {
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function ballTexture() {
  const c = canvas(256, 128, (ctx, w, h) => {
    const colors = ['#ff5a6a', '#fff6e8', '#ffcf40', '#fff6e8'];
    const seg = w / 8;
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = colors[i % 4];
      ctx.fillRect(i * seg, 0, seg + 1, h);
    }
    ctx.fillStyle = '#fff6e8';
    ctx.fillRect(0, 0, w, 16);
    ctx.fillRect(0, h - 16, w, 16);
  });
  return tex(c);
}

export function shadowTexture() {
  const c = canvas(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(20,30,10,0.55)');
    g.addColorStop(0.55, 'rgba(20,30,10,0.28)');
    g.addColorStop(1, 'rgba(20,30,10,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  return tex(c);
}

export type SpriteKind = 'heart' | 'star' | 'dot' | 'bubble' | 'zzz' | 'note' | 'drop' | 'puff' | 'confetti' | 'sweat' | 'flame';

const spriteCache = new Map<SpriteKind, THREE.CanvasTexture>();

export function spriteTexture(kind: SpriteKind) {
  const hit = spriteCache.get(kind);
  if (hit) return hit;
  const c = canvas(128, 128, (ctx, w, h) => {
    ctx.translate(w / 2, h / 2);
    switch (kind) {
      case 'heart': {
        ctx.fillStyle = '#ff5c8a';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 8;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(0, 38);
        ctx.bezierCurveTo(-58, -2, -38, -46, -8, -30);
        ctx.bezierCurveTo(-3, -27, 0, -22, 0, -18);
        ctx.bezierCurveTo(0, -22, 3, -27, 8, -30);
        ctx.bezierCurveTo(38, -46, 58, -2, 0, 38);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.beginPath();
        ctx.ellipse(-22, -20, 9, 6, -0.7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'star': {
        ctx.fillStyle = '#fff3a8';
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 6;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? 50 : 13;
          const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        break;
      }
      case 'dot': {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 56);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.6, 'rgba(255,255,255,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 56, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'bubble': {
        ctx.strokeStyle = 'rgba(255,255,255,0.95)';
        ctx.lineWidth = 7;
        ctx.fillStyle = 'rgba(190,235,255,0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 44, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.beginPath();
        ctx.ellipse(-16, -16, 12, 7, -0.7, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'zzz': {
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        const z = () => {
          ctx.beginPath();
          ctx.moveTo(-30, -34);
          ctx.lineTo(30, -34);
          ctx.lineTo(-30, 34);
          ctx.lineTo(30, 34);
        };
        ctx.lineWidth = 30;
        ctx.strokeStyle = '#5b6bd6';
        z();
        ctx.stroke();
        ctx.lineWidth = 15;
        ctx.strokeStyle = '#eef0ff';
        z();
        ctx.stroke();
        break;
      }
      case 'note': {
        ctx.fillStyle = '#ff7ab0';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.ellipse(-14, 28, 18, 13, -0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();
        ctx.fillRect(2, -40, 9, 66);
        ctx.beginPath();
        ctx.moveTo(8, -40);
        ctx.quadraticCurveTo(38, -30, 34, 0);
        ctx.quadraticCurveTo(26, -14, 8, -16);
        ctx.fill();
        break;
      }
      case 'drop': {
        ctx.fillStyle = '#8fd8ff';
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, -44);
        ctx.bezierCurveTo(30, -6, 34, 10, 22, 28);
        ctx.bezierCurveTo(10, 46, -10, 46, -22, 28);
        ctx.bezierCurveTo(-34, 10, -30, -6, 0, -44);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
        break;
      }
      case 'sweat': {
        ctx.fillStyle = '#b8e6ff';
        ctx.strokeStyle = '#5aa9e0';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(0, -44);
        ctx.bezierCurveTo(30, -6, 34, 10, 22, 28);
        ctx.bezierCurveTo(10, 46, -10, 46, -22, 28);
        ctx.bezierCurveTo(-34, 10, -30, -6, 0, -44);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'puff': {
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 60);
        g.addColorStop(0, 'rgba(255,255,255,0.9)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 60, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'confetti': {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-26, -12, 52, 24);
        break;
      }
      case 'flame': {
        const g = ctx.createRadialGradient(0, 8, 2, 0, 0, 52);
        g.addColorStop(0, 'rgba(255,240,150,1)');
        g.addColorStop(0.45, 'rgba(255,140,50,0.95)');
        g.addColorStop(1, 'rgba(255,60,30,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, 52, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  });
  const t = tex(c);
  spriteCache.set(kind, t);
  return t;
}
