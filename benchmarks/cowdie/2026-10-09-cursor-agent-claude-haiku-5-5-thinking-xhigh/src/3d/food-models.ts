import * as THREE from "three";
import type { FoodId } from "../game/foods";

function mat(color: number, roughness = 0.5): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function apple(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.26, 28, 20), mat(0xff4f5e, 0.35));
  body.castShadow = true;
  group.add(body);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.14, 6), mat(0x6b4226));
  stem.position.y = 0.3;
  group.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), mat(0x5fd07a));
  leaf.scale.set(1.5, 0.45, 0.8);
  leaf.position.set(0.1, 0.33, 0);
  leaf.rotation.z = -0.4;
  group.add(leaf);
  return group;
}

function carrot(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.6, 20), mat(0xff9f1c, 0.6));
  body.rotation.x = Math.PI;
  body.castShadow = true;
  group.add(body);
  for (const rot of [-0.35, 0, 0.35]) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.32, 8), mat(0x4cc26b));
    leaf.position.set(Math.sin(rot) * 0.06, 0.45, 0);
    leaf.rotation.z = rot;
    group.add(leaf);
  }
  return group;
}

function cookie(): THREE.Group {
  const group = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.27, 0.1, 32), mat(0xd9925a, 0.8));
  disc.castShadow = true;
  group.add(disc);
  const chipMat = mat(0x3d2418, 0.5);
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + 0.3;
    const chip = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), chipMat);
    chip.position.set(Math.cos(angle) * 0.14, 0.05, Math.sin(angle) * 0.14);
    group.add(chip);
  }
  return group;
}

function fish(): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), mat(0xff8f7a, 0.4));
  body.scale.set(0.32, 0.17, 0.14);
  body.castShadow = true;
  group.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.2, 4), mat(0xff7060, 0.4));
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.38;
  group.add(tail);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat(0x1d1d1d, 0.2));
  eye.position.set(0.2, 0.05, 0.11);
  group.add(eye);
  return group;
}

function cupcake(): THREE.Group {
  const group = new THREE.Group();
  const liner = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.22, 20), mat(0xa77cff, 0.7));
  liner.position.y = -0.08;
  liner.castShadow = true;
  group.add(liner);
  const frosting = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 16), mat(0xf48fb1, 0.45));
  frosting.scale.set(1, 0.85, 1);
  frosting.position.y = 0.1;
  frosting.castShadow = true;
  group.add(frosting);
  const cherry = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), mat(0xe0243d, 0.3));
  cherry.position.y = 0.32;
  group.add(cherry);
  return group;
}

const BUILDERS: Record<FoodId, () => THREE.Group> = { apple, carrot, cookie, fish, cupcake };

export function createFoodMesh(id: FoodId): THREE.Group {
  return BUILDERS[id]();
}
