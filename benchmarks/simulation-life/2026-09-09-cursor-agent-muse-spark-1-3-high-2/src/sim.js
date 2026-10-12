export function mulberry(seed) {
    let a = seed >>> 0 || 1;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
export const DEFAULTS = {
    fruitGrowth: 0.07,
    fruitLimit: 6,
    fruitDelay: 35,
    blueDrain: 0.1,
    blueSpeed: 0.62,
    blueVision: 62,
    blueRepro: 64,
    blueEatTime: 24,
    redDrain: 0.11,
    redSpeed: 0.58,
    redVision: 34,
    redStrength: 8,
    redRepro: 92,
    redPause: 38,
    nTrees: 7,
    nBlue: 14,
    nRed: 5,
    worldSize: 100,
    seed: 21,
    simSpeed: 2,
};
export function radiusOf(p) {
    return p.worldSize * 0.5;
}
function randInDisk(rng, r) {
    const a = rng() * Math.PI * 2;
    const d = Math.sqrt(rng()) * r * 0.86;
    return { x: Math.cos(a) * d, z: Math.sin(a) * d };
}
export function createWorld(params) {
    const rng = mulberry(params.seed * 7919 + 13);
    const R = radiusOf(params);
    const trees = [];
    for (let i = 0; i < params.nTrees; i++) {
        const p = randInDisk(rng, R);
        trees.push({
            id: i,
            x: p.x,
            z: p.z,
            fruit: 2 + Math.floor(rng() * params.fruitLimit * 0.5),
            delay: 0,
            phase: rng() * Math.PI * 2,
            size: 0.85 + rng() * 0.4,
        });
    }
    const blobs = [];
    let id = 1;
    const mk = (kind) => {
        const p = randInDisk(rng, R);
        const a = rng() * Math.PI * 2;
        const startE = kind === 'blue' ? 68 + rng() * 22 : 45 + rng() * 18;
        return {
            id: id++,
            kind,
            x: p.x,
            z: p.z,
            vx: 0,
            vz: 0,
            heading: a,
            energy: startE,
            maxEnergy: 100,
            age: Math.floor(rng() * 40),
            action: 'wander',
            actionT: 0,
            eatTarget: -1,
            speedTrait: 0.88 + rng() * 0.28,
            visionTrait: 0.88 + rng() * 0.28,
            gen: 1,
            parent: 0,
            wob: rng() * Math.PI * 2,
            blink: 60 + rng() * 140,
            blinkT: 0,
            glow: 0,
            reproCool: 20 + rng() * 40,
            staggerDir: rng() * Math.PI * 2,
        };
    };
    for (let i = 0; i < params.nBlue; i++)
        blobs.push(mk('blue'));
    for (let i = 0; i < params.nRed; i++)
        blobs.push(mk('red'));
    return {
        blobs,
        trees,
        sparks: [],
        tick: 0,
        nextId: id,
        rng,
        params: { ...params },
        history: [],
        cumEaten: 0,
        cumContacts: 0,
        cumBirthsB: 0,
        cumBirthsR: 0,
        cumDeathsB: 0,
        cumDeathsR: 0,
        stepEaten: 0,
        stepContacts: 0,
        stepBirthsB: 0,
        stepBirthsR: 0,
        stepDeathsB: 0,
        stepDeathsR: 0,
    };
}
function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
}
function mutate(rng, v, amt, lo, hi) {
    const n = v + (rng() - 0.5) * 2 * amt;
    return clamp(n, lo, hi);
}
export function stepWorld(w) {
    const p = w.params;
    const R = radiusOf(p);
    const rng = w.rng;
    w.stepEaten = 0;
    w.stepContacts = 0;
    w.stepBirthsB = 0;
    w.stepBirthsR = 0;
    w.stepDeathsB = 0;
    w.stepDeathsR = 0;
    for (const t of w.trees) {
        if (t.delay > 0) {
            t.delay -= 1;
        }
        else if (t.fruit < p.fruitLimit) {
            t.fruit = Math.min(p.fruitLimit, t.fruit + p.fruitGrowth);
        }
    }
    const blues = w.blobs.filter((b) => b.kind === 'blue');
    const reds = w.blobs.filter((b) => b.kind === 'red');
    const newborn = [];
    const dead = new Set();
    const dist2 = (ax, az, bx, bz) => {
        const dx = ax - bx;
        const dz = az - bz;
        return Math.sqrt(dx * dx + dz * dz);
    };
    for (const b of w.blobs) {
        b.age += 1;
        b.wob += 0.12 + (b.kind === 'blue' ? p.blueSpeed : p.redSpeed) * 0.1;
        b.blink -= 1;
        if (b.blink <= -8)
            b.blink = 90 + rng() * 160;
        b.blinkT = b.blink < 0 ? 1 : 0;
        if (b.glow > 0)
            b.glow -= 1;
        if (b.reproCool > 0)
            b.reproCool -= 1;
        const isBlue = b.kind === 'blue';
        const speedBase = (isBlue ? p.blueSpeed : p.redSpeed) * b.speedTrait;
        let vision = (isBlue ? p.blueVision : p.redVision) * b.visionTrait;
        if (!isBlue && blues.length < 8)
            vision *= 0.5 + blues.length * 0.06;
        const drain = isBlue ? p.blueDrain : p.redDrain;
        if (isBlue) {
            if (b.action === 'eat' && b.actionT > 0) {
                b.actionT -= 1;
                b.energy -= drain * 0.25;
                const tree = w.trees.find((t) => t.id === b.eatTarget);
                if (tree && tree.fruit >= 0.25) {
                    const bite = Math.min(0.5, tree.fruit);
                    tree.fruit -= bite;
                    b.energy = Math.min(b.maxEnergy, b.energy + bite * 16);
                    if (tree.fruit < 0.5)
                        tree.delay = Math.max(tree.delay, p.fruitDelay);
                    if (b.actionT % 6 === 0) {
                        w.sparks.push({ x: b.x, z: b.z, t: 0, life: 22, color: '#7ed957' });
                    }
                }
                else {
                    b.actionT = 0;
                }
                b.glow = Math.max(b.glow, 4);
                if (b.actionT <= 0) {
                    b.action = 'wander';
                    b.eatTarget = -1;
                }
                continue;
            }
            let nearestRed = null;
            let dRed = Infinity;
            for (const r of reds) {
                if (dead.has(r.id))
                    continue;
                const d = dist2(b.x, b.z, r.x, r.z);
                if (d < dRed) {
                    dRed = d;
                    nearestRed = r;
                }
            }
            let tree = null;
            let dTree = Infinity;
            for (const t of w.trees) {
                if (t.fruit < 0.6)
                    continue;
                const d = dist2(b.x, b.z, t.x, t.z);
                if (d < vision && d < dTree) {
                    dTree = d;
                    tree = t;
                }
            }
            let crowdX = 0;
            let crowdZ = 0;
            let crowdN = 0;
            for (const o of blues) {
                if (o === b || dead.has(o.id))
                    continue;
                const d = dist2(b.x, b.z, o.x, o.z);
                if (d < 12 && d > 0.01) {
                    crowdN++;
                    crowdX += (b.x - o.x) / (d + 1);
                    crowdZ += (b.z - o.z) / (d + 1);
                }
            }
            let dx = 0;
            let dz = 0;
            const hungry = b.energy < 45;
            const redClose = nearestRed && dRed < 10;
            const redNear = nearestRed && dRed < Math.min(vision * 0.5, 26);
            if (tree && dTree < 12 && tree.fruit >= 0.6 && (hungry || !redClose)) {
                if (dTree < 7) {
                    b.action = 'eat';
                    b.actionT = Math.round(p.blueEatTime);
                    b.eatTarget = tree.id;
                    w.stepEaten += 1;
                    w.cumEaten += 1;
                    b.glow = 20;
                    continue;
                }
                const d = Math.max(dTree, 0.5);
                dx += ((tree.x - b.x) / d) * 1.5;
                dz += ((tree.z - b.z) / d) * 1.5;
                b.action = crowdN >= 3 ? 'gather' : 'seek-fruit';
            }
            else if (redNear) {
                const d = Math.max(dRed, 0.5);
                dx += ((b.x - nearestRed.x) / d) * 1.6;
                dz += ((b.z - nearestRed.z) / d) * 1.6;
                b.action = 'flee';
            }
            else if (tree) {
                if (dTree < 7 && tree.fruit >= 0.6) {
                    b.action = 'eat';
                    b.actionT = Math.round(p.blueEatTime);
                    b.eatTarget = tree.id;
                    w.stepEaten += 1;
                    w.cumEaten += 1;
                    b.glow = 20;
                    continue;
                }
                const d = Math.max(dTree, 0.5);
                dx += ((tree.x - b.x) / d) * 1.2;
                dz += ((tree.z - b.z) / d) * 1.2;
                b.action = crowdN >= 3 ? 'gather' : 'seek-fruit';
            }
            else {
                b.action = crowdN >= 5 ? 'avoid' : 'wander';
                b.heading += (rng() - 0.5) * 0.7;
                dx += Math.cos(b.heading) * 0.7;
                dz += Math.sin(b.heading) * 0.7;
            }
            if (crowdN >= 5) {
                dx += crowdX * 0.8;
                dz += crowdZ * 0.8;
            }
            if (tree && crowdN >= 2 && crowdN < 5) {
                dx += crowdX * 0.15;
                dz += crowdZ * 0.15;
            }
            const len = Math.hypot(dx, dz) || 1;
            const sp = speedBase * (b.action === 'flee' ? 1.5 : 1);
            const nx = (dx / len) * sp;
            const nz = (dz / len) * sp;
            b.vx += (nx - b.vx) * 0.25;
            b.vz += (nz - b.vz) * 0.25;
            b.x += b.vx;
            b.z += b.vz;
            b.heading = Math.atan2(b.vz, b.vx);
            const moved = Math.hypot(b.vx, b.vz);
            b.energy -= drain * (0.3 + moved * 1.1);
            if (b.age > 1100)
                b.energy -= 0.02;
        }
        else {
            if (b.action === 'pause' && b.actionT > 0) {
                b.actionT -= 1;
                b.energy -= drain * 0.25;
                b.glow = Math.max(b.glow, 3);
                continue;
            }
            if (b.action === 'stagger' && b.actionT > 0) {
                b.actionT -= 1;
                b.energy -= drain * 0.3;
                b.x += Math.cos(b.staggerDir) * speedBase * 0.4;
                b.z += Math.sin(b.staggerDir) * speedBase * 0.4;
                continue;
            }
            let prey = null;
            let dPrey = Infinity;
            for (const o of blues) {
                if (dead.has(o.id))
                    continue;
                if (o.age < 25)
                    continue;
                const d = dist2(b.x, b.z, o.x, o.z);
                if (d < vision && d < dPrey) {
                    dPrey = d;
                    prey = o;
                }
            }
            let dx = 0;
            let dz = 0;
            if (prey) {
                const d = Math.max(dPrey, 0.5);
                if (d < 6.5) {
                    const gain = Math.min(p.redStrength, prey.energy * 0.4 + 4);
                    prey.energy -= gain * 0.6;
                    b.energy = Math.min(b.maxEnergy, b.energy + gain);
                    b.action = 'pause';
                    b.actionT = Math.round(p.redPause);
                    b.glow = 26;
                    prey.glow = 18;
                    prey.action = 'stagger';
                    prey.actionT = 10;
                    prey.staggerDir = Math.atan2(prey.z - b.z, prey.x - b.x);
                    w.sparks.push({ x: (b.x + prey.x) / 2, z: (b.z + prey.z) / 2, t: 0, life: 30, color: '#ff6b81' });
                    w.sparks.push({ x: b.x, z: b.z, t: 0, life: 24, color: '#ffd166' });
                    w.stepContacts += 1;
                    w.cumContacts += 1;
                    continue;
                }
                dx += ((prey.x - b.x) / d) * 1.3;
                dz += ((prey.z - b.z) / d) * 1.3;
                b.action = 'chase';
            }
            else {
                b.action = 'wander';
                b.heading += (rng() - 0.5) * 0.55;
                dx += Math.cos(b.heading) * 0.7;
                dz += Math.sin(b.heading) * 0.7;
            }
            const len = Math.hypot(dx, dz) || 1;
            const hungryRed = b.energy < 32;
            const sp = speedBase * (b.action === 'chase' ? (hungryRed ? 0.75 : 1.05) : 0.45);
            const nx = (dx / len) * sp;
            const nz = (dz / len) * sp;
            b.vx += (nx - b.vx) * 0.22;
            b.vz += (nz - b.vz) * 0.22;
            b.x += b.vx;
            b.z += b.vz;
            b.heading = Math.atan2(b.vz, b.vx);
            const moved = Math.hypot(b.vx, b.vz);
            b.energy -= drain * (b.action === 'wander' ? 0.12 + moved * 0.5 : 0.3 + moved * 1.1);
            if (b.age > 1100)
                b.energy -= 0.02;
        }
        const d0 = Math.hypot(b.x, b.z);
        if (d0 > R * 0.92) {
            const s = (R * 0.92) / d0;
            b.x *= s;
            b.z *= s;
            b.heading = Math.atan2(-b.vz, -b.vx) + (rng() - 0.5);
        }
    }
    for (const b of w.blobs) {
        if (dead.has(b.id))
            continue;
        if (b.energy <= 0) {
            dead.add(b.id);
            if (b.kind === 'blue') {
                w.stepDeathsB += 1;
                w.cumDeathsB += 1;
            }
            else {
                w.stepDeathsR += 1;
                w.cumDeathsR += 1;
            }
            w.sparks.push({ x: b.x, z: b.z, t: 0, life: 26, color: b.kind === 'blue' ? '#7fb2ff' : '#ff8b8b' });
            continue;
        }
        const thresh = b.kind === 'blue' ? p.blueRepro : p.redRepro;
        const totalSame = b.kind === 'blue' ? blues.length : reds.length;
        const cap = b.kind === 'blue' ? 150 : 26;
        if (b.energy > thresh && b.age > 60 && b.reproCool <= 0 && totalSame + newborn.length < cap && b.actionT <= 0) {
            const red = b.kind === 'red';
            const childE = b.energy * (red ? 0.4 : 0.42);
            b.energy *= red ? 0.35 : 0.55;
            b.reproCool = 120;
            const a = rng() * Math.PI * 2;
            const nb = {
                id: w.nextId++,
                kind: b.kind,
                x: clamp(b.x + Math.cos(a) * 6, -R, R),
                z: clamp(b.z + Math.sin(a) * 6, -R, R),
                vx: 0,
                vz: 0,
                heading: a,
                energy: childE,
                maxEnergy: 100,
                age: 0,
                action: 'wander',
                actionT: 0,
                eatTarget: -1,
                speedTrait: mutate(rng, b.speedTrait, 0.06, 0.7, 1.35),
                visionTrait: mutate(rng, b.visionTrait, 0.06, 0.7, 1.35),
                gen: b.gen + 1,
                parent: b.id,
                wob: rng() * Math.PI * 2,
                blink: 100,
                blinkT: 0,
                glow: 20,
                reproCool: 90,
                staggerDir: 0,
            };
            newborn.push(nb);
            w.sparks.push({ x: b.x, z: b.z, t: 0, life: 28, color: b.kind === 'blue' ? '#bfe0ff' : '#ffc2c2' });
            if (b.kind === 'blue') {
                w.stepBirthsB += 1;
                w.cumBirthsB += 1;
            }
            else {
                w.stepBirthsR += 1;
                w.cumBirthsR += 1;
            }
        }
    }
    if (dead.size > 0)
        w.blobs = w.blobs.filter((b) => !dead.has(b.id));
    if (newborn.length > 0)
        w.blobs.push(...newborn);
    for (const s of w.sparks)
        s.t += 1;
    w.sparks = w.sparks.filter((s) => s.t < s.life);
    w.tick += 1;
    if (w.tick % 4 === 0 || w.history.length === 0) {
        const nb = w.blobs.filter((b) => b.kind === 'blue');
        const nr = w.blobs.filter((b) => b.kind === 'red');
        const fruit = w.trees.reduce((a, t) => a + t.fruit, 0);
        const avg = (arr, f) => arr.length ? arr.reduce((a, b) => a + f(b), 0) / arr.length : 0;
        w.history.push({
            t: w.tick,
            fruit: Math.round(fruit * 10) / 10,
            blue: nb.length,
            red: nr.length,
            avgBlueSpeed: Math.round(avg(nb, (b) => b.speedTrait) * 1000) / 1000,
            avgRedSpeed: Math.round(avg(nr, (b) => b.speedTrait) * 1000) / 1000,
            avgBlueVision: Math.round(avg(nb, (b) => b.visionTrait) * 1000) / 1000,
            avgRedVision: Math.round(avg(nr, (b) => b.visionTrait) * 1000) / 1000,
            birthsBlue: w.cumBirthsB,
            birthsRed: w.cumBirthsR,
            deathsBlue: w.cumDeathsB,
            deathsRed: w.cumDeathsR,
            contacts: w.cumContacts,
            eaten: w.cumEaten,
        });
        if (w.history.length > 1500)
            w.history.splice(0, w.history.length - 1500);
    }
}
export const PRESETS = [
    {
        name: 'balanced garden',
        desc: 'Gentle waves, blues lead, reds follow.',
        patch: {},
    },
    {
        name: 'fruit-rich garden',
        desc: 'Fast fruit, blues bloom quickly.',
        patch: { fruitGrowth: 0.12, fruitLimit: 9, nTrees: 9, nBlue: 16, nRed: 5, blueRepro: 66 },
    },
    {
        name: 'red-heavy garden',
        desc: 'Blues dip first, reds fade later.',
        patch: { nBlue: 12, nRed: 13, redStrength: 16, redVision: 68, blueVision: 55, fruitGrowth: 0.06 },
    },
    {
        name: 'fragile balance',
        desc: 'Sharp boom-bust cycles.',
        patch: { fruitGrowth: 0.045, redStrength: 16, blueRepro: 78, redRepro: 78, blueDrain: 0.12 },
    },
    {
        name: 'low-fruit garden',
        desc: 'Small world, everything stays tiny.',
        patch: { fruitGrowth: 0.03, fruitLimit: 4, nTrees: 4, nBlue: 8, nRed: 4, fruitDelay: 65 },
    },
];
export function summarize(history) {
    if (history.length < 10)
        return ['Press play and let the garden run a little.'];
    const blues = history.map((h) => h.blue);
    const reds = history.map((h) => h.red);
    const fruits = history.map((h) => h.fruit);
    const maxB = Math.max(...blues);
    const maxR = Math.max(...reds);
    const lastB = blues[blues.length - 1];
    const lastR = reds[reds.length - 1];
    const avgF = fruits.reduce((a, b) => a + b, 0) / fruits.length;
    const out = [];
    const iB = blues.indexOf(maxB);
    const iR = reds.indexOf(maxR);
    if (iB < iR)
        out.push('Blue blobs grew first, then red blobs followed.');
    else if (iR < iB)
        out.push('Red blobs peaked before blue blobs this run.');
    else
        out.push('Both groups peaked together.');
    if (avgF < 12)
        out.push('Low fruit kept the garden small.');
    if (maxB > 30 && maxR > 12)
        out.push('The garden stayed lively with long waves.');
    const balanced = history.slice(-30);
    const vb = Math.max(...balanced.map((h) => h.blue)) - Math.min(...balanced.map((h) => h.blue));
    const vr = Math.max(...balanced.map((h) => h.red)) - Math.min(...balanced.map((h) => h.red));
    if (vb < 8 && vr < 6 && lastB > 3 && lastR > 2)
        out.push('The garden stayed balanced.');
    if (lastB === 0 && lastR === 0)
        out.push('Both groups faded and the dish went quiet.');
    else if (lastB === 0)
        out.push('Blue blobs faded and the world settled into a simpler state.');
    else if (lastR === 0)
        out.push('Red blobs faded and blue blobs keep grazing alone.');
    if (maxB >= 140 || maxR >= 140)
        out.push('Growth hit the dish limit and leveled out instead of growing forever.');
    else if (maxB > 0)
        out.push('Group sizes leveled out instead of growing forever.');
    return out;
}
