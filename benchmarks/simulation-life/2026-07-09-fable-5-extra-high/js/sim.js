/*
 * Living Garden — simulation core (no DOM, runs in browser + Node).
 *
 * A small round world holds fruit trees, blue blobs (herbivores) and red blobs
 * (predators). Every blob carries an energy budget. The population waves in the
 * charts are NOT scripted: they emerge from these local rules.
 *
 *   fruit grows  ->  blue blobs eat fruit & breed  ->  red blobs drain blue
 *   blobs on contact & breed  ->  many red thins the blue  ->  blue gets scarce
 *   ->  red starve & fade  ->  fruit & blue recover  ->  the cycle repeats.
 *
 * Randomness flows through one seeded PRNG so a given seed replays exactly.
 */
(function (global) {
  'use strict';

  /* ----------------------------------------------------------------------- *
   * Seeded PRNG (mulberry32) + small helpers
   * ----------------------------------------------------------------------- */
  function makeRNG(seed) {
    let a = (seed >>> 0) || 1;
    const rng = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    rng.range = (lo, hi) => lo + (hi - lo) * rng();
    rng.int = (lo, hi) => Math.floor(rng.range(lo, hi + 1));
    // Box–Muller-ish gentle gaussian, clamped.
    rng.gauss = (sd) => {
      let u = 0, v = 0;
      while (u === 0) u = rng();
      while (v === 0) v = rng();
      const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(6.283185307 * v);
      return Math.max(-3, Math.min(3, g)) * (sd || 1);
    };
    return rng;
  }

  const clamp = (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
  const TAU = Math.PI * 2;

  /* ----------------------------------------------------------------------- *
   * Tunable parameters. PARAM_META is the single source of truth the UI reads
   * to build sliders; DEFAULTS is derived from it.
   * `live:true`  -> takes effect immediately while running.
   * `live:false` -> structural; only applied on reset().
   * ----------------------------------------------------------------------- */
  const PARAM_META = [
    // Fruit / plants
    { key: 'fruitGrowth',       group: 'Fruit',  label: 'Fruit growth speed',   min: 0.05, max: 1.2,  step: 0.01, def: 0.6,  live: true,  unit: '/s',  hint: 'How fast a tree grows fruit back once its return delay has passed.' },
    { key: 'fruitCap',          group: 'Fruit',  label: 'Fruit limit',          min: 1,    max: 12,   step: 1,    def: 7,    live: true,  unit: '/tree', hint: 'Most fruit a single tree can hold at once.' },
    { key: 'fruitReturnDelay',  group: 'Fruit',  label: 'Fruit return delay',   min: 0,    max: 12,   step: 0.5,  def: 2.5,  live: true,  unit: 's',   hint: 'Quiet time a tree needs after being eaten from before it regrows.' },

    // Blue blobs (eat fruit)
    { key: 'blueEnergyUse',     group: 'Blue',   label: 'Blue energy use',      min: 0.4,  max: 2.2,  step: 0.05, def: 1.0,  live: true,  unit: '×',   hint: 'Multiplier on how quickly blue blobs burn energy living and moving.' },
    { key: 'blueSpeed',         group: 'Blue',   label: 'Blue speed',           min: 1.5,  max: 6,    step: 0.1,  def: 3.1,  live: true,  unit: 'u/s', hint: 'Top travel speed of a blue blob.' },
    { key: 'blueVision',        group: 'Blue',   label: 'Blue vision',          min: 2,    max: 12,   step: 0.5,  def: 6.5,  live: true,  unit: 'u',   hint: 'How far a blue blob senses fruit and nearby red blobs.' },
    { key: 'blueCopyThreshold', group: 'Blue',   label: 'Blue copy threshold',  min: 45,   max: 95,   step: 1,    def: 64,   live: true,  unit: 'e',   hint: 'Energy a blue blob must store before it can make a copy of itself.' },
    { key: 'blueEatTime',       group: 'Blue',   label: 'Blue eating time',     min: 0.3,  max: 3,    step: 0.1,  def: 1.2,  live: true,  unit: 's',   hint: 'Pause a blue blob takes to eat one fruit (it cannot do anything else meanwhile).' },

    // Red blobs (contact blue)
    { key: 'redEnergyUse',      group: 'Red',    label: 'Red energy use',       min: 0.4,  max: 2.2,  step: 0.05, def: 1.0,  live: true,  unit: '×',   hint: 'Multiplier on how quickly red blobs burn energy.' },
    { key: 'redSpeed',          group: 'Red',    label: 'Red speed',            min: 1.5,  max: 6,    step: 0.1,  def: 3.9,  live: true,  unit: 'u/s', hint: 'Top travel speed of a red blob.' },
    { key: 'redVision',         group: 'Red',    label: 'Red vision',           min: 2,    max: 14,   step: 0.5,  def: 5.5,  live: true,  unit: 'u',   hint: 'How far a red blob senses blue blobs to chase. Short sight gives scarce blue blobs a refuge.' },
    { key: 'redContact',        group: 'Red',    label: 'Red contact strength', min: 8,    max: 55,   step: 1,    def: 16,   live: true,  unit: 'e',   hint: 'Energy a red blob draws from a blue blob in one gentle contact.' },
    { key: 'redCopyThreshold',  group: 'Red',    label: 'Red copy threshold',   min: 45,   max: 95,   step: 1,    def: 80,   live: true,  unit: 'e',   hint: 'Energy a red blob must store before it can make a copy.' },
    { key: 'redPause',          group: 'Red',    label: 'Red pause time',       min: 0.3,  max: 4,    step: 0.1,  def: 1.3,  live: true,  unit: 's',   hint: 'Rest a red blob takes after a contact before it can chase again.' },

    // World / setup (structural)
    { key: 'startTrees',        group: 'World',  label: 'Starting fruit trees', min: 3,    max: 40,   step: 1,    def: 22,   live: false, unit: '',    hint: 'Number of trees when the garden is reset.' },
    { key: 'startBlues',        group: 'World',  label: 'Starting blue blobs',  min: 0,    max: 120,  step: 1,    def: 34,   live: false, unit: '',    hint: 'Blue blobs placed when the garden is reset.' },
    { key: 'startReds',         group: 'World',  label: 'Starting red blobs',   min: 0,    max: 60,   step: 1,    def: 9,    live: false, unit: '',    hint: 'Red blobs placed when the garden is reset.' },
    { key: 'worldRadius',       group: 'World',  label: 'World size',           min: 10,   max: 30,   step: 1,    def: 20,   live: false, unit: 'u',   hint: 'Radius of the round garden dish.' },
    { key: 'seed',              group: 'World',  label: 'Random seed',          min: 1,    max: 99999,step: 1,    def: 222,  live: false, unit: '',    hint: 'Same seed + same settings replays the exact same garden.' },
    { key: 'simSpeed',          group: 'World',  label: 'Simulation speed',     min: 0.25, max: 4,    step: 0.25, def: 1,    live: true,  unit: '×',   hint: 'How many world-seconds pass per real second.' },
  ];

  const DEFAULTS = {};
  PARAM_META.forEach((p) => { DEFAULTS[p.key] = p.def; });

  // Fixed constants that shape the "physiology" but aren't exposed as sliders.
  const K = {
    // blue
    blueMax: 100, blueStart: 55, blueFruitEnergy: 23,
    blueIdle: 0.6, blueMove: 2.0, blueReproChild: 30, blueReproCost: 12,
    blueReproCd: 2.8, blueMaxAge: 135, blueEatCd: 0.5, blueMinRepro: 30,
    // red
    redMax: 100, redStart: 60, redEff: 0.86,
    redIdle: 1.2, redMove: 2.7, redReproChild: 34, redReproCost: 14,
    redReproCd: 7.5, redMaxAge: 118, redMinRepro: 26,
    // interaction geometry
    eatRadius: 1.25, contactRadius: 1.15, blueStun: 0.35,
    // steering
    turnRate: 6.5, wanderJitter: 3.2, crowdRange: 2.6, crowdWeight: 0.55,
    // evolution
    mutation: 0.05,
    // book-keeping
    sampleInterval: 0.5, maxHistory: 6000,
    maxBlue: 320, maxRed: 240,
    FIXED_DT: 0.05,
  };

  /* ----------------------------------------------------------------------- *
   * Presets — each showcases one regime. Only overrides from DEFAULTS listed.
   * ----------------------------------------------------------------------- */
  const PRESETS = {
    balanced: {
      label: 'Balanced garden',
      blurb: 'Blue and red rise and fall out of phase for a long time.',
      config: {}, // pure defaults
    },
    fruitRich: {
      label: 'Fruit-rich garden',
      blurb: 'Fruit everywhere — blue blobs boom fast.',
      config: { fruitGrowth: 0.85, fruitCap: 10, fruitReturnDelay: 1.5, startTrees: 20, startBlues: 22, startReds: 6, seed: 2231 },
    },
    redHeavy: {
      label: 'Red-heavy garden',
      blurb: 'Too many hungry red blobs — blue dips first, red fades after.',
      config: { startReds: 22, startBlues: 60, fruitGrowth: 0.85, fruitCap: 9, fruitReturnDelay: 1.6, redContact: 22, redVision: 6.8, redSpeed: 3.9, worldRadius: 22, startTrees: 26, seed: 314 },
    },
    fragile: {
      label: 'Fragile balance',
      blurb: 'Perched on a knife-edge — big swings that can tip over.',
      config: { fruitGrowth: 0.52, fruitCap: 6, fruitReturnDelay: 2.5, redContact: 26, redVision: 6.2, blueSpeed: 3.05, redSpeed: 3.9, startBlues: 30, startReds: 10, worldRadius: 20, startTrees: 20, seed: 24 },
    },
    lowFruit: {
      label: 'Low-fruit garden',
      blurb: 'Barely any fruit — the whole world stays small.',
      config: { fruitGrowth: 0.14, fruitCap: 3, fruitReturnDelay: 6, startTrees: 10, startBlues: 18, startReds: 5, seed: 341 },
    },
  };

  /* ----------------------------------------------------------------------- *
   * Simulation
   * ----------------------------------------------------------------------- */
  function createSimulation(userConfig) {
    const config = Object.assign({}, DEFAULTS, userConfig || {});

    let rng;
    let trees = [];
    let blues = [];
    let reds = [];
    let time = 0;
    let steps = 0;
    let nextId = 1;
    let accumulator = 0;
    let sampleClock = 0;
    let events = []; // transient visual events drained by the renderer
    const history = { t: [], fruit: [], blue: [], red: [],
                      blueEnergy: [], redEnergy: [], blueSpeed: [], redSpeed: [],
                      births: [], deaths: [] };

    // Spatial hash — rebuilt each substep for O(1) neighbour queries.
    let grid = null, gridCell = 0, gridCols = 0, gridOrigin = 0;

    function randomPointInDisk(r) {
      const a = rng() * TAU;
      const rr = Math.sqrt(rng()) * r;
      return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
    }

    function makeBlob(kind, x, y, energy, traits, gen, parentId) {
      return {
        id: nextId++, kind, x, y,
        vx: rng.range(-0.3, 0.3), vy: rng.range(-0.3, 0.3),
        energy, bornAt: time, gen: gen || 0, parentId: parentId || 0,
        state: 'wander', stateTimer: 0, wander: rng() * TAU,
        eatCd: 0, contactCd: 0, reproCd: rng.range(0, 3), stun: 0,
        traits: traits || {
          speed: clamp(1 + rng.gauss(0.06), 0.75, 1.3),
          vision: clamp(1 + rng.gauss(0.06), 0.75, 1.3),
          str: clamp(1 + rng.gauss(0.06), 0.75, 1.3),
        },
        // visual-only fields the renderer reads
        anim: 0, targetX: x, targetY: y, lastEat: -99, lastContact: -99,
      };
    }

    function reset(newConfig) {
      if (newConfig) Object.assign(config, newConfig);
      rng = makeRNG(config.seed);
      time = 0; steps = 0; nextId = 1; accumulator = 0; sampleClock = 0;
      events = [];
      Object.keys(history).forEach((k) => { if (Array.isArray(history[k])) history[k].length = 0; });
      history._pendBirths = 0; history._pendDeaths = 0;

      const R = config.worldRadius;
      trees = [];
      // Poisson-ish scatter of trees, kept off the very center and rim.
      let attempts = 0;
      while (trees.length < config.startTrees && attempts < config.startTrees * 60) {
        attempts++;
        const p = randomPointInDisk(R * 0.86);
        if (Math.hypot(p.x, p.y) < R * 0.14) continue; // leave a clearing
        let ok = true;
        for (const t of trees) { if (Math.hypot(t.x - p.x, t.y - p.y) < R * 0.16) { ok = false; break; } }
        if (!ok) continue;
        trees.push({
          id: nextId++, x: p.x, y: p.y,
          fruit: rng.range(0.4, 1) * config.fruitCap,
          regrow: 0, sway: rng() * TAU, scale: rng.range(0.85, 1.18),
        });
      }

      // Spread starting ages so the founder cohort doesn't all die of old age
      // on the same tick (a synchronized die-off would whipsaw the populations).
      blues = [];
      for (let i = 0; i < config.startBlues; i++) {
        const p = randomPointInDisk(R * 0.8);
        const b = makeBlob('blue', p.x, p.y, K.blueStart * rng.range(0.7, 1), null, 0, 0);
        b.bornAt = -rng.range(0, K.blueMaxAge * 0.6);
        blues.push(b);
      }
      reds = [];
      for (let i = 0; i < config.startReds; i++) {
        const p = randomPointInDisk(R * 0.8);
        const r = makeBlob('red', p.x, p.y, K.redStart * rng.range(0.7, 1), null, 0, 0);
        r.bornAt = -rng.range(0, K.redMaxAge * 0.6);
        reds.push(r);
      }
      sample(true);
    }

    /* ---- spatial hash ---- */
    function buildGrid() {
      const R = config.worldRadius;
      gridCell = Math.max(config.blueVision, config.redVision, K.crowdRange, 3) + 0.5;
      gridOrigin = -R - gridCell;
      gridCols = Math.ceil((2 * R + 2 * gridCell) / gridCell) + 1;
      grid = new Array(gridCols * gridCols);
      for (let i = 0; i < grid.length; i++) grid[i] = null;
      const put = (arr) => {
        for (const b of arr) {
          const cx = Math.floor((b.x - gridOrigin) / gridCell);
          const cy = Math.floor((b.y - gridOrigin) / gridCell);
          const idx = cy * gridCols + cx;
          if (idx < 0 || idx >= grid.length) continue;
          if (!grid[idx]) grid[idx] = [];
          grid[idx].push(b);
        }
      };
      put(blues); put(reds);
    }

    // Visit blobs of `kind` within radius r of (x,y); call fn(blob, dist2).
    function forNeighbors(x, y, r, kind, fn) {
      const cx = Math.floor((x - gridOrigin) / gridCell);
      const cy = Math.floor((y - gridOrigin) / gridCell);
      const r2 = r * r;
      for (let gy = cy - 1; gy <= cy + 1; gy++) {
        for (let gx = cx - 1; gx <= cx + 1; gx++) {
          if (gx < 0 || gy < 0 || gx >= gridCols || gy >= gridCols) continue;
          const cell = grid[gy * gridCols + gx];
          if (!cell) continue;
          for (const b of cell) {
            if (b.kind !== kind) continue;
            const dx = b.x - x, dy = b.y - y;
            const d2 = dx * dx + dy * dy;
            if (d2 <= r2) fn(b, d2);
          }
        }
      }
    }

    /* ---- steering helpers ---- */
    function steerTo(b, dirx, diry, maxSpeed, throttle, dt) {
      // normalise desired direction
      const dl = Math.hypot(dirx, diry) || 1;
      const dvx = (dirx / dl) * maxSpeed * throttle;
      const dvy = (diry / dl) * maxSpeed * throttle;
      const k = Math.min(1, K.turnRate * dt);
      b.vx += (dvx - b.vx) * k;
      b.vy += (dvy - b.vy) * k;
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > maxSpeed) { b.vx = (b.vx / sp) * maxSpeed; b.vy = (b.vy / sp) * maxSpeed; }
    }
    function idle(b, dt) {
      b.vx *= (1 - Math.min(1, 8 * dt));
      b.vy *= (1 - Math.min(1, 8 * dt));
    }
    function integrate(b, dt) {
      b.x += b.vx * dt; b.y += b.vy * dt;
      // soft round wall
      const R = config.worldRadius;
      const d = Math.hypot(b.x, b.y);
      const edge = R - 0.6;
      if (d > edge) {
        const nx = b.x / (d || 1), ny = b.y / (d || 1);
        b.x = nx * edge; b.y = ny * edge;
        // reflect velocity inward a touch
        const dot = b.vx * nx + b.vy * ny;
        b.vx -= 1.6 * dot * nx; b.vy -= 1.6 * dot * ny;
        b.wander = Math.atan2(-ny, -nx) + rng.gauss(0.4);
      }
    }

    /* ---- one fixed sub-step ---- */
    function substep(dt) {
      // Trees regrow.
      for (const t of trees) {
        if (t.regrow > 0) t.regrow -= dt;
        else if (t.fruit < config.fruitCap) t.fruit = Math.min(config.fruitCap, t.fruit + config.fruitGrowth * dt);
        if (t.fruit > config.fruitCap) t.fruit = config.fruitCap;
      }

      buildGrid();
      const newborns = [];
      let births = 0, deaths = 0;

      /* ---------------- BLUE blobs: seek fruit, flee red, breed ------------ */
      const blueMaxSp = config.blueSpeed;
      for (const b of blues) {
        const age = time - b.bornAt;
        const vision = config.blueVision * b.traits.vision;
        const maxSp = blueMaxSp * b.traits.speed;
        // A hungry blob is braver: it lets a red get much closer before bolting,
        // so it can keep feeding instead of panic-starving. A full blob is timid.
        const braveFlee = vision * (0.34 + 0.46 * (b.energy / K.blueMax));

        if (b.eatCd > 0) b.eatCd -= dt;
        if (b.reproCd > 0) b.reproCd -= dt;
        if (b.stun > 0) b.stun -= dt;

        if (b.state === 'eat') {
          // locked, chewing
          b.stateTimer -= dt;
          idle(b, dt);
          if (b.stateTimer <= 0) {
            const t = b._eatTree;
            if (t && t.fruit >= 0.9) {
              t.fruit -= 1; t.regrow = config.fruitReturnDelay;
              b.energy = Math.min(K.blueMax, b.energy + K.blueFruitEnergy);
              b.lastEat = time;
              events.push({ type: 'eat', x: b.x, y: b.y, tree: t.id });
            }
            b._eatTree = null; b.eatCd = K.blueEatCd; b.state = 'wander';
          }
        } else {
          // ---- decide ----
          let nearestRed = null, nrD2 = Infinity;
          let rfx = 0, rfy = 0, rn = 0;
          forNeighbors(b.x, b.y, braveFlee, 'red', (r, d2) => {
            rn++;
            const inv = 1 / (Math.sqrt(d2) + 0.3);
            rfx += (b.x - r.x) * inv; rfy += (b.y - r.y) * inv;
            if (d2 < nrD2) { nrD2 = d2; nearestRed = r; }
          });

          if (b.stun > 0) {
            idle(b, dt); b.state = 'flee';
          } else if (nearestRed) {
            // FLEE — run from the crowd of nearby reds (a hair below top speed:
            // this small gap is what lets a faster red ever close in)
            b.state = 'flee';
            steerTo(b, rfx, rfy, maxSp, 0.9, dt);
          } else {
            // look for the nearest tree with fruit inside vision;
            // also remember the nearest tree of any kind (the grove) to drift toward.
            let bestTree = null, btD2 = Infinity;
            let anyTree = null, anyD2 = Infinity;
            for (const t of trees) {
              const dx = t.x - b.x, dy = t.y - b.y;
              const d2 = dx * dx + dy * dy;
              if (d2 < anyD2) { anyD2 = d2; anyTree = t; }
              if (t.fruit < 0.9) continue;
              if (d2 < btD2 && d2 < vision * vision) { btD2 = d2; bestTree = t; }
            }
            // crowd avoidance from other blues
            let cfx = 0, cfy = 0;
            forNeighbors(b.x, b.y, K.crowdRange, 'blue', (o, d2) => {
              if (o === b || d2 < 1e-4) return;
              const inv = 1 / (Math.sqrt(d2) + 0.2);
              cfx += (b.x - o.x) * inv; cfy += (b.y - o.y) * inv;
            });

            if (bestTree) {
              const dist = Math.sqrt(btD2);
              if (dist < K.eatRadius && b.eatCd <= 0 && bestTree.fruit >= 0.9) {
                b.state = 'eat'; b.stateTimer = config.blueEatTime; b._eatTree = bestTree;
                b.targetX = bestTree.x; b.targetY = bestTree.y; idle(b, dt);
              } else {
                b.state = 'seek';
                b.targetX = bestTree.x; b.targetY = bestTree.y;
                const dx = bestTree.x - b.x + cfx * K.crowdWeight;
                const dy = bestTree.y - b.y + cfy * K.crowdWeight;
                steerTo(b, dx, dy, maxSp, 0.92, dt);
              }
            } else {
              // WANDER, but drift back toward the grove (blobs remember where
              // trees are) so they gather and wait for fruit to return instead
              // of starving in open ground.
              b.state = 'wander';
              b.wander += rng.gauss(K.wanderJitter * dt);
              let dx = Math.cos(b.wander) + cfx * K.crowdWeight;
              let dy = Math.sin(b.wander) + cfy * K.crowdWeight;
              if (anyTree) {
                const gd = Math.sqrt(anyD2) || 1;
                const pull = gd > 3 ? 0.9 : 0.15; // hang around, don't sit on top
                dx += ((anyTree.x - b.x) / gd) * pull;
                dy += ((anyTree.y - b.y) / gd) * pull;
              }
              steerTo(b, dx, dy, maxSp, 0.55, dt);
            }
          }
          integrate(b, dt);
        }

        // ---- energy accounting ----
        const sp = Math.hypot(b.vx, b.vy);
        const move = K.blueMove * (sp / Math.max(0.001, maxSp));
        b.energy -= config.blueEnergyUse * (K.blueIdle + move) * dt;

        // ---- reproduce ----
        if (b.energy > config.blueCopyThreshold && b.reproCd <= 0 &&
            b.state !== 'eat' && blues.length + newborns.length < K.maxBlue) {
          const give = K.blueReproChild;
          b.energy -= (give + K.blueReproCost);
          b.reproCd = K.blueReproCd;
          const ang = rng() * TAU;
          const child = makeBlob('blue',
            b.x + Math.cos(ang) * 0.8, b.y + Math.sin(ang) * 0.8,
            give, mutate(b.traits), b.gen + 1, b.id);
          child.reproCd = K.blueReproCd;
          newborns.push(child);
          births++;
          events.push({ type: 'birth', x: child.x, y: child.y, kind: 'blue' });
        }

        if (b.energy <= 0 || age > K.blueMaxAge) { b._dead = true; deaths++; }
      }

      /* ---------------- RED blobs: chase blue, drain on contact, breed ----- */
      const redMaxSp = config.redSpeed;
      for (const r of reds) {
        const age = time - r.bornAt;
        const vision = config.redVision * r.traits.vision;
        const maxSp = redMaxSp * r.traits.speed;

        if (r.reproCd > 0) r.reproCd -= dt;
        if (r.contactCd > 0) r.contactCd -= dt;

        if (r.state === 'rest') {
          r.stateTimer -= dt; idle(r, dt);
          if (r.stateTimer <= 0) r.state = 'wander';
        } else {
          // find nearest blue within vision
          let target = null, tD2 = Infinity;
          forNeighbors(r.x, r.y, vision, 'blue', (b, d2) => {
            if (d2 < tD2) { tD2 = d2; target = b; }
          });
          // gentle red-red separation so they spread
          let sfx = 0, sfy = 0;
          forNeighbors(r.x, r.y, K.crowdRange, 'red', (o, d2) => {
            if (o === r || d2 < 1e-4) return;
            const inv = 1 / (Math.sqrt(d2) + 0.2);
            sfx += (r.x - o.x) * inv; sfy += (r.y - o.y) * inv;
          });

          if (target) {
            const dist = Math.sqrt(tD2);
            if (dist < K.contactRadius && r.contactCd <= 0) {
              // CONTACT — gentle tap that draws energy across.
              // Predator interference (Beddington–DeAngelis): reds crowding the
              // same prey compete, so each gains less. This self-limits the red
              // peak and stops it overshooting into a blue crash.
              let localReds = 0;
              forNeighbors(r.x, r.y, 3.5, 'red', () => { localReds++; });
              const interference = 1 / (1 + 0.45 * Math.max(0, localReds - 1));
              const drawn = Math.min(config.redContact, target.energy);
              target.energy -= config.redContact;      // full tax on the blue
              r.energy = Math.min(K.redMax, r.energy + drawn * K.redEff * r.traits.str * interference);
              r.state = 'rest'; r.stateTimer = config.redPause; r.contactCd = config.redPause;
              r.lastContact = time;
              target.stun = K.blueStun;
              // shove the blue away
              const nx = (target.x - r.x) / (dist || 1), ny = (target.y - r.y) / (dist || 1);
              target.vx += nx * 1.2; target.vy += ny * 1.2;
              events.push({ type: 'contact', x: r.x, y: r.y, bx: target.x, by: target.y });
              idle(r, dt);
            } else {
              r.state = 'chase';
              r.targetX = target.x; r.targetY = target.y;
              const dx = target.x - r.x + sfx * 0.3;
              const dy = target.y - r.y + sfy * 0.3;
              steerTo(r, dx, dy, maxSp, 1.0, dt);
            }
          } else {
            r.state = 'wander';
            r.wander += rng.gauss(K.wanderJitter * dt);
            const dx = Math.cos(r.wander) + sfx * 0.3;
            const dy = Math.sin(r.wander) + sfy * 0.3;
            steerTo(r, dx, dy, maxSp, 0.5, dt);
          }
          integrate(r, dt);
        }

        const sp = Math.hypot(r.vx, r.vy);
        const move = K.redMove * (sp / Math.max(0.001, maxSp));
        r.energy -= config.redEnergyUse * (K.redIdle + move) * dt;

        // Territory rule: a red will not raise young where reds are already
        // packed together. This caps red surges (so they can't overshoot into a
        // blue crash) while leaving sparse reds free to rebound after a trough —
        // the asymmetry that turns runaway swings into a sustained cycle.
        let territoryReds = 0;
        forNeighbors(r.x, r.y, 4.5, 'red', () => { territoryReds++; });
        if (territoryReds <= 4 && r.energy > config.redCopyThreshold && r.reproCd <= 0 &&
            r.state !== 'rest' && reds.length + newborns.length < K.maxRed) {
          const give = K.redReproChild;
          r.energy -= (give + K.redReproCost);
          r.reproCd = K.redReproCd;
          const ang = rng() * TAU;
          const child = makeBlob('red',
            r.x + Math.cos(ang) * 0.8, r.y + Math.sin(ang) * 0.8,
            give, mutate(r.traits), r.gen + 1, r.id);
          child.reproCd = K.redReproCd;
          newborns.push(child);
          births++;
          events.push({ type: 'birth', x: child.x, y: child.y, kind: 'red' });
        }

        if (r.energy <= 0 || age > K.redMaxAge) { r._dead = true; deaths++; }
      }

      // apply deaths + births
      if (deaths) {
        for (const b of blues) if (b._dead) events.push({ type: 'death', x: b.x, y: b.y, kind: 'blue' });
        for (const r of reds) if (r._dead) events.push({ type: 'death', x: r.x, y: r.y, kind: 'red' });
        blues = blues.filter((b) => !b._dead);
        reds = reds.filter((r) => !r._dead);
      }
      for (const nb of newborns) (nb.kind === 'blue' ? blues : reds).push(nb);

      time += dt; steps++;
      sampleClock += dt;
      history._pendBirths = (history._pendBirths || 0) + births;
      history._pendDeaths = (history._pendDeaths || 0) + deaths;
      if (sampleClock >= K.sampleInterval) { sampleClock = 0; sample(false); }
    }

    function mutate(tr) {
      return {
        speed: clamp(tr.speed * (1 + rng.gauss(K.mutation)), 0.7, 1.35),
        vision: clamp(tr.vision * (1 + rng.gauss(K.mutation)), 0.7, 1.35),
        str: clamp(tr.str * (1 + rng.gauss(K.mutation)), 0.7, 1.35),
      };
    }

    function totalFruit() { let s = 0; for (const t of trees) s += t.fruit; return s; }
    function avg(arr, f) { if (!arr.length) return 0; let s = 0; for (const a of arr) s += f(a); return s / arr.length; }

    function sample(force) {
      const h = history;
      h.t.push(+time.toFixed(2));
      h.fruit.push(+totalFruit().toFixed(2));
      h.blue.push(blues.length);
      h.red.push(reds.length);
      h.blueEnergy.push(+avg(blues, (b) => b.energy).toFixed(2));
      h.redEnergy.push(+avg(reds, (r) => r.energy).toFixed(2));
      h.blueSpeed.push(+avg(blues, (b) => b.traits.speed).toFixed(3));
      h.redSpeed.push(+avg(reds, (r) => r.traits.speed).toFixed(3));
      h.births.push(force ? 0 : (h._pendBirths || 0));
      h.deaths.push(force ? 0 : (h._pendDeaths || 0));
      h._pendBirths = 0; h._pendDeaths = 0;
      if (h.t.length > K.maxHistory) {
        Object.keys(h).forEach((k) => { if (Array.isArray(h[k])) h[k].shift(); });
      }
    }

    // Advance the world by `realSeconds` of wall time (scaled by simSpeed),
    // using a fixed internal timestep for stable, reproducible integration.
    function advance(realSeconds) {
      const dt = K.FIXED_DT;
      accumulator += realSeconds * config.simSpeed;
      let guard = 0;
      while (accumulator >= dt && guard < 400) { substep(dt); accumulator -= dt; guard++; }
      if (guard >= 400) accumulator = 0; // don't spiral if tab was backgrounded
    }

    // Deterministically advance exactly one sample interval (for the Step button).
    function stepOnce() {
      const dt = K.FIXED_DT;
      const n = Math.round(K.sampleInterval / dt);
      for (let i = 0; i < n; i++) substep(dt);
    }

    function drainEvents() { const e = events; events = []; return e; }

    function pick(x, y, maxDist) {
      let best = null, bd = (maxDist || 1.4) ** 2;
      const scan = (arr) => { for (const b of arr) { const d2 = (b.x - x) ** 2 + (b.y - y) ** 2; if (d2 < bd) { bd = d2; best = b; } } };
      scan(blues); scan(reds);
      return best;
    }
    function findById(id) {
      return blues.find((b) => b.id === id) || reds.find((r) => r.id === id) || null;
    }

    reset();

    return {
      config, history, PARAM_META, K,
      advance, stepOnce, reset, drainEvents, pick, findById,
      get time() { return time; },
      get trees() { return trees; },
      get blues() { return blues; },
      get reds() { return reds; },
      get counts() { return { blue: blues.length, red: reds.length, fruit: totalFruit(), trees: trees.length }; },
    };
  }

  const API = { createSimulation, DEFAULTS, PRESETS, PARAM_META, makeRNG };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.GardenSim = API;
})(typeof window !== 'undefined' ? window : globalThis);
