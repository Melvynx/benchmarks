import * as THREE from "three";

export type ParticleKind = "crumb" | "bubble" | "sparkle";

interface Particle {
  mesh: THREE.Mesh;
  kind: ParticleKind;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  gravity: number;
  size: number;
  spin: number;
  active: boolean;
}

interface EmitOptions {
  count?: number;
  speed?: number;
  spread?: number;
  life?: number;
  size?: number;
  gravity?: number;
  up?: number;
}

const MAX_PARTICLES = 220;

/** Small pooled particle system: crumbs fall, bubbles float and pop, sparkles twinkle out. */
export class Particles {
  private readonly pool: Particle[] = [];
  private readonly geometries: Record<ParticleKind, THREE.BufferGeometry>;
  private readonly materials: Record<ParticleKind, THREE.Material>;
  private readonly scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometries = {
      crumb: new THREE.IcosahedronGeometry(0.035, 0),
      bubble: new THREE.SphereGeometry(1, 14, 10),
      sparkle: new THREE.OctahedronGeometry(0.08, 0),
    };
    this.materials = {
      crumb: new THREE.MeshStandardMaterial({ color: 0xc27c43, roughness: 0.8 }),
      bubble: new THREE.MeshStandardMaterial({
        color: 0xbfeaff,
        roughness: 0.1,
        metalness: 0,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
      sparkle: new THREE.MeshStandardMaterial({
        color: 0xfff3a3,
        emissive: 0xffd64d,
        emissiveIntensity: 1.2,
        roughness: 0.3,
      }),
    };
  }

  emit(kind: ParticleKind, origin: THREE.Vector3, options: EmitOptions = {}): void {
    const count = options.count ?? 8;
    const speed = options.speed ?? 1.2;
    const spread = options.spread ?? 0.25;
    for (let i = 0; i < count; i++) {
      const particle = this.acquire(kind);
      if (!particle) return;
      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 0.8 + 0.2,
        (Math.random() - 0.5) * 2,
      ).normalize();
      particle.mesh.position.copy(origin).addScaledVector(dir, spread * Math.random());
      particle.velocity.copy(dir).multiplyScalar(speed * (0.6 + Math.random() * 0.6));
      particle.velocity.y += options.up ?? 0;
      particle.maxLife = particle.life = options.life ?? 0.9;
      particle.gravity = options.gravity ?? -2.5;
      particle.size = options.size ?? 1;
      particle.spin = (Math.random() - 0.5) * 8;
      particle.active = true;
      particle.mesh.visible = true;
      particle.mesh.scale.setScalar(particle.size);
    }
  }

  update(dt: number): void {
    for (const p of this.pool) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        this.release(p);
        continue;
      }
      p.velocity.y += p.gravity * dt;
      p.velocity.multiplyScalar(1 - Math.min(1, dt * 1.2));
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.mesh.rotation.y += p.spin * dt;
      const t = p.life / p.maxLife;
      const scale = p.kind === "bubble" ? (t > 0.25 ? 1 : t / 0.25) : t;
      p.mesh.scale.setScalar(Math.max(0.0001, p.size * scale));
    }
  }

  private acquire(kind: ParticleKind): Particle | null {
    const free = this.pool.find((p) => !p.active && p.kind === kind);
    if (free) return free;
    if (this.pool.length >= MAX_PARTICLES) return null;
    const mesh = new THREE.Mesh(this.geometries[kind], this.materials[kind]);
    mesh.castShadow = kind === "crumb";
    this.scene.add(mesh);
    const particle: Particle = {
      mesh,
      kind,
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: 1,
      gravity: 0,
      size: 1,
      spin: 0,
      active: false,
    };
    this.pool.push(particle);
    return particle;
  }

  private release(p: Particle): void {
    p.active = false;
    p.mesh.visible = false;
  }
}
