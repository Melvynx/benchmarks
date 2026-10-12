import * as THREE from "three";
import { RULES } from "../sim/params";
import type { Blob, Species } from "../sim/types";
import { copyThresholdOf, radiusOf, type World } from "../sim/world";
import { SHAPE } from "./textures";
import type { Particles } from "./particles";

const MAX = RULES.maxBlobs;
const CY = 0.8;

const BASE: Record<Species, THREE.Color> = {
  blue: new THREE.Color("#4d9bff"),
  red: new THREE.Color("#ff5a5f"),
};
const HUNGRY_TINT = new THREE.Color("#c9c3d3");
const GLOW = new THREE.Color("#fffbe8");
const SHADE = new THREE.Color("#2a4a3a");

interface Vis {
  frame: number;
  lx: number;
  lz: number;
  rx: number;
  rz: number;
  rh: number;
  ry: number;
  rs: number;
  hop: number;
  move: number;
  roll: number;
  lastHeading: number;
  blinkIn: number;
  blinkT: number;
  lookX: number;
  lookY: number;
  lookTX: number;
  lookTY: number;
  lookIn: number;
  phase: number;
  emitIn: number;
  /** Stable per-blob body build and hop style, so crowds don't look cloned. */
  plump: number;
  bounce: number;
}

/** Above this many blobs, bodies stop casting sun shadows (their soft contact shadows remain). */
const CROWD_SHADOW_OFF = 750;
const CROWD_SHADOW_ON = 600;

function beanGeometry(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, 36, 24);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i);
    let y = p.getY(i);
    let z = p.getZ(i);
    y *= y > 0 ? 1.1 : 0.8;
    const belly = 1 + 0.06 * Math.exp(-((y + 0.1) ** 2) / 0.2);
    x *= belly;
    z *= belly * 0.9;
    p.setXYZ(i, x, y + CY, z);
  }
  g.computeVertexNormals();
  return g;
}

/** Front surface depth of the bean at local (x, height above center). */
function frontZ(x: number, dy: number): number {
  const y0 = dy > 0 ? dy / 1.1 : dy / 0.8;
  const belly = 1 + 0.06 * Math.exp(-((dy + 0.1) ** 2) / 0.2);
  const x0 = x / belly;
  const z0 = Math.sqrt(Math.max(0, 1 - x0 * x0 - y0 * y0));
  return z0 * belly * 0.9;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const angleDiff = (a: number, b: number) => ((a - b + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
const easeOutBack = (x: number) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};

interface FaceLayout {
  eye: THREE.Vector3[];
  eyeYaw: number[];
  eyeRoll: number[];
  eyeScale: THREE.Vector3;
  mouth: THREE.Vector3;
  mouthScale: number;
  cheek: THREE.Vector3[];
  cheekYaw: number[];
}

function faceFor(species: Species): FaceLayout {
  const ex = species === "blue" ? 0.33 : 0.35;
  const edy = species === "blue" ? 0.32 : 0.27;
  const eye = [-1, 1].map((sgn) => new THREE.Vector3(sgn * ex, CY + edy, frontZ(ex, edy) - 0.035));
  const mdy = species === "blue" ? 0.03 : -0.01;
  const cx = 0.56;
  const cdy = 0.06;
  return {
    eye,
    eyeYaw: eye.map((e) => Math.atan2(e.x, e.z) * 0.85),
    eyeRoll: species === "blue" ? [0, 0] : [-0.22, 0.22],
    eyeScale: species === "blue" ? new THREE.Vector3(0.19, 0.25, 0.12) : new THREE.Vector3(0.2, 0.21, 0.12),
    mouth: new THREE.Vector3(0, CY + mdy, frontZ(0, mdy) - 0.005),
    mouthScale: species === "blue" ? 1 : 1.25,
    cheek: [-1, 1].map((sgn) => new THREE.Vector3(sgn * cx, CY + cdy, frontZ(cx, cdy) - 0.012)),
    cheekYaw: [-1, 1].map((sgn) => Math.atan2(sgn * cx, frontZ(cx, cdy))),
  };
}

const FACES: Record<Species, FaceLayout> = { blue: faceFor("blue"), red: faceFor("red") };

export class BlobLayer {
  readonly group = new THREE.Group();
  private body: THREE.InstancedMesh;
  private eyes: THREE.InstancedMesh;
  private pupils: THREE.InstancedMesh;
  private shines: THREE.InstancedMesh;
  private smiles: THREE.InstancedMesh;
  private ohs: THREE.InstancedMesh;
  private cheeks: THREE.InstancedMesh;
  private shadows: THREE.InstancedMesh;
  private vis = new Map<number, Vis>();
  private frameId = 0;

  private bm = new THREE.Matrix4();
  private lm = new THREE.Matrix4();
  private om = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private lq = new THREE.Quaternion();
  private e = new THREE.Euler();
  private le = new THREE.Euler();
  private p = new THREE.Vector3();
  private lp = new THREE.Vector3();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  private zero = new THREE.Matrix4().makeScale(0, 0, 0);
  private flatQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));

  constructor(
    shadowTex: THREE.Texture,
    private particles: Particles,
  ) {
    this.body = new THREE.InstancedMesh(
      beanGeometry(),
      new THREE.MeshPhysicalMaterial({
        roughness: 0.3,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        sheen: 0.4,
        sheenRoughness: 0.5,
        sheenColor: new THREE.Color("#ffffff"),
      }),
      MAX,
    );
    this.body.castShadow = true;
    this.body.receiveShadow = true;
    this.body.setColorAt(0, BASE.blue);

    const sphere = new THREE.SphereGeometry(1, 12, 9);
    this.eyes = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.25 }), MAX * 2);
    this.pupils = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: "#1d1a2b", roughness: 0.15 }), MAX * 2);
    this.shines = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: "#ffffff" }), MAX * 2);

    const smileGeo = new THREE.TorusGeometry(0.1, 0.026, 6, 14, Math.PI);
    smileGeo.rotateZ(Math.PI);
    this.smiles = new THREE.InstancedMesh(smileGeo, new THREE.MeshStandardMaterial({ color: "#3a1f2d", roughness: 0.4 }), MAX);
    this.ohs = new THREE.InstancedMesh(sphere, new THREE.MeshStandardMaterial({ color: "#4a1f33", roughness: 0.4 }), MAX);
    this.cheeks = new THREE.InstancedMesh(
      sphere,
      new THREE.MeshBasicMaterial({ color: "#ff8fb3", transparent: true, opacity: 0.55, depthWrite: false }),
      MAX * 2,
    );
    this.shadows = new THREE.InstancedMesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTex, color: "#1e3a22", transparent: true, opacity: 0.42, depthWrite: false }),
      MAX,
    );
    this.shadows.renderOrder = -1;

    for (const m of [this.body, this.eyes, this.pupils, this.shines, this.smiles, this.ohs, this.cheeks, this.shadows]) {
      m.count = 0;
      m.frustumCulled = false;
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.group.add(m);
    }
  }

  reset() {
    this.vis.clear();
  }

  mouthOf = (id: number, out: THREE.Vector3): boolean => {
    const v = this.vis.get(id);
    if (!v) return false;
    const r = v.rs;
    out.set(v.rx + Math.cos(v.rh) * r * 0.88, v.ry + r * (CY + 0.05), v.rz + Math.sin(v.rh) * r * 0.88);
    return true;
  };

  headOf(id: number, out: THREE.Vector3): boolean {
    const v = this.vis.get(id);
    if (!v) return false;
    out.set(v.rx, v.ry + v.rs * 1.95 + 0.12, v.rz);
    return true;
  }

  groundOf(id: number, out: THREE.Vector3): boolean {
    const v = this.vis.get(id);
    if (!v) return false;
    out.set(v.rx, 0, v.rz);
    return true;
  }

  pick(ray: THREE.Ray, world: World): { id: number; dist: number } | null {
    let best: { id: number; dist: number } | null = null;
    const sphere = new THREE.Sphere();
    const hit = new THREE.Vector3();
    for (const b of world.blobs) {
      if (b.action === "fade") continue;
      const v = this.vis.get(b.id);
      if (!v) continue;
      const r = radiusOf(b.species);
      sphere.center.set(v.rx, v.ry + r * CY, v.rz);
      sphere.radius = r * 1.25;
      if (ray.intersectSphere(sphere, hit)) {
        const d = hit.distanceTo(ray.origin);
        if (!best || d < best.dist) best = { id: b.id, dist: d };
      }
    }
    return best;
  }

  update(world: World, alpha: number, time: number, dt: number, fx: number) {
    this.frameId++;
    const blobs = world.blobs;
    const n = Math.min(blobs.length, MAX);
    for (let i = 0; i < n; i++) this.updateOne(world, blobs[i], i, alpha, time, dt, fx);

    if (this.body.castShadow && n > CROWD_SHADOW_OFF) this.body.castShadow = false;
    else if (!this.body.castShadow && n < CROWD_SHADOW_ON) this.body.castShadow = true;
    for (const m of [this.body, this.smiles, this.ohs, this.shadows]) m.count = n;
    for (const m of [this.eyes, this.pupils, this.shines, this.cheeks]) m.count = n * 2;
    for (const m of [this.body, this.eyes, this.pupils, this.shines, this.smiles, this.ohs, this.cheeks, this.shadows]) {
      m.instanceMatrix.needsUpdate = true;
    }
    if (this.body.instanceColor) this.body.instanceColor.needsUpdate = true;

    if (this.frameId % 60 === 0) {
      for (const [id, v] of this.vis) if (v.frame !== this.frameId) this.vis.delete(id);
    }
  }

  private updateOne(world: World, b: Blob, i: number, alpha: number, time: number, dt: number, fx: number) {
    const p = world.params;
    const r = radiusOf(b.species);
    const face = FACES[b.species];
    let v = this.vis.get(b.id);
    if (!v) {
      const seed = (b.id * 9301 + 49297) % 233280;
      v = {
        frame: 0,
        lx: b.x,
        lz: b.y,
        rx: b.x,
        rz: b.y,
        rh: b.heading,
        ry: 0,
        rs: r,
        hop: seed % 7,
        move: 0,
        roll: 0,
        lastHeading: b.heading,
        blinkIn: 0.5 + (seed % 100) / 25,
        blinkT: 0,
        lookX: 0,
        lookY: 0,
        lookTX: 0,
        lookTY: 0,
        lookIn: 0,
        phase: (seed % 628) / 100,
        emitIn: (seed % 50) / 50,
        plump: 0.93 + ((seed >> 3) % 15) / 100,
        bounce: 0.75 + ((seed >> 5) % 56) / 100,
      };
      this.vis.set(b.id, v);
    }
    v.frame = this.frameId;

    const x = b.px + (b.x - b.px) * alpha;
    const z = b.py + (b.y - b.py) * alpha;
    const h = b.pheading + angleDiff(b.heading, b.pheading) * alpha;

    const dist = Math.hypot(x - v.lx, z - v.lz);
    v.lx = x;
    v.lz = z;
    const vel = dt > 0 ? dist / dt : 0;
    const k = 1 - Math.exp(-dt * 10);
    v.move += (clamp(vel / 1.1, 0, 1) - v.move) * k;
    v.hop += Math.min(dist, 1) * 5.4;
    const turn = dt > 0 ? angleDiff(h, v.lastHeading) / dt : 0;
    v.lastHeading = h;
    const idleTilt = (1 - v.move) * Math.sin(time * 0.6 + v.phase * 2) * 0.07;
    v.roll += (clamp(-turn * 0.04 + idleTilt, -0.22, 0.22) - v.roll) * (1 - Math.exp(-dt * 6));

    const hopS = Math.abs(Math.sin(v.hop));
    let y = hopS * 0.3 * r * v.move * v.bounce;
    let sy = (1 + (hopS - 0.4) * 0.16 * v.move * v.bounce) * (2 - v.plump);
    let sxz = v.plump;
    sy *= 1 + Math.sin(time * 2.4 + v.phase) * 0.028;
    let pitch = v.move * 0.15;
    let yawWobble = 0;
    let eyeOpen = 1;
    let eyeWide = 1;
    let mouthKind: "smile" | "oh" = "smile";
    let mouthOpen = 1;
    let scale = 1;

    const thr = copyThresholdOf(b.species, p);
    const eFrac = b.energy / thr;
    let fadeK = 1;

    v.lookIn -= dt;
    if (v.lookIn <= 0) {
      v.lookTX = (Math.random() - 0.5) * 1.4;
      v.lookTY = (Math.random() - 0.5) * 0.8;
      v.lookIn = 0.8 + Math.random() * 2.2;
    }

    let lookAt: { x: number; y: number } | null = null;
    if (b.targetId >= 0) {
      if (b.species === "blue" && (b.action === "seek" || b.action === "wait" || b.action === "eat")) {
        const t = world.trees[b.targetId];
        if (t) lookAt = { x: t.x, y: t.y };
      } else if (b.species === "red" && b.action === "chase") {
        const t = world.byId.get(b.targetId);
        if (t) lookAt = { x: t.x, y: t.y };
      }
    }
    if (lookAt) {
      const rel = angleDiff(Math.atan2(lookAt.y - z, lookAt.x - x), h);
      v.lookTX = clamp(-Math.sin(rel) * 1.6, -1, 1);
      v.lookTY = b.action === "wait" ? 0.8 : b.action === "eat" ? 0.3 : 0;
    }

    v.emitIn -= dt;
    switch (b.action) {
      case "eat": {
        const chew = 0.5 + 0.5 * Math.sin(time * 17 + v.phase);
        sy *= 1 - 0.07 * chew;
        sxz *= 1 + 0.04 * chew;
        pitch = 0.1 + 0.06 * chew;
        mouthKind = "oh";
        mouthOpen = 0.25 + 0.95 * chew;
        if (v.emitIn <= 0 && fx > 0) {
          v.emitIn = 0.22;
          const mx = x + Math.cos(h) * r;
          const mz = z + Math.sin(h) * r;
          this.particles.spawn({
            shape: SHAPE.dot,
            x: mx,
            y: r * CY,
            z: mz,
            vx: (Math.random() - 0.5) * 0.8,
            vy: 0.8 + Math.random() * 0.6,
            vz: (Math.random() - 0.5) * 0.8,
            size: 0.07,
            life: 0.5,
            gravity: -4,
            color: "#c8ef52",
          });
        }
        break;
      }
      case "pause": {
        eyeOpen = 0.12;
        sy *= 1 + Math.sin(time * 3.4 + v.phase) * 0.05;
        pitch = -0.04;
        if (v.emitIn <= 0 && fx > 0) {
          v.emitIn = 0.8;
          this.particles.spawn({
            shape: SHAPE.zzz,
            x: x + 0.15,
            y: r * 2 + 0.1,
            z,
            vx: 0.25,
            vy: 0.45,
            vz: 0,
            size: 0.32,
            life: 1.5,
            color: "#9fb3ff",
            grow: 0.6,
            sway: 1,
          });
        }
        break;
      }
      case "tired": {
        eyeOpen = 0.45;
        sy *= 0.92 + Math.sin(time * 9) * 0.03;
        pitch = -0.06;
        mouthKind = "oh";
        mouthOpen = 0.5 + 0.5 * Math.sin(time * 9);
        if (v.emitIn <= 0 && fx > 0) {
          v.emitIn = 0.45;
          this.particles.spawn({
            shape: SHAPE.dot,
            x: x + (Math.random() - 0.5) * r,
            y: r * 1.9,
            z: z + (Math.random() - 0.5) * r,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 0.9,
            vz: (Math.random() - 0.5) * 0.6,
            size: 0.09,
            life: 0.6,
            gravity: -5,
            color: "#9fd8ff",
          });
        }
        break;
      }
      case "startled": {
        const f = clamp(b.timer / Math.max(1e-3, b.timerTotal), 0, 1);
        yawWobble = Math.sin(time * 36) * 0.4 * f;
        eyeWide = 1.3;
        mouthKind = "oh";
        break;
      }
      case "hide":
        if (b.sheltered) {
          sy *= 0.8 + Math.sin(time * 22 + v.phase) * 0.012;
          sxz *= 1.08;
          pitch = -0.05;
          eyeOpen = 0.7;
          eyeWide = 1.12;
          mouthKind = "oh";
          mouthOpen = 0.3;
          v.lookTX = Math.sin(time * 2.1 + v.phase) * 0.95;
          v.lookTY = 0.25;
        } else {
          eyeWide = 1.2;
          mouthKind = "oh";
          mouthOpen = 0.8;
          pitch += 0.08;
        }
        break;
      case "flee":
        eyeWide = 1.2;
        mouthKind = "oh";
        mouthOpen = 0.8;
        pitch += 0.08;
        break;
      case "chase":
        eyeWide = 1.08;
        pitch += 0.07;
        break;
      case "lurk":
        sy *= 0.95;
        v.lookTX = Math.sin(time * 1.3 + v.phase) * 0.9;
        break;
      case "wait":
        if (v.move < 0.3) {
          const hope = Math.max(0, Math.sin(time * 4.2 + v.phase));
          y += hope * hope * 0.05 * r;
          sy *= 1 + hope * 0.03;
        }
        break;
      case "rest":
      case "lounge":
        eyeOpen = 0.55;
        sy *= 0.97 + Math.sin(time * 1.5 + v.phase) * 0.035;
        pitch -= 0.03;
        break;
      case "fade": {
        fadeK = clamp(b.timer / Math.max(1e-3, b.timerTotal), 0, 1);
        scale = fadeK * fadeK * (1 + Math.sin((1 - fadeK) * 18) * 0.08);
        y -= (1 - fadeK) * 0.35 * r;
        eyeOpen = 0.1;
        mouthKind = "oh";
        mouthOpen = 0.5;
        break;
      }
    }

    if (b.generation > 0 && b.age < 0.6 && b.action !== "fade") scale *= clamp(easeOutBack(b.age / 0.6), 0.05, 1.3);
    if (eFrac < 0.25 && b.action !== "fade") {
      pitch -= 0.06;
      sy *= 0.97;
    }

    v.blinkIn -= dt;
    if (v.blinkIn <= 0) {
      v.blinkT = 0.13;
      v.blinkIn = 1.6 + Math.random() * 4.2;
    }
    if (v.blinkT > 0) {
      v.blinkT -= dt;
      eyeOpen = Math.min(eyeOpen, 0.1);
    }
    const lk = 1 - Math.exp(-dt * 8);
    v.lookX += (v.lookTX - v.lookX) * lk;
    v.lookY += (v.lookTY - v.lookY) * lk;

    const col = this.col.copy(BASE[b.species]);
    if (eFrac < 0.3) col.lerp(HUNGRY_TINT, ((0.3 - Math.max(0, eFrac)) / 0.3) * 0.55);
    if (b.glow > 0) col.lerp(GLOW, Math.min(1, b.glow) * 0.4);
    if (b.sheltered) col.lerp(SHADE, 0.18);
    if (b.action === "fade") col.lerp(HUNGRY_TINT, 1 - fadeK);
    this.body.setColorAt(i, col);

    v.rx = x;
    v.rz = z;
    v.rh = h;
    v.ry = y;
    v.rs = r * scale;

    this.e.set(pitch, Math.PI / 2 - h + yawWobble, v.roll, "YXZ");
    this.q.setFromEuler(this.e);
    const rs = r * scale;
    this.bm.compose(this.p.set(x, y, z), this.q, this.s.set(rs * sxz, rs * sy, rs * sxz));
    this.body.setMatrixAt(i, this.bm);

    const shadowS = r * 2.3 * Math.max(0.05, scale) * (1 - hopS * 0.22 * v.move);
    this.lm.compose(this.lp.set(x, 0.015, z), this.flatQ, this.s.set(shadowS, shadowS, shadowS));
    this.shadows.setMatrixAt(i, this.lm);

    const eo = Math.max(0.06, eyeOpen);
    for (let s = 0; s < 2; s++) {
      const ep = face.eye[s];
      this.le.set(0, face.eyeYaw[s], face.eyeRoll[s]);
      this.lq.setFromEuler(this.le);
      const es = face.eyeScale;
      this.lm.compose(ep, this.lq, this.s.set(es.x * eyeWide, es.y * eyeWide * eo, es.z));
      this.om.multiplyMatrices(this.bm, this.lm);
      this.eyes.setMatrixAt(i * 2 + s, this.om);

      const px = ep.x + v.lookX * 0.055;
      const py = ep.y + v.lookY * 0.04 - (1 - eo) * 0.02;
      this.lp.set(px, py, ep.z + 0.085);
      const ps = eyeWide > 1.15 ? 0.85 : 1;
      this.lm.compose(this.lp, this.lq, this.s.set(0.11 * ps, 0.145 * ps * eo, 0.07));
      this.om.multiplyMatrices(this.bm, this.lm);
      this.pupils.setMatrixAt(i * 2 + s, this.om);

      if (eo > 0.5) {
        this.lp.set(px + 0.04, py + 0.055, ep.z + 0.14);
        this.lm.compose(this.lp, this.lq, this.s.set(0.036, 0.036, 0.02));
        this.om.multiplyMatrices(this.bm, this.lm);
        this.shines.setMatrixAt(i * 2 + s, this.om);
      } else {
        this.shines.setMatrixAt(i * 2 + s, this.zero);
      }

      this.le.set(0, face.cheekYaw[s], 0);
      this.lq.setFromEuler(this.le);
      this.lm.compose(face.cheek[s], this.lq, this.s.set(0.13, 0.075, 0.04));
      this.om.multiplyMatrices(this.bm, this.lm);
      this.cheeks.setMatrixAt(i * 2 + s, this.om);
    }

    const ms = face.mouthScale;
    if (mouthKind === "smile") {
      const wide = b.action === "pause" ? 1.25 : b.action === "rest" || b.action === "lounge" ? 1.12 : 1;
      this.lm.compose(face.mouth, this.lq.identity(), this.s.set(ms * wide, ms * wide, ms));
      this.om.multiplyMatrices(this.bm, this.lm);
      this.smiles.setMatrixAt(i, this.om);
      this.ohs.setMatrixAt(i, this.zero);
    } else {
      this.lp.copy(face.mouth);
      this.lp.y -= 0.03;
      this.lm.compose(this.lp, this.lq.identity(), this.s.set(0.075 * ms, 0.09 * ms * mouthOpen, 0.05));
      this.om.multiplyMatrices(this.bm, this.lm);
      this.ohs.setMatrixAt(i, this.om);
      this.smiles.setMatrixAt(i, this.zero);
    }
  }

  dispose() {
    for (const m of [this.body, this.eyes, this.pupils, this.shines, this.smiles, this.ohs, this.cheeks, this.shadows]) {
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
      m.dispose();
    }
  }
}
