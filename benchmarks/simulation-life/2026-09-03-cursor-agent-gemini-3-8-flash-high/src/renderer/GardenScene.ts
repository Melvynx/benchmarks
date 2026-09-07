import * as THREE from 'three';
import { BlobEntity, EntityId, FruitTree, InteractiveTool } from '../types/simulation';
import { SimulationEngine } from '../simulation/engine';

interface Particle {
  mesh: THREE.Mesh;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scaleStart: number;
  scaleEnd: number;
}

export class GardenScene {
  public container: HTMLElement;
  public engine: SimulationEngine;

  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private clock: THREE.Clock;

  // Camera Orbit Controls
  private isPointerDown = false;
  private isRightPointerDown = false;
  private prevPointerX = 0;
  private prevPointerY = 0;
  private cameraDistance = 115;
  private cameraTheta = 0.85; // Azimuth angle (radians)
  private cameraPhi = 0.92;  // Polar angle (radians)
  private targetLookAt = new THREE.Vector3(0, 3, 0);
  private currentLookAt = new THREE.Vector3(0, 3, 0);

  // Scene Groups
  private dishGroup = new THREE.Group();
  private treesGroup = new THREE.Group();
  private blobsGroup = new THREE.Group();
  private particlesGroup = new THREE.Group();
  private effectsGroup = new THREE.Group();

  // Selection & Indicators
  private selectionRingMesh!: THREE.Mesh;
  private visionRadiusMesh!: THREE.Mesh;
  private hoverCursorMesh!: THREE.Mesh;

  // Mesh Caches
  private blobMeshMap = new Map<EntityId, {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    leftEye: THREE.Mesh;
    rightEye: THREE.Mesh;
    leftPupil: THREE.Mesh;
    rightPupil: THREE.Mesh;
    shadow: THREE.Mesh;
    leftCheek?: THREE.Mesh;
    rightCheek?: THREE.Mesh;
  }>();

  private treeMeshMap = new Map<string, {
    group: THREE.Group;
    foliageGroup: THREE.Group;
    fruitMeshes: { id: string; group: THREE.Group; berry: THREE.Mesh; stem: THREE.Mesh }[];
  }>();

  // Particle System
  private particles: Particle[] = [];

  // Shared Materials
  private blueMaterial!: THREE.MeshStandardMaterial;
  private redMaterial!: THREE.MeshStandardMaterial;
  private eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  private cheekMaterial = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.65 });
  private shadowMaterial = new THREE.MeshBasicMaterial({ color: 0x050811, transparent: true, opacity: 0.38 });
  private ripeFruitMaterial!: THREE.MeshStandardMaterial;
  private unripeFruitMaterial!: THREE.MeshStandardMaterial;
  private stemMaterial = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });

  // Raycaster for click/hover
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  public onBlobClick?: (blob: BlobEntity | null) => void;
  public onGroundClick?: (x: number, z: number, tool: InteractiveTool) => void;

  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement, engine: SimulationEngine) {
    this.container = container;
    this.engine = engine;
    this.clock = new THREE.Clock();

    // 1. Initialize Scene & Fog
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d16);
    this.scene.fog = new THREE.FogExp2(0x090d16, 0.0032);

    // 2. Camera Setup
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(40, aspect, 1, 1000);
    this.updateCameraPosition();

    // 3. Renderer Setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 4. Shared Materials & Lighting
    this.initMaterials();
    this.setupLighting();

    // 5. Build Scenery
    this.buildWorldDish();
    this.buildDecorations();
    this.setupEffectsMeshes();

    // 6. Add Groups to Scene
    this.scene.add(this.dishGroup);
    this.scene.add(this.treesGroup);
    this.scene.add(this.blobsGroup);
    this.scene.add(this.particlesGroup);
    this.scene.add(this.effectsGroup);

    // 7. Event Listeners
    this.bindEvents();

    // 8. Start Render Loop
    this.animate();
  }

  private initMaterials() {
    this.blueMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.28,
      metalness: 0.12,
    });

    this.redMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.30,
      metalness: 0.12,
    });

    this.ripeFruitMaterial = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.25,
      metalness: 0.08,
      emissive: 0x22c55e,
      emissiveIntensity: 0.22,
    });

    this.unripeFruitMaterial = new THREE.MeshStandardMaterial({
      color: 0xa3e635,
      roughness: 0.6,
      metalness: 0.0,
      opacity: 0.75,
      transparent: true,
    });
  }

  private setupLighting() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.95);
    this.scene.add(ambientLight);

    // Hemisphere Light (warm sky, soft grass ground bounce)
    const hemiLight = new THREE.HemisphereLight(0xbfdbfe, 0x14532d, 0.75);
    hemiLight.position.set(0, 80, 0);
    this.scene.add(hemiLight);

    // Main Sun Directional Light with soft shadows
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.6);
    sunLight.position.set(60, 90, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 240;
    const d = 65;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.radius = 2.5;
    this.scene.add(sunLight);

    // Soft Rim Light from opposite angle
    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.45);
    rimLight.position.set(-50, 40, -60);
    this.scene.add(rimLight);
  }

  private buildWorldDish() {
    const radius = this.engine.config.worldRadius;
    const dishHeight = 6.0;

    // 1. Lush Green Island Surface
    const topGeo = new THREE.CylinderGeometry(radius, radius, 1.2, 64);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.65,
      metalness: 0.05,
    });
    const topMesh = new THREE.Mesh(topGeo, grassMat);
    topMesh.position.y = -0.6;
    topMesh.receiveShadow = true;
    this.dishGroup.add(topMesh);

    // 2. Inner garden lawn ring with subtle stepped contour
    const innerGeo = new THREE.CylinderGeometry(radius * 0.95, radius * 0.95, 0.15, 64);
    const innerGrassMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.6,
      metalness: 0.04,
    });
    const innerMesh = new THREE.Mesh(innerGeo, innerGrassMat);
    innerMesh.position.y = 0.05;
    innerMesh.receiveShadow = true;
    this.dishGroup.add(innerMesh);

    // 3. Center soft meadow ring
    const centerGeo = new THREE.CylinderGeometry(radius * 0.65, radius * 0.65, 0.12, 48);
    const centerGrassMat = new THREE.MeshStandardMaterial({
      color: 0x16a34a,
      roughness: 0.58,
      metalness: 0.03,
    });
    const centerMesh = new THREE.Mesh(centerGeo, centerGrassMat);
    centerMesh.position.y = 0.12;
    centerMesh.receiveShadow = true;
    this.dishGroup.add(centerMesh);

    // 4. Raised Tabletop Rim / Basin
    const rimGeo = new THREE.TorusGeometry(radius + 0.4, 1.2, 16, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.7,
      metalness: 0.2,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.y = 0.2;
    rimMesh.receiveShadow = true;
    this.dishGroup.add(rimMesh);

    // 5. Dish Under-Base (pedestal)
    const baseGeo = new THREE.CylinderGeometry(radius + 0.2, radius * 0.75, dishHeight, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.85,
      metalness: 0.15,
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -dishHeight / 2 - 0.6;
    this.dishGroup.add(baseMesh);

    // 6. Ground Shadow Disc under the whole dish
    const floorGeo = new THREE.CircleGeometry(radius * 1.5, 48);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x030712,
      transparent: true,
      opacity: 0.45,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -dishHeight - 1.2;
    this.dishGroup.add(floorMesh);
  }

  private buildDecorations() {
    const radius = this.engine.config.worldRadius;
    const decGroup = new THREE.Group();

    // Cute decorative rocks around rim
    const rockGeo = new THREE.DodecahedronGeometry(1.2, 1);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 });

    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + Math.random() * 0.2;
      const r = radius * (0.86 + Math.random() * 0.08);
      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(Math.cos(angle) * r, 0.4, Math.sin(angle) * r);
      const s = 0.7 + Math.random() * 0.9;
      rock.scale.set(s, s * 0.7, s);
      rock.rotation.set(Math.random(), Math.random(), Math.random());
      rock.castShadow = true;
      rock.receiveShadow = true;
      decGroup.add(rock);
    }

    // Cute little mushrooms
    const capGeo = new THREE.ConeGeometry(0.8, 0.8, 12);
    const capMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.3 });
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.8, 8);
    const mushStemMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.6 });

    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius * 0.7;
      const mushGroup = new THREE.Group();

      const stem = new THREE.Mesh(stemGeo, mushStemMat);
      stem.position.y = 0.4;
      stem.castShadow = true;
      mushGroup.add(stem);

      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 0.9;
      cap.castShadow = true;
      mushGroup.add(cap);

      mushGroup.position.set(Math.cos(angle) * r, 0.1, Math.sin(angle) * r);
      mushGroup.scale.setScalar(0.7 + Math.random() * 0.6);
      mushGroup.rotation.y = Math.random() * Math.PI;
      decGroup.add(mushGroup);
    }

    this.dishGroup.add(decGroup);
  }

  private setupEffectsMeshes() {
    // 1. Selection Pulsing Ring
    const ringGeo = new THREE.RingGeometry(2.4, 2.9, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    this.selectionRingMesh = new THREE.Mesh(ringGeo, ringMat);
    this.selectionRingMesh.rotation.x = -Math.PI / 2;
    this.selectionRingMesh.position.y = 0.18;
    this.selectionRingMesh.visible = false;
    this.effectsGroup.add(this.selectionRingMesh);

    // 2. Vision Sensing Range Circle
    const visionGeo = new THREE.RingGeometry(23.5, 24.2, 64);
    const visionMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.28,
    });
    this.visionRadiusMesh = new THREE.Mesh(visionGeo, visionMat);
    this.visionRadiusMesh.rotation.x = -Math.PI / 2;
    this.visionRadiusMesh.position.y = 0.14;
    this.visionRadiusMesh.visible = false;
    this.effectsGroup.add(this.visionRadiusMesh);

    // 3. Tool Hover Cursor
    const cursorGeo = new THREE.RingGeometry(1.6, 2.0, 24);
    const cursorMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    this.hoverCursorMesh = new THREE.Mesh(cursorGeo, cursorMat);
    this.hoverCursorMesh.rotation.x = -Math.PI / 2;
    this.hoverCursorMesh.position.y = 0.2;
    this.hoverCursorMesh.visible = false;
    this.effectsGroup.add(this.hoverCursorMesh);
  }

  private createBlobMesh(blob: BlobEntity) {
    const group = new THREE.Group();

    // 1. Shadow Disc on ground
    const shadowGeo = new THREE.CircleGeometry(1.4, 24);
    const shadow = new THREE.Mesh(shadowGeo, this.shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.08;
    group.add(shadow);

    // 2. Glossy Oval Bean Body
    const bodyGeo = new THREE.SphereGeometry(1.3, 24, 20);
    // Initial oval bean stretch
    bodyGeo.scale(1.05, 1.35, 1.05);

    const mat = blob.species === 'blue' ? this.blueMaterial : this.redMaterial;
    const bodyMesh = new THREE.Mesh(bodyGeo, mat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.y = 1.3;
    group.add(bodyMesh);

    // 3. Eyes (Two big cute white eyes)
    const eyeGeo = new THREE.SphereGeometry(0.36, 16, 14);
    eyeGeo.scale(1.0, 1.15, 0.55);

    const leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    leftEye.position.set(0.44, 1.45, 1.15);
    bodyMesh.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    rightEye.position.set(-0.44, 1.45, 1.15);
    bodyMesh.add(rightEye);

    // 4. Pupils
    const pupilGeo = new THREE.SphereGeometry(0.18, 12, 10);
    pupilGeo.scale(1.0, 1.0, 0.4);

    const leftPupil = new THREE.Mesh(pupilGeo, this.pupilMaterial);
    leftPupil.position.set(0.04, 0.0, 0.28);
    leftEye.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeo, this.pupilMaterial);
    rightPupil.position.set(-0.04, 0.0, 0.28);
    rightEye.add(rightPupil);

    // 5. Blush Cheeks
    const cheekGeo = new THREE.CircleGeometry(0.24, 16);
    const leftCheek = new THREE.Mesh(cheekGeo, this.cheekMaterial);
    leftCheek.position.set(0.72, 1.15, 1.05);
    leftCheek.rotation.y = 0.5;
    bodyMesh.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, this.cheekMaterial);
    rightCheek.position.set(-0.72, 1.15, 1.05);
    rightCheek.rotation.y = -0.5;
    bodyMesh.add(rightCheek);

    group.position.set(blob.x, 0, blob.z);
    this.blobsGroup.add(group);

    const cacheEntry = {
      group,
      bodyMesh,
      leftEye,
      rightEye,
      leftPupil,
      rightPupil,
      shadow,
      leftCheek,
      rightCheek,
    };

    this.blobMeshMap.set(blob.id, cacheEntry);
    return cacheEntry;
  }

  private createTreeMesh(tree: FruitTree) {
    const group = new THREE.Group();
    group.position.set(tree.x, 0, tree.z);
    group.scale.setScalar(tree.scale);

    // 1. Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.7, 1.1, 3.8, 14);
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x5c2e0b,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 1.9;
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    // 2. Fluffy Canopy Group
    const foliageGroup = new THREE.Group();
    foliageGroup.position.y = 3.6;

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.75,
      metalness: 0.05,
    });

    // Multi-lobed cloud canopy for cute organic shape
    const mainCanopyGeo = new THREE.SphereGeometry(tree.foliageRadius * 0.95, 20, 16);
    const mainCanopy = new THREE.Mesh(mainCanopyGeo, canopyMat);
    mainCanopy.castShadow = true;
    mainCanopy.receiveShadow = true;
    foliageGroup.add(mainCanopy);

    // Subsidiary canopy puffs
    const offsets = [
      { x: 1.2, y: 0.4, z: 0.8, s: 0.72 },
      { x: -1.1, y: 0.3, z: 0.9, s: 0.68 },
      { x: 0.3, y: 0.6, z: -1.2, s: 0.75 },
      { x: -0.9, y: 0.5, z: -0.8, s: 0.65 },
    ];

    for (const off of offsets) {
      const puffGeo = new THREE.SphereGeometry(tree.foliageRadius * off.s, 16, 12);
      const puff = new THREE.Mesh(puffGeo, canopyMat);
      puff.position.set(off.x, off.y, off.z);
      puff.castShadow = true;
      puff.receiveShadow = true;
      foliageGroup.add(puff);
    }

    group.add(foliageGroup);

    // 3. Fruits physically attached to tree
    const fruitMeshes: { id: string; group: THREE.Group; berry: THREE.Mesh; stem: THREE.Mesh }[] = [];
    const berryGeo = new THREE.SphereGeometry(0.68, 16, 14);
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 8);

    for (const fruit of tree.fruits) {
      const fruitGroup = new THREE.Group();
      fruitGroup.position.set(fruit.localX, fruit.localY, fruit.localZ);

      // Tiny brown stem
      const stem = new THREE.Mesh(stemGeo, this.stemMaterial);
      stem.position.y = 0.35;
      fruitGroup.add(stem);

      // Glossy Green Berry
      const berry = new THREE.Mesh(berryGeo, fruit.isRipe ? this.ripeFruitMaterial : this.unripeFruitMaterial);
      berry.castShadow = true;
      fruitGroup.add(berry);

      const s = fruit.isRipe ? 1.0 : Math.max(0.2, fruit.growthProgress);
      fruitGroup.scale.setScalar(s);

      group.add(fruitGroup);
      fruitMeshes.push({ id: fruit.id, group: fruitGroup, berry, stem });
    }

    this.treesGroup.add(group);

    const cacheEntry = { group, foliageGroup, fruitMeshes };
    this.treeMeshMap.set(tree.id, cacheEntry);
    return cacheEntry;
  }

  public spawnParticles(x: number, y: number, z: number, colorHex: number, count: number = 8) {
    const geo = new THREE.SphereGeometry(0.35, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.95 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(geo, mat.clone());
      mesh.position.set(x, y, z);
      this.particlesGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 4.5;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 3.5 + Math.random() * 4.5,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.45 + Math.random() * 0.35,
        scaleStart: 0.4 + Math.random() * 0.3,
        scaleEnd: 0.05,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.maxLife) {
        this.particlesGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach(m => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 9.8 * dt; // gravity

      const scale = THREE.MathUtils.lerp(p.scaleStart, p.scaleEnd, t);
      p.mesh.scale.setScalar(scale);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = 1.0 - t;
    }
  }

  private updateEntities() {
    // 1. Sync Blobs
    const currentBlobIds = new Set(this.engine.blobs.keys());

    // Remove deleted meshes
    for (const [id, entry] of this.blobMeshMap.entries()) {
      if (!currentBlobIds.has(id)) {
        this.blobsGroup.remove(entry.group);
        this.blobMeshMap.delete(id);
      }
    }

    // Update or create active blobs
    for (const blob of this.engine.blobs.values()) {
      let entry = this.blobMeshMap.get(blob.id);
      if (!entry) {
        entry = this.createBlobMesh(blob);
      }

      // Position & Hopping Motion
      const hopHeight = Math.abs(Math.sin(blob.hopPhase)) * 0.95;
      entry.group.position.set(blob.x, 0, blob.z);
      entry.bodyMesh.position.y = 1.3 + hopHeight;

      // Rotation & Leaning
      entry.group.rotation.y = blob.angle;
      entry.bodyMesh.rotation.z = -blob.vx * 0.025;
      entry.bodyMesh.rotation.x = blob.vz * 0.025;

      // Squash and stretch
      const baseScale = blob.traits.size;
      const stretchY = 1.0 + (hopHeight / 0.95) * 0.15;
      const squashXZ = 1.0 - (hopHeight / 0.95) * 0.07;
      entry.bodyMesh.scale.set(
        baseScale * squashXZ * blob.scaleX,
        baseScale * stretchY * blob.scaleY,
        baseScale * squashXZ * blob.scaleZ
      );

      // Shadow projection
      const shadowScale = Math.max(0.5, 1.4 - (hopHeight / 0.95) * 0.45) * baseScale;
      entry.shadow.scale.setScalar(shadowScale);
      (entry.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.18, 0.38 - hopHeight * 0.18);

      // Blinking eyes
      const blinkScaleY = blob.isBlinking ? 0.1 : 1.15;
      entry.leftEye.scale.y = blinkScaleY;
      entry.rightEye.scale.y = blinkScaleY;

      // Pupil targeting
      if (blob.action === 'hunting' || blob.action === 'foraging') {
        entry.leftPupil.position.z = 0.32;
        entry.rightPupil.position.z = 0.32;
      } else if (blob.action === 'fleeing') {
        entry.leftPupil.position.z = 0.18;
        entry.rightPupil.position.z = 0.18;
      } else {
        entry.leftPupil.position.z = 0.28;
        entry.rightPupil.position.z = 0.28;
      }
    }

    // 2. Sync Trees and Fruits
    const currentTreeIds = new Set(this.engine.trees.map(t => t.id));

    // Remove old trees
    for (const [id, entry] of this.treeMeshMap.entries()) {
      if (!currentTreeIds.has(id)) {
        this.treesGroup.remove(entry.group);
        this.treeMeshMap.delete(id);
      }
    }

    // Update active trees & fruit regrowth
    for (const tree of this.engine.trees) {
      let entry = this.treeMeshMap.get(tree.id);
      if (!entry) {
        entry = this.createTreeMesh(tree);
      }

      // Canopy Jiggle / Rustle
      if (tree.jiggle > 0) {
        const jiggleAmount = Math.sin(this.engine.time * 24) * tree.jiggle * 0.18;
        entry.foliageGroup.rotation.z = jiggleAmount;
        entry.foliageGroup.rotation.x = Math.cos(this.engine.time * 22) * tree.jiggle * 0.12;
      } else {
        // Subtle ambient breeze
        entry.foliageGroup.rotation.z = Math.sin(this.engine.time * 1.5 + tree.x * 0.1) * 0.025;
        entry.foliageGroup.rotation.x = Math.cos(this.engine.time * 1.3 + tree.z * 0.1) * 0.02;
      }

      // Update Fruits visibility & regrowth scale
      for (const fMesh of entry.fruitMeshes) {
        const fruitData = tree.fruits.find(f => f.id === fMesh.id);
        if (!fruitData) continue;

        if (fruitData.isRipe) {
          fMesh.berry.material = this.ripeFruitMaterial;
          fMesh.group.scale.setScalar(1.0);
          fMesh.group.visible = true;
        } else {
          fMesh.berry.material = this.unripeFruitMaterial;
          const s = Math.max(0.18, fruitData.growthProgress);
          fMesh.group.scale.setScalar(s);
          fMesh.group.visible = fruitData.growthProgress > 0.05;
        }
      }
    }

    // 3. Process events for particle effects
    if (this.engine.events.length > 0) {
      const recentEvents = this.engine.events.slice(-6);
      for (const ev of recentEvents) {
        if (ev.type === 'eat_fruit') {
          this.spawnParticles(ev.x, ev.y, ev.z, 0x4ade80, 7);
        } else if (ev.type === 'predation') {
          this.spawnParticles(ev.x, ev.y, ev.z, 0xf43f5e, 8);
        } else if (ev.type === 'birth') {
          this.spawnParticles(ev.x, ev.y, ev.z, ev.species === 'blue' ? 0x38bdf8 : 0xf43f5e, 9);
        }
      }
    }

    // 4. Update Selection Ring & Vision Range
    const selectedBlob = this.engine.selectedBlobId
      ? this.engine.blobs.get(this.engine.selectedBlobId)
      : null;

    if (selectedBlob) {
      this.selectionRingMesh.visible = true;
      this.selectionRingMesh.position.set(selectedBlob.x, 0.18, selectedBlob.z);
      // Gentle pulsing scale
      const ringPulse = 1.0 + Math.sin(this.engine.time * 6) * 0.08;
      this.selectionRingMesh.scale.setScalar(ringPulse);

      this.visionRadiusMesh.visible = true;
      this.visionRadiusMesh.position.set(selectedBlob.x, 0.14, selectedBlob.z);
      const visionRange = (selectedBlob.species === 'blue'
        ? this.engine.config.blueBaseVision
        : this.engine.config.redBaseVision) * selectedBlob.traits.vision;
      this.visionRadiusMesh.scale.setScalar(visionRange / 24);
      (this.visionRadiusMesh.material as THREE.MeshBasicMaterial).color.setHex(
        selectedBlob.species === 'blue' ? 0x38bdf8 : 0xf43f5e
      );
    } else {
      this.selectionRingMesh.visible = false;
      this.visionRadiusMesh.visible = false;
    }
  }

  private updateCameraPosition() {
    // Clamp polar angle so user cannot flip upside down
    this.cameraPhi = Math.max(0.3, Math.min(Math.PI / 2 - 0.05, this.cameraPhi));
    // Clamp zoom distance
    this.cameraDistance = Math.max(35, Math.min(180, this.cameraDistance));

    const x = this.currentLookAt.x + this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.currentLookAt.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.currentLookAt.z + this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.currentLookAt);
  }

  public resetCamera() {
    this.cameraDistance = 115;
    this.cameraTheta = 0.85;
    this.cameraPhi = 0.92;
    this.targetLookAt.set(0, 3, 0);
  }

  private bindEvents() {
    const el = this.renderer.domElement;

    // Pointer Down
    el.addEventListener('pointerdown', (e: PointerEvent) => {
      if (e.button === 2) {
        this.isRightPointerDown = true;
      } else {
        this.isPointerDown = true;
      }
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;
    });

    // Pointer Move
    window.addEventListener('pointermove', (e: PointerEvent) => {
      // Calculate normalized device coordinates
      const rect = el.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (this.isPointerDown) {
        const dx = e.clientX - this.prevPointerX;
        const dy = e.clientY - this.prevPointerY;
        this.cameraTheta -= dx * 0.007;
        this.cameraPhi -= dy * 0.007;
        this.prevPointerX = e.clientX;
        this.prevPointerY = e.clientY;
      } else if (this.isRightPointerDown) {
        const dx = e.clientX - this.prevPointerX;
        const dy = e.clientY - this.prevPointerY;
        // Pan camera
        const panSpeed = 0.12;
        this.targetLookAt.x -= dx * Math.cos(this.cameraTheta) * panSpeed;
        this.targetLookAt.z += dx * Math.sin(this.cameraTheta) * panSpeed;
        this.targetLookAt.y += dy * panSpeed;
        this.prevPointerX = e.clientX;
        this.prevPointerY = e.clientY;
      }

      // Update Tool Hover Cursor
      if (this.engine.activeTool !== 'inspect') {
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersectPoint = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(this.groundPlane, intersectPoint)) {
          const dist = Math.hypot(intersectPoint.x, intersectPoint.z);
          if (dist < this.engine.config.worldRadius * 0.9) {
            this.hoverCursorMesh.position.set(intersectPoint.x, 0.2, intersectPoint.z);
            this.hoverCursorMesh.visible = true;
          } else {
            this.hoverCursorMesh.visible = false;
          }
        }
      } else {
        this.hoverCursorMesh.visible = false;
      }
    });

    // Pointer Up
    window.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.button === 2) {
        this.isRightPointerDown = false;
      } else {
        // Detect click (short drag)
        const moveDist = Math.hypot(e.clientX - this.prevPointerX, e.clientY - this.prevPointerY);
        if (this.isPointerDown && moveDist < 6) {
          this.handleClick(e);
        }
        this.isPointerDown = false;
      }
    });

    // Prevent context menu for right drag
    el.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Wheel Zoom
    el.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      this.cameraDistance += e.deltaY * 0.08;
    }, { passive: false });

    // Window / Container Resize
    this.resizeObserver = new ResizeObserver(() => {
      this.handleResize();
    });
    this.resizeObserver.observe(this.container);
  }

  private handleClick(e: PointerEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (this.engine.activeTool === 'inspect') {
      // 1. Raycast against Blobs
      const blobMeshes: THREE.Object3D[] = [];
      const meshToBlobId = new Map<THREE.Object3D, EntityId>();

      for (const [id, entry] of this.blobMeshMap.entries()) {
        blobMeshes.push(entry.bodyMesh);
        meshToBlobId.set(entry.bodyMesh, id);
      }

      const intersects = this.raycaster.intersectObjects(blobMeshes, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const blobId = meshToBlobId.get(hitMesh);
        if (blobId) {
          const blob = this.engine.blobs.get(blobId) || null;
          this.engine.selectedBlobId = blobId;
          this.onBlobClick?.(blob);
          this.spawnParticles(intersects[0].point.x, intersects[0].point.y + 0.5, intersects[0].point.z, 0xfbbf24, 6);
          return;
        }
      }

      // Clicked ground: deselect
      this.engine.selectedBlobId = null;
      this.onBlobClick?.(null);
    } else {
      // Interactive Tools: spawn blue/red, plant tree, feed
      const hitPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, hitPoint)) {
        const dist = Math.hypot(hitPoint.x, hitPoint.z);
        if (dist <= this.engine.config.worldRadius * 0.92) {
          if (this.engine.activeTool === 'spawn_blue') {
            this.engine.spawnBlob('blue', hitPoint.x, hitPoint.z, 1);
            this.spawnParticles(hitPoint.x, 1.2, hitPoint.z, 0x38bdf8, 10);
          } else if (this.engine.activeTool === 'spawn_red') {
            this.engine.spawnBlob('red', hitPoint.x, hitPoint.z, 1);
            this.spawnParticles(hitPoint.x, 1.2, hitPoint.z, 0xf43f5e, 10);
          } else if (this.engine.activeTool === 'plant_tree') {
            this.engine.plantTreeAt(hitPoint.x, hitPoint.z);
            this.spawnParticles(hitPoint.x, 1.5, hitPoint.z, 0x22c55e, 12);
          } else if (this.engine.activeTool === 'drop_fruit') {
            this.engine.dropFruitSnackAt(hitPoint.x, hitPoint.z);
            this.spawnParticles(hitPoint.x, 1.2, hitPoint.z, 0x4ade80, 8);
          }
          this.onGroundClick?.(hitPoint.x, hitPoint.z, this.engine.activeTool);
        }
      }
    }
  }

  private handleResize() {
    const width = this.container.clientWidth;
    const height = Math.max(1, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const dt = Math.min(0.1, this.clock.getDelta());

    // 1. Advance simulation
    this.engine.update(dt);

    // 2. Camera Tracking
    if (this.engine.trackedBlobId) {
      const trackedBlob = this.engine.blobs.get(this.engine.trackedBlobId);
      if (trackedBlob) {
        this.targetLookAt.set(trackedBlob.x, 2.5, trackedBlob.z);
      } else {
        this.engine.trackedBlobId = null;
      }
    }

    // Smooth camera lookAt lerp
    this.currentLookAt.lerp(this.targetLookAt, dt * 6.0);
    this.updateCameraPosition();

    // 3. Update scene meshes & particles
    this.updateEntities();
    this.updateParticles(dt);

    // 4. Render
    this.renderer.render(this.scene, this.camera);
  };

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
