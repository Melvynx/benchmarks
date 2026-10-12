import * as THREE from 'three';
import { bodyTexture, headTexture, shadowTexture } from './textures';
import { Particles } from './Particles';
import { buildAccessory } from './Accessories';
import { sfx } from '../audio/sfx';
import type { AccessoryId } from '../game/config';
import type { Mood } from '../game/logic';

const POSE_KEYS = [
  'bodyY',
  'squash',
  'lean',
  'roll',
  'headYaw',
  'headPitch',
  'headRoll',
  'mouth',
  'smile',
  'lid',
  'happy',
  'eyeX',
  'eyeY',
  'earL',
  'earR',
  'tailAmp',
  'tailSpeed',
  'blush',
  'puff',
  'brow',
  'browRaise',
  'tongue',
  'legFold',
  'wide',
  'red',
] as const;
type PoseKey = (typeof POSE_KEYS)[number];
type Pose = Record<PoseKey, number>;

const zeroPose = (): Pose => Object.fromEntries(POSE_KEYS.map((k) => [k, 0])) as Pose;

const RATES: Partial<Record<PoseKey, number>> = {
  bodyY: 14,
  squash: 18,
  lean: 7,
  roll: 10,
  headYaw: 8,
  headPitch: 9,
  headRoll: 8,
  mouth: 18,
  lid: 22,
  happy: 14,
  eyeX: 16,
  eyeY: 16,
  smile: 9,
  blush: 3,
  puff: 16,
  legFold: 3.2,
  wide: 14,
  tailAmp: 5,
  tailSpeed: 4,
  red: 4,
  brow: 10,
  browRaise: 12,
};

export type ReactionName =
  | 'hop'
  | 'shake'
  | 'nod'
  | 'jiggle'
  | 'wiggle'
  | 'boop'
  | 'spin'
  | 'yawn'
  | 'stretch'
  | 'rumble'
  | 'kick'
  | 'laugh'
  | 'flinch'
  | 'earflick'
  | 'tada';

const REACTION_DUR: Record<ReactionName, number> = {
  hop: 0.62,
  shake: 0.7,
  nod: 0.6,
  jiggle: 0.55,
  wiggle: 1.1,
  boop: 0.5,
  spin: 0.9,
  yawn: 1.7,
  stretch: 1.6,
  rumble: 1.0,
  kick: 0.4,
  laugh: 1.0,
  flinch: 0.4,
  earflick: 0.35,
  tada: 1.3,
};

interface Reaction {
  name: ReactionName;
  t: number;
  dur: number;
  flip: number;
}

export interface EatConfig {
  chews: number;
  sound: 'crunch' | 'munch' | 'slurp';
  loved: boolean;
  spicy: boolean;
  milk: boolean;
  onChew: (i: number) => void;
  onSwallow: () => void;
  onDone: () => void;
}

interface EatState {
  cfg: EatConfig;
  phase: 'chew' | 'swallow' | 'after';
  t: number;
  chewCount: number;
  lastHalf: boolean;
  swallowed: boolean;
}

const HEAD_R = new THREE.Vector3(0.81, 0.69, 0.71);
const HIP = 0.5;
const tmpV = new THREE.Vector3();
const tmpV2 = new THREE.Vector3();

function surface(dir: THREE.Vector3, radii: THREE.Vector3) {
  const k =
    1 / Math.sqrt((dir.x / radii.x) ** 2 + (dir.y / radii.y) ** 2 + (dir.z / radii.z) ** 2);
  const pos = dir.clone().multiplyScalar(k);
  const normal = new THREE.Vector3(pos.x / radii.x ** 2, pos.y / radii.y ** 2, pos.z / radii.z ** 2).normalize();
  return { pos, normal };
}

const shortest = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
};

const easeOut = (x: number) => 1 - (1 - x) * (1 - x);

export class Cowdie {
  readonly root = new THREE.Group();
  readonly hit: THREE.Mesh[] = [];
  readonly mouthAnchor = new THREE.Object3D();

  private rig = new THREE.Group();
  private torso = new THREE.Group();
  private inner = new THREE.Group();
  private neck = new THREE.Group();
  private head = new THREE.Group();
  private bodyMesh!: THREE.Mesh;
  private legs: { pivot: THREE.Group; phase: number }[] = [];
  private tail: THREE.Group[] = [];
  private earPivot: THREE.Group[] = [];
  private eyes: {
    ball: THREE.Group;
    lid: THREE.Mesh;
    arc: THREE.Mesh;
    parts: THREE.Object3D[];
    socket: THREE.Group;
    side: number;
  }[] = [];
  private brows: THREE.Mesh[] = [];
  private browBase: number[] = [];
  private cheeks: THREE.Mesh[] = [];
  private muzzle!: THREE.Mesh;
  private chin!: THREE.Mesh;
  private cavity!: THREE.Mesh;
  private tongueMesh!: THREE.Mesh;
  private smileMesh!: THREE.Mesh;
  private stache!: THREE.Mesh;
  private bell!: THREE.Group;
  private shadow!: THREE.Mesh;
  private accessory: THREE.Group | null = null;
  private accessoryId: AccessoryId | null = null;
  private tintMats: THREE.MeshStandardMaterial[] = [];
  private muzzleMat!: THREE.MeshStandardMaterial;
  private horns: THREE.Group[] = [];

  private target = zeroPose();
  private cur = zeroPose();
  private out = zeroPose();
  private reactions: Reaction[] = [];

  mood: Mood = 'content';
  private sleeping = false;
  private fullness = 60;
  private clean = 90;
  private scaleCur = 0.9;
  private scaleTarget = 0.9;

  yaw = 0;
  faceYaw = 0;
  private yawAdd = 0;
  private walking = false;
  private walkTarget = new THREE.Vector2();
  private walkSpeed = 1.5;
  private walkAmt = 0;
  private legPhase = 0;
  private lastStepSign = 1;
  onStep: (() => void) | null = null;

  private lookPoint: THREE.Vector3 | null = null;
  private lookWeight = 0;
  private anticipate = 0;
  private excite = 0;
  private petting = false;
  private petLean = 0;
  private washing = false;
  private eatState: EatState | null = null;
  private refuseT = 0;
  private spicyT = 0;
  private stacheT = 0;

  private blinkT = 2 + Math.random() * 2;
  private blinkPhase = -1;
  private earFlickT = 3;
  private tearT = 1;
  private sweatT = 2;
  private snoreT = 1.5;
  private zzzT = 0.8;
  private stinkT = 0.5;
  private rumbleT = 6;
  private time = 0;

  constructor(private fx: Particles) {
    this.build();
    this.setLevel(1, true);
  }

  private build() {
    const SPH = new THREE.SphereGeometry(1, 40, 28);
    const SPH_S = new THREE.SphereGeometry(1, 20, 14);

    const bodyMat = new THREE.MeshStandardMaterial({ map: bodyTexture(), roughness: 0.66 });
    const headMat = new THREE.MeshStandardMaterial({ map: headTexture(), roughness: 0.66 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfff6e8, roughness: 0.66 });
    this.tintMats = [bodyMat, headMat, skinMat];
    this.muzzleMat = new THREE.MeshStandardMaterial({ color: 0xffb3ba, roughness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x3b3036, roughness: 0.6 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xf6dfae, roughness: 0.42 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x4a3a3f, roughness: 0.5 });

    const ell = (
      geo: THREE.BufferGeometry,
      mat: THREE.Material,
      s: [number, number, number],
      p: [number, number, number] = [0, 0, 0],
      shadow = true,
    ) => {
      const m = new THREE.Mesh(geo, mat);
      m.scale.set(...s);
      m.position.set(...p);
      m.castShadow = shadow;
      return m;
    };

    this.root.add(this.rig);
    this.rig.add(this.torso);
    this.torso.position.y = HIP;
    this.torso.add(this.inner);
    this.inner.position.y = -HIP;

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: 0.9 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    shadow.scale.set(2.6, 3.0, 1);
    shadow.renderOrder = 1;
    this.shadow = shadow;
    this.root.add(shadow);

    // Body
    this.bodyMesh = ell(SPH, bodyMat, [0.62, 0.56, 0.78], [0, 0.78, 0]);
    this.bodyMesh.userData.part = 'body';
    this.bodyMesh.receiveShadow = true;
    this.inner.add(this.bodyMesh);
    this.hit.push(this.bodyMesh);

    // Legs
    const legPos: [number, number, number][] = [
      [0.34, 0.5, 0.42],
      [-0.34, 0.5, 0.42],
      [0.36, 0.5, -0.46],
      [-0.36, 0.5, -0.46],
    ];
    const legPhases = [0, Math.PI, Math.PI, 0];
    legPos.forEach((p, i) => {
      const pivot = new THREE.Group();
      pivot.position.set(...p);
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.17, 6, 14), skinMat);
      leg.position.y = -0.24;
      leg.castShadow = true;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.165, 0.1, 16), hoofMat);
      hoof.position.y = -0.45;
      hoof.castShadow = true;
      pivot.add(leg, hoof);
      this.rig.add(pivot);
      this.legs.push({ pivot, phase: legPhases[i] });
    });

    // Tail
    const tail0 = new THREE.Group();
    tail0.position.set(0, 0.92, -0.72);
    tail0.rotation.x = 0.45;
    this.inner.add(tail0);
    let parent: THREE.Group = tail0;
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.13, 4, 8), skinMat);
      seg.position.y = -0.11;
      seg.castShadow = true;
      parent.add(seg);
      this.tail.push(parent);
      const next = new THREE.Group();
      next.position.y = -0.2;
      parent.add(next);
      parent = next;
    }
    const tuft = ell(SPH_S, darkMat, [0.1, 0.17, 0.1], [0, -0.14, 0]);
    parent.add(tuft);
    this.tail.push(parent);

    // Collar and bell
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.05, 10, 40, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: 0xe8494f, roughness: 0.45 }));
    collar.rotation.set(Math.PI / 2 + 0.35, 0, Math.PI * 0.9 - 0.0);
    collar.position.set(0, 0.8, 0.36);
    this.inner.add(collar);
    this.bell = new THREE.Group();
    const bellMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 20, 14),
      new THREE.MeshStandardMaterial({ color: 0xffcf3f, roughness: 0.25, metalness: 0.8 }),
    );
    bellMesh.castShadow = true;
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.014, 0.02), new THREE.MeshBasicMaterial({ color: 0x6b4a10 }));
    slit.position.set(0, -0.03, 0.095);
    this.bell.add(bellMesh, slit);
    this.bell.position.set(0, 0.5, 0.9);
    this.inner.add(this.bell);

    // Neck & head
    this.neck.position.set(0, 0.98, 0.4);
    this.inner.add(this.neck);
    this.head.position.set(0, 0.3, 0.1);
    this.neck.add(this.head);

    const headMesh = ell(SPH, headMat, [HEAD_R.x, HEAD_R.y, HEAD_R.z]);
    headMesh.userData.part = 'head';
    this.head.add(headMesh);
    this.hit.push(headMesh);

    // Muzzle
    this.muzzle = ell(SPH, this.muzzleMat, [0.475, 0.274, 0.342], [0, -0.22, 0.5]);
    this.muzzle.userData.part = 'nose';
    this.head.add(this.muzzle);
    this.hit.push(this.muzzle);

    this.chin = ell(SPH, this.muzzleMat, [0.3, 0.15, 0.26], [0, -0.44, 0.46]);
    this.head.add(this.chin);

    this.cavity = ell(SPH_S, new THREE.MeshStandardMaterial({ color: 0x4a1622, roughness: 0.8 }), [0.2, 0.02, 0.12], [0, -0.37, 0.72], false);
    this.head.add(this.cavity);
    this.tongueMesh = ell(SPH_S, new THREE.MeshStandardMaterial({ color: 0xff7d92, roughness: 0.45 }), [0.12, 0.04, 0.1], [0, -0.42, 0.74], false);
    this.head.add(this.tongueMesh);

    const nostrilMat = new THREE.MeshStandardMaterial({ color: 0x8a3f52, roughness: 0.5 });
    [-1, 1].forEach((s) => {
      this.head.add(ell(SPH_S, nostrilMat, [0.05, 0.07, 0.035], [s * 0.15, -0.14, 0.81], false));
    });

    this.smileMesh = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.017, 8, 24, Math.PI), new THREE.MeshBasicMaterial({ color: 0x7a3a4b }));
    this.smileMesh.rotation.z = Math.PI;
    this.smileMesh.position.set(0, -0.29, 0.79);
    this.head.add(this.smileMesh);

    this.stache = ell(SPH_S, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, transparent: true }), [0.3, 0.07, 0.07], [0, -0.26, 0.8], false);
    this.stache.visible = false;
    this.head.add(this.stache);

    // Cheeks
    [-1, 1].forEach((s) => {
      const { pos, normal } = surface(new THREE.Vector3(s * 0.58, -0.14, 0.5), HEAD_R);
      const cheek = new THREE.Mesh(
        new THREE.CircleGeometry(0.15, 20),
        new THREE.MeshBasicMaterial({ color: 0xff7d9a, transparent: true, opacity: 0, depthWrite: false }),
      );
      cheek.position.copy(pos).addScaledVector(normal, 0.006);
      cheek.lookAt(pos.clone().add(normal));
      cheek.scale.set(1.15, 0.8, 1);
      this.head.add(cheek);
      this.cheeks.push(cheek);
    });

    // Eyes
    const eyeDark = new THREE.MeshStandardMaterial({ color: 0x1e1418, roughness: 0.25 });
    const irisMat = new THREE.MeshStandardMaterial({ color: 0x6a3b2c, roughness: 0.3 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x0c0709 });
    const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const capGeo = (r: number, theta: number) => {
      const g = new THREE.SphereGeometry(r, 24, 14, 0, Math.PI * 2, 0, theta);
      g.rotateX(Math.PI / 2);
      return g;
    };
    const irisGeo = capGeo(0.1515, 0.78);
    const pupilGeo = capGeo(0.1525, 0.4);
    const lidGeo = capGeo(0.162, 1.4);
    [1, -1].forEach((s) => {
      const socket = new THREE.Group();
      const { pos } = surface(new THREE.Vector3(s * 0.34, 0.13, 0.6), HEAD_R);
      socket.position.copy(pos).add(new THREE.Vector3(0, 0, 0.0));
      socket.rotation.y = s * 0.28;
      const ball = new THREE.Group();
      ball.scale.set(1, 1.2, 0.85);
      ball.add(new THREE.Mesh(new THREE.SphereGeometry(0.15, 28, 20), eyeDark));
      ball.add(new THREE.Mesh(irisGeo, irisMat));
      ball.add(new THREE.Mesh(pupilGeo, pupilMat));
      socket.add(ball);
      const shine1 = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 10), shineMat);
      shine1.position.set(-0.048, 0.075, 0.1);
      shine1.scale.set(1, 1, 0.5);
      const shine2 = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), shineMat);
      shine2.position.set(0.055, -0.06, 0.105);
      shine2.scale.set(1, 1, 0.5);
      socket.add(shine1, shine2);
      const lid = new THREE.Mesh(lidGeo, headMat.clone());
      lid.scale.set(1, 1.2, 0.85);
      lid.rotation.x = -2.4;
      (lid.material as THREE.MeshStandardMaterial).map = null;
      (lid.material as THREE.MeshStandardMaterial).color.set(0xfff6e8);
      this.tintMats.push(lid.material as THREE.MeshStandardMaterial);
      socket.add(lid);
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.03, 8, 20, Math.PI), new THREE.MeshBasicMaterial({ color: 0x2a1a20 }));
      arc.position.set(0, -0.02, 0.1);
      arc.visible = false;
      socket.add(arc);
      this.head.add(socket);
      this.eyes.push({ ball, lid, arc, parts: [shine1, shine2], socket, side: s });
    });

    // Brows
    const browMat = new THREE.MeshStandardMaterial({ color: 0x4a3a3f, roughness: 0.6 });
    [1, -1].forEach((s) => {
      const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.13, 4, 8), browMat);
      b.rotation.z = Math.PI / 2;
      const holder = new THREE.Group();
      const { pos } = surface(new THREE.Vector3(s * 0.34, 0.4, 0.5), HEAD_R);
      holder.position.copy(pos).add(new THREE.Vector3(0, 0.005, 0.012));
      holder.rotation.x = -0.45;
      holder.add(b);
      this.head.add(holder);
      this.brows.push(b);
      this.browBase.push(holder.position.y);
    });

    // Ears
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xffb7c1, roughness: 0.55 });
    [1, -1].forEach((s) => {
      const pivot = new THREE.Group();
      pivot.position.set(s * 0.7, 0.3, -0.06);
      const ear = ell(SPH_S, s > 0 ? darkMat : skinMat, [0.36, 0.2, 0.1], [s * 0.26, 0, 0]);
      ear.userData.part = 'ear';
      const inn = ell(SPH_S, innerMat, [0.27, 0.14, 0.03], [s * 0.26, 0, 0.075], false);
      pivot.add(ear, inn);
      this.head.add(pivot);
      this.earPivot.push(pivot);
      this.hit.push(ear);
    });

    // Horns and tuft
    [1, -1].forEach((s) => {
      const holder = new THREE.Group();
      holder.position.set(s * 0.36, 0.58, -0.02);
      holder.rotation.z = -s * 0.5;
      holder.rotation.x = 0.1;
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.095, 0.36, 16), hornMat);
      horn.position.y = 0.16;
      horn.castShadow = true;
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), hornMat);
      tip.position.y = 0.34;
      holder.add(horn, tip);
      this.head.add(holder);
      this.horns.push(holder);
    });
    for (let i = -1; i <= 1; i++) {
      const tuftCone = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 8), darkMat);
      tuftCone.position.set(i * 0.06, 0.7, 0.14);
      tuftCone.rotation.set(0.35, 0, -i * 0.35);
      tuftCone.castShadow = true;
      this.head.add(tuftCone);
    }

    this.mouthAnchor.position.set(0, -0.36, 0.86);
    this.head.add(this.mouthAnchor);

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.receiveShadow = o !== this.shadow;
    });
    this.shadow.receiveShadow = false;
  }

  // ---------- public state setters ----------

  setStats(s: { fullness: number; clean: number }) {
    this.fullness = s.fullness;
    this.clean = s.clean;
  }

  setMood(m: Mood) {
    this.mood = m;
  }

  setSleeping(s: boolean) {
    this.sleeping = s;
    if (s) {
      this.walking = false;
      this.anticipate = 0;
      this.excite = 0;
    }
  }

  get isSleeping() {
    return this.sleeping;
  }

  setLevel(level: number, instant = false) {
    this.scaleTarget = 0.84 + Math.min(level - 1, 9) * 0.034;
    const horn = 0.85 + Math.min(level - 1, 9) * 0.06;
    this.horns.forEach((h) => h.scale.setScalar(horn));
    if (instant) this.scaleCur = this.scaleTarget;
  }

  setAccessory(id: AccessoryId | null) {
    if (id === this.accessoryId) return;
    if (this.accessory) {
      this.head.remove(this.accessory);
      this.accessory.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry.dispose();
          (Array.isArray(m.material) ? m.material : [m.material]).forEach((x) => x.dispose());
        }
      });
      this.accessory = null;
    }
    this.accessoryId = id;
    if (id) {
      this.accessory = buildAccessory(id);
      this.head.add(this.accessory);
    }
  }

  lookAt(p: THREE.Vector3 | null) {
    this.lookPoint = p ? (this.lookPoint ?? new THREE.Vector3()).copy(p) : null;
  }

  setAnticipation(v: number) {
    this.anticipate = v;
  }

  setExcited(v: number) {
    this.excite = v;
  }

  setPetting(active: boolean, lean = 0) {
    this.petting = active;
    this.petLean = lean;
  }

  setWashing(active: boolean) {
    this.washing = active;
  }

  get position() {
    return this.root.position;
  }

  get isWalking() {
    return this.walking;
  }

  get isEating() {
    return this.eatState !== null;
  }

  get isBusy() {
    return this.eatState !== null || this.refuseT > 0;
  }

  get scale() {
    return this.scaleCur;
  }

  walkTo(x: number, z: number, speed = 1.5) {
    if (this.sleeping || this.eatState) return;
    this.walkTarget.set(x, z);
    this.walkSpeed = speed;
    this.walking = true;
  }

  stopWalking() {
    this.walking = false;
  }

  react(name: ReactionName) {
    const dur = REACTION_DUR[name];
    const existing = this.reactions.find((r) => r.name === name);
    if (existing) {
      existing.t = 0;
      return;
    }
    this.reactions.push({ name, t: 0, dur, flip: Math.random() > 0.5 ? 1 : -1 });
    if (name === 'rumble') sfx.tummy();
    if (name === 'yawn') sfx.yawn();
  }

  refuse() {
    this.refuseT = 0.9;
    this.react('shake');
    sfx.nope();
  }

  eat(cfg: EatConfig) {
    this.eatState = { cfg, phase: 'chew', t: 0, chewCount: 0, lastHalf: false, swallowed: false };
    this.anticipate = 0;
    this.stopWalking();
  }

  headWorld(out = new THREE.Vector3()) {
    return this.head.getWorldPosition(out);
  }

  mouthWorld(out = new THREE.Vector3()) {
    return this.mouthAnchor.getWorldPosition(out);
  }

  earWorld(side: 0 | 1, out = new THREE.Vector3()) {
    tmpV.set(side === 0 ? 0.95 : -0.95, 0.35, 0);
    return this.head.localToWorld(out.copy(tmpV));
  }

  bellyWorld(out = new THREE.Vector3()) {
    tmpV.set(0, 0.6, 0.2);
    return this.inner.localToWorld(out.copy(tmpV));
  }

  topWorld(out = new THREE.Vector3()) {
    tmpV.set(0, 1.1, 0);
    return this.head.localToWorld(out.copy(tmpV));
  }

  // ---------- update ----------

  update(dt: number) {
    this.time += dt;
    const t = this.time;
    this.updateLocomotion(dt);
    this.computeTarget(dt);
    this.smooth(dt);
    this.applyReactions(dt);
    this.applyPose(dt, t);
    this.ambientFx(dt);
  }

  private updateLocomotion(dt: number) {
    const s = this.scaleCur;
    let moving = false;
    let desired = this.faceYaw;
    if (this.walking && !this.sleeping) {
      const dx = this.walkTarget.x - this.root.position.x;
      const dz = this.walkTarget.y - this.root.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.08) {
        this.walking = false;
      } else {
        desired = Math.atan2(dx, dz);
        const turn = Math.abs(shortest(this.yaw, desired));
        const speedMul = turn > 1.1 ? 0.15 : turn > 0.5 ? 0.6 : 1;
        const step = Math.min(d, this.walkSpeed * s * dt * speedMul);
        this.root.position.x += (dx / d) * step;
        this.root.position.z += (dz / d) * step;
        moving = speedMul > 0.3;
      }
    }
    this.yaw += shortest(this.yaw, desired) * Math.min(1, dt * (this.walking ? 7 : 4.5));
    this.walkAmt += ((moving ? 1 : 0) - this.walkAmt) * Math.min(1, dt * 9);
    if (moving) this.legPhase += dt * this.walkSpeed * 4.4;

    const sgn = Math.sin(this.legPhase) >= 0 ? 1 : -1;
    if (moving && sgn !== this.lastStepSign) {
      this.onStep?.();
      sfx.bell();
    }
    this.lastStepSign = sgn;
  }

  private computeTarget(dt: number) {
    const p = zeroPose();
    p.tailAmp = 0.3;
    p.tailSpeed = 2.4;
    p.smile = 0.4;
    p.earL = 0.05;
    p.earR = 0.05;
    p.blush = 0.22;

    switch (this.mood) {
      case 'happy':
        p.smile = 1;
        p.blush = 0.65;
        p.tailAmp = 0.55;
        p.tailSpeed = 5.5;
        p.earL = -0.22;
        p.earR = -0.22;
        p.browRaise = 0.25;
        break;
      case 'hungry':
        p.smile = -0.45;
        p.earL = 0.55;
        p.earR = 0.55;
        p.brow = 0.85;
        p.lid = 0.16;
        p.tailAmp = 0.06;
        p.headPitch = 0.14;
        p.blush = 0;
        break;
      case 'sleepy':
        p.lid = 0.48;
        p.smile = 0.05;
        p.earL = 0.35;
        p.earR = 0.35;
        p.headPitch = 0.16;
        p.tailAmp = 0.06;
        p.brow = 0.25;
        break;
      case 'dirty':
        p.smile = -0.2;
        p.earL = 0.32;
        p.earR = 0.32;
        p.brow = 0.35;
        p.tailAmp = 0.12;
        p.blush = 0;
        break;
      case 'sad':
        p.smile = -0.85;
        p.earL = 0.75;
        p.earR = 0.75;
        p.brow = 1;
        p.lid = 0.22;
        p.headPitch = 0.2;
        p.tailAmp = 0;
        p.blush = 0;
        break;
      default:
        break;
    }

    if (this.sleeping) {
      p.lid = 1;
      p.happy = -1;
      p.smile = 0.3;
      p.earL = 0.5;
      p.earR = 0.5;
      p.legFold = 1;
      p.bodyY = -0.02;
      p.headPitch = 0.42;
      p.headRoll = 0.16;
      p.tailAmp = 0.04;
      p.tailSpeed = 1;
      p.brow = 0;
      p.blush = 0.35;
      p.mouth = 0.06;
    }

    if (this.excite > 0) {
      p.wide = 0.5 * this.excite;
      p.smile = 1;
      p.mouth = 0.2 * this.excite;
      p.tongue = this.excite;
      p.earL = -0.3;
      p.earR = -0.3;
      p.tailAmp = 0.9;
      p.tailSpeed = 10;
      p.browRaise = 0.4;
      p.lid = 0;
      p.brow = 0;
      p.blush = 0.55;
    }

    if (this.anticipate > 0 && !this.eatState && !this.sleeping) {
      const a = this.anticipate;
      p.mouth = Math.max(p.mouth, 0.18 + 0.72 * a);
      p.wide = Math.max(p.wide, 0.9 * a);
      p.headPitch -= 0.14 * a;
      p.smile = Math.max(p.smile, 0.8);
      p.earL = Math.min(p.earL, -0.2 * a);
      p.earR = Math.min(p.earR, -0.2 * a);
      p.tailAmp = Math.max(p.tailAmp, 0.8);
      p.tailSpeed = Math.max(p.tailSpeed, 8);
      p.lid = 0;
      p.brow = 0;
      p.browRaise = 0.6 * a;
      p.tongue = 0.5 * a;
    }

    if (this.petting && !this.sleeping) {
      p.happy = 1;
      p.smile = 1;
      p.blush = 1;
      p.lid = 0;
      p.earL = 0.28;
      p.earR = 0.28;
      p.tailAmp = 0.7;
      p.tailSpeed = 6.5;
      p.headRoll = this.petLean * 0.22;
      p.headPitch = 0.05;
      p.brow = 0;
    }

    if (this.washing && !this.sleeping) {
      p.happy = 1;
      p.smile = 1;
      p.blush = 0.6;
      p.lid = 0;
      p.earL = 0.2;
      p.earR = 0.2;
      p.tailAmp = 0.6;
      p.tailSpeed = 6;
    }

    if (this.refuseT > 0) {
      this.refuseT -= dt;
      p.mouth = 0;
      p.smile = -0.5;
      p.brow = -0.7;
      p.lid = 0.3;
      p.tongue = 0;
      p.headPitch = 0.05;
    }

    if (this.spicyT > 0) {
      this.spicyT -= dt;
      p.wide = 1;
      p.red = 1;
      p.mouth = 0.55;
      p.smile = -0.3;
      p.blush = 1;
      p.brow = -1;
      p.earL = -0.6;
      p.earR = -0.6;
      p.tailAmp = 1;
      p.tailSpeed = 14;
      p.lid = 0;
    }

    const e = this.eatState;
    if (e) {
      e.t += dt;
      const cfg = e.cfg;
      if (e.phase === 'chew') {
        const dur = cfg.sound === 'slurp' ? 0.7 : 0.4;
        const c = e.t / dur;
        const cyc = c % 1;
        if (cfg.sound === 'slurp') {
          p.mouth = 0.42;
          p.headPitch = -0.34;
          p.puff = 0.2 + 0.4 * Math.abs(Math.sin(c * Math.PI * 2));
        } else {
          p.mouth = 0.05 + 0.32 * (0.5 + 0.5 * Math.cos(cyc * Math.PI * 2));
          p.headPitch = 0.07 * Math.sin(cyc * Math.PI * 2);
          p.squash = 0.03 * Math.cos(cyc * Math.PI * 2);
          p.puff = 0.55 + 0.45 * Math.sin(cyc * Math.PI * 2);
        }
        p.happy = cfg.loved ? 1 : 0.0;
        p.lid = cfg.loved ? 0 : 0.42;
        p.smile = 0.8;
        p.blush = 0.8;
        p.brow = 0;
        p.earL = -0.1;
        p.earR = -0.1;
        p.tailAmp = 0.7;
        p.tailSpeed = 7;
        p.tongue = 0;
        const half = cyc > 0.5;
        if (cfg.sound !== 'slurp' && half && !e.lastHalf) {
          e.chewCount += 1;
          cfg.onChew(e.chewCount);
          this.react('jiggle');
        }
        if (cfg.sound === 'slurp' && c >= e.chewCount + 1 && c > 0.9) {
          e.chewCount += 1;
          cfg.onChew(e.chewCount);
        }
        e.lastHalf = half;
        if (e.chewCount >= cfg.chews) {
          e.phase = 'swallow';
          e.t = 0;
        }
      } else if (e.phase === 'swallow') {
        p.mouth = 0;
        p.puff = 0;
        p.headPitch = -0.28 * Math.sin(Math.min(1, e.t / 0.3) * Math.PI * 0.5);
        p.lid = 1;
        p.smile = 0.7;
        p.blush = 0.9;
        p.squash = 0.06 * Math.sin(Math.min(1, e.t / 0.5) * Math.PI);
        if (!e.swallowed && e.t > 0.22) {
          e.swallowed = true;
          sfx.gulp();
          cfg.onSwallow();
          if (cfg.spicy) this.spicyT = 3.2;
        }
        if (e.t > 0.55) {
          e.phase = 'after';
          e.t = 0;
          if (cfg.milk) {
            this.stacheT = 22;
            sfx.burp();
          }
          if (cfg.loved) {
            this.react('wiggle');
            this.react('hop');
          } else if (!cfg.spicy) {
            this.react('nod');
          }
          this.fx.hearts(this.topWorld(tmpV2), cfg.loved ? 7 : 3, 0.6);
        }
      } else {
        p.happy = 1;
        p.smile = 1;
        p.blush = 1;
        p.mouth = 0;
        p.lid = 0;
        p.tailAmp = 0.9;
        p.tailSpeed = 8;
        p.earL = -0.15;
        p.earR = -0.15;
        if (e.t > (cfg.spicy ? 2.6 : cfg.loved ? 1.5 : 0.9)) {
          this.eatState = null;
          cfg.onDone();
        }
      }
    }

    // Gaze
    const lw = this.lookWeight;
    if (this.lookPoint && !this.sleeping) {
      this.lookWeight += (1 - lw) * Math.min(1, dt * 6);
      this.root.updateWorldMatrix(true, false);
      this.head.getWorldPosition(tmpV);
      tmpV2.copy(this.lookPoint);
      tmpV2.sub(tmpV);
      const cosY = Math.cos(this.root.rotation.y);
      const sinY = Math.sin(this.root.rotation.y);
      const lx = tmpV2.x * cosY - tmpV2.z * sinY;
      const lz = tmpV2.x * sinY + tmpV2.z * cosY;
      const yaw = Math.atan2(lx, lz);
      const pitch = Math.atan2(-tmpV2.y, Math.hypot(lx, lz));
      const yawC = THREE.MathUtils.clamp(yaw, -1.15, 1.15);
      const pitchC = THREE.MathUtils.clamp(pitch, -0.55, 0.5);
      const w = this.lookWeight;
      p.headYaw += yawC * 0.7 * w;
      p.headPitch += pitchC * 0.55 * w;
      p.eyeX = THREE.MathUtils.clamp((yaw - yawC * 0.7) / 0.5, -1, 1) * w;
      p.eyeY = -THREE.MathUtils.clamp((pitch - pitchC * 0.55) / 0.5, -1, 1) * w;
    } else {
      this.lookWeight += (0 - lw) * Math.min(1, dt * 4);
    }

    Object.assign(this.target, p);
  }

  private smooth(dt: number) {
    for (const k of POSE_KEYS) {
      const rate = RATES[k] ?? 8;
      this.cur[k] += (this.target[k] - this.cur[k]) * (1 - Math.exp(-rate * dt));
    }
  }

  private applyReactions(dt: number) {
    const o = this.out;
    for (const k of POSE_KEYS) o[k] = this.cur[k];
    this.yawAdd = 0;
    for (let i = this.reactions.length - 1; i >= 0; i--) {
      const r = this.reactions[i];
      r.t += dt;
      const u = r.t / r.dur;
      if (u >= 1) {
        this.reactions.splice(i, 1);
        continue;
      }
      const sinU = Math.sin(Math.PI * u);
      const fade = 1 - u;
      switch (r.name) {
        case 'hop':
          o.bodyY += sinU * 0.55;
          o.squash +=
            -0.18 * Math.exp(-(((u - 0.0) / 0.1) ** 2)) + 0.1 * sinU - 0.15 * Math.exp(-(((u - 1) / 0.09) ** 2));
          break;
        case 'shake':
          o.headYaw += Math.sin(u * Math.PI * 6) * 0.55 * fade;
          break;
        case 'nod':
          o.headPitch += Math.sin(u * Math.PI * 4) * 0.2 * fade;
          break;
        case 'jiggle':
          o.roll += Math.sin(u * Math.PI * 8) * 0.07 * fade * r.flip;
          o.squash += Math.sin(u * Math.PI * 8) * 0.045 * fade;
          break;
        case 'wiggle':
          o.roll += Math.sin(u * Math.PI * 10) * 0.16 * sinU;
          o.headRoll += Math.sin(u * Math.PI * 10 + 1) * 0.14 * sinU;
          o.bodyY += Math.abs(Math.sin(u * Math.PI * 5)) * 0.1 * sinU;
          break;
        case 'boop':
          o.headPitch += -0.3 * sinU;
          o.wide += sinU;
          o.squash += 0.05 * sinU;
          break;
        case 'spin':
          this.yawAdd += easeOut(u) * Math.PI * 2 * r.flip;
          o.bodyY += sinU * 0.35;
          o.squash += 0.08 * sinU;
          break;
        case 'yawn':
          o.mouth += Math.pow(sinU, 0.6) * 1.0;
          o.headPitch += -0.28 * sinU;
          o.lid += 0.7 * sinU;
          o.squash += 0.05 * sinU;
          break;
        case 'stretch':
          o.lean += 0.32 * Math.sin(Math.min(1, u * 1.4) * Math.PI);
          o.headPitch += -0.25 * sinU;
          o.squash += -0.05 * sinU;
          o.mouth += 0.5 * Math.pow(sinU, 2);
          o.lid += 0.6 * sinU;
          break;
        case 'rumble':
          o.squash += Math.sin(u * Math.PI * 14) * 0.02 * sinU;
          o.headPitch += 0.15 * sinU;
          break;
        case 'kick':
          o.headPitch += 0.55 * sinU;
          o.lean += 0.25 * sinU;
          break;
        case 'laugh':
          o.happy = Math.max(o.happy, 1);
          o.mouth += 0.6 * sinU;
          o.headPitch += -0.2 * sinU;
          o.squash += Math.sin(u * Math.PI * 10) * 0.05 * sinU;
          o.roll += Math.sin(u * Math.PI * 8) * 0.06 * sinU;
          o.lid = 0;
          break;
        case 'flinch':
          o.squash += -0.12 * sinU;
          o.wide += sinU;
          o.headPitch += -0.15 * sinU;
          break;
        case 'earflick':
          o.earL += Math.sin(u * Math.PI * 4) * 0.5 * fade * (r.flip > 0 ? 1 : 0);
          o.earR += Math.sin(u * Math.PI * 4) * 0.5 * fade * (r.flip < 0 ? 1 : 0);
          break;
        case 'tada':
          o.bodyY += sinU * 0.7;
          o.squash += 0.1 * sinU;
          this.yawAdd += easeOut(u) * Math.PI * 2;
          o.happy = Math.max(o.happy, 1);
          break;
      }
    }
    if (this.washing) {
      o.roll += Math.sin(this.time * 22) * 0.035;
    }
    if (this.spicyT > 0) {
      o.roll += Math.sin(this.time * 40) * 0.05;
      o.bodyY += Math.abs(Math.sin(this.time * 9)) * 0.08;
    }
  }

  private applyPose(dt: number, t: number) {
    const o = this.out;
    this.scaleCur += (this.scaleTarget - this.scaleCur) * Math.min(1, dt * 3);
    this.root.scale.setScalar(this.scaleCur);
    this.root.rotation.y = this.yaw + this.yawAdd;

    // Blink
    this.blinkT -= dt;
    if (this.blinkT <= 0 && this.blinkPhase < 0 && !this.sleeping) {
      this.blinkPhase = 0;
      this.blinkT = 2.2 + Math.random() * 3.5;
      if (Math.random() < 0.18) this.blinkT = 0.35;
    }
    let blink = 0;
    if (this.blinkPhase >= 0) {
      this.blinkPhase += dt / 0.17;
      blink = Math.sin(Math.min(1, this.blinkPhase) * Math.PI);
      if (this.blinkPhase >= 1) this.blinkPhase = -1;
    }
    const lid = THREE.MathUtils.clamp(Math.max(o.lid, blink), 0, 1);

    // Rig
    const breath = Math.sin(t * (this.sleeping ? 1.6 : 2.4));
    const walkBob = Math.abs(Math.sin(this.legPhase)) * 0.06 * this.walkAmt;
    this.rig.position.y = o.bodyY + walkBob;
    const sq = o.squash + breath * (this.sleeping ? 0.02 : 0.008);
    this.rig.scale.set(1 - sq * 0.5, 1 + sq, 1 - sq * 0.5);
    this.torso.rotation.x = o.lean;
    this.torso.rotation.z = o.roll + Math.sin(this.legPhase) * 0.035 * this.walkAmt;
    this.torso.rotation.y = Math.sin(this.legPhase) * 0.05 * this.walkAmt;

    const belly = 0.95 + (this.fullness / 100) * 0.13;
    this.bodyMesh.scale.set(0.62 * belly, 0.56 * (0.97 + (this.fullness / 100) * 0.05), 0.78);

    // Legs
    const fold = o.legFold;
    this.legs.forEach((l, i) => {
      const swing = Math.sin(this.legPhase + l.phase) * 0.6 * this.walkAmt;
      l.pivot.rotation.x = swing;
      const lift = Math.max(0, Math.cos(this.legPhase + l.phase)) * 0.07 * this.walkAmt;
      l.pivot.position.y = 0.5 - 0.3 * fold + lift + Math.min(0, o.bodyY) * 0;
      l.pivot.scale.set(1 + fold * 0.1, 1 - 0.62 * fold, 1 + fold * 0.1);
      l.pivot.rotation.z = (i % 2 === 0 ? 1 : -1) * fold * 0.5;
      if (o.bodyY > 0.05) l.pivot.rotation.x = -Math.min(0.6, o.bodyY) * (i < 2 ? 1.2 : -0.6) + swing;
    });

    // Tail
    const wag = Math.sin(t * o.tailSpeed);
    this.tail.forEach((seg, i) => {
      seg.rotation.z = Math.sin(t * o.tailSpeed - i * 0.7) * o.tailAmp * (0.5 + i * 0.35);
      if (i > 0) seg.rotation.x = 0.15 + wag * 0.05 * o.tailAmp;
    });
    this.tail[0].rotation.x = 0.4 + Math.sin(t * o.tailSpeed * 0.5) * 0.08 * o.tailAmp - (this.sleeping ? 0.15 : 0);

    // Bell
    this.bell.rotation.z = Math.sin(t * 9) * 0.05 * (this.walkAmt + Math.abs(o.roll) * 4) + Math.sin(this.legPhase) * 0.5 * this.walkAmt;
    this.bell.position.y = 0.5 + o.lean * -0.1 - fold * 0.25;

    // Head
    const idleSway = this.sleeping ? 0 : Math.sin(t * 0.9) * 0.03;
    this.neck.rotation.y = o.headYaw + idleSway;
    this.neck.rotation.x = o.headPitch + breath * 0.01;
    this.neck.rotation.z = o.headRoll + Math.sin(t * 0.7 + 1) * (this.sleeping ? 0 : 0.015);
    this.neck.position.y = 0.98 - fold * 0.32;
    this.neck.position.z = 0.4 + fold * 0.12;

    // Mouth
    const m = THREE.MathUtils.clamp(o.mouth, 0, 1.2);
    const mouthOpen = m > 0.04;
    this.cavity.visible = mouthOpen;
    this.cavity.scale.set(0.12 + 0.11 * Math.min(1, m * 1.4), 0.015 + 0.17 * m, 0.1 + 0.03 * m);
    this.cavity.position.y = -0.34 - 0.075 * m;
    this.chin.position.y = -0.44 - 0.17 * m;
    this.chin.position.z = 0.46 - 0.03 * m;
    this.tongueMesh.visible = mouthOpen;
    const tng = THREE.MathUtils.clamp(o.tongue + m * 0.5, 0, 1);
    this.tongueMesh.scale.set(0.11, 0.035 + 0.05 * tng, 0.09);
    this.tongueMesh.position.set(0, -0.36 - 0.11 * m - 0.02 * o.tongue, 0.73 + 0.05 * o.tongue);
    this.smileMesh.visible = !mouthOpen;
    const sm = THREE.MathUtils.clamp(o.smile, -1, 1);
    this.smileMesh.scale.set(0.7 + Math.abs(sm) * 0.45, Math.max(0.05, Math.abs(sm)) * 0.75 * Math.sign(sm || 1), 1);
    this.smileMesh.position.y = sm >= 0 ? -0.285 : -0.36;

    const puff = THREE.MathUtils.clamp(o.puff, 0, 1);
    this.muzzle.scale.set(0.475 * (1 + puff * 0.12), 0.274 * (1 + puff * 0.1), 0.342);

    // Milk moustache
    if (this.stacheT > 0) {
      this.stacheT -= dt;
      this.stache.visible = true;
      (this.stache.material as THREE.MeshStandardMaterial).opacity = Math.min(1, this.stacheT / 3);
    } else if (this.stache.visible) {
      this.stache.visible = false;
    }

    // Eyes
    const happy = o.happy;
    const arcOn = Math.abs(happy) > 0.5;
    this.eyes.forEach((e) => {
      e.arc.visible = arcOn;
      e.arc.rotation.z = happy > 0 ? 0 : Math.PI;
      e.arc.position.y = happy > 0 ? -0.05 : 0.05;
      e.ball.visible = !arcOn;
      e.parts.forEach((p) => (p.visible = !arcOn));
      e.lid.visible = !arcOn;
      e.ball.rotation.y = o.eyeX * 0.32;
      e.ball.rotation.x = -o.eyeY * 0.3;
      const w = 1 + THREE.MathUtils.clamp(o.wide, 0, 1.2) * 0.16;
      e.ball.scale.set(w, 1.2 * w, 0.85);
      e.lid.scale.set(w * 1.02, 1.22 * w, 0.87);
      e.lid.rotation.x = -(1 - lid) * 2.4;
    });

    // Brows
    const browTilt = o.brow;
    this.brows.forEach((b, i) => {
      const s = i === 0 ? 1 : -1;
      const holder = b.parent as THREE.Group;
      b.rotation.z = Math.PI / 2 + s * browTilt * 0.45 * -1 + 0;
      holder.position.y = this.browBase[i] + o.browRaise * 0.06 + Math.abs(browTilt) * 0.01;
      b.visible = Math.abs(browTilt) > 0.12 || o.browRaise > 0.15;
    });

    // Cheeks
    this.cheeks.forEach((c) => {
      (c.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.clamp(o.blush, 0, 1) * 0.7;
    });

    // Ears
    const earBase = 0.22;
    this.earPivot[0].rotation.set(0, 0.4, earBase - o.earL);
    this.earPivot[1].rotation.set(0, -0.4, -(earBase - o.earR));

    // Tint for dirt + spicy
    const dirt = Math.pow(1 - this.clean / 100, 1.6);
    const r = 1 - dirt * 0.22;
    const g = 1 - dirt * 0.36;
    const b = 1 - dirt * 0.55;
    this.tintMats.forEach((mat) => mat.color.setRGB(r, g, b));
    this.muzzleMat.color.setRGB(1, THREE.MathUtils.lerp(0.7, 0.35, o.red), THREE.MathUtils.lerp(0.73, 0.35, o.red));

    // Shadow
    const h = Math.max(0, o.bodyY + walkBob);
    const sScale = 1 - h * 0.28;
    this.shadow.scale.set(2.5 * sScale * (1 + fold * 0.15), 3.0 * sScale, 1);
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.9 - h * 0.35;
  }

  private ambientFx(dt: number) {
    const fx = this.fx;
    if (this.sleeping) {
      this.snoreT -= dt;
      if (this.snoreT <= 0) {
        this.snoreT = 2.9;
        sfx.snore();
      }
      this.zzzT -= dt;
      if (this.zzzT <= 0) {
        this.zzzT = 1.7;
        fx.zzz(this.topWorld(tmpV).add(new THREE.Vector3(0.3, 0.1, 0.3)), 0.36 * this.scaleCur + 0.1);
      }
    }
    if (this.mood === 'sad' && !this.sleeping) {
      this.tearT -= dt;
      if (this.tearT <= 0) {
        this.tearT = 0.6 + Math.random() * 0.8;
        [0, 1].forEach((i) => {
          const eye = this.eyes[i];
          eye.socket.getWorldPosition(tmpV);
          fx.tear(tmpV.clone().add(new THREE.Vector3(eye.side * 0.06, -0.1, 0.1)), eye.side * 0.4);
        });
      }
    }
    if (this.mood === 'hungry' && !this.sleeping) {
      this.rumbleT -= dt;
      if (this.rumbleT <= 0) {
        this.rumbleT = 9 + Math.random() * 6;
        this.react('rumble');
      }
      this.sweatT -= dt;
      if (this.sweatT <= 0) {
        this.sweatT = 3.5;
        this.headWorld(tmpV);
        fx.emit({
          kind: 'sweat',
          pos: tmpV.clone().add(new THREE.Vector3(0.75 * this.scaleCur, 0.6 * this.scaleCur, 0.4)),
          vel: new THREE.Vector3(0.1, -0.35, 0),
          size: 0.22,
          life: 1.4,
          depthTest: false,
        });
      }
    }
    if (this.clean < 28 && !this.sleeping) {
      this.stinkT -= dt;
      if (this.stinkT <= 0) {
        this.stinkT = 0.55 + Math.random() * 0.5;
        this.bellyWorld(tmpV);
        fx.stink(tmpV.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.2, 0.5, (Math.random() - 0.5) * 0.8)));
      }
    }
    if (this.spicyT > 0) {
      if (Math.random() < dt * 40) {
        this.earWorld(0, tmpV);
        fx.steam(tmpV.clone());
        this.earWorld(1, tmpV);
        fx.steam(tmpV.clone());
      }
      if (Math.random() < dt * 22) {
        this.mouthWorld(tmpV);
        fx.flame(tmpV.clone());
      }
    }
    this.earFlickT -= dt;
    if (this.earFlickT <= 0) {
      this.earFlickT = 3 + Math.random() * 5;
      if (!this.sleeping) this.react('earflick');
    }
  }
}
