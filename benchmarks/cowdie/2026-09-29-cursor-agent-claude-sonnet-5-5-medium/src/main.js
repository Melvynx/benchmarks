import * as THREE from 'three';
import { sfx } from './audio.js';
import { createCow, createEnvironment, createFood, createBall, createShowerCloud, spriteTexture, FOODS, V3 } from './world.js';

const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const smooth = (cur, target, k, dt) => cur + (target - cur) * (1 - Math.exp(-k * dt));
const angDiff = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const outBounce = (t) => {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
};
const tween = (ms, fn) =>
  new Promise((res) => {
    const s = performance.now();
    const step = () => {
      const t = Math.min(1, (performance.now() - s) / ms);
      fn(t);
      t < 1 ? requestAnimationFrame(step) : res();
    };
    step();
  });

const ACCESSORIES = [
  { id: 'none', label: 'Plain', lvl: 1 },
  { id: 'flower', label: 'Flower', lvl: 1 },
  { id: 'bow', label: 'Bow', lvl: 2 },
  { id: 'party', label: 'Party hat', lvl: 3 },
  { id: 'shades', label: 'Shades', lvl: 4 },
  { id: 'crown', label: 'Crown', lvl: 5 },
];
const STATS = [
  { key: 'hunger', label: 'Belly', color: '#ff9a3c' },
  { key: 'joy', label: 'Joy', color: '#ff6f9c' },
  { key: 'energy', label: 'Energy', color: '#ffd23c' },
  { key: 'clean', label: 'Clean', color: '#4fc3f7' },
];

const SAVE_KEY = 'cowdie-save-v1';
const defaults = () => ({ name: 'Cowdie', hunger: 70, joy: 75, energy: 85, clean: 90, xp: 0, level: 1, acc: 'flower', treats: 0, fav: pick(Object.keys(FOODS)), last: Date.now(), born: Date.now(), fed: 0 });
let state = defaults();
let welcomeBack = false;
try {
  const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
  if (saved) {
    state = { ...defaults(), ...saved };
    const away = Math.min((Date.now() - state.last) / 60000, 360);
    if (away > 2) {
      welcomeBack = true;
      const f = 0.35;
      state.hunger = clamp(state.hunger - 2.2 * away * f, 12);
      state.joy = clamp(state.joy - 1.3 * away * f, 15);
      state.energy = clamp(state.energy - 0.4 * away * f, 20);
      state.clean = clamp(state.clean - 0.9 * away * f, 15);
    }
  }
} catch {}
const save = () => {
  state.last = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
};

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 200);
const camBase = new V3(0, 3.6, 11);
const camLook = new V3(0, 1.5, 0.9);

const env = createEnvironment(scene);
const cowP = createCow();
const cow = cowP.root;
scene.add(cow);
const cowMeshes = [];
cow.traverse((o) => o.isMesh && cowMeshes.push(o));

const ball = createBall();
ball.visible = false;
scene.add(ball);
const ballV = new V3();
const shower = createShowerCloud();
shower.visible = false;
scene.add(shower);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const a = w / h;
  camBase.z = 11 + Math.max(0, 1.35 - a) * 9;
  camBase.y = 3.6 + Math.max(0, 1.35 - a) * 2;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

const A = { pitch: null, chew: false, jaw: null, happy: false, yawAdd: 0, wiggle: 0, faceYaw: null, grazeUntil: 0, petUntil: 0, hopV: 0, hopY: 0, sq: 0, lookBowl: false };
const nav = { x: 0, z: 0 };
const M = { pitch: 0, yaw: 0, jaw: 0, squint: 0, droop: 0, smile: 0, cheek: 0, yaw2: 0, sleepy: 0, sick: 0, night: 0 };
let busy = null;
let cancel = false;
let sleeping = false;
let playing = false;
let sickUntil = 0;
let walkPhase = 0;
let speedNow = 0;
let blinkT = 2;
let blink = 0;
let earFlick = { t: 0, side: 1 };
let idleT = 4;
let petAcc = 0;
let ballCool = 0;
let yawNow = 0.3;
let chewClock = 0;
const REST_YAW = 0.28;
const ptr = { x: 0, y: 0 };
const isSick = () => performance.now() < sickUntil;

const particles = [];
function spawn(kind, pos, { vel = new V3(), life = 1.4, size = 0.4, grow = 0, grav = 0, color = 0xffffff, drag = 0, spin = 0 } = {}) {
  const mat = new THREE.SpriteMaterial({ map: spriteTexture(kind), color, transparent: true, depthWrite: false, fog: false });
  const s = new THREE.Sprite(mat);
  s.position.copy(pos);
  s.scale.setScalar(size);
  scene.add(s);
  particles.push({ s, vel, life, max: life, size, grow, grav, drag, spin });
}
function burst(kind, n, center, opts = {}) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2);
    const sp = rand(0.6, 1.8) * (opts.speed || 1);
    spawn(kind, center.clone().add(new V3(rand(-0.2, 0.2), rand(-0.1, 0.2), rand(-0.2, 0.2))), {
      vel: new V3(Math.cos(a) * sp, rand(1.2, 2.6) * (opts.up ?? 1), Math.sin(a) * sp),
      life: rand(1.1, 1.9), size: rand(0.3, 0.55) * (opts.size || 1), grav: opts.grav ?? -0.6, color: opts.color ?? 0xffffff,
    });
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.s);
      p.s.material.dispose();
      particles.splice(i, 1);
      continue;
    }
    p.vel.y += p.grav * dt;
    if (p.drag) p.vel.multiplyScalar(Math.exp(-p.drag * dt));
    p.s.position.addScaledVector(p.vel, dt);
    const k = p.life / p.max;
    p.s.material.opacity = Math.min(1, k * 2.2);
    p.s.scale.setScalar(p.size * (1 + p.grow * (1 - k)));
    if (p.spin) p.s.material.rotation += p.spin * dt;
  }
}
const headWorld = () => new V3(cow.position.x, 2.5 + A.hopY, cow.position.z + 1.1 * Math.cos(yawNow));
const hearts = (n = 5) => {
  const h = headWorld().add(new V3(0, 0.5, 0.3));
  for (let i = 0; i < n; i++) setTimeout(() => spawn('heart', h.clone().add(new V3(rand(-0.6, 0.6), rand(0, 0.4), rand(0, 0.5))), { vel: new V3(rand(-0.3, 0.3), rand(0.9, 1.4), 0), life: 1.8, size: rand(0.35, 0.6), grav: 0 }), i * 90);
};

const bubbleEl = document.getElementById('bubble');
let bubbleTimer = 0;
function say(text, ms = 3200) {
  bubbleEl.textContent = text;
  bubbleEl.classList.add('show');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => bubbleEl.classList.remove('show'), ms);
}

const barsEl = document.getElementById('bars');
const barRefs = {};
STATS.forEach((s) => {
  const row = document.createElement('div');
  row.className = 'bar';
  row.innerHTML = `<span>${s.label}</span><div class="track"><div class="fill" style="background:${s.color}"></div></div>`;
  barsEl.appendChild(row);
  barRefs[s.key] = { row, fill: row.querySelector('.fill') };
});
function bump(key, d) {
  if (Math.abs(d) < 0.5) return;
  const el = document.createElement('span');
  el.className = 'delta ' + (d > 0 ? 'up' : 'down');
  el.textContent = (d > 0 ? '+' : '') + Math.round(d);
  barRefs[key].row.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}
function change(key, d, show = true) {
  const before = state[key];
  state[key] = clamp(before + d);
  if (show) bump(key, state[key] - before);
}
const nameEl = document.getElementById('petName');
nameEl.textContent = state.name;
nameEl.addEventListener('input', () => {
  state.name = nameEl.textContent.trim().slice(0, 14) || 'Cowdie';
});
nameEl.addEventListener('blur', () => {
  nameEl.textContent = state.name;
  save();
});
nameEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); }
});
const moodEl = document.getElementById('mood');
const lvlEl = document.getElementById('lvl');
const xpFill = document.getElementById('xpFill');
const cravingEl = document.getElementById('craving');
const need = () => 40 + state.level * 20;

function renderHud() {
  STATS.forEach((s) => {
    barRefs[s.key].fill.style.width = state[s.key].toFixed(1) + '%';
    barRefs[s.key].row.classList.toggle('low', state[s.key] < 25);
  });
  lvlEl.textContent = 'Lv ' + state.level;
  xpFill.style.width = (state.xp / need()) * 100 + '%';
  moodEl.textContent = moodLabel();
  cravingEl.innerHTML = `Craving: <b>${FOODS[state.fav].label}</b> (bonus joy)`;
  document.querySelectorAll('.act[data-food]').forEach((b) => b.classList.toggle('fav', b.dataset.food === state.fav));
  const sb = document.querySelector('[data-act="sleep"]');
  if (sb) {
    sb.classList.toggle('on', sleeping);
    sb.querySelector('span').textContent = sleeping ? 'Wake' : 'Sleep';
  }
  const ab = document.querySelector('[data-act="dress"] small');
  if (ab) ab.textContent = ACCESSORIES.find((a) => a.id === state.acc)?.label ?? '';
}
function moodLabel() {
  if (sleeping) return `${state.name} is dreaming...`;
  if (isSick()) return 'Tummy ache. Poor thing.';
  const low = STATS.map((s) => [s.key, state[s.key]]).sort((a, b) => a[1] - b[1])[0];
  if (low[1] < 30) return { hunger: 'Very hungry', joy: 'Feeling lonely', energy: 'So sleepy', clean: 'Feeling grubby' }[low[0]];
  const avg = (state.hunger + state.joy + state.energy + state.clean) / 4;
  return avg > 75 ? 'Feeling great!' : avg > 55 ? 'Content' : 'Meh';
}
const moodKind = () => {
  if (isSick()) return 'sick';
  const avg = (state.hunger + state.joy + state.energy + state.clean) / 4;
  if (Math.min(state.hunger, state.joy, state.clean) < 22 || avg < 40) return 'sad';
  return avg > 72 ? 'happy' : 'ok';
};

function addXp(n) {
  state.xp += n;
  while (state.xp >= need()) {
    state.xp -= need();
    state.level++;
    sfx.chime();
    burst('star', 14, new V3(cow.position.x, 2.2, cow.position.z + 0.5), { speed: 1.4, size: 1.2, grav: -1 });
    const unlocked = ACCESSORIES.find((a) => a.lvl === state.level);
    say(unlocked ? `Level ${state.level}! New look: ${unlocked.label}` : `Level ${state.level}!`, 4200);
    hop(6);
  }
}

function hop(p = 5) {
  if (A.hopY <= 0.02) A.hopV = p;
}

const feedRow = document.getElementById('feedRow');
const careRow = document.getElementById('careRow');
const ICONS = {
  apple: '<path d="M16 10c-3-3-10-1-10 6 0 6 4 12 8 12 1 0 1.5-.6 2-.6s1 .6 2 .6c4 0 8-6 8-12 0-7-7-9-10-6z" fill="#ef4b4b"/><path d="M16 10c0-3 1-5 3-6" stroke="#6b4a2b" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M19 7c2-2 5-2 6-1-1 2-4 3-6 1z" fill="#5bbd4a"/><ellipse cx="11" cy="15" rx="2" ry="3" fill="#fff" opacity=".35"/>',
  hay: '<path d="M8 12l-2-7M12 11l-1-8M16 11V3M20 11l1-8M24 12l2-7" stroke="#e0b93f" stroke-width="2.2" stroke-linecap="round"/><rect x="6" y="11" width="20" height="16" rx="5" fill="#f0cb55"/><path d="M10 14v10M14 13v12M18 13v12M22 14v10" stroke="#cf9f2c" stroke-width="1.6" stroke-linecap="round"/><rect x="6" y="17" width="20" height="4" fill="#b9782f"/>',
  carrot: '<path d="M6 11c5-5 12-3 15 1l3 3-14 13z" fill="#ff8a2a" transform="rotate(8 16 16)"/><path d="M21 10l1-6M23 12l6-3M20 8l-3-4" stroke="#4fb04a" stroke-width="2.6" stroke-linecap="round"/><path d="M11 15l3 2M13 20l3 2" stroke="#d96a12" stroke-width="1.6" stroke-linecap="round"/>',
  cake: '<rect x="5" y="16" width="22" height="11" rx="3" fill="#f7a8c4"/><path d="M5 19c3 3 5-2 8 1s5-2 8 1 4-1 6 0v-5a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3z" fill="#fff5e6"/><circle cx="12" cy="10" r="2.6" fill="#e63b3b"/><rect x="19" y="6" width="2.6" height="6" rx="1" fill="#7dd3fc"/><path d="M20.3 2.5c1.6 1.6 1.4 3.2 0 3.6-1.4-.4-1.6-2 0-3.6z" fill="#ffb02e"/>',
  play: '<circle cx="16" cy="16" r="12" fill="#fff" stroke="#3b2f3f" stroke-width="1.6"/><path d="M16 4a12 12 0 0 1 0 24z" fill="#ff5a7a"/><path d="M6 10c6 2 14 2 20 0M6 22c6-2 14-2 20 0" stroke="#3fc1ff" stroke-width="3" fill="none"/>',
  wash: '<circle cx="12" cy="19" r="8" fill="#bfeaff" stroke="#4fb6e8" stroke-width="2"/><circle cx="22" cy="10" r="5" fill="#d6f2ff" stroke="#4fb6e8" stroke-width="2"/><circle cx="24" cy="23" r="3" fill="#e6f7ff" stroke="#4fb6e8" stroke-width="1.6"/><circle cx="9" cy="16" r="2" fill="#fff"/>',
  sleep: '<path d="M22 4a12 12 0 1 0 6 21A13 13 0 0 1 22 4z" fill="#ffd66b" stroke="#e0a92a" stroke-width="1.5"/><path d="M6 6h5l-5 6h5M15 3h3l-3 4h3" stroke="#6a72d8" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  dress: '<path d="M16 16L4 8v16z" fill="#ff4d79"/><path d="M16 16l12-8v16z" fill="#ff4d79"/><circle cx="16" cy="16" r="4.2" fill="#e8365f"/><path d="M4 8l6 8M28 8l-6 8" stroke="#c92a52" stroke-width="1.2"/>',
};
function makeBtn(icon, label, sub, attrs = {}) {
  const b = document.createElement('button');
  b.className = 'act';
  b.innerHTML = `<svg viewBox="0 0 32 32" aria-hidden="true">${ICONS[icon]}</svg><span>${label}</span><small>${sub}</small>`;
  Object.entries(attrs).forEach(([k, v]) => b.setAttribute(k, v));
  return b;
}
Object.entries(FOODS).forEach(([k, f]) => {
  const b = makeBtn(k, f.label, `+${f.hunger} belly`, { 'data-food': k });
  b.addEventListener('click', () => feed(k));
  feedRow.appendChild(b);
});
[
  ['play', 'Play', 'Ball time', () => playGame()],
  ['wash', 'Wash', 'Bubble bath', () => wash()],
  ['sleep', 'Sleep', 'Nap', () => toggleSleep()],
  ['dress', 'Dress', '', () => cycleAcc()],
].forEach(([icon, label, sub, fn]) => {
  const b = makeBtn(icon, label, sub, { 'data-act': icon });
  b.addEventListener('click', fn);
  careRow.appendChild(b);
});

const muteIcon = document.getElementById('muteIcon');
const setMuteIcon = () => {
  muteIcon.innerHTML = sfx.muted
    ? '<path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>'
    : '<path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>';
};
setMuteIcon();
document.getElementById('mute').addEventListener('click', () => {
  sfx.setMuted(!sfx.muted);
  setMuteIcon();
  sfx.pop();
});

function applyAcc() {
  Object.entries(cowP.acc).forEach(([k, g]) => (g.visible = k === state.acc));
}
function cycleAcc() {
  const list = ACCESSORIES.filter((a) => a.lvl <= state.level);
  const i = list.findIndex((a) => a.id === state.acc);
  const next = list[(i + 1) % list.length];
  state.acc = next.id;
  applyAcc();
  sfx.pop();
  burst('star', 6, headWorld().add(new V3(0, 0.3, 0)), { size: 0.8 });
  if (list.length === 1) say('Level up to unlock new looks!');
  else say(next.id === 'none' ? 'Back to basics.' : `Ooh, ${next.label.toLowerCase()}!`);
  save();
  renderHud();
}

async function interrupt() {
  if (!busy) return true;
  if (busy === 'eat') return false;
  cancel = true;
  const s = performance.now();
  while (busy && performance.now() - s < 4000) await wait(50);
  cancel = false;
  return !busy;
}
async function wakeUp(grumpy) {
  if (!sleeping) return;
  sleeping = false;
  sfx.yawn();
  A.jaw = 0.45;
  say(grumpy ? 'Mmmh... I was dreaming of clover...' : 'Good morning!', 2600);
  await wait(700);
  A.jaw = null;
  renderHud();
}
async function moo(text = 'Moo!') {
  sfx.moo(rand(0.92, 1.1));
  say(text, 1800);
  A.jaw = 0.5;
  A.pitch = -0.32;
  await wait(950);
  A.jaw = null;
  A.pitch = null;
}

async function feed(key) {
  const f = FOODS[key];
  if (busy) {
    if (busy === 'eat') return say('Chew chew... one sec!', 1500);
    if (!(await interrupt())) return;
  }
  if (sleeping) await wakeUp(false);
  if (state.hunger >= 96) {
    busy = 'nope';
    sfx.nope();
    say("I'm stuffed! Maybe later.", 2200);
    await tween(700, (t) => (A.yawAdd = Math.sin(t * Math.PI * 4) * 0.55 * (1 - t)));
    A.yawAdd = 0;
    busy = null;
    return;
  }
  busy = 'eat';
  A.grazeUntil = 0;
  const fav = key === state.fav;
  nav.x = 0;
  nav.z = 0.55;
  A.faceYaw = 0;

  const food = createFood(key);
  const bowlPos = env.bowl.position;
  food.position.set(0, 5.5, bowlPos.z);
  scene.add(food);
  sfx.pop();
  await tween(600, (t) => {
    food.position.y = lerp(5.5, 0.1, t * t);
    food.rotation.y = t * 5;
  });
  await tween(350, (t) => (food.position.y = 0.1 + Math.abs(Math.sin(t * Math.PI * 2)) * 0.35 * (1 - t)));
  food.position.y = 0.1;
  sfx.thud();

  const start = performance.now();
  while (Math.hypot(nav.x - cow.position.x, nav.z - cow.position.z) > 0.12 && performance.now() - start < 4500) await wait(60);
  A.pitch = 1.0;
  await wait(350);

  const gain = { hunger: 0, joy: 0, energy: 0 };
  const parts = 3;
  for (let i = 0; i < parts; i++) {
    A.jaw = 0.6;
    await wait(230);
    A.jaw = 0;
    sfx.munch();
    const mouthP = food.position.clone().add(new V3(0, 0.3, 0));
    burst('dot', 6, mouthP, { color: f.color, size: 0.25, speed: 0.8, up: 0.8, grav: -6 });
    if (fav) burst('heart', 1, mouthP.clone().add(new V3(0, 0.5, 0)), { size: 0.9, grav: 0, up: 0.6 });
    const s = 1 - (i + 1) / parts;
    food.scale.setScalar(Math.max(0.01, s * 0.85 + 0.15 * (s > 0 ? 1 : 0)));
    if (i === parts - 1) food.visible = false;
    A.chew = true;
    A.pitch = 0.62;
    const g = f.hunger / parts;
    change('hunger', g, false);
    gain.hunger += g;
    hop(1.5);
    await wait(780);
    A.chew = false;
    A.pitch = 1.0;
    await wait(120);
  }
  scene.remove(food);
  A.pitch = -0.1;
  sfx.gulp();
  await wait(320);
  A.pitch = null;
  A.faceYaw = null;

  const joy = f.joy * (fav ? 3 : 1);
  change('joy', joy, false);
  change('energy', f.energy, false);
  change('clean', -f.mess, false);
  bump('hunger', gain.hunger);
  bump('joy', joy);
  if (f.mess) bump('clean', -f.mess);
  state.fed++;
  state.treats += f.treat;
  addXp(fav ? 14 : 8);
  hearts(fav ? 9 : 4);
  hop(5.5);
  sfx.squeak();

  if (state.treats >= 3) {
    state.treats = 1.5;
    sickUntil = performance.now() + 24000;
    change('joy', -14);
    say('Blegh... too much cake. Tummy hurts.', 4000);
    sfx.burp();
    burst('skull', 4, headWorld().add(new V3(0, 0.6, 0.6)), { color: 0x7bd66a, size: 1, grav: 0, up: 0.5 });
  } else if (fav) {
    say(`${f.label}! My favourite!`, 3000);
    sfx.moo(1.15);
    state.fav = pick(Object.keys(FOODS).filter((k) => k !== key));
  } else {
    say(pick(['Yum!', 'Mmm, tasty!', 'More please!', `${f.label} is great!`]), 2400);
    if (Math.random() < 0.35) sfx.moo(1.1);
  }
  busy = null;
  save();
  renderHud();
}

async function playGame() {
  if (busy) {
    if (busy === 'play') { cancel = true; return; }
    if (!(await interrupt())) return say('One sec, finishing up!', 1400);
  }
  if (sleeping) await wakeUp(true);
  if (state.energy < 12) return say('Too sleepy to play...', 2200);
  if (isSick()) return say('My tummy hurts...', 2000);
  busy = 'play';
  playing = true;
  ball.visible = true;
  ball.scale.setScalar(1);
  ball.position.set(rand(-2.5, 2.5), 6, rand(0.5, 2.5));
  ballV.set(rand(-1, 1), 0, rand(-0.5, 1));
  ballCool = 1.2;
  sfx.boing();
  say('Ball! Tap it to throw!', 2500);
  const end = performance.now() + 14000;
  while (performance.now() < end && !cancel && state.energy > 6) await wait(150);
  playing = false;
  await tween(300, (t) => ball.scale.setScalar(1 - t));
  ball.visible = false;
  nav.x = rand(-1.5, 1.5);
  nav.z = rand(-0.5, 0.5);
  addXp(10);
  hearts(4);
  if (state.energy <= 6) say('Phew... I need a nap.', 3000);
  else say('That was fun!', 2400);
  busy = null;
  cancel = false;
  save();
  renderHud();
}

async function wash() {
  if (busy) {
    if (!(await interrupt())) return say('One sec, finishing up!', 1400);
  }
  if (sleeping) await wakeUp(true);
  busy = 'wash';
  nav.x = 0;
  nav.z = 0;
  const s0 = performance.now();
  while (Math.hypot(cow.position.x, cow.position.z) > 0.15 && performance.now() - s0 < 4000) await wait(60);
  const c0 = state.clean;
  shower.visible = true;
  shower.position.set(0, 5.2, 0);
  sfx.splash();
  say('Splish splash!', 2500);
  const dur = 4200;
  const startT = performance.now();
  let last = 0;
  await tween(dur, (t) => {
    shower.scale.setScalar(Math.min(1, t * 6));
    shower.position.x = Math.sin(t * 9) * 0.5;
    state.clean = lerp(c0, 100, t);
    A.wiggle = 0.12;
    A.happy = true;
    const now = performance.now() - startT;
    if (now - last > 45) {
      last = now;
      spawn('drop', new V3(rand(-1.4, 1.4), 4.9, rand(-0.9, 0.9)), { vel: new V3(0, -7, 0), life: 0.7, size: 0.22, color: 0xffffff });
      if (Math.random() < 0.45) spawn('bubble', new V3(rand(-1.3, 1.3), rand(0.6, 2.2), rand(-0.9, 1.4)), { vel: new V3(rand(-0.2, 0.2), rand(0.4, 0.9), 0), life: rand(1.4, 2.2), size: rand(0.25, 0.6), grav: 0 });
    }
  });
  bump('clean', 100 - c0);
  shower.visible = false;
  A.happy = false;
  A.wiggle = 0;
  await tween(650, (t) => (A.wiggle = 0.5 * (1 - t)));
  burst('drop', 14, new V3(cow.position.x, 1.8, cow.position.z), { speed: 2.4, size: 0.5, grav: -6 });
  burst('star', 8, headWorld().add(new V3(0, 0.3, 0.2)), { size: 0.8, grav: -0.3 });
  A.wiggle = 0;
  change('joy', 10);
  addXp(10);
  sfx.chime();
  say('Squeaky clean!', 2800);
  hop(5);
  busy = null;
  save();
  renderHud();
}

async function toggleSleep() {
  if (sleeping) return wakeUp(false);
  if (busy) {
    if (!(await interrupt())) return say('One sec, finishing up!', 1400);
  }
  if (state.energy > 88) return say("I'm not sleepy yet!", 2000);
  A.grazeUntil = 0;
  sleeping = true;
  nav.x = cow.position.x;
  nav.z = cow.position.z;
  sfx.yawn();
  say('Nighty night...', 2200);
  renderHud();
}

let lastZ = 0;
function tickSleepFx(dt) {
  lastZ -= dt;
  if (lastZ <= 0) {
    lastZ = 1.6;
    spawn('zzz', headWorld().add(new V3(0.5, 0.1, 0)), { vel: new V3(0.25, 0.55, 0), life: 2.6, size: 0.4, grow: 1.4, grav: 0 });
  }
}

function idleBehavior() {
  const hungry = state.hunger < 30;
  const r = Math.random();
  if (hungry && r < 0.35) {
    say(pick(['My tummy is rumbling...', 'Got any snacks?', 'Moo... hungry...']), 3000);
    A.jaw = null;
    if (Math.random() < 0.5) moo('Moooo... food?');
    nav.x = rand(-0.6, 0.6);
    nav.z = 0.8;
    return;
  }
  if (state.energy < 25 && r < 0.4) {
    sfx.yawn();
    say('*yawn* Nap time soon...', 2600);
    A.jaw = 0.5;
    setTimeout(() => (A.jaw = null), 1400);
    return;
  }
  if (state.clean < 30 && r < 0.3) return say('I feel grubby... bath?', 2800);
  if (state.joy < 30 && r < 0.3) return say('Play with me?', 2600);
  if (r < 0.4) {
    nav.x = rand(-3.2, 3.2);
    nav.z = rand(-1.4, 0.8);
  } else if (r < 0.6) {
    A.grazeUntil = performance.now() + rand(2500, 4500);
  } else if (r < 0.72) {
    tween(1800, (t) => (A.yawAdd = Math.sin(t * Math.PI * 2) * 0.8)).then(() => (A.yawAdd = 0));
  } else if (r < 0.82) {
    moo();
  } else if (r < 0.92 && moodKind() === 'happy') {
    hop(5);
    sfx.boing();
    spawn('star', headWorld().add(new V3(rand(-0.5, 0.5), 0.4, 0.4)), { vel: new V3(0, 0.6, 0), life: 1.2, size: 0.5, grav: 0 });
  } else {
    earFlick = { t: 0.5, side: Math.random() < 0.5 ? -1 : 1 };
  }
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pointerNdc(e) {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ptr.x = ndc.x;
  ptr.y = ndc.y;
}
let petting = null;
canvas.addEventListener('pointerdown', (e) => {
  sfx.unlock();
  pointerNdc(e);
  ray.setFromCamera(ndc, camera);
  if (playing && ball.visible && ray.intersectObject(ball).length) {
    const a = rand(-0.6, 0.6);
    ballV.set(Math.sin(a) * 3, rand(6, 8), -rand(2, 4) + 1.5);
    sfx.boing();
    spawn('star', ball.position.clone(), { size: 0.5, life: 0.8, vel: new V3(0, 0.5, 0), grav: 0 });
    return;
  }
  if (ray.intersectObjects(cowMeshes, false).length) {
    document.getElementById('hint').classList.add('hide');
    if (sleeping) return wakeUp(true);
    petting = { x: e.clientX, y: e.clientY, dist: 0 };
    canvas.classList.add('petting');
    canvas.setPointerCapture(e.pointerId);
  }
});
canvas.addEventListener('pointermove', (e) => {
  pointerNdc(e);
  if (!petting) return;
  const d = Math.hypot(e.clientX - petting.x, e.clientY - petting.y);
  petting.x = e.clientX;
  petting.y = e.clientY;
  petting.dist += d;
  petAcc += d;
  A.petUntil = performance.now() + 250;
  if (petAcc > 110) {
    petAcc = 0;
    if (state.joy < 100) change('joy', 1.4, false);
    hearts(1);
    sfx.purr();
    if (Math.random() < 0.15) addXp(1);
  }
});
const endPet = () => {
  if (petting && petting.dist < 8) {
    sfx.squeak();
    hop(3);
    change('joy', 0.6, false);
    A.sq = 0.12;
    if (Math.random() < 0.5) say(pick(['Moo!', 'Hehe!', 'Boop!', 'That tickles!']), 1400);
  }
  petting = null;
  canvas.classList.remove('petting');
};
canvas.addEventListener('pointerup', endPet);
canvas.addEventListener('pointercancel', endPet);

function updateBall(dt) {
  if (!ball.visible) return;
  const R = 0.45;
  ballV.y -= 16 * dt;
  ball.position.addScaledVector(ballV, dt);
  if (ball.position.y < R) {
    ball.position.y = R;
    if (ballV.y < -2) sfx.thud();
    ballV.y = ballV.y < -1.5 ? -ballV.y * 0.62 : 0;
  }
  if (ball.position.y <= R + 0.01) {
    const k = Math.exp(-1.2 * dt);
    ballV.x *= k;
    ballV.z *= k;
  }
  if (Math.abs(ball.position.x) > 6.2) { ball.position.x = Math.sign(ball.position.x) * 6.2; ballV.x *= -0.7; }
  if (ball.position.z > 4.6) { ball.position.z = 4.6; ballV.z *= -0.7; }
  if (ball.position.z < -5) { ball.position.z = -5; ballV.z *= -0.7; }
  ball.rotation.z -= ballV.x * dt * 2;
  ball.rotation.x += ballV.z * dt * 2;

  if (!playing) return;
  ballCool -= dt;
  const dx = ball.position.x - cow.position.x, dz = ball.position.z - cow.position.z;
  const d = Math.hypot(dx, dz) || 1;
  nav.x = ball.position.x - (dx / d) * 1.05;
  nav.z = ball.position.z - (dz / d) * 1.05;
  change('joy', 2.4 * dt, false);
  change('energy', -1.1 * dt, false);
  change('hunger', -0.4 * dt, false);
  if (d < 1.7 && ball.position.y < 0.9 && ballCool <= 0) {
    ballCool = 0.9;
    const a = Math.atan2(dx, dz) + rand(-0.9, 0.9);
    const p = rand(3.5, 6.5);
    ballV.set(Math.sin(a) * p, rand(4.5, 7.5), Math.cos(a) * p - 1);
    sfx.boing();
    A.pitch = 0.95;
    setTimeout(() => (A.pitch = null), 260);
    spawn('star', ball.position.clone(), { size: 0.55, life: 0.7, vel: new V3(0, 0.6, 0), grav: 0 });
    if (Math.random() < 0.3) hearts(1);
  }
}

function tickStats(dt) {
  const m = dt / 60;
  if (sleeping) {
    change('energy', 9 * m, false);
    change('hunger', -0.9 * m, false);
    change('joy', 0.3 * m, false);
    change('clean', -0.3 * m, false);
    if (state.energy >= 100) {
      wakeUp(false);
      addXp(4);
    }
  } else {
    const dirty = state.clean < 25 ? 1.5 : 1;
    if (!playing) {
      change('hunger', -2.2 * m, false);
      change('energy', -1.0 * m, false);
    }
    change('joy', -1.3 * m * dirty * (state.hunger < 20 ? 2 : 1) - (isSick() ? 6 * m : 0), false);
    change('clean', -0.9 * m, false);
    if (state.energy <= 3 && !busy) toggleSleep();
  }
  state.treats = Math.max(0, state.treats - dt / 180);
}

function animateCow(dt, time) {
  const mood = moodKind();
  const mv = new V3(nav.x - cow.position.x, 0, nav.z - cow.position.z);
  const dist = mv.length();
  const moving = dist > 0.06 && !sleeping;
  let speedT = 0;
  if (moving) {
    speedT = Math.min(dist * 2.5, playing ? 4.2 : 2.0);
    cow.position.addScaledVector(mv.normalize(), speedT * dt);
  }
  speedNow = smooth(speedNow, speedT, 10, dt);
  cow.position.x = clamp(cow.position.x, -5.5, 5.5);
  cow.position.z = clamp(cow.position.z, -4.5, 3.2);

  let yawT = REST_YAW;
  if (moving && speedT > 0.3) yawT = Math.atan2(nav.x - cow.position.x, nav.z - cow.position.z);
  else if (A.faceYaw != null) yawT = A.faceYaw;
  if (sleeping) yawT = 0.5;
  yawNow += angDiff(yawNow, yawT) * (1 - Math.exp(-6 * dt));
  cow.rotation.y = yawNow + Math.sin(time * 34) * A.wiggle;

  walkPhase += speedNow * dt * 4.5;
  const amp = Math.min(1, speedNow / 1.4) * 0.6;
  cowP.legs.forEach((l) => {
    l.pivot.rotation.x = Math.sin(walkPhase + l.phase) * amp;
    const tuck = sleeping ? 0.1 : 1;
    l.pivot.scale.y = smooth(l.pivot.scale.y, tuck, 7, dt);
  });

  A.hopV -= 20 * dt;
  A.hopY += A.hopV * dt;
  if (A.hopY <= 0) {
    if (A.hopV < -3) A.sq = 0.14;
    A.hopY = 0;
    A.hopV = Math.max(0, A.hopV);
  }
  A.sq = smooth(A.sq, 0, 9, dt);
  const bob = Math.abs(Math.sin(walkPhase)) * 0.06 * Math.min(1, speedNow);
  const sleepDrop = sleeping ? -0.36 : 0;
  M.sleepy = smooth(M.sleepy, sleeping ? 1 : 0, 4, dt);
  cow.position.y = A.hopY + bob + sleepDrop * M.sleepy;
  cow.scale.set(1 + A.sq * 0.5, 1 - A.sq, 1 + A.sq * 0.5);
  const breath = sleeping ? 0.03 : 0.014;
  cowP.torso.scale.set(1 + Math.sin(time * 2.1) * breath * 0.6, 1 + Math.sin(time * (sleeping ? 1.2 : 2.1)) * breath, 1);

  const grazing = performance.now() < A.grazeUntil && !busy && !sleeping;
  const petted = performance.now() < A.petUntil;
  const chewing = A.chew || grazing;
  let pitchT = mood === 'sad' ? 0.28 : 0.04;
  let yawT2 = 0;
  if (!sleeping && !grazing && !busy) {
    yawT2 = clamp(ptr.x * 0.7 - (yawNow - REST_YAW) * 0.4, -0.75, 0.75);
    pitchT -= ptr.y * 0.15;
  }
  if (petted) pitchT = 0.45;
  if (grazing) pitchT = 0.95;
  if (sleeping) { pitchT = 0.62; yawT2 = -0.2; }
  if (isSick()) pitchT = 0.55;
  if (A.pitch != null) pitchT = A.pitch;
  M.pitch = smooth(M.pitch, pitchT, 9, dt);
  M.yaw = smooth(M.yaw, yawT2 + A.yawAdd, 8, dt);
  chewClock += chewing ? dt * 15 : 0;
  const chewV = chewing ? Math.sin(chewClock) : 0;
  cowP.neck.rotation.x = M.pitch * 0.55 + chewV * 0.02;
  cowP.head.rotation.x = M.pitch * 0.45 + chewV * 0.03;
  cowP.neck.rotation.y = M.yaw * 0.6;
  cowP.head.rotation.y = M.yaw * 0.4;
  cowP.head.rotation.z = sleeping ? Math.sin(time * 1.2) * 0.04 - 0.08 : isSick() ? Math.sin(time * 3) * 0.03 : 0;
  const jawT = A.jaw != null ? A.jaw : chewing ? (chewV * 0.5 + 0.5) * 0.28 : 0;
  M.jaw = smooth(M.jaw, jawT, 22, dt);
  cowP.jaw.rotation.x = M.jaw;
  cowP.mouth.visible = M.jaw < 0.06;

  const smileT = { happy: 1, ok: 0.35, sad: -1, sick: -1 }[mood];
  M.smile = smooth(M.smile, petted || A.happy ? 1 : smileT, 6, dt);
  cowP.mouth.scale.set(1 + Math.max(0, M.smile) * 0.35, -M.smile * 0.9 || 0.001, 1);
  cowP.mouth.position.y = -0.37 + (M.smile > 0 ? 0.025 : -0.005);
  cowP.cheekM.opacity = smooth(cowP.cheekM.opacity, petted || A.happy ? 0.75 : mood === 'happy' ? 0.45 : 0, 5, dt);

  blinkT -= dt;
  if (blinkT <= 0) { blink = 1; blinkT = rand(2, 5.5); }
  blink = Math.max(0, blink - dt * 7);
  const squintT = petted || A.happy ? 0.72 : sleeping ? 0.92 : mood === 'sad' ? 0.3 : mood === 'sick' ? 0.5 : chewing ? 0.15 : 0;
  M.squint = smooth(M.squint, squintT, 10, dt);
  const eyeY = Math.max(0.06, 1 - M.squint - Math.sin(blink * Math.PI) * 0.95);
  cowP.eyes.forEach((e) => {
    e.eye.scale.y = eyeY;
    e.lash.visible = M.squint > 0.6 || eyeY < 0.2;
    const lookX = sleeping ? 0 : clamp(ptr.x * 0.05 + (e.s * 0), -0.05, 0.05);
    e.pupil.position.set(lookX, sleeping ? 0 : ptr.y * 0.03 - (mood === 'sad' ? 0.03 : 0), 0);
  });

  earFlick.t = Math.max(0, earFlick.t - dt);
  const droopT = mood === 'sad' || sleeping ? 0.75 : mood === 'sick' ? 0.9 : petted ? -0.15 : 0;
  M.droop = smooth(M.droop, droopT, 5, dt);
  cowP.ears.forEach(({ g, s }) => {
    const flick = earFlick.side === s ? Math.sin(earFlick.t * 34) * 0.35 * Math.min(1, earFlick.t * 4) : 0;
    const perk = playing || busy === 'eat' ? 0.12 : 0;
    g.rotation.z = s * (0.28 - M.droop * 1.1 + perk + flick + Math.sin(time * 1.3 + s) * 0.02);
  });

  const happyTail = mood === 'happy' || petted || A.happy;
  cowP.tail.rotation.z = Math.sin(time * (happyTail ? 9 : 2)) * (happyTail ? 0.55 : 0.12) * (sleeping ? 0.2 : 1);
  cowP.tail.rotation.x = 0.15 + Math.sin(time * 1.1) * 0.05 + speedNow * 0.05;
  cowP.bell.position.x = Math.sin(time * 6 + speedNow * 2) * 0.03 * (1 + speedNow);

  const sickT = isSick() ? 1 : 0;
  M.sick = smooth(M.sick, sickT, 3, dt);
  cowP.white.color.setRGB(1 - M.sick * 0.25, 0.98 - M.sick * 0.02, 0.94 - M.sick * 0.3);
  cowP.pink.color.setHex(0xffb0bd).lerp(new THREE.Color(0xb6d98a), M.sick * 0.6);
  cowP.mud.opacity = clamp((50 - state.clean) / 35, 0, 0.92);
  const flies = state.clean < 30 && !sleeping;
  cowP.flies.forEach((f, i) => {
    f.visible = flies;
    const a = time * (3 + i) + i * 2.1;
    f.position.set(Math.cos(a) * (0.7 + i * 0.15), 2.7 + Math.sin(a * 1.7) * 0.25 + i * 0.1, 1.25 + Math.sin(a) * 0.5);
  });

  if (isSick() && Math.random() < dt * 0.4) burst('skull', 1, headWorld().add(new V3(0, 0.4, 0.5)), { color: 0x7bd66a, size: 0.8, grav: 0, up: 0.4 });
}

function tickEnv(dt, time) {
  M.night = smooth(M.night, sleeping ? 1 : 0, 2.2, dt);
  const n = M.night;
  const day = new THREE.Color(0x9ddcff), night = new THREE.Color(0x0d1235);
  const sky = day.clone().lerp(night, n);
  scene.background.copy(sky);
  scene.fog.color.copy(sky);
  env.hemi.intensity = lerp(1.15, 0.5, n);
  env.hemi.color.set(0xcfeaff).lerp(new THREE.Color(0x5a6cc0), n);
  env.sun.intensity = lerp(2.3, 0, n);
  env.moon.intensity = lerp(0, 1.4, n);
  env.starM.opacity = n;
  env.cloudM.emissiveIntensity = lerp(0.35, 0.03, n);
  env.sunMesh.position.y = lerp(20, -8, n);
  env.moonMesh.position.y = lerp(-8, 20, n);
  document.body.style.background = '#' + sky.getHexString();
  env.clouds.forEach((c) => {
    c.position.x += c.userData.speed * dt;
    if (c.position.x > 40) c.position.x = -40;
  });
  camera.position.set(camBase.x + ptr.x * 0.7, camBase.y + ptr.y * 0.35, camBase.z);
  camera.lookAt(camLook);
  void time;
}

const projV = new V3();
function placeBubble() {
  projV.set(cow.position.x, 3.55 + A.hopY, cow.position.z + 0.4).project(camera);
  const x = (projV.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-projV.y * 0.5 + 0.5) * window.innerHeight;
  bubbleEl.style.transform = `translate(${x}px, ${y - 12}px) translate(-50%, -100%)`;
}

let prev = performance.now();
let statT = 0;
let saveT = 0;
function loop(now) {
  const dt = clamp((now - prev) / 1000, 0, 0.05);
  prev = now;
  const time = now / 1000;
  tickStats(dt);
  if (sleeping) tickSleepFx(dt);
  idleT -= dt;
  if (idleT <= 0) {
    idleT = rand(4, 8);
    if (!busy && !sleeping && !petting) idleBehavior();
  }
  animateCow(dt, time);
  updateBall(dt);
  updateParticles(dt);
  tickEnv(dt, time);
  placeBubble();
  statT -= dt;
  if (statT <= 0) { statT = 0.25; renderHud(); }
  saveT -= dt;
  if (saveT <= 0) { saveT = 5; save(); }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

applyAcc();
cow.position.set(0, 0, 0);
renderHud();
requestAnimationFrame(loop);
setTimeout(() => say(welcomeBack ? `${state.name} missed you!` : `Hi! I'm ${state.name}. Feed me?`, 3800), 700);
window.addEventListener('beforeunload', save);
window.__cowdie = { cow, camera, state, feed, playGame, wash, toggleSleep, cycleAcc, say, addXp, get busy() { return busy; } };
