import * as THREE from "three";
import { ATLAS_COLS, ATLAS_ROWS, makeParticleAtlas } from "./textures";

export interface SpawnOptions {
  shape: number;
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  size: number;
  life: number;
  color: THREE.ColorRepresentation;
  gravity?: number;
  grow?: number;
  spin?: number;
  sway?: number;
  drag?: number;
}

const CAP = 1800;

export class Particles {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private geo: THREE.BufferGeometry;
  private pos = new Float32Array(CAP * 3);
  private col = new Float32Array(CAP * 4);
  private size = new Float32Array(CAP);
  private shape = new Float32Array(CAP);
  private rot = new Float32Array(CAP);
  private vel = new Float32Array(CAP * 3);
  private life = new Float32Array(CAP);
  private maxLife = new Float32Array(CAP);
  private baseSize = new Float32Array(CAP);
  private grav = new Float32Array(CAP);
  private grow = new Float32Array(CAP);
  private spin = new Float32Array(CAP);
  private sway = new Float32Array(CAP);
  private drag = new Float32Array(CAP);
  private count = 0;
  private c = new THREE.Color();
  private t = 0;

  constructor() {
    this.geo = new THREE.BufferGeometry();
    const attr = (arr: Float32Array, n: number) => new THREE.BufferAttribute(arr, n).setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", attr(this.pos, 3));
    this.geo.setAttribute("aColor", attr(this.col, 4));
    this.geo.setAttribute("aSize", attr(this.size, 1));
    this.geo.setAttribute("aShape", attr(this.shape, 1));
    this.geo.setAttribute("aRot", attr(this.rot, 1));
    this.geo.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uAtlas: { value: makeParticleAtlas() },
        uScale: { value: 600 },
      },
      vertexShader: /* glsl */ `
        attribute vec4 aColor;
        attribute float aSize;
        attribute float aShape;
        attribute float aRot;
        uniform float uScale;
        varying vec4 vColor;
        varying float vShape;
        varying float vRot;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = aSize * uScale / max(0.1, -mv.z);
          vColor = aColor;
          vShape = aShape;
          vRot = aRot;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uAtlas;
        varying vec4 vColor;
        varying float vShape;
        varying float vRot;
        void main() {
          vec2 p = gl_PointCoord - 0.5;
          float c = cos(vRot);
          float s = sin(vRot);
          p = mat2(c, -s, s, c) * p + 0.5;
          if (p.x < 0.0 || p.y < 0.0 || p.x > 1.0 || p.y > 1.0) discard;
          float col = mod(vShape, ${ATLAS_COLS}.0);
          float row = floor(vShape / ${ATLAS_COLS}.0);
          vec2 uv = vec2((col + p.x) / ${ATLAS_COLS}.0, 1.0 - (row + p.y) / ${ATLAS_ROWS}.0);
          vec4 t = texture2D(uAtlas, uv);
          float a = t.a * vColor.a;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor.rgb * t.rgb, a);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  setViewport(heightPx: number, fovDeg: number) {
    this.material.uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
  }

  clear() {
    this.count = 0;
    this.geo.setDrawRange(0, 0);
  }

  get alive() {
    return this.count;
  }

  spawn(o: SpawnOptions) {
    if (this.count >= CAP) return;
    const i = this.count++;
    this.pos[i * 3] = o.x;
    this.pos[i * 3 + 1] = o.y;
    this.pos[i * 3 + 2] = o.z;
    this.vel[i * 3] = o.vx ?? 0;
    this.vel[i * 3 + 1] = o.vy ?? 0;
    this.vel[i * 3 + 2] = o.vz ?? 0;
    this.c.set(o.color);
    const srgb = this.c.convertLinearToSRGB();
    this.col[i * 4] = srgb.r;
    this.col[i * 4 + 1] = srgb.g;
    this.col[i * 4 + 2] = srgb.b;
    this.col[i * 4 + 3] = 1;
    this.baseSize[i] = o.size;
    this.size[i] = o.size;
    this.shape[i] = o.shape;
    this.rot[i] = o.spin ? Math.random() * Math.PI * 2 : 0;
    this.life[i] = 0;
    this.maxLife[i] = o.life;
    this.grav[i] = o.gravity ?? 0;
    this.grow[i] = o.grow ?? 0;
    this.spin[i] = o.spin ?? 0;
    this.sway[i] = o.sway ?? 0;
    this.drag[i] = o.drag ?? 0.6;
  }

  burst(n: number, base: Omit<SpawnOptions, "vx" | "vy" | "vz">, speed: number, up: number) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.5 + Math.random() * 0.7);
      this.spawn({ ...base, vx: Math.cos(a) * s, vy: up * (0.6 + Math.random() * 0.8), vz: Math.sin(a) * s });
    }
  }

  update(dt: number) {
    this.t += dt;
    let i = 0;
    while (i < this.count) {
      this.life[i] += dt;
      if (this.life[i] >= this.maxLife[i]) {
        this.swapRemove(i);
        continue;
      }
      const f = this.life[i] / this.maxLife[i];
      const damp = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= damp;
      this.vel[i * 3 + 2] *= damp;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * damp + this.grav[i] * dt;
      const sway = this.sway[i] ? Math.sin(this.t * 4 + i) * this.sway[i] * 0.3 * dt : 0;
      this.pos[i * 3] += (this.vel[i * 3] + sway) * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.02) {
        this.pos[i * 3 + 1] = 0.02;
        this.vel[i * 3 + 1] *= -0.3;
      }
      const popIn = Math.min(1, f * 8);
      this.size[i] = this.baseSize[i] * popIn * (1 + this.grow[i] * f);
      this.col[i * 4 + 3] = f < 0.6 ? 1 : 1 - (f - 0.6) / 0.4;
      this.rot[i] += this.spin[i] * dt;
      i++;
    }
    this.geo.setDrawRange(0, this.count);
    for (const name of ["position", "aColor", "aSize", "aShape", "aRot"]) {
      const a = this.geo.getAttribute(name) as THREE.BufferAttribute;
      a.needsUpdate = true;
      a.clearUpdateRanges();
      a.addUpdateRange(0, this.count * a.itemSize);
    }
  }

  private swapRemove(i: number) {
    const last = --this.count;
    if (i === last) return;
    const cp = (arr: Float32Array, n: number) => {
      for (let k = 0; k < n; k++) arr[i * n + k] = arr[last * n + k];
    };
    cp(this.pos, 3);
    cp(this.vel, 3);
    cp(this.col, 4);
    cp(this.size, 1);
    cp(this.shape, 1);
    cp(this.rot, 1);
    cp(this.life, 1);
    cp(this.maxLife, 1);
    cp(this.baseSize, 1);
    cp(this.grav, 1);
    cp(this.grow, 1);
    cp(this.spin, 1);
    cp(this.sway, 1);
    cp(this.drag, 1);
  }

  dispose() {
    this.geo.dispose();
    (this.material.uniforms.uAtlas.value as THREE.Texture).dispose();
    this.material.dispose();
  }
}

interface Ring {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  life: number;
  max: number;
  radius: number;
  active: boolean;
}

export class RingPool {
  readonly group = new THREE.Group();
  private rings: Ring[] = [];
  private next = 0;

  constructor(size = 48) {
    const geo = new THREE.RingGeometry(0.82, 1, 56);
    geo.rotateX(-Math.PI / 2);
    for (let i = 0; i < size; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      mesh.renderOrder = 2;
      this.group.add(mesh);
      this.rings.push({ mesh, mat, life: 0, max: 1, radius: 1, active: false });
    }
  }

  spawn(x: number, z: number, color: THREE.ColorRepresentation, radius: number, life = 0.7, y = 0.03) {
    const r = this.rings[this.next];
    this.next = (this.next + 1) % this.rings.length;
    r.mesh.position.set(x, y, z);
    r.mat.color.set(color);
    r.life = 0;
    r.max = life;
    r.radius = radius;
    r.active = true;
    r.mesh.visible = true;
  }

  clear() {
    for (const r of this.rings) {
      r.active = false;
      r.mesh.visible = false;
    }
  }

  update(dt: number) {
    for (const r of this.rings) {
      if (!r.active) continue;
      r.life += dt;
      const f = r.life / r.max;
      if (f >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const s = r.radius * (0.25 + 0.75 * (1 - Math.pow(1 - f, 3)));
      r.mesh.scale.setScalar(s);
      r.mat.opacity = (1 - f) * 0.75;
    }
  }
}
