import * as THREE from 'three';

export const V3 = THREE.Vector3;
const sph = new THREE.SphereGeometry(1, 32, 24);
const cyl = new THREE.CylinderGeometry(1, 1, 1, 24);
const cone = new THREE.ConeGeometry(1, 1, 20);

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, ...o });

function add(parent, geo, m, pos = [0, 0, 0], scale = [1, 1, 1], rot = [0, 0, 0], shadow = true) {
  const mesh = new THREE.Mesh(geo, m);
  mesh.position.set(...pos);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rot);
  mesh.castShadow = shadow;
  parent.add(mesh);
  return mesh;
}

function surface(r, dir) {
  const n = dir.clone().normalize();
  const t = 1 / Math.sqrt((n.x / r.x) ** 2 + (n.y / r.y) ** 2 + (n.z / r.z) ** 2);
  return n.multiplyScalar(t);
}

function patch(parent, r, dir, size, m, { sink = 0.05, flat = 0.3, stretch = 1 } = {}) {
  const p = surface(r, dir);
  const nrm = new V3(p.x / r.x ** 2, p.y / r.y ** 2, p.z / r.z ** 2).normalize();
  const mesh = new THREE.Mesh(sph, m);
  mesh.position.copy(p).addScaledVector(nrm, -sink);
  mesh.quaternion.setFromUnitVectors(new V3(0, 0, 1), nrm);
  mesh.scale.set(size, size * stretch, size * flat);
  parent.add(mesh);
  return mesh;
}

export const PALETTE = { white: 0xfffaf0, spot: 0x3d323f, pink: 0xffb0bd, horn: 0xf7deA0, hoof: 0x5b4a56 };

export function createCow() {
  const root = new THREE.Group();
  const white = mat(PALETTE.white, { roughness: 0.9 });
  const dark = mat(PALETTE.spot, { roughness: 0.95 });
  const pink = mat(PALETTE.pink, { roughness: 0.7 });
  const mud = mat(0x6b4426, { roughness: 1, transparent: true, opacity: 0 });
  const parts = { root, white, mud, pink };

  const torso = new THREE.Group();
  torso.position.set(0, 1.15, 0);
  root.add(torso);
  const BR = new V3(1.0, 0.86, 1.18);
  add(torso, sph, white, [0, 0, 0], [BR.x, BR.y, BR.z]);
  const spots = [
    [[0.9, 0.5, 0.2], 0.5, 1.1],
    [[-0.8, 0.35, -0.5], 0.55, 0.9],
    [[0.3, 0.95, -0.7], 0.42, 1],
    [[-0.5, 0.85, 0.35], 0.32, 1.2],
    [[0.75, -0.1, -0.85], 0.36, 1],
    [[-0.9, -0.05, 0.4], 0.3, 1],
  ];
  spots.forEach(([d, s, st]) => patch(torso, BR, new V3(...d), s, dark, { stretch: st }));
  [[0.7, 0.6, 0.1], [-0.6, 0.2, -0.6], [0.1, 0.9, -0.5], [-0.8, 0.5, 0.5], [0.6, -0.2, -0.7]].forEach((d, i) =>
    patch(torso, BR, new V3(...d), 0.34 + (i % 3) * 0.06, mud, { sink: 0.03, flat: 0.2 })
  );
  parts.torso = torso;

  add(root, sph, pink, [0, 0.42, -0.5], [0.3, 0.2, 0.3]);

  parts.legs = [];
  [[-0.52, 0.62, 0], [0.52, 0.62, Math.PI], [-0.52, -0.62, Math.PI], [0.52, -0.62, 0]].forEach(([x, z, ph]) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.62, z);
    add(pivot, cyl, white, [0, -0.3, 0], [0.19, 0.6, 0.19]);
    add(pivot, cyl, mat(PALETTE.hoof), [0, -0.56, 0], [0.2, 0.13, 0.2]);
    root.add(pivot);
    parts.legs.push({ pivot, phase: ph });
  });

  const tail = new THREE.Group();
  tail.position.set(0, 1.55, -1.12);
  add(tail, cyl, white, [0, -0.35, -0.08], [0.05, 0.8, 0.05], [0.2, 0, 0]);
  add(tail, sph, dark, [0, -0.8, -0.16], [0.13, 0.22, 0.13]);
  root.add(tail);
  parts.tail = tail;

  const collar = add(root, new THREE.TorusGeometry(0.62, 0.075, 12, 40), mat(0xe8465a, { roughness: 0.5 }), [0, 1.4, 0.92], [1, 1, 1], [-Math.PI / 4, 0, 0]);
  collar.castShadow = false;
  parts.bell = new THREE.Group();
  parts.bell.position.set(0, 1.0, 1.42);
  add(parts.bell, sph, mat(0xffc93c, { roughness: 0.3, metalness: 0.6 }), [0, 0, 0], [0.13, 0.13, 0.13]);
  add(parts.bell, sph, mat(0x8a5a10), [0, -0.09, 0.06], [0.03, 0.03, 0.03]);
  root.add(parts.bell);

  const neck = new THREE.Group();
  neck.position.set(0, 1.55, 0.75);
  root.add(neck);
  parts.neck = neck;
  const head = new THREE.Group();
  head.position.set(0, 0.32, 0.55);
  neck.add(head);
  parts.head = head;
  const HR = new V3(0.8, 0.7, 0.7);
  add(head, sph, white, [0, 0, 0], [HR.x, HR.y, HR.z]);
  patch(head, HR, new V3(0.85, 0.5, 0.15), 0.42, dark, { stretch: 1.1 });
  patch(head, HR, new V3(-0.5, 0.9, -0.1), 0.3, dark);

  add(head, sph, pink, [0, -0.28, 0.5], [0.52, 0.34, 0.38]);
  add(head, sph, mat(0x5a1f2b), [0, -0.44, 0.5], [0.3, 0.1, 0.25], [0, 0, 0], false);
  const jaw = new THREE.Group();
  jaw.position.set(0, -0.4, 0.22);
  add(jaw, sph, mat(0xff9cad, { roughness: 0.6 }), [0, -0.1, 0.28], [0.4, 0.15, 0.32]);
  head.add(jaw);
  parts.jaw = jaw;
  const nostrilM = mat(0x8a3d52);
  [-1, 1].forEach((s) => add(head, sph, nostrilM, [s * 0.17, -0.2, 0.82], [0.055, 0.075, 0.03], [0, 0, 0], false));
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.017, 8, 20, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x8a3d52, side: THREE.DoubleSide })
  );
  mouth.position.set(0, -0.36, 0.84);
  head.add(mouth);
  parts.mouth = mouth;

  const cheekM = new THREE.MeshBasicMaterial({ color: 0xff7f9d, transparent: true, opacity: 0, depthWrite: false });
  parts.cheekM = cheekM;
  [-1, 1].forEach((s) => {
    const c = add(head, sph, cheekM, [s * 0.5, -0.06, 0.48], [0.13, 0.08, 0.04], [0, 0, 0], false);
    c.rotation.set(0, s * 0.85, 0);
  });

  parts.eyes = [];
  [-1, 1].forEach((s) => {
    const eye = new THREE.Group();
    eye.position.set(s * 0.34, 0.13, 0.57);
    eye.rotation.y = s * 0.35;
    add(eye, sph, mat(0xffffff, { roughness: 0.3 }), [0, 0, 0], [0.17, 0.2, 0.1], [0, 0, 0], false);
    const pupil = new THREE.Group();
    add(pupil, sph, new THREE.MeshStandardMaterial({ color: 0x1b1420, roughness: 0.15 }), [0, 0, 0.06], [0.115, 0.14, 0.05], [0, 0, 0], false);
    add(pupil, sph, new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.04, 0.05, 0.11], [0.04, 0.04, 0.02], [0, 0, 0], false);
    add(pupil, sph, new THREE.MeshBasicMaterial({ color: 0xffffff }), [-0.03, -0.05, 0.11], [0.02, 0.02, 0.01], [0, 0, 0], false);
    eye.add(pupil);
    const lash = add(eye, cyl, new THREE.MeshBasicMaterial({ color: 0x2b2030 }), [0, 0, 0.09], [0.18, 0.012, 0.012], [0, 0, 0], false);
    lash.visible = false;
    head.add(eye);
    parts.eyes.push({ eye, pupil, lash, s });
  });

  parts.ears = [];
  [-1, 1].forEach((s) => {
    const g = new THREE.Group();
    g.position.set(s * 0.72, 0.26, -0.08);
    add(g, sph, white, [s * 0.27, 0, 0], [0.34, 0.14, 0.21]);
    add(g, sph, pink, [s * 0.27, 0.0, 0.03], [0.24, 0.1, 0.13], [0, 0, 0], false);
    head.add(g);
    parts.ears.push({ g, s });
  });

  const hornM = mat(PALETTE.horn, { roughness: 0.5 });
  [-1, 1].forEach((s) => add(head, cone, hornM, [s * 0.36, 0.7, -0.06], [0.1, 0.34, 0.1], [0, 0, -s * 0.38]));
  add(head, sph, white, [0, 0.66, 0.1], [0.2, 0.16, 0.2]);

  parts.acc = {};
  const acc = new THREE.Group();
  acc.position.set(0, 0, 0);
  head.add(acc);
  const flower = new THREE.Group();
  flower.position.set(0.42, 0.62, 0.12);
  const pet = mat(0xff8fc0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    add(flower, sph, pet, [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0], [0.075, 0.075, 0.04], [0, 0, 0], false);
  }
  add(flower, sph, mat(0xffd83c), [0, 0, 0.02], [0.06, 0.06, 0.05], [0, 0, 0], false);
  flower.rotation.set(-0.5, 0.3, 0);
  const bow = new THREE.Group();
  bow.position.set(-0.4, 0.62, 0.14);
  const bowM = mat(0xff4d79, { roughness: 0.4 });
  add(bow, cone, bowM, [0.12, 0, 0], [0.11, 0.2, 0.06], [0, 0, -Math.PI / 2], false);
  add(bow, cone, bowM, [-0.12, 0, 0], [0.11, 0.2, 0.06], [0, 0, Math.PI / 2], false);
  add(bow, sph, bowM, [0, 0, 0.01], [0.06, 0.06, 0.06], [0, 0, 0], false);
  bow.rotation.set(-0.4, -0.3, 0.2);
  const party = new THREE.Group();
  party.position.set(0.02, 0.98, 0.02);
  add(party, cone, mat(0x7c5cff, { roughness: 0.5 }), [0, 0.1, 0], [0.32, 0.8, 0.32]);
  [0.2, -0.05].forEach((y, i) => add(party, new THREE.TorusGeometry(0.2 - i * 0.05 - y * 0.2, 0.025, 8, 24), mat(0xffd83c), [0, y + 0.0, 0], [1, 1, 1], [Math.PI / 2, 0, 0], false));
  add(party, sph, mat(0xffd83c, { roughness: 0.3 }), [0, 0.52, 0], [0.09, 0.09, 0.09], [0, 0, 0], false);
  party.rotation.z = -0.15;
  const shades = new THREE.Group();
  shades.position.set(0, 0.13, 0.6);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x14111c, roughness: 0.1, metalness: 0.4 });
  [-1, 1].forEach((s) => add(shades, sph, glassM, [s * 0.34 * Math.cos(0.35) + 0, 0, 0.0], [0.24, 0.19, 0.06], [0, s * 0.35, 0], false));
  add(shades, cyl, glassM, [0, 0.03, 0.02], [0.14, 0.02, 0.02], [0, 0, Math.PI / 2], false);
  shades.position.z = 0.6;
  const crown = new THREE.Group();
  crown.position.set(0, 0.72, 0.02);
  const gold = mat(0xffc93c, { roughness: 0.25, metalness: 0.7 });
  add(crown, new THREE.CylinderGeometry(0.28, 0.26, 0.16, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0xffc93c, roughness: 0.25, metalness: 0.7, side: THREE.DoubleSide }), [0, 0.08, 0], [1, 1, 1], [0, 0, 0], false);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    add(crown, cone, gold, [Math.cos(a) * 0.27, 0.22, Math.sin(a) * 0.27], [0.06, 0.16, 0.06], [0, 0, 0], false);
    add(crown, sph, mat(0xff4d79), [Math.cos(a) * 0.27, 0.32, Math.sin(a) * 0.27], [0.03, 0.03, 0.03], [0, 0, 0], false);
  }
  crown.rotation.x = -0.1;
  Object.assign(parts.acc, { flower, bow, party, shades, crown });
  Object.values(parts.acc).forEach((g) => { g.visible = false; acc.add(g); });

  const flies = [];
  const flyM = new THREE.MeshBasicMaterial({ color: 0x1c1720 });
  for (let i = 0; i < 3; i++) {
    const f = add(root, sph, flyM, [0, 0, 0], [0.045, 0.035, 0.045], [0, 0, 0], false);
    f.visible = false;
    flies.push(f);
  }
  parts.flies = flies;

  root.traverse((o) => { if (o.isMesh) o.userData.cow = true; });
  return parts;
}

export const FOODS = {
  apple: { label: 'Apple', hunger: 22, joy: 6, energy: 2, mess: 0, treat: 0, color: 0xe94b4b },
  hay: { label: 'Hay', hunger: 32, joy: 1, energy: 3, mess: 4, treat: 0, color: 0xe6c04d },
  carrot: { label: 'Carrot', hunger: 18, joy: 8, energy: 5, mess: 0, treat: 0, color: 0xff8a2a },
  cake: { label: 'Cake', hunger: 14, joy: 24, energy: 8, mess: 10, treat: 1, color: 0xf7a8c4 },
};

export function createFood(key) {
  const g = new THREE.Group();
  if (key === 'apple') {
    add(g, sph, mat(0xe63b3b, { roughness: 0.35 }), [0, 0.32, 0], [0.34, 0.31, 0.34]);
    add(g, sph, mat(0xd42f2f), [0, 0.31, 0], [0.36, 0.28, 0.32], [0, 0.7, 0]);
    add(g, cyl, mat(0x6b4a2b), [0, 0.66, 0], [0.025, 0.14, 0.025], [0.2, 0, 0]);
    add(g, sph, mat(0x59b84a), [0.1, 0.66, 0], [0.11, 0.025, 0.06], [0, 0, 0.4]);
  } else if (key === 'hay') {
    const cols = [0xe6c04d, 0xd9ad3a, 0xf0d165];
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      const r = Math.random() * 0.22;
      add(g, cyl, mat(cols[i % 3]), [Math.cos(a) * r, 0.3, Math.sin(a) * r], [0.03, 0.62, 0.03], [(Math.random() - 0.5) * 1.1, 0, (Math.random() - 0.5) * 1.1], false);
    }
    add(g, cyl, mat(0xb9782f), [0, 0.28, 0], [0.19, 0.06, 0.19], [0, 0, 0], false);
  } else if (key === 'carrot') {
    const c = new THREE.Group();
    add(c, cone, mat(0xff8a2a), [0, 0, 0], [0.17, 0.8, 0.17], [0, 0, Math.PI / 2]);
    [0.1, 0, -0.1].forEach((z, i) => add(c, cone, mat(0x4fb04a), [0.5, 0.02, z], [0.05, 0.3, 0.05], [0, 0, -Math.PI / 2 + (i - 1) * 0.5]));
    c.position.set(0, 0.24, 0);
    c.rotation.set(0, 0.5, 0.2);
    g.add(c);
  } else if (key === 'cake') {
    add(g, cyl, mat(0xf7a8c4), [0, 0.2, 0], [0.42, 0.22, 0.42]);
    add(g, cyl, mat(0xfff5e6), [0, 0.34, 0], [0.44, 0.06, 0.44]);
    add(g, sph, mat(0xe63b3b, { roughness: 0.25 }), [0.1, 0.44, 0.05], [0.08, 0.08, 0.08], [0, 0, 0], false);
    add(g, cyl, mat(0x7dd3fc), [-0.08, 0.5, -0.05], [0.025, 0.14, 0.025], [0, 0, 0], false);
    add(g, sph, new THREE.MeshBasicMaterial({ color: 0xffd23c }), [-0.08, 0.61, -0.05], [0.03, 0.05, 0.03], [0, 0, 0], false);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export function createBall() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const x = c.getContext('2d');
  const cols = ['#ff5a7a', '#ffd23c', '#3fc1ff', '#ffffff', '#7bd66a', '#ff9a3c'];
  cols.forEach((col, i) => { x.fillStyle = col; x.fillRect((i * 256) / 6, 0, 256 / 6 + 1, 128); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 20), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }));
  m.castShadow = true;
  return m;
}

function grassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#7ccf62';
  x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2600; i++) {
    const l = 50 + Math.random() * 18;
    x.fillStyle = `hsla(${100 + Math.random() * 25},55%,${l}%,0.55)`;
    const px = Math.random() * 512, py = Math.random() * 512;
    x.beginPath();
    x.ellipse(px, py, 2 + Math.random() * 6, 1 + Math.random() * 2.5, Math.random() * 3, 0, 7);
    x.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(9, 9);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createEnvironment(scene) {
  const env = { clouds: [], nightMats: [] };

  const hemi = new THREE.HemisphereLight(0xcfeaff, 0x7bbf6a, 1.15);
  const sun = new THREE.DirectionalLight(0xfff0d0, 2.3);
  sun.position.set(5, 9, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 30 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const moon = new THREE.DirectionalLight(0x8fa8ff, 0);
  moon.position.set(-5, 8, 6);
  scene.add(hemi, sun, moon);
  Object.assign(env, { hemi, sun, moon });

  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 64), new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  env.ground = ground;

  const hillM = [mat(0x6cc158, { roughness: 1 }), mat(0x5ab04f, { roughness: 1 }), mat(0x7ed067, { roughness: 1 })];
  [[-22, -26, 16, 0], [4, -32, 20, 1], [26, -24, 14, 2], [-4, -22, 9, 2]].forEach(([x, z, r, i]) => {
    const h = new THREE.Mesh(sph, hillM[i]);
    h.scale.set(r * 1.4, r * 0.42, r);
    h.position.set(x, -r * 0.1, z);
    h.receiveShadow = true;
    scene.add(h);
  });

  const trunkM = mat(0x7a5233);
  const leafM = [mat(0x3fa34d), mat(0x56bd5b), mat(0x2f8f46)];
  [[-9, -9], [-6.5, -12], [8.5, -10], [11, -7], [-12, -5], [14, -14], [5, -15]].forEach(([x, z], i) => {
    const t = new THREE.Group();
    add(t, cyl, trunkM, [0, 1, 0], [0.32, 2, 0.32]);
    add(t, sph, leafM[i % 3], [0, 3, 0], [1.5, 1.4, 1.5]);
    add(t, sph, leafM[(i + 1) % 3], [0.6, 3.7, 0.2], [1.0, 0.95, 1.0]);
    const s = 0.9 + (i % 3) * 0.3;
    t.scale.setScalar(s);
    t.position.set(x, 0, z);
    scene.add(t);
  });

  const woodM = mat(0xd9a76a);
  for (let x = -10.5; x <= 10.5; x += 1.5) {
    add(scene, new THREE.BoxGeometry(0.22, 1.2, 0.18), woodM, [x, 0.6, -7]);
  }
  [0.4, 0.85].forEach((y) => add(scene, new THREE.BoxGeometry(22, 0.13, 0.1), woodM, [0, y, -7.05]));

  const petals = [0xff8fc0, 0xffd83c, 0xffffff, 0xb28dff, 0xff9a5a];
  const stemM = mat(0x3f9a45);
  for (let i = 0; i < 70; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 5.5 + Math.random() * 6;
    const x = Math.cos(a) * r, z = Math.sin(a) * r * 0.75 - 1.5;
    if (z < -6.6 && z > -7.5) continue;
    const f = new THREE.Group();
    add(f, cyl, stemM, [0, 0.14, 0], [0.012, 0.28, 0.012], [0, 0, 0], false);
    add(f, sph, mat(petals[i % petals.length]), [0, 0.3, 0], [0.09, 0.05, 0.09], [0, 0, 0], false);
    add(f, sph, mat(0xffd83c), [0, 0.33, 0], [0.04, 0.03, 0.04], [0, 0, 0], false);
    f.position.set(x, 0, z);
    scene.add(f);
  }

  const bowl = new THREE.Group();
  const lathe = new THREE.LatheGeometry(
    [[0.01, 0], [0.7, 0], [1.0, 0.3], [0.95, 0.33], [0.64, 0.1], [0.01, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 36
  );
  const bm = new THREE.Mesh(lathe, new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.6, side: THREE.DoubleSide }));
  bm.castShadow = true;
  bm.receiveShadow = true;
  bowl.add(bm);
  bowl.position.set(0, 0, 2.25);
  scene.add(bowl);
  env.bowl = bowl;

  const cloudM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.35 });
  env.cloudM = cloudM;
  for (let i = 0; i < 6; i++) {
    const c = new THREE.Group();
    [[0, 0, 1.4], [1.3, -0.1, 1.0], [-1.3, -0.15, 1.05], [0.5, 0.5, 0.9]].forEach(([x, y, s]) => add(c, sph, cloudM, [x, y, 0], [s, s * 0.7, s * 0.8], [0, 0, 0], false));
    c.position.set(-30 + i * 12 + Math.random() * 4, 11 + Math.random() * 5, -24 - Math.random() * 10);
    c.userData.speed = 0.25 + Math.random() * 0.3;
    scene.add(c);
    env.clouds.push(c);
  }

  const sunM = new THREE.MeshBasicMaterial({ color: 0xfff2a8, fog: false });
  env.sunMesh = new THREE.Mesh(sph, sunM);
  env.sunMesh.scale.setScalar(3);
  env.sunMesh.position.set(18, 20, -50);
  const moonM = new THREE.MeshBasicMaterial({ color: 0xf4f1ff, fog: false });
  env.moonMesh = new THREE.Mesh(sph, moonM);
  env.moonMesh.scale.setScalar(2.6);
  env.moonMesh.position.set(-16, 20, -50);
  scene.add(env.sunMesh, env.moonMesh);

  const starGeo = new THREE.BufferGeometry();
  const sp = [];
  for (let i = 0; i < 400; i++) {
    const a = Math.random() * Math.PI * 2;
    const e = 0.15 + Math.random() * 1.2;
    sp.push(Math.cos(a) * Math.cos(e) * 90, Math.sin(e) * 90, Math.sin(a) * Math.cos(e) * 90 - 20);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  env.starM = new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, transparent: true, opacity: 0, fog: false, sizeAttenuation: false, depthWrite: false });
  scene.add(new THREE.Points(starGeo, env.starM));

  scene.fog = new THREE.Fog(0xbfe6ff, 30, 75);
  scene.background = new THREE.Color(0x9ddcff);
  return env;
}

const spriteCache = {};
export function spriteTexture(kind) {
  if (spriteCache[kind]) return spriteCache[kind];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  x.translate(64, 64);
  if (kind === 'heart') {
    x.fillStyle = '#ff5c8a';
    x.strokeStyle = '#fff';
    x.lineWidth = 8;
    x.beginPath();
    x.moveTo(0, 40);
    x.bezierCurveTo(-64, -6, -32, -50, 0, -18);
    x.bezierCurveTo(32, -50, 64, -6, 0, 40);
    x.stroke();
    x.fill();
  } else if (kind === 'zzz') {
    x.font = '900 96px ui-rounded, system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineWidth = 12;
    x.strokeStyle = '#3b3a8a';
    x.strokeText('Z', 0, 6);
    x.fillStyle = '#dfe4ff';
    x.fillText('Z', 0, 6);
  } else if (kind === 'star') {
    x.fillStyle = '#ffe066';
    x.beginPath();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 22 : 56;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    x.closePath();
    x.fill();
  } else if (kind === 'bubble') {
    x.strokeStyle = 'rgba(255,255,255,0.95)';
    x.fillStyle = 'rgba(190,235,255,0.35)';
    x.lineWidth = 7;
    x.beginPath();
    x.arc(0, 0, 50, 0, 7);
    x.fill();
    x.stroke();
    x.fillStyle = '#fff';
    x.beginPath();
    x.arc(-18, -18, 9, 0, 7);
    x.fill();
  } else if (kind === 'drop') {
    x.fillStyle = '#6ec6ff';
    x.beginPath();
    x.moveTo(0, -50);
    x.quadraticCurveTo(38, 5, 0, 44);
    x.quadraticCurveTo(-38, 5, 0, -50);
    x.fill();
  } else if (kind === 'skull') {
    x.font = '900 90px ui-rounded, system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#7bd66a';
    x.fillText('~', 0, 0);
  } else {
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 54);
    g.addColorStop(0, '#fff');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(-64, -64, 128, 128);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  spriteCache[kind] = t;
  return t;
}

export function createShowerCloud() {
  const g = new THREE.Group();
  const m = new THREE.MeshStandardMaterial({ color: 0xdfe8f5, roughness: 1, emissive: 0x8899aa, emissiveIntensity: 0.4 });
  [[0, 0, 0.9], [0.8, -0.1, 0.65], [-0.8, -0.1, 0.7]].forEach(([x, y, s]) => add(g, sph, m, [x, y, 0], [s, s * 0.7, s * 0.8], [0, 0, 0], false));
  return g;
}
