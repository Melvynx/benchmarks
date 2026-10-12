import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js'
import { BLUE, RED, BODY_RADIUS, MAX_SLOTS, slotAngle, type Blob, type SimEvent, type Tree, type World } from '../sim/world.ts'
import { Particles, FX } from './particles.ts'

/** Half-height of the bean relative to its radius. */
const BEAN_H = 1.18
const BEAN_BOTTOM = 0.82
/** Height of the bean's widest point above its base (unit radius). */
const MID = BEAN_BOTTOM * BEAN_H
const TOP = MID + BEAN_H

/** Blobs are drawn a little larger than their collision body so faces read at garden scale. */
const VIS = 1.35
const CANOPY_R = 1.25
const canopyY = (t: Tree) => 1.75 * t.scale

const COL = {
  blue: new THREE.Color('#3b82ec'),
  bluePale: new THREE.Color('#b9c7de'),
  red: new THREE.Color('#ec5448'),
  redPale: new THREE.Color('#e5c3bf'),
  glowWarm: new THREE.Color('#fff1b8'),
  faded: new THREE.Color('#c9c4bd'),
  fruitRipe: new THREE.Color('#a4dd3c'),
  fruitYoung: new THREE.Color('#4f7f2c'),
  haloRed: new THREE.Color('#ffc36b'),
  haloBlue: new THREE.Color('#b4ff7a'),
}

interface Vis {
  hop: number
  lean: number
  lx: number
  lz: number
  blinkAt: number
  blinkT: number
  sy: number
}

function beanGeometry(): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.SphereGeometry(1, 40, 28)
  g.deleteAttribute('uv')
  g.deleteAttribute('normal')
  g = mergeVertices(g)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    let y = p.getY(i)
    const z = p.getZ(i)
    // bottom-heavy bean with a slightly flattened base
    const w = 1 + 0.08 * (0.5 - y * 0.5)
    if (y < -0.6) y = -0.6 + (y + 0.6) * 0.55
    p.setXYZ(i, x * w, y * BEAN_H + MID, z * w)
  }
  g.computeVertexNormals()
  return g
}

function radialTexture(inner: string, outer: string, size = 128): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, inner)
  grd.addColorStop(1, outer)
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function grassTexture(seed: number): THREE.CanvasTexture {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  let s = seed >>> 0 || 1
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)
  g.fillStyle = '#8fc76b'
  g.fillRect(0, 0, S, S)
  const blot = (color: string, n: number, rMin: number, rMax: number, a: number) => {
    for (let i = 0; i < n; i++) {
      const x = rnd() * S
      const y = rnd() * S
      const r = rMin + rnd() * (rMax - rMin)
      const grd = g.createRadialGradient(x, y, 0, x, y, r)
      grd.addColorStop(0, color)
      grd.addColorStop(1, 'rgba(0,0,0,0)')
      g.globalAlpha = a
      g.fillStyle = grd
      g.fillRect(x - r, y - r, r * 2, r * 2)
    }
  }
  blot('#a6d77f', 90, 40, 140, 0.55)
  blot('#78b35a', 80, 30, 120, 0.45)
  blot('#b9e08e', 60, 10, 40, 0.5)
  g.globalAlpha = 0.35
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rnd() < 0.5 ? '#6ea552' : '#b3dd8a'
    const x = rnd() * S
    const y = rnd() * S
    g.fillRect(x, y, 2 + rnd() * 3, 5 + rnd() * 6)
  }
  // soft darkening towards the rim
  g.globalAlpha = 1
  const v = g.createRadialGradient(S / 2, S / 2, S * 0.3, S / 2, S / 2, S / 2)
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(40,70,20,0.28)')
  g.fillStyle = v
  g.fillRect(0, 0, S, S)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

class Parts {
  bodies: THREE.InstancedMesh
  eyes: THREE.InstancedMesh
  glints: THREE.InstancedMesh
  mouths: THREE.InstancedMesh
  cheeks: THREE.InstancedMesh
  shadows: THREE.InstancedMesh
  halos: THREE.InstancedMesh
  all: THREE.InstancedMesh[]

  constructor(cap: number, geo: Record<string, THREE.BufferGeometry>, mat: Record<string, THREE.Material>) {
    const mk = (g: THREE.BufferGeometry, m: THREE.Material, n: number) => {
      const im = new THREE.InstancedMesh(g, m, n)
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      im.frustumCulled = false
      im.count = 0
      return im
    }
    this.bodies = mk(geo.bean, mat.body, cap)
    this.bodies.castShadow = true
    this.bodies.setColorAt(0, new THREE.Color())
    this.eyes = mk(geo.eye, mat.eye, cap * 2)
    this.glints = mk(geo.glint, mat.glint, cap * 2)
    this.mouths = mk(geo.mouth, mat.mouth, cap)
    this.cheeks = mk(geo.cheek, mat.cheek, cap * 2)
    this.shadows = mk(geo.shadow, mat.shadow, cap)
    this.shadows.renderOrder = 1
    this.halos = mk(geo.halo, mat.halo, cap)
    this.halos.setColorAt(0, new THREE.Color())
    this.halos.renderOrder = 5
    this.all = [this.bodies, this.eyes, this.glints, this.mouths, this.cheeks, this.shadows, this.halos]
  }

  dispose() {
    for (const m of this.all) m.dispose()
  }
}

export class GardenView {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls
  private container: HTMLElement
  private ro: ResizeObserver
  private sun: THREE.DirectionalLight
  private dish = new THREE.Group()
  private treeRoot = new THREE.Group()
  private treeNodes: { canopy: THREE.Group; tree: Tree; pulse: number }[] = []
  private fruit: THREE.InstancedMesh
  private stems: THREE.InstancedMesh
  private parts: Parts
  private cap = 256
  private geo: Record<string, THREE.BufferGeometry>
  private mat: Record<string, THREE.Material>
  private particles = new Particles()
  private vis = new Map<number, Vis>()
  private ids: number[] = []
  private centers = new Float32Array(256 * 4)
  private mouthPos = new Map<number, THREE.Vector3>()
  private selRing: THREE.Mesh
  private visionRing: THREE.Mesh
  private visionDisc: THREE.Mesh
  private intent: THREE.Line
  private radius = 0
  private worldRef: World | null = null
  private clock = 0
  private down: { x: number; y: number; t: number } | null = null
  private hover: { x: number; y: number } | null = null
  private hoverDirty = false
  onPick: (id: number | null) => void = () => {}

  // scratch
  private m = new THREE.Matrix4()
  private m2 = new THREE.Matrix4()
  private q = new THREE.Quaternion()
  private e = new THREE.Euler(0, 0, 0, 'YZX')
  private v = new THREE.Vector3()
  private v2 = new THREE.Vector3()
  private s = new THREE.Vector3()
  private c = new THREE.Color()
  private qI = new THREE.Quaternion()

  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.domElement.className = 'garden-canvas'
    container.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 600)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enablePan = false
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.rotateSpeed = 0.7
    this.controls.zoomSpeed = 0.8
    this.controls.minPolarAngle = 0.12
    this.controls.maxPolarAngle = 1.25

    this.scene.add(new THREE.HemisphereLight('#fff8ec', '#8fb87d', 1.25))
    this.sun = new THREE.DirectionalLight('#fff0d6', 2.3)
    this.sun.castShadow = true
    this.sun.shadow.mapSize.set(2048, 2048)
    this.sun.shadow.bias = -0.0004
    this.sun.shadow.normalBias = 0.03
    this.sun.shadow.radius = 3
    this.scene.add(this.sun, this.sun.target)
    const fill = new THREE.DirectionalLight('#dbe6ff', 0.45)
    fill.position.set(-30, 20, -25)
    this.scene.add(fill)

    this.geo = {
      bean: beanGeometry(),
      eye: new THREE.SphereGeometry(0.15, 16, 12),
      glint: new THREE.SphereGeometry(0.05, 8, 6),
      mouth: (() => {
        const g = new THREE.TorusGeometry(0.13, 0.036, 8, 20, Math.PI)
        g.rotateZ(Math.PI)
        g.rotateY(Math.PI / 2)
        return g
      })(),
      cheek: (() => {
        const g = new THREE.CircleGeometry(0.12, 20)
        g.rotateY(Math.PI / 2)
        return g
      })(),
      shadow: (() => {
        const g = new THREE.PlaneGeometry(2, 2)
        g.rotateX(-Math.PI / 2)
        return g
      })(),
      halo: new THREE.SphereGeometry(1, 20, 14),
    }
    this.mat = {
      body: new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.25, sheenColor: new THREE.Color('#ffffff') }),
      eye: new THREE.MeshStandardMaterial({ color: '#1d2231', roughness: 0.22 }),
      glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      mouth: new THREE.MeshStandardMaterial({ color: '#2a1d28', roughness: 0.5 }),
      cheek: new THREE.MeshBasicMaterial({ color: '#ff8fa6', transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
      shadow: new THREE.MeshBasicMaterial({ map: radialTexture('rgba(30,45,20,0.42)', 'rgba(30,45,20,0)'), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
      halo: new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }),
    }
    this.parts = new Parts(this.cap, this.geo, this.mat)
    for (const p of this.parts.all) this.scene.add(p)

    const fruitGeo = new THREE.SphereGeometry(0.25, 18, 14)
    fruitGeo.scale(1, 1.1, 1)
    this.fruit = new THREE.InstancedMesh(fruitGeo, new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }), 40 * MAX_SLOTS)
    this.fruit.setColorAt(0, new THREE.Color())
    this.fruit.castShadow = true
    this.fruit.frustumCulled = false
    const stemGeo = new THREE.CylinderGeometry(0.028, 0.04, 0.2, 5)
    stemGeo.translate(0, 0.1, 0)
    this.stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshStandardMaterial({ color: '#6b5a2e', roughness: 0.8 }), 40 * MAX_SLOTS)
    this.stems.frustumCulled = false
    this.scene.add(this.dish, this.treeRoot, this.fruit, this.stems, this.particles.points)

    this.selRing = new THREE.Mesh(
      new THREE.RingGeometry(1, 1.2, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.95, depthWrite: false }),
    )
    this.visionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.985, 1, 128).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false }),
    )
    this.visionDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, depthWrite: false }),
    )
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()])
    this.intent = new THREE.Line(lineGeo, new THREE.LineDashedMaterial({ color: '#ffffff', dashSize: 0.35, gapSize: 0.22, transparent: true, opacity: 0.9, depthWrite: false }))
    for (const o of [this.selRing, this.visionRing, this.visionDisc, this.intent]) {
      o.visible = false
      o.renderOrder = 3
      o.frustumCulled = false
      this.scene.add(o)
    }

    const el = this.renderer.domElement
    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerleave', this.onLeave)
    this.ro = new ResizeObserver(() => this.resize())
    this.ro.observe(container)
    this.resize()
  }

  // ------------------------------------------------------------ setup

  setWorld(world: World) {
    const R = world.radius
    const radiusChanged = R !== this.radius
    this.worldRef = world
    this.radius = R
    this.vis.clear()
    this.particles.clear()
    this.buildDish(world)
    this.buildTrees(world)

    const s = this.sun.shadow.camera
    s.left = -R - 4
    s.right = R + 4
    s.top = R + 4
    s.bottom = -R - 4
    s.near = 1
    s.far = R * 5
    s.updateProjectionMatrix()
    this.sun.position.set(R * 0.55, R * 1.6, R * 0.8)
    this.sun.target.position.set(0, 0, 0)

    this.controls.minDistance = R * 0.9
    this.controls.maxDistance = R * 5
    if (radiusChanged) this.frameCamera()
  }

  frameCamera() {
    const R = this.radius
    const d = R * 2.7
    const polar = 0.8
    const az = 0.55
    // aim a bit in front of centre so perspective doesn't push the near rim off-screen
    const lead = R * 0.12
    const tx = Math.cos(az) * lead
    const tz = Math.sin(az) * lead
    this.controls.target.set(tx, 0.4, tz)
    this.camera.position.set(tx + Math.sin(polar) * d * Math.cos(az), 0.4 + Math.cos(polar) * d, tz + Math.sin(polar) * d * Math.sin(az))
    this.controls.update()
  }

  private disposeGroup(g: THREE.Object3D) {
    g.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mm = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mm)) mm.forEach((x) => x.dispose())
      else if (mm) {
        const map = (mm as THREE.MeshStandardMaterial).map
        if (map) map.dispose()
        mm.dispose()
      }
    })
    g.clear()
  }

  private buildDish(world: World) {
    this.disposeGroup(this.dish)
    const R = world.radius
    let s = (world.params.seed * 9301 + 49297) >>> 0
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296)

    const grass = new THREE.Mesh(new THREE.CircleGeometry(R, 160), new THREE.MeshStandardMaterial({ map: grassTexture(world.params.seed), roughness: 0.95 }))
    grass.rotation.x = -Math.PI / 2
    grass.receiveShadow = true
    const soil = new THREE.Mesh(new THREE.RingGeometry(R - 0.45, R + 0.15, 200), new THREE.MeshStandardMaterial({ color: '#8a5d3f', roughness: 1 }))
    soil.rotation.x = -Math.PI / 2
    soil.position.y = 0.015
    soil.receiveShadow = true
    const rimMat = new THREE.MeshPhysicalMaterial({ color: '#dc8b5c', roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.35 })
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R + 0.4, 0.52, 24, 220), rimMat)
    rim.rotation.x = Math.PI / 2
    rim.position.y = 0.1
    rim.castShadow = true
    rim.receiveShadow = true
    const wallMat = new THREE.MeshStandardMaterial({ color: '#c9714a', roughness: 0.7 })
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.86, R + 0.3, 2.6, 220, 1, true), wallMat)
    wall.position.y = -1.3
    wall.castShadow = true
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.72, R + 0.66, 0.28, 220, 1, true), new THREE.MeshStandardMaterial({ color: '#f1c49a', roughness: 0.6 }))
    band.position.y = -1.05
    const foot = new THREE.Mesh(new THREE.TorusGeometry(R + 0.32, 0.32, 16, 220), wallMat.clone())
    foot.rotation.x = Math.PI / 2
    foot.position.y = -2.6
    const floorShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(R * 3.4, R * 3.4),
      new THREE.MeshBasicMaterial({ map: radialTexture('rgba(90,60,30,0.32)', 'rgba(90,60,30,0)'), transparent: true, depthWrite: false }),
    )
    floorShadow.rotation.x = -Math.PI / 2
    floorShadow.position.set(R * 0.12, -2.9, R * 0.1)
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(R * 8, R * 8), new THREE.ShadowMaterial({ opacity: 0.16 }))
    catcher.rotation.x = -Math.PI / 2
    catcher.position.y = -2.92
    catcher.receiveShadow = true
    this.dish.add(grass, soil, rim, wall, band, foot, floorShadow, catcher)

    const free = (x: number, z: number, pad: number) => world.trees.every((t) => Math.hypot(t.x - x, t.y - z) > 0.6 * t.scale + pad)
    const spot = (edge: number) => {
      const a = rnd() * Math.PI * 2
      const r = Math.sqrt(rnd()) * (R - edge)
      return [Math.cos(a) * r, Math.sin(a) * r] as const
    }

    // grass tufts
    const tuftN = Math.round(R * R * 0.55)
    const tuftGeo = new THREE.ConeGeometry(0.06, 0.34, 4)
    tuftGeo.translate(0, 0.17, 0)
    const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }), tuftN * 3)
    const tuftCols = ['#6fae4f', '#7fbe5a', '#5e9c45', '#94cc68'].map((c) => new THREE.Color(c))
    let k = 0
    for (let i = 0; i < tuftN; i++) {
      const [x, z] = spot(0.8)
      if (!free(x, z, 0.1)) continue
      const col = tuftCols[Math.floor(rnd() * tuftCols.length)]
      const h = 0.7 + rnd() * 0.7
      for (let j = 0; j < 3; j++) {
        this.e.set((rnd() - 0.5) * 0.7, rnd() * 6, (rnd() - 0.5) * 0.7, 'XYZ')
        this.q.setFromEuler(this.e)
        this.m.compose(this.v.set(x + (rnd() - 0.5) * 0.12, 0, z + (rnd() - 0.5) * 0.12), this.q, this.s.set(1, h * (0.7 + rnd() * 0.5), 1))
        tufts.setMatrixAt(k, this.m)
        tufts.setColorAt(k, col)
        k++
      }
    }
    tufts.count = k
    this.e.set(0, 0, 0, 'YZX')

    // flowers
    const flowerN = Math.round(R * 1.6)
    const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6 }), flowerN * 5)
    const petalCols = ['#fff7ea', '#ffd3e2', '#ffe89a', '#dcd4ff', '#ffffff'].map((c) => new THREE.Color(c))
    const heart = new THREE.Color('#ffc93c')
    k = 0
    for (let i = 0; i < flowerN; i++) {
      const [x, z] = spot(1.2)
      if (!free(x, z, 0.4)) continue
      const col = petalCols[Math.floor(rnd() * petalCols.length)]
      const sc = 0.7 + rnd() * 0.5
      for (let j = 0; j < 4; j++) {
        const a = (j / 4) * Math.PI * 2 + rnd()
        this.m.compose(this.v.set(x + Math.cos(a) * 0.09 * sc, 0.1, z + Math.sin(a) * 0.09 * sc), this.qI, this.s.set(sc, sc * 0.45, sc))
        flowers.setMatrixAt(k, this.m)
        flowers.setColorAt(k++, col)
      }
      this.m.compose(this.v.set(x, 0.14, z), this.qI, this.s.set(sc * 0.55, sc * 0.4, sc * 0.55))
      flowers.setMatrixAt(k, this.m)
      flowers.setColorAt(k++, heart)
    }
    flowers.count = k

    // pebbles along the edge
    const pebN = Math.round(R * 1.2)
    const pebbles = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.22, 1), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.75 }), pebN)
    const pebCols = ['#d9d1c3', '#c8bfae', '#e7dfd2', '#bdb3a2'].map((c) => new THREE.Color(c))
    k = 0
    for (let i = 0; i < pebN; i++) {
      const a = rnd() * Math.PI * 2
      const r = R - 0.9 - rnd() * 2.2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r
      if (!free(x, z, 0.3)) continue
      const sc = 0.5 + rnd() * 0.9
      this.e.set(0, rnd() * 6, 0, 'YZX')
      this.q.setFromEuler(this.e)
      this.m.compose(this.v.set(x, 0.04, z), this.q, this.s.set(sc * (1 + rnd() * 0.4), sc * 0.45, sc))
      pebbles.setMatrixAt(k, this.m)
      pebbles.setColorAt(k++, pebCols[Math.floor(rnd() * pebCols.length)])
    }
    pebbles.count = k
    pebbles.receiveShadow = true
    for (const im of [tufts, flowers, pebbles]) {
      im.instanceMatrix.needsUpdate = true
      if (im.instanceColor) im.instanceColor.needsUpdate = true
      this.dish.add(im)
    }
  }

  private buildTrees(world: World) {
    this.disposeGroup(this.treeRoot)
    this.treeNodes = []
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#8b5e3c', roughness: 0.85 })
    const leafMats = ['#4f9d52', '#5aab5b', '#468f4b', '#62b161'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.78 }))
    const lump = new THREE.IcosahedronGeometry(1, 4)
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.24, 1, 10)
    trunkGeo.translate(0, 0.5, 0)
    const baseGeo = new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2)
    const baseMat = new THREE.MeshStandardMaterial({ color: '#7fb45e', roughness: 1, transparent: true, opacity: 0.6, depthWrite: false })
    for (const t of world.trees) {
      const grp = new THREE.Group()
      grp.position.set(t.x, 0, t.y)
      const sc = t.scale
      const cy = canopyY(t)
      const trunk = new THREE.Mesh(trunkGeo, trunkMat)
      trunk.scale.set(sc, cy * 0.95, sc)
      trunk.castShadow = true
      const shade = new THREE.Mesh(baseGeo, baseMat)
      shade.scale.setScalar(1.7 * sc)
      shade.position.y = 0.01
      const canopy = new THREE.Group()
      canopy.position.y = cy
      const leaf = leafMats[t.id % leafMats.length]
      const blobs: [number, number, number, number][] = [
        [0, 0, 0, CANOPY_R],
        [0.35, 0.45, 0.25, 0.72],
        [-0.4, 0.38, -0.1, 0.7],
        [0.05, 0.62, -0.38, 0.62],
        [-0.1, 0.8, 0.2, 0.5],
      ]
      blobs.forEach(([x, y, z, r], i) => {
        const m = new THREE.Mesh(lump, i === 0 ? leaf : leafMats[(t.id + i) % leafMats.length])
        m.position.set(x * sc, y * sc, z * sc)
        m.scale.setScalar(r * sc)
        m.castShadow = true
        m.receiveShadow = true
        canopy.add(m)
      })
      canopy.rotation.y = t.id * 1.3
      grp.add(shade, trunk, canopy)
      this.treeRoot.add(grp)
      this.treeNodes.push({ canopy, tree: t, pulse: 0 })
    }
  }

  private fruitPos(t: Tree, s: number, out: THREE.Vector3): THREE.Vector3 {
    const a = slotAngle(t.id, s)
    const el = -0.5 + ((s * 0.618034 + t.id * 0.37) % 1) * 1.0
    const rr = CANOPY_R * t.scale + 0.1
    return out.set(t.x + Math.cos(a) * Math.cos(el) * rr, canopyY(t) + Math.sin(el) * rr, t.y + Math.sin(a) * Math.cos(el) * rr)
  }

  private ensureCapacity(n: number) {
    if (n <= this.cap) return
    let cap = this.cap
    while (cap < n) cap *= 2
    for (const p of this.parts.all) this.scene.remove(p)
    this.parts.dispose()
    this.cap = cap
    this.parts = new Parts(cap, this.geo, this.mat)
    for (const p of this.parts.all) this.scene.add(p)
    this.centers = new Float32Array(cap * 4)
  }

  // ------------------------------------------------------------ events

  onEvents(events: SimEvent[]) {
    const P = this.particles
    const w = this.worldRef
    if (!w) return
    for (const ev of events) {
      if (P.free < 40) return
      const rnd = Math.random
      switch (ev.type) {
        case 'bite': {
          const node = this.treeNodes[ev.treeId]
          if (node) {
            node.pulse = 1
            const p = this.fruitPos(node.tree, ev.slot, this.v2)
            for (let i = 0; i < 3; i++) {
              P.spawn({ x: p.x, y: p.y, z: p.z, vx: (rnd() - 0.5) * 1.5, vy: 1 + rnd(), vz: (rnd() - 0.5) * 1.5, life: 0.7, size: 0.16, color: '#7fbf3a', frame: FX.crumb, gravity: 7 })
            }
            P.spawn({ x: p.x, y: p.y + 0.1, z: p.z, vy: 0.4, life: 0.6, size: 0.35, color: '#e8ffb0', frame: FX.sparkle, grow: 0.6 })
          }
          break
        }
        case 'eat': {
          const y = 1.05
          for (let i = 0; i < 4; i++) {
            const a = rnd() * Math.PI * 2
            P.spawn({ x: ev.x, y, z: ev.y, vx: Math.cos(a) * 0.9, vy: 1.2 + rnd() * 0.6, vz: Math.sin(a) * 0.9, life: 0.9, size: 0.26, color: '#d5ff7a', frame: FX.sparkle, drag: 2 })
          }
          P.spawn({ x: ev.x, y: 0.12, z: ev.y, life: 0.55, size: 0.9, color: '#c9f27a', frame: FX.ring, grow: 2.6 })
          break
        }
        case 'contact': {
          P.spawn({ x: ev.x, y: 0.6, z: ev.y, life: 0.6, size: 0.8, color: '#ffd07a', frame: FX.ring, grow: 3 })
          P.spawn({ x: ev.x, y: 0.12, z: ev.y, life: 0.8, size: 1.1, color: '#ff9b8a', frame: FX.ring, grow: 3.5 })
          for (let i = 0; i < 7; i++) {
            const a = (i / 7) * Math.PI * 2 + rnd()
            P.spawn({ x: ev.x, y: 0.8, z: ev.y, vx: Math.cos(a) * 2.2, vy: 1.4 + rnd(), vz: Math.sin(a) * 2.2, life: 0.8, size: 0.3, color: i % 2 ? '#fff0a0' : '#ffc0b0', frame: FX.sparkle, drag: 3 })
          }
          break
        }
        case 'birth': {
          const col = ev.kind === BLUE ? '#9fc6ff' : '#ffb0a6'
          P.spawn({ x: ev.x, y: 0.1, z: ev.y, life: 0.7, size: 0.8, color: col, frame: FX.ring, grow: 2.2 })
          for (let i = 0; i < 3; i++) {
            P.spawn({ x: ev.x + (rnd() - 0.5) * 0.5, y: 1.1, z: ev.y + (rnd() - 0.5) * 0.5, vx: (rnd() - 0.5) * 0.4, vy: 1.1 + rnd() * 0.5, vz: (rnd() - 0.5) * 0.4, life: 1.2, size: 0.3, color: '#ff8fb4', frame: FX.heart, drag: 1.5 })
          }
          break
        }
        case 'fade': {
          const col = ev.kind === BLUE ? '#bcd6ff' : '#ffc8c0'
          for (let i = 0; i < 6; i++) {
            P.spawn({ x: ev.x + (rnd() - 0.5) * 0.6, y: 0.4 + rnd() * 0.6, z: ev.y + (rnd() - 0.5) * 0.6, vx: (rnd() - 0.5) * 0.2, vy: 0.6 + rnd() * 0.6, vz: (rnd() - 0.5) * 0.2, life: 1.6, size: 0.45, color: col, frame: FX.dot, drag: 0.5 })
          }
          break
        }
      }
    }
  }

  // ------------------------------------------------------------ frame

  render(world: World, alpha: number, realDt: number, selectedId: number | null, follow: boolean) {
    if (world !== this.worldRef) this.setWorld(world)
    const rdt = Math.min(realDt, 0.1)
    this.clock += rdt
    const P = this.particles
    P.begin(rdt)
    this.mouthPos.clear()
    this.drawBlobs(world, alpha, rdt)
    this.drawFruit(world)
    this.drawSelection(world, alpha, selectedId, follow)
    P.end()

    for (const n of this.treeNodes) {
      if (n.pulse > 0) {
        n.pulse = Math.max(0, n.pulse - rdt * 2.5)
        const k = 1 + Math.sin(n.pulse * Math.PI * 3) * 0.05 * n.pulse
        n.canopy.scale.set(k, 2 - k, k)
      }
    }

    this.controls.update()
    if (this.hoverDirty && this.hover) {
      this.hoverDirty = false
      this.renderer.domElement.style.cursor = this.pick(this.hover.x, this.hover.y) !== null ? 'pointer' : 'grab'
    }
    this.renderer.render(this.scene, this.camera)
  }

  private drawBlobs(world: World, alpha: number, rdt: number) {
    const blobs = world.blobs
    this.ensureCapacity(blobs.length)
    const P = this.parts
    const simT = world.t
    const clock = this.clock
    let halos = 0
    this.ids.length = blobs.length
    const bodyM = new THREE.Matrix4()
    for (let i = 0; i < blobs.length; i++) {
      const b = blobs[i]
      const x = b.px + (b.x - b.px) * alpha
      const z = b.py + (b.y - b.py) * alpha
      let v = this.vis.get(b.id)
      if (!v) {
        v = { hop: b.phase, lean: 0, lx: x, lz: z, blinkAt: clock + 1 + (b.phase % 4), blinkT: 0, sy: 1 }
        this.vis.set(b.id, v)
      }
      const moved = Math.hypot(x - v.lx, z - v.lz)
      v.lx = x
      v.lz = z
      const r = BODY_RADIUS[b.kind] * VIS
      const top = world.speedOf(b)
      const sp = Math.hypot(b.vx, b.vy)
      const moving = b.alive ? Math.min(1, sp / Math.max(0.4, top * 0.45)) : 0
      v.hop += moved * (b.kind === RED ? 2.4 : 3.0)
      const hs = Math.abs(Math.sin(v.hop))

      let size = world.sizeOf(b)
      if (b.age < 0.45) size *= easeOutBack(b.age / 0.45)
      let hopY = hs * 0.17 * moving
      let sy = 1 + (hs - 0.45) * 0.16 * moving
      let sx = 1
      let leanT = moving * (b.action === 'hunt' || b.action === 'flee' ? 0.3 : 0.14)
      let wob = 0
      let eyeOpen = 1
      let eyeBig = 1
      let mouth = 1
      let shakeX = 0
      const prog = b.actionDur > 0 ? 1 - Math.max(0, b.actionTime) / b.actionDur : 0
      sy += Math.sin(clock * 2.3 + b.phase) * 0.025 * (1 - moving)

      switch (b.action) {
        case 'eat': {
          const chew = Math.sin(simT * 15 + b.phase)
          sy += chew * 0.06
          sx -= chew * 0.03
          mouth = 0.55 + 0.6 * Math.abs(chew)
          leanT = -0.12
          hopY = 0
          break
        }
        case 'pause': {
          wob = Math.sin(simT * 5 + b.phase) * 0.09
          eyeOpen = prog < 0.7 ? 0.22 : 1
          sy += Math.sin(simT * 7) * 0.03
          break
        }
        case 'bump':
          shakeX = Math.sin(clock * 55 + b.phase) * 0.05
          eyeOpen = 0.45
          break
        case 'startled':
          hopY = Math.sin(Math.min(1, prog) * Math.PI) * 0.5
          eyeBig = 1.35
          sy += 0.08
          break
        case 'bud': {
          sy += 0.24 * prog + Math.sin(simT * 30) * 0.04 * prog
          sx += Math.sin(simT * 22) * 0.08 * prog
          eyeOpen = 0.3
          break
        }
        case 'hide':
          sy = 0.78
          sx = 1.12
          eyeOpen = 0.65
          leanT = 0
          break
        case 'lounge':
          sy = 0.86 + Math.sin(clock * 1.6 + b.phase) * 0.025
          sx = 1.08
          eyeOpen = 0.18
          break
        case 'flee':
          eyeBig = 1.2
          hopY *= 1.5
          break
        case 'hunt':
          eyeOpen = 0.78
          break
        case 'fade':
          eyeOpen = 0.12
          break
      }
      if (b.action === 'rest' && moving < 0.2 && b.energy > 70) eyeOpen = Math.min(eyeOpen, 0.2)

      if (clock >= v.blinkAt) {
        v.blinkT = 0.13
        v.blinkAt = clock + 2 + ((b.phase * 7.13 + clock) % 4.5)
      }
      if (v.blinkT > 0) {
        v.blinkT -= rdt
        eyeOpen = Math.min(eyeOpen, 0.1)
      }

      let sink = 0
      if (!b.alive) {
        const k = Math.min(1, b.fadeT / 1.4)
        size *= Math.max(0.001, 1 - k * k)
        sink = k * 0.25
        hopY = 0
      }
      v.lean += (leanT - v.lean) * Math.min(1, rdt * 7)
      v.sy += (sy - v.sy) * Math.min(1, rdt * 14)
      const syy = v.sy
      const sxx = sx / Math.sqrt(Math.max(0.5, syy))

      // body transform
      this.e.set(0, -b.heading, -v.lean + wob, 'YZX')
      this.q.setFromEuler(this.e)
      const rs = r * size
      this.v.set(x + shakeX, hopY - sink, z)
      bodyM.compose(this.v, this.q, this.s.set(rs * sxx, rs * syy, rs * sxx))
      P.bodies.setMatrixAt(i, bodyM)

      // colour: paler when tired, warm when glowing, grey while fading
      const base = b.kind === BLUE ? COL.blue : COL.red
      this.c.copy(base).lerp(b.kind === BLUE ? COL.bluePale : COL.redPale, Math.max(0, 1 - b.energy / 60) * 0.55)
      if (b.glow > 0) this.c.lerp(COL.glowWarm, Math.min(1, b.glow) * 0.45)
      if (!b.alive) this.c.lerp(COL.faded, Math.min(1, b.fadeT / 0.8))
      P.bodies.setColorAt(i, this.c)

      // face
      const eo = Math.max(0.08, eyeOpen)
      for (let side = 0; side < 2; side++) {
        const sz = side === 0 ? 1 : -1
        this.m2.compose(this.v.set(0.9, MID + 0.3, 0.33 * sz), this.qI, this.s.set(0.55 * eyeBig, 1.25 * eo * eyeBig, eyeBig))
        this.m.multiplyMatrices(bodyM, this.m2)
        P.eyes.setMatrixAt(i * 2 + side, this.m)
        const gs = eo > 0.5 ? eyeBig : 0
        this.m2.compose(this.v.set(0.965, MID + 0.37, 0.33 * sz + 0.035), this.qI, this.s.set(gs, gs, gs))
        this.m.multiplyMatrices(bodyM, this.m2)
        P.glints.setMatrixAt(i * 2 + side, this.m)
        this.e.set(0, -0.52 * sz, 0, 'YZX')
        this.q.setFromEuler(this.e)
        this.m2.compose(this.v.set(0.915, MID - 0.04, 0.53 * sz), this.q, this.s.set(1, 0.75, 1))
        this.m.multiplyMatrices(bodyM, this.m2)
        P.cheeks.setMatrixAt(i * 2 + side, this.m)
      }
      this.m2.compose(this.v.set(1.03, MID - 0.02, 0), this.qI, this.s.set(1, mouth, 1))
      this.m.multiplyMatrices(bodyM, this.m2)
      P.mouths.setMatrixAt(i, this.m)
      if (b.action === 'eat') this.mouthPos.set(b.id, new THREE.Vector3(1.1, MID - 0.05, 0).applyMatrix4(bodyM))

      // contact shadow
      const shadowS = rs * 1.25 * sxx * Math.max(0.5, 1 - hopY * 0.9)
      this.m.compose(this.v.set(x, 0.025, z), this.qI, this.s.set(shadowS, 1, shadowS))
      P.shadows.setMatrixAt(i, this.m)

      // glow halo after a meal or a boop
      const glow = b.alive ? Math.max(b.glow, b.action === 'pause' ? 0.35 : 0) : 0
      if (glow > 0) {
        const hr = rs * (1.5 + Math.min(1, glow) * 0.7 + Math.sin(clock * 9) * 0.06)
        this.m.compose(this.v.set(x, hopY + MID * rs, z), this.qI, this.s.set(hr, hr * 1.15, hr))
        P.halos.setMatrixAt(halos, this.m)
        this.c.copy(b.kind === RED ? COL.haloRed : COL.haloBlue).multiplyScalar(Math.min(1, glow * 1.4))
        P.halos.setColorAt(halos, this.c)
        halos++
      }

      this.ids[i] = b.id
      this.centers[i * 4] = x
      this.centers[i * 4 + 1] = hopY + MID * rs
      this.centers[i * 4 + 2] = z
      this.centers[i * 4 + 3] = b.alive ? rs * 1.25 : 0

      if (b.alive) this.statusIcon(b, x, hopY + TOP * rs * syy, z, rs, rdt)
    }
    const n = blobs.length
    P.bodies.count = n
    P.mouths.count = n
    P.shadows.count = n
    P.eyes.count = n * 2
    P.glints.count = n * 2
    P.cheeks.count = n * 2
    P.halos.count = halos
    for (const im of P.all) {
      im.instanceMatrix.needsUpdate = true
      if (im.instanceColor) im.instanceColor.needsUpdate = true
    }
    // forget visuals of blobs that are gone
    if (this.vis.size > n * 2 + 64) {
      const live = new Set(this.ids)
      for (const id of this.vis.keys()) if (!live.has(id)) this.vis.delete(id)
    }
  }

  private statusIcon(b: Blob, x: number, headY: number, z: number, rs: number, rdt: number) {
    const P = this.particles
    const clock = this.clock
    const y = headY + 0.28
    switch (b.action) {
      case 'flee':
        P.icon(x + 0.25, headY - 0.05 + Math.sin(clock * 9 + b.phase) * 0.04, z, 0.34, '#8fd0ff', 0.95, FX.drop)
        break
      case 'startled':
        P.icon(x, y + 0.1, z, 0.55, '#ffb020', 1, FX.bang)
        break
      case 'hunt':
        if (b.chaseTime < 1.1) P.icon(x, y + 0.05, z, 0.42, '#ff5d4f', Math.min(1, (1.1 - b.chaseTime) * 3), FX.bang)
        break
      case 'pause':
        for (let k = 0; k < 2; k++) {
          const a = clock * 3 + k * Math.PI + b.phase
          P.icon(x + Math.cos(a) * rs * 1.4, headY - 0.1 + Math.sin(clock * 4 + k) * 0.08, z + Math.sin(a) * rs * 1.4, 0.3, '#ffe27a', 0.95, FX.sparkle)
        }
        break
      case 'bump':
        P.icon(x, y, z, 0.3, '#ffffff', 0.9, FX.sparkle)
        break
      case 'bud':
        P.icon(x, y + 0.08 + Math.sin(clock * 8) * 0.05, z, 0.36 + Math.sin(clock * 10) * 0.05, '#ff7fae', 1, FX.heart)
        break
      case 'lounge':
      case 'rest': {
        if (b.action === 'rest' && (b.id % 3 !== 0 || b.energy < 70 || Math.hypot(b.vx, b.vy) > 0.3)) break
        const ph = (clock * 0.55 + b.phase) % 1
        P.icon(x + ph * 0.25, y + ph * 0.55, z, 0.22 + ph * 0.14, '#7a8cb8', (1 - ph) * 0.9, FX.zzz)
        break
      }
      case 'eat':
        if (Math.random() < rdt * 5 && P.free > 100) {
          const mp = this.mouthPos.get(b.id)
          if (mp) {
            P.spawn({ x: mp.x, y: mp.y, z: mp.z, vx: (Math.random() - 0.5) * 1.2, vy: 0.8 + Math.random() * 0.6, vz: (Math.random() - 0.5) * 1.2, life: 0.55, size: 0.1, color: '#9fd23f', frame: FX.crumb, gravity: 7 })
          }
        }
        break
    }
  }

  private drawFruit(world: World) {
    const lim = Math.min(world.params.fruitLimit, MAX_SLOTS)
    let nf = 0
    let ns = 0
    const clock = this.clock
    for (const t of world.trees) {
      for (let s = 0; s < MAX_SLOTS; s++) {
        const slot = t.slots[s]
        if (s >= lim && slot.state !== 2) continue
        const p = this.fruitPos(t, s, this.v2)
        // stem stays even when the fruit is gone, so used spots read as bare
        this.m.compose(this.v.set(p.x, p.y + 0.2, p.z), this.qI, this.s.set(1, 1, 1))
        this.stems.setMatrixAt(ns++, this.m)
        let g = 0
        let px = p.x
        let py = p.y
        let pz = p.z
        if (slot.state === 1) {
          g = 1
          py += Math.sin(clock * 2 + s + t.id) * 0.02
        } else if (slot.state === 0) {
          g = 0.15 + slot.g * 0.85
        } else if (slot.state === 2 && slot.eater) {
          const e = slot.eater
          const prog = e.actionDur > 0 ? 1 - Math.max(0, e.actionTime) / e.actionDur : 1
          const mp = this.mouthPos.get(e.id)
          if (mp) {
            const k = easeOutCubic(Math.min(1, prog / 0.3))
            px += (mp.x - px) * k
            py += (mp.y - py) * k
            pz += (mp.z - pz) * k
          }
          // shrinks bite by bite while chewing
          g = Math.max(0, 1 - prog) * (0.85 + 0.15 * Math.abs(Math.sin(prog * 20)))
        }
        if (g <= 0.01 || slot.state === 3) continue
        this.m.compose(this.v.set(px, py, pz), this.qI, this.s.set(g, g, g))
        this.fruit.setMatrixAt(nf, this.m)
        this.c.copy(COL.fruitYoung).lerp(COL.fruitRipe, slot.state === 0 ? slot.g * slot.g : 1)
        this.fruit.setColorAt(nf, this.c)
        nf++
      }
    }
    this.fruit.count = nf
    this.stems.count = ns
    this.fruit.instanceMatrix.needsUpdate = true
    if (this.fruit.instanceColor) this.fruit.instanceColor.needsUpdate = true
    this.stems.instanceMatrix.needsUpdate = true
  }

  private drawSelection(world: World, alpha: number, selectedId: number | null, follow: boolean) {
    const b = selectedId !== null ? world.findBlob(selectedId) : undefined
    const show = !!b && b.alive
    this.selRing.visible = show
    this.visionRing.visible = show
    this.visionDisc.visible = show
    this.intent.visible = false
    if (!b || !show) return
    const x = b.px + (b.x - b.px) * alpha
    const z = b.py + (b.y - b.py) * alpha
    const rs = BODY_RADIUS[b.kind] * VIS * world.sizeOf(b)
    const col = b.kind === BLUE ? '#2a78d6' : '#e34948'
    const pulse = 1 + Math.sin(this.clock * 5) * 0.06
    this.selRing.position.set(x, 0.05, z)
    this.selRing.scale.setScalar(rs * 1.45 * pulse)
    const vision = world.visionOf(b)
    this.visionRing.position.set(x, 0.04, z)
    this.visionRing.scale.setScalar(vision)
    ;(this.visionRing.material as THREE.MeshBasicMaterial).color.set(col)
    this.visionDisc.position.set(x, 0.03, z)
    this.visionDisc.scale.setScalar(vision)
    ;(this.visionDisc.material as THREE.MeshBasicMaterial).color.set(col)

    let tx: number | null = null
    let ty = 0
    let tz = 0
    if (b.action === 'hunt' && b.target && b.target.alive) {
      const t = b.target
      tx = t.px + (t.x - t.px) * alpha
      tz = t.py + (t.y - t.py) * alpha
      ty = 0.5
    } else if ((b.action === 'seek' || b.action === 'eat') && b.tree) {
      tx = b.tree.x
      tz = b.tree.y
      ty = canopyY(b.tree) * 0.7
    } else if (b.action === 'rest' && b.homeTree) {
      tx = b.homeTree.x
      tz = b.homeTree.y
      ty = 0.3
    }
    if (tx !== null) {
      const pos = this.intent.geometry.getAttribute('position') as THREE.BufferAttribute
      pos.setXYZ(0, x, 0.55, z)
      pos.setXYZ(1, tx, ty, tz)
      pos.needsUpdate = true
      this.intent.geometry.computeBoundingSphere()
      this.intent.computeLineDistances()
      ;(this.intent.material as THREE.LineDashedMaterial).color.set(b.action === 'hunt' ? '#ff6b5e' : b.action === 'rest' ? '#ffffff' : '#c9ff7a')
      this.intent.visible = true
    }

    if (follow) {
      const target = this.controls.target
      const dx = (x - target.x) * 0.08
      const dz = (z - target.z) * 0.08
      target.x += dx
      target.z += dz
      this.camera.position.x += dx
      this.camera.position.z += dz
    }
  }

  // ------------------------------------------------------------ input

  /** Screen-space pick with a forgiving radius; returns a blob id. */
  pick(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const h = rect.height
    const f = h / 2 / Math.tan((this.camera.fov * Math.PI) / 360)
    let best: number | null = null
    let bestD = Infinity
    const n = Math.min(this.ids.length, this.parts.bodies.count)
    for (let i = 0; i < n; i++) {
      const rad = this.centers[i * 4 + 3]
      if (rad <= 0) continue
      this.v.set(this.centers[i * 4], this.centers[i * 4 + 1], this.centers[i * 4 + 2])
      const dist = this.v.distanceTo(this.camera.position)
      this.v.project(this.camera)
      if (this.v.z > 1) continue
      const sx = ((this.v.x + 1) / 2) * rect.width
      const sy = ((1 - this.v.y) / 2) * rect.height
      const d = Math.hypot(sx - px, sy - py)
      const lim = Math.max(12, (rad * f) / dist + 4)
      // prefer the closest to the cursor, then the nearest to the camera
      const score = d + dist * 0.01
      if (d < lim && score < bestD) {
        bestD = score
        best = this.ids[i]
      }
    }
    return best
  }

  /** Client coordinates of a drawn blob's centre (null if not on screen). */
  screenOf(id: number): { x: number; y: number } | null {
    const i = this.ids.indexOf(id)
    if (i < 0 || i >= this.parts.bodies.count) return null
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.v.set(this.centers[i * 4], this.centers[i * 4 + 1], this.centers[i * 4 + 2]).project(this.camera)
    if (this.v.z > 1) return null
    return { x: rect.left + ((this.v.x + 1) / 2) * rect.width, y: rect.top + ((1 - this.v.y) / 2) * rect.height }
  }

  private onDown = (e: PointerEvent) => {
    this.down = { x: e.clientX, y: e.clientY, t: performance.now() }
    this.renderer.domElement.style.cursor = 'grabbing'
  }

  private onUp = (e: PointerEvent) => {
    const d = this.down
    this.down = null
    this.renderer.domElement.style.cursor = 'grab'
    if (!d) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6 && performance.now() - d.t < 600) {
      this.onPick(this.pick(e.clientX, e.clientY))
    }
  }

  private onMove = (e: PointerEvent) => {
    if (this.down) return
    this.hover = { x: e.clientX, y: e.clientY }
    this.hoverDirty = true
  }

  private onLeave = () => {
    this.hover = null
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.particles.setScale(h * this.renderer.getPixelRatio(), this.camera.fov)
  }

  dispose() {
    this.ro.disconnect()
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerleave', this.onLeave)
    this.controls.dispose()
    this.disposeGroup(this.dish)
    this.disposeGroup(this.treeRoot)
    this.parts.dispose()
    this.renderer.dispose()
    el.remove()
  }
}

function easeOutBack(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  const c1 = 1.9
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2)
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}
