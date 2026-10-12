import * as THREE from "three";
import { Cowdie, type Mood } from "../3d/cowdie";
import { createFoodMesh } from "../3d/food-models";
import { Particles } from "../3d/particles";
import { createWorld, type World } from "../3d/world";
import { Sfx } from "../audio";
import { Hud } from "../ui/hud";
import { FOODS, getFood, type FoodDef, type FoodId } from "./foods";
import * as S from "./state";

type Busy = "none" | "eating" | "playing" | "bathing";
type Screen = { x: number; y: number };

interface Flight {
  mesh: THREE.Object3D;
  from: THREE.Vector3;
  to: THREE.Vector3;
  t: number;
  duration: number;
  arc: number;
  shrink: boolean;
  onDone: () => void;
}

interface Pending {
  food: FoodDef;
  card: HTMLElement;
  x: number;
  y: number;
  dragging: boolean;
}

const SOUND_KEY = "cowdie:sound";
const DROP_RADIUS_PX = 110;
const POKE_RADIUS_PX = 140;
const POKE_LINES = ["Hehe!", "Eep!", "Moo~", "That tickles!"];
const IDLE_LINES = ["Moo~", "Nice day, huh?", "Hi there!", "Tap me!"];

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function isNightNow(): boolean {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
}

function disposeObject(obj: THREE.Object3D): void {
  obj.removeFromParent();
  obj.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material.dispose();
    }
  });
}

export class Game {
  private readonly canvas = byId<HTMLCanvasElement>("scene");
  private readonly stage = byId<HTMLElement>("stage");
  private readonly world: World;
  private readonly cowdie = new Cowdie();
  private readonly particles: Particles;
  private readonly hud = new Hud();
  private readonly sfx: Sfx;
  private readonly ball: THREE.Mesh;

  private state: S.PetState;
  private clock = 0;
  private lastFrame = performance.now();
  private tasks: { at: number; run: () => void }[] = [];
  private flights: Flight[] = [];
  private busy: Busy = "none";
  private eatMesh: THREE.Object3D | null = null;
  private eatScale = 1;
  private pending: Pending | null = null;
  private drag: { food: FoodDef; mesh: THREE.Object3D; near: boolean } | null = null;
  private justDragged = false;
  private trayOpen = false;
  private overlay: Mood | null = null;
  private overlayUntil = 0;
  private idleTimer = 5;
  private pokeCooldown = 0;
  private bathTimer = 0;
  private bathBubbleTimer = 0;
  private hudTimer = 0;
  private saveTimer = 4;
  private hintTimer = 9;
  private resetArmedUntil = 0;
  private lastLevel: number;
  private wasAsleep: boolean;
  private readonly tmpA = new THREE.Vector3();
  private readonly tmpB = new THREE.Vector3();

  constructor() {
    this.world = createWorld(this.canvas);
    this.world.scene.add(this.cowdie.root);
    this.particles = new Particles(this.world.scene);
    this.sfx = new Sfx(localStorage.getItem(SOUND_KEY) !== "0");
    this.hud.setSoundOn(this.sfx.enabled);

    this.ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 24, 16),
      new THREE.MeshStandardMaterial({ color: 0xff5f7e, roughness: 0.35 }),
    );
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.16, 0.02, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 }),
    );
    band.rotation.x = Math.PI / 2;
    this.ball.add(band);
    this.ball.visible = false;
    this.ball.castShadow = true;
    this.world.scene.add(this.ball);

    this.state = S.loadState(this.readSave(), Date.now());
    this.lastLevel = S.levelFromXp(this.state.xp);
    this.wasAsleep = this.state.asleep;
    this.hud.setSleepLabel(this.state.asleep);

    this.bind();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(this.stage);
    this.hud.renderTray(this.state);
    requestAnimationFrame(this.frame);
  }

  private bind(): void {
    byId("btn-feed").addEventListener("click", () => this.setTray(!this.trayOpen));
    byId("btn-play").addEventListener("click", () => this.play());
    byId("btn-bathe").addEventListener("click", () => this.bathe());
    byId("btn-sleep").addEventListener("click", () => this.toggleSleep());
    byId("btn-sound").addEventListener("click", () => this.toggleSound());
    byId("btn-reset").addEventListener("click", () => this.onReset());

    const tray = byId("food-tray");
    tray.addEventListener("pointerdown", (e) => this.onTrayPointerDown(e));
    tray.addEventListener("click", (e) => this.onTrayClick(e));
    window.addEventListener("pointermove", (e) => this.onPointerMove(e));
    window.addEventListener("pointerup", (e) => this.onPointerUp(e));
    this.canvas.addEventListener("click", (e) => this.onCanvasClick(e));

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) this.save();
    });
    window.addEventListener("pagehide", () => this.save());
  }

  // ---------------------------------------------------------------- loop

  private readonly frame = (now: number): void => {
    const dt = Math.min(0.1, (now - this.lastFrame) / 1000);
    this.lastFrame = now;
    this.clock += dt;
    this.step(dt);
    requestAnimationFrame(this.frame);
  };

  private step(dt: number): void {
    this.state = S.tick(this.state, Date.now());
    this.handleSleepTransition();
    this.runTasks();
    this.updateFlights(dt);
    this.updateBath(dt);
    this.pokeCooldown = Math.max(0, this.pokeCooldown - dt);

    const mouth = this.cowdie.mouthWorld(this.tmpA);
    if (this.eatMesh) {
      this.eatMesh.position.copy(mouth);
      this.eatMesh.scale.setScalar(this.eatScale);
      this.eatMesh.rotation.y += dt * 2;
    }

    this.updateGaze();
    this.cowdie.setMood(this.currentMood());
    this.cowdie.setVitals({
      fullness: this.state.fullness,
      hygiene: this.state.hygiene,
      happiness: this.state.happiness,
      stage: S.stageFromLevel(S.levelFromXp(this.state.xp)),
      asleep: this.state.asleep,
    });
    this.cowdie.update(dt, this.clock);
    this.particles.update(dt);
    this.checkLevelUp();

    const night = isNightNow();
    this.world.update(this.clock, dt, night);
    this.world.placeShadow(this.cowdie.footX, this.cowdie.footZ, this.cowdie.root.position.y);
    this.updateHud(dt, night);

    this.saveTimer -= dt;
    if (this.saveTimer <= 0) {
      this.save();
      this.saveTimer = 4;
    }
    this.world.render();
  }

  private runTasks(): void {
    const due = this.tasks.filter((t) => t.at <= this.clock);
    if (due.length === 0) return;
    this.tasks = this.tasks.filter((t) => t.at > this.clock);
    for (const task of due) task.run();
  }

  private after(seconds: number, run: () => void): void {
    this.tasks.push({ at: this.clock + seconds, run });
  }

  private updateFlights(dt: number): void {
    if (this.flights.length === 0) return;
    for (const f of this.flights) {
      f.t = Math.min(1, f.t + dt / f.duration);
      const e = easeInOut(f.t);
      f.mesh.position.lerpVectors(f.from, f.to, e);
      f.mesh.position.y += Math.sin(Math.PI * f.t) * f.arc;
      f.mesh.rotation.y += dt * 4;
      if (f.shrink) f.mesh.scale.setScalar(Math.max(0.001, 1 - f.t));
    }
    const done = this.flights.filter((f) => f.t >= 1);
    this.flights = this.flights.filter((f) => f.t < 1);
    for (const f of done) f.onDone();
  }

  private flyTo(mesh: THREE.Object3D, to: THREE.Vector3, duration: number, arc: number, shrink: boolean, onDone: () => void): void {
    this.flights.push({ mesh, from: mesh.position.clone(), to: to.clone(), t: 0, duration, arc, shrink, onDone });
  }

  private currentMood(): Mood {
    if (this.overlay && this.clock < this.overlayUntil) return this.overlay;
    this.overlay = null;
    const s = this.state;
    if (s.asleep) return "sleep";
    if (s.fullness < 25) return "hungry";
    if (s.hygiene < 25 || s.happiness < 25) return "sad";
    if (s.happiness > 75) return "happy";
    return "content";
  }

  private setOverlay(mood: Mood, seconds: number): void {
    this.overlay = mood;
    this.overlayUntil = this.clock + seconds;
  }

  private updateGaze(): void {
    if (this.drag) this.cowdie.lookAt(this.drag.mesh.position);
    else if (this.busy === "playing" && this.ball.visible) this.cowdie.lookAt(this.ball.position);
    else if (this.eatMesh) this.cowdie.lookAt(this.eatMesh.position);
    else if (this.flights.length > 0) this.cowdie.lookAt(this.flights[0].mesh.position);
    else this.cowdie.lookAt(null);
  }

  private updateHud(dt: number, night: boolean): void {
    this.hudTimer -= dt;
    if (this.hudTimer <= 0) {
      this.hud.renderStats(this.state);
      this.hud.renderIdentity(this.state);
      this.hudTimer = 0.1;
    }
    this.hud.renderTray(this.state);

    const head = this.headScreen();
    this.hud.placeBubble(head);
    this.hud.setZzz(this.state.asleep, head);
    this.hud.setStageMode({
      night,
      asleep: this.state.asleep,
      feedTarget: this.drag !== null && this.drag.near,
      dragging: this.drag !== null,
    });
    this.hud.setActiveAction("sleep", this.state.asleep);

    this.hintTimer -= dt;
    if (this.hintTimer <= 0) this.hud.hideHint();

    if (this.busy === "none" && !this.state.asleep && this.overlay === null) {
      this.idleTimer -= dt;
      if (this.idleTimer <= 0) {
        this.hud.say(this.thought(), head, 2.8);
        this.idleTimer = 8 + Math.random() * 6;
      }
    }
  }

  private thought(): string {
    const s = this.state;
    if (s.fullness < 30) return "I'm hungry...";
    if (s.hygiene < 30) return "I could use a bath.";
    if (s.energy < 25) return "So sleepy...";
    if (s.happiness < 35) return "Play with me?";
    return pick(IDLE_LINES);
  }

  private headScreen(): Screen {
    return this.world.toScreen(this.cowdie.headWorld(this.tmpB));
  }

  private clientOf(screen: Screen): Screen {
    const rect = this.canvas.getBoundingClientRect();
    return { x: rect.left + screen.x, y: rect.top + screen.y };
  }

  private mouthClient(): Screen {
    return this.clientOf(this.world.toScreen(this.cowdie.mouthWorld(this.tmpA)));
  }

  private resize(): void {
    const rect = this.stage.getBoundingClientRect();
    this.world.resize(Math.max(1, rect.width), Math.max(1, rect.height));
  }

  // ---------------------------------------------------------------- feeding

  private setTray(open: boolean): void {
    this.trayOpen = open;
    this.hud.setTrayOpen(open);
    this.hud.setActiveAction("feed", open);
  }

  private isLocked(food: FoodDef): boolean {
    return S.levelFromXp(this.state.xp) < food.unlockLevel;
  }

  private onTrayPointerDown(e: PointerEvent): void {
    const card = (e.target as HTMLElement).closest<HTMLElement>(".food-card");
    if (!card || !card.dataset.food) return;
    this.hideHint();
    this.justDragged = false;
    this.pending = { food: getFood(card.dataset.food as FoodId), card, x: e.clientX, y: e.clientY, dragging: false };
  }

  private onTrayClick(e: MouseEvent): void {
    if (this.justDragged) {
      this.justDragged = false;
      return;
    }
    const card = (e.target as HTMLElement).closest<HTMLElement>(".food-card");
    if (!card || !card.dataset.food) return;
    this.pending = null;
    this.feedFromCard(getFood(card.dataset.food as FoodId), card);
  }

  private onPointerMove(e: PointerEvent): void {
    const p = this.pending;
    if (!p) return;
    if (!p.dragging) {
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 8) return;
      if (this.isLocked(p.food)) {
        this.pending = null;
        this.hud.toast(`${p.food.name} unlocks at Lv ${p.food.unlockLevel}`);
        return;
      }
      if (this.busy !== "none") {
        this.pending = null;
        this.hud.toast(this.busy === "eating" ? "Still chewing!" : "One thing at a time!");
        return;
      }
      p.dragging = true;
      this.justDragged = true;
      const start = this.world.clientToPlane(e.clientX, e.clientY, 1.35, new THREE.Vector3());
      const mesh = createFoodMesh(p.food.id);
      mesh.position.copy(start ?? new THREE.Vector3(0, 1, 1.35));
      this.world.scene.add(mesh);
      this.drag = { food: p.food, mesh, near: false };
    }
    if (!this.drag) return;
    const target = this.world.clientToPlane(e.clientX, e.clientY, 1.35, this.tmpA);
    if (target) this.drag.mesh.position.lerp(target, 0.55);
    const mouth = this.mouthClient();
    this.drag.near = Math.hypot(e.clientX - mouth.x, e.clientY - mouth.y) < DROP_RADIUS_PX;
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.pending) return;
    this.pending = null;
    if (!this.drag) return;
    const { food, mesh } = this.drag;
    this.drag = null;
    const mouth = this.mouthClient();
    if (Math.hypot(e.clientX - mouth.x, e.clientY - mouth.y) < DROP_RADIUS_PX) {
      this.resolveFeed(food, mesh);
      this.setTray(false);
      return;
    }
    // Missed the mouth: the food slides back to where it came from and disappears.
    this.flyTo(mesh, this.cardWorld(food.id) ?? new THREE.Vector3(0, 0.4, 2.2), 0.4, 0.2, true, () => disposeObject(mesh));
  }

  private cardWorld(id: FoodId): THREE.Vector3 | null {
    const card = document.querySelector<HTMLElement>(`.food-card[data-food="${id}"]`);
    if (!card || !this.trayOpen) return null;
    const rect = card.getBoundingClientRect();
    return this.world.clientToPlane(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.35, new THREE.Vector3());
  }

  private feedFromCard(food: FoodDef, card: HTMLElement): void {
    this.hideHint();
    if (this.isLocked(food)) {
      this.hud.toast(`${food.name} unlocks at Lv ${food.unlockLevel}`);
      return;
    }
    if (this.busy !== "none") {
      this.hud.toast(this.busy === "eating" ? "Still chewing!" : "One thing at a time!");
      return;
    }
    this.setTray(false);
    const rect = card.getBoundingClientRect();
    const start = this.world.clientToPlane(rect.left + rect.width / 2, rect.top + rect.height / 2, 1.35, new THREE.Vector3());
    const mesh = createFoodMesh(food.id);
    mesh.position.copy(start ?? new THREE.Vector3(0, 1, 1.35));
    this.world.scene.add(mesh);
    this.resolveFeed(food, mesh);
  }

  /** Decides whether the food is eaten, refused, or wakes Cowdie first. */
  private resolveFeed(food: FoodDef, mesh: THREE.Object3D): void {
    if (this.state.asleep) {
      this.setAsleep(false, "Mm? Food?");
    }
    const block = S.feedBlock(this.state, food);
    if (block === "locked") {
      this.hud.toast(`${food.name} unlocks at Lv ${food.unlockLevel}`);
      disposeObject(mesh);
      return;
    }
    if (block === "full") {
      this.refuse(food, mesh);
      return;
    }
    this.eat(food, mesh);
  }

  private eat(food: FoodDef, mesh: THREE.Object3D): void {
    this.busy = "eating";
    this.sfx.whoosh();
    this.flyTo(mesh, this.cowdie.mouthWorld(new THREE.Vector3()), 0.42, 0.7, false, () => {
      this.eatMesh = mesh;
      this.eatScale = 1;
      this.after(0.08, () => this.bite(food, 0));
      this.after(0.6, () => this.bite(food, 1));
      this.after(1.12, () => this.bite(food, 2));
      this.after(1.65, () => this.finishEat(food, mesh));
    });
  }

  private bite(food: FoodDef, index: number): void {
    this.cowdie.bite();
    this.sfx.chomp();
    const mouth = this.cowdie.mouthWorld(new THREE.Vector3());
    const crumbs = food.effect.hygiene < 0 ? 14 : 5;
    this.particles.emit("crumb", mouth, { count: crumbs, speed: 1.6, spread: 0.1, life: 0.9, gravity: -5, size: 1 });
    this.state = S.applyBite(this.state, food, 1 / 3);
    this.eatScale = 1 - ((index + 1) / 3) * 0.7;
    this.hud.renderStats(this.state);
  }

  private finishEat(food: FoodDef, mesh: THREE.Object3D): void {
    this.eatMesh = null;
    disposeObject(mesh);
    this.state = S.countMeal(this.state);
    this.busy = "none";
    this.setOverlay("yum", 1.8);
    this.cowdie.jump(0.3, 0.5);
    this.sfx.yum();
    const head = this.headScreen();
    for (let i = 0; i < 3; i++) {
      this.after(i * 0.12, () => this.hud.floatEmoji(i === 1 ? "✨" : "💖", { x: head.x + (i - 1) * 22, y: head.y }));
    }
    this.hud.say(pick(food.quips), head, 2.4);
    this.save();
  }

  private refuse(food: FoodDef, mesh: THREE.Object3D): void {
    const mouth = this.cowdie.mouthWorld(new THREE.Vector3()).add(new THREE.Vector3(0, 0.1, 0.95));
    this.flyTo(mesh, mouth, 0.3, 0.25, false, () => {
      this.cowdie.shake(0.9);
      this.sfx.refuse();
      this.setOverlay("annoyed", 1.8);
      this.hud.say(pick(["Too full!", "No more, please!", "Blegh..."]), this.headScreen(), 2.2);
      this.flyTo(mesh, this.cardWorld(food.id) ?? new THREE.Vector3(0, 0.4, 2.2), 0.5, 0.3, true, () => disposeObject(mesh));
    });
  }

  // ---------------------------------------------------------------- care actions

  private blockedByBusy(): boolean {
    if (this.busy === "none") return false;
    this.hud.toast(this.busy === "eating" ? "Still chewing!" : "One thing at a time!");
    return true;
  }

  private play(): void {
    this.hideHint();
    if (this.blockedByBusy()) return;
    if (this.state.asleep) {
      this.hud.toast("Shh, Cowdie is sleeping");
      return;
    }
    this.busy = "playing";
    this.hud.setActiveAction("play", true);
    this.ball.visible = true;
    this.ball.position.copy(this.cowdie.mouthWorld(new THREE.Vector3()));
    const tx = Math.random() * 4 - 2;
    const tz = 2.1 + Math.random() * 1.1;
    this.flyTo(this.ball, new THREE.Vector3(tx, 0.16, tz), 0.85, 1.1, false, () => {
      this.cowdie.walkTo(tx, tz - 0.8, 0.9).then(() => {
        this.ball.visible = false;
        this.particles.emit("sparkle", new THREE.Vector3(tx, 0.4, tz), { count: 10, speed: 2, life: 0.8, gravity: -1.5, size: 1, spread: 0.1 });
        this.sfx.poke();
        this.cowdie.jump(0.6, 0.6);
        this.setOverlay("happy", 1.6);
        this.after(0.9, () => {
          this.cowdie.walkTo(0, 0, 1).then(() => this.finishPlay());
        });
      });
    });
  }

  private finishPlay(): void {
    this.busy = "none";
    this.hud.setActiveAction("play", false);
    this.state = S.applyPlay(this.state);
    this.hud.say("Again! Again!", this.headScreen(), 2);
    this.save();
  }

  private bathe(): void {
    this.hideHint();
    if (this.blockedByBusy()) return;
    if (this.state.asleep) {
      this.hud.toast("Shh, Cowdie is sleeping");
      return;
    }
    this.busy = "bathing";
    this.bathTimer = 2.8;
    this.bathBubbleTimer = 0;
    this.hud.setActiveAction("bathe", true);
    this.sfx.whoosh();
    this.cowdie.shake(1.2);
    this.hud.say("Splish splash!", this.headScreen(), 2.2);
  }

  private updateBath(dt: number): void {
    if (this.busy !== "bathing") return;
    const step = Math.min(dt, this.bathTimer);
    this.bathTimer -= dt;
    this.bathBubbleTimer -= dt;
    this.state = S.applyBathe(this.state, step / 2.8);
    if (this.bathBubbleTimer <= 0) {
      this.bathBubbleTimer = 0.07;
      this.particles.emit("bubble", new THREE.Vector3(0, 1.1, 0), {
        count: 2,
        speed: 1.1,
        spread: 0.8,
        life: 2.2,
        gravity: 0.5,
        size: 0.26,
        up: 0.8,
      });
    }
    if (this.bathTimer <= 0) {
      this.busy = "none";
      this.hud.setActiveAction("bathe", false);
      this.setOverlay("happy", 1.4);
      this.sfx.pop();
      this.save();
    }
  }

  private toggleSleep(): void {
    this.hideHint();
    if (this.blockedByBusy()) return;
    this.setAsleep(!this.state.asleep);
  }

  private setAsleep(asleep: boolean, line?: string): void {
    this.state = S.setAsleep(this.state, asleep);
    this.wasAsleep = asleep;
    this.hud.setSleepLabel(asleep);
    if (asleep) {
      this.hud.say(line ?? "Zzz... night night.", this.headScreen(), 2.4);
    } else {
      this.setOverlay("happy", 1.6);
      this.sfx.pop();
      this.hud.say(line ?? "Good morning!", this.headScreen(), 2.4);
    }
    this.save();
  }

  private handleSleepTransition(): void {
    if (this.wasAsleep === this.state.asleep) return;
    this.wasAsleep = this.state.asleep;
    this.hud.setSleepLabel(this.state.asleep);
    if (this.state.asleep) {
      this.hud.say("*yawn* ...zzz", this.headScreen(), 2.4);
    } else {
      this.setOverlay("happy", 1.6);
      this.hud.say("Good morning! I'm rested.", this.headScreen(), 2.6);
    }
  }

  private onCanvasClick(e: MouseEvent): void {
    if (this.drag || this.pending) return;
    this.hideHint();
    const center = this.clientOf(this.world.toScreen(this.cowdie.root.localToWorld(this.tmpA.set(0, 1, 0))));
    if (Math.hypot(e.clientX - center.x, e.clientY - center.y) > POKE_RADIUS_PX) return;
    this.poke();
  }

  private poke(): void {
    const head = this.headScreen();
    if (this.state.asleep) {
      this.cowdie.shake(0.5);
      this.hud.say("Mmh... five more minutes.", head, 2);
      return;
    }
    if (this.pokeCooldown > 0) {
      this.cowdie.jump(0.2, 0.4);
      return;
    }
    this.pokeCooldown = 1.2;
    this.cowdie.jump(0.5, 0.55);
    this.sfx.poke();
    this.state = S.applyPoke(this.state);
    this.setOverlay("happy", 1.4);
    this.particles.emit("sparkle", this.cowdie.headWorld(new THREE.Vector3()), {
      count: 6,
      speed: 2,
      life: 0.7,
      gravity: -1,
      spread: 0.1,
    });
    this.hud.floatEmoji("💖", head);
    this.hud.say(pick(POKE_LINES), head, 1.5);
  }

  private toggleSound(): void {
    this.sfx.enabled = !this.sfx.enabled;
    this.sfx.unlock();
    this.hud.setSoundOn(this.sfx.enabled);
    localStorage.setItem(SOUND_KEY, this.sfx.enabled ? "1" : "0");
  }

  private onReset(): void {
    const button = byId<HTMLButtonElement>("btn-reset");
    if (this.clock > this.resetArmedUntil) {
      this.resetArmedUntil = this.clock + 3;
      button.textContent = "Sure?";
      this.after(3, () => {
        button.textContent = "↺";
      });
      return;
    }
    this.resetArmedUntil = 0;
    button.textContent = "↺";
    this.resetPet();
  }

  private resetPet(): void {
    this.tasks = [];
    for (const f of this.flights) {
      if (f.mesh !== this.ball) disposeObject(f.mesh);
    }
    this.flights = [];
    if (this.eatMesh) disposeObject(this.eatMesh);
    this.eatMesh = null;
    if (this.drag) disposeObject(this.drag.mesh);
    this.drag = null;
    this.ball.visible = false;
    this.busy = "none";
    this.bathTimer = 0;
    this.overlay = null;
    this.hud.setActiveAction("play", false);
    this.hud.setActiveAction("bathe", false);
    this.state = S.createPet(Date.now());
    this.lastLevel = 1;
    this.wasAsleep = false;
    this.hud.setSleepLabel(false);
    this.hud.toast("A fresh Cowdie!");
    this.save();
  }

  private checkLevelUp(): void {
    const level = S.levelFromXp(this.state.xp);
    if (level <= this.lastLevel) return;
    this.lastLevel = level;
    this.cowdie.jump(0.6, 0.7);
    this.sfx.yum();
    this.particles.emit("sparkle", this.cowdie.headWorld(new THREE.Vector3()), { count: 18, speed: 2.4, life: 1, gravity: -1, spread: 0.2 });
    const unlocked = FOODS.find((f) => f.unlockLevel === level);
    this.hud.say("I grew up!", this.headScreen(), 2.4);
    this.hud.toast(unlocked ? `Lv ${level}: ${unlocked.name} unlocked!` : `Lv ${level}: Cowdie grew up!`, 3);
  }

  private hideHint(): void {
    this.hintTimer = 0;
    this.hud.hideHint();
  }

  // ---------------------------------------------------------------- persistence

  private readSave(): string | null {
    try {
      return localStorage.getItem(S.SAVE_KEY);
    } catch {
      return null;
    }
  }

  private save(): void {
    try {
      localStorage.setItem(S.SAVE_KEY, S.serializeState(this.state));
    } catch {
      // Storage can be full or disabled; the pet still works for this session.
    }
  }
}
