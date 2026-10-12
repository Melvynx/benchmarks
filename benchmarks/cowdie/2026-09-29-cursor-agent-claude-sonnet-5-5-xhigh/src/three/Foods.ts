import * as THREE from 'three';
import { FOODS, type FoodId } from '../game/config';

const mat = (color: number, rough = 0.55, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function shadowed<T extends THREE.Object3D>(o: T) {
  o.traverse((c) => {
    if ((c as THREE.Mesh).isMesh) c.castShadow = true;
  });
  return o;
}

function makeGrass() {
  const g = new THREE.Group();
  const greens = [0x5fc44a, 0x78d85a, 0x4bb043, 0x8be066];
  for (let i = 0; i < 9; i++) {
    const h = 0.42 + Math.random() * 0.22;
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.055, h, 5), mat(greens[i % greens.length], 0.6));
    const a = (i / 9) * Math.PI * 2;
    const r = 0.04 + (i % 3) * 0.03;
    blade.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
    blade.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    g.add(blade);
  }
  for (let i = 0; i < 3; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), mat(0x69cf55, 0.5));
    leaf.scale.set(1, 0.3, 1);
    const a = (i / 3) * Math.PI * 2 + 0.4;
    leaf.position.set(Math.cos(a) * 0.15, 0.1 + i * 0.03, Math.sin(a) * 0.15);
    g.add(leaf);
  }
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), mat(0xfff4fa, 0.5));
  flower.position.set(0.02, 0.55, 0);
  g.add(flower);
  g.position.y = -0.28;
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.userData = { crumb: 0x6fd05a, radius: 0.3 };
  return shadowed(wrap);
}

function makeApple() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 28, 20), mat(0xff4658, 0.32, { emissive: 0x330008, emissiveIntensity: 0.25 }));
  body.scale.set(1.04, 0.94, 1.04);
  g.add(body);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }));
  shine.scale.set(1, 1.6, 0.4);
  shine.position.set(-0.14, 0.08, 0.17);
  shine.rotation.z = 0.5;
  g.add(shine);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.13, 8), mat(0x6b4226));
  stem.position.set(0.01, 0.25, 0);
  stem.rotation.z = -0.25;
  g.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), mat(0x5fd05a, 0.5));
  leaf.scale.set(1.4, 0.22, 0.7);
  leaf.position.set(0.11, 0.27, 0);
  leaf.rotation.z = 0.35;
  g.add(leaf);
  g.userData = { crumb: 0xffd6b0, radius: 0.26 };
  return shadowed(g);
}

function makeCookie() {
  const g = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.09, 32), mat(0xe0a35c, 0.85));
  disc.scale.set(1, 1, 1);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.035, 10, 32), mat(0xd19245, 0.85));
  rim.rotation.x = Math.PI / 2;
  const chipMat = mat(0x4a2a1c, 0.5);
  const chips = [
    [0.09, 0.05, 0.02],
    [-0.11, 0.05, 0.1],
    [0.02, 0.05, -0.14],
    [-0.14, 0.05, -0.07],
    [0.15, 0.05, 0.12],
    [-0.01, 0.05, 0.16],
    [0.16, 0.05, -0.08],
  ];
  chips.forEach(([x, y, z]) => {
    const chip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), chipMat);
    chip.scale.set(1.2, 0.6, 1);
    chip.position.set(x, y, z);
    g.add(chip);
  });
  g.add(disc, rim);
  const wrap = new THREE.Group();
  g.rotation.x = -Math.PI / 2 + 0.25;
  wrap.add(g);
  wrap.userData = { crumb: 0xe8b56b, radius: 0.3 };
  return shadowed(wrap);
}

function makeMilk() {
  const g = new THREE.Group();
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0, clearcoat: 0.6, transmission: 0, transparent: true, opacity: 0.96 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.16, 0.34, 24), glass);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.15, 0.1, 24), glass);
  shoulder.position.y = 0.22;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 20), glass);
  neck.position.y = 0.31;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.05, 20), mat(0xff5a6a, 0.4));
  cap.position.y = 0.375;
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.162, 0.162, 0.13, 24, 1, true), mat(0x5ab4ff, 0.5, { side: THREE.DoubleSide }));
  label.position.y = -0.02;
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.045, 14), mat(0xffffff, 0.5));
  dot.position.set(0, -0.02, 0.163);
  const teat = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), mat(0xffb5bd, 0.5));
  teat.position.set(0, -0.02, 0.164);
  teat.scale.set(1, 1.2, 0.3);
  g.add(body, shoulder, neck, cap, label, dot, teat);
  g.position.y = -0.1;
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.userData = { crumb: 0xffffff, radius: 0.3 };
  return shadowed(wrap);
}

function makeChili() {
  const g = new THREE.Group();
  const pts = [
    new THREE.Vector3(-0.22, 0.18, 0),
    new THREE.Vector3(-0.1, 0.05, 0),
    new THREE.Vector3(0.05, -0.02, 0),
    new THREE.Vector3(0.18, -0.12, 0),
    new THREE.Vector3(0.26, -0.24, 0),
  ];
  const curve = new THREE.CatmullRomCurve3(pts);
  const red = mat(0xe62e2e, 0.3, { emissive: 0x400000, emissiveIntensity: 0.3 });
  const n = 14;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const r = 0.1 * (1 - t * 0.85) + 0.012;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), red);
    s.position.copy(curve.getPoint(t));
    g.add(s);
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), mat(0x4bb043, 0.5));
  cap.scale.set(1, 0.6, 1);
  cap.position.set(-0.25, 0.22, 0);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 0.14, 8), mat(0x3f9a3a, 0.5));
  stem.position.set(-0.29, 0.31, 0);
  stem.rotation.z = 0.6;
  g.add(cap, stem);
  const shine = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 }));
  shine.scale.set(2.4, 0.5, 0.5);
  shine.position.set(-0.08, 0.1, 0.07);
  shine.rotation.z = -0.55;
  g.add(shine);
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.userData = { crumb: 0xff6a4a, radius: 0.3 };
  return shadowed(wrap);
}

export function makeFood(id: FoodId): THREE.Group {
  switch (id) {
    case 'grass':
      return makeGrass();
    case 'apple':
      return makeApple();
    case 'cookie':
      return makeCookie();
    case 'milk':
      return makeMilk();
    case 'chili':
      return makeChili();
  }
}

export function foodCrumbColor(id: FoodId): number {
  return { grass: 0x6fd05a, apple: 0xffe2c4, cookie: 0xe8b56b, milk: 0xffffff, chili: 0xff6a4a }[id];
}

let thumbs: Record<FoodId, string> | null = null;

export function foodThumbnails(): Record<FoodId, string> {
  if (thumbs) return thumbs;
  const out = {} as Record<FoodId, string>;
  try {
    const size = 192;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(size, size);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.setClearColor(0x000000, 0);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0xffd9b0, 1.6));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(-2, 3, 3);
    scene.add(key);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
    cam.position.set(0.2, 0.55, 2.2);
    cam.lookAt(0, 0.02, 0);
    for (const f of FOODS) {
      const m = makeFood(f.id);
      m.rotation.set(0.1, -0.5, 0);
      m.scale.setScalar(1.35);
      scene.add(m);
      renderer.render(scene, cam);
      out[f.id] = renderer.domElement.toDataURL('image/png');
      scene.remove(m);
    }
    renderer.dispose();
    renderer.forceContextLoss();
  } catch {
    FOODS.forEach((f) => (out[f.id] = ''));
  }
  thumbs = out;
  return out;
}
