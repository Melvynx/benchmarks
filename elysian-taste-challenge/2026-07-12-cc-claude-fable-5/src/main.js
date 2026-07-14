// Elysian — the conservatory's small machinery.

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");

/* ---------- entry: lift the veil once type is ready ---------- */

const open = () => document.body.classList.add("is-open");
const fontsReady = document.fonts?.ready ?? Promise.resolve();
const minWait = new Promise((r) => setTimeout(r, reducedMotion.matches ? 0 : 950));
Promise.all([fontsReady, minWait]).then(open);
setTimeout(open, 2200); // the gate never sticks

/* ---------- stagger indices ---------- */

document
  .querySelectorAll(".wordmark__slot i")
  .forEach((el, i) => el.style.setProperty("--w", i));

document
  .querySelectorAll("[data-line]")
  .forEach((el, i) => el.style.setProperty("--l", i));

for (const scope of document.querySelectorAll("section, article, footer")) {
  const reveals = scope.querySelectorAll(":scope > [data-reveal], :scope > * > [data-reveal]");
  reveals.forEach((el, i) => el.style.setProperty("--d", `${Math.min(i * 90, 540)}ms`));
}

/* ---------- scroll reveals ---------- */

const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      io.unobserve(entry.target);
    }
  },
  { threshold: 0.18, rootMargin: "0px 0px -6% 0px" }
);
document.querySelectorAll("[data-reveal], [data-line]").forEach((el) => io.observe(el));

/* ---------- fixed bar appears past the hero ---------- */

const bar = document.getElementById("bar");
const hero = document.querySelector(".hero");

/* ---------- parallax: hero media + arch plates ---------- */

const heroMedia = document.querySelector("[data-drift]");
const archImgs = [...document.querySelectorAll("[data-arch-img]")];
let ticking = false;

function paint() {
  ticking = false;
  const vh = window.innerHeight;
  const y = window.scrollY;

  bar.classList.toggle("is-shown", y > hero.offsetHeight * 0.72);

  if (reducedMotion.matches) return;

  if (y < vh * 1.2) {
    heroMedia.style.transform = `translateY(${y * 0.16}px)`;
  }

  for (const img of archImgs) {
    const box = img.parentElement.getBoundingClientRect();
    if (box.bottom < 0 || box.top > vh) continue;
    // progress 0..1 as the plate crosses the viewport
    const t = 1 - (box.top + box.height) / (vh + box.height);
    const py = -12 + t * 9; // -12% .. -3% of the 116%-tall image
    img.style.setProperty("--py", `${py.toFixed(2)}%`);
  }
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(paint);
  }
}
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
paint();

/* ---------- the loupe ---------- */

const lens = document.querySelector("[data-lens]");
const glass = document.querySelector("[data-lens-glass]");
const tags = [...document.querySelectorAll("[data-tag]")];
const IMG_W = 2560;
const IMG_H = 1433;
const ZOOM = 2.1;

if (!finePointer.matches) {
  // No hover: the annotations are simply part of the page,
  // and the loupe follows a pressed finger.
  tags.forEach((t) => t.classList.add("is-lit"));
  const fine = document.querySelector("[data-hint-fine]");
  const coarse = document.querySelector("[data-hint-coarse]");
  if (fine && coarse) {
    fine.hidden = true;
    coarse.hidden = false;
  }
}

function moveGlass(clientX, clientY) {
  const box = lens.getBoundingClientRect();
  const x = clientX - box.left;
  const y = clientY - box.top;
  const r = glass.offsetWidth / 2;

  // mirror CSS cover at background-position 50% 45%
  const scale = Math.max(box.width / IMG_W, box.height / IMG_H);
  const dw = IMG_W * scale;
  const dh = IMG_H * scale;
  const ox = (box.width - dw) * 0.5;
  const oy = (box.height - dh) * 0.45;

  glass.style.transform = `translate(${x - r}px, ${y - r}px)`;
  glass.style.backgroundSize = `${dw * ZOOM}px ${dh * ZOOM}px`;
  glass.style.backgroundPosition = `${-((x - ox) * ZOOM - r)}px ${-((y - oy) * ZOOM - r)}px`;

  if (finePointer.matches) {
    const reach = box.width * 0.14;
    for (const tag of tags) {
      const tx = (parseFloat(tag.style.getPropertyValue("--tx")) / 100) * box.width;
      const ty = (parseFloat(tag.style.getPropertyValue("--ty")) / 100) * box.height;
      tag.classList.toggle("is-lit", Math.hypot(tx - x, ty - y) < reach);
    }
  }
}

lens.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch" && e.buttons === 0) return;
  lens.classList.add("is-lit");
  moveGlass(e.clientX, e.clientY);
});
lens.addEventListener("pointerdown", (e) => {
  lens.classList.add("is-lit");
  moveGlass(e.clientX, e.clientY);
});
lens.addEventListener("pointerleave", () => lens.classList.remove("is-lit"));
lens.addEventListener("pointerup", (e) => {
  if (e.pointerType === "touch") lens.classList.remove("is-lit");
});

/* ---------- the ledger ---------- */

const ledger = document.querySelector("[data-ledger]");
const ledgerDone = document.querySelector("[data-ledger-done]");
const ledgerError = document.querySelector("[data-ledger-error]");

ledger.addEventListener("submit", (e) => {
  e.preventDefault();
  const email = ledger.email.value.trim();
  const plausible = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  if (!plausible) {
    ledgerError.hidden = false;
    ledger.email.focus();
    return;
  }
  ledgerError.hidden = true;
  ledger.hidden = true;
  ledgerDone.hidden = false;
  ledgerDone.setAttribute("tabindex", "-1");
  ledgerDone.focus({ preventScroll: true });
});
