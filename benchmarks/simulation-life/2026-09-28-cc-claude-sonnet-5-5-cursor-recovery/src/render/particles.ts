import * as THREE from 'three'

export const KIND_DOT = 0
export const KIND_STAR = 1
export const KIND_RING = 2

interface P {
  active: boolean
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  max: number
  s0: number
  s1: number
  r: number
  g: number
  b: number
  a: number
  kind: number
  gravity: number
  drag: number
  tx: number
  ty: number
  tz: number
  homing: number
  spin: number
}

export interface Spawn {
  x: number
  y: number
  z: number
  vx?: number
  vy?: number
  vz?: number
  life: number
  s0: number
  s1?: number
  color: THREE.ColorRepresentation
  alpha?: number
  kind?: number
  gravity?: number
  drag?: number
  target?: THREE.Vector3
  homing?: number
}

const VERT = /* glsl */ `
attribute float aSize;
attribute float aKind;
attribute vec4 aColor;
varying vec4 vColor;
varying float vKind;
uniform float uScale;
void main() {
  vColor = aColor;
  vKind = aKind;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, aSize * uScale / -mv.z);
}
`

const FRAG = /* glsl */ `
varying vec4 vColor;
varying float vKind;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r = length(p);
  float a = 0.0;
  if (vKind < 0.5) {
    a = smoothstep(1.0, 0.15, r);
  } else if (vKind < 1.5) {
    float d = min(abs(p.x), abs(p.y));
    float arms = smoothstep(0.28, 0.0, d) * smoothstep(1.0, 0.1, r);
    float core = smoothstep(0.42, 0.0, r);
    a = clamp(arms + core, 0.0, 1.0);
  } else {
    a = smoothstep(0.16, 0.0, abs(r - 0.78));
  }
  float alpha = vColor.a * a;
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor.rgb * alpha, alpha);
}
`

export class Particles {
  readonly points: THREE.Points
  private pool: P[]
  private cap: number
  private posAttr: THREE.BufferAttribute
  private colAttr: THREE.BufferAttribute
  private sizeAttr: THREE.BufferAttribute
  private kindAttr: THREE.BufferAttribute
  private material: THREE.ShaderMaterial
  private tmp = new THREE.Color()
  private live = 0

  constructor(cap = 1600) {
    this.cap = cap
    this.pool = Array.from({ length: cap }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0,
      max: 1,
      s0: 1,
      s1: 1,
      r: 1,
      g: 1,
      b: 1,
      a: 1,
      kind: 0,
      gravity: 0,
      drag: 0,
      tx: 0,
      ty: 0,
      tz: 0,
      homing: 0,
      spin: 0,
    }))
    const geo = new THREE.BufferGeometry()
    this.posAttr = new THREE.BufferAttribute(new Float32Array(cap * 3), 3).setUsage(THREE.DynamicDrawUsage)
    this.colAttr = new THREE.BufferAttribute(new Float32Array(cap * 4), 4).setUsage(THREE.DynamicDrawUsage)
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage)
    this.kindAttr = new THREE.BufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', this.posAttr)
    geo.setAttribute('aColor', this.colAttr)
    geo.setAttribute('aSize', this.sizeAttr)
    geo.setAttribute('aKind', this.kindAttr)
    geo.setDrawRange(0, 0)
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      uniforms: { uScale: { value: 600 } },
    })
    this.points = new THREE.Points(geo, this.material)
    this.points.frustumCulled = false
    this.points.renderOrder = 10
  }

  get load(): number {
    return this.live / this.cap
  }

  setScale(v: number) {
    this.material.uniforms.uScale.value = v
  }

  spawn(s: Spawn) {
    let slot: P | null = null
    for (let i = 0; i < this.cap; i++) {
      const p = this.pool[(i + this.live) % this.cap]
      if (!p.active) {
        slot = p
        break
      }
    }
    if (!slot) return
    this.tmp.set(s.color)
    slot.active = true
    slot.x = s.x
    slot.y = s.y
    slot.z = s.z
    slot.vx = s.vx ?? 0
    slot.vy = s.vy ?? 0
    slot.vz = s.vz ?? 0
    slot.life = 0
    slot.max = s.life
    slot.s0 = s.s0
    slot.s1 = s.s1 ?? s.s0
    slot.r = this.tmp.r
    slot.g = this.tmp.g
    slot.b = this.tmp.b
    slot.a = s.alpha ?? 1
    slot.kind = s.kind ?? KIND_DOT
    slot.gravity = s.gravity ?? 0
    slot.drag = s.drag ?? 0
    slot.homing = s.homing ?? 0
    if (s.target) {
      slot.tx = s.target.x
      slot.ty = s.target.y
      slot.tz = s.target.z
    }
  }

  update(dt: number) {
    let n = 0
    const pos = this.posAttr.array as Float32Array
    const col = this.colAttr.array as Float32Array
    const size = this.sizeAttr.array as Float32Array
    const kind = this.kindAttr.array as Float32Array
    for (let i = 0; i < this.cap; i++) {
      const p = this.pool[i]
      if (!p.active) continue
      p.life += dt
      if (p.life >= p.max) {
        p.active = false
        continue
      }
      const u = p.life / p.max
      if (p.homing > 0) {
        const dx = p.tx - p.x
        const dy = p.ty - p.y
        const dz = p.tz - p.z
        const d = Math.hypot(dx, dy, dz)
        if (d < 0.25) {
          p.active = false
          continue
        }
        const k = p.homing * (0.4 + u * 2.2)
        p.vx += (dx / d) * k * dt * 6
        p.vy += (dy / d) * k * dt * 6
        p.vz += (dz / d) * k * dt * 6
      }
      p.vy -= p.gravity * dt
      const damp = Math.exp(-p.drag * dt)
      p.vx *= damp
      p.vy *= damp
      p.vz *= damp
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      const fade = p.kind === KIND_RING ? 1 - u : Math.min(1, (1 - u) * 2.4) * Math.min(1, u * 14)
      pos[n * 3] = p.x
      pos[n * 3 + 1] = p.y
      pos[n * 3 + 2] = p.z
      col[n * 4] = p.r
      col[n * 4 + 1] = p.g
      col[n * 4 + 2] = p.b
      col[n * 4 + 3] = p.a * fade
      size[n] = p.s0 + (p.s1 - p.s0) * u
      kind[n] = p.kind
      n++
    }
    this.live = n
    this.posAttr.needsUpdate = true
    this.colAttr.needsUpdate = true
    this.sizeAttr.needsUpdate = true
    this.kindAttr.needsUpdate = true
    this.points.geometry.setDrawRange(0, n)
  }

  clear() {
    for (const p of this.pool) p.active = false
    this.live = 0
    this.points.geometry.setDrawRange(0, 0)
  }

  dispose() {
    this.points.geometry.dispose()
    this.material.dispose()
  }
}
