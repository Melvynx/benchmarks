import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  BLUE,
  FLEE_FRACTION,
  MAX_SLOTS,
  SLOT_EAT,
  SLOT_GROW,
  SLOT_RIPE,
  SLOT_WAIT,
  blobCopyAt,
  blobMaxSpeed,
  blobVision,
  slotAngle,
  type Action,
  type Blob,
  type Kind,
  type SimEvent,
  type Simulation,
  type Tree,
} from "../sim/simulation";
import { BODY_H, SPRITE, makeBodyGeometry, makeGrassTexture, makeSpriteAtlas, surfaceFrame } from "./shapes";

const COLORS = {
  blue: new THREE.Color("#3f88ff"),
  red: new THREE.Color("#ff5263"),
  bluePale: new THREE.Color("#b9c6de"),
  redPale: new THREE.Color("#dcb7bc"),
  blueGlow: new THREE.Color("#a8d4ff"),
  redGlow: new THREE.Color("#ffc2a8"),
  cheekBlue: new THREE.Color("#ff9fc0"),
  cheekRed: new THREE.Color("#ffd0d6"),
  fruitRipe: new THREE.Color("#b5f23a"),
  fruitYoung: new THREE.Color("#5e9e3a"),
  fruitBud: new THREE.Color("#7fb55a"),
};

const CANOPY_TINTS = ["#3c9d5d", "#2f8f55", "#47a865", "#3a9470", "#4aa35a"].map((c) => new THREE.Color(c));
const CANOPY_Y = 1.75;
/** Blobs are drawn larger than their simulated footprint so faces read at garden scale. */
const BLOB_SCALE = 1.45;
const MIN_DPR = 0.75;
const CANOPY_RX = 1.18;
const CANOPY_RY = 0.86;

interface Visual {
  heading: number;
  hop: number;
  hopAmp: number;
  brow: number;
  eyeWide: number;
  blinkAt: number;
  blinkT: number;
  lastX: number;
  lastZ: number;
  lastAction: Action;
  x: number;
  y: number;
  z: number;
  scale: number;
  seen: number;
}

interface Ghost {
  x: number;
  z: number;
  heading: number;
  kind: Kind;
  t0: number;
  type: "fade" | "poof";
  scale: number;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  grow: number;
  r: number;
  g: number;
  b: number;
  shape: number;
  gravity: number;
  drag: number;
}

interface Pulse {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  life: number;
  max: number;
  size: number;
}

export interface SceneHooks {
  onPick: (id: number | null) => void;
}

export interface FrameInput {
  sim: Simulation;
  alpha: number;
  dt: number;
  events: SimEvent[];
  selectedId: number | null;
  follow: boolean;
  speed: number;
}

const tmpM = new THREE.Matrix4();
const tmpM2 = new THREE.Matrix4();
const bodyM = new THREE.Matrix4();
const localM = new THREE.Matrix4();
const WHITE = new THREE.Color("#ffffff");
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler(0, 0, 0, "YXZ");
const tmpV = new THREE.Vector3();
const tmpS = new THREE.Vector3();
const tmpC = new THREE.Color();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

function damp(a: number, b: number, k: number, dt: number): number {
  return b + (a - b) * Math.exp(-k * dt);
}

function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function elasticOut(t: number): number {
  if (t >= 1) return 1;
  return Math.pow(2, -10 * t) * Math.sin(((t - 0.075) * (2 * Math.PI)) / 0.3) + 1;
}

class Instances {
  mesh: THREE.InstancedMesh;
  count = 0;

  constructor(
    private readonly scene: THREE.Object3D,
    private readonly geometry: THREE.BufferGeometry,
    private readonly material: THREE.Material,
    capacity: number,
    private readonly shadows: { cast?: boolean; receive?: boolean } = {},
    private readonly colored = false,
  ) {
    this.mesh = this.create(capacity);
  }

  private create(capacity: number): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(this.geometry, this.material, capacity);
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    m.castShadow = !!this.shadows.cast;
    m.receiveShadow = !!this.shadows.receive;
    m.frustumCulled = false;
    if (this.colored) {
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
      m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    m.count = 0;
    this.scene.add(m);
    return m;
  }

  begin(needed: number): void {
    if (needed > this.mesh.instanceMatrix.count) {
      this.scene.remove(this.mesh);
      this.mesh.dispose();
      this.mesh = this.create(Math.ceil(needed * 1.5));
    }
    this.count = 0;
  }

  push(m: THREE.Matrix4, color?: THREE.Color): number {
    const i = this.count++;
    this.mesh.setMatrixAt(i, m);
    if (color && this.mesh.instanceColor) this.mesh.setColorAt(i, color);
    return i;
  }

  end(): void {
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.dispose();
  }
}

export class GardenScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private readonly scene = new THREE.Scene();
  private readonly world = new THREE.Group();
  private readonly sun: THREE.DirectionalLight;
  private readonly container: HTMLElement;
  private readonly hooks: SceneHooks;
  private readonly resizeObserver: ResizeObserver;

  private bodies: Instances;
  private eyes: Instances;
  private glints: Instances;
  private cheeks: Instances;
  private mouths: Instances;
  private brows: Instances;
  private trunks!: Instances;
  private canopies!: Instances;
  private fruits!: Instances;
  private decor: THREE.Object3D[] = [];

  private readonly features: {
    eyeL: THREE.Matrix4;
    eyeR: THREE.Matrix4;
    cheekL: THREE.Matrix4;
    cheekR: THREE.Matrix4;
    mouth: THREE.Matrix4;
    browL: THREE.Matrix4;
    browR: THREE.Matrix4;
  };

  private readonly visuals = new Map<number, Visual>();
  private ghosts: Ghost[] = [];
  private readonly particles: Particle[] = [];
  private readonly maxParticles = 1800;
  private readonly points: THREE.Points;
  private readonly pAttr: {
    pos: THREE.BufferAttribute;
    col: THREE.BufferAttribute;
    size: THREE.BufferAttribute;
    alpha: THREE.BufferAttribute;
    shape: THREE.BufferAttribute;
  };
  private readonly pulses: Pulse[] = [];

  private readonly selRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly hoverRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly visionRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly fleeRing: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  private readonly targetLine: THREE.Line<THREE.BufferGeometry, THREE.LineDashedMaterial>;

  private fruitLocal: Float32Array = new Float32Array(0);
  private radius = 20;
  private time = 0;
  private frameNo = 0;
  private userMoved = false;
  private readonly maxDpr = Math.min(window.devicePixelRatio || 1, 2);
  private frameMs = 16;
  private qualityCheckAt = 2;
  private sim: Simulation | null = null;
  private hoverId: number | null = null;
  private pointer = { x: 0, y: 0, downX: 0, downY: 0, down: false, inside: false, moved: false };
  private lastFollowId: number | null = null;

  constructor(container: HTMLElement, hooks: SceneHooks) {
    this.container = container;
    this.hooks = hooks;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(this.maxDpr);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = "block";
    this.renderer.domElement.style.touchAction = "none";

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.3, 500);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.6;
    this.controls.zoomSpeed = 0.8;
    this.controls.minPolarAngle = 0.12;
    this.controls.maxPolarAngle = 1.28;
    this.controls.addEventListener("start", () => (this.userMoved = true));

    this.scene.add(new THREE.HemisphereLight(0xfff4e2, 0x8fb39a, 1.15));
    this.sun = new THREE.DirectionalLight(0xfff1dc, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(this.world);

    const bodyMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.26,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      sheen: 0.4,
      sheenColor: new THREE.Color("#ffffff"),
    });
    const eyeMat = new THREE.MeshStandardMaterial({ color: "#1c1a2b", roughness: 0.12 });
    const glintMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
    const cheekMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const mouthMat = new THREE.MeshStandardMaterial({ color: "#3b2232", roughness: 0.5 });

    this.bodies = new Instances(this.scene, makeBodyGeometry(), bodyMat, 512, { cast: true }, true);
    this.eyes = new Instances(this.scene, new THREE.SphereGeometry(1, 10, 7), eyeMat, 1024);
    this.glints = new Instances(this.scene, new THREE.SphereGeometry(1, 6, 4), glintMat, 1024);
    this.cheeks = new Instances(this.scene, new THREE.SphereGeometry(1, 8, 6), cheekMat, 1024, {}, true);
    this.mouths = new Instances(
      this.scene,
      new THREE.TorusGeometry(0.05, 0.013, 4, 10, Math.PI).rotateZ(Math.PI),
      mouthMat,
      512,
    );
    this.brows = new Instances(this.scene, new THREE.CapsuleGeometry(0.014, 0.07, 3, 8), mouthMat, 1024);

    this.features = {
      eyeL: surfaceFrame(new THREE.Vector3(-0.34, 0.32, 0.88)),
      eyeR: surfaceFrame(new THREE.Vector3(0.34, 0.32, 0.88)),
      cheekL: surfaceFrame(new THREE.Vector3(-0.62, 0.06, 0.78)),
      cheekR: surfaceFrame(new THREE.Vector3(0.62, 0.06, 0.78)),
      mouth: surfaceFrame(new THREE.Vector3(0, 0.08, 1), 0.006),
      browL: surfaceFrame(new THREE.Vector3(-0.33, 0.62, 0.72), 0.01),
      browR: surfaceFrame(new THREE.Vector3(0.33, 0.62, 0.72), 0.01),
    };

    const pGeo = new THREE.BufferGeometry();
    const n = this.maxParticles;
    this.pAttr = {
      pos: new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage),
      col: new THREE.BufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage),
      size: new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage),
      alpha: new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage),
      shape: new THREE.BufferAttribute(new Float32Array(n), 1).setUsage(THREE.DynamicDrawUsage),
    };
    pGeo.setAttribute("position", this.pAttr.pos);
    pGeo.setAttribute("pcolor", this.pAttr.col);
    pGeo.setAttribute("psize", this.pAttr.size);
    pGeo.setAttribute("palpha", this.pAttr.alpha);
    pGeo.setAttribute("pshape", this.pAttr.shape);
    const pMat = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: makeSpriteAtlas() }, projScale: { value: 600 } },
      vertexShader: /* glsl */ `
        attribute vec3 pcolor; attribute float psize; attribute float palpha; attribute float pshape;
        uniform float projScale;
        varying vec3 vColor; varying float vAlpha; varying float vShape;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = psize * projScale / -mv.z;
          vColor = pcolor; vAlpha = palpha; vShape = pshape;
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D atlas;
        varying vec3 vColor; varying float vAlpha; varying float vShape;
        void main() {
          vec2 uv = vec2(gl_PointCoord.x, 1.0 - gl_PointCoord.y);
          vec2 cell = vec2(mod(vShape, 4.0), 1.0 - floor(vShape / 4.0));
          vec4 t = texture2D(atlas, (uv + cell) * vec2(0.25, 0.5));
          float a = t.a * vAlpha;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vColor * t.rgb, a);
          #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(pGeo, pMat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 10;
    this.scene.add(this.points);

    const ringMat = (color: string, opacity: number) =>
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide });
    this.selRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.54, 48).rotateX(-Math.PI / 2), ringMat("#ffcf4a", 0.95));
    this.hoverRing = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 48).rotateX(-Math.PI / 2), ringMat("#ffffff", 0.7));
    this.visionRing = new THREE.Mesh(new THREE.RingGeometry(0.985, 1, 128).rotateX(-Math.PI / 2), ringMat("#ffffff", 0.55));
    this.fleeRing = new THREE.Mesh(new THREE.RingGeometry(0.975, 1, 96).rotateX(-Math.PI / 2), ringMat("#ffffff", 0.3));
    for (const r of [this.selRing, this.hoverRing, this.visionRing, this.fleeRing]) {
      r.renderOrder = 5;
      r.visible = false;
      this.scene.add(r);
    }
    this.targetLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineDashedMaterial({ color: "#ffffff", dashSize: 0.25, gapSize: 0.18, transparent: true, opacity: 0.85 }),
    );
    this.targetLine.visible = false;
    this.targetLine.frustumCulled = false;
    this.scene.add(this.targetLine);

    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 40).rotateX(-Math.PI / 2), ringMat("#ffffff", 0));
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.scene.add(mesh);
      this.pulses.push({ mesh, life: 0, max: 1, size: 1 });
    }

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointermove", this.onPointerMove);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointerleave", this.onPointerLeave);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  // ---------------------------------------------------------------- world building

  setWorld(sim: Simulation): void {
    this.sim = sim;
    this.visuals.clear();
    this.ghosts = [];
    this.particles.length = 0;
    for (const p of this.pulses) {
      p.life = 0;
      p.mesh.visible = false;
    }
    for (const o of this.decor) {
      this.world.remove(o);
      o.traverse((c) => {
        if (c instanceof THREE.Mesh) {
          c.geometry.dispose();
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          for (const m of mats) {
            (m as THREE.MeshStandardMaterial).map?.dispose();
            m.dispose();
          }
        }
      });
    }
    this.decor = [];
    this.trunks?.dispose();
    this.canopies?.dispose();
    this.fruits?.dispose();

    const R = sim.radius;
    const radiusChanged = R !== this.radius;
    this.radius = R;
    this.buildDish(R, sim.startParams.seed);
    this.buildTrees(sim.trees);

    const s = this.sun.shadow.camera;
    s.left = s.bottom = -(R + 3);
    s.right = s.top = R + 3;
    s.near = 1;
    s.far = R * 6;
    s.updateProjectionMatrix();
    this.sun.position.set(R * 0.7, R * 1.9, R * 0.9);

    this.controls.minDistance = 6;
    this.controls.maxDistance = R * 4.2;
    if (radiusChanged || this.frameNo === 0) this.frameCamera();
  }

  /** Pull back until the whole rim and the tree tops fit the current viewport. */
  frameCamera(): void {
    const R = this.radius + 1.3;
    const aspect = this.camera.aspect || 1.6;
    const polar = aspect < 1 ? 0.8 : 0.98;
    const az = 0.55;
    const dir = tmpV.set(Math.sin(polar) * Math.sin(az), Math.cos(polar), Math.sin(polar) * Math.cos(az)).clone();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * R, -1.3, Math.sin(a) * R));
      pts.push(new THREE.Vector3(Math.cos(a) * (R - 2.5), 3, Math.sin(a) * (R - 2.5)));
    }
    const mx = aspect < 1 ? 0.97 : 0.93;
    const my = 0.84;
    const cam = this.camera;
    const fits = (d: number) => {
      cam.position.copy(dir).multiplyScalar(d);
      cam.lookAt(0, 0, 0);
      cam.updateMatrixWorld();
      return pts.every((p) => {
        const q = tmpV.copy(p).project(cam);
        return Math.abs(q.x) <= mx && q.y <= my && q.y >= -0.92;
      });
    };
    let lo = R;
    let hi = R * 10;
    for (let k = 0; k < 22; k++) {
      const mid = (lo + hi) / 2;
      if (fits(mid)) hi = mid;
      else lo = mid;
    }
    fits(hi);
    this.controls.target.set(0, 0, 0);
    this.controls.maxDistance = Math.max(this.controls.maxDistance, hi * 1.4);
    this.controls.update();
    this.userMoved = false;
  }

  private addDecor(o: THREE.Object3D): void {
    this.decor.push(o);
    this.world.add(o);
  }

  private buildDish(R: number, seed: number): void {
    const grassTex = makeGrassTexture(seed);
    const top = new THREE.Mesh(
      new THREE.CircleGeometry(R + 0.05, 160).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95 }),
    );
    top.receiveShadow = true;
    this.addDecor(top);

    const profile = [
      [R - 0.02, -0.05],
      [R + 0.12, 0.1],
      [R + 0.36, 0.26],
      [R + 0.62, 0.3],
      [R + 0.86, 0.2],
      [R + 0.98, -0.05],
      [R + 0.98, -0.75],
      [R + 0.86, -1.05],
      [R + 0.55, -1.22],
      [0, -1.22],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const rim = new THREE.Mesh(
      new THREE.LatheGeometry(profile, 160),
      new THREE.MeshPhysicalMaterial({ color: "#f0b48f", roughness: 0.45, clearcoat: 0.6, clearcoatRoughness: 0.35 }),
    );
    rim.castShadow = true;
    rim.receiveShadow = true;
    this.addDecor(rim);

    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.99, R + 0.99, 0.12, 160, 1, true),
      new THREE.MeshStandardMaterial({ color: "#fbe6d3", roughness: 0.6 }),
    );
    band.position.y = -0.45;
    this.addDecor(band);

    const shadowTex = (() => {
      const c = document.createElement("canvas");
      c.width = c.height = 256;
      const g = c.getContext("2d")!;
      const grd = g.createRadialGradient(128, 128, 60, 128, 128, 128);
      grd.addColorStop(0, "rgba(70,45,30,0.38)");
      grd.addColorStop(0.7, "rgba(70,45,30,0.16)");
      grd.addColorStop(1, "rgba(70,45,30,0)");
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 256);
      return new THREE.CanvasTexture(c);
    })();
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry((R + 1) * 2.9, (R + 1) * 2.9).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
    );
    contact.position.set(R * 0.12, -1.24, R * 0.1);
    this.addDecor(contact);

    let s = (seed * 7919) >>> 0 || 7;
    const rnd = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
    const sim = this.sim!;
    const clear = (x: number, z: number, r: number) => sim.trees.every((t) => (t.x - x) ** 2 + (t.z - z) ** 2 > r * r);

    const tuftCount = Math.round(R * R * 0.55);
    const tufts = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.06, 0.26, 5).translate(0, 0.13, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }),
      tuftCount,
    );
    const tuftTints = ["#6fb44f", "#7cc25a", "#5ea546", "#8bcb63"].map((c) => new THREE.Color(c));
    for (let i = 0; i < tuftCount; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * (R - 0.4);
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (!clear(x, z, 0.5)) {
        tufts.setMatrixAt(i, ZERO);
        continue;
      }
      tmpE.set((rnd() - 0.5) * 0.5, rnd() * Math.PI, (rnd() - 0.5) * 0.5);
      tmpQ.setFromEuler(tmpE);
      const sc = 0.6 + rnd() * 0.9;
      tmpM.compose(tmpV.set(x, 0, z), tmpQ, tmpS.set(sc, sc * (0.8 + rnd() * 0.6), sc));
      tufts.setMatrixAt(i, tmpM);
      tufts.setColorAt(i, tuftTints[Math.floor(rnd() * tuftTints.length)]);
    }
    tufts.receiveShadow = true;
    this.addDecor(tufts);

    const flowerCount = Math.round(R * R * 0.09);
    const flowers = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.075, 8, 6).scale(1, 0.6, 1).translate(0, 0.1, 0),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }),
      flowerCount,
    );
    const petals = ["#ffffff", "#ffe066", "#ffadc6", "#c4b5ff", "#ffffff"].map((c) => new THREE.Color(c));
    for (let i = 0; i < flowerCount; i++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * (R - 0.5);
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      if (!clear(x, z, 0.7)) {
        flowers.setMatrixAt(i, ZERO);
        continue;
      }
      tmpM.makeTranslation(x, 0, z);
      flowers.setMatrixAt(i, tmpM);
      flowers.setColorAt(i, petals[Math.floor(rnd() * petals.length)]);
    }
    this.addDecor(flowers);

    const pebbleCount = Math.round(R * 1.6);
    const pebbles = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.16, 1),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }),
      pebbleCount,
    );
    const stones = ["#d9d2c7", "#c9c0b3", "#e8e1d6", "#bfb5a8"].map((c) => new THREE.Color(c));
    for (let i = 0; i < pebbleCount; i++) {
      const a = rnd() * Math.PI * 2;
      const r = R - 0.35 - rnd() * 1.4;
      tmpE.set(0, rnd() * Math.PI, 0);
      tmpQ.setFromEuler(tmpE);
      const sc = 0.5 + rnd() * 0.9;
      tmpM.compose(tmpV.set(Math.sin(a) * r, 0.02, Math.cos(a) * r), tmpQ, tmpS.set(sc * 1.3, sc * 0.55, sc));
      pebbles.setMatrixAt(i, tmpM);
      pebbles.setColorAt(i, stones[Math.floor(rnd() * stones.length)]);
    }
    pebbles.castShadow = true;
    pebbles.receiveShadow = true;
    this.addDecor(pebbles);
  }

  private buildTrees(trees: Tree[]): void {
    const n = Math.max(1, trees.length);
    this.trunks = new Instances(
      this.world,
      new THREE.CylinderGeometry(0.13, 0.2, 1, 9).translate(0, 0.5, 0),
      new THREE.MeshStandardMaterial({ color: "#8d5b3c", roughness: 0.85 }),
      n,
      { cast: true, receive: true },
    );
    this.canopies = new Instances(
      this.world,
      new THREE.IcosahedronGeometry(1, 3),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62 }),
      n * 3,
      { cast: true, receive: true },
      true,
    );
    this.fruits = new Instances(
      this.world,
      new THREE.SphereGeometry(0.12, 10, 7),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.15 }),
      n * MAX_SLOTS,
      { cast: true },
      true,
    );
    this.fruitLocal = new Float32Array(n * MAX_SLOTS * 3);
    trees.forEach((t, ti) => {
      for (let i = 0; i < MAX_SLOTS; i++) {
        const a = slotAngle(t, i);
        const f = (i * 0.381966 + t.phase) % 1;
        const e = -0.3 + 0.85 * f;
        const o = (ti * MAX_SLOTS + i) * 3;
        this.fruitLocal[o] = Math.cos(e) * Math.sin(a) * CANOPY_RX * 1.02 * t.size;
        this.fruitLocal[o + 1] = (CANOPY_Y + Math.sin(e) * CANOPY_RY * 1.02) * t.size;
        this.fruitLocal[o + 2] = Math.cos(e) * Math.cos(a) * CANOPY_RX * 1.02 * t.size;
      }
    });
  }

  // ---------------------------------------------------------------- per frame

  frame(input: FrameInput): void {
    const { sim, dt } = input;
    this.sim = sim;
    this.time += dt;
    this.frameNo++;

    this.handleEvents(input);
    this.updateTrees(sim);
    this.updateBlobs(input);
    this.updateParticles(dt);
    this.updatePulses(dt);
    this.updateSelection(input);
    this.updatePointerHover();

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.adaptQuality(dt);
  }

  /** Trade resolution for frame rate on slow GPUs, and win it back when there is headroom. */
  private adaptQuality(dt: number): void {
    this.frameMs = this.frameMs * 0.92 + Math.min(200, dt * 1000) * 0.08;
    if (this.time < this.qualityCheckAt) return;
    this.qualityCheckAt = this.time + 1.5;
    const cur = this.renderer.getPixelRatio();
    let next = cur;
    if (this.frameMs > 26 && cur > MIN_DPR) next = Math.max(MIN_DPR, cur * 0.8);
    else if (this.frameMs < 18.5 && cur < this.maxDpr) next = Math.min(this.maxDpr, cur * 1.12);
    if (Math.abs(next - cur) > 0.01) {
      this.renderer.setPixelRatio(next);
      this.resize();
    }
  }

  private sway(t: Tree): [number, number] {
    const w = this.time * 1.1 + t.phase * 3;
    return [Math.sin(w) * 0.035, Math.cos(w * 0.8) * 0.03];
  }

  private fruitWorld(t: Tree, ti: number, slot: number, out: THREE.Vector3): THREE.Vector3 {
    const o = (ti * MAX_SLOTS + slot) * 3;
    const [sx, sz] = this.sway(t);
    const ly = this.fruitLocal[o + 1];
    return out.set(t.x + this.fruitLocal[o] + sx * ly, ly, t.z + this.fruitLocal[o + 2] + sz * ly);
  }

  private updateTrees(sim: Simulation): void {
    const trees = sim.trees;
    this.trunks.begin(trees.length);
    this.canopies.begin(trees.length * 3);
    this.fruits.begin(trees.length * MAX_SLOTS);
    const lim = sim.params.fruitLimit;

    trees.forEach((t, ti) => {
      const s = t.size;
      const [sx, sz] = this.sway(t);
      tmpM.compose(tmpV.set(t.x, 0, t.z), tmpQ.identity(), tmpS.set(s, 1.42 * s, s));
      this.trunks.push(tmpM);

      const tint = CANOPY_TINTS[t.id % CANOPY_TINTS.length];
      const cy = CANOPY_Y * s;
      tmpM.compose(
        tmpV.set(t.x + sx * cy, cy, t.z + sz * cy),
        tmpQ.identity(),
        tmpS.set(CANOPY_RX * s, CANOPY_RY * s, CANOPY_RX * s),
      );
      this.canopies.push(tmpM, tint);
      for (let k = 0; k < 2; k++) {
        const a = t.phase + k * 2.6;
        const r = (k === 0 ? 0.62 : 0.55) * s;
        const y = (k === 0 ? 1.42 : 2.15) * s;
        const sc = (k === 0 ? 0.62 : 0.55) * s;
        tmpM.compose(
          tmpV.set(t.x + Math.sin(a) * r + sx * y, y, t.z + Math.cos(a) * r + sz * y),
          tmpQ.identity(),
          tmpS.set(sc, sc * 0.9, sc),
        );
        tmpC.copy(tint).offsetHSL(0, 0, k === 0 ? -0.04 : 0.05);
        this.canopies.push(tmpM, tmpC);
      }

      for (let i = 0; i < MAX_SLOTS; i++) {
        const slot = t.slots[i];
        if (i >= lim && slot.state !== SLOT_EAT) {
          this.fruits.push(ZERO, COLORS.fruitBud);
          continue;
        }
        this.fruitWorld(t, ti, i, tmpV);
        let scale = 1;
        if (slot.state === SLOT_RIPE) {
          scale = 1 + 0.05 * Math.sin(this.time * 3 + i + t.phase * 5);
          tmpC.copy(COLORS.fruitRipe);
        } else if (slot.state === SLOT_GROW) {
          scale = 0.22 + 0.68 * slot.size;
          tmpC.copy(COLORS.fruitYoung).lerp(COLORS.fruitRipe, slot.size * 0.7);
        } else if (slot.state === SLOT_WAIT) {
          scale = 0.18;
          tmpC.copy(COLORS.fruitBud);
        } else {
          const eater = sim.byId.get(slot.eater);
          const vis = eater ? this.visuals.get(eater.id) : undefined;
          if (eater && vis) {
            const elapsed = eater.timerTotal - eater.timer;
            const k = smoothstep(0, 0.3, elapsed);
            const mx = vis.x + Math.sin(vis.heading) * 0.3 * vis.scale;
            const mz = vis.z + Math.cos(vis.heading) * 0.3 * vis.scale;
            const my = vis.y + 0.34 * vis.scale;
            const arc = Math.sin(k * Math.PI) * 0.35;
            tmpV.set(tmpV.x + (mx - tmpV.x) * k, tmpV.y + (my - tmpV.y) * k + arc, tmpV.z + (mz - tmpV.z) * k);
            scale = Math.max(0.05, slot.size) * (k < 1 ? 1 : 0.85);
          } else {
            scale = slot.size;
          }
          tmpC.copy(COLORS.fruitRipe);
        }
        tmpM.compose(tmpV, tmpQ.identity(), tmpS.set(scale, scale * 1.08, scale));
        this.fruits.push(tmpM, tmpC);
      }
    });
    this.trunks.end();
    this.canopies.end();
    this.fruits.end();
  }

  private newVisual(b: Blob, x: number, z: number): Visual {
    return {
      heading: b.heading,
      hop: Math.random() * Math.PI,
      hopAmp: 0,
      brow: 0,
      eyeWide: 1,
      blinkAt: this.time + Math.random() * 4,
      blinkT: -10,
      lastX: x,
      lastZ: z,
      lastAction: b.action,
      x,
      y: 0,
      z,
      scale: 1,
      seen: this.frameNo,
    };
  }

  private updateBlobs(input: FrameInput): void {
    const { sim, alpha, dt, selectedId } = input;
    const p = sim.params;
    const t = this.time;
    const total = sim.blobs.length + this.ghosts.length;
    this.bodies.begin(total);
    this.eyes.begin(total * 2);
    this.glints.begin(total * 2);
    this.cheeks.begin(total * 2);
    this.mouths.begin(total);
    this.brows.begin(total * 2);
    const emotes = input.speed <= 6;

    for (const b of sim.blobs) {
      const x = b.px + (b.x - b.px) * alpha;
      const z = b.pz + (b.z - b.pz) * alpha;
      let v = this.visuals.get(b.id);
      if (!v) {
        v = this.newVisual(b, x, z);
        this.visuals.set(b.id, v);
      }
      v.seen = this.frameNo;
      const moved = Math.hypot(x - v.lastX, z - v.lastZ);
      v.lastX = x;
      v.lastZ = z;

      if (b.action !== v.lastAction) {
        if (emotes) this.emote(b, v);
        v.lastAction = b.action;
      }

      const speed = Math.hypot(b.vx, b.vz);
      const maxV = Math.max(0.5, blobMaxSpeed(p, b));
      v.heading = lerpAngle(v.heading, b.heading, 1 - Math.exp(-dt * 12));
      const moving = speed > 0.25 && b.action !== "eat" && b.action !== "rest";
      v.hopAmp = damp(v.hopAmp, moving ? 1 : 0, 9, dt);
      v.hop += moved * 3.1;
      const sinHop = Math.abs(Math.sin(v.hop));
      let hopY = sinHop * 0.17 * v.hopAmp * (0.55 + 0.45 * Math.min(1, speed / maxV));
      const contact = 1 - sinHop;
      let sy = 1 + (0.09 * sinHop - 0.13 * contact * contact * contact) * v.hopAmp;
      let lean = moving ? Math.min(1, speed / maxV) * 0.26 : 0;
      let eyeOpen = 1;
      let eyeWide = 1;
      let mouthOpen = 0;
      let browTarget = 0;
      let glow = 0;

      switch (b.action) {
        case "eat": {
          const chew = Math.sin(t * 15 + b.id);
          sy *= 1 - 0.06 * (0.5 + 0.5 * chew);
          mouthOpen = 0.5 + 0.5 * chew;
          lean = 0.2;
          eyeOpen = 0.6 + 0.4 * (0.5 - 0.5 * chew);
          break;
        }
        case "rest": {
          const k = t * 7 + b.id;
          hopY = Math.abs(Math.sin(k)) * 0.12;
          sy *= 1 + 0.05 * Math.sin(k * 2);
          eyeOpen = 0.1;
          mouthOpen = 0.6;
          glow = 0.55 + 0.45 * Math.sin(t * 6 + b.id);
          break;
        }
        case "flee":
          eyeWide = 1.3;
          browTarget = -1;
          mouthOpen = 0.8;
          break;
        case "hunt":
          browTarget = 1;
          eyeOpen = 0.78;
          lean += 0.06;
          break;
        case "shade":
          eyeOpen = 0.5;
          sy *= 1 + 0.03 * Math.sin(t * 1.6 + b.id);
          break;
        case "tired":
          eyeOpen = 0.45;
          sy *= 0.94;
          browTarget = -0.6;
          break;
      }

      const frac = b.energy / blobCopyAt(p, b);
      if (frac < 0.22) {
        const droop = (0.22 - frac) / 0.22;
        sy *= 1 - 0.1 * droop;
        eyeOpen *= 1 - 0.45 * droop;
      }

      if (t > v.blinkAt) {
        v.blinkT = t;
        v.blinkAt = t + 1.6 + Math.random() * 4.5;
      }
      const bt = (t - v.blinkT) / 0.16;
      if (bt < 1) eyeOpen *= Math.max(0.08, Math.abs(bt * 2 - 1));

      sy *= 1 + 0.022 * Math.sin(t * 2.3 + b.id * 1.7);
      v.brow = damp(v.brow, browTarget, 10, dt);
      v.eyeWide = damp(v.eyeWide, eyeWide, 12, dt);

      const grow = 0.6 + 0.4 * smoothstep(0, 14, b.age);
      const pop = b.age < 0.5 ? Math.max(0.05, elasticOut(b.age / 0.5)) : 1;
      const s = BLOB_SCALE * grow * pop * (b.id === selectedId ? 1.08 : 1);
      hopY *= BLOB_SCALE;
      v.x = x;
      v.z = z;
      v.y = hopY;
      v.scale = s;

      const pale = b.kind === BLUE ? COLORS.bluePale : COLORS.redPale;
      tmpC.copy(b.kind === BLUE ? COLORS.blue : COLORS.red);
      if (frac < 0.3) tmpC.lerp(pale, ((0.3 - frac) / 0.3) * 0.75);
      if (glow > 0) tmpC.lerp(b.kind === BLUE ? COLORS.blueGlow : COLORS.redGlow, glow * 0.55);

      this.pushBlob(x, hopY, z, v.heading, lean, s, sy, tmpC, b.kind, {
        eyeOpen,
        eyeWide: v.eyeWide,
        mouthOpen,
        brow: v.brow,
      });
    }

    this.ghosts = this.ghosts.filter((g) => t - g.t0 < (g.type === "fade" ? 1.4 : 0.32));
    for (const g of this.ghosts) {
      const k = (t - g.t0) / (g.type === "fade" ? 1.4 : 0.32);
      if (g.type === "fade") {
        const s = g.scale * (1 - smoothstep(0.2, 1, k)) + 0.001;
        tmpC.copy(g.kind === BLUE ? COLORS.bluePale : COLORS.redPale).lerp(WHITE, k * 0.4);
        this.pushBlob(g.x, -0.05 * k, g.z, g.heading, -0.35 * smoothstep(0, 0.4, k), s, 0.8, tmpC, g.kind, {
          eyeOpen: 0.06,
          eyeWide: 1,
          mouthOpen: 0,
          brow: 0,
        });
      } else {
        const s = g.scale * (1 + 0.45 * k) * (1 - k * k);
        tmpC.copy(COLORS.blue).lerp(COLORS.blueGlow, k);
        this.pushBlob(g.x, 0.08 * k, g.z, g.heading, 0, s, 1 + 0.2 * k, tmpC, g.kind, {
          eyeOpen: 0.1,
          eyeWide: 1.2,
          mouthOpen: 1,
          brow: 0,
        });
      }
    }

    this.bodies.end();
    this.eyes.end();
    this.glints.end();
    this.cheeks.end();
    this.mouths.end();
    this.brows.end();

    if (this.frameNo % 30 === 0) {
      for (const [id, v] of this.visuals) if (this.frameNo - v.seen > 30) this.visuals.delete(id);
    }
  }

  private pushBlob(
    x: number,
    y: number,
    z: number,
    heading: number,
    lean: number,
    s: number,
    sy: number,
    color: THREE.Color,
    kind: Kind,
    face: { eyeOpen: number; eyeWide: number; mouthOpen: number; brow: number },
  ): void {
    const sxz = s / Math.sqrt(Math.max(0.5, sy));
    tmpE.set(lean, heading, 0);
    tmpQ.setFromEuler(tmpE);
    bodyM.compose(tmpV.set(x, y, z), tmpQ, tmpS.set(sxz, s * sy, sxz));
    this.bodies.push(bodyM, color);

    const f = this.features;
    const ew = face.eyeWide;
    const eo = Math.max(0.06, face.eyeOpen);
    for (const frame of [f.eyeL, f.eyeR]) {
      tmpM2.copy(frame).scale(tmpS.set(0.056 * ew, 0.08 * ew * eo, 0.034));
      this.eyes.push(tmpM2.premultiply(bodyM));
      if (eo > 0.35) {
        tmpM2.copy(frame).multiply(localM.makeTranslation(0.02 * ew, 0.032 * ew * eo, 0.03));
        tmpM2.scale(tmpS.setScalar(0.019 * ew));
        this.glints.push(tmpM2.premultiply(bodyM));
      }
    }
    const cheekColor = kind === BLUE ? COLORS.cheekBlue : COLORS.cheekRed;
    for (const frame of [f.cheekL, f.cheekR]) {
      tmpM2.copy(frame).scale(tmpS.set(0.07, 0.042, 0.014));
      this.cheeks.push(tmpM2.premultiply(bodyM), cheekColor);
    }
    tmpM2.copy(f.mouth).scale(tmpS.set(1, 1 + face.mouthOpen * 1.3, 1));
    this.mouths.push(tmpM2.premultiply(bodyM));

    const bAmt = Math.abs(face.brow);
    if (bAmt > 0.05) {
      const tilt = 0.5 * face.brow;
      for (const [frame, side] of [
        [f.browL, -1],
        [f.browR, 1],
      ] as const) {
        tmpM2.copy(frame).multiply(localM.makeRotationZ(Math.PI / 2 + tilt * side));
        tmpM2.scale(tmpS.setScalar(Math.min(1, bAmt * 1.4)));
        this.brows.push(tmpM2.premultiply(bodyM));
      }
    }
  }

  // ---------------------------------------------------------------- effects

  private spawn(
    x: number,
    y: number,
    z: number,
    shape: number,
    color: THREE.Color | string,
    opts: Partial<Pick<Particle, "vx" | "vy" | "vz" | "max" | "size" | "grow" | "gravity" | "drag">> = {},
  ): void {
    if (this.particles.length >= this.maxParticles) return;
    const c = typeof color === "string" ? tmpC.set(color) : color;
    this.particles.push({
      x,
      y,
      z,
      vx: opts.vx ?? 0,
      vy: opts.vy ?? 0,
      vz: opts.vz ?? 0,
      life: 0,
      max: opts.max ?? 0.8,
      size: opts.size ?? 0.3,
      grow: opts.grow ?? 0,
      r: c.r,
      g: c.g,
      b: c.b,
      shape,
      gravity: opts.gravity ?? 0,
      drag: opts.drag ?? 1.5,
    });
  }

  private burst(x: number, y: number, z: number, n: number, shape: number, color: string, speed: number, size: number) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const up = 0.5 + Math.random();
      this.spawn(x, y, z, shape, color, {
        vx: Math.sin(a) * speed * (0.5 + Math.random()),
        vz: Math.cos(a) * speed * (0.5 + Math.random()),
        vy: up * speed,
        max: 0.6 + Math.random() * 0.5,
        size: size * (0.7 + Math.random() * 0.6),
        gravity: -3,
        drag: 2.2,
      });
    }
  }

  private pulse(x: number, z: number, color: string, size: number, max = 0.7): void {
    const p = this.pulses.find((q) => q.life <= 0) ?? this.pulses[0];
    p.life = max;
    p.max = max;
    p.size = size;
    p.mesh.material.color.set(color);
    p.mesh.position.set(x, 0.04, z);
    p.mesh.visible = true;
  }

  private emote(b: Blob, v: Visual): void {
    const y = BODY_H * v.scale + 0.45;
    if (b.kind === BLUE && b.action === "flee") {
      this.spawn(v.x, y, v.z, SPRITE.bang, "#fff3b0", { vy: 1.2, max: 0.7, size: 0.5, drag: 3 });
    } else if (b.action === "hunt") {
      this.spawn(v.x, y, v.z, SPRITE.bang, "#ff8a5c", { vy: 1.2, max: 0.6, size: 0.45, drag: 3 });
    } else if (b.action === "tired") {
      this.spawn(v.x + 0.2, y - 0.1, v.z, SPRITE.drop, "#bfe3ff", { vy: -0.4, max: 0.9, size: 0.32 });
    } else if (b.action === "shade" && Math.random() < 0.35) {
      this.spawn(v.x + 0.15, y - 0.1, v.z, SPRITE.zz, "#ffffff", { vy: 0.5, vx: 0.2, max: 1.4, size: 0.35, drag: 0.5 });
    }
  }

  private handleEvents(input: FrameInput): void {
    const { events, sim } = input;
    const fx = input.speed <= 10 ? 1 : 0.35;
    for (const e of events) {
      const v = this.visuals.get(e.id);
      switch (e.type) {
        case "eat":
          if (Math.random() < fx) {
            this.fruitWorld(sim.trees[e.treeId], e.treeId, e.slot, tmpV);
            for (let i = 0; i < 3; i++) {
              this.spawn(tmpV.x, tmpV.y, tmpV.z, SPRITE.leaf, "#7cd65a", {
                vx: (Math.random() - 0.5) * 1.2,
                vz: (Math.random() - 0.5) * 1.2,
                vy: 0.2,
                gravity: -2.5,
                max: 0.9,
                size: 0.22,
              });
            }
          }
          break;
        case "ate":
          if (Math.random() < fx) {
            this.pulse(e.x, e.z, "#9be15d", 1.1, 0.55);
            this.burst(e.x, 0.6, e.z, 3, SPRITE.star, "#d6ff8a", 1.2, 0.2);
          }
          break;
        case "boop": {
          const victim = this.visuals.get(e.victim);
          this.ghosts.push({
            x: e.x,
            z: e.z,
            heading: victim?.heading ?? 0,
            kind: BLUE,
            t0: this.time,
            type: "poof",
            scale: victim?.scale ?? 1,
          });
          this.visuals.delete(e.victim);
          if (Math.random() < fx) {
            this.burst(e.x, 0.45, e.z, 9, SPRITE.star, "#8fc2ff", 2.2, 0.26);
            this.burst(e.x, 0.45, e.z, 4, SPRITE.dot, "#dff0ff", 1.6, 0.35);
            if (v) {
              for (let i = 0; i < 3; i++) {
                this.spawn(v.x + (Math.random() - 0.5) * 0.4, BODY_H + 0.2, v.z + (Math.random() - 0.5) * 0.4, SPRITE.heart, "#ff7a9a", {
                  vy: 0.9 + Math.random() * 0.4,
                  max: 1.1,
                  size: 0.3,
                  drag: 0.8,
                });
              }
            }
            this.pulse(e.x, e.z, "#ff8fa3", 1.5, 0.6);
          }
          break;
        }
        case "birth":
          if (Math.random() < fx) {
            this.burst(e.x, 0.5, e.z, 6, SPRITE.star, e.kind === BLUE ? "#9cc8ff" : "#ffb0b8", 1.4, 0.22);
            this.pulse(e.x, e.z, e.kind === BLUE ? "#a9d0ff" : "#ffc0c6", 1.0, 0.5);
          }
          break;
        case "fade":
          this.ghosts.push({
            x: e.x,
            z: e.z,
            heading: v?.heading ?? 0,
            kind: e.kind,
            t0: this.time,
            type: "fade",
            scale: v?.scale ?? 1,
          });
          this.visuals.delete(e.id);
          if (Math.random() < fx) {
            for (let i = 0; i < 4; i++) {
              this.spawn(e.x + (Math.random() - 0.5) * 0.4, 0.5, e.z + (Math.random() - 0.5) * 0.4, SPRITE.dot, "#ffffff", {
                vy: 0.6 + Math.random() * 0.5,
                max: 1.3,
                size: 0.35,
                grow: 0.4,
                drag: 0.6,
              });
            }
          }
          break;
      }
    }
  }

  private updateParticles(dt: number): void {
    const ps = this.particles;
    let w = 0;
    const { pos, col, size, alpha, shape } = this.pAttr;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) continue;
      const drag = Math.exp(-p.drag * dt);
      p.vx *= drag;
      p.vz *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const k = p.life / p.max;
      pos.setXYZ(w, p.x, p.y, p.z);
      col.setXYZ(w, p.r, p.g, p.b);
      size.setX(w, p.size * (1 + p.grow * k) * (k < 0.15 ? k / 0.15 : 1));
      alpha.setX(w, k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
      shape.setX(w, p.shape);
      ps[w++] = p;
    }
    ps.length = w;
    this.points.geometry.setDrawRange(0, w);
    pos.needsUpdate = col.needsUpdate = size.needsUpdate = alpha.needsUpdate = shape.needsUpdate = true;
  }

  private updatePulses(dt: number): void {
    for (const p of this.pulses) {
      if (p.life <= 0) continue;
      p.life -= dt;
      const k = 1 - Math.max(0, p.life) / p.max;
      const s = p.size * (0.3 + 0.9 * k);
      p.mesh.scale.set(s, 1, s);
      p.mesh.material.opacity = 0.75 * (1 - k);
      if (p.life <= 0) p.mesh.visible = false;
    }
  }

  private updateSelection(input: FrameInput): void {
    const { sim, selectedId, follow } = input;
    const sel = selectedId != null ? sim.byId.get(selectedId) : undefined;
    const v = sel ? this.visuals.get(sel.id) : undefined;
    if (sel && v) {
      const pulse = 1 + 0.08 * Math.sin(this.time * 5);
      this.selRing.visible = true;
      this.selRing.position.set(v.x, 0.03, v.z);
      this.selRing.scale.setScalar(v.scale * pulse * 1.15);
      const vision = blobVision(sim.params, sel);
      const tint = sel.kind === BLUE ? "#7fb2ff" : "#ff8f9a";
      this.visionRing.visible = true;
      this.visionRing.material.color.set(tint);
      this.visionRing.position.set(v.x, 0.025, v.z);
      this.visionRing.scale.setScalar(vision);
      this.fleeRing.visible = sel.kind === BLUE;
      if (sel.kind === BLUE) {
        this.fleeRing.material.color.set("#ffffff");
        this.fleeRing.position.set(v.x, 0.025, v.z);
        this.fleeRing.scale.setScalar(vision * FLEE_FRACTION);
      }

      let target: THREE.Vector3 | null = null;
      if ((sel.action === "seek" || sel.action === "remember" || sel.action === "eat") && sel.treeId >= 0) {
        const tr = sim.trees[sel.treeId];
        target = tmpV.set(tr.x, 0.15, tr.z);
      } else if (sel.action === "hunt") {
        const tv = this.visuals.get(sel.targetId);
        if (tv) target = tmpV.set(tv.x, 0.15, tv.z);
      } else if (sel.action === "flee") {
        const tv = this.visuals.get(sel.targetId);
        if (tv) target = tmpV.set(tv.x, 0.15, tv.z);
      }
      if (target) {
        const geo = this.targetLine.geometry;
        const arr = geo.attributes.position as THREE.BufferAttribute;
        arr.setXYZ(0, v.x, 0.15, v.z);
        arr.setXYZ(1, target.x, target.y, target.z);
        arr.needsUpdate = true;
        this.targetLine.computeLineDistances();
        this.targetLine.material.color.set(sel.action === "flee" ? "#ffe066" : tint);
        this.targetLine.visible = true;
      } else {
        this.targetLine.visible = false;
      }

      if (follow) {
        const k = 1 - Math.exp(-input.dt * 4);
        const dx = (v.x - this.controls.target.x) * k;
        const dz = (v.z - this.controls.target.z) * k;
        this.controls.target.x += dx;
        this.controls.target.z += dz;
        this.camera.position.x += dx;
        this.camera.position.z += dz;
        if (this.lastFollowId !== sel.id) {
          this.lastFollowId = sel.id;
          const off = this.camera.position.clone().sub(this.controls.target);
          if (off.length() > 16) {
            off.setLength(16);
            this.camera.position.copy(this.controls.target).add(off);
          }
        }
      }
    } else {
      this.selRing.visible = this.visionRing.visible = this.fleeRing.visible = this.targetLine.visible = false;
    }
    if (!follow || !sel) this.lastFollowId = null;

    const hv = this.hoverId != null && this.hoverId !== selectedId ? this.visuals.get(this.hoverId) : undefined;
    this.hoverRing.visible = !!hv;
    if (hv) {
      this.hoverRing.position.set(hv.x, 0.03, hv.z);
      this.hoverRing.scale.setScalar(hv.scale * 1.1);
    }
  }

  // ---------------------------------------------------------------- input

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();

  pick(clientX: number, clientY: number): number | null {
    const sim = this.sim;
    if (!sim) return null;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const ray = this.raycaster.ray;
    let best: number | null = null;
    let bestScore = Infinity;
    const c = new THREE.Vector3();
    for (const b of sim.blobs) {
      const v = this.visuals.get(b.id);
      if (!v) continue;
      c.set(v.x, v.y + 0.38 * v.scale, v.z);
      const d2 = ray.distanceSqToPoint(c);
      const r = 0.48 * v.scale;
      if (d2 > r * r) continue;
      const score = d2 + c.distanceTo(ray.origin) * 0.002;
      if (score < bestScore) {
        bestScore = score;
        best = b.id;
      }
    }
    return best;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.pointer.down = true;
    this.pointer.moved = false;
    this.pointer.downX = e.clientX;
    this.pointer.downY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent) => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.inside = true;
    if (this.pointer.down && Math.hypot(e.clientX - this.pointer.downX, e.clientY - this.pointer.downY) > 5) {
      this.pointer.moved = true;
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.pointer.down && !this.pointer.moved) this.hooks.onPick(this.pick(e.clientX, e.clientY));
    this.pointer.down = false;
  };

  private onPointerLeave = () => {
    this.pointer.inside = false;
    this.hoverId = null;
    this.renderer.domElement.style.cursor = "";
  };

  private updatePointerHover(): void {
    if (!this.pointer.inside || this.pointer.down || this.frameNo % 3 !== 0) return;
    this.hoverId = this.pick(this.pointer.x, this.pointer.y);
    this.renderer.domElement.style.cursor = this.hoverId != null ? "pointer" : "grab";
  }

  private resize(): void {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = `${w}px`;
    this.renderer.domElement.style.height = `${h}px`;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    const mat = this.points.material as THREE.ShaderMaterial;
    mat.uniforms.projScale.value =
      (h * this.renderer.getPixelRatio()) / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    if (!this.userMoved) this.frameCamera();
  }

  dispose(): void {
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointermove", this.onPointerMove);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointerleave", this.onPointerLeave);
    this.controls.dispose();
    for (const i of [this.bodies, this.eyes, this.glints, this.cheeks, this.mouths, this.brows]) i.dispose();
    this.trunks?.dispose();
    this.canopies?.dispose();
    this.fruits?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    el.remove();
  }
}
