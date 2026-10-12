/* Lumail launch film: 45s, 1920x1080, deterministic. renderFrame(t) draws any instant. */
(() => {
'use strict';

const DUR = 45;
const ACC = '#ff3300';
const HALF = 0.35; // half duration of the scene wipe (s)
const CODE_CPS = 58;
const LPATH = 'M147 97H208V350H366V412H147Z'; // the "L" from the Lumail icon (512 grid)

const THEMES = {
  light: { bg: '#f8f7f4', ink: '#1a1614', muted: '#5f5853', line: '#e6e1da', card: '#ffffff' },
  wash:  { bg: '#fbeee7', ink: '#1a1614', muted: '#6b5d55', line: '#efd3c6', card: '#ffffff' },
  dark:  { bg: '#08090a', ink: '#f7f8f8', muted: '#8a8f98', line: '#ffffff1c', card: '#17181b' },
};

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  out2: t => 1 - (1 - t) ** 2,
  out3: t => 1 - (1 - t) ** 3,
  out4: t => 1 - (1 - t) ** 4,
  inOut2: t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  inOut3: t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
};
// Damped spring 0 -> 1 (unit mass). Overshoots when damping is low.
function spring(t, k = 260, c = 22) {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(k), z = c / (2 * w0);
  if (z >= 1) return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
  const wd = w0 * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w0 * t) * (Math.cos(wd * t) + (z * w0 / wd) * Math.sin(wd * t));
}
const sp = (lt, d, k = 260, c = 22) => spring(lt - d, k, c);
const fmt = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const $ = (r, s) => r.querySelector(s);
const $$ = (r, s) => Array.from(r.querySelectorAll(s));

/* ---------- icons (Phosphor fill, loaded from node_modules) ---------- */
const ICON_NAMES = ['sparkle', 'envelope-simple', 'lightning', 'clock', 'newspaper', 'code', 'terminal',
  'robot', 'at', 'arrow-right', 'check-circle', 'tray', 'infinity', 'app-window'];
const ICONS = {};
async function loadIcons() {
  await Promise.all(ICON_NAMES.map(async n => {
    const txt = await (await fetch(`/node_modules/@phosphor-icons/core/assets/fill/${n}-fill.svg`)).text();
    ICONS[n] = txt.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  }));
  // The "fill" infinity is an app-tile glyph; use the bold glyph for a plain symbol.
  const inf = await (await fetch('/node_modules/@phosphor-icons/core/assets/bold/infinity-bold.svg')).text();
  ICONS.infinity = inf.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}
const icon = (n, style = 'width:100%;height:100%') =>
  `<svg viewBox="0 0 256 256" style="fill:currentColor;${style}">${ICONS[n] || ''}</svg>`;

/* ---------- brand builders ---------- */
function tileHTML(size, uid) {
  const r = Math.round(size * 0.22);
  return `<div class="abs" data-tile style="left:0;top:0;width:${size}px;height:${size}px;border-radius:${r}px;
      background:linear-gradient(180deg,#ff3b1f 0%,#e8442f 100%);
      box-shadow:0 ${size * 0.14}px ${size * 0.28}px -${size * 0.1}px rgba(255,51,0,.6),inset 0 2px 0 rgba(255,255,255,.28)">
    <svg viewBox="0 0 512 512" style="position:absolute;left:0;top:0;width:${size}px;height:${size}px;overflow:visible">
      <defs><linearGradient id="${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#f6d6cd"/></linearGradient></defs>
      <path data-lfill d="${LPATH}" fill="url(#${uid})" style="opacity:0"/>
      <path data-lline d="${LPATH}" pathLength="100" fill="none" stroke="#fff" stroke-width="10" stroke-linejoin="round" stroke-dasharray="100" stroke-dashoffset="100"/>
    </svg></div>`;
}
function wordHTML(fs) {
  const letters = 'Lumail'.split('').map(c =>
    `<span class="ch-wrap"><span class="ch" style="transform:translateY(110%)">${c}</span></span>`).join('');
  return `<div class="abs brand" data-wm style="left:0;top:0;font-size:${fs}px;line-height:1.25;font-weight:600;letter-spacing:-0.034em;color:var(--ink);white-space:nowrap">${letters}</div>`;
}
function lockupHTML(uid, size, fs, gap) {
  return `<div class="abs" data-lock style="left:0;top:0;width:${size + gap + 800}px;height:${size}px">
    ${tileHTML(size, uid)}
    <div style="position:absolute;left:${size + gap}px;top:${(size - fs * 1.25) / 2}px">${wordHTML(fs)}</div>
  </div>`;
}
// Animates the L trace + tile pop + letter rise. Returns a function (lt, p) for the lockup.
function lockupAnim(root, pop) {
  const tile = $(root, '[data-tile]');
  const lline = $(root, '[data-lline]');
  const lfill = $(root, '[data-lfill]');
  const letters = $$(root, '.ch');
  return (lt) => {
    const tp = sp(lt, pop, 230, 17);
    tile.style.transform = `scale(${Math.max(0, tp)}) rotate(${(1 - tp) * -100}deg)`;
    lline.style.strokeDashoffset = 100 - 100 * E.inOut3(seg(lt, pop + 0.35, pop + 1.25));
    lfill.style.opacity = E.out3(seg(lt, pop + 1.0, pop + 1.5));
    letters.forEach((c, i) => {
      const p = sp(lt, pop + 1.9 + i * 0.065, 320, 26);
      c.style.transform = `translateY(${(1 - p) * 110}%)`;
    });
  };
}

/* ---------- scenes ---------- */
const SCENES = [];
const scene = cfg => SCENES.push(cfg);

// 01 — Brand reveal (0 → 4)
scene({
  start: 0, dur: 4, theme: 'light', caption: '01 / Brand', corner: false,
  build(root) {
    root.innerHTML = `
      ${lockupHTML('lgS1', 300, 230, 36)}
      <div class="abs mono" data-tag style="font-size:26px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);white-space:nowrap">AI-native email platform</div>`;
    const lock = $(root, '[data-lock]');
    const wm = $(root, '[data-wm]');
    const tag = $(root, '[data-tag]');
    // Rings live inside the lockup so they follow the tile across the slide.
    lock.insertAdjacentHTML('afterbegin', [0, 1, 2].map(() =>
      `<div class="abs" data-ring style="left:0;top:0;width:300px;height:300px;border-radius:50%;border:3px solid ${ACC};box-sizing:border-box;opacity:0"></div>`).join(''));
    const rings = $$(lock, '[data-ring]');
    const wmW = wm.getBoundingClientRect().width;
    const finalLeft = (1920 - (336 + wmW)) / 2;
    lock.style.top = '390px';
    lock.style.left = '810px';
    lock.style.width = (336 + wmW) + 'px';
    tag.style.left = (336 + 6) + 'px';
    tag.style.top = (390 + 262) + 'px';
    const anim = lockupAnim(root, 0.1);
    return (lt) => {
      anim(lt);
      rings.forEach((r, i) => {
        const p = seg(lt, 1.35 + i * 0.22, 2.7 + i * 0.22);
        r.style.opacity = p > 0 && p < 1 ? (1 - p) * 0.85 : 0;
        r.style.transform = `scale(${lerp(0.6, 2.2, E.out3(p))})`;
      });
      const x = lerp(810, finalLeft, E.inOut3(seg(lt, 2.15, 3.05)));
      lock.style.left = x + 'px';
      tag.style.left = (x + 342) + 'px';
      const ct = E.out3(seg(lt, 3.1, 3.8));
      tag.style.clipPath = `inset(0 ${(1 - ct) * 100}% 0 0)`;
      tag.style.opacity = clamp(lt / 3.2);
    };
  },
});

// 02 — Positioning headline (4 → 9)
scene({
  start: 4, dur: 5, theme: 'light', caption: '02 / Positioning', corner: true,
  build(root) {
    root.innerHTML = `
      <div class="abs" data-h1 style="left:0;top:262px;width:1920px;text-align:center">
        <div class="h" style="font-size:150px;line-height:1.08">
          <div style="height:162px"><span class="wd" data-w data-d="0.15">The</span> <span class="chip" data-w data-c data-d="0.3">${icon('sparkle', 'width:.72em;height:.72em;flex:none')}<span>AI Tool</span></span> <span class="wd" data-w data-d="0.42">that</span></div>
          <div style="height:162px"><span class="wd" data-w data-d="0.85">will</span> <span class="wd" data-w data-d="0.95">make</span> <span class="wd" data-w data-d="1.05">you</span> <span class="wd" data-w data-d="1.15">love</span></div>
          <div style="height:162px"><span class="chip" data-w data-c data-d="1.45">${icon('envelope-simple', 'width:.72em;height:.72em;flex:none')}<span>e-mail</span></span> <span class="wd accent" data-w data-d="1.6">marketing</span></div>
        </div>
      </div>
      <div class="abs" data-sub style="left:560px;width:800px;top:800px;text-align:center;font-size:44px;line-height:1.4;color:var(--muted);letter-spacing:-0.01em">You'll actually like sending emails. And you'll make more money. That's the deal.</div>`;
    const h1 = $(root, '[data-h1]');
    const sub = $(root, '[data-sub]');
    const words = $$(root, '[data-w]');
    const mk = words[words.length - 1];
    const base = h1.getBoundingClientRect();
    const mr = mk.getBoundingClientRect();
    const x0 = mr.left - base.left, w = mr.width, y0 = mr.bottom - base.top - 4;
    const sw = document.createElement('div');
    sw.innerHTML = `<svg class="abs" style="left:${x0}px;top:${y0}px;width:${w}px;height:40px;overflow:visible" viewBox="0 0 ${w} 40">
      <path data-sw d="M0 16 Q ${w * 0.5} 44 ${w} 10" pathLength="100" fill="none" stroke="${ACC}" stroke-width="9" stroke-linecap="round" stroke-dasharray="100" stroke-dashoffset="100"/></svg>`;
    h1.appendChild(sw.firstElementChild);
    const swoosh = $(root, '[data-sw]');
    const spots = [[246, 236], [1566, 226], [226, 640], [1706, 540]];
    spots.forEach(([x, y], i) => {
      const d = document.createElement('div');
      d.className = 'abs';
      d.dataset.sp = i;
      d.style.cssText = `left:${x}px;top:${y}px;width:64px;height:64px;color:${ACC};opacity:0`;
      d.innerHTML = icon('sparkle');
      root.appendChild(d);
    });
    const sparks = $$(root, '[data-sp]');
    return (lt) => {
      words.forEach(n => {
        const p = sp(lt, +n.dataset.d, 320, 24);
        if (n.dataset.c !== undefined) {
          n.style.opacity = clamp(p * 2);
          n.style.transform = `scale(${lerp(0.5, 1, p)}) rotate(${(1 - p) * -8}deg)`;
        } else {
          n.style.opacity = clamp(p * 1.6);
          n.style.transform = `translateY(${(1 - p) * 40}px)`;
        }
      });
      swoosh.style.strokeDashoffset = 100 - 100 * E.inOut3(seg(lt, 2.0, 2.7));
      sparks.forEach((s, i) => {
        const p = sp(lt, 2.7 + i * 0.12, 300, 14);
        s.style.opacity = clamp(p * 2);
        s.style.transform = `translate(-50%,-50%) scale(${Math.max(0, p)}) rotate(${lt * 40 + i * 90}deg)`;
      });
      const sIn = E.out3(seg(lt, 2.4, 3.2));
      const ex = E.inOut3(seg(lt, 4.25, 4.85));
      h1.style.opacity = 1 - ex;
      h1.style.transform = `translateY(${-ex * 60}px)`;
      sub.style.opacity = sIn * (1 - ex);
      sub.style.transform = `translateY(${(1 - sIn) * 30 - ex * 40}px)`;
    };
  },
});

// 03 — Dark pricing: subscribers never billed (9 → 15.5)
scene({
  start: 9, dur: 6.5, theme: 'dark', caption: '03 / Pricing', corner: true,
  build(root) {
    root.innerHTML = `
      <div class="abs" style="left:160px;top:190px">
        <div class="mask" style="padding:.08em 0 .16em;margin:-.08em 0 -.16em"><div class="h" data-l style="font-size:100px;line-height:1.08">You pay for emails sent.</div></div>
        <div class="mask" style="padding:.08em 0 .16em;margin:-.08em 0 -.16em"><div class="h" data-l style="font-size:100px;line-height:1.08"><span class="accent">Never</span> for subscribers stored.</div></div>
      </div>
      <div class="abs mono" data-lbl style="left:160px;top:560px;font-size:24px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase">Subscribers stored</div>
      <div class="abs h" data-num style="left:150px;top:600px;font-size:200px;line-height:1">0</div>
      <div class="abs h" data-zero style="left:160px;top:820px;font-size:120px;line-height:1;color:var(--accent)">$0</div>
      <div class="abs" data-zcap style="left:470px;top:872px;font-size:34px;line-height:1.3;color:var(--muted)">billed for subscribers stored</div>
      <div class="abs" data-dots style="left:1120px;top:470px;width:640px;height:520px"></div>`;
    const lines = $$(root, '[data-l]');
    const num = $(root, '[data-num]');
    const zero = $(root, '[data-zero]');
    const zcap = $(root, '[data-zcap]');
    const lbl = $(root, '[data-lbl]');
    const host = $(root, '[data-dots]');
    const COLS = 22, ROWS = 18;
    const dots = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const d = document.createElement('div');
      const x = (c / (COLS - 1)) * 620 + 10, y = (r / (ROWS - 1)) * 500 + 10;
      d.className = 'abs';
      d.style.cssText = `left:${x - 4.5}px;top:${y - 4.5}px;width:9px;height:9px;border-radius:50%;background:#2a2b30`;
      host.appendChild(d);
      const dist = Math.min(1, Math.hypot(c / (COLS - 1) - 0.5, r / (ROWS - 1) - 0.5) * 1.5);
      dots.push({ d, c, r, dist });
    }
    return (lt) => {
      lines.forEach((l, i) => {
        const p = sp(lt, 0.1 + i * 0.25, 260, 26);
        l.style.transform = `translateY(${(1 - p) * 110}%)`;
      });
      lbl.style.opacity = clamp(lt / 0.6);
      num.textContent = fmt(50000 * E.out4(seg(lt, 1.0, 3.3)));
      num.style.opacity = clamp(lt / 0.5);
      for (const o of dots) {
        const intro = sp(lt, 0.3 + o.dist * 0.9, 240, 18);
        const wave = 0.5 + 0.5 * Math.sin(lt * 3.2 - (o.c * 0.45 + o.r * 0.3));
        const hi = clamp((wave - 0.78) * 4.5) * clamp((lt - 2.0) * 2);
        o.d.style.transform = `scale(${Math.max(0, intro) * (1 + hi * 0.6)})`;
        o.d.style.background = hi > 0.02 ? `rgba(255,51,0,${0.3 + 0.7 * hi})` : '#2a2b30';
      }
      const z = E.out3(seg(lt, 3.4, 3.9));
      zero.style.opacity = z;
      zero.style.transform = `translateY(${(1 - z) * 40}px)`;
      zcap.style.opacity = E.out3(seg(lt, 3.8, 4.4));
    };
  },
});

// 04 — Workflows (15.5 → 21)
scene({
  start: 15.5, dur: 5.5, theme: 'light', caption: '04 / Workflows', corner: true,
  build(root) {
    const node = (x, ic, title, sub, label, d, hl) => `
      <div class="abs card" data-node data-d="${d}" style="left:${x}px;top:640px;width:320px;height:190px;box-sizing:border-box;padding:28px;${hl ? `border:2px solid ${ACC}` : ''}">
        <div class="tile" style="position:absolute;left:28px;top:28px;width:64px;height:64px;border-radius:18px">${icon(ic, 'width:34px;height:34px;fill:currentColor')}</div>
        <div class="h" style="position:absolute;left:28px;top:112px;font-size:34px;font-weight:600;letter-spacing:-0.02em">${title}</div>
        <div class="mono" style="position:absolute;left:28px;top:156px;font-size:22px;color:var(--muted)">${sub}</div>
      </div>
      <div class="abs mono" data-nlbl data-d="${d + 0.3}" style="left:${x}px;top:858px;font-size:20px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase;white-space:nowrap">${label}</div>`;
    root.innerHTML = `
      <div class="abs" style="left:160px;top:190px">
        <div class="mask" style="padding:.08em 0 .16em;margin:-.08em 0 -.16em"><div class="h" data-l style="font-size:112px;line-height:1.05">Workflows,</div></div>
        <div class="mask" style="padding:.08em 0 .16em;margin:-.08em 0 -.16em"><div class="h" data-l style="font-size:112px;line-height:1.05">on <span class="accent">autopilot.</span></div></div>
      </div>
      <div class="abs" data-sub style="left:160px;top:470px;width:820px;font-size:36px;line-height:1.4;color:var(--muted)">Triggers, delays and branches in one visual editor. Unlimited on every plan.</div>
      <div class="abs" data-cn style="left:480px;top:733px;width:100px;height:4px;background:#d3cbc1;transform-origin:0 50%"></div>
      <div class="abs" data-cn style="left:900px;top:733px;width:100px;height:4px;background:#d3cbc1;transform-origin:0 50%"></div>
      <div class="abs" data-cn style="left:1320px;top:733px;width:100px;height:4px;background:#d3cbc1;transform-origin:0 50%"></div>
      <div class="abs" data-pl style="left:0;top:0;width:18px;height:18px;border-radius:50%;background:${ACC};box-shadow:0 0 0 6px rgba(255,51,0,.14);opacity:0"></div>
      <div class="abs" data-pl style="left:0;top:0;width:18px;height:18px;border-radius:50%;background:${ACC};box-shadow:0 0 0 6px rgba(255,51,0,.14);opacity:0"></div>
      <div class="abs" data-pl style="left:0;top:0;width:18px;height:18px;border-radius:50%;background:${ACC};box-shadow:0 0 0 6px rgba(255,51,0,.14);opacity:0"></div>
      ${node(160, 'lightning', 'Signup', 'tag: trial', 'Trigger', 0.55)}
      ${node(580, 'clock', 'Wait', '2 days', 'Delay', 0.85)}
      ${node(1000, 'envelope-simple', 'Send email', 'welcome', 'Action', 1.15, true)}
      ${node(1420, 'newspaper', 'Newsletter', 'trial users', 'Campaign', 1.45)}`;
    const sub = $(root, '[data-sub]');
    const lines = $$(root, '[data-l]');
    const nodes = $$(root, '[data-node]');
    const nlbls = $$(root, '[data-nlbl]');
    const cns = $$(root, '[data-cn]');
    const pls = $$(root, '[data-pl]');
    const pulseX = [[480, 580], [900, 1000], [1320, 1420]];
    return (lt) => {
      lines.forEach((l, i) => {
        const p = sp(lt, i * 0.2, 260, 26);
        l.style.transform = `translateY(${(1 - p) * 110}%)`;
      });
      sub.style.opacity = E.out3(seg(lt, 0.5, 1.2));
      nodes.forEach(n => {
        const d = +n.dataset.d;
        const p = sp(lt, d, 300, 20);
        n.style.opacity = clamp(p * 2);
        n.style.transform = `translateY(${(1 - p) * 60}px) scale(${lerp(0.8, 1, p)})`;
      });
      nlbls.forEach((n, i) => { n.style.opacity = E.out3(seg(lt, +n.dataset.d, +n.dataset.d + 0.6)); });
      cns.forEach((c, i) => {
        const p = E.inOut3(seg(lt, 1.0 + i * 0.3, 1.35 + i * 0.3));
        c.style.transform = `scaleX(${p})`;
      });
      pls.forEach((pl, i) => {
        const start = 2.3 + i * 0.5;
        const q = lt - start;
        const cyc = q > 0 ? (q % 2.2) / 0.85 : 9;
        if (cyc <= 1) {
          const [x0, x1] = pulseX[i];
          const x = lerp(x0, x1, E.inOut2(cyc));
          pl.style.left = (x - 9) + 'px';
          pl.style.top = (735 - 9) + 'px';
          pl.style.opacity = Math.sin(Math.PI * cyc);
        } else pl.style.opacity = 0;
      });
    };
  },
});

// 05 — Developers & agents (21 → 27)
const CODE_LINES = [
  'const lumail = new Lumail({ apiKey });',
  '',
  'await lumail.subscribers.create({ email, tags: ["trial"] });',
  'await lumail.emails.send({',
  '  to: email,',
  '  subject: "Welcome",',
  '  transactional: true,',
  '});',
];
const TOK = { kw: '#ff7a52', str: '#ffc2ad', prop: '#ffffff', id: '#e9e4df', pu: '#8a8f98' };
function tokenize(line) {
  const out = [];
  const re = /("[^"]*")|\b(const|await|new|true)\b|([A-Za-z_]\w*)(?=\s*:)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let m;
  while ((m = re.exec(line))) {
    const cls = m[1] ? 'str' : m[2] ? 'kw' : m[3] ? 'prop' : m[4] ? 'id' : m[5] ? 'sp' : 'pu';
    out.push([m[0], cls]);
  }
  return out;
}
scene({
  start: 21, dur: 6, theme: 'light', caption: '05 / Developers', corner: true,
  build(root) {
    const chips = [['REST API', 'code'], ['TypeScript SDK', 'terminal'], ['CLI', 'lightning'], ['MCP server', 'robot'], ['SMTP relay', 'at']];
    const chipHTML = chips.map(([label, ic], i) => `
      <div class="abs card" data-chip data-d="${0.6 + i * 0.12}" style="left:1300px;top:${400 + i * 108}px;width:460px;height:84px;box-sizing:border-box;display:flex;align-items:center;gap:22px;padding:0 24px;border-radius:24px">
        <div class="tile" style="width:46px;height:46px;border-radius:14px;flex:none">${icon(ic, 'width:24px;height:24px;fill:currentColor')}</div>
        <div style="font-size:34px;font-weight:500;letter-spacing:-0.02em;white-space:nowrap">${label}</div>
      </div>`).join('');
    let chars = [];
    const codeHTML = CODE_LINES.map(line => {
      if (!line) return '<div style="height:42px"></div>';
      return `<div style="height:42px;white-space:pre">${tokenize(line).map(([txt, cls]) =>
        Array.from(txt).map(ch => {
          const span = `<span data-ch style="color:${TOK[cls] || '#e9e4df'};visibility:hidden">${ch === '<' ? '&lt;' : ch}</span>`;
          chars.push(span);
          return span;
        }).join('')).join('')}</div>`;
    }).join('');
    root.innerHTML = `
      <div class="abs" style="left:160px;top:150px">
        <div class="mask" style="padding:.08em 0 .16em;margin:-.08em 0 -.16em"><div class="h" data-l style="font-size:104px;line-height:1.06">Built for developers</div></div>
        <div class="mask" style="padding:.08em 0 .16em;margin:-.08em 0 -.16em"><div class="h" data-l style="font-size:104px;line-height:1.06">and for <span class="accent">agents.</span></div></div>
      </div>
      <div class="abs" data-card style="left:160px;top:400px;width:1080px;height:500px;box-sizing:border-box;background:#1a1614;border-radius:28px;box-shadow:0 40px 80px -30px rgba(26,22,20,.5);overflow:hidden">
        <div style="position:absolute;left:40px;top:30px;display:flex;gap:10px">
          <span style="width:14px;height:14px;border-radius:50%;background:#ff633d"></span>
          <span style="width:14px;height:14px;border-radius:50%;background:#3d3631"></span>
          <span style="width:14px;height:14px;border-radius:50%;background:#3d3631"></span>
        </div>
        <div class="mono" style="position:absolute;left:112px;top:26px;font-size:20px;color:#8a8f98">lumail.ts</div>
        <div data-code class="mono" style="position:absolute;left:56px;top:104px;font-size:24px;line-height:42px;color:#e9e4df">${codeHTML}
          <div data-cursor style="position:absolute;width:12px;height:30px;background:${ACC};left:0;top:0"></div>
        </div>
        <div data-resp style="position:absolute;right:40px;bottom:34px;display:flex;align-items:center;gap:12px;padding:12px 22px;border-radius:999px;background:rgba(255,51,0,.16);color:#ffd2c2;font-size:22px;font-weight:500">
          <span style="width:26px;height:26px;color:${ACC};display:inline-flex">${icon('check-circle')}</span>queued · priority lane
        </div>
      </div>
      ${chipHTML}`;
    const ls = $$(root, '[data-l]');
    const cs = $$(root, '[data-chip]');
    const spans = $$(root, '[data-ch]');
    const cursor = $(root, '[data-cursor]');
    const resp = $(root, '[data-resp]');
    const codeEl = $(root, '[data-code]');
    const total = spans.length;
    return (lt) => {
      ls.forEach((l, i) => { const p = sp(lt, i * 0.18, 260, 26); l.style.transform = `translateY(${(1 - p) * 110}%)`; });
      cs.forEach((c, i) => {
        const p = sp(lt, +c.dataset.d, 280, 20);
        const fl = Math.sin(lt * 1.8 + i * 1.3) * 4;
        c.style.opacity = clamp(p * 2);
        c.style.transform = `translate(${(1 - p) * 90}px, ${fl * p}px)`;
      });
      const n = clamp(Math.floor((lt - 0.8) * CODE_CPS), 0, total);
      spans.forEach((s, i) => { s.style.visibility = i < n ? 'visible' : 'hidden'; });
      // cursor sits at next char (or after last)
      const idx = Math.min(n, total - 1);
      const sp0 = spans[idx];
      const ex = n >= total ? sp0.offsetLeft + sp0.offsetWidth : sp0.offsetLeft;
      const ey = sp0.offsetTop + 6;
      cursor.style.transform = `translate(${ex}px, ${ey}px)`;
      cursor.style.opacity = lt < 0.8 || n >= total + 1 ? 0 : (Math.floor(lt * 2) % 2 === 0 ? 1 : 0.15);
      const rp = sp(lt, 5.0, 320, 22);
      resp.style.opacity = clamp(rp * 2);
      resp.style.transform = `translateY(${(1 - rp) * 16}px)`;
      const ex2 = E.inOut3(seg(lt, 5.35, 5.95));
      root.style.opacity = 1 - ex2;
    };
  },
});

// 06 — Deliverability and transactional lanes (27 → 32.5)
scene({
  start: 27, dur: 5.5, theme: 'wash', caption: '06 / Deliverability', corner: true,
  build(root) {
    const pills = ['SPF', 'DKIM', 'DMARC'].map((p, i) => `
      <div class="card" data-pill data-d="${1.0 + i * 0.18}" style="display:flex;align-items:center;gap:14px;height:66px;padding:0 28px 0 22px;border-radius:999px;box-sizing:border-box">
        <span style="width:34px;height:34px;color:${ACC};display:inline-flex">${icon('check-circle')}</span>
        <span class="mono" style="font-size:26px;letter-spacing:.06em">${p}</span>
      </div>`).join('');
    const env = (lane, i, color) => `<div class="abs" data-env data-lane="${lane}" data-i="${i}" style="left:0;top:0;width:60px;height:60px;border-radius:17px;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 22px -12px rgba(26,22,20,.5)">${icon('envelope-simple', 'width:32px;height:32px;fill:currentColor')}</div>
      <div class="abs" data-trail data-lane="${lane}" data-i="${i}" style="left:0;top:0;width:170px;height:8px;border-radius:8px;background:linear-gradient(90deg,transparent,${color});opacity:0"></div>`;
    root.innerHTML = `
      <div class="abs" style="left:160px;top:150px">
        <div class="mask" style="padding:.08em 0 .16em;margin:-.08em 0 -.16em"><div class="h" data-l style="font-size:104px;line-height:1.06">Receipts and newsletters.</div></div>
        <div class="mask" style="padding:.08em 0 .16em;margin:-.08em 0 -.16em"><div class="h" data-l style="font-size:104px;line-height:1.06"><span class="accent">Same platform.</span></div></div>
      </div>
      <div class="abs" data-sub style="left:160px;top:398px;width:900px;font-size:34px;line-height:1.4;color:var(--muted)">Transactional mail gets its own instant lane. Guided SPF, DKIM and DMARC setup included.</div>
      <div class="abs" style="left:160px;top:506px;display:flex;gap:18px">${pills}</div>
      <div class="abs card" data-app style="left:160px;top:620px;width:220px;height:220px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px">
        <span style="width:84px;height:84px;color:${ACC};display:inline-flex">${icon('app-window')}</span>
        <span class="mono" style="font-size:22px;color:var(--muted)">YOUR APP</span>
      </div>
      <div class="abs card" data-inbox style="left:1540px;top:620px;width:220px;height:220px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px">
        <span style="width:84px;height:84px;color:${ACC};display:inline-flex">${icon('tray')}</span>
        <span class="mono" style="font-size:22px;color:var(--muted)">INBOX</span>
      </div>
      <div class="abs" data-badge style="left:1728px;top:596px;width:58px;height:58px;border-radius:50%;background:${ACC};color:#fff;font-size:26px;font-weight:600;display:flex;align-items:center;justify-content:center;opacity:0">0</div>
      <div class="abs" style="left:400px;top:712px;width:1120px;height:0;border-top:2px dashed ${ACC};opacity:.45"></div>
      <div class="abs" style="left:400px;top:800px;width:1120px;height:0;border-top:2px dashed #8a8f98;opacity:.6"></div>
      <div class="abs mono" style="left:420px;top:652px;font-size:20px;letter-spacing:.16em;color:${ACC}">TRANSACTIONAL · INSTANT</div>
      <div class="abs mono" style="left:420px;top:830px;font-size:20px;letter-spacing:.16em;color:var(--muted)">CAMPAIGNS · BULK</div>
      ${[0, 1, 2, 3].map(i => env('t', i, ACC)).join('')}
      ${[0, 1, 2, 3, 4, 5].map(i => env('c', i, '#1a1614')).join('')}`;
    const ls = $$(root, '[data-l]');
    const pl = $$(root, '[data-pill]');
    const sub = $(root, '[data-sub]');
    const envs = $$(root, '[data-env]');
    const trails = $$(root, '[data-trail]');
    const badge = $(root, '[data-badge]');
    const inbox = $(root, '[data-inbox]');
    const LANE = { t: { y: 712, start: 1.9, gap: 0.55, dur: 1.0, n: 4 }, c: { y: 800, start: 2.5, gap: 0.42, dur: 1.7, n: 6 } };
    const landings = [];
    for (const k of ['t', 'c']) for (let i = 0; i < LANE[k].n; i++) landings.push(LANE[k].start + i * LANE[k].gap + LANE[k].dur);
    landings.sort((a, b) => a - b);
    const X0 = 388, X1 = 1484;
    return (lt) => {
      ls.forEach((l, i) => { const p = sp(lt, i * 0.18, 260, 26); l.style.transform = `translateY(${(1 - p) * 110}%)`; });
      sub.style.opacity = E.out3(seg(lt, 0.6, 1.2));
      pl.forEach(n => {
        const p = sp(lt, +n.dataset.d, 300, 18);
        n.style.opacity = clamp(p * 2);
        n.style.transform = `translateY(${(1 - p) * 30}px)`;
      });
      envs.forEach(e => {
        const k = e.dataset.lane, i = +e.dataset.i, L = LANE[k];
        const tr = trails[envs.indexOf(e)];
        const s = L.start + i * L.gap;
        const p = seg(lt, s, s + L.dur);
        const x = lerp(X0, X1, E.inOut2(p));
        const vis = p > 0 && p < 1 ? 1 : 0;
        e.style.opacity = vis;
        e.style.transform = `translate(${x}px, ${L.y - 30}px) rotate(${-6 + 12 * E.inOut2(p)}deg)`;
        tr.style.opacity = vis * 0.7 * (1 - p * 0.3);
        tr.style.transform = `translate(${x - 150}px, ${L.y - 4}px)`;
      });
      const lastLand = landings.filter(t => t <= lt).pop();
      const count = landings.filter(t => t <= lt).length;
      if (count > 0) {
        badge.textContent = String(count);
        const bp = sp(lt - lastLand, 0, 420, 16);
        badge.style.opacity = 1;
        badge.style.transform = `scale(${Math.max(0, bp)})`;
        inbox.style.transform = `scale(${1 + 0.035 * Math.sin(Math.PI * clamp(lt - lastLand, 0, 0.3) / 0.3)})`;
      }
      const ex = E.inOut3(seg(lt, 4.95, 5.5));
      root.style.opacity = 1 - ex;
    };
  },
});

// 07 — Numbers (32.5 → 37.5)
scene({
  start: 32.5, dur: 5, theme: 'light', caption: '07 / Pricing', corner: true,
  build(root) {
    const rows = [
      { top: 250, num: 3000, desc: 'emails a month on Free. No card required.', d: 0.2, c0: 0.5, c1: 1.8 },
      { top: 480, num: 40000, desc: 'emails included in Creator for $20/month, then $0.70 per 1,000.', d: 0.8, c0: 1.1, c1: 2.6 },
      { top: 710, inf: true, desc: 'subscribers stored on every plan. Dormant contacts cost nothing.', d: 1.5 },
    ];
    root.innerHTML = `
      <div class="abs mono" style="left:160px;top:150px;font-size:24px;letter-spacing:.18em;color:var(--muted);text-transform:uppercase">Pricing · free to start</div>
      ${rows.map((r, i) => `
        <div class="abs" data-row="${i}" style="left:0;top:${r.top}px;width:1920px;height:200px">
          ${r.inf
            ? `<div class="abs" data-num style="left:156px;top:14px;width:200px;height:200px;color:${ACC}">${icon('infinity', 'width:100%;height:100%;fill:currentColor')}</div>`
            : `<div class="abs h" data-num style="left:150px;top:18px;font-size:200px;line-height:1">0</div>`}
          <div class="abs" data-desc style="left:1000px;top:58px;width:760px;font-size:44px;line-height:1.3;letter-spacing:-0.015em;color:var(--ink)">${r.desc}</div>
          <div class="abs" data-rule style="left:160px;top:200px;width:1600px;height:2px;background:var(--line);transform-origin:0 50%"></div>
        </div>`).join('')}`;
    const rowEls = $$(root, '[data-row]');
    return (lt) => {
      rows.forEach((r, i) => {
        const el = rowEls[i];
        const num = $(el, '[data-num]');
        const desc = $(el, '[data-desc]');
        const rule = $(el, '[data-rule]');
        const p = sp(lt, r.d, 260, 24);
        num.style.opacity = clamp(p * 2);
        num.style.transform = `translateX(${(1 - p) * -120}px)`;
        if (!r.inf) num.textContent = fmt(r.num * E.out4(seg(lt, r.c0, r.c1)));
        else num.style.transform += ` scale(${Math.max(0, sp(lt, r.d + 0.1, 220, 14))})`;
        const dp = E.out3(seg(lt, r.d + 0.35, r.d + 1.0));
        desc.style.opacity = dp;
        desc.style.transform = `translateY(${(1 - dp) * 24}px)`;
        rule.style.transform = `scaleX(${E.inOut3(seg(lt, r.d + 0.1, r.d + 0.9))})`;
      });
      const ex = E.inOut3(seg(lt, 4.55, 5.0));
      root.style.opacity = 1 - ex;
    };
  },
});

// 08 — Outro: lockup, line, CTA (37.5 → 45)
scene({
  start: 37.5, dur: 7.5, theme: 'light', caption: '08 / Start free', corner: false,
  build(root) {
    root.innerHTML = `
      <div class="abs" data-glow style="left:360px;top:40px;width:1200px;height:1000px;background:radial-gradient(circle at 50% 45%, rgba(255,51,0,.20), rgba(255,51,0,0) 62%)"></div>
      ${lockupHTML('lgS8', 230, 180, 36)}
      <div class="abs serif" data-tag style="left:0;width:1920px;top:452px;text-align:center;font-size:96px;line-height:1.1;letter-spacing:-0.01em;color:var(--ink);white-space:nowrap">You'll actually like <span class="accent" style="font-style:italic">sending emails.</span></div>
      <div class="abs" data-cta style="left:740px;top:628px;width:440px;height:104px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:18px;border-radius:22px;background:${ACC};color:#fff;font-size:40px;font-weight:600;letter-spacing:-0.02em;box-shadow:inset 0 1px 0 rgba(255,255,255,.35),0 9px 0 #c4320a,0 36px 60px -24px rgba(255,51,0,.6)">
        Start free <span style="width:36px;height:36px;display:inline-flex">${icon('arrow-right')}</span>
      </div>
      <div class="abs" data-ripple style="left:740px;top:628px;width:440px;height:104px;box-sizing:border-box;border-radius:22px;border:3px solid ${ACC};opacity:0"></div>
      <div class="abs mono" data-free style="left:0;width:1920px;top:800px;text-align:center;font-size:26px;letter-spacing:.16em;color:var(--muted);text-transform:uppercase">3,000 emails / month free · no card</div>
      <div class="abs brand" data-url style="left:0;width:1920px;top:892px;text-align:center;font-size:40px;font-weight:600;letter-spacing:-0.02em;color:var(--ink)">lumail.io</div>`;
    const lock = $(root, '[data-lock]');
    const wm = $(root, '[data-wm]');
    const wmW = wm.getBoundingClientRect().width;
    const lw = 230 + 36 + wmW;
    lock.style.left = ((1920 - lw) / 2) + 'px';
    lock.style.top = '150px';
    lock.style.width = lw + 'px';
    const anim = lockupAnim(root, 0.1);
    const tag = $(root, '[data-tag]');
    const cta = $(root, '[data-cta]');
    const ripple = $(root, '[data-ripple]');
    const free = $(root, '[data-free]');
    const url = $(root, '[data-url]');
    return (lt) => {
      anim(lt);
      tag.style.clipPath = `inset(0 ${(1 - E.out3(seg(lt, 1.6, 2.5))) * 100}% 0 0)`;
      const cp = sp(lt, 2.4, 300, 18);
      const press = Math.sin(Math.PI * seg(lt, 4.1, 4.3)) * 0.04;
      cta.style.opacity = clamp(cp * 2);
      cta.style.transform = `scale(${lerp(0.6, 1, cp) - press})`;
      const rp = seg(lt, 4.25, 4.95);
      ripple.style.opacity = rp > 0 && rp < 1 ? (1 - rp) * 0.8 : 0;
      ripple.style.transform = `scale(${lerp(1, 1.25, E.out3(rp))})`;
      free.style.opacity = E.out3(seg(lt, 3.0, 3.7));
      url.style.opacity = E.out3(seg(lt, 3.4, 4.0));
    };
  },
});

/* ---------- runtime ---------- */
const stage = document.getElementById('stage');
const corner = document.getElementById('corner');
const caption = document.getElementById('caption');
const progress = document.getElementById('progress');
const wipe = document.getElementById('wipe');
const wipe2 = document.getElementById('wipe2');
const hatchL = document.getElementById('hatchL');
const hatchR = document.getElementById('hatchR');
const BOUNDS = [];
let curIdx = -1;

function applyTheme(name) {
  const t = THEMES[name];
  for (const k in t) stage.style.setProperty('--' + k, t[k]);
  stage.style.setProperty('--accent', ACC);
}

// Red/ink diagonal wipe centred on every scene cut.
function bandX(tt) {
  let side = -2800;
  for (const b of BOUNDS) {
    if (tt < b - HALF) return side;
    if (tt <= b) return lerp(-2800, 0, E.inOut3(seg(tt, b - HALF, b)));
    if (tt <= b + HALF) return lerp(0, 2800, E.inOut3(seg(tt, b, b + HALF)));
    side = 2800;
  }
  return side;
}

function build() {
  const host = document.getElementById('scenes');
  SCENES.forEach(s => {
    const node = document.createElement('section');
    node.className = 'scene';
    node.style.display = 'block';
    host.appendChild(node);
    s.node = node;
    s.update = s.build(node);
    node.style.display = 'none';
  });
  BOUNDS.push(...SCENES.slice(1).map(s => s.start));
}

window.renderFrame = function (t) {
  let idx = 0;
  for (let i = 0; i < SCENES.length; i++) if (t >= SCENES[i].start - 1e-9) idx = i;
  const s = SCENES[idx];
  if (idx !== curIdx) {
    SCENES.forEach((x, i) => { x.node.style.display = i === idx ? 'block' : 'none'; });
    applyTheme(s.theme);
    caption.textContent = s.caption;
    curIdx = idx;
  }
  const lt = t - s.start;
  s.update(lt, t);
  corner.style.opacity = s.corner ? clamp(lt / 0.6) : 0;
  progress.style.width = (clamp(t / DUR) * 100) + '%';
  hatchL.style.backgroundPosition = `${t * 30}px ${t * -30}px`;
  hatchR.style.backgroundPosition = `${t * -30}px ${t * 30}px`;
  wipe.style.transform = `translateX(${bandX(t)}px) rotate(-7deg)`;
  wipe2.style.transform = `translateX(${bandX(t + 0.07)}px) rotate(-7deg)`;
};

window.ready = (async () => {
  await Promise.all([
    document.fonts.load('500 100px "Geist Variable"'),
    document.fonts.load('600 100px "Geist Variable"'),
    document.fonts.load('400 24px "Geist Mono Variable"'),
    document.fonts.load('600 100px "Plus Jakarta Sans Variable"'),
    document.fonts.load('400 96px "Instrument Serif"'),
    document.fonts.load('italic 400 96px "Instrument Serif"'),
    loadIcons(),
  ]);
  applyTheme('light');
  build();
  window.renderFrame(0);
})();

})();
