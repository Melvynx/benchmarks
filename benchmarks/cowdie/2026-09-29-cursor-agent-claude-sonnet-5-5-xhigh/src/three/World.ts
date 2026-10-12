import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Cowdie } from './Cowdie';
import { Environment, ISLAND_RADIUS } from './Environment';
import { Particles } from './Particles';
import { Overlay } from './Overlay';
import { foodCrumbColor, foodThumbnails, makeFood } from './Foods';
import { ballTexture } from './textures';
import { bus } from '../game/bus';
import { FOOD_BY_ID, STUFFED_AT, type FoodId } from '../game/config';
import { useGame, type GameState, type Mode } from '../game/store';
import { getMood, levelInfo } from '../game/logic';
import { sfx } from '../audio/sfx';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const smoothstep = (a: number, b: number, x: number) => {
  const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const WALK_BOUNDS = { minX: -4.2, maxX: 4.2, minZ: -2.4, maxZ: 3.2 };

interface Held {
  id: FoodId;
  mesh: THREE.Group;
  pointerId: number;
  startX: number;
  startY: number;
  clientX: number;
  clientY: number;
  t0: number;
  target: THREE.Vector3;
  refused: boolean;
}

interface Flying {
  id: FoodId;
  mesh: THREE.Group;
  from: THREE.Vector3;
  ctrl: THREE.Vector3;
  t: number;
  dur: number;
}

interface GroundFood {
  id: FoodId;
  mesh: THREE.Group;
  vel: THREE.Vector3;
  resting: boolean;
  age: number;
  claimed: boolean;
}

interface PoopObj {
  group: THREE.Group;
  t: number;
  stinkT: number;
  removing: number;
}

interface Ball {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  radius: number;
  lastKick: number;
  lastBounce: number;
  idle: number;
  scale: number;
  kicks: number;
}

interface Sud {
  mesh: THREE.Mesh;
  t: number;
  target: number;
}

type PointerMode = 'none' | 'pet' | 'orbit' | 'scrub' | 'throw';

const LINES = {
  eat: ['Nom nom nom!', 'Yum!', 'Delicious!', 'So good!', 'More please!', 'Mmm, tasty!'],
  loved: ['MY FAVORITE!!', 'Best. Snack. Ever!', 'I love it! Moo!', 'Yesss, my favorite!'],
  cookie: ['Sugar rush!', 'Cookies are life!'],
  milk: ['Mooo-lk! *burp*', 'Cozy milk moustache!'],
  chili: ['HOT HOT HOT!!', 'Spicy!! Moooo!', 'My ears are steaming!'],
  grass: ['Fresh and green!', 'Tastes like meadow.'],
  apple: ['Crunchy!', 'Apple-solutely great!'],
  stuffed: ["I'm stuffed!", 'No more, my belly is full!', 'Too full... maybe later?'],
  hungry: ['My tummy is rumbling...', 'Feed me? Please?', 'So hungry...'],
  sad: ['Play with me?', 'I feel lonely...', 'Can I get a cuddle?'],
  dirty: ['I smell funny...', 'Bath time?', 'Ew, I need a wash.'],
  sleepy: ['So sleepy...', 'Can I take a nap?'],
  happy: ['Life is moo-tiful!', 'Best day ever!', 'I love you!'],
  petted: ['Purrrr... moo.', 'That feels nice!', 'More cuddles!'],
  boop: ['Boop!', 'Hehe, my nose!', 'Beep!'],
  idle: ['Moo!', 'Mooo~', 'Moo moo!'],
};

export class World {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  readonly env: Environment;
  readonly fx = new Particles();
  readonly cowdie: Cowdie;
  readonly overlay: Overlay;

  private canvas: HTMLCanvasElement;
  private raf = 0;
  private lastFrame = 0;
  private time = 0;
  private disposed = false;
  private cleanups: (() => void)[] = [];
  private resizeObs: ResizeObserver;

  private camYaw = 0;
  private camYawT = 0;
  private camPitch = 0.26;
  private camPitchT = 0.26;
  private baseDist = 8.6;
  timeScale = 1;
  private zoom = 1;
  private zoomT = 1;
  private camTarget = new THREE.Vector3(0, 1.2, 0);
  private orbitIdle = 0;
  private insetTop = 0;
  private insetBottom = 0;
  private curTop = 0;
  private curBottom = 0;
  private insetsReady = false;
  private width = 1;
  private height = 1;

  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();
  private tmp3 = new THREE.Vector3();
  private ptr = {
    inside: false,
    lastMove: 0,
    down: false,
    id: -1,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    cx: 0,
    cy: 0,
    downT: 0,
    mode: 'none' as PointerMode,
    part: '',
    petDist: 0,
    petAcc: 0,
    lastPurr: 0,
  };

  private held: Held | null = null;
  private flying: Flying | null = null;
  private groundFoods: GroundFood[] = [];
  private eatingMesh: THREE.Group | null = null;
  private eatingId: FoodId | null = null;
  private eatChewProgress = 0;
  private eatIntro = 0;

  private poops: PoopObj[] = [];
  private ball: Ball | null = null;
  private ballRing: THREE.Mesh;
  private ballRingT = 0;
  private sponge: THREE.Group;
  private spongeTarget = new THREE.Vector3();
  private spongeVisible = false;
  private suds: Sud[] = [];
  private scrub = { progress: 0, goalPx: 600, startClean: 100, lastSfx: 0, distAcc: 0, active: false, activeT: 0 };

  private idleT = 4;
  private chatterT = 22;
  private lookUntil = 0;
  private lookPoint = new THREE.Vector3();
  private lastInteraction = 0;
  private sleepTimer = -1;
  private boopTimes: number[] = [];
  private lastMoodSay = 0;
  private stuffedSayAt = 0;
  private playKickCount = 0;
  private hintPoopSay = 0;

  private thumbs: Record<FoodId, string>;

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.canvas = this.renderer.domElement;
    this.canvas.className = 'scene-canvas';
    this.canvas.setAttribute('aria-label', 'Cowdie the virtual cow in a meadow');
    this.canvas.setAttribute('role', 'img');
    container.append(this.canvas);

    this.env = new Environment();
    this.scene.add(this.env.group, this.fx.group);
    this.scene.background = this.env.background;
    this.cowdie = new Cowdie(this.fx);
    this.cowdie.root.position.set(0, 0, 0.5);
    this.scene.add(this.cowdie.root);
    this.overlay = new Overlay(container);
    this.thumbs = foodThumbnails();

    this.ballRing = new THREE.Mesh(
      new THREE.RingGeometry(0.32, 0.46, 40),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
    );
    this.ballRing.rotation.x = -Math.PI / 2;
    this.ballRing.position.y = 0.04;
    this.ballRing.renderOrder = 2;
    this.scene.add(this.ballRing);

    this.sponge = this.makeSponge();
    this.sponge.visible = false;
    this.scene.add(this.sponge);

    this.cowdie.onStep = () => {
      this.fx.puff(this.cowdie.position.clone().setY(0.08), 1, 0xdff5c8, 0.22);
    };

    this.bindEvents();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(container);
    this.resize();

    const s = useGame.getState();
    this.cowdie.setLevel(levelInfo(s.xp).level, true);
    this.cowdie.setAccessory(s.worn);
    this.cowdie.setSleeping(s.sleeping);
    this.env.snapSleep(s.sleeping ? 1 : 0);
    sfx.setMuted(s.muted);
    this.syncPoops(true);
    if (s.mode === 'play') this.enterMode('play');
    this.lastInteraction = performance.now();

    this.lastFrame = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  // ------------------------------------------------------------------ setup

  private bindEvents() {
    const c = this.canvas;
    const on = (el: HTMLElement | Window, type: string, fn: (e: never) => void, opts?: AddEventListenerOptions) => {
      el.addEventListener(type, fn as unknown as EventListener, opts);
      this.cleanups.push(() => el.removeEventListener(type, fn as unknown as EventListener, opts));
    };
    on(c, 'pointerdown', this.onPointerDown);
    on(window, 'pointermove', this.onPointerMove);
    on(window, 'pointerup', this.onPointerUp);
    on(window, 'pointercancel', this.onPointerUp);
    on(c, 'pointerleave', () => {
      this.ptr.inside = false;
    });
    on(c, 'wheel', this.onWheel, { passive: false });
    on(c, 'contextmenu', (e: Event) => e.preventDefault());

    this.cleanups.push(
      useGame.subscribe((state, prev) => this.onStore(state, prev)),
      bus.on('say', ({ text }) => this.overlay.say(text)),
      bus.on('levelup', ({ level }) => this.onLevelUp(level)),
      bus.on('wake', ({ reason, grumpy }) => this.onWake(reason, grumpy)),
      bus.on('autosleep', () => {
        this.overlay.say('Zzz... I can’t keep my eyes open...', { ms: 3000 });
      }),
    );
  }

  private resize() {
    const w = Math.max(1, this.container.clientWidth);
    const h = Math.max(1, this.container.clientHeight);
    this.width = w;
    this.height = h;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.85 ? 46 : 38;
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.baseDist = aspect < 1.05 ? THREE.MathUtils.clamp(4.7 / (2 * tan * aspect), 8.6, 14) : 8.6;
    this.applyViewOffset();
  }

  setInsets(top: number, bottom: number) {
    this.insetTop = top;
    this.insetBottom = bottom;
    if (!this.insetsReady) {
      this.curTop = top;
      this.curBottom = bottom;
      this.insetsReady = true;
    }
    this.applyViewOffset();
  }

  private applyViewOffset() {
    const shift = THREE.MathUtils.clamp((this.curTop - this.curBottom) / 2, -this.height * 0.3, this.height * 0.25);
    this.camera.setViewOffset(this.width, this.height, 0, -shift, this.width, this.height);
    this.camera.updateProjectionMatrix();
  }

  /** Distance needed so the pet plus its speech bubble fit in the free area between the HUD bars. */
  private fitDist() {
    const avail = Math.max(150, this.height - this.curTop - this.curBottom);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return Math.min((3.15 * this.height) / (2 * tan * avail), this.baseDist * 1.75);
  }

  private makeSponge() {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.2, 0.46, 3, 0.08), new THREE.MeshStandardMaterial({ color: 0xffd84a, roughness: 0.85 }));
    top.position.y = 0.1;
    const bottom = new THREE.Mesh(new RoundedBoxGeometry(0.72, 0.1, 0.46, 3, 0.04), new THREE.MeshStandardMaterial({ color: 0x5fd08a, roughness: 0.9 }));
    bottom.position.y = -0.04;
    const holeMat = new THREE.MeshStandardMaterial({ color: 0xe0b526, roughness: 1 });
    for (let i = 0; i < 7; i++) {
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.035 + (i % 3) * 0.008, 8, 6), holeMat);
      h.scale.y = 0.5;
      h.position.set(-0.26 + (i % 4) * 0.17, 0.2, -0.12 + Math.floor(i / 4) * 0.22 + (i % 2) * 0.05);
      g.add(h);
    }
    g.add(top, bottom);
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : undefined));
    return g;
  }

  private makePoop() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x9c6437, roughness: 0.42 });
    const blob = (sx: number, sy: number, y: number) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), mat);
      m.scale.set(sx, sy, sx);
      m.position.y = y;
      m.castShadow = true;
      g.add(m);
    };
    blob(0.3, 0.19, 0.14);
    blob(0.22, 0.15, 0.32);
    blob(0.13, 0.12, 0.46);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.15, 10), mat);
    tip.position.set(0.02, 0.6, 0);
    tip.rotation.z = -0.35;
    g.add(tip);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x24161a });
    [-1, 1].forEach((s) => {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 6), eyeMat);
      e.position.set(s * 0.09, 0.19, 0.25);
      g.add(e);
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.013, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      sh.position.set(s * 0.09 - 0.01, 0.205, 0.285);
      g.add(sh);
    });
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 6, 12, Math.PI), eyeMat);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, 0.145, 0.275);
    g.add(mouth);
    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 }));
    shine.scale.set(1, 1.8, 0.5);
    shine.position.set(-0.13, 0.35, 0.13);
    g.add(shine);
    return g;
  }

  // ------------------------------------------------------------------ helpers

  private setRay(cx: number, cy: number) {
    const r = this.canvas.getBoundingClientRect();
    this.ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
  }

  private hitPet() {
    const hits = this.raycaster.intersectObjects(this.cowdie.hit, false);
    return hits.length ? hits[0] : null;
  }

  private hitPoop(): PoopObj | null {
    const groups = this.poops.filter((p) => p.removing === 0).map((p) => p.group);
    if (!groups.length) return null;
    const hits = this.raycaster.intersectObjects(groups, true);
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && !groups.includes(o as THREE.Group)) o = o.parent;
    return this.poops.find((p) => p.group === o) ?? null;
  }

  private groundPoint(out: THREE.Vector3) {
    return this.raycaster.ray.intersectPlane(this.groundPlane, out) !== null;
  }

  toScreen(v: THREE.Vector3) {
    const p = this.tmp3.copy(v).project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * this.width, y: (-p.y * 0.5 + 0.5) * this.height };
  }

  private planeAtMouth(out: THREE.Plane) {
    const cam = this.camera.getWorldDirection(this.tmp);
    const mouth = this.cowdie.mouthWorld(this.tmp2);
    return out.setFromNormalAndCoplanarPoint(cam.negate(), mouth);
  }

  private pointerOnMouthPlane(cx: number, cy: number, out: THREE.Vector3) {
    this.setRay(cx, cy);
    const plane = this.planeAtMouth(new THREE.Plane());
    if (!this.raycaster.ray.intersectPlane(plane, out)) out.copy(this.cowdie.mouthWorld());
    return out;
  }

  isStuffed() {
    return useGame.getState().fullness >= STUFFED_AT;
  }

  private markInteraction() {
    this.lastInteraction = performance.now();
    this.idleT = Math.max(this.idleT, 3.5);
  }

  private say(text: string, opts?: Parameters<Overlay['say']>[1]) {
    this.overlay.say(text, opts);
  }

  // ------------------------------------------------------------------ store sync

  private onStore(s: GameState, prev: GameState) {
    if (s.born !== prev.born) this.resetWorld();
    if (s.muted !== prev.muted) sfx.setMuted(s.muted);
    if (s.worn !== prev.worn) {
      this.cowdie.setAccessory(s.worn);
      if (s.worn) {
        sfx.wear();
        this.fx.sparkles(this.cowdie.topWorld(this.tmp).clone(), 10, 0.8);
        this.cowdie.react('nod');
        this.say('Ooh, so fancy!');
      }
    }
    const lv = levelInfo(s.xp).level;
    if (lv !== levelInfo(prev.xp).level) this.cowdie.setLevel(lv);
    if (s.sleeping !== prev.sleeping) {
      if (s.sleeping) this.beginSleep();
      else this.cowdie.setSleeping(false);
    }
    if (s.mode !== prev.mode) this.enterMode(s.mode, prev.mode);
    if (s.poops !== prev.poops) this.syncPoops(false);
  }

  private resetWorld() {
    this.groundFoods.forEach((g) => this.scene.remove(g.mesh));
    this.groundFoods = [];
    if (this.held) this.cancelHeld();
    this.flying && this.scene.remove(this.flying.mesh);
    this.flying = null;
    if (this.eatingMesh) this.eatingMesh.removeFromParent();
    this.eatingMesh = null;
    this.clearSuds();
    this.removeBall();
    this.cowdie.setSleeping(false);
    this.cowdie.setLevel(1);
    this.cowdie.setAccessory(null);
    this.cowdie.position.set(0, 0, 0.5);
    this.env.snapSleep(0);
    this.syncPoops(true);
    this.say('Hello! I’m Cowdie. Moo!');
  }

  private beginSleep() {
    const cow = this.cowdie;
    cow.stopWalking();
    cow.setAnticipation(0);
    cow.react('yawn');
    const spotX = THREE.MathUtils.clamp(cow.position.x, -0.9, 0.9);
    const spotZ = THREE.MathUtils.clamp(cow.position.z, -0.6, 0.9);
    if (Math.hypot(spotX - cow.position.x, spotZ - cow.position.z) > 0.3) cow.walkTo(spotX, spotZ, 1.6);
    this.sleepTimer = 1.5;
    this.say('Yaaawn... night night!', { ms: 2000 });
  }

  private onWake(reason: 'manual' | 'rested' | 'hungry', grumpy: boolean) {
    this.sleepTimer = -1;
    this.cowdie.setSleeping(false);
    this.cowdie.react('stretch');
    sfx.wakeUp();
    if (reason === 'rested') {
      this.say('Good morning! I feel great!');
      this.fx.sparkles(this.cowdie.topWorld(this.tmp).clone(), 8, 0.8);
    } else if (reason === 'hungry') {
      this.say('My tummy woke me up... food?');
      this.cowdie.react('rumble');
    } else if (grumpy) {
      this.say('Five more minutes...');
    } else {
      this.say('Mooorning!');
    }
  }

  private onLevelUp(level: number) {
    this.cowdie.setLevel(level);
    this.cowdie.react('tada');
    sfx.levelUp();
    const top = this.cowdie.topWorld(new THREE.Vector3());
    this.fx.confetti(top.clone().add(new THREE.Vector3(0, 0.3, 0)), 60);
    this.fx.sparkles(top, 14, 1.2);
    window.setTimeout(() => {
      if (!this.disposed) this.say(`I'm level ${level} now! Moo!`, { ms: 3200 });
    }, 700);
  }

  private enterMode(mode: Mode, prev?: Mode) {
    if (prev === 'wash') {
      this.spongeVisible = false;
      this.scrub.active = false;
      this.cowdie.setWashing(false);
      this.popSuds();
    }
    if (prev === 'play') this.removeBall();
    this.canvas.style.cursor = '';
    if (mode === 'wash') {
      if (useGame.getState().sleeping) return;
      this.markInteraction();
      this.cowdie.walkTo(0, 0.9, 1.7);
      this.cowdie.faceYaw = 0;
      this.scrub = {
        progress: 0,
        goalPx: 520 + (100 - useGame.getState().clean) * 9,
        startClean: useGame.getState().clean,
        lastSfx: 0,
        distAcc: 0,
        active: false,
        activeT: 0,
      };
      this.spongeVisible = true;
      this.sponge.visible = true;
      this.spongeTarget.set(0, 1.4, 2);
      this.sponge.position.copy(this.spongeTarget);
      sfx.splash();
      this.say(useGame.getState().clean > 96 ? 'I’m already squeaky, but bubbles are fun!' : 'Bath time! Scrub me!', { ms: 2600 });
    } else if (mode === 'play') {
      this.markInteraction();
      this.spawnBall();
      this.say('A ball! Tap the meadow to throw it!', { ms: 3000 });
    }
  }

  // ------------------------------------------------------------------ pointer input

  private onPointerDown = (e: PointerEvent) => {
    sfx.unlock();
    if (this.ptr.down) return;
    const p = this.ptr;
    p.down = true;
    p.id = e.pointerId;
    p.startX = p.lastX = p.cx = e.clientX;
    p.startY = p.lastY = p.cy = e.clientY;
    p.downT = performance.now();
    p.petDist = 0;
    p.petAcc = 0;
    p.inside = true;
    p.lastMove = performance.now();
    p.mode = 'none';
    this.markInteraction();
    this.setRay(e.clientX, e.clientY);
    const s = useGame.getState();

    const poop = this.hitPoop();
    if (poop && s.mode === 'idle') {
      this.collectPoop(poop);
      p.down = false;
      return;
    }
    const hit = this.hitPet();
    if (s.mode === 'wash' && hit && !s.sleeping) {
      p.mode = 'scrub';
      this.scrub.active = true;
      return;
    }
    if (hit) {
      p.mode = 'pet';
      p.part = (hit.object.userData.part as string) ?? 'body';
      return;
    }
    if (s.mode === 'play' && this.ball) {
      p.mode = 'throw';
      return;
    }
    p.mode = 'orbit';
    this.orbitIdle = 0;
  };

  private onPointerMove = (e: PointerEvent) => {
    const p = this.ptr;
    const overCanvas = e.target === this.canvas;
    if (overCanvas) p.inside = true;
    if (this.held && e.pointerId === this.held.pointerId) {
      this.held.clientX = e.clientX;
      this.held.clientY = e.clientY;
      if (Math.hypot(e.clientX - this.held.startX, e.clientY - this.held.startY) > 8) p.lastMove = performance.now();
      return;
    }
    if (!overCanvas && !p.down) {
      p.inside = false;
      return;
    }
    if (p.down && e.pointerId !== p.id) return;
    const dx = e.clientX - p.lastX;
    const dy = e.clientY - p.lastY;
    const dist = Math.hypot(dx, dy);
    p.lastX = p.cx = e.clientX;
    p.lastY = p.cy = e.clientY;
    p.lastMove = performance.now();
    const s = useGame.getState();

    this.setRay(e.clientX, e.clientY);
    if (!p.down) {
      this.updateHoverCursor(s);
      return;
    }

    if (p.mode === 'throw' && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 12) p.mode = 'orbit';

    if (p.mode === 'orbit') {
      this.camYawT = THREE.MathUtils.clamp(this.camYawT - dx * 0.0045, -0.6, 0.6);
      this.camPitchT = THREE.MathUtils.clamp(this.camPitchT + dy * 0.002, 0.12, 0.5);
      this.orbitIdle = 0;
    } else if (p.mode === 'pet') {
      p.petDist += dist;
      if (p.petDist > 10 && !s.sleeping) {
        const hit = this.hitPet();
        const head = this.cowdie.headWorld(this.tmp2);
        const sc = this.toScreen(head);
        this.cowdie.setPetting(true, THREE.MathUtils.clamp((e.clientX - (this.canvas.getBoundingClientRect().left + sc.x)) / 120, -1, 1));
        if (hit) {
          p.petAcc += dist;
          if (p.petAcc > 150) {
            p.petAcc = 0;
            useGame.getState().adjust({ joy: 1.8 }, 0.4);
            this.fx.hearts(hit.point.clone().add(new THREE.Vector3(0, 0.4, 0.3)), 1, 0.3);
          }
          const now = performance.now();
          if (now - p.lastPurr > 1500) {
            p.lastPurr = now;
            sfx.purr();
            if (Math.random() < 0.35) this.say(pick(LINES.petted), { ms: 1800 });
          }
        }
      }
    } else if (p.mode === 'scrub') {
      const hit = this.hitPet();
      if (hit) this.scrubAt(hit.point, dist);
    }
  };

  private onPointerUp = (e: PointerEvent) => {
    if (this.held && e.pointerId === this.held.pointerId) {
      this.endHeld(e);
      return;
    }
    const p = this.ptr;
    if (!p.down || e.pointerId !== p.id) return;
    p.down = false;
    const now = performance.now();
    const quick = now - p.downT < 420 && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) < 12;
    const s = useGame.getState();
    if (p.mode === 'pet') {
      this.cowdie.setPetting(false);
      if (quick) this.tapPet(p.part);
    } else if (p.mode === 'throw' && quick) {
      this.setRay(e.clientX, e.clientY);
      const target = this.tmp.clone();
      if (this.groundPoint(target)) this.throwBall(target);
    } else if (p.mode === 'scrub') {
      this.scrub.active = false;
    }
    if (s.mode === 'wash') this.scrub.active = false;
    p.mode = 'none';
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.zoomT = THREE.MathUtils.clamp(this.zoomT + e.deltaY * 0.0009, 0.72, 1.2);
    this.orbitIdle = 0;
  };

  private updateHoverCursor(s: GameState) {
    let cursor = '';
    if (this.hitPoop() && s.mode === 'idle') cursor = 'pointer';
    else if (this.hitPet()) cursor = s.mode === 'wash' ? 'grab' : 'pointer';
    else if (s.mode === 'play') cursor = 'crosshair';
    this.canvas.style.cursor = cursor;
    if (s.mode === 'play' && this.ball && !cursor.includes('pointer')) {
      if (this.groundPoint(this.tmp)) {
        this.ballRing.position.set(this.tmp.x, 0.04, this.tmp.z);
        this.ballRingT = Math.max(this.ballRingT, 0.4);
      }
    }
  }

  private tapPet(part: string) {
    const s = useGame.getState();
    const c = this.cowdie;
    const now = performance.now();
    if (s.sleeping) {
      c.react('jiggle');
      this.say('Zzz... (use Wake up to wake me)', { ms: 2200 });
      return;
    }
    switch (part) {
      case 'nose': {
        c.react('boop');
        sfx.boop();
        this.boopTimes = this.boopTimes.filter((t) => now - t < 3000);
        this.boopTimes.push(now);
        s.adjust({ joy: 0.6 });
        c.mouthWorld(this.tmp);
        this.fx.sparkles(this.tmp.clone(), 4, 0.35);
        if (this.boopTimes.length >= 4) {
          this.boopTimes = [];
          c.react('laugh');
          sfx.giggle();
          this.say('Hehehe! Stop, that tickles!');
          s.adjust({ joy: 2 }, 1);
        } else {
          this.say(pick(LINES.boop), { ms: 1200 });
        }
        break;
      }
      case 'ear':
        c.react('earflick');
        sfx.boop();
        s.adjust({ joy: 0.4 });
        this.say('Hey, my ear!', { ms: 1200 });
        break;
      case 'head':
        c.react('nod');
        sfx.purr();
        this.fx.hearts(c.topWorld(this.tmp).clone(), 2, 0.4);
        s.adjust({ joy: 1 }, 0.3);
        break;
      default:
        c.react('laugh');
        sfx.giggle();
        this.fx.hearts(c.bellyWorld(this.tmp).clone().add(new THREE.Vector3(0, 0.5, 0.4)), 2, 0.5);
        s.adjust({ joy: 0.8 }, 0.3);
        break;
    }
  }

  // ------------------------------------------------------------------ feeding

  beginFoodDrag(id: FoodId, e: { pointerId: number; clientX: number; clientY: number }): boolean {
    sfx.unlock();
    const s = useGame.getState();
    if (s.sleeping) {
      this.say('Shh... Cowdie is sleeping.', { ms: 1800 });
      return false;
    }
    if (this.cowdie.isBusy || this.held || this.flying || this.eatingMesh) {
      this.say('One bite at a time!', { ms: 1200 });
      return false;
    }
    this.markInteraction();
    const mesh = makeFood(id);
    mesh.scale.setScalar(1.15);
    const start = this.pointerOnMouthPlane(e.clientX, e.clientY, new THREE.Vector3());
    mesh.position.copy(start);
    this.scene.add(mesh);
    this.held = {
      id,
      mesh,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      clientX: e.clientX,
      clientY: e.clientY,
      t0: performance.now(),
      target: start.clone(),
      refused: false,
    };
    sfx.pop(1.3);
    return true;
  }

  private cancelHeld() {
    if (!this.held) return;
    this.scene.remove(this.held.mesh);
    this.held = null;
    this.cowdie.setAnticipation(0);
  }

  private endHeld(e: PointerEvent) {
    const h = this.held;
    if (!h) return;
    this.held = null;
    this.cowdie.setAnticipation(0);
    const moved = Math.hypot(e.clientX - h.startX, e.clientY - h.startY) > 12;
    const quick = performance.now() - h.t0 < 450;
    const mouth = this.cowdie.mouthWorld(this.tmp2);
    const near = h.mesh.position.distanceTo(mouth) < 1.25 * this.cowdie.scale + 0.15;

    if (!moved && quick) {
      this.launch(h.id, h.mesh, 0.75);
    } else if (near) {
      this.launch(h.id, h.mesh, 0.18);
    } else {
      this.dropFood(h.id, h.mesh);
    }
  }

  /** Tap / keyboard path: food flies from the bottom of the screen to Cowdie's mouth. */
  feedNow(id: FoodId): boolean {
    sfx.unlock();
    const s = useGame.getState();
    if (s.sleeping) {
      this.say('Shh... Cowdie is sleeping.', { ms: 1800 });
      return false;
    }
    if (this.cowdie.isBusy || this.held || this.flying || this.eatingMesh) {
      this.say('One bite at a time!', { ms: 1200 });
      return false;
    }
    this.markInteraction();
    const mesh = makeFood(id);
    mesh.scale.setScalar(1.15);
    const rect = this.canvas.getBoundingClientRect();
    const start = this.pointerOnMouthPlane(rect.left + rect.width * 0.5, rect.top + rect.height * 0.92, new THREE.Vector3());
    mesh.position.copy(start);
    this.scene.add(mesh);
    sfx.pop(1.3);
    this.launch(id, mesh, 0.8);
    return true;
  }

  private launch(id: FoodId, mesh: THREE.Group, dur: number) {
    if (this.isStuffed()) {
      this.refuseFood(mesh);
      return;
    }
    const from = mesh.position.clone();
    const mouth = this.cowdie.mouthWorld(new THREE.Vector3());
    const ctrl = from.clone().lerp(mouth, 0.5).add(new THREE.Vector3(0, 1.2 + from.distanceTo(mouth) * 0.15, 0));
    this.flying = { id, mesh, from, ctrl, t: 0, dur };
    sfx.whoosh();
  }

  private refuseFood(mesh: THREE.Group) {
    this.cowdie.refuse();
    this.cowdie.react('shake');
    const now = performance.now();
    if (now - this.stuffedSayAt > 1200) {
      this.stuffedSayAt = now;
      this.say(pick(LINES.stuffed), { ms: 2000 });
    }
    this.fx.puff(mesh.position.clone(), 5, 0xffffff, 0.4);
    this.scene.remove(mesh);
  }

  private dropFood(id: FoodId, mesh: THREE.Group) {
    if (this.groundFoods.length >= 3) {
      const old = this.groundFoods.shift()!;
      this.scene.remove(old.mesh);
    }
    this.groundFoods.push({ id, mesh, vel: new THREE.Vector3(0, 0, 0), resting: false, age: 0, claimed: false });
  }

  private beginEat(id: FoodId, mesh: THREE.Group) {
    const def = FOOD_BY_ID[id];
    const loved = useGame.getState().favorite === id;
    this.eatingMesh = mesh;
    this.eatingId = id;
    this.eatChewProgress = 0;
    this.eatIntro = 0;
    this.cowdie.mouthAnchor.attach(mesh);
    useGame.getState().setEating(true);
    const sound = id === 'apple' || id === 'cookie' ? 'crunch' : id === 'milk' ? 'slurp' : 'munch';
    const total = def.chews;
    this.cowdie.eat({
      chews: total,
      sound,
      loved,
      spicy: id === 'chili',
      milk: id === 'milk',
      onChew: (i) => {
        this.eatChewProgress = i / total;
        if (sound === 'crunch') sfx.crunch();
        else if (sound === 'slurp') sfx.slurp();
        else sfx.munch();
        const mouth = this.cowdie.mouthWorld(this.tmp);
        this.fx.crumbs(mouth.clone(), id === 'milk' ? 3 : 7, foodCrumbColor(id));
        if (id === 'cookie' && i % 2 === 0) this.fx.sparkles(mouth.clone(), 3, 0.5);
        this.cowdie.react('jiggle');
      },
      onSwallow: () => this.onSwallow(id, loved),
      onDone: () => {
        useGame.getState().setEating(false);
        this.eatingMesh = null;
        this.eatingId = null;
        this.markInteraction();
      },
    });
  }

  private onSwallow(id: FoodId, loved: boolean) {
    if (this.eatingMesh) {
      this.eatingMesh.removeFromParent();
      this.eatingMesh.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
    }
    const out = useGame.getState().eatFood(id);
    const mouth = this.cowdie.mouthWorld(new THREE.Vector3());
    const sc = this.toScreen(mouth);
    let delay = 0;
    if (out.delta.fullness > 0) {
      this.overlay.float(`+${out.delta.fullness} Belly`, sc.x, sc.y - 30, 'belly', delay);
      delay += 160;
    }
    if (out.delta.joy > 0) {
      this.overlay.float(`+${out.delta.joy} Joy`, sc.x + 34, sc.y - 30, 'joy', delay);
      delay += 160;
    }
    if (out.delta.energy > 0) this.overlay.float(`+${out.delta.energy} Energy`, sc.x - 34, sc.y - 30, 'energy', delay);
    this.overlay.float(`+${Math.round(out.xp)} XP`, sc.x, sc.y - 70, 'xp', 380);

    this.fx.sparkles(mouth.clone().add(new THREE.Vector3(0, 0.3, 0)), loved ? 12 : 5, 0.7);
    if (loved) {
      sfx.sparkle();
      this.fx.hearts(mouth.clone().add(new THREE.Vector3(0, 0.6, 0)), 6, 0.9);
      this.say(pick(LINES.loved), { ms: 2600 });
      window.setTimeout(() => !this.disposed && sfx.giggle(), 300);
    } else {
      sfx.pop(1.2);
      if (id === 'chili') {
        sfx.spicy();
        this.say(pick(LINES.chili), { ms: 2600 });
      } else if (id === 'milk') {
        this.say(pick(LINES.milk), { ms: 2400 });
      } else if (id === 'cookie') {
        this.say(pick(LINES.cookie), { ms: 2200 });
      } else {
        this.say(Math.random() < 0.5 ? pick(LINES[id === 'apple' ? 'apple' : 'grass']) : pick(LINES.eat), { ms: 2200 });
      }
      if (id === 'cookie') window.setTimeout(() => !this.disposed && this.cowdie.react('hop'), 350);
    }
  }

  private updateFoods(dt: number) {
    const cow = this.cowdie;

    // held
    const h = this.held;
    if (h) {
      const target = this.pointerOnMouthPlane(h.clientX, h.clientY, h.target);
      h.mesh.position.lerp(target, 1 - Math.exp(-22 * dt));
      h.mesh.rotation.y += dt * 1.4;
      h.mesh.rotation.z = Math.sin(this.time * 6) * 0.12;
      const mouth = cow.mouthWorld(this.tmp2);
      const d = h.mesh.position.distanceTo(mouth);
      const stuffed = this.isStuffed();
      const a = smoothstep(2.9 * cow.scale, 0.9 * cow.scale, d);
      cow.setAnticipation(stuffed ? 0 : a);
      if (stuffed && d < 1.3 * cow.scale && !h.refused) {
        h.refused = true;
        cow.refuse();
        const now = performance.now();
        if (now - this.stuffedSayAt > 1200) {
          this.stuffedSayAt = now;
          this.say(pick(LINES.stuffed), { ms: 2000 });
        }
      }
      if (d > 2.4 * cow.scale) h.refused = false;
    }

    // flying
    const f = this.flying;
    if (f) {
      f.t += dt;
      const u = Math.min(1, f.t / f.dur);
      const e = u * u * (3 - 2 * u);
      const mouth = cow.mouthWorld(this.tmp2);
      const a = f.from;
      const c = f.ctrl;
      const p = f.mesh.position;
      p.set(
        (1 - e) * (1 - e) * a.x + 2 * (1 - e) * e * c.x + e * e * mouth.x,
        (1 - e) * (1 - e) * a.y + 2 * (1 - e) * e * c.y + e * e * mouth.y,
        (1 - e) * (1 - e) * a.z + 2 * (1 - e) * e * c.z + e * e * mouth.z,
      );
      f.mesh.rotation.y += dt * 8;
      cow.setAnticipation(smoothstep(0.1, 0.8, u));
      if (u >= 1) {
        this.flying = null;
        cow.setAnticipation(0);
        this.beginEat(f.id, f.mesh);
      }
    } else if (!this.held) {
      cow.setAnticipation(0);
    }

    // eating mesh follows the mouth
    if (this.eatingMesh && this.eatingId) {
      this.eatIntro = Math.min(1, this.eatIntro + dt * 5);
      const m = this.eatingMesh;
      const e = 1 - Math.pow(1 - this.eatIntro, 3);
      const milk = this.eatingId === 'milk';
      const targetPos = milk ? this.tmp.set(0.02, 0.1, 0.1) : this.tmp.set(0, 0.03, 0.08);
      m.position.lerp(targetPos, e * 0.4 + 0.02);
      const shrink = 1 - this.eatChewProgress * 0.78;
      const baseScale = milk ? 0.95 : 0.85;
      m.scale.setScalar(THREE.MathUtils.lerp(m.scale.x, baseScale * shrink, 0.25));
      m.rotation.x += (0 - m.rotation.x) * 0.2;
      m.rotation.y += (0 - m.rotation.y) * 0.2;
      m.rotation.z += ((milk ? -1.15 : 0) - m.rotation.z) * 0.2;
    }

    // ground food
    for (let i = this.groundFoods.length - 1; i >= 0; i--) {
      const g = this.groundFoods[i];
      g.age += dt;
      const p = g.mesh.position;
      if (!g.resting) {
        g.vel.y -= 16 * dt;
        p.addScaledVector(g.vel, dt);
        g.mesh.rotation.y += dt * 4;
        if (p.y <= 0.32) {
          p.y = 0.32;
          if (Math.abs(g.vel.y) > 1.4) {
            g.vel.y = -g.vel.y * 0.4;
            g.vel.x *= 0.6;
            g.vel.z *= 0.6;
          } else {
            g.resting = true;
            g.age = 0;
          }
        }
        const r = Math.hypot(p.x, p.z);
        if (r > ISLAND_RADIUS - 0.8) {
          p.x *= (ISLAND_RADIUS - 0.8) / r;
          p.z *= (ISLAND_RADIUS - 0.8) / r;
        }
      }
      if (g.resting && !g.claimed && !this.isStuffed() && !cow.isBusy && !cow.isSleeping && !this.flying && !this.held && !this.eatingMesh) {
        g.claimed = true;
        const dx = p.x - cow.position.x;
        const dz = p.z - cow.position.z;
        const d = Math.hypot(dx, dz) || 1;
        const stand = 0.95 * cow.scale;
        cow.walkTo(p.x - (dx / d) * stand, p.z - (dz / d) * stand, 1.9);
      }
      if (g.claimed && g.resting) {
        const dx = p.x - cow.position.x;
        const dz = p.z - cow.position.z;
        const d = Math.hypot(dx, dz);
        if (!cow.isWalking && d < 1.5 * cow.scale && !cow.isBusy && !this.eatingMesh && !this.flying) {
          this.groundFoods.splice(i, 1);
          this.flying = { id: g.id, mesh: g.mesh, from: p.clone(), ctrl: p.clone().add(new THREE.Vector3(0, 1.1, 0)), t: 0, dur: 0.45 };
          continue;
        }
      }
      if (g.resting && (g.age > 14 || (this.isStuffed() && g.age > 5))) {
        this.fx.puff(p.clone(), 4, 0xffffff, 0.3);
        this.scene.remove(g.mesh);
        this.groundFoods.splice(i, 1);
      }
    }
  }

  // ------------------------------------------------------------------ poop

  private syncPoops(instant: boolean) {
    const target = useGame.getState().poops;
    const active = this.poops.filter((p) => p.removing === 0);
    if (instant) {
      this.poops.forEach((p) => this.scene.remove(p.group));
      this.poops = [];
    }
    let count = instant ? 0 : active.length;
    while (count < target) {
      this.spawnPoop(instant);
      count++;
    }
    while (count > target) {
      const p = this.poops.filter((x) => x.removing === 0).pop();
      if (!p) break;
      p.removing = 0.001;
      count--;
    }
  }

  private spawnPoop(instant: boolean) {
    const cow = this.cowdie;
    const g = this.makePoop();
    let x: number;
    let z: number;
    if (instant) {
      const a = rand(0, Math.PI * 2);
      const r = rand(1.5, 4);
      x = Math.cos(a) * r;
      z = Math.sin(a) * r * 0.8 + 0.5;
    } else {
      const back = 0.95 * cow.scale;
      x = cow.position.x - Math.sin(cow.yaw) * back + rand(-0.3, 0.3);
      z = cow.position.z - Math.cos(cow.yaw) * back + rand(-0.3, 0.3);
    }
    const r = Math.hypot(x, z);
    const maxR = ISLAND_RADIUS - 1.1;
    if (r > maxR) {
      x *= maxR / r;
      z *= maxR / r;
    }
    g.position.set(x, 0, z);
    g.rotation.y = rand(-0.5, 0.5);
    g.scale.setScalar(instant ? 1 : 0.01);
    this.scene.add(g);
    this.poops.push({ group: g, t: instant ? 1 : 0, stinkT: rand(0.5, 1.5), removing: 0 });
    if (!instant) {
      sfx.plop();
      this.fx.puff(new THREE.Vector3(x, 0.2, z), 4, 0xd9b48a, 0.3);
      cow.react('flinch');
      this.say(pick(['Oops!', 'Excuse me!', 'Ehehe... sorry!', 'Nature called!']), { ms: 1800 });
    }
  }

  private collectPoop(p: PoopObj) {
    if (p.removing > 0) return;
    p.removing = 0.001;
    const pos = p.group.position.clone().add(new THREE.Vector3(0, 0.3, 0));
    sfx.pop(1.1);
    this.fx.sparkles(pos, 8, 0.5, 0xbff6ff);
    this.fx.bubbles(pos, 4, 0.4);
    const sc = this.toScreen(pos);
    this.overlay.float('+Fresh', sc.x, sc.y - 20, 'fresh');
    const s = useGame.getState();
    s.removePoop();
    s.adjust({ clean: 6, joy: 1.5 }, 2);
    this.markInteraction();
  }

  private updatePoops(dt: number) {
    for (let i = this.poops.length - 1; i >= 0; i--) {
      const p = this.poops[i];
      if (p.removing > 0) {
        p.removing += dt * 4;
        const s = Math.max(0, 1 - p.removing);
        p.group.scale.setScalar(s * (1 + p.removing * 0.6));
        if (s <= 0) {
          this.scene.remove(p.group);
          this.poops.splice(i, 1);
        }
        continue;
      }
      if (p.t < 1) {
        p.t = Math.min(1, p.t + dt * 3);
        const e = p.t;
        const bounce = 1 + Math.sin(e * Math.PI * 2.5) * 0.25 * (1 - e);
        p.group.scale.setScalar(e * bounce);
      }
      p.stinkT -= dt;
      if (p.stinkT <= 0) {
        p.stinkT = rand(0.9, 1.6);
        this.fx.stink(p.group.position.clone().add(new THREE.Vector3(rand(-0.15, 0.15), 0.75, 0)));
      }
    }
    if (useGame.getState().poops >= 2 && performance.now() - this.hintPoopSay > 50000 && !this.overlay.isSpeaking && !this.cowdie.isSleeping) {
      this.hintPoopSay = performance.now();
      this.say('Uh oh, there are little messes! Tap them to clean.', { ms: 3200 });
    }
  }

  // ------------------------------------------------------------------ wash

  private scrubAt(point: THREE.Vector3, distPx: number) {
    const s = useGame.getState();
    if (s.sleeping) return;
    const sc = this.scrub;
    sc.active = true;
    sc.activeT = 0.25;
    sc.progress = Math.min(1, sc.progress + distPx / sc.goalPx);
    sc.distAcc += distPx;
    this.spongeTarget.copy(point);
    s.setWashProgress(sc.progress);
    const wantClean = sc.startClean + (100 - sc.startClean) * sc.progress;
    if (wantClean > s.clean) s.adjust({ clean: wantClean - s.clean });

    if (Math.random() < Math.min(0.9, distPx * 0.03)) this.fx.bubbles(point.clone().add(new THREE.Vector3(0, 0.2, 0.2)), 1, 0.25);
    const now = performance.now();
    if (now - sc.lastSfx > 140) {
      sc.lastSfx = now;
      sfx.scrub();
      if (Math.random() < 0.3) sfx.bubble();
    }
    if (sc.distAcc > 38 && this.suds.length < 46) {
      sc.distAcc = 0;
      this.addSud(point);
    }
    if (sc.progress >= 1) this.finishWash();
  }

  private addSud(point: THREE.Vector3) {
    const cow = this.cowdie;
    const local = cow.root.worldToLocal(point.clone());
    const r = rand(0.07, 0.15);
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, transparent: true, opacity: 0.96 }));
    m.position.copy(local).add(new THREE.Vector3(rand(-0.06, 0.06), rand(0.0, 0.08), rand(-0.02, 0.1)));
    m.scale.setScalar(0.001);
    cow.root.add(m);
    this.suds.push({ mesh: m, t: 0, target: r / Math.max(0.6, cow.scale) });
  }

  private clearSuds() {
    this.suds.forEach((s) => s.mesh.removeFromParent());
    this.suds = [];
  }

  private popSuds() {
    this.suds.forEach((s, i) => {
      const pos = s.mesh.getWorldPosition(new THREE.Vector3());
      if (i % 2 === 0) this.fx.bubbles(pos, 1, 0.2);
      s.mesh.removeFromParent();
    });
    if (this.suds.length) sfx.splash();
    this.suds = [];
  }

  private finishWash() {
    const s = useGame.getState();
    const sc = this.scrub;
    const worth = sc.startClean < 90;
    sc.active = false;
    s.adjust({ clean: 100 - s.clean, joy: worth ? 8 : 3 }, worth ? 10 : 2);
    this.popSuds();
    this.cowdie.react('wiggle');
    sfx.sparkle();
    this.fx.sparkles(this.cowdie.topWorld(new THREE.Vector3()), 16, 1.3, 0xbff6ff);
    this.fx.hearts(this.cowdie.topWorld(new THREE.Vector3()), 4, 0.8);
    this.say('Squeaky clean! Thank you!', { ms: 2800 });
    s.setMode('idle');
  }

  private updateWash(dt: number) {
    const s = useGame.getState();
    const sp = this.sponge;
    sp.visible = this.spongeVisible;
    if (!this.spongeVisible) return;
    const p = this.ptr;
    if (!s.sleeping) {
      this.setRay(p.cx, p.cy);
      const hit = this.hitPet();
      if (hit && (p.inside || p.down)) {
        const n = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 0, 1);
        this.spongeTarget.copy(hit.point).addScaledVector(n, 0.24);
        if (!p.down) this.cowdie.setWashing(false);
      } else if (p.inside || p.down) {
        const plane = this.planeAtMouth(new THREE.Plane());
        const pt = new THREE.Vector3();
        if (this.raycaster.ray.intersectPlane(plane, pt)) this.spongeTarget.copy(pt).add(new THREE.Vector3(0, 0, 0.8));
      }
    }
    sp.position.lerp(this.spongeTarget, 1 - Math.exp(-18 * dt));
    const wiggle = this.scrub.active ? Math.sin(this.time * 30) * 0.22 : 0;
    sp.rotation.set(-0.35 + wiggle * 0.3, Math.sin(this.time * 1.5) * 0.1, wiggle);
    this.scrub.activeT -= dt;
    const scrubbing = this.scrub.active && this.scrub.activeT > 0;
    this.cowdie.setWashing(scrubbing);

    this.suds.forEach((sud) => {
      sud.t = Math.min(1, sud.t + dt * 5);
      const e = 1 - Math.pow(1 - sud.t, 3);
      sud.mesh.scale.setScalar(sud.target * e * (1 + Math.sin(this.time * 3 + sud.target * 40) * 0.04));
    });
  }

  // ------------------------------------------------------------------ play / ball

  private spawnBall() {
    if (this.ball) return;
    const tex = ballTexture();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 18), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4 }));
    mesh.castShadow = true;
    const pos = new THREE.Vector3(rand(-1.2, 1.2), 4, 2.2);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.ball = { mesh, pos, vel: new THREE.Vector3(0, 0, 0), radius: 0.3, lastKick: 0, lastBounce: 0, idle: 0, scale: 0.01, kicks: 0 };
    this.playKickCount = 0;
    useGame.getState().setBallActive(true);
  }

  private removeBall() {
    if (!this.ball) return;
    this.fx.puff(this.ball.pos.clone(), 5, 0xffffff, 0.4);
    this.scene.remove(this.ball.mesh);
    this.ball = null;
    useGame.getState().setBallActive(false);
  }

  private throwBall(target: THREE.Vector3) {
    const b = this.ball;
    if (!b) return;
    const r = Math.hypot(target.x, target.z);
    const maxR = ISLAND_RADIUS - 1.2;
    if (r > maxR) {
      target.x *= maxR / r;
      target.z *= maxR / r;
    }
    const T = 0.85;
    const g = 16;
    b.vel.set((target.x - b.pos.x) / T, (b.radius - b.pos.y + 0.5 * g * T * T) / T, (target.z - b.pos.z) / T);
    b.idle = 0;
    sfx.whoosh();
    this.ballRing.position.set(target.x, 0.04, target.z);
    this.ballRingT = 1;
    this.markInteraction();
  }

  private updateBall(dt: number) {
    const b = this.ball;
    const ring = this.ballRing.material as THREE.MeshBasicMaterial;
    if (this.ballRingT > 0) {
      this.ballRingT -= dt * 1.4;
      ring.opacity = Math.max(0, Math.min(0.9, this.ballRingT)) * 0.9;
      const sc = 1 + (1 - Math.min(1, this.ballRingT)) * 0.5;
      this.ballRing.scale.setScalar(sc);
    } else {
      ring.opacity = 0;
    }
    if (!b) return;
    b.scale = Math.min(1, b.scale + dt * 4);
    b.mesh.scale.setScalar(b.scale);
    const steps = 2;
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      b.vel.y -= 16 * h;
      b.pos.addScaledVector(b.vel, h);
      if (b.pos.y < b.radius) {
        b.pos.y = b.radius;
        if (b.vel.y < -1.2) {
          const now = performance.now();
          if (now - b.lastBounce > 90) {
            b.lastBounce = now;
            sfx.bounce();
          }
          b.vel.y = -b.vel.y * 0.6;
        } else b.vel.y = 0;
        const fr = Math.max(0, 1 - 1.6 * h);
        b.vel.x *= fr;
        b.vel.z *= fr;
      }
      const r = Math.hypot(b.pos.x, b.pos.z);
      const maxR = ISLAND_RADIUS - 0.9;
      if (r > maxR) {
        const nx = b.pos.x / r;
        const nz = b.pos.z / r;
        b.pos.x = nx * maxR;
        b.pos.z = nz * maxR;
        const vn = b.vel.x * nx + b.vel.z * nz;
        if (vn > 0) {
          b.vel.x -= 1.7 * vn * nx;
          b.vel.z -= 1.7 * vn * nz;
        }
      }
    }
    b.mesh.position.copy(b.pos);
    const speed = Math.hypot(b.vel.x, b.vel.z);
    if (speed > 0.05 && b.pos.y <= b.radius + 0.02) {
      const axis = this.tmp.set(b.vel.z, 0, -b.vel.x).normalize();
      b.mesh.rotateOnWorldAxis(axis, (speed / b.radius) * dt);
    } else if (speed > 0.05) {
      b.mesh.rotation.x += dt * 4;
    }

    const s = useGame.getState();
    const cow = this.cowdie;
    if (s.mode !== 'play' || cow.isSleeping) return;
    if (s.energy < 12) {
      this.say('Too sleepy to play... let me rest.', { ms: 2600 });
      cow.react('yawn');
      s.setMode('idle');
      return;
    }
    const dx = b.pos.x - cow.position.x;
    const dz = b.pos.z - cow.position.z;
    const d = Math.hypot(dx, dz);
    const reach = 1.2 * cow.scale;
    if (d > reach && !cow.isEating) {
      const ahead = this.tmp2.set(b.pos.x + b.vel.x * 0.25, 0, b.pos.z + b.vel.z * 0.25);
      cow.walkTo(THREE.MathUtils.clamp(ahead.x, -5, 5), THREE.MathUtils.clamp(ahead.z, -4, 4.6), 3.1);
    } else if (b.pos.y < 1.0) {
      const now = performance.now();
      if (now - b.lastKick > 800) {
        b.lastKick = now;
        b.kicks += 1;
        this.playKickCount += 1;
        const ang = Math.atan2(dx, dz) + rand(-0.9, 0.9);
        const spd = rand(5, 8.5);
        b.vel.set(Math.sin(ang) * spd, rand(4.2, 6.5), Math.cos(ang) * spd);
        cow.react('kick');
        sfx.kick();
        this.fx.sparkles(b.pos.clone(), 4, 0.4);
        this.fx.hearts(cow.topWorld(this.tmp).clone(), 1, 0.4);
        s.adjust({ joy: 2.4, energy: -1.4 }, 1);
        if (this.playKickCount % 3 === 0) {
          const sc = this.toScreen(cow.topWorld(this.tmp));
          this.overlay.float('+Joy', sc.x, sc.y - 10, 'joy');
          this.say(pick(['Wheee!', 'Got it!', 'Again! Again!', 'Moo-tastic!']), { ms: 1400 });
          cow.react('hop');
        }
      }
    }
    b.idle += dt;
    if (b.idle > 60) {
      this.say('That was fun! Let’s rest a bit.', { ms: 2500 });
      s.setMode('idle');
    }
  }

  // ------------------------------------------------------------------ brain

  private wander() {
    const cow = this.cowdie;
    for (let tries = 0; tries < 8; tries++) {
      const x = rand(WALK_BOUNDS.minX, WALK_BOUNDS.maxX);
      const z = rand(WALK_BOUNDS.minZ, WALK_BOUNDS.maxZ);
      if (x > 3.4 && z < -0.8) continue;
      if (Math.hypot(x - cow.position.x, z - cow.position.z) < 1.4) continue;
      cow.walkTo(x, z, rand(1.0, 1.5));
      cow.faceYaw = rand(-0.5, 0.5);
      return;
    }
  }

  private tickBrain(dt: number) {
    const s = useGame.getState();
    const cow = this.cowdie;
    const now = performance.now();

    if (this.sleepTimer >= 0 && !cow.isWalking) {
      this.sleepTimer -= dt;
      if (this.sleepTimer < 0 && s.sleeping) cow.setSleeping(true);
    }

    const mood = getMood(s, s.sleeping);
    cow.setMood(mood);
    cow.setStats({ fullness: s.fullness, clean: s.clean });

    const busy =
      cow.isBusy ||
      this.held !== null ||
      this.flying !== null ||
      this.eatingMesh !== null ||
      s.sleeping ||
      s.mode !== 'idle' ||
      this.groundFoods.some((g) => g.claimed) ||
      now - this.lastInteraction < 2200 ||
      this.ptr.down;

    if (!busy && !cow.isWalking) {
      this.idleT -= dt;
      if (this.idleT <= 0) {
        this.idleT = rand(4.5, 9.5);
        const r = Math.random();
        if (r < 0.4) this.wander();
        else if (r < 0.55) {
          this.lookUntil = now + 2400;
          this.lookPoint.set(rand(-4, 4), rand(0.4, 3), rand(-1, 3));
        } else if (r < 0.65) {
          cow.react('hop');
          sfx.boing();
        } else if (r < 0.78) {
          sfx.moo(mood === 'happy' ? 1.25 : 1.0, 0.95, 0.3);
          cow.react('nod');
          this.say(pick(LINES.idle), { ms: 1500 });
        } else if (r < 0.88 && s.energy < 65) {
          cow.react('yawn');
        } else if (mood === 'happy') {
          cow.react('wiggle');
          sfx.giggle();
        } else {
          cow.react('earflick');
        }
      }
      this.chatterT -= dt;
      if (this.chatterT <= 0) {
        this.chatterT = rand(22, 36);
        this.moodChatter(mood);
      }
    }

    // gaze
    let look: THREE.Vector3 | null = null;
    if (this.held) look = this.held.mesh.position;
    else if (this.flying) look = this.flying.mesh.position;
    else if (this.groundFoods.find((g) => g.claimed)) look = this.groundFoods.find((g) => g.claimed)!.mesh.position;
    else if (s.mode === 'play' && this.ball) look = this.ball.pos;
    else if (s.sleeping) look = null;
    else if (s.mode === 'wash' || this.ptr.mode === 'pet' || (this.ptr.inside && now - this.ptr.lastMove < 4500)) {
      this.setRay(this.ptr.cx, this.ptr.cy);
      const head = cow.headWorld(this.tmp2);
      const dist = this.camera.position.distanceTo(head);
      look = this.raycaster.ray.at(dist, this.tmp3.clone());
    } else if (now < this.lookUntil) look = this.lookPoint;
    else if (mood === 'hungry' || mood === 'sad') look = null;
    else look = this.tmp3.copy(this.camera.position).setY(this.camera.position.y - 0.6);
    cow.lookAt(look);

    const chasing = s.mode === 'play' && this.ball !== null && !s.sleeping;
    const fetching = this.groundFoods.some((g) => g.claimed);
    cow.setExcited(chasing ? 1 : fetching ? 0.6 : 0);
  }

  private moodChatter(mood: ReturnType<typeof getMood>) {
    if (this.overlay.isSpeaking) return;
    const s = useGame.getState();
    const now = performance.now();
    if (now - this.lastMoodSay < 12000) return;
    const cow = this.cowdie;
    const fav = s.favoriteKnown ? s.favorite : 'apple';
    switch (mood) {
      case 'hungry':
        this.lastMoodSay = now;
        this.say(pick(LINES.hungry), { thought: true, icon: this.thumbs[fav] || undefined, ms: 3600 });
        cow.react('rumble');
        break;
      case 'sad':
        this.lastMoodSay = now;
        this.say(pick(LINES.sad), { thought: true, ms: 3400 });
        break;
      case 'dirty':
        this.lastMoodSay = now;
        this.say(pick(LINES.dirty), { thought: true, ms: 3400 });
        break;
      case 'sleepy':
        this.lastMoodSay = now;
        this.say(pick(LINES.sleepy), { thought: true, ms: 3200 });
        cow.react('yawn');
        break;
      case 'happy':
        this.lastMoodSay = now;
        this.say(pick(LINES.happy), { ms: 2400 });
        this.fx.hearts(cow.topWorld(this.tmp).clone(), 3, 0.6);
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------------ frame

  private frame = (t: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.frame);
    const dt = Math.min(0.05, Math.max(0.001, (t - this.lastFrame) / 1000));
    this.lastFrame = t;
    if (this.timeScale > 0) this.step(dt * this.timeScale);
    this.renderer.render(this.scene, this.camera);
  };

  step(dt: number) {
    this.time += dt;
    this.tickBrain(dt);
    this.updateFoods(dt);
    this.updateBall(dt);
    this.updatePoops(dt);
    this.updateWash(dt);
    this.cowdie.update(dt);
    this.clampCow();
    this.env.update(dt, useGame.getState().sleeping ? 1 : 0);
    this.fx.update(dt);
    this.updateCamera(dt);

    const top = this.cowdie.topWorld(this.tmp);
    const sc = this.toScreen(top);
    this.overlay.setAnchor(sc.x, Math.max(90, sc.y - 8));
  }

  private clampCow() {
    const p = this.cowdie.position;
    const r = Math.hypot(p.x, p.z);
    const maxR = ISLAND_RADIUS - 1.5;
    if (r > maxR) {
      p.x *= maxR / r;
      p.z *= maxR / r;
    }
  }

  private updateCamera(dt: number) {
    this.orbitIdle += dt;
    if (!this.ptr.down && this.orbitIdle > 5) {
      this.camYawT *= 1 - Math.min(1, dt * 0.6);
      this.camPitchT += (0.26 - this.camPitchT) * Math.min(1, dt * 0.6);
      this.zoomT += (1 - this.zoomT) * Math.min(1, dt * 0.5);
    }
    const k = 1 - Math.exp(-6 * dt);
    this.camYaw += (this.camYawT - this.camYaw) * k;
    this.camPitch += (this.camPitchT - this.camPitch) * k;
    this.zoom += (this.zoomT - this.zoom) * k;

    const px = this.ptr.inside ? this.ndc.x : 0;
    const py = this.ptr.inside ? this.ndc.y : 0;
    const yaw = this.camYaw + px * 0.035;
    const pitch = this.camPitch - py * 0.012;
    const ik = 1 - Math.exp(-7 * dt);
    const dT = this.insetTop - this.curTop;
    const dB = this.insetBottom - this.curBottom;
    if (Math.abs(dT) > 0.2 || Math.abs(dB) > 0.2) {
      this.curTop += dT * ik;
      this.curBottom += dB * ik;
      this.applyViewOffset();
    }
    const dist = Math.max(this.baseDist, this.fitDist()) * this.zoom;
    this.camTarget.set(0, 0.95, 0.35);
    this.camera.position.set(
      this.camTarget.x + Math.sin(yaw) * Math.cos(pitch) * dist,
      this.camTarget.y + Math.sin(pitch) * dist,
      this.camTarget.z + Math.cos(yaw) * Math.cos(pitch) * dist,
    );
    this.camera.lookAt(this.camTarget);
    this.camera.updateMatrixWorld();
  }

  // ------------------------------------------------------------------ debug / test hooks

  debug() {
    const cow = this.cowdie;
    const rect = this.canvas.getBoundingClientRect();
    const at = (v: THREE.Vector3) => {
      const s = this.toScreen(v);
      return { x: rect.left + s.x, y: rect.top + s.y };
    };
    return {
      mouth: at(cow.mouthWorld(new THREE.Vector3())),
      head: at(cow.headWorld(new THREE.Vector3())),
      top: at(cow.topWorld(new THREE.Vector3())),
      belly: at(cow.bellyWorld(new THREE.Vector3())),
      poops: this.poops.filter((p) => p.removing === 0).map((p) => at(p.group.position.clone().add(new THREE.Vector3(0, 0.3, 0)))),
      ball: this.ball ? at(this.ball.pos) : null,
      eating: cow.isEating,
      sleeping: cow.isSleeping,
      walking: cow.isWalking,
      speech: this.overlay.text,
      groundFoods: this.groundFoods.length,
      chew: this.eatChewProgress,
    };
  }

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObs.disconnect();
    this.cleanups.forEach((c) => c());
    this.overlay.dispose();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
