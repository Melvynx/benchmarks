import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;

const iris = document.getElementById("iris");
if (iris && !reduce) {
  requestAnimationFrame(() => iris.classList.add("is-open"));
} else if (iris) {
  iris.classList.add("is-open");
}

const notes = {
  bust: document.querySelector('.table__note [data-for="bust"]'),
  fruit: document.querySelector('.table__note [data-for="fruit"]'),
  wine: document.querySelector('.table__note [data-for="wine"]'),
  gold: document.querySelector('.table__note [data-for="gold"]'),
};

document.querySelectorAll(".obj").forEach((btn) => {
  const key = btn.dataset.note;
  const show = () => {
    document.querySelectorAll(".obj").forEach((b) => b.setAttribute("aria-expanded", "false"));
    document.querySelectorAll(".table__note p").forEach((p) => p.classList.remove("is-on"));
    btn.setAttribute("aria-expanded", "true");
    notes[key]?.classList.add("is-on");
  };
  btn.addEventListener("mouseenter", show);
  btn.addEventListener("focus", show);
  btn.addEventListener("click", show);
});

const cursor = document.getElementById("cursor");
if (cursor && finePointer && !reduce) {
  cursor.hidden = false;
  document.body.classList.add("has-cursor");
  let x = 0;
  let y = 0;
  let cx = 0;
  let cy = 0;
  window.addEventListener("pointermove", (e) => {
    x = e.clientX;
    y = e.clientY;
  });
  const tick = () => {
    cx += (x - cx) * 0.22;
    cy += (y - cy) * 0.22;
    cursor.style.transform = `translate(${cx - 10}px, ${cy - 10}px)`;
    requestAnimationFrame(tick);
  };
  tick();
  document.querySelectorAll("a, button, input, select, textarea").forEach((el) => {
    el.addEventListener("pointerenter", () => cursor.classList.add("is-hot"));
    el.addEventListener("pointerleave", () => cursor.classList.remove("is-hot"));
  });
}

const ledger = document.getElementById("ledger");
const reply = document.getElementById("ledgerReply");
ledger?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = new FormData(ledger);
  const name = String(data.get("name") || "").trim();
  const weather = String(data.get("weather") || "").trim();
  if (!name || !weather) {
    ledger.reportValidity();
    return;
  }
  reply.hidden = false;
  reply.textContent = `${name}: the steward has the letter. If a seat opens in ${weather.toLowerCase()}, you will be written to.`;
  ledger.querySelector(".ledger__act")?.setAttribute("hidden", "");
});

function stars() {
  const canvas = document.getElementById("stars");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let w = 0;
  let h = 0;
  let points = [];
  const pointer = { x: 0, y: 0 };

  const resize = () => {
    const rect = canvas.getBoundingClientRect();
    w = canvas.width = Math.floor(rect.width * devicePixelRatio);
    h = canvas.height = Math.floor(rect.height * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    const count = Math.min(220, Math.floor((rect.width * rect.height) / 9000));
    points = Array.from({ length: count }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      r: Math.random() * 1.4 + 0.2,
      a: Math.random() * 0.7 + 0.15,
      tw: Math.random() * Math.PI * 2,
    }));
  };

  resize();
  window.addEventListener("resize", resize);
  canvas.parentElement?.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    pointer.x = e.clientX - rect.left;
    pointer.y = e.clientY - rect.top;
  });

  const draw = (t) => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    for (const p of points) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const d = Math.hypot(dx, dy) || 1;
      const pull = reduce ? 0 : Math.min(18, 1400 / d);
      const x = p.x + (dx / d) * pull * -0.08;
      const y = p.y + (dy / d) * pull * -0.08;
      const twinkle = 0.55 + Math.sin(t * 0.0015 + p.tw) * 0.45;
      ctx.beginPath();
      ctx.fillStyle = `oklch(0.92 0.04 85 / ${p.a * twinkle})`;
      ctx.arc(x, y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}

stars();

const beats = [
  { place: "The table", line: "A painting set for no one yet, warming from the inside." },
  { place: "The terrace", line: "Two centuries share the same late sun. The books are still reading." },
  { place: "The valley", line: "Meltwater too bright to keep. The river refuses a single name." },
  { place: "The temple", line: "After the counting of stars, gold is served in thin air." },
];

const worldPlace = document.getElementById("worldPlace");
const worldLine = document.getElementById("worldLine");
let beatIndex = 0;

function setBeat(i) {
  if (i === beatIndex || !worldPlace || !worldLine) return;
  beatIndex = i;
  worldPlace.textContent = beats[i].place;
  worldLine.textContent = beats[i].line;
}

const plumbFill = document.getElementById("plumbFill");

if (!reduce) {
  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  const cameo = document.querySelector(".world--cameo .world__frame");
  const archive = document.querySelector(".world--archive .world__frame");
  const valley = document.querySelector(".world--valley .world__frame");
  const temple = document.querySelector(".world--temple .world__frame");

  gsap.set(archive, { scale: 0.22, opacity: 0 });
  gsap.set(valley, { scale: 0.18, opacity: 0 });
  gsap.set(temple, { scale: 1.12, opacity: 0.28 });
  gsap.set(cameo, { scale: 1, opacity: 1 });

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".descent",
      start: "top top",
      end: "bottom bottom",
      scrub: 1.1,
      onUpdate: (self) => {
        const p = self.progress;
        if (p < 0.22) setBeat(0);
        else if (p < 0.48) setBeat(1);
        else if (p < 0.74) setBeat(2);
        else setBeat(3);
      },
    },
  });

  tl.to(temple, { opacity: 0.55, scale: 1.08, duration: 1, ease: "none" }, 0)
    .to(archive, { opacity: 1, scale: 1, duration: 1.1, ease: "none" }, 0.15)
    .to(cameo, { scale: 0.38, duration: 1.1, ease: "none" }, 0.15)
    .to(valley, { opacity: 1, scale: 1, duration: 1.15, ease: "none" }, 1.15)
    .to(archive, { scale: 0.42, opacity: 0.35, duration: 1.15, ease: "none" }, 1.15)
    .to(cameo, { scale: 0.16, opacity: 0.55, duration: 1.15, ease: "none" }, 1.15)
    .to(temple, { opacity: 1, scale: 1, duration: 1.2, ease: "none" }, 2.25)
    .to(valley, { scale: 0.34, opacity: 0.25, duration: 1.2, ease: "none" }, 2.25)
    .to(archive, { scale: 0.12, opacity: 0, duration: 0.9, ease: "none" }, 2.35)
    .to(cameo, { scale: 0.06, opacity: 0, duration: 0.9, ease: "none" }, 2.35)
    .to(valley, { opacity: 0, scale: 0.2, duration: 0.7, ease: "none" }, 3.2);

  ScrollTrigger.create({
    trigger: document.body,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => {
      if (plumbFill) plumbFill.style.height = `${self.progress * 100}%`;
    },
  });
} else if (plumbFill) {
  plumbFill.style.height = "100%";
  setBeat(3);
}
