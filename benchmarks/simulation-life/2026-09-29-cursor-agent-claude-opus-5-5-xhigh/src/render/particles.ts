import * as THREE from "three";

export const Shape = { Dot: 0, Star: 1, Heart: 2, Ring: 3 } as const;
export type ShapeId = (typeof Shape)[keyof typeof Shape];

interface P {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  drag: number;
  life: number;
  maxLife: number;
  size: number;
  grow: number;
  r: number;
  g: number;
  b: number;
  shape: number;
  /** Homing particles travel along an arc from (x0..) to (x1..) instead of integrating velocity. */
  homing: boolean;
  x0: number;
  y0: number;
  z0: number;
  x1: number;
  y1: number;
  z1: number;
}

export interface EmitOptions {
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy?: number;
  vz?: number;
  gravity?: number;
  drag?: number;
  life: number;
  size: number;
  grow?: number;
  color: THREE.ColorRepresentation;
  shape?: ShapeId;
}

const vertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute float aShape;
  attribute vec3 aColor;
  varying float vAlpha;
  varying float vShape;
  varying vec3 vColor;
  uniform float uScale;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vAlpha = aAlpha;
    vShape = aShape;
    vColor = aColor;
  }
`;

const fragment = /* glsl */ `
  varying float vAlpha;
  varying float vShape;
  varying vec3 vColor;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    p.y = -p.y;
    float a = 0.0;
    if (vShape < 0.5) {
      float d = length(p);
      a = smoothstep(1.0, 0.2, d);
    } else if (vShape < 1.5) {
      vec2 q = abs(p);
      float star = max(0.0, 1.0 - (q.x * 6.0 + q.y) ) + max(0.0, 1.0 - (q.y * 6.0 + q.x));
      float core = smoothstep(0.45, 0.0, length(p));
      a = clamp(star + core, 0.0, 1.0);
    } else if (vShape < 2.5) {
      vec2 q = p * 1.25;
      q.y += 0.15;
      float x = abs(q.x);
      float h = q.y - sqrt(max(0.0, x)) * 0.62;
      float d = x * x + h * h * 1.35;
      a = smoothstep(0.62, 0.5, d);
    } else {
      float d = length(p);
      a = smoothstep(0.12, 0.0, abs(d - 0.78)) * 0.9;
    }
    if (a * vAlpha < 0.01) discard;
    gl_FragColor = vec4(vColor, a * vAlpha);
  }
`;

export class Particles {
  readonly points: THREE.Points;
  private pool: P[];
  private cursor = 0;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private shapes: Float32Array;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private tmp = new THREE.Color();

  constructor(capacity: number, blending: THREE.Blending) {
    this.pool = Array.from({ length: capacity }, () => ({
      alive: false,
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      gravity: 0,
      drag: 0,
      life: 0,
      maxLife: 1,
      size: 1,
      grow: 0,
      r: 1,
      g: 1,
      b: 1,
      shape: 0,
      homing: false,
      x0: 0,
      y0: 0,
      z0: 0,
      x1: 0,
      y1: 0,
      z1: 0,
    }));
    this.positions = new Float32Array(capacity * 3);
    this.colors = new Float32Array(capacity * 3);
    this.sizes = new Float32Array(capacity);
    this.alphas = new Float32Array(capacity);
    this.shapes = new Float32Array(capacity);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("aColor", new THREE.BufferAttribute(this.colors, 3).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("aSize", new THREE.BufferAttribute(this.sizes, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("aAlpha", new THREE.BufferAttribute(this.alphas, 1).setUsage(THREE.DynamicDrawUsage));
    this.geometry.setAttribute("aShape", new THREE.BufferAttribute(this.shapes, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      transparent: true,
      depthWrite: false,
      blending,
      uniforms: { uScale: { value: 400 } },
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
  }

  setScale(viewportHeight: number) {
    this.material.uniforms.uScale.value = viewportHeight * 0.9;
  }

  private next(): P {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % this.pool.length;
      if (!p.alive) return p;
    }
    const p = this.pool[this.cursor];
    this.cursor = (this.cursor + 1) % this.pool.length;
    return p;
  }

  emit(o: EmitOptions) {
    const p = this.next();
    this.tmp.set(o.color);
    p.alive = true;
    p.homing = false;
    p.x = o.x;
    p.y = o.y;
    p.z = o.z;
    p.vx = o.vx ?? 0;
    p.vy = o.vy ?? 0;
    p.vz = o.vz ?? 0;
    p.gravity = o.gravity ?? 0;
    p.drag = o.drag ?? 0;
    p.life = p.maxLife = o.life;
    p.size = o.size;
    p.grow = o.grow ?? 0;
    p.r = this.tmp.r;
    p.g = this.tmp.g;
    p.b = this.tmp.b;
    p.shape = o.shape ?? Shape.Dot;
  }

  /** A particle that arcs from one point to another over its lifetime (energy flowing between blobs). */
  stream(
    from: THREE.Vector3Like,
    to: THREE.Vector3Like,
    life: number,
    size: number,
    color: THREE.ColorRepresentation,
    shape: ShapeId = Shape.Dot,
  ) {
    const p = this.next();
    this.tmp.set(color);
    p.alive = true;
    p.homing = true;
    p.x0 = from.x;
    p.y0 = from.y;
    p.z0 = from.z;
    p.x1 = to.x;
    p.y1 = to.y;
    p.z1 = to.z;
    p.x = from.x;
    p.y = from.y;
    p.z = from.z;
    p.life = p.maxLife = life;
    p.size = size;
    p.grow = 0;
    p.r = this.tmp.r;
    p.g = this.tmp.g;
    p.b = this.tmp.b;
    p.shape = shape;
  }

  update(dt: number) {
    const pool = this.pool;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      const i3 = i * 3;
      if (!p.alive) {
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        this.alphas[i] = 0;
        this.sizes[i] = 0;
        continue;
      }
      const t = 1 - p.life / p.maxLife;
      if (p.homing) {
        const e = t * t * (3 - 2 * t);
        p.x = p.x0 + (p.x1 - p.x0) * e;
        p.z = p.z0 + (p.z1 - p.z0) * e;
        p.y = p.y0 + (p.y1 - p.y0) * e + Math.sin(t * Math.PI) * 0.7;
      } else {
        const damp = Math.max(0, 1 - p.drag * dt);
        p.vx *= damp;
        p.vy = p.vy * damp - p.gravity * dt;
        p.vz *= damp;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
        if (p.gravity > 0 && p.y < 0.03) {
          p.y = 0.03;
          p.vy *= -0.3;
          p.vx *= 0.6;
          p.vz *= 0.6;
        }
      }
      this.positions[i3] = p.x;
      this.positions[i3 + 1] = p.y;
      this.positions[i3 + 2] = p.z;
      this.colors[i3] = p.r;
      this.colors[i3 + 1] = p.g;
      this.colors[i3 + 2] = p.b;
      const fadeIn = Math.min(1, t * 8);
      const fadeOut = Math.min(1, (p.life / p.maxLife) * 2.5);
      this.alphas[i] = fadeIn * fadeOut;
      this.sizes[i] = p.size * (1 + p.grow * t);
      this.shapes[i] = p.shape;
    }
    const g = this.geometry;
    g.attributes.position.needsUpdate = true;
    g.attributes.aColor.needsUpdate = true;
    g.attributes.aSize.needsUpdate = true;
    g.attributes.aAlpha.needsUpdate = true;
    g.attributes.aShape.needsUpdate = true;
  }

  clear() {
    for (const p of this.pool) p.alive = false;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}
