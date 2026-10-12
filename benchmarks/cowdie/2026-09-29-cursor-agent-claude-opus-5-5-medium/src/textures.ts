import * as THREE from 'three';

const emojiCache = new Map<string, THREE.CanvasTexture>();

export function emojiTexture(glyph: string): THREE.CanvasTexture {
  const hit = emojiCache.get(glyph);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '96px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  g.fillText(glyph, 64, 72);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  emojiCache.set(glyph, t);
  return t;
}

let gradient: THREE.DataTexture | null = null;

export function toonGradient(): THREE.DataTexture {
  if (gradient) return gradient;
  const data = new Uint8Array([110, 180, 230, 255]);
  gradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

export function toon(color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...extra });
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function blob(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, rand: () => number, w: number) {
  const lobes: [number, number, number][] = [[0, 0, r]];
  const n = 5 + Math.floor(rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand() * 0.6;
    const d = r * (0.45 + rand() * 0.35);
    lobes.push([Math.cos(a) * d, Math.sin(a) * d * 0.8, r * (0.45 + rand() * 0.3)]);
  }
  for (const off of [-w, 0, w]) {
    g.beginPath();
    for (const [dx, dy, rr] of lobes) {
      g.moveTo(cx + dx + off + rr, cy + dy);
      g.arc(cx + dx + off, cy + dy, rr, 0, Math.PI * 2);
    }
    g.fill();
  }
}

export function cowBodyTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fffaf2';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2f2729';
  const rand = rng(7);
  const spots: [number, number, number][] = [
    [0.08, 0.42, 70],
    [0.36, 0.34, 88],
    [0.55, 0.62, 58],
    [0.78, 0.4, 84],
    [0.97, 0.66, 44],
    [0.22, 0.66, 46],
  ];
  for (const [u, v, r] of spots) blob(g, u * w, v * h, r, rand, w);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function cowHeadTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fffaf2';
  g.fillRect(0, 0, w, h);
  g.fillStyle = '#2f2729';
  const rand = rng(21);
  blob(g, 0.42 * w, 0.2 * h, 34, rand, w);
  blob(g, 0.75 * w, 0.42 * h, 60, rand, w);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function beachBallTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d')!;
  const colors = ['#ff6b8a', '#ffffff', '#ffd23f', '#ffffff', '#4cc9f0', '#ffffff'];
  colors.forEach((col, i) => {
    g.fillStyle = col;
    g.fillRect((i * 512) / colors.length, 0, 512 / colors.length + 1, 256);
  });
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 512, 22);
  g.fillRect(0, 234, 512, 22);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
