import "@fontsource-variable/bodoni-moda/opsz.css";
import "@fontsource-variable/bodoni-moda/opsz-italic.css";
import "@fontsource-variable/eb-garamond/wght.css";
import "@fontsource-variable/eb-garamond/wght-italic.css";
import "@fontsource/ibm-plex-mono/400.css";
import "./styles.css";

import Lenis from "lenis";
import { initCabinet } from "./cabinet";
import { initGate } from "./gate";
import { HeroGL } from "./hero-gl";
import { initOracle } from "./oracle";
import { initPassage } from "./passage";
import {
  clamp,
  damp,
  finePointer,
  inView,
  lerp,
  onTick,
  pinProgress,
  range,
  reducedMotion,
  smoothstep,
  trackBox,
} from "./utils";

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel)!;
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll<T>(sel)];

document.documentElement.classList.toggle("is-fine", finePointer);
document.documentElement.classList.toggle("is-reduced", reducedMotion);

/* ---------- smooth scroll ---------- */

const lenis = reducedMotion ? null : new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
lenis?.stop();
if (lenis) onTick((time) => lenis.raf(time));
window.history.scrollRestoration = "manual";
window.scrollTo(0, 0);

$$<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
  a.addEventListener("click", (e) => {
    const id = a.getAttribute("href")!;
    const target = id === "#top" ? 0 : document.querySelector<HTMLElement>(id);
    if (target === null) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { duration: 2.6 });
    else if (typeof target === "number") window.scrollTo({ top: 0 });
    else target.scrollIntoView();
  });
});

/* ---------- text splitting ---------- */

function splitChars(el: HTMLElement) {
  let i = 0;
  const walk = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const ch of child.textContent ?? "") {
          if (ch === " ") {
            frag.append(" ");
            continue;
          }
          const s = document.createElement("span");
          s.className = "ch";
          s.textContent = ch;
          s.style.setProperty("--d", String(i++));
          s.style.setProperty("--r", (0.35 + Math.random() * 0.9).toFixed(2));
          s.style.setProperty("--rot", ((Math.random() - 0.5) * 50).toFixed(1));
          frag.append(s);
        }
        child.replaceWith(frag);
      } else walk(child);
    });
  };
  walk(el);
}

/** Wraps words; returns the word elements (and atomic children like chips) in reading order. */
function splitWords(el: HTMLElement, wrap: (word: string) => HTMLElement, atomic = ".chip") {
  const out: HTMLElement[] = [];
  const walk = (node: Node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = (child.textContent ?? "").split(/(\s+)/);
        const frag = document.createDocumentFragment();
        parts.forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) frag.append(" ");
          else {
            const w = wrap(part);
            out.push(w);
            frag.append(w);
          }
        });
        child.replaceWith(frag);
      } else if (child instanceof HTMLElement && child.matches(atomic)) {
        out.push(child);
      } else walk(child);
    });
  };
  walk(el);
  return out;
}

/* ---------- reveals ---------- */

const io = new IntersectionObserver(
  (entries) =>
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-in");
      io.unobserve(e.target);
    }),
  { threshold: 0.2, rootMargin: "0px 0px -8% 0px" },
);

$$(".reveal-lines").forEach((el) => {
  splitWords(el, (word) => {
    const outer = document.createElement("span");
    outer.className = "rw";
    const inner = document.createElement("span");
    inner.textContent = word;
    outer.append(inner);
    return outer;
  }).forEach((w, i) => w.firstElementChild instanceof HTMLElement && w.firstElementChild.style.setProperty("--i", String(i)));
  io.observe(el);
});
$$(".reveal").forEach((el) => io.observe(el));

/* ---------- cursor ---------- */

if (finePointer && !reducedMotion) {
  document.body.classList.add("has-cursor");
  const cursor = $(".cursor");
  const dot = $(".cursor__dot", cursor);
  const ring = $(".cursor__ring", cursor);
  const label = $(".cursor__label", cursor);
  const pos = { x: -100, y: -100, rx: -100, ry: -100 };
  let current = "";

  const labelFor = (el: Element | null) => {
    if (!el) return "";
    if (el.closest("input, textarea")) return "type";
    const tagged = el.closest<HTMLElement>("[data-cursor]");
    if (tagged) return tagged.dataset.cursor ?? "";
    if (el.closest(".hero__stage")) return "illuminate";
    if (el.closest(".passage")) return "walk on";
    if (el.closest("a, button")) return "open";
    return "";
  };

  const setLabel = (next: string) => {
    if (next === current) return;
    current = next;
    label.textContent = next;
    cursor.classList.toggle("is-label", !!next && next !== "type");
    cursor.classList.toggle("is-type", next === "type");
  };

  window.addEventListener("pointermove", (e) => {
    pos.x = e.clientX;
    pos.y = e.clientY;
    setLabel(labelFor(e.target as Element));
  });

  let lastScroll = window.scrollY;
  onTick(() => {
    if (window.scrollY === lastScroll || pos.x < 0) return;
    lastScroll = window.scrollY;
    setLabel(labelFor(document.elementFromPoint(pos.x, pos.y)));
  });
  document.addEventListener("pointerleave", () => cursor.classList.add("is-away"));
  document.addEventListener("pointerenter", () => cursor.classList.remove("is-away"));
  window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));

  onTick((_, dt) => {
    const k = damp(0.2, dt);
    pos.rx = lerp(pos.rx, pos.x, k);
    pos.ry = lerp(pos.ry, pos.y, k);
    dot.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
    ring.style.transform = `translate3d(${pos.rx}px, ${pos.ry}px, 0)`;
  });
}

/* ---------- hero ---------- */

const hero = $("#top");
const heroStage = $(".hero__stage", hero);
const heroBox = trackBox(hero);
$$(".ht", hero).forEach((el) => splitChars(el));

const coarse = !finePointer;
const heroSrc = window.innerWidth >= 900 ? "/img/still-life-2400.webp" : "/img/still-life-1400.webp";
const heroReady = HeroGL.create($<HTMLCanvasElement>(".hero__gl", hero), heroSrc, { coarse, reduced: reducedMotion })
  .catch(() => null)
  .then((gl) => {
    if (!gl) hero.classList.add("hero--nogl");
    return gl;
  });

let heroGL: HeroGL | null = null;
let lastHeroP = -1;
onTick((time, dt) => {
  if (!inView(heroBox)) return;
  const p = pinProgress(heroBox);
  if (p !== lastHeroP) {
    lastHeroP = p;
    heroStage.style.setProperty("--p", p.toFixed(4));
    heroStage.style.setProperty("--p2", range(p, 0.08, 0.7).toFixed(4));
    heroStage.style.setProperty("--after", (range(p, 0.7, 0.88) * (1 - range(p, 0.96, 1))).toFixed(4));
  }
  if (heroGL) {
    heroGL.reveal = smoothstep(0.06, 0.8, p);
    heroGL.frame(time, dt);
  }
});

/* ---------- ribbons ---------- */

$$(".ribbon").forEach((ribbon, idx) => {
  const track = $(".ribbon__track", ribbon);
  const unit = track.innerHTML;
  while (track.scrollWidth < window.innerWidth * 2.6) track.insertAdjacentHTML("beforeend", unit);
  track.insertAdjacentHTML("beforeend", track.innerHTML);
  const dir = idx === 0 ? -1 : 1;
  let x = dir > 0 ? -track.scrollWidth / 2 : 0;
  const box = trackBox(ribbon);
  onTick((_, dt) => {
    if (!inView(box, 100)) return;
    const v = lenis ? clamp(lenis.velocity, -60, 60) : 0;
    if (!reducedMotion) x += dir * (40 + Math.abs(v) * 14) * dt;
    const half = track.scrollWidth / 2;
    if (x <= -half) x += half;
    if (x > 0) x -= half;
    track.style.transform = `translate3d(${x.toFixed(2)}px,0,0) skewX(${(-v * 0.25).toFixed(2)}deg)`;
  });
});

/* ---------- manifesto ---------- */

{
  const text = $("[data-split]");
  const words = splitWords(text, (word) => {
    const s = document.createElement("span");
    s.className = "w";
    s.textContent = word;
    return s;
  });
  const box = trackBox(text);
  let lit = -1;
  onTick(() => {
    if (!inView(box)) return;
    const vh = window.innerHeight;
    const start = box.top - vh * 0.82;
    const end = box.top + box.height - vh * 0.42;
    const p = range(window.scrollY, start, end);
    const n = Math.round(p * words.length);
    if (n === lit) return;
    lit = n;
    words.forEach((w, i) => w.classList.toggle("is-on", i < n));
  });
}

/* ---------- folio ---------- */

{
  const num = $(".folio__num");
  const name = $(".folio__name");
  const fill = $(".folio__fill");
  const sections = $$<HTMLElement>("[data-canto]");
  const fio = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        num.textContent = el.dataset.canto ?? "";
        name.textContent = el.dataset.cantoName ?? "";
        document.body.dataset.canto = el.dataset.canto ?? "";
      }),
    { rootMargin: "-50% 0px -50% 0px" },
  );
  sections.forEach((s) => fio.observe(s));
  onTick(() => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    fill.style.transform = `scaleY(${(max > 0 ? window.scrollY / max : 0).toFixed(4)})`;
  });
}

/* ---------- sections ---------- */

initCabinet($("#cabinet"));
initPassage($("#passage"));
initOracle($("#oracle"));
initGate($("#gate"));

/* ---------- the gates ---------- */

{
  const gates = $(".gates");
  const count = $("[data-count]", gates);
  const t0 = performance.now();
  let target = 0.12;
  let shown = 0;
  let done = false;
  let opened = false;

  const stopCount = onTick((_, dt) => {
    shown = lerp(shown, target, damp(done ? 0.25 : 0.06, dt));
    count.textContent = String(Math.round(shown * 100)).padStart(3, "0");
  });

  const fonts = document.fonts.ready.then(() => (target = Math.max(target, 0.35)));
  const image = heroReady.then((gl) => {
    heroGL = gl;
    target = Math.max(target, 0.85);
    if (opened) gl?.ignite();
  });
  const timeout = new Promise((r) => window.setTimeout(r, 6000));

  Promise.race([Promise.all([fonts, image]), timeout]).then(() => {
    done = true;
    target = 1;
    const minDuration = reducedMotion ? 0 : 1700;
    window.setTimeout(
      () => {
        opened = true;
        gates.classList.add("is-open");
        document.body.classList.remove("is-loading");
        document.body.classList.add("is-ready");
        heroGL?.ignite();
        lenis?.start();
        window.setTimeout(
          () => {
            gates.classList.add("is-gone");
            stopCount();
          },
          reducedMotion ? 300 : 2200,
        );
      },
      Math.max(0, minDuration - (performance.now() - t0)),
    );
  });
}
