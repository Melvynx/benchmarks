import * as THREE from 'three';
import { toon } from './textures';

export type FoodId = 'clover' | 'apple' | 'carrot' | 'hay' | 'cupcake' | 'chili';
export type Taste = 'love' | 'like' | 'hate';

export interface FoodDef {
  id: FoodId;
  name: string;
  emoji: string;
  color: number;
  hunger: number;
  happy: number;
  energy: number;
  clean: number;
  xp: number;
  taste: Taste;
  blurb: string;
}

export const FOODS: FoodDef[] = [
  { id: 'clover', name: 'Clover', emoji: '🍀', color: 0x5cbf4a, hunger: 12, happy: 8, energy: 2, clean: 0, xp: 7, taste: 'love', blurb: 'Her favorite' },
  { id: 'apple', name: 'Apple', emoji: '🍎', color: 0xe8413c, hunger: 18, happy: 5, energy: 4, clean: 0, xp: 6, taste: 'like', blurb: 'Crunchy' },
  { id: 'carrot', name: 'Carrot', emoji: '🥕', color: 0xff8a1f, hunger: 16, happy: 4, energy: 5, clean: 0, xp: 6, taste: 'like', blurb: 'Snappy' },
  { id: 'hay', name: 'Hay', emoji: '🌾', color: 0xe8c55a, hunger: 28, happy: 1, energy: 3, clean: -2, xp: 5, taste: 'like', blurb: 'Very filling' },
  { id: 'cupcake', name: 'Cupcake', emoji: '🧁', color: 0xf59ac0, hunger: 8, happy: 16, energy: 10, clean: -5, xp: 8, taste: 'love', blurb: 'Sugar rush' },
  { id: 'chili', name: 'Chili', emoji: '🌶️', color: 0xd62b2b, hunger: 4, happy: -6, energy: 18, clean: 0, xp: 12, taste: 'hate', blurb: 'Spicy!' },
];

export const foodById = (id: FoodId) => FOODS.find((f) => f.id === id)!;

export const FOOD_REST_Y = 0.17;

function mesh(geo: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, toon(color));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export function buildFoodMesh(id: FoodId): THREE.Group {
  const g = new THREE.Group();
  switch (id) {
    case 'clover': {
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + 0.3;
        const leaf = mesh(new THREE.SphereGeometry(0.1, 14, 10), 0x4fb84a, Math.cos(a) * 0.1, 0.12, Math.sin(a) * 0.1);
        leaf.scale.set(1.2, 0.35, 1);
        leaf.rotation.y = -a;
        g.add(leaf);
      }
      const center = mesh(new THREE.SphereGeometry(0.04, 10, 8), 0x2f8f35, 0, 0.14, 0);
      g.add(center);
      const stem = mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.24, 6), 0x3d9a3a, 0.02, 0.0, 0);
      stem.rotation.z = 0.3;
      g.add(stem);
      g.rotation.x = -0.35;
      break;
    }
    case 'apple': {
      const body = mesh(new THREE.SphereGeometry(0.17, 20, 16), 0xe8413c);
      body.scale.set(1, 0.9, 1);
      g.add(body);
      g.add(mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.1, 6), 0x6b4226, 0, 0.18, 0));
      const leaf = mesh(new THREE.SphereGeometry(0.05, 10, 8), 0x5cbf4a, 0.05, 0.2, 0);
      leaf.scale.set(1.4, 0.3, 0.7);
      leaf.rotation.z = 0.5;
      g.add(leaf);
      break;
    }
    case 'carrot': {
      const inner = new THREE.Group();
      inner.add(mesh(new THREE.ConeGeometry(0.09, 0.42, 14), 0xff8a1f));
      for (let i = -1; i <= 1; i++) {
        const leaf = mesh(new THREE.ConeGeometry(0.025, 0.2, 6), 0x4fb84a, i * 0.035, -0.28, 0);
        leaf.rotation.z = Math.PI + i * 0.35;
        inner.add(leaf);
      }
      inner.rotation.z = Math.PI / 2 + 0.15;
      g.add(inner);
      break;
    }
    case 'hay': {
      const inner = new THREE.Group();
      inner.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 16), 0xe8c55a));
      for (const y of [-0.07, 0.07]) {
        const band = mesh(new THREE.TorusGeometry(0.163, 0.014, 6, 24), 0xa8782f, 0, y, 0);
        band.rotation.x = Math.PI / 2;
        inner.add(band);
      }
      for (let i = 0; i < 6; i++) {
        const straw = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 4), 0xf3d77a, Math.cos(i) * 0.12, 0.17, Math.sin(i) * 0.12);
        straw.rotation.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        inner.add(straw);
      }
      inner.rotation.z = Math.PI / 2;
      g.add(inner);
      break;
    }
    case 'cupcake': {
      g.add(mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.15, 16), 0x7ec8e3, 0, -0.07, 0));
      const frost = mesh(new THREE.SphereGeometry(0.16, 18, 14), 0xf59ac0, 0, 0.03, 0);
      frost.scale.set(1, 0.65, 1);
      g.add(frost);
      const top = mesh(new THREE.SphereGeometry(0.1, 14, 10), 0xf7b3d0, 0, 0.1, 0);
      top.scale.set(1, 0.7, 1);
      g.add(top);
      g.add(mesh(new THREE.SphereGeometry(0.045, 10, 8), 0xe0263a, 0, 0.18, 0));
      break;
    }
    case 'chili': {
      const inner = new THREE.Group();
      const pod = mesh(new THREE.CapsuleGeometry(0.065, 0.26, 6, 12), 0xd62b2b);
      pod.scale.set(1, 1, 0.9);
      inner.add(pod);
      inner.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.04, 10), 0x3d9a3a, 0, 0.2, 0));
      inner.add(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), 0x3d9a3a, 0.02, 0.26, 0));
      inner.rotation.z = Math.PI / 2 - 0.4;
      g.add(inner);
      break;
    }
  }
  return g;
}
