import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createRng } from "../sim/rng";
import type { Action, Blob, DeathCause, SimEvent, Simulation, Tree } from "../sim/simulation";
import {
  emojiTexture,
  makeDishShadowTexture,
  makeDotTexture,
  makeGrassTexture,
  makeHeartTexture,
  makeShadowTexture,
  makeSparkleTexture,
} from "./textures";

const COLORS = {
  blue: new THREE.Color("#3f8cff"),
  blueDim: new THREE.Color("#a9bfd9"),
  red: new THREE.Color("#ff4f63"),
  redDim: new THREE.Color("#d9aeb3"),
  fruit: new THREE.Color("#c6ff3d"),
  fruitYoung: new THREE.Color("#6fae3a"),
};

const INTENT: Partial<Record<Action, string>> = {
  seeking: "🍏",
  waiting: "⏳",
  eating: "😋",
  fleeing: "💨",
  startled: "❗",
  copying: "✨",
  chasing: "👀",
  pausing: "💗",
  tired: "💦",
  hiding: "🍃",
  napping: "💤",
};

const BODY_H = 1.0;
const BODY_W = 0.68;

// ---------------------------------------------------------------- shared assets

class Assets {
  body = new THREE.SphereGeometry(0.5, 32, 24);
  eye = new THREE.SphereGeometry(0.068, 16, 12);
  glint = new THREE.SphereGeometry(0.024, 8, 6);
  mouth = new THREE.TorusGeometry(0.06, 0.017, 8, 20, Math.PI);
  cheek = new THREE.CircleGeometry(0.055, 16);
  plane = new THREE.PlaneGeometry(1, 1);
  fruit = new THREE.SphereGeometry(0.17, 18, 14);
  leaf = new THREE.IcosahedronGeometry(1, 2);
  trunk = new THREE.CylinderGeometry(0.12, 0.2, 1.15, 10);
  ring = new THREE.RingGeometry(0.82, 1, 48);

  eyeMat = new THREE.MeshStandardMaterial({ color: "#1d1b2a", roughness: 0.2, metalness: 0.1 });
  glintMat = new THREE.MeshBasicMaterial({ color: "#ffffff" });
  mouthMat = new THREE.MeshStandardMaterial({ color: "#2a1a24", roughness: 0.5 });
  cheekMat = new THREE.MeshBasicMaterial({ color: "#ff8fb1", transparent: true, opacity: 0.55, depthWrite: false });
  trunkMat = new THREE.MeshStandardMaterial({ color: "#8b5a3c", roughness: 0.85 });
  fruitRipe = new THREE.MeshPhysicalMaterial({ color: COLORS.fruit, roughness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.2, emissive: "#8fd400", emissiveIntensity: 0.35 });
  fruitYoung = new THREE.MeshStandardMaterial({ color: COLORS.fruitYoung, roughness: 0.5 });
  leafMats = ["#3f9b54", "#4caf5f", "#58b86a", "#378a4a"].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.75, flatShading: true }));

  shadowTex = makeShadowTexture();
  shadowMat = new THREE.MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false });
  sparkleTex = makeSparkleTexture();
  heartTex = makeHeartTexture();
  dotTex = makeDotTexture();
}

// ---------------------------------------------------------------- blob view

class BlobView {
  id: number;
  kind: "blue" | "red";
  root = new THREE.Group();
  inner = new THREE.Group();
  body: THREE.Mesh;
  mat: THREE.MeshPhysicalMaterial;
  eyes: THREE.Group[] = [];
  mouth: THREE.Mesh;
  face = new THREE.Group();
  shadow: THREE.Mesh;
  icon: THREE.Sprite;
  iconMat: THREE.SpriteMaterial;
  iconEmoji = "";
  heading = 0;
  hop = Math.random() * 10;
  blinkIn = 1 + Math.random() * 4;
  blink = 0;
  born = 0;
  bounce = 0;
  glow = 0;
  dying = -1;
  deathCause: DeathCause = "old";
  size = 1;
  wobbleSeed = Math.random() * 100;
  lastX = 0;
  lastZ = 0;
  lastAction: Action = "wandering";

  constructor(b: Blob, a: Assets, instant: boolean) {
    this.id = b.id;
    this.kind = b.kind;
    const color = b.kind === "blue" ? COLORS.blue : COLORS.red;
    this.mat = new THREE.MeshPhysicalMaterial({
      color: color.clone(),
      roughness: 0.22,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      sheen: 0.4,
      sheenColor: new THREE.Color("#ffffff"),
      emissive: color.clone(),
      emissiveIntensity: 0,
    });
    this.body = new THREE.Mesh(a.body, this.mat);
    this.body.scale.set(BODY_W, BODY_H, BODY_W);
    this.body.position.y = BODY_H / 2;
    this.body.userData.blobId = b.id;
    this.inner.add(this.body);

    for (const sx of [-1, 1]) {
      const eye = new THREE.Group();
      const ball = new THREE.Mesh(a.eye, a.eyeMat);
      ball.scale.set(1, 1.25, 0.7);
      const glint = new THREE.Mesh(a.glint, a.glintMat);
      glint.position.set(0.022, 0.035, 0.045);
      eye.add(ball, glint);
      eye.position.set(sx * 0.115, 0.62, 0.305);
      this.eyes.push(eye);
      this.face.add(eye);
      const cheek = new THREE.Mesh(a.cheek, a.cheekMat);
      cheek.position.set(sx * 0.195, 0.5, 0.275);
      cheek.rotation.y = sx * 0.6;
      this.face.add(cheek);
    }
    this.mouth = new THREE.Mesh(a.mouth, a.mouthMat);
    this.mouth.position.set(0, 0.5, 0.335);
    this.mouth.rotation.z = Math.PI;
    this.face.add(this.mouth);
    this.inner.add(this.face);

    this.shadow = new THREE.Mesh(a.plane, a.shadowMat);
    this.shadow.rotation.x = -Math.PI / 2;
    this.shadow.position.y = 0.02;
    this.shadow.scale.setScalar(1.05);
    this.shadow.renderOrder = 1;

    this.iconMat = new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthWrite: false });
    this.icon = new THREE.Sprite(this.iconMat);
    this.icon.scale.setScalar(0.42);
    this.icon.position.y = 1.35;
    this.icon.renderOrder = 5;

    this.root.add(this.inner, this.shadow, this.icon);
    this.born = instant ? 1 : 0;
    this.heading = Math.atan2(b.faceX, b.faceZ);
    this.lastX = b.x;
    this.lastZ = b.z;
  }

  dispose() {
    this.mat.dispose();
    this.iconMat.dispose();
  }
}

// ---------------------------------------------------------------- tree view

class TreeView {
  group = new THREE.Group();
  canopy = new THREE.Group();
  fruits: THREE.Mesh[] = [];
  slotPos: THREE.Vector3[] = [];
  seed: number;
  constructor(public tree: Tree, private a: Assets) {
    this.seed = tree.seed;
    const r = createRng(tree.seed);
    const s = tree.size;
    this.group.position.set(tree.x, 0, tree.z);
    this.group.rotation.y = r() * Math.PI * 2;
    const trunk = new THREE.Mesh(a.trunk, a.trunkMat);
    trunk.position.y = 0.58 * s;
    trunk.scale.set(s, s, s);
    trunk.castShadow = true;
    this.group.add(trunk);

    const main = new THREE.Mesh(a.leaf, a.leafMats[r.int(a.leafMats.length)]);
    main.scale.setScalar(0.78 * s);
    main.position.y = 1.55 * s;
    main.castShadow = true;
    this.canopy.add(main);
    const lobes = 3 + r.int(2);
    for (let i = 0; i < lobes; i++) {
      const ang = (i / lobes) * Math.PI * 2 + r() * 0.6;
      const lobe = new THREE.Mesh(a.leaf, a.leafMats[r.int(a.leafMats.length)]);
      lobe.scale.setScalar(r.range(0.45, 0.58) * s);
      lobe.position.set(Math.cos(ang) * 0.48 * s, r.range(1.3, 1.75) * s, Math.sin(ang) * 0.48 * s);
      lobe.rotation.set(r(), r(), r());
      lobe.castShadow = true;
      this.canopy.add(lobe);
    }
    this.group.add(this.canopy);
    this.syncSlots();
  }

  syncSlots() {
    const n = this.tree.slots.length;
    if (n === this.fruits.length) return;
    for (const f of this.fruits) this.group.remove(f);
    this.fruits = [];
    this.slotPos = [];
    const r = createRng(this.seed + 17);
    const s = this.tree.size;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + r.range(-0.3, 0.3);
      const el = r.range(-0.45, 0.35);
      const rad = 0.9 * s;
      const p = new THREE.Vector3(Math.cos(ang) * Math.cos(el) * rad, 1.5 * s + Math.sin(el) * rad, Math.sin(ang) * Math.cos(el) * rad);
      this.slotPos.push(p);
      const m = new THREE.Mesh(this.a.fruit, this.a.fruitRipe);
      m.position.copy(p);
      m.castShadow = true;
      this.fruits.push(m);
      this.group.add(m);
    }
  }
}

// ---------------------------------------------------------------- fx

interface Particle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  max: number;
  size: number;
  gravity: number;
  active: boolean;
}

interface Pulse {
  mesh: THREE.Mesh;
  life: number;
  max: number;
  from: number;
  to: number;
  active: boolean;
}

// ---------------------------------------------------------------- world

export class WorldView {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  showIntents = true;
  follow = false;
  onPick: (id: number | null) => void = () => {};

  private a = new Assets();
  private worldGroup = new THREE.Group();
  private blobGroup = new THREE.Group();
  private fxGroup = new THREE.Group();
  private trees: TreeView[] = [];
  private blobs = new Map<number, BlobView>();
  private dying: BlobView[] = [];
  private particles: Particle[] = [];
  private pulses: Pulse[] = [];
  private selected: number | null = null;
  private selectRing: THREE.Mesh;
  private visionRing: THREE.Mesh;
  private sun: THREE.DirectionalLight;
  private builtKey = "";
  private radius = 16;
  private clock = 0;
  private animClock = 0;
  private raycaster = new THREE.Raycaster();
  private downAt: { x: number; y: number } | null = null;
  private resizeObs: ResizeObserver;
  private deathCauses = new Map<number, DeathCause>();
  private tmpV = new THREE.Vector3();

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.touchAction = "none";

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 400);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.15;
    this.controls.maxPolarAngle = 1.32;
    this.controls.rotateSpeed = 0.7;

    const hemi = new THREE.HemisphereLight("#fff4e0", "#8fb08a", 1.25);
    this.scene.add(hemi);
    this.sun = new THREE.DirectionalLight("#fff1dc", 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 4;
    this.scene.add(this.sun, this.sun.target);
    const rim = new THREE.DirectionalLight("#c8d8ff", 0.6);
    rim.position.set(-20, 12, -18);
    this.scene.add(rim);

    this.scene.add(this.worldGroup, this.blobGroup, this.fxGroup);

    this.selectRing = new THREE.Mesh(this.a.ring, new THREE.MeshBasicMaterial({ color: "#ffd84d", transparent: true, opacity: 0.95, depthWrite: false }));
    this.selectRing.rotation.x = -Math.PI / 2;
    this.selectRing.visible = false;
    this.selectRing.renderOrder = 2;
    this.visionRing = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.5, depthWrite: false }));
    this.visionRing.rotation.x = -Math.PI / 2;
    this.visionRing.visible = false;
    this.visionRing.renderOrder = 2;
    this.scene.add(this.selectRing, this.visionRing);

    for (let i = 0; i < 220; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, blending: THREE.NormalBlending }));
      sprite.visible = false;
      sprite.renderOrder = 6;
      this.fxGroup.add(sprite);
      this.particles.push({ sprite, vel: new THREE.Vector3(), life: 0, max: 1, size: 0.2, gravity: 0, active: false });
    }
    for (let i = 0; i < 40; i++) {
      const mesh = new THREE.Mesh(this.a.ring, new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 3;
      this.fxGroup.add(mesh);
      this.pulses.push({ mesh, life: 0, max: 1, from: 0.3, to: 2, active: false });
    }

    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();
  }

  dispose() {
    this.resizeObs.disconnect();
    this.renderer.domElement.removeEventListener("pointerdown", this.onDown);
    this.renderer.domElement.removeEventListener("pointerup", this.onUp);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  setSelected(id: number | null) {
    this.selected = id;
  }

  resetCamera() {
    const R = this.radius;
    const aspect = this.camera.aspect;
    const dist = R * (aspect < 1.1 ? 3.4 : 2.45);
    this.camera.position.set(R * 0.25, dist * 0.66, dist * 0.75);
    this.controls.target.set(0, 0, 0);
    this.controls.minDistance = R * 1.1;
    this.controls.maxDistance = R * 5;
    this.controls.update();
  }

  private onDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };

  private onUp = (e: PointerEvent) => {
    if (!this.downAt) return;
    const moved = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
    this.downAt = null;
    if (moved > 6) return;
    this.onPick(this.pick(e.clientX, e.clientY));
  };

  pick(clientX: number, clientY: number): number | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const bodies: THREE.Object3D[] = [];
    for (const v of this.blobs.values()) bodies.push(v.body);
    const hit = this.raycaster.intersectObjects(bodies, false)[0];
    if (hit) return hit.object.userData.blobId as number;
    // Forgiving pick: nearest blob to the ray within a small radius.
    let best: number | null = null;
    let bestD = 0.7;
    const ray = this.raycaster.ray;
    for (const v of this.blobs.values()) {
      this.tmpV.set(v.root.position.x, 0.45, v.root.position.z);
      const d = ray.distanceToPoint(this.tmpV);
      if (d < bestD) {
        bestD = d;
        best = v.id;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- build

  build(sim: Simulation) {
    const key = `${sim.radius}|${sim.trees.map((t) => t.seed).join(",")}`;
    for (const v of this.blobs.values()) {
      this.blobGroup.remove(v.root);
      v.dispose();
    }
    this.blobs.clear();
    for (const v of this.dying) {
      this.blobGroup.remove(v.root);
      v.dispose();
    }
    this.dying = [];
    for (const p of this.particles) {
      p.active = false;
      p.sprite.visible = false;
    }
    for (const p of this.pulses) {
      p.active = false;
      p.mesh.visible = false;
    }
    if (key === this.builtKey) return;
    const radiusChanged = this.radius !== sim.radius || !this.builtKey;
    this.builtKey = key;
    this.radius = sim.radius;
    this.worldGroup.clear();
    this.trees = [];
    this.buildDish(sim);
    for (const t of sim.trees) {
      const tv = new TreeView(t, this.a);
      this.trees.push(tv);
      this.worldGroup.add(tv.group);
    }
    const R = sim.radius;
    this.sun.position.set(R * 0.9, R * 2.2, R * 0.7);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -(R + 3);
    sc.right = sc.top = R + 3;
    sc.near = 1;
    sc.far = R * 6;
    sc.updateProjectionMatrix();
    if (radiusChanged) this.resetCamera();
  }

  private buildDish(sim: Simulation) {
    const R = sim.radius;
    const pts = [
      [0, -1.5],
      [R * 0.9, -1.5],
      [R + 0.7, -1.25],
      [R + 1.15, -0.55],
      [R + 1.2, 0.2],
      [R + 1.02, 0.52],
      [R + 0.7, 0.58],
      [R + 0.38, 0.42],
      [R + 0.12, 0.12],
      [R, 0.02],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const dish = new THREE.Mesh(
      new THREE.LatheGeometry(pts, 160),
      new THREE.MeshPhysicalMaterial({ color: "#f4b893", roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.5 }),
    );
    dish.receiveShadow = true;
    dish.castShadow = true;
    this.worldGroup.add(dish);

    const band = new THREE.Mesh(
      new THREE.TorusGeometry(R + 1.17, 0.07, 10, 160),
      new THREE.MeshStandardMaterial({ color: "#ffe2c9", roughness: 0.4 }),
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = -0.2;
    this.worldGroup.add(band);

    const grassTex = makeGrassTexture();
    grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
    grassTex.repeat.set(R / 5, R / 5);
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(R + 0.15, 160),
      new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.95, color: "#ffffff" }),
    );
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = 0.005;
    grass.receiveShadow = true;
    this.worldGroup.add(grass);

    const shadow = new THREE.Mesh(this.a.plane, new THREE.MeshBasicMaterial({ map: makeDishShadowTexture(), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -1.52;
    shadow.scale.setScalar((R + 1.2) * 2.9);
    this.worldGroup.add(shadow);

    // Decorative tufts, pebbles and flowers.
    const r = createRng(sim.params.seed * 31 + 5);
    const far = (x: number, z: number) => sim.trees.every((t) => Math.hypot(t.x - x, t.z - z) > 1.3);
    const tuftGeo = new THREE.ConeGeometry(0.06, 0.32, 5);
    const tuftMat = new THREE.MeshStandardMaterial({ color: "#5fae52", roughness: 0.9 });
    const tuftCount = Math.round(R * R * 1.1);
    const tufts = new THREE.InstancedMesh(tuftGeo, tuftMat, tuftCount);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sVec = new THREE.Vector3();
    const pVec = new THREE.Vector3();
    for (let i = 0; i < tuftCount; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r()) * (R - 0.3);
      const x = Math.cos(a) * d;
      const z = Math.sin(a) * d;
      e.set(r.range(-0.35, 0.35), r() * 6, r.range(-0.35, 0.35));
      q.setFromEuler(e);
      const s = r.range(0.6, 1.4);
      m.compose(pVec.set(x, 0.12 * s, z), q, sVec.set(s, s, s));
      tufts.setMatrixAt(i, m);
    }
    this.worldGroup.add(tufts);

    const flowerGeo = new THREE.SphereGeometry(0.07, 8, 6);
    const flowerColors = ["#ffffff", "#ffe066", "#ff9ec4", "#c9b6ff"];
    const flowerCount = Math.round(R * R * 0.22);
    const flowers = new THREE.InstancedMesh(flowerGeo, new THREE.MeshStandardMaterial({ roughness: 0.6 }), flowerCount);
    const col = new THREE.Color();
    for (let i = 0; i < flowerCount; i++) {
      let x = 0;
      let z = 0;
      for (let k = 0; k < 6; k++) {
        const a = r() * Math.PI * 2;
        const d = Math.sqrt(r()) * (R - 0.5);
        x = Math.cos(a) * d;
        z = Math.sin(a) * d;
        if (far(x, z)) break;
      }
      m.compose(pVec.set(x, 0.08, z), q.identity(), sVec.set(1, 0.7, 1));
      flowers.setMatrixAt(i, m);
      flowers.setColorAt(i, col.set(flowerColors[r.int(flowerColors.length)]));
    }
    this.worldGroup.add(flowers);

    const pebbleGeo = new THREE.IcosahedronGeometry(0.16, 0);
    const pebbleCount = Math.round(R * 1.4);
    const pebbles = new THREE.InstancedMesh(pebbleGeo, new THREE.MeshStandardMaterial({ color: "#d9d2c4", roughness: 0.8, flatShading: true }), pebbleCount);
    for (let i = 0; i < pebbleCount; i++) {
      const a = r() * Math.PI * 2;
      const d = R - r.range(0.3, 1.2);
      e.set(r(), r(), r());
      q.setFromEuler(e);
      const s = r.range(0.6, 1.5);
      m.compose(pVec.set(Math.cos(a) * d, 0.04, Math.sin(a) * d), q, sVec.set(s, s * 0.6, s));
      pebbles.setMatrixAt(i, m);
    }
    pebbles.receiveShadow = true;
    this.worldGroup.add(pebbles);
  }

  // ---------------------------------------------------------------- fx helpers

  private spawnParticle(tex: THREE.Texture, color: THREE.ColorRepresentation, pos: THREE.Vector3, vel: THREE.Vector3, size: number, life: number, gravity = 0) {
    const p = this.particles.find((q) => !q.active);
    if (!p) return;
    p.active = true;
    p.life = 0;
    p.max = life;
    p.size = size;
    p.gravity = gravity;
    p.vel.copy(vel);
    p.sprite.position.copy(pos);
    const mat = p.sprite.material;
    mat.map = tex;
    mat.color.set(color);
    mat.opacity = 1;
    mat.needsUpdate = true;
    p.sprite.visible = true;
    p.sprite.scale.setScalar(size);
  }

  private spawnPulse(x: number, z: number, color: THREE.ColorRepresentation, to = 2.2, life = 0.7) {
    const p = this.pulses.find((q) => !q.active);
    if (!p) return;
    p.active = true;
    p.life = 0;
    p.max = life;
    p.from = 0.3;
    p.to = to;
    p.mesh.position.set(x, 0.05, z);
    (p.mesh.material as THREE.MeshBasicMaterial).color.set(color);
    p.mesh.visible = true;
  }

  private burst(tex: THREE.Texture, color: THREE.ColorRepresentation, x: number, y: number, z: number, n: number, spread = 1.4, size = 0.22, life = 0.9, gravity = -1.5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = spread * (0.4 + Math.random() * 0.8);
      this.spawnParticle(
        tex,
        color,
        this.tmpV.set(x + Math.cos(a) * 0.15, y, z + Math.sin(a) * 0.15).clone(),
        new THREE.Vector3(Math.cos(a) * sp, 1.2 + Math.random() * 1.4, Math.sin(a) * sp),
        size * (0.7 + Math.random() * 0.6),
        life * (0.7 + Math.random() * 0.6),
        gravity,
      );
    }
  }

  private handleEvents(events: SimEvent[], sim: Simulation) {
    const a = this.a;
    for (const ev of events) {
      switch (ev.type) {
        case "eatStart": {
          const t = sim.trees[ev.tree];
          if (t) {
            for (let i = 0; i < 2; i++) {
              this.spawnParticle(a.dotTex, "#5dbb63", new THREE.Vector3(t.x + (Math.random() - 0.5), 1.6 * t.size, t.z + (Math.random() - 0.5)), new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.2, (Math.random() - 0.5) * 0.6), 0.14, 1.3, -1.2);
            }
          }
          break;
        }
        case "eat": {
          const v = this.blobs.get(ev.id);
          if (v) {
            v.bounce = 1;
            v.glow = 0.6;
          }
          this.spawnPulse(ev.x, ev.z, "#b8f24c", 1.6, 0.6);
          this.burst(a.sparkleTex, "#e8ff7a", ev.x, 0.9, ev.z, 4, 0.9, 0.24, 0.8, -0.8);
          break;
        }
        case "contact": {
          const red = this.blobs.get(ev.id);
          if (red) {
            red.glow = 1;
            red.bounce = 1;
          }
          const blue = this.blobs.get(ev.other);
          if (blue && !ev.faded) blue.bounce = 1;
          this.spawnPulse(ev.x, ev.z, "#ff7fa6", 2, 0.7);
          this.burst(a.heartTex, "#ff6f9c", ev.x, 1.0, ev.z, 3, 0.7, 0.32, 1.1, 0.4);
          if (ev.faded) this.burst(a.dotTex, "#9cc8ff", ev.x, 0.5, ev.z, 8, 1.6, 0.16, 0.9, -2);
          break;
        }
        case "birth": {
          this.burst(a.sparkleTex, ev.kind === "blue" ? "#bfe0ff" : "#ffd0d6", ev.x, 0.6, ev.z, 5, 1.1, 0.22, 0.7, -1);
          break;
        }
        case "death": {
          this.deathCauses.set(ev.id, ev.cause);
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- per-frame

  update(sim: Simulation, alpha: number, dt: number, playing: boolean, events: SimEvent[]) {
    this.clock += dt;
    const animRate = playing ? Math.min(2.2, Math.max(1, Math.sqrt(sim.params.simSpeed))) : 0.6;
    const adt = dt * animRate;
    this.animClock += adt;
    const t = this.clock;

    this.handleEvents(events, sim);

    // Trees + fruit.
    for (const tv of this.trees) {
      const tree = tv.tree;
      tv.syncSlots();
      const sway = Math.sin(t * 0.9 + tv.seed) * 0.018;
      tv.canopy.rotation.z = sway + tree.jiggle * 0.07 * Math.sin(t * 28);
      tv.canopy.rotation.x = Math.cos(t * 0.7 + tv.seed) * 0.015;
      for (let i = 0; i < tree.slots.length; i++) {
        const slot = tree.slots[i];
        const f = tv.fruits[i];
        if (!f) continue;
        const home = tv.slotPos[i];
        if (slot.state === "ripe") {
          f.visible = true;
          f.material = this.a.fruitRipe;
          f.position.copy(home);
          const target = 1 + Math.sin(t * 2 + i) * 0.03;
          f.scale.setScalar(THREE.MathUtils.lerp(f.scale.x, target, Math.min(1, dt * 8)));
        } else if (slot.state === "growing") {
          f.visible = slot.growth > 0.02;
          f.material = this.a.fruitYoung;
          f.position.copy(home);
          f.scale.setScalar(0.25 + slot.growth * 0.6);
        } else if (slot.state === "eaten") {
          const eater = sim.byId.get(slot.eater);
          if (!eater || eater.timerMax <= 0) {
            f.visible = false;
            continue;
          }
          f.visible = true;
          f.material = this.a.fruitRipe;
          const p = 1 - Math.max(0, eater.timer) / eater.timerMax;
          const ev = this.blobs.get(eater.id);
          const ex = ev ? ev.root.position.x : eater.x;
          const ez = ev ? ev.root.position.z : eater.z;
          const h = ev ? ev.heading : 0;
          const mouthWorld = this.tmpV.set(ex + Math.sin(h) * 0.42, 0.5, ez + Math.cos(h) * 0.42);
          // Tree group is rotated; convert mouth into its local frame.
          const local = tv.group.worldToLocal(mouthWorld.clone());
          const fly = Math.min(1, p / 0.3);
          const e = fly * fly * (3 - 2 * fly);
          f.position.lerpVectors(home, local, e);
          f.position.y += Math.sin(e * Math.PI) * 0.35;
          const shrink = p < 0.3 ? 1 : Math.max(0, 1 - (p - 0.3) / 0.7);
          f.scale.setScalar(0.85 * shrink + 0.05);
        } else {
          f.visible = false;
        }
      }
    }

    // Blob views.
    const seen = new Set<number>();
    for (const b of sim.blobs) {
      seen.add(b.id);
      let v = this.blobs.get(b.id);
      if (!v) {
        v = new BlobView(b, this.a, sim.time < 0.05);
        this.blobs.set(b.id, v);
        this.blobGroup.add(v.root);
      }
      this.animateBlob(v, b, sim, alpha, dt, adt, playing);
    }
    for (const [id, v] of this.blobs) {
      if (seen.has(id)) continue;
      this.blobs.delete(id);
      v.dying = 0;
      v.deathCause = this.deathCauses.get(id) ?? "old";
      this.deathCauses.delete(id);
      v.mat.transparent = true;
      v.iconMat.opacity = 0;
      this.dying.push(v);
    }
    for (let i = this.dying.length - 1; i >= 0; i--) {
      const v = this.dying[i];
      v.dying += dt / 0.9;
      const k = Math.min(1, v.dying);
      const cause = v.deathCause;
      if (cause === "contact") {
        v.inner.scale.setScalar(Math.max(0.01, 1 - k) * (1 + Math.sin(k * 12) * 0.1));
        v.inner.position.y = k * 0.4;
      } else if (cause === "starved") {
        v.inner.scale.set(1 + k * 0.3, Math.max(0.05, 1 - k * 0.9), 1 + k * 0.3);
        v.mat.color.lerp(new THREE.Color("#cfcfcf"), 0.08);
      } else {
        v.inner.position.y = k * 1.6;
        v.inner.scale.setScalar(Math.max(0.01, 1 - k * 0.6));
      }
      v.mat.opacity = 1 - k;
      (v.shadow.material as THREE.Material).opacity = 1;
      v.shadow.scale.setScalar(1.05 * (1 - k));
      if (k >= 1) {
        this.blobGroup.remove(v.root);
        v.dispose();
        this.dying.splice(i, 1);
      }
    }

    // Selection.
    const sel = this.selected !== null ? this.blobs.get(this.selected) : undefined;
    const selBlob = this.selected !== null ? sim.byId.get(this.selected) : undefined;
    if (sel && selBlob) {
      this.selectRing.visible = true;
      this.selectRing.position.set(sel.root.position.x, 0.04, sel.root.position.z);
      this.selectRing.scale.setScalar(0.62 + Math.sin(t * 5) * 0.04);
      this.visionRing.visible = true;
      this.visionRing.position.set(sel.root.position.x, 0.035, sel.root.position.z);
      this.visionRing.scale.setScalar(sim.visionOf(selBlob));
      (this.visionRing.material as THREE.MeshBasicMaterial).color.set(selBlob.kind === "blue" ? "#dbeaff" : "#ffe0e4");
      if (this.follow) {
        this.controls.target.lerp(this.tmpV.set(sel.root.position.x, 0.3, sel.root.position.z), Math.min(1, dt * 4));
      }
    } else {
      this.selectRing.visible = false;
      this.visionRing.visible = false;
    }
    if (!this.follow || !sel) {
      this.controls.target.lerp(this.tmpV.set(0, 0, 0), Math.min(1, dt * 2));
    }

    // FX.
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      if (p.life >= p.max) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.vel.y += p.gravity * dt;
      p.vel.multiplyScalar(1 - dt * 1.5);
      p.sprite.position.addScaledVector(p.vel, dt);
      const k = p.life / p.max;
      p.sprite.material.opacity = k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85;
      p.sprite.scale.setScalar(p.size * (0.6 + Math.sin(Math.min(1, k * 2) * Math.PI * 0.5) * 0.5));
    }
    for (const p of this.pulses) {
      if (!p.active) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }
      const e = 1 - (1 - k) ** 3;
      p.mesh.scale.setScalar(p.from + (p.to - p.from) * e);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - k);
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  private animateBlob(v: BlobView, b: Blob, sim: Simulation, alpha: number, dt: number, adt: number, playing: boolean) {
    const x = b.px + (b.x - b.px) * alpha;
    const z = b.pz + (b.z - b.pz) * alpha;
    const moved = Math.hypot(x - v.lastX, z - v.lastZ);
    v.lastX = x;
    v.lastZ = z;
    v.root.position.set(x, 0, z);

    const refSpeed = sim.speedOf(b) || 1;
    const vel = Math.hypot(b.vx, b.vz);
    const speedNorm = playing ? Math.min(1.4, vel / refSpeed) : 0;
    void moved;

    const targetHeading = Math.atan2(b.faceX, b.faceZ);
    let dh = targetHeading - v.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    v.heading += dh * Math.min(1, dt * 9);
    v.root.rotation.y = v.heading;

    // Birth pop.
    if (v.born < 1) v.born = Math.min(1, v.born + dt / 0.45);
    const bk = v.born;
    const c1 = 1.70158;
    const pop = bk >= 1 ? 1 : 1 + (c1 + 1) * (bk - 1) ** 3 + c1 * (bk - 1) ** 2;

    // Size tells energy + youth.
    const vigor = sim.vigorOf(b);
    const maturity = b.kind === "blue" ? 6 : 22;
    const youth = 0.72 + 0.28 * Math.min(1, b.age / maturity);
    const targetSize = (0.84 + 0.22 * Math.min(1.2, vigor)) * youth;
    v.size += (targetSize - v.size) * Math.min(1, dt * 3);

    // Color: pale when running low.
    const full = b.kind === "blue" ? COLORS.blue : COLORS.red;
    const dim = b.kind === "blue" ? COLORS.blueDim : COLORS.redDim;
    const low = Math.max(0, Math.min(1, (0.35 - vigor) / 0.35));
    v.mat.color.copy(full).lerp(dim, low * 0.75);

    const T = this.animClock + v.wobbleSeed;
    let hopY = 0;
    let sy = 1;
    let lean = 0;
    let roll = 0;
    let eyeY = 1;
    let eyeS = 1;
    let mouthY = 1;
    let mouthX = 1;
    let faceYaw = 0;
    const act = b.action;

    if (speedNorm > 0.08 && act !== "eating") {
      const hopRate = 7 + 6 * speedNorm;
      v.hop += adt * hopRate;
      const s = Math.abs(Math.sin(v.hop));
      hopY = 0.17 * Math.min(1, speedNorm) * s;
      sy = 1 + (s - 0.55) * 0.14 * Math.min(1, speedNorm);
      lean = 0.16 * speedNorm;
    } else {
      sy = 1 + Math.sin(T * 2.2) * 0.025;
    }

    switch (act) {
      case "eating": {
        const chew = Math.abs(Math.sin(T * 13));
        mouthY = 0.5 + chew * 1.3;
        mouthX = 0.8;
        hopY = chew * 0.035;
        sy = 1 + chew * 0.04;
        lean = 0.14;
        break;
      }
      case "fleeing":
      case "startled":
        eyeS = 1.3;
        lean = 0.3 * Math.max(0.5, speedNorm);
        mouthY = 1.4;
        mouthX = 0.6;
        break;
      case "chasing":
        eyeY = 0.55;
        lean = 0.28 * Math.max(0.5, speedNorm);
        break;
      case "pausing":
        eyeY = 0.22;
        roll = Math.sin(T * 5) * 0.14;
        sy = 1 + Math.sin(T * 5) * 0.05;
        v.glow = Math.max(v.glow, 0.35 + Math.sin(T * 6) * 0.15);
        break;
      case "napping":
        eyeY = 0.08;
        sy = 0.93 + Math.sin(T * 1.2) * 0.05;
        roll = 0.1;
        mouthX = 0.6;
        break;
      case "tired":
        eyeY = 0.5;
        sy = 0.9;
        lean = -0.1;
        break;
      case "hiding":
        sy = 0.86;
        eyeS = 1.15;
        faceYaw = Math.sin(T * 2.4) * 0.35;
        break;
      case "waiting":
        faceYaw = Math.sin(T * 0.9) * 0.25;
        break;
      case "copying": {
        const w = Math.sin(T * 24) * 0.12;
        sy = 1 + w;
        v.glow = Math.max(v.glow, 0.3);
        break;
      }
    }

    if (v.lastAction !== act) {
      if (act === "copying") v.bounce = 0.8;
      v.lastAction = act;
    }

    // Blink.
    v.blinkIn -= dt;
    if (v.blinkIn <= 0) {
      v.blink = 0.14;
      v.blinkIn = 2 + Math.random() * 4;
    }
    if (v.blink > 0) {
      v.blink -= dt;
      eyeY = Math.min(eyeY, 0.1);
    }

    // Reaction bounce.
    if (v.bounce > 0) {
      v.bounce = Math.max(0, v.bounce - dt * 2.8);
      const bb = Math.sin((1 - v.bounce) * Math.PI) * v.bounce;
      hopY += bb * 0.3;
      sy += bb * 0.12;
    }
    v.glow = Math.max(0, v.glow - dt * 1.2);
    v.mat.emissiveIntensity = v.glow * 0.55;

    const size = v.size * pop;
    const sxz = 1 / Math.sqrt(Math.max(0.3, sy));
    v.inner.position.y = hopY;
    v.inner.scale.set(size * sxz, size * sy, size * sxz);
    v.inner.rotation.set(lean, 0, roll);
    v.face.rotation.y = faceYaw;
    for (const e of v.eyes) e.scale.set(eyeS, eyeS * eyeY, eyeS);
    v.mouth.scale.set(mouthX, mouthY, 1);

    const shadowK = 1 - hopY * 1.4;
    v.shadow.scale.setScalar(1.05 * size * Math.max(0.5, shadowK));
    (v.shadow.material as THREE.MeshBasicMaterial).opacity = 1;

    // Intent icon.
    const emoji = this.showIntents || this.selected === b.id ? INTENT[act] : undefined;
    if (emoji && emoji !== v.iconEmoji) {
      v.iconEmoji = emoji;
      v.iconMat.map = emojiTexture(emoji);
      v.iconMat.needsUpdate = true;
    }
    const targetOpacity = emoji ? 1 : 0;
    v.iconMat.opacity += (targetOpacity - v.iconMat.opacity) * Math.min(1, dt * 8);
    v.icon.visible = v.iconMat.opacity > 0.02;
    v.icon.position.y = (1.35 + hopY) * size + 0.15 + Math.sin(this.clock * 3 + v.wobbleSeed) * 0.03;
    const sel = this.selected === b.id;
    v.icon.scale.setScalar(sel ? 0.62 : 0.5);
  }
}
