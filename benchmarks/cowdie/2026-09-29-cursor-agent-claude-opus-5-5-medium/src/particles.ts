import * as THREE from 'three';
import { emojiTexture } from './textures';

interface Opts {
  vel: THREE.Vector3;
  life: number;
  gravity: number;
  drag: number;
  size: number;
  grow: number;
  spin: number;
  wobble: number;
  opacity: number;
  floor: boolean;
}

interface Particle extends Opts {
  obj: THREE.Object3D;
  mat: THREE.Material;
  age: number;
  seed: number;
  sprite: boolean;
}

const defaults = (): Opts => ({
  vel: new THREE.Vector3(),
  life: 1,
  gravity: 0,
  drag: 0,
  size: 0.3,
  grow: 0,
  spin: 0,
  wobble: 0,
  opacity: 1,
  floor: false,
});

const r = (a: number, b: number) => a + Math.random() * (b - a);

export class Particles {
  readonly group = new THREE.Group();
  private list: Particle[] = [];
  private sphere = new THREE.SphereGeometry(1, 10, 8);
  private box = new THREE.BoxGeometry(1, 1, 1);

  emoji(glyph: string, pos: THREE.Vector3, o: Partial<Opts> = {}) {
    const mat = new THREE.SpriteMaterial({ map: emojiTexture(glyph), transparent: true, depthWrite: false });
    const s = new THREE.Sprite(mat);
    s.position.copy(pos);
    s.renderOrder = 10;
    this.add(s, mat, true, o);
  }

  blob(color: THREE.ColorRepresentation, pos: THREE.Vector3, o: Partial<Opts> & { shape?: 'sphere' | 'box'; additive?: boolean } = {}) {
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      depthWrite: false,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const m = new THREE.Mesh(o.shape === 'box' ? this.box : this.sphere, mat);
    m.position.copy(pos);
    m.rotation.set(Math.random() * 6, Math.random() * 6, 0);
    this.add(m, mat, false, o);
  }

  private add(obj: THREE.Object3D, mat: THREE.Material, sprite: boolean, o: Partial<Opts>) {
    const p: Particle = { ...defaults(), ...o, obj, mat, age: 0, seed: Math.random() * 10, sprite };
    p.vel = (o.vel ?? new THREE.Vector3()).clone();
    obj.scale.setScalar(0.001);
    this.group.add(obj);
    this.list.push(p);
  }

  update(dt: number) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.group.remove(p.obj);
        p.mat.dispose();
        this.list.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      if (p.drag) p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.obj.position.addScaledVector(p.vel, dt);
      if (p.wobble) p.obj.position.x += Math.sin(p.age * 6 + p.seed) * p.wobble * dt;
      if (p.floor && p.obj.position.y < 0.03) {
        p.obj.position.y = 0.03;
        p.vel.y *= -0.3;
        p.vel.x *= 0.6;
        p.vel.z *= 0.6;
      }
      const k = p.age / p.life;
      const pop = Math.min(1, p.age / 0.08);
      p.obj.scale.setScalar(Math.max(0.001, p.size * (1 + p.grow * k) * pop));
      (p.mat as THREE.Material & { opacity: number }).opacity = p.opacity * (k > 0.6 ? 1 - (k - 0.6) / 0.4 : 1);
      if (p.spin) {
        if (p.sprite) (p.mat as THREE.SpriteMaterial).rotation += p.spin * dt;
        else {
          p.obj.rotation.x += p.spin * dt;
          p.obj.rotation.z += p.spin * 0.7 * dt;
        }
      }
    }
  }

  hearts(pos: THREE.Vector3, n = 5) {
    for (let i = 0; i < n; i++) {
      this.emoji(Math.random() < 0.7 ? '💖' : '💕', pos.clone().add(new THREE.Vector3(r(-0.2, 0.2), r(0, 0.2), r(-0.2, 0.2))), {
        vel: new THREE.Vector3(r(-0.9, 0.9), r(1.2, 2.2), r(-0.4, 0.4)),
        life: r(1, 1.5),
        gravity: 0.4,
        drag: 1,
        size: r(0.25, 0.4),
        wobble: 0.8,
      });
    }
  }

  crumbs(pos: THREE.Vector3, color: number, n = 10) {
    for (let i = 0; i < n; i++) {
      this.blob(color, pos, {
        shape: 'box',
        vel: new THREE.Vector3(r(-1.6, 1.6), r(1.2, 2.8), r(-1.6, 1.6)),
        life: r(0.7, 1.1),
        gravity: 10,
        size: r(0.035, 0.07),
        spin: 10,
        floor: true,
      });
    }
  }

  bubbles(pos: THREE.Vector3, n = 3) {
    for (let i = 0; i < n; i++) {
      this.blob(Math.random() < 0.5 ? 0xe8f7ff : 0xcdeeff, pos.clone().add(new THREE.Vector3(r(-0.15, 0.15), r(-0.1, 0.1), r(-0.15, 0.15))), {
        vel: new THREE.Vector3(r(-0.3, 0.3), r(0.4, 1), r(-0.3, 0.3)),
        life: r(1.1, 1.8),
        gravity: -0.2,
        size: r(0.05, 0.13),
        wobble: 1.2,
        opacity: 0.75,
        grow: 0.3,
      });
    }
  }

  sparkles(pos: THREE.Vector3, n = 6) {
    for (let i = 0; i < n; i++) {
      this.emoji('✨', pos.clone(), {
        vel: new THREE.Vector3(r(-2, 2), r(0.5, 2.5), r(-2, 2)),
        life: r(0.6, 1),
        drag: 3,
        size: r(0.2, 0.35),
        spin: r(-3, 3),
      });
    }
  }

  zzz(pos: THREE.Vector3) {
    this.emoji('💤', pos.clone(), {
      vel: new THREE.Vector3(r(0.2, 0.4), r(0.5, 0.7), 0),
      life: 2.4,
      size: 0.32,
      grow: 0.8,
      wobble: 0.4,
    });
  }

  note(pos: THREE.Vector3) {
    this.emoji(Math.random() < 0.5 ? '🎵' : '🎶', pos.clone(), {
      vel: new THREE.Vector3(r(-0.6, 0.6), r(0.8, 1.2), 0),
      life: 1.6,
      size: 0.3,
      wobble: 1,
    });
  }

  fire(pos: THREE.Vector3, dir: THREE.Vector3) {
    for (let i = 0; i < 3; i++) {
      const col = [0xffd23f, 0xff8c1a, 0xff3d2e][Math.floor(Math.random() * 3)];
      this.blob(col, pos, {
        vel: dir.clone().multiplyScalar(r(2, 3.5)).add(new THREE.Vector3(r(-0.5, 0.5), r(0, 0.8), r(-0.5, 0.5))),
        life: r(0.35, 0.6),
        gravity: -2,
        drag: 2,
        size: r(0.06, 0.12),
        grow: 1.8,
        additive: true,
      });
    }
  }

  droplets(pos: THREE.Vector3, n = 16) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.blob(0x8fd3ff, pos.clone().add(new THREE.Vector3(Math.cos(a) * 0.5, r(-0.3, 0.3), Math.sin(a) * 0.5)), {
        vel: new THREE.Vector3(Math.cos(a) * r(2, 3.5), r(1, 2.5), Math.sin(a) * r(2, 3.5)),
        life: r(0.6, 0.9),
        gravity: 9,
        size: r(0.035, 0.06),
        opacity: 0.85,
        floor: true,
      });
    }
  }

  confetti(pos: THREE.Vector3, n = 30) {
    const cols = [0xff6b8a, 0xffd23f, 0x4cc9f0, 0x7ed957, 0xb892ff];
    for (let i = 0; i < n; i++) {
      this.blob(cols[i % cols.length], pos, {
        shape: 'box',
        vel: new THREE.Vector3(r(-2.5, 2.5), r(3, 6), r(-2.5, 2.5)),
        life: r(1.4, 2.2),
        gravity: 5,
        drag: 1.2,
        size: r(0.05, 0.09),
        spin: 9,
        floor: true,
      });
    }
  }

  stink(pos: THREE.Vector3) {
    this.blob(0xb9c97a, pos.clone().add(new THREE.Vector3(r(-0.1, 0.1), 0, r(-0.1, 0.1))), {
      vel: new THREE.Vector3(0, r(0.35, 0.6), 0),
      life: 1.8,
      size: 0.07,
      grow: 2,
      wobble: 0.7,
      opacity: 0.45,
    });
  }

  puff(pos: THREE.Vector3, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.blob(0xf1e7d8, pos.clone().add(new THREE.Vector3(0, 0.08, 0)), {
        vel: new THREE.Vector3(Math.cos(a) * r(1, 1.8), r(0.2, 0.6), Math.sin(a) * r(1, 1.8)),
        life: r(0.5, 0.8),
        drag: 4,
        size: r(0.08, 0.14),
        grow: 1.6,
        opacity: 0.8,
      });
    }
  }
}
