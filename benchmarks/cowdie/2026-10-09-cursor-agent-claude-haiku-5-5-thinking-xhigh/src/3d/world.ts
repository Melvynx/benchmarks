import * as THREE from "three";

export interface World {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  clouds: THREE.Group[];
  shadow: THREE.Mesh;
  /** Advance ambient motion: clouds, camera sway, day/night lighting. */
  update(time: number, dt: number, night: boolean): void;
  /** Keep the contact shadow under Cowdie, shrinking when it hops. */
  placeShadow(x: number, z: number, lift: number): void;
  /** Projects a world point to CSS pixels relative to the canvas. */
  toScreen(point: THREE.Vector3): { x: number; y: number };
  /** Ray-casts a client-space point onto a plane facing the camera at depth `z`. */
  clientToPlane(clientX: number, clientY: number, z: number, out: THREE.Vector3): THREE.Vector3 | null;
  resize(width: number, height: number): void;
  render(): void;
}

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function radialTexture(stops: [number, string][], size = 256): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function buildMeadow(scene: THREE.Scene): void {
  const grassTexture = radialTexture([
    [0, "#c4f2a6"],
    [0.55, "#a6e18a"],
    [1, "#7cc56c"],
  ]);
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(7.5, 96),
    new THREE.MeshStandardMaterial({ map: grassTexture, roughness: 1, metalness: 0 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const rand = seeded(7);
  const flowerColors = [0xffffff, 0xffd166, 0xff8fb1, 0xc89bff, 0x8ecbff];
  const stemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6);
  const headGeo = new THREE.SphereGeometry(0.07, 12, 10);
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4f9e4a, roughness: 0.9 });
  for (let i = 0; i < 46; i++) {
    const angle = rand() * Math.PI * 2;
    const radius = 2.3 + rand() * 4.3;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.8;
    if (z > 3.6) continue;
    const flower = new THREE.Group();
    flower.position.set(x, 0.15, z);
    flower.add(new THREE.Mesh(stemGeo, stemMat));
    const head = new THREE.Mesh(
      headGeo,
      new THREE.MeshStandardMaterial({
        color: flowerColors[Math.floor(rand() * flowerColors.length)],
        roughness: 0.6,
      }),
    );
    head.position.y = 0.17;
    flower.add(head);
    scene.add(flower);
  }

  const canopyMat = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0xb98460, roughness: 0.9 });
  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.22, 1.1, 8);
  const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
  const trees: [number, number, number][] = [
    [-4.4, -2.0, 1.2],
    [4.6, -1.4, 1.05],
    [-3.3, -4.6, 1.5],
    [2.9, -4.9, 1.35],
  ];
  for (const [x, z, s] of trees) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.55;
    trunk.castShadow = true;
    tree.add(trunk);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat(0x7fd49a));
    canopy.scale.setScalar(0.95 * s);
    canopy.position.y = 1.7 * s;
    canopy.castShadow = true;
    tree.add(canopy);
    scene.add(tree);
  }

  const bushMat = new THREE.MeshStandardMaterial({ color: 0x5fb36a, roughness: 0.9, flatShading: true });
  const bushGeo = new THREE.IcosahedronGeometry(0.42, 1);
  for (const [x, z] of [
    [-2.7, 1.6],
    [2.8, 1.9],
    [-4.0, 0.4],
    [4.1, 0.2],
  ]) {
    for (let i = 0; i < 3; i++) {
      const bush = new THREE.Mesh(bushGeo, bushMat);
      bush.position.set(x + (i - 1) * 0.36, 0.25 + (i === 1 ? 0.12 : 0), z + (i % 2) * 0.2);
      bush.scale.setScalar(i === 1 ? 1.15 : 0.9);
      bush.castShadow = true;
      scene.add(bush);
    }
  }
}

function buildClouds(scene: THREE.Scene): THREE.Group[] {
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
  const puffGeo = new THREE.SphereGeometry(1, 20, 14);
  const clouds: THREE.Group[] = [];
  const layouts: { x: number; y: number; z: number; s: number }[] = [
    { x: -5, y: 4.3, z: -6, s: 1 },
    { x: 1.5, y: 5.2, z: -8, s: 1.3 },
    { x: 6, y: 3.9, z: -5, s: 0.85 },
  ];
  for (const layout of layouts) {
    const cloud = new THREE.Group();
    cloud.position.set(layout.x, layout.y, layout.z);
    cloud.scale.setScalar(layout.s);
    const puffs: [number, number, number, number][] = [
      [0, 0, 0, 0.7],
      [0.7, 0.15, 0.1, 0.55],
      [-0.7, 0.05, 0, 0.5],
      [0.25, 0.4, -0.1, 0.5],
    ];
    for (const [x, y, z, r] of puffs) {
      const puff = new THREE.Mesh(puffGeo, cloudMat);
      puff.position.set(x, y, z);
      puff.scale.setScalar(r);
      cloud.add(puff);
    }
    scene.add(cloud);
    clouds.push(cloud);
  }
  return clouds;
}

export function createWorld(canvas: HTMLCanvasElement): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 2.9, 11);
  camera.lookAt(0, 1.25, 0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x8fc27a, 1.35);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.1);
  sun.position.set(3.5, 7, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -3.5;
  sun.shadow.camera.right = 3.5;
  sun.shadow.camera.top = 3.5;
  sun.shadow.camera.bottom = -3.5;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 20;
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 4;
  scene.add(sun);
  scene.add(sun.target);

  buildMeadow(scene);
  const clouds = buildClouds(scene);

  const shadowTexture = radialTexture([
    [0, "rgba(40,70,40,0.42)"],
    [0.5, "rgba(40,70,40,0.25)"],
    [1, "rgba(40,70,40,0)"],
  ]);
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  shadow.scale.set(2.4, 1.6, 1);
  scene.add(shadow);

  const dayColors = {
    hemiSky: new THREE.Color(0xffffff),
    hemiGround: new THREE.Color(0x8fc27a),
    hemiIntensity: 1.35,
    sunColor: new THREE.Color(0xfff1d6),
    sunIntensity: 2.1,
  };
  const nightColors = {
    hemiSky: new THREE.Color(0x7d8fd6),
    hemiGround: new THREE.Color(0x2d3b5e),
    hemiIntensity: 0.55,
    sunColor: new THREE.Color(0xb7c8ff),
    sunIntensity: 0.55,
  };
  const current = { night: 0 };
  const tmpColor = new THREE.Color();

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const planeNormal = new THREE.Vector3(0, 0, 1);
  const plane = new THREE.Plane(planeNormal, 0);
  const hit = new THREE.Vector3();
  const tmpScreen = new THREE.Vector3();

  const world: World = {
    renderer,
    scene,
    camera,
    clouds,
    shadow,
    update(time, dt, night) {
      const target = night ? 1 : 0;
      current.night += (target - current.night) * (1 - Math.exp(-dt * 1.5));
      const t = current.night;
      tmpColor.copy(dayColors.hemiSky).lerp(nightColors.hemiSky, t);
      hemi.color.copy(tmpColor);
      tmpColor.copy(dayColors.hemiGround).lerp(nightColors.hemiGround, t);
      hemi.groundColor.copy(tmpColor);
      hemi.intensity = dayColors.hemiIntensity + (nightColors.hemiIntensity - dayColors.hemiIntensity) * t;
      tmpColor.copy(dayColors.sunColor).lerp(nightColors.sunColor, t);
      sun.color.copy(tmpColor);
      sun.intensity = dayColors.sunIntensity + (nightColors.sunIntensity - dayColors.sunIntensity) * t;

      clouds.forEach((cloud, i) => {
        cloud.position.x += dt * (0.06 + i * 0.02);
        if (cloud.position.x > 9) cloud.position.x = -9;
      });
      camera.position.x = Math.sin(time * 0.18) * 0.25;
      camera.lookAt(0, 1.25, 0);
    },
    placeShadow(x, z, lift) {
      shadow.position.x = x;
      shadow.position.z = z;
      const squeeze = Math.max(0.55, 1 - lift * 0.6);
      shadow.scale.set(2.4 * squeeze, 1.6 * squeeze, 1);
    },
    toScreen(point) {
      tmpScreen.copy(point).project(camera);
      const rect = canvas.getBoundingClientRect();
      return {
        x: (tmpScreen.x * 0.5 + 0.5) * rect.width,
        y: (-tmpScreen.y * 0.5 + 0.5) * rect.height,
      };
    },
    clientToPlane(clientX, clientY, z, out) {
      const rect = canvas.getBoundingClientRect();
      ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      plane.constant = -z;
      return raycaster.ray.intersectPlane(plane, hit) ? out.copy(hit) : null;
    },
    resize(width, height) {
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(1, height);
      camera.position.z = camera.aspect < 0.9 ? 14 : 11;
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
  };
  return world;
}
