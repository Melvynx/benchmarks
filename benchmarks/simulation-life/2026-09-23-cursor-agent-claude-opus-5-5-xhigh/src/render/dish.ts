import * as THREE from "three";
import { createRng } from "../sim/rng";
import type { Tree } from "../sim/types";
import { makeGrassTexture, makeSoftShadowTexture } from "./textures";

export const RIM_PAD = 0.55;
export const DISH_DEPTH = 1.5;

export function buildDish(radius: number, seed: number, trees: Tree[]): THREE.Group {
  const group = new THREE.Group();
  const outer = radius + RIM_PAD;

  const grass = new THREE.Mesh(
    new THREE.CircleGeometry(outer, 128),
    new THREE.MeshStandardMaterial({ map: makeGrassTexture(seed), roughness: 0.95, metalness: 0 }),
  );
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;
  group.add(grass);

  const profile = [
    [outer - 0.02, -0.08],
    [outer, 0.18],
    [outer + 0.06, 0.32],
    [outer + 0.2, 0.41],
    [outer + 0.38, 0.41],
    [outer + 0.52, 0.32],
    [outer + 0.6, 0.12],
    [outer + 0.6, -0.35],
    [outer + 0.5, -0.95],
    [outer + 0.32, -1.35],
    [outer + 0.1, -DISH_DEPTH],
    [0, -DISH_DEPTH],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const rim = new THREE.Mesh(
    new THREE.LatheGeometry(profile, 160),
    new THREE.MeshPhysicalMaterial({
      color: "#f2b894",
      roughness: 0.55,
      clearcoat: 0.5,
      clearcoatRoughness: 0.35,
    }),
  );
  rim.castShadow = true;
  rim.receiveShadow = true;
  group.add(rim);

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(outer + 0.58, 0.05, 10, 160),
    new THREE.MeshStandardMaterial({ color: "#e89b76", roughness: 0.6 }),
  );
  band.rotation.x = Math.PI / 2;
  band.position.y = -0.55;
  group.add(band);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(outer * 3.2, outer * 3.2),
    new THREE.MeshBasicMaterial({
      map: makeSoftShadowTexture(),
      transparent: true,
      opacity: 0.32,
      color: "#6e4a36",
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -DISH_DEPTH - 0.02;
  group.add(shadow);

  group.add(buildDecor(radius, seed, trees));
  return group;
}

function buildDecor(radius: number, seed: number, trees: Tree[]): THREE.Group {
  const g = new THREE.Group();
  const rng = createRng(seed * 131 + 17);
  const area = Math.PI * radius * radius;
  const free = (x: number, z: number) => trees.every((t) => Math.hypot(t.x - x, t.y - z) > 0.75 * t.scale);
  const point = (margin: number): [number, number] => {
    for (let i = 0; i < 20; i++) {
      const r = Math.sqrt(rng.next()) * (radius - margin);
      const a = rng.next() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (free(x, z)) return [x, z];
    }
    return [0, 0];
  };

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const p = new THREE.Vector3();
  const s = new THREE.Vector3();
  const c = new THREE.Color();

  const tufts = Math.round(area * 0.32);
  const blade = new THREE.ConeGeometry(0.035, 0.3, 4);
  blade.translate(0, 0.15, 0);
  const blades = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 0.9 }), tufts * 3);
  const bladeTones = ["#5fa84a", "#6fb654", "#4f9a42", "#7cc25e", "#8fcf68"];
  let k = 0;
  for (let i = 0; i < tufts; i++) {
    const [x, z] = point(0.3);
    const tone = rng.pick(bladeTones);
    for (let j = 0; j < 3; j++) {
      e.set(rng.range(-0.35, 0.35), rng.next() * Math.PI, rng.range(-0.35, 0.35));
      q.setFromEuler(e);
      p.set(x + rng.range(-0.07, 0.07), 0, z + rng.range(-0.07, 0.07));
      const h = rng.range(0.6, 1.25);
      s.set(1, h, 1);
      m.compose(p, q, s);
      blades.setMatrixAt(k, m);
      blades.setColorAt(k, c.set(tone));
      k++;
    }
  }
  blades.receiveShadow = true;
  g.add(blades);

  const flowerCount = Math.round(area * 0.045);
  const stems = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.012, 0.014, 0.22, 5).translate(0, 0.11, 0),
    new THREE.MeshStandardMaterial({ color: "#4f9a42", roughness: 0.9 }),
    flowerCount,
  );
  const heads = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.065, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.5 }),
    flowerCount * 2,
  );
  const petals = ["#ffffff", "#ffe27a", "#ffb3cf", "#d9c2ff", "#ffffff"];
  for (let i = 0; i < flowerCount; i++) {
    const [x, z] = point(0.4);
    const h = rng.range(0.7, 1.2);
    m.compose(p.set(x, 0, z), q.identity(), s.set(1, h, 1));
    stems.setMatrixAt(i, m);
    m.compose(p.set(x, 0.22 * h + 0.02, z), q.identity(), s.set(1, 0.6, 1));
    heads.setMatrixAt(i * 2, m);
    heads.setColorAt(i * 2, c.set(rng.pick(petals)));
    m.compose(p.set(x, 0.22 * h + 0.055, z), q.identity(), s.set(0.45, 0.45, 0.45));
    heads.setMatrixAt(i * 2 + 1, m);
    heads.setColorAt(i * 2 + 1, c.set("#ffcf4a"));
  }
  g.add(stems, heads);

  const pebbleCount = Math.round(area * 0.03);
  const pebbles = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.12, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.8 }),
    pebbleCount,
  );
  const stoneTones = ["#d9cbb8", "#c9bba7", "#e6dccd", "#bfb3a3"];
  for (let i = 0; i < pebbleCount; i++) {
    const [x, z] = point(0.4);
    e.set(0, rng.next() * Math.PI, 0);
    const sc = rng.range(0.6, 1.5);
    m.compose(p.set(x, 0.02, z), q.setFromEuler(e), s.set(sc * 1.3, sc * 0.45, sc));
    pebbles.setMatrixAt(i, m);
    pebbles.setColorAt(i, c.set(rng.pick(stoneTones)));
  }
  pebbles.castShadow = true;
  pebbles.receiveShadow = true;
  g.add(pebbles);

  return g;
}
