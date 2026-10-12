import * as THREE from 'three';
import type { AccessoryId } from '../game/config';

const std = (color: number, rough = 0.5, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function castAll<T extends THREE.Object3D>(o: T) {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true;
  });
  return o;
}

function flowerCrown() {
  const g = new THREE.Group();
  const vine = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 8, 48), std(0x4bb043, 0.6));
  vine.scale.set(0.66, 0.6, 1);
  vine.rotation.x = Math.PI / 2;
  g.add(vine);
  const petals = [0xff8fb8, 0xfff4fa, 0xffd23f, 0xb99cff];
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const f = new THREE.Group();
    const col = petals[i % petals.length];
    for (let k = 0; k < 5; k++) {
      const pa = (k / 5) * Math.PI * 2;
      const petal = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), std(col, 0.5));
      petal.position.set(Math.cos(pa) * 0.072, Math.sin(pa) * 0.072, 0);
      petal.scale.set(1, 1, 0.55);
      f.add(petal);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), std(col === 0xffd23f ? 0xff9a3c : 0xffd23f, 0.5));
    center.position.z = 0.02;
    f.add(center);
    f.position.set(Math.cos(a) * 0.66, 0, Math.sin(a) * 0.6);
    f.lookAt(f.position.clone().multiplyScalar(2).setY(0.1));
    g.add(f);
  }
  g.position.set(0, 0.4, -0.02);
  g.rotation.x = -0.12;
  return castAll(g);
}

function partyHat() {
  const g = new THREE.Group();
  const colors = [0xff5c8a, 0xfff4fa, 0x5ad1ff, 0xfff4fa, 0xffd23f];
  const h = 0.13;
  colors.forEach((c, i) => {
    const r0 = 0.28 * (1 - (i / colors.length) * 0.94);
    const r1 = 0.28 * (1 - ((i + 1) / colors.length) * 0.94);
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, h + 0.004, 24), std(c, 0.55));
    seg.position.y = h * i + h / 2;
    g.add(seg);
  });
  const pom = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), std(0xffd23f, 0.6));
  pom.position.y = h * colors.length + 0.03;
  g.add(pom);
  g.position.set(0, 0.6, 0.1);
  g.rotation.set(0.18, 0, -0.12);
  return castAll(g);
}

function shades() {
  const g = new THREE.Group();
  const lensMat = new THREE.MeshStandardMaterial({ color: 0x141826, roughness: 0.12, metalness: 0.5 });
  const frame = std(0x1b1b22, 0.35);
  [-1, 1].forEach((s) => {
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 16), lensMat);
    lens.scale.set(1.12, 0.86, 0.32);
    lens.position.set(s * 0.34, 0.12, 0.68);
    lens.rotation.y = s * 0.26;
    g.add(lens);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.024, 8, 28), frame);
    rim.scale.set(1.12, 0.86, 1);
    rim.position.set(s * 0.34, 0.12, 0.7);
    rim.rotation.y = s * 0.26;
    g.add(rim);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.8 }));
    glint.scale.set(2.2, 0.5, 0.4);
    glint.position.set(s * 0.34 - 0.07, 0.2, 0.77);
    glint.rotation.z = 0.5;
    g.add(glint);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.52, 8), frame);
    arm.rotation.z = Math.PI / 2;
    arm.rotation.y = s * 0.2;
    arm.position.set(s * 0.68, 0.13, 0.44);
    arm.rotation.set(0, s * 1.1, Math.PI / 2);
    g.add(arm);
  });
  const bridge = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.2, 8), frame);
  bridge.rotation.z = Math.PI / 2;
  bridge.position.set(0, 0.16, 0.75);
  g.add(bridge);
  return castAll(g);
}

function goldCrown() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: 0xffcc33, roughness: 0.25, metalness: 0.75, emissive: 0x553300, emissiveIntensity: 0.3 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.14, 24, 1, true), gold);
  band.material.side = THREE.DoubleSide;
  g.add(band);
  const n = 5;
  const jewels = [0xff4658, 0x4dd0ff, 0x7dff8a, 0xff4658, 0xb07cff];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 8), gold);
    spike.position.set(Math.cos(a) * 0.26, 0.16, Math.sin(a) * 0.26);
    g.add(spike);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), gold);
    ball.position.set(Math.cos(a) * 0.26, 0.27, Math.sin(a) * 0.26);
    g.add(ball);
    const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), std(jewels[i], 0.2, { emissive: jewels[i], emissiveIntensity: 0.4 }));
    jewel.position.set(Math.cos(a) * 0.268, 0.0, Math.sin(a) * 0.268);
    g.add(jewel);
  }
  g.position.set(0, 0.68, 0.16);
  g.rotation.x = 0.28;
  return castAll(g);
}

export function buildAccessory(id: AccessoryId): THREE.Group {
  switch (id) {
    case 'flowers':
      return flowerCrown();
    case 'party':
      return partyHat();
    case 'shades':
      return shades();
    case 'crown':
      return goldCrown();
  }
}
