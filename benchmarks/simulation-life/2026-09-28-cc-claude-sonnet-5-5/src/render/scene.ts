import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { BLUE, C, type Blob, type Tree, type World } from '../sim/world'
import { hashUnit } from '../sim/rng'
import {
  BROW_CENTER,
  CHEEK_L,
  CHEEK_R,
  EYE_CENTER,
  MOUTH_POS,
  makeBeanGeometry,
  makeBrowsGeometry,
  makeCanopyGeometry,
  makeCheekGeometry,
  makeDishGeometry,
  makeEyesGeometry,
  makeFlowerGeometry,
  makeFruitGeometry,
  makeGrassTexture,
  makeMouthOpenGeometry,
  makeRingTexture,
  makeRockGeometry,
  makeSmileGeometry,
  makeSoftDiscTexture,
  makeTrunkGeometry,
  makeTuftGeometry,
} from './geometry'
import { KIND_DOT, KIND_RING, KIND_STAR, Particles } from './particles'

const BLOB_CAP = C.MAX_BLUE + C.MAX_RED + 60
const SLOTS = C.MAX_SLOTS
const LUMPS = 4

const BLUE_COLOR = new THREE.Color('#3f9bff')
const RED_COLOR = new THREE.Color('#ff4f66')
const GRAY = new THREE.Color('#9aa3b8')
const WHITE = new THREE.Color('#ffffff')

interface Vis {
  lastX: number
  lastZ: number
  rx: number
  rz: number
  heading: number
  speed: number
  phase: number
  blinkIn: number
  blinkT: number
  happy: number
  shock: number
  wobble: number
  prevHeading: number
  roll: number
  seen: number
}

interface Lump {
  x: number
  y: number
  z: number
  r: number
}

const tmpM = new THREE.Matrix4()
const tmpM2 = new THREE.Matrix4()
const bodyM = new THREE.Matrix4()
const q = new THREE.Quaternion()
const q2 = new THREE.Quaternion()
const eul = new THREE.Euler()
const vp = new THREE.Vector3()
const vs = new THREE.Vector3()
const ONE = new THREE.Vector3(1, 1, 1)
const IDQ = new THREE.Quaternion()
const col = new THREE.Color()
const AXIS_Y = new THREE.Vector3(0, 1, 0)

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const easeOutBack = (t: number) => {
  const c1 = 1.9
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

function angleLerp(a: number, b: number, t: number): number {
  let d = b - a
  while (d > Math.PI) d -= Math.PI * 2
  while (d < -Math.PI) d += Math.PI * 2
  return a + d * t
}

export class GardenScene {
  readonly renderer: THREE.WebGLRenderer
  readonly scene = new THREE.Scene()
  readonly camera: THREE.PerspectiveCamera
  readonly controls: OrbitControls
  onPick: (id: number | null) => void = () => {}
  onInteract: () => void = () => {}

  private container: HTMLElement
  private world: World | null = null
  private radius = 26
  private time = 0
  private staticGroup = new THREE.Group()
  private light: THREE.DirectionalLight
  private particles = new Particles(1800)
  private vis = new Map<number, Vis>()
  private selectedId: number | null = null
  private hoverId: number | null = null
  private follow = false
  private lastFruit: number[] = []
  private lastWorldT = 0
  private gcTimer = 0
  private resizeObs: ResizeObserver
  private downX = 0
  private downY = 0
  private downT = 0
  private lastHoverCheck = 0

  private bodies!: THREE.InstancedMesh
  private eyes!: THREE.InstancedMesh
  private brows!: THREE.InstancedMesh
  private smiles!: THREE.InstancedMesh
  private mouths!: THREE.InstancedMesh
  private cheeks!: THREE.InstancedMesh
  private shadows!: THREE.InstancedMesh
  private glows!: THREE.InstancedMesh
  private held!: THREE.InstancedMesh

  private trunks: THREE.InstancedMesh | null = null
  private canopies: THREE.InstancedMesh | null = null
  private fruits: THREE.InstancedMesh | null = null
  private treeLumps: Lump[][] = []
  private treeSlots: THREE.Vector3[][] = []
  private treeVis = new Float32Array(0)
  private treeWobble = new Float32Array(0)

  private selRing: THREE.Mesh
  private selArrow: THREE.Mesh
  private visionRing: THREE.Mesh
  private hoverRing: THREE.Mesh
  private ringTex = makeRingTexture()
  private shadowTex = makeSoftDiscTexture()

  constructor(container: HTMLElement) {
    this.container = container
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.05
    const el = this.renderer.domElement
    el.style.width = '100%'
    el.style.height = '100%'
    el.style.display = 'block'
    el.style.touchAction = 'none'
    container.appendChild(el)

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.5, 400)
    this.controls = new OrbitControls(this.camera, el)
    this.controls.enablePan = false
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.minPolarAngle = 0.12
    this.controls.maxPolarAngle = 1.38
    this.controls.rotateSpeed = 0.7
    this.controls.zoomSpeed = 0.7
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.55
    this.controls.addEventListener('start', () => {
      this.controls.autoRotate = false
      this.onInteract()
    })

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.5
    pmrem.dispose()

    const hemi = new THREE.HemisphereLight('#fff5df', '#bcd3ff', 1.15)
    this.scene.add(hemi)
    this.light = new THREE.DirectionalLight('#fff0d6', 2.6)
    this.light.castShadow = true
    this.light.shadow.mapSize.set(2048, 2048)
    this.light.shadow.bias = -0.0004
    this.light.shadow.normalBias = 0.05
    this.scene.add(this.light)
    this.scene.add(this.light.target)

    this.scene.add(this.staticGroup)
    this.buildBlobMeshes()
    this.scene.add(this.particles.points)

    const ringMat = (color: string, opacity: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, map: this.ringTex })
    const flat = (geo: THREE.BufferGeometry) => {
      geo.rotateX(-Math.PI / 2)
      return geo
    }
    this.selRing = new THREE.Mesh(flat(new THREE.PlaneGeometry(2.6, 2.6)), ringMat('#ffffff', 0.95))
    this.selRing.renderOrder = 5
    this.selRing.visible = false
    this.scene.add(this.selRing)
    this.hoverRing = new THREE.Mesh(flat(new THREE.PlaneGeometry(2.2, 2.2)), ringMat('#ffffff', 0.55))
    this.hoverRing.renderOrder = 4
    this.hoverRing.visible = false
    this.scene.add(this.hoverRing)
    this.visionRing = new THREE.Mesh(
      flat(new THREE.RingGeometry(0.985, 1, 128)),
      new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }),
    )
    this.visionRing.renderOrder = 3
    this.visionRing.visible = false
    this.scene.add(this.visionRing)
    const arrow = new THREE.ConeGeometry(0.28, 0.55, 4)
    arrow.rotateX(Math.PI)
    this.selArrow = new THREE.Mesh(arrow, new THREE.MeshBasicMaterial({ color: '#ffffff' }))
    this.selArrow.visible = false
    this.scene.add(this.selArrow)

    this.resizeObs = new ResizeObserver(() => this.resize())
    this.resizeObs.observe(container)
    this.resize()

    el.addEventListener('pointerdown', this.onDown)
    el.addEventListener('pointerup', this.onUp)
    el.addEventListener('pointermove', this.onMove)
    el.addEventListener('pointerleave', this.onLeave)
  }

  private buildBlobMeshes() {
    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.26,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      sheen: 0.4,
      sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.5,
    })
    const mk = (geo: THREE.BufferGeometry, mat: THREE.Material, cast = false, count = BLOB_CAP) => {
      const m = new THREE.InstancedMesh(geo, mat, count)
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      m.frustumCulled = false
      m.castShadow = cast
      m.count = 0
      this.scene.add(m)
      return m
    }
    this.bodies = mk(makeBeanGeometry(), bodyMat, true)
    this.bodies.receiveShadow = true
    this.bodies.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(BLOB_CAP * 3), 3)
    this.bodies.instanceColor.setUsage(THREE.DynamicDrawUsage)

    const faceMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0 })
    this.eyes = mk(makeEyesGeometry(), faceMat)
    this.brows = mk(makeBrowsGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }))
    this.smiles = mk(makeSmileGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }))
    this.mouths = mk(makeMouthOpenGeometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }))
    this.cheeks = mk(makeCheekGeometry(), new THREE.MeshStandardMaterial({ color: '#ff8fae', roughness: 0.7 }))

    const flatDisc = new THREE.PlaneGeometry(1, 1)
    flatDisc.rotateX(-Math.PI / 2)
    this.shadows = mk(
      flatDisc,
      new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    )
    this.shadows.renderOrder = 1

    const glowGeo = new THREE.PlaneGeometry(1, 1)
    glowGeo.rotateX(-Math.PI / 2)
    this.glows = mk(
      glowGeo,
      new THREE.MeshBasicMaterial({ map: this.ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    )
    this.glows.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(BLOB_CAP * 3), 3)
    this.glows.instanceColor.setUsage(THREE.DynamicDrawUsage)
    this.glows.renderOrder = 2

    this.held = mk(
      makeFruitGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }),
      false,
      256,
    )
  }

  setWorld(world: World) {
    this.world = world
    this.radius = world.radius
    this.rebuildStatic()
    this.vis.clear()
    this.particles.clear()
    this.lastFruit = world.trees.map((t) => t.fruit)
    this.lastWorldT = world.t
    this.selectedId = null
    this.selRing.visible = false
    this.selArrow.visible = false
    this.visionRing.visible = false
    this.hoverRing.visible = false
    this.fitCamera(true)
  }

  fitCamera(keepAngles: boolean) {
    const R = this.radius
    const dist = R * 2.55
    if (keepAngles && this.camera.position.lengthSq() > 1) {
      const dir = this.camera.position.clone().sub(this.controls.target).normalize()
      this.camera.position.copy(dir.multiplyScalar(dist))
    } else {
      this.camera.position.set(0, dist * 0.7, dist * 0.74)
    }
    this.controls.target.set(0, 0, 0)
    this.controls.minDistance = R * 0.7
    this.controls.maxDistance = R * 4.4
    this.controls.update()
  }

  private disposeGroup(g: THREE.Group) {
    g.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.geometry) m.geometry.dispose()
      const mat = m.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else if (mat) {
        const mm = mat as THREE.MeshStandardMaterial
        if (mm.map) mm.map.dispose()
        mat.dispose()
      }
    })
    g.clear()
  }

  private rebuildStatic() {
    const world = this.world!
    const R = this.radius
    this.disposeGroup(this.staticGroup)
    this.trunks = this.canopies = this.fruits = null

    const L = R + 30
    this.light.position.set(-0.55 * L, 1.0 * L, 0.5 * L)
    this.light.target.position.set(0, 0, 0)
    const sc = this.light.shadow.camera
    const half = R + 6
    sc.left = -half
    sc.right = half
    sc.top = half
    sc.bottom = -half
    sc.near = 5
    sc.far = L * 2.4
    sc.updateProjectionMatrix()
    this.light.shadow.map?.dispose()
    this.light.shadow.map = null

    const grassTex = makeGrassTexture()
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(R, 128),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 }),
    )
    grass.rotation.x = -Math.PI / 2
    grass.position.y = 0.02
    grass.receiveShadow = true
    this.staticGroup.add(grass)

    const { body, lip } = makeDishGeometry(R)
    const dish = new THREE.Mesh(body, new THREE.MeshPhysicalMaterial({ color: '#f6dfbd', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, side: THREE.DoubleSide }))
    dish.castShadow = true
    dish.receiveShadow = true
    this.staticGroup.add(dish)
    const lipMesh = new THREE.Mesh(lip, new THREE.MeshPhysicalMaterial({ color: '#ffe9c9', roughness: 0.35, clearcoat: 0.7 }))
    lipMesh.castShadow = true
    lipMesh.receiveShadow = true
    this.staticGroup.add(lipMesh)
    const soil = new THREE.Mesh(
      new THREE.TorusGeometry(R + 0.02, 0.12, 8, 128),
      new THREE.MeshStandardMaterial({ color: '#8a6446', roughness: 1 }),
    )
    soil.rotation.x = Math.PI / 2
    soil.position.y = 0.04
    this.staticGroup.add(soil)

    const table = new THREE.Mesh(new THREE.PlaneGeometry(R * 8, R * 8), new THREE.ShadowMaterial({ opacity: 0.22 }))
    table.rotation.x = -Math.PI / 2
    table.position.y = -2.72
    table.receiveShadow = true
    this.staticGroup.add(table)

    this.buildDecor(R, world)
    this.buildTrees(world)
  }

  private buildDecor(R: number, world: World) {
    const area = Math.PI * R * R
    const rnd = (i: number, k: number) => hashUnit(i * 31 + k * 7919 + 17)
    const place = (i: number, salt: number, minR = 0.5) => {
      for (let a = 0; a < 6; a++) {
        const ang = rnd(i * 7 + a, salt) * Math.PI * 2
        const rr = Math.sqrt(rnd(i * 7 + a, salt + 1)) * (R - 0.9)
        const x = Math.cos(ang) * rr
        const z = Math.sin(ang) * rr
        let ok = rr > minR
        for (const t of world.trees) {
          if (Math.hypot(t.x - x, t.y - z) < 1.7) ok = false
        }
        if (ok) return { x, z }
      }
      return null
    }

    const tuftN = Math.round(area / 5)
    const tufts = new THREE.InstancedMesh(
      makeTuftGeometry(),
      new THREE.MeshStandardMaterial({ color: '#6fbf52', roughness: 0.9 }),
      tuftN,
    )
    let n = 0
    for (let i = 0; i < tuftN; i++) {
      const p = place(i, 1)
      if (!p) continue
      const s = 0.7 + rnd(i, 3) * 0.8
      q.setFromAxisAngle(AXIS_Y, rnd(i, 4) * 6.28)
      tmpM.compose(vp.set(p.x, 0.02, p.z), q, vs.set(s, s * (0.8 + rnd(i, 5) * 0.6), s))
      tufts.setMatrixAt(n, tmpM)
      col.set(rnd(i, 6) > 0.5 ? '#79c95a' : '#5fae4c')
      tufts.setColorAt(n, col)
      n++
    }
    tufts.count = n
    tufts.receiveShadow = true
    this.staticGroup.add(tufts)

    const flowerN = Math.round(area / 22)
    const flowers = new THREE.InstancedMesh(
      makeFlowerGeometry(),
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }),
      flowerN,
    )
    const petal = ['#ffffff', '#ffc2d9', '#ffe27a', '#c9b6ff']
    n = 0
    for (let i = 0; i < flowerN; i++) {
      const p = place(i, 11)
      if (!p) continue
      const s = 0.8 + rnd(i, 13) * 0.6
      q.setFromAxisAngle(AXIS_Y, rnd(i, 14) * 6.28)
      tmpM.compose(vp.set(p.x, 0.02, p.z), q, vs.set(s, s, s))
      flowers.setMatrixAt(n, tmpM)
      col.set(petal[Math.floor(rnd(i, 15) * petal.length)])
      flowers.setColorAt(n, col)
      n++
    }
    flowers.count = n
    this.staticGroup.add(flowers)

    const rockN = Math.max(4, Math.round(area / 260))
    const rocks = new THREE.InstancedMesh(makeRockGeometry(), new THREE.MeshStandardMaterial({ color: '#b8b3a8', roughness: 0.85 }), rockN)
    n = 0
    for (let i = 0; i < rockN; i++) {
      const p = place(i, 21, R * 0.35)
      if (!p) continue
      const s = 0.8 + rnd(i, 23) * 1.2
      q.setFromAxisAngle(AXIS_Y, rnd(i, 24) * 6.28)
      tmpM.compose(vp.set(p.x, 0.06, p.z), q, vs.set(s, s, s))
      rocks.setMatrixAt(n, tmpM)
      n++
    }
    rocks.count = n
    rocks.castShadow = true
    rocks.receiveShadow = true
    this.staticGroup.add(rocks)
  }

  private buildTrees(world: World) {
    const nT = world.trees.length
    const canopyMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.78 })
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#8d5f3c', roughness: 0.9 })
    const fruitMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, clearcoat: 0.6 })
    this.trunks = new THREE.InstancedMesh(makeTrunkGeometry(), trunkMat, Math.max(1, nT))
    this.canopies = new THREE.InstancedMesh(makeCanopyGeometry(), canopyMat, Math.max(1, nT * LUMPS))
    this.fruits = new THREE.InstancedMesh(makeFruitGeometry(), fruitMat, Math.max(1, nT * SLOTS))
    for (const m of [this.trunks, this.canopies, this.fruits]) {
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      m.frustumCulled = false
      this.staticGroup.add(m)
    }
    this.trunks.castShadow = true
    this.trunks.receiveShadow = true
    this.canopies.castShadow = true
    this.canopies.receiveShadow = true
    this.fruits.castShadow = false
    this.trunks.count = nT
    this.canopies.count = nT * LUMPS
    this.fruits.count = nT * SLOTS
    this.treeVis = new Float32Array(nT * SLOTS)
    this.treeWobble = new Float32Array(nT)
    this.treeLumps = []
    this.treeSlots = []

    const greens = ['#3f9d55', '#48a85a', '#3a9450', '#52b061']
    for (let i = 0; i < nT; i++) {
      const h = (k: number) => hashUnit(i * 131 + k * 17 + 5)
      const lumps: Lump[] = [
        { x: 0, y: 2.7, z: 0, r: 1.5 + h(1) * 0.2 },
        { x: 0.85 + h(2) * 0.2, y: 2.3, z: 0.3 * (h(3) - 0.5) * 2, r: 1.0 + h(4) * 0.2 },
        { x: -0.8 - h(5) * 0.2, y: 2.4, z: 0.6 * (h(6) - 0.5) * 2, r: 1.05 + h(7) * 0.2 },
        { x: 0.1 * (h(8) - 0.5), y: 3.4, z: -0.3 + 0.5 * (h(9) - 0.5), r: 0.95 + h(10) * 0.15 },
      ]
      this.treeLumps.push(lumps)
      const green = new THREE.Color(greens[i % greens.length])
      for (let j = 0; j < LUMPS; j++) {
        col.copy(green).offsetHSL((h(20 + j) - 0.5) * 0.02, 0, (h(30 + j) - 0.5) * 0.05)
        this.canopies.setColorAt(i * LUMPS + j, col)
      }
      const slots: THREE.Vector3[] = []
      for (let k = 0; k < SLOTS; k++) {
        let best: THREE.Vector3 | null = null
        for (let attempt = 0; attempt < 30 && !best; attempt++) {
          const li = Math.floor(hashUnit(i * 977 + k * 61 + attempt * 13 + 1) * LUMPS)
          const L = lumps[li]
          const th = hashUnit(i * 811 + k * 37 + attempt * 7 + 2) * Math.PI * 2
          const cy = hashUnit(i * 613 + k * 19 + attempt * 5 + 3) * 1.25 - 0.3
          const sy = Math.sqrt(1 - cy * cy)
          const dir = new THREE.Vector3(Math.cos(th) * sy, cy, Math.sin(th) * sy)
          const p = new THREE.Vector3(L.x + dir.x * L.r * 0.96, L.y + dir.y * L.r * 0.9, L.z + dir.z * L.r * 0.96)
          let inside = false
          for (let o = 0; o < LUMPS; o++) {
            if (o === li) continue
            const O = lumps[o]
            if (Math.hypot(p.x - O.x, p.y - O.y, p.z - O.z) < O.r * 0.98) inside = true
          }
          for (const s of slots) if (s.distanceTo(p) < 0.5) inside = true
          if (!inside) best = p
        }
        slots.push(best ?? new THREE.Vector3(lumps[0].x, lumps[0].y + lumps[0].r, lumps[0].z))
      }
      this.treeSlots.push(slots)
    }
    this.updateTrees(world, 0, 0)
  }

  private treeBase(t: Tree, wob: number, out: THREE.Matrix4) {
    const sway = Math.sin(this.time * 0.8 + t.id * 1.7) * 0.014
    const shake = Math.sin(this.time * 24 + t.id) * 0.05 * wob * wob
    eul.set(sway + shake, hashUnit(t.id * 3 + 1) * 6.28, sway * 0.6 + shake * 0.7, 'YXZ')
    q.setFromEuler(eul)
    const squash = 1 - 0.05 * wob
    out.compose(vp.set(t.x, 0, t.y), q, vs.set(t.scale / Math.sqrt(squash), t.scale * squash, t.scale / Math.sqrt(squash)))
  }

  private slotWorld(treeIdx: number, slot: number, out: THREE.Vector3) {
    const t = this.world!.trees[treeIdx]
    const s = this.treeSlots[treeIdx]?.[slot]
    if (!t || !s) return out.set(0, 1, 0)
    return out.set(t.x + s.x * t.scale * 0.9, s.y * t.scale, t.y + s.z * t.scale * 0.9)
  }

  private updateTrees(world: World, dt: number, _alpha: number) {
    if (!this.trunks || !this.canopies || !this.fruits) return
    const trees = world.trees
    for (let i = 0; i < trees.length; i++) {
      const t = trees[i]
      this.treeWobble[i] = Math.max(0, this.treeWobble[i] - dt * 1.8)
      const wob = this.treeWobble[i]
      this.treeBase(t, wob, tmpM)
      this.trunks.setMatrixAt(i, tmpM)
      const lumps = this.treeLumps[i]
      for (let j = 0; j < LUMPS; j++) {
        const L = lumps[j]
        tmpM2.compose(vp.set(L.x, L.y, L.z), IDQ, vs.set(L.r, L.r, L.r))
        this.canopies.setMatrixAt(i * LUMPS + j, bodyM.multiplyMatrices(tmpM, tmpM2))
      }
      const slots = this.treeSlots[i]
      for (let k = 0; k < SLOTS; k++) {
        const idx = i * SLOTS + k
        let target = 0
        if (k < t.fruit) target = 1
        else if (k === t.fruit && t.cool <= 0 && k < world.params.fruitLimit) target = 0.12 + 0.75 * Math.pow(t.progress, 0.8)
        let v = this.treeVis[idx]
        const rate = target > v ? 5 : 14
        v += (target - v) * (1 - Math.exp(-dt * rate))
        if (dt === 0) v = target
        this.treeVis[idx] = v
        const s = slots[k]
        const sc = v < 0.02 ? 0 : v
        tmpM2.compose(vp.set(s.x, s.y, s.z), IDQ, vs.set(sc, sc, sc))
        this.fruits.setMatrixAt(idx, bodyM.multiplyMatrices(tmpM, tmpM2))
        col.set('#ffffff')
      }
    }
    this.trunks.instanceMatrix.needsUpdate = true
    this.canopies.instanceMatrix.needsUpdate = true
    this.fruits.instanceMatrix.needsUpdate = true
    if (this.canopies.instanceColor) this.canopies.instanceColor.needsUpdate = true
  }

  private newVis(b: Blob, x: number, z: number): Vis {
    return {
      lastX: x,
      lastZ: z,
      rx: x,
      rz: z,
      heading: b.heading,
      speed: 0,
      phase: hashUnit(b.id) * 6.28,
      blinkIn: 1 + hashUnit(b.id + 3) * 4,
      blinkT: 0,
      happy: 0,
      shock: 0,
      wobble: 0,
      prevHeading: b.heading,
      roll: 0,
      seen: 0,
    }
  }

  private processEvents(world: World, speed: number) {
    const ev = world.events
    if (!ev.length) return
    const lite = speed > 10 || this.particles.load > 0.7
    const max = Math.min(ev.length, 60)
    for (let i = ev.length - max; i < ev.length; i++) {
      const e = ev[i]
      switch (e.type) {
        case 'eat': {
          this.treeWobble[e.tree] = 1
          break
        }
        case 'eatDone': {
          const v = this.vis.get(e.blob)
          const b = world.byId.get(e.blob)
          if (v) v.happy = 1
          if (b && !lite) {
            for (let k = 0; k < 6; k++) {
              const a = (k / 6) * Math.PI * 2
              this.particles.spawn({
                x: v?.rx ?? b.x,
                y: 0.9,
                z: v?.rz ?? b.y,
                vx: Math.cos(a) * 1.6,
                vy: 2.2 + Math.random() * 1.2,
                vz: Math.sin(a) * 1.6,
                life: 0.8,
                s0: 0.55,
                s1: 0.1,
                color: k % 2 ? '#ffe45c' : '#8fe35a',
                kind: KIND_STAR,
                gravity: 4,
                drag: 0.6,
              })
            }
          }
          break
        }
        case 'contact': {
          const blue = world.byId.get(e.blue)
          const red = world.byId.get(e.red)
          const vb = this.vis.get(e.blue)
          const vr = this.vis.get(e.red)
          if (vb) {
            vb.shock = 1
            vb.wobble = 1
          }
          if (vr) vr.happy = 1
          if (blue && red && !lite) {
            const bx = vb?.rx ?? blue.x
            const bz = vb?.rz ?? blue.y
            const rx = vr?.rx ?? red.x
            const rz = vr?.rz ?? red.y
            this.particles.spawn({ x: bx, y: 0.25, z: bz, life: 0.6, s0: 0.5, s1: 3.4, color: '#ff8fb3', kind: KIND_RING, alpha: 0.9 })
            const target = new THREE.Vector3(rx, 0.75, rz)
            const n = Math.min(9, 3 + Math.round(e.amount / 5))
            for (let k = 0; k < n; k++) {
              this.particles.spawn({
                x: bx,
                y: 0.7,
                z: bz,
                vx: (Math.random() - 0.5) * 3,
                vy: 1.5 + Math.random() * 2.2,
                vz: (Math.random() - 0.5) * 3,
                life: 0.95,
                s0: 0.42,
                s1: 0.22,
                color: k % 2 ? '#ffd23f' : '#ff7bb0',
                drag: 1.4,
                target,
                homing: 1.6,
                kind: KIND_DOT,
              })
            }
            for (let k = 0; k < 4; k++) {
              this.particles.spawn({
                x: rx,
                y: 1.2,
                z: rz,
                vx: (Math.random() - 0.5) * 2.4,
                vy: 1.6 + Math.random(),
                vz: (Math.random() - 0.5) * 2.4,
                life: 1.1,
                s0: 0.5,
                s1: 0.15,
                color: '#ff6f9c',
                kind: KIND_STAR,
                gravity: 2.5,
                drag: 0.8,
              })
            }
          }
          break
        }
        case 'birth': {
          const v = this.vis.get(e.blob)
          const b = world.byId.get(e.blob)
          const pv = this.vis.get(e.parent)
          if (pv) pv.wobble = 0.8
          if (b && !lite) {
            const x = v?.rx ?? b.x
            const z = v?.rz ?? b.y
            this.particles.spawn({ x, y: 0.15, z, life: 0.7, s0: 0.4, s1: 3.2, color: '#ffffff', kind: KIND_RING, alpha: 0.9 })
            for (let k = 0; k < 7; k++) {
              const a = Math.random() * Math.PI * 2
              this.particles.spawn({
                x,
                y: 0.6,
                z,
                vx: Math.cos(a) * 1.4,
                vy: 1.8 + Math.random() * 1.6,
                vz: Math.sin(a) * 1.4,
                life: 0.9,
                s0: 0.5,
                s1: 0.1,
                color: b.kind === BLUE ? '#a8dcff' : '#ffc0cb',
                kind: KIND_STAR,
                gravity: 3,
                drag: 0.5,
              })
            }
          }
          break
        }
        case 'death': {
          const b = world.byId.get(e.blob)
          const v = this.vis.get(e.blob)
          if (b && !lite) {
            const x = v?.rx ?? b.x
            const z = v?.rz ?? b.y
            for (let k = 0; k < 6; k++) {
              this.particles.spawn({
                x: x + (Math.random() - 0.5) * 0.5,
                y: 0.5,
                z: z + (Math.random() - 0.5) * 0.5,
                vx: (Math.random() - 0.5) * 0.8,
                vy: 0.8 + Math.random() * 0.8,
                vz: (Math.random() - 0.5) * 0.8,
                life: 1.1,
                s0: 0.6,
                s1: 1.3,
                color: '#c8d0e6',
                alpha: 0.55,
                drag: 0.8,
              })
            }
          }
          break
        }
      }
    }
  }

  update(world: World, alpha: number, dt: number, speed: number) {
    if (this.world !== world) this.setWorld(world)
    if (world.t < this.lastWorldT - 1e-6) {
      this.lastFruit = world.trees.map((t) => t.fruit)
      this.vis.clear()
    }
    this.lastWorldT = world.t
    this.time += dt
    const frameDt = Math.min(dt, 0.1)

    this.processEvents(world, speed)
    world.events.length = 0

    this.updateTrees(world, frameDt, alpha)
    this.checkRipening(world, speed)
    this.updateBlobs(world, alpha, frameDt)
    this.updateSelection(world, frameDt)
    this.ambient(frameDt)
    this.particles.update(frameDt)

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  private checkRipening(world: World, speed: number) {
    const trees = world.trees
    if (this.lastFruit.length !== trees.length) this.lastFruit = trees.map((t) => t.fruit)
    for (let i = 0; i < trees.length; i++) {
      const f = trees[i].fruit
      if (f > this.lastFruit[i] && speed <= 8 && this.particles.load < 0.6) {
        this.slotWorld(i, f - 1, vp)
        for (let k = 0; k < 3; k++) {
          this.particles.spawn({
            x: vp.x,
            y: vp.y,
            z: vp.z,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 0.5 + Math.random() * 0.8,
            vz: (Math.random() - 0.5) * 0.8,
            life: 0.9,
            s0: 0.42,
            s1: 0.08,
            color: '#e9ff7a',
            kind: KIND_STAR,
            drag: 0.6,
          })
        }
      }
      this.lastFruit[i] = f
    }
  }

  private ambient(dt: number) {
    if (this.particles.load > 0.5) return
    if (Math.random() < dt * 5) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * this.radius * 0.95
      this.particles.spawn({
        x: Math.cos(a) * r,
        y: 0.4 + Math.random() * 3,
        z: Math.sin(a) * r,
        vx: (Math.random() - 0.5) * 0.3,
        vy: 0.15 + Math.random() * 0.25,
        vz: (Math.random() - 0.5) * 0.3,
        life: 5 + Math.random() * 3,
        s0: 0.16,
        s1: 0.1,
        color: '#fff7b0',
        alpha: 0.55,
      })
    }
  }

  private updateBlobs(world: World, alpha: number, dt: number) {
    const blobs = world.blobs
    const p = world.params
    let n = 0
    let heldN = 0
    const stamp = this.time
    for (let bi = 0; bi < blobs.length && n < BLOB_CAP; bi++) {
      const b = blobs[bi]
      const a = b.dead ? 1 : alpha
      const wx = b.px + (b.x - b.px) * a
      const wz = b.py + (b.y - b.py) * a
      let v = this.vis.get(b.id)
      if (!v) {
        v = this.newVis(b, wx, wz)
        this.vis.set(b.id, v)
      }
      v.seen = stamp
      const isBlue = b.kind === BLUE
      const maxSp = (isBlue ? p.blueSpeed : p.redSpeed) * b.speedGene
      if (dt > 0) {
        const d = Math.hypot(wx - v.lastX, wz - v.lastZ)
        const sp = Math.min(d / dt, maxSp * 1.5)
        v.speed += (sp - v.speed) * (1 - Math.exp(-dt * 9))
        v.heading = angleLerp(v.heading, b.heading, 1 - Math.exp(-dt * 16))
        let dh = v.heading - v.prevHeading
        while (dh > Math.PI) dh -= Math.PI * 2
        while (dh < -Math.PI) dh += Math.PI * 2
        v.roll += (clamp(-dh / dt, -6, 6) * 0.06 * clamp(v.speed / 2, 0, 1.4) - v.roll) * (1 - Math.exp(-dt * 8))
        v.prevHeading = v.heading
        v.phase += v.speed * dt * (b.action === 'flee' ? 3.3 : 2.6)
        v.happy = Math.max(0, v.happy - dt * 1.5)
        v.shock = Math.max(0, v.shock - dt * 1.1)
        v.wobble = Math.max(0, v.wobble - dt * 2.2)
        v.blinkIn -= dt
        if (v.blinkIn <= 0 && v.blinkT <= 0) {
          v.blinkT = 0.16
          v.blinkIn = 2 + hashUnit(b.id * 5 + Math.floor(this.time)) * 4.5
        }
        if (v.blinkT > 0) v.blinkT = Math.max(0, v.blinkT - dt)
      }
      v.lastX = wx
      v.lastZ = wz
      v.rx = wx
      v.rz = wz

      const moveK = clamp(v.speed / 1.3, 0, 1)
      const hopN = Math.abs(Math.sin(v.phase))
      const lowE = clamp(1 - b.energy / 26, 0, 1)
      const act = b.action
      const T = this.time

      let sy = 1 + 0.11 * (hopN - 0.4) * moveK * (1 - lowE * 0.5)
      let sx = 1 / Math.sqrt(sy)
      let hop = hopN * 0.17 * moveK * (1 - lowE * 0.6)
      const br = Math.sin(T * 2.1 + b.id) * 0.018
      sy += br
      sx -= br * 0.5

      let pitch = clamp(v.speed / 5, 0, 0.5) * 0.9
      let yawWob = 0
      let eyeY = 1
      let eyeX = 1
      let mouthOpen = 0
      let smile = 1
      let smileX = 1
      let blush = 0.7
      let glowAmt = 0
      let glowTint = WHITE
      let glowSize = 1.6
      let brightness = 1

      const eyeBlink = v.blinkT > 0 ? 1 - Math.sin((1 - v.blinkT / 0.16) * Math.PI) * 0.93 : 1
      eyeY *= eyeBlink

      switch (act) {
        case 'eat': {
          const chew = Math.sin(T * 15 + b.id) * 0.5 + 0.5
          sy -= 0.07 * chew
          sx += 0.045 * chew
          mouthOpen = 0.25 + 0.55 * chew
          smile = 0
          eyeY *= 0.55
          pitch = 0.2
          blush = 1.3
          glowAmt = 0.55
          glowTint = col.set('#ffe36e')
          glowSize = 1.8 + 0.2 * Math.sin(T * 8)
          hop = 0
          break
        }
        case 'pause': {
          const k = b.timerMax > 0 ? b.timer / b.timerMax : 0
          sy += 0.06 * Math.sin(T * 9) * k
          sx -= 0.03 * Math.sin(T * 9) * k
          eyeY *= 0.3
          smileX = 1.5
          blush = 1.7
          glowAmt = 0.4 + 0.5 * k
          glowTint = col.set('#ff5c8d')
          glowSize = 1.7 + 0.4 * Math.sin(T * 6)
          hop = Math.abs(Math.sin(T * 5)) * 0.08 * k
          brightness = 1.1
          pitch = 0
          break
        }
        case 'stunned': {
          const k = b.timerMax > 0 ? b.timer / b.timerMax : 0
          sy = 0.8 + 0.12 * (1 - k)
          sx = 1.13
          eyeY = 1.28
          eyeX = 1.12
          mouthOpen = 0.75
          smile = 0
          yawWob = Math.sin(T * 34) * 0.34 * k
          pitch = -0.15
          hop = 0
          if (Math.random() < dt * 22) {
            const ang = T * 9 + Math.random() * 6
            this.particles.spawn({
              x: wx + Math.cos(ang) * 0.5,
              y: 1.05 + Math.sin(ang * 0.5) * 0.06,
              z: wz + Math.sin(ang) * 0.5,
              life: 0.35,
              s0: 0.3,
              s1: 0.1,
              color: '#ffe45c',
              kind: KIND_STAR,
            })
          }
          break
        }
        case 'flee': {
          eyeY *= 1.2
          eyeX = 1.1
          mouthOpen = 0.4
          smile = 0
          pitch += 0.15
          break
        }
        case 'hunt': {
          eyeY *= 0.9
          pitch += 0.12
          smileX = 1.25
          break
        }
        case 'fading': {
          const k = clamp(b.fade / C.FADE, 0, 1)
          const s = 1 - k * k
          sx *= s
          sy *= s
          hop = k * 0.4
          eyeY = 0.12
          yawWob = k * 6
          brightness = 1 - k * 0.35
          smile = 0
          break
        }
        default:
          break
      }

      if (b.justBorn > 0 && act !== 'fading') {
        const k = 1 - b.justBorn / 0.9
        const s = easeOutBack(clamp(k, 0, 1))
        sx *= s
        sy *= s
        hop += Math.sin(clamp(k, 0, 1) * Math.PI) * 0.35
        glowAmt = Math.max(glowAmt, 0.7 * (1 - k))
        glowTint = WHITE
        glowSize = 1.4 + k * 1.6
      }

      if (v.wobble > 0 && act !== 'stunned') {
        sy += Math.sin(T * 22) * 0.07 * v.wobble
        sx -= Math.sin(T * 22) * 0.035 * v.wobble
      }
      if (v.happy > 0) {
        hop += Math.sin(clamp(1 - v.happy, 0, 1) * Math.PI) * 0.28
        brightness += 0.18 * v.happy
      }

      const growth = 0.62 + 0.38 * clamp(b.age / 14, 0, 1)
      const eScale = 0.93 + 0.13 * (b.energy / C.MAX_ENERGY)
      const size = growth * eScale
      const geneLen = 1 + (b.speedGene - 1) * 0.22
      const eyeSize = (isBlue ? 1 : 0.9) * (0.9 + 0.12 * b.visionGene)

      const slotIdx = n
      const fadeScale = act === 'fading' ? 1 : 1

      eul.set(pitch, Math.PI / 2 - v.heading + yawWob, v.roll, 'YXZ')
      q.setFromEuler(eul)
      const bodyScaleX = sx * size * fadeScale
      const bodyScaleY = Math.max(0.02, sy) * size
      const bodyScaleZ = Math.max(0.02, (1 / Math.sqrt(Math.max(0.5, sx))) * size * geneLen)
      bodyM.compose(vp.set(wx, hop, wz), q, vs.set(bodyScaleX, bodyScaleY, bodyScaleZ))
      this.bodies.setMatrixAt(slotIdx, bodyM)

      const baseCol = isBlue ? BLUE_COLOR : RED_COLOR
      col.copy(baseCol)
      if (lowE > 0) col.lerp(GRAY, 0.4 * lowE)
      const glowMix = glowAmt * 0.18
      col.lerp(WHITE, glowMix)
      col.multiplyScalar(brightness)
      this.bodies.setColorAt(slotIdx, col)

      const face = (mesh: THREE.InstancedMesh, off: THREE.Vector3, sX: number, sY: number, sZ: number) => {
        tmpM2.compose(off, IDQ, vs.set(sX, sY, sZ))
        mesh.setMatrixAt(slotIdx, tmpM.multiplyMatrices(bodyM, tmpM2))
      }
      const es = eyeSize
      face(this.eyes, EYE_CENTER, es * eyeX, Math.max(0.02, es * eyeY), es)
      face(this.brows, BROW_CENTER, isBlue ? 0 : 1, isBlue ? 0 : act === 'pause' ? 0.5 : act === 'hunt' ? 1.3 : 1, isBlue ? 0 : 1)
      if (mouthOpen > 0.05) {
        face(this.mouths, MOUTH_POS, 0.7 + 0.5 * mouthOpen, 0.15 + 1.0 * mouthOpen, 1)
        face(this.smiles, MOUTH_POS, 0, 0, 0)
      } else {
        face(this.mouths, MOUTH_POS, 0, 0, 0)
        const lowSmile = lowE > 0.5 ? -1 : 1
        face(this.smiles, MOUTH_POS, (isBlue ? 1 : 1.25) * smileX * smile, lowSmile * smile, 1)
      }
      face(this.cheeks, CHEEK_L, blush, blush, blush)
      tmpM2.compose(CHEEK_R, IDQ, vs.set(blush, blush, blush))
      this.cheeks.setMatrixAt(slotIdx + BLOB_CAP > 0 ? slotIdx : slotIdx, tmpM.multiplyMatrices(bodyM, tmpM2))

      const shadowS = (1.5 + 0.2 * (size - 1)) * size * (1 - hop * 0.8) * (act === 'fading' ? 1 - clamp(b.fade / C.FADE, 0, 1) : 1)
      tmpM.compose(vp.set(wx, 0.035, wz), IDQ, vs.set(shadowS * 1.15, 1, shadowS * 1.15))
      this.shadows.setMatrixAt(slotIdx, tmpM)

      if (glowAmt > 0.01) {
        const gs = glowSize * size
        tmpM.compose(vp.set(wx, 0.05, wz), IDQ, vs.set(gs, 1, gs))
        this.glows.setMatrixAt(slotIdx, tmpM)
        col.copy(glowTint).multiplyScalar(glowAmt)
        this.glows.setColorAt(slotIdx, col)
      } else {
        tmpM.compose(vp.set(wx, 0.05, wz), IDQ, vs.set(0, 0, 0))
        this.glows.setMatrixAt(slotIdx, tmpM)
      }

      if (act === 'eat' && b.eatTree >= 0 && heldN < 250) {
        const tot = Math.max(0.3, b.timerMax)
        const flyDur = Math.min(0.42, tot * 0.45)
        const f = clamp(b.actionTime / flyDur, 0, 1)
        this.slotWorld(b.eatTree, b.eatSlot, vp)
        const sx0 = vp.x
        const sy0 = vp.y
        const sz0 = vp.z
        const mouth = MOUTH_POS
        const ch = Math.cos(v.heading)
        const sh = Math.sin(v.heading)
        const mx = wx + ch * mouth.z * size
        const mz = wz + sh * mouth.z * size
        const my = mouth.y * size * 0.9 + hop
        const e = f * f * (3 - 2 * f)
        const px = sx0 + (mx - sx0) * e
        const pz = sz0 + (mz - sz0) * e
        const py = sy0 + (my - sy0) * e + Math.sin(f * Math.PI) * 0.7
        let fs = 1.05
        if (f >= 1) {
          const c = clamp((b.actionTime - flyDur) / Math.max(0.1, tot - flyDur), 0, 1)
          const bite = 0.88 + 0.12 * Math.cos(c * Math.PI * 7)
          fs = (1 - c * 0.92) * bite * 0.9
        }
        q2.setFromAxisAngle(AXIS_Y, T * 3)
        tmpM.compose(vp.set(px, py, pz), q2, vs.set(fs, fs, fs))
        this.held.setMatrixAt(heldN++, tmpM)
      }
      n++
    }

    for (const m of [this.bodies, this.eyes, this.brows, this.smiles, this.mouths, this.cheeks, this.shadows, this.glows]) {
      m.count = n
      m.instanceMatrix.needsUpdate = true
    }
    this.bodies.instanceColor!.needsUpdate = true
    this.glows.instanceColor!.needsUpdate = true
    this.held.count = heldN
    this.held.instanceMatrix.needsUpdate = true

    this.gcTimer += dt
    if (this.gcTimer > 2) {
      this.gcTimer = 0
      for (const [id, v] of this.vis) if (v.seen < stamp - 1) this.vis.delete(id)
    }
  }

  private updateSelection(world: World, dt: number) {
    const id = this.selectedId
    const b = id !== null ? world.byId.get(id) : undefined
    if (!b || b.dead) {
      if (id !== null && (!b || b.dead)) {
        this.selectedId = null
        this.onPick(null)
      }
      this.selRing.visible = false
      this.selArrow.visible = false
      this.visionRing.visible = false
    } else {
      const v = this.vis.get(b.id)
      const x = v?.rx ?? b.x
      const z = v?.rz ?? b.y
      const pulse = 1 + Math.sin(this.time * 4) * 0.06
      this.selRing.visible = true
      this.selRing.position.set(x, 0.07, z)
      this.selRing.scale.setScalar(pulse * 1.05)
      this.selArrow.visible = true
      this.selArrow.position.set(x, 2.05 + Math.sin(this.time * 3.2) * 0.14, z)
      this.selArrow.rotation.y = this.time * 1.5
      ;(this.selArrow.material as THREE.MeshBasicMaterial).color.set(b.kind === BLUE ? '#8fc7ff' : '#ff9aac')
      const vision = (b.kind === BLUE ? world.params.blueVision : world.params.redVision) * b.visionGene
      this.visionRing.visible = true
      this.visionRing.position.set(x, 0.08, z)
      this.visionRing.scale.set(vision, 1, vision)
      if (this.follow) {
        const t = this.controls.target
        const k = 1 - Math.exp(-dt * 4)
        const dx = (x - t.x) * k
        const dz = (z - t.z) * k
        t.x += dx
        t.z += dz
        this.camera.position.x += dx
        this.camera.position.z += dz
      }
    }

    const hb = this.hoverId !== null && this.hoverId !== this.selectedId ? world.byId.get(this.hoverId) : undefined
    if (hb && !hb.dead) {
      const v = this.vis.get(hb.id)
      this.hoverRing.visible = true
      this.hoverRing.position.set(v?.rx ?? hb.x, 0.06, v?.rz ?? hb.y)
    } else {
      this.hoverRing.visible = false
    }
  }

  select(id: number | null) {
    this.selectedId = id
  }

  setFollow(f: boolean) {
    this.follow = f
    if (!f) this.controls.target.y = 0
  }

  setAutoRotate(on: boolean) {
    this.controls.autoRotate = on
  }

  get autoRotate() {
    return this.controls.autoRotate
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth)
    const h = Math.max(1, this.container.clientHeight)
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    const wide = w / h
    this.camera.fov = wide < 0.9 ? 46 : 36
    this.camera.updateProjectionMatrix()
    const pr = this.renderer.getPixelRatio()
    this.particles.setScale((h * pr * 0.5) / Math.tan((this.camera.fov * Math.PI) / 360))
  }

  private pickAt(clientX: number, clientY: number): number | null {
    const world = this.world
    if (!world) return null
    const rect = this.renderer.domElement.getBoundingClientRect()
    const px = clientX - rect.left
    const py = clientY - rect.top
    const dist = this.camera.position.distanceTo(this.controls.target)
    const pxPerUnit = rect.height / 2 / (Math.tan((this.camera.fov * Math.PI) / 360) * dist)
    const thr = Math.max(20, pxPerUnit * 0.95)
    let best: number | null = null
    let bestD = 1
    for (const b of world.blobs) {
      if (b.dead) continue
      const v = this.vis.get(b.id)
      vp.set(v?.rx ?? b.x, 0.5, v?.rz ?? b.y).project(this.camera)
      const sx = (vp.x * 0.5 + 0.5) * rect.width
      const sy = (-vp.y * 0.5 + 0.5) * rect.height
      const d = Math.hypot(sx - px, sy - py) / thr
      if (d < bestD) {
        bestD = d
        best = b.id
      }
    }
    return best
  }

  private onDown = (e: PointerEvent) => {
    this.downX = e.clientX
    this.downY = e.clientY
    this.downT = performance.now()
  }

  private onUp = (e: PointerEvent) => {
    const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY)
    if (moved > 6 || performance.now() - this.downT > 700) return
    const id = this.pickAt(e.clientX, e.clientY)
    this.selectedId = id
    this.onPick(id)
  }

  private onMove = (e: PointerEvent) => {
    const now = performance.now()
    if (e.buttons) return
    if (now - this.lastHoverCheck < 60) return
    this.lastHoverCheck = now
    const id = this.pickAt(e.clientX, e.clientY)
    this.hoverId = id
    this.renderer.domElement.style.cursor = id !== null ? 'pointer' : 'grab'
  }

  private onLeave = () => {
    this.hoverId = null
  }

  dispose() {
    const el = this.renderer.domElement
    el.removeEventListener('pointerdown', this.onDown)
    el.removeEventListener('pointerup', this.onUp)
    el.removeEventListener('pointermove', this.onMove)
    el.removeEventListener('pointerleave', this.onLeave)
    this.resizeObs.disconnect()
    this.controls.dispose()
    this.disposeGroup(this.staticGroup)
    this.particles.dispose()
    this.ringTex.dispose()
    this.shadowTex.dispose()
    this.renderer.dispose()
    el.remove()
  }
}
