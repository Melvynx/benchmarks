import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Module-level spawner so any scene component can fire effects without prop drilling.
let spawner = null;
export function spawnParticles(kind, origin, count = 1, opts = {}) {
  spawner?.(kind, origin, count, opts);
}

const KINDS = {
  heart: { life: 1.6, up: 1.1, drag: 0.98, g: -0.25, size: 1, spread: 0.6, spin: 1.2 },
  crumb: { life: 0.9, up: 1.6, drag: 0.96, g: 6, size: 1, spread: 2.2, spin: 8 },
  bubble: { life: 1.9, up: 0.5, drag: 0.99, g: -0.35, size: 1, spread: 0.5, spin: 0 },
  star: { life: 1.1, up: 1.4, drag: 0.97, g: -0.6, size: 1, spread: 1.6, spin: 4 },
};

function makeHeartGeometry() {
  const x = 0, y = 0;
  const s = new THREE.Shape();
  s.moveTo(x + 0.25, y + 0.25);
  s.bezierCurveTo(x + 0.25, y + 0.25, x + 0.4, y, x, y);
  s.bezierCurveTo(x - 0.3, y, x - 0.3, y + 0.35, x - 0.3, y + 0.35);
  s.bezierCurveTo(x - 0.3, y + 0.55, x + 0.1, y + 0.77, x + 0.25, y + 0.95);
  s.bezierCurveTo(x + 0.6, y + 0.77, x + 0.8, y + 0.55, x + 0.8, y + 0.35);
  s.bezierCurveTo(x + 0.8, y + 0.35, x + 0.8, y, x + 0.5, y);
  s.bezierCurveTo(x + 0.35, y, x + 0.25, y + 0.25, x + 0.25, y + 0.25);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false, curveSegments: 8 });
  g.center();
  g.scale(0.27, 0.27, 0.27);
  return g;
}

const POOL_SIZE = 90;

export function ParticlePool() {
  const meshes = useRef([]);
  const parts = useRef(
    Array.from({ length: POOL_SIZE }, () => ({
      alive: false, kind: null, p: new THREE.Vector3(), v: new THREE.Vector3(),
      life: 0, max: 1, size: 0.1, opacity: 1, spin: 0,
    })),
  );
  const cursor = useRef(0);

  const geos = useMemo(() => ({
    heart: makeHeartGeometry(),
    crumb: new THREE.BoxGeometry(0.1, 0.1, 0.1),
    bubble: new THREE.SphereGeometry(0.1, 12, 10),
    star: new THREE.OctahedronGeometry(0.1),
  }), []);

  const colors = useMemo(() => ({
    heart: '#ff5c8a', crumb: '#c98a4b', bubble: '#bdeeff', star: '#ffe066',
  }), []);

  useEffect(() => {
    spawner = (kind, origin, count, opts) => {
      const cfg = KINDS[kind];
      if (!cfg) return;
      for (let i = 0; i < count; i++) {
        // Find the next free slot (round-robin).
        let idx = -1;
        for (let k = 0; k < POOL_SIZE; k++) {
          const j = (cursor.current + k) % POOL_SIZE;
          if (!parts.current[j].alive) { idx = j; break; }
        }
        if (idx < 0) return;
        cursor.current = (idx + 1) % POOL_SIZE;

        const pt = parts.current[idx];
        const mesh = meshes.current[idx];
        const dir = new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.2) * 1.2,
          (Math.random() - 0.5) * 2,
        ).normalize();
        const spread = cfg.spread * (opts.spread ?? 1);
        pt.alive = true;
        pt.kind = kind;
        pt.p.copy(origin).addScaledVector(dir, 0.05 + Math.random() * 0.1);
        pt.v.copy(dir).multiplyScalar(spread * (0.5 + Math.random() * 0.5));
        pt.v.y = cfg.up * (0.6 + Math.random() * 0.6) + (opts.lift ?? 0);
        pt.life = cfg.life * (0.8 + Math.random() * 0.4);
        pt.max = pt.life;
        pt.size = (opts.size ?? 1) * (0.7 + Math.random() * 0.6);
        pt.opacity = kind === 'bubble' ? 0.7 : 1;
        pt.spin = (Math.random() - 0.5) * cfg.spin;

        if (mesh) {
          mesh.geometry = geos[kind];
          mesh.material.color.set(opts.color ?? colors[kind]);
          mesh.material.transparent = true;
          mesh.material.opacity = pt.opacity;
          mesh.visible = true;
        }
      }
    };
    return () => { spawner = null; };
  }, [geos, colors]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    for (let i = 0; i < POOL_SIZE; i++) {
      const pt = parts.current[i];
      const mesh = meshes.current[i];
      if (!pt.alive) {
        if (mesh && mesh.visible) mesh.visible = false;
        continue;
      }
      const cfg = KINDS[pt.kind];
      pt.life -= step;
      if (pt.life <= 0) {
        pt.alive = false;
        if (mesh) mesh.visible = false;
        continue;
      }
      pt.v.multiplyScalar(Math.pow(cfg.drag, step * 60));
      pt.v.y += cfg.g * step;
      pt.p.addScaledVector(pt.v, step);
      if (mesh) {
        const k = pt.life / pt.max; // 1 -> 0
        mesh.position.copy(pt.p);
        const s = pt.size * (0.5 + 0.5 * Math.min(1, k * 2.5));
        mesh.scale.setScalar(s);
        mesh.rotation.x += pt.spin * step;
        mesh.rotation.y += pt.spin * step * 0.7;
        if (pt.kind === 'bubble') mesh.material.opacity = pt.opacity * k;
      }
    }
  });

  return (
    <group>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <mesh
          key={i}
          visible={false}
          ref={(el) => { meshes.current[i] = el; }}
          geometry={geos.star}
        >
          <meshBasicMaterial color="#ffffff" transparent />
        </mesh>
      ))}
    </group>
  );
}
