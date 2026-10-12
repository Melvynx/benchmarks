import { useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { LatheGeometry, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Vector2, Vector3, type Group } from "three";
import { useGame } from "../game/store";
import { sfx } from "../game/audio";
import { CONFETTI, emit } from "./fx";
import { pet } from "../game/runtime";

const EGG_H = 0.62;
const eggRadius = (y: number) => Math.sqrt(Math.max(0, 1 - y * y)) * 0.8 * (1 - 0.14 * y);

function useEggHalves() {
  return useMemo(() => {
    const split = 0.12;
    const pts = (from: number, to: number) => {
      const out: Vector2[] = [];
      const n = 28;
      for (let i = 0; i <= n; i++) {
        const y = from + ((to - from) * i) / n;
        out.push(new Vector2(eggRadius(y), y));
      }
      return out;
    };
    const bottom = new LatheGeometry(pts(-1, split), 40);
    const top = new LatheGeometry(pts(split, 1), 40);
    return { bottom, top, split };
  }, []);
}

const CRACKS: [number, number, number][] = [
  [-0.05, 0.35, 0.6],
  [0.08, 0.22, -0.6],
  [-0.06, 0.08, 0.6],
  [0.12, 0.45, -0.7],
  [0.25, 0.32, 0.7],
  [0.32, 0.18, -0.5],
  [-0.2, 0.5, -0.6],
  [-0.3, 0.36, 0.6],
  [-0.4, 0.2, -0.5],
];

export function Egg() {
  const hatched = useGame((s) => s.hatched);
  const cracks = useGame((s) => s.eggCracks);
  const root = useRef<Group>(null!);
  const top = useRef<Group>(null!);
  const wob = useRef({ amp: 0, t: 0, burstT: -1 });
  const { bottom: bottomGeo, top: topGeo } = useEggHalves();
  const shell = useMemo(
    () => new MeshPhysicalMaterial({ color: "#fff8ee", roughness: 0.45, sheen: 0.6, sheenColor: "#ffffff", clearcoat: 0.3 }),
    [],
  );
  const spot = useMemo(() => new MeshStandardMaterial({ color: "#3d3346", roughness: 0.6 }), []);
  const crackMat = useMemo(() => new MeshStandardMaterial({ color: "#5a4a60", roughness: 0.8 }), []);
  const hay = useMemo(() => new MeshStandardMaterial({ color: "#f3cf6e", roughness: 0.95 }), []);

  const spots = useMemo(() => {
    const dirs: [number, number, number, number][] = [
      [0.8, 0.3, 0.5, 0.26],
      [-0.7, -0.2, 0.7, 0.22],
      [0.1, 0.7, -0.7, 0.24],
      [-0.6, 0.5, -0.4, 0.2],
      [0.5, -0.5, -0.6, 0.22],
    ];
    return dirs.map(([x, y, z, s]) => {
      const n = new Vector3(x, y, z).normalize();
      const r = eggRadius(n.y);
      const h = Math.hypot(n.x, n.z);
      const pos = new Vector3((n.x / h) * r * 0.97, n.y, (n.z / h) * r * 0.97);
      const q = new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), new Vector3(n.x, n.y * 0.6, n.z).normalize());
      return { pos, q, s, top: n.y > 0.12 };
    });
  }, []);

  useFrame((state, rawDt) => {
    if (!root.current) return;
    const dt = Math.min(rawDt, 0.05);
    const t = state.clock.elapsedTime;
    const w = wob.current;
    w.amp = Math.max(0, w.amp - dt * 1.6);
    const idle = Math.max(0, Math.sin(t * 1.3)) > 0.97 ? 0.35 : 0;
    const amp = Math.max(w.amp, idle * 0.4);
    root.current.rotation.z = Math.sin(t * 18) * 0.12 * amp;
    root.current.rotation.x = Math.cos(t * 15) * 0.05 * amp;
    root.current.position.y = EGG_H + 0.02 + Math.abs(Math.sin(t * 18)) * 0.03 * amp;
    if (cracks >= 3) {
      if (w.burstT < 0) w.burstT = t;
      const k = Math.min(1, (t - w.burstT) / 0.45);
      root.current.scale.set(1 + k * 0.12, 1 + k * 0.18 - Math.sin(k * Math.PI * 6) * 0.05, 1 + k * 0.12);
      top.current.position.y = k * 0.1;
    } else {
      root.current.scale.setScalar(1);
      top.current.position.y = 0;
    }
  });

  if (hatched) return null;

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const g = useGame.getState();
    if (g.eggCracks >= 3) return;
    wob.current.amp = 1;
    sfx.crack();
    const origin = new Vector3(pet.pos.x, EGG_H + 0.3, pet.pos.z + 0.3);
    emit("sparkle", origin, { count: 6, speed: 1.3, size: 0.12, life: 0.6, color: ["#fff6b0", "#ffffff"] });
    emit("crumb", origin, { count: 5, speed: 1.2, up: 1.2, size: 0.04, life: 1, gravity: 6, color: "#fff8ee" });
    g.crackEgg();
    if (g.eggCracks + 1 >= 3) {
      window.setTimeout(() => {
        const o = new Vector3(pet.pos.x, EGG_H + 0.2, pet.pos.z);
        emit("confetti", o, { count: 90, speed: 3.4, up: 3, size: 0.09, life: 2.6, gravity: 4, drag: 1.2, color: CONFETTI });
        emit("crumb", o, { count: 24, speed: 2.4, up: 2, size: 0.07, life: 1.6, gravity: 7, color: ["#fff8ee", "#3d3346"] });
        emit("sparkle", o, { count: 24, speed: 2.2, size: 0.16, life: 1, radius: 0.4, color: ["#fff3a8", "#ffffff", "#ffc6e0"] });
        sfx.pop();
      }, 420);
    }
  };

  return (
    <group position={[pet.pos.x, 0, pet.pos.z]}>
      <mesh material={hay} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.46, 0.14, 10, 28]} />
      </mesh>
      {Array.from({ length: 14 }).map((_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh key={i} material={hay} position={[Math.cos(a) * 0.52, 0.16, Math.sin(a) * 0.52]} rotation={[0.4, a, 0.5]}>
            <boxGeometry args={[0.22, 0.015, 0.015]} />
          </mesh>
        );
      })}
      <group
        ref={root}
        position={[0, EGG_H, 0]}
        scale={1}
        onClick={onClick}
        onPointerOver={() => (document.body.dataset.hover = "item")}
        onPointerOut={() => delete document.body.dataset.hover}
      >
        <group scale={[EGG_H * 0.95, EGG_H, EGG_H * 0.95]}>
          <mesh geometry={bottomGeo} material={shell} castShadow />
          {spots
            .filter((s) => !s.top)
            .map((s, i) => (
              <mesh key={i} material={spot} position={s.pos} quaternion={s.q} scale={[s.s, s.s * 0.8, 0.06]}>
                <sphereGeometry args={[1, 16, 12]} />
              </mesh>
            ))}
          <group ref={top}>
            <mesh geometry={topGeo} material={shell} castShadow />
            {spots
              .filter((s) => s.top)
              .map((s, i) => (
                <mesh key={i} material={spot} position={s.pos} quaternion={s.q} scale={[s.s, s.s * 0.8, 0.06]}>
                  <sphereGeometry args={[1, 16, 12]} />
                </mesh>
              ))}
          </group>
          {CRACKS.slice(0, cracks * 3).map(([x, y, rot], i) => {
            const r = eggRadius(y);
            const z = Math.sqrt(Math.max(0, r * r - x * x));
            return (
              <mesh key={i} material={crackMat} position={[x, y, z + 0.005]} rotation={[0, Math.atan2(x, z), rot]}>
                <boxGeometry args={[0.2, 0.025, 0.02]} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
}
