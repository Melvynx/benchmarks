import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  ExtrudeGeometry,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  PointLight,
  Points,
  PointsMaterial,
  Shape,
  InstancedBufferAttribute,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { BED_POS, env, ISLAND_RADIUS, mulberry32, OBSTACLES } from "../game/runtime";
import { useGame } from "../game/store";
import { heartGeometry, textTexture } from "./shapes";

export function rimRadius(theta: number) {
  return ISLAND_RADIUS + 0.16 * Math.sin(3 * theta + 0.5) + 0.1 * Math.sin(5 * theta + 1.3) + 0.06 * Math.sin(9 * theta + 2.1);
}

const std = (color: string, extra: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.8, ...extra });

const MAT = {
  wood: std("#b77b52"),
  woodDark: std("#8a5a3e"),
  barn: std("#f07370", { roughness: 0.7 }),
  barnDark: std("#d35a5d"),
  roof: std("#7a4d63", { roughness: 0.75 }),
  trim: std("#fff6e6"),
  hay: std("#f3cf6e", { roughness: 0.95 }),
  hayDark: std("#dcae4a", { roughness: 0.95 }),
  cushion: std("#ffc3d6", { roughness: 0.9 }),
  blanket: std("#b9a4ff", { roughness: 0.9 }),
  trunk: std("#a06c4b", { flatShading: true }),
  leaf1: std("#6cc36e", { flatShading: true, roughness: 0.85 }),
  leaf2: std("#86d67a", { flatShading: true, roughness: 0.85 }),
  leaf3: std("#5ab25f", { flatShading: true, roughness: 0.85 }),
  apple: std("#ff5a5f", { roughness: 0.4 }),
  water: std("#7fd6f7", { roughness: 0.08, metalness: 0.15, emissive: "#3fb6e8", emissiveIntensity: 0.18 }),
  stone: std("#d6cfe0", { flatShading: true }),
  rock: std("#a497b5", { flatShading: true }),
  lily: std("#69c46a", { side: DoubleSide }),
  pinkFlower: std("#ff9ec4"),
  mushroom: std("#ff6b6b", { roughness: 0.5 }),
  mushStem: std("#fff3e0"),
  dots: std("#ffffff"),
  lamp: std("#fff0c2", { emissive: "#ffc766", emissiveIntensity: 0.4 }),
  metal: std("#4d4460", { roughness: 0.5, metalness: 0.4 }),
  window: std("#ffe7a6", { emissive: "#ffc766", emissiveIntensity: 0.2 }),
  heart: std("#ff8fb1", { roughness: 0.5 }),
};

function useIslandGeometry() {
  return useMemo(() => {
    const top = new PlaneGeometry(10.6, 10.6, 110, 110);
    top.rotateX(-Math.PI / 2);
    const p = top.attributes.position as BufferAttribute;
    const colors = new Float32Array(p.count * 3);
    const dark = new Color("#86cc62");
    const light = new Color("#b5e67f");
    const worn = new Color("#c6e98f");
    const c = new Color();
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i);
      let z = p.getZ(i);
      const th = Math.atan2(z, x);
      const R = rimRadius(th);
      let r = Math.hypot(x, z);
      if (r > R) {
        x = (x / r) * R;
        z = (z / r) * R;
        r = R;
      }
      let y = 0.012 * Math.sin(x * 2.3) * Math.cos(z * 1.9);
      const lip = R - 0.28;
      if (r > lip) y -= Math.pow(r - lip, 2) * 1.1;
      p.setXYZ(i, x, y, z);
      const n = 0.5 + 0.25 * Math.sin(x * 0.9 + Math.cos(z * 1.3) * 1.6) + 0.25 * Math.sin(z * 1.7 - x * 0.6);
      c.copy(dark).lerp(light, n);
      const centre = Math.max(0, 1 - r / 2.4);
      c.lerp(worn, centre * 0.35);
      if (r > lip) c.multiplyScalar(1 - (r - lip) * 0.5);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    top.setAttribute("color", new BufferAttribute(colors, 3));
    top.computeVertexNormals();

    const side = new CylinderGeometry(1, 1, 1, 56, 12, true);
    const sp = side.attributes.position as BufferAttribute;
    const scol = new Float32Array(sp.count * 3);
    const bands = [
      { t: 0, c: new Color("#79bf58") },
      { t: 0.05, c: new Color("#79bf58") },
      { t: 0.08, c: new Color("#a26c49") },
      { t: 0.3, c: new Color("#c08d5f") },
      { t: 0.45, c: new Color("#a47b6b") },
      { t: 0.7, c: new Color("#9383a3") },
      { t: 1, c: new Color("#6f6190") },
    ];
    for (let i = 0; i < sp.count; i++) {
      const x0 = sp.getX(i);
      const z0 = sp.getZ(i);
      const t = 0.5 - sp.getY(i);
      const th = Math.atan2(z0, x0);
      const R = rimRadius(th) + 0.03;
      const n = 0.1 * Math.sin(th * 7 + t * 9) + 0.07 * Math.sin(th * 13 - t * 5) + 0.05 * Math.sin(th * 3 + t * 17);
      let f: number;
      if (t < 0.06) f = 1 - t * 0.4;
      else f = Math.pow(1 - (t - 0.06) / 0.94, 1.15) * 0.97;
      const rad = Math.max(0, R * f * (1 + (t > 0.06 && t < 0.98 ? n : 0)));
      const y = -0.05 - t * 3.6 + (t > 0.1 ? n * 0.6 : 0);
      sp.setXYZ(i, Math.cos(th) * rad, y, Math.sin(th) * rad);
      let col = bands[0].c;
      for (let b = 0; b < bands.length - 1; b++) {
        if (t >= bands[b].t && t <= bands[b + 1].t) {
          const k = (t - bands[b].t) / (bands[b + 1].t - bands[b].t);
          col = c.copy(bands[b].c).lerp(bands[b + 1].c, k).clone();
        }
      }
      scol.set([col.r, col.g, col.b], i * 3);
    }
    side.setAttribute("color", new BufferAttribute(scol, 3));
    const sideFlat = side.toNonIndexed();
    sideFlat.computeVertexNormals();
    return { top, side: sideFlat };
  }, []);
}

function scatter(seed: number, count: number, minR: number, maxR: number, avoid = 0.35) {
  const r = mulberry32(seed);
  const out: { x: number; z: number; s: number; rot: number; k: number }[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 30) {
    const a = r() * Math.PI * 2;
    const rr = minR + Math.sqrt(r()) * (maxR - minR);
    const x = Math.cos(a) * rr;
    const z = Math.sin(a) * rr;
    if (rr > rimRadius(a) - 0.25) continue;
    if (OBSTACLES.some((o) => Math.hypot(x - o.x, z - o.z) < o.r + avoid)) continue;
    if (Math.hypot(x - BED_POS.x, z - BED_POS.z) < 0.8) continue;
    out.push({ x, z, s: 0.7 + r() * 0.6, rot: r() * Math.PI * 2, k: r() });
  }
  return out;
}

function GrassTufts() {
  const ref = useRef<InstancedMesh>(null!);
  const { geo, items } = useMemo(() => {
    const blades = [-0.5, 0, 0.5].map((a, i) => {
      const g = new ConeGeometry(0.035, 0.24 - i * 0.03, 4);
      g.translate(0, 0.11, 0);
      g.rotateZ(a * 0.6);
      g.rotateY(i * 1.3);
      return g;
    });
    return { geo: mergeGeometries(blades)!, items: scatter(11, 230, 0.4, 4.4, 0.25) };
  }, []);
  useLayoutEffect(() => {
    const d = new Object3D();
    const m = ref.current;
    const colors = new Float32Array(items.length * 3);
    const c = new Color();
    items.forEach((it, i) => {
      d.position.set(it.x, 0, it.z);
      d.rotation.set(0, it.rot, 0);
      d.scale.setScalar(it.s);
      d.updateMatrix();
      m.setMatrixAt(i, d.matrix);
      c.set(it.k > 0.6 ? "#6fbf55" : it.k > 0.3 ? "#8bd164" : "#a3de72");
      colors.set([c.r, c.g, c.b], i * 3);
    });
    m.instanceColor = new InstancedBufferAttribute(colors, 3);
    m.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, items.length]} castShadow receiveShadow>
      <meshStandardMaterial roughness={0.9} flatShading />
    </instancedMesh>
  );
}

function Flowers() {
  const stems = useRef<InstancedMesh>(null!);
  const heads = useRef<InstancedMesh>(null!);
  const centers = useRef<InstancedMesh>(null!);
  const items = useMemo(() => scatter(23, 70, 1.2, 4.3, 0.3), []);
  const palette = ["#ff8fb1", "#ffd166", "#ffffff", "#c3a6ff", "#ff9f6b", "#8fd3ff"];
  useLayoutEffect(() => {
    const d = new Object3D();
    const colors = new Float32Array(items.length * 3);
    const c = new Color();
    items.forEach((it, i) => {
      const h = 0.14 + it.k * 0.1;
      d.position.set(it.x, h / 2, it.z);
      d.rotation.set(0, 0, 0);
      d.scale.set(1, h, 1);
      d.updateMatrix();
      stems.current.setMatrixAt(i, d.matrix);
      d.position.set(it.x, h, it.z);
      d.rotation.set((it.k - 0.5) * 0.5, it.rot, 0);
      d.scale.set(0.065, 0.028, 0.065);
      d.updateMatrix();
      heads.current.setMatrixAt(i, d.matrix);
      d.position.set(it.x, h + 0.018, it.z);
      d.scale.set(0.026, 0.02, 0.026);
      d.updateMatrix();
      centers.current.setMatrixAt(i, d.matrix);
      c.set(palette[Math.floor(it.k * palette.length) % palette.length]);
      colors.set([c.r, c.g, c.b], i * 3);
    });
    heads.current.instanceColor = new InstancedBufferAttribute(colors, 3);
    stems.current.instanceMatrix.needsUpdate = true;
    heads.current.instanceMatrix.needsUpdate = true;
    centers.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <group>
      <instancedMesh ref={stems} args={[undefined, undefined, items.length]}>
        <cylinderGeometry args={[0.008, 0.01, 1, 5]} />
        <meshStandardMaterial color="#5aa84f" />
      </instancedMesh>
      <instancedMesh ref={heads} args={[undefined, undefined, items.length]} castShadow>
        <sphereGeometry args={[1, 10, 6]} />
        <meshStandardMaterial roughness={0.6} />
      </instancedMesh>
      <instancedMesh ref={centers} args={[undefined, undefined, items.length]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshStandardMaterial color="#ffcf4a" />
      </instancedMesh>
    </group>
  );
}

function Barn() {
  const windowMat = useMemo(() => MAT.window.clone(), []);
  const gable = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.8, 0);
    s.lineTo(0.8, 0);
    s.lineTo(0, 0.62);
    s.lineTo(-0.8, 0);
    const g = new ExtrudeGeometry(s, { depth: 1.36, bevelEnabled: false });
    g.translate(0, 0, -0.68);
    return g;
  }, []);
  useFrame(() => {
    windowMat.emissiveIntensity = 0.15 + env.night * 1.6;
  });
  const o = OBSTACLES[0];
  return (
    <group position={[o.x, 0, o.z]} rotation={[0, Math.atan2(-o.x, -o.z) + 0.15, 0]}>
      <mesh material={MAT.barn} position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.6, 1.2, 1.36]} />
      </mesh>
      <mesh geometry={gable} material={MAT.barn} position={[0, 1.2, 0]} castShadow />
      {[-1, 1].map((sd) => (
        <mesh key={sd} material={MAT.roof} position={[sd * 0.43, 1.53, 0]} rotation={[0, 0, -sd * 0.66]} castShadow>
          <boxGeometry args={[1.1, 0.1, 1.56]} />
        </mesh>
      ))}
      <mesh material={MAT.trim} position={[0, 1.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 1.6, 8]} />
      </mesh>
      {[
        [-0.8, 0.69],
        [0.8, 0.69],
        [-0.8, -0.69],
        [0.8, -0.69],
      ].map(([x, z], i) => (
        <mesh key={i} material={MAT.trim} position={[x, 0.6, z]}>
          <boxGeometry args={[0.09, 1.22, 0.09]} />
        </mesh>
      ))}
      <group position={[0, 0, 0.69]}>
        <mesh material={MAT.barnDark} position={[0, 0.42, 0.01]}>
          <boxGeometry args={[0.66, 0.84, 0.04]} />
        </mesh>
        {[
          [0, 0.85, 0.72, 0.07],
          [-0.33, 0.42, 0.07, 0.86],
          [0.33, 0.42, 0.07, 0.86],
        ].map(([x, y, w, h], i) => (
          <mesh key={i} material={MAT.trim} position={[x, y, 0.035]}>
            <boxGeometry args={[w, h, 0.05]} />
          </mesh>
        ))}
        {[-1, 1].map((sd) => (
          <mesh key={sd} material={MAT.trim} position={[0, 0.42, 0.04]} rotation={[0, 0, sd * 0.9]}>
            <boxGeometry args={[0.98, 0.06, 0.04]} />
          </mesh>
        ))}
        <mesh material={windowMat} position={[0, 1.42, 0.02]}>
          <boxGeometry args={[0.32, 0.26, 0.04]} />
        </mesh>
        <mesh material={MAT.trim} position={[0, 1.42, 0.03]}>
          <boxGeometry args={[0.38, 0.05, 0.04]} />
        </mesh>
        <mesh material={MAT.trim} position={[0, 1.42, 0.03]}>
          <boxGeometry args={[0.05, 0.32, 0.04]} />
        </mesh>
        <mesh geometry={heartGeometry()} material={MAT.heart} position={[0, 1.02, 0.04]} scale={0.14} />
      </group>
      <mesh material={MAT.hay} position={[1.05, 0.22, 0.35]} rotation={[0, 0.3, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.5, 16]} />
      </mesh>
      <mesh material={MAT.hayDark} position={[1.05, 0.22, 0.35]} rotation={[0, 0.3, Math.PI / 2]}>
        <torusGeometry args={[0.2, 0.02, 6, 20]} />
      </mesh>
      <mesh material={MAT.hay} position={[1.0, 0.62, 0.3]} rotation={[0, -0.2, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.44, 16]} />
      </mesh>
    </group>
  );
}

function Bed() {
  return (
    <group position={[BED_POS.x, 0, BED_POS.z]}>
      <mesh material={MAT.hay} position={[0, 0.1, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <torusGeometry args={[0.62, 0.16, 12, 32]} />
      </mesh>
      <mesh material={MAT.cushion} position={[0, 0.07, 0]} receiveShadow>
        <cylinderGeometry args={[0.64, 0.64, 0.1, 32]} />
      </mesh>
      <mesh material={MAT.blanket} position={[0.18, 0.13, 0.2]} rotation={[0, 0.6, 0]} scale={[0.42, 0.04, 0.3]}>
        <sphereGeometry args={[1, 16, 10]} />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh key={i} material={MAT.hayDark} position={[Math.cos(a) * 0.72, 0.2, Math.sin(a) * 0.72]} rotation={[0.3, a, 0.4]}>
            <boxGeometry args={[0.2, 0.015, 0.015]} />
          </mesh>
        );
      })}
    </group>
  );
}

function Tree() {
  const canopy = useRef<Group>(null!);
  const o = OBSTACLES[1];
  const apples = useMemo(() => {
    const r = mulberry32(5);
    return Array.from({ length: 7 }, () => {
      const th = r() * Math.PI * 2;
      const ph = 0.3 + r() * 1.1;
      return [Math.cos(th) * Math.sin(ph) * 0.86, 1.95 + Math.cos(ph) * 0.8, Math.sin(th) * Math.sin(ph) * 0.86] as [number, number, number];
    });
  }, []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    canopy.current.rotation.z = Math.sin(t * 0.8) * 0.025;
    canopy.current.rotation.x = Math.cos(t * 0.6) * 0.02;
  });
  return (
    <group position={[o.x, 0, o.z]}>
      <mesh material={MAT.trunk} position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.2, 1.4, 7]} />
      </mesh>
      <mesh material={MAT.trunk} position={[0.2, 1.2, 0.05]} rotation={[0, 0, -0.8]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 0.5, 6]} />
      </mesh>
      <group ref={canopy} position={[0, 0.2, 0]}>
        <mesh material={MAT.leaf1} position={[0, 1.8, 0]} castShadow>
          <icosahedronGeometry args={[0.95, 1]} />
        </mesh>
        <mesh material={MAT.leaf2} position={[0.55, 1.55, 0.25]} castShadow>
          <icosahedronGeometry args={[0.62, 1]} />
        </mesh>
        <mesh material={MAT.leaf3} position={[-0.5, 1.6, -0.2]} castShadow>
          <icosahedronGeometry args={[0.66, 1]} />
        </mesh>
        <mesh material={MAT.leaf2} position={[0.05, 2.45, 0.05]} castShadow>
          <icosahedronGeometry args={[0.55, 1]} />
        </mesh>
        {apples.map((p, i) => (
          <mesh key={i} material={MAT.apple} position={p}>
            <sphereGeometry args={[0.075, 10, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Pond() {
  const o = OBSTACLES[2];
  const shimmer = useRef<Group>(null!);
  const stones = useMemo(() => {
    const r = mulberry32(99);
    return Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2 + r() * 0.2;
      const rad = 1.0 + r() * 0.08;
      return { x: Math.cos(a) * rad * 1.05, z: Math.sin(a) * rad * 0.85, s: 0.1 + r() * 0.08, rot: r() * 3 };
    });
  }, []);
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    shimmer.current.children.forEach((c, i) => {
      c.position.x = Math.sin(t * 0.4 + i * 2) * 0.45;
      c.position.z = Math.cos(t * 0.3 + i * 1.3) * 0.3;
      c.scale.setScalar(0.8 + Math.sin(t * 1.5 + i) * 0.2);
    });
  });
  return (
    <group position={[o.x, 0, o.z]} rotation={[0, 0.4, 0]}>
      <mesh material={MAT.water} position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.05, 0.85, 1]} receiveShadow>
        <circleGeometry args={[1, 40]} />
      </mesh>
      <group ref={shimmer} position={[0, 0.02, 0]}>
        {[0, 1, 2].map((i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} scale={[0.22, 0.05, 1]}>
            <circleGeometry args={[1, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.45} />
          </mesh>
        ))}
      </group>
      {stones.map((s, i) => (
        <mesh key={i} material={MAT.stone} position={[s.x, 0.03, s.z]} rotation={[0, s.rot, 0]} scale={[s.s * 1.3, s.s * 0.6, s.s]} castShadow>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
      {[
        [-0.35, 0.2, 0.22],
        [0.3, -0.25, 0.18],
        [0.1, 0.35, 0.15],
      ].map(([x, z, s], i) => (
        <mesh key={i} material={MAT.lily} position={[x, 0.025, z]} rotation={[-Math.PI / 2, 0, i * 2]} scale={s}>
          <circleGeometry args={[1, 20, 0.4, Math.PI * 1.8]} />
        </mesh>
      ))}
      <group position={[-0.35, 0.05, 0.2]}>
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={i} material={MAT.pinkFlower} rotation={[0.5, (i / 5) * Math.PI * 2, 0]} position={[0, 0.02, 0]}>
            <coneGeometry args={[0.04, 0.1, 4]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Lantern() {
  const light = useRef<PointLight>(null!);
  const glass = useMemo(() => MAT.lamp.clone(), []);
  const o = OBSTACLES[3];
  useFrame((s) => {
    const flicker = 1 + Math.sin(s.clock.elapsedTime * 9) * 0.04 + Math.sin(s.clock.elapsedTime * 23) * 0.03;
    light.current.intensity = env.night * 7 * flicker;
    glass.emissiveIntensity = 0.3 + env.night * 2.6 * flicker;
  });
  return (
    <group position={[o.x, 0, o.z]}>
      <mesh material={MAT.woodDark} position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 1.4, 8]} />
      </mesh>
      <mesh material={MAT.woodDark} position={[0.14, 1.36, 0]}>
        <boxGeometry args={[0.32, 0.05, 0.05]} />
      </mesh>
      <group position={[0.26, 1.17, 0]}>
        <mesh material={glass}>
          <cylinderGeometry args={[0.1, 0.1, 0.2, 8]} />
        </mesh>
        <mesh material={MAT.metal} position={[0, 0.14, 0]}>
          <coneGeometry args={[0.15, 0.1, 8]} />
        </mesh>
        <mesh material={MAT.metal} position={[0, -0.11, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.03, 8]} />
        </mesh>
        <pointLight ref={light} color="#ffc873" distance={6} decay={1.6} intensity={0} />
      </group>
    </group>
  );
}

function Sign() {
  const name = useGame((s) => s.name);
  const tex = useMemo(() => textTexture(name, { width: 512, height: 192, size: 120, color: "#fff7e8", stroke: "#7a4a2e" }), [name]);
  const o = OBSTACLES[4];
  return (
    <group position={[o.x, 0, o.z]} rotation={[0, 0.55, 0]}>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} material={MAT.woodDark} position={[x, 0.35, -0.02]} castShadow>
          <boxGeometry args={[0.07, 0.7, 0.07]} />
        </mesh>
      ))}
      <mesh material={MAT.wood} position={[0, 0.62, 0]} castShadow>
        <boxGeometry args={[0.95, 0.38, 0.06]} />
      </mesh>
      <mesh position={[0, 0.62, 0.032]}>
        <planeGeometry args={[0.9, 0.34]} />
        <meshStandardMaterial map={tex} transparent roughness={0.9} />
      </mesh>
    </group>
  );
}

function Fence() {
  const posts = useMemo(() => {
    const out: { x: number; z: number; a: number }[] = [];
    const n = 8;
    for (let i = 0; i < n; i++) {
      const th = -1.95 + (i / (n - 1)) * 1.05;
      const R = rimRadius(th) - 0.38;
      out.push({ x: Math.cos(th) * R, z: Math.sin(th) * R, a: th });
    }
    return out;
  }, []);
  return (
    <group>
      {posts.map((p, i) => (
        <group key={i}>
          <mesh material={MAT.trim} position={[p.x, 0.3, p.z]} castShadow>
            <boxGeometry args={[0.09, 0.6, 0.09]} />
          </mesh>
          <mesh material={MAT.trim} position={[p.x, 0.63, p.z]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.075, 0.08, 4]} />
          </mesh>
          {i < posts.length - 1 &&
            [0.22, 0.44].map((y) => {
              const q = posts[i + 1];
              const len = Math.hypot(q.x - p.x, q.z - p.z);
              return (
                <mesh
                  key={y}
                  material={MAT.trim}
                  position={[(p.x + q.x) / 2, y, (p.z + q.z) / 2]}
                  rotation={[0, -Math.atan2(q.z - p.z, q.x - p.x), 0]}
                  castShadow
                >
                  <boxGeometry args={[len, 0.06, 0.04]} />
                </mesh>
              );
            })}
        </group>
      ))}
    </group>
  );
}

function Mushrooms() {
  const spots = [
    [3.1, -1.2, 1],
    [3.35, -1.0, 0.7],
    [-0.4, -3.4, 0.9],
    [1.2, 3.55, 0.8],
  ];
  return (
    <group>
      {spots.map(([x, z, s], i) => (
        <group key={i} position={[x, 0, z]} scale={s}>
          <mesh material={MAT.mushStem} position={[0, 0.07, 0]}>
            <cylinderGeometry args={[0.04, 0.05, 0.14, 8]} />
          </mesh>
          <mesh material={MAT.mushroom} position={[0, 0.14, 0]} scale={[1, 0.7, 1]} castShadow>
            <sphereGeometry args={[0.1, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          {[0, 2.1, 4.2].map((a) => (
            <mesh key={a} material={MAT.dots} position={[Math.cos(a) * 0.06, 0.2, Math.sin(a) * 0.06]} scale={[0.02, 0.01, 0.02]}>
              <sphereGeometry args={[1, 6, 4]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function Rocks() {
  const items = useMemo(
    () => [
      { p: [-3.6, 0.05, -0.6], s: 0.22 },
      { p: [-3.45, 0.04, -0.3], s: 0.14 },
      { p: [0.9, 0.05, -3.7], s: 0.2 },
      { p: [3.5, 0.05, 0.2], s: 0.18 },
    ],
    [],
  );
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} material={MAT.rock} position={it.p as [number, number, number]} scale={[it.s * 1.3, it.s, it.s]} rotation={[0, i, 0]} castShadow>
          <dodecahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  );
}

function FloatingRocks() {
  const ref = useRef<Group>(null!);
  const defs = useMemo(
    () => [
      { x: 6.2, y: -1.2, z: -2.5, s: 0.55 },
      { x: -6.6, y: -2.0, z: -1.0, s: 0.4 },
      { x: 5.0, y: -3.2, z: 2.4, s: 0.3 },
      { x: -4.8, y: -0.4, z: -4.6, s: 0.35 },
    ],
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    ref.current.children.forEach((c, i) => {
      c.position.y = defs[i].y + Math.sin(t * 0.6 + i * 1.7) * 0.2;
      c.rotation.y = t * 0.1 + i;
    });
  });
  return (
    <group ref={ref}>
      {defs.map((d, i) => (
        <group key={i} position={[d.x, d.y, d.z]} scale={d.s}>
          <mesh material={MAT.rock} position={[0, -0.4, 0]} rotation={[Math.PI, 0, 0]}>
            <coneGeometry args={[0.9, 1.4, 6]} />
          </mesh>
          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry args={[0.92, 0.9, 0.12, 6]} />
            <meshStandardMaterial color="#8fd16a" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Butterflies() {
  const ref = useRef<Group>(null!);
  const colors = ["#ffb3d1", "#ffe08a", "#b9a4ff"];
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    const vis = 1 - env.night;
    ref.current.children.forEach((b, i) => {
      const k = t * (0.25 + i * 0.05) + i * 2.1;
      const nx = Math.sin(k) * (2.2 + i * 0.5);
      const nz = Math.sin(k * 1.7 + i) * (1.8 + i * 0.3);
      const ny = 1.1 + Math.sin(k * 3.1) * 0.35 + i * 0.25;
      b.lookAt(nx, ny, nz);
      b.position.set(nx, ny, nz);
      b.scale.setScalar(Math.max(0.0001, vis));
      const flap = Math.sin(t * 16 + i) * 1.0;
      b.children[0].rotation.z = flap;
      b.children[1].rotation.z = -flap;
    });
  });
  return (
    <group ref={ref}>
      {colors.map((c, i) => (
        <group key={i}>
          {[1, -1].map((sd) => (
            <group key={sd}>
              <mesh position={[sd * 0.07, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[0.07, 0.09, 1]}>
                <circleGeometry args={[1, 12]} />
                <meshStandardMaterial color={c} side={DoubleSide} roughness={0.6} />
              </mesh>
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}

function Fireflies() {
  const ref = useRef<Points>(null!);
  const { geo, base } = useMemo(() => {
    const r = mulberry32(3);
    const n = 40;
    const base = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = r() * Math.PI * 2;
      const rr = 0.8 + r() * 3.8;
      base.set([Math.cos(a) * rr, 0.3 + r() * 1.8, Math.sin(a) * rr], i * 3);
    }
    const g = new BufferGeometry();
    g.setAttribute("position", new BufferAttribute(base.slice(), 3));
    return { geo: g, base };
  }, []);
  const mat = useMemo(
    () => new PointsMaterial({ color: "#fff3a0", size: 0.13, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
    [],
  );
  useFrame((s) => {
    const t = s.clock.elapsedTime;
    mat.opacity = Math.max(0, env.night - 0.3) * (0.8 + Math.sin(t * 3) * 0.2);
    ref.current.visible = mat.opacity > 0.01;
    if (!ref.current.visible) return;
    const p = geo.attributes.position as BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      p.setXYZ(
        i,
        base[i * 3] + Math.sin(t * 0.5 + i) * 0.3,
        base[i * 3 + 1] + Math.sin(t * 0.8 + i * 2) * 0.2,
        base[i * 3 + 2] + Math.cos(t * 0.4 + i) * 0.3,
      );
    }
    p.needsUpdate = true;
  });
  return <points ref={ref} geometry={geo} material={mat} />;
}

function SteppingStones() {
  const stones = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      out.push([-0.4 - t * 0.9 + Math.sin(i * 2) * 0.08, 0.012, 1.6 - t * 2.5]);
    }
    return out;
  }, []);
  return (
    <group>
      {stones.map((p, i) => (
        <mesh key={i} material={MAT.stone} position={p} scale={[0.2, 0.02, 0.16]} rotation={[0, i, 0]} receiveShadow>
          <cylinderGeometry args={[1, 1, 1, 9]} />
        </mesh>
      ))}
    </group>
  );
}

export function Island() {
  const { top, side } = useIslandGeometry();
  const topMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), []);
  const sideMat = useMemo(() => new MeshStandardMaterial({ vertexColors: true, roughness: 0.95, flatShading: true }), []);
  return (
    <group>
      <mesh geometry={top} material={topMat} receiveShadow />
      <mesh geometry={side} material={sideMat} castShadow receiveShadow />
      <GrassTufts />
      <Flowers />
      <SteppingStones />
      <Barn />
      <Bed />
      <Tree />
      <Pond />
      <Lantern />
      <Sign />
      <Fence />
      <Mushrooms />
      <Rocks />
      <FloatingRocks />
      <Butterflies />
      <Fireflies />
    </group>
  );
}
