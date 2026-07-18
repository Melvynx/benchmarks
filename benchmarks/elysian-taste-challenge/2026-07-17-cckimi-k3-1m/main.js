/* ═══════════════════════════════════════════════════════════════
   ELYSIAN — Catalogue Nº X — motion & interaction
   ═══════════════════════════════════════════════════════════════ */
(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const PARAMS = new URLSearchParams(location.search);
  const SNAP = PARAMS.has('snap') || PARAMS.has('flat');
  const INSTANT = REDUCED || SNAP;
  const FINE = window.matchMedia('(pointer: fine)').matches;
  if (SNAP) {
    document.documentElement.classList.add('snap');
    if (PARAMS.has('flat')) document.documentElement.classList.add('snap-flat');
  }
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ─────────────── split hero title into chars ─────────────── */
  const title = document.querySelector('[data-split="chars"]');
  if (title) {
    const text = title.textContent;
    title.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'char' + (ch === '[' || ch === ']' ? ' char--gold' : '');
      s.textContent = ch;
      s.setAttribute('aria-hidden', 'true');
      s.style.transitionDelay = `${i * 70}ms`;
      title.appendChild(s);
    });
  }

  /* ─────────────── split manifesto into words ─────────────── */
  const mani = document.getElementById('manifestoText');
  const splitWords = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((piece) => {
          if (!piece) return;
          if (/^\s+$/.test(piece)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span');
          w.className = 'w';
          w.textContent = piece;
          frag.appendChild(w);
        });
        node.replaceChild(frag, child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        splitWords(child);
      }
    });
  };
  if (mani) splitWords(mani);
  const maniWords = mani ? [...mani.querySelectorAll('.w')] : [];

  /* ─────────────── reveal delays ─────────────── */
  document.querySelectorAll('[data-rv-delay]').forEach((el) => {
    el.style.setProperty('--rv-d', `${el.dataset.rvDelay}ms`);
  });

  /* ─────────────── overture ─────────────── */
  const overture = document.getElementById('overture');
  const finishOverture = () => {
    if (!overture || overture.classList.contains('is-done')) return;
    overture.classList.add('is-done');
    if (title) title.classList.add('is-in');
    setTimeout(() => overture.remove(), 1400);
  };
  if (INSTANT) {
    if (overture) overture.remove();
    if (title) title.classList.add('is-in');
  } else {
    setTimeout(finishOverture, 2100);
    setTimeout(finishOverture, 4200); // failsafe
  }

  /* ─────────────── intersection reveals ─────────────── */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));

  /* ─────────────── chapter indicator ─────────────── */
  const railNum = document.getElementById('railNum');
  const railLabel = document.getElementById('railLabel');
  const chIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && railNum && railLabel) {
        railNum.textContent = e.target.dataset.ch || '—';
        railLabel.textContent = e.target.dataset.chName || '';
      }
    });
  }, { rootMargin: '-42% 0px -42% 0px' });
  document.querySelectorAll('[data-ch]').forEach((s) => chIO.observe(s));

  /* ─────────────── menu ─────────────── */
  const menu = document.getElementById('menu');
  const indexToggle = document.getElementById('indexToggle');
  const menuClose = document.getElementById('menuClose');
  const menuThumb = document.getElementById('menuThumb');
  const menuThumbImg = menuThumb ? menuThumb.querySelector('img') : null;
  let menuOpen = false;
  let thumbTarget = { x: 0, y: 0 };
  let thumbPos = { x: 0, y: 0 };
  let thumbVisible = false;

  const setMenu = (open) => {
    menuOpen = open;
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    indexToggle.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  if (menu && indexToggle) {
    indexToggle.addEventListener('click', () => setMenu(!menuOpen));
    menuClose.addEventListener('click', () => setMenu(false));
    menu.querySelectorAll('.menu__row').forEach((row) => {
      row.addEventListener('click', () => setMenu(false));
      if (FINE && menuThumb) {
        row.addEventListener('mouseenter', () => {
          menuThumbImg.src = row.dataset.thumb;
          thumbVisible = true;
          menuThumb.classList.add('is-visible');
        });
        row.addEventListener('mouseleave', () => {
          thumbVisible = false;
          menuThumb.classList.remove('is-visible');
        });
      }
    });
    if (FINE) {
      menu.addEventListener('mousemove', (e) => { thumbTarget = { x: e.clientX, y: e.clientY }; });
    }
    window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) setMenu(false); });
  }

  /* ─────────────── custom cursor ─────────────── */
  const cursor = document.getElementById('cursor');
  const cursorLabel = document.getElementById('cursorLabel');
  let mouse = { x: innerWidth / 2, y: innerHeight / 2 };
  let cursorPos = { x: mouse.x, y: mouse.y };
  if (FINE && !REDUCED && cursor) {
    document.body.classList.add('has-cursor');
    window.addEventListener('mousemove', (e) => {
      mouse = { x: e.clientX, y: e.clientY };
      cursor.classList.add('is-live');
    });
    document.addEventListener('mouseover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const inter = e.target.closest('a, button, input, [data-tilt]');
      if (labelled) {
        cursorLabel.textContent = labelled.dataset.cursor;
        cursor.classList.add('is-active');
        cursor.classList.remove('is-hover');
      } else if (inter) {
        cursor.classList.add('is-hover');
        cursor.classList.remove('is-active');
      } else {
        cursor.classList.remove('is-active', 'is-hover');
      }
    });
  }

  /* ─────────────── hero plates mouse parallax ─────────────── */
  const hero = document.querySelector('.hero');
  const hplates = [...document.querySelectorAll('.hplate')];
  let heroMouse = { x: 0, y: 0 };
  let heroLerp = { x: 0, y: 0 };
  if (FINE && hero) {
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      heroMouse = {
        x: (e.clientX - r.left) / r.width - 0.5,
        y: (e.clientY - r.top) / r.height - 0.5,
      };
    });
    hero.addEventListener('mouseleave', () => { heroMouse = { x: 0, y: 0 }; });
  }

  /* ─────────────── tilt ─────────────── */
  if (FINE && !REDUCED) {
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.style.willChange = 'transform';
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * 5}deg) rotateX(${-py * 5}deg)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform 0.8s cubic-bezier(0.16,1,0.3,1)';
        el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
        setTimeout(() => { el.style.transition = ''; }, 800);
      });
    });
  }

  /* ─────────────── starfields ─────────────── */
  const mulberry32 = (seed) => () => {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  class Starfield {
    constructor(canvas, seed, density = 9000) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.seed = seed;
      this.density = density;
      this.stars = [];
      this.visible = true;
      this.resize();
      new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
      new IntersectionObserver((en) => { this.visible = en[0].isIntersecting; }).observe(canvas);
    }
    resize() {
      const r = this.c.parentElement.getBoundingClientRect();
      const dpr = Math.min(devicePixelRatio || 1, 2);
      this.c.width = Math.max(1, r.width * dpr);
      this.c.height = Math.max(1, r.height * dpr);
      this.dpr = dpr;
      const rnd = mulberry32(this.seed);
      const n = Math.floor((r.width * r.height) / this.density);
      this.stars = Array.from({ length: n }, () => ({
        x: rnd(), y: rnd(),
        r: 0.4 + rnd() * 1.3,
        base: 0.25 + rnd() * 0.55,
        amp: 0.15 + rnd() * 0.3,
        speed: 0.4 + rnd() * 1.4,
        phase: rnd() * Math.PI * 2,
        gold: rnd() > 0.86,
      }));
    }
    draw(t) {
      const { ctx, c, dpr } = this;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const s of this.stars) {
        const a = clamp(s.base + Math.sin(t * 0.001 * s.speed + s.phase) * s.amp, 0.05, 1);
        ctx.beginPath();
        ctx.arc(s.x * c.width, s.y * c.height, s.r * dpr, 0, Math.PI * 2);
        ctx.fillStyle = s.gold
          ? `rgba(240, 197, 101, ${a})`
          : `rgba(240, 231, 211, ${a * 0.9})`;
        ctx.fill();
      }
    }
  }

  const starfields = [];
  if (!REDUCED) {
    const hs = document.getElementById('heroStars');
    const as = document.getElementById('ascStars');
    if (hs) starfields.push(new Starfield(hs, 1721));
    if (as) starfields.push(new Starfield(as, 404, 7000));
  }

  /* ─────────────── parallax + scrub registry ─────────────── */
  const paras = [...document.querySelectorAll('[data-para]')].map((el) => ({
    el, speed: parseFloat(el.dataset.para) || 0.05,
    wrap: el.closest('[data-para-wrap]') || el.parentElement,
  }));

  const valley = document.querySelector('.valley');
  const valleyImgWrap = document.getElementById('valleyImgWrap');
  const valleyImg = valleyImgWrap ? valleyImgWrap.querySelector('img') : null;
  const valleySeal = document.getElementById('valleySeal');
  const valleyWhisper = document.getElementById('valleyWhisper');

  const progressBar = document.getElementById('progressBar');
  const maniSection = document.querySelector('.manifesto');

  /* ─────────────── master rAF loop ─────────────── */
  const vh = () => window.innerHeight;

  const frame = (t) => {
    const H = vh();
    const Y = window.scrollY;

    // progress hairline
    if (progressBar) {
      const max = document.documentElement.scrollHeight - H;
      progressBar.style.transform = `scaleX(${max > 0 ? clamp(Y / max, 0, 1) : 0})`;
    }

    // cursor
    if (FINE && cursor) {
      cursorPos.x = lerp(cursorPos.x, mouse.x, 0.22);
      cursorPos.y = lerp(cursorPos.y, mouse.y, 0.22);
      cursor.style.transform = `translate(${cursorPos.x}px, ${cursorPos.y}px)`;
    }

    // menu thumb follower
    if (menuOpen && FINE && menuThumb) {
      thumbPos.x = lerp(thumbPos.x, thumbTarget.x, 0.14);
      thumbPos.y = lerp(thumbPos.y, thumbTarget.y, 0.14);
      menuThumb.style.transform = `translate(${thumbPos.x + 28}px, ${thumbPos.y - 90}px)`;
    }

    // hero plates mouse parallax
    if (FINE && hplates.length) {
      heroLerp.x = lerp(heroLerp.x, heroMouse.x, 0.05);
      heroLerp.y = lerp(heroLerp.y, heroMouse.y, 0.05);
      for (const p of hplates) {
        const d = parseFloat(p.dataset.depth) || 0.03;
        p.style.transform = `translate3d(${heroLerp.x * d * 1400}px, ${heroLerp.y * d * 900}px, 0)`;
      }
    }

    // scroll parallax
    for (const p of paras) {
      const r = p.wrap.getBoundingClientRect();
      if (r.bottom < -100 || r.top > H + 100) continue;
      const delta = (r.top + r.height / 2) - H / 2;
      p.el.style.transform = `translate3d(0, ${(-delta * p.speed).toFixed(2)}px, 0)`;
    }

    // valley scrub
    if (valley && valleyImg) {
      const r = valley.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H) {
        const p = clamp(-r.top / (r.height - H), 0, 1);
        const scale = lerp(1.22, 1.0, p);
        const ty = lerp(2.5, 0, p);
        valleyImg.style.transform = `scale(${scale.toFixed(4)}) translateY(${ty.toFixed(3)}%)`;
        if (valleySeal) valleySeal.classList.toggle('is-lit', p > 0.22);
        if (valleyWhisper) valleyWhisper.classList.toggle('is-lit', p > 0.5);
      }
    }

    // manifesto word lighting
    if (maniSection && maniWords.length) {
      const r = maniSection.getBoundingClientRect();
      if (r.bottom > 0 && r.top < H) {
        const p = clamp((H * 0.88 - r.top) / (H * 0.72), 0, 1);
        const lit = Math.floor(p * maniWords.length * 1.15);
        maniWords.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
      }
    }

    // stars
    for (const sf of starfields) if (sf.visible) sf.draw(t);

    if (!REDUCED) requestAnimationFrame(frame);
  };

  if (!REDUCED) {
    requestAnimationFrame(frame);
  }
  if (INSTANT) {
    // static world: everything visible, no loops
    maniWords.forEach((w) => w.classList.add('is-lit'));
    if (valleySeal) valleySeal.classList.add('is-lit');
    if (valleyWhisper) valleyWhisper.classList.add('is-lit');
    if (valleyImg) valleyImg.style.transform = 'scale(1.02)';
    document.querySelectorAll('.rv').forEach((el) => el.classList.add('is-in'));
  }

  /* ─────────────── ledger form ─────────────── */
  const form = document.getElementById('ledgerForm');
  const success = document.getElementById('ledgerSuccess');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('ledgerName');
      if (!input.value.trim()) {
        input.focus();
        input.style.borderBottomColor = 'var(--coral-deep)';
        setTimeout(() => { input.style.borderBottomColor = ''; }, 1600);
        return;
      }
      form.closest('.ledger__card').classList.add('is-done');
      success.hidden = false;
    });
  }

  /* ─────────────── capture helper (?snap&to=<id>&p=<0..1>) ─────────────── */
  if (SNAP && PARAMS.get('to')) {
    const jump = () => {
      const el = document.getElementById(PARAMS.get('to'));
      if (!el) return;
      const p = parseFloat(PARAMS.get('p') || '0');
      const y = el.getBoundingClientRect().top + window.scrollY
        + p * Math.max(0, el.offsetHeight - window.innerHeight);
      window.scrollTo(0, y);
    };
    if (document.readyState === 'complete') jump();
    else window.addEventListener('load', jump);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(jump);
    setTimeout(jump, 800);
  }
})();
