import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const html = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
const isNarrow = () => innerWidth < 900;

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
scrollTo(0, 0);

/* ———————————————————————— smooth scroll */

let lenis = null;
if (!reduce) {
  lenis = new Lenis({ lerp: 0.085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

const lock = () => {
  lenis?.stop();
  html.classList.add('is-locked');
};
const unlock = () => {
  lenis?.start();
  html.classList.remove('is-locked');
};

$$('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else target.scrollIntoView();
  });
});

/* ———————————————————————— cursor */

if (fine && !reduce) {
  html.classList.add('has-cursor');
  const cursor = $('.cursor');
  const label = $('.cursor__label');
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.35, ease: 'power3' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.35, ease: 'power3' });
  addEventListener('pointermove', (e) => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  document.addEventListener('pointerover', (e) => {
    const t = e.target.closest('[data-cursor]');
    if (t) {
      label.textContent = t.dataset.cursor;
      cursor.classList.add('has-label');
    } else {
      cursor.classList.remove('has-label');
    }
  });
  addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  addEventListener('pointerup', () => cursor.classList.remove('is-down'));
}

/* ———————————————————————— split helpers */

function splitChars(el) {
  const text = el.textContent;
  el.textContent = '';
  for (const c of text) {
    const outer = document.createElement('span');
    outer.className = 'ch';
    const inner = document.createElement('span');
    inner.textContent = c;
    outer.append(inner);
    el.append(outer);
  }
  return $$('.ch > span', el);
}

function splitWords(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((n) => {
    const frag = document.createDocumentFragment();
    n.textContent.split(/(\s+)/).forEach((part) => {
      if (!part) return;
      if (/^\s+$/.test(part)) frag.append(' ');
      else {
        const s = document.createElement('span');
        s.className = 'w';
        s.textContent = part;
        frag.append(s);
      }
    });
    n.replaceWith(frag);
  });
  return $$('.w, .pill', root);
}

/* ———————————————————————— hero lantern */

const hero = $('.hero');
const lit = $('.hero__lit');
const ring = $('.hero__ring');
const coords = $('.hero__coords');
const L = { x: 0, y: 0, tx: 0, ty: 0, r: 0, tr: 0, last: -1e9, bloom: false, ready: false };
let heroVisible = true;

const baseR = () => Math.max(130, Math.min(innerWidth, innerHeight) * (isNarrow() ? 0.36 : 0.27));
const fullR = () => Math.hypot(innerWidth, innerHeight) * 1.1;

{
  L.x = L.tx = innerWidth * 0.62;
  L.y = L.ty = innerHeight * 0.42;
  const point = (cx, cy) => {
    const b = hero.getBoundingClientRect();
    L.tx = cx - b.left;
    L.ty = cy - b.top;
    L.last = performance.now();
  };
  hero.addEventListener('pointermove', (e) => point(e.clientX, e.clientY));
  hero.addEventListener('touchstart', (e) => point(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  hero.addEventListener('touchmove', (e) => point(e.touches[0].clientX, e.touches[0].clientY), { passive: true });

  let bloomTimer;
  hero.addEventListener('pointerdown', (e) => {
    if (!L.ready) return;
    point(e.clientX, e.clientY);
    L.bloom = true;
    clearTimeout(bloomTimer);
    if (e.pointerType !== 'mouse') bloomTimer = setTimeout(() => (L.bloom = false), 1400);
  });
  const release = (e) => {
    if (e.pointerType === 'mouse') L.bloom = false;
  };
  hero.addEventListener('pointerup', release);
  hero.addEventListener('pointerleave', release);

  let frame = 0;
  gsap.ticker.add(() => {
    if (!heroVisible) return;
    const now = performance.now();
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    if (now - L.last > 2600) {
      const t = now / 1000;
      L.tx = w * (0.55 + 0.26 * Math.sin(t * 0.37));
      L.ty = h * (0.42 + 0.18 * Math.sin(t * 0.61 + 1.3));
    }
    if (L.ready) L.tr = L.bloom ? fullR() : baseR();
    L.x += (L.tx - L.x) * 0.075;
    L.y += (L.ty - L.y) * 0.075;
    L.r += (L.tr - L.r) * (L.bloom ? 0.05 : 0.07);
    lit.style.setProperty('--x', `${L.x.toFixed(1)}px`);
    lit.style.setProperty('--y', `${L.y.toFixed(1)}px`);
    lit.style.setProperty('--r', `${L.r.toFixed(1)}px`);
    const d = L.r * 1.25;
    ring.style.transform = `translate3d(${L.x - d / 2}px, ${L.y - d / 2}px, 0)`;
    ring.style.width = ring.style.height = `${d}px`;
    ring.style.opacity = String(Math.max(0, 1 - L.r / (baseR() * 2.4)));
    if (++frame % 6 === 0) {
      const lat = 90 - (L.y / h) * 180;
      const lon = (L.x / w) * 360 - 180;
      coords.textContent = `Lat ${lat.toFixed(2)}° · Lon ${lon.toFixed(2)}°`;
    }
  });

  ScrollTrigger.create({
    trigger: hero,
    start: 'top top',
    end: 'bottom top',
    onToggle: (self) => (heroVisible = self.isActive),
  });

  gsap.to('.hero__layer img', {
    yPercent: 10,
    scale: 1.08,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.to('.hero__title', {
    yPercent: -35,
    ease: 'none',
    scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true },
  });
}

const titleChars = $$('.hero__title .t').flatMap(splitChars);

/* ———————————————————————— loader + intro */

function intro() {
  L.ready = true;
  L.tr = baseR();
  const tl = gsap.timeline();
  tl.from(titleChars, { yPercent: 115, rotate: 6, duration: 1.4, stagger: 0.045, ease: 'expo.out' }, 0)
    .from(
      ['.hero__eyebrow', '.hero__fig', '.hero__foot', '.nav', '.meridian'],
      { opacity: 0, y: 18, duration: 1.2, stagger: 0.08, ease: 'expo.out' },
      0.35,
    );
  return tl;
}

{
  const loader = $('.loader');
  const count = $('.loader__count');
  lock();

  const sources = ['still', 'scholar', 'valley', 'temple'].map((n) => `/img/${n}.jpg`);
  const preload = Promise.all(
    sources.map(
      (src) =>
        new Promise((res) => {
          const i = new Image();
          i.onload = i.onerror = res;
          i.src = src;
        }),
    ),
  );
  const fonts = document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve();

  const c = { v: 0 };
  const strips = $$('.loader__strip');
  const stripImgs = $$('.loader__strip img');
  const enter = gsap.timeline();
  enter
    .to(c, {
      v: 100,
      duration: reduce ? 0.2 : 2.1,
      ease: 'power2.inOut',
      onUpdate: () => (count.textContent = String(Math.round(c.v)).padStart(3, '0')),
    })
    .fromTo(
      strips,
      { clipPath: 'inset(100% 0% 0% 0%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.3, stagger: 0.14, ease: 'expo.inOut' },
      0,
    )
    .fromTo(stripImgs, { scale: 1.5 }, { scale: 1, duration: 2, stagger: 0.14, ease: 'expo.out' }, 0)
    .from('.loader__word', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out' }, 0.2);

  Promise.all([preload, fonts, enter.then()]).then(() => {
    const out = gsap.timeline({
      onComplete: () => {
        loader.remove();
        unlock();
      },
    });
    out
      .to('.loader__meta', { opacity: 0, duration: 0.5, ease: 'power2.in' }, 0)
      .to(strips, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.1, stagger: 0.09, ease: 'expo.inOut' }, 0.1)
      .to(stripImgs, { yPercent: -20, duration: 1.1, stagger: 0.09, ease: 'expo.inOut' }, 0.1)
      .add(() => loader.classList.add('is-gone'), 0.15)
      .add(intro(), 0.55);
  });
}

/* ———————————————————————— doctrine */

{
  const items = splitWords($('.doctrine__text'));
  gsap.to(items, {
    opacity: 1,
    stagger: 0.08,
    ease: 'none',
    scrollTrigger: { trigger: '.doctrine__text', start: 'top 78%', end: 'bottom 52%', scrub: true },
  });
  const path = $('.doctrine__sign path');
  const len = path.getTotalLength();
  gsap.fromTo(
    path,
    { strokeDasharray: len, strokeDashoffset: len },
    {
      strokeDashoffset: 0,
      duration: 2.2,
      ease: 'power2.inOut',
      scrollTrigger: { trigger: '.doctrine__sign', start: 'top 85%' },
    },
  );
}

/* ———————————————————————— arch */

{
  const pin = $('.arch__pin');
  const win = $('.arch__window');
  const size = () => {
    const w = isNarrow() ? Math.min(innerWidth * 0.52, 260) : Math.min(innerWidth * 0.2, 320);
    return { w, h: w * 1.48 };
  };
  gsap.set(win, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${innerHeight * 2.2}`,
      pin: true,
      scrub: 0.6,
      invalidateOnRefresh: true,
    },
  });
  tl.fromTo(
    win,
    {
      width: () => size().w,
      height: () => size().h,
      borderTopLeftRadius: () => size().w / 2,
      borderTopRightRadius: () => size().w / 2,
    },
    {
      width: () => pin.clientWidth,
      height: () => pin.clientHeight,
      borderTopLeftRadius: 0,
      borderTopRightRadius: 0,
      ease: 'power2.inOut',
      duration: 1,
    },
    0,
  )
    .fromTo('.arch__window img', { scale: 1.6 }, { scale: 1, ease: 'power2.inOut', duration: 1 }, 0)
    .to('.arch__side--l > *', { x: () => -innerWidth * 0.35, opacity: 0, ease: 'power2.in', duration: 0.7 }, 0)
    .to('.arch__side--r > *', { x: () => innerWidth * 0.35, opacity: 0, ease: 'power2.in', duration: 0.7 }, 0)
    .to(win, { '--shade': 1, duration: 0.3 }, 0.8)
    .fromTo('.arch__caption', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.3 }, 0.88)
    .to({}, { duration: 0.35 });
}

/* ———————————————————————— marquee velocity */

if (lenis) {
  const spans = $$('.marquee__track span');
  const skew = gsap.quickTo(spans, 'skewX', { duration: 0.5, ease: 'power3' });
  lenis.on('scroll', (e) => skew(gsap.utils.clamp(-14, 14, -e.velocity * 0.5)));
}

/* ———————————————————————— vials */

const FIELDS = [
  {
    no: 'Nº I · The Cabinet',
    name: 'Reliquary',
    img: '/img/still.jpg',
    pos: '58% 50%',
    story:
      'A still life that kept breathing after the painter left the room. Gilt dust on a marble cheek, a peeled orange nobody remembers peeling.',
    notes: { Top: 'Bitter orange, gilt saffron', Heart: 'Cold marble, peony', Base: 'Old paper, ambergris' },
    price: '50 ml — €340',
  },
  {
    no: 'Nº II · The Academy',
    name: 'Marginalia',
    img: '/img/scholar.jpg',
    pos: '40% 45%',
    story:
      'Written in the margins of a book that is still being read. Warm ash drifts down from the volcano and settles between the pages.',
    notes: { Top: 'Black tea, pink pepper', Heart: 'Smoked iris, papyrus', Base: 'Volcanic ash, cedar' },
    price: '50 ml — €360',
  },
  {
    no: 'Nº III · The Valley',
    name: 'Saffron Thaw',
    img: '/img/valley.jpg',
    pos: '55% 50%',
    story:
      'The first hour the river remembers it is a river. Snowmelt over saffron meadows, a single golden tree keeping the season for everyone.',
    notes: { Top: 'Glacier water, mandarin', Heart: 'Saffron, wild rose', Base: 'Birch sap, warm stone' },
    price: '50 ml — €320',
  },
  {
    no: 'Nº IV · The Temple',
    name: "Nocturne d'Or",
    img: '/img/temple.jpg',
    pos: '50% 45%',
    story:
      'A temple that only opens after dark, where the stars come down the steps to drink. Wear it once and every night owes you a favour.',
    notes: { Top: 'Cold air, bergamot', Heart: 'Labdanum, orange blossom', Base: 'Gold resin, myrrh' },
    price: '50 ml — €420',
  },
];

{
  const vials = $$('.vial');
  const liquids = $$('.vial__liquid');
  gsap.fromTo(
    liquids,
    { clipPath: 'inset(100% 0% 0% 0%)' },
    {
      clipPath: 'inset(0% 0% 0% 0%)',
      duration: 2,
      stagger: 0.16,
      ease: 'power3.inOut',
      scrollTrigger: { trigger: '.vials__grid', start: 'top 72%' },
    },
  );
  gsap.from('.vial__label > *', {
    y: 24,
    opacity: 0,
    duration: 1.1,
    stagger: 0.04,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.vials__grid', start: 'top 55%' },
  });
  gsap.from('.vials__head > *', {
    y: 50,
    opacity: 0,
    duration: 1.3,
    stagger: 0.1,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.vials__head', start: 'top 80%' },
  });

  if (fine) {
    vials.forEach((v) => {
      const btn = $('.vial__btn', v);
      const glass = $('.vial__glass', v);
      btn.addEventListener('pointermove', (e) => {
        const b = btn.getBoundingClientRect();
        const px = (e.clientX - b.left) / b.width - 0.5;
        const py = (e.clientY - b.top) / b.height - 0.5;
        gsap.to(glass, {
          rotateY: px * 16,
          rotateX: -py * 8,
          '--mx': `${-px * 22}px`,
          '--my': `${-py * 26}px`,
          duration: 0.8,
          ease: 'power3',
        });
      });
      btn.addEventListener('pointerleave', () =>
        gsap.to(glass, { rotateY: 0, rotateX: 0, '--mx': '0px', '--my': '0px', duration: 1.2, ease: 'elastic.out(1, 0.5)' }),
      );
    });
  }

  /* immersion */
  const imm = $('.immersion');
  const mediaImg = $('.immersion__media img');
  const body = $('.immersion__body');
  let current = 0;
  let busy = false;
  let lastFocus = null;

  const fill = (i) => {
    const f = FIELDS[i];
    mediaImg.src = f.img;
    mediaImg.style.objectPosition = f.pos;
    $('.immersion__no').textContent = f.no;
    $('.immersion__name').textContent = f.name;
    $('.immersion__story').textContent = f.story;
    $('.immersion__notes').innerHTML = Object.entries(f.notes)
      .map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');
    $('.immersion__price').textContent = f.price;
    imm.setAttribute('aria-label', f.name);
  };

  const rectClip = (i) => {
    const r = $('.vial__glass', vials[i]).getBoundingClientRect();
    return `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px round ${r.width / 2}px)`;
  };

  const open = (i) => {
    if (busy) return;
    busy = true;
    current = i;
    lastFocus = document.activeElement;
    fill(i);
    imm.hidden = false;
    lock();
    gsap
      .timeline({ onComplete: () => (busy = false) })
      .fromTo(imm, { clipPath: rectClip(i) }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', duration: 1.15, ease: 'expo.inOut' }, 0)
      .fromTo(mediaImg, { scale: 1.5 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0.2)
      .fromTo(body.children, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.07, ease: 'expo.out' }, 0.6)
      .fromTo('.immersion__close', { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.8);
    $('.immersion__close').focus({ preventScroll: true });
  };

  const close = () => {
    if (busy || imm.hidden) return;
    busy = true;
    gsap
      .timeline({
        onComplete: () => {
          imm.hidden = true;
          busy = false;
          unlock();
          lastFocus?.focus({ preventScroll: true });
        },
      })
      .to(body.children, { y: 20, opacity: 0, duration: 0.35, stagger: 0.03, ease: 'power2.in' }, 0)
      .to(imm, { clipPath: rectClip(current), duration: 1, ease: 'expo.inOut' }, 0.15)
      .to(mediaImg, { scale: 1.3, duration: 1, ease: 'expo.inOut' }, 0.15);
  };

  const next = () => {
    if (busy) return;
    busy = true;
    const n = (current + 1) % FIELDS.length;
    gsap
      .timeline({ onComplete: () => (busy = false) })
      .to(body.children, { y: -30, opacity: 0, duration: 0.45, stagger: 0.04, ease: 'power2.in' }, 0)
      .to('.immersion__media', { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.8, ease: 'expo.in' }, 0)
      .add(() => {
        current = n;
        fill(n);
      })
      .fromTo(
        '.immersion__media',
        { clipPath: 'inset(100% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.out' },
      )
      .fromTo(mediaImg, { scale: 1.35 }, { scale: 1, duration: 1.6, ease: 'expo.out' }, '<')
      .fromTo(body.children, { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.06, ease: 'expo.out' }, '<0.2');
  };

  vials.forEach((v, i) => $('.vial__btn', v).addEventListener('click', () => open(i)));
  $('.immersion__close').addEventListener('click', close);
  $('.immersion__next').addEventListener('click', next);
  addEventListener('keydown', (e) => {
    if (imm.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') next();
  });
}

/* ———————————————————————— valley slices */

{
  const pin = $('.slices__pin');
  const stage = $('.slices__stage');
  const N = isNarrow() ? 7 : 12;
  const slices = [];
  for (let i = 0; i < N; i++) {
    const s = document.createElement('div');
    s.className = 'slice';
    const img = document.createElement('img');
    img.src = '/img/valley.jpg';
    img.alt = '';
    img.loading = 'lazy';
    s.append(img);
    stage.append(s);
    slices.push(s);
  }
  const layout = () => {
    const W = stage.clientWidth;
    const w = W / N;
    slices.forEach((s, i) => {
      s.style.left = `${i * w}px`;
      s.style.width = `${Math.ceil(w) + 1}px`;
      const img = s.firstChild;
      img.style.width = `${W}px`;
      img.style.left = `${-i * w}px`;
    });
  };
  layout();
  addEventListener('resize', layout);

  const seed = (i) => {
    const v = Math.sin(i * 91.7 + 13.1) * 43758.5453;
    return v - Math.floor(v);
  };
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${innerHeight * 2}`,
      pin: true,
      scrub: 0.7,
      invalidateOnRefresh: true,
    },
  });
  tl.fromTo(
    slices,
    {
      y: (i) => (i % 2 ? 1 : -1) * innerHeight * (0.75 + seed(i) * 0.5),
      scaleX: 0.55,
    },
    {
      y: 0,
      scaleX: 1,
      ease: 'power3.out',
      duration: 1,
      stagger: { each: 0.035, from: 'center' },
    },
    0,
  )
    .to('.slices__shade', { opacity: 1, duration: 0.3 }, 0.95)
    .fromTo(
      ['.slices__text > *', '.slices__specs > *'],
      { y: 60, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.35, stagger: 0.05, ease: 'power3.out' },
      1.0,
    )
    .to({}, { duration: 0.3 });
}

/* ———————————————————————— nocturne */

{
  const pin = $('.nocturne__pin');
  const frameEl = $('.nocturne__frame');
  gsap.set(frameEl, { xPercent: -50, yPercent: -50, x: 0, y: 0 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${innerHeight * 2.8}`,
      pin: true,
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });
  tl.fromTo('.nocturne__title', { opacity: 1, y: 0 }, { opacity: 0, y: -80, duration: 0.25, ease: 'power2.in' }, 0.12)
    .fromTo(frameEl, { scale: 1 }, { scale: 24, ease: 'power3.in', duration: 1 }, 0.1)
    .to('.nocturne__veil', { opacity: 1, duration: 0.22, ease: 'none' }, 0.88)
    .to('.nocturne__inside', { autoAlpha: 1, duration: 0.15 }, 1.05)
    .fromTo('.nocturne__inside > *', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.05 }, 1.05)
    .to({}, { duration: 0.3 });

  /* gold dust */
  const canvas = $('.nocturne__dust');
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0;
  let H = 0;
  let running = false;
  const parts = [];
  const stars = [];
  const COLORS = ['242,165,30', '246,206,120', '239,134,118', '241,232,214'];

  const size = () => {
    W = pin.clientWidth;
    H = pin.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars.length = 0;
    const n = Math.round((W * H) / 9000);
    for (let i = 0; i < n; i++) {
      stars.push({ x: Math.random() * W, y: Math.random() * H * 0.6, r: Math.random() * 1.1 + 0.2, p: Math.random() * 6.28 });
    }
  };
  size();
  addEventListener('resize', size);

  const emit = (x, y, spread, n, up) => {
    for (let i = 0; i < n && parts.length < 700; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = Math.random() * spread;
      parts.push({
        x: x + Math.cos(a) * s,
        y: y + Math.sin(a) * s * 0.4,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -(Math.random() * up + 0.2),
        life: 0,
        max: 90 + Math.random() * 140,
        r: Math.random() * 1.8 + 0.4,
        c: COLORS[(Math.random() * COLORS.length) | 0],
        ph: Math.random() * 6.28,
      });
    }
  };

  pin.addEventListener('pointermove', (e) => {
    const b = canvas.getBoundingClientRect();
    emit(e.clientX - b.left, e.clientY - b.top, 8, 3, 1.4);
  });

  const tick = () => {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    const p = tl.progress();
    const t = performance.now() / 1000;

    const starAlpha = p < 0.35 ? 1 - p / 0.35 : Math.max(0, (p - 0.75) / 0.25);
    if (starAlpha > 0) {
      for (const s of stars) {
        ctx.globalAlpha = starAlpha * (0.35 + 0.65 * Math.abs(Math.sin(t * 0.9 + s.p)));
        ctx.fillStyle = '#f1e8d6';
        ctx.fillRect(s.x, s.y, s.r, s.r);
      }
    }

    const fr = frameEl.getBoundingClientRect();
    const cb = canvas.getBoundingClientRect();
    const dx = fr.left + fr.width * 0.507 - cb.left;
    const dy = fr.top + fr.height * 0.75 - cb.top;
    if (p < 0.9 && dx > -50 && dx < W + 50) emit(dx, dy, fr.width * 0.02, 2, 1.6);
    else if (p >= 0.9) emit(Math.random() * W, H + 10, 0, 1, 1.2);

    ctx.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.life++;
      q.vx += Math.sin(t * 2 + q.ph) * 0.02;
      q.vy -= 0.006;
      q.x += q.vx;
      q.y += q.vy;
      const k = q.life / q.max;
      if (k >= 1 || q.y < -20) {
        parts.splice(i, 1);
        continue;
      }
      const a = Math.sin(Math.PI * k);
      ctx.globalAlpha = a * 0.22;
      ctx.fillStyle = `rgb(${q.c})`;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r * 4, 0, 6.283);
      ctx.fill();
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(q.x, q.y, q.r, 0, 6.283);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    requestAnimationFrame(tick);
  };

  ScrollTrigger.create({
    trigger: '.nocturne',
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      running = self.isActive && !reduce;
      if (running) requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, W, H);
    },
  });

  /* audience form */
  const form = $('.audience');
  const input = $('input', form);
  const note = $('.audience__note', form);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!input.value.trim() || !input.checkValidity()) {
      note.textContent = 'The ink is smudged — an address, please.';
      gsap.fromTo(input, { x: -8 }, { x: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
      return;
    }
    form.classList.add('is-sealed');
    input.disabled = true;
    gsap.to('.audience__seal', { rotate: 360, scale: 1.12, duration: 1.4, ease: 'expo.out' });
    $('.audience__seal span').textContent = '✦';
    note.textContent = 'Sealed. Expect a letter by owl, or by email — whichever arrives first.';
    const b = $('.audience__seal').getBoundingClientRect();
    const cb = canvas.getBoundingClientRect();
    emit(b.left + b.width / 2 - cb.left, b.top + b.height / 2 - cb.top, 40, 160, 3);
  });
}

/* ———————————————————————— colophon */

gsap.fromTo(
  '.colophon__word',
  { backgroundPosition: '50% 0%' },
  {
    backgroundPosition: '50% 100%',
    ease: 'none',
    scrollTrigger: { trigger: '.colophon', start: 'top bottom', end: 'bottom bottom', scrub: true },
  },
);
gsap.from('.colophon__word', {
  yPercent: 30,
  opacity: 0,
  duration: 1.6,
  ease: 'expo.out',
  scrollTrigger: { trigger: '.colophon', start: 'top 85%' },
});

/* ———————————————————————— meridian */

{
  const links = $$('.meridian a');
  $$('[data-chapter]').forEach((sec) => {
    const idx = Number(sec.dataset.chapter);
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 55%',
      end: 'bottom 55%',
      onToggle: (self) => {
        if (!self.isActive) return;
        links.forEach((l, i) => l.classList.toggle('is-active', i === idx));
      },
    });
  });
}

addEventListener('load', () => ScrollTrigger.refresh());
