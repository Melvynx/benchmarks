import { useLayoutEffect, useMemo, useRef } from "react";
import { ExtrudeGeometry, Mesh, MeshStandardMaterial, Shape, type Group } from "three";
import type { FoodId } from "../game/content";
import { heartGeometry } from "./shapes";

const mat = (color: string, extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.55, ...extra });

const M = {
  leaf: mat("#5dbb63"),
  leafDark: mat("#3f9a4a"),
  stem: mat("#8a5a3b"),
  apple: mat("#ff4f5a", { roughness: 0.3 }),
  carrot: mat("#ff9434", { roughness: 0.5 }),
  melon: mat("#ff5d73", { roughness: 0.45 }),
  rindLight: mat("#d9f5b0"),
  rindDark: mat("#3fae52"),
  seed: mat("#2b2230", { roughness: 0.3 }),
  chili: mat("#ff2d2d", { roughness: 0.22 }),
  wrapper: mat("#8fd9e8", { flatShading: true }),
  frosting: mat("#ffb6cf", { roughness: 0.4 }),
  cherry: mat("#e8203f", { roughness: 0.2 }),
  gold: mat("#ffcc33", { roughness: 0.25, metalness: 0.65, emissive: "#ffb000", emissiveIntensity: 0.35 }),
  pillA: mat("#ff6b8b", { roughness: 0.25 }),
  pillB: mat("#ffffff", { roughness: 0.25 }),
  sprinkle: mat("#ffe066"),
};

function Clover({ gold = false }: { gold?: boolean }) {
  const heart = heartGeometry();
  const leaves = gold ? 4 : 3;
  const m = gold ? M.gold : M.leaf;
  return (
    <group>
      {Array.from({ length: leaves }).map((_, i) => {
        const a = (i / leaves) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, 0, a]}>
            <mesh geometry={heart} material={m} position={[0, 0.075, 0]} scale={[0.14, 0.14, 0.1]} castShadow />
          </group>
        );
      })}
      <mesh material={gold ? M.gold : M.leafDark} position={[0.02, -0.12, 0]} rotation={[0, 0, 0.25]}>
        <cylinderGeometry args={[0.012, 0.014, 0.18, 6]} />
      </mesh>
    </group>
  );
}

function Apple() {
  return (
    <group>
      <mesh material={M.apple} scale={[1, 0.92, 1]} castShadow>
        <sphereGeometry args={[0.13, 20, 16]} />
      </mesh>
      <mesh material={M.stem} position={[0, 0.13, 0]} rotation={[0, 0, 0.2]}>
        <cylinderGeometry args={[0.01, 0.012, 0.07, 6]} />
      </mesh>
      <mesh material={M.leaf} position={[0.045, 0.15, 0]} rotation={[0, 0, -0.7]} scale={[0.05, 0.022, 0.03]}>
        <sphereGeometry args={[1, 10, 8]} />
      </mesh>
      <mesh position={[-0.05, 0.05, 0.1]} scale={[0.025, 0.035, 0.01]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

function Carrot() {
  return (
    <group rotation={[0, 0, -0.5]}>
      <mesh material={M.carrot} rotation={[Math.PI, 0, 0]} castShadow>
        <coneGeometry args={[0.07, 0.32, 12]} />
      </mesh>
      {[-0.5, 0, 0.5].map((r, i) => (
        <mesh key={i} material={M.leaf} position={[r * 0.04, 0.2, 0]} rotation={[0, 0, r]}>
          <coneGeometry args={[0.018, 0.12, 5]} />
        </mesh>
      ))}
      {[0.02, -0.05].map((y, i) => (
        <mesh key={i} material={M.stem} position={[0, y, 0.055 - i * 0.01]} scale={[0.04, 0.004, 0.01]}>
          <boxGeometry />
        </mesh>
      ))}
    </group>
  );
}

function Watermelon() {
  const geos = useMemo(() => {
    const r = 0.17;
    const a0 = Math.PI / 2 - 0.55;
    const a1 = Math.PI / 2 + 0.55;
    const flesh = new Shape();
    flesh.moveTo(0, 0);
    flesh.absarc(0, 0, r, a0, a1, false);
    flesh.lineTo(0, 0);
    const band = (ri: number, ro: number) => {
      const s = new Shape();
      s.absarc(0, 0, ro, a0, a1, false);
      s.absarc(0, 0, ri, a1, a0, true);
      return s;
    };
    const opts = { depth: 0.06, bevelEnabled: true, bevelSize: 0.008, bevelThickness: 0.008, bevelSegments: 2, curveSegments: 16 };
    const mk = (s: Shape) => {
      const g = new ExtrudeGeometry(s, opts);
      g.translate(0, -0.1, -0.03);
      return g;
    };
    return { flesh: mk(flesh), light: mk(band(r, r + 0.018)), dark: mk(band(r + 0.018, r + 0.04)) };
  }, []);
  return (
    <group>
      <mesh geometry={geos.flesh} material={M.melon} castShadow />
      <mesh geometry={geos.light} material={M.rindLight} />
      <mesh geometry={geos.dark} material={M.rindDark} />
      {[
        [-0.04, -0.01],
        [0.04, -0.01],
        [0, 0.03],
        [-0.02, -0.05],
        [0.025, -0.055],
      ].map(([x, y], i) => (
        <mesh key={i} material={M.seed} position={[x, y, 0.042]} scale={[0.008, 0.013, 0.005]}>
          <sphereGeometry args={[1, 6, 5]} />
        </mesh>
      ))}
    </group>
  );
}

function Chili() {
  return (
    <group rotation={[0, 0, 0.4]}>
      <mesh material={M.chili} position={[0, 0.02, 0]} castShadow>
        <capsuleGeometry args={[0.048, 0.14, 6, 12]} />
      </mesh>
      <mesh material={M.chili} position={[0.035, -0.1, 0]} rotation={[0, 0, 0.5]}>
        <capsuleGeometry args={[0.03, 0.07, 6, 10]} />
      </mesh>
      <mesh material={M.chili} position={[0.07, -0.145, 0]} rotation={[0, 0, 1.1]}>
        <capsuleGeometry args={[0.014, 0.035, 4, 8]} />
      </mesh>
      <mesh material={M.leafDark} position={[0, 0.12, 0]}>
        <cylinderGeometry args={[0.05, 0.035, 0.03, 10]} />
      </mesh>
      <mesh material={M.leafDark} position={[-0.012, 0.16, 0]} rotation={[0, 0, 0.4]}>
        <cylinderGeometry args={[0.009, 0.012, 0.06, 6]} />
      </mesh>
    </group>
  );
}

function Cupcake() {
  return (
    <group position={[0, -0.04, 0]}>
      <mesh material={M.wrapper} castShadow>
        <cylinderGeometry args={[0.1, 0.075, 0.1, 12]} />
      </mesh>
      <mesh material={M.frosting} position={[0, 0.07, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.075, 0.04, 10, 20]} />
      </mesh>
      <mesh material={M.frosting} position={[0, 0.115, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.045, 0.035, 10, 18]} />
      </mesh>
      <mesh material={M.frosting} position={[0, 0.16, 0]}>
        <coneGeometry args={[0.04, 0.07, 12]} />
      </mesh>
      <mesh material={M.cherry} position={[0.01, 0.205, 0]}>
        <sphereGeometry args={[0.028, 12, 10]} />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = i * 1.1;
        return (
          <mesh key={i} material={i % 2 ? M.sprinkle : M.leaf} position={[Math.cos(a) * 0.07, 0.1, Math.sin(a) * 0.07]} rotation={[a, a, 0]} scale={[0.02, 0.006, 0.006]}>
            <boxGeometry />
          </mesh>
        );
      })}
    </group>
  );
}

function Pill() {
  return (
    <group rotation={[0, 0, 0.6]}>
      <mesh material={M.pillA} position={[-0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.045, 0.045, 0.07, 14]} />
      </mesh>
      <mesh material={M.pillA} position={[-0.07, 0, 0]}>
        <sphereGeometry args={[0.045, 14, 10]} />
      </mesh>
      <mesh material={M.pillB} position={[0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.045, 0.045, 0.07, 14]} />
      </mesh>
      <mesh material={M.pillB} position={[0.07, 0, 0]}>
        <sphereGeometry args={[0.045, 14, 10]} />
      </mesh>
    </group>
  );
}

export function FoodModel({ id, overlay = false }: { id: FoodId; overlay?: boolean }) {
  const ref = useRef<Group>(null!);
  useLayoutEffect(() => {
    if (!overlay) return;
    ref.current.traverse((o) => {
      if (o instanceof Mesh) {
        const m = (o.material as MeshStandardMaterial).clone();
        m.depthTest = false;
        m.transparent = true;
        o.material = m;
        o.renderOrder = 20;
      }
    });
  }, [overlay, id]);
  let body;
  switch (id) {
    case "clover":
      body = <Clover />;
      break;
    case "golden":
      body = <Clover gold />;
      break;
    case "apple":
      body = <Apple />;
      break;
    case "carrot":
      body = <Carrot />;
      break;
    case "watermelon":
      body = <Watermelon />;
      break;
    case "chili":
      body = <Chili />;
      break;
    case "cupcake":
      body = <Cupcake />;
      break;
    case "pill":
      body = <Pill />;
      break;
  }
  return <group ref={ref}>{body}</group>;
}
