import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { CareAction, Food } from './pet-state';

type SceneAction = { type: CareAction; id: number; food: Food } | null;
type Props = { action: SceneAction; asleep: boolean; reducedMotion: boolean; onPet: () => void; food: Food };
const cream = '#fff9ec', ink = '#4e4c47', blush = '#e5a997';

function material(color: string, roughness = 0.8) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

function sphere(parent: THREE.Object3D, color: string, position: number[], scale: number[], radius = 1): THREE.Mesh<THREE.SphereGeometry, THREE.Material> {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 40, 32), material(color));
  mesh.position.set(position[0], position[1], position[2]);
  mesh.scale.set(scale[0], scale[1], scale[2]);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function roundedBox(parent: THREE.Object3D, color: string, position: number[], scale: number[], radius = 0.08) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(scale[0], scale[1], scale[2], 3, radius), material(color));
  mesh.position.set(position[0], position[1], position[2]); mesh.castShadow = true; mesh.receiveShadow = true;
  parent.add(mesh); return mesh;
}

function tube(parent: THREE.Object3D, color: string, points: THREE.Vector3[], radius: number) {
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, radius, 8, false), material(color));
  mesh.castShadow = true; parent.add(mesh); return mesh;
}

function makeFlower(parent: THREE.Object3D, x: number, z: number, height: number, color: string, scale = 1) {
  const flower = new THREE.Group(); flower.position.set(x, 0.14, z); flower.scale.setScalar(scale); parent.add(flower);
  tube(flower, '#729563', [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.04, height / 2, 0), new THREE.Vector3(0, height, 0)], 0.026);
  const leaf = sphere(flower, '#85a669', [0.1, height / 2, 0], [0.14, 0.04, 0.07]); leaf.rotation.z = 0.4;
  for (let i = 0; i < 7; i++) {
    const angle = i * Math.PI * 2 / 7;
    const petal = sphere(flower, color, [Math.cos(angle) * 0.095, height + Math.sin(angle) * 0.095, 0.025], [0.082, 0.048, 0.035]);
    petal.rotation.z = angle;
  }
  sphere(flower, '#e6b85f', [0, height, 0.07], [0.07, 0.07, 0.045]); return flower;
}

function makeHeart() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.06); shape.bezierCurveTo(-0.23, 0.31, -0.45, 0.05, 0, -0.28);
  shape.bezierCurveTo(0.45, 0.05, 0.23, 0.31, 0, 0.06);
  const heart = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.07, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.025, bevelThickness: 0.025 }), material('#dd96ad'));
  return heart;
}

function makeFood(food: Food) {
  const group = new THREE.Group();
  if (food === 'apple') {
    sphere(group, '#e88a6d', [-0.06, 0, 0], [0.2, 0.24, 0.22]);
    sphere(group, '#e88a6d', [0.06, 0, 0], [0.2, 0.24, 0.22]);
    roundedBox(group, '#806a4e', [0, 0.25, 0], [0.045, 0.12, 0.045], 0.012);
    const leaf = sphere(group, '#7b9e5f', [0.11, 0.28, 0], [0.14, 0.05, 0.065]); leaf.rotation.z = 0.3;
  } else if (food === 'carrot') {
    const carrot = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.65, 32), material('#e8a057'));
    carrot.rotation.z = Math.PI; group.add(carrot);
    for (let i = 0; i < 3; i++) {
      const leaf = sphere(group, '#7f9e62', [(i - 1) * 0.09, 0.4, 0], [0.05, 0.2, 0.04]); leaf.rotation.z = (i - 1) * -0.35;
    }
    group.rotation.z = 0.7;
  } else {
    const berry = sphere(group, '#df8498', [0, 0, 0], [0.22, 0.27, 0.21]); berry.rotation.z = Math.PI;
    for (let i = 0; i < 5; i++) {
      const angle = i * 2.4;
      sphere(group, '#ffe6b3', [Math.sin(angle) * 0.16, (i - 2) * 0.07, 0.17], [0.015, 0.025, 0.012]);
      const leaf = sphere(group, '#749864', [Math.sin(angle) * 0.09, 0.23, Math.cos(angle) * 0.09], [0.12, 0.025, 0.06]); leaf.rotation.y = -angle;
    }
  }
  return group;
}

export function PetScene({ action, asleep, reducedMotion, onPet, food }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef({ action, asleep, reducedMotion, onPet, food });
  const [failed, setFailed] = useState(false);
  propsRef.current = { action, asleep, reducedMotion, onPet, food };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch { setFailed(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-5, 5, 3.3, -3.3, 0.1, 100);
    camera.position.set(5, 3.8, 8); camera.lookAt(0, 1.05, 0);
    const ambient = new THREE.HemisphereLight('#fff9f3', '#869475', 2.8); scene.add(ambient);
    const light = new THREE.DirectionalLight('#fff3da', 4.1); light.position.set(-3, 7, 5); light.castShadow = true;
    light.shadow.mapSize.set(2048, 2048); light.shadow.camera.left = -6; light.shadow.camera.right = 6;
    light.shadow.camera.top = 6; light.shadow.camera.bottom = -6; light.shadow.normalBias = 0.03; light.shadow.bias = -0.0003;
    light.shadow.radius = 4; scene.add(light);
    const fill = new THREE.DirectionalLight('#dacfee', 1.1); fill.position.set(4, 2, -4); scene.add(fill);

    const world = new THREE.Group(); scene.add(world); world.position.y = -0.18;
    const soil = sphere(world, '#cab798', [0, -0.18, 0], [3.23, 0.36, 2.54]);
    const grass = sphere(world, '#b3c998', [0, 0.02, 0], [3.27, 0.22, 2.57]);
    soil.receiveShadow = true; grass.receiveShadow = true;
    // A soft contact shadow keeps the floating meadow grounded.
    const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = 128; shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(103,98,115,0.17)'); gradient.addColorStop(0.7, 'rgba(103,98,115,0.08)'); gradient.addColorStop(1, 'rgba(103,98,115,0)');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
    contactShadow.rotation.x = -Math.PI / 2; contactShadow.position.y = -0.68; world.add(contactShadow);

    // Irregular grass tufts, daisies, pebbles, and a tiny fence.
    for (let i = 0; i < 40; i++) {
      const angle = i * 2.39996; const radius = 1.7 + (i % 4) * 0.32;
      const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius * 0.74;
      for (let j = 0; j < 3; j++) {
        const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.16 + j * 0.035, 5), material(i % 2 ? '#85a569' : '#9bb67a'));
        blade.position.set(x + j * 0.045, 0.23, z); blade.rotation.z = (j - 1) * 0.3; world.add(blade);
      }
    }
    makeFlower(world, -1.8, 1.1, 0.34, '#fffdf1', 1.2);
    makeFlower(world, -2.0, 1.28, 0.22, '#fffdf1', 0.9);
    makeFlower(world, -1.63, 1.25, 0.21, '#fffdf1', 0.8);
    makeFlower(world, 1.88, 0.85, 0.31, '#e7d0e9', 1.1);
    makeFlower(world, 2.09, 0.6, 0.25, '#fff9e8', 0.9);
    makeFlower(world, 1.75, 0.57, 0.18, '#e7d0e9', 0.7);
    makeFlower(world, -1.1, -1.5, 0.27, '#e9d2e6', 0.9);
    sphere(world, '#c9c5b2', [-2.3, 0.2, -0.1], [0.18, 0.1, 0.15]);
    sphere(world, '#ddd6c1', [-2.54, 0.15, -0.1], [0.1, 0.07, 0.1]);
    sphere(world, '#d0c8b1', [1.2, 0.18, 1.64], [0.14, 0.08, 0.1]);
    const fence = new THREE.Group(); fence.position.set(1.75, 0.12, -1.55); fence.rotation.y = -0.4; world.add(fence);
    for (let i = 0; i < 3; i++) roundedBox(fence, '#f2e4c9', [(i - 1) * 0.51, 0.43, 0], [0.14, 0.83, 0.14], 0.055);
    roundedBox(fence, '#ede0c7', [0, 0.29, 0.04], [1.46, 0.12, 0.11], 0.045);
    roundedBox(fence, '#ede0c7', [0, 0.61, 0.04], [1.46, 0.12, 0.11], 0.045);

    // The calf is entirely modeled in 3D and animated as a little articulated character.
    const cow = new THREE.Group(); cow.rotation.y = 0.42; cow.position.set(0, 0.16, 0.2); world.add(cow);
    const body = sphere(cow, cream, [0, 1.0, -0.16], [0.79, 0.76, 0.75]);
    sphere(cow, ink, [0.68, 1.12, -0.16], [0.12, 0.34, 0.32]);
    sphere(cow, ink, [-0.54, 0.91, -0.54], [0.25, 0.27, 0.19]);
    const legs: THREE.Group[] = [];
    for (const x of [-0.43, 0.43]) for (const z of [-0.53, 0.34]) {
      const leg = new THREE.Group(); leg.position.set(x, 0.43, z); cow.add(leg);
      roundedBox(leg, cream, [0, -0.08, 0], [0.29, 0.48, 0.3], 0.12);
      roundedBox(leg, '#61594e', [0, -0.26, 0.025], [0.31, 0.19, 0.32], 0.07);
      legs.push(leg);
    }
    const head = new THREE.Group(); head.position.set(0, 1.82, 0.22); cow.add(head);
    sphere(head, cream, [0, 0, 0], [0.88, 0.83, 0.73]);
    const patch = sphere(head, ink, [-0.33, 0.42, 0.49], [0.36, 0.32, 0.23]); patch.rotation.z = -0.4;
    sphere(head, cream, [0.08, 0.72, 0.1], [0.3, 0.15, 0.3]);
    const ears: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      const ear = new THREE.Group(); ear.position.set(side * 0.74, 0.4, -0.02); ear.rotation.z = side * 0.27;
      sphere(ear, cream, [side * 0.22, 0, 0], [0.4, 0.18, 0.22]);
      sphere(ear, '#e0b4a5', [side * 0.23, -0.01, 0.16], [0.29, 0.105, 0.048]); head.add(ear); ears.push(ear);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.38, 32), material('#d8bd8e'));
      horn.position.set(side * 0.49, 0.77, -0.04); horn.rotation.z = -side * 0.18; head.add(horn);
    }
    const eyes: THREE.Mesh[] = [];
    for (const side of [-1, 1]) {
      const eye = sphere(head, '#363936', [side * 0.32, 0.12, 0.67], [0.125, 0.17, 0.055]);
      sphere(eye, '#fffcf1', [-0.26, 0.3, 0.85], [0.23, 0.22, 0.13]);
      sphere(eye, '#fffcf1', [0.33, -0.22, 0.88], [0.08, 0.07, 0.07]);
      eyes.push(eye);
      const cheek = sphere(head, '#e9baac', [side * 0.56, -0.1, 0.56], [0.14, 0.075, 0.033]); cheek.rotation.y = side * 0.4;
    }
    const muzzle = new THREE.Group(); muzzle.position.set(0, -0.3, 0.64); head.add(muzzle);
    sphere(muzzle, blush, [0, 0, 0], [0.57, 0.34, 0.26]);
    sphere(muzzle, '#ecc0ae', [0, 0.06, 0.18], [0.42, 0.2, 0.085]);
    for (const side of [-1, 1]) sphere(muzzle, '#a87866', [side * 0.24, 0.06, 0.249], [0.065, 0.05, 0.025]);
    tube(muzzle, '#bd8876', [new THREE.Vector3(-0.1, -0.12, 0.24), new THREE.Vector3(0, -0.15, 0.253), new THREE.Vector3(0.1, -0.12, 0.24)], 0.012);
    const tail = new THREE.Group(); tail.position.set(0, 1.15, -0.75); cow.add(tail);
    tube(tail, cream, [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.22, 0.2, -0.2), new THREE.Vector3(0.4, 0.18, -0.3)], 0.045);
    sphere(tail, ink, [0.4, 0.18, -0.3], [0.095, 0.08, 0.08]);
    // A little lavender neckerchief gives Clover her own personality.
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 12, 50), material('#b7a4ce'));
    collar.rotation.x = Math.PI / 2; collar.position.set(0, 1.29, 0.15); cow.add(collar);
    const bell = sphere(cow, '#e4bd70', [0, 1.16, 0.68], [0.115, 0.12, 0.08]);
    tube(cow, '#b68b4f', [new THREE.Vector3(-0.045, 1.13, 0.751), new THREE.Vector3(0.045, 1.13, 0.751)], 0.012);
    sphere(cow, '#b18c55', [0, 1.09, 0.755], [0.016, 0.02, 0.008]);

    // Fluffy clouds and a couple of little floating meadow friends.
    const clouds: THREE.Group[] = [];
    for (const [x, y, z, scale] of [[-3.7, 3.55, -3.2, 0.9], [3.45, 3.85, -4.2, 0.65], [-1.5, 4.45, -6.4, 0.6]]) {
      const cloud = new THREE.Group(); cloud.position.set(x, y, z); cloud.scale.setScalar(scale); scene.add(cloud);
      for (let j = -2; j <= 2; j++) { const puff = sphere(cloud, '#fffdf4', [j * 0.3, Math.abs(j) === 0 ? 0.12 : 0, 0], [0.43, 0.25 + (2 - Math.abs(j)) * 0.04, 0.3]); puff.castShadow = false; }
      clouds.push(cloud);
    }
    const butterfly = new THREE.Group(); butterfly.position.set(-2, 1.52, -0.2); world.add(butterfly);
    const wings = [-1, 1].map(side => { const wing = sphere(butterfly, '#c4add3', [side * 0.1, 0, 0], [0.12, 0.1, 0.025]); return wing; });
    sphere(butterfly, '#81708a', [0, 0, 0], [0.025, 0.1, 0.025]);
    const stars = new THREE.Group(); scene.add(stars); stars.visible = false;
    for (let i = 0; i < 18; i++) {
      const star = sphere(stars, '#f5ecc8', [(i % 7 - 3) * 1.2, 2.5 + (i % 3) * 0.5, -3.5 - i % 2], [0.03, 0.03, 0.03]);
      star.material = new THREE.MeshBasicMaterial({ color: '#fff2c8' });
    }
    const moon = sphere(scene, '#ffebad', [-3.1, 3.7, -4], [0.36, 0.36, 0.12]); moon.visible = false;

    const foodGroup = new THREE.Group(); cow.add(foodGroup); foodGroup.visible = false;
    let foodObject = makeFood('apple'); foodGroup.add(foodObject); let lastFood: Food = 'apple';
    const ball = sphere(world, '#d3a3ba', [1.5, 0.45, 0.5], [0.31, 0.31, 0.31]); ball.visible = false;
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 12, 32), material('#f8efd5')); stripe.rotation.x = 0.4; ball.add(stripe);
    const effects = new THREE.Group(); world.add(effects);
    const hearts = Array.from({ length: 7 }, () => { const heart = makeHeart(); heart.visible = false; effects.add(heart); return heart; });
    const bubbles = Array.from({ length: 16 }, (_, i) => {
      const bubble = sphere(effects, i % 2 ? '#dfecf3' : '#eee3f2', [0, 1, 0], [0.12, 0.12, 0.12]);
      bubble.material = new THREE.MeshPhysicalMaterial({ color: i % 2 ? '#dceaf8' : '#ecdff6', transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.1, clearcoat: 1 }); bubble.visible = false; return bubble;
    });

    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2(); const look = { x: 0, y: 0 };
    function pointerMove(event: PointerEvent) {
      const bounds = container!.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
      look.x = pointer.x; look.y = pointer.y;
      raycaster.setFromCamera(pointer, camera);
      container!.style.cursor = raycaster.intersectObject(cow, true).length ? 'pointer' : 'default';
    }
    function pointerLeave() { look.x = 0; look.y = 0; container!.style.cursor = 'default'; }
    function pointerClick(event: PointerEvent) {
      pointerMove(event); raycaster.setFromCamera(pointer, camera);
      if (raycaster.intersectObject(cow, true).length) propsRef.current.onPet();
    }
    container.addEventListener('pointermove', pointerMove);
    container.addEventListener('pointerleave', pointerLeave);
    container.addEventListener('pointerup', pointerClick);

    function resize() {
      const width = container!.clientWidth, height = container!.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height);
      const aspect = width / height;
      const halfHeight = aspect < 1.2 ? 3.65 : 2.9;
      camera.left = -halfHeight * aspect; camera.right = halfHeight * aspect;
      camera.top = halfHeight; camera.bottom = -halfHeight; camera.updateProjectionMatrix();
    }
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize();
    let frame = 0; let lastAction = 0; let actionStarted = 0; let currentAction: CareAction | null = null;
    const start = performance.now();
    const initialMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let isVisible = true;
    const visibilityObserver = new IntersectionObserver(entries => { isVisible = entries[0].isIntersecting; }); visibilityObserver.observe(container);
    function animate() {
      frame = requestAnimationFrame(animate);
      if (!isVisible || document.hidden) return;
      const now = performance.now(), t = (now - start) / 1000;
      const p = propsRef.current; const calm = p.reducedMotion || initialMotion;
      if (p.action && p.action.id !== lastAction) { lastAction = p.action.id; currentAction = p.action.type; actionStarted = now; }
      const elapsed = (now - actionStarted) / 1000;
      const active = currentAction !== null && elapsed < (currentAction === 'play' ? 4.2 : currentAction === 'feed' ? 2.8 : 2.2);
      const sleeping = p.asleep || (active && currentAction === 'sleep');
      const nightAmount = sleeping ? 1 : 0;
      light.intensity += ((nightAmount ? 1.05 : 4.1) - light.intensity) * 0.025;
      ambient.intensity += ((nightAmount ? 1.9 : 2.8) - ambient.intensity) * 0.025;
      moon.visible = sleeping; stars.visible = sleeping; clouds.forEach(cloud => { cloud.visible = !sleeping; });
      cow.position.y += ((sleeping ? -0.1 : 0.16) - cow.position.y) * 0.1;
      cow.rotation.z = sleeping ? -0.04 : 0;
      const breathe = Math.sin(t * (sleeping ? 1.5 : 2.5));
      body.scale.y = 0.76 + breathe * 0.008;
      head.rotation.z = sleeping ? 0.12 : calm ? 0 : Math.sin(t * 0.8) * 0.025;
      head.rotation.y += ((sleeping || calm ? 0 : look.x * 0.075) - head.rotation.y) * 0.025;
      head.rotation.x += ((sleeping ? 0.08 : calm ? 0 : -look.y * 0.025) - head.rotation.x) * 0.04;
      const blink = sleeping ? 0.07 : (t % 4.8 > 4.62 && t % 4.8 < 4.78) ? 0.08 : 1;
      eyes.forEach(eye => { eye.scale.y = 0.17 * blink; });
      ears.forEach((ear, i) => { ear.rotation.z = (i ? 1 : -1) * 0.27 + (calm ? 0 : Math.sin(t * 2.3 + i) * 0.06); });
      tail.rotation.z = calm ? 0 : Math.sin(t * 2.5) * 0.2;
      muzzle.scale.y = 1;
      cow.position.x = 0; cow.rotation.y = 0.42;
      legs.forEach(leg => { leg.rotation.x = 0; });
      foodGroup.visible = false; ball.visible = false;
      hearts.forEach(heart => { heart.visible = false; }); bubbles.forEach(bubble => { bubble.visible = false; });
      if (active && currentAction === 'feed') {
        if (p.action?.food && p.action.food !== lastFood) {
          foodGroup.remove(foodObject);
          foodObject.traverse(object => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (!Array.isArray(object.material)) object.material.dispose(); } });
          lastFood = p.action.food; foodObject = makeFood(lastFood); foodGroup.add(foodObject);
        }
        foodGroup.visible = elapsed < 2.15;
        const approach = Math.min(1, elapsed / 0.6);
        foodGroup.position.set(-0.48 * (1 - approach), 1.26 + approach * 0.2, 2.8 - approach * 1.6);
        foodGroup.rotation.z = Math.sin(elapsed * 7) * 0.08;
        const eaten = elapsed > 1.35 ? Math.max(0.01, 1 - (elapsed - 1.35) / 0.8) : 1;
        foodGroup.scale.setScalar(eaten);
        if (elapsed > 0.6) { muzzle.scale.y = 1 + Math.sin(elapsed * 19) * 0.08; head.rotation.x = Math.sin(elapsed * 12) * 0.04; }
      }
      if (active && currentAction === 'play') {
        ball.visible = true;
        ball.position.set(Math.sin(elapsed * 4) * 1.7, 0.48 + Math.abs(Math.sin(elapsed * 5)) * 0.9, 1.25);
        ball.rotation.x = elapsed * 4;
        if (!calm) { cow.position.y = 0.16 + Math.abs(Math.sin(elapsed * 5)) * 0.25; cow.position.x = Math.sin(elapsed * 4) * 0.2; cow.rotation.y = 0.42 + Math.sin(elapsed * 4) * 0.2; legs.forEach((leg, i) => { leg.rotation.x = Math.sin(elapsed * 8 + i) * 0.25; }); }
        ears.forEach((ear, i) => { ear.rotation.z = (i ? 1 : -1) * 0.4; });
      }
      if (active && (currentAction === 'pet' || (currentAction === 'feed' && elapsed > 1.9) || currentAction === 'wake')) {
        hearts.forEach((heart, i) => {
          const age = (elapsed + i * 0.24) % 1.65;
          heart.visible = true; heart.position.set(Math.sin(i * 2.4) * 1.15, 1.65 + age * 0.8, 0.5 + Math.cos(i * 2.4) * 0.65);
          heart.scale.setScalar((i % 2 ? 0.28 : 0.4) * Math.sin(age / 1.65 * Math.PI)); heart.quaternion.copy(camera.quaternion);
        });
        if (!calm) head.rotation.z = Math.sin(elapsed * 4) * 0.07;
        eyes.forEach(eye => { eye.scale.y = 0.11; });
      }
      if (active && currentAction === 'clean') {
        bubbles.forEach((bubble, i) => {
          const angle = i * 2.3999; const age = (elapsed + i * 0.13) % 2;
          bubble.visible = true; bubble.position.set(Math.sin(angle) * (0.8 + i % 3 * 0.1), 0.5 + age * 1.2, 0.3 + Math.cos(angle) * 0.9);
          const scale = 0.08 + (i % 4) * 0.05; bubble.scale.setScalar(scale);
        });
        if (!calm) cow.rotation.z = Math.sin(elapsed * 12) * 0.025;
      }
      if (!calm) {
        butterfly.position.set(-1.8 + Math.sin(t * 0.65) * 0.28, 1.6 + Math.sin(t * 1.5) * 0.16, -0.3 + Math.cos(t * 0.6) * 0.25);
        wings.forEach((wing, i) => { wing.rotation.y = Math.sin(t * 14) * (i ? 1 : -1) * 0.6; });
        clouds.forEach((cloud, i) => { cloud.position.x += Math.sin(t * 0.3 + i) * 0.0008; });
      }
      bell.rotation.z = Math.sin(t * 2) * 0.07;
      renderer.render(scene, camera);
    }
    animate();
    return () => {
      cancelAnimationFrame(frame); resizeObserver.disconnect(); visibilityObserver.disconnect();
      container.removeEventListener('pointermove', pointerMove); container.removeEventListener('pointerleave', pointerLeave); container.removeEventListener('pointerup', pointerClick);
      scene.traverse(object => {
        if (object instanceof THREE.Mesh) { object.geometry.dispose(); const materials = Array.isArray(object.material) ? object.material : [object.material]; materials.forEach(m => m.dispose()); }
      });
      shadowTexture.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <div className="pet-scene" ref={containerRef} role="img" aria-label={asleep ? 'Your 3D cow is sleeping peacefully in her meadow' : 'An animated 3D cow in a sunny meadow. Tap her for affection.'}>
    {failed && <div className="scene-fallback"><img src="/favicon.svg" alt="Your little cow"/><p>Your browser couldn’t open the 3D meadow.</p><span>Try enabling WebGL or opening a recent browser. Your care controls still work below.</span></div>}
  </div>;
}
