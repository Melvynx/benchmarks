export const MAXE = 100;
export const TREE_R = 1.5;
const FRUIT_ENERGY = 40;
const FRUIT_RATE = 0.07;
const CONTACT_EFF = 0.5;
const POP_CAP = 420;
const VISITOR_DELAY = 80;
const BLUE_COST = [0.35, 0.7];
const RED_COST = [0.3, 0.6];

export const PARAM_DEFS = [
  { g: 'Fruit', key: 'fruitGrowth', label: 'Fruit growth speed', min: 0.1, max: 3, step: 0.05, fmt: (v) => `×${v.toFixed(2)}`, tip: 'How quickly a tree grows its next fruit.' },
  { g: 'Fruit', key: 'fruitLimit', label: 'Fruit limit', min: 1, max: 10, step: 1, fmt: (v) => `${v} / tree`, tip: 'Most fruit one tree can hold.' },
  { g: 'Fruit', key: 'fruitDelay', label: 'Fruit return delay', min: 0, max: 40, step: 1, fmt: (v) => `${v}s`, tip: 'How long a tree rests after losing fruit.' },
  { g: 'Blue blobs', key: 'blueUse', label: 'Energy use', min: 0.3, max: 2.5, step: 0.05, fmt: (v) => `×${v.toFixed(2)}`, cls: 'blue' },
  { g: 'Blue blobs', key: 'blueSpeed', label: 'Speed', min: 1, max: 6, step: 0.1, fmt: (v) => `${v.toFixed(1)} u/s`, cls: 'blue' },
  { g: 'Blue blobs', key: 'blueVision', label: 'Vision', min: 2, max: 22, step: 0.5, fmt: (v) => `${v.toFixed(1)} u`, cls: 'blue' },
  { g: 'Blue blobs', key: 'blueCopy', label: 'Copy threshold', min: 50, max: 98, step: 1, fmt: (v) => `${v} energy`, cls: 'blue', tip: 'Energy needed before a blue blob makes a new one.' },
  { g: 'Blue blobs', key: 'blueEat', label: 'Eating time', min: 0.2, max: 4, step: 0.1, fmt: (v) => `${v.toFixed(1)}s`, cls: 'blue' },
  { g: 'Red blobs', key: 'redUse', label: 'Energy use', min: 0.3, max: 2.5, step: 0.05, fmt: (v) => `×${v.toFixed(2)}`, cls: 'red' },
  { g: 'Red blobs', key: 'redSpeed', label: 'Speed', min: 1, max: 6, step: 0.1, fmt: (v) => `${v.toFixed(1)} u/s`, cls: 'red' },
  { g: 'Red blobs', key: 'redVision', label: 'Vision', min: 2, max: 22, step: 0.5, fmt: (v) => `${v.toFixed(1)} u`, cls: 'red' },
  { g: 'Red blobs', key: 'redContact', label: 'Contact strength', min: 4, max: 50, step: 1, fmt: (v) => `${v} energy`, cls: 'red', tip: 'Energy passed from blue to red per contact.' },
  { g: 'Red blobs', key: 'redCopy', label: 'Copy threshold', min: 50, max: 98, step: 1, fmt: (v) => `${v} energy`, cls: 'red' },
  { g: 'Red blobs', key: 'redPause', label: 'Pause time', min: 0.2, max: 10, step: 0.1, fmt: (v) => `${v.toFixed(1)}s`, cls: 'red', tip: 'Rest after a contact.' },
  { g: 'World', key: 'trees', label: 'Starting fruit trees', min: 1, max: 24, step: 1, fmt: (v) => `${v}`, reset: true },
  { g: 'World', key: 'blues', label: 'Starting blue blobs', min: 0, max: 120, step: 1, fmt: (v) => `${v}`, reset: true, cls: 'blue' },
  { g: 'World', key: 'reds', label: 'Starting red blobs', min: 0, max: 60, step: 1, fmt: (v) => `${v}`, reset: true, cls: 'red' },
  { g: 'World', key: 'worldSize', label: 'World size', min: 16, max: 50, step: 1, fmt: (v) => `r ${v}`, reset: true },
];

export const BASE = {
  fruitGrowth: 1.8, fruitLimit: 6, fruitDelay: 6,
  blueUse: 1, blueSpeed: 3, blueVision: 9, blueCopy: 80, blueEat: 1.2,
  redUse: 1.1, redSpeed: 3.6, redVision: 11, redContact: 20, redCopy: 62, redPause: 3,
  trees: 18, blues: 40, reds: 5, worldSize: 34, seed: 1234, speed: 4, visitors: true,
};

export const PRESETS = {
  'Balanced garden': {},
  'Fruit-rich garden': { fruitGrowth: 3, fruitLimit: 9, fruitDelay: 2, blues: 30, reds: 3 },
  'Red-heavy garden': { reds: 30, blues: 60, redContact: 28, redUse: 0.8 },
  'Fragile balance': { redContact: 26, redUse: 0.9, redCopy: 55, fruitGrowth: 1.2, blues: 30, reds: 4 },
  'Low-fruit garden': { fruitGrowth: 0.4, fruitLimit: 3, fruitDelay: 14, trees: 8, worldSize: 24, blues: 12, reds: 2 },
};

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SYL = ['bo', 'bi', 'mo', 'pip', 'lu', 'zo', 'ki', 'nim', 'pu', 'do', 'fi', 'wob', 'tu', 'ra', 'mi', 'jel', 'gum', 'sno', 'be', 'lo'];
function nameFor(id) {
  const a = SYL[(id * 7) % SYL.length], b = SYL[(id * 13 + 5) % SYL.length];
  const s = a + b;
  return s[0].toUpperCase() + s.slice(1);
}

class Grid {
  constructor(cell) { this.cell = cell; this.m = new Map(); }
  clear() { this.m.clear(); }
  key(cx, cy) { return (cx + 500) * 1000 + (cy + 500); }
  add(o) {
    const k = this.key(Math.floor(o.x / this.cell), Math.floor(o.y / this.cell));
    const a = this.m.get(k);
    if (a) a.push(o); else this.m.set(k, [o]);
  }
  each(x, y, r, fn) {
    const c = this.cell, x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
    const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const a = this.m.get(this.key(cx, cy));
      if (a) for (let i = 0; i < a.length; i++) fn(a[i]);
    }
  }
}

export class Sim {
  constructor(p) { this.reset(p); }

  reset(p) {
    this.p = p;
    this.rng = mulberry32(p.seed | 0);
    this.t = 0; this.nextId = 1;
    this.blues = []; this.reds = []; this.trees = []; this.events = [];
    this.history = []; this.sampleEvery = 1; this.nextSample = 0;
    this.gB = new Grid(6); this.gR = new Grid(6);
    this.gone = { blue: 0, red: 0 };
    this.stats = { visitors: { blue: 0, red: 0 }, born: { blue: 0, red: 0 }, starved: { blue: 0, red: 0 }, eaten: 0, contacts: 0, peakBlue: 0, peakRed: 0, peakBlueT: 0, peakRedT: 0 };
    const R = p.worldSize;
    for (let i = 0; i < p.trees; i++) {
      let best = null, bd = -1;
      for (let k = 0; k < 24; k++) {
        const a = this.rng() * Math.PI * 2, r = Math.sqrt(this.rng()) * (R - 4);
        const c = { x: Math.cos(a) * r, y: Math.sin(a) * r };
        let md = 1e9;
        for (const t of this.trees) md = Math.min(md, Math.hypot(t.x - c.x, t.y - c.y));
        if (md > bd) { bd = md; best = c; }
      }
      this.trees.push({ x: best.x, y: best.y, fruit: p.fruitLimit, grow: 0, cool: 0, eaten: [], phase: this.rng() * 6.28, size: 0.9 + this.rng() * 0.3, id: i });
    }
    for (let i = 0; i < p.blues; i++) this.blues.push(this.makeBlob('blue', ...this.randNearTree(), 40 + this.rng() * 50));
    for (let i = 0; i < p.reds; i++) this.reds.push(this.makeBlob('red', ...this.randDisc(R - 2), 40 + this.rng() * 50));
    this.sample();
  }

  randDisc(r) { const a = this.rng() * 6.283, d = Math.sqrt(this.rng()) * r; return [Math.cos(a) * d, Math.sin(a) * d]; }
  randNearTree() {
    if (!this.trees.length) return this.randDisc(this.p.worldSize - 2);
    const t = this.trees[Math.floor(this.rng() * this.trees.length)];
    const a = this.rng() * 6.283, d = 2 + this.rng() * 4;
    return this.clampPos(t.x + Math.cos(a) * d, t.y + Math.sin(a) * d);
  }
  clampPos(x, y) {
    const m = this.p.worldSize - 1, d = Math.hypot(x, y);
    return d > m ? [x / d * m, y / d * m] : [x, y];
  }
  gauss() { return Math.sqrt(-2 * Math.log(this.rng() + 1e-9)) * Math.cos(6.283 * this.rng()); }

  makeBlob(kind, x, y, energy, parent) {
    const id = this.nextId++;
    const mut = (v) => Math.min(1.7, Math.max(0.5, v * (1 + this.gauss() * 0.06)));
    const h = this.rng() * 6.283;
    return {
      id, kind, name: nameFor(id), x, y, px: x, py: y, vx: 0, vy: 0, heading: h, wander: h,
      energy, age: 0, action: 'wandering', busy: 0, busyMax: 0, busyKind: '', immune: 0, cooldown: 4,
      sp: parent ? mut(parent.sp) : 1, vi: parent ? mut(parent.vi) : 1,
      gen: parent ? parent.gen + 1 : 0, parent: parent ? parent.id : 0, parentName: parent ? parent.name : '', kids: 0,
      speedNow: 0, phase: this.rng() * 6.28, dead: false, eaten: 0, contacts: 0,
    };
  }

  emit(type, x, y, extra) { if (this.events.length < 300) this.events.push({ type, x, y, ...extra }); }

  totalFruit() { let f = 0; for (const t of this.trees) f += t.fruit; return f; }

  sample() {
    const avg = (arr, k) => arr.length ? arr.reduce((s, b) => s + b[k], 0) / arr.length : null;
    this.history.push({
      t: this.t, fruit: this.totalFruit(), blue: this.blues.length, red: this.reds.length,
      bSp: avg(this.blues, 'sp'), bVi: avg(this.blues, 'vi'), rSp: avg(this.reds, 'sp'), rVi: avg(this.reds, 'vi'),
      bE: avg(this.blues, 'energy'), rE: avg(this.reds, 'energy'),
    });
    if (this.history.length > 6000) {
      this.history = this.history.filter((_, i) => i % 2 === 0);
      this.sampleEvery *= 2;
    }
    this.nextSample = this.t + this.sampleEvery;
  }

  step(dt) {
    const p = this.p;
    this.t += dt;
    for (const tr of this.trees) {
      if (tr.fruit > p.fruitLimit) tr.fruit = p.fruitLimit;
      if (tr.cool > 0) tr.cool -= dt;
      else if (tr.fruit < p.fruitLimit) {
        tr.grow += FRUIT_RATE * p.fruitGrowth * dt;
        if (tr.grow >= 1) { tr.grow = 0; tr.fruit++; }
      } else tr.grow = 0;
      for (const e of tr.eaten) e.t += dt;
      if (tr.eaten.length && tr.eaten[0].t > tr.eaten[0].dur) tr.eaten.shift();
    }
    this.gB.clear(); this.gR.clear();
    for (const b of this.blues) this.gB.add(b);
    for (const r of this.reds) this.gR.add(r);
    const born = [];
    for (const b of this.blues) this.tickBlue(b, dt, born);
    for (const r of this.reds) this.tickRed(r, dt, born);
    for (const o of born) (o.kind === 'blue' ? this.blues : this.reds).push(o);
    const nb = this.blues.length, nr = this.reds.length;
    this.blues = this.blues.filter((b) => !b.dead);
    this.reds = this.reds.filter((b) => !b.dead);
    const s = this.stats;
    if (this.blues.length > s.peakBlue) { s.peakBlue = this.blues.length; s.peakBlueT = this.t; }
    if (this.reds.length > s.peakRed) { s.peakRed = this.reds.length; s.peakRedT = this.t; }
    void nb; void nr;
    if (p.visitors) this.checkVisitors(dt);
    if (this.t >= this.nextSample) this.sample();
  }

  checkVisitors(dt) {
    for (const kind of ['blue', 'red']) {
      const arr = kind === 'blue' ? this.blues : this.reds;
      if (arr.length) { this.gone[kind] = 0; continue; }
      this.gone[kind] += dt;
      if (this.gone[kind] > VISITOR_DELAY) {
        this.gone[kind] = 0;
        const a = this.rng() * 6.283, R = this.p.worldSize - 1.5;
        for (let i = 0; i < 2; i++) {
          const v = this.makeBlob(kind, Math.cos(a + i * 0.15) * R, Math.sin(a + i * 0.15) * R, 75);
          v.px = v.x; v.py = v.y;
          arr.push(v);
          this.stats.visitors[kind]++;
        }
        const v = arr[arr.length - 1];
        this.emit('visitor', v.x, v.y, { c: kind });
      }
    }
  }

  physics(b, dx, dy, speed, dt, use, moveScale) {
    const d = Math.hypot(dx, dy);
    let tx = 0, ty = 0;
    if (d > 1e-6 && speed > 0) { tx = dx / d * speed; ty = dy / d * speed; }
    const k = Math.min(1, 5 * dt);
    b.vx += (tx - b.vx) * k; b.vy += (ty - b.vy) * k;
    b.px = b.x; b.py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    const R = this.p.worldSize - 0.8, r = Math.hypot(b.x, b.y);
    if (r > R) { b.x *= R / r; b.y *= R / r; b.vx -= b.x / R * 2; b.vy -= b.y / R * 2; }
    const sp = Math.hypot(b.vx, b.vy);
    b.speedNow = sp;
    if (sp > 0.3) b.heading = Math.atan2(b.vy, b.vx);
    const q = sp / moveScale;
    const c = b.kind === 'red' ? RED_COST : BLUE_COST;
    b.energy -= use * (c[0] + c[1] * q * q) * dt;
  }

  wanderDir(b, dt, rate = 1.4) {
    b.wander += this.gauss() * rate * Math.sqrt(dt) * 2;
    const r = Math.hypot(b.x, b.y), lim = this.p.worldSize - 5;
    if (r > lim) {
      const to = Math.atan2(-b.y, -b.x);
      let da = to - b.wander; da = Math.atan2(Math.sin(da), Math.cos(da));
      b.wander += da * Math.min(1, dt * 2);
    }
    return [Math.cos(b.wander), Math.sin(b.wander)];
  }

  nearestTree(b, range, needFruit) {
    let best = null, bd = range;
    for (const t of this.trees) {
      if (needFruit && t.fruit <= 0) continue;
      const d = Math.hypot(t.x - b.x, t.y - b.y) - TREE_R;
      if (d < bd) { bd = d; best = t; }
    }
    return best ? { t: best, d: bd } : null;
  }

  tickBlue(b, dt, born) {
    const p = this.p;
    b.age += dt; b.cooldown -= dt; b.immune -= dt;
    const vision = p.blueVision * b.vi, maxV = p.blueSpeed * b.sp;
    if (b.busy > 0) {
      b.busy -= dt;
      b.action = b.busyKind;
      this.physics(b, 0, 0, 0, dt, p.blueUse, 3);
      if (b.busy <= 0 && b.busyKind === 'eating') {
        b.energy = Math.min(MAXE, b.energy + FRUIT_ENERGY);
        b.eaten++;
        this.emit('energy', b.x, b.y, { c: 'blue', v: FRUIT_ENERGY });
      }
    } else {
      let red = null, rd = vision * 0.45;
      this.gR.each(b.x, b.y, rd, (o) => {
        const d = Math.hypot(o.x - b.x, o.y - b.y);
        if (d < rd) { rd = d; red = o; }
      });
      let dx = 0, dy = 0, spd = maxV * 0.45, action = 'wandering';
      let crowd = 0, sx = 0, sy = 0;
      this.gB.each(b.x, b.y, 2.4, (o) => {
        if (o === b) return;
        const ox = b.x - o.x, oy = b.y - o.y, d = Math.hypot(ox, oy) + 0.01;
        if (d < 2.4) { crowd++; sx += ox / d * (2.4 - d); sy += oy / d * (2.4 - d); }
      });
      if (red) {
        dx = b.x - red.x; dy = b.y - red.y; spd = maxV; action = 'fleeing red';
      } else {
        const ft = b.energy < 96 ? this.nearestTree(b, vision, true) : null;
        if (ft) {
          if (ft.d < 0.9) {
            ft.t.fruit--; ft.t.cool = p.fruitDelay; ft.t.grow = 0;
            ft.t.eaten.push({ slot: ft.t.fruit, t: 0, dur: p.blueEat });
            b.busy = b.busyMax = p.blueEat; b.busyKind = 'eating';
            this.stats.eaten++;
            this.emit('eat', ft.t.x, ft.t.y, { c: 'blue' });
            dx = 0; dy = 0; spd = 0; action = 'eating';
          } else { dx = ft.t.x - b.x; dy = ft.t.y - b.y; spd = maxV; action = 'seeking fruit'; }
        } else if (b.energy < 70 && this.nearestTree(b, vision * 3, true)) {
          const nt = this.nearestTree(b, vision * 3, true);
          dx = nt.t.x - b.x; dy = nt.t.y - b.y; spd = maxV * 0.8; action = 'gathering near trees';
        } else if (b.energy < 70) {
          [dx, dy] = this.wanderDir(b, dt); spd = maxV * 0.75; action = 'wandering';
        } else if (crowd >= 3) {
          action = 'avoiding crowd'; [dx, dy] = this.wanderDir(b, dt); spd = maxV * 0.6;
        } else { [dx, dy] = this.wanderDir(b, dt); }
        if (crowd >= 3 && action !== 'avoiding crowd' && action !== 'eating') action = crowd >= 5 ? 'avoiding crowd' : action;
      }
      if (crowd && !b.busy) {
        const n = Math.hypot(dx, dy) || 1;
        dx = dx / n + sx * 0.9; dy = dy / n + sy * 0.9;
        if (spd < 0.2 * maxV && crowd) spd = maxV * 0.4;
      }
      this.physics(b, dx, dy, spd, dt, p.blueUse, 3);
      b.action = b.busy > 0 ? 'eating' : action;
    }
    if (b.energy >= p.blueCopy && b.cooldown <= 0 && b.busy <= 0 && b.age > 6 && this.blues.length + this.reds.length + born.length < POP_CAP) {
      this.spawn(b, born, 46, 34, 'making a friend');
    }
    if (b.energy <= 0 && !b.dead) { b.dead = true; this.stats.starved.blue++; this.emit('poof', b.x, b.y, { c: 'blue' }); }
  }

  spawn(parent, born, cost, gift, label) {
    const a = this.rng() * 6.283;
    const c = this.makeBlob(parent.kind, parent.x + Math.cos(a) * 1.2, parent.y + Math.sin(a) * 1.2, gift, parent);
    [c.x, c.y] = this.clampPos(c.x, c.y); c.px = c.x; c.py = c.y;
    c.busy = c.busyMax = 0.7; c.busyKind = 'waking up';
    parent.energy -= cost; parent.cooldown = 8; parent.kids++;
    parent.busy = parent.busyMax = 0.8; parent.busyKind = label;
    born.push(c);
    this.stats.born[parent.kind]++;
    this.emit('birth', parent.x, parent.y, { c: parent.kind });
  }

  tickRed(r, dt, born) {
    const p = this.p;
    r.age += dt; r.cooldown -= dt;
    const vision = p.redVision * r.vi, maxV = p.redSpeed * r.sp;
    if (r.busy > 0) {
      r.busy -= dt; r.action = r.busyKind;
      this.physics(r, 0, 0, 0, dt, p.redUse, 3.3);
    } else {
      let tgt = null, td = vision;
      if (r.energy < 95) this.gB.each(r.x, r.y, vision, (o) => {
        if (o.dead || o.immune > 0 || o.energy < 12 + p.redContact * 0.35) return;
        const d = Math.hypot(o.x - r.x, o.y - r.y);
        if (d < td) { td = d; tgt = o; }
      });
      let dx, dy, spd, action;
      if (tgt) {
        if (td < 1.3) {
          const amt = Math.min(p.redContact, tgt.energy - 3);
          tgt.energy -= amt; r.energy = Math.min(MAXE, r.energy + amt * CONTACT_EFF);
          tgt.busy = tgt.busyMax = 0.9; tgt.busyKind = 'startled'; tgt.immune = 4;
          r.busy = r.busyMax = p.redPause; r.busyKind = 'digesting';
          r.contacts++; this.stats.contacts++;
          this.emit('contact', (r.x + tgt.x) / 2, (r.y + tgt.y) / 2, { c: 'red' });
          dx = 0; dy = 0; spd = 0; action = 'digesting';
        } else { dx = tgt.x - r.x; dy = tgt.y - r.y; spd = maxV; action = 'hunting blue'; }
      } else {
        [dx, dy] = this.wanderDir(r, dt, 1.1); spd = maxV * 0.4;
        action = r.energy >= 95 ? 'full & lazy' : 'wandering';
      }
      this.physics(r, dx, dy, spd, dt, p.redUse, 3.3);
      r.action = action;
    }
    if (r.energy >= p.redCopy && r.cooldown <= 0 && r.busy <= 0 && r.age > 8 && this.blues.length + this.reds.length + born.length < POP_CAP) {
      this.spawn(r, born, 56, 30, 'making a friend');
    }
    if (r.energy <= 0 && !r.dead) { r.dead = true; this.stats.starved.red++; this.emit('poof', r.x, r.y, { c: 'red' }); }
  }
}
