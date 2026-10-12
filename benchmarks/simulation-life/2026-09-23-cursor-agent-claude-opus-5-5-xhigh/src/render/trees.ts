import * as THREE from "three";
import { RULES } from "../sim/params";
import { createRng } from "../sim/rng";
import type { Tree } from "../sim/types";
import { slotAngle, type World } from "../sim/world";

const LUMPS = 5;
const SLOTS = RULES.maxFruitSlots;
const FRUIT_R = 0.18;

interface Lump {
  pos: THREE.Vector3;
  r: number;
  color: THREE.Color;
}

interface TreeLayout {
  yaw: number;
  phase: number;
  trunkH: number;
  lumps: Lump[];
  slots: THREE.Vector3[];
  slotNormals: THREE.Vector3[];
  center: THREE.Vector3;
}

const CANOPY_TONES = ["#4caf62", "#43a35b", "#58b86c", "#3d9a57", "#61bd70"];
const UNRIPE = new THREE.Color("#7dae4a");
const RIPE = new THREE.Color("#c8ef52");

function layoutTree(t: Tree, seed: number): TreeLayout {
  const rng = createRng(seed * 977 + t.id * 131 + 3);
  const yaw = rng.next() * Math.PI * 2;
  const trunkH = 0.72 + rng.next() * 0.22;
  const base = new THREE.Color(rng.pick(CANOPY_TONES));
  const tone = (d: number) => base.clone().offsetHSL(rng.range(-0.015, 0.015), 0, d + rng.range(-0.03, 0.03));

  const lumps: Lump[] = [{ pos: new THREE.Vector3(0, trunkH + 0.5, 0), r: 0.74 + rng.next() * 0.1, color: tone(0) }];
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + rng.next() * 0.9;
    const off = 0.42 + rng.next() * 0.12;
    lumps.push({
      pos: new THREE.Vector3(Math.cos(a) * off, trunkH + 0.28 + rng.next() * 0.3, Math.sin(a) * off),
      r: 0.46 + rng.next() * 0.12,
      color: tone(-0.03),
    });
  }
  lumps.push({
    pos: new THREE.Vector3(rng.range(-0.12, 0.12), trunkH + 1.02 + rng.next() * 0.12, rng.range(-0.12, 0.12)),
    r: 0.42 + rng.next() * 0.08,
    color: tone(0.05),
  });

  const center = new THREE.Vector3(0, trunkH + 0.5, 0);
  const slots: THREE.Vector3[] = [];
  const slotNormals: THREE.Vector3[] = [];
  const dir = new THREE.Vector3();
  const oc = new THREE.Vector3();
  for (let s = 0; s < SLOTS; s++) {
    const az = slotAngle(s) + yaw;
    const elev = -0.5 + 0.95 * (((s * 0.618 + 0.21) % 1) * 0.9);
    dir.set(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev)).normalize();
    let far = 0;
    let hitLump = lumps[0];
    for (const l of lumps) {
      oc.copy(center).sub(l.pos);
      const b = oc.dot(dir);
      const c = oc.lengthSq() - l.r * l.r;
      const disc = b * b - c;
      if (disc < 0) continue;
      const tFar = -b + Math.sqrt(disc);
      if (tFar > far) {
        far = tFar;
        hitLump = l;
      }
    }
    const p = center.clone().addScaledVector(dir, far);
    const n = p.clone().sub(hitLump.pos).normalize();
    slots.push(p.addScaledVector(n, FRUIT_R * 0.45));
    slotNormals.push(n);
  }
  return { yaw, phase: rng.next() * Math.PI * 2, trunkH, lumps, slots, slotNormals, center };
}

const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export type MouthLookup = (blobId: number, out: THREE.Vector3) => boolean;

export class TreeLayer {
  readonly group = new THREE.Group();
  private layouts: TreeLayout[];
  private trunks: THREE.InstancedMesh;
  private canopy: THREE.InstancedMesh;
  private fruits: THREE.InstancedMesh;
  private leaves: THREE.InstancedMesh;
  private shake: Float32Array;
  private pop: Float32Array;
  private prevGrowth: Float32Array;
  private trees: Tree[];

  private m = new THREE.Matrix4();
  private tm = new THREE.Matrix4();
  private lm = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private tq = new THREE.Quaternion();
  private lq = new THREE.Quaternion();
  private e = new THREE.Euler();
  private leafE = new THREE.Euler();
  private v = new THREE.Vector3();
  private v2 = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();
  private mouth = new THREE.Vector3();

  constructor(world: World, seed: number) {
    this.trees = world.trees;
    this.layouts = world.trees.map((t) => layoutTree(t, seed));
    const n = world.trees.length;

    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.16, 1, 10).translate(0, 0.5, 0);
    this.trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: "#9a6b4b", roughness: 0.85 }), Math.max(1, n));
    this.trunks.castShadow = true;

    this.canopy = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 22, 16),
      new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0 }),
      Math.max(1, n * LUMPS),
    );
    this.canopy.castShadow = true;
    this.canopy.receiveShadow = true;

    this.fruits = new THREE.InstancedMesh(
      new THREE.SphereGeometry(1, 12, 10),
      new THREE.MeshPhysicalMaterial({ roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.2 }),
      Math.max(1, n * SLOTS),
    );
    this.fruits.castShadow = true;

    const leafGeo = new THREE.SphereGeometry(1, 6, 4);
    leafGeo.scale(0.5, 0.12, 1).translate(0, 0, 0.6);
    this.leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({ color: "#3f9a4a", roughness: 0.6 }), Math.max(1, n * SLOTS));

    this.trunks.count = n;
    this.canopy.count = n * LUMPS;
    this.fruits.count = n * SLOTS;
    this.leaves.count = n * SLOTS;
    this.shake = new Float32Array(n);
    this.pop = new Float32Array(n * SLOTS);
    this.prevGrowth = new Float32Array(n * SLOTS).fill(-1);

    for (let i = 0; i < n; i++) {
      for (let k = 0; k < LUMPS; k++) this.canopy.setColorAt(i * LUMPS + k, this.layouts[i].lumps[k].color);
      for (let s = 0; s < SLOTS; s++) this.fruits.setColorAt(i * SLOTS + s, RIPE);
    }
    this.group.add(this.trunks, this.canopy, this.fruits, this.leaves);
  }

  shakeTree(id: number, amount = 1) {
    if (id >= 0 && id < this.shake.length) this.shake[id] = Math.min(1.5, this.shake[id] + amount);
  }

  canopyCenter(id: number, out: THREE.Vector3): THREE.Vector3 {
    const t = this.trees[id];
    const l = this.layouts[id];
    return out.set(t.x, l.center.y * t.scale, t.y);
  }

  canopyRadius(id: number) {
    return 1.05 * this.trees[id].scale;
  }

  topOf(id: number) {
    const l = this.layouts[id];
    return (l.trunkH + 1.5) * this.trees[id].scale;
  }

  update(world: World, time: number, dt: number, mouthOf: MouthLookup) {
    const limit = Math.min(SLOTS, Math.round(world.params.fruitLimit));
    const { m, tm, lm, q, e, v, v2, s, c } = this;

    for (let i = 0; i < this.trees.length; i++) {
      const t = this.trees[i];
      const l = this.layouts[i];
      this.shake[i] *= Math.exp(-dt * 3.2);
      const sh = this.shake[i];
      const swayX = Math.sin(time * 0.9 + l.phase) * 0.018 + Math.sin(time * 27 + l.phase) * sh * 0.06;
      const swayZ = Math.cos(time * 0.7 + l.phase * 1.3) * 0.015 + Math.cos(time * 23 + l.phase) * sh * 0.05;
      e.set(swayX, -l.yaw, swayZ, "YXZ");
      this.tq.setFromEuler(e);
      tm.compose(v.set(t.x, 0, t.y), this.tq, s.set(t.scale, t.scale, t.scale));

      lm.compose(v.set(0, 0, 0), q.identity(), s.set(1, l.trunkH + 0.3, 1));
      this.trunks.setMatrixAt(i, m.multiplyMatrices(tm, lm));

      const breathe = 1 + Math.sin(time * 1.3 + l.phase) * 0.012;
      for (let k = 0; k < LUMPS; k++) {
        const lump = l.lumps[k];
        const r = lump.r * breathe * (1 + sh * 0.03 * Math.sin(time * 20 + k));
        lm.compose(lump.pos, q.identity(), s.set(r, r * 0.94, r));
        this.canopy.setMatrixAt(i * LUMPS + k, m.multiplyMatrices(tm, lm));
      }

      for (let si = 0; si < SLOTS; si++) {
        const idx = i * SLOTS + si;
        const slot = t.slots[si];
        let scale = 0;
        let ripeness = 1;
        v2.copy(l.slots[si]).applyMatrix4(tm);

        const prev = this.prevGrowth[idx];
        if (prev >= 0 && prev < 1 && slot.growth >= 1 && slot.claimedBy < 0) this.pop[idx] = 1;
        this.prevGrowth[idx] = slot.growth;
        this.pop[idx] *= Math.exp(-dt * 4);

        if (si < limit || slot.claimedBy >= 0) {
          if (slot.claimedBy >= 0) {
            const p = slot.eatProgress;
            if (mouthOf(slot.claimedBy, this.mouth)) {
              const travel = easeOutCubic(smooth(0, 0.32, p));
              v2.lerp(this.mouth, travel);
              v2.y += Math.sin(travel * Math.PI) * 0.25;
            }
            scale = FRUIT_R * t.scale * (0.18 + 0.82 * (1 - smooth(0.3, 1, p)));
          } else if (slot.cooldown <= 0) {
            const g = slot.growth;
            ripeness = g;
            scale = FRUIT_R * t.scale * (0.22 + 0.78 * easeOutCubic(g));
            scale *= 1 + this.pop[idx] * 0.45 * Math.sin((1 - this.pop[idx]) * Math.PI * 3);
          }
        }

        if (scale > 0) {
          lm.compose(v2, q.identity(), s.set(scale, scale * 1.06, scale));
          this.fruits.setMatrixAt(idx, lm);
          this.fruits.setColorAt(idx, c.copy(UNRIPE).lerp(RIPE, ripeness * ripeness));
          v.copy(l.slotNormals[si]).applyQuaternion(this.tq);
          this.leafE.set(-0.5, Math.atan2(v.x, v.z), 0, "YXZ");
          this.lq.setFromEuler(this.leafE);
          v2.addScaledVector(v, scale * 0.3);
          v2.y += scale * 0.85;
          lm.compose(v2, this.lq, s.set(scale * 0.7, scale, scale * 0.7));
          this.leaves.setMatrixAt(idx, lm);
        } else {
          lm.makeScale(0, 0, 0);
          this.fruits.setMatrixAt(idx, lm);
          this.leaves.setMatrixAt(idx, lm);
        }
      }
    }
    this.trunks.instanceMatrix.needsUpdate = true;
    this.canopy.instanceMatrix.needsUpdate = true;
    this.fruits.instanceMatrix.needsUpdate = true;
    this.leaves.instanceMatrix.needsUpdate = true;
    if (this.fruits.instanceColor) this.fruits.instanceColor.needsUpdate = true;
    if (this.canopy.instanceColor) this.canopy.instanceColor.needsUpdate = true;
  }

  /** Ray test against canopies; returns tree id and hit distance. */
  raycast(ray: THREE.Ray): { id: number; dist: number } | null {
    let best: { id: number; dist: number } | null = null;
    const center = new THREE.Vector3();
    const hit = new THREE.Vector3();
    for (let i = 0; i < this.trees.length; i++) {
      this.canopyCenter(i, center);
      const sphere = new THREE.Sphere(center, this.canopyRadius(i));
      if (ray.intersectSphere(sphere, hit)) {
        const d = hit.distanceTo(ray.origin);
        if (!best || d < best.dist) best = { id: i, dist: d };
      }
    }
    return best;
  }

  dispose() {
    for (const mesh of [this.trunks, this.canopy, this.fruits, this.leaves]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    }
  }
}
