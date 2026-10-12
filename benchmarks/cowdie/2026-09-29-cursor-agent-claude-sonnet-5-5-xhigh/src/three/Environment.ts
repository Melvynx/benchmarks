import * as THREE from 'three';
import { groundTexture, spriteTexture } from './textures';

const smooth = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const C = (hex: number) => new THREE.Color(hex);

interface Palette {
  skyTop: THREE.Color;
  skyMid: THREE.Color;
  skyBot: THREE.Color;
  sun: THREE.Color;
  sunI: number;
  hemiSky: THREE.Color;
  hemiGround: THREE.Color;
  hemiI: number;
  cloud: THREE.Color;
  grass: THREE.Color;
}

const DAY: Palette = {
  skyTop: C(0x5bb6ff),
  skyMid: C(0xbfe8ff),
  skyBot: C(0xdff5ff),
  sun: C(0xfff0d8),
  sunI: 2.7,
  hemiSky: C(0xcfeaff),
  hemiGround: C(0xa9d68a),
  hemiI: 1.25,
  cloud: C(0xffffff),
  grass: C(0xffffff),
};
const DUSK: Palette = {
  skyTop: C(0x6a63c8),
  skyMid: C(0xffa77d),
  skyBot: C(0xffd0a0),
  sun: C(0xffa066),
  sunI: 1.9,
  hemiSky: C(0xffc2a0),
  hemiGround: C(0x9a7f86),
  hemiI: 1.0,
  cloud: C(0xffc9b0),
  grass: C(0xffd9c2),
};
const NIGHT: Palette = {
  skyTop: C(0x0c1233),
  skyMid: C(0x27357a),
  skyBot: C(0x3a4a8f),
  sun: C(0x86a2ff),
  sunI: 1.1,
  hemiSky: C(0x6b82d6),
  hemiGround: C(0x2c3766),
  hemiI: 1.05,
  cloud: C(0x6774b8),
  grass: C(0x8fa4e8),
};

function lerpPalette(out: Palette, ps: [Palette, number][]) {
  out.skyTop.setRGB(0, 0, 0);
  out.skyMid.setRGB(0, 0, 0);
  out.skyBot.setRGB(0, 0, 0);
  out.sun.setRGB(0, 0, 0);
  out.hemiSky.setRGB(0, 0, 0);
  out.hemiGround.setRGB(0, 0, 0);
  out.cloud.setRGB(0, 0, 0);
  out.grass.setRGB(0, 0, 0);
  out.sunI = 0;
  out.hemiI = 0;
  for (const [p, w] of ps) {
    if (w <= 0) continue;
    out.skyTop.r += p.skyTop.r * w;
    out.skyTop.g += p.skyTop.g * w;
    out.skyTop.b += p.skyTop.b * w;
    out.skyMid.r += p.skyMid.r * w;
    out.skyMid.g += p.skyMid.g * w;
    out.skyMid.b += p.skyMid.b * w;
    out.skyBot.r += p.skyBot.r * w;
    out.skyBot.g += p.skyBot.g * w;
    out.skyBot.b += p.skyBot.b * w;
    out.sun.r += p.sun.r * w;
    out.sun.g += p.sun.g * w;
    out.sun.b += p.sun.b * w;
    out.hemiSky.r += p.hemiSky.r * w;
    out.hemiSky.g += p.hemiSky.g * w;
    out.hemiSky.b += p.hemiSky.b * w;
    out.hemiGround.r += p.hemiGround.r * w;
    out.hemiGround.g += p.hemiGround.g * w;
    out.hemiGround.b += p.hemiGround.b * w;
    out.cloud.r += p.cloud.r * w;
    out.cloud.g += p.cloud.g * w;
    out.cloud.b += p.cloud.b * w;
    out.grass.r += p.grass.r * w;
    out.grass.g += p.grass.g * w;
    out.grass.b += p.grass.b * w;
    out.sunI += p.sunI * w;
    out.hemiI += p.hemiI * w;
  }
}

const std = (color: number, rough = 0.8, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: 0, ...extra });

function rand(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const ISLAND_RADIUS = 7.2;

export class Environment {
  readonly group = new THREE.Group();
  readonly sunLight: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly lantern: THREE.PointLight;
  readonly background = new THREE.Color();

  dayT = 0.42;
  nightness = 0;

  private skyMat: THREE.ShaderMaterial;
  private sunSprite: THREE.Sprite;
  private sunCore: THREE.Sprite;
  private moon: THREE.Mesh;
  private moonGlow: THREE.Sprite;
  private stars: THREE.Points;
  private starMat: THREE.PointsMaterial;
  private clouds: { g: THREE.Group; speed: number; mats: THREE.MeshStandardMaterial[] }[] = [];
  private grassMat: THREE.MeshStandardMaterial;
  private grassUniform = { value: 0 };
  private groundMat: THREE.MeshStandardMaterial;
  private butterflies: { g: THREE.Group; wingL: THREE.Mesh; wingR: THREE.Mesh; seed: number }[] = [];
  private fireflies: THREE.Points;
  private fireflyBase: Float32Array;
  private fireflyMat: THREE.PointsMaterial;
  private windowMat: THREE.MeshStandardMaterial;
  private lanternGlow: THREE.Sprite;
  private palette: Palette = {
    skyTop: C(0),
    skyMid: C(0),
    skyBot: C(0),
    sun: C(0),
    sunI: 1,
    hemiSky: C(0),
    hemiGround: C(0),
    hemiI: 1,
    cloud: C(0),
    grass: C(0),
  };
  private sleepF = 0;
  private time = 0;
  private staticTint: { mat: THREE.MeshStandardMaterial; base: THREE.Color }[] = [];

  private tint(...mats: THREE.MeshStandardMaterial[]) {
    mats.forEach((mat) => this.staticTint.push({ mat, base: mat.color.clone() }));
  }

  constructor() {
    const g = this.group;

    // Sky dome
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        top: { value: C(0x5bb6ff) },
        mid: { value: C(0xbfe8ff) },
        bot: { value: C(0xdff5ff) },
      },
      vertexShader: `varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `uniform vec3 top; uniform vec3 mid; uniform vec3 bot; varying vec3 vPos;
        void main(){
          float h = normalize(vPos).y;
          vec3 col = h > 0.0 ? mix(mid, top, pow(clamp(h*1.6,0.0,1.0), 0.75)) : mix(mid, bot, pow(clamp(-h*2.2,0.0,1.0), 0.6));
          gl_FragColor = vec4(col, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(120, 32, 20), this.skyMat);
    sky.renderOrder = -10;
    g.add(sky);

    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTexture('dot'), color: 0xfff0b0, transparent: true, depthWrite: false, fog: false, opacity: 0.6 }));
    this.sunSprite.scale.setScalar(26);
    this.sunSprite.renderOrder = -9;
    this.sunCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTexture('dot'), color: 0xfffbe0, transparent: true, depthWrite: false, fog: false }));
    this.sunCore.scale.setScalar(10);
    this.sunCore.renderOrder = -8;
    g.add(this.sunSprite, this.sunCore);

    this.moon = new THREE.Mesh(new THREE.SphereGeometry(4.2, 28, 20), new THREE.MeshBasicMaterial({ color: 0xf4f1dc, fog: false }));
    const crater = new THREE.MeshBasicMaterial({ color: 0xd8d4bb });
    [
      [-1.2, 1.1, 3.8, 0.9],
      [1.4, -0.6, 3.8, 0.6],
      [0.2, -1.9, 3.8, 0.45],
    ].forEach(([x, y, z, r]) => {
      const c = new THREE.Mesh(new THREE.CircleGeometry(r, 16), crater);
      c.position.set(x, y, z);
      this.moon.add(c);
    });
    this.moon.renderOrder = -8;
    this.moonGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTexture('dot'), color: 0xbfd0ff, transparent: true, depthWrite: false, fog: false, opacity: 0.45 }));
    this.moonGlow.scale.setScalar(24);
    this.moonGlow.renderOrder = -9;
    g.add(this.moon, this.moonGlow);

    // Stars
    const starCount = 420;
    const sp = new Float32Array(starCount * 3);
    const rnd = rand(9);
    for (let i = 0; i < starCount; i++) {
      const u = rnd() * 2 - 1;
      const a = rnd() * Math.PI * 2;
      const r = 100;
      const s = Math.sqrt(1 - u * u);
      sp[i * 3] = Math.cos(a) * s * r;
      sp[i * 3 + 1] = u * r;
      sp[i * 3 + 2] = Math.sin(a) * s * r;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    this.starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 2.4, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false, map: spriteTexture('dot') });
    this.stars = new THREE.Points(sg, this.starMat);
    this.stars.renderOrder = -9;
    g.add(this.stars);

    // Lights
    this.hemi = new THREE.HemisphereLight(0xcfeaff, 0xa9d68a, 1.2);
    g.add(this.hemi);
    this.sunLight = new THREE.DirectionalLight(0xfff0d8, 2.6);
    this.sunLight.position.set(-5, 9, 6.5);
    this.sunLight.target.position.set(0, 0, 0);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    const sc = this.sunLight.shadow.camera;
    sc.left = -9;
    sc.right = 9;
    sc.top = 9;
    sc.bottom = -9;
    sc.near = 1;
    sc.far = 30;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.035;
    this.sunLight.shadow.radius = 4;
    g.add(this.sunLight, this.sunLight.target);
    this.lantern = new THREE.PointLight(0xffc36b, 0, 9, 1.6);
    this.lantern.position.set(-2.6, 1.6, -1.2);
    g.add(this.lantern);

    // Island
    this.groundMat = new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 });
    this.groundMat.map!.repeat.set(3, 3);
    const top = new THREE.Mesh(new THREE.CircleGeometry(ISLAND_RADIUS, 72), this.groundMat);
    top.rotation.x = -Math.PI / 2;
    top.receiveShadow = true;
    g.add(top);
    this.tint(this.groundMat);

    const rimProfile = [
      new THREE.Vector2(ISLAND_RADIUS - 0.01, 0),
      new THREE.Vector2(ISLAND_RADIUS + 0.22, -0.08),
      new THREE.Vector2(ISLAND_RADIUS + 0.34, -0.3),
      new THREE.Vector2(ISLAND_RADIUS + 0.24, -0.5),
    ];
    const rimMat = std(0x7fcb55, 0.9);
    const rim = new THREE.Mesh(new THREE.LatheGeometry(rimProfile, 72), rimMat);
    rim.receiveShadow = true;
    g.add(rim);
    this.tint(rimMat);

    const soilProfile: THREE.Vector2[] = [];
    const rr = rand(3);
    const pts: [number, number][] = [
      [ISLAND_RADIUS + 0.24, -0.5],
      [ISLAND_RADIUS + 0.05, -1.0],
      [6.4, -1.8],
      [5.3, -2.9],
      [4.0, -4.0],
      [2.4, -5.0],
      [0.01, -5.7],
    ];
    pts.forEach(([x, y]) => soilProfile.push(new THREE.Vector2(x, y)));
    const soilGeo = new THREE.LatheGeometry(soilProfile, 40, 0, Math.PI * 2);
    const pos = soilGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const n = (Math.sin(x * 1.7 + y * 2.1) + Math.cos(z * 1.9 - y * 1.3)) * 0.1;
      const k = 1 + n * (y < -0.6 ? 1 : 0);
      pos.setXYZ(i, x * k, y, z * k);
    }
    soilGeo.computeVertexNormals();
    const soilMat = std(0x9a6a45, 0.95);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.castShadow = true;
    g.add(soil);
    this.tint(soilMat);

    const rockMat = std(0x8c7d78, 0.9);
    this.tint(rockMat);
    for (let i = 0; i < 9; i++) {
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.4 + rr() * 0.6, 0), rockMat);
      const a = rr() * Math.PI * 2;
      const rad = 4.2 - rr() * 1.4;
      rock.position.set(Math.cos(a) * rad, -2.2 - rr() * 2.2, Math.sin(a) * rad);
      rock.rotation.set(rr() * 3, rr() * 3, rr() * 3);
      g.add(rock);
    }
    const crystalMat = std(0x9fe3ff, 0.2, { emissive: 0x4fb8ff, emissiveIntensity: 0.5 });
    const crystal = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.3, 6), crystalMat);
    crystal.position.set(0.8, -5.6, 0.4);
    crystal.rotation.x = Math.PI;
    g.add(crystal);

    // Grass blades
    const bladeGeo = new THREE.ConeGeometry(0.045, 0.36, 3, 3, true);
    bladeGeo.translate(0, 0.18, 0);
    this.grassMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, side: THREE.DoubleSide });
    const uTime = this.grassUniform;
    this.grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', 'uniform float uTime;\nvoid main() {')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float sway = sin(uTime * 1.9 + instanceMatrix[3].x * 0.8 + instanceMatrix[3].z * 0.6);
          transformed.x += sway * 0.09 * position.y;
          transformed.z += cos(uTime * 1.5 + instanceMatrix[3].x * 0.5) * 0.05 * position.y;`,
        );
    };
    const bladeCount = 3200;
    const blades = new THREE.InstancedMesh(bladeGeo, this.grassMat, bladeCount);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const scl = new THREE.Vector3();
    const p3 = new THREE.Vector3();
    const col = new THREE.Color();
    const greens = [0x62c24a, 0x7ad35a, 0x54b446, 0x8ee068, 0x6cc84f];
    let placed = 0;
    let guard = 0;
    while (placed < bladeCount && guard < bladeCount * 6) {
      guard++;
      const a = rr() * Math.PI * 2;
      const rad = Math.sqrt(rr()) * (ISLAND_RADIUS - 0.35);
      const x = Math.cos(a) * rad;
      const z = Math.sin(a) * rad;
      if (rad < 3.2 && rr() < 0.72) continue;
      p3.set(x, 0, z);
      e.set((rr() - 0.5) * 0.3, rr() * 6.28, (rr() - 0.5) * 0.3);
      q.setFromEuler(e);
      const s = 0.7 + rr() * 0.9;
      scl.set(s, s * (0.8 + rr() * 0.8), s);
      m4.compose(p3, q, scl);
      blades.setMatrixAt(placed, m4);
      col.set(greens[Math.floor(rr() * greens.length)]);
      blades.setColorAt(placed, col);
      placed++;
    }
    blades.count = placed;
    blades.instanceMatrix.needsUpdate = true;
    if (blades.instanceColor) blades.instanceColor.needsUpdate = true;
    blades.frustumCulled = false;
    g.add(blades);

    // Flowers
    const flowerCount = 70;
    const stemGeo = new THREE.CylinderGeometry(0.014, 0.014, 0.3, 5);
    stemGeo.translate(0, 0.15, 0);
    const stems = new THREE.InstancedMesh(stemGeo, std(0x4aa040, 0.8), flowerCount);
    const headGeo = new THREE.SphereGeometry(0.075, 10, 8);
    const heads = new THREE.InstancedMesh(headGeo, std(0xffffff, 0.6), flowerCount);
    const centers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 8, 6), std(0xffd23f, 0.6), flowerCount);
    const petalCols = [0xff8fb8, 0xfff4fa, 0xffd23f, 0xb99cff, 0xff9a6a];
    for (let i = 0; i < flowerCount; i++) {
      const a = rr() * Math.PI * 2;
      const rad = 1.8 + Math.sqrt(rr()) * (ISLAND_RADIUS - 2.4);
      const h = 0.22 + rr() * 0.2;
      p3.set(Math.cos(a) * rad, 0, Math.sin(a) * rad);
      q.identity();
      scl.set(1, h / 0.3, 1);
      m4.compose(p3, q, scl);
      stems.setMatrixAt(i, m4);
      p3.y = h + 0.02;
      scl.set(1, 0.55, 1);
      m4.compose(p3, q, scl);
      heads.setMatrixAt(i, m4);
      heads.setColorAt(i, col.set(petalCols[i % petalCols.length]));
      p3.y = h + 0.06;
      scl.set(1, 1, 1);
      m4.compose(p3, q, scl);
      centers.setMatrixAt(i, m4);
    }
    g.add(stems, heads, centers);

    this.windowMat = std(0xffe9a8, 0.5, { emissive: 0xffc46b, emissiveIntensity: 0 });
    this.buildProps(rr);
    this.buildClouds(rr);
    this.buildCritters();

    this.lanternGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: spriteTexture('dot'), color: 0xffc36b, transparent: true, depthWrite: false, opacity: 0 }));
    this.lanternGlow.scale.setScalar(2.2);
    this.lanternGlow.position.copy(this.lantern.position);
    g.add(this.lanternGlow);

    // Fireflies
    const ff = 26;
    this.fireflyBase = new Float32Array(ff * 3);
    for (let i = 0; i < ff; i++) {
      const a = rr() * Math.PI * 2;
      const rad = 1.5 + rr() * 5;
      this.fireflyBase[i * 3] = Math.cos(a) * rad;
      this.fireflyBase[i * 3 + 1] = 0.4 + rr() * 2.4;
      this.fireflyBase[i * 3 + 2] = Math.sin(a) * rad * 0.9 - 0.5;
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.fireflyBase), 3));
    this.fireflyMat = new THREE.PointsMaterial({ color: 0xf6ff8a, size: 0.32, transparent: true, opacity: 0, depthWrite: false, map: spriteTexture('dot'), blending: THREE.AdditiveBlending });
    this.fireflies = new THREE.Points(fg, this.fireflyMat);
    this.fireflies.frustumCulled = false;
    g.add(this.fireflies);
  }

  private buildProps(rr: () => number) {
    const g = this.group;
    const trunkMat = std(0x8a5a3a, 0.9);
    const leafMats = [std(0x58bd52, 0.85), std(0x6fcf5b, 0.85), std(0x4aa848, 0.85)];
    this.tint(trunkMat, ...leafMats);
    const tree = (x: number, z: number, s: number) => {
      const t = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 1.5, 10), trunkMat);
      trunk.position.y = 0.75;
      trunk.castShadow = true;
      t.add(trunk);
      const blobs: [number, number, number, number][] = [
        [0, 2.05, 0, 0.95],
        [-0.6, 1.7, 0.2, 0.68],
        [0.6, 1.75, -0.1, 0.72],
        [0.1, 2.7, 0.1, 0.62],
      ];
      blobs.forEach(([bx, by, bz, br], i) => {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(br, 2), leafMats[i % 3]);
        b.position.set(bx, by, bz);
        b.castShadow = true;
        t.add(b);
      });
      t.position.set(x, 0, z);
      t.scale.setScalar(s);
      t.rotation.y = rr() * 6;
      g.add(t);
    };
    tree(-5.2, -3.6, 1.25);
    tree(5.6, -3.2, 1.05);
    tree(-2.6, -5.7, 0.9);
    tree(3.0, -5.4, 1.15);
    tree(-6.2, 0.2, 0.8);

    // Barn
    const barn = new THREE.Group();
    const wallMat = std(0xe0524f, 0.8);
    const trimMat = std(0xfff3e0, 0.8);
    const roofMat = std(0x8c5a44, 0.8);
    this.tint(wallMat, trimMat, roofMat);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.5, 1.9), wallMat);
    body.position.y = 0.75;
    body.castShadow = true;
    body.receiveShadow = true;
    barn.add(body);
    const roofHolder = new THREE.Group();
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.78, 1.05, 4), roofMat);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    roofHolder.add(roof);
    roofHolder.scale.set(1, 1, 0.82);
    roofHolder.position.y = 2.02;
    barn.add(roofHolder);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.05, 0.06), trimMat);
    door.position.set(0, 0.53, 0.96);
    barn.add(door);
    [1, -1].forEach((s) => {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.28, 0.05), wallMat);
      bar.position.set(0, 0.53, 1.0);
      bar.rotation.z = s * 0.7;
      barn.add(bar);
    });
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.06, 0.07), trimMat);
    frame.position.set(0, 1.08, 0.97);
    barn.add(frame);
    barn.position.set(5.1, 0, -1.9);
    barn.rotation.y = -0.55;
    [-0.85, 0.85].forEach((x) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.04), this.windowMat);
      w.position.set(x, 0.95, 0.96);
      barn.add(w);
      const wf = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.03), trimMat);
      wf.position.set(x, 0.95, 0.945);
      barn.add(wf);
    });
    g.add(barn);

    // Hay
    const hayMat = std(0xf1cf6a, 0.95);
    this.tint(hayMat);
    [
      [3.5, 0.3, -3.0],
      [4.0, 0.3, -3.5],
    ].forEach(([x, y, z], i) => {
      const hay = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.6, 18), hayMat);
      hay.rotation.z = Math.PI / 2;
      hay.rotation.y = i * 0.6;
      hay.position.set(x, y + (i ? 0.02 : 0), z);
      hay.castShadow = true;
      g.add(hay);
    });

    // Fence
    const woodMat = std(0xd8a56a, 0.85);
    this.tint(woodMat);
    const fenceR = ISLAND_RADIUS - 0.55;
    const start = Math.PI * 1.08;
    const end = Math.PI * 1.92;
    const n = 15;
    const posts: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) {
      const a = start + ((end - start) * i) / (n - 1);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.75, 0.14), woodMat);
      post.position.set(Math.cos(a) * fenceR, 0.37, Math.sin(a) * fenceR);
      post.rotation.y = -a;
      post.castShadow = true;
      g.add(post);
      posts.push(post.position.clone());
    }
    for (let i = 0; i < n - 1; i++) {
      const a = posts[i];
      const b = posts[i + 1];
      const len = a.distanceTo(b);
      [0.3, 0.58].forEach((y) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.08, 0.07), woodMat);
        rail.position.set((a.x + b.x) / 2, y, (a.z + b.z) / 2);
        rail.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
        rail.castShadow = true;
        g.add(rail);
      });
    }

    // Mushrooms
    const capMat = std(0xff6a6a, 0.6);
    const stemMat = std(0xfff4e0, 0.7);
    this.tint(capMat, stemMat);
    [
      [-3.6, 1.8, 1],
      [-3.35, 2.15, 0.7],
      [3.4, 2.6, 0.85],
    ].forEach(([x, z, s]) => {
      const m = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.2, 10), stemMat);
      stem.position.y = 0.1;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
      cap.position.y = 0.2;
      m.add(stem, cap);
      for (let i = 0; i < 4; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), stemMat);
        const a = i * 1.6;
        d.position.set(Math.cos(a) * 0.09, 0.3 - (i % 2) * 0.03, Math.sin(a) * 0.09);
        m.add(d);
      }
      m.position.set(x, 0, z);
      m.scale.setScalar(s);
      m.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : undefined));
      g.add(m);
    });

    // Lantern post
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 1.4, 8), woodMat);
    post.position.set(-2.6, 0.7, -1.2);
    post.castShadow = true;
    g.add(post);
    const lampBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), std(0xffe6a0, 0.4, { emissive: 0xffc46b, emissiveIntensity: 0.15 }));
    lampBody.position.set(-2.6, 1.5, -1.2);
    g.add(lampBody);
    this.lampMat = lampBody.material as THREE.MeshStandardMaterial;
  }

  private lampMat!: THREE.MeshStandardMaterial;

  private buildClouds(rr: () => number) {
    const puffGeo = new THREE.SphereGeometry(1, 16, 12);
    const specs: [number, number, number, number][] = [
      [-16, 9, -22, 1.5],
      [12, 11, -26, 1.9],
      [-6, 12.5, -32, 1.3],
      [22, 8, -18, 1.2],
      [-24, 5, -14, 1.4],
      [4, -7, -14, 2.0],
      [-12, -9, -10, 1.6],
      [16, -8, -8, 1.7],
    ];
    specs.forEach(([x, y, z, s], idx) => {
      const grp = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xffffff, emissiveIntensity: 0.22 });
      const parts = 4 + Math.floor(rr() * 3);
      for (let i = 0; i < parts; i++) {
        const p = new THREE.Mesh(puffGeo, mat);
        const r = 1 + rr() * 0.9;
        p.scale.set(r * 1.2, r * 0.8, r);
        p.position.set((i - parts / 2) * 1.5 + rr(), rr() * 0.5, rr() * 0.8);
        grp.add(p);
      }
      grp.position.set(x, y, z);
      grp.scale.setScalar(s);
      this.group.add(grp);
      this.clouds.push({ g: grp, speed: 0.12 + (idx % 4) * 0.05, mats: [mat] });
    });
  }

  private buildCritters() {
    const cols = [0xff8fb8, 0xffd23f, 0x8fd8ff];
    cols.forEach((c, i) => {
      const g = new THREE.Group();
      const wm = new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide });
      const wingGeo = new THREE.CircleGeometry(0.11, 8);
      wingGeo.translate(0.11, 0, 0);
      const wl = new THREE.Mesh(wingGeo, wm);
      const wr = new THREE.Mesh(wingGeo, wm);
      wr.scale.x = -1;
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.1, 3, 6), new THREE.MeshBasicMaterial({ color: 0x3b3036 }));
      body.rotation.x = Math.PI / 2;
      g.add(wl, wr, body);
      this.group.add(g);
      this.butterflies.push({ g, wingL: wl, wingR: wr, seed: i * 2.3 + 1 });
    });
  }

  snapSleep(v: number) {
    this.sleepF = v;
  }

  butterflyWorld(i: number, out: THREE.Vector3) {
    return out.copy(this.butterflies[i % this.butterflies.length].g.position);
  }

  get butterflyVisible() {
    return this.nightness < 0.4;
  }

  update(dt: number, sleepTarget: number, cycleMinutes = 12) {
    this.time += dt;
    this.dayT = (this.dayT + dt / (cycleMinutes * 60)) % 1;
    this.sleepF += (sleepTarget - this.sleepF) * Math.min(1, dt * 1.2);
    this.grassUniform.value = this.time;

    const phi = 2 * Math.PI * (this.dayT - 0.25);
    const h = Math.sin(phi);
    let d = 0;
    let s = 0;
    let n = 0;
    if (h > 0) {
      d = smooth(0, 0.42, h);
      s = 1 - d;
    } else {
      n = smooth(0, -0.32, h);
      s = 1 - n;
    }
    n = n + (1 - n) * this.sleepF;
    d *= 1 - this.sleepF;
    s *= 1 - this.sleepF;
    this.nightness = n;

    const P = this.palette;
    lerpPalette(P, [
      [DAY, d],
      [DUSK, s],
      [NIGHT, n],
    ]);

    const u = this.skyMat.uniforms;
    u.top.value.copy(P.skyTop);
    u.mid.value.copy(P.skyMid);
    u.bot.value.copy(P.skyBot);
    this.background.copy(P.skyMid);

    this.hemi.color.copy(P.hemiSky);
    this.hemi.groundColor.copy(P.hemiGround);
    this.hemi.intensity = P.hemiI;
    this.sunLight.color.copy(P.sun);
    this.sunLight.intensity = P.sunI;
    const drift = Math.cos(phi) * 1.6;
    this.sunLight.position.set(-5 + drift, 9, 6.5);

    // Sun and moon positions
    const sunX = -Math.cos(phi) * 20;
    const sunY = Math.sin(phi) * 8.5 - 0.6;
    this.sunSprite.position.set(sunX, sunY, -55);
    this.sunCore.position.set(sunX, sunY, -55);
    const sunVis = (1 - this.sleepF) * smooth(-0.2, 0.05, h);
    (this.sunSprite.material as THREE.SpriteMaterial).opacity = 0.55 * sunVis;
    (this.sunCore.material as THREE.SpriteMaterial).opacity = sunVis;
    (this.sunSprite.material as THREE.SpriteMaterial).color.copy(h < 0.25 ? C(0xffb070) : C(0xfff0b0));

    const moonPhi = phi + Math.PI;
    const mX = this.sleepF > 0.01 ? THREE.MathUtils.lerp(-Math.cos(moonPhi) * 20, 12, this.sleepF) : -Math.cos(moonPhi) * 20;
    const mY = THREE.MathUtils.lerp(Math.sin(moonPhi) * 8.5 - 0.6, 6.5, this.sleepF);
    this.moon.position.set(mX, mY, -56);
    this.moonGlow.position.set(mX, mY, -55);
    const moonVis = Math.max(smooth(-0.1, 0.15, -h), this.sleepF);
    this.moon.visible = moonVis > 0.02;
    (this.moonGlow.material as THREE.SpriteMaterial).opacity = 0.45 * moonVis;
    this.moon.scale.setScalar(0.4 + 0.6 * moonVis);

    this.starMat.opacity = smooth(0.35, 0.9, n) * 0.95;
    this.stars.rotation.z = this.time * 0.002;

    // Clouds
    this.clouds.forEach((c) => {
      c.g.position.x += c.speed * dt;
      if (c.g.position.x > 34) c.g.position.x = -34;
      c.mats[0].color.copy(P.cloud);
      c.mats[0].emissive.copy(P.cloud);
      c.mats[0].emissiveIntensity = 0.16 + 0.1 * (1 - n);
    });

    // Night props
    const glow = smooth(0.3, 0.85, n);
    this.windowMat.emissiveIntensity = glow * 1.4;
    this.lampMat.emissiveIntensity = 0.15 + glow * 1.8;
    this.lantern.intensity = glow * 7;
    (this.lanternGlow.material as THREE.SpriteMaterial).opacity = glow * 0.55;

    // Fireflies
    this.fireflyMat.opacity = glow * 0.95;
    if (glow > 0.01) {
      const pos = this.fireflies.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const b = i * 3;
        pos.setXYZ(
          i,
          this.fireflyBase[b] + Math.sin(this.time * 0.6 + i * 1.7) * 0.9,
          this.fireflyBase[b + 1] + Math.sin(this.time * 0.9 + i * 2.3) * 0.4,
          this.fireflyBase[b + 2] + Math.cos(this.time * 0.5 + i * 1.1) * 0.9,
        );
      }
      pos.needsUpdate = true;
      this.fireflyMat.size = 0.24 + 0.12 * Math.sin(this.time * 3);
    }

    // Butterflies
    const day = 1 - n;
    this.butterflies.forEach((b, i) => {
      const t = this.time * 0.35 + b.seed;
      b.g.visible = day > 0.35;
      const px = Math.sin(t * 1.1 + i) * (3.4 + i * 0.6) + Math.sin(t * 2.3) * 0.5;
      const pz = Math.cos(t * 0.9 + i * 2) * (2.6 + i * 0.5) - 0.6;
      const py = 1.2 + Math.sin(t * 1.7 + i) * 0.5 + Math.sin(t * 5) * 0.06;
      const dx = px - b.g.position.x;
      const dz = pz - b.g.position.z;
      b.g.position.set(px, py, pz);
      if (dx * dx + dz * dz > 1e-8) b.g.rotation.y = Math.atan2(dx, dz);
      const flap = Math.sin(this.time * 22 + b.seed) * 0.9;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    });

    // Grass tint at dusk/night
    this.staticTint.forEach(({ mat, base }) => mat.color.copy(base).multiply(P.grass));
    this.grassMat.color.copy(P.grass);
  }
}
