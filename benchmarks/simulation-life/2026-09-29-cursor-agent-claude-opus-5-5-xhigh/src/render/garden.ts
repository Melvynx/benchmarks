import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ECO, FADE_TIME, MAX_SLOTS, type Blob, type SimEvent, type Simulation, type Tree } from "../sim/engine";
import { hash01, mulberry32 } from "../sim/rng";
import { Particles, Shape } from "./particles";
import { grassTexture, radialTexture } from "./textures";

const BODY_H = 0.8;
const BODY_W = 0.36;
const BODY_K = 0.12;
const MAX_INST = 1500;
const RED_SCALE = 1.12;
const FRUIT_R = 0.13;

const rAt = (y: number) => {
  const c = 1 - (2 * y) / BODY_H;
  return BODY_W * Math.sqrt(Math.max(0, 1 - c * c)) * (1 + BODY_K * c);
};
const zAt = (y: number, x: number) => Math.sqrt(Math.max(0, rAt(y) ** 2 - x * x));

const EYE_X = 0.118;
const EYE_Y = 0.48;
const EYE_Z = zAt(EYE_Y, EYE_X) - 0.012;
const MOUTH_Y = 0.35;
const MOUTH_Z = zAt(MOUTH_Y, 0) - 0.004;
const CHEEK_X = 0.2;
const CHEEK_Y = 0.39;
const CHEEK_Z = zAt(CHEEK_Y, CHEEK_X) - 0.01;

const COLORS = {
  blue: { h: 0.6, s: 0.92, l: 0.56 },
  red: { h: 0.985, s: 0.86, l: 0.6 },
  cheekBlue: new THREE.Color("#ff93b8"),
  cheekRed: new THREE.Color("#ffc9a3"),
  fruitRipe: new THREE.Color("#c8f04e"),
  fruitYoung: new THREE.Color("#5f9f37"),
  fade: new THREE.Color("#e9ecf5"),
  white: new THREE.Color("#ffffff"),
};

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
const wrap = (a: number) => {
  a = (a + Math.PI) % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a - Math.PI;
};
const easeOutBack = (t: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

interface Vis {
  seed: number;
  born: number;
  nextBlink: number;
  blinkAt: number;
  roll: number;
  pitch: number;
  bounce: number;
  glow: number;
  lastHug: number;
  lastEat: number;
  prevYaw: number;
  size: number;
  crumbAt: number;
  hue: number;
  light: number;
  mouth: THREE.Vector3;
  pos: THREE.Vector3;
  seen: number;
}

export interface ViewSettings {
  autoSpin: boolean;
  follow: boolean;
  showSense: boolean;
}

function eggGeometry() {
  const pts: THREE.Vector2[] = [];
  const N = 30;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * Math.PI;
    const c = Math.cos(t);
    pts.push(new THREE.Vector2(Math.max(0.0001, BODY_W * Math.sin(t) * (1 + BODY_K * c)), (BODY_H / 2) * (1 - c)));
  }
  const g = new THREE.LatheGeometry(pts, 40);
  g.computeVertexNormals();
  return g;
}

function bushGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 4);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const n =
      Math.sin(v.x * 5.1 + v.y * 2.3) * 0.045 +
      Math.sin(v.z * 6.3 - v.x * 1.7) * 0.04 +
      Math.sin(v.y * 9.1 + v.z * 3.3) * 0.02;
    const squash = v.y < 0 ? 0.82 : 1;
    pos.setXYZ(i, v.x * (1 + n), v.y * (1 + n) * squash, v.z * (1 + n));
  }
  g.computeVertexNormals();
  return g;
}

function instanced(geo: THREE.BufferGeometry, mat: THREE.Material, count: number, colors = false) {
  const m = new THREE.InstancedMesh(geo, mat, count);
  m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  if (colors) {
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3).fill(1), 3);
    m.instanceColor.setUsage(THREE.DynamicDrawUsage);
  }
  m.frustumCulled = false;
  m.count = 0;
  return m;
}

const _m = new THREE.Matrix4();
const _l = new THREE.Matrix4();
const _body = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e = new THREE.Euler();
const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _s = new THREE.Vector3();
const _c = new THREE.Color();
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Q_IDENT = new THREE.Quaternion();
const Q_EYE_L = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, 0.34);
const Q_EYE_R = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, -0.34);
const Q_CHEEK_L = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, 0.6);
const Q_CHEEK_R = new THREE.Quaternion().setFromAxisAngle(Y_AXIS, -0.6);
const Q_SMILE = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI);
export class GardenView {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  settings: ViewSettings = { autoSpin: false, follow: false, showSense: true };
  selectedId: number | null = null;
  hoverId: number | null = null;
  onPick: (id: number | null) => void = () => {};

  private container: HTMLElement;
  private sim: Simulation | null = null;
  private R = 0;
  private world = new THREE.Group();
  private worldDisposables: { dispose(): void }[] = [];
  private clock = 0;
  private vis = new Map<number, Vis>();
  private indexToId = new Int32Array(MAX_INST);

  private body: THREE.InstancedMesh;
  private eyes: THREE.InstancedMesh;
  private shines: THREE.InstancedMesh;
  private mouths: THREE.InstancedMesh;
  private cheeks: THREE.InstancedMesh;
  private shadows: THREE.InstancedMesh;

  private trunks: THREE.InstancedMesh | null = null;
  private canopies: THREE.InstancedMesh | null = null;
  private fruit: THREE.InstancedMesh | null = null;
  private leaves: THREE.InstancedMesh | null = null;
  private fruitScale = new Float32Array(0);
  private treeWobble: { at: number; seen: number; ax: number; az: number }[] = [];

  private sparkles = new Particles(1400, THREE.AdditiveBlending);
  private bits = new Particles(1400, THREE.NormalBlending);

  private selRing: THREE.Mesh;
  private hoverRing: THREE.Mesh;
  private senseRing: THREE.Mesh;
  private fearRing: THREE.Mesh;
  private marker: THREE.Mesh;
  private targetLine: THREE.Line;
  private sun: THREE.DirectionalLight;
  private baseShadow: THREE.Mesh;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downAt = { x: 0, y: 0, t: 0 };
  private hoverDirty = false;
  private lastPointer = { x: 0, y: 0, inside: false };
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.container = container;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    this.renderer = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.8;
    this.controls.maxPolarAngle = 1.27;
    this.controls.minPolarAngle = 0.12;
    this.controls.autoRotateSpeed = 0.45;

    this.scene.add(new THREE.HemisphereLight(0xfff3df, 0x5f8a4f, 1.15));
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.03;
    sun.shadow.radius = 4;
    this.scene.add(sun, sun.target);
    this.sun = sun;
    const fill = new THREE.DirectionalLight(0xcfe0ff, 0.55);
    fill.position.set(-20, 14, -18);
    this.scene.add(fill);

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.24,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      sheen: 0.1,
      sheenColor: new THREE.Color(0xffffff),
    });
    this.body = instanced(eggGeometry(), bodyMat, MAX_INST, true);
    this.body.castShadow = true;
    this.eyes = instanced(
      new THREE.SphereGeometry(1, 16, 12),
      new THREE.MeshPhysicalMaterial({ color: 0x17182b, roughness: 0.15, clearcoat: 1 }),
      MAX_INST * 2,
    );
    this.shines = instanced(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX_INST * 2);
    this.mouths = instanced(
      new THREE.TorusGeometry(1, 0.28, 8, 20, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x3b1d2a, roughness: 0.5 }),
      MAX_INST,
    );
    this.cheeks = instanced(
      new THREE.SphereGeometry(1, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, transparent: true, opacity: 0.8 }),
      MAX_INST * 2,
      true,
    );
    const shadowGeo = new THREE.PlaneGeometry(1, 1);
    shadowGeo.rotateX(-Math.PI / 2);
    this.shadows = instanced(
      shadowGeo,
      new THREE.MeshBasicMaterial({
        map: radialTexture("rgba(20,40,10,0.6)"),
        transparent: true,
        depthWrite: false,
        opacity: 0.55,
      }),
      MAX_INST,
    );
    this.shadows.renderOrder = 1;
    this.scene.add(this.body, this.eyes, this.shines, this.mouths, this.cheeks, this.shadows);
    this.scene.add(this.sparkles.points, this.bits.points);

    const ringGeo = new THREE.TorusGeometry(0.52, 0.035, 8, 56);
    ringGeo.rotateX(Math.PI / 2);
    this.selRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 }));
    this.hoverRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
    const senseGeo = new THREE.RingGeometry(0.985, 1, 128);
    senseGeo.rotateX(-Math.PI / 2);
    this.senseRing = new THREE.Mesh(
      senseGeo,
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
    );
    const fearGeo = new THREE.RingGeometry(0.97, 1, 96);
    fearGeo.rotateX(-Math.PI / 2);
    this.fearRing = new THREE.Mesh(
      fearGeo,
      new THREE.MeshBasicMaterial({ color: 0xff6b7a, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    this.marker = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.13, 0),
      new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xffb020, emissiveIntensity: 0.6, roughness: 0.3 }),
    );
    const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    this.targetLine = new THREE.Line(
      lineGeo,
      new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.85 }),
    );
    for (const o of [this.selRing, this.hoverRing, this.senseRing, this.fearRing, this.marker, this.targetLine]) {
      o.visible = false;
      o.renderOrder = 5;
      this.scene.add(o);
    }

    const baseShadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: radialTexture("rgba(90,60,30,0.42)"), transparent: true, depthWrite: false }),
    );
    this.baseShadow = baseShadow;
    this.scene.add(baseShadow);
    this.scene.add(this.world);

    const el = renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerleave", this.onPointerLeave);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  // ---------------------------------------------------------------- world build

  setSim(sim: Simulation) {
    const sizeChanged = sim.R !== this.R;
    this.sim = sim;
    this.R = sim.R;
    this.vis.clear();
    this.sparkles.clear();
    this.bits.clear();
    this.buildWorld(sim);
    if (sizeChanged) this.frameCamera();
  }

  frameCamera() {
    const R = this.R;
    this.controls.minDistance = R * 0.55;
    this.controls.maxDistance = R * 4.2;
    const d = R * 2.55;
    const polar = 0.92;
    const az = 0.55;
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(Math.sin(polar) * Math.sin(az) * d, Math.cos(polar) * d, Math.sin(polar) * Math.cos(az) * d);
    this.controls.update();
  }

  private buildWorld(sim: Simulation) {
    for (const d of this.worldDisposables) d.dispose();
    this.worldDisposables = [];
    this.world.clear();
    const R = sim.R;
    const track = <T extends { dispose(): void }>(x: T) => {
      this.worldDisposables.push(x);
      return x;
    };

    const sun = this.sun;
    sun.position.set(R * 0.55, R * 1.6, R * 0.75);
    sun.target.position.set(0, 0, 0);
    const cam = sun.shadow.camera;
    cam.left = cam.bottom = -(R + 2.5);
    cam.right = cam.top = R + 2.5;
    cam.near = 1;
    cam.far = R * 5;
    cam.updateProjectionMatrix();
    this.baseShadow.scale.set((R + 1.5) * 3.1, 1, (R + 1.5) * 3.1);
    this.baseShadow.position.set(R * 0.12, -1.72, R * 0.12);

    const grass = new THREE.Mesh(
      track(new THREE.CircleGeometry(R + 0.05, 128).rotateX(-Math.PI / 2)),
      track(new THREE.MeshStandardMaterial({ map: track(grassTexture(sim.seed)), roughness: 0.95 })),
    );
    grass.receiveShadow = true;
    this.world.add(grass);

    const lip: [number, number][] = [
      [R - 0.02, -0.04],
      [R + 0.03, 0.2],
      [R + 0.12, 0.38],
      [R + 0.28, 0.47],
      [R + 0.48, 0.46],
      [R + 0.62, 0.36],
      [R + 0.68, 0.18],
      [R + 0.66, -0.2],
      [R + 0.56, -1.15],
      [R + 0.36, -1.58],
      [R - 0.3, -1.7],
      [0, -1.7],
    ];
    const potGeo = track(new THREE.LatheGeometry(lip.map(([r, y]) => new THREE.Vector2(r, y)), 160));
    const pot = new THREE.Mesh(
      potGeo,
      track(new THREE.MeshPhysicalMaterial({ color: 0xe79b72, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4 })),
    );
    pot.castShadow = true;
    pot.receiveShadow = true;
    this.world.add(pot);
    const band = new THREE.Mesh(
      track(new THREE.TorusGeometry(R + 0.63, 0.07, 10, 180).rotateX(Math.PI / 2)),
      track(new THREE.MeshPhysicalMaterial({ color: 0xfff1dc, roughness: 0.4, clearcoat: 0.6 })),
    );
    band.position.y = -0.45;
    this.world.add(band);

    this.buildDecor(sim, track);
    this.buildTrees(sim.trees, track);
  }

  private buildDecor(sim: Simulation, track: <T extends { dispose(): void }>(x: T) => T) {
    const R = sim.R;
    const rng = mulberry32(sim.seed * 7 + 99);
    const clearOf = (x: number, z: number, pad: number) =>
      sim.trees.every((t) => Math.hypot(t.x - x, t.z - z) > t.canopy * 0.6 + pad);
    const spot = (pad: number) => {
      for (let i = 0; i < 20; i++) {
        const r = Math.sqrt(rng()) * (R - 0.6);
        const a = rng() * Math.PI * 2;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (clearOf(x, z, pad)) return { x, z };
      }
      return null;
    };

    const tuftCount = Math.round(R * R * 0.75);
    const bladeGeo = track(new THREE.ConeGeometry(0.035, 0.3, 4).translate(0, 0.15, 0));
    const blades = new THREE.InstancedMesh(
      bladeGeo,
      track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 })),
      tuftCount * 3,
    );
    blades.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(tuftCount * 9), 3);
    let n = 0;
    for (let i = 0; i < tuftCount; i++) {
      const s = spot(0.2);
      if (!s) continue;
      const hue = 0.26 + rng() * 0.07;
      for (let k = 0; k < 3; k++) {
        _e.set((rng() - 0.5) * 0.7, rng() * Math.PI * 2, (rng() - 0.5) * 0.7);
        _q.setFromEuler(_e);
        const h = 0.6 + rng() * 0.8;
        _m.compose(_v.set(s.x + (rng() - 0.5) * 0.12, 0, s.z + (rng() - 0.5) * 0.12), _q, _s.set(1, h, 1));
        blades.setMatrixAt(n, _m);
        blades.setColorAt(n, _c.setHSL(hue, 0.55, 0.36 + rng() * 0.14));
        n++;
      }
    }
    blades.count = n;
    blades.receiveShadow = true;
    this.world.add(blades);

    const flowerCount = Math.round(R * 3.5);
    const petals = new THREE.InstancedMesh(
      track(new THREE.SphereGeometry(1, 10, 8)),
      track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 })),
      flowerCount * 6,
    );
    petals.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(flowerCount * 18), 3);
    const palette = ["#ffffff", "#ffe27a", "#ffb3cf", "#c9b8ff", "#fff4d6"];
    n = 0;
    for (let i = 0; i < flowerCount; i++) {
      const s = spot(0.35);
      if (!s) continue;
      const col = new THREE.Color(palette[Math.floor(rng() * palette.length)]);
      const size = 0.05 + rng() * 0.03;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + rng();
        _m.compose(
          _v.set(s.x + Math.cos(a) * size * 1.1, 0.06, s.z + Math.sin(a) * size * 1.1),
          Q_IDENT,
          _s.set(size, size * 0.45, size),
        );
        petals.setMatrixAt(n, _m);
        petals.setColorAt(n, col);
        n++;
      }
      _m.compose(_v.set(s.x, 0.075, s.z), Q_IDENT, _s.set(size * 0.7, size * 0.5, size * 0.7));
      petals.setMatrixAt(n, _m);
      petals.setColorAt(n, _c.set("#ffc23d"));
      n++;
    }
    petals.count = n;
    this.world.add(petals);

    const pebbleCount = Math.round(R * 1.6);
    const pebbles = new THREE.InstancedMesh(
      track(new THREE.IcosahedronGeometry(1, 1)),
      track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7, flatShading: true })),
      pebbleCount,
    );
    pebbles.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(pebbleCount * 3), 3);
    n = 0;
    for (let i = 0; i < pebbleCount; i++) {
      const s = spot(0.4);
      if (!s) continue;
      const size = 0.08 + rng() * 0.12;
      _q.setFromEuler(_e.set(0, rng() * 6.28, 0));
      _m.compose(_v.set(s.x, size * 0.2, s.z), _q, _s.set(size * 1.3, size * 0.55, size));
      pebbles.setMatrixAt(n, _m);
      pebbles.setColorAt(n, _c.setHSL(0.08 + rng() * 0.05, 0.12, 0.72 + rng() * 0.12));
      n++;
    }
    pebbles.count = n;
    pebbles.castShadow = true;
    this.world.add(pebbles);
  }

  private buildTrees(trees: Tree[], track: <T extends { dispose(): void }>(x: T) => T) {
    const n = trees.length;
    const trunkGeo = track(new THREE.CylinderGeometry(0.085, 0.15, 1, 9).translate(0, 0.5, 0));
    this.trunks = new THREE.InstancedMesh(trunkGeo, track(new THREE.MeshStandardMaterial({ color: 0x9a6443, roughness: 0.85 })), n);
    this.trunks.castShadow = true;
    this.canopies = instanced(
      track(bushGeometry()),
      track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })),
      n * 3,
      true,
    );
    this.canopies.castShadow = true;
    this.canopies.receiveShadow = true;
    this.fruit = instanced(
      track(new THREE.SphereGeometry(1, 18, 14)),
      track(new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.15 })),
      n * MAX_SLOTS,
      true,
    );
    this.fruit.castShadow = true;
    this.leaves = instanced(
      track(new THREE.SphereGeometry(1, 8, 6)),
      track(new THREE.MeshStandardMaterial({ color: 0x2f7d3a, roughness: 0.6 })),
      n * MAX_SLOTS,
    );
    this.fruitScale = new Float32Array(n * MAX_SLOTS);
    this.treeWobble = trees.map((t) => ({ at: -10, seen: t.lastEaten, ax: 0, az: 0 }));

    for (let i = 0; i < n; i++) {
      const t = trees[i];
      _m.compose(_v.set(t.x, 0, t.z), Q_IDENT, _s.set(1, t.height + 0.2, 1));
      this.trunks.setMatrixAt(i, _m);
      const hue = 0.33 + hash01(t.seed) * 0.06;
      this.canopies.setColorAt(i * 3, _c.setHSL(hue, 0.5, 0.37));
      this.canopies.setColorAt(i * 3 + 1, _c.setHSL(hue + 0.01, 0.52, 0.42));
      this.canopies.setColorAt(i * 3 + 2, _c.setHSL(hue - 0.01, 0.48, 0.34));
      for (let s = 0; s < MAX_SLOTS; s++) {
        const slot = t.slots[s];
        this.fruitScale[i * MAX_SLOTS + s] = slot.state === "ripe" ? 1 : slot.state === "growing" ? slot.growth : 0;
      }
    }
    this.trunks.instanceMatrix.needsUpdate = true;
    this.canopies.count = n * 3;
    this.fruit.count = n * MAX_SLOTS;
    this.leaves.count = n * MAX_SLOTS;
    this.world.add(this.trunks, this.canopies, this.fruit, this.leaves);
  }

  // ---------------------------------------------------------------- frame

  render(alpha: number, realDt: number, running: boolean, simSpeed: number) {
    const sim = this.sim;
    if (!sim) return;
    this.clock += realDt;
    const now = this.clock;
    this.controls.autoRotate = this.settings.autoSpin;

    const blobs = sim.blobs;
    const p = sim.p;
    const count = Math.min(blobs.length, MAX_INST);
    const anim = running ? clamp(Math.sqrt(simSpeed), 0.6, 2.4) : 0;

    for (let i = 0; i < count; i++) {
      const b = blobs[i];
      this.indexToId[i] = b.id;
      const v = this.visFor(b, now, sim.time);
      v.seen = now;

      const x = b.px + (b.x - b.px) * alpha;
      const z = b.pz + (b.z - b.pz) * alpha;
      const heading = b.pheading + wrap(b.heading - b.pheading) * alpha;
      const yaw = Math.PI / 2 - heading;

      const isBlue = b.group === "blue";
      const baseSpeed = isBlue ? p.blueSpeed : p.redSpeed;
      const copyAt = isBlue ? p.blueCopyAt : p.redCopyAt;
      const moveN = clamp(b.speed / Math.max(0.1, baseSpeed), 0, 1.6);
      const moving = running && moveN > 0.08;
      const e = clamp(b.energy / copyAt, 0, 1.15);

      v.bounce += realDt * (4 + 7 * moveN) * anim;
      let hop = moving ? Math.abs(Math.sin(v.bounce)) * 0.12 * Math.min(1, moveN * 1.4) : 0;
      let sy = moving ? 1 + 0.075 * Math.cos(2 * v.bounce) : 1 + 0.028 * Math.sin(now * 2.3 + v.seed * 7);
      let sx = 1;
      let pitchT = moving ? 0.1 * moveN : 0;
      let rollExtra = 0;
      let eyeOpen = 1;
      let wide = 1;
      let mouthOpen = 1;
      let mouthW = 1;
      let lookX = 0;
      let lookY = 0;
      let fade = 0;
      let glowFloor = 0;

      if (now > v.nextBlink) {
        v.blinkAt = now;
        v.nextBlink = now + 1.6 + Math.random() * 3.6;
      }
      if (now - v.blinkAt < 0.13) eyeOpen = 0.1;

      const prog = b.actionDur > 0 ? clamp(1 - b.actionTime / b.actionDur, 0, 1) : 0;
      switch (b.action) {
        case "eat": {
          const chew = Math.sin(now * 17 + v.seed * 9);
          sy += 0.05 * chew;
          mouthOpen = 1.3 + 0.9 * Math.max(0, chew);
          mouthW = 1.15;
          pitchT = -0.2;
          lookY = 0.012;
          if (running && now - v.crumbAt > 0.14) {
            v.crumbAt = now;
            this.bits.emit({
              x: v.mouth.x,
              y: v.mouth.y,
              z: v.mouth.z,
              vx: (Math.random() - 0.5) * 1.2,
              vy: 0.8 + Math.random() * 0.8,
              vz: (Math.random() - 0.5) * 1.2,
              gravity: 5,
              drag: 1,
              life: 0.7,
              size: 0.07,
              color: Math.random() < 0.5 ? "#b9e84a" : "#8fcf3a",
            });
          }
          break;
        }
        case "hug":
          sx = 1.12;
          sy *= 0.94;
          pitchT = 0.28;
          eyeOpen = Math.min(eyeOpen, 0.18);
          mouthW = 1.3;
          glowFloor = 0.25;
          break;
        case "hugged":
          wide = 1.25;
          pitchT = -0.12;
          sy *= 0.92;
          sx = 1.06;
          mouthOpen = 0.6;
          break;
        case "rest":
          eyeOpen = 0.12;
          sy = 1 + 0.05 * Math.sin(now * 1.7 + v.seed);
          glowFloor = 0.18 + 0.12 * Math.sin(now * 2.4);
          mouthW = 1.25;
          if (running && Math.random() < realDt * 1.2) {
            this.sparkles.emit({
              x: x + (Math.random() - 0.5) * 0.4,
              y: 0.9,
              z: z + (Math.random() - 0.5) * 0.4,
              vy: 0.5,
              life: 1.1,
              size: 0.16,
              color: "#ffd0a0",
              shape: Shape.Star,
            });
          }
          break;
        case "tired":
          eyeOpen = Math.min(eyeOpen, 0.45);
          sy *= 0.9;
          pitchT = 0.14;
          mouthOpen = 0.5;
          break;
        case "bud":
          sy *= 1 + 0.24 * Math.sin(prog * Math.PI);
          sx = 1 + 0.08 * Math.sin(prog * Math.PI * 2);
          rollExtra = 0.12 * Math.sin(prog * Math.PI * 6);
          eyeOpen = Math.min(eyeOpen, 0.3);
          glowFloor = 0.3 * Math.sin(prog * Math.PI);
          break;
        case "fade":
          fade = clamp(1 - b.actionTime / FADE_TIME, 0, 1);
          eyeOpen = 0.1;
          mouthOpen = 0.4;
          break;
        case "flee":
        case "startled":
          wide = 1.3;
          pitchT = 0.18;
          mouthOpen = 0.5;
          break;
        case "chase":
          eyeOpen = Math.min(eyeOpen, 0.7);
          pitchT = 0.2;
          break;
        case "wait":
          if (Math.sin(now * 1.1 + v.seed * 13) > 0.985) hop = Math.max(hop, 0.06);
          break;
        default:
          break;
      }

      const target = this.lookTarget(b, sim);
      if (target) {
        const rel = wrap(Math.atan2(target.z - z, target.x - x) - heading);
        lookX = clamp(Math.sin(-rel), -1, 1) * 0.024;
      }

      if (b.lastHug !== v.lastHug) {
        if (b.lastHug > 0 && v.lastHug !== -99) v.glow = 1;
        v.lastHug = b.lastHug;
      }
      if (b.lastEat !== v.lastEat) {
        if (b.lastEat > 0 && v.lastEat !== -99) v.glow = Math.max(v.glow, 0.7);
        v.lastEat = b.lastEat;
      }
      v.glow *= Math.exp(-realDt * 2.2);
      const glow = Math.max(v.glow, glowFloor);

      const sizeT = (isBlue ? 1 : RED_SCALE) * (0.8 + 0.34 * e);
      v.size += (sizeT - v.size) * Math.min(1, realDt * 4);
      const popT = (now - v.born) / 0.5;
      const pop = popT >= 1 ? 1 : popT <= 0 ? 0.001 : Math.max(0.001, easeOutBack(popT));
      const fadeS = fade > 0 ? Math.pow(1 - fade, 0.7) + 0.001 : 1;
      const s = v.size * pop * fadeS;

      const dyaw = wrap(yaw - v.prevYaw) / Math.max(realDt, 1e-3);
      v.prevYaw = yaw;
      v.roll += (clamp(-dyaw * 0.05, -0.28, 0.28) - v.roll) * Math.min(1, realDt * 6);
      v.pitch += (pitchT - v.pitch) * Math.min(1, realDt * 7);

      const y = hop * s - fade * 0.2;
      _q.setFromEuler(_e.set(v.pitch, yaw, v.roll + rollExtra, "YXZ"));
      const inv = 1 / Math.sqrt(sy);
      _body.compose(_v.set(x, y, z), _q, _s.set(s * sx * inv, s * sy, s * inv));
      this.body.setMatrixAt(i, _body);
      v.pos.set(x, y + BODY_H * 0.5 * s, z);
      v.mouth.set(0, MOUTH_Y, MOUTH_Z + 0.06).applyMatrix4(_body);

      const tone = isBlue ? COLORS.blue : COLORS.red;
      _c.setHSL(tone.h + v.hue, tone.s * (0.62 + 0.38 * Math.min(1, e)), tone.l - 0.04 + (1 - Math.min(1, e)) * 0.07 + v.light);
      if (glow > 0.001) _c.lerp(COLORS.white, glow * 0.5);
      if (fade > 0) _c.lerp(COLORS.fade, fade);
      this.body.setColorAt(i, _c);

      const eo = eyeOpen * wide;
      for (let side = 0; side < 2; side++) {
        const sgn = side === 0 ? 1 : -1;
        _l.compose(
          _v2.set(sgn * EYE_X + lookX, EYE_Y + lookY, EYE_Z),
          side === 0 ? Q_EYE_L : Q_EYE_R,
          _s.set(0.05 * wide, 0.066 * eo, 0.034),
        );
        _m.multiplyMatrices(_body, _l);
        this.eyes.setMatrixAt(i * 2 + side, _m);
        const shine = eyeOpen > 0.5 ? 0.017 * wide : 0;
        _l.compose(_v2.set(sgn * EYE_X + lookX + 0.016, EYE_Y + lookY + 0.024 * eo, EYE_Z + 0.03), Q_IDENT, _s.set(shine, shine, shine));
        _m.multiplyMatrices(_body, _l);
        this.shines.setMatrixAt(i * 2 + side, _m);
        _l.compose(_v2.set(sgn * CHEEK_X, CHEEK_Y, CHEEK_Z), side === 0 ? Q_CHEEK_L : Q_CHEEK_R, _s.set(0.056, 0.032, 0.02));
        _m.multiplyMatrices(_body, _l);
        this.cheeks.setMatrixAt(i * 2 + side, _m);
        this.cheeks.setColorAt(i * 2 + side, isBlue ? COLORS.cheekBlue : COLORS.cheekRed);
      }
      _l.compose(_v2.set(0, MOUTH_Y, MOUTH_Z), Q_SMILE, _s.set(0.042 * mouthW, 0.042 * mouthOpen, 0.042));
      _m.multiplyMatrices(_body, _l);
      this.mouths.setMatrixAt(i, _m);

      const shadowS = s * 1.05 * (1 - hop * 1.5);
      _m.compose(_v.set(x, 0.014, z), Q_IDENT, _s.set(shadowS, 1, shadowS));
      this.shadows.setMatrixAt(i, _m);
    }

    for (const mesh of [this.body, this.mouths, this.shadows]) {
      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (const mesh of [this.eyes, this.shines, this.cheeks]) {
      mesh.count = count * 2;
      mesh.instanceMatrix.needsUpdate = true;
    }
    if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true;
    if (this.cheeks.instanceColor) this.cheeks.instanceColor.needsUpdate = true;

    this.renderTrees(sim, realDt, now);
    this.updateSelection(sim, now);
    this.sparkles.update(realDt);
    this.bits.update(realDt);

    if (this.vis.size > count + 64) {
      for (const [id, v] of this.vis) if (now - v.seen > 1) this.vis.delete(id);
    }
    if (this.hoverDirty) {
      this.hoverDirty = false;
      this.updateHover();
    }
    this.controls.update(realDt);
    this.renderer.render(this.scene, this.camera);
  }

  private lookTarget(b: Blob, sim: Simulation): { x: number; z: number } | null {
    if (b.action === "chase" || b.action === "hug" || b.action === "hugged") {
      const id = b.action === "chase" ? b.targetBlob : b.partner;
      return sim.byId.get(id) ?? null;
    }
    if (b.action === "seek" || b.action === "eat") return sim.trees[b.targetTree] ?? null;
    if (b.action === "wait") return sim.trees[b.homeTree] ?? null;
    return null;
  }

  private visFor(b: Blob, now: number, simTime: number): Vis {
    let v = this.vis.get(b.id);
    if (!v) {
      const seed = hash01(b.id * 7919 + 13);
      const initial = b.bornAt === 0 && simTime < 0.5;
      v = {
        seed,
        born: initial ? now + seed * 0.9 : now,
        nextBlink: now + seed * 3,
        blinkAt: -10,
        roll: 0,
        pitch: 0,
        bounce: seed * 10,
        glow: 0,
        lastHug: -99,
        lastEat: -99,
        prevYaw: Math.PI / 2 - b.heading,
        size: (b.group === "blue" ? 1 : RED_SCALE) * 0.9,
        crumbAt: 0,
        hue: (hash01(b.id * 31 + 7) - 0.5) * 0.035,
        light: (hash01(b.id * 17 + 3) - 0.5) * 0.06,
        mouth: new THREE.Vector3(b.x, 0.3, b.z),
        pos: new THREE.Vector3(b.x, 0.4, b.z),
        seen: now,
      };
      this.vis.set(b.id, v);
    }
    return v;
  }

  private renderTrees(sim: Simulation, realDt: number, now: number) {
    const canopies = this.canopies;
    const fruit = this.fruit;
    const leaves = this.leaves;
    if (!canopies || !fruit || !leaves) return;
    const limit = Math.round(sim.p.fruitLimit);
    const young = COLORS.fruitYoung;
    const ripe = COLORS.fruitRipe;
    for (let i = 0; i < sim.trees.length; i++) {
      const t = sim.trees[i];
      const w = this.treeWobble[i];
      if (t.lastEaten !== w.seen) {
        w.seen = t.lastEaten;
        w.at = now;
        const a = hash01(t.seed + Math.floor(now * 10)) * Math.PI * 2;
        w.ax = Math.cos(a);
        w.az = Math.sin(a);
      }
      const wt = now - w.at;
      const wobble = wt < 1.5 ? Math.sin(wt * 20) * 0.09 * Math.exp(-wt * 4) : 0;
      const sway = Math.sin(now * 1.2 + t.seed) * 0.018;
      const rc = t.canopy * 0.8;
      const cy = t.height + rc * 0.55;
      _e.set(wobble * w.ax + sway, hash01(t.seed) * 6.28, wobble * w.az + sway * 0.6, "YXZ");
      _q.setFromEuler(_e);
      _body.compose(_v.set(t.x, cy, t.z), _q, _s.set(1, 1, 1));

      _l.compose(_v2.set(0, 0, 0), Q_IDENT, _s.set(rc, rc * 0.92, rc));
      canopies.setMatrixAt(i * 3, _m.multiplyMatrices(_body, _l));
      _l.compose(_v2.set(rc * 0.18, rc * 0.62, -rc * 0.1), Q_IDENT, _s.set(rc * 0.66, rc * 0.6, rc * 0.66));
      canopies.setMatrixAt(i * 3 + 1, _m.multiplyMatrices(_body, _l));
      _l.compose(_v2.set(-rc * 0.42, rc * 0.28, rc * 0.3), Q_IDENT, _s.set(rc * 0.55, rc * 0.5, rc * 0.55));
      canopies.setMatrixAt(i * 3 + 2, _m.multiplyMatrices(_body, _l));

      for (let s = 0; s < MAX_SLOTS; s++) {
        const k = i * MAX_SLOTS + s;
        const slot = t.slots[s];
        const elev = -0.3 + slot.lift * 0.95;
        const worldAngle = slot.angle;
        const dirX = Math.cos(elev) * Math.cos(worldAngle);
        const dirY = Math.sin(elev);
        const dirZ = Math.cos(elev) * Math.sin(worldAngle);
        const hang = rc * 1.04;
        _v.set(t.x + dirX * hang, cy + dirY * hang * 0.92, t.z + dirZ * hang);
        if (wobble !== 0 || sway !== 0) {
          _v.x += (wobble * w.ax + sway) * dirY * hang * 0.5;
          _v.z += (wobble * w.az) * dirY * hang * 0.5;
        }

        let target = 0;
        let colorT = 1;
        if (s < limit || slot.state === "eaten") {
          if (slot.state === "ripe") target = 1;
          else if (slot.state === "growing") {
            target = 0.22 + 0.78 * slot.growth;
            colorT = slot.growth * slot.growth;
          } else if (slot.state === "eaten") target = 1;
        }
        let sc = this.fruitScale[k];
        sc += (target - sc) * Math.min(1, realDt * 5);
        this.fruitScale[k] = sc;

        if (slot.state === "eaten") {
          const eater = sim.byId.get(slot.eater);
          const ev = eater ? this.vis.get(eater.id) : undefined;
          if (eater && ev && eater.action === "eat" && eater.actionDur > 0) {
            const pr = clamp(1 - eater.actionTime / eater.actionDur, 0, 1);
            const fly = clamp(pr / 0.3, 0, 1);
            const ease = fly * fly * (3 - 2 * fly);
            _v.lerp(ev.mouth, ease);
            _v.y += Math.sin(fly * Math.PI) * 0.25;
            sc = pr < 0.3 ? 1 : Math.max(0, 1 - (pr - 0.3) / 0.7) * 0.85;
            this.fruitScale[k] = sc;
          }
        }

        const r = FRUIT_R * sc;
        _m.compose(_v, Q_IDENT, _s.set(r, r * 1.08, r));
        fruit.setMatrixAt(k, _m);
        fruit.setColorAt(k, _c.copy(young).lerp(ripe, colorT));
        _q2.setFromEuler(_e.set(0.5, worldAngle, 0.3));
        _m.compose(_v2.set(_v.x, _v.y + r * 0.95, _v.z), _q2, _s.set(r * 0.55, r * 0.14, r * 0.3));
        leaves.setMatrixAt(k, _m);
      }
    }
    canopies.instanceMatrix.needsUpdate = true;
    fruit.instanceMatrix.needsUpdate = true;
    if (fruit.instanceColor) fruit.instanceColor.needsUpdate = true;
    leaves.instanceMatrix.needsUpdate = true;
  }

  private updateSelection(sim: Simulation, now: number) {
    const sel = this.selectedId !== null ? sim.byId.get(this.selectedId) : undefined;
    const selVis = sel ? this.vis.get(sel.id) : undefined;
    const show = !!(sel && selVis);
    this.selRing.visible = show;
    this.marker.visible = show;
    this.senseRing.visible = show && this.settings.showSense;
    this.fearRing.visible = show && this.settings.showSense && sel?.group === "blue";
    this.targetLine.visible = false;

    if (sel && selVis) {
      const color = sel.group === "blue" ? 0x4d97ff : 0xff5a6a;
      (this.selRing.material as THREE.MeshBasicMaterial).color.setHex(color);
      const pulse = 1 + Math.sin(now * 5) * 0.06;
      this.selRing.position.set(selVis.pos.x, 0.03, selVis.pos.z);
      this.selRing.scale.setScalar(selVis.size * pulse);
      this.marker.position.set(selVis.pos.x, selVis.pos.y + 0.75 + Math.sin(now * 3) * 0.08, selVis.pos.z);
      this.marker.rotation.y = now * 2;
      const vision = sim.visionOf(sel);
      this.senseRing.position.set(selVis.pos.x, 0.035, selVis.pos.z);
      this.senseRing.scale.setScalar(vision);
      (this.senseRing.material as THREE.MeshBasicMaterial).color.setHex(sel.group === "blue" ? 0xbfe0ff : 0xffd0d6);
      this.fearRing.position.set(selVis.pos.x, 0.036, selVis.pos.z);
      this.fearRing.scale.setScalar(vision * ECO.fearFraction);

      const target = this.lookTarget(sel, sim);
      if (target && sel.action !== "fade") {
        const tv = "id" in target ? this.vis.get((target as Blob).id)?.pos : undefined;
        const tx = tv ? tv.x : target.x;
        const tz = tv ? tv.z : target.z;
        const pos = this.targetLine.geometry.attributes.position as THREE.BufferAttribute;
        pos.setXYZ(0, selVis.pos.x, 0.09, selVis.pos.z);
        pos.setXYZ(1, tx, 0.09, tz);
        pos.needsUpdate = true;
        this.targetLine.computeLineDistances();
        (this.targetLine.material as THREE.LineDashedMaterial).color.setHex(sel.group === "blue" ? 0xe6ffb0 : 0xffffff);
        this.targetLine.visible = true;
      }

      if (this.settings.follow) {
        const tgt = this.controls.target;
        _v.set(selVis.pos.x, 0, selVis.pos.z).sub(tgt).multiplyScalar(0.08);
        tgt.add(_v);
        this.camera.position.add(_v);
      }
    }

    const hov = this.hoverId !== null && this.hoverId !== this.selectedId ? this.vis.get(this.hoverId) : undefined;
    const hovBlob = this.hoverId !== null ? sim.byId.get(this.hoverId) : undefined;
    this.hoverRing.visible = !!(hov && hovBlob);
    if (hov && hovBlob) {
      (this.hoverRing.material as THREE.MeshBasicMaterial).color.setHex(hovBlob.group === "blue" ? 0xa8ceff : 0xffb0b8);
      this.hoverRing.position.set(hov.pos.x, 0.03, hov.pos.z);
      this.hoverRing.scale.setScalar(hov.size);
    }
  }

  // ---------------------------------------------------------------- events → particles

  handleEvents(events: SimEvent[]) {
    const max = 70;
    const list = events.length > max ? events.slice(events.length - max) : events;
    for (const ev of list) {
      switch (ev.type) {
        case "eat": {
          const v = this.vis.get(ev.blob);
          const y = v ? v.pos.y + 0.2 : 0.6;
          for (let i = 0; i < 4; i++) {
            this.sparkles.emit({
              x: ev.x + (Math.random() - 0.5) * 0.5,
              y: y + Math.random() * 0.3,
              z: ev.z + (Math.random() - 0.5) * 0.5,
              vy: 0.6 + Math.random() * 0.4,
              drag: 1.5,
              life: 0.8,
              size: 0.2,
              color: "#f6ff9a",
              shape: Shape.Star,
            });
          }
          this.sparkles.emit({ x: ev.x, y: 0.35, z: ev.z, life: 0.55, size: 1.1, grow: 1.2, color: "#b8ff6a", shape: Shape.Ring });
          break;
        }
        case "hugStart": {
          for (let i = 0; i < 2; i++) {
            this.bits.emit({
              x: ev.x + (Math.random() - 0.5) * 0.3,
              y: 1.0,
              z: ev.z + (Math.random() - 0.5) * 0.3,
              vy: 0.7,
              vx: (Math.random() - 0.5) * 0.3,
              drag: 0.8,
              life: 1.1,
              size: 0.26,
              color: "#ff7fa6",
              shape: Shape.Heart,
            });
          }
          break;
        }
        case "hug": {
          const from = { x: ev.bx, y: 0.45, z: ev.bz };
          const to = { x: ev.x, y: 0.5, z: ev.z };
          const n = Math.max(4, Math.min(14, Math.round(ev.amount / 3)));
          for (let i = 0; i < n; i++) {
            this.sparkles.stream(
              { x: from.x + (Math.random() - 0.5) * 0.35, y: from.y + Math.random() * 0.3, z: from.z + (Math.random() - 0.5) * 0.35 },
              to,
              0.45 + i * 0.035,
              0.17,
              i % 3 === 0 ? "#ffffff" : "#6fb2ff",
            );
          }
          this.sparkles.emit({ x: ev.x, y: 0.4, z: ev.z, life: 0.7, size: 1.3, grow: 1.4, color: "#ff8f9c", shape: Shape.Ring });
          break;
        }
        case "birth": {
          const col = ev.group === "blue" ? "#8cc2ff" : "#ff9aa6";
          for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            this.bits.emit({
              x: ev.x,
              y: 0.25,
              z: ev.z,
              vx: Math.cos(a) * 1.4,
              vy: 0.9 + Math.random() * 0.5,
              vz: Math.sin(a) * 1.4,
              gravity: 3,
              drag: 2.2,
              life: 0.75,
              size: 0.12,
              color: col,
            });
          }
          for (let i = 0; i < 3; i++) {
            this.sparkles.emit({
              x: ev.x + (Math.random() - 0.5) * 0.4,
              y: 0.8 + Math.random() * 0.3,
              z: ev.z + (Math.random() - 0.5) * 0.4,
              vy: 0.4,
              life: 0.9,
              size: 0.22,
              color: "#fff3b0",
              shape: Shape.Star,
            });
          }
          break;
        }
        case "fade": {
          const hug = ev.cause === "hug";
          for (let i = 0; i < 9; i++) {
            this.bits.emit({
              x: ev.x + (Math.random() - 0.5) * 0.5,
              y: 0.2 + Math.random() * 0.4,
              z: ev.z + (Math.random() - 0.5) * 0.5,
              vx: (Math.random() - 0.5) * 0.3,
              vy: 0.5 + Math.random() * 0.6,
              vz: (Math.random() - 0.5) * 0.3,
              drag: 0.6,
              life: 1.3 + Math.random() * 0.5,
              size: 0.12 + Math.random() * 0.12,
              grow: 0.8,
              color: hug ? "#cfe6ff" : ev.group === "blue" ? "#d7dbe6" : "#ead6d9",
              shape: hug ? Shape.Ring : Shape.Dot,
            });
          }
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- picking

  private setPointer(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  }

  private pick(): number | null {
    const sim = this.sim;
    if (!sim) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    this.body.computeBoundingSphere();
    const hits = this.raycaster.intersectObject(this.body, false);
    for (const h of hits) {
      if (h.instanceId !== undefined && h.instanceId < this.body.count) return this.indexToId[h.instanceId];
    }
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.35);
    const hit = this.raycaster.ray.intersectPlane(plane, new THREE.Vector3());
    if (!hit) return null;
    let best: number | null = null;
    let bestD = 0.85;
    for (const [id, v] of this.vis) {
      const b = sim.byId.get(id);
      if (!b || b.action === "fade") continue;
      const d = Math.hypot(v.pos.x - hit.x, v.pos.z - hit.z);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    return best;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onPointerUp = (e: PointerEvent) => {
    const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
    if (moved > 6 || performance.now() - this.downAt.t > 600) return;
    this.setPointer(e);
    const id = this.pick();
    this.selectedId = id;
    this.onPick(id);
  };

  private onPointerMove = (e: PointerEvent) => {
    this.lastPointer = { x: e.clientX, y: e.clientY, inside: true };
    if (e.buttons === 0) this.hoverDirty = true;
  };

  private onPointerLeave = () => {
    this.lastPointer.inside = false;
    this.hoverId = null;
    this.renderer.domElement.style.cursor = "";
  };

  private updateHover() {
    if (!this.lastPointer.inside) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(
      ((this.lastPointer.x - rect.left) / rect.width) * 2 - 1,
      -((this.lastPointer.y - rect.top) / rect.height) * 2 + 1,
    );
    this.hoverId = this.pick();
    this.renderer.domElement.style.cursor = this.hoverId !== null ? "pointer" : "grab";
  }

  // ---------------------------------------------------------------- housekeeping

  resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const scale = h * this.renderer.getPixelRatio() * (0.5 / Math.tan((this.camera.fov * Math.PI) / 360));
    this.sparkles.setScale(scale / 0.9);
    this.bits.setScale(scale / 0.9);
  }

  dispose() {
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerleave", this.onPointerLeave);
    for (const d of this.worldDisposables) d.dispose();
    this.sparkles.dispose();
    this.bits.dispose();
    this.controls.dispose();
    this.renderer.dispose();
    el.remove();
  }
}
