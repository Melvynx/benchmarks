/* ══════════════════════════════════════════════════════════════════════════
   ELYSIAN — machinery
   One rAF loop drives the scroll-linked pieces; pointer state is lerped so
   nothing snaps. Everything degrades to a legible, static page.
   ══════════════════════════════════════════════════════════════════════════ */

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ── 1. wire every image reference to a --src custom property ───────────── */
const IMG = (name) => `url("/img/${name}.webp")`;
$$('[data-frag]').forEach((el) => el.style.setProperty('--src', IMG(el.dataset.frag)));

/* ── 2. the hours ──────────────────────────────────────────────────────── */
const HOURS = ['matins', 'meridian', 'vespers'];
const hourBtns = $$('[data-hour-set]');

function setHour(h, remember = true) {
  if (!HOURS.includes(h)) return;
  root.dataset.hour = h;
  hourBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.hourSet === h)));
  $('meta[name=theme-color]')?.setAttribute(
    'content',
    h === 'meridian' ? '#ede4d3' : h === 'matins' ? '#0c2540' : '#07171d'
  );
  if (remember) { try { localStorage.setItem('elysian:hour', h); } catch {} }
  paintWorldAccent();
}
hourBtns.forEach((b) => b.addEventListener('click', () => setHour(b.dataset.hourSet)));

/* ── 3. starfield behind the threshold ─────────────────────────────────── */
(function stars() {
  const cv = $('#stars');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  let w = 0, h = 0, dots = [], raf = 0, visible = true;

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const r = cv.getBoundingClientRect();
    w = Math.max(1, r.width); h = Math.max(1, r.height);
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(clamp((w * h) / 5200, 40, 260));
    dots = Array.from({ length: n }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * 0.82,
      r: Math.random() * 1.25 + 0.25,
      p: Math.random() * Math.PI * 2,
      s: Math.random() * 0.9 + 0.25,
      warm: Math.random() > 0.78,
    }));
  }

  function frame(t) {
    ctx.clearRect(0, 0, w, h);
    for (const d of dots) {
      const tw = reduced.matches ? 0.7 : 0.45 + 0.55 * Math.abs(Math.sin(t / 1400 * d.s + d.p));
      ctx.globalAlpha = tw * 0.9;
      ctx.fillStyle = d.warm ? '#ffd9a1' : '#dff0f7';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, 6.284);
      ctx.fill();
      if (d.r > 1.1) {
        ctx.globalAlpha = tw * 0.14;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r * 4.2, 0, 6.284);
        ctx.fill();
      }
    }
    if (!reduced.matches && visible) raf = requestAnimationFrame(frame);
  }

  build();
  frame(0);
  addEventListener('resize', () => { build(); if (reduced.matches) frame(0); }, { passive: true });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible && !reduced.matches) raf = requestAnimationFrame(frame);
  }, { threshold: 0 }).observe(cv);
})();

/* ── 4. the louvers: a second world woven through the façade ────────────── */
const louverState = { focus: 0.5, target: 0.5, active: false, idle: 0 };
(function louvers() {
  const box = $('#louvers');
  if (!box) return;
  const N = 12;
  box.innerHTML = Array.from({ length: N }, (_, i) => `<i style="--i:${i}"></i>`).join('');
  const slats = $$('i', box);

  /* the band is wide and feathered so the blades open like a wave,
     each one caught at a different angle — never a flat rectangle. */
  louverState.paint = () => {
    for (let i = 0; i < N; i++) {
      const c = (i + 0.5) / N;
      const d = Math.abs(c - louverState.focus);
      const n = Math.pow(smooth(clamp(1 - d / 0.3)), 1.45) * 0.96;
      slats[i].style.setProperty('--near', n.toFixed(3));
    }
  };
  louverState.paint();
})();

/* ── 5. pointer field (parallax + louvers + apparition) ────────────────── */
const ptr = { x: 0.5, y: 0.5, ex: 0.5, ey: 0.5, px: 0, py: 0, epx: 0, epy: 0, fine: matchMedia('(hover: hover)').matches };

addEventListener('pointermove', (e) => {
  ptr.x = e.clientX / innerWidth;
  ptr.y = e.clientY / innerHeight;
  ptr.px = e.clientX;
  ptr.py = e.clientY;
  louverState.target = ptr.x;
  louverState.active = true;
  louverState.idle = 0;
}, { passive: true });

addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'mouse') {
    louverState.target = e.clientX / innerWidth;
    louverState.active = true;
    louverState.idle = 0;
  }
}, { passive: true });

const depthEls = $$('[data-depth]');

/* ── 6. marquees ───────────────────────────────────────────────────────── */
const marquees = $$('.marquee').map((m) => {
  const track = $('.marquee__track', m);
  track.append(...[...track.children].map((n) => n.cloneNode(true)));
  return {
    track,
    rev: m.classList.contains('marquee--rev'),
    speed: Number(m.dataset.speed || 50),
    x: 0,
    half: 0,
    measure() { this.half = track.scrollWidth / 2; },
  };
});
marquees.forEach((m) => m.measure());

/* ── 7. the horizontal catalogue rail ──────────────────────────────────── */
const platesEl = $('#plates');
const rail = $('#rail');
const plateEls = $$('.plate', rail);
const counter = $('#plateCounter');
const ROMAN = ['I', 'II', 'III', 'IV'];
const railData = { on: false, dist: 0, boxes: [], idx: -1 };
const RAIL_HOLD = 0.09;   /* share of the scroll span spent parked at each end */

function railIsHorizontal() {
  return innerWidth > 900 && !reduced.matches;
}

function layoutRail() {
  railData.on = railIsHorizontal();
  if (!railData.on) {
    platesEl.style.height = '';
    rail.style.transform = '';
    railData.dist = 0;
    return;
  }
  rail.style.transform = 'translate3d(0,0,0)';
  railData.dist = Math.max(0, rail.scrollWidth - innerWidth);
  railData.boxes = plateEls.map((p) => ({ c: p.offsetLeft + p.offsetWidth / 2 }));
  platesEl.style.height = `${Math.round(innerHeight + railData.dist * 1.22 / (1 - RAIL_HOLD * 2))}px`;
}

function setPlate(i) {
  if (i === railData.idx) return;
  railData.idx = i;
  if (counter) counter.textContent = `${ROMAN[i]} / IV`;
  const accent = plateEls[i]?.dataset.accent;
  if (accent) platesEl.style.setProperty('--accent', tune(accent));
}

/* keep accents readable when the house turns to paper */
function tune(hex) {
  return root.dataset.hour === 'meridian'
    ? `color-mix(in oklab, ${hex} 74%, #2b1204)`
    : hex;
}

/* ── 8. the aperture ───────────────────────────────────────────────────── */
const WORLDS = [
  {
    name: 'The Studio', accent: '#f0a12c',
    line: 'A room asked to hold four centuries at once. It agreed, reluctantly.',
    lat: '41°53′ N of nowhere', temp: '24 °C, indoors, forever',
    birds: 'None — they were asked to wait outside', avail: 'One, unless you insist',
  },
  {
    name: 'Mount Vellum', accent: '#ef6f5c',
    line: 'An eruption arranged for a Tuesday, and a chapter finished anyway.',
    lat: '38°42′ N, downwind', temp: '31 °C, ashfall light',
    birds: 'Two, unimpressed', avail: 'Reserved for a reader',
  },
  {
    name: 'The Night Portico', accent: '#e0aa4e',
    line: 'Twelve columns, one honest step, and an interior made of stars.',
    lat: '37°58′ N, after hours', temp: '17 °C, warm stone',
    birds: 'One, nocturnal, gossiping', avail: 'Open; ring twice',
  },
  {
    name: 'Saffron Basin', accent: '#4fa8c9',
    line: 'A valley built beneath a yellow that needed no excuse.',
    lat: '46°30′ N, upstream', temp: '11 °C, wind off the glacier',
    birds: 'Four hundred, at least', avail: 'Two, both damp',
  },
];

const dial = {
  rot: 0, target: 0, idx: -1, drag: false, last: 0, on: false,
  el: $('#oculus'), knob: $('#knob'), spin: $('#collarSpin'),
  slides: $$('.oculus__slide'), readout: $('#readout'),
};

(function aperture() {
  if (!dial.el) return;
  dial.on = true;

  /* tick marks around the collar */
  const ticks = $('#ticks');
  if (ticks) {
    let d = '';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2 - Math.PI / 2;
      const major = i % 18 === 0;
      /* the well edge sits at r=152; every mark stays outside it */
      const r1 = major ? 155 : 160, r2 = 167;
      d += `<line class="tick ${major ? 'tick--major' : ''}"
        x1="${(200 + Math.cos(a) * r1).toFixed(1)}" y1="${(200 + Math.sin(a) * r1).toFixed(1)}"
        x2="${(200 + Math.cos(a) * r2).toFixed(1)}" y2="${(200 + Math.sin(a) * r2).toFixed(1)}" />`;
    }
    ticks.innerHTML = d;
  }

  /* the four selectors under the readout */
  const dots = $('#roDots');
  if (dots) {
    dots.innerHTML = WORLDS.map((w, i) =>
      `<button type="button" role="tab" aria-selected="${i === 0}"
        aria-label="${w.name}" data-go="${i}">${ROMAN[i]}</button>`).join('');
    dots.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) goTo(Number(b.dataset.go));
    });
  }

  const angleOf = (e) => {
    const r = dial.el.getBoundingClientRect();
    return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
  };

  let startAngle = 0, startRot = 0, moved = 0;

  dial.el.addEventListener('pointerdown', (e) => {
    if (e.target.closest('[data-go]')) return;
    dial.drag = true; moved = 0;
    startAngle = angleOf(e);
    startRot = dial.rot;
    dial.el.classList.add('is-dragging');
    dial.el.setPointerCapture?.(e.pointerId);
  });

  dial.el.addEventListener('pointermove', (e) => {
    if (!dial.drag) return;
    let d = angleOf(e) - startAngle;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    moved = Math.abs(d);
    dial.rot = startRot + d;
    dial.target = dial.rot;
  });

  const release = () => {
    if (!dial.drag) return;
    dial.drag = false;
    dial.el.classList.remove('is-dragging');
    /* a flick with no real travel counts as "next" */
    dial.target = moved < 3 ? dial.target + 90 : Math.round(dial.rot / 90) * 90;
  };
  dial.el.addEventListener('pointerup', release);
  dial.el.addEventListener('pointercancel', release);
  dial.el.addEventListener('lostpointercapture', release);

  dial.el.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) < 4 && Math.abs(e.deltaX) < 4) return;
    e.preventDefault();
    dial.target = Math.round(dial.target / 90) * 90 + (e.deltaY + e.deltaX > 0 ? 90 : -90);
  }, { passive: false });

  dial.knob.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'PageUp') { dial.target += 90; e.preventDefault(); }
    else if (k === 'ArrowLeft' || k === 'ArrowDown' || k === 'PageDown') { dial.target -= 90; e.preventDefault(); }
    else if (k === 'Home') { dial.target = 0; e.preventDefault(); }
    else if (k === 'End') { dial.target = 270; e.preventDefault(); }
  });

  function goTo(i) {
    const cur = Math.round(dial.target / 90);
    let d = i - ((cur % 4) + 4) % 4;
    if (d > 2) d -= 4;
    if (d < -2) d += 4;
    dial.target = (cur + d) * 90;
  }
  dial.goTo = goTo;
})();

function paintWorldAccent() {
  const w = WORLDS[dial.idx];
  if (w) $('.aperture')?.style.setProperty('--accent', tune(w.accent));
  const p = plateEls[Math.max(0, railData.idx)];
  if (p?.dataset.accent) platesEl?.style.setProperty('--accent', tune(p.dataset.accent));
}

function setWorld(i) {
  if (i === dial.idx) return;
  dial.idx = i;
  const w = WORLDS[i];
  $('#roIndex').textContent = String(i + 1).padStart(2, '0');
  $('#roName').textContent = w.name;
  $('#roLine').textContent = w.line;
  $('#roLat').textContent = w.lat;
  $('#roTemp').textContent = w.temp;
  $('#roBirds').textContent = w.birds;
  $('#roAvail').textContent = w.avail;
  dial.knob.setAttribute('aria-valuenow', String(i + 1));
  dial.knob.setAttribute('aria-valuetext', w.name);
  $$('#roDots button').forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
  paintWorldAccent();
  dial.readout.classList.remove('is-turning');
  void dial.readout.offsetWidth;
  dial.readout.classList.add('is-turning');
}

/* ── 9. the index apparitions ──────────────────────────────────────────── */
const app = { el: $('#apparition'), img: $('.apparition__img'), x: 0, y: 0, on: false };
(function indexRows() {
  const list = $('#indexList');
  if (!list || !app.el) return;

  list.addEventListener('pointerover', (e) => {
    const row = e.target.closest('.row');
    if (!row || !ptr.fine) return;
    app.img.style.setProperty('--src', IMG(row.dataset.frag));
    /* summon it at the pointer, never sliding in from the corner */
    ptr.px = e.clientX; ptr.py = e.clientY;
    if (!app.on) { app.x = e.clientX + 26; app.y = Math.max(8, e.clientY - 90); }
    app.on = true;
    app.el.classList.add('is-on');
  });
  list.addEventListener('pointerout', (e) => {
    if (e.relatedTarget && list.contains(e.relatedTarget)) return;
    app.on = false;
    app.el.classList.remove('is-on');
  });

  /* touch: the row lights itself instead of summoning a floating plate */
  list.addEventListener('touchstart', (e) => {
    const row = e.target.closest('.row');
    $$('.row', list).forEach((r) => r.classList.toggle('is-lit', r === row));
  }, { passive: true });
})();

/* ── 10. reveals ───────────────────────────────────────────────────────── */
const pending = new Set($$('.reveal'));
function reveal(el) { el.classList.add('is-in'); io.unobserve(el); pending.delete(el); }

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) reveal(e.target); });
}, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
pending.forEach((el) => io.observe(el));

/* safety net: anything already at or above the fold is shown outright. an
   element the reader has scrolled past — restored scroll on refresh, an anchor
   jump, a very fast flick — never intersects, and unrevealed copy is invisible
   copy. runs from the frame loop until nothing is left to reveal. */
function settleReveals() {
  if (!pending.size) return;
  /* snapshot first — reveal() deletes from `pending`, and mutating a set while
     walking it can skip the entries that follow the one removed. */
  for (const el of [...pending]) {
    if (el.getBoundingClientRect().top < innerHeight * 0.92) reveal(el);
  }
}

/* plate tracking on narrow screens, where the rail is a vertical stack */
const stackObserver = new IntersectionObserver((entries) => {
  if (railData.on) return;
  entries.forEach((e) => { if (e.isIntersecting) setPlate(plateEls.indexOf(e.target)); });
}, { threshold: 0.35 });
plateEls.forEach((p) => stackObserver.observe(p));

/* ── 11. annotation pins — tap-to-open on touch, hover on pointer ──────── */
$$('.pin').forEach((pin) => {
  pin.addEventListener('click', (e) => {
    e.preventDefault();
    const open = pin.getAttribute('aria-expanded') === 'true';
    $$('.pin').forEach((p) => p.setAttribute('aria-expanded', 'false'));
    pin.setAttribute('aria-expanded', String(!open));
  });
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape') $$('.pin').forEach((p) => p.setAttribute('aria-expanded', 'false'));
});

/* ── 12. the ticket ────────────────────────────────────────────────────── */
(function ticket() {
  const form = $('#ticketForm');
  if (!form) return;
  const box = $('#ticketWrap');
  const card = $('#ticket');
  const err = $('#ticketError');
  const def = $('#ticketDefault');
  const done = $('#ticketDone');
  const input = $('#email');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
      err.hidden = false;
      input.focus();
      card.animate(
        [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
         { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
        { duration: 260, easing: 'ease-out' }
      );
      return;
    }
    err.hidden = true;
    let h = 7;
    for (const ch of v) h = (h * 31 + ch.charCodeAt(0)) % 9973;
    $('#letterNo').textContent = String(h % 9000 + 100).padStart(4, '0');
    def.hidden = true;
    done.hidden = false;
    box.classList.add('is-stamped');
    done.querySelector('h3')?.animate(
      [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
      { duration: 600, easing: 'cubic-bezier(.22,1,.28,1)' }
    );
  });

  $('#ticketAgain')?.addEventListener('click', () => {
    done.hidden = true;
    def.hidden = false;
    box.classList.remove('is-stamped');
    input.value = '';
    input.focus();
  });
})();

/* ── 13. the curtain lifts ─────────────────────────────────────────────── */
(function boot() {
  const open = () => {
    if (root.classList.contains('is-open')) return;
    root.classList.add('is-open');
    setTimeout(() => root.classList.add('is-done'), 1400);
  };
  const waitFor = ['/img/plate-temple.webp', '/img/plate-valley.webp'].map(
    (src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = src; })
  );
  Promise.race([
    Promise.all([...waitFor, document.fonts?.ready].filter(Boolean)),
    new Promise((r) => setTimeout(r, 2600)),
  ]).then(() => requestAnimationFrame(() => setTimeout(open, 120)));
  addEventListener('load', () => setTimeout(open, 1800));
})();

/* ── 14. one loop ──────────────────────────────────────────────────────── */
const bar = $('#progressBar');
const invitationBed = $('.invitation__bed');
const giant = $('.giant');
const invitation = $('#invitation');
let lastScroll = scrollY;
let prevT = performance.now();

function frame(t) {
  const dt = Math.min(64, t - prevT) / 1000;
  prevT = t;
  const y = scrollY;
  const vh = innerHeight;

  /* — pointer easing */
  ptr.ex = lerp(ptr.ex, ptr.x, 0.07);
  ptr.ey = lerp(ptr.ey, ptr.y, 0.07);

  settleReveals();

  /* — louvers: follow the pointer, or breathe on their own */
  if (!reduced.matches) {
    louverState.idle += dt;
    if (!ptr.fine || louverState.idle > 2.4) {
      louverState.target = 0.5 + Math.sin(t / 4200) * 0.42;
    }
    louverState.focus = lerp(louverState.focus, louverState.target, 0.06);
    louverState.paint?.();
  }

  /* — depth parallax */
  if (!reduced.matches) {
    const dx = (ptr.ex - 0.5), dy = (ptr.ey - 0.5);
    for (const el of depthEls) {
      const d = Number(el.dataset.depth) || 10;
      el.style.transform = `translate3d(${(-dx * d).toFixed(2)}px, ${(-dy * d * 0.62).toFixed(2)}px, 0)`;
    }
  }

  /* — reading progress */
  const max = document.documentElement.scrollHeight - vh;
  if (bar) bar.style.width = `${(clamp(max > 0 ? y / max : 0) * 100).toFixed(2)}%`;

  /* — masthead retreats when descending */
  if (Math.abs(y - lastScroll) > 6) {
    root.classList.toggle('is-hidden-nav', y > lastScroll && y > vh * 0.7);
    lastScroll = y;
  }

  /* — marquees */
  for (const m of marquees) {
    if (reduced.matches) break;
    if (!m.half) m.measure();
    m.x = (m.x + m.speed * dt) % m.half;
    m.track.style.transform = `translate3d(${(m.rev ? m.x - m.half : -m.x).toFixed(2)}px,0,0)`;
  }

  /* — the catalogue rail */
  if (railData.on && railData.dist > 0) {
    const top = platesEl.offsetTop;
    const span = platesEl.offsetHeight - vh;
    const raw = clamp(span > 0 ? (y - top) / span : 0);
    /* dwell at both ends so plates I and IV are fully framed, never mid-slide */
    const p = clamp((raw - RAIL_HOLD) / (1 - RAIL_HOLD * 2));
    const tx = -p * railData.dist;
    rail.style.transform = `translate3d(${tx.toFixed(2)}px,0,0)`;

    let best = 0, bd = Infinity;
    for (let i = 0; i < railData.boxes.length; i++) {
      const d = Math.abs(railData.boxes[i].c + tx - innerWidth / 2);
      if (d < bd) { bd = d; best = i; }
    }
    setPlate(best);

    /* a whisper of counter-tilt as each plate crosses the centre */
    for (let i = 0; i < plateEls.length; i++) {
      const off = clamp((railData.boxes[i].c + tx - innerWidth / 2) / innerWidth, -1, 1);
      const mask = plateEls[i].querySelector('.plate__mask');
      if (mask) {
        mask.style.setProperty('--tiltY', `${(off * -7).toFixed(2)}deg`);
        mask.style.setProperty('--tiltX', `${((ptr.ey - 0.5) * 3).toFixed(2)}deg`);
      }
    }
  }

  /* — the aperture */
  if (dial.on) {
    if (!dial.drag) dial.rot = lerp(dial.rot, dial.target, reduced.matches ? 1 : 0.11);
    if (dial.spin) dial.spin.style.transform = `rotate(${dial.rot.toFixed(2)}deg)`;
    dial.knob.style.setProperty('--knobRot', `${dial.rot.toFixed(2)}deg`);

    for (const s of dial.slides) {
      const i = Number(s.dataset.i);
      let d = dial.rot - i * 90;
      d = ((d % 360) + 540) % 360 - 180;
      const w = smooth(clamp(1 - Math.abs(d) / 90));
      s.style.opacity = w.toFixed(3);
      s.style.transform = `rotate(${(d * 0.16).toFixed(2)}deg) scale(${(1 + (1 - w) * 0.16).toFixed(3)})`;
      s.style.zIndex = String(Math.round(w * 10));
    }
    const idx = (((Math.round(dial.rot / 90) % 4) + 4) % 4);
    setWorld(idx);
  }

  /* — the invitation: image floods into the wordmark as it arrives */
  if (invitation && giant) {
    const r = invitation.getBoundingClientRect();
    const p = clamp((vh - r.top) / (vh * 0.9));
    giant.style.setProperty('--giant-cut', `${((1 - smooth(p)) * 88).toFixed(1)}%`);
    if (invitationBed && !reduced.matches) {
      invitationBed.style.transform = `translate3d(0,${((p - 0.5) * -46).toFixed(1)}px,0) scale(1.06)`;
    }
  }

  /* — the apparition trails the cursor */
  if (app.el) {
    const w = app.el.offsetWidth || 200;
    const tx2 = clamp(ptr.px + 26, 8, innerWidth - w - 8);
    const ty2 = clamp(ptr.py - 90, 8, innerHeight - w * 1.35);
    app.x = lerp(app.x, tx2, 0.13);
    app.y = lerp(app.y, ty2, 0.13);
    if (app.on) {
      const vx = clamp((tx2 - app.x) / 90, -1, 1);
      app.el.style.transform = `translate3d(${app.x.toFixed(1)}px,${app.y.toFixed(1)}px,0) rotate(${(vx * 5).toFixed(2)}deg)`;
    }
  }

  requestAnimationFrame(frame);
}

/* ── 15. layout & go ──────────────────────────────────────────────────── */
function relayout() {
  layoutRail();
  marquees.forEach((m) => m.measure());
}
relayout();
setPlate(0);
setWorld(0);
/* the inline head script already restored the hour before first paint; this
   re-runs setHour on it so the masthead's aria-pressed and theme-colour agree. */
setHour(root.dataset.hour, false);

let rt;
addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(relayout, 140); }, { passive: true });
if (document.fonts?.ready) document.fonts.ready.then(relayout);
addEventListener('load', relayout);
reduced.addEventListener?.('change', relayout);

requestAnimationFrame((t) => { prevT = t; frame(t); });
