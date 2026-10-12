import * as THREE from 'three';
import { World } from './world';
import { Cow, wrapAngle, type Expression } from './cow';
import { Particles } from './particles';
import { Sfx } from './audio';
import { UI } from './ui';
import { FOODS, FOOD_REST_Y, buildFoodMesh, foodById, type FoodDef, type FoodId } from './foods';
import { beachBallTexture, toon } from './textures';
import {
  applyDecay,
  clamp,
  loadSave,
  moodOf,
  persist,
  stageFor,
  wipeSave,
  xpForLevel,
  type SaveData,
  type StatKey,
} from './state';

type FoodState = 'held' | 'air' | 'ground' | 'eaten';

interface FoodItem {
  def: FoodDef;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  state: FoodState;
  spin: number;
}

interface Poop {
  mesh: THREE.Group;
  x: number;
  z: number;
  stinkT: number;
}

interface Ball {
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
}

type ReactStyle = 'love' | 'like' | 'hot' | 'crave' | 'ache' | 'refuse' | 'boop' | 'giggle' | 'yawn' | 'levelup' | 'grumpy' | 'sing';

type Activity =
  | { kind: 'idle'; t: number }
  | { kind: 'wander'; target: THREE.Vector3; t: number }
  | { kind: 'come'; target: THREE.Vector3; t: number }
  | { kind: 'lure' }
  | { kind: 'goEat'; food: FoodItem; t: number }
  | { kind: 'eat'; food: FoodItem; t: number; bites: number; fromHand: boolean }
  | { kind: 'react'; style: ReactStyle; t: number; dur: number; origin: THREE.Vector3 }
  | { kind: 'chase'; cool: number }
  | { kind: 'poop'; t: number; done: boolean }
  | { kind: 'shake'; t: number }
  | { kind: 'sleep' };

type Drag =
  | { kind: 'pet'; moved: number; acc: number; lastX: number; lastY: number }
  | { kind: 'scrub'; acc: number; bubbleAcc: number; lastX: number; lastY: number };

const r = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(arr: readonly T[]) => arr[Math.floor(Math.random() * arr.length)];
const INTERRUPTIBLE = new Set(['idle', 'wander', 'come', 'lure', 'chase']);
const BALL_R = 0.32;
const GRAVITY = 18;

export class Game {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
  private camBase = new THREE.Vector3(0, 5, 12);
  private camLook = new THREE.Vector3(0, 1, 0);
  private world: World;
  private cow = new Cow();
  private particles = new Particles();
  private sfx = new Sfx();
  private ui: UI;
  private save: SaveData;

  private foods: FoodItem[] = [];
  private held: FoodItem | null = null;
  private poops: Poop[] = [];
  private ball: Ball | null = null;
  private act: Activity = { kind: 'idle', t: 1.5 };
  private washMode = false;
  private drag: Drag | null = null;

  private time = 0;
  private walkTarget = 0;
  private override: Partial<Expression> = {};
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();
  private pointerGround = new THREE.Vector3();
  private pointerActiveT = -99;
  private holdPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2);
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private tmp = new THREE.Vector3();
  private tmp2 = new THREE.Vector3();

  private started = false;
  private snatchT = 0;
  private refuseUntil = 0;
  private petGlowUntil = 0;
  private lastPetSound = 0;
  private boopTimes: number[] = [];
  private sleepBoops: number[] = [];
  private sweets: number[] = [];
  private digest = 0;
  private poopAt = 0;
  private craving: FoodId | null = null;
  private craveUntil = 0;
  private nextCraveAt = 20;
  private nextGrowl = 15;
  private nextZ = 0;
  private nextSnore = 2;
  private nextAmbientMoo = 25;
  private scrubbed = 0;
  private lookMode: 'camera' | 'butterfly' | 'free' = 'camera';
  private lookModeT = 3;
  private chaseBlockedUntil = 0;
  private uiTimer = 0;
  private saveTimer = 0;
  private lastHappyFloat = 0;
  private flies: THREE.Mesh[] = [];

  constructor(private canvas: HTMLCanvasElement, uiRoot: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.world = new World(this.scene);
    this.scene.add(this.cow.root, this.particles.group);

    this.save = loadSave();
    this.cow.root.position.set(0, 0, 0.6);
    this.cow.scale = this.cow.targetScale = stageFor(this.save.level).scale;
    if (this.save.asleep) {
      this.act = { kind: 'sleep' };
      this.cow.lieTarget = 1;
    }
    for (const p of this.save.poops) this.spawnPoopMesh(p.x, p.z);

    const flyGeo = new THREE.SphereGeometry(0.03, 6, 4);
    const flyMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(flyGeo, flyMat);
      f.visible = false;
      this.flies.push(f);
      this.scene.add(f);
    }

    this.ui = new UI(uiRoot, {
      onFoodDown: (def, e) => this.startFoodDrag(def, e),
      onFeedToggle: () => this.ui.setTrayOpen(!this.ui.trayOpen),
      onPlay: () => this.togglePlay(),
      onWash: () => this.toggleWash(),
      onSleep: () => this.toggleSleep(),
      onMute: () => {
        this.save.muted = !this.save.muted;
        this.sfx.setMuted(this.save.muted);
        this.ui.setMuted(this.save.muted);
      },
      onStart: () => {
        this.save.introSeen = true;
        this.ui.showIntro(false);
        this.greet();
      },
      onRename: (name) => {
        this.save.name = name;
        this.ui.setName(name);
      },
      onReset: () => {
        wipeSave();
        window.removeEventListener('beforeunload', this.onUnload);
        location.reload();
      },
      onAnyInput: () => this.sfx.ensure(),
    });
    this.sfx.setMuted(this.save.muted);
    this.ui.setMuted(this.save.muted);
    this.ui.setName(this.save.name);
    this.ui.setModes({ wash: false, asleep: this.save.asleep, ball: false });
    this.ui.showIntro(!this.save.introSeen);
    if (this.save.introSeen) this.started = true;

    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', () => this.onUp());
    window.addEventListener('pointercancel', () => this.onUp());
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('beforeunload', this.onUnload);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) persist(this.save);
    });
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === 'f') this.ui.setTrayOpen(!this.ui.trayOpen);
      if (e.key === 'p') this.togglePlay();
      if (e.key === 'w') this.toggleWash();
      if (e.key === 's') this.toggleSleep();
      if (e.key === 'Escape' && this.washMode) this.toggleWash();
    });

    this.resize();
    this.renderStatsNow();
  }

  private onUnload = () => persist(this.save);

  start() {
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    const a = this.camera.aspect;
    const dist = a < 1 ? 12 + (1 - a) * 11 : 12;
    this.camera.fov = a < 1 ? 42 : 38;
    this.camBase.set(0, dist * 0.42, dist);
    this.camera.updateProjectionMatrix();
  }

  // ───────────────────────── helpers ─────────────────────────

  private get stats() {
    return this.save.stats;
  }

  private bump(key: StatKey, amount: number) {
    this.stats[key] = clamp(this.stats[key] + amount);
  }

  private addXp(n: number) {
    this.save.xp += n;
    let need = xpForLevel(this.save.level);
    while (this.save.xp >= need) {
      this.save.xp -= need;
      const before = stageFor(this.save.level);
      this.save.level++;
      const after = stageFor(this.save.level);
      need = xpForLevel(this.save.level);
      this.sfx.levelUp();
      this.particles.confetti(this.headPos(), 40);
      if (after.name !== before.name) {
        this.cow.targetScale = after.scale;
        this.ui.toast(`${this.save.name} grew into a ${after.name}!`, 'party');
      } else {
        this.ui.toast(`Level ${this.save.level}! ${this.save.name} loves you a bit more`, 'party');
      }
      if (!this.save.asleep && this.interruptible()) this.react('levelup');
    }
  }

  private headPos(out = new THREE.Vector3()) {
    return this.cow.headTopWorld(out);
  }

  private screenOf(v: THREE.Vector3) {
    const p = v.clone().project(this.camera);
    return { x: (p.x * 0.5 + 0.5) * window.innerWidth, y: (-p.y * 0.5 + 0.5) * window.innerHeight, visible: p.z < 1 };
  }

  private float(text: string, tone: 'good' | 'bad' | 'xp' = 'good', dy = 0) {
    const s = this.screenOf(this.headPos());
    this.ui.floater(text, s.x + r(-30, 30), s.y - 20 + dy, tone);
  }

  private floatDelta(label: string, amount: number, dy = 0) {
    if (Math.abs(amount) < 1) return;
    this.float(`${amount > 0 ? '+' : ''}${Math.round(amount)} ${label}`, amount > 0 ? 'good' : 'bad', dy);
  }

  private say(text: string, dur = 2.2) {
    this.ui.say(text, dur);
  }

  private mouthReach() {
    return 1.35 * this.cow.scale;
  }

  private interruptible() {
    const a = this.act;
    return INTERRUPTIBLE.has(a.kind) || (a.kind === 'react' && (a.style === 'sing' || a.style === 'like'));
  }

  private canEat() {
    return !this.save.asleep && this.stats.hunger <= 94;
  }

  private idle(t = r(1.5, 4)): Activity {
    return { kind: 'idle', t };
  }

  private moveTo(target: THREE.Vector3, speed: number, dt: number, stop: number): boolean {
    const p = this.cow.root.position;
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-4) return true;
    const heading = Math.atan2(dx, dz);
    this.cow.turnTo(heading, dt, 7);
    if (d <= stop) return true;
    const err = Math.abs(wrapAngle(heading - this.cow.root.rotation.y));
    const sp = speed * (err > 1.0 ? 0.25 : 1) * (this.stats.energy < 20 ? 0.65 : 1);
    const step = Math.min(d - stop, sp * dt);
    p.x += (dx / d) * step;
    p.z += (dz / d) * step;
    this.walkTarget = Math.max(this.walkTarget, sp / 2);
    this.clampToIsland(p);
    return d - step <= stop + 1e-3;
  }

  private faceTowards(target: THREE.Vector3, dt: number) {
    const p = this.cow.root.position;
    this.cow.turnTo(Math.atan2(target.x - p.x, target.z - p.z), dt, 5);
  }

  private clampToIsland(p: THREE.Vector3) {
    const d = Math.hypot(p.x, p.z);
    const max = this.world.walkRadius;
    if (d > max) {
      p.x *= max / d;
      p.z *= max / d;
    }
    if (p.z > 2.8) p.z = 2.8;
  }

  private randomSpot(radius = this.world.walkRadius - 0.4) {
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * radius;
    return new THREE.Vector3(Math.cos(a) * d, 0, Math.sin(a) * d);
  }

  private greet() {
    this.started = true;
    this.sfx.ensure();
    if (this.save.asleep) {
      this.say('Zzz… mmh…');
      return;
    }
    this.sfx.moo(1.1);
    this.cow.hop(5);
    this.particles.hearts(this.headPos(), 3);
    const m = moodOf(this.save);
    const lines: Record<string, string> = {
      starving: "Hi! I'm soooo hungry…",
      exhausted: "Hi… I'm so sleepy…",
      stinky: 'Hi! I rolled in something…',
      lonely: 'You came back!!',
      peckish: 'Hi! Got any snacks?',
    };
    this.say(lines[m.key] ?? `Moo! I'm ${this.save.name}!`, 2.6);
  }

  // ───────────────────────── food ─────────────────────────

  private spawnFood(def: FoodDef): FoodItem {
    const mesh = buildFoodMesh(def.id);
    mesh.userData.kind = 'food';
    this.scene.add(mesh);
    const item: FoodItem = { def, mesh, pos: new THREE.Vector3(), vel: new THREE.Vector3(), state: 'air', spin: r(-4, 4) };
    this.foods.push(item);
    return item;
  }

  private removeFood(f: FoodItem) {
    this.scene.remove(f.mesh);
    f.mesh.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
      }
    });
    this.foods = this.foods.filter((x) => x !== f);
  }

  private startFoodDrag(def: FoodDef, e: PointerEvent) {
    if (!this.started) return;
    if (this.foods.filter((f) => f.state !== 'eaten').length >= 6) {
      this.ui.toast('There is already plenty of food lying around', 'warn');
      return;
    }
    if (this.washMode) this.toggleWash();
    const item = this.spawnFood(def);
    item.state = 'held';
    item.mesh.visible = false;
    this.held = item;
    this.snatchT = 0;
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    this.setPointer(e);
    item.pos.copy(this.holdTarget());
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 8) {
        moved = true;
        item.mesh.visible = true;
        document.body.classList.add('dragging');
        item.pos.copy(this.holdTarget());
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.body.classList.remove('dragging');
      if (this.held === item) this.held = null;
      if (item.state !== 'held') return;
      item.mesh.visible = true;
      if (!moved) {
        const c = this.cow.root.position;
        const spot = new THREE.Vector3(c.x + r(-1.2, 1.2), 0, c.z + r(1.3, 2.2));
        this.clampToIsland(spot);
        item.pos.set(spot.x, 5.5, spot.z);
        item.vel.set(0, -2, 0);
        item.state = 'air';
        this.sfx.whoosh();
      } else if (this.canEat() && this.cow.mouthWorld(this.tmp).distanceTo(item.pos) < 0.85 && this.interruptible()) {
        this.startEat(item, true);
      } else {
        item.state = 'air';
        item.vel.set(0, 0, 0);
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  }

  private holdTarget() {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    this.holdPlane.constant = -(1.25 * this.cow.scale + 0.1);
    const hit = this.raycaster.ray.intersectPlane(this.holdPlane, this.tmp2);
    const out = new THREE.Vector3();
    if (hit) out.copy(hit);
    else out.set(0, -this.holdPlane.constant, 4);
    const d = Math.hypot(out.x, out.z);
    if (d > 6.2) {
      out.x *= 6.2 / d;
      out.z *= 6.2 / d;
    }
    return out;
  }

  private updateFoods(dt: number) {
    for (const f of [...this.foods]) {
      if (f.state === 'held') {
        f.pos.lerp(this.holdTarget(), 1 - Math.exp(-22 * dt));
        f.mesh.rotation.y += dt * 1.5;
        f.mesh.position.copy(f.pos);
        f.mesh.position.y += Math.sin(this.time * 6) * 0.03;
        continue;
      }
      if (f.state === 'air') {
        f.vel.y -= GRAVITY * dt;
        f.pos.addScaledVector(f.vel, dt);
        f.mesh.rotation.y += f.spin * dt;
        f.mesh.rotation.x += f.spin * 0.5 * dt;
        if (f.pos.y <= FOOD_REST_Y) {
          f.pos.y = FOOD_REST_Y;
          if (Math.abs(f.vel.y) > 2) {
            f.vel.y *= -0.35;
            f.vel.x *= 0.5;
            f.vel.z *= 0.5;
            this.particles.puff(f.pos, 5);
          } else {
            f.state = 'ground';
            f.vel.set(0, 0, 0);
            f.mesh.rotation.x = 0;
            this.onFoodLanded(f);
          }
        }
      }
      f.mesh.position.copy(f.pos);
      if (f.state === 'ground') f.mesh.position.y = FOOD_REST_Y + Math.max(0, Math.sin(this.time * 3 + f.spin)) * 0.02;
    }
  }

  private onFoodLanded(f: FoodItem) {
    if (this.save.asleep) {
      if (Math.random() < 0.5) this.ui.toast(`${this.save.name} is asleep. She'll eat it when she wakes up`);
      return;
    }
    if (this.stats.hunger > 94) {
      if (this.time > this.refuseUntil && this.interruptible()) {
        this.refuseUntil = this.time + 4;
        this.react('refuse');
        this.say("I'm stuffed!");
      }
      return;
    }
    if (this.interruptible() && this.act.kind !== 'lure' && this.act.kind !== 'goEat') {
      this.act = { kind: 'goEat', food: f, t: 0 };
      this.cow.hop(3);
    }
  }

  private startEat(f: FoodItem, fromHand: boolean) {
    if (this.held === f) this.held = null;
    f.state = 'eaten';
    this.act = { kind: 'eat', food: f, t: 0, bites: 0, fromHand };
    if (fromHand) {
      this.cow.hop(2.5);
      this.say(pick(['*CHOMP*', 'Nom!', 'Gimme!']), 1.2);
    }
  }

  private finishEat(def: FoodDef) {
    const crave = this.craving === def.id;
    const bonusJoy = crave ? 15 : 0;
    this.bump('hunger', def.hunger);
    this.bump('happy', def.happy + bonusJoy);
    this.bump('energy', def.energy);
    this.bump('clean', def.clean);
    this.save.fed++;
    this.floatDelta('tummy', def.hunger);
    this.floatDelta('joy', def.happy + bonusJoy, -26);
    if (def.energy >= 10) this.floatDelta('energy', def.energy, -52);
    this.addXp(def.xp + (crave ? 15 : 0));

    this.digest += def.id === 'hay' ? 1.5 : 1;
    if (this.digest >= 3 && !this.poopAt) {
      this.digest = 0;
      this.poopAt = this.time + r(7, 14);
    }

    let ache = false;
    if (def.id === 'cupcake') {
      this.sweets = this.sweets.filter((t) => this.time - t < 60);
      this.sweets.push(this.time);
      if (this.sweets.length >= 3) {
        ache = true;
        this.sweets = [];
        this.bump('happy', -12);
      }
    }

    if (crave) {
      this.craving = null;
      this.ui.setCraving(null);
      this.nextCraveAt = this.time + r(50, 100);
      this.react('crave');
      this.say('MY FAVORITE!! 💕', 2.4);
    } else if (ache) {
      this.react('ache');
      this.say('Ugh… too much sugar…', 2.4);
      this.float('-12 joy', 'bad', -52);
    } else if (def.taste === 'hate') {
      this.react('hot');
      this.say('HOT HOT HOT!!', 2.2);
    } else if (def.taste === 'love') {
      this.react('love');
      this.say(pick(['Mmmm~ yummy!', 'Sooo good!', 'More please!']));
    } else {
      this.react('like');
      this.say(pick(['Nom nom!', 'Tasty!', 'Crunchy!', 'Mm!']), 1.6);
    }
  }

  // ───────────────────────── poop ─────────────────────────

  private spawnPoopMesh(x: number, z: number) {
    const g = new THREE.Group();
    g.userData.kind = 'poop';
    const mat = toon(0x7b4e2d);
    const sizes: [number, number][] = [
      [0.2, 0.08],
      [0.15, 0.2],
      [0.1, 0.3],
    ];
    for (const [rad, y] of sizes) {
      const s = new THREE.Mesh(new THREE.SphereGeometry(rad, 14, 10), mat);
      s.position.y = y;
      s.scale.y = 0.7;
      s.castShadow = true;
      g.add(s);
    }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 8), mat);
    tip.position.y = 0.38;
    tip.rotation.z = 0.4;
    g.add(tip);
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * 6;
    this.scene.add(g);
    const p: Poop = { mesh: g, x, z, stinkT: Math.random() };
    g.userData.ref = p;
    this.poops.push(p);
    return p;
  }

  private syncPoops() {
    this.save.poops = this.poops.map((p) => ({ x: p.x, z: p.z }));
  }

  private cleanPoop(p: Poop) {
    this.scene.remove(p.mesh);
    this.poops = this.poops.filter((x) => x !== p);
    this.syncPoops();
    const at = new THREE.Vector3(p.x, 0.3, p.z);
    this.particles.sparkles(at, 8);
    this.particles.puff(at, 6);
    this.sfx.pop();
    this.sfx.sparkle();
    this.bump('clean', 6);
    this.bump('happy', 2);
    this.addXp(3);
    const s = this.screenOf(at);
    this.ui.floater('+6 hygiene', s.x, s.y - 30);
    if (this.poops.length === 0 && !this.save.asleep) this.say(pick(['Thank you!', 'Much better!', 'Oops, hehe']), 1.6);
  }

  // ───────────────────────── ball ─────────────────────────

  private togglePlay() {
    if (!this.started) return;
    if (this.ball) {
      this.scene.remove(this.ball.mesh);
      this.ball = null;
      if (this.act.kind === 'chase') this.act = this.idle();
      this.ui.setModes({ wash: this.washMode, asleep: this.save.asleep, ball: false });
      return;
    }
    if (this.save.asleep) {
      this.say('Zzz…');
      this.ui.toast(`${this.save.name} is sleeping. Wake her up to play`);
      return;
    }
    if (this.washMode) this.toggleWash();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 28, 20), toon(0xffffff, { map: beachBallTexture() }));
    mesh.castShadow = true;
    mesh.userData.kind = 'ball';
    const c = this.cow.root.position;
    const spot = new THREE.Vector3(c.x + r(-1.5, 1.5), 4, c.z + 2.2);
    this.clampToIsland(spot);
    this.ball = { mesh, pos: spot, vel: new THREE.Vector3(0, 0, 0) };
    mesh.position.copy(spot);
    this.scene.add(mesh);
    this.ui.setModes({ wash: this.washMode, asleep: false, ball: true });
    this.ui.setTrayOpen(false);
    if (this.stats.energy < 10) this.say('Too tired to play…');
    else {
      this.say(pick(['Ball!! BALL!!', 'Play with me!', 'Ooh, ball!']), 1.8);
      this.cow.hop(5);
      this.sfx.moo(1.3, 0.5);
      if (this.interruptible()) this.act = { kind: 'chase', cool: 0.9 };
    }
  }

  private kickBall() {
    const b = this.ball;
    if (!b) return;
    const dir = new THREE.Vector3(b.pos.x - this.camera.position.x, 0, b.pos.z - this.camera.position.z).normalize();
    dir.x += r(-0.5, 0.5);
    dir.normalize();
    b.vel.set(dir.x * r(5, 7), r(4.5, 6.5), dir.z * r(5, 7));
    this.sfx.kick();
    this.particles.puff(b.pos.clone().setY(0.05), 5);
    if (!this.save.asleep && this.stats.energy >= 8 && this.interruptible()) {
      this.act = { kind: 'chase', cool: 0.35 };
      this.cow.hop(3.5);
    }
  }

  private updateBall(dt: number) {
    const b = this.ball;
    if (!b) return;
    b.vel.y -= GRAVITY * dt;
    b.pos.addScaledVector(b.vel, dt);
    if (b.pos.y < BALL_R) {
      b.pos.y = BALL_R;
      if (Math.abs(b.vel.y) > 1.2) {
        b.vel.y = -b.vel.y * 0.55;
        if (Math.abs(b.vel.y) > 2.5) this.sfx.kick();
      } else b.vel.y = 0;
    }
    if (b.pos.y <= BALL_R + 0.01) {
      const f = Math.exp(-1.3 * dt);
      b.vel.x *= f;
      b.vel.z *= f;
    }
    const d = Math.hypot(b.pos.x, b.pos.z);
    const max = this.world.islandRadius - 0.7;
    if (d > max) {
      const nx = b.pos.x / d;
      const nz = b.pos.z / d;
      b.pos.x = nx * max;
      b.pos.z = nz * max;
      const vn = b.vel.x * nx + b.vel.z * nz;
      if (vn > 0) {
        b.vel.x -= 1.6 * vn * nx;
        b.vel.z -= 1.6 * vn * nz;
      }
    }
    const speed = Math.hypot(b.vel.x, b.vel.z);
    if (speed > 0.01) {
      const axis = new THREE.Vector3(b.vel.z, 0, -b.vel.x).normalize();
      b.mesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, (speed * dt) / BALL_R));
    }
    b.mesh.position.copy(b.pos);
  }

  // ───────────────────────── modes ─────────────────────────

  private toggleWash() {
    if (!this.started) return;
    if (!this.washMode && this.save.asleep) {
      this.ui.toast("Let her sleep. You can wash her when she's awake");
      return;
    }
    this.washMode = !this.washMode;
    if (this.washMode) {
      this.ui.setTrayOpen(false);
      this.scrubbed = 0;
      if (this.ball) this.togglePlay();
      this.say(this.stats.clean < 50 ? 'Bath time? Okay…' : "I'm already clean!", 1.8);
    } else if (this.scrubbed >= 8 && !this.save.asleep) {
      this.act = { kind: 'shake', t: 0 };
      this.sfx.splash();
    }
    this.ui.setModes({ wash: this.washMode, asleep: this.save.asleep, ball: !!this.ball });
  }

  private toggleSleep() {
    if (!this.started) return;
    if (this.save.asleep) {
      this.wake(this.stats.energy < 60);
      return;
    }
    if (this.stats.energy > 80) {
      this.react('refuse');
      this.say("I'm not sleepy!");
      return;
    }
    if (this.washMode) this.toggleWash();
    if (this.ball) this.togglePlay();
    if (this.held) this.held = null;
    this.save.asleep = true;
    this.act = { kind: 'sleep' };
    this.cow.lieTarget = 1;
    this.sfx.yawn();
    this.say('Goodnight~', 1.8);
    this.ui.setTrayOpen(false);
    this.ui.setModes({ wash: false, asleep: true, ball: false });
  }

  private wake(grumpy: boolean) {
    this.save.asleep = false;
    this.cow.lieTarget = 0;
    this.sleepBoops = [];
    this.ui.setModes({ wash: this.washMode, asleep: false, ball: !!this.ball });
    if (grumpy) {
      this.react('grumpy');
      this.say('Hmph… five more minutes…', 2.2);
      this.bump('happy', -4);
    } else {
      this.react('yawn');
      this.say(this.stats.energy >= 99 ? 'Good morning!! ☀️' : 'Morning…', 2);
    }
  }

  // ───────────────────────── reactions ─────────────────────────

  private react(style: ReactStyle) {
    const dur: Record<ReactStyle, number> = {
      love: 1.3,
      like: 0.9,
      hot: 2.6,
      crave: 1.9,
      ache: 2.2,
      refuse: 1.0,
      boop: 0.6,
      giggle: 1.4,
      yawn: 1.7,
      levelup: 1.6,
      grumpy: 1.4,
      sing: 2.2,
    };
    this.act = { kind: 'react', style, t: 0, dur: dur[style], origin: this.cow.root.position.clone() };
    const head = this.headPos();
    switch (style) {
      case 'love':
        this.cow.hop(4.5);
        this.particles.hearts(head, 6);
        this.sfx.heart();
        this.sfx.moo(1.3, 0.6);
        break;
      case 'like':
        this.particles.hearts(head, 2);
        this.sfx.moo(1.15, 0.45, 0.22);
        break;
      case 'hot':
        this.sfx.hot();
        this.cow.hop(6);
        break;
      case 'crave':
        this.cow.spin(1.1, 1);
        this.cow.hop(6);
        this.particles.confetti(head, 28);
        this.particles.hearts(head, 8);
        this.sfx.sparkle();
        this.sfx.moo(1.4, 0.7);
        break;
      case 'ache':
        this.sfx.yuck();
        break;
      case 'refuse':
        this.cow.shake(0.8);
        this.sfx.yuck();
        break;
      case 'boop':
        break;
      case 'giggle':
        this.cow.spin(0.9, Math.random() < 0.5 ? 1 : -1);
        this.cow.hop(4);
        this.sfx.giggle();
        this.particles.hearts(head, 4);
        break;
      case 'yawn':
        this.sfx.yawn();
        break;
      case 'levelup':
        this.cow.spin(1.2, 1);
        this.cow.hop(6);
        this.particles.sparkles(head, 12);
        break;
      case 'grumpy':
        this.sfx.moo(0.8, 0.6, 0.2);
        break;
      case 'sing':
        this.sfx.moo(1.2, 0.5, 0.2);
        setTimeout(() => this.sfx.moo(1.45, 0.5, 0.2), 550);
        setTimeout(() => this.sfx.moo(1.3, 0.8, 0.2), 1100);
        break;
    }
  }

  // ───────────────────────── input ─────────────────────────

  private setPointer(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  }

  private pick(): { kind: 'cow' | 'poop' | 'ball' | 'ground' | 'none'; point: THREE.Vector3; ref?: Poop } {
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const targets: THREE.Object3D[] = [this.cow.root, ...this.poops.map((p) => p.mesh)];
    if (this.ball) targets.push(this.ball.mesh);
    const hits = this.raycaster.intersectObjects(targets, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.kind) o = o.parent;
      if (!o) continue;
      const kind = o.userData.kind as 'cow' | 'poop' | 'ball';
      return { kind, point: h.point.clone(), ref: kind === 'poop' ? (o.userData.ref as Poop) : undefined };
    }
    const g = this.raycaster.ray.intersectPlane(this.groundPlane, new THREE.Vector3());
    if (g && Math.hypot(g.x, g.z) < this.world.islandRadius) return { kind: 'ground', point: g };
    return { kind: 'none', point: new THREE.Vector3() };
  }

  private onDown(e: PointerEvent) {
    this.sfx.ensure();
    if (!this.started) return;
    this.setPointer(e);
    const hit = this.pick();
    if (this.washMode) {
      if (hit.kind === 'cow') {
        this.drag = { kind: 'scrub', acc: 0, bubbleAcc: 0, lastX: e.clientX, lastY: e.clientY };
        this.particles.bubbles(hit.point, 3);
      } else if (hit.kind === 'poop' && hit.ref) this.cleanPoop(hit.ref);
      return;
    }
    if (hit.kind === 'poop' && hit.ref) this.cleanPoop(hit.ref);
    else if (hit.kind === 'ball') this.kickBall();
    else if (hit.kind === 'cow') this.drag = { kind: 'pet', moved: 0, acc: 0, lastX: e.clientX, lastY: e.clientY };
    else if (hit.kind === 'ground' && !this.save.asleep && this.interruptible() && this.act.kind !== 'chase') {
      const target = hit.point.clone();
      this.clampToIsland(target);
      this.act = { kind: 'come', target, t: 0 };
      this.particles.puff(hit.point, 6);
    }
  }

  private onMove(e: PointerEvent) {
    this.setPointer(e);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const g = this.raycaster.ray.intersectPlane(this.groundPlane, this.tmp2);
    if (g) {
      this.pointerGround.copy(g).setY(1);
      this.pointerActiveT = this.time;
    }
    const d = this.drag;
    if (!d) {
      if (e.target === this.canvas && !this.held) {
        const k = this.pick().kind;
        this.canvas.style.cursor = this.washMode ? '' : k === 'cow' ? 'grab' : k === 'poop' || k === 'ball' ? 'pointer' : '';
      }
      return;
    }
    const dist = Math.hypot(e.clientX - d.lastX, e.clientY - d.lastY);
    d.lastX = e.clientX;
    d.lastY = e.clientY;
    const hit = this.pick();
    if (d.kind === 'pet') {
      d.moved += dist;
      if (hit.kind === 'cow') {
        d.acc += dist;
        while (d.acc >= 55) {
          d.acc -= 55;
          this.petTick(hit.point);
        }
      }
    } else if (hit.kind === 'cow') {
      d.acc += dist;
      d.bubbleAcc += dist;
      if (d.bubbleAcc > 14) {
        d.bubbleAcc = 0;
        this.particles.bubbles(hit.point, 2);
      }
      while (d.acc >= 32 && this.drag) {
        d.acc -= 32;
        this.scrubTick(hit.point);
      }
    }
  }

  private onUp() {
    const d = this.drag;
    this.drag = null;
    if (d?.kind === 'pet' && d.moved < 10) this.boop();
  }

  private petTick(point: THREE.Vector3) {
    this.petGlowUntil = this.time + 0.7;
    this.particles.hearts(point.clone().add(new THREE.Vector3(0, 0.2, 0)), 1);
    this.cow.squash(0.35);
    if (this.save.asleep) return;
    this.bump('happy', 1.3);
    this.addXp(0.5);
    if (this.time - this.lastHappyFloat > 1.2) {
      this.lastHappyFloat = this.time;
      this.float('+joy', 'good');
    }
    if (this.time - this.lastPetSound > 1.4) {
      this.lastPetSound = this.time;
      this.sfx.moo(1.25, 0.5, 0.14);
      if (Math.random() < 0.4) this.say(pick(['Mmmh~', 'Hehe', 'Right there!', '♡']), 1.2);
    }
  }

  private scrubTick(point: THREE.Vector3) {
    if (!this.washMode) return;
    this.bump('clean', 3);
    this.scrubbed += 3;
    this.petGlowUntil = this.time + 0.5;
    this.particles.bubbles(point, 3);
    this.sfx.squeak();
    this.addXp(0.3);
    if (this.stats.clean >= 98) {
      this.drag = null;
      this.toggleWash();
      this.say('Squeaky clean! ✨', 2);
      this.particles.sparkles(this.headPos(), 10);
      this.sfx.sparkle();
      this.addXp(5);
    } else if (Math.random() < 0.08) this.float('+hygiene', 'good');
  }

  private boop() {
    const head = this.headPos();
    if (this.save.asleep) {
      this.sleepBoops = this.sleepBoops.filter((t) => this.time - t < 3);
      this.sleepBoops.push(this.time);
      this.particles.zzz(head);
      this.cow.squash(0.5);
      if (this.sleepBoops.length >= 3) this.wake(true);
      else this.say(pick(['mmh…', 'zzz…', '*snore*']), 1.2);
      return;
    }
    this.boopTimes = this.boopTimes.filter((t) => this.time - t < 2.5);
    this.boopTimes.push(this.time);
    this.petGlowUntil = this.time + 0.5;
    if (this.boopTimes.length >= 5) {
      this.boopTimes = [];
      if (this.interruptible()) this.react('giggle');
      this.say('Hehehe that tickles!', 1.8);
      this.bump('happy', 4);
      this.addXp(2);
      return;
    }
    this.sfx.moo(r(1, 1.35), r(0.45, 0.7));
    this.cow.hop(3.5);
    this.sfx.bell();
    this.particles.hearts(head, 1);
    if (this.boopTimes.length === 1) {
      this.bump('happy', 2);
      this.addXp(1);
    }
    if (this.interruptible()) this.act = this.idle(r(1.5, 3));
    if (Math.random() < 0.6) this.say(pick(['Moo!', 'Moo?', 'Boop!', 'Hi hi!', 'Mooo~']), 1.2);
  }

  // ───────────────────────── behavior ─────────────────────────

  private decideNext() {
    const s = this.stats;
    if (this.poopAt && this.time >= this.poopAt) {
      this.poopAt = 0;
      this.act = { kind: 'poop', t: 0, done: false };
      return;
    }
    if (this.canEat()) {
      const ground = this.foods.filter((f) => f.state === 'ground');
      if (ground.length) {
        const c = this.cow.root.position;
        ground.sort((a, b) => a.pos.distanceTo(c) - b.pos.distanceTo(c));
        this.act = { kind: 'goEat', food: ground[0], t: 0 };
        return;
      }
    }
    if (this.ball && s.energy >= 8 && this.time > this.chaseBlockedUntil) {
      this.act = { kind: 'chase', cool: 0.3 };
      return;
    }
    if (s.energy < 22 && Math.random() < 0.35) {
      this.react('yawn');
      this.say(pick(['*yaaawn*', "I'm sleepy…"]), 1.6);
      return;
    }
    const roll = Math.random();
    if (roll < 0.55) this.act = { kind: 'wander', target: this.randomSpot(), t: 0 };
    else if (roll < 0.85 || s.happy < 60) this.act = this.idle(r(2, 4.5));
    else {
      this.react('sing');
      for (let i = 0; i < 3; i++) setTimeout(() => this.particles.note(this.headPos()), i * 550);
    }
  }

  private think(dt: number) {
    const cow = this.cow;
    const s = this.stats;
    this.walkTarget = 0;
    cow.headPitchExtra = 0;
    cow.headTilt = 0;
    cow.chewing = false;
    cow.wobble = 0;
    this.override = {};

    if (this.save.asleep && this.act.kind !== 'sleep') this.act = { kind: 'sleep' };
    if (this.held?.state === 'held' && this.held.mesh.visible && !this.save.asleep && this.interruptible() && this.act.kind !== 'lure') {
      this.act = { kind: 'lure' };
      this.snatchT = 0;
    }

    const a = this.act;
    switch (a.kind) {
      case 'idle': {
        a.t -= dt;
        cow.lookAt = this.idleLook(dt);
        if (a.t <= 0) this.decideNext();
        break;
      }
      case 'wander': {
        a.t += dt;
        cow.lookAt = null;
        if (this.moveTo(a.target, s.energy < 25 ? 0.8 : 1.2, dt, 0.1) || a.t > 10) this.act = this.idle();
        break;
      }
      case 'come': {
        a.t += dt;
        cow.lookAt = null;
        if (this.moveTo(a.target, 2.1, dt, 0.3) || a.t > 8) {
          this.act = this.idle(r(2, 3.5));
          if (Math.random() < 0.5) this.sfx.moo(1.2, 0.5, 0.2);
        }
        break;
      }
      case 'lure': {
        const f = this.held;
        if (!f || f.state !== 'held') {
          this.act = this.idle(1);
          break;
        }
        cow.lookAt = f.pos;
        if (s.hunger > 94) {
          this.faceTowards(f.pos, dt);
          if (this.time > this.refuseUntil) {
            this.refuseUntil = this.time + 5;
            cow.shake(0.8);
            this.sfx.yuck();
            this.say("I'm stuffed!", 1.6);
          }
          this.override = { mouth: 'flat', eyes: 'closed' };
          break;
        }
        const mouth = cow.mouthWorld(this.tmp);
        const dMouth = mouth.distanceTo(f.pos);
        const flat = Math.hypot(f.pos.x - cow.root.position.x, f.pos.z - cow.root.position.z);
        const reach = this.mouthReach();
        if (flat > reach + 0.15 && flat < 6) this.moveTo(f.pos, 1.7, dt, reach);
        else this.faceTowards(f.pos, dt);
        this.override = { mouthOpen: clamp((1.6 - dMouth) * 0.7, 0, 1), eyes: dMouth < 1.2 ? 'wide' : 'open', tailWag: 1 };
        if (dMouth < 0.5 + 0.25 * cow.scale) {
          this.snatchT += dt;
          if (this.snatchT > 0.28) this.startEat(f, true);
        } else this.snatchT = 0;
        break;
      }
      case 'goEat': {
        a.t += dt;
        const f = a.food;
        if (f.state !== 'ground' || !this.canEat()) {
          this.act = this.idle(1);
          break;
        }
        cow.lookAt = f.pos;
        this.override = { tailWag: 0.9 };
        if (this.moveTo(f.pos, 2.0, dt, this.mouthReach() - 0.1)) this.startEat(f, false);
        else if (a.t > 12) this.act = this.idle();
        break;
      }
      case 'eat': {
        a.t += dt;
        const f = a.food;
        cow.chewing = true;
        if (a.fromHand) {
          cow.mouthWorld(f.pos);
          f.mesh.position.copy(f.pos);
          cow.headPitchExtra = -0.1;
        } else {
          cow.lookAt = f.pos;
          cow.headPitchExtra = 0.35;
        }
        this.override = { eyes: f.def.taste === 'hate' ? 'open' : 'happy', blush: 0.8, tailWag: 1 };
        const biteAt = [0.05, 0.5, 0.95];
        if (a.bites < 3 && a.t >= biteAt[a.bites]) {
          a.bites++;
          this.sfx.chomp();
          this.particles.crumbs(f.pos, f.def.color, 9);
          f.mesh.scale.setScalar(Math.max(0.05, 1 - a.bites * 0.32));
          cow.squash(0.6);
        }
        if (a.t > 1.35) {
          this.removeFood(f);
          this.finishEat(f.def);
        }
        break;
      }
      case 'react':
        this.updateReaction(a, dt);
        break;
      case 'chase': {
        const b = this.ball;
        if (!b || this.save.asleep) {
          this.act = this.idle();
          break;
        }
        if (s.energy < 8) {
          this.say('Too tired… 😮‍💨', 2);
          this.chaseBlockedUntil = this.time + 20;
          this.act = this.idle(3);
          break;
        }
        cow.lookAt = b.pos;
        this.override = { tailWag: 1, mouthOpen: 0.25, eyes: 'wide' };
        a.cool -= dt;
        if (a.cool > 0) {
          this.faceTowards(b.pos, dt);
          break;
        }
        const reach = 0.95 * cow.scale + BALL_R;
        if (this.moveTo(b.pos, 2.8, dt, reach) && b.pos.y < 0.9) this.nudgeBall(b);
        break;
      }
      case 'poop': {
        a.t += dt;
        cow.lookAt = null;
        cow.wobble = a.t < 0.9 ? 0.6 : 0;
        this.override = { eyes: 'closed', mouth: 'flat', brows: 'sad', blush: 0.9 };
        if (!a.done && a.t > 0.9) {
          a.done = true;
          if (this.poops.length < 5) {
            const back = new THREE.Vector3(0, 0, -1.05 * cow.scale).applyAxisAngle(new THREE.Vector3(0, 1, 0), cow.root.rotation.y);
            const pos = cow.root.position.clone().add(back);
            this.clampToIsland(pos);
            this.spawnPoopMesh(pos.x, pos.z);
            this.syncPoops();
            this.particles.puff(pos, 8);
          }
          this.sfx.plop();
          cow.hop(2);
          this.say(pick(['Oops… 💩', 'Hehe… sorry', '*plop*']), 1.8);
        }
        if (a.t > 1.8) this.act = this.idle(1);
        break;
      }
      case 'shake': {
        a.t += dt;
        cow.wobble = 1;
        this.override = { eyes: 'closed', mouth: 'smile', blush: 0.8 };
        if (a.t < 0.9 && Math.floor(a.t * 12) !== Math.floor((a.t - dt) * 12)) {
          this.particles.droplets(cow.root.position.clone().setY(0.9 * cow.scale), 6);
        }
        if (a.t > 1.2) {
          this.act = this.idle(1);
          this.say(pick(['Fresh!', 'All clean!', 'Brrr!']), 1.5);
        }
        break;
      }
      case 'sleep': {
        cow.lookAt = null;
        cow.lieTarget = 1;
        const p = cow.root.position;
        cow.turnTo(Math.atan2(this.camera.position.x - p.x, this.camera.position.z - p.z) + 0.5, dt, 1.2);
        break;
      }
    }

    cow.walking += (this.walkTarget - cow.walking) * (1 - Math.exp(-10 * dt));
  }

  private nudgeBall(b: Ball) {
    const target = new THREE.Vector3(r(-2.5, 2.5), 0, r(0.5, 3.2));
    const dir = target.sub(b.pos).setY(0).normalize();
    b.vel.set(dir.x * r(4, 5.5), r(4, 5.5), dir.z * r(4, 5.5));
    this.cow.hop(4);
    this.cow.headPitchExtra = -0.4;
    this.sfx.boing();
    this.sfx.bell();
    this.particles.hearts(this.headPos(), 2);
    this.bump('happy', 5);
    this.bump('energy', -2.5);
    this.addXp(2);
    this.float('+5 joy', 'good');
    if (Math.random() < 0.35) this.say(pick(['Wheee!', 'Again!', 'Got it!', 'Hehe!']), 1.2);
    if (this.act.kind === 'chase') this.act.cool = 1.1;
  }

  private updateReaction(a: Extract<Activity, { kind: 'react' }>, dt: number) {
    const cow = this.cow;
    a.t += dt;
    const k = a.t / a.dur;
    switch (a.style) {
      case 'love':
        cow.lookAt = this.camera.position;
        this.override = { eyes: 'happy', blush: 1, tailWag: 1, mouthOpen: 0.35 };
        if (a.t > 0.55 && a.t - dt <= 0.55) cow.hop(3.5);
        break;
      case 'like':
        cow.lookAt = this.camera.position;
        cow.headPitchExtra = Math.sin(a.t * 14) * 0.2;
        this.override = { eyes: 'happy', blush: 0.7, tailWag: 0.8 };
        break;
      case 'hot': {
        const ang = a.t * 5;
        const target = a.origin.clone().add(new THREE.Vector3(Math.cos(ang) * 1.3, 0, Math.sin(ang) * 1.3));
        this.clampToIsland(target);
        if (a.t < 2.1) this.moveTo(target, 4, dt, 0);
        cow.lookAt = null;
        this.override = { eyes: 'wide', brows: 'mad', mouthOpen: 0.9, blush: 1, blushColor: 0xff2a2a, tailWag: 1 };
        const m = cow.mouthWorld(this.tmp);
        const fwd = new THREE.Vector3(Math.sin(cow.root.rotation.y), 0.2, Math.cos(cow.root.rotation.y));
        this.particles.fire(m, fwd);
        if (Math.random() < 0.05) this.particles.emoji('💨', m, { vel: fwd.clone().multiplyScalar(1.5).setY(1), life: 0.8, size: 0.3 });
        break;
      }
      case 'crave':
        cow.lookAt = this.camera.position;
        this.override = { eyes: 'happy', blush: 1, tailWag: 1, mouthOpen: 0.5 };
        if (a.t > 0.9 && a.t - dt <= 0.9) cow.hop(5);
        break;
      case 'ache':
        cow.lookAt = null;
        cow.wobble = 0.35;
        cow.headPitchExtra = 0.25;
        this.override = { eyes: 'closed', brows: 'sad', mouth: 'frown', blush: 0.5, blushColor: 0xa6d98a, earDroop: 1, tailWag: 0 };
        break;
      case 'refuse':
        this.override = { eyes: 'closed', mouth: 'flat', brows: 'mad', tailWag: 0.2 };
        break;
      case 'boop':
        this.override = { eyes: 'happy', blush: 0.9 };
        break;
      case 'giggle':
        this.override = { eyes: 'happy', blush: 1, mouthOpen: 0.5 + Math.sin(a.t * 30) * 0.2, tailWag: 1 };
        break;
      case 'yawn':
        cow.headPitchExtra = -0.35 * Math.sin(Math.min(1, k) * Math.PI);
        this.override = { eyes: 'closed', mouthOpen: Math.sin(Math.min(1, k) * Math.PI), tailWag: 0.2 };
        break;
      case 'levelup':
        this.override = { eyes: 'happy', blush: 1, mouthOpen: 0.4, tailWag: 1 };
        break;
      case 'grumpy':
        this.override = { eyes: 'open', lid: 0.8, brows: 'mad', mouth: 'frown', tailWag: 0 };
        break;
      case 'sing':
        cow.lookAt = this.camera.position;
        cow.headTilt = Math.sin(a.t * 4) * 0.2;
        this.override = { eyes: 'happy', mouthOpen: 0.3 + Math.max(0, Math.sin(a.t * 11)) * 0.4, blush: 0.7, tailWag: 1 };
        break;
    }
    if (a.t >= a.dur) this.act = this.idle(r(1, 2.5));
  }

  private idleLook(dt: number): THREE.Vector3 | null {
    if (this.time - this.pointerActiveT < 2.5) return this.pointerGround;
    this.lookModeT -= dt;
    if (this.lookModeT <= 0) {
      this.lookModeT = r(2.5, 6);
      const roll = Math.random();
      this.lookMode = roll < 0.45 ? 'camera' : roll < 0.8 && !this.world.isNight ? 'butterfly' : 'free';
    }
    if (this.lookMode === 'camera') return this.camera.position;
    if (this.lookMode === 'butterfly') return this.world.butterfly.position;
    return null;
  }

  private applyExpression() {
    const s = this.stats;
    const e = this.cow.expr;
    const avg = (s.hunger + s.happy + s.energy + s.clean) / 4;
    e.eyes = 'open';
    e.lid = s.energy < 25 ? 0.7 : s.energy < 40 ? 0.3 : 0;
    e.brows = s.happy < 30 || s.hunger < 20 || s.clean < 18 ? 'sad' : 'none';
    e.mouth = avg > 55 && s.hunger >= 20 ? 'smile' : avg > 35 ? 'flat' : 'frown';
    e.mouthOpen = 0;
    e.blush = s.happy > 70 ? 0.55 : 0.2;
    e.blushColor = 0xff8fab;
    e.earDroop = s.happy < 35 || s.energy < 25 ? 0.85 : s.hunger < 30 ? 0.5 : 0;
    e.tailWag = s.happy / 100;
    if (this.save.asleep) {
      e.eyes = 'closed';
      e.brows = 'none';
      e.mouth = 'flat';
      e.mouthOpen = Math.max(0, Math.sin(this.time * 1.4)) * 0.15;
      e.earDroop = 0.7;
      e.tailWag = 0.05;
      e.lid = 0;
    }
    if (this.time < this.petGlowUntil) {
      e.eyes = this.save.asleep ? 'closed' : 'happy';
      e.blush = 1;
      e.tailWag = 1;
      e.brows = 'none';
      e.mouth = 'smile';
    }
    Object.assign(e, this.override);
    if (this.washMode && !this.save.asleep && this.time >= this.petGlowUntil && this.act.kind === 'idle') e.brows = 'sad';
    this.cow.fullness = s.hunger / 100;
    this.cow.dirtiness = clamp((55 - s.clean) / 45, 0, 1);
  }

  // ───────────────────────── ambient ─────────────────────────

  private ambient(dt: number) {
    const s = this.stats;
    const head = this.headPos(this.tmp2);

    if (this.save.asleep) {
      if (this.time > this.nextZ) {
        this.nextZ = this.time + 1.3;
        this.particles.zzz(head.clone().add(new THREE.Vector3(0.3, 0.1, 0)));
      }
      if (this.time > this.nextSnore) {
        this.nextSnore = this.time + 3.2;
        this.sfx.snore();
      }
      if (s.energy >= 100) this.wake(false);
    }

    for (const p of this.poops) {
      p.stinkT -= dt;
      if (p.stinkT <= 0) {
        p.stinkT = r(0.8, 1.4);
        this.particles.stink(new THREE.Vector3(p.x, 0.4, p.z));
      }
    }

    const dirty = s.clean < 35;
    this.flies.forEach((f, i) => {
      f.visible = dirty;
      if (!dirty) return;
      const t = this.time * (2.2 + i * 0.4) + i * 2;
      f.position.set(head.x + Math.cos(t) * 0.7, head.y - 0.2 + Math.sin(t * 2.3) * 0.25, head.z + Math.sin(t) * 0.7);
    });

    if (!this.save.asleep && this.started) {
      if (!this.craving && this.time > this.nextCraveAt && s.hunger < 88) {
        this.craving = pick(FOODS.filter((f) => f.taste !== 'hate')).id;
        this.craveUntil = this.time + 80;
        this.ui.setCraving(this.craving);
        if (this.interruptible()) this.say(`I really want ${foodById(this.craving).emoji}…`, 2.4);
      }
      if (this.craving && this.time > this.craveUntil) {
        this.craving = null;
        this.ui.setCraving(null);
        this.nextCraveAt = this.time + r(40, 90);
      }
      if (s.hunger < 30 && this.time > this.nextGrowl) {
        this.nextGrowl = this.time + r(14, 22);
        this.sfx.growl();
        this.cow.wobble = 0.5;
        if (this.interruptible()) this.say(pick(['*grumble grumble*', "I'm hungry…", 'Snack pls?']), 2);
      }
      if (this.time > this.nextAmbientMoo) {
        this.nextAmbientMoo = this.time + r(25, 45);
        if (this.act.kind === 'idle' || this.act.kind === 'wander') this.sfx.moo(r(0.95, 1.2), r(0.6, 0.9), 0.18);
      }
    }

    let thought: string | null = null;
    const calm = this.act.kind === 'idle' || this.act.kind === 'wander';
    if (!this.save.asleep && calm && !this.ui.speaking && !this.washMode) {
      if (this.craving) thought = foodById(this.craving).emoji;
      else if (s.hunger < 35) thought = '🍽️';
      else if (s.energy < 22) thought = '💤';
      else if (s.clean < 25) thought = '🛁';
      else if (s.happy < 30) thought = '💔';
    }
    this.ui.think(thought);
  }

  // ───────────────────────── main loop ─────────────────────────

  private update(dt: number) {
    this.time += dt;
    if (this.started) applyDecay(this.save, dt);

    this.world.update(dt, this.time, this.save.asleep ? 1 : 0);
    this.updateFoods(dt);
    this.updateBall(dt);
    this.think(dt);
    this.applyExpression();
    this.cow.update(dt);
    this.particles.update(dt);
    this.ambient(dt);

    const c = this.cow.root.position;
    const lookGoal = new THREE.Vector3(c.x * 0.3, 0.35 + this.cow.scale * 0.2, c.z * 0.2);
    this.camLook.lerp(lookGoal, 1 - Math.exp(-2 * dt));
    const sway = new THREE.Vector3(this.ndc.x * 0.35 + Math.sin(this.time * 0.3) * 0.15, this.ndc.y * 0.2, 0);
    this.camera.position.lerp(this.camBase.clone().add(sway), 1 - Math.exp(-3 * dt));
    this.camera.lookAt(this.camLook);

    const hs = this.screenOf(this.headPos());
    this.ui.placeBubbles(hs.x, hs.y - 16, hs.visible);

    this.uiTimer -= dt;
    if (this.uiTimer <= 0) {
      this.uiTimer = 0.25;
      this.renderStatsNow();
    }
    this.saveTimer -= dt;
    if (this.saveTimer <= 0) {
      this.saveTimer = 4;
      persist(this.save);
    }
  }

  private renderStatsNow() {
    this.ui.renderStats(this.save, moodOf(this.save), stageFor(this.save.level), xpForLevel(this.save.level));
  }
}
