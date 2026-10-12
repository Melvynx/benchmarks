import * as THREE from 'three';
import { spriteTexture, type SpriteKind } from './textures';

interface Particle {
  sprite: THREE.Sprite;
  mat: THREE.SpriteMaterial;
  vel: THREE.Vector3;
  age: number;
  life: number;
  gravity: number;
  drag: number;
  size0: number;
  size1: number;
  spin: number;
  wobble: number;
  wobbleSpeed: number;
  phase: number;
  peak: number;
  active: boolean;
}

export interface EmitOpts {
  kind: SpriteKind;
  pos: THREE.Vector3;
  vel?: THREE.Vector3;
  color?: THREE.ColorRepresentation;
  size?: number;
  sizeEnd?: number;
  life?: number;
  gravity?: number;
  drag?: number;
  spin?: number;
  wobble?: number;
  peak?: number;
  depthTest?: boolean;
}

const POOL = 260;
const tmp = new THREE.Vector3();

export class Particles {
  readonly group = new THREE.Group();
  private pool: Particle[] = [];
  private cursor = 0;

  constructor() {
    for (let i = 0; i < POOL; i++) {
      const mat = new THREE.SpriteMaterial({ transparent: true, depthWrite: false, opacity: 0 });
      const sprite = new THREE.Sprite(mat);
      sprite.visible = false;
      sprite.renderOrder = 20;
      this.group.add(sprite);
      this.pool.push({
        sprite,
        mat,
        vel: new THREE.Vector3(),
        age: 0,
        life: 1,
        gravity: 0,
        drag: 0,
        size0: 0.2,
        size1: 0.2,
        spin: 0,
        wobble: 0,
        wobbleSpeed: 0,
        phase: 0,
        peak: 1,
        active: false,
      });
    }
  }

  emit(o: EmitOpts) {
    let p: Particle | undefined;
    for (let i = 0; i < POOL; i++) {
      const c = this.pool[(this.cursor + i) % POOL];
      if (!c.active) {
        p = c;
        this.cursor = (this.cursor + i + 1) % POOL;
        break;
      }
    }
    if (!p) {
      p = this.pool[this.cursor];
      this.cursor = (this.cursor + 1) % POOL;
    }
    p.active = true;
    p.age = 0;
    p.life = o.life ?? 1.2;
    p.gravity = o.gravity ?? 0;
    p.drag = o.drag ?? 0;
    p.size0 = o.size ?? 0.3;
    p.size1 = o.sizeEnd ?? p.size0;
    p.spin = o.spin ?? 0;
    p.wobble = o.wobble ?? 0;
    p.wobbleSpeed = 3 + Math.random() * 3;
    p.phase = Math.random() * Math.PI * 2;
    p.peak = o.peak ?? 1;
    p.vel.copy(o.vel ?? tmp.set(0, 0, 0));
    p.mat.map = spriteTexture(o.kind);
    p.mat.color.set(o.color ?? 0xffffff);
    p.mat.depthTest = o.depthTest ?? true;
    p.mat.rotation = o.kind === 'confetti' ? Math.random() * 6 : 0;
    p.mat.opacity = 0;
    p.sprite.position.copy(o.pos);
    p.sprite.scale.setScalar(p.size0);
    p.sprite.visible = true;
    return p;
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        p.active = false;
        p.sprite.visible = false;
        continue;
      }
      p.vel.y -= p.gravity * dt;
      if (p.drag) p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.sprite.position.addScaledVector(p.vel, dt);
      if (p.wobble) p.sprite.position.x += Math.sin(p.age * p.wobbleSpeed + p.phase) * p.wobble * dt;
      p.mat.rotation += p.spin * dt;
      const size = THREE.MathUtils.lerp(p.size0, p.size1, u);
      const pop = u < 0.12 ? 0.6 + (u / 0.12) * 0.4 : 1;
      p.sprite.scale.setScalar(size * pop);
      const fadeIn = Math.min(1, u / 0.08);
      const fadeOut = u > 0.65 ? 1 - (u - 0.65) / 0.35 : 1;
      p.mat.opacity = p.peak * fadeIn * fadeOut;
    }
  }

  hearts(pos: THREE.Vector3, n = 5, spread = 0.5) {
    for (let i = 0; i < n; i++) {
      this.emit({
        kind: 'heart',
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * spread)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.9 + Math.random() * 0.6, 0),
        size: 0.26 + Math.random() * 0.16,
        sizeEnd: 0.32,
        life: 1.5 + Math.random() * 0.6,
        wobble: 0.5,
        depthTest: false,
      });
    }
  }

  sparkles(pos: THREE.Vector3, n = 8, radius = 0.8, color: THREE.ColorRepresentation = 0xfff3a8) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      this.emit({
        kind: 'star',
        pos: pos.clone().add(new THREE.Vector3(Math.cos(a) * r, (Math.random() - 0.3) * radius, Math.sin(a) * r * 0.6)),
        vel: new THREE.Vector3(Math.cos(a) * 0.3, 0.3 + Math.random() * 0.5, 0),
        size: 0.14 + Math.random() * 0.18,
        sizeEnd: 0.02,
        life: 0.8 + Math.random() * 0.5,
        spin: (Math.random() - 0.5) * 6,
        color,
        depthTest: false,
      });
    }
  }

  crumbs(pos: THREE.Vector3, n: number, color: THREE.ColorRepresentation) {
    for (let i = 0; i < n; i++) {
      this.emit({
        kind: 'dot',
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.6, 0.6 + Math.random() * 1.3, (Math.random() - 0.2) * 1.2),
        size: 0.06 + Math.random() * 0.07,
        sizeEnd: 0.03,
        life: 0.55 + Math.random() * 0.35,
        gravity: 7,
        color,
      });
    }
  }

  confetti(pos: THREE.Vector3, n = 40) {
    const colors = [0xff5c8a, 0xffd23f, 0x5ad1ff, 0x8be36a, 0xb07cff, 0xff9a3c];
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 3.2;
      this.emit({
        kind: 'confetti',
        pos: pos.clone(),
        vel: new THREE.Vector3(Math.cos(a) * s * 0.7, 2.5 + Math.random() * 3, Math.sin(a) * s * 0.5),
        size: 0.13 + Math.random() * 0.08,
        life: 2 + Math.random() * 0.8,
        gravity: 5.5,
        drag: 0.7,
        spin: (Math.random() - 0.5) * 12,
        color: colors[i % colors.length],
        depthTest: false,
      });
    }
  }

  bubbles(pos: THREE.Vector3, n = 4, spread = 0.35) {
    for (let i = 0; i < n; i++) {
      this.emit({
        kind: 'bubble',
        pos: pos.clone().add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread)),
        vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.7, (Math.random() - 0.5) * 0.3),
        size: 0.14 + Math.random() * 0.22,
        sizeEnd: 0.3,
        life: 1.1 + Math.random() * 0.9,
        wobble: 0.35,
        peak: 0.95,
      });
    }
  }

  puff(pos: THREE.Vector3, n = 6, color: THREE.ColorRepresentation = 0xffffff, size = 0.5) {
    for (let i = 0; i < n; i++) {
      this.emit({
        kind: 'puff',
        pos: pos.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 1.4, 0.3 + Math.random() * 0.9, (Math.random() - 0.5) * 1.0),
        size: size * 0.6,
        sizeEnd: size * 1.6,
        life: 0.7 + Math.random() * 0.4,
        drag: 2,
        color,
        peak: 0.8,
      });
    }
  }

  zzz(pos: THREE.Vector3, size = 0.34) {
    this.emit({
      kind: 'zzz',
      pos,
      vel: new THREE.Vector3(0.28, 0.5, 0),
      size: size * 0.6,
      sizeEnd: size * 1.4,
      life: 2.6,
      wobble: 0.5,
      depthTest: false,
    });
  }

  steam(pos: THREE.Vector3) {
    this.emit({
      kind: 'puff',
      pos,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.5, 1.4 + Math.random() * 0.8, 0),
      size: 0.25,
      sizeEnd: 0.8,
      life: 0.9,
      color: 0xffe8d8,
      peak: 0.75,
    });
  }

  flame(pos: THREE.Vector3) {
    this.emit({
      kind: 'flame',
      pos,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.2 + Math.random(), (Math.random() - 0.3) * 0.5),
      size: 0.3,
      sizeEnd: 0.05,
      life: 0.55,
      depthTest: false,
    });
  }

  tear(pos: THREE.Vector3, side: number) {
    this.emit({
      kind: 'drop',
      pos,
      vel: new THREE.Vector3(side * 0.35, 0.5, 0.3),
      size: 0.13,
      sizeEnd: 0.1,
      life: 0.8,
      gravity: 6,
      depthTest: false,
    });
  }

  note(pos: THREE.Vector3) {
    this.emit({
      kind: 'note',
      pos,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.9, 0),
      size: 0.3,
      life: 1.6,
      wobble: 0.6,
      depthTest: false,
    });
  }

  stink(pos: THREE.Vector3) {
    this.emit({
      kind: 'puff',
      pos,
      vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.5 + Math.random() * 0.4, 0),
      size: 0.2,
      sizeEnd: 0.45,
      life: 1.5,
      wobble: 0.5,
      color: 0xa6c96a,
      peak: 0.65,
    });
  }
}
