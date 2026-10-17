
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const $ = (id) => document.getElementById(id);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------------------
// Lamp profile. Scene units: 1 = 10 cm. Lamp stands at the origin on the table (y = 0).
// The same analytic profile is mirrored in GLSL so the raymarched wax respects the glass.
// ---------------------------------------------------------------------------
const G = { thick: 0.034, yInB: 1.30, yLiq: 3.52, ceil: 3.47 };
function rOuter(y) {
  if (y > 3.5) { const u = clamp((y - 3.5) / 0.2, 0, 1); return 0.315 - 0.0385 * u - 0.0665 * u * u * (2 - u); }
  if (y < 1.55) { const u = (1.55 - y) / 0.29; return 0.615 - 0.035 * u * u; }
  return 0.615 - 0.30 * Math.pow((y - 1.55) / 1.95, 1.25);
}
const rInner = (y) => rOuter(clamp(y, G.yInB, G.yLiq)) - G.thick;

// ---------------------------------------------------------------------------
// Renderer / scene / camera
// ---------------------------------------------------------------------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  if (!renderer.capabilities.isWebGL2) throw new Error('webgl2');
} catch (e) {
  $('err').style.display = 'flex'; $('panel').style.display = 'none';
  throw e;
}
const Q = { max: Math.min(window.devicePixelRatio || 1, 1.5), min: 0.6, t: 0, n: 0, good: 0, warm: 0 };
Q.pr = Q.max;
renderer.setPixelRatio(Q.pr);
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.shadowMap.autoUpdate = false;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020101);
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 90);
camera.position.set(5.6, 3.9, 8.3);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 2.15, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 3.4;
controls.maxDistance = 15;
controls.minPolarAngle = 0.12;
controls.maxPolarAngle = 1.66;
controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.8;
controls.autoRotateSpeed = 0.45;
controls.update();

// ---------------------------------------------------------------------------
// Procedural noise + textures (no external files)
// ---------------------------------------------------------------------------
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rnd = mulberry(7331);
const NZ = new Float32Array(65536);
for (let i = 0; i < 65536; i++) NZ[i] = rnd();
function vnoise(x, y, per = 256) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const x0 = ((xi % per) + per) % per, y0 = ((yi % per) + per) % per, x1 = (x0 + 1) % per, y1 = (y0 + 1) % per;
  const a = NZ[(y0 << 8) | x0], b = NZ[(y0 << 8) | x1], c = NZ[(y1 << 8) | x0], d = NZ[(y1 << 8) | x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y, oct = 4, per = 256) {
  let s = 0, a = 0.5, f = 1, p = per;
  for (let i = 0; i < oct; i++) { s += a * vnoise(x * f, y * f, p); f *= 2; p = Math.min(256, p * 2); a *= 0.5; }
  return s / (1 - Math.pow(0.5, oct));
}
function canvasTex(w, h, fn, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(w, h); const d = img.data; const o = [0, 0, 0];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    fn(x, y, o); const i = (y * w + x) * 4;
    d[i] = o[0]; d[i + 1] = o[1]; d[i + 2] = o[2]; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return t;
}

function makeWood() {
  const W = 1024, H = 512, planks = 5, ph = H / planks;
  const g = new Float32Array(W * H), tone = new Float32Array(planks), seam = new Uint8Array(W * H);
  for (let k = 0; k < planks; k++) tone[k] = 0.82 + 0.3 * NZ[(k * 977) & 65535];
  for (let y = 0; y < H; y++) {
    const pk = Math.floor(y / ph), py = (y - pk * ph) / ph, off = pk * 17.3;
    const joint = (pk * 331 + 260) % W;
    for (let x = 0; x < W; x++) {
      const i = y * W + x, xs = x / W;
      const w = fbm(xs * 4 + off, py * 1.6 + off, 4);
      const r = Math.abs(py - 0.5 + (w - 0.5) * 0.5) * 9 + xs * 1.4 + w * 3.2;
      const f = r - Math.floor(r);
      const ring = Math.pow(Math.sin(f * Math.PI), 8);
      const streak = 0.6 * vnoise(xs * 14 + off, y * 0.5) + 0.4 * vnoise(xs * 70 + off, y * 1.9);
      g[i] = clamp(0.62 - 0.42 * ring + 0.38 * (streak - 0.5), 0, 1);
      seam[i] = (py < 0.007 || py > 0.993 || Math.abs(x - joint) < 1.2) ? 1 : 0;
    }
  }
  const map = canvasTex(W, H, (x, y, o) => {
    const i = y * W + x, t = tone[Math.floor(y / ph)] * (seam[i] ? 0.32 : 1), v = g[i];
    o[0] = (40 + 82 * v) * t; o[1] = (23 + 48 * v) * t; o[2] = (13 + 25 * v) * t;
  });
  const rough = canvasTex(W, H, (x, y, o) => {
    const i = y * W + x; o[0] = o[1] = o[2] = seam[i] ? 240 : 120 + (1 - g[i]) * 70;
  }, false);
  return { map, rough };
}

function makePlaster() {
  const S = 512;
  const map = canvasTex(S, S, (x, y, o) => {
    const m = fbm(x / 64, y / 64, 4, 8), f = vnoise(x * 0.5, y * 0.5);
    const v = 0.8 + 0.26 * m + 0.05 * f;
    o[0] = 128 * v; o[1] = 117 * v; o[2] = 104 * v;
  });
  const bump = canvasTex(S, S, (x, y, o) => {
    o[0] = o[1] = o[2] = 128 + 90 * (fbm(x / 8, y / 8, 3, 64) - 0.5) + 40 * (vnoise(x, y) - 0.5);
  }, false);
  map.repeat.set(3, 3); bump.repeat.set(3, 3);
  return { map, bump };
}

function makeBrushed() {
  const t = canvasTex(8, 1024, (x, y, o) => {
    const v = 0.55 + 0.25 * vnoise(0.5, y * 0.35) + 0.2 * NZ[(y * 13) & 65535];
    o[0] = o[1] = o[2] = 26 + 40 * v;
  }, false);
  return t;
}

function makePrint() {
  const c = document.createElement('canvas'); c.width = 384; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#e6dcc8'; g.fillRect(0, 0, 384, 512);
  g.fillStyle = '#b9472f'; g.beginPath(); g.arc(178, 190, 112, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#1f3446'; g.fillRect(52, 300, 270, 150);
  g.fillStyle = '#d7a03c'; g.beginPath(); g.arc(282, 318, 64, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#2a2420'; g.lineWidth = 5; g.beginPath(); g.moveTo(40, 470); g.lineTo(344, 470); g.stroke();
  const img = g.getImageData(0, 0, 384, 512), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (NZ[(i >> 2) & 65535] - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------------------------------------------------------------------------
// Environment generated in code: a dark studio with a few soft panels.
// ---------------------------------------------------------------------------
const pmrem = new THREE.PMREMGenerator(renderer);
function buildEnv() {
  const s = new THREE.Scene();
  s.add(new THREE.Mesh(new THREE.BoxGeometry(40, 26, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.010, 0.008, 0.007), side: THREE.BackSide })));
  const panel = (w, h, c, k, x, y, z) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(c[0], c[1], c[2]).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); s.add(m);
  };
  panel(8, 12, [0.72, 0.8, 1.0], 1.5, -15, 4, 8);
  panel(2.6, 15, [1.0, 0.9, 0.78], 1.3, 14, 2, -7);
  panel(14, 4, [1.0, 0.72, 0.45], 0.35, 0, 12, 0);
  panel(34, 7, [0.32, 0.17, 0.08], 0.45, 0, -11, 0);
  panel(3.5, 5, [1.0, 0.55, 0.25], 1.0, 7, 1, 15);
  const tex = pmrem.fromScene(s, 0.03).texture;
  s.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}
scene.environment = buildEnv();

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------
const roomMats = [];
const track = (m, env) => { m.userData.env = env; roomMats.push(m); return m; };
const plaster = makePlaster();
const wallMat = track(new THREE.MeshStandardMaterial({ map: plaster.map, bumpMap: plaster.bump, bumpScale: 0.35, roughness: 0.93 }), 0.32);
const R = { x0: -11, x1: 11, z0: -4.62, z1: 13, y0: -7.6, y1: 9.5 };
function plane(w, h, mat, pos, rot) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(pos[0], pos[1], pos[2]); m.rotation.set(rot[0], rot[1], rot[2]);
  m.receiveShadow = true; scene.add(m); return m;
}
const RW = R.x1 - R.x0, RD = R.z1 - R.z0, RH = R.y1 - R.y0, RCZ = (R.z0 + R.z1) / 2, RCY = (R.y0 + R.y1) / 2;
plane(RW, RH, wallMat, [0, RCY, R.z0], [0, 0, 0]);
plane(RW, RH, wallMat, [0, RCY, R.z1], [0, Math.PI, 0]);
plane(RD, RH, wallMat, [R.x0, RCY, RCZ], [0, Math.PI / 2, 0]);
plane(RD, RH, wallMat, [R.x1, RCY, RCZ], [0, -Math.PI / 2, 0]);
plane(RW, RD, track(new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.96 }), 0.25), [0, R.y0, RCZ], [-Math.PI / 2, 0, 0]);
plane(RW, RD, track(new THREE.MeshStandardMaterial({ color: 0x3a3632, roughness: 1 }), 0.25), [0, R.y1, RCZ], [Math.PI / 2, 0, 0]);
const skirting = new THREE.Mesh(new THREE.BoxGeometry(RW, 0.9, 0.12), track(new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.6 }), 0.3));
skirting.position.set(0, R.y0 + 0.45, R.z0 + 0.06); skirting.receiveShadow = true; scene.add(skirting);

// Table: oiled walnut top
const wood = makeWood();
const tableMat = track(new THREE.MeshPhysicalMaterial({ map: wood.map, roughnessMap: wood.rough, roughness: 1, clearcoat: 0.4, clearcoatRoughness: 0.22 }), 0.3);
const tableTop = new THREE.Mesh(new RoundedBoxGeometry(12.5, 0.36, 7.1, 3, 0.05), tableMat);
tableTop.position.set(0, -0.18, -0.95); tableTop.receiveShadow = true; tableTop.castShadow = true; scene.add(tableTop);
const legMat = track(new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: 0.55 }), 0.3);
for (const [x, z] of [[-5.7, -4.1], [5.7, -4.1], [-5.7, 2.2], [5.7, 2.2]]) {
  const leg = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7.24, 0.5), legMat);
  leg.position.set(x, -0.36 - 3.62, z); leg.castShadow = leg.receiveShadow = true; scene.add(leg);
}

// Props: a stack of books with a brass orb, a ceramic mug, a snake plant, a framed print
function book(w, h, d, color) {
  const g = new THREE.Group();
  const cover = track(new THREE.MeshStandardMaterial({ color, roughness: 0.72 }), 0.35);
  const pages = track(new THREE.MeshStandardMaterial({ color: 0xd8ccb4, roughness: 0.95 }), 0.35);
  const ct = 0.035;
  const b1 = new THREE.Mesh(new RoundedBoxGeometry(w, ct, d, 2, 0.012), cover); b1.position.y = ct / 2;
  const b2 = b1.clone(); b2.position.y = h - ct / 2;
  const sp = new THREE.Mesh(new RoundedBoxGeometry(ct * 1.5, h, d, 2, 0.016), cover); sp.position.set(-w / 2 + ct * 0.75, h / 2, 0);
  const pg = new THREE.Mesh(new THREE.BoxGeometry(w - 0.07, h - 2 * ct + 0.004, d - 0.07), pages); pg.position.set(0.01, h / 2, 0);
  for (const m of [b1, b2, sp, pg]) { m.castShadow = m.receiveShadow = true; g.add(m); }
  return g;
}
const books = new THREE.Group();
const bk = [[2.7, 0.36, 1.95, 0x1c2836, 0], [2.4, 0.3, 1.75, 0x8a6726, 0.16], [2.1, 0.26, 1.55, 0x5a1d1a, -0.09]];
let by = 0;
for (const [w, h, d, c, r] of bk) { const b = book(w, h, d, c); b.position.y = by; b.rotation.y = r; books.add(b); by += h; }
const orb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 48, 32), new THREE.MeshStandardMaterial({ color: 0xc9a05a, metalness: 1, roughness: 0.22 }));
orb.position.set(0.25, by + 0.3, 0.1); orb.castShadow = orb.receiveShadow = true; books.add(orb);
books.position.set(-3.1, 0, -1.9); books.rotation.y = 0.38; scene.add(books);

const mug = new THREE.Group();
const mugPts = [[0, 0], [0.34, 0], [0.4, 0.025], [0.42, 0.1], [0.43, 0.88], [0.428, 0.94], [0.41, 0.958], [0.392, 0.945], [0.382, 0.14], [0.3, 0.115], [0, 0.11]].map(([x, y]) => new THREE.Vector2(x, y));
const mugMat = track(new THREE.MeshPhysicalMaterial({ color: 0xd9d0c3, roughness: 0.38, clearcoat: 0.7, clearcoatRoughness: 0.12 }), 0.45);
const mugBody = new THREE.Mesh(new THREE.LatheGeometry(mugPts, 64), mugMat);
const handle = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.055, 14, 36, Math.PI), mugMat);
handle.rotation.z = -Math.PI / 2; handle.position.set(0.42, 0.5, 0);
for (const m of [mugBody, handle]) { m.castShadow = m.receiveShadow = true; mug.add(m); }
mug.position.set(2.55, 0, 1.05); mug.rotation.y = -0.7; scene.add(mug);

const plant = new THREE.Group();
const potPts = [[0, 0], [0.44, 0], [0.48, 0.04], [0.57, 0.95], [0.61, 0.99], [0.61, 1.05], [0.56, 1.05], [0.52, 0.97], [0, 0.95]].map(([x, y]) => new THREE.Vector2(x, y));
const pot = new THREE.Mesh(new THREE.LatheGeometry(potPts, 48), track(new THREE.MeshStandardMaterial({ color: 0x9a5a3c, roughness: 0.9 }), 0.35));
pot.castShadow = pot.receiveShadow = true; plant.add(pot);
const soil = new THREE.Mesh(new THREE.CircleGeometry(0.53, 32), new THREE.MeshStandardMaterial({ color: 0x1d140d, roughness: 1 }));
soil.rotation.x = -Math.PI / 2; soil.position.y = 0.97; plant.add(soil);
const leafGeo = new THREE.SphereGeometry(1, 14, 28);
for (let i = 0; i < 9; i++) {
  const hgt = 1.2 + rnd() * 1.4, a = (i / 9) * Math.PI * 2 + rnd() * 0.5;
  const leaf = new THREE.Mesh(leafGeo, track(new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.27 + rnd() * 0.04, 0.38, 0.12 + rnd() * 0.06), roughness: 0.5 }), 0.4));
  leaf.scale.set(0.045, hgt, 0.17 + rnd() * 0.06);
  const tilt = 0.08 + rnd() * 0.22, rr = 0.06 + rnd() * 0.2;
  leaf.position.set(Math.cos(a) * rr, 0.85 + hgt * 0.92, Math.sin(a) * rr);
  leaf.rotation.set(Math.sin(a) * tilt, -a + rnd(), -Math.cos(a) * tilt, 'YXZ');
  leaf.castShadow = leaf.receiveShadow = true; plant.add(leaf);
}
plant.position.set(-5.0, 0, -3.4); scene.add(plant);

const picture = new THREE.Group();
const frameBox = new THREE.Mesh(new RoundedBoxGeometry(3.0, 3.8, 0.12, 2, 0.02), track(new THREE.MeshStandardMaterial({ color: 0x141110, roughness: 0.5 }), 0.4));
const matte = new THREE.Mesh(new THREE.PlaneGeometry(2.62, 3.42), track(new THREE.MeshStandardMaterial({ color: 0xe4dccd, roughness: 0.95 }), 0.35));
matte.position.z = 0.061;
const print = new THREE.Mesh(new THREE.PlaneGeometry(1.86, 2.48), track(new THREE.MeshStandardMaterial({ map: makePrint(), roughness: 0.85 }), 0.35));
print.position.set(0, 0.08, 0.063);
for (const m of [frameBox, matte, print]) { m.castShadow = m.receiveShadow = true; picture.add(m); }
picture.position.set(-2.7, 4.7, R.z0 + 0.065); scene.add(picture);

// ---------------------------------------------------------------------------
// Lamp: brushed aluminium base and cap (lathe profiles), glass, cord with switch
// ---------------------------------------------------------------------------
const lamp = new THREE.Group(); scene.add(lamp);
function lathePts(list, step = 0.06) {
  // Densify long segments so lathe normal smoothing stays local; repeated points give hard edges.
  const out = [];
  for (let i = 0; i < list.length; i++) {
    const [x, y] = list[i];
    if (i > 0) {
      const [px, py] = list[i - 1], len = Math.hypot(x - px, y - py), n = Math.floor(len / step);
      for (let k = 1; k < n; k++) out.push(new THREE.Vector2(lerp(px, x, k / n), lerp(py, y, k / n)));
    }
    out.push(new THREE.Vector2(x, y));
  }
  return out;
}
const brushed = makeBrushed();
const metalMat = new THREE.MeshStandardMaterial({ color: 0xd4d0cb, metalness: 1, roughness: 1, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.15, envMapIntensity: 1.0 });
// The glowing glass is a large source sitting right next to the metal: a point light would leave a
// pin-sharp, blown highlight, so its direct specular is damped and replaced by a broad lobe aimed at the glass.
const glowU = { value: new THREE.Color(0, 0, 0) };
metalMat.onBeforeCompile = (sh) => {
  sh.uniforms.uGlowCol = glowU;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
    .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);');
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <common>', '#include <common>\nuniform vec3 uGlowCol;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
    .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      reflectedLight.directSpecular *= 0.1;
      {
        vec3 Vw = normalize(cameraPosition - vWPos);
        vec3 Rw = reflect(-Vw, normalize(vWNrm));
        vec3 Gd = normalize(vec3(0.0, 2.3, 0.0) - vWPos);
        float g = pow(max(dot(Rw, Gd), 0.0), 6.0);
        reflectedLight.indirectSpecular += uGlowCol * g * material.specularColor;
      }`);
};
const basePts = lathePts([
  [0, 0], [0.93, 0], [0.93, 0], [0.985, 0.012], [1.006, 0.04], [1.006, 0.078], [0.99, 0.102], [0.99, 0.102],
  [0.975, 0.13], [0.962, 0.142], [0.972, 0.156], [0.972, 0.156],
  [0.655, 1.33], [0.655, 1.33], [0.668, 1.35], [0.668, 1.386], [0.654, 1.404], [0.632, 1.409], [0.632, 1.409], [0.61, 1.392], [0, 1.392]
]);
const base = new THREE.Mesh(new THREE.LatheGeometry(basePts, 128), metalMat);
base.castShadow = true; base.receiveShadow = true; lamp.add(base);
const capPts = lathePts([
  [0.371, 3.668], [0.25, 4.05], [0.244, 4.074], [0.229, 4.093], [0.2, 4.104], [0.12, 4.111], [0, 4.113]
], 0.05);
const cap = new THREE.Mesh(new THREE.LatheGeometry(capPts, 128), metalMat);
cap.castShadow = true; cap.receiveShadow = true; lamp.add(cap);
const capUnder = new THREE.Mesh(new THREE.LatheGeometry(lathePts([[0, 3.70], [0.30, 3.70], [0.336, 3.66], [0.354, 3.644], [0.367, 3.65], [0.371, 3.668]], 0.05), 128),
  new THREE.MeshStandardMaterial({ color: 0x0b0a09, roughness: 0.85, metalness: 0.2 }));
capUnder.castShadow = true; lamp.add(capUnder);

// Glass outer shell profile (sealed rounded bottom, tapered body, shoulder, neck hidden under cap)
const glassPts = [[0, 1.236], [0.46, 1.237], [0.535, 1.248], [0.568, 1.27], [0.585, 1.3]].map(([x, y]) => new THREE.Vector2(x, y));
for (let y = 1.32; y <= 3.7001; y += 0.03) glassPts.push(new THREE.Vector2(rOuter(y), y));
for (const [x, y] of [[0.208, 3.76], [0.204, 3.82], [0.17, 3.86], [0.08, 3.876], [0, 3.88]]) glassPts.push(new THREE.Vector2(x, y));
const glassGeo = new THREE.LatheGeometry(glassPts, 128);

// Liquid volume proxy: the inner surface of the glass, closed by the bottom and the liquid surface
const liqPts = [];
const LN = 70;
for (let i = 0; i <= LN; i++) { const y = lerp(G.yInB, G.yLiq, i / LN); liqPts.push(new THREE.Vector2(rInner(y), y)); }
const liqSideGeo = new THREE.LatheGeometry(liqPts, 128);
const liqBotGeo = new THREE.CircleGeometry(rInner(G.yInB), 128); liqBotGeo.rotateX(Math.PI / 2); liqBotGeo.translate(0, G.yInB, 0);
const liqTopGeo = new THREE.CircleGeometry(rInner(G.yLiq), 128); liqTopGeo.rotateX(-Math.PI / 2); liqTopGeo.translate(0, G.yLiq, 0);

// Power cord running off the back of the table, with an inline rocker switch
const cordCurve = new THREE.CatmullRomCurve3([
  V3(0.3, 0.06, -0.86), V3(0.5, 0.029, -1.28), V3(1.05, 0.029, -1.72), V3(1.75, 0.029, -1.98), V3(2.45, 0.029, -2.2),
  V3(3.05, 0.029, -2.75), V3(3.15, 0.029, -3.55), V3(2.88, 0.029, -4.22), V3(2.72, -0.03, -4.53), V3(2.66, -0.5, -4.575), V3(2.6, -3.5, -4.575)
], false, 'catmullrom', 0.4);
const cordMat = new THREE.MeshStandardMaterial({ color: 0x0e0d0c, roughness: 0.42 });
const cord = new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 360, 0.027, 10, false), cordMat);
cord.castShadow = cord.receiveShadow = true; scene.add(cord);

const sw = new THREE.Group();
const swU = 0.2, swP = cordCurve.getPointAt(swU), swT = cordCurve.getTangentAt(swU);
sw.position.set(swP.x, 0, swP.z); sw.rotation.y = Math.atan2(swT.x, swT.z);
const plastic = new THREE.MeshPhysicalMaterial({ color: 0x0c0b0b, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3 });
const swBody = new THREE.Mesh(new RoundedBoxGeometry(0.21, 0.12, 0.48, 3, 0.045), plastic);
swBody.position.y = 0.06;
const rocker = new THREE.Mesh(new RoundedBoxGeometry(0.12, 0.05, 0.17, 2, 0.02), new THREE.MeshStandardMaterial({ color: 0x1e1c1b, roughness: 0.5 }));
rocker.position.set(0, 0.125, -0.03);
const ledMat = new THREE.MeshStandardMaterial({ color: 0x220800, emissive: 0xff5a10, emissiveIntensity: 3 });
const led = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), ledMat);
led.position.set(0, 0.121, 0.15);
for (const m of [swBody, rocker, led]) { m.castShadow = true; m.receiveShadow = true; sw.add(m); }
scene.add(sw);
const switchMeshes = [swBody, rocker, led];

// ---------------------------------------------------------------------------
// Lights. The lamp is the key light; the "room" is a faint moonlit window plus bounce.
// ---------------------------------------------------------------------------
const lampLight = new THREE.PointLight(0xffa060, 80, 0, 2);
lampLight.position.set(0, 2.2, 0);
lampLight.castShadow = true;
lampLight.shadow.mapSize.set(1024, 1024);
lampLight.shadow.radius = 6;
lampLight.shadow.bias = -0.002;
lampLight.shadow.normalBias = 0.03;
lampLight.shadow.camera.near = 0.3;
lampLight.shadow.camera.far = 40;
scene.add(lampLight);
const fillLight = new THREE.PointLight(0xff5020, 25, 0, 2);
fillLight.position.set(0, 1.75, 0); scene.add(fillLight);
const moon = new THREE.DirectionalLight(0x9db2e2, 0.6);
moon.position.set(-9, 11, 7); moon.target.position.set(0, 0, -1);
moon.castShadow = true; moon.shadow.mapSize.set(1024, 1024); moon.shadow.radius = 4; moon.shadow.bias = -0.0006; moon.shadow.normalBias = 0.02;
Object.assign(moon.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
scene.add(moon, moon.target);
const hemi = new THREE.HemisphereLight(0x58627a, 0x1c130c, 0.3); scene.add(hemi);
renderer.shadowMap.needsUpdate = true;

// ---------------------------------------------------------------------------
// Wax + liquid: raymarched signed distance field inside the glass volume
// ---------------------------------------------------------------------------
const NB = 12;
const FX_LAYER = 1;
const GLSL_PROFILE = /* glsl */`
float rOuter(float y){
  if (y > 3.5){ float u = clamp((y - 3.5) / 0.2, 0.0, 1.0); return 0.315 - 0.0385 * u - 0.0665 * u * u * (2.0 - u); }
  if (y < 1.55){ float u = (1.55 - y) / 0.29; return 0.615 - 0.035 * u * u; }
  return 0.615 - 0.30 * pow((y - 1.55) / 1.95, 1.25);
}
float rInner(float y){ return rOuter(y) - ${G.thick.toFixed(3)}; }
`;
const fxU = {
  uCam: { value: new THREE.Vector3() },
  uVP: { value: new THREE.Matrix4() },
  uBg: { value: null },
  uB: { value: Array.from({ length: NB }, () => new THREE.Vector4()) },
  uBx: { value: Array.from({ length: NB }, () => new THREE.Vector4(1, 0, 0, 0)) },
  uPool: { value: new THREE.Vector4(1.55, 0.05, 1, 0) },
  uWax: { value: new THREE.Color() },
  uWaxHot: { value: new THREE.Color() },
  uLiq: { value: new THREE.Color() },
  uLiqAbs: { value: new THREE.Vector3() },
  uLight: { value: 1 },
  uRoom: { value: 0.3 },
  uTime: { value: 0 },
  uSteps: { value: 64 },
};
const liquidMat = new THREE.ShaderMaterial({
  uniforms: fxU,
  transparent: true,
  vertexShader: /* glsl */`
    varying vec3 vPos; varying vec3 vNrm;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vPos = wp.xyz; vNrm = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    precision highp float;
    precision highp int;
    #define NB ${NB}
    uniform vec3 uCam; uniform mat4 uVP; uniform sampler2D uBg;
    uniform vec4 uB[NB]; uniform vec4 uBx[NB]; uniform vec4 uPool;
    uniform vec3 uWax; uniform vec3 uWaxHot; uniform vec3 uLiq; uniform vec3 uLiqAbs;
    uniform float uLight; uniform float uRoom; uniform float uTime; uniform int uSteps;
    varying vec3 vPos; varying vec3 vNrm;
    ${GLSL_PROFILE}
    const float Y_INB = ${G.yInB.toFixed(3)};
    const float Y_LIQ = ${G.yLiq.toFixed(3)};
    const vec3 BULB = vec3(0.0, 0.95, 0.0);
    int ids[NB]; int nIds;

    float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.0) / k; return min(a, b) - h * h * h * k * (1.0 / 6.0); }
    float sdEll(vec3 p, vec3 r){ float k0 = length(p / r); float k1 = length(p / (r * r)); return k0 * (k0 - 1.0) / max(k1, 1e-4); }
    float sdCont(vec3 p){
      float y = clamp(p.y, Y_INB, Y_LIQ);
      float dr = (length(p.xz) - rInner(y)) * 0.96;
      return max(dr, max(Y_INB - p.y, p.y - Y_LIQ));
    }
    float mapWax(vec3 p){
      float rr = dot(p.xz, p.xz);
      float top = uPool.x + uPool.y * (1.0 - rr * 3.1)
                + 0.016 * sin(p.x * 7.0 + uTime * 0.37) * sin(p.z * 6.0 - uTime * 0.29);
      float d = (p.y - top) * 0.8;
      for (int k = 0; k < NB; k++){
        if (k >= nIds) break;
        int i = ids[k];
        vec4 b = uB[i]; vec4 x = uBx[i];
        vec3 q = p - b.xyz;
        float s = x.x, is = inversesqrt(s);
        float e = sdEll(q, vec3(b.w * is, b.w * s, b.w * is));
        if (e < 0.1) e += sin(q.y * 11.0 + x.y) * sin(q.x * 9.0 - x.y * 1.3) * sin(q.z * 10.0 + x.y * 0.7) * b.w * 0.06;
        d = smin(d, e, 0.14);
      }
      return max(d, sdCont(p) + 0.012);
    }
    // temperature at a surface point, blended from the pool and nearby blobs
    float waxTemp(vec3 p){
      float dp = max(p.y - uPool.x, 0.0);
      float ws = 1.0 / (1.0 + dp * dp * 300.0), ts = ws * uPool.z;
      for (int k = 0; k < NB; k++){
        if (k >= nIds) break;
        int i = ids[k];
        vec4 b = uB[i]; vec4 x = uBx[i];
        float is = inversesqrt(x.x);
        float e = max(sdEll(p - b.xyz, vec3(b.w * is, b.w * x.x, b.w * is)), 0.0);
        float w = 1.0 / (1.0 + e * e * 300.0);
        ws += w; ts += w * x.z;
      }
      return ts / max(ws, 1e-4);
    }
    vec3 nWax(vec3 p){
      const vec2 k = vec2(1.0, -1.0); const float e = 0.002;
      return normalize(k.xyy * mapWax(p + k.xyy * e) + k.yyx * mapWax(p + k.yyx * e) + k.yxy * mapWax(p + k.yxy * e) + k.xxx * mapWax(p + k.xxx * e));
    }
    vec3 nCont(vec3 p){
      const vec2 k = vec2(1.0, -1.0); const float e = 0.003;
      return normalize(k.xyy * sdCont(p + k.xyy * e) + k.yyx * sdCont(p + k.yyx * e) + k.yxy * sdCont(p + k.yxy * e) + k.xxx * sdCont(p + k.xxx * e));
    }
    // light scattered by the hazy liquid: strong low in the glass right above the bulb
    vec3 liqLight(vec3 p){
      float h = max(p.y - Y_INB, 0.0); float rr = dot(p.xz, p.xz);
      float I = uLight * (0.15 + 0.8 * exp(-h * 1.4)) * (1.0 - 0.5 * rr / 0.33);
      return uLiq * (I + uRoom * 0.04 + 0.003);
    }
    vec3 sampleBg(vec3 wp){
      vec4 c = uVP * vec4(wp, 1.0);
      vec2 uv = c.xy / max(c.w, 1e-3) * 0.5 + 0.5;
      return texture2D(uBg, clamp(uv, 0.002, 0.998)).rgb;
    }

    void main(){
      vec3 V0 = normalize(vPos - uCam);
      vec3 n0 = normalize(vNrm);
      if (dot(n0, V0) > 0.0) n0 = -n0;
      vec3 rd = refract(V0, n0, 1.0 / 1.36);
      if (dot(rd, rd) < 0.5) rd = V0;
      vec3 ro = vPos;

      // far exit point of the liquid volume: start outside on the far side, trace back
      float a = dot(rd.xz, rd.xz), b = dot(ro.xz, rd.xz), c = dot(ro.xz, ro.xz) - 0.4096;
      float tf = 3.0;
      if (a > 1e-6) tf = (-b + sqrt(max(b * b - a * c, 0.0))) / a;
      if (rd.y > 1e-4) tf = min(tf, (Y_LIQ - ro.y) / rd.y);
      else if (rd.y < -1e-4) tf = min(tf, (Y_INB - ro.y) / rd.y);
      float te = max(tf, 0.0);
      for (int i = 0; i < 16; i++){ float d = sdCont(ro + rd * te); if (d < 0.001) break; te -= d; }
      te = max(te, 0.0);

      // cull blobs whose influence sphere misses this ray
      nIds = 0;
      for (int i = 0; i < NB; i++){
        vec4 bb = uB[i];
        if (bb.w < 0.004) continue;
        float s = uBx[i].x; float br = bb.w * max(s, inversesqrt(s)) + 0.16;
        vec3 oc = bb.xyz - ro; float tca = dot(oc, rd); float d2 = dot(oc, oc) - tca * tca;
        if (d2 < br * br && tca > -br && tca < te + br){ ids[nIds] = i; nIds++; }
      }

      float t = 0.0; bool hit = false; vec3 scat = vec3(0.0);
      for (int i = 0; i < 96; i++){
        if (i >= uSteps) break;
        vec3 p = ro + rd * t;
        float d = mapWax(p);
        if (d < 0.0012 + 0.0015 * t){ hit = true; break; }
        float dt = max(d * 0.9, 0.008);
        scat += liqLight(p) * exp(-uLiqAbs * t) * max(min(dt, te - t), 0.0);
        t += dt;
        if (t >= te) break;
      }
      if (!hit && t < te) scat += liqLight(ro + rd * t) * exp(-uLiqAbs * t) * (te - t);
      t = min(t, te);

      vec3 col;
      if (hit){
        vec3 p = ro + rd * t;
        vec3 n = nWax(p);
        vec3 V = -rd;
        vec3 L = normalize(BULB - p);
        float h = max(p.y - Y_INB, 0.0);
        float Ib = uLight * (0.22 + 1.15 * exp(-h * 1.8));
        float Tl = clamp(waxTemp(p), 0.0, 1.2);
        // thickness probe along the inward normal: thin necks/droplets transmit more light
        float th = (0.05 + mapWax(p - n * 0.05)) + (0.11 + mapWax(p - n * 0.11)) + (0.2 + mapWax(p - n * 0.2));
        float thin = clamp(th * 2.4, 0.0, 1.0);
        float lit = clamp(dot(n, L) * 0.5 + 0.5, 0.0, 1.0);
        float back = pow(clamp(dot(V, -normalize(L + n * 0.5)), 0.0, 1.0), 3.0);
        vec3 deep = uWax * uWax * 0.28;
        vec3 body = mix(deep, uWax, pow(lit, 1.6));
        vec3 glow = uWaxHot * (0.08 + 0.85 * thin + 0.5 * back + 0.4 * exp(-h * 3.0));
        col = (body * (0.6 + 0.4 * Tl) + glow * (0.25 + 0.75 * Tl)) * Ib;
        vec3 Rf = reflect(rd, n);
        col += uWaxHot * pow(max(dot(Rf, L), 0.0), 16.0) * Ib * 0.25;
        float rim = pow(1.0 - clamp(dot(n, V), 0.0, 1.0), 3.0);
        col = mix(col, col * 0.55 + uWaxHot * thin * Ib * 0.25, rim);
        col += uWax * (uRoom * 0.06 + 0.005);
        col += vec3(0.85, 0.92, 1.0) * pow(max(dot(Rf, normalize(vec3(-0.6, 0.45, 0.55))), 0.0), 50.0) * (0.04 + uRoom * 0.3);
        col *= exp(-uLiqAbs * t);
      } else {
        vec3 pe = ro + rd * te;
        vec3 ne = nCont(pe);
        vec3 rd2 = refract(rd, -ne, 1.36);
        if (dot(rd2, rd2) < 0.5) rd2 = reflect(rd, -ne);
        col = sampleBg(pe + rd2 * 2.5) * exp(-uLiqAbs * te);
      }
      col += scat * 0.95;
      float F = 0.03 + 0.97 * pow(1.0 - abs(dot(V0, n0)), 5.0);
      col *= (1.0 - F);
      gl_FragColor = vec4(col, 1.0);
    }`,
});

// Glass wall seen edge-on (rim + shoulder above the liquid): refracted background + light piping
const rimMat = new THREE.ShaderMaterial({
  uniforms: { uBg: fxU.uBg, uRes: { value: new THREE.Vector2(1, 1) }, uGlow: fxU.uLiq, uLight: fxU.uLight },
  transparent: true, depthWrite: false,
  vertexShader: /* glsl */`
    varying vec3 vVN; varying float vY;
    void main(){
      vVN = normalize(normalMatrix * normal); vY = position.y;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D uBg; uniform vec2 uRes; uniform vec3 uGlow; uniform float uLight;
    varying vec3 vVN; varying float vY;
    void main(){
      vec2 uv = gl_FragCoord.xy / uRes;
      vec3 n = normalize(vVN);
      float ndv = abs(n.z);
      vec3 bg = texture2D(uBg, clamp(uv - n.xy * (1.0 - ndv) * 0.05, 0.002, 0.998)).rgb;
      float F = 0.04 + 0.96 * pow(1.0 - ndv, 5.0);
      vec3 col = bg * vec3(0.93, 0.96, 0.95) * (1.0 - F);
      col += uGlow * uLight * pow(1.0 - ndv, 2.5) * 0.3 * (1.0 - smoothstep(1.4, 3.6, vY));
      gl_FragColor = vec4(col, 1.0);
    }`,
});

// Specular-only glass skin (Fresnel reflections of the generated studio env + highlights)
const glassReflMat = new THREE.MeshPhysicalMaterial({
  color: 0x000000, metalness: 0, roughness: 0.04, ior: 1.5, specularIntensity: 1, envMapIntensity: 1.4,
  transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
});

const glassRim = new THREE.Mesh(glassGeo, rimMat); glassRim.renderOrder = 1;
const glassRefl = new THREE.Mesh(glassGeo, glassReflMat); glassRefl.renderOrder = 3;
const liquid = new THREE.Group();
for (const g of [liqSideGeo, liqBotGeo, liqTopGeo]) { const m = new THREE.Mesh(g, liquidMat); m.renderOrder = 2; m.layers.set(FX_LAYER); liquid.add(m); }
glassRim.layers.set(FX_LAYER); glassRefl.layers.set(FX_LAYER);
lamp.add(glassRim, liquid, glassRefl);

// ---------------------------------------------------------------------------
// Wax simulation: lumped heat model, fixed timestep.
// Temperature T is normalised; wax is neutrally buoyant at T = 0.5.
// The pool holds whatever volume is not in blobs, so volume is conserved by construction.
// States: 0 dormant, 1 budding on the pool, 2 free, 3 sinking back into the pool, 4 fusing into a host blob.
// ---------------------------------------------------------------------------
const SIM_DT = 1 / 120;
const VOL_K = 4 / 3 * Math.PI;
const POOL_A = Math.PI * Math.pow(rInner(G.yInB + 0.1), 2);
const SIM = { power: true, heat: 0.55, amount: 0.55, room: 0.3, slow: false, bulb: 1, heatIn: 1, poolT: 0.95, W: 0, budTimer: 0.5, time: Math.random() * 1000 };
const B = [];
for (let i = 0; i < NB; i++) B.push({ st: 0, x: 0, y: 1.5, z: 0, vx: 0, vy: 0, vz: 0, vol: 0, volT: 0, vr: 1, r: 0, s: 1, T: 0.5, ph: Math.random() * 50, seed: Math.random() * 100, kT: 1, host: -1, lock: 0 });
const waxTotal = () => 0.16 + 0.3 * SIM.amount;
let poolTop = 1.55, poolVol = 0;
const flow = () => (0.5 + 0.9 * SIM.heat) * (0.3 + 0.7 * Math.min(1, SIM.poolT * 1.25));
function updatePool() {
  let used = 0; for (const b of B) used += b.vol;
  poolVol = SIM.W - used;
  poolTop = G.yInB + Math.max(0.14, poolVol / POOL_A + 0.04);
}
function envT(y) {
  const hb = Math.max(y - poolTop, 0);
  return SIM.heatIn * (0.9 * Math.exp(-hb / 0.14) + 0.18 + 0.1 * SIM.heat - 0.1 * (y - G.yInB) / 2.2) + 0.05;
}
function freeSlot() { for (let i = 0; i < NB; i++) if (B[i].st === 0 && B[i].vol < 1e-6) return i; return -1; }
function spawnBud() {
  let active = 0; for (const b of B) if (b.st > 0) active++;
  const maxActive = 4 + Math.round(SIM.amount * 7);
  if (active >= maxActive) return;
  const k = freeSlot(); if (k < 0) return;
  const rt = (0.1 + 0.15 * Math.pow(Math.random(), 0.9)) * (0.8 + 0.4 * SIM.amount);
  const v = VOL_K * rt * rt * rt;
  if (poolVol - v < POOL_A * 0.1) return;
  const b = B[k], a = Math.random() * Math.PI * 2, rho = Math.sqrt(Math.random()) * 0.3;
  Object.assign(b, { st: 1, x: Math.cos(a) * rho, z: Math.sin(a) * rho, y: poolTop, vx: 0, vy: 0, vz: 0, vol: 0, volT: v, vr: 0.35 + 0.45 * SIM.heat + Math.random() * 0.2, s: 1, T: SIM.poolT, kT: 0.8 + 0.45 * Math.random(), seed: Math.random() * 100, lock: 0 });
}
function simStep(dt) {
  SIM.time += dt;
  SIM.heatIn += ((SIM.power ? 1 : 0) - SIM.heatIn) * (1 - Math.exp(-dt * (SIM.power ? 2 : 1.2)));
  const poolTarget = SIM.heatIn * (0.78 + 0.22 * SIM.heat) + 0.06;
  SIM.poolT += (poolTarget - SIM.poolT) * (1 - Math.exp(-dt * (SIM.power ? 0.3 : 0.05)));
  SIM.W += (waxTotal() - SIM.W) * Math.min(1, dt * 0.8);
  updatePool();
  const fl = flow(), t = SIM.time;

  if (SIM.poolT > 0.62 && SIM.heatIn > 0.5) {
    SIM.budTimer -= dt * (0.5 + SIM.heat);
    if (SIM.budTimer <= 0) { spawnBud(); SIM.budTimer = 1.0 + 2.8 * Math.random(); }
  }
  // too little wax left in the pool (wax slider lowered): erode the free blobs
  if (poolVol < POOL_A * 0.1) for (const b of B) if (b.st === 2) b.volT *= 1 - dt * 0.25;

  for (let i = 0; i < NB; i++) {
    const b = B[i];
    if (b.st === 0) { b.vol = 0; b.r = 0; continue; }
    b.vol += (b.volT - b.vol) * (1 - Math.exp(-b.vr * dt));
    b.r = Math.cbrt(Math.max(b.vol, 0) / VOL_K);
    b.lock = Math.max(0, b.lock - dt);
    const speed = Math.hypot(b.vx, b.vy, b.vz);
    b.ph += dt * (0.4 + 2.2 * speed) * (0.4 + fl);
    let sT = 1;

    if (b.st === 1) {
      const frac = b.volT > 0 ? b.vol / b.volT : 0;
      b.T = SIM.poolT;
      b.x += Math.sin(t * 0.4 + b.seed) * 0.004 * dt; b.z += Math.cos(t * 0.37 + b.seed) * 0.004 * dt;
      b.y = poolTop + b.r * (-0.65 + 1.05 * sstep(0.3, 1, frac));
      sT = 1 + 0.25 * sstep(0.6, 1, frac);
      if (SIM.poolT < 0.5) { b.st = 3; b.volT = 0; b.vr = 0.5; }
      else if (frac > 0.93) { b.st = 2; b.vy = 0.015; b.lock = 1.5; }
    } else if (b.st === 2) {
      const tau = (7 + 36 * b.r) / b.kT;
      b.T += (envT(b.y) - b.T) * (1 - Math.exp(-dt / tau));
      const vT0 = fl * 0.7 * (b.T - 0.5) * (0.45 + 2.8 * b.r);
      const vT = vT0 < 0 ? vT0 * 0.8 : vT0;
      b.vy += (vT - b.vy) * Math.min(1, dt * 1.4);
      const dx = Math.sin(t * 0.23 + b.seed) + 0.6 * Math.sin(t * 0.57 + b.seed * 2.3) + 0.3 * Math.sin(t * 1.31 + b.seed * 4.1);
      const dz = Math.sin(t * 0.29 + b.seed * 1.7) + 0.6 * Math.sin(t * 0.61 + b.seed * 3.1) + 0.3 * Math.sin(t * 1.17 + b.seed * 5.3);
      const conv = b.vy > 0 ? -0.12 : 0.07;
      b.vx += (fl * (0.035 * dx + conv * b.x) - b.vx) * Math.min(1, dt * 0.8);
      b.vz += (fl * (0.035 * dz + conv * b.z) - b.vz) * Math.min(1, dt * 0.8);
      sT = 1 + (b.vy > 0 ? Math.min(0.8, b.vy * 1.9) : Math.min(0.22, -b.vy * 1.1)) + 0.05 * Math.sin(t * 0.9 + b.seed);
      // pinch off a droplet from the trailing end of big, stretched blobs
      if (b.r > 0.16 && b.lock <= 0 && Math.random() < dt * 0.05 * (b.r / 0.18) * (1 + Math.abs(b.vy) * 4)) {
        const k = freeSlot();
        if (k >= 0) {
          const c = B[k], f = 0.12 + 0.28 * Math.random(), dv = b.volT * f, dir = b.vy >= 0 ? -1 : 1;
          b.volT -= dv; b.vr = c.vr = 0.6 + 0.5 * Math.random();
          Object.assign(c, { st: 2, vol: 0, volT: dv, x: b.x + (Math.random() - 0.5) * 0.04, y: b.y + dir * b.r * b.s * 0.45, z: b.z + (Math.random() - 0.5) * 0.04,
            vx: b.vx, vy: b.vy * 0.35, vz: b.vz, T: b.T + (dir < 0 ? -0.1 : 0.06), s: 1, kT: b.kT * (0.9 + 0.3 * Math.random()), seed: Math.random() * 100, ph: Math.random() * 50, lock: 3 });
          b.lock = 3;
        }
      }
      if (b.y - b.r * b.s * 0.8 < poolTop + 0.01 && b.vy <= 0.02 && b.lock <= 0) { b.st = 3; b.volT = 0; b.vr = 0.32; }
    } else if (b.st === 3) {
      b.y += (poolTop - b.r * 0.25 - b.y) * Math.min(1, dt * 0.7);
      b.vx *= 1 - dt; b.vz *= 1 - dt; b.vy = 0;
      b.T += (SIM.poolT - b.T) * dt * 0.5;
      sT = 0.85;
      if (b.vol < 1e-5) { b.st = 0; b.vol = b.volT = 0; }
    } else if (b.st === 4) {
      let h = B[b.host];
      if (h.st === 4) { b.host = h.host; h = B[b.host]; }
      if (h.st === 0 || h.st === 3) { b.st = 3; b.volT = 0; b.vr = 0.5; continue; }
      const kk = Math.min(1, dt * 1.6);
      b.x += (h.x - b.x) * kk; b.y += (h.y - b.y) * kk; b.z += (h.z - b.z) * kk;
      b.vx = h.vx; b.vy = h.vy; b.vz = h.vz; b.T = h.T; sT = h.s;
      if (b.vol < 1e-5) { b.st = 0; b.vol = b.volT = 0; }
    }

    if (b.st === 2 || b.st === 4) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      // the glass narrows towards the cap: blobs elongate to fit, and never cross the wall
      const rin = Math.min(rInner(b.y), rInner(b.y + b.r * b.s * 0.6), rInner(b.y - b.r * b.s * 0.6));
      sT = Math.max(sT, Math.pow(b.r / (0.88 * rin), 2));
      const yMax = G.ceil - b.r * b.s * 0.92;
      if (b.y > yMax) { b.y = yMax; if (b.vy > 0) b.vy = 0; b.T -= dt * 0.05; sT = Math.min(sT, 0.8); }
      if (b.y < poolTop - 0.05) { b.y = poolTop - 0.05; if (b.vy < 0) b.vy = 0; }
    }
    b.s += (clamp(sT, 0.7, 2.6) - b.s) * Math.min(1, dt * 1.6);
    if (b.st >= 2) {
      const rin = Math.min(rInner(b.y), rInner(b.y + b.r * b.s * 0.5));
      const rhoMax = Math.max(0, rin - b.r / Math.sqrt(b.s) - 0.012);
      const rho = Math.hypot(b.x, b.z);
      if (rho > rhoMax) {
        const k = rhoMax / rho, nx = b.x / rho, nz = b.z / rho;
        b.x *= k; b.z *= k;
        const vn = b.vx * nx + b.vz * nz; if (vn > 0) { b.vx -= vn * nx; b.vz -= vn * nz; }
      }
    }
  }

  // surface tension between free blobs: attraction when close, fusion when deeply overlapping
  for (let i = 0; i < NB; i++) {
    const a = B[i]; if (a.st !== 2) continue;
    for (let j = i + 1; j < NB; j++) {
      const c = B[j]; if (c.st !== 2) continue;
      const dx = c.x - a.x, dy = c.y - a.y, dz = c.z - a.z, d = Math.hypot(dx, dy, dz) + 1e-6, rs = a.r + c.r;
      if (d < rs + 0.08 && a.lock <= 0 && c.lock <= 0) {
        const f = 0.05 * fl * (1 - d / (rs + 0.08)) * dt, m = a.vol + c.vol + 1e-9;
        a.vx += dx / d * f * c.vol / m; a.vy += dy / d * f * c.vol / m; a.vz += dz / d * f * c.vol / m;
        c.vx -= dx / d * f * a.vol / m; c.vy -= dy / d * f * a.vol / m; c.vz -= dz / d * f * a.vol / m;
        if (d < rs * 0.7 && Math.random() < dt * 0.5) {
          const [big, small, bi] = a.volT >= c.volT ? [a, c, i] : [c, a, j];
          const m2 = big.vol + small.vol + 1e-9;
          big.vx = (big.vx * big.vol + small.vx * small.vol) / m2; big.vy = (big.vy * big.vol + small.vy * small.vol) / m2; big.vz = (big.vz * big.vol + small.vz * small.vol) / m2;
          big.T = (big.T * big.vol + small.T * small.vol) / m2;
          big.volT += small.volT; small.volT = 0; small.st = 4; small.host = bi;
          big.vr = small.vr = 0.9; big.lock = 1;
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Colour presets (wax / liquid), blended smoothly when switched
// ---------------------------------------------------------------------------
const PRESETS = [
  { name: 'Classic', wax: '#ff2a0c', hot: '#ff7a2c', liq: '#ffc93a' },
  { name: 'Midnight', wax: '#ffcf30', hot: '#ffe48a', liq: '#2f5cff' },
  { name: 'Violet', wax: '#ff6418', hot: '#ffa055', liq: '#9a3cff' },
  { name: 'Lagoon', wax: '#ff3d8b', hot: '#ff8cba', liq: '#14d4c4' },
  { name: 'Arctic', wax: '#f2ece2', hot: '#fff1d8', liq: '#3d96ff' },
];
const col = { wax: new THREE.Color(), hot: new THREE.Color(), liq: new THREE.Color() };
const tgt = { wax: new THREE.Color(), hot: new THREE.Color(), liq: new THREE.Color() };
let presetIdx = 0;
function setPreset(i, instant = false) {
  presetIdx = i; const p = PRESETS[i];
  tgt.wax.set(p.wax); tgt.hot.set(p.hot); tgt.liq.set(p.liq);
  if (instant) { col.wax.copy(tgt.wax); col.hot.copy(tgt.hot); col.liq.copy(tgt.liq); }
  $('pname').textContent = p.name;
  document.querySelectorAll('.pz').forEach((el, k) => el.classList.toggle('act', k === i));
}
const presetsEl = $('presets');
PRESETS.forEach((p, i) => {
  const b = document.createElement('button');
  b.className = 'pz'; b.title = p.name; b.setAttribute('aria-label', p.name);
  b.style.background = `radial-gradient(circle at 38% 62%, ${p.wax} 0 30%, ${p.hot} 34%, ${p.liq} 40%, ${p.liq} 100%)`;
  b.onclick = () => setPreset(i);
  presetsEl.appendChild(b);
});
setPreset(0, true);

const lightCol = new THREE.Color(), tmpC = new THREE.Color();
function updateColors(dt) {
  const k = 1 - Math.exp(-dt * 2.2);
  col.wax.lerp(tgt.wax, k); col.hot.lerp(tgt.hot, k); col.liq.lerp(tgt.liq, k);
  fxU.uWax.value.copy(col.wax); fxU.uWaxHot.value.copy(col.hot); fxU.uLiq.value.copy(col.liq);
  const L = col.liq;
  fxU.uLiqAbs.value.set(-Math.log(Math.max(L.r, 0.012)) * 0.75 + 0.04, -Math.log(Math.max(L.g, 0.012)) * 0.75 + 0.04, -Math.log(Math.max(L.b, 0.012)) * 0.75 + 0.04);
  lightCol.copy(col.liq).lerp(col.hot, 0.22);
  const m = Math.max(lightCol.r, lightCol.g, lightCol.b, 1e-3); lightCol.multiplyScalar(1 / m);
}

// ---------------------------------------------------------------------------
// Lighting driven by the simulation: wax drifting over the bulb dims and tints the room
// ---------------------------------------------------------------------------
let occS = 0, oxS = 0, ozS = 0;
function updateLights(dt) {
  let occ = 0, ox = 0, oz = 0;
  for (const b of B) {
    if (b.r < 0.01) continue;
    const dy = b.y - 1.25, w = b.r * b.r / (0.05 + dy * dy * 0.6);
    occ += w; ox += b.x * w; oz += b.z * w;
  }
  const k = 1 - Math.exp(-dt * 6);
  occS += (Math.min(1, occ * 0.35) - occS) * k;
  oxS += ((occ > 1e-4 ? ox / occ : 0) - oxS) * k; ozS += ((occ > 1e-4 ? oz / occ : 0) - ozS) * k;
  const lb = SIM.bulb, glow = 0.55 + 0.45 * Math.min(1, SIM.poolT);
  lampLight.intensity = 80 * lb * (1 - 0.32 * occS) * glow;
  lampLight.color.copy(lightCol).lerp(tmpC.copy(col.hot), 0.12 + 0.3 * occS);
  fillLight.intensity = 14 * lb * (0.55 + 0.7 * occS) * glow;
  fillLight.color.copy(col.hot).lerp(lightCol, 0.3);
  fillLight.position.set(-oxS * 0.5, 1.72, -ozS * 0.5);
  const room = SIM.room;
  moon.intensity = 0.05 + 2.6 * room;
  hemi.intensity = 0.08 + 0.95 * room;
  for (const m of roomMats) m.envMapIntensity = m.userData.env * (0.15 + 1.6 * room);
  metalMat.envMapIntensity = 0.6 + 1.4 * room;
  glowU.value.copy(lightCol).multiplyScalar(0.9 * lb * glow);
  glassReflMat.envMapIntensity = 0.35 + 0.9 * room;
  fxU.uLight.value = lb;
  fxU.uRoom.value = room;
  ledMat.emissiveIntensity = 0.2 + 3.5 * lb;
  ledMat.emissive.copy(tmpC.setRGB(1, 0.32, 0.06)).multiplyScalar(SIM.power ? 1 : 0.06);
  rocker.rotation.x += ((SIM.power ? -0.24 : 0.24) - rocker.rotation.x) * Math.min(1, dt * 14);
}

function packUniforms() {
  for (let i = 0; i < NB; i++) {
    const b = B[i];
    fxU.uB.value[i].set(b.x, b.y, b.z, b.st === 0 ? 0 : b.r);
    fxU.uBx.value[i].set(b.s, b.ph, b.T, 0);
  }
  fxU.uPool.value.set(poolTop, 0.03 + 0.05 * SIM.poolT, SIM.poolT, 0);
  fxU.uTime.value = SIM.time;
}

// ---------------------------------------------------------------------------
// Post: HDR (MSAA) -> bloom -> ACES tone map -> grain + vignette
// ---------------------------------------------------------------------------
const bgRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
fxU.uBg.value = bgRT.texture;
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.7, 0.62);
composer.addPass(bloom);
composer.addPass(new OutputPass());
const film = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uTime; uniform vec2 uRes; varying vec2 vUv;
    float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      vec2 q = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
      c *= mix(0.5, 1.0, smoothstep(1.15, 0.25, length(q)));
      float g = hash(vUv * uRes + fract(uTime * 7.13) * 911.0) - 0.5;
      c += g * 0.03 * (1.0 - 0.6 * c);
      gl_FragColor = vec4(c, 1.0);
    }`,
});
composer.addPass(film);

const dbs = new THREE.Vector2();
function resize() {
  const w = innerWidth, h = innerHeight, asp = w / h;
  camera.aspect = asp;
  camera.fov = asp < 1 ? Math.min(58, 32 / Math.max(asp, 0.45) * 0.85) : 32;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Q.pr); renderer.setSize(w, h);
  composer.setPixelRatio(Q.pr); composer.setSize(w, h);
  renderer.getDrawingBufferSize(dbs);
  bgRT.setSize(Math.max(2, Math.round(dbs.x * 0.5)), Math.max(2, Math.round(dbs.y * 0.5)));
  rimMat.uniforms.uRes.value.copy(dbs);
  film.uniforms.uRes.value.copy(dbs);
}
addEventListener('resize', resize);
resize();

// Adaptive resolution: drop pixel ratio when frames run long, recover slowly when there is headroom
function quality(dt) {
  Q.warm += dt; if (Q.warm < 2.5) return;
  Q.t += dt; Q.n++;
  if (Q.t < 1.25) return;
  const avg = Q.t / Q.n; Q.t = 0; Q.n = 0;
  if (avg > 0.09) return;
  if (avg > 1 / 45 && Q.pr > Q.min) { Q.pr = Math.max(Q.min, Q.pr - 0.15); Q.good = 0; resize(); }
  else if (avg < 1 / 57) { if (++Q.good >= 4 && Q.pr < Q.max) { Q.pr = Math.min(Q.max, Q.pr + 0.1); Q.good = 0; resize(); } }
  else Q.good = 0;
  fxU.uSteps.value = Q.pr < 0.8 ? 48 : 64;
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const powerEl = $('power');
function setPower(on) {
  SIM.power = on;
  powerEl.classList.toggle('on', on); powerEl.setAttribute('aria-checked', String(on));
}
powerEl.onclick = () => setPower(!SIM.power);
powerEl.onkeydown = (e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setPower(!SIM.power); } };
function bindSlider(id, key, label) {
  const el = $(id), v = $('v' + id);
  const apply = () => { SIM[key] = el.value / 100; v.textContent = label(SIM[key]); el.style.setProperty('--p', el.value + '%'); };
  el.addEventListener('input', apply); apply();
}
bindSlider('heat', 'heat', (x) => Math.round(x * 100) + '%');
bindSlider('wax', 'amount', (x) => Math.round(x * 100) + '%');
bindSlider('room', 'room', (x) => Math.round(x * 100) + '%');
$('slow').onclick = (e) => { SIM.slow = !SIM.slow; e.currentTarget.classList.toggle('on', SIM.slow); };
$('orbit').onclick = (e) => { controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle('on', controls.autoRotate); };
setTimeout(() => { $('hint').style.opacity = '0'; }, 9000);

// the physical rocker switch on the cord is clickable
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let downAt = null;
function pick(e) {
  const r = renderer.domElement.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  return ray.intersectObjects(switchMeshes, false).length > 0;
}
renderer.domElement.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (downAt && Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) < 5 && pick(e)) setPower(!SIM.power);
  downAt = null;
});
renderer.domElement.addEventListener('pointermove', (e) => { if (e.buttons === 0) renderer.domElement.style.cursor = pick(e) ? 'pointer' : ''; });

// ---------------------------------------------------------------------------
// Start already warm: run the simulation ahead so blobs are mid-flight on first frame
// ---------------------------------------------------------------------------
SIM.W = waxTotal();
for (let i = 0; i < 45 * 120; i++) simStep(SIM_DT);
updateColors(1);

const clock = new THREE.Clock();
let acc = 0;
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.1);
  quality(dt);
  SIM.bulb += ((SIM.power ? 1 : 0) - SIM.bulb) * (1 - Math.exp(-dt * (SIM.power ? 5 : 2.2)));
  acc += dt * (SIM.slow ? 0.25 : 1);
  let n = 0;
  while (acc >= SIM_DT && n < 24) { simStep(SIM_DT); acc -= SIM_DT; n++; }
  if (n >= 24) acc = 0;
  updateColors(dt);
  updateLights(dt);
  packUniforms();
  film.uniforms.uTime.value += dt;

  controls.update();
  camera.updateMatrixWorld();
  fxU.uVP.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  fxU.uCam.value.copy(camera.position);

  camera.layers.set(0);
  renderer.setRenderTarget(bgRT);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  camera.layers.enable(FX_LAYER);
  composer.render(dt);
}
frame();

