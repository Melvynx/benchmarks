import * as THREE from 'three'

export const FX = { sparkle: 0, heart: 1, drop: 2, zzz: 3, bang: 4, crumb: 5, ring: 6, dot: 7 } as const
export type Frame = (typeof FX)[keyof typeof FX]

const COLS = 4
const ROWS = 2
const CELL = 128

function drawAtlas(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = COLS * CELL
  c.height = ROWS * CELL
  const g = c.getContext('2d')!
  const cell = (i: number, draw: (cx: number, cy: number, s: number) => void) => {
    const cx = (i % COLS) * CELL + CELL / 2
    const cy = Math.floor(i / COLS) * CELL + CELL / 2
    g.save()
    draw(cx, cy, CELL / 2 - 8)
    g.restore()
  }
  const outline = 'rgba(40,30,40,0.35)'

  cell(FX.sparkle, (x, y, s) => {
    g.beginPath()
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 - Math.PI / 2
      const r = k % 2 === 0 ? s : s * 0.28
      g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r)
    }
    g.closePath()
    g.fillStyle = '#fff'
    g.shadowColor = 'rgba(255,255,255,0.9)'
    g.shadowBlur = 10
    g.fill()
  })
  cell(FX.heart, (x, y, s) => {
    g.beginPath()
    const k = s * 0.9
    g.moveTo(x, y + k * 0.75)
    g.bezierCurveTo(x - k * 1.25, y - k * 0.05, x - k * 0.6, y - k * 0.95, x, y - k * 0.38)
    g.bezierCurveTo(x + k * 0.6, y - k * 0.95, x + k * 1.25, y - k * 0.05, x, y + k * 0.75)
    g.fillStyle = '#fff'
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = outline
    g.stroke()
  })
  cell(FX.drop, (x, y, s) => {
    g.beginPath()
    g.moveTo(x, y - s * 0.95)
    g.bezierCurveTo(x + s * 0.2, y - s * 0.5, x + s * 0.7, y, x + s * 0.62, y + s * 0.35)
    g.arc(x, y + s * 0.32, s * 0.62, 0.05, Math.PI - 0.05)
    g.bezierCurveTo(x - s * 0.7, y, x - s * 0.2, y - s * 0.5, x, y - s * 0.95)
    g.fillStyle = '#fff'
    g.fill()
    g.lineWidth = 5
    g.strokeStyle = outline
    g.stroke()
  })
  cell(FX.zzz, (x, y, s) => {
    g.font = `900 ${s * 1.7}px system-ui, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.lineWidth = 8
    g.strokeStyle = outline
    g.strokeText('z', x, y + 4)
    g.fillStyle = '#fff'
    g.fillText('z', x, y + 4)
  })
  cell(FX.bang, (x, y, s) => {
    g.font = `900 ${s * 1.8}px system-ui, sans-serif`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.lineWidth = 8
    g.strokeStyle = outline
    g.strokeText('!', x, y + 4)
    g.fillStyle = '#fff'
    g.fillText('!', x, y + 4)
  })
  cell(FX.crumb, (x, y, s) => {
    g.beginPath()
    g.arc(x, y, s * 0.7, 0, Math.PI * 2)
    g.fillStyle = '#fff'
    g.fill()
    g.lineWidth = 6
    g.strokeStyle = outline
    g.stroke()
  })
  cell(FX.ring, (x, y, s) => {
    g.beginPath()
    g.arc(x, y, s * 0.82, 0, Math.PI * 2)
    g.lineWidth = s * 0.18
    g.strokeStyle = '#fff'
    g.shadowColor = 'rgba(255,255,255,0.8)'
    g.shadowBlur = 8
    g.stroke()
  })
  cell(FX.dot, (x, y, s) => {
    const grd = g.createRadialGradient(x, y, 0, x, y, s)
    grd.addColorStop(0, 'rgba(255,255,255,1)')
    grd.addColorStop(0.4, 'rgba(255,255,255,0.6)')
    grd.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grd
    g.fillRect(x - s, y - s, s * 2, s * 2)
  })

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  return tex
}

export interface SpawnOpts {
  x: number
  y: number
  z: number
  vx?: number
  vy?: number
  vz?: number
  life: number
  size: number
  color: THREE.ColorRepresentation
  frame: Frame
  gravity?: number
  /** Size change per second (as a multiple of the start size). */
  grow?: number
  drag?: number
}

/** Pooled point sprites for sparkles, hearts, crumbs and the little status icons. */
export class Particles {
  readonly points: THREE.Points
  private max: number
  private geo: THREE.BufferGeometry
  private pos: Float32Array
  private col: Float32Array
  private siz: Float32Array
  private frm: Float32Array
  // dynamic particle state
  private n = 0
  private px: Float32Array
  private v: Float32Array
  private life: Float32Array
  private age: Float32Array
  private size0: Float32Array
  private rgb: Float32Array
  private frame: Float32Array
  private grav: Float32Array
  private grow: Float32Array
  private drag: Float32Array
  private statics = 0
  private tmp = new THREE.Color()
  private mat: THREE.ShaderMaterial

  constructor(max = 5000) {
    this.max = max
    this.pos = new Float32Array(max * 3)
    this.col = new Float32Array(max * 4)
    this.siz = new Float32Array(max)
    this.frm = new Float32Array(max)
    this.px = new Float32Array(max * 3)
    this.v = new Float32Array(max * 3)
    this.life = new Float32Array(max)
    this.age = new Float32Array(max)
    this.size0 = new Float32Array(max)
    this.rgb = new Float32Array(max * 3)
    this.frame = new Float32Array(max)
    this.grav = new Float32Array(max)
    this.grow = new Float32Array(max)
    this.drag = new Float32Array(max)

    this.geo = new THREE.BufferGeometry()
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage))
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage))
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.siz, 1).setUsage(THREE.DynamicDrawUsage))
    this.geo.setAttribute('frame', new THREE.BufferAttribute(this.frm, 1).setUsage(THREE.DynamicDrawUsage))
    this.geo.setDrawRange(0, 0)

    this.mat = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: drawAtlas() }, scale: { value: 600 } },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute vec4 color;
        attribute float frame;
        uniform float scale;
        varying vec4 vColor;
        varying float vFrame;
        void main() {
          vColor = color;
          vFrame = frame;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * scale / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        varying vec4 vColor;
        varying float vFrame;
        void main() {
          vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
          float col = mod(vFrame, ${COLS}.0);
          float row = floor(vFrame / ${COLS}.0);
          vec2 a = vec2((uv.x + col) / ${COLS}.0, (uv.y + (${ROWS}.0 - 1.0 - row)) / ${ROWS}.0);
          vec4 t = texture2D(atlas, a);
          vec4 c = vec4(t.rgb * vColor.rgb, t.a * vColor.a);
          if (c.a < 0.02) discard;
          gl_FragColor = c;
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
    })
    this.points = new THREE.Points(this.geo, this.mat)
    this.points.frustumCulled = false
    this.points.renderOrder = 10
  }

  setScale(viewportHeightPx: number, fovDeg: number) {
    this.mat.uniforms.scale.value = viewportHeightPx / (2 * Math.tan((fovDeg * Math.PI) / 360))
  }

  get free(): number {
    return this.max - this.n - 400
  }

  spawn(o: SpawnOpts) {
    if (this.n >= this.max - 400) return
    const i = this.n++
    this.px[i * 3] = o.x
    this.px[i * 3 + 1] = o.y
    this.px[i * 3 + 2] = o.z
    this.v[i * 3] = o.vx ?? 0
    this.v[i * 3 + 1] = o.vy ?? 0
    this.v[i * 3 + 2] = o.vz ?? 0
    this.life[i] = o.life
    this.age[i] = 0
    this.size0[i] = o.size
    this.tmp.set(o.color)
    this.rgb[i * 3] = this.tmp.r
    this.rgb[i * 3 + 1] = this.tmp.g
    this.rgb[i * 3 + 2] = this.tmp.b
    this.frame[i] = o.frame
    this.grav[i] = o.gravity ?? 0
    this.grow[i] = o.grow ?? 0
    this.drag[i] = o.drag ?? 0
  }

  /** Starts a frame: advances dynamic particles and clears one-frame icons. */
  begin(dt: number) {
    let w = 0
    for (let i = 0; i < this.n; i++) {
      const age = this.age[i] + dt
      if (age >= this.life[i]) continue
      if (w !== i) this.copy(i, w)
      this.age[w] = age
      const d = Math.max(0, 1 - this.drag[w] * dt)
      this.v[w * 3] *= d
      this.v[w * 3 + 1] = this.v[w * 3 + 1] * d - this.grav[w] * dt
      this.v[w * 3 + 2] *= d
      this.px[w * 3] += this.v[w * 3] * dt
      this.px[w * 3 + 1] += this.v[w * 3 + 1] * dt
      this.px[w * 3 + 2] += this.v[w * 3 + 2] * dt
      if (this.px[w * 3 + 1] < 0.03) {
        this.px[w * 3 + 1] = 0.03
        this.v[w * 3 + 1] *= -0.3
        this.v[w * 3] *= 0.6
        this.v[w * 3 + 2] *= 0.6
      }
      w++
    }
    this.n = w
    for (let i = 0; i < this.n; i++) {
      const k = this.age[i] / this.life[i]
      this.pos[i * 3] = this.px[i * 3]
      this.pos[i * 3 + 1] = this.px[i * 3 + 1]
      this.pos[i * 3 + 2] = this.px[i * 3 + 2]
      this.col[i * 4] = this.rgb[i * 3]
      this.col[i * 4 + 1] = this.rgb[i * 3 + 1]
      this.col[i * 4 + 2] = this.rgb[i * 3 + 2]
      // quick fade in, gentle fade out
      this.col[i * 4 + 3] = Math.min(1, k * 8) * (1 - k * k)
      this.siz[i] = this.size0[i] * Math.max(0.05, 1 + this.grow[i] * this.age[i])
      this.frm[i] = this.frame[i]
    }
    this.statics = 0
  }

  /** A sprite drawn for this frame only (status icons above blobs). */
  icon(x: number, y: number, z: number, size: number, color: THREE.ColorRepresentation, alpha: number, frame: Frame) {
    const i = this.n + this.statics
    if (i >= this.max) return
    this.statics++
    this.tmp.set(color)
    this.pos[i * 3] = x
    this.pos[i * 3 + 1] = y
    this.pos[i * 3 + 2] = z
    this.col[i * 4] = this.tmp.r
    this.col[i * 4 + 1] = this.tmp.g
    this.col[i * 4 + 2] = this.tmp.b
    this.col[i * 4 + 3] = alpha
    this.siz[i] = size
    this.frm[i] = frame
  }

  end() {
    const count = this.n + this.statics
    for (const name of ['position', 'color', 'size', 'frame']) {
      const a = this.geo.getAttribute(name) as THREE.BufferAttribute
      a.clearUpdateRanges()
      a.addUpdateRange(0, count * a.itemSize)
      a.needsUpdate = true
    }
    this.geo.setDrawRange(0, count)
  }

  clear() {
    this.n = 0
    this.statics = 0
    this.geo.setDrawRange(0, 0)
  }

  private copy(from: number, to: number) {
    for (let k = 0; k < 3; k++) {
      this.px[to * 3 + k] = this.px[from * 3 + k]
      this.v[to * 3 + k] = this.v[from * 3 + k]
      this.rgb[to * 3 + k] = this.rgb[from * 3 + k]
    }
    this.life[to] = this.life[from]
    this.size0[to] = this.size0[from]
    this.frame[to] = this.frame[from]
    this.grav[to] = this.grav[from]
    this.grow[to] = this.grow[from]
    this.drag[to] = this.drag[from]
  }
}
