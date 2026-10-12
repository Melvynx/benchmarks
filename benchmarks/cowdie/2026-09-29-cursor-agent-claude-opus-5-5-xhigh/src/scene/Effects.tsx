import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  BoxGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedMesh,
  Material,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
} from "three";
import { FX_CAPACITY, particles, type FxKind } from "./fx";
import { heartGeometry, starGeometry, textTexture } from "./shapes";
import { ISLAND_RADIUS } from "../game/runtime";

const dummy = new Object3D();
const zAxis = new Vector3(0, 0, 1);
const tmpQ = new Quaternion();

const BILLBOARD: Partial<Record<FxKind, boolean>> = { sparkle: true, star: true, zzz: true, heart: true };
const SETTLE: Partial<Record<FxKind, boolean>> = { crumb: true, confetti: true, drop: true };

function easeOutBack(x: number) {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function Layer({ kind, geometry, material }: { kind: FxKind; geometry: BufferGeometry; material: Material }) {
  const ref = useRef<InstancedMesh>(null!);
  const cap = FX_CAPACITY[kind];

  useLayoutEffect(() => {
    const m = ref.current;
    m.instanceColor = new InstancedBufferAttribute(new Float32Array(cap * 3).fill(1), 3);
    m.count = 0;
    m.frustumCulled = false;
  }, [cap]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const list = particles[kind];
    const m = ref.current;
    const cam = state.camera;
    let n = 0;
    for (let i = list.length - 1; i >= 0; i--) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) {
        list.splice(i, 1);
        continue;
      }
      p.vel.y -= p.gravity * dt;
      p.vel.multiplyScalar(Math.max(0, 1 - p.drag * dt));
      p.pos.addScaledVector(p.vel, dt);
      if (p.sway) p.pos.x += Math.sin(p.age * 5 + p.seed) * p.sway * dt;
      if (SETTLE[kind] && p.pos.y < 0.02 && Math.hypot(p.pos.x, p.pos.z) < ISLAND_RADIUS) {
        p.pos.y = 0.02;
        p.vel.set(0, 0, 0);
        p.spin.multiplyScalar(0.8);
      }
      p.rot.addScaledVector(p.spin, dt);
    }
    for (let i = 0; i < list.length && n < cap; i++) {
      const p = list[i];
      const remaining = p.life - p.age;
      const pop = p.age < 0.15 ? Math.max(0, easeOutBack(p.age / 0.15)) : 1;
      const fade = remaining < p.life * 0.35 ? remaining / (p.life * 0.35) : 1;
      const s = p.size * pop * fade;
      dummy.position.copy(p.pos);
      if (BILLBOARD[kind]) {
        dummy.quaternion.copy(cam.quaternion);
        const roll = kind === "heart" ? Math.sin(p.age * 4 + p.seed) * 0.35 : p.rot.z;
        dummy.quaternion.multiply(tmpQ.setFromAxisAngle(zAxis, roll));
      } else {
        dummy.rotation.set(p.rot.x, p.rot.y, p.rot.z);
      }
      if (kind === "drop") dummy.scale.set(s * 0.7, s * 1.3, s * 0.7);
      else if (kind === "confetti") dummy.scale.set(s, s * 0.55, s);
      else dummy.scale.setScalar(s);
      dummy.updateMatrix();
      m.setMatrixAt(n, dummy.matrix);
      m.setColorAt(n, p.color);
      n++;
    }
    m.count = n;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geometry, material, cap]} />;
}

export function Effects() {
  const layers = useMemo(() => {
    const sphere = new SphereGeometry(1, 12, 10);
    const lowSphere = new SphereGeometry(1, 7, 6);
    const plane = new PlaneGeometry(1, 1);
    const zTex = textTexture("Z", { width: 128, height: 128, size: 110, color: "#ffffff", stroke: "#8a7fd6" });
    const list: { kind: FxKind; geometry: BufferGeometry; material: Material }[] = [
      {
        kind: "heart",
        geometry: heartGeometry(),
        material: new MeshStandardMaterial({ roughness: 0.35, emissive: "#ff3d7f", emissiveIntensity: 0.35 }),
      },
      {
        kind: "sparkle",
        geometry: starGeometry(),
        material: new MeshBasicMaterial({ toneMapped: false, side: DoubleSide, depthWrite: false, transparent: true }),
      },
      {
        kind: "star",
        geometry: starGeometry(),
        material: new MeshBasicMaterial({ color: "#ffe066", toneMapped: false, side: DoubleSide }),
      },
      {
        kind: "bubble",
        geometry: sphere,
        material: new MeshStandardMaterial({
          transparent: true,
          opacity: 0.55,
          roughness: 0.05,
          metalness: 0.1,
          emissive: "#cdeeff",
          emissiveIntensity: 0.35,
          depthWrite: false,
        }),
      },
      { kind: "crumb", geometry: new BoxGeometry(1, 1, 1), material: new MeshStandardMaterial({ roughness: 0.7 }) },
      {
        kind: "steam",
        geometry: lowSphere,
        material: new MeshStandardMaterial({ transparent: true, opacity: 0.75, roughness: 1, depthWrite: false }),
      },
      {
        kind: "zzz",
        geometry: plane,
        material: new MeshBasicMaterial({ map: zTex, transparent: true, depthWrite: false, toneMapped: false }),
      },
      {
        kind: "confetti",
        geometry: plane,
        material: new MeshStandardMaterial({ side: DoubleSide, roughness: 0.6 }),
      },
      {
        kind: "drop",
        geometry: sphere,
        material: new MeshStandardMaterial({ color: "#9fdcff", roughness: 0.1, transparent: true, opacity: 0.85 }),
      },
      {
        kind: "dust",
        geometry: lowSphere,
        material: new MeshStandardMaterial({ transparent: true, opacity: 0.65, depthWrite: false, roughness: 1 }),
      },
    ];
    return list;
  }, []);

  return (
    <group>
      {layers.map((l) => (
        <Layer key={l.kind} kind={l.kind} geometry={l.geometry} material={l.material} />
      ))}
    </group>
  );
}
