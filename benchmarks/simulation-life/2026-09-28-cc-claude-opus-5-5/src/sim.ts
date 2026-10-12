import type { Params } from './params.ts';

export type Kind = 'blue' | 'red';

export type Action =
  | 'wandering'
  | 'seeking fruit'
  | 'eating'
  | 'fleeing'
  | 'budding'
  | 'hunting'
  | 'roaming'
  | 'resting'
  | 'catching breath';

export interface Blob {
  id: number;
  kind: Kind;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  energy: number;
  age: number;
  lifespan: number;
  born: number;
  generation: number;
  parent: number;
  children: number;
  /** Inherited multipliers on the group speed / vision settings. */
  sGene: number;
  vGene: number;
  action: Action;
  timer: number;
  timerTotal: number;
  wander: number;
  targetTree: number;
  targetBlob: number;
  /** red currently chasing this blue (reds don't gang up on the same blue) */
  huntedBy: number;
  huntedAt: number;
  chaseTime: number;
  /** blue: seconds of alarm left after noticing a red */
  alert: number;
  /** blue: sprint reserve 0..1, drains while fleeing */
  stamina: number;
  ignoreBlob: number;
  eatSlot: number;
  eaten: number;
  boops: number;
  alive: boolean;
  diedAt: number;
  deathCause: string;
  /** distance travelled, drives hop animation */
  stride: number;
  /** last time energy was gained (for the glow pulse) */
  gainedAt: number;
}

export interface FruitSlot {
  /** growth 0..1; ripe at 1 */
  g: number;
  delay: number;
  reserved: boolean;
  /** screen-plane offsets on the canopy, in world units */
  ox: number;
  oy: number;
}

export interface Tree {
  id: number;
  x: number;
  y: number;
  r: number;
  slots: FruitSlot[];
  sway: number;
  hue: number;
}

export interface SimEvent {
  type: 'boop' | 'birth' | 'chomp' | 'fade' | 'pickup';
  kind: Kind;
  x: number;
  y: number;
  t: number;
  amount?: number;
}

export interface Sample {
  t: number;
  fruit: number;
  blue: number;
  red: number;
  blueSpeed: number;
  blueVision: number;
  redSpeed: number;
  redVision: number;
  blueEnergy: number;
  redEnergy: number;
}

export interface Totals {
  blueBirths: number;
  redBirths: number;
  boops: number;
  fruitEaten: number;
  blueStarved: number;
  redStarved: number;
  oldAge: number;
}

export const DT = 0.05;
export const SAMPLE_EVERY = 0.5;
export const FRUIT_ENERGY = 22;
export const BLOB_R = 0.62;
export const CONTACT_DIST = 1.35;
export const TRUNK_R = 0.9;
export const MAX_SLOTS = 12;
export const POP_CAP = 900;

const BLUE_REF_SPEED = 3.2;
const RED_REF_SPEED = 3.8;
export const tune = { space: 4, spaceW: 1.5 };
let RED_SPACE = 4;
let RED_SPACE_W = 1.5;
export function setTune(a: number, b: number) {
  RED_SPACE = a;
  RED_SPACE_W = b;
}

export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = (Math.floor(seed) * 2654435761) >>> 0 || 1;
  }
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(a: number, b: number): number {
    return a + (b - a) * this.next();
  }
  gauss(): number {
    const u = Math.max(1e-9, this.next());
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}

const SYL_A = ['Bo', 'Pi', 'Mu', 'Lu', 'Ze', 'Ki', 'No', 'Fi', 'Ru', 'Ta', 'Wo', 'Gu', 'Ya', 'Po', 'Mi', 'Du'];
const SYL_B = ['bo', 'li', 'mo', 'pi', 'nu', 'ki', 'ba', 'lu', 'zo', 'ppy', 'mble', 'dle', 'bs', 'ggle', 'nk', 'sh'];
function blobName(id: number): string {
  const h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return SYL_A[h & 15] + SYL_B[(h >>> 4) & 15];
}

class Grid {
  private cells = new Map<number, Blob[]>();
  private size: number;
  constructor(size: number) {
    this.size = size;
  }
  clear() {
    for (const arr of this.cells.values()) arr.length = 0;
  }
  private key(cx: number, cy: number) {
    return (cx + 512) * 2048 + (cy + 512);
  }
  add(b: Blob) {
    const k = this.key(Math.floor(b.x / this.size), Math.floor(b.y / this.size));
    let arr = this.cells.get(k);
    if (!arr) this.cells.set(k, (arr = []));
    arr.push(b);
  }
  forEachNear(x: number, y: number, r: number, fn: (b: Blob, d2: number) => void) {
    const x0 = Math.floor((x - r) / this.size);
    const x1 = Math.floor((x + r) / this.size);
    const y0 = Math.floor((y - r) / this.size);
    const y1 = Math.floor((y + r) / this.size);
    const r2 = r * r;
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const arr = this.cells.get(this.key(cx, cy));
        if (!arr) continue;
        for (const b of arr) {
          if (!b.alive) continue;
          const dx = b.x - x;
          const dy = b.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 <= r2) fn(b, d2);
        }
      }
    }
  }
}

export class Simulation {
  p: Params;
  rng: Rng;
  t = 0;
  R: number;
  trees: Tree[] = [];
  blobs: Blob[] = [];
  history: Sample[] = [];
  events: SimEvent[] = [];
  totals: Totals = { blueBirths: 0, redBirths: 0, boops: 0, fruitEaten: 0, blueStarved: 0, redStarved: 0, oldAge: 0 };
  /** Recently departed blobs, so the inspector can explain what happened. */
  graveyard = new Map<number, Blob>();
  private nextId = 1;
  private sampleClock = 0;
  private blueGrid = new Grid(4);
  private redGrid = new Grid(4);
  private newborns: Blob[] = [];
  blueCount = 0;
  redCount = 0;

  constructor(params: Params) {
    this.p = { ...params };
    this.rng = new Rng(params.seed);
    this.R = params.worldSize;
    this.plantTrees();
    for (let i = 0; i < params.blues; i++) this.spawnInitial('blue');
    for (let i = 0; i < params.reds; i++) this.spawnInitial('red');
    this.countPop();
    this.record();
  }

  // ---------------------------------------------------------------- setup

  private plantTrees() {
    const rng = this.rng;
    const n = this.p.trees;
    const maxR = this.R - 3;
    const minGap = Math.max(3.2, Math.min(7, (this.R * 1.6) / Math.sqrt(n)));
    for (let i = 0; i < n; i++) {
      let best = { x: 0, y: 0, score: -1 };
      for (let tries = 0; tries < 40; tries++) {
        const a = rng.next() * Math.PI * 2;
        const rr = Math.sqrt(rng.next()) * maxR;
        const x = Math.cos(a) * rr;
        const y = Math.sin(a) * rr;
        let near = Infinity;
        for (const t of this.trees) near = Math.min(near, Math.hypot(t.x - x, t.y - y));
        if (near >= minGap) {
          best = { x, y, score: near };
          break;
        }
        if (near > best.score) best = { x, y, score: near };
      }
      const r = rng.range(1.45, 1.85);
      const slots: FruitSlot[] = [];
      for (let s = 0; s < MAX_SLOTS; s++) {
        // spread fruit spots over the visible face of the canopy
        const a = s * 2.399963 + rng.range(-0.3, 0.3);
        const rad = r * 0.78 * Math.sqrt((s + 0.6) / MAX_SLOTS);
        slots.push({
          g: s < this.p.fruitLimit ? rng.range(0.55, 1) : 0,
          delay: 0,
          reserved: false,
          ox: Math.cos(a) * rad,
          oy: Math.sin(a) * rad * 0.8,
        });
      }
      for (const sl of slots) if (sl.g > 0.9) sl.g = 1;
      this.trees.push({ id: i, x: best.x, y: best.y, r, slots, sway: rng.next() * Math.PI * 2, hue: rng.range(-12, 12) });
    }
  }

  private randomFreeSpot(): { x: number; y: number } {
    for (let tries = 0; tries < 30; tries++) {
      const a = this.rng.next() * Math.PI * 2;
      const rr = Math.sqrt(this.rng.next()) * (this.R - 1.5);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (this.trees.every((t) => Math.hypot(t.x - x, t.y - y) > TRUNK_R + 0.8)) return { x, y };
    }
    return { x: 0, y: 0 };
  }

  private makeBlob(kind: Kind, x: number, y: number, energy: number, sGene: number, vGene: number, parent: Blob | null): Blob {
    const id = this.nextId++;
    const life = kind === 'blue' ? this.rng.range(110, 170) : this.rng.range(140, 210);
    return {
      id,
      kind,
      name: blobName(id),
      x,
      y,
      vx: 0,
      vy: 0,
      energy,
      age: 0,
      lifespan: life,
      born: this.t,
      generation: parent ? parent.generation + 1 : 1,
      parent: parent ? parent.id : 0,
      children: 0,
      sGene,
      vGene,
      action: kind === 'blue' ? 'wandering' : 'roaming',
      timer: 0,
      timerTotal: 0,
      wander: this.rng.next() * Math.PI * 2,
      targetTree: -1,
      targetBlob: -1,
      huntedBy: 0,
      huntedAt: -99,
      chaseTime: 0,
      alert: 0,
      stamina: 1,
      ignoreBlob: -1,
      eatSlot: -1,
      eaten: 0,
      boops: 0,
      alive: true,
      diedAt: -1,
      deathCause: '',
      stride: this.rng.next() * 10,
      gainedAt: -99,
    };
  }

  private spawnInitial(kind: Kind) {
    const { x, y } = this.randomFreeSpot();
    const copy = kind === 'blue' ? this.p.blueCopy : this.p.redCopy;
    const b = this.makeBlob(kind, x, y, copy * this.rng.range(0.4, 0.75), 1 + this.rng.gauss() * 0.05, 1 + this.rng.gauss() * 0.05, null);
    b.age = this.rng.range(0, b.lifespan * 0.4);
    this.blobs.push(b);
  }

  /** Drop a few extra blobs into the running world. */
  addBlobs(kind: Kind, n: number) {
    for (let i = 0; i < n; i++) {
      const { x, y } = this.randomFreeSpot();
      const copy = kind === 'blue' ? this.p.blueCopy : this.p.redCopy;
      const b = this.makeBlob(kind, x, y, copy * 0.6, 1 + this.rng.gauss() * 0.05, 1 + this.rng.gauss() * 0.05, null);
      this.blobs.push(b);
      this.events.push({ type: 'birth', kind, x, y, t: this.t });
    }
    this.countPop();
  }

  // ---------------------------------------------------------------- stepping

  step() {
    const dt = DT;
    this.t += dt;
    this.growFruit(dt);

    this.blueGrid.clear();
    this.redGrid.clear();
    for (const b of this.blobs) {
      if (!b.alive) continue;
      (b.kind === 'blue' ? this.blueGrid : this.redGrid).add(b);
    }

    for (const b of this.blobs) {
      if (!b.alive) continue;
      if (b.kind === 'blue') this.updateBlue(b, dt);
      else this.updateRed(b, dt);
    }

    let write = 0;
    for (const b of this.blobs) if (b.alive) this.blobs[write++] = b;
    this.blobs.length = write;
    if (this.newborns.length) {
      this.blobs.push(...this.newborns);
      this.newborns.length = 0;
    }
    this.countPop();

    this.sampleClock += dt;
    if (this.sampleClock >= SAMPLE_EVERY - 1e-9) {
      this.sampleClock = 0;
      this.record();
    }
    if (this.events.length > 400) this.events.splice(0, this.events.length - 400);
  }

  private countPop() {
    let bl = 0;
    let rd = 0;
    for (const b of this.blobs) {
      if (!b.alive) continue;
      if (b.kind === 'blue') bl++;
      else rd++;
    }
    this.blueCount = bl;
    this.redCount = rd;
  }

  private growFruit(dt: number) {
    const lim = Math.round(this.p.fruitLimit);
    for (const tr of this.trees) {
      for (let i = 0; i < MAX_SLOTS; i++) {
        const s = tr.slots[i];
        if (i >= lim) {
          // spots beyond the limit wither gently
          if (!s.reserved && s.g > 0) s.g = Math.max(0, s.g - dt * 0.5);
          continue;
        }
        if (s.reserved) continue;
        if (s.delay > 0) {
          s.delay -= dt;
          continue;
        }
        if (s.g < 1) s.g = Math.min(1, s.g + this.p.fruitGrowth * dt);
      }
    }
  }

  ripeFruit(): number {
    let n = 0;
    const lim = Math.round(this.p.fruitLimit);
    for (const tr of this.trees) for (let i = 0; i < lim; i++) if (tr.slots[i].g >= 1 && !tr.slots[i].reserved) n++;
    return n;
  }

  private treeHasRipe(tr: Tree): boolean {
    const lim = Math.round(this.p.fruitLimit);
    for (let i = 0; i < lim; i++) if (tr.slots[i].g >= 1 && !tr.slots[i].reserved) return true;
    return false;
  }

  private record() {
    let bs = 0, bv = 0, rs = 0, rv = 0, be = 0, re = 0;
    for (const b of this.blobs) {
      if (!b.alive) continue;
      if (b.kind === 'blue') {
        bs += b.sGene;
        bv += b.vGene;
        be += b.energy;
      } else {
        rs += b.sGene;
        rv += b.vGene;
        re += b.energy;
      }
    }
    const nb = this.blueCount;
    const nr = this.redCount;
    this.history.push({
      t: Math.round(this.t * 100) / 100,
      fruit: this.ripeFruit(),
      blue: nb,
      red: nr,
      blueSpeed: nb ? bs / nb : NaN,
      blueVision: nb ? bv / nb : NaN,
      redSpeed: nr ? rs / nr : NaN,
      redVision: nr ? rv / nr : NaN,
      blueEnergy: nb ? be / nb : 0,
      redEnergy: nr ? re / nr : 0,
    });
  }

  // ---------------------------------------------------------------- behaviour helpers

  private steer(b: Blob, dx: number, dy: number, speed: number, dt: number, agility: number) {
    const len = Math.hypot(dx, dy);
    let tx = 0, ty = 0;
    if (len > 1e-6) {
      tx = (dx / len) * speed;
      ty = (dy / len) * speed;
    }
    const k = Math.min(1, dt * agility);
    b.vx += (tx - b.vx) * k;
    b.vy += (ty - b.vy) * k;
  }

  private move(b: Blob, dt: number) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    // keep off tree trunks
    for (const tr of this.trees) {
      const dx = b.x - tr.x;
      const dy = b.y - tr.y;
      const d = Math.hypot(dx, dy);
      const min = TRUNK_R + BLOB_R * 0.6;
      if (d < min && d > 1e-6) {
        b.x = tr.x + (dx / d) * min;
        b.y = tr.y + (dy / d) * min;
      }
    }
    // stay inside the dish
    const r = Math.hypot(b.x, b.y);
    const lim = this.R - BLOB_R - 0.2;
    if (r > lim) {
      const nx = b.x / r;
      const ny = b.y / r;
      b.x = nx * lim;
      b.y = ny * lim;
      const vn = b.vx * nx + b.vy * ny;
      if (vn > 0) {
        b.vx -= 1.6 * vn * nx;
        b.vy -= 1.6 * vn * ny;
      }
      b.wander = Math.atan2(-ny, -nx) + this.rng.range(-1, 1);
    }
    b.stride += Math.hypot(b.vx, b.vy) * dt;
  }

  /** Inward pull near the rim so blobs don't hug the edge while fleeing / wandering. */
  private edgeBias(b: Blob): { x: number; y: number } {
    const r = Math.hypot(b.x, b.y);
    const start = this.R - 4;
    if (r < start || r < 1e-6) return { x: 0, y: 0 };
    const k = (r - start) / 4;
    return { x: (-b.x / r) * k * 1.6, y: (-b.y / r) * k * 1.6 };
  }

  private burn(b: Blob, dt: number, use: number, refSpeed: number, vision: number, refVision: number) {
    const sp = Math.hypot(b.vx, b.vy);
    const ratio = sp / refSpeed;
    // waiting costs a little; moving costs more, and faster movement costs quadratically more
    const cost = use * (0.4 + 0.75 * ratio * ratio + 0.12 * (vision / refVision));
    b.energy -= cost * dt;
  }

  private die(b: Blob, cause: string) {
    b.alive = false;
    b.diedAt = this.t;
    b.deathCause = cause;
    b.action = b.action;
    this.releaseSlot(b);
    this.graveyard.set(b.id, b);
    if (this.graveyard.size > 300) {
      const first = this.graveyard.keys().next().value;
      if (first !== undefined) this.graveyard.delete(first);
    }
  }

  private releaseSlot(b: Blob) {
    if (b.eatSlot >= 0 && b.targetTree >= 0) {
      const s = this.trees[b.targetTree]?.slots[b.eatSlot];
      if (s) s.reserved = false;
    }
    b.eatSlot = -1;
  }

  private mutate(g: number): number {
    return Math.min(1.8, Math.max(0.5, g * (1 + this.rng.gauss() * 0.06)));
  }

  private tryBud(b: Blob, copy: number) {
    if (b.energy < copy) return false;
    if (this.blueCount + this.redCount + this.newborns.length >= POP_CAP) return false;
    // budding spends stored energy: parent keeps 45%, child gets 40%, 15% is lost to the effort
    b.energy -= copy * 0.6;
    const a = this.rng.next() * Math.PI * 2;
    const child = this.makeBlob(b.kind, b.x + Math.cos(a) * 0.9, b.y + Math.sin(a) * 0.9, copy * 0.4, this.mutate(b.sGene), this.mutate(b.vGene), b);
    child.vx = Math.cos(a) * 1.5;
    child.vy = Math.sin(a) * 1.5;
    b.children++;
    this.newborns.push(child);
    if (b.kind === 'blue') this.totals.blueBirths++;
    else this.totals.redBirths++;
    this.events.push({ type: 'birth', kind: b.kind, x: child.x, y: child.y, t: this.t });
    b.action = 'budding';
    b.timer = b.timerTotal = 0.8;
    return true;
  }

  // ---------------------------------------------------------------- blue

  private updateBlue(b: Blob, dt: number) {
    const p = this.p;
    b.age += dt;
    const speed = p.blueSpeed * b.sGene;
    const vision = p.blueVision * b.vGene;
    let dx = 0, dy = 0, want = 0;
    b.alert = Math.max(0, b.alert - dt);
    if (b.action !== 'fleeing') b.stamina = Math.min(1, b.stamina + dt * 0.15);

    if (b.timer > 0) {
      b.timer -= dt;
      if (b.timer <= 0) {
        b.timer = 0;
        if (b.action === 'eating') this.finishEating(b);
        else b.action = 'wandering';
      }
      b.vx *= 0.8;
      b.vy *= 0.8;
    } else {
      // 1. danger: move away from nearby reds (closer reds weigh more)
      // Blues don't notice reds instantly: busy, hungry blues react slower.
      let fx = 0, fy = 0, threat = 0;
      this.redGrid.forEachNear(b.x, b.y, vision * 0.9, (r, d2) => {
        const d = Math.sqrt(d2) + 0.3;
        fx += (b.x - r.x) / (d * d);
        fy += (b.y - r.y) / (d * d);
        threat++;
      });
      if (threat > 0 && b.alert <= 0) {
        const hungry = b.energy < p.blueCopy * 0.3;
        const noticeRate = b.action === 'seeking fruit' || hungry ? 1.2 : 2.5;
        if (this.rng.next() < noticeRate * dt) b.alert = 1.5;
      }
      if (threat > 0 && b.alert > 0) {
        b.alert = 1.5;
        b.action = 'fleeing';
        b.targetTree = -1;
        const e = this.edgeBias(b);
        const fl = Math.hypot(fx, fy) || 1;
        dx = fx / fl + e.x;
        dy = fy / fl + e.y;
        // a sprint that fades as stamina drains; low-energy blues can't run as hard
        b.stamina = Math.max(0, b.stamina - dt * 0.3);
        want = (0.72 + 0.28 * b.stamina) * (b.energy < p.blueCopy * 0.25 ? 0.85 : 1);
      } else {
        // 2. food: head for a visible tree with ripe fruit
        let tr = b.targetTree >= 0 ? this.trees[b.targetTree] : undefined;
        if (tr && (!this.treeHasRipe(tr) || Math.hypot(tr.x - b.x, tr.y - b.y) > vision * 1.3)) tr = undefined;
        if (!tr) tr = this.findTree(b, vision);
        if (tr) {
          b.targetTree = tr.id;
          const tdx = tr.x - b.x;
          const tdy = tr.y - b.y;
          const d = Math.hypot(tdx, tdy);
          if (d < tr.r + 0.55) {
            this.startEating(b, tr);
          } else {
            b.action = 'seeking fruit';
            dx = tdx / d;
            dy = tdy / d;
            want = d < 3 ? 0.6 : 0.85;
          }
        } else {
          b.targetTree = -1;
          b.action = 'wandering';
          b.wander += this.rng.gauss() * dt * 2.2;
          const e = this.edgeBias(b);
          dx = Math.cos(b.wander) + e.x;
          dy = Math.sin(b.wander) + e.y;
          want = 0.5;
        }
      }
      // 3. personal space: drift away from crowded spots
      let sx = 0, sy = 0;
      this.blueGrid.forEachNear(b.x, b.y, 1.8, (o, d2) => {
        if (o === b || d2 < 1e-6) return;
        const d = Math.sqrt(d2);
        const w = (1.8 - d) / 1.8;
        sx += ((b.x - o.x) / d) * w;
        sy += ((b.y - o.y) / d) * w;
      });
      dx += sx * 1.3;
      dy += sy * 1.3;
      if (b.timer === 0) this.steer(b, dx, dy, speed * want, dt, b.action === 'fleeing' ? 7 : 4);
    }

    this.move(b, dt);
    this.burn(b, dt, p.blueUse, BLUE_REF_SPEED, vision, 6);
    if (b.energy <= 0) {
      this.totals.blueStarved++;
      this.die(b, 'ran out of energy');
      this.events.push({ type: 'fade', kind: 'blue', x: b.x, y: b.y, t: this.t });
    } else if (b.age > b.lifespan) {
      this.totals.oldAge++;
      this.die(b, 'drifted off after a long life');
      this.events.push({ type: 'fade', kind: 'blue', x: b.x, y: b.y, t: this.t });
    }
  }

  private findTree(b: Blob, vision: number): Tree | undefined {
    let best: Tree | undefined;
    let bestScore = Infinity;
    const lim = Math.round(this.p.fruitLimit);
    for (const tr of this.trees) {
      const d = Math.hypot(tr.x - b.x, tr.y - b.y);
      if (d > vision + tr.r) continue;
      let ripe = 0;
      for (let i = 0; i < lim; i++) if (tr.slots[i].g >= 1 && !tr.slots[i].reserved) ripe++;
      if (!ripe) continue;
      // prefer near trees with plenty of fruit left
      const score = d - Math.min(ripe, 4) * 0.8;
      if (score < bestScore) {
        bestScore = score;
        best = tr;
      }
    }
    return best;
  }

  private startEating(b: Blob, tr: Tree) {
    const lim = Math.round(this.p.fruitLimit);
    for (let i = 0; i < lim; i++) {
      const s = tr.slots[i];
      if (s.g >= 1 && !s.reserved) {
        s.reserved = true;
        b.eatSlot = i;
        b.targetTree = tr.id;
        b.action = 'eating';
        b.timer = b.timerTotal = Math.max(0.05, this.p.blueEat);
        b.vx *= 0.3;
        b.vy *= 0.3;
        this.events.push({ type: 'pickup', kind: 'blue', x: tr.x + s.ox, y: tr.y, t: this.t });
        return;
      }
    }
  }

  private finishEating(b: Blob) {
    const tr = this.trees[b.targetTree];
    const s = tr?.slots[b.eatSlot];
    if (s) {
      s.reserved = false;
      s.g = 0;
      s.delay = this.p.fruitDelay;
    }
    b.eatSlot = -1;
    b.energy += FRUIT_ENERGY;
    b.eaten++;
    b.gainedAt = this.t;
    this.totals.fruitEaten++;
    this.events.push({ type: 'chomp', kind: 'blue', x: b.x, y: b.y, t: this.t, amount: FRUIT_ENERGY });
    b.action = 'wandering';
    b.targetTree = -1;
    this.tryBud(b, this.p.blueCopy);
  }

  // ---------------------------------------------------------------- red

  private updateRed(b: Blob, dt: number) {
    const p = this.p;
    b.age += dt;
    const speed = p.redSpeed * b.sGene;
    const vision = p.redVision * b.vGene;
    let dx = 0, dy = 0, want = 0;

    if (b.timer > 0) {
      b.timer -= dt;
      if (b.timer <= 0) {
        b.timer = 0;
        b.action = 'roaming';
      }
      b.vx *= 0.85;
      b.vy *= 0.85;
    } else {
      let prey: Blob | null = null;
      let best = Infinity;
      this.blueGrid.forEachNear(b.x, b.y, vision, (o, d2) => {
        if (o.id === b.ignoreBlob) return;
        if (o.huntedBy !== b.id && this.t - o.huntedAt < 0.2) return;
        // prefer the current target a little, so reds don't dither
        const score = o.id === b.targetBlob ? d2 * 0.6 : d2;
        if (score < best) {
          best = score;
          prey = o;
        }
      });
      if (prey) {
        const q = prey as Blob;
        if (q.id !== b.targetBlob) {
          b.targetBlob = q.id;
          b.chaseTime = 0;
        }
        b.chaseTime += dt;
        q.huntedBy = b.id;
        q.huntedAt = this.t;
        const d = Math.hypot(q.x - b.x, q.y - b.y);
        if (d < CONTACT_DIST) {
          this.boop(b, q);
        } else if (b.chaseTime > 5) {
          // long chases are tiring: give up on this one and rest a moment
          b.action = 'catching breath';
          b.ignoreBlob = q.id;
          b.targetBlob = -1;
          b.timer = b.timerTotal = 1.5;
        } else {
          b.action = 'hunting';
          const lead = Math.min(1, d / speed) * 0.5;
          dx = q.x + q.vx * lead - b.x;
          dy = q.y + q.vy * lead - b.y;
          want = 1;
        }
      } else {
        b.targetBlob = -1;
        b.action = 'roaming';
        b.wander += this.rng.gauss() * dt * 1.6;
        const e = this.edgeBias(b);
        dx = Math.cos(b.wander) + e.x;
        dy = Math.sin(b.wander) + e.y;
        // hungry reds slow down to save energy
        want = b.energy < p.redCopy * 0.3 ? 0.35 : 0.55;
      }
      if (b.timer === 0) {
        let sx = 0, sy = 0;
        // reds keep their distance from each other, so crowds of reds hunt less well
        this.redGrid.forEachNear(b.x, b.y, RED_SPACE, (o, d2) => {
          if (o === b || d2 < 1e-6) return;
          const d = Math.sqrt(d2);
          const w = ((RED_SPACE - d) / RED_SPACE) * RED_SPACE_W;
          sx += ((b.x - o.x) / d) * w;
          sy += ((b.y - o.y) / d) * w;
        });
        const l = Math.hypot(dx, dy) || 1;
        this.steer(b, dx / l + sx, dy / l + sy, speed * want, dt, 5);
      }
    }

    this.move(b, dt);
    this.burn(b, dt, p.redUse, RED_REF_SPEED, vision, 8);
    if (b.energy <= 0) {
      this.totals.redStarved++;
      this.die(b, 'ran out of energy');
      this.events.push({ type: 'fade', kind: 'red', x: b.x, y: b.y, t: this.t });
    } else if (b.age > b.lifespan) {
      this.totals.oldAge++;
      this.die(b, 'drifted off after a long life');
      this.events.push({ type: 'fade', kind: 'red', x: b.x, y: b.y, t: this.t });
    }
  }

  private boop(r: Blob, blue: Blob) {
    this.totals.boops++;
    blue.action = blue.action;
    this.die(blue, `was booped by ${r.name} and floated away`);
    r.energy += this.p.redContact;
    r.boops++;
    r.gainedAt = this.t;
    r.targetBlob = -1;
    r.chaseTime = 0;
    r.ignoreBlob = -1;
    this.events.push({ type: 'boop', kind: 'red', x: blue.x, y: blue.y, t: this.t, amount: this.p.redContact });
    r.vx *= 0.2;
    r.vy *= 0.2;
    if (!this.tryBud(r, this.p.redCopy)) {
      r.action = 'resting';
      r.timer = r.timerTotal = Math.max(0.05, this.p.redPause);
    } else {
      r.timer = r.timerTotal = Math.max(0.8, this.p.redPause);
      r.action = 'budding';
    }
  }

  find(id: number): Blob | undefined {
    for (const b of this.blobs) if (b.id === id) return b;
    return this.graveyard.get(id);
  }
}
