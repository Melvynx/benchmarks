(() => {
  const BPM = 128, BEAT = 60 / BPM, bt = (n) => n * BEAT;
  const T = {
    s1: 0, s2: bt(8), s3: bt(16), s4: bt(30), s5: bt(42), s6: bt(54),
    s7a: bt(64), s7b: bt(72), s8a: bt(84), s8b: bt(90), end: bt(96),
  };
  window.LUMAIL_TIMES = T;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const prog = (t, t0, d) => clamp((t - t0) / d);
  const eOut3 = (p) => 1 - Math.pow(1 - p, 3);
  const eOut4 = (p) => 1 - Math.pow(1 - p, 4);
  const eIO = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const dyn = [];
  const tl = gsap.timeline({ paused: true });

  const HID = {
    up: 'inset(100% 0% 0% 0%)', down: 'inset(0% 0% 100% 0%)',
    left: 'inset(0% 0% 0% 100%)', right: 'inset(0% 100% 0% 0%)',
  };
  const FULL = 'inset(0% 0% 0% 0%)';

  function wipe(next, prev, Tm, dir, o = {}) {
    const dur = o.dur || 0.76, at = o.at || '50% 50%';
    const t0 = Tm - dur / 2, D = dur * 0.72;
    const hid = dir === 'circle' ? `circle(0% at ${at})` : HID[dir];
    const full = dir === 'circle' ? `circle(150% at ${at})` : FULL;
    if (o.c1) tl.set('#w1', { backgroundColor: o.c1 }, t0);
    if (o.c2) tl.set('#w2', { backgroundColor: o.c2 }, t0);
    tl.set(['#w1', '#w2'], { visibility: 'visible' }, t0);
    tl.set(next, { autoAlpha: 1, zIndex: 60 }, t0);
    tl.fromTo('#w1', { clipPath: hid }, { clipPath: full, duration: D, ease: 'power3.inOut' }, t0);
    tl.fromTo('#w2', { clipPath: hid }, { clipPath: full, duration: D, ease: 'power3.inOut' }, t0 + 0.06);
    tl.fromTo(next, { clipPath: hid }, { clipPath: full, duration: D, ease: 'power3.inOut' }, t0 + 0.12);
    const tEnd = t0 + D + 0.16;
    tl.set(['#w1', '#w2'], { visibility: 'hidden' }, tEnd);
    tl.set(next, { zIndex: 10, clipPath: 'none' }, tEnd);
    tl.set(prev, { autoAlpha: 0 }, tEnd);
  }

  function bugMode(mode, t) {
    const m = {
      ink: ['#1a1614', '#5f5853', 1],
      white: ['#ffffff', 'rgba(255,255,255,.55)', 1],
      flare: ['#ffffff', 'rgba(255,255,255,.85)', 0],
    }[mode];
    tl.to('#bugW', { color: m[0], duration: 0.2 }, t);
    tl.to('#bugU', { color: m[1], duration: 0.2 }, t);
    tl.to('#bugL', { opacity: m[2], duration: 0.2 }, t);
    tl.to('#bugD', { opacity: 1 - m[2], duration: 0.2 }, t);
  }

  function typing(target, text, t0, cps, caret, hold = 0.9) {
    const dur = text.length / cps;
    dyn.push((t) => {
      const n = Math.floor(clamp((t - t0) * cps, 0, text.length));
      target.textContent = t >= t0 ? text.slice(0, n) : '';
      if (caret) {
        const typingNow = t >= t0 - 0.08 && t < t0 + dur;
        const blink = t >= t0 + dur && t < t0 + dur + hold && Math.floor((t - t0 - dur) * 3.2) % 2 === 0;
        caret.style.visibility = typingNow || blink || (hold > 50 && t >= t0) ? 'visible' : 'hidden';
      }
    });
  }
  function counter(el, to, t0, dur, suffix = '') {
    dyn.push((t) => {
      const p = prog(t, t0, dur);
      el.textContent = fmt(to * eOut3(p)) + (p >= 1 ? suffix : '');
    });
  }
  function pop(sel, t, o = {}) {
    tl.fromTo(sel, { scale: o.from ?? 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: o.d ?? 0.55, ease: o.ease ?? 'back.out(2.2)' }, t);
  }
  function rise(sel, t, o = {}) {
    tl.fromTo(sel, { y: o.y ?? 34, opacity: 0 }, { y: 0, opacity: 1, duration: o.d ?? 0.7, ease: o.ease ?? 'expo.out', stagger: o.s ?? 0 }, t);
  }
  function words(sel, t, o = {}) {
    tl.fromTo(sel, { yPercent: 125 }, { yPercent: 0, duration: o.d ?? 0.85, ease: o.ease ?? 'expo.out', stagger: o.s ?? 0.08 }, t);
  }
  function drift(scene, t0, t1) {
    tl.fromTo(`${scene} .pan`, { scale: 1 }, { scale: 1.035, duration: t1 - t0, ease: 'none' }, t0);
  }

  async function build() {
    const fontLoads = [
      '400 20px Geist', '500 20px Geist', '600 20px Geist', '700 20px Geist', '800 20px Geist',
      '400 20px "Geist Mono"', '500 20px "Geist Mono"', '600 20px "Geist Mono"',
      'italic 400 20px "Instrument Serif"', '400 20px "Instrument Serif"', '600 20px Caveat',
    ].map((f) => document.fonts.load(f, 'Aa0'));
    await Promise.all(fontLoads);
    await document.fonts.ready;
    await $('#s8a img').decode().catch(() => {});

    /* ---------- measurements before any transforms ---------- */
    const wordEl = $('#s2 .word');
    const wordW = $('#s2 .word span').getBoundingClientRect().width;
    const lockW = 300 + 40 + wordW;
    const startX = (1920 - lockW) / 2;
    const slideDX = startX - 810;
    wordEl.style.left = startX + 340 + 'px';
    wordEl.style.width = wordW + 30 + 'px';

    const edRect = $('#ed').getBoundingClientRect();
    const oldPl = $$('#edOld .pl').map((e) => {
      const r = e.querySelector('.tx').getBoundingClientRect();
      return { x: r.left - edRect.left, xr: r.right - edRect.left, y: r.top - edRect.top };
    });
    const edOldH = $('#edOld').offsetHeight, pvOldH = $('#pvOld').offsetHeight;
    const edNewH = $('#edNew').offsetHeight, pvNewH = $('#pvNew').offsetHeight;
    const parRect = $('#edNew').getBoundingClientRect();
    const newStart = { x: parRect.left - edRect.left, y: parRect.top - edRect.top };

    /* slot machine */
    const slotNames = ['Kit', 'Brevo', 'beehiiv', 'MailerLite', 'Mailchimp'];
    const col = $('#slotCol');
    col.innerHTML = slotNames.map((n) => `<div>${n}</div>`).join('');
    const slot = $('#slot');
    slot.style.width = 'auto';
    slot.style.width = slot.getBoundingClientRect().width + 'px';
    const slotLine = $('#slotCol div').getBoundingClientRect().height;

    /* marquee content */
    const platforms = ['Mailchimp', 'Kit', 'Brevo', 'Systeme.io', 'beehiiv', 'ActiveCampaign', 'MailerLite', 'Resend'];
    const marq = $('#marqIn');
    marq.innerHTML = [...platforms, ...platforms, ...platforms].map((p) => `<span>${p}</span>`).join('');
    const marqLoop = marq.scrollWidth / 3;

    /* lane squares */
    const tr1 = $('#tr1');
    const SQ = 30, NSQ = 30;
    const squares = [];
    for (let i = 0; i < NSQ; i++) { const s = document.createElement('i'); s.className = 'sq'; tr1.appendChild(s); squares.push(s); }
    const laneW = tr1.getBoundingClientRect().width;

    /* ---------- S1 : hook (0 → 3.75) ---------- */
    tl.set('#s1', { autoAlpha: 1 }, 0);
    drift('#s1', 0, 3.6);
    tl.fromTo('#s1 .copy', { scale: 1.07, transformOrigin: '0% 50%' }, { scale: 1, duration: 1.1, ease: 'expo.out' }, 0);
    const rots = [-5, 4, -3, 5, 3, -4, 4];
    const chips = $$('#s1 .chip');
    chips.forEach((c, i) => {
      tl.fromTo(c, { scale: 0, rotation: rots[i] - 26, opacity: 0 }, { scale: 1, rotation: rots[i], opacity: 1, duration: 0.7, ease: 'back.out(2.4)' }, 0.32 + i * 0.09);
      tl.to(c, { y: (i % 2 ? 90 : -90), scale: 0.6, opacity: 0, rotation: rots[i] * 3, duration: 0.5, ease: 'power3.in' }, 1.95 + i * 0.04);
    });
    dyn.push((t) => chips.forEach((c, i) => { c.firstElementChild.style.transform = `translateY(${Math.sin(t * 2.2 + i * 1.3) * 7}px)`; }));
    tl.to('#s1 .sk-line', { scaleX: 1, duration: 0.34, ease: 'power3.inOut' }, 1.3);
    tl.to('#s1 .sk-t', { color: '#ff3300', duration: 0.25 }, 1.37);
    tl.to('#s1 .copy', { x: -18, duration: 0.5, ease: 'power2.inOut' }, 1.95);
    // circle wipe into the reveal
    tl.set('#w1', { visibility: 'visible', backgroundColor: '#ff3300' }, 2.55);
    tl.fromTo('#w1', { clipPath: 'circle(0% at 78% 58%)' }, { clipPath: 'circle(150% at 78% 58%)', duration: 0.6, ease: 'power3.in' }, 2.55);

    /* ---------- S2 : reveal (3.75 → 7.5) ---------- */
    const tSwap = 3.15;
    const tLand = T.s2;
    tl.set('#s2', { autoAlpha: 1 }, tSwap);
    tl.set('#s1', { autoAlpha: 0 }, tSwap);
    tl.set('#w1', { visibility: 'hidden' }, tSwap);
    tl.set('#morph', { visibility: 'visible' }, tSwap);
    tl.fromTo('#morph', { clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: 'inset(320px 810px 460px 810px round 66px)', duration: tLand - tSwap, ease: 'expo.inOut' }, tSwap);
    tl.set('#morph', { visibility: 'hidden' }, tLand);
    tl.set('#logoBig', { opacity: 1 }, tLand);
    tl.fromTo('#logoBig', { scale: 0.94 }, { scale: 1, duration: 0.6, ease: 'back.out(3)' }, tLand);
    tl.fromTo('#s2 .glow', { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.4, ease: 'expo.out' }, tLand - 0.1);
    $$('#s2 .ring').forEach((r, i) => {
      tl.fromTo(r, { scale: 1, opacity: 0.9 }, { scale: 3.4, opacity: 0, duration: 1.3, ease: 'expo.out' }, tLand + i * 0.16);
    });
    tl.fromTo('#lc1', { attr: { height: 0 } }, { attr: { height: 545 }, duration: 0.3, ease: 'power2.inOut' }, tLand + 0.12);
    tl.fromTo('#lc2', { attr: { width: 0 } }, { attr: { width: 480 }, duration: 0.28, ease: 'power2.out' }, tLand + 0.38);
    rise('#s2 .intro', tLand + 0.3, { y: 24, d: 0.8 });
    const tSlide = bt(10);
    tl.to('#logoBig', { x: slideDX, duration: 0.85, ease: 'expo.inOut' }, tSlide);
    tl.fromTo('#s2 .word span', { x: -(wordW + 120) }, { x: 0, duration: 0.85, ease: 'expo.inOut' }, tSlide);
    tl.to('#s2 .intro', { y: -6, duration: 0.5 }, tSlide);
    const tTag = bt(11) + 0.1;
    words('#s2 .tag .wi', tTag, { s: 0.09 });
    pop('#pAI', tTag + 0.35, { from: 0.4 });
    pop('#pMail', tTag + 0.55, { from: 0.4 });
    drift('#s2', tSwap, 7.6);

    /* ---------- S3 : agent (7.5 → 14.06) ---------- */
    wipe('#s3', '#s2', T.s3, 'up');
    tl.set(['#bug', '#bugU'], { opacity: 0 }, 0);
    tl.set('#bug', { opacity: 0 }, 0);
    tl.to(['#bug', '#bugU'], { opacity: 1, duration: 0.4 }, T.s3 + 0.1);
    bugMode('ink', T.s3 - 0.2);
    let b = T.s3;
    rise('#k3', b + 0.12, { y: 24 });
    words('#s3 .hd .wi', b + 0.2, { s: 0.09 });
    pop('#p3', b + 0.55, { from: 0.4 });
    rise('#s3sub', b + 0.85, { y: 26 });
    tl.fromTo('#s3card', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.95, ease: 'expo.out' }, b + 0.3);
    tl.set('#s3 .tl', { opacity: 0 }, 0);
    tl.set('#s3l0', { opacity: 1 }, 0);
    const line = (id, t) => tl.fromTo('#' + id, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power3.out' }, t);
    typing($('#s3l0 .ty'), 'who clicked the pricing link but never bought?', b + 0.95, 64, $('#s3l0 .caret'), 0.25);
    line('s3l1', b + 1.85); line('s3r1', b + 2.2); counter($('#s3r1 .cnt'), 312, b + 2.2, 0.5);
    line('s3l2', b + 2.75); line('s3r2', b + 3.1); counter($('#s3r2 .cnt'), 312, b + 3.1, 0.5);
    line('s3l3', b + 3.65); line('s3r3', b + 4.0); counter($('#s3r3 .cnt'), 312, b + 4.0, 0.5);
    line('s3l4', b + 4.55);
    typing($('#s3l4 .ty'), 'Done. The first email goes out in 2 hours.', b + 4.6, 64, $('#s3l4 .caret'), 99);
    tl.fromTo('#b126', { scale: 0, rotation: -24, opacity: 0 }, { scale: 1, rotation: 5, opacity: 1, duration: 0.7, ease: 'back.out(2.4)' }, b + 3.55);
    rise('#s3al', b + 2.7, { y: 14, d: 0.5 });
    rise('#s3apps .app', b + 2.8, { y: 26, s: 0.07, d: 0.6 });
    drift('#s3', T.s3, T.s4);

    /* ---------- S4 : editor (14.06 → 19.69) ---------- */
    wipe('#s4', '#s3', T.s4, 'left');
    b = T.s4;
    rise('#s4 .kick', b + 0.1, { y: 24 });
    words('#s4 .hd .wi', b + 0.18, { s: 0.14 });
    tl.fromTo('#ed', { y: 120, opacity: 0 }, { y: 0, opacity: 1, duration: 0.95, ease: 'expo.out' }, b + 0.3);
    tl.fromTo('#pv', { y: 140, opacity: 0 }, { y: 0, opacity: 1, duration: 0.95, ease: 'expo.out' }, b + 0.45);
    const subj = 'Launch day is here';
    typing($('#edSubj'), subj, b + 0.95, 34);
    typing($('#pvSubj'), subj, b + 0.98, 34);
    rise('#edHey', b + 1.4, { y: 18, d: 0.5 });
    rise('#pvHey', b + 1.45, { y: 18, d: 0.5 });
    pop('#edHey .var', b + 1.5, { from: 0.6, d: 0.5 });
    tl.fromTo('#edOld .pl .tx, #pvOld .pl .tx', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.09 }, b + 1.7);
    pop('#edBtn', b + 2.15, { from: 0.8, d: 0.5 });
    pop('#pvBtn', b + 2.2, { from: 0.8, d: 0.5 });
    // AI cursor rewrites the paragraph
    const cur = '#aicur';
    tl.set(cur, { x: 700, y: 420, opacity: 0 }, 0);
    const c0 = b + 2.35;
    tl.to(cur, { opacity: 1, duration: 0.2 }, c0);
    const cy = (i) => oldPl[i].y + 14;
    tl.to(cur, { x: oldPl[0].x, y: cy(0), duration: 0.45, ease: 'power3.inOut' }, c0);
    const hl = $$('#edOld .hlbg');
    const sweep = b + 2.85;
    oldPl.forEach((p, i) => {
      tl.to(cur, { x: p.xr - 30, y: cy(i), duration: 0.26, ease: 'power1.inOut' }, sweep + i * 0.26);
      tl.to(hl[i], { scaleX: 1, duration: 0.26, ease: 'power1.inOut' }, sweep + i * 0.26);
      if (i < 2) tl.to(cur, { x: oldPl[i + 1].x, duration: 0.001 }, sweep + (i + 1) * 0.26 - 0.001);
    });
    const tCol = b + 3.75;
    tl.to('#edOld', { height: 0, opacity: 0, duration: 0.5, ease: 'expo.inOut' }, tCol);
    tl.to('#pvOld', { height: 0, opacity: 0, duration: 0.5, ease: 'expo.inOut' }, tCol + 0.03);
    tl.set('#edNew, #pvNew', { height: 0 }, 0);
    tl.to('#edNew', { height: edNewH, duration: 0.5, ease: 'expo.inOut' }, tCol);
    tl.to('#pvNew', { height: pvNewH, duration: 0.5, ease: 'expo.inOut' }, tCol + 0.03);
    tl.to(cur, { x: newStart.x + 6, y: newStart.y + 42, duration: 0.5, ease: 'expo.inOut' }, tCol);
    const nl = ['Today it’s live.', 'Be one of the first to try it.'];
    const tNew = tCol + 0.35;
    [['#edNew', 0], ['#pvNew', 0.03]].forEach(([sel, dl]) => {
      const els = $$(sel + ' .ty');
      typing(els[0], nl[0], tNew + dl, 38);
      typing(els[1], nl[1], tNew + dl + 0.45, 48);
    });
    tl.to(cur, { x: newStart.x + 300, y: newStart.y + 88, duration: 0.5, ease: 'power2.inOut' }, tNew + 0.45);
    tl.to(cur, { opacity: 0, duration: 0.25 }, tNew + 1.15);
    rise('#edWhy', tNew + 0.5, { y: 12, d: 0.6 });
    rise('#pvWhy', tNew + 0.56, { y: 12, d: 0.6 });
    tl.fromTo('#tighter', { opacity: 0, scale: 0.5, rotation: -20 }, { opacity: 1, scale: 1, rotation: -7, duration: 0.55, ease: 'back.out(2.5)' }, tNew + 0.75);
    drift('#s4', T.s4, T.s5);

    /* ---------- S5 : workflows (19.69 → 25.31) ---------- */
    wipe('#s5', '#s4', T.s5, 'down');
    bugMode('white', T.s5 - 0.2);
    b = T.s5;
    rise('#s5 .kick', b + 0.1, { y: 24 });
    words('#s5 .hd .wi', b + 0.18, { s: 0.14 });
    tl.fromTo('#pubcard', { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: 'expo.out' }, b + 0.4);
    const nodes = ['nA', 'nB', 'nC', 'nD', 'nY', 'nN'];
    nodes.forEach((n, i) => pop('#' + n, b + 0.55 + i * 0.1, { from: 0.82, d: 0.6, ease: 'back.out(1.8)' }));
    tl.fromTo('#wires .wire', { opacity: 0 }, { opacity: 1, duration: 0.5 }, b + 0.9);
    tl.set('#s5 .ok', { scale: 0 }, 0);
    // publish switch
    const tSw = b + 1.35;
    tl.to('#swk', { x: 44, duration: 0.35, ease: 'back.out(2)' }, tSw);
    tl.to('#sw', { backgroundColor: '#ff3300', duration: 0.25 }, tSw);
    dyn.push((t) => { $('#pubTxt').textContent = t >= tSw + 0.1 ? 'Published' : 'Draft'; });
    const act = (id, t) => {
      tl.to('#' + id, { borderColor: 'rgba(255,74,28,.9)', backgroundColor: '#1d1512', duration: 0.3 }, t);
      tl.to('#' + id + ' .ico', { backgroundColor: '#ff3300', color: '#ffffff', duration: 0.3 }, t);
      if (!['nY', 'nN'].includes(id)) tl.to('#' + id + ' .ok', { scale: 1, duration: 0.45, ease: 'back.out(3)' }, t + 0.05);
      tl.fromTo('#' + id, { boxShadow: '0 0 0 0 rgba(255,51,0,.5)' }, { boxShadow: '0 0 0 22px rgba(255,51,0,0)', duration: 0.7, ease: 'power2.out' }, t);
    };
    const segs = [
      { p: 'wA', l: 'lA', a: b + 1.75, z: b + 2.1, k: 'pk1', to: 'nB' },
      { p: 'wB', l: 'lB', a: b + 2.45, z: b + 2.8, k: 'pk1', to: 'nC' },
      { p: 'wC', l: 'lC', a: b + 3.15, z: b + 3.5, k: 'pk1', to: 'nD' },
      { p: 'wY', l: 'lY', a: b + 3.85, z: b + 4.25, k: 'pk1', to: 'nY' },
      { p: 'wN', l: 'lN', a: b + 3.85, z: b + 4.25, k: 'pk2', to: 'nN' },
    ];
    act('nA', b + 1.65);
    segs.forEach((s) => act(s.to, s.z));
    const lens = {};
    segs.forEach((s) => { const el = $('#' + s.p); lens[s.p] = el.getTotalLength(); const l = $('#' + s.l); l.setAttribute('pathLength', '1'); l.style.strokeDasharray = '1'; l.style.strokeDashoffset = '1'; });
    dyn.push((t) => {
      const vis = { pk1: false, pk2: false };
      segs.forEach((s) => {
        const p = eIO(prog(t, s.a, s.z - s.a));
        $('#' + s.l).style.strokeDashoffset = String(1 - p);
        if (t >= s.a && t < s.z) {
          const pt = $('#' + s.p).getPointAtLength(lens[s.p] * p);
          $('#' + s.k).setAttribute('transform', `translate(${pt.x} ${pt.y})`);
          vis[s.k] = true;
        }
      });
      $('#pk1').style.opacity = vis.pk1 ? 1 : 0;
      $('#pk2').style.opacity = vis.pk2 ? 1 : 0;
    });
    drift('#s5', T.s5, T.s6);

    /* ---------- S6 : transactional (25.31 → 30.0) ---------- */
    wipe('#s6', '#s5', T.s6, 'right');
    bugMode('flare', T.s6 - 0.2);
    b = T.s6;
    rise('#s6 .kick', b + 0.1, { y: 24 });
    words('#s6 .hd .wi', b + 0.18, { s: 0.12 });
    rise('#s6sub', b + 0.85, { y: 24 });
    tl.fromTo('#code', { x: 120, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, b + 0.3);
    tl.fromTo('#lanes', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, b + 0.55);
    const codeChars = [31, 26, 24, 34, 31, 42, 4];
    codeChars.forEach((n, i) => {
      tl.fromTo('#c' + i, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.22, ease: `steps(${Math.min(n, 18)})` }, b + 0.85 + i * 0.25);
    });
    tl.fromTo('#c7', { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power3.out' }, b + 2.7);
    const laneStart = b + 0.9;
    tl.fromTo('#tr1 .sq', { opacity: 0 }, { opacity: 1, duration: 0.3 }, laneStart);
    dyn.push((t) => {
      const loop = NSQ * (SQ + 14);
      squares.forEach((s, i) => {
        const x = (((i * (SQ + 14) + (t - laneStart) * 140) % loop) + loop) % loop - 40;
        s.style.transform = `translateX(${x}px)`;
      });
    });
    const tOtp = b + 2.9;
    const otpW = 190, laneEnd = laneW - otpW - 150;
    tl.set('#otp', { x: 0, opacity: 0 }, 0);
    tl.fromTo('#otp', { opacity: 0, x: -10, scale: 0.8 }, { opacity: 1, x: 0, scale: 1, duration: 0.2 }, tOtp - 0.1);
    tl.to('#otp', { x: laneEnd, duration: 0.55, ease: 'expo.out' }, tOtp);
    tl.fromTo('#trail', { width: 0, opacity: 1 }, { width: laneEnd + 40, duration: 0.55, ease: 'expo.out' }, tOtp);
    tl.to('#trail', { opacity: 0, duration: 0.5 }, tOtp + 0.6);
    tl.fromTo('#dlv', { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(3)' }, tOtp + 0.4);
    drift('#s6', T.s6, T.s7a);

    /* ---------- S7a : migration (30.0 → 33.75) ---------- */
    wipe('#s7a', '#s6', T.s7a, 'left', { dur: 0.66 });
    bugMode('ink', T.s7a - 0.2);
    b = T.s7a;
    rise('#s7a .kick', b + 0.08, { y: 24 });
    words('#s7a .hd .wi', b + 0.12, { s: 0.1 });
    tl.fromTo('#slot', { scale: 0.7, opacity: 0, transformOrigin: '0% 50%' }, { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, b + 0.25);
    const tSlot0 = b + 0.35, tSlot1 = b + 1.75;
    dyn.push((t) => {
      const p = eOut4(prog(t, tSlot0, tSlot1 - tSlot0));
      col.style.transform = `translateY(${-(slotNames.length - 1) * slotLine * p}px)`;
    });
    tl.fromTo('#s7card', { y: 90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: 'expo.out' }, b + 0.25);
    tl.set('#s7card .tl', { opacity: 0 }, 0);
    tl.set('#m0', { opacity: 1 }, 0);
    typing($('#m0 .ty'), 'migrate everything from Mailchimp', b + 0.6, 66, $('#m0 .caret'), 0.2);
    line('m1', b + 1.2); line('m1r', b + 1.42); counter($('#m1r .cnt'), 12847, b + 1.42, 0.55);
    line('m2', b + 1.72); line('m2r', b + 1.9); counter($('#m2r .cnt'), 14, b + 1.9, 0.3);
    line('m3', b + 2.1); line('m3r', b + 2.28); counter($('#m3r .cnt'), 3, b + 2.28, 0.2);
    line('m4', b + 2.55);
    tl.fromTo('#stamp', { scale: 0.6, opacity: 0, transformOrigin: '0% 50%' }, { scale: 1, opacity: 1, duration: 0.55, ease: 'back.out(2.4)' }, b + 2.5);
    tl.fromTo(['.marq-l', '.marq'], { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, b + 0.45);
    dyn.push((t) => { marq.style.transform = `translateX(${-(((t - b) * 120) % marqLoop)}px)`; });
    drift('#s7a', T.s7a, T.s7b);

    /* ---------- S7b : pricing (33.75 → 39.375) ---------- */
    wipe('#s7b', '#s7a', T.s7b, 'down', { dur: 0.66 });
    bugMode('white', T.s7b - 0.2);
    b = T.s7b;
    rise('#s7b .kick', b + 0.1, { y: 24 });
    words('#s7b .hd .wi', b + 0.16, { s: 0.14 });
    rise('#never', b + 0.75, { y: 26 });
    tl.to('#never .sk-line', { scaleX: 1, duration: 0.5, ease: 'power3.inOut' }, b + 1.15);
    tl.fromTo('#meter', { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: 'expo.out' }, b + 0.95);
    counter($('#subBig'), 50000, b + 1.3, 1.6);
    dyn.push((t) => { $('#subBar').style.transform = `scaleX(${eOut3(prog(t, b + 1.3, 1.6))})`; });
    pop('#meter .fee', b + 1.55, { from: 0.6 });
    tl.fromTo('#pFree', { x: 90, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: 'expo.out' }, b + 0.5);
    tl.fromTo('#pCrt', { x: 120, opacity: 0, scale: 0.94 }, { x: 0, opacity: 1, scale: 1, duration: 0.95, ease: 'expo.out' }, b + 0.68);
    tl.fromTo('#s7b .plan li', { x: 24, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.08 }, b + 1.2);
    dyn.push((t) => { $('#pCrt').style.marginTop = Math.sin(t * 2.4) * 4 + 'px'; });
    drift('#s7b', T.s7b, T.s8a);

    /* ---------- S8a : proof (39.375 → 42.19) ---------- */
    wipe('#s8a', '#s7b', T.s8a, 'up', { dur: 0.66 });
    bugMode('ink', T.s8a - 0.2);
    b = T.s8a;
    rise('#s8a .top', b + 0.1, { y: 20 });
    tl.fromTo('#num8', { y: 60, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out' }, b + 0.15);
    counter($('#num8'), 3000000, b + 0.2, 1.3, '+');
    rise('#s8a .numl', b + 0.5, { y: 24 });
    tl.fromTo('#quote', { y: 90, opacity: 0 }, { y: 0, opacity: 1, duration: 0.85, ease: 'expo.out' }, b + 0.8);
    drift('#s8a', T.s8a, T.s8b);

    /* ---------- S8b : end card (42.19 → 45) ---------- */
    wipe('#s8b', '#s8a', T.s8b, 'circle', { dur: 0.7, at: '50% 60%' });
    tl.to(['#bug', '#bugU'], { opacity: 0, duration: 0.2 }, T.s8b - 0.25);
    b = T.s8b;
    tl.fromTo('#lock svg', { scale: 0, rotation: -14 }, { scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(2.4)' }, b + 0.2);
    tl.fromTo('#lockw', { x: -60, opacity: 0 }, { x: 0, opacity: 1, duration: 0.8, ease: 'expo.out' }, b + 0.3);
    rise('#tag8', b + 0.6, { y: 30, d: 0.8 });
    tl.fromTo('#cta', { scale: 0.7, opacity: 0, y: 20 }, { scale: 1, opacity: 1, y: 0, duration: 0.7, ease: 'back.out(2.2)' }, b + 0.95);
    rise('#fine', b + 1.3, { y: 16, d: 0.6 });
    $$('#s8b .ring').forEach((r, i) => {
      dyn.push((t) => {
        const p = (((t - b) * 0.42 + i * 0.5) % 1 + 1) % 1;
        r.style.transform = `scale(${0.5 + p * 2.2})`;
        r.style.opacity = String(0.6 * (1 - p) * clamp((t - b) / 0.6));
      });
    });
    dyn.push((t) => { $('#cta .b .ic').style.transform = `translateX(${Math.max(0, Math.sin((t - b - 1.6) * 5)) * 7}px)`; });
    drift('#s8b', T.s8b, T.end + 0.5);

    /* initial state hygiene */
    tl.set('#logoBig', { opacity: 0 }, 0);
    tl.set('#s2 .intro', { opacity: 0 }, 0);
    tl.set(['#s2 .word span'], { x: -(wordW + 120) }, 0);
    tl.set('#s2 .tag .pill', { opacity: 0 }, 0);
    tl.set('#b126, #tighter, #stamp', { opacity: 0 }, 0);
    tl.set('#s4 .hlbg', { scaleX: 0 }, 0);
    tl.set('#dlv', { opacity: 0 }, 0);
    tl.set('#cta, #fine, #tag8', { opacity: 0 }, 0);

    // Initialise every tween in chronological order so start values are captured deterministically.
    tl.time(T.end, false);
    for (const f of dyn) f(T.end);
    tl.time(0, false);
    for (const f of dyn) f(0);
    window.__duration = T.end;
  }

  window.seekTo = (t) => {
    tl.time(t, false);
    for (const f of dyn) f(t);
    return true;
  };
  window.__ready = build().then(() => true);
})();
