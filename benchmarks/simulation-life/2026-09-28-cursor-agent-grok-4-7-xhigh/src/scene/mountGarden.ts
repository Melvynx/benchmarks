import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { stepWorld } from '../sim/engine'
import { mulberry32 } from '../sim/rng'
import type { Agent, SimEvent, World } from '../sim/types'

export type GardenApi = {
  getWorld: () => World
  getParams: () => World['params']
  getPlaying: () => boolean
  consumeSteps: () => number
  getSelected: () => number | null
  setSelected: (id: number | null) => void
  onFrame: () => void
}

type BlobView = {
  group: THREE.Group
  body: THREE.Mesh
  material: THREE.MeshPhysicalMaterial
  eyes: THREE.Mesh[]
  mouth: THREE.Mesh
  yaw: number
}

type Spark = {
  mesh: THREE.Mesh
  life: number
  vx: number
  vy: number
  vz: number
}

export function mountGarden(canvas: HTMLCanvasElement, api: GardenApi) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  const pmrem = new THREE.PMREMGenerator(renderer)
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 160)
  const cam = { theta: 0.7, phi: 1.02, radius: 28 }
  const hemi = new THREE.HemisphereLight(0xfff6ea, 0x6d8f52, 1.15)
  const sun = new THREE.DirectionalLight(0xfff1d2, 2.5)
  sun.position.set(8, 16, 7)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.bias = -0.0004
  const fill = new THREE.DirectionalLight(0xd7ecff, 0.7)
  fill.position.set(-8, 6, -5)
  scene.add(hemi, sun, fill)

  const geos = {
    body: new THREE.SphereGeometry(0.42, 28, 22),
    eye: new THREE.SphereGeometry(0.105, 14, 12),
    pupil: new THREE.SphereGeometry(0.055, 10, 8),
    mouth: new THREE.SphereGeometry(0.07, 12, 8),
    blush: new THREE.SphereGeometry(0.055, 8, 6),
    fruit: new THREE.SphereGeometry(0.32, 16, 12),
    stem: new THREE.CylinderGeometry(0.02, 0.028, 0.34, 6),
    leaf: new THREE.IcosahedronGeometry(0.72, 1),
    trunk: new THREE.CylinderGeometry(0.1, 0.16, 0.92, 8),
    tuft: new THREE.ConeGeometry(0.07, 0.26, 5),
    stone: new THREE.DodecahedronGeometry(0.12, 0),
  }
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xfffbf7, roughness: 0.35 })
  const pupilMat = new THREE.MeshStandardMaterial({ color: 0x1c2430, roughness: 0.4 })
  const mouthMat = new THREE.MeshStandardMaterial({ color: 0x2a2428, roughness: 0.55 })
  const blushMat = new THREE.MeshStandardMaterial({ color: 0xff8fa3, roughness: 0.6 })
  const fruitMat = new THREE.MeshPhysicalMaterial({
    color: 0xd2f25a,
    roughness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    emissive: 0x6a9a12,
    emissiveIntensity: 0.28,
  })
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x3f6a32, roughness: 0.7 })
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f8f45, roughness: 0.78 })
  const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x67b85a, roughness: 0.74 })
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.86 })

  const blobs = new Map<number, BlobView>()
  const trees = new Map<number, THREE.Group>()
  const fruitMeshes = new Map<number, THREE.Group>()
  const sparks: Spark[] = []
  const sparkGeo = new THREE.SphereGeometry(0.05, 8, 6)
  for (let i = 0; i < 56; i += 1) {
    const mesh = new THREE.Mesh(
      sparkGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }),
    )
    mesh.visible = false
    scene.add(mesh)
    sparks.push({ mesh, life: 0, vx: 0, vy: 0, vz: 0 })
  }

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.58, 0.78, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff6d4, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }),
  )
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.09
  ring.renderOrder = 4
  ring.visible = false
  scene.add(ring)

  let dish: THREE.Group | null = null
  let epoch = -1
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let dragging = false
  let moved = 0
  let lastX = 0
  let lastY = 0
  let vel = 0
  let velPhi = 0
  let lastUi = 0
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function applyCamera() {
    const sinPhi = Math.sin(cam.phi)
    camera.position.set(
      cam.radius * sinPhi * Math.sin(cam.theta),
      cam.radius * Math.cos(cam.phi),
      cam.radius * sinPhi * Math.cos(cam.theta),
    )
    camera.lookAt(0, 0.4, 0)
  }

  function fitShadow(radius: number) {
    const span = radius * 1.55 + 2
    sun.shadow.camera.left = -span
    sun.shadow.camera.right = span
    sun.shadow.camera.top = span
    sun.shadow.camera.bottom = -span
    sun.shadow.camera.near = 0.5
    sun.shadow.camera.far = 48
    sun.shadow.camera.updateProjectionMatrix()
  }

  function rebuild(world: World) {
    if (dish) {
      scene.remove(dish)
      disposeObject(dish)
    }
    for (const view of blobs.values()) {
      scene.remove(view.group)
      view.material.dispose()
    }
    blobs.clear()
    for (const group of trees.values()) scene.remove(group)
    trees.clear()
    fruitMeshes.clear()
    dish = buildDish(world, geos)
    scene.add(dish)
    fitShadow(world.radius)
    cam.radius = world.radius * 2.8
    epoch = world.epoch
  }

  function resize() {
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width < 2 || height < 2) return
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
  }

  function onDown(event: PointerEvent) {
    dragging = true
    moved = 0
    lastX = event.clientX
    lastY = event.clientY
    canvas.setPointerCapture(event.pointerId)
  }
  function onMove(event: PointerEvent) {
    if (!dragging) {
      hover(event)
      return
    }
    const dx = event.clientX - lastX
    const dy = event.clientY - lastY
    lastX = event.clientX
    lastY = event.clientY
    moved += Math.abs(dx) + Math.abs(dy)
    vel = dx * 0.0055
    velPhi = dy * 0.0032
    cam.theta -= vel
    cam.phi = clamp(cam.phi + velPhi, 0.42, 1.2)
  }
  function onUp(event: PointerEvent) {
    if (!dragging) return
    dragging = false
    if (moved < 6) pick(event)
  }
  function onWheel(event: WheelEvent) {
    event.preventDefault()
    cam.radius = clamp(cam.radius + event.deltaY * 0.015, 9, 72)
  }
  function hover(event: PointerEvent) {
    const id = rayId(event)
    canvas.style.cursor = id == null ? 'grab' : 'pointer'
  }
  function pick(event: PointerEvent) {
    api.setSelected(rayId(event))
  }
  function rayId(event: PointerEvent) {
    const rect = canvas.getBoundingClientRect()
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObjects([...blobs.values()].map((view) => view.group), true)
    if (hits.length === 0) return null
    let object: THREE.Object3D | null = hits[0].object
    while (object && object.userData.agentId == null) object = object.parent
    return (object?.userData.agentId as number | undefined) ?? null
  }

  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })
  const observer = new ResizeObserver(() => resize())
  observer.observe(canvas.parentElement ?? canvas)
  resize()

  let raf = 0
  const loop = (now: number) => {
    const world = api.getWorld()
    world.params = api.getParams()
    if (world.epoch !== epoch) rebuild(world)
    const steps = (api.getPlaying() ? Math.max(1, Math.round(world.params.simSpeed)) : 0) + api.consumeSteps()
    const events: SimEvent[] = []
    for (let i = 0; i < steps; i += 1) {
      stepWorld(world)
      events.push(...world.events)
    }
    syncTrees(world, trees, fruitMeshes, geos, leafMat, leafMat2, trunkMat, fruitMat, stemMat, scene)
    syncBlobs(world, blobs, scene, geos, eyeMat, pupilMat, mouthMat, blushMat, now, api.getPlaying(), reduce)
    emitSparks(events, sparks)
    tickSparks(sparks)
    const selected = api.getSelected()
    const picked = selected == null ? undefined : world.agents.find((agent) => agent.id === selected)
    ring.visible = !!picked
    if (picked) {
      ring.position.x = picked.x
      ring.position.z = picked.z
      ;(ring.material as THREE.MeshBasicMaterial).color.set(picked.kind === 'blue' ? 0x8ec2ff : 0xff9aa4)
    }
    if (!dragging) {
      cam.theta -= vel
      cam.phi = clamp(cam.phi + velPhi, 0.42, 1.2)
      vel *= 0.92
      velPhi *= 0.88
    }
    applyCamera()
    renderer.render(scene, camera)
    if (steps > 0 || now - lastUi > 120) {
      lastUi = now
      api.onFrame()
    }
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf)
    observer.disconnect()
    canvas.removeEventListener('pointerdown', onDown)
    canvas.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
    canvas.removeEventListener('wheel', onWheel)
    renderer.dispose()
    pmrem.dispose()
    Object.values(geos).forEach((geo) => geo.dispose())
  }
}

function syncTrees(
  world: World,
  trees: Map<number, THREE.Group>,
  fruitMeshes: Map<number, THREE.Group>,
  geos: { leaf: THREE.IcosahedronGeometry; trunk: THREE.CylinderGeometry; fruit: THREE.SphereGeometry; stem: THREE.CylinderGeometry },
  leafMat: THREE.Material,
  leafMat2: THREE.Material,
  trunkMat: THREE.Material,
  fruitMat: THREE.Material,
  stemMat: THREE.Material,
  scene: THREE.Scene,
) {
  const liveTrees = new Set<number>()
  const liveFruit = new Set<number>()
  for (const tree of world.trees) {
    liveTrees.add(tree.id)
    let group = trees.get(tree.id)
    if (!group) {
      group = new THREE.Group()
      const trunk = new THREE.Mesh(geos.trunk, trunkMat)
      trunk.position.y = 0.46
      trunk.castShadow = true
      const canopy = new THREE.Group()
      const puffA = new THREE.Mesh(geos.leaf, leafMat)
      puffA.scale.set(1.15 * tree.scale, 0.82 * tree.scale, 1.05 * tree.scale)
      puffA.position.y = 0.15
      puffA.castShadow = true
      const puffB = new THREE.Mesh(geos.leaf, leafMat2)
      puffB.scale.set(0.72 * tree.scale, 0.62 * tree.scale, 0.7 * tree.scale)
      puffB.position.set(0.28 * tree.scale, 0.22, 0.12)
      puffB.castShadow = true
      const puffC = new THREE.Mesh(geos.leaf, leafMat2)
      puffC.scale.set(0.64 * tree.scale, 0.55 * tree.scale, 0.66 * tree.scale)
      puffC.position.set(-0.26 * tree.scale, 0.08, -0.08)
      puffC.castShadow = true
      canopy.add(puffA, puffB, puffC)
      canopy.position.y = 1.05
      canopy.name = 'canopy'
      group.add(trunk, canopy)
      group.position.set(tree.x, 0, tree.z)
      scene.add(group)
      trees.set(tree.id, group)
    }
    const canopy = group.getObjectByName('canopy')
    if (canopy) {
      const time = performance.now()
      canopy.rotation.z = Math.sin(time * 0.0011 + tree.id) * 0.035
      canopy.rotation.x = Math.cos(time * 0.0009 + tree.id * 1.7) * 0.03
    }
    for (const fruit of tree.fruits) {
      liveFruit.add(fruit.id)
      let fruitGroup = fruitMeshes.get(fruit.id)
      if (!fruitGroup) {
        fruitGroup = new THREE.Group()
        const berry = new THREE.Mesh(geos.fruit, fruitMat)
        berry.castShadow = true
        const stem = new THREE.Mesh(geos.stem, stemMat)
        stem.position.y = 0.22
        fruitGroup.add(berry, stem)
        fruitGroup.position.set(fruit.lx, fruit.ly, fruit.lz)
        group.add(fruitGroup)
        fruitMeshes.set(fruit.id, fruitGroup)
      }
      let scale = fruit.growth
      if (fruit.reservedBy != null) {
        const eater = world.agents.find((agent) => agent.id === fruit.reservedBy)
        if (eater && eater.timerMax > 0) scale *= 0.18 + 0.82 * (eater.timer / eater.timerMax)
      }
      fruitGroup.visible = scale > 0.04
      fruitGroup.scale.setScalar(Math.max(0.04, scale))
    }
  }
  for (const [id, group] of trees) {
    if (!liveTrees.has(id)) {
      scene.remove(group)
      trees.delete(id)
    }
  }
  for (const [id, group] of fruitMeshes) {
    if (!liveFruit.has(id)) {
      group.parent?.remove(group)
      fruitMeshes.delete(id)
    }
  }
}

function syncBlobs(
  world: World,
  blobs: Map<number, BlobView>,
  scene: THREE.Scene,
  geos: {
    body: THREE.SphereGeometry
    eye: THREE.SphereGeometry
    pupil: THREE.SphereGeometry
    mouth: THREE.SphereGeometry
    blush: THREE.SphereGeometry
  },
  eyeMat: THREE.Material,
  pupilMat: THREE.Material,
  mouthMat: THREE.Material,
  blushMat: THREE.Material,
  now: number,
  playing: boolean,
  reduce: boolean,
) {
  const live = new Set<number>()
  for (const agent of world.agents) {
    live.add(agent.id)
    let view = blobs.get(agent.id)
    if (!view) {
      view = createBlob(agent, geos, eyeMat, pupilMat, mouthMat, blushMat)
      blobs.set(agent.id, view)
      scene.add(view.group)
    }
    poseBlob(view, agent, now, playing, reduce)
  }
  for (const [id, view] of blobs) {
    if (live.has(id)) continue
    scene.remove(view.group)
    view.group.traverse((child) => {
      const mesh = child as THREE.Mesh
      const material = mesh.material
      if (material && !Array.isArray(material) && material.userData.owned) material.dispose()
    })
    view.material.dispose()
    blobs.delete(id)
  }
}

function createBlob(
  agent: Agent,
  geos: {
    body: THREE.SphereGeometry
    eye: THREE.SphereGeometry
    pupil: THREE.SphereGeometry
    mouth: THREE.SphereGeometry
    blush: THREE.SphereGeometry
  },
  eyeMat: THREE.Material,
  pupilMat: THREE.Material,
  mouthMat: THREE.Material,
  blushMat: THREE.Material,
): BlobView {
  const group = new THREE.Group()
  group.userData.agentId = agent.id
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color().setHSL(agent.hue, 0.78, 0.56),
    roughness: 0.22,
    metalness: 0.02,
    clearcoat: 0.85,
    clearcoatRoughness: 0.18,
    sheen: 0.35,
    sheenColor: new THREE.Color(0xffffff),
    emissive: new THREE.Color().setHSL(agent.hue, 0.6, 0.25),
    emissiveIntensity: 0.12,
  })
  const body = new THREE.Mesh(geos.body, material)
  body.castShadow = true
  body.scale.set(0.78, 1.05, 0.7)
  body.userData.agentId = agent.id
  const pick = new THREE.Mesh(
    geos.body,
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  )
  pick.scale.setScalar(1.45)
  pick.userData.agentId = agent.id
  ;(pick.material as THREE.Material).userData.owned = true
  group.add(pick)
  const eyes: THREE.Mesh[] = []
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(geos.eye, eyeMat)
    eye.position.set(0.13 * side, 0.1, 0.28)
    eye.userData.agentId = agent.id
    const pupil = new THREE.Mesh(geos.pupil, pupilMat)
    pupil.position.set(0.01 * side, -0.01, 0.07)
    pupil.userData.agentId = agent.id
    eye.add(pupil)
    body.add(eye)
    eyes.push(eye)
    const blush = new THREE.Mesh(geos.blush, blushMat)
    blush.position.set(0.2 * side, -0.02, 0.24)
    blush.scale.set(1, 0.7, 0.5)
    blush.userData.agentId = agent.id
    body.add(blush)
  }
  const mouth = new THREE.Mesh(geos.mouth, mouthMat)
  mouth.position.set(0, -0.12, 0.32)
  mouth.scale.set(1.15, 0.42, 0.55)
  mouth.userData.agentId = agent.id
  body.add(mouth)
  group.add(body)
  return { group, body, material, eyes, mouth, yaw: agent.wanderAngle }
}

function poseBlob(view: BlobView, agent: Agent, now: number, playing: boolean, reduce: boolean) {
  const speed = Math.hypot(agent.vx, agent.vz)
  if (speed > 0.004) view.yaw = Math.atan2(agent.vx, agent.vz)
  const bob = Math.sin(now * (reduce ? 0.002 : 0.006) + agent.phase) * (reduce ? 0.012 : 0.038)
  let hop = 0
  if (agent.action === 'contact' || agent.action === 'pause') {
    const k = agent.timerMax > 0 ? 1 - agent.timer / agent.timerMax : 0
    hop = Math.sin(Math.min(1, k) * Math.PI) * 0.18
  }
  const pop = Math.min(1, agent.age / 16)
  view.group.scale.setScalar(agent.scale * (0.4 + 0.6 * pop))
  view.group.position.set(agent.x, 0.4 * agent.scale + bob + hop, agent.z)
  view.group.rotation.y = view.yaw
  view.body.rotation.x = Math.min(0.45, speed * 7.5)
  const chewClock = playing ? now * 0.02 : agent.age
  if (agent.action === 'eat') {
    const chew = 1 + Math.sin(chewClock) * 0.09
    view.body.scale.set(0.78 * chew, 1.05 / chew, 0.7)
    view.mouth.scale.y = 0.35 + Math.abs(Math.sin(chewClock * 1.3)) * 1.35
  } else {
    view.body.scale.set(0.78, 1.05 - bob, 0.7)
    view.mouth.scale.set(1.15, 0.42, 0.55)
  }
  const blink = (now * 0.001 + agent.phase) % 3.6
  const shut = !reduce && blink > 3.4 && blink < 3.55
  for (const eye of view.eyes) {
    const wide = agent.action === 'flee' ? 1.28 : 1
    eye.scale.y = shut ? 0.12 : wide
  }
  const vigor = clamp(agent.energy / 72, 0.12, 1)
  view.material.color.setHSL(agent.hue, 0.55 + vigor * 0.3, 0.4 + vigor * 0.14)
  if (agent.action === 'contact' || (agent.kind === 'blue' && agent.action === 'flee' && agent.timer > agent.timerMax - 7)) {
    view.material.emissive.set('#ffe7a8')
    view.material.emissiveIntensity = 0.7
  } else {
    view.material.emissive.setHSL(agent.hue, 0.7, 0.22)
    view.material.emissiveIntensity = 0.05 + vigor * 0.16
  }
}

function emitSparks(events: SimEvent[], sparks: Spark[]) {
  for (const event of events) {
    const color = event.kind === 'eat' ? 0xb6f27a : event.kind === 'contact' ? 0xffe1a8 : event.kind === 'born' ? 0xffffff : 0xd0d0d0
    const count = event.kind === 'contact' ? 8 : 5
    for (let i = 0; i < count; i += 1) {
      const spark = sparks.find((item) => item.life <= 0)
      if (!spark) return
      spark.life = 1
      spark.mesh.visible = true
      spark.mesh.position.set(event.x, 0.55, event.z)
      spark.vx = (Math.random() - 0.5) * 0.03
      spark.vy = 0.02 + Math.random() * 0.03
      spark.vz = (Math.random() - 0.5) * 0.03
      ;(spark.mesh.material as THREE.MeshBasicMaterial).color.set(color)
    }
  }
}

function tickSparks(sparks: Spark[]) {
  for (const spark of sparks) {
    if (spark.life <= 0) continue
    spark.life -= 0.025
    spark.vy -= 0.0012
    spark.mesh.position.x += spark.vx
    spark.mesh.position.y += spark.vy
    spark.mesh.position.z += spark.vz
    const scale = Math.max(0.05, spark.life)
    spark.mesh.scale.setScalar(scale)
    ;(spark.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, spark.life)
    if (spark.life <= 0) spark.mesh.visible = false
  }
}

function buildDish(
  world: World,
  geos: { tuft: THREE.ConeGeometry; stone: THREE.DodecahedronGeometry },
) {
  const group = new THREE.Group()
  const radius = world.radius
  const profile = [
    new THREE.Vector2(0.2, -0.2),
    new THREE.Vector2(radius * 0.55, -0.24),
    new THREE.Vector2(radius * 0.86, -0.08),
    new THREE.Vector2(radius * 0.98, 0.12),
    new THREE.Vector2(radius * 1.06, 0.62),
    new THREE.Vector2(radius * 1.16, 0.98),
    new THREE.Vector2(radius * 1.28, 0.72),
    new THREE.Vector2(radius * 1.3, 0.08),
    new THREE.Vector2(radius * 1.08, -0.36),
    new THREE.Vector2(radius * 0.55, -0.5),
    new THREE.Vector2(0.2, -0.5),
  ]
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 72),
    new THREE.MeshStandardMaterial({ color: 0xf0d2b4, roughness: 0.58, metalness: 0.02, side: THREE.DoubleSide }),
  )
  bowl.receiveShadow = true
  bowl.castShadow = true
  const grassGeo = new THREE.CircleGeometry(radius * 0.96, 72)
  const positions = grassGeo.attributes.position
  const colors = new Float32Array(positions.count * 3)
  const center = new THREE.Color('#8fbe63')
  const edge = new THREE.Color('#4f7d3a')
  const moss = new THREE.Color('#6fa84a')
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i)
    const y = positions.getY(i)
    const dist = Math.hypot(x, y) / (radius * 0.96)
    const n = hash(i * 12.3 + x)
    const color = center.clone().lerp(n > 0.55 ? moss : edge, dist * 0.75 + n * 0.15)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }
  grassGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const grass = new THREE.Mesh(
    grassGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }),
  )
  grass.rotation.x = -Math.PI / 2
  grass.position.y = 0.03
  grass.receiveShadow = true
  const tuftMat = new THREE.MeshStandardMaterial({ color: 0x5e9a45, roughness: 0.9 })
  const tufts = new THREE.InstancedMesh(geos.tuft, tuftMat, 110)
  const rng = mulberry32((world.baked.seed + 17) >>> 0)
  const dummy = new THREE.Object3D()
  for (let i = 0; i < 110; i += 1) {
    const angle = rng() * Math.PI * 2
    const dist = Math.sqrt(rng()) * radius * 0.9
    dummy.position.set(Math.cos(angle) * dist, 0.12, Math.sin(angle) * dist)
    dummy.rotation.y = rng() * Math.PI
    dummy.scale.setScalar(0.7 + rng() * 0.9)
    dummy.updateMatrix()
    tufts.setMatrixAt(i, dummy.matrix)
  }
  tufts.castShadow = true
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0xc9c1b4, roughness: 0.92 })
  const stones = new THREE.Group()
  for (let i = 0; i < 8; i += 1) {
    const stone = new THREE.Mesh(geos.stone, stoneMat)
    const angle = rng() * Math.PI * 2
    const dist = radius * (0.55 + rng() * 0.32)
    stone.position.set(Math.cos(angle) * dist, 0.06, Math.sin(angle) * dist)
    stone.scale.setScalar(0.5 + rng() * 0.8)
    stone.rotation.set(rng(), rng(), rng())
    stone.castShadow = true
    stones.add(stone)
  }
  const blot = new THREE.Mesh(
    new THREE.CircleGeometry(radius + 2.4, 48),
    new THREE.MeshBasicMaterial({ color: 0x8aa384, transparent: true, opacity: 0.22, depthWrite: false }),
  )
  blot.rotation.x = -Math.PI / 2
  blot.position.y = -0.52
  group.add(blot, bowl, grass, tufts, stones)
  return group
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh
    if (mesh.geometry && mesh.geometry.type === 'LatheGeometry') mesh.geometry.dispose()
    if (mesh.geometry && mesh.geometry.type === 'CircleGeometry') mesh.geometry.dispose()
    if (Array.isArray(mesh.material)) mesh.material.forEach((material) => material.dispose())
    else if (mesh.material && 'dispose' in mesh.material) mesh.material.dispose()
  })
}

function hash(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453
  return x - Math.floor(x)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
