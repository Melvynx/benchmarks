import * as THREE from "three";

export const BODY_W = 0.54;
export const BODY_D = 0.48;
export const BODY_H = 0.8;

const EGG = 0.14;

function eggTransform(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const k = 1 - EGG * y;
  return out.set(x * k * (BODY_W / 2), (y + 1) * (BODY_H / 2), z * k * (BODY_D / 2));
}

/** Exact surface normal of the egg at unit-sphere point (x, y, z), from the gradient of its implicit form. */
function eggNormal(x: number, y: number, z: number, out: THREE.Vector3): THREE.Vector3 {
  const k = 1 - EGG * y;
  return out
    .set(x / (k * BODY_W), (y + (EGG * (x * x + z * z)) / k) / BODY_H, z / (k * BODY_D))
    .normalize();
}

/** Bean/egg body with its origin at the feet so squash & lean pivot on the ground. */
export function makeBodyGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 24, 16);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const nrm = g.attributes.normal as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    eggNormal(x, y, z, v);
    nrm.setXYZ(i, v.x, v.y, v.z);
    eggTransform(x, y, z, v);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeBoundingSphere();
  return g;
}

/** Local frame sitting on the body surface in direction `dir`, z axis pointing outwards. */
export function surfaceFrame(dir: THREE.Vector3, lift = 0.004): THREE.Matrix4 {
  const d = dir.clone().normalize();
  const p = eggTransform(d.x, d.y, d.z, new THREE.Vector3());
  const n = eggNormal(d.x, d.y, d.z, new THREE.Vector3());
  p.addScaledVector(n, lift);
  const x = new THREE.Vector3(0, 1, 0).cross(n).normalize();
  const y = n.clone().cross(x).normalize();
  return new THREE.Matrix4().makeBasis(x, y, n).setPosition(p);
}

/** 4×2 sprite atlas: soft dot, star, heart, ring, "!", drop, "z", leaf. */
export const SPRITE = { dot: 0, star: 1, heart: 2, ring: 3, bang: 4, drop: 5, zz: 6, leaf: 7 } as const;

export function makeSpriteAtlas(): THREE.CanvasTexture {
  const cell = 128;
  const c = document.createElement("canvas");
  c.width = cell * 4;
  c.height = cell * 2;
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.strokeStyle = "#fff";
  const at = (i: number) => [(i % 4) * cell + cell / 2, Math.floor(i / 4) * cell + cell / 2] as const;

  {
    const [x, y] = at(SPRITE.dot);
    const grd = g.createRadialGradient(x, y, 0, x, y, cell / 2);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.45, "rgba(255,255,255,0.85)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(x - cell / 2, y - cell / 2, cell, cell);
    g.fillStyle = "#fff";
  }
  {
    const [x, y] = at(SPRITE.star);
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const r = i % 2 === 0 ? cell * 0.46 : cell * 0.11;
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  }
  {
    const [x, y] = at(SPRITE.heart);
    const s = cell * 0.36;
    g.beginPath();
    g.moveTo(x, y + s * 0.95);
    g.bezierCurveTo(x - s * 1.6, y - s * 0.1, x - s * 0.8, y - s * 1.3, x, y - s * 0.45);
    g.bezierCurveTo(x + s * 0.8, y - s * 1.3, x + s * 1.6, y - s * 0.1, x, y + s * 0.95);
    g.fill();
  }
  {
    const [x, y] = at(SPRITE.ring);
    g.lineWidth = cell * 0.09;
    g.beginPath();
    g.arc(x, y, cell * 0.38, 0, Math.PI * 2);
    g.stroke();
  }
  {
    const [x, y] = at(SPRITE.bang);
    g.beginPath();
    g.roundRect(x - cell * 0.09, y - cell * 0.42, cell * 0.18, cell * 0.56, cell * 0.09);
    g.fill();
    g.beginPath();
    g.arc(x, y + cell * 0.32, cell * 0.1, 0, Math.PI * 2);
    g.fill();
  }
  {
    const [x, y] = at(SPRITE.drop);
    g.beginPath();
    g.moveTo(x, y - cell * 0.42);
    g.bezierCurveTo(x + cell * 0.36, y, x + cell * 0.3, y + cell * 0.4, x, y + cell * 0.4);
    g.bezierCurveTo(x - cell * 0.3, y + cell * 0.4, x - cell * 0.36, y, x, y - cell * 0.42);
    g.fill();
  }
  {
    const [x, y] = at(SPRITE.zz);
    g.font = `900 ${cell * 0.7}px ui-rounded, system-ui, sans-serif`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("z", x, y + cell * 0.04);
  }
  {
    const [x, y] = at(SPRITE.leaf);
    g.beginPath();
    g.ellipse(x, y, cell * 0.2, cell * 0.38, Math.PI / 5, 0, Math.PI * 2);
    g.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Painted grass for the dish top: soft patches, mowing stripes and tiny flowers. */
export function makeGrassTexture(seed: number): THREE.CanvasTexture {
  const size = 1024;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d")!;
  let s = seed >>> 0 || 1;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const base = g.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size / 2);
  base.addColorStop(0, "#a9dc7e");
  base.addColorStop(0.75, "#98d06f");
  base.addColorStop(1, "#86c062");
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);

  for (let i = 0; i < 70; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const r = 30 + rnd() * 110;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    const light = rnd() > 0.5;
    grd.addColorStop(0, light ? "rgba(200,240,150,0.35)" : "rgba(90,160,80,0.28)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }

  for (let i = 0; i < 5200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const len = 3 + rnd() * 6;
    const a = -Math.PI / 2 + (rnd() - 0.5) * 0.9;
    g.strokeStyle = rnd() > 0.5 ? "rgba(120,190,90,0.55)" : "rgba(175,225,130,0.55)";
    g.lineWidth = 1.2;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    g.stroke();
  }

  const petals = ["#ffffff", "#ffe27a", "#ffb3c7", "#c9b8ff"];
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const col = petals[Math.floor(rnd() * petals.length)];
    g.fillStyle = col;
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * Math.PI * 2;
      g.beginPath();
      g.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2.1, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = "#f6b73c";
    g.beginPath();
    g.arc(x, y, 1.6, 0, Math.PI * 2);
    g.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
