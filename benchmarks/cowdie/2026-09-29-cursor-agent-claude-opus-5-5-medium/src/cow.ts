import * as THREE from 'three';
import { toon, cowBodyTexture, cowHeadTexture } from './textures';

export type EyeMode = 'open' | 'happy' | 'closed' | 'wide';
export type BrowMode = 'none' | 'sad' | 'mad';
export type MouthMode = 'smile' | 'flat' | 'frown';

export interface Expression {
  eyes: EyeMode;
  lid: number;
  brows: BrowMode;
  mouth: MouthMode;
  mouthOpen: number;
  blush: number;
  blushColor: number;
  earDroop: number;
  tailWag: number;
}

export const defaultExpression = (): Expression => ({
  eyes: 'open',
  lid: 0,
  brows: 'none',
  mouth: 'smile',
  mouthOpen: 0,
  blush: 0.3,
  blushColor: 0xff8fab,
  earDroop: 0,
  tailWag: 0.4,
});

const HEAD_CENTER = new THREE.Vector3(0, 0.15, 0.2);
const HEAD_R = 0.62;
const Z = new THREE.Vector3(0, 0, 1);
const Y = new THREE.Vector3(0, 1, 0);

function onHead(x: number, y: number, z: number, r = HEAD_R) {
  const dir = new THREE.Vector3(x, y, z).normalize();
  return { pos: dir.clone().multiplyScalar(r).add(HEAD_CENTER), dir };
}

export const wrapAngle = (a: number) => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

const damp = (cur: number, target: number, rate: number, dt: number) => cur + (target - cur) * (1 - Math.exp(-rate * dt));

interface Eye {
  open: THREE.Group;
  happy: THREE.Mesh;
  closed: THREE.Mesh;
}

export class Cow {
  readonly root = new THREE.Group();
  readonly mouthAnchor = new THREE.Object3D();
  readonly headTop = new THREE.Object3D();

  expr: Expression = defaultExpression();
  walking = 0;
  lieTarget = 0;
  lookAt: THREE.Vector3 | null = null;
  headPitchExtra = 0;
  headTilt = 0;
  chewing = false;
  dirtiness = 0;
  fullness = 0.5;
  targetScale = 0.78;
  scale = 0.78;
  wobble = 0;

  private scaler = new THREE.Group();
  private body = new THREE.Group();
  private bodyMesh: THREE.Mesh;
  private head = new THREE.Group();
  private eyes: Eye[] = [];
  private brows: { mesh: THREE.Mesh; side: number }[] = [];
  private mouthOpenMesh: THREE.Mesh;
  private tongue: THREE.Mesh;
  private smile: THREE.Mesh;
  private frown: THREE.Mesh;
  private flat: THREE.Mesh;
  private cheekMat = new THREE.MeshBasicMaterial({ color: 0xff8fab, transparent: true, opacity: 0.3, depthWrite: false });
  private ears: { pivot: THREE.Group; side: number }[] = [];
  private legs: THREE.Group[] = [];
  private tail = new THREE.Group();
  private bell = new THREE.Group();
  private dirtMat: THREE.MeshToonMaterial;

  private lie = 0;
  private sq = 0;
  private sqV = 0;
  private hopY = 0;
  private hopV = 0;
  private shakeT = 0;
  private shakeDur = 1;
  private spinT = 0;
  private spinDur = 1;
  private spinDir = 1;
  private blinkT = 2;
  private blinkPhase = 0;
  private walkPhase = 0;
  private time = 0;
  private earFlickT = 3;
  private earFlick = 0;
  private earFlickSide = 1;
  private curYaw = 0;
  private curPitch = 0;
  private mouthCur = 0;
  private blushCur = 0.3;
  private droopCur = 0;
  private bellSwing = 0;
  private bellV = 0;
  private tmp = new THREE.Vector3();

  constructor() {
    this.root.userData.kind = 'cow';
    this.root.add(this.scaler);
    this.scaler.add(this.body);

    const white = toon(0xfffaf2);
    const pink = toon(0xf6a9b8);
    const dark = toon(0x2d2627);
    const hoof = toon(0x5b4640);

    this.bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 40, 28), toon(0xffffff, { map: cowBodyTexture() }));
    this.bodyMesh.scale.set(1, 0.92, 1.12);
    this.bodyMesh.position.y = 0.95;
    this.body.add(this.bodyMesh);

    this.dirtMat = toon(0x7a5536, { transparent: true, opacity: 0, depthWrite: false });
    const dirtGeo = new THREE.SphereGeometry(1, 12, 8);
    const dirtSpots: [number, number, number, number][] = [
      [0.7, 0.2, 0.6, 0.22],
      [-0.8, -0.1, 0.3, 0.18],
      [0.3, -0.4, -0.8, 0.2],
      [-0.4, 0.5, -0.7, 0.16],
      [0.9, -0.3, -0.2, 0.14],
      [-0.6, -0.5, 0.6, 0.15],
    ];
    for (const [x, y, z, s] of dirtSpots) {
      const d = new THREE.Vector3(x, y, z).normalize();
      const m = new THREE.Mesh(dirtGeo, this.dirtMat);
      m.position.copy(d).multiplyScalar(0.8);
      m.quaternion.setFromUnitVectors(Z, d);
      m.scale.set(s, s * 0.8, 0.03);
      m.userData.noShadow = true;
      this.bodyMesh.add(m);
    }

    const legGeo = new THREE.CylinderGeometry(0.15, 0.13, 0.46, 14);
    const hoofGeo = new THREE.CylinderGeometry(0.15, 0.165, 0.12, 14);
    const legPos: [number, number, number][] = [
      [0.4, 0.5, 0.42],
      [-0.4, 0.5, 0.42],
      [0.4, 0.5, -0.42],
      [-0.4, 0.5, -0.42],
    ];
    for (const [x, y, z] of legPos) {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, z);
      const leg = new THREE.Mesh(legGeo, white);
      leg.position.y = -0.2;
      const h = new THREE.Mesh(hoofGeo, hoof);
      h.position.y = -0.44;
      pivot.add(leg, h);
      this.body.add(pivot);
      this.legs.push(pivot);
    }

    this.tail.position.set(0, 1.12, -0.86);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.5, 8), white);
    rod.position.y = -0.25;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), dark);
    tuft.position.y = -0.52;
    tuft.scale.set(1, 1.4, 1);
    this.tail.add(rod, tuft);
    this.body.add(this.tail);

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.055, 10, 40), toon(0xe8505b));
    collar.position.set(0, 1.3, 0.5);
    collar.rotation.x = -0.66;
    this.body.add(collar);
    const bellPivot = new THREE.Group();
    bellPivot.position.set(0, 0.96, 0.78);
    const bellBall = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), toon(0xf5c542));
    bellBall.position.y = -0.07;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.018, 0.02), toon(0x8a6414));
    slot.position.set(0, -0.1, 0.09);
    this.bell.add(bellBall, slot);
    bellPivot.add(this.bell);
    this.body.add(bellPivot);

    this.head.position.set(0, 1.42, 0.6);
    this.body.add(this.head);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(HEAD_R, 40, 28), toon(0xffffff, { map: cowHeadTexture() }));
    headMesh.position.copy(HEAD_CENTER);
    this.head.add(headMesh);

    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.36, 28, 20), pink);
    snout.position.set(0, -0.1, 0.68);
    snout.scale.set(1.25, 0.85, 0.8);
    this.head.add(snout);
    for (const s of [1, -1]) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), toon(0x9c4a5a));
      n.position.set(0.13 * s, -0.04, 0.95);
      n.scale.set(1, 0.7, 0.5);
      this.head.add(n);
    }

    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.24, 0.925);
    mouthGroup.rotation.x = 0.48;
    this.head.add(mouthGroup);
    this.mouthOpenMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), toon(0x5a1a28));
    this.mouthOpenMesh.scale.set(0.12, 0.03, 0.05);
    this.tongue = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), toon(0xff7a95));
    this.tongue.position.set(0, -0.035, 0.02);
    this.tongue.scale.set(0.075, 0.035, 0.04);
    const arc = new THREE.TorusGeometry(0.075, 0.017, 8, 20, Math.PI);
    this.smile = new THREE.Mesh(arc, dark);
    this.smile.rotation.z = Math.PI;
    this.smile.position.y = 0.035;
    this.frown = new THREE.Mesh(arc, dark);
    this.frown.position.y = -0.04;
    this.flat = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.1, 4, 8), dark);
    this.flat.rotation.z = Math.PI / 2;
    mouthGroup.add(this.mouthOpenMesh, this.tongue, this.smile, this.frown, this.flat);
    this.mouthAnchor.position.set(0, -0.26, 1.0);
    this.head.add(this.mouthAnchor);
    this.headTop.position.set(0, 1.0, 0.25);
    this.head.add(this.headTop);

    const eyeMat = toon(0x1b1720);
    const shine = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const eyeArc = new THREE.TorusGeometry(0.09, 0.024, 8, 18, Math.PI);
    for (const s of [1, -1]) {
      const { pos, dir } = onHead(0.36 * s, 0.2, 0.91, HEAD_R - 0.02);
      const holder = new THREE.Group();
      holder.position.copy(pos);
      holder.quaternion.setFromUnitVectors(Z, dir);
      const open = new THREE.Group();
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.125, 20, 16), eyeMat);
      ball.scale.set(1, 1.18, 0.55);
      const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), shine);
      h1.position.set(0.035, 0.055, 0.06);
      const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), shine);
      h2.position.set(-0.035, -0.045, 0.06);
      h1.userData.noShadow = h2.userData.noShadow = true;
      open.add(ball, h1, h2);
      const happy = new THREE.Mesh(eyeArc, eyeMat);
      happy.position.z = 0.04;
      const closed = new THREE.Mesh(eyeArc, eyeMat);
      closed.rotation.z = Math.PI;
      closed.position.set(0, 0.03, 0.04);
      holder.add(open, happy, closed);
      this.head.add(holder);
      this.eyes.push({ open, happy, closed });

      const b = onHead(0.34 * s, 0.5, 0.8, HEAD_R + 0.005);
      const browHolder = new THREE.Group();
      browHolder.position.copy(b.pos);
      browHolder.quaternion.setFromUnitVectors(Z, b.dir);
      const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 4, 8), dark);
      browHolder.add(brow);
      this.head.add(browHolder);
      this.brows.push({ mesh: brow, side: s });

      const c = onHead(0.62 * s, -0.08, 0.78, HEAD_R + 0.004);
      const cheek = new THREE.Mesh(new THREE.CircleGeometry(0.1, 24), this.cheekMat);
      cheek.position.copy(c.pos);
      cheek.quaternion.setFromUnitVectors(Z, c.dir);
      cheek.userData.noShadow = true;
      this.head.add(cheek);

      const hp = onHead(0.4 * s, 0.85, 0.05, HEAD_R - 0.05);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 14), toon(0xf3e3c3));
      horn.position.copy(hp.pos).addScaledVector(hp.dir, 0.1);
      horn.quaternion.setFromUnitVectors(Y, new THREE.Vector3(0.45 * s, 1, 0).normalize());
      this.head.add(horn);

      const earPivot = new THREE.Group();
      earPivot.position.set(0.5 * s, 0.34, 0.08);
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), white);
      ear.position.x = 0.2 * s;
      ear.scale.set(1.3, 0.5, 0.75);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), pink);
      inner.position.set(0.22 * s, 0, 0.07);
      inner.scale.set(0.95, 0.32, 0.45);
      earPivot.add(ear, inner);
      this.head.add(earPivot);
      this.ears.push({ pivot: earPivot, side: s });
    }

    const tuftMat = toon(0xf1d3a6);
    for (const [x, y, z, r] of [
      [0, 0.77, 0.22, 0.11],
      [0.09, 0.74, 0.3, 0.085],
      [-0.08, 0.73, 0.31, 0.08],
    ] as const) {
      const t = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), tuftMat);
      t.position.set(x, y, z);
      this.head.add(t);
    }

    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.userData.noShadow) o.castShadow = true;
    });
  }

  hop(v = 4.5) {
    if (this.hopY <= 0.001) {
      this.hopV = v;
      this.hopY = 0.001;
      this.sqV += 3;
    }
  }

  squash(a = 1) {
    this.sqV -= a * 2.5;
  }

  shake(d = 0.7) {
    this.shakeT = d;
    this.shakeDur = d;
  }

  spin(d = 1, dir = 1) {
    this.spinT = d;
    this.spinDur = d;
    this.spinDir = dir;
  }

  get isAirborne() {
    return this.hopY > 0.001;
  }

  turnTo(angle: number, dt: number, rate = 6) {
    const diff = wrapAngle(angle - this.root.rotation.y);
    this.root.rotation.y = wrapAngle(this.root.rotation.y + diff * Math.min(1, rate * dt));
  }

  mouthWorld(out: THREE.Vector3) {
    return this.mouthAnchor.getWorldPosition(out);
  }

  headTopWorld(out: THREE.Vector3) {
    return this.headTop.getWorldPosition(out);
  }

  update(dt: number) {
    this.time += dt;
    const e = this.expr;
    this.scale = damp(this.scale, this.targetScale, 2.5, dt);

    this.sqV += (-200 * this.sq - 11 * this.sqV) * dt;
    this.sq += this.sqV * dt;

    if (this.hopY > 0) {
      this.hopV -= 24 * dt;
      this.hopY += this.hopV * dt;
      if (this.hopY <= 0) {
        this.hopY = 0;
        this.sqV -= Math.min(4, Math.abs(this.hopV) * 0.6);
        this.hopV = 0;
      }
    }

    this.lie = damp(this.lie, this.lieTarget, 2.5, dt);
    const lie = this.lie;
    const breathe = Math.sin(this.time * (lie > 0.5 ? 1.4 : 2.3));
    const sy = 1 + this.sq + breathe * 0.018;
    const sxz = 1 - this.sq * 0.45 - breathe * 0.006;
    this.scaler.scale.set(this.scale * sxz, this.scale * sy, this.scale * sxz);

    const w = Math.min(1.4, this.walking);
    this.walkPhase += dt * 10 * w;
    const gait = Math.min(1, w * 1.5);
    const swing = Math.sin(this.walkPhase) * 0.6 * gait * (1 - lie);
    const fold = 1.35 * lie;
    this.legs[0].rotation.x = swing - fold;
    this.legs[3].rotation.x = swing + fold;
    this.legs[1].rotation.x = -swing - fold;
    this.legs[2].rotation.x = -swing + fold;
    this.legs[0].rotation.z = this.legs[2].rotation.z = -0.25 * lie;
    this.legs[1].rotation.z = this.legs[3].rotation.z = 0.25 * lie;

    const bob = Math.abs(Math.sin(this.walkPhase)) * 0.07 * gait;
    this.body.position.y = this.hopY + bob - lie * 0.36;
    this.body.rotation.z = Math.sin(this.walkPhase) * 0.06 * gait + Math.sin(this.time * 18) * 0.08 * this.wobble + lie * 0.08;

    if (this.spinT > 0) {
      this.spinT = Math.max(0, this.spinT - dt);
      const k = 1 - this.spinT / this.spinDur;
      const ease = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.body.rotation.y = ease * Math.PI * 2 * this.spinDir;
    } else {
      this.body.rotation.y = 0;
    }

    let yaw = 0;
    let pitch = 0;
    if (this.lookAt) {
      const local = this.root.worldToLocal(this.tmp.copy(this.lookAt));
      const hx = local.x;
      const hy = local.y - 1.5 * this.scale;
      const hz = local.z - 0.6 * this.scale;
      yaw = THREE.MathUtils.clamp(Math.atan2(hx, hz), -1.0, 1.0);
      pitch = THREE.MathUtils.clamp(Math.atan2(-hy, Math.hypot(hx, hz)), -0.5, 0.65);
      if (hz < -0.2) yaw *= 0.6;
    }
    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      yaw += Math.sin(this.shakeT * 30) * 0.5 * (this.shakeT / this.shakeDur);
    }
    pitch += this.headPitchExtra + 0.3 * lie;
    this.curYaw = damp(this.curYaw, yaw * (1 - lie * 0.6), 7, dt);
    this.curPitch = damp(this.curPitch, pitch, 7, dt);
    this.head.rotation.set(this.curPitch, this.curYaw, Math.sin(this.time * 1.3) * 0.05 + this.headTilt);

    this.blinkT -= dt;
    if (this.blinkT <= 0) {
      this.blinkPhase = 0.16;
      this.blinkT = Math.random() < 0.2 ? 0.25 : 1.8 + Math.random() * 3.5;
    }
    let open = 1;
    if (this.blinkPhase > 0) {
      this.blinkPhase = Math.max(0, this.blinkPhase - dt);
      open = Math.min(1, Math.abs(this.blinkPhase - 0.08) / 0.08);
    }
    const lidScale = 1 - e.lid * 0.55;
    for (const eye of this.eyes) {
      const isOpen = e.eyes === 'open' || e.eyes === 'wide';
      eye.open.visible = isOpen;
      const big = e.eyes === 'wide' ? 1.2 : 1;
      eye.open.scale.set(big, Math.max(0.06, open * lidScale * big), big);
      eye.happy.visible = e.eyes === 'happy';
      eye.closed.visible = e.eyes === 'closed';
    }

    for (const b of this.brows) {
      b.mesh.visible = e.brows !== 'none';
      const tilt = e.brows === 'sad' ? -0.4 * b.side : 0.45 * b.side;
      b.mesh.rotation.z = Math.PI / 2 + tilt;
      b.mesh.position.y = e.brows === 'mad' ? -0.02 : 0.01;
    }

    let mouthTarget = e.mouthOpen;
    if (this.chewing) mouthTarget = 0.2 + 0.55 * Math.max(0, Math.sin(this.time * 15));
    this.mouthCur = damp(this.mouthCur, mouthTarget, 22, dt);
    const m = this.mouthCur;
    const openVis = m > 0.06;
    this.mouthOpenMesh.visible = openVis;
    this.mouthOpenMesh.scale.set(0.09 + m * 0.06, 0.02 + m * 0.13, 0.05);
    this.tongue.visible = m > 0.35;
    this.smile.visible = !openVis && e.mouth === 'smile';
    this.frown.visible = !openVis && e.mouth === 'frown';
    this.flat.visible = !openVis && e.mouth === 'flat';

    this.blushCur = damp(this.blushCur, e.blush, 4, dt);
    this.cheekMat.opacity = this.blushCur * 0.85;
    this.cheekMat.color.setHex(e.blushColor);

    this.droopCur = damp(this.droopCur, e.earDroop, 3, dt);
    this.earFlickT -= dt;
    if (this.earFlickT <= 0) {
      this.earFlick = 1;
      this.earFlickSide = Math.random() < 0.5 ? 1 : -1;
      this.earFlickT = 2 + Math.random() * 5;
    }
    this.earFlick = Math.max(0, this.earFlick - dt * 3);
    for (const ear of this.ears) {
      const flick = ear.side === this.earFlickSide ? Math.sin(this.earFlick * Math.PI * 3) * 0.5 * this.earFlick : 0;
      const flap = Math.sin(this.walkPhase * 2) * 0.12 * gait;
      ear.pivot.rotation.z = ear.side * (-0.18 - this.droopCur * 0.75 + flick + flap);
      ear.pivot.rotation.y = ear.side * -0.2;
    }

    const wag = e.tailWag;
    this.tail.rotation.z = Math.sin(this.time * (3 + wag * 12)) * (0.12 + wag * 0.55);
    this.tail.rotation.x = 0.35 + wag * 0.25 - lie * 0.2;

    const drive = Math.cos(this.walkPhase) * gait * 30 + this.hopV * 2;
    this.bellV += (-80 * this.bellSwing - 5 * this.bellV + drive) * dt;
    this.bellSwing += this.bellV * dt;
    this.bell.rotation.x = THREE.MathUtils.clamp(this.bellSwing, -0.7, 0.7);

    this.dirtMat.opacity = this.dirtiness * 0.85;
    this.bodyMesh.scale.set(1 + this.fullness * 0.07, 0.92, 1.12 + this.fullness * 0.06);
  }
}
