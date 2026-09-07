import * as THREE from 'three';
import { BlobEntity, EntityId, FruitTree, InteractiveTool, Species } from '../types/simulation';
import { SimulationEngine } from '../simulation/engine';

interface Particle {
  mesh: THREE.Mesh | THREE.Sprite;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  rotSpeed: number;
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
  private prevPointerX = 0;
  private prevPointerY = 0;
  private cameraDistance = 110;
  private cameraTheta = 0.8; // Azimuth angle (radians)
  private cameraPhi = 0.95;  // Polar angle (radians)
  private targetLookAt = new THREE.Vector3(0, 4, 0);
  private currentLookAt = new THREE.Vector3(0, 4, 0);

  // Scene Objects
  private dishGroup = new THREE.Group();
  private treesGroup = new THREE.Group();
  private blobsGroup = new THREE.Group();
  private particlesGroup = new THREE.Group();
  private effectsGroup = new THREE.Group();
  private hoverCursorMesh!: THREE.Mesh;
  private selectionRingMesh!: THREE.Mesh;
  private visionRadiusMesh!: THREE.Mesh;

  // Entity Meshes Cache
  private blobMeshMap = new Map<EntityId, {
    group: THREE.Group;
    bodyMesh: THREE.Mesh;
    leftEye: THREE.Mesh;
    rightEye: THREE.Mesh;
    leftPupil: THREE.Mesh;
    rightPupil: THREE.Mesh;
    mouth: THREE.Mesh;
    shadow: THREE.Mesh;
    cheeks?: THREE.Mesh[];
  }>();

  private treeMeshMap = new Map<string, {
    group: THREE.Group;
    canopy: THREE.Mesh;
    fruitMeshes: { id: string; mesh: THREE.Group; stem: THREE.Mesh; berry: THREE.Mesh }[];
  }>();

  // Particle System
  private particles: Particle[] = [];

  // Materials & Geometries Reuse for High Performance
  private blueMaterial!: THREE.MeshStandardMaterial;
  private redMaterial!: THREE.MeshStandardMaterial;
  private eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  private pupilMaterial = new THREE.MeshBasicMaterial({ color: 0x111827 });
  private mouthMaterial = new THREE.MeshBasicMaterial({ color: 0x1e293b });
  private blushMaterial = new THREE.MeshBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.6 });
  private fruitMaterial!: THREE.MeshStandardMaterial;
  private fruitUnripeMaterial!: THREE.MeshStandardMaterial;
  private shadowMaterial!: THREE.MeshBasicMaterial;

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

    // 1. Initialize Three.js Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d);
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.0035);

    // 2. Camera Setup
    const aspect = container.clientWidth / Math.max(1, container.clientHeight);
    this.camera = new THREE.PerspectiveCamera(42, aspect, 1, 1000);
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

    // 4. Initialize Shared Materials
    this.initMaterials();

    // 5. Setup Lighting
    this.setupLighting();

    // 6. Build World Dish & Scenery
    this.buildDish();

    // 7. Add Groups
    this.scene.add(this.dishGroup);
    this.scene.add(this.treesGroup);
    this.scene.add(this.blobsGroup);
    this.scene.add(this.particlesGroup);
    this.scene.add(this.effectsGroup);

    // 8. Build Interaction Helpers
    this.buildHelpers();

    // 9. Attach Event Listeners
    this.attachEventListeners();

    // 10. Initial Tree & Blob Meshes
    this.syncTrees();

    // 11. Start Render Loop
    this.render = this.render.bind(this);
    this.startLoop();
  }

  private initMaterials() {
    this.blueMaterial = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.15,
    });

    this.redMaterial = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.25,
      metalness: 0.1,
      emissive: 0xbe123c,
      emissiveIntensity: 0.18,
    });

    this.fruitMaterial = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      metalness: 0.1,
      emissive: 0x059669,
      emissiveIntensity: 0.25,
    });

    this.fruitUnripeMaterial = new THREE.MeshStandardMaterial({
      color: 0x84cc16,
      roughness: 0.6,
      metalness: 0.05,
      transparent: true,
      opacity: 0.5,
    });

    // Shadow texture
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.45)');
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const shadowTex = new THREE.CanvasTexture(canvas);

    this.shadowMaterial = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
  }

  private setupLighting() {
    // Ambient Light
    const ambientLight = new THREE.AmbientLight(0xe0f2fe, 0.7);
    this.scene.add(ambientLight);

    // Hemisphere Light (sky / ground bounce)
    const hemiLight = new THREE.HemisphereLight(0xfffbeb, 0x1e293b, 0.65);
    this.scene.add(hemiLight);

    // Main Sun Directional Light
    const sunLight = new THREE.DirectionalLight(0xfff7ed, 1.4);
    sunLight.position.set(60, 90, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 250;
    const d = 70;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // Soft Rim Light from back-left
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    rimLight.position.set(-60, 40, -50);
    this.scene.add(rimLight);
  }

  private buildDish() {
    const r = this.engine.config.worldRadius;

    // 1. Terracotta / Ceramic Raised Dish Base
    const dishHeight = 12;
    const dishBaseGeo = new THREE.CylinderGeometry(r + 4.5, r + 2.0, dishHeight, 64);
    const dishBaseMat = new THREE.MeshStandardMaterial({
      color: 0x243038,
      roughness: 0.45,
      metalness: 0.15,
    });
    const dishBase = new THREE.Mesh(dishBaseGeo, dishBaseMat);
    dishBase.position.y = -dishHeight / 2 - 0.2;
    dishBase.receiveShadow = true;
    this.dishGroup.add(dishBase);

    // 2. Ceramic Golden Rim Torus
    const rimGeo = new THREE.TorusGeometry(r + 4.2, 1.6, 24, 64);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.3,
      metalness: 0.5,
      emissive: 0x78350f,
      emissiveIntensity: 0.15,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.2;
    rim.receiveShadow = true;
    this.dishGroup.add(rim);

    // 3. Rich Soil Layer
    const soilGeo = new THREE.CylinderGeometry(r + 1.5, r + 2.5, 3.5, 64);
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x452b1b,
      roughness: 0.9,
      metalness: 0.05,
    });
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = -1.75;
    soil.receiveShadow = true;
    this.dishGroup.add(soil);

    // 4. Lush Grass Top Surface
    const grassGeo = new THREE.CylinderGeometry(r, r + 1.2, 1.2, 64);
    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x226b48,
      roughness: 0.65,
      metalness: 0.05,
    });
    const grass = new THREE.Mesh(grassGeo, grassMat);
    grass.position.y = -0.5;
    grass.receiveShadow = true;
    this.dishGroup.add(grass);

    // 5. Decorative Stepping Stones & Mini Botanicals
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x78716c, roughness: 0.8 });
    const flowerMats = [
      new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.4, emissive: 0xdb2777, emissiveIntensity: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4, emissive: 0xeab308, emissiveIntensity: 0.2 }),
      new THREE.MeshStandardMaterial({ color: 0xc4b5fd, roughness: 0.4, emissive: 0x8b5cf6, emissiveIntensity: 0.2 }),
    ];

    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2 + Math.sin(i * 3.7) * 0.4;
      const dist = Math.sqrt(Math.random()) * (r * 0.85);
      const px = Math.cos(angle) * dist;
      const pz = Math.sin(angle) * dist;

      if (i % 3 === 0) {
        // Mini Stone
        const stoneGeo = new THREE.DodecahedronGeometry(0.8 + Math.random() * 0.8, 0);
        const stone = new THREE.Mesh(stoneGeo, stoneMat);
        stone.position.set(px, 0.2, pz);
        stone.scale.set(1.2, 0.35, 0.9);
        stone.rotation.y = Math.random() * Math.PI;
        stone.castShadow = true;
        stone.receiveShadow = true;
        this.dishGroup.add(stone);
      } else {
        // Mini Daisy / Flower
        const flowerGroup = new THREE.Group();
        flowerGroup.position.set(px, 0.1, pz);

        const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.6, 6);
        const stemMat = new THREE.MeshBasicMaterial({ color: 0x166534 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.3;
        flowerGroup.add(stem);

        const petalGeo = new THREE.SphereGeometry(0.35, 8, 8);
        const petal = new THREE.Mesh(petalGeo, flowerMats[i % flowerMats.length]);
        petal.position.y = 0.65;
        petal.scale.set(1, 0.4, 1);
        flowerGroup.add(petal);

        this.dishGroup.add(flowerGroup);
      }
    }

    // 6. Huge Ground Soft Drop Shadow Plane below Dish
    const groundShadowGeo = new THREE.PlaneGeometry(r * 3.5, r * 3.5);
    const groundShadowMat = new THREE.MeshBasicMaterial({
      map: this.shadowMaterial.map,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const groundShadow = new THREE.Mesh(groundShadowGeo, groundShadowMat);
    groundShadow.rotation.x = -Math.PI / 2;
    groundShadow.position.y = -dishHeight - 0.5;
    this.dishGroup.add(groundShadow);
  }

  private buildHelpers() {
    // Hover Cursor Ring
    const hoverGeo = new THREE.RingGeometry(2.0, 2.5, 32);
    const hoverMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.hoverCursorMesh = new THREE.Mesh(hoverGeo, hoverMat);
    this.hoverCursorMesh.rotation.x = -Math.PI / 2;
    this.hoverCursorMesh.position.y = 0.15;
    this.hoverCursorMesh.visible = false;
    this.effectsGroup.add(this.hoverCursorMesh);

    // Selected Blob Pulsing Ring
    const selGeo = new THREE.RingGeometry(3.2, 3.8, 32);
    const selMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.selectionRingMesh = new THREE.Mesh(selGeo, selMat);
    this.selectionRingMesh.rotation.x = -Math.PI / 2;
    this.selectionRingMesh.position.y = 0.2;
    this.selectionRingMesh.visible = false;
    this.effectsGroup.add(this.selectionRingMesh);

    // Vision Sensing Radius Circle for selected blob
    const visionGeo = new THREE.RingGeometry(19.8, 20.2, 64);
    const visionMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.visionRadiusMesh = new THREE.Mesh(visionGeo, visionMat);
    this.visionRadiusMesh.rotation.x = -Math.PI / 2;
    this.visionRadiusMesh.position.y = 0.12;
    this.visionRadiusMesh.visible = false;
    this.effectsGroup.add(this.visionRadiusMesh);
  }

  public syncTrees() {
    // Clear old tree meshes
    for (const [, entry] of this.treeMeshMap) {
      this.treesGroup.remove(entry.group);
    }
    this.treeMeshMap.clear();

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.55,
      metalness: 0.05,
    });
    const foliageMatAlt = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.55,
      metalness: 0.05,
    });

    const berryGeo = new THREE.SphereGeometry(0.75, 16, 16);
    const stemGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.4, 6);
    const stemMat = new THREE.MeshBasicMaterial({ color: 0x451a03 });

    for (let i = 0; i < this.engine.trees.length; i++) {
      const tree = this.engine.trees[i];
      const group = new THREE.Group();
      group.position.set(tree.x, 0, tree.z);
      group.scale.setScalar(tree.scale);

      // Tree Trunk (Curved Stylized Bark)
      const trunkGeo = new THREE.CylinderGeometry(0.65, 1.1, 3.2, 10);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      trunk.receiveShadow = true;
      group.add(trunk);

      // Tree Canopy (Chunky Cloud-like spheres)
      const canopyGroup = new THREE.Group();
      canopyGroup.position.y = 3.6;

      const mainFoliageGeo = new THREE.DodecahedronGeometry(tree.foliageRadius, 1);
      const mainFoliage = new THREE.Mesh(mainFoliageGeo, i % 2 === 0 ? foliageMat : foliageMatAlt);
      mainFoliage.castShadow = true;
      mainFoliage.receiveShadow = true;
      canopyGroup.add(mainFoliage);

      // Sub-blobs for whimsical cloud shape
      for (let s = 0; s < 3; s++) {
        const subGeo = new THREE.DodecahedronGeometry(tree.foliageRadius * 0.6, 1);
        const sub = new THREE.Mesh(subGeo, foliageMat);
        const a = (s / 3) * Math.PI * 2;
        sub.position.set(Math.cos(a) * 1.3, 0.4 + Math.sin(s) * 0.4, Math.sin(a) * 1.3);
        sub.castShadow = true;
        canopyGroup.add(sub);
      }

      group.add(canopyGroup);

      // Fruits Attached to Tree
      const fruitMeshes: { id: string; mesh: THREE.Group; stem: THREE.Mesh; berry: THREE.Mesh }[] = [];
      for (const f of tree.fruits) {
        const fruitGroup = new THREE.Group();
        fruitGroup.position.set(f.localX, f.localY, f.localZ);

        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.35;
        fruitGroup.add(stem);

        const berry = new THREE.Mesh(berryGeo, this.fruitMaterial);
        berry.castShadow = true;
        berry.receiveShadow = true;
        fruitGroup.add(berry);

        group.add(fruitGroup);
        fruitMeshes.push({ id: f.id, mesh: fruitGroup, stem, berry });
      }

      this.treesGroup.add(group);
      this.treeMeshMap.set(tree.id, {
        group,
        canopy: canopyGroup as unknown as THREE.Mesh,
        fruitMeshes,
      });
    }
  }

  private createBlobMesh(blob: BlobEntity) {
    const group = new THREE.Group();

    // 1. Glossy Bean Body
    const bodyGeo = new THREE.SphereGeometry(1.4, 24, 24);
    bodyGeo.scale(1.0, 1.25, 0.95);
    const mat = blob.species === 'blue' ? this.blueMaterial : this.redMaterial;
    const bodyMesh = new THREE.Mesh(bodyGeo, mat);
    bodyMesh.position.y = 1.6;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // 2. Eyes
    const eyeGeo = new THREE.SphereGeometry(0.34, 16, 16);
    eyeGeo.scale(1.0, 1.15, 0.4);

    const leftEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    leftEye.position.set(0.48, 1.8, 1.05);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, this.eyeMaterial);
    rightEye.position.set(-0.48, 1.8, 1.05);
    group.add(rightEye);

    // 3. Pupils
    const pupilGeo = new THREE.SphereGeometry(0.18, 12, 12);
    pupilGeo.scale(1.0, 1.0, 0.3);

    const leftPupil = new THREE.Mesh(pupilGeo, this.pupilMaterial);
    leftPupil.position.set(0.48, 1.8, 1.2);
    group.add(leftPupil);

    const rightPupil = new THREE.Mesh(pupilGeo, this.pupilMaterial);
    rightPupil.position.set(-0.48, 1.8, 1.2);
    group.add(rightPupil);

    // 4. Cheeks (Cute Blush)
    const cheekGeo = new THREE.CircleGeometry(0.24, 16);
    const leftCheek = new THREE.Mesh(cheekGeo, this.blushMaterial);
    leftCheek.position.set(0.68, 1.45, 1.06);
    leftCheek.rotation.y = 0.35;
    group.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeo, this.blushMaterial);
    rightCheek.position.set(-0.68, 1.45, 1.06);
    rightCheek.rotation.y = -0.35;
    group.add(rightCheek);

    // 5. Mouth (Small Cute Arc)
    const mouthGeo = new THREE.TorusGeometry(0.18, 0.05, 8, 16, Math.PI);
    const mouth = new THREE.Mesh(mouthGeo, this.mouthMaterial);
    mouth.position.set(0, 1.45, 1.15);
    mouth.rotation.x = Math.PI;
    group.add(mouth);

    // 6. Soft Blob Ground Shadow
    const shadowGeo = new THREE.PlaneGeometry(2.8, 2.8);
    const shadow = new THREE.Mesh(shadowGeo, this.shadowMaterial);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.05;
    group.add(shadow);

    this.blobsGroup.add(group);
    const entry = {
      group,
      bodyMesh,
      leftEye,
      rightEye,
      leftPupil,
      rightPupil,
      mouth,
      shadow,
      cheeks: [leftCheek, rightCheek],
    };
    this.blobMeshMap.set(blob.id, entry);
    return entry;
  }

  private updateBlobMeshes(dt: number) {
    const activeIds = new Set<EntityId>();

    for (const blob of this.engine.blobs.values()) {
      activeIds.add(blob.id);
      let meshEntry = this.blobMeshMap.get(blob.id);
      if (!meshEntry) {
        meshEntry = this.createBlobMesh(blob);
      }

      const { group, bodyMesh, leftEye, rightEye, leftPupil, rightPupil, mouth, shadow } = meshEntry;

      // Hop physics & height
      const hopHeight = Math.abs(Math.sin(blob.hopPhase)) * 0.9;
      const baseScale = blob.traits.size;

      // Position
      group.position.x = blob.x;
      group.position.z = blob.z;
      group.position.y = hopHeight;

      // Squash and stretch
      const squashStretch = 1.0 + Math.sin(blob.hopPhase * 2) * 0.12;
      group.scale.set(
        baseScale * blob.scaleX / Math.sqrt(squashStretch),
        baseScale * blob.scaleY * squashStretch,
        baseScale * blob.scaleZ / Math.sqrt(squashStretch)
      );

      // Rotation & Leaning into velocity
      group.rotation.y = blob.angle;
      const speed = Math.hypot(blob.vx, blob.vz);
      group.rotation.z = -blob.vx * 0.035;
      group.rotation.x = speed * 0.035;

      // Shadow scaling
      const shadowScale = (1.0 - hopHeight * 0.4) * baseScale;
      shadow.scale.set(shadowScale, shadowScale, 1);
      shadow.position.y = -hopHeight + 0.06;

      // Facial Animations: Blinking
      const eyeScaleY = blob.isBlinking ? 0.08 : 1.0;
      leftEye.scale.y = eyeScaleY;
      rightEye.scale.y = eyeScaleY;
      leftPupil.scale.y = eyeScaleY;
      rightPupil.scale.y = eyeScaleY;

      // Pupil Looking Direction (towards target or velocity)
      const lookOffset = Math.sin(blob.age * 3) * 0.06;
      leftPupil.position.x = 0.48 + lookOffset;
      rightPupil.position.x = -0.48 + lookOffset;

      // Mouth animation depending on action
      if (blob.action === 'eating') {
        mouth.scale.set(1.5, 1.8, 1.5);
        mouth.rotation.x = Math.sin(blob.age * 18) > 0 ? 0 : Math.PI;
      } else if (blob.action === 'fleeing') {
        mouth.scale.set(1.8, 1.8, 1.8);
        mouth.rotation.x = 0; // Open scared mouth
      } else if (blob.action === 'paused') {
        mouth.scale.set(1.2, 0.6, 1.2);
        mouth.rotation.x = Math.PI; // Gentle resting smile
      } else {
        mouth.scale.set(1.0, 1.0, 1.0);
        mouth.rotation.x = Math.PI;
      }
    }

    // Cleanup dead blob meshes
    for (const [id, entry] of this.blobMeshMap) {
      if (!activeIds.has(id)) {
        // Spawn death dandelion puff particles
        this.spawnDeathParticles(entry.group.position.x, entry.group.position.z);
        this.blobsGroup.remove(entry.group);
        this.blobMeshMap.delete(id);
      }
    }
  }

  private updateTreeMeshes(dt: number) {
    for (const tree of this.engine.trees) {
      const entry = this.treeMeshMap.get(tree.id);
      if (!entry) continue;

      // Tree Jiggle animation
      if (tree.jiggle > 0.01) {
        entry.group.rotation.z = Math.sin(this.clock.getElapsedTime() * 25) * tree.jiggle * 0.12;
        entry.group.rotation.x = Math.cos(this.clock.getElapsedTime() * 25) * tree.jiggle * 0.12;
      } else {
        entry.group.rotation.set(0, 0, 0);
      }

      // Fruit growth animation & visibility
      for (const fruit of tree.fruits) {
        const fEntry = entry.fruitMeshes.find(m => m.id === fruit.id);
        if (!fEntry) continue;

        if (fruit.isRipe) {
          fEntry.mesh.scale.setScalar(1.0);
          fEntry.berry.material = this.fruitMaterial;
          fEntry.mesh.visible = true;
        } else {
          // Unripe / growing
          const scale = Math.max(0.001, fruit.growthProgress);
          fEntry.mesh.scale.setScalar(scale);
          fEntry.berry.material = this.fruitUnripeMaterial;
          fEntry.mesh.visible = fruit.growthProgress > 0.05;
        }
      }
    }
  }

  private processEvents() {
    while (this.engine.events.length > 0) {
      const evt = this.engine.events.shift()!;
      if (evt.type === 'eat_fruit') {
        this.spawnFruitBiteParticles(evt.x, evt.y, evt.z);
      } else if (evt.type === 'predation') {
        this.spawnPredationParticles(evt.x, evt.y, evt.z);
      } else if (evt.type === 'birth') {
        this.spawnBirthParticles(evt.x, evt.y, evt.z, evt.species || 'blue');
      }
    }
  }

  private spawnFruitBiteParticles(x: number, y: number, z: number) {
    const geo = new THREE.DodecahedronGeometry(0.3, 0);
    const mat = new THREE.MeshBasicMaterial({ color: 0x34d399 });

    for (let i = 0; i < 7; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.particlesGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 3.5;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 3.5 + Math.random() * 4.0,
        vz: Math.sin(angle) * speed,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        rotSpeed: (Math.random() - 0.5) * 10,
        scaleStart: 1.0,
        scaleEnd: 0.0,
      });
    }
  }

  private spawnPredationParticles(x: number, y: number, z: number) {
    const geo = new THREE.SphereGeometry(0.28, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });

    for (let i = 0; i < 10; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.particlesGroup.add(mesh);

      const angle = Math.random() * Math.PI * 2;
      const speed = 3.0 + Math.random() * 5.0;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 4.0 + Math.random() * 5.0,
        vz: Math.sin(angle) * speed,
        life: 0.8,
        maxLife: 0.8,
        rotSpeed: (Math.random() - 0.5) * 12,
        scaleStart: 1.3,
        scaleEnd: 0.0,
      });
    }
  }

  private spawnBirthParticles(x: number, y: number, z: number, species: Species) {
    const geo = new THREE.DodecahedronGeometry(0.32, 0);
    const mat = new THREE.MeshBasicMaterial({ color: species === 'blue' ? 0x93c5fd : 0xfca5a5 });

    for (let i = 0; i < 8; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, y, z);
      this.particlesGroup.add(mesh);

      const angle = (i / 8) * Math.PI * 2;
      const speed = 3.0;
      this.particles.push({
        mesh,
        vx: Math.cos(angle) * speed,
        vy: 3.0 + Math.random() * 2.0,
        vz: Math.sin(angle) * speed,
        life: 0.7,
        maxLife: 0.7,
        rotSpeed: 5.0,
        scaleStart: 1.2,
        scaleEnd: 0.0,
      });
    }
  }

  private spawnDeathParticles(x: number, z: number) {
    const geo = new THREE.SphereGeometry(0.2, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0, transparent: true, opacity: 0.8 });

    for (let i = 0; i < 6; i++) {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x, 0.8, z);
      this.particlesGroup.add(mesh);

      this.particles.push({
        mesh,
        vx: (Math.random() - 0.5) * 2.0,
        vy: 1.5 + Math.random() * 2.5,
        vz: (Math.random() - 0.5) * 2.0,
        life: 1.2,
        maxLife: 1.2,
        rotSpeed: 2.0,
        scaleStart: 1.0,
        scaleEnd: 0.0,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particlesGroup.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }

      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 9.8 * dt; // Gravity
      p.mesh.rotation.y += p.rotSpeed * dt;

      const progress = p.life / p.maxLife;
      const s = p.scaleEnd + (p.scaleStart - p.scaleEnd) * progress;
      p.mesh.scale.setScalar(s);
    }
  }

  private updateSelectionAndFollow() {
    const selectedId = this.engine.selectedBlobId;
    if (selectedId) {
      const blob = this.engine.blobs.get(selectedId);
      if (blob) {
        this.selectionRingMesh.visible = true;
        this.selectionRingMesh.position.x = blob.x;
        this.selectionRingMesh.position.z = blob.z;
        const pulse = 1.0 + Math.sin(this.clock.getElapsedTime() * 6) * 0.15;
        this.selectionRingMesh.scale.setScalar(pulse);

        // Vision Radius Visualizer
        const visionRadius = (blob.species === 'blue' ? this.engine.config.blueBaseVision : this.engine.config.redBaseVision) * blob.traits.vision;
        this.visionRadiusMesh.visible = true;
        this.visionRadiusMesh.position.x = blob.x;
        this.visionRadiusMesh.position.z = blob.z;
        this.visionRadiusMesh.scale.setScalar(visionRadius / 20.0);

        // Camera Follow Mode
        if (this.engine.trackedBlobId === selectedId) {
          this.targetLookAt.set(blob.x, 3.5, blob.z);
        }
      } else {
        this.selectionRingMesh.visible = false;
        this.visionRadiusMesh.visible = false;
      }
    } else {
      this.selectionRingMesh.visible = false;
      this.visionRadiusMesh.visible = false;
      if (!this.engine.trackedBlobId) {
        this.targetLookAt.set(0, 4, 0);
      }
    }

    // Smooth camera target interpolation
    this.currentLookAt.lerp(this.targetLookAt, 0.08);
    this.updateCameraPosition();
  }

  private updateCameraPosition() {
    const sinPhi = Math.sin(this.cameraPhi);
    const cosPhi = Math.cos(this.cameraPhi);
    const sinTheta = Math.sin(this.cameraTheta);
    const cosTheta = Math.cos(this.cameraTheta);

    this.camera.position.x = this.currentLookAt.x + this.cameraDistance * sinPhi * sinTheta;
    this.camera.position.y = this.currentLookAt.y + this.cameraDistance * cosPhi;
    this.camera.position.z = this.currentLookAt.z + this.cameraDistance * sinPhi * cosTheta;
    this.camera.lookAt(this.currentLookAt);
  }

  private attachEventListeners() {
    const el = this.container;

    // Pointer Down
    el.addEventListener('pointerdown', (e) => {
      this.isPointerDown = true;
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;
    });

    // Pointer Move
    window.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      // Update Hover Cursor
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersectionPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, intersectionPoint)) {
        const dist = Math.hypot(intersectionPoint.x, intersectionPoint.z);
        if (dist < this.engine.config.worldRadius) {
          this.hoverCursorMesh.position.x = intersectionPoint.x;
          this.hoverCursorMesh.position.z = intersectionPoint.z;
          this.hoverCursorMesh.visible = true;
        } else {
          this.hoverCursorMesh.visible = false;
        }
      }

      if (!this.isPointerDown) return;

      const deltaX = e.clientX - this.prevPointerX;
      const deltaY = e.clientY - this.prevPointerY;
      this.prevPointerX = e.clientX;
      this.prevPointerY = e.clientY;

      if (e.buttons === 1) {
        // Left click drag: Rotate Orbit
        this.cameraTheta -= deltaX * 0.007;
        this.cameraPhi = Math.max(0.2, Math.min(Math.PI / 2 - 0.05, this.cameraPhi - deltaY * 0.007));
        this.updateCameraPosition();
      }
    });

    // Pointer Up
    window.addEventListener('pointerup', () => {
      this.isPointerDown = false;
    });

    // Click / Selection Raycast
    el.addEventListener('click', (e) => {
      const rect = el.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);

      // 1. Raycast Blobs
      const blobMeshes: THREE.Object3D[] = [];
      const meshToBlobId = new Map<THREE.Object3D, EntityId>();
      for (const [id, entry] of this.blobMeshMap) {
        blobMeshes.push(entry.bodyMesh);
        meshToBlobId.set(entry.bodyMesh, id);
      }

      const intersects = this.raycaster.intersectObjects(blobMeshes);
      if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hitId = meshToBlobId.get(hitMesh);
        if (hitId) {
          const blob = this.engine.blobs.get(hitId);
          if (blob) {
            this.engine.selectedBlobId = hitId;
            if (this.onBlobClick) this.onBlobClick(blob);
            return;
          }
        }
      }

      // 2. Raycast Ground Plane for Tool Actions
      const groundPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.groundPlane, groundPoint)) {
        const dist = Math.hypot(groundPoint.x, groundPoint.z);
        if (dist <= this.engine.config.worldRadius) {
          if (this.onGroundClick) {
            this.onGroundClick(groundPoint.x, groundPoint.z, this.engine.activeTool);
          }
          if (this.engine.activeTool === 'inspect') {
            this.engine.selectedBlobId = null;
            this.engine.trackedBlobId = null;
            if (this.onBlobClick) this.onBlobClick(null);
          }
        }
      }
    });

    // Zoom Wheel
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.cameraDistance = Math.max(35, Math.min(220, this.cameraDistance + e.deltaY * 0.08));
      this.updateCameraPosition();
    }, { passive: false });

    // Window Resize Observer
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.container) return;
      const w = this.container.clientWidth;
      const h = this.container.clientHeight;
      if (w > 0 && h > 0) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
      }
    });
    this.resizeObserver.observe(this.container);
  }

  public resetCamera() {
    this.cameraDistance = 110;
    this.cameraTheta = 0.8;
    this.cameraPhi = 0.95;
    this.targetLookAt.set(0, 4, 0);
    this.currentLookAt.set(0, 4, 0);
    this.engine.trackedBlobId = null;
    this.updateCameraPosition();
  }

  private startLoop() {
    const loop = () => {
      this.render();
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private render() {
    const dt = Math.min(this.clock.getDelta(), 0.1);

    // 1. Advance Simulation Physics & Rules
    this.engine.update(dt);

    // 2. Process Events
    this.processEvents();

    // 3. Update Visual Meshes
    this.updateBlobMeshes(dt);
    this.updateTreeMeshes(dt);
    this.updateParticles(dt);
    this.updateSelectionAndFollow();

    // 4. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.renderer.dispose();
    if (this.container.contains(this.renderer.domElement)) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
