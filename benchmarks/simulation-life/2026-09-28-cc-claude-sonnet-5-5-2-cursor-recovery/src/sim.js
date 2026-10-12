// Living-garden simulation: energy-driven agents. Nothing here is scripted; waves emerge from the rules.

export const DEFAULTS = {
  fruitGrowth: 0.16, // fruit per second per tree (when not resting)
  fruitLimit: 6, // max fruit per tree
  fruitDelay: 6, // seconds a tree rests after a fruit is taken
  blueUse: 1,
  blueSpeed: 5,
  blueVision: 14,
  blueCopy: 80,
  blueEat: 1.8,
  redUse: 1,
  redSpeed: 5.5,
  redVision: 16,
  redContact: 32,
  redCopy: 85,
  redPause: 3,
  trees: 16,
  blues: 30,
  reds: 10,
  worldSize: 50,
  seed: 7,
  simSpeed: 1,
};

export const RESET_KEYS = ['trees', 'blues', 'reds', 'worldSize', 'seed'];

export const MAX_SLOTS = 14;
const MAX_E = 120;
const FRUIT_ENERGY = 30;
const DT = 0.05;
const MAX_BLOBS = 700;
export const K = { FLEE: 0.9, WORTH: 25, RED_EFF: 0.75, REDIDLE: 0.12, REDMOVE: 0.45, REDCD: 7, REDREST: 0.35, INTERF: 0, FRUITE: 30, FLOOR: 20, REFUGE: 3.5 };

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Sim {
  constructor(params) {
    this.p = { ...DEFAULTS, ...params };
    this.reset();
  }

  setParams(p) {
    Object.assign(this.p, p);
  }

  rnd() {
    return this.rng();
  }
  gauss() {
    const u = 1 - this.rng();
    const v = this.rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  reset() {
    const p = this.p;
    this.rng = mulberry32(Math.floor(p.seed) * 2654435761);
    this.R = p.worldSize;
    this.t = 0;
    this.nextId = 1;
    this.blobs = [];
    this.trees = [];
    this.events = [];
    this.history = [];
    this.lastSample = -1;
    this.births = { blue: 0, red: 0 };
    this.deaths = { blue: 0, red: 0 };
    this.eaten = 0;
    this.contacts = 0;
    this.stats = { blue: 0, red: 0, fruit: 0 };
    // trees: poisson-ish placement
    const n = Math.round(p.trees);
    let sep = 9;
    for (let i = 0; i < n; i++) {
      let placed = false;
      for (let a = 0; a < 60 && !placed; a++) {
        const ang = this.rnd() * Math.PI * 2;
        const r = Math.sqrt(this.rnd()) * (this.R - 6);
        const x = Math.cos(ang) * r;
        const y = Math.sin(ang) * r;
        if (this.trees.every((t) => Math.hypot(t.x - x, t.y - y) > sep)) {
          this.addTree(x, y);
          placed = true;
        }
        if (a === 30) sep *= 0.7;
      }
      if (!placed) {
        const ang = this.rnd() * Math.PI * 2;
        const r = Math.sqrt(this.rnd()) * (this.R - 6);
        this.addTree(Math.cos(ang) * r, Math.sin(ang) * r);
      }
    }
    // begin with some fruit
    for (const tr of this.trees) {
      const k = Math.round(p.fruitLimit * (0.4 + 0.4 * this.rnd()));
      for (let i = 0; i < k; i++) this.growFruit(tr, 1);
    }
    for (let i = 0; i < p.blues; i++) this.spawn('blue', null);
    for (let i = 0; i < p.reds; i++) this.spawn('red', null);
    this.sample(true);
  }

  addTree(x, y) {
    this.trees.push({
      id: this.trees.length,
      x,
      y,
      size: new Float32Array(MAX_SLOTS),
      state: new Uint8Array(MAX_SLOTS), // 0 empty, 1 fruit, 2 being eaten
      eatT: new Float32Array(MAX_SLOTS),
      acc: this.rnd(),
      cool: 0,
      sway: this.rnd() * 6.28,
      variant: Math.floor(this.rnd() * 3),
      scale: 0.85 + this.rnd() * 0.4,
      shake: 0,
    });
  }

  growFruit(tr, size = 0) {
    const free = [];
    const lim = Math.min(MAX_SLOTS, Math.round(this.p.fruitLimit));
    for (let i = 0; i < lim; i++) if (tr.state[i] === 0) free.push(i);
    if (!free.length) return false;
    const i = free[Math.floor(this.rnd() * free.length)];
    tr.state[i] = 1;
    tr.size[i] = size;
    tr.eatT[i] = 0;
    return true;
  }

  fruitCount(tr) {
    let c = 0;
    for (let i = 0; i < MAX_SLOTS; i++) if (tr.state[i]) c++;
    return c;
  }
  ripeFree(tr) {
    let c = 0;
    for (let i = 0; i < MAX_SLOTS; i++) if (tr.state[i] === 1 && tr.size[i] > 0.85) c++;
    return c;
  }

  spawn(kind, parent, x, y, energy) {
    if (this.blobs.length >= MAX_BLOBS) return null;
    if (x === undefined) {
      const ang = this.rnd() * Math.PI * 2;
      const r = Math.sqrt(this.rnd()) * (this.R - 3);
      x = Math.cos(ang) * r;
      y = Math.sin(ang) * r;
    }
    const cap = kind === 'blue' ? this.p.blueCopy : this.p.redCopy;
    const b = {
      id: this.nextId++,
      kind,
      x,
      y,
      vx: 0,
      vy: 0,
      energy: energy ?? cap * (0.55 + 0.35 * this.rnd()),
      age: this.rnd() * 5,
      action: 'wandering',
      timer: 0,
      timerMax: 0,
      tSpeed: 1,
      tVision: 1,
      parent: parent ? parent.id : null,
      gen: parent ? parent.gen + 1 : 0,
      children: 0,
      copyCd: 3 + this.rnd() * 5,
      heading: this.rnd() * 6.28,
      wanderT: 0,
      restT: 0,
      startle: 0,
      target: null, // {tree, slot}
      face: 0,
      seed: this.rnd() * 100,
      dead: false,
      speedNow: 0,
      cause: '',
    };
    if (parent) {
      b.tSpeed = clamp(parent.tSpeed * (1 + 0.06 * this.gauss()), 0.6, 1.6);
      b.tVision = clamp(parent.tVision * (1 + 0.06 * this.gauss()), 0.6, 1.6);
    } else {
      b.tSpeed = clamp(1 + 0.04 * this.gauss(), 0.8, 1.2);
      b.tVision = clamp(1 + 0.04 * this.gauss(), 0.8, 1.2);
    }
    this.blobs.push(b);
    return b;
  }

  speedOf(b) {
    return (b.kind === 'blue' ? this.p.blueSpeed : this.p.redSpeed) * b.tSpeed;
  }
  visionOf(b) {
    return (b.kind === 'blue' ? this.p.blueVision : this.p.redVision) * b.tVision;
  }

  buildGrid() {
    const cs = 8;
    this.cs = cs;
    const g = new Map();
    for (const b of this.blobs) {
      const k = Math.floor(b.x / cs) * 4096 + Math.floor(b.y / cs);
      let a = g.get(k);
      if (!a) g.set(k, (a = []));
      a.push(b);
    }
    this.grid = g;
  }

  each(x, y, r, fn) {
    const cs = this.cs;
    const x0 = Math.floor((x - r) / cs),
      x1 = Math.floor((x + r) / cs),
      y0 = Math.floor((y - r) / cs),
      y1 = Math.floor((y + r) / cs);
    for (let i = x0; i <= x1; i++)
      for (let j = y0; j <= y1; j++) {
        const a = this.grid.get(i * 4096 + j);
        if (a) for (const o of a) fn(o);
      }
  }

  step(dt = DT) {
    this.t += dt;
    const p = this.p;
    this.updateTrees(dt);
    this.buildGrid();
    const list = this.blobs.slice();
    for (const b of list) {
      if (b.dead) continue;
      if (b.kind === 'blue') this.updateBlue(b, dt);
      else this.updateRed(b, dt);
    }
    // remove dead
    let w = 0;
    for (const b of this.blobs) {
      if (b.dead) continue;
      this.blobs[w++] = b;
    }
    this.blobs.length = w;
    if (this.t - this.lastSample >= 1) this.sample();
  }

  updateTrees(dt) {
    const p = this.p;
    let fruit = 0;
    for (const tr of this.trees) {
      tr.shake = Math.max(0, tr.shake - dt);
      tr.cool = Math.max(0, tr.cool - dt);
      const lim = Math.round(p.fruitLimit);
      if (tr.cool <= 0 && this.fruitCount(tr) < lim) {
        tr.acc += dt * p.fruitGrowth;
        if (tr.acc >= 1) {
          tr.acc -= 1;
          this.growFruit(tr, 0);
        }
      }
      for (let i = 0; i < MAX_SLOTS; i++) {
        if (tr.state[i] === 1 && tr.size[i] < 1) tr.size[i] = Math.min(1, tr.size[i] + dt / 6);
        if (tr.state[i]) fruit++;
      }
    }
    this.stats.fruit = fruit;
  }

  findFruit(b, vision) {
    let best = null,
      bd = Infinity;
    for (const tr of this.trees) {
      const d = Math.hypot(tr.x - b.x, tr.y - b.y);
      if (d - 3 > vision || d >= bd) continue;
      if (this.ripeFree(tr) > 0) {
        best = tr;
        bd = d;
      }
    }
    return best ? { tree: best, d: bd } : null;
  }

  nearestTree(b, range) {
    let best = null,
      bd = range;
    for (const tr of this.trees) {
      const d = Math.hypot(tr.x - b.x, tr.y - b.y);
      if (d < bd) {
        bd = d;
        best = tr;
      }
    }
    return best ? { tree: best, d: bd } : null;
  }

  steer(b, dt, ax, ay, speed) {
    const m = Math.hypot(ax, ay);
    let dx = 0,
      dy = 0;
    if (m > 1e-6) {
      const k = Math.min(1, m);
      dx = (ax / m) * k * speed;
      dy = (ay / m) * k * speed;
    }
    const f = 1 - Math.exp(-dt * 5);
    b.vx += (dx - b.vx) * f;
    b.vy += (dy - b.vy) * f;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    const r = Math.hypot(b.x, b.y),
      lim = this.R - 1.2;
    if (r > lim) {
      b.x *= lim / r;
      b.y *= lim / r;
      const nx = b.x / lim,
        ny = b.y / lim;
      const vn = b.vx * nx + b.vy * ny;
      if (vn > 0) {
        b.vx -= 1.6 * vn * nx;
        b.vy -= 1.6 * vn * ny;
      }
      b.heading += 1.5;
    }
    b.speedNow = Math.hypot(b.vx, b.vy);
    if (b.speedNow > 0.4) b.face = Math.atan2(b.vy, b.vx);
  }

  drain(b, dt, use, baseSpeed) {
    const idle = b.kind === 'red' ? K.REDIDLE : 0.32;
    const v = b.speedNow / 5;
    const vis = b.tVision;
    const c = use * (idle + (b.kind === 'red' ? K.REDMOVE : 1.05) * Math.pow(v, 1.35) + 0.12 * (vis - 0.6) * (vis - 0.6) * 2 + 0.1 * vis);
    b.energy -= c * dt;
  }

  wanderVec(b, dt, rest = true, restP = 0.35) {
    b.wanderT -= dt;
    if (b.wanderT <= 0) {
      b.wanderT = 1.5 + this.rnd() * 3;
      b.heading += (this.rnd() - 0.5) * 2.4;
      if (rest && this.rnd() < restP) b.restT = (0.8 + this.rnd() * 2.2) * (restP > 0.5 ? 3 : 1);
    }
    if (b.restT > 0) {
      b.restT -= dt;
      return [0, 0, true];
    }
    return [Math.cos(b.heading), Math.sin(b.heading), false];
  }

  die(b, cause) {
    b.dead = true;
    b.cause = cause;
    this.deaths[b.kind]++;
    this.events.push({ type: 'death', kind: b.kind, x: b.x, y: b.y });
    if (b.target) this.releaseTarget(b);
  }

  releaseTarget(b) {
    const t = b.target;
    if (t && t.tree.state[t.slot] === 2) {
      t.tree.state[t.slot] = 1;
      t.tree.eatT[t.slot] = 0;
    }
    b.target = null;
  }

  tryCopy(b, thr, cost, childE) {
    if (b.energy >= thr && b.copyCd <= 0) {
      b.energy -= cost;
      b.copyCd = (b.kind === 'red' ? K.REDCD : 7) + this.rnd() * 3;
      b.children++;
      this.births[b.kind]++;
      const a = this.rnd() * 6.28;
      const c = this.spawn(b.kind, b, b.x + Math.cos(a) * 1.4, b.y + Math.sin(a) * 1.4, childE);
      if (c) {
        c.age = 0;
        c.copyCd = 8 + this.rnd() * 4;
        c.restT = 0.5;
        b.splitFx = 0.8;
        this.events.push({ type: 'birth', kind: b.kind, x: b.x, y: b.y });
      }
    }
  }

  updateBlue(b, dt) {
    const p = this.p;
    b.age += dt;
    b.copyCd -= dt;
    if (b.startle > 0) b.startle -= dt;
    if (b.splitFx > 0) b.splitFx -= dt;
    const vision = this.visionOf(b);
    const spd = this.speedOf(b);

    // eating (uninterruptible)
    if (b.timer > 0) {
      b.timer -= dt;
      b.action = 'eating';
      const t = b.target;
      t.tree.eatT[t.slot] = 1 - Math.max(0, b.timer) / b.timerMax;
      this.steer(b, dt, 0, 0, spd);
      this.drain(b, dt, p.blueUse, spd);
      if (b.timer <= 0) {
        t.tree.state[t.slot] = 0;
        t.tree.size[t.slot] = 0;
        t.tree.eatT[t.slot] = 0;
        t.tree.cool = p.fruitDelay;
        t.tree.acc = 0;
        b.energy = Math.min(MAX_E, b.energy + K.FRUITE);
        b.target = null;
        this.eaten++;
        b.restT = 0.4;
        this.events.push({ type: 'eat', x: t.tree.x, y: t.tree.y, bx: b.x, by: b.y, tree: t.tree.id, slot: t.slot });
      }
      if (b.energy <= 0) this.die(b, 'starved');
      return;
    }

    // neighbours
    let rx = 0,
      ry = 0,
      redD = Infinity,
      crowd = 0,
      cx = 0,
      cy = 0;
    this.each(b.x, b.y, Math.max(vision, 8), (o) => {
      if (o === b || o.dead) return;
      const dx = b.x - o.x,
        dy = b.y - o.y;
      const d = Math.hypot(dx, dy) + 1e-3;
      if (o.kind === 'red') {
        if (d < vision) {
          const w = 1 / (d * d);
          rx += (dx / d) * w;
          ry += (dy / d) * w;
          if (d < redD) redD = d;
        }
      } else if (d < 6) {
        crowd++;
        const w = (6 - d) / 6;
        cx += (dx / d) * w;
        cy += (dy / d) * w;
      }
    });

    const hungry = b.energy < Math.min(MAX_E - 5, p.blueCopy * 1.12);
    let ax = 0,
      ay = 0,
      sp = spd;
    let action = 'wandering';

    if (redD < Infinity) {
      const m = Math.hypot(rx, ry) || 1;
      ax = rx / m + cx * 0.3;
      ay = ry / m + cy * 0.3;
      sp = spd * K.FLEE;
      action = 'fleeing';
      if (b.target) this.releaseTarget(b);
    } else if (hungry) {
      const f = this.findFruit(b, vision);
      if (f) {
        const tr = f.tree;
        const dx = tr.x - b.x,
          dy = tr.y - b.y;
        if (f.d < 3.0) {
          // start eating
          let slot = -1;
          for (let i = 0; i < MAX_SLOTS; i++) if (tr.state[i] === 1 && tr.size[i] > 0.85) slot = i;
          if (slot >= 0) {
            tr.state[slot] = 2;
            tr.eatT[slot] = 0;
            tr.shake = 0.5;
            b.target = { tree: tr, slot };
            b.timer = b.timerMax = Math.max(0.3, p.blueEat);
            b.action = 'eating';
            this.steer(b, dt, 0, 0, spd);
            this.drain(b, dt, p.blueUse, spd);
            return;
          }
        }
        ax = dx / f.d + cx * 0.4;
        ay = dy / f.d + cy * 0.4;
        action = 'seeking fruit';
      } else {
        // no visible fruit: drift toward the nearest tree, else wander
        const nt = this.nearestTree(b, vision * 2.2);
        if (nt && nt.d > 4) {
          ax = (nt.tree.x - b.x) / nt.d + cx * 0.5;
          ay = (nt.tree.y - b.y) / nt.d + cy * 0.5;
          sp = spd * 0.8;
          action = 'heading to trees';
        } else {
          const [wx, wy, rest] = this.wanderVec(b, dt, false);
          ax = wx + cx * 0.6;
          ay = wy + cy * 0.6;
          sp = spd * 0.7;
          action = 'wandering';
        }
      }
    } else {
      // satisfied: gather near trees, wander gently, or rest
      const nt = this.nearestTree(b, vision * 2);
      const [wx, wy, rest] = this.wanderVec(b, dt, true);
      if (crowd >= 4) {
        ax = cx * 1.5 + wx * 0.4;
        ay = cy * 1.5 + wy * 0.4;
        sp = spd * 0.6;
        action = 'spreading out';
      } else if (nt && nt.d > 7) {
        ax = (nt.tree.x - b.x) / nt.d * 0.6 + wx * 0.4 + cx * 0.6;
        ay = (nt.tree.y - b.y) / nt.d * 0.6 + wy * 0.4 + cy * 0.6;
        sp = spd * 0.55;
        action = 'gathering';
      } else {
        ax = wx + cx * 0.8;
        ay = wy + cy * 0.8;
        sp = spd * 0.4;
        action = rest ? 'resting' : 'wandering';
      }
    }

    // wall avoidance nudges
    const r = Math.hypot(b.x, b.y);
    if (r > this.R - 6) {
      ax -= (b.x / r) * 0.8;
      ay -= (b.y / r) * 0.8;
    }
    if (b.startle > 0) sp *= 1.3;
    b.action = action;
    this.steer(b, dt, ax, ay, sp);
    this.drain(b, dt, p.blueUse, spd);
    if (action !== 'fleeing') this.tryCopy(b, p.blueCopy, p.blueCopy * 0.55, p.blueCopy * 0.42);
    if (b.energy <= 0) this.die(b, 'starved');
  }

  updateRed(b, dt) {
    const p = this.p;
    b.age += dt;
    b.copyCd -= dt;
    if (b.splitFx > 0) b.splitFx -= dt;
    const vision = this.visionOf(b);
    const spd = this.speedOf(b);

    if (b.timer > 0) {
      b.timer -= dt;
      b.action = 'pausing';
      this.steer(b, dt, 0, 0, spd);
      this.drain(b, dt, p.redUse, spd);
      if (b.energy <= 0) this.die(b, 'faded');
      else this.tryCopy(b, p.redCopy, p.redCopy * 0.55, p.redCopy * 0.42);
      return;
    }

    let target = null,
      bd = Infinity;
    this.each(b.x, b.y, vision, (o) => {
      if (o.kind !== 'blue' || o.dead || o.energy < K.WORTH) return;
      if (K.REFUGE > 0 && o.timer > 0) return;
      if (K.REFUGE > 0) {
        const nt = this.nearestTree(o, K.REFUGE);
        if (nt) return;
      }
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      if (d < vision && d < bd) {
        if (K.INTERF > 0) {
          let taken = false;
          this.each(o.x, o.y, K.INTERF, (q) => {
            if (q.kind === 'red' && q !== b && !q.dead && Math.hypot(q.x - o.x, q.y - o.y) < K.INTERF) taken = true;
          });
          if (taken) return;
        }
        bd = d;
        target = o;
      }
    });

    let ax = 0,
      ay = 0,
      sp = spd,
      action = 'wandering';
    if (target) {
      if (bd < 1.8) {
        // gentle contact
        const take = Math.max(0, Math.min(p.redContact, target.energy * 0.7, target.energy - K.FLOOR));
        target.energy -= take;
        target.startle = 1.5;
        b.energy = Math.min(MAX_E, b.energy + take * K.RED_EFF);
        b.timer = b.timerMax = Math.max(0.3, p.redPause);
        b.action = 'pausing';
        this.contacts++;
        this.events.push({ type: 'contact', x: b.x, y: b.y, tx: target.x, ty: target.y, amount: take });
        if (target.energy <= 0.5) this.die(target, 'drained');
        this.steer(b, dt, 0, 0, spd);
        this.drain(b, dt, p.redUse, spd);
        return;
      }
      ax = (target.x - b.x) / bd;
      ay = (target.y - b.y) / bd;
      action = 'chasing';
      sp = spd;
    } else {
      const [wx, wy, rest] = this.wanderVec(b, dt, true, K.REDREST);
      ax = wx;
      ay = wy;
      sp = spd * 0.6;
      action = rest ? 'resting' : 'wandering';
      const r = Math.hypot(b.x, b.y);
      if (r > this.R - 6) {
        ax -= (b.x / r) * 0.8;
        ay -= (b.y / r) * 0.8;
      }
    }
    b.action = action;
    this.steer(b, dt, ax, ay, sp);
    this.drain(b, dt, p.redUse, spd);
    this.tryCopy(b, p.redCopy, p.redCopy * 0.55, p.redCopy * 0.42);
    if (b.energy <= 0) this.die(b, 'faded');
  }

  sample(force) {
    this.lastSample = this.t;
    let nb = 0,
      nr = 0,
      sbs = 0,
      sbv = 0,
      srs = 0,
      srv = 0,
      eb = 0,
      er = 0;
    for (const b of this.blobs) {
      if (b.kind === 'blue') {
        nb++;
        sbs += b.tSpeed;
        sbv += b.tVision;
        eb += b.energy;
      } else {
        nr++;
        srs += b.tSpeed;
        srv += b.tVision;
        er += b.energy;
      }
    }
    this.stats.blue = nb;
    this.stats.red = nr;
    this.history.push({
      t: this.t,
      fruit: this.stats.fruit,
      blue: nb,
      red: nr,
      bs: nb ? sbs / nb : null,
      bv: nb ? sbv / nb : null,
      rs: nr ? srs / nr : null,
      rv: nr ? srv / nr : null,
      be: nb ? eb / nb : null,
      re: nr ? er / nr : null,
    });
    if (this.history.length > 6000) {
      this.history = this.history.filter((_, i) => i % 2 === 0 || i > this.history.length - 200);
    }
  }
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

export const PRESETS = {
  balanced: { label: 'Balanced garden', p: {} },
  fruitRich: {
    label: 'Fruit-rich garden',
    p: { trees: 18, fruitGrowth: 0.24, fruitLimit: 10, fruitDelay: 2, blues: 20, reds: 3 },
  },
  redHeavy: {
    label: 'Red-heavy garden',
    p: { blues: 30, reds: 22, redContact: 36, redVision: 18, redPause: 2.5 },
  },
  fragile: {
    label: 'Fragile balance',
    p: { trees: 9, blues: 14, reds: 5, redVision: 20, redSpeed: 6, redContact: 28, fruitGrowth: 0.1, worldSize: 44 },
  },
  lowFruit: {
    label: 'Low-fruit garden',
    p: { trees: 7, fruitGrowth: 0.08, fruitLimit: 4, fruitDelay: 8, blues: 16, reds: 2 },
  },
};
