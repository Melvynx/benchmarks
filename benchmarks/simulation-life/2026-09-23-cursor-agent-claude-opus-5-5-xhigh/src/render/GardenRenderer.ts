import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import type { SimController } from "../engine/controller";
import type { SimEvent } from "../sim/types";
import { radiusOf, visionOf } from "../sim/world";
import { BlobLayer } from "./blobs";
import { buildDish, DISH_DEPTH, RIM_PAD } from "./dish";
import { Particles, RingPool } from "./particles";
import { makeSoftShadowTexture, SHAPE } from "./textures";
import { TreeLayer } from "./trees";

const FOV = 36;
const COLORS = {
  blue: "#4d9bff",
  red: "#ff5a5f",
  fruit: "#c8ef52",
  heart: "#ff7fae",
  star: "#ffd84a",
  puff: "#ece6f2",
};

export class GardenRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 600);
  private controls: OrbitControls;
  private sun: THREE.DirectionalLight;
  private worldGroup: THREE.Group | null = null;
  private trees: TreeLayer | null = null;
  private blobs: BlobLayer;
  private particles = new Particles();
  private rings = new RingPool();
  private shadowTex = makeSoftShadowTexture();
  private builtVersion = -1;
  private builtRadius = 0;
  private raf = 0;
  private last = performance.now();
  private time = 0;
  private ro: ResizeObserver;
  private disposed = false;
  private viewTouched = false;

  private selRing: THREE.Mesh;
  private visionRing: THREE.Mesh;
  private visionDisc: THREE.Mesh;
  private treeRing: THREE.Mesh;
  private intent: THREE.Line;
  private intentPos = new Float32Array(6);

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private downAt: { x: number; y: number; t: number } | null = null;
  private hoverDirty = false;
  private hoverXY = { x: 0, y: 0 };
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private followTarget = new THREE.Vector3();
  /** Orbit pivot: below the dish center so the tilted dish sits centered in the frame. */
  private home = new THREE.Vector3();

  onFirstInteraction: (() => void) | null = null;

  constructor(
    private container: HTMLElement,
    private ctrl: SimController,
  ) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "garden-canvas";
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.5;
    pmrem.dispose();

    this.scene.add(new THREE.HemisphereLight("#fff4e2", "#6f9c62", 1.25));
    this.sun = new THREE.DirectionalLight("#fff0d8", 2.7);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun, this.sun.target);
    const fill = new THREE.DirectionalLight("#d4e2ff", 0.55);
    fill.position.set(-20, 12, -14);
    this.scene.add(fill);

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.55;
    this.controls.zoomSpeed = 0.8;
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = 1.28;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.addEventListener("start", () => {
      this.viewTouched = true;
      this.onFirstInteraction?.();
    });

    this.blobs = new BlobLayer(this.shadowTex, this.particles);
    this.scene.add(this.blobs.group, this.particles.points, this.rings.group);

    this.selRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.06, 10, 64).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#fff3a8", transparent: true, opacity: 0.95, depthWrite: false }),
    );
    this.visionRing = new THREE.Mesh(
      new THREE.RingGeometry(0.975, 1, 128).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.55, depthWrite: false }),
    );
    this.visionDisc = new THREE.Mesh(
      new THREE.CircleGeometry(1, 96).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.09, depthWrite: false }),
    );
    this.treeRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.05, 10, 64).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: "#eaffb0", transparent: true, opacity: 0.9, depthWrite: false }),
    );
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute("position", new THREE.BufferAttribute(this.intentPos, 3));
    this.intent = new THREE.Line(
      lineGeo,
      new THREE.LineDashedMaterial({ color: "#ffffff", dashSize: 0.3, gapSize: 0.2, transparent: true, opacity: 0.9 }),
    );
    this.intent.frustumCulled = false;
    for (const m of [this.selRing, this.visionRing, this.visionDisc, this.treeRing, this.intent]) {
      m.visible = false;
      m.renderOrder = 3;
      this.scene.add(m);
    }

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();

    const el = renderer.domElement;
    el.addEventListener("pointerdown", this.onDown);
    el.addEventListener("pointerup", this.onUp);
    el.addEventListener("pointermove", this.onMove);
    el.addEventListener("pointerleave", () => (el.style.cursor = ""));

    this.raf = requestAnimationFrame(this.loop);
  }

  resetView() {
    this.viewTouched = false;
    this.placeCamera(this.ctrl.world.radius, "default");
  }

  /** keep: user's angles · spin: keep turntable azimuth, re-pick tilt for the aspect · default: fresh view */
  private placeCamera(radius: number, angles: "keep" | "spin" | "default") {
    const aspect = this.camera.aspect || 1.6;
    const sph = new THREE.Spherical(1, aspect < 0.9 ? 0.64 : 0.92, 0.55);
    const current = this.camera.position.clone().sub(this.controls.target);
    if (angles !== "default" && this.builtRadius > 0 && current.lengthSq() > 0) {
      const cur = new THREE.Spherical().setFromVector3(current);
      sph.theta = cur.theta;
      if (angles === "keep") sph.phi = cur.phi;
    }
    const dir = new THREE.Vector3().setFromSpherical(sph);
    const { dist, lift } = this.fitView(radius, dir);
    this.home.set(0, -lift, 0);
    this.controls.target.copy(this.home);
    this.camera.position.copy(dir).multiplyScalar(dist).add(this.home);
    this.controls.minDistance = radius * 0.5;
    this.controls.maxDistance = dist * 1.8;
    this.camera.lookAt(this.home);
    this.controls.update();
  }

  /** Closest distance along `dir` (and pivot drop) where the whole dish (rim, base, far canopies) fills the frame. */
  private fitView(radius: number, dir: THREE.Vector3): { dist: number; lift: number } {
    const cam = this.camera;
    const rimOut = radius + RIM_PAD + 0.6;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      pts.push(
        new THREE.Vector3(c * rimOut, 0.41, s * rimOut),
        new THREE.Vector3(c * (rimOut - 0.3), -DISH_DEPTH, s * (rimOut - 0.3)),
        new THREE.Vector3(c * radius * 0.9, 2.3, s * radius * 0.9),
      );
    }
    const pivot = new THREE.Vector3();
    const measure = (d: number, lift: number) => {
      pivot.set(0, -lift, 0);
      cam.position.copy(dir).multiplyScalar(d).add(pivot);
      cam.lookAt(pivot);
      cam.updateMatrixWorld();
      let x = 0;
      let y0 = Infinity;
      let y1 = -Infinity;
      for (const p of pts) {
        this.tmp.copy(p).project(cam);
        x = Math.max(x, Math.abs(this.tmp.x));
        y0 = Math.min(y0, this.tmp.y);
        y1 = Math.max(y1, this.tmp.y);
      }
      return { fill: Math.max(x / 0.95, (y1 - y0) / 1.8), center: (y0 + y1) / 2 };
    };
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const sinPhi = Math.max(0.2, Math.hypot(dir.x, dir.z));
    let lift = 0;
    let dist = radius * 3;
    for (let pass = 0; pass < 4; pass++) {
      let lo = radius * 0.8;
      let hi = radius * 14;
      for (let k = 0; k < 22; k++) {
        const d = (lo + hi) / 2;
        if (measure(d, lift).fill > 1) lo = d;
        else hi = d;
      }
      dist = hi;
      const { center } = measure(dist, lift);
      lift = THREE.MathUtils.clamp(lift - (center * dist * tanHalf) / sinPhi, 0, radius * 0.5);
    }
    return { dist, lift };
  }

  private rebuild() {
    const w = this.ctrl.world;
    if (this.worldGroup) {
      this.scene.remove(this.worldGroup);
      this.worldGroup.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mat) {
          mat.map?.dispose();
          mat.dispose();
        }
      });
    }
    this.trees?.dispose();

    const group = buildDish(w.radius, w.params.seed, w.trees);
    this.trees = new TreeLayer(w, w.params.seed);
    group.add(this.trees.group);
    this.scene.add(group);
    this.worldGroup = group;
    this.blobs.reset();
    this.particles.clear();
    this.rings.clear();

    const R = w.radius;
    this.sun.position.set(R * 0.75, R * 2, R * 0.55);
    this.sun.target.position.set(0, 0, 0);
    const cam = this.sun.shadow.camera;
    cam.left = -R - 2.5;
    cam.right = R + 2.5;
    cam.top = R + 2.5;
    cam.bottom = -R - 2.5;
    cam.near = 1;
    cam.far = R * 5;
    cam.updateProjectionMatrix();

    if (Math.abs(this.builtRadius - R) > 1e-6) this.placeCamera(R, this.viewTouched ? "keep" : "spin");
    this.builtRadius = R;
    this.builtVersion = this.ctrl.worldVersion;
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.particles.setViewport(h * this.renderer.getPixelRatio(), FOV);
    if (!this.viewTouched && !this.ctrl.follow && this.builtRadius > 0) this.placeCamera(this.builtRadius, "spin");
  }

  private rayFrom(clientX: number, clientY: number): THREE.Ray {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    return this.raycaster.ray;
  }

  private pickAt(clientX: number, clientY: number): { kind: "blob" | "tree"; id: number } | null {
    const ray = this.rayFrom(clientX, clientY);
    const blob = this.blobs.pick(ray, this.ctrl.world);
    const tree = this.trees?.raycast(ray) ?? null;
    if (blob && (!tree || blob.dist < tree.dist + 0.6)) return { kind: "blob", id: blob.id };
    if (tree) return { kind: "tree", id: tree.id };
    return null;
  }

  private onDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
  };

  private onUp = (e: PointerEvent) => {
    const d = this.downAt;
    this.downAt = null;
    if (!d) return;
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 600) return;
    const hit = this.pickAt(e.clientX, e.clientY);
    if (!hit) {
      this.ctrl.select(null);
      this.ctrl.selectTree(null);
    } else if (hit.kind === "blob") {
      this.ctrl.select(hit.id);
    } else {
      this.ctrl.selectTree(hit.id);
    }
    this.onFirstInteraction?.();
  };

  private onMove = (e: PointerEvent) => {
    this.hoverXY.x = e.clientX;
    this.hoverXY.y = e.clientY;
    this.hoverDirty = true;
  };

  private handleEvents(events: SimEvent[]) {
    const world = this.ctrl.world;
    const speed = world.params.simSpeed;
    const keep = Math.min(1, 6 / Math.max(1, speed));
    let budget = 90;
    for (const ev of events) {
      if (budget-- <= 0) break;
      if (ev.type !== "eatStart" && Math.random() > keep) continue;
      switch (ev.type) {
        case "birth": {
          const r = radiusOf(ev.species);
          const col = ev.species === "blue" ? COLORS.blue : COLORS.red;
          this.particles.burst(7, { shape: SHAPE.sparkle, x: ev.x, y: r * 1.2, z: ev.y, size: 0.34, life: 0.8, color: "#ffffff", gravity: -1.5, spin: 3 }, 1.4, 1.6);
          this.particles.burst(4, { shape: SHAPE.sparkle, x: ev.x, y: r * 1.4, z: ev.y, size: 0.28, life: 0.9, color: col, gravity: -1, spin: 2 }, 1.1, 1.8);
          this.rings.spawn(ev.x, ev.y, col, 1.3, 0.7);
          break;
        }
        case "eatStart":
          this.trees?.shakeTree(ev.treeId, 0.35);
          break;
        case "eatDone": {
          this.trees?.shakeTree(ev.treeId, 0.7);
          this.particles.burst(5, { shape: SHAPE.sparkle, x: ev.x, y: 0.55, z: ev.y, size: 0.26, life: 0.7, color: COLORS.fruit, gravity: -1, spin: 3 }, 0.9, 1.4);
          this.rings.spawn(ev.x, ev.y, COLORS.fruit, 1.0, 0.6);
          break;
        }
        case "contact": {
          this.particles.burst(3, { shape: SHAPE.heart, x: ev.x, y: 0.95, z: ev.y, size: 0.42, life: 1.25, color: COLORS.heart, gravity: 0.4, sway: 1.5 }, 0.5, 1.1);
          if (!ev.faded) {
            this.particles.burst(4, { shape: SHAPE.star, x: ev.x, y: 0.9, z: ev.y, size: 0.22, life: 0.8, color: COLORS.star, gravity: -1.2, spin: 6 }, 1.2, 1.3);
          }
          this.rings.spawn(ev.x, ev.y, COLORS.heart, 1.5, 0.75);
          break;
        }
        case "fade": {
          this.particles.burst(7, { shape: SHAPE.puff, x: ev.x, y: 0.35, z: ev.y, size: 0.5, life: 1.1, color: COLORS.puff, gravity: 0.5, grow: 1.1, drag: 1.5 }, 0.7, 0.6);
          this.particles.burst(3, { shape: SHAPE.sparkle, x: ev.x, y: 0.5, z: ev.y, size: 0.22, life: 1, color: ev.species === "blue" ? "#bcdcff" : "#ffc2c4", gravity: 0.8, spin: 2 }, 0.4, 1);
          break;
        }
        case "flee": {
          if (this.blobs.headOf(ev.id, this.tmp)) {
            this.particles.spawn({ shape: SHAPE.bang, x: this.tmp.x, y: this.tmp.y + 0.15, z: this.tmp.z, vy: 0.7, size: 0.5, life: 0.8, color: COLORS.star, drag: 2 });
          }
          break;
        }
        default:
          break;
      }
    }
  }

  private updateSelection() {
    const world = this.ctrl.world;
    const sel = this.ctrl.selected !== null ? world.byId.get(this.ctrl.selected) : undefined;
    const pulse = 1 + Math.sin(this.time * 5) * 0.06;

    if (sel && this.blobs.groundOf(sel.id, this.tmp)) {
      const r = radiusOf(sel.species);
      this.selRing.visible = true;
      this.selRing.position.set(this.tmp.x, 0.05, this.tmp.z);
      this.selRing.scale.setScalar(r * 1.55 * pulse);
      const vis = visionOf(sel, world.params);
      const tint = sel.species === "blue" ? "#bfe0ff" : "#ffd0d2";
      (this.visionRing.material as THREE.MeshBasicMaterial).color.set(tint);
      (this.visionDisc.material as THREE.MeshBasicMaterial).color.set(tint);
      this.visionRing.visible = sel.action !== "fade";
      this.visionDisc.visible = sel.action !== "fade";
      this.visionRing.position.set(this.tmp.x, 0.04, this.tmp.z);
      this.visionDisc.position.set(this.tmp.x, 0.035, this.tmp.z);
      this.visionRing.scale.setScalar(vis);
      this.visionDisc.scale.setScalar(vis);

      let hasTarget = false;
      if (sel.targetId >= 0) {
        if (sel.species === "blue" && ["seek", "wait", "eat", "rest", "hide"].includes(sel.action)) {
          const t = world.trees[sel.targetId];
          if (t) {
            this.tmp2.set(t.x, 0.06, t.y);
            hasTarget = true;
          }
        } else if (sel.species === "red" && sel.action === "chase" && this.blobs.groundOf(sel.targetId, this.tmp2)) {
          this.tmp2.y = 0.06;
          hasTarget = true;
        }
      }
      this.intent.visible = hasTarget;
      if (hasTarget) {
        this.intentPos.set([this.tmp.x, 0.06, this.tmp.z, this.tmp2.x, this.tmp2.y, this.tmp2.z]);
        this.intent.geometry.attributes.position.needsUpdate = true;
        this.intent.computeLineDistances();
        (this.intent.material as THREE.LineDashedMaterial).color.set(sel.species === "blue" ? "#e9ffb8" : "#ffe0e2");
      }

      if (this.ctrl.follow) {
        this.followTarget.set(this.tmp.x, 0.3, this.tmp.z);
        const before = this.controls.target.clone();
        this.controls.target.lerp(this.followTarget, 0.08);
        this.camera.position.add(this.controls.target.clone().sub(before));
      }
    } else {
      this.selRing.visible = false;
      this.visionRing.visible = false;
      this.visionDisc.visible = false;
      this.intent.visible = false;
    }

    const tid = this.ctrl.selectedTree;
    if (tid !== null && this.trees && world.trees[tid]) {
      const t = world.trees[tid];
      this.treeRing.visible = true;
      this.treeRing.position.set(t.x, 0.05, t.y);
      this.treeRing.scale.setScalar(1.3 * t.scale * pulse);
    } else {
      this.treeRing.visible = false;
    }
  }

  private easeTargetHome(dt: number) {
    if (this.ctrl.follow) return;
    const t = this.controls.target;
    if (t.distanceToSquared(this.home) < 1e-4) return;
    const before = t.clone();
    t.lerp(this.home, 1 - Math.exp(-dt * 1.5));
    this.camera.position.add(t.clone().sub(before));
  }

  private loop = (now: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;

    const t0 = performance.now();
    const alpha = this.ctrl.frame(dt);
    if (this.builtVersion !== this.ctrl.worldVersion) this.rebuild();
    const world = this.ctrl.world;
    const t1 = performance.now();

    this.handleEvents(this.ctrl.drainEvents());
    const fx = this.ctrl.running ? Math.min(1, 6 / world.params.simSpeed) : 1;
    this.blobs.update(world, alpha, this.time, dt, fx);
    this.trees?.update(world, this.time, dt, this.blobs.mouthOf);
    this.particles.update(dt);
    this.rings.update(dt);
    this.updateSelection();
    this.easeTargetHome(dt);

    if (this.hoverDirty) {
      this.hoverDirty = false;
      const hit = this.pickAt(this.hoverXY.x, this.hoverXY.y);
      this.renderer.domElement.style.cursor = hit ? "pointer" : "";
    }

    this.controls.autoRotate = this.ctrl.turntable;
    this.controls.update(dt);
    const t2 = performance.now();
    this.renderer.render(this.scene, this.camera);
    const p = this.perf;
    p.sim += t1 - t0;
    p.update += t2 - t1;
    p.render += performance.now() - t2;
    p.frames++;
  };

  /** Accumulated milliseconds per phase, for profiling. */
  readonly perf = { sim: 0, update: 0, render: 0, frames: 0 };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.controls.dispose();
    this.blobs.dispose();
    this.trees?.dispose();
    this.particles.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
