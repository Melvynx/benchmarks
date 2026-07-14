/*
 * render3d.js — the little raised garden dish.
 *
 * A faux-3D scene drawn with Canvas 2D: the round world is squashed into an
 * ellipse (a tilted tabletop dish), objects are painted back-to-front, each
 * blob carries a soft shadow, a hop, a blink, a lean and a face. Nothing here
 * touches the simulation state — it only reads positions and draws them.
 */
(function (global) {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
  const lerp = (a, b, t) => a + (b - a) * t;

  // Sprite factory: draw once into an offscreen canvas, then blit many times.
  function makeSprite(size, paint) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    paint(c.getContext('2d'), size);
    return c;
  }

  function createRenderer(canvas, sim) {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, DPR = 1;
    let cx = 0, cy = 0, scale = 1;

    const cam = { yaw: -0.5, flatten: 0.62, zoom: 1 };
    const ZLIFT = 0.62;      // how much world-height lifts a point up-screen
    let wallH = 26;          // dish rim thickness in px (recomputed on resize)

    let theme = 'dark';
    let pal = {};
    const sprites = {};      // theme-dependent, rebuilt on theme change
    const vis = new Map();   // per-blob visual state, keyed by id
    const screenPos = [];    // [{id, sx, sy, r}] for hit-testing, rebuilt each draw
    let particles = [];      // transient sparkles/pops

    /* ------------------------------------------------------------ palette */
    function setTheme(t) {
      theme = t;
      pal = theme === 'light' ? {
        grassC: '#8fca6f', grassE: '#5c9a4f', grassRim: '#48853f',
        dirtT: '#a07c4f', dirtB: '#6b4e2e', ring: 'rgba(60,90,40,.10)',
        shadow: 'rgba(60,50,20,.30)',
      } : {
        grassC: '#3d6b3c', grassE: '#274a29', grassRim: '#1d3a20',
        dirtT: '#5a4632', dirtB: '#2c2016', ring: 'rgba(255,255,255,.045)',
        shadow: 'rgba(0,0,0,.34)',
      };
      buildSprites();
    }

    function buildSprites() {
      sprites.blob = { blue: blobSprite('blue'), red: blobSprite('red') };
      sprites.shadow = makeSprite(96, (c, s) => {
        const g = c.createRadialGradient(s/2, s/2, 1, s/2, s/2, s/2);
        g.addColorStop(0, pal.shadow);
        g.addColorStop(0.55, theme === 'light' ? 'rgba(60,50,20,.16)' : 'rgba(0,0,0,.16)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
      });
      sprites.fruit = makeSprite(40, (c, s) => {
        const g = c.createRadialGradient(s*0.38, s*0.34, 1, s*0.5, s*0.5, s*0.5);
        g.addColorStop(0, '#e4f7c4'); g.addColorStop(0.4, '#8ed14f');
        g.addColorStop(1, '#3c8f2c');
        c.fillStyle = g; c.beginPath(); c.arc(s/2, s/2, s/2 - 3, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,.6)';
        c.beginPath(); c.ellipse(s*0.38, s*0.32, s*0.1, s*0.07, -0.6, 0, TAU); c.fill();
      });
      sprites.canopy = canopySprite();
      sprites.spark = makeSprite(24, (c, s) => {
        const g = c.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
        g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.4, 'rgba(255,246,190,.7)');
        g.addColorStop(1, 'rgba(255,246,190,0)');
        c.fillStyle = g; c.fillRect(0, 0, s, s);
      });
    }

    function blobSprite(kind) {
      const S = 128;
      return makeSprite(S, (c, s) => {
        const r = s * 0.42, mx = s/2, my = s*0.52;
        const col = kind === 'blue'
          ? { hi: '#cfe7ff', mid: '#4aa3ff', deep: '#2f6fc8', rim: '#1e4f9c' }
          : { hi: '#ffd6cd', mid: '#ff6f6a', deep: '#df4d47', rim: '#a5322e' };
        // soft rim
        c.beginPath(); c.ellipse(mx, my, r, r*1.06, 0, 0, TAU);
        c.fillStyle = col.rim; c.fill();
        // body gradient
        const g = c.createRadialGradient(mx - r*0.32, my - r*0.42, r*0.15, mx, my, r*1.15);
        g.addColorStop(0, col.hi); g.addColorStop(0.35, col.mid);
        g.addColorStop(0.8, col.deep); g.addColorStop(1, col.rim);
        c.beginPath(); c.ellipse(mx, my, r*0.94, r*1.0, 0, 0, TAU);
        c.fillStyle = g; c.fill();
        // glossy top highlight
        const gg = c.createLinearGradient(0, my - r, 0, my);
        gg.addColorStop(0, 'rgba(255,255,255,.5)'); gg.addColorStop(1, 'rgba(255,255,255,0)');
        c.beginPath(); c.ellipse(mx, my - r*0.34, r*0.6, r*0.42, 0, 0, TAU);
        c.fillStyle = gg; c.fill();
        // tiny specular dot
        c.beginPath(); c.ellipse(mx - r*0.3, my - r*0.5, r*0.12, r*0.09, -0.5, 0, TAU);
        c.fillStyle = 'rgba(255,255,255,.85)'; c.fill();
      });
    }

    function canopySprite() {
      const S = 128;
      return makeSprite(S, (c, s) => {
        const mx = s/2, my = s*0.5;
        const blobs = [[0,0,0.46],[-0.3,-0.12,0.3],[0.32,-0.08,0.3],[-0.18,0.22,0.28],[0.2,0.24,0.27],[0,-0.28,0.3]];
        for (const [dx, dy, rr] of blobs) {
          const x = mx + dx*s*0.5, y = my + dy*s*0.5, r = rr*s*0.5;
          const g = c.createRadialGradient(x - r*0.3, y - r*0.4, r*0.1, x, y, r);
          const dark = theme === 'light' ? '#3f7d3a' : '#2f5b30';
          const lite = theme === 'light' ? '#77bd5f' : '#4f8c46';
          g.addColorStop(0, lite); g.addColorStop(1, dark);
          c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        }
      });
    }

    /* ------------------------------------------------------------ layout */
    function resize() {
      DPR = Math.min(2, global.devicePixelRatio || 1);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      recomputeScale();
    }
    function recomputeScale() {
      const R = sim.config.worldRadius;
      const margin = 0.86;
      const sx = (W * margin) / (2 * R);
      const sy = (H * margin) / (2 * R * cam.flatten + 2.0);
      scale = Math.min(sx, sy) * cam.zoom;
      wallH = clamp(scale * 1.5, 14, 42);
      cx = W / 2;
      cy = H / 2 - wallH * 0.2 + scale * 1.2;
    }

    /* ------------------------------------------------------------ project */
    function project(x, y, z) {
      const cyaw = Math.cos(cam.yaw), syaw = Math.sin(cam.yaw);
      const rx = x * cyaw - y * syaw;
      const ry = x * syaw + y * cyaw;
      return {
        sx: cx + rx * scale,
        sy: cy + ry * scale * cam.flatten - (z || 0) * scale * ZLIFT,
        depth: ry,
      };
    }

    /* ------------------------------------------------------------ dish */
    function drawDish() {
      const R = sim.config.worldRadius;
      const rx = R * scale, ry = R * scale * cam.flatten;
      // ground drop shadow
      ctx.save();
      ctx.beginPath(); ctx.ellipse(cx, cy + wallH + 6, rx * 1.02, ry * 1.02, 0, 0, TAU);
      ctx.fillStyle = pal.shadow; ctx.filter = 'blur(10px)'; ctx.fill();
      ctx.restore();

      // stacked rim to fake a 3D wall
      const steps = Math.max(8, Math.round(wallH / 2));
      for (let i = steps; i >= 0; i--) {
        const t = i / steps;
        const yy = cy + wallH * t;
        ctx.beginPath(); ctx.ellipse(cx, yy, rx, ry, 0, 0, TAU);
        ctx.fillStyle = mix(pal.dirtB, pal.dirtT, 1 - t);
        ctx.fill();
      }
      // grass top
      const g = ctx.createRadialGradient(cx, cy - ry * 0.25, ry * 0.1, cx, cy, rx);
      g.addColorStop(0, pal.grassC); g.addColorStop(0.7, pal.grassC);
      g.addColorStop(1, pal.grassE);
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.fillStyle = g; ctx.fill();
      // faint concentric rings for grain
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = pal.ring; ctx.lineWidth = 1.2;
      for (let k = 1; k <= 4; k++) {
        ctx.beginPath(); ctx.ellipse(cx, cy, rx * k/4.4, ry * k/4.4, 0, 0, TAU); ctx.stroke();
      }
      // inner rim shade
      const rim = ctx.createRadialGradient(cx, cy, ry * 0.7, cx, cy, rx);
      rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(1, theme === 'light' ? 'rgba(30,50,20,.20)' : 'rgba(0,0,0,.34)');
      ctx.fillStyle = rim; ctx.fillRect(cx - rx, cy - ry, rx * 2, ry * 2);
      ctx.restore();
      // bright rim line
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU);
      ctx.strokeStyle = theme === 'light' ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.10)';
      ctx.lineWidth = 1.5; ctx.stroke();
    }

    function mix(a, b, t) {
      const pa = hex(a), pb = hex(b);
      return `rgb(${Math.round(lerp(pa[0], pb[0], t))},${Math.round(lerp(pa[1], pb[1], t))},${Math.round(lerp(pa[2], pb[2], t))})`;
    }
    function hex(h) { const n = parseInt(h.slice(1), 16); return [(n>>16)&255, (n>>8)&255, n&255]; }

    /* ------------------------------------------------------------ items */
    // Build a single depth-sorted draw list of trees + blobs.
    function draw(now, dtReal) {
      ctx.clearRect(0, 0, W, H);
      drawDish();

      const items = [];
      for (const t of sim.trees) { const p = project(t.x, t.y, 0); items.push({ kind: 'tree', o: t, p }); }
      for (const b of sim.blues) items.push(blobItem(b, now));
      for (const r of sim.reds) items.push(blobItem(r, now));
      items.sort((a, b) => a.p.depth - b.p.depth);

      // shadows first (all on the ground), then bodies, keeps stacking clean
      screenPos.length = 0;
      for (const it of items) {
        if (it.kind === 'tree') drawTreeShadow(it); else drawBlobShadow(it);
      }
      for (const it of items) {
        if (it.kind === 'tree') drawTree(it, now); else drawBlob(it, now);
      }
      drawParticles(now, dtReal);
    }

    function blobItem(b, now) {
      let v = vis.get(b.id);
      if (!v) {
        v = { blink: 0, blinkT: 0.6 + Math.abs(hash(b.id)) % 4, hop: (Math.abs(hash(b.id)) % 100) / 100 * TAU,
              lookx: 0, looky: 1, sq: 1, seen: now, flash: 0 };
        vis.set(b.id, v);
      }
      v.seen = now;
      const p = project(b.x, b.y, 0);
      return { kind: 'blob', o: b, v, p };
    }

    function drawBlobShadow(it) {
      const b = it.o, sp = Math.hypot(b.vx, b.vy);
      const size = (0.62 + energyScale(b) * 0.5) * scale * 1.9;
      const z = hopHeight(b, it.v);
      const a = clamp(1 - z * 0.5, 0.35, 1);
      ctx.globalAlpha = a;
      ctx.drawImage(sprites.shadow, it.p.sx - size/2, it.p.sy - size*cam.flatten/2 + 2, size, size * cam.flatten);
      ctx.globalAlpha = 1;
    }

    function drawTreeShadow(it) {
      const t = it.o, s = (1.4 + t.scale) * scale * 1.5;
      ctx.globalAlpha = 0.9;
      ctx.drawImage(sprites.shadow, it.p.sx - s/2, it.p.sy - s*cam.flatten/2 + 2, s, s * cam.flatten);
      ctx.globalAlpha = 1;
    }

    function energyScale(b) { return clamp(b.energy / 100, 0.25, 1); }
    function ageBaby(b) { return clamp((sim.time - b.bornAt) / 6, 0.55, 1); } // babies start small

    function hopHeight(b, v) {
      const sp = Math.hypot(b.vx, b.vy);
      if (b.state === 'eat' || b.state === 'rest') return 0.02;
      const amp = clamp(sp / (b.kind === 'blue' ? sim.config.blueSpeed : sim.config.redSpeed), 0, 1);
      return Math.max(0, Math.sin(v.hop)) * amp * 0.5;
    }

    function drawBlob(it, now) {
      const b = it.o, v = it.v;
      const sp = Math.hypot(b.vx, b.vy);
      const baseR = (0.72 + energyScale(b) * 0.42) * ageBaby(b) * scale;
      const z = hopHeight(b, v);
      const p = project(b.x, b.y, z);

      // squash & stretch: stretch along motion, squash on landing
      let stretch = 1 + clamp(sp * 0.06, 0, 0.16);
      let squash = 1 / stretch;
      if (b.state === 'eat') { // chew pulse
        const pulse = 0.5 + 0.5 * Math.sin(now * 12);
        stretch = 1 - pulse * 0.12; squash = 1 + pulse * 0.12;
      }
      // lean toward velocity direction (screen space)
      const vscr = project(b.x + b.vx, b.y + b.vy, 0);
      let lean = Math.atan2(vscr.sx - it.p.sx, -(vscr.sy - it.p.sy)) * 0.14 * clamp(sp, 0, 1.4);

      const spr = sprites.blob[b.kind === 'blue' ? 'blue' : 'red'];
      const w = baseR * 2.2 * stretch, h = baseR * 2.2 * squash;

      // selection / hover ring under the blob
      const isSel = b.id === state.selectedId, isHov = b.id === state.hoverId;
      if (isSel || isHov) {
        ctx.beginPath();
        ctx.ellipse(it.p.sx, it.p.sy + 2, baseR * 1.5, baseR * 1.5 * cam.flatten, 0, 0, TAU);
        ctx.strokeStyle = isSel ? (theme==='light'?'#1c9560':'#8fe0a8') : 'rgba(255,255,255,.4)';
        ctx.lineWidth = isSel ? 2.4 : 1.6; ctx.stroke();
      }

      // contact/eat glow
      const sinceContact = sim.time - (b.lastContact ?? -99);
      const sinceEat = sim.time - (b.lastEat ?? -99);
      if (b.kind === 'red' && sinceContact < 0.6) {
        const gl = (1 - sinceContact / 0.6);
        ctx.save(); ctx.globalAlpha = gl * 0.6;
        const gg = ctx.createRadialGradient(p.sx, p.sy, 1, p.sx, p.sy, baseR * 3);
        gg.addColorStop(0, 'rgba(255,150,140,.9)'); gg.addColorStop(1, 'rgba(255,150,140,0)');
        ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(p.sx, p.sy, baseR * 3, 0, TAU); ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(p.sx, p.sy - baseR * 0.1);
      ctx.rotate(lean);
      ctx.drawImage(spr, -w/2, -h/2 - baseR*0.1, w, h);
      ctx.restore();

      // face
      drawFace(b, v, p, baseR, lean, now, sp);

      // eating fruit shrinking near mouth
      if (b.state === 'eat') {
        const frac = clamp(b.stateTimer / sim.config.blueEatTime, 0, 1);
        const fs = baseR * 0.7 * frac;
        ctx.drawImage(sprites.fruit, p.sx + baseR*0.4, p.sy - baseR*0.1, fs, fs);
      }

      screenPos.push({ id: b.id, sx: p.sx, sy: p.sy - baseR*0.4, r: Math.max(12, baseR * 1.5) });
    }

    function drawFace(b, v, p, r, lean, now, sp) {
      // blink timer
      v.blinkT -= 0.016;
      if (v.blinkT <= 0) { v.blink = 0.14; v.blinkT = 1.6 + (Math.abs(hash(b.id + Math.floor(now))) % 30) / 10; }
      if (v.blink > 0) v.blink -= 0.016;
      const blinking = v.blink > 0;

      // look direction: toward velocity, eased
      const vscr = project(b.x + b.vx * 3, b.y + b.vy * 3, 0);
      const tx = clamp((vscr.sx - p.sx) * 0.02, -1, 1);
      const ty = clamp((vscr.sy - p.sy) * 0.02, -1, 1);
      v.lookx = lerp(v.lookx, tx, 0.2); v.looky = lerp(v.looky, ty, 0.2);

      const eyeDx = r * 0.34, eyeY = p.sy - r * 0.5, eyeR = r * 0.2;
      const scared = b.state === 'flee';
      ctx.save();
      ctx.translate(p.sx, 0); ctx.rotate(0);
      for (const side of [-1, 1]) {
        const ex = side * eyeDx;
        // white
        ctx.beginPath();
        const h = blinking ? eyeR * 0.18 : eyeR * (scared ? 1.25 : 1);
        ctx.ellipse(ex, eyeY, eyeR * (scared ? 1.05 : 0.92), h, 0, 0, TAU);
        ctx.fillStyle = '#fbfbf5'; ctx.fill();
        if (!blinking) {
          ctx.beginPath();
          ctx.arc(ex + v.lookx * eyeR * 0.5, eyeY + v.looky * eyeR * 0.5, eyeR * 0.5, 0, TAU);
          ctx.fillStyle = '#20201c'; ctx.fill();
          // catchlight
          ctx.beginPath(); ctx.arc(ex + v.lookx*eyeR*0.5 - eyeR*0.16, eyeY + v.looky*eyeR*0.5 - eyeR*0.16, eyeR*0.14, 0, TAU);
          ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
        }
      }
      // mouth
      const my = p.sy - r * 0.14;
      ctx.strokeStyle = 'rgba(30,28,24,.72)'; ctx.lineWidth = Math.max(1, r * 0.09); ctx.lineCap = 'round';
      ctx.beginPath();
      if (b.state === 'eat') {
        const o = 0.5 + 0.5 * Math.sin(now * 12);
        ctx.ellipse(0, my, r * 0.16, r * 0.1 + o * r * 0.12, 0, 0, TAU);
        ctx.fillStyle = 'rgba(90,40,40,.6)'; ctx.fill();
      } else if (scared) {
        ctx.ellipse(0, my + r*0.04, r * 0.12, r * 0.1, 0, 0, TAU); ctx.stroke();
      } else {
        const smile = sp > 0.3 ? 0.5 : 0.28;
        ctx.arc(0, my - r*0.05, r * 0.24, (0.5 - smile*0.5) * Math.PI, (0.5 + smile*0.5) * Math.PI);
        ctx.stroke();
      }
      ctx.restore();
    }

    function drawTree(it, now) {
      const t = it.o, p = it.p;
      const s = (1.5 + t.scale) * scale;
      const sway = Math.sin(now * 0.9 + t.sway) * 0.04;
      // trunk
      const th = s * 0.55, tw = s * 0.16;
      const tg = ctx.createLinearGradient(p.sx - tw, 0, p.sx + tw, 0);
      tg.addColorStop(0, theme==='light'?'#7a5a38':'#4b3826'); tg.addColorStop(0.5, theme==='light'?'#9c7748':'#6b4f34');
      tg.addColorStop(1, theme==='light'?'#6a4c2e':'#3a2a1b');
      ctx.save();
      ctx.translate(p.sx, p.sy); ctx.rotate(sway);
      ctx.beginPath();
      ctx.moveTo(-tw*0.6, 0); ctx.lineTo(-tw*0.4, -th); ctx.lineTo(tw*0.4, -th); ctx.lineTo(tw*0.6, 0);
      ctx.closePath(); ctx.fillStyle = tg; ctx.fill();
      // canopy
      const cw = s * 1.7;
      ctx.drawImage(sprites.canopy, -cw/2, -th - cw*0.62, cw, cw);
      // fruit dots attached to canopy
      const n = Math.round(t.fruit);
      const cap = sim.config.fruitCap;
      const slots = fruitSlots(t.id, Math.max(cap, 1));
      for (let i = 0; i < n && i < slots.length; i++) {
        const [fx, fy] = slots[i];
        const fr = s * 0.26;
        // pop-in when freshly grown
        ctx.drawImage(sprites.fruit, -cw*0.5 + fx*cw - fr/2, -th - cw*0.62 + fy*cw - fr/2, fr, fr);
      }
      ctx.restore();
    }

    // deterministic fruit positions around the canopy per tree
    const slotCache = new Map();
    function fruitSlots(id, cap) {
      const key = id + ':' + cap;
      if (slotCache.has(key)) return slotCache.get(key);
      const arr = [];
      let seed = id * 2654435761 >>> 0;
      const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < cap; i++) {
        const a = rnd() * TAU, rr = 0.18 + rnd() * 0.26;
        arr.push([0.5 + Math.cos(a) * rr, 0.42 + Math.sin(a) * rr * 0.9]);
      }
      slotCache.set(key, arr);
      return arr;
    }

    /* ------------------------------------------------------------ particles */
    function spawnParticles(events) {
      for (const e of events) {
        const p = project(e.x, e.y, 0.3);
        if (e.type === 'eat') {
          for (let i = 0; i < 5; i++) part(p.sx, p.sy, 'spark', '#bff08a');
        } else if (e.type === 'contact') {
          for (let i = 0; i < 8; i++) part(p.sx, p.sy, 'spark', '#ffd8a0');
        } else if (e.type === 'birth') {
          for (let i = 0; i < 6; i++) part(p.sx, p.sy, 'ring', e.kind === 'blue' ? '#8fd0ff' : '#ffb0a8');
        } else if (e.type === 'death') {
          for (let i = 0; i < 5; i++) part(p.sx, p.sy, 'puff', 'rgba(150,150,140,.5)');
        }
      }
    }
    function part(x, y, type, color) {
      const a = Math.random() * TAU, sp = 20 + Math.random() * 55;
      particles.push({ x, y, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp - 25, life: 0, max: 0.5 + Math.random()*0.4, type, color, r: 3 + Math.random()*4 });
    }
    function drawParticles(now, dt) {
      dt = clamp(dt, 0, 0.05);
      for (const q of particles) {
        q.life += dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 90 * dt; q.vx *= 0.94;
        const t = q.life / q.max, a = clamp(1 - t, 0, 1);
        ctx.globalAlpha = a;
        if (q.type === 'spark') {
          ctx.drawImage(sprites.spark, q.x - q.r, q.y - q.r, q.r*2, q.r*2);
        } else if (q.type === 'ring') {
          ctx.strokeStyle = q.color; ctx.lineWidth = 2; ctx.beginPath();
          ctx.arc(q.x, q.y, q.r + t * 10, 0, TAU); ctx.stroke();
        } else {
          ctx.fillStyle = q.color; ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (1 + t), 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      particles = particles.filter((q) => q.life < q.max);
      if (particles.length > 400) particles.splice(0, particles.length - 400);
    }

    /* ------------------------------------------------------------ hit test */
    function hitTest(px, py) {
      let best = null, bd = Infinity;
      for (const s of screenPos) {
        const d = (s.sx - px) ** 2 + (s.sy - py) ** 2;
        if (d < s.r * s.r && d < bd) { bd = d; best = s.id; }
      }
      return best;
    }

    function pruneVis(now) {
      if (vis.size < 1200) return;
      for (const [id, v] of vis) if (now - v.seen > 1) vis.delete(id);
    }

    const state = { selectedId: null, hoverId: null };

    function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return n | 0; }

    setTheme('dark');
    resize();

    return {
      cam, state,
      resize, recomputeScale, setTheme,
      draw(now, dt) { draw(now, dt); pruneVis(now); },
      spawnParticles, hitTest,
      project,
    };
  }

  global.GardenRenderer = { createRenderer };
})(typeof window !== 'undefined' ? window : globalThis);
