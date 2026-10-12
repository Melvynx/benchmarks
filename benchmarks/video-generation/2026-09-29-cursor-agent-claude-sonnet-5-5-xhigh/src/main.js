import { S, T, b, DURATION } from "./timing.js";

const gsap = window.gsap;
gsap.ticker.lagSmoothing(0);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, z = 1) => Math.min(z, Math.max(a, v));
const lerp = (a, z, p) => a + (z - a) * p;
const eOut3 = (p) => 1 - Math.pow(1 - p, 3);
const eIO3 = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const fmt = (n) => Math.round(n).toLocaleString("en-US");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const svgUse = (id, cls = "ic") => `<svg class="${cls}"><use href="#${id}"/></svg>`;

await Promise.all([
  document.fonts.load('600 120px "Geist"'),
  document.fonts.load('500 40px "Geist"'),
  document.fonts.load('400 30px "Geist"'),
  document.fonts.load('700 40px "Geist"'),
  document.fonts.load('400 24px "Geist Mono"'),
  document.fonts.load('500 24px "Geist Mono"'),
]);
await document.fonts.ready;
await Promise.all([...document.images].map((i) => i.decode().catch(() => {})));

const tl = gsap.timeline({ paused: true });

function IN(t, from, to, at) {
  gsap.set(t, from);
  return tl.fromTo(t, from, { ...to, immediateRender: false }, at);
}
const TO = (t, vars, at) => tl.to(t, vars, at);
const SET = (t, vars, at) => tl.set(t, vars, at);

function splitWords(el) {
  const kids = [...el.childNodes];
  el.textContent = "";
  const mis = [];
  const add = (node) => {
    const ml = document.createElement("span");
    ml.className = "ml";
    const mi = document.createElement("span");
    mi.className = "mi";
    mi.appendChild(node);
    ml.appendChild(mi);
    el.appendChild(ml);
    mis.push(mi);
  };
  kids.forEach((k) => {
    if (k.nodeType === 3) {
      k.textContent.split(/(\s+)/).forEach((p) => {
        if (!p) return;
        if (/^\s+$/.test(p)) el.appendChild(document.createTextNode(" "));
        else add(document.createTextNode(p));
      });
    } else if (k.nodeType === 1) add(k);
  });
  return mis;
}

function pos(el) {
  let x = 0, y = 0, n = el;
  while (n && !n.classList.contains("cam")) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/* ---------- procedural registries (absolute-time, seek-safe) ---------- */
const typers = [];
const counters = [];
const states = [];
const punches = [];

function typeText(el, text, t0, dur, { prefix = "", caretUntil = t0 + dur + 0.7, plain = false } = {}) {
  typers.push({ el, text, t0, dur, prefix, caretUntil, last: null });
}
function counter(el, from, to, t0, dur, f = fmt, ease = eOut3) {
  counters.push({ el, from, to, t0, dur, f, ease, last: null });
}
function state(fn) {
  states.push(fn);
}
function punch(t, amp = 0.03) {
  punches.push([t, amp]);
}

/* ============================================================
   TRANSITIONS
   ============================================================ */
function flood(a, bb, [t0, tm, t1]) {
  const closed = "inset(100% 0% 0% 0%)";
  const full = "inset(0% 0% 0% 0%)";
  const gone = "inset(0% 0% 100% 0%)";
  gsap.set([a, bb], { clipPath: closed });
  tl.fromTo(a, { clipPath: closed }, { clipPath: full, duration: tm - t0 - 0.1, ease: "power3.inOut", immediateRender: false }, t0);
  tl.fromTo(bb, { clipPath: closed }, { clipPath: full, duration: tm - t0 - 0.1, ease: "power3.inOut", immediateRender: false }, t0 + 0.1);
  tl.fromTo(bb, { clipPath: full }, { clipPath: gone, duration: t1 - tm - 0.1, ease: "power3.inOut", immediateRender: false }, tm);
  tl.fromTo(a, { clipPath: full }, { clipPath: gone, duration: t1 - tm - 0.1, ease: "power3.inOut", immediateRender: false }, tm + 0.1);
}
flood("#fl1a", "#fl1b", T.flood1);
flood("#fl6a", "#fl6b", T.flood6);

IN("#s3", { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: "expo.inOut" }, T.slide2[0]);
TO("#s2", { yPercent: -14, duration: 0.6, ease: "expo.inOut" }, T.slide2[0]);
IN("#s4", { xPercent: 100 }, { xPercent: 0, duration: 0.6, ease: "expo.inOut" }, T.slide3[0]);
TO("#s3", { xPercent: -16, duration: 0.6, ease: "expo.inOut" }, T.slide3[0]);
IN("#s5", { opacity: 0 }, { opacity: 1, duration: 0.55, ease: "power2.inOut" }, T.fade4[0]);
IN("#s6", { yPercent: -100 }, { yPercent: 0, duration: 0.6, ease: "expo.inOut" }, T.slide5[0]);
TO("#s5", { yPercent: 14, duration: 0.6, ease: "expo.inOut" }, T.slide5[0]);
IN("#s8a", { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration: 0.55, ease: "power3.out" }, T.zoom7[0]);
TO("#s7", { scale: 1.14, opacity: 0.3, duration: 0.55, ease: "power2.in" }, T.zoom7[0]);
IN("#s8b", { clipPath: "circle(0px at 50% 50%)" }, { clipPath: "circle(1300px at 50% 50%)", duration: 0.6, ease: "power3.inOut" }, T.iris8[0]);

/* ============================================================
   S1 · PAIN
   ============================================================ */
{
  const cuts = [b(0.5), b(2.5), b(4.5), b(6.5)];
  const lines = (id) => `${id} .ln>span`;
  const wordIn = (id, t) => IN(lines(id), { yPercent: 130 }, { yPercent: 0, duration: 0.75, ease: "expo.out", stagger: 0.07 }, t);
  const wordOut = (id, t) => TO(lines(id), { yPercent: -130, duration: 0.26, ease: "power3.in", stagger: 0.03 }, t);

  // settings card rows
  const widths = [230, 170, 280, 210, 250];
  $("#setcard").innerHTML = widths.map((w) => `<div class="setrow"><s style="width:${w}px"></s><div class="tog"></div></div>`).join("");
  const togs = $$(".tog", $("#setcard"));

  // clock ticks
  $("#ticks").innerHTML = Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    const r1 = i % 3 === 0 ? 168 : 184;
    return `<line x1="${230 + Math.sin(a) * r1}" y1="${230 - Math.cos(a) * r1}" x2="${230 + Math.sin(a) * 198}" y2="${230 - Math.cos(a) * 198}"/>`;
  }).join("");

  gsap.set(".frag", { autoAlpha: 0 });
  IN("#p-kicker", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" }, 0.05);

  // beat 1 : templates
  wordIn("#pw1", cuts[0]);
  SET("#f1", { autoAlpha: 1 }, cuts[0]);
  IN("#tpl1", { y: 700, rotation: 16, opacity: 0 }, { y: 0, rotation: -7, opacity: 1, duration: 0.9, ease: "expo.out" }, cuts[0] + 0.05);
  IN("#tpl2", { y: 800, rotation: -14, opacity: 0 }, { y: 0, rotation: 5, opacity: 1, duration: 0.9, ease: "expo.out" }, cuts[0] + 0.13);
  IN("#tpl3", { y: 900, rotation: 12, opacity: 0 }, { y: 0, rotation: -3, opacity: 1, duration: 0.9, ease: "expo.out" }, cuts[0] + 0.21);
  IN("#tpl2 .x", { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(3)" }, cuts[0] + 0.55);
  wordOut("#pw1", cuts[1] - 0.3);
  TO(["#tpl1", "#tpl2", "#tpl3"], { y: -900, rotation: "+=22", duration: 0.32, ease: "power3.in", stagger: 0.04 }, cuts[1] - 0.34);
  SET("#f1", { autoAlpha: 0 }, cuts[1] + 0.5);

  // beat 2 : settings
  wordIn("#pw2", cuts[1]);
  SET("#f2", { autoAlpha: 1 }, cuts[1]);
  IN("#setcard", { y: 700, rotation: 8, opacity: 0 }, { y: 0, rotation: -3, opacity: 1, duration: 0.9, ease: "expo.out" }, cuts[1] + 0.05);
  wordOut("#pw2", cuts[2] - 0.3);
  TO("#setcard", { y: 800, rotation: 14, opacity: 0, duration: 0.3, ease: "power3.in" }, cuts[2] - 0.32);
  SET("#f2", { autoAlpha: 0 }, cuts[2] + 0.5);

  // beat 3 : Tuesday night
  wordIn("#pw3", cuts[2]);
  SET("#f3", { autoAlpha: 1 }, cuts[2]);
  IN("#clockwrap", { scale: 0.3, opacity: 0, rotation: -60 }, { scale: 1, opacity: 1, rotation: 0, duration: 0.85, ease: "back.out(1.5)" }, cuts[2] + 0.05);
  wordOut("#pw3", cuts[3] - 0.3);
  TO("#clockwrap", { scale: 0.7, opacity: 0, rotation: 30, duration: 0.3, ease: "power3.in" }, cuts[3] - 0.32);
  SET("#f3", { autoAlpha: 0 }, cuts[3] + 0.5);

  // beat 4 : 2019
  wordIn("#pw4", cuts[3]);
  SET("#f4", { autoAlpha: 1 }, cuts[3]);
  IN("#oldmail", { y: 800, rotation: 14, opacity: 0 }, { y: 0, rotation: -2.5, opacity: 1, duration: 0.95, ease: "expo.out" }, cuts[3] + 0.05);

  cuts.forEach((c) => punch(c, 0.035));

  const clockStart = cuts[2] + 0.1;
  const frags = [$("#f1"), $("#f2"), $("#f3"), $("#f4")];
  state((t) => {
    frags.forEach((f, i) => (f.style.transform = `translateY(${Math.sin(t * 2.2 + i * 1.3) * 7}px)`));
    // toggles flicker
    const on = t >= cuts[1] + 0.3;
    togs.forEach((tg, i) => {
      const f = Math.floor((t - cuts[1] - 0.25) * 7 + i * 1.7);
      const k = on && f % 3 !== 0 ? 34 : 0;
      tg.style.setProperty("--k", k + "px");
      tg.style.background = k ? "#ff3300" : "#2a2f36";
    });
    // clock
    const p = eOut3(clamp((t - clockStart) / 0.85));
    const m = 8 * 60 + 3 + p * 224;
    $("#hand-m").setAttribute("transform", `rotate(${(m % 60) * 6} 230 230)`);
    $("#hand-h").setAttribute("transform", `rotate(${(m / 60) * 30} 230 230)`);
    const h = Math.floor(m / 60) % 12 || 12;
    const mm = String(Math.floor(m % 60)).padStart(2, "0");
    const txt = `TUE · ${h}:${mm} PM`;
    if ($("#clocklab").textContent !== txt) $("#clocklab").textContent = txt;
  });
}

/* ============================================================
   S2 · REVEAL
   ============================================================ */
{
  const a = S.s2;
  const L = $("#lockup");
  gsap.set(L, { xPercent: -50, yPercent: -50, transformOrigin: "50% 50%" });
  const lw = L.offsetWidth;
  const sc = 0.22;
  IN("#lockup img", { scale: 0.3, rotation: -40, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: "back.out(1.7)" }, a + 0.12);
  IN("#lockup span", { opacity: 0, x: -50, clipPath: "inset(-12% 100% -12% 0%)" }, { opacity: 1, x: 0, clipPath: "inset(-12% -12% -12% 0%)", duration: 0.75, ease: "expo.out" }, a + 0.28);
  TO(L, { x: 171 + (lw * sc) / 2 - 960, y: 56 - 540, scale: sc, duration: 0.75, ease: "expo.inOut" }, a + 1.25);
  punch(a + 0.12, 0.025);

  IN("#nav", { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, a + 1.6);

  const h = a + 1.55;
  IN("#hero-pill", { y: 26, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "expo.out" }, h);
  IN("#hero-h .mi", { yPercent: 130 }, { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: 0.06 }, h + 0.1);
  IN("#chip-ai", { scale: 0.3, opacity: 0, y: 40, rotation: -10 }, { scale: 1, opacity: 1, y: 0, rotation: 0, duration: 0.7, ease: "back.out(2)" }, h + 0.22);
  IN("#chip-ai svg", { rotation: -120, scale: 0.4 }, { rotation: 0, scale: 1, duration: 0.8, ease: "back.out(2)" }, h + 0.3);
  IN("#chip-mail", { scale: 0.3, opacity: 0, y: 40, rotation: 8 }, { scale: 1, opacity: 1, y: 0, rotation: 0, duration: 0.7, ease: "back.out(2)" }, h + 0.55);
  IN("#hero-p", { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }, h + 0.95);
  IN("#hero-cta", { y: 44, opacity: 0, scale: 0.92 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)" }, h + 1.15);
  TO("#hero-cta .btn", { scale: 1.06, duration: 0.25, ease: "power2.out", yoyo: true, repeat: 1 }, h + 2.05);
  punch(h + 0.4, 0.012);
}

/* ============================================================
   S3 · MIGRATE
   ============================================================ */
{
  const a = S.s3;
  IN("#s3-wash", { opacity: 0, y: 70, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.95, ease: "expo.out" }, a + 0.05);
  IN("#s3-term", { opacity: 0, y: 90, rotation: -2.5 }, { opacity: 1, y: 0, rotation: 0, duration: 0.95, ease: "expo.out" }, a + 0.15);
  IN("#s3-pill", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, a + 0.2);
  const words = splitWords($("#s3-h"));
  IN(words, { yPercent: 130 }, { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.05 }, a + 0.3);
  gsap.set("#s3-hl", { "--hp": 0 });
  tl.fromTo("#s3-hl", { "--hp": 0 }, { "--hp": 1, duration: 0.55, ease: "expo.inOut", immediateRender: false }, a + 1.15);
  IN("#s3-steps li", { opacity: 0, x: -34 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out", stagger: 0.24 }, a + 1.7);
  IN("#migrate", { y: 130 }, { y: 0, duration: 0.85, ease: "expo.out" }, a + 0.55);

  typeText($("#m-prompt"), "migrate everything from Mailchimp", a + 0.7, 1.0, { prefix: '<span class="pt">&gt;</span> ' });
  const rows = [
    ["#m-l1", "#m-r1", "#m-n1", 12847, a + 1.95],
    ["#m-l2", "#m-r2", "#m-n2", 14, a + 2.75],
    ["#m-l3", "#m-r3", "#m-n3", 3, a + 3.55],
  ];
  rows.forEach(([l, r, n, v, t]) => {
    IN(l, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, t);
    IN(r, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, t + 0.18);
    counter($(n), 0, v, t + 0.18, v > 100 ? 0.75 : 0.45);
  });
  IN("#m-done", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, a + 4.35);
  IN("#m-stamp", { scale: 3, opacity: 0, rotation: -20 }, { scale: 1, opacity: 1, rotation: 8, duration: 0.5, ease: "back.out(2.2)" }, a + 4.45);
  punch(a + 4.5, 0.03);
  [a + 0.7, a + 1.95, a + 2.75, a + 3.55].forEach((t) => punch(t + 0.05, 0.006));

  // brand marquee
  const brands = [
    ["Mailchimp", "#ffe01b", "#1a1614", "M"],
    ["Kit", "#fb6970", "#fff", "K"],
    ["Brevo", "#0b996e", "#fff", "B"],
    ["Systeme.io", "#1e88e5", "#fff", "S"],
    ["beehiiv", "#ffd23f", "#1a1614", "b"],
    ["ActiveCampaign", "#356ae6", "#fff", "A"],
    ["MailerLite", "#09c269", "#fff", "M"],
    ["Resend", "#111111", "#fff", "R"],
  ];
  const one = brands.map(([n, bg, fg, l]) => `<span class="brand-chip"><i style="background:${bg};color:${fg}">${l}</i>${n}</span>`).join("");
  const track = $("#mig-track");
  track.innerHTML = one + one + one;
  const kids = track.children;
  const loopW = kids[brands.length].offsetLeft - kids[0].offsetLeft;
  state((t) => {
    track.style.transform = `translateX(${230 - (((t - a) * 120) % loopW)}px)`;
  });
}

/* ============================================================
   S4 · AGENT
   ============================================================ */
{
  const a = S.s4;
  IN("#s4-wash", { opacity: 0, y: 70, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.95, ease: "expo.out" }, a + 0.05);
  IN("#s4-term", { opacity: 0, y: 90, rotation: 2.5 }, { opacity: 1, y: 0, rotation: 0, duration: 0.95, ease: "expo.out" }, a + 0.15);
  IN("#s4-pill", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, a + 0.22);
  const words = splitWords($("#s4-h"));
  IN(words, { yPercent: 130 }, { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.06 }, a + 0.32);
  IN("#s4-p", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, a + 0.95);
  IN("#seg", { opacity: 0, y: 40, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: "expo.out" }, a + 1.25);
  IN("#a-send", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out" }, a + 1.6);
  IN("#a-126", { autoAlpha: 0, scale: 0.4, y: 20 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.6, ease: "back.out(2.4)" }, a + 1.4);
  gsap.set("#seg-tag", { opacity: 0, scale: 0.6 });

  typeText($("#a-prompt"), "who clicked the pricing link but never bought?", a + 0.8, 1.15, { prefix: '<span class="pt">&gt;</span> ' });
  const rows = [
    ["#a-l1", "#a-r1", "#a-n1", 312, a + 2.35],
    ["#a-l2", "#a-r2", "#a-n2", 312, a + 3.15],
    ["#a-l3", "#a-r3", "#a-n3", 312, a + 3.95],
  ];
  rows.forEach(([l, r, n, v, t]) => {
    IN(l, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, t);
    IN(r, { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.35, ease: "power3.out" }, t + 0.18);
    counter($(n), 0, v, t + 0.18, 0.55);
  });
  IN("#a-done", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, a + 4.75);
  IN("#a-input", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, a + 5.05);
  typeText($("#a-input"), "show me the numbers on Thursday", a + 5.25, 0.95, { prefix: '<span class="pt">&gt;</span> ', caretUntil: 999 });
  SET("#seg-tag", { opacity: 1, scale: 1 }, a + 3.2);
  TO("#seg-tag", { scale: 1.12, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, a + 3.2);

  // dots field
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const cols = 26, nrows = 5;
  const dotsEl = $("#dots");
  const dots = [];
  for (let r = 0; r < nrows; r++)
    for (let c = 0; c < cols; c++) {
      const el = document.createElement("i");
      el.style.cssText = `position:absolute;left:${c * 24.6}px;top:${r * 26}px;width:14px;height:14px;border-radius:50%;background:#e6e1da`;
      dotsEl.appendChild(el);
      dots.push({ el, hit: rnd() < 0.36, delay: c * 0.016 + rnd() * 0.16 });
    }
  const tHL = a + 2.4;
  const segLab = $("#seg-lab");
  state((t) => {
    dots.forEach((d) => {
      const on = t >= tHL + d.delay;
      const dt = t - (tHL + d.delay);
      if (on && d.hit) {
        d.el.style.background = "#ff633d";
        d.el.style.transform = `scale(${1 + 0.7 * Math.exp(-dt * 12)})`;
      } else if (on) {
        d.el.style.background = "#efece7";
        d.el.style.transform = "scale(1)";
      } else {
        d.el.style.background = "#e6e1da";
        d.el.style.transform = "scale(1)";
      }
    });
    const p = eIO3(clamp((t - tHL) / 0.8));
    const txt = `${fmt(lerp(12847, 312, p))} subscribers`;
    if (segLab.textContent !== txt) segLab.textContent = txt;
  });

  // cursor + click
  const btn = pos($("#a-send"));
  const cx = btn.x + btn.w * 0.5 - 8;
  const cy = btn.y + btn.h * 0.5 - 6;
  IN("#cursor", { autoAlpha: 0, x: 1580, y: 1010 }, { autoAlpha: 1, duration: 0.2 }, a + 5.55);
  TO("#cursor", { x: cx, y: cy, duration: 0.95, ease: "power3.inOut" }, a + 5.55);
  const tClick = a + 6.55;
  TO("#cursor", { scale: 0.8, duration: 0.07, ease: "power2.in" }, tClick);
  TO("#cursor", { scale: 1, duration: 0.25, ease: "back.out(3)" }, tClick + 0.07);
  TO("#a-send", { scale: 0.94, duration: 0.07, ease: "power2.in" }, tClick);
  TO("#a-send", { scale: 1, duration: 0.4, ease: "back.out(3)" }, tClick + 0.07);
  TO("#cursor", { autoAlpha: 0, duration: 0.25 }, tClick + 0.55);
  const ring = document.createElement("div");
  ring.style.cssText = `position:absolute;left:${btn.x + btn.w / 2 - 60}px;top:${btn.y + btn.h / 2 - 60}px;width:120px;height:120px;border-radius:50%;border:5px solid #ff3300;opacity:0;pointer-events:none`;
  $("#s4-col").appendChild(ring);
  IN(ring, { scale: 0.4, opacity: 0.9 }, { scale: 4.2, opacity: 0, duration: 0.7, ease: "power2.out" }, tClick + 0.05);
  punch(tClick + 0.05, 0.03);
  const sendT = $("#a-send-t");
  const sendI = $("#a-send-i use");
  state((t) => {
    const txt = t >= tClick + 0.04 ? "Sent to 312 subscribers" : "Send to 312 subscribers";
    if (sendT.textContent !== txt) {
      sendT.textContent = txt;
      sendI.setAttribute("href", t >= tClick + 0.04 ? "#i-check" : "#i-arrow");
    }
  });
}

/* ============================================================
   S5 · EDITOR + WORKFLOW
   ============================================================ */
{
  const a = S.s5;
  const wash = $("#s5 .wash");
  IN(wash, { opacity: 0, y: 60, scale: 0.96 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "expo.out" }, a + 0.1);
  IN("#e-card", { opacity: 0, y: 80, rotation: 2 }, { opacity: 1, y: 0, rotation: 0, duration: 0.9, ease: "expo.out" }, a + 0.2);
  IN("#e-pill", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, a + 0.2);
  const words = splitWords($("#e-title"));
  IN(words, { yPercent: 130 }, { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.06 }, a + 0.3);
  IN("#e-lead", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, a + 0.75);

  typeText($("#e-h"), "Welcome, start here", a + 0.7, 0.85, { caretUntil: a + 1.6 });
  IN("#e-p1", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, a + 1.45);
  IN("#e-p2", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, a + 1.85);
  const tSel = a + 2.3, tTight = a + 2.85;
  IN("#e-pop", { autoAlpha: 0, scale: 0.4, y: 16 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.5, ease: "back.out(2.6)" }, tSel + 0.1);
  TO("#e-pop", { autoAlpha: 0, y: -14, duration: 0.3, ease: "power2.in" }, tTight + 0.55);
  const p2 = $("#e-p2"), p2t = $("#e-p2t"), pop = $("#e-pop"), words$ = $("#e-words"), head = $("#e-h");
  const long = "It shipped. Drag a trigger, an email and a wait. Publish once, and the sequence keeps running without you.";
  const short = "It shipped. Drag a trigger, an email, a wait. Publish once.";
  state((t) => {
    p2.classList.toggle("sel", t >= tSel && t < tTight + 0.35);
    const txt = t >= tTight ? short : long;
    if (p2t.textContent !== txt) p2t.textContent = txt;
    const popTxt = t >= tTight ? "Tightened" : "Tighten";
    const node = pop.lastChild;
    if (node.textContent !== popTxt) node.textContent = popTxt;
    const typed = head.textContent.replace(/\s/g, "").length ? head.textContent.trim().split(/\s+/).length : 0;
    const base = clamp((t - (a + 1.4)) / 0.9) * 68;
    const total = t >= tTight ? 58 : Math.round(base + typed);
    const w = t >= tTight ? Math.round(lerp(71, 58, eOut3(clamp((t - tTight) / 0.35)))) : total;
    if (words$.textContent !== String(w)) words$.textContent = String(w);
  });

  // switch to workflow
  const sw = a + 3.45;
  TO("#e-card", { opacity: 0, scale: 0.94, y: 30, duration: 0.4, ease: "power3.in" }, sw);
  TO("#s5-colA", { opacity: 0, y: -30, duration: 0.35, ease: "power3.in" }, sw);
  IN("#w-card", { autoAlpha: 0, scale: 1.05, y: 40 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.65, ease: "expo.out" }, sw + 0.25);
  IN("#s5-colB", { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out" }, sw + 0.3);
  const wWords = splitWords($("#w-title"));
  IN(wWords, { yPercent: 130 }, { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.06 }, sw + 0.4);
  IN("#w-lead", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, sw + 0.85);

  const pitch = 118, nh = 88;
  const nodes = [
    ["i-tag", "Tag added", "newsletter"],
    ["i-mail", "Send email", "Welcome, start here"],
    ["i-clock", "Wait", "2 days"],
    ["i-branch", "If opened", "the welcome email"],
  ];
  let html = "";
  nodes.forEach(([ic, t1, t2], i) => {
    html += `<div class="node" style="top:${i * pitch}px;height:${nh}px"><div class="ni">${svgUse(ic, "ic")}</div><div><div class="nt">${t1}</div><div class="ns">${t2}</div></div></div>`;
    if (i < nodes.length - 1) html += `<div class="wire" style="top:${i * pitch + nh}px;height:${pitch - nh}px"></div>`;
  });
  html += `<div class="wire" style="top:${3 * pitch + nh}px;height:28px"></div>`;
  html += `<div class="wire" style="top:${3 * pitch + nh + 28}px;left:140px;width:280px;height:2px;margin-left:0"></div>`;
  html += `<div class="wire" style="top:${3 * pitch + nh + 28}px;left:140px;height:22px;margin-left:-1px"></div>`;
  html += `<div class="wire" style="top:${3 * pitch + nh + 28}px;left:420px;height:22px;margin-left:-1px"></div>`;
  const by = 3 * pitch + nh + 50;
  html += `<div class="branch" style="top:${by}px;left:0"><i style="background:#0a7f64"></i>Yes · send follow-up</div>`;
  html += `<div class="branch" style="top:${by}px;left:290px"><i style="background:#b9b2a9"></i>No · wait</div>`;
  html += `<div class="travel" id="travel" style="top:0"></div>`;
  $("#wf").innerHTML = html;
  const wh = $("#w-card .win-head");
  wh.insertAdjacentHTML("beforeend", '<span class="badge-mono" id="w-live">Live</span>');

  const wt = sw + 0.55;
  IN("#wf .node", { opacity: 0, y: 26, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "expo.out", stagger: 0.2 }, wt);
  IN("#wf .wire", { opacity: 0 }, { opacity: 1, duration: 0.3, stagger: 0.12 }, wt + 0.2);
  IN("#wf .branch", { opacity: 0, y: 20, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "expo.out", stagger: 0.1 }, wt + 0.95);
  IN("#w-live", { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)" }, wt + 1.3);

  const tr = wt + 0.85;
  IN("#travel", { opacity: 0, scale: 0.2, x: 0, y: nh / 2 }, { opacity: 1, scale: 1, duration: 0.3, ease: "back.out(2)" }, tr);
  TO("#travel", { y: nh / 2 + pitch, duration: 0.3, ease: "power2.inOut" }, tr + 0.15);
  TO("#travel", { y: nh / 2 + pitch * 2, duration: 0.3, ease: "power2.inOut" }, tr + 0.5);
  TO("#travel", { y: nh / 2 + pitch * 3, duration: 0.3, ease: "power2.inOut" }, tr + 0.85);
  TO("#travel", { y: 3 * pitch + nh + 28, duration: 0.22, ease: "power2.inOut" }, tr + 1.2);
  TO("#travel", { x: -140, duration: 0.25, ease: "power2.inOut" }, tr + 1.42);
  TO("#travel", { y: by + 32, duration: 0.2, ease: "power2.in" }, tr + 1.67);
  TO("#travel", { scale: 0, opacity: 0, duration: 0.25, ease: "power2.in" }, tr + 1.9);
  punch(tr + 1.87, 0.012);
}

/* ============================================================
   S6 · TRANSACTIONAL
   ============================================================ */
{
  const a = S.s6;
  IN("#s6-wash", { opacity: 0, y: 70, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "expo.out" }, a + 0.05);
  IN("#s6-code", { opacity: 0, y: 90, rotation: -2 }, { opacity: 1, y: 0, rotation: 0, duration: 0.9, ease: "expo.out" }, a + 0.14);
  IN("#s6-pill", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, a + 0.22);
  IN("#s6-h .ln>span", { yPercent: 130 }, { yPercent: 0, duration: 0.8, ease: "expo.out", stagger: 0.14 }, a + 0.32);
  IN("#s6-p", { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out" }, a + 0.9);
  IN("#strk-i", { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "expo.inOut" }, a + 1.5);
  IN("#c-ok", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, a + 2.65);
  IN("#laneA", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, a + 1.5);
  IN("#laneB", { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.6, ease: "expo.out" }, a + 1.65);
  $("#otp").style.left = "0px";
  IN("#otp", { x: -340 }, { x: 292, duration: 0.85, ease: "expo.out" }, a + 2.95);
  punch(a + 2.95, 0.014);
  punch(a + 1.5, 0.008);

  state((t) => {
    const strk = $("#strk");
    strk.style.color = t >= a + 1.6 ? "#a9a29a" : "";
  });

  // code typing (tokenised)
  const src = `import { Lumail } from "lumail"

const lumail = new Lumail()

await lumail.emails.send({
  to: "sarah@acme.co",
  from: "hello@acme.co",
  subject: "Your login code",
  content: "# Your code\\n\\n{{code}}",
})`;
  const toks = [];
  const re = /("[^"]*")|\b(import|from|await|const|new)\b|(\/\/.*)/g;
  let last = 0, m;
  while ((m = re.exec(src))) {
    if (m.index > last) toks.push(["", src.slice(last, m.index)]);
    toks.push([m[1] ? "s" : m[2] ? "k" : "c", m[0]]);
    last = m.index + m[0].length;
  }
  if (last < src.length) toks.push(["", src.slice(last)]);
  const t0 = a + 0.75, dur = 1.85;
  const codeEl = $("#c-code");
  let lastN = -1;
  state((t) => {
    const n = Math.floor(clamp((t - t0) / dur) * src.length);
    const blink = t < t0 + dur + 0.9 && (t < t0 + dur || Math.floor(t * 2.2) % 2 === 0);
    const key = n + (blink ? "c" : "n");
    if (key === lastN) return;
    lastN = key;
    let left = n, html = "";
    for (const [c, s] of toks) {
      if (left <= 0) break;
      const part = s.slice(0, left);
      left -= part.length;
      html += c ? `<span class="${c}">${esc(part)}</span>` : esc(part);
    }
    codeEl.innerHTML = html + (blink ? '<span class="caret"></span>' : "");
  });

  // lane envelopes
  const laneA = $("#laneA");
  const envs = Array.from({ length: 20 }, (_, i) => {
    const e = document.createElement("i");
    e.className = "env";
    laneA.appendChild(e);
    return e;
  });
  state((t) => {
    envs.forEach((e, i) => {
      const x = ((i * 34 + (t - a) * 46) % 700) - 40;
      e.style.transform = `translateX(${x}px)`;
      e.style.opacity = 0.45 + 0.35 * Math.sin(i * 1.7);
    });
  });
}

/* ============================================================
   S7 · PRICING
   ============================================================ */
{
  const a = S.s7;
  IN("#s7-pill", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" }, a + 0.2);
  IN("#s7-h .ln>span", { yPercent: 130 }, { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: 0.14 }, a + 0.28);
  IN("#chip-strike", { scaleX: 0 }, { scaleX: 1, duration: 0.4, ease: "expo.inOut" }, a + 1.25);
  IN("#sub-card", { opacity: 0, y: 40, scale: 0.94, rotation: 2 }, { opacity: 1, y: 0, scale: 1, rotation: 0, duration: 0.8, ease: "expo.out" }, a + 0.85);
  counter($("#sub-n"), 0, 12847, a + 0.95, 0.9, fmt, eOut3);
  IN("#slider", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out" }, a + 1.15);

  const plans = [
    { n: "Free", p: "$0", d: "Everything working end to end, for nothing.", l: ["3,000 emails/month included", "2 team members", "10 AI credits/month", "Unlimited workflows"], b: "Start free" },
    { n: "Creator", p: "$20", d: "For a list that pays for itself.", l: ["40,000 emails/month included", "Then $7 / 10,000", "10 team members", "100 AI conversations/month"], b: "Start with Creator" },
    { n: "Pro", p: "$60", d: "More volume, more seats, a lower rate per email.", l: ["100,000 emails/month included", "Then $5 / 10,000", "25 team members", "300 AI conversations/month"], b: "Start with Pro" },
    { n: "Business", p: "$200", d: "High volume, more seats, lower rate per email.", l: ["400,000 emails/month included", "Then $4 / 10,000", "100 team members", "1,000 AI conversations/month"], b: "Start with Business" },
  ];
  const gap = (1580 - 4 * 372) / 3;
  $("#cards").innerHTML = plans
    .map(
      (p, i) =>
        `<div class="pcard" style="left:${170 + i * (372 + gap)}px;top:552px"><div class="pn">${p.n}</div><div class="pp">${p.p}<small>/month</small></div><div class="pt2">${p.d}</div><ul>${p.l.map((x) => `<li>${svgUse("i-check")}<span>${x}</span></li>`).join("")}</ul><div class="pb">${p.b}</div></div>`
    )
    .join("");
  const pcards = $$(".pcard");
  IN(pcards, { opacity: 0, y: 140 }, { opacity: 1, y: 0, duration: 0.85, ease: "expo.out", stagger: 0.09 }, a + 1.55);

  // slider ticks
  const W = 1580;
  const f = (v) => (Math.log(v) - Math.log(1000)) / (Math.log(400000) - Math.log(1000));
  [["20K", 20000], ["40K", 40000], ["100K", 100000], ["400K", 400000]].forEach(([lab, v]) => {
    const el = document.createElement("div");
    el.className = "tick";
    el.style.left = f(v) * W + "px";
    el.style.top = "108px";
    el.textContent = lab;
    $("#slider").appendChild(el);
  });
  const key = [
    [a + 1.6, 3000],
    [a + 2.0, 3000],
    [a + 2.75, 400000],
    [a + 3.55, 40000],
  ];
  const vAt = (t) => {
    if (t <= key[0][0]) return key[0][1];
    for (let i = 0; i < key.length - 1; i++) {
      const [t0, v0] = key[i], [t1, v1] = key[i + 1];
      if (t <= t1) {
        const p = eIO3(clamp((t - t0) / (t1 - t0)));
        return Math.exp(lerp(Math.log(v0), Math.log(v1), p));
      }
    }
    return key[key.length - 1][1];
  };
  const numbox = $("#numbox"), fill = $("#fill"), thumb = $("#thumb");
  let lastPlan = -1;
  state((t) => {
    let v = vAt(t);
    const steady = v === 3000 || v === 40000;
    v = steady ? v : Math.round(v / 100) * 100;
    const txt = fmt(v);
    if (numbox.textContent !== txt) numbox.textContent = txt;
    const fr = f(v);
    fill.style.width = fr * W + "px";
    thumb.style.left = fr * W + "px";
    const plan = v <= 3000 ? 0 : v <= 40000 ? 1 : v <= 100000 ? 2 : 3;
    if (plan !== lastPlan) {
      pcards.forEach((c, i) => c.classList.toggle("feat", i === plan));
      lastPlan = plan;
    }
  });
  punch(a + 1.25, 0.012);
}

/* ============================================================
   S8a · PROOF
   ============================================================ */
{
  const a = S.s8a;
  const quotes = [
    { q: "Lumail made me like email. It turned email from a side thing into the main marketing channel for my Linkhub business.", n: "Yannis", r: "Founder, Linkhub", img: "yannis", rot: -2.5 },
    { q: "I'm not a marketer, but email is powerful. Thanks to the Codex integration, Codex actually implements all the marketing for me.", n: "Nicolas", r: "Indie founder", img: "nicolas", rot: 0 },
    { q: "I was using MailerLite and sending emails was a constant stress. Now my agent reviews it, fixes it, and sends it for me. I've sent over 3 million emails with Lumail.", n: "Melvyn", r: "melvynx.com · 3M+ emails sent", img: "melvyn", rot: 2.5 },
  ];
  $("#tcards").innerHTML = quotes
    .map((x, i) => `<div class="tcard" style="left:${170 + i * 540}px;top:420px"><q>${x.q}</q><div class="who"><img src="img/${x.img}.png" alt=""><div><b>${x.n}</b><span>${x.r}</span></div></div></div>`)
    .join("");
  IN("#t-pill", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: "expo.out" }, a + 0.1);
  IN("#t-h .ln>span", { yPercent: 130 }, { yPercent: 0, duration: 0.8, ease: "expo.out" }, a + 0.16);
  $$(".tcard").forEach((c, i) => {
    IN(c, { opacity: 0, y: 260, rotation: quotes[i].rot * 3 }, { opacity: 1, y: 0, rotation: quotes[i].rot * 0.4, duration: 0.85, ease: "expo.out" }, a + 0.3 + i * 0.12);
  });
}

/* ============================================================
   S8b · CTA
   ============================================================ */
{
  const a = S.s8b;
  IN("#end-icon", { scale: 0.2, rotation: -60, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: 0.85, ease: "back.out(1.8)" }, a - 0.3);
  IN("#end-word", { opacity: 0, x: -50, clipPath: "inset(-12% 100% -12% 0%)" }, { opacity: 1, x: 0, clipPath: "inset(-12% -12% -12% 0%)", duration: 0.7, ease: "expo.out" }, a - 0.15);
  IN("#end-h .ln>span", { yPercent: 130 }, { yPercent: 0, duration: 0.85, ease: "expo.out", stagger: 0.14 }, a + 0.1);
  IN("#end-cta", { opacity: 0, y: 50, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: "back.out(1.6)" }, a + 0.75);
  IN("#end-foot", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.7, ease: "expo.out" }, a + 1.0);
  TO("#end-cta .btn", { scale: 1.06, duration: 0.3, ease: "power2.out", yoyo: true, repeat: 1 }, a + 1.9);
  punch(a + 0.1, 0.02);
  punch(a + 0.24, 0.02);
}

/* ============================================================
   PER-FRAME PROCEDURAL STEP
   ============================================================ */
const win = {
  s1: [-1, S.s2 - 0.0001],
  s2: [S.s2, S.s3],
  s3: [T.slide2[0], S.s4],
  s4: [T.slide3[0], S.s5],
  s5: [T.fade4[0], S.s6],
  s6: [T.slide5[0], S.s7],
  s7: [S.s7, S.s8a],
  s8a: [T.zoom7[0], S.s8b],
  s8b: [T.iris8[0], 999],
};
const sceneEls = Object.fromEntries(Object.keys(win).map((k) => [k, $("#" + k)]));
const camEls = Object.fromEntries(Object.keys(win).map((k) => [k, $("#" + k + " .cam")]));
const drift = {
  s1: [0, S.s2, 1.0, 1.02, 0, 0],
  s2: [S.s2, S.s3, 1.0, 1.035, 0, -6],
  s3: [S.s3, S.s4, 1.0, 1.03, -10, 0],
  s4: [S.s4, S.s5, 1.0, 1.03, 10, 0],
  s5: [S.s5, S.s6, 1.0, 1.03, 0, -8],
  s6: [S.s6, S.s7, 1.0, 1.035, -8, 0],
  s7: [S.s7, S.s8a, 1.0, 1.03, 0, -6],
  s8a: [S.s8a, S.s8b, 1.0, 1.03, 0, 0],
  s8b: [S.s8b, 45, 1.0, 1.04, 0, 0],
};
const stage = $("#stage");
const glow = $("#glow");

function proc(t) {
  for (const k in win) sceneEls[k].style.visibility = t >= win[k][0] && t <= win[k][1] ? "visible" : "hidden";
  stage.style.setProperty("--rx", ((t * 14) % 8.485).toFixed(3) + "px");

  let pv = 0;
  for (const [pt, amp] of punches) if (t >= pt) pv += amp * Math.exp(-(t - pt) * 9);
  for (const k in drift) {
    const [t0, t1, s0, s1, dx, dy] = drift[k];
    const p = clamp((t - t0) / (t1 - t0));
    camEls[k].style.transform = `translate(${dx * p}px,${dy * p}px) scale(${lerp(s0, s1, p) + pv})`;
  }
  glow.style.opacity = 0.75 + 0.25 * Math.sin(t * 3.1);

  for (const ty of typers) {
    const p = clamp((t - ty.t0) / ty.dur);
    const n = Math.floor(p * ty.text.length + 1e-6);
    const typing = p > 0 && p < 1;
    const caretOn = typing || (t < ty.caretUntil && Math.floor(t * 2.2) % 2 === 0);
    const html = ty.prefix + esc(ty.text.slice(0, n)) + (caretOn ? '<span class="caret"></span>' : "");
    if (html !== ty.last) {
      ty.el.innerHTML = html;
      ty.last = html;
    }
  }
  for (const c of counters) {
    const p = c.ease(clamp((t - c.t0) / c.dur));
    const txt = c.f(lerp(c.from, c.to, p));
    if (txt !== c.last) {
      c.el.textContent = txt;
      c.last = txt;
    }
  }
  for (const s of states) s(t);
}

window.__duration = DURATION;
window.__seek = (t) => {
  tl.time(clamp(t, 0, DURATION), false);
  proc(t);
  return t;
};
window.__seek(0);
window.__ready = true;
