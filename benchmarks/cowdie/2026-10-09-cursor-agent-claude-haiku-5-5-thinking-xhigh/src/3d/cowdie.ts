import * as THREE from "three";
import type { Stage } from "../game/state";
import { buildCowdie, EAR_REST_ANGLE, type CowdieParts } from "./cowdie-model";

export type Mood = "content" | "happy" | "hungry" | "sad" | "sleep" | "eat" | "yum" | "annoyed";

interface Expression {
  eyeOpen: number;
  arc: number;
  smile: number;
  open: number;
  blush: number;
  brow: number;
}

const MOOD_TARGETS: Record<Mood, Expression> = {
  content: { eyeOpen: 1, arc: 0, smile: 0.5, open: 0, blush: 0.2, brow: 0 },
  happy: { eyeOpen: 1, arc: 0, smile: 1, open: 0, blush: 0.7, brow: -0.2 },
  hungry: { eyeOpen: 1, arc: 0, smile: -0.4, open: 0, blush: 0, brow: 0.9 },
  sad: { eyeOpen: 0.85, arc: 0, smile: -0.8, open: 0, blush: 0, brow: 0.6 },
  sleep: { eyeOpen: 0, arc: 1, smile: 0.25, open: 0, blush: 0.25, brow: 0 },
  eat: { eyeOpen: 1, arc: 0.6, smile: 0.9, open: 0.2, blush: 0.9, brow: -0.3 },
  yum: { eyeOpen: 1, arc: 1, smile: 1, open: 0.1, blush: 1, brow: -0.6 },
  annoyed: { eyeOpen: 0.55, arc: 0, smile: -1, open: 0, blush: 0, brow: -0.9 },
};

const STAGE_SCALE: Record<Stage, number> = { Baby: 0.78, Kid: 0.92, Adult: 1 };

interface Hop {
  fromX: number;
  fromZ: number;
  toX: number;
  toZ: number;
  t: number;
  duration: number;
  height: number;
  resolve: () => void;
}

export class Cowdie {
  readonly root: THREE.Group;
  private readonly parts: CowdieParts;

  private mood: Mood = "content";
  private readonly expr: Expression = { ...MOOD_TARGETS.content };
  private readonly target: Expression = { ...MOOD_TARGETS.content };
  private stageScale = STAGE_SCALE.Baby;
  private stage: Stage = "Baby";
  private belly = 1;
  private dirtCount = 0;
  private happiness = 70;
  private asleep = false;

  private squash = 0;
  private squashVel = 0;
  private pitch = 0;
  private yaw = 0;
  private biteTimer = 0;
  private jumpT = -1;
  private jumpDuration = 0.5;
  private jumpHeight = 0;
  private hop: Hop | null = null;
  private shakeTimer = 0;
  private facingTarget = 0;

  private blinkTimer = 2.5;
  private blinkT = -1;
  private gaze = new THREE.Vector2();
  private gazeGoal = new THREE.Vector2();
  private gazeTarget: THREE.Vector3 | null = null;
  private readonly tmpV = new THREE.Vector3();

  constructor() {
    this.parts = buildCowdie();
    this.root = this.parts.root;
    for (const spot of this.parts.spots) {
      spot.userData.base = spot.scale.clone();
      spot.scale.setScalar(0.0001);
    }
    for (const horn of this.parts.horns) horn.scale.setScalar(0.0001);
    this.root.scale.setScalar(this.stageScale);
  }

  setMood(mood: Mood): void {
    this.mood = mood;
    Object.assign(this.target, MOOD_TARGETS[mood]);
  }

  setVitals(vitals: { fullness: number; hygiene: number; happiness: number; stage: Stage; asleep: boolean }): void {
    this.stage = vitals.stage;
    this.stageScale = STAGE_SCALE[vitals.stage];
    this.belly = 1 + (vitals.fullness - 50) / 350;
    this.dirtCount = Math.round(Math.min(1, Math.max(0, (100 - vitals.hygiene) / 70)) * this.parts.dirt.length);
    this.happiness = vitals.happiness;
    this.asleep = vitals.asleep;
  }

  /** Quick squash plus open-and-close mouth. Call once per bite. */
  bite(): void {
    this.squashVel += 9;
    this.biteTimer = 0.22;
  }

  /** Jump in place. */
  jump(height = 0.5, duration = 0.55): void {
    this.jumpT = 0;
    this.jumpHeight = height;
    this.jumpDuration = duration;
    this.squashVel += 3;
  }

  /** Hop across the ground to (x, z). Resolves when Cowdie arrives. */
  walkTo(x: number, z: number, duration: number): Promise<void> {
    return new Promise((resolve) => {
      const dx = x - this.root.position.x;
      const dz = z - this.root.position.z;
      this.facingTarget = Math.atan2(dx, dz);
      this.hop = {
        fromX: this.root.position.x,
        fromZ: this.root.position.z,
        toX: x,
        toZ: z,
        t: 0,
        duration,
        height: 0.35,
        resolve,
      };
    });
  }

  /** Head shake for refusals. */
  shake(duration = 0.8): void {
    this.shakeTimer = duration;
  }

  /** Point the eyes at a world-space location, or null to wander. */
  lookAt(point: THREE.Vector3 | null): void {
    this.gazeTarget = point;
  }

  /** World-space position of the mouth, for feeding. */
  mouthWorld(out: THREE.Vector3): THREE.Vector3 {
    this.parts.mouthAnchor.getWorldPosition(out);
    return out;
  }

  /** Head-top world position, for speech bubbles. */
  headWorld(out: THREE.Vector3): THREE.Vector3 {
    this.tmpV.set(0, 2.3, 0);
    this.root.localToWorld(this.tmpV);
    return out.copy(this.tmpV);
  }

  /** Ground position of Cowdie, used to place the contact shadow. */
  get footX(): number {
    return this.root.position.x;
  }

  get footZ(): number {
    return this.root.position.z;
  }

  update(dt: number, time: number): void {
    this.updateExpression(dt);
    this.updateBody(dt, time);
    this.updateFace(dt, time);
    this.updateAppendages(time);
  }

  private updateExpression(dt: number): void {
    const k = 1 - Math.exp(-dt * 9);
    const mood = MOOD_TARGETS[this.mood];
    const biting = this.biteTimer > 0;
    this.biteTimer = Math.max(0, this.biteTimer - dt);
    this.target.open = biting ? 1 : mood.open;
    for (const key of Object.keys(this.expr) as (keyof Expression)[]) {
      this.expr[key] += (this.target[key] - this.expr[key]) * k;
    }
  }

  private updateBody(dt: number, time: number): void {
    // Spring for squash and stretch.
    const stiffness = 220;
    const damping = 12;
    this.squashVel += (-stiffness * this.squash - damping * this.squashVel) * dt;
    this.squash += this.squashVel * dt;

    // Jump arc.
    let jumpY = 0;
    if (this.jumpT >= 0) {
      this.jumpT += dt / this.jumpDuration;
      if (this.jumpT >= 1) {
        this.jumpT = -1;
      } else {
        jumpY = this.jumpHeight * 4 * this.jumpT * (1 - this.jumpT);
      }
    }

    // Walking hop: arc from the start to the target over the hop duration.
    if (this.hop) {
      const hop = this.hop;
      hop.t += dt / hop.duration;
      const t = Math.min(1, hop.t);
      this.root.position.x = hop.fromX + (hop.toX - hop.fromX) * t;
      this.root.position.z = hop.fromZ + (hop.toZ - hop.fromZ) * t;
      jumpY = Math.max(jumpY, hop.height * 4 * t * (1 - t));
      if (t >= 1) {
        this.hop = null;
        hop.resolve();
      }
    }

    const k = 1 - Math.exp(-dt * 8);
    const sleepPitch = this.asleep ? 0.3 : 0;
    this.pitch += (sleepPitch - this.pitch) * Math.min(1, dt * 4);
    this.yaw += ((this.hop ? this.facingTarget : 0) - this.yaw) * Math.min(1, dt * 6);

    let shake = 0;
    let roll = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer = Math.max(0, this.shakeTimer - dt);
      const amp = Math.min(1, this.shakeTimer * 2);
      shake = Math.sin(time * 36) * 0.22 * amp;
      roll = Math.sin(time * 36) * 0.04 * amp;
    }
    this.parts.pivot.rotation.set(this.pitch, this.yaw + shake, roll);

    const breath = Math.sin(time * (this.asleep ? 1.4 : 2.6)) * (this.asleep ? 0.035 : 0.018);
    const squashAmount = Math.max(-0.25, Math.min(0.3, this.squash));
    const sleepSquash = this.asleep ? 0.12 : 0;
    this.parts.pivot.scale.set(
      1 + squashAmount * 0.5 - breath * 0.5 + sleepSquash * 0.5,
      1 - squashAmount * 0.6 + breath - sleepSquash,
      1 + squashAmount * 0.5 - breath * 0.5 + sleepSquash * 0.5,
    );
    this.root.position.y = jumpY + Math.sin(time * 1.8) * 0.012;

    this.root.scale.setScalar(this.root.scale.x + (this.stageScale - this.root.scale.x) * k);
    this.parts.body.scale.set(this.belly, 0.92 * (1 + (this.belly - 1) * 0.25), 0.95 * this.belly);
  }

  private updateFace(dt: number, time: number): void {
    const e = this.expr;
    const parts = this.parts;

    // Blink timer.
    this.blinkTimer -= dt;
    if (this.blinkT < 0 && this.blinkTimer <= 0) {
      this.blinkT = 0;
      this.blinkTimer = 2 + Math.random() * 3;
    }
    let blink = 1;
    if (this.blinkT >= 0) {
      this.blinkT += dt / 0.16;
      if (this.blinkT >= 1) this.blinkT = -1;
      else blink = 1 - Math.sin(this.blinkT * Math.PI) * 0.92;
    }

    // Gaze: follow the target if any, otherwise wander gently.
    if (this.gazeTarget) {
      const local = this.root.worldToLocal(this.tmpV.copy(this.gazeTarget));
      this.gazeGoal.set(
        Math.max(-1, Math.min(1, local.x * 0.5)),
        Math.max(-1, Math.min(1, (local.y - 1.3) * 0.5)),
      );
    } else {
      this.gazeGoal.set(Math.sin(time * 0.7) * 0.4, Math.sin(time * 0.5 + 1) * 0.2);
    }
    const gk = 1 - Math.exp(-dt * 10);
    this.gaze.lerp(this.gazeGoal, gk);

    parts.eyeRound.forEach((round, i) => {
      const openAmount = Math.max(0, e.eyeOpen * blink * (1 - e.arc));
      round.scale.set(1, Math.max(0.04, openAmount), 1);
      round.visible = openAmount > 0.02;
      const arc = parts.eyeArcs[i];
      arc.visible = e.arc > 0.02;
      arc.scale.setScalar(Math.max(0.001, e.arc));
      arc.rotation.z = this.asleep ? Math.PI : 0;
      const pupil = parts.pupils[i];
      pupil.position.x = this.gaze.x * 0.035;
      pupil.position.y = this.gaze.y * 0.035;
    });

    parts.smileArc.scale.set(1, Math.max(0.001, e.smile), 1);
    parts.smileArc.visible = e.smile > 0.02;
    parts.frownArc.scale.set(1, Math.max(0.001, -e.smile), 1);
    parts.frownArc.visible = e.smile < -0.02;

    const open = Math.max(0.001, e.open);
    parts.openMouth.scale.set(0.1 * (0.6 + open * 0.8), 0.12 * open + 0.0001, 0.04);
    parts.openMouth.visible = e.open > 0.02;

    parts.brows.forEach((brow, i) => {
      const side = i === 0 ? 1 : -1;
      brow.rotation.z = side * (0.1 + e.brow * 0.45);
      brow.position.y = 0.44 + e.brow * 0.035;
    });

    parts.blushes.forEach((blush) => {
      blush.visible = e.blush > 0.02;
    });
    parts.blushMaterial.opacity = Math.min(0.75, e.blush * 0.75);

    const grownUp = this.stage !== "Baby" ? 1 : 0;
    for (const spot of parts.spots) {
      const base = spot.userData.base as THREE.Vector3;
      spot.scale.lerp(base.clone().multiplyScalar(grownUp || 0.0001), 0.2);
      spot.visible = spot.scale.x > 0.01;
    }
    for (const horn of parts.horns) {
      horn.scale.setScalar(horn.scale.x + ((grownUp || 0.0001) - horn.scale.x) * 0.15);
    }

    parts.dirt.forEach((mark, i) => {
      mark.visible = i < this.dirtCount;
    });
  }

  private updateAppendages(time: number): void {
    const parts = this.parts;
    const wagAmp = this.happiness > 60 ? 0.6 : 0.2;
    parts.tail.rotation.y = Math.sin(time * (this.happiness > 60 ? 9 : 3)) * wagAmp;
    parts.ears.forEach((ear, i) => {
      const side = i === 0 ? -1 : 1;
      const wiggle = this.expr.smile > 0.5 ? Math.sin(time * 6 + i) * 0.1 : Math.sin(time * 1.6 + i) * 0.04;
      ear.rotation.z = side * EAR_REST_ANGLE + wiggle;
    });
  }
}
