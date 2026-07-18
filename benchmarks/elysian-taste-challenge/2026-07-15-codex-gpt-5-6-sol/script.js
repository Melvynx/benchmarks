const root = document.documentElement;
const body = document.body;
const veil = document.querySelector(".opening-veil");
const hero = document.querySelector(".hero");
const shards = [...document.querySelectorAll(".shard")];
const cursor = document.querySelector(".cursor-orbit");
const climateStage = document.querySelector(".climate-stage");
const climateMedia = [...document.querySelectorAll(".climate-media")];
const climateSteps = [...document.querySelectorAll(".climate-step")];
const climateButtons = [...document.querySelectorAll(".constellation button")];
const coordinate = document.querySelector(".stage-coordinate");
const quietButton = document.querySelector(".soundless");
const oracle = document.querySelector(".oracle");
const holdButton = document.querySelector(".hold-button");
const omen = document.querySelector(".omen");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");

const climateCoordinates = [
  "41° F / STILL",
  "12° E / THOUGHT",
  "03° N / CURRENT",
  "09 PM / AFTERLIGHT",
];

const omens = [
  "A door you mistook for a wall will remember your hand.",
  "Follow the blue sound. It has been waiting upstream.",
  "Before the ninth evening, leave one question beautifully unfinished.",
  "Something made of stone is learning your name.",
  "The next map you open will contain one honest impossibility.",
];

let currentClimate = 0;
let previousClimate = 0;
let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
let cursorX = pointerX;
let cursorY = pointerY;
let cursorFrame = null;

function openPage() {
  window.setTimeout(() => veil?.classList.add("is-open"), reducedMotion.matches ? 0 : 650);
}

if (document.readyState === "complete") {
  openPage();
} else {
  window.addEventListener("load", openPage, { once: true });
  window.setTimeout(openPage, 1800);
}

function renderCursor() {
  cursorX += (pointerX - cursorX) * 0.18;
  cursorY += (pointerY - cursorY) * 0.18;
  root.style.setProperty("--mx", `${cursorX}px`);
  root.style.setProperty("--my", `${cursorY}px`);

  const moving = Math.abs(pointerX - cursorX) + Math.abs(pointerY - cursorY) > 0.2;
  cursorFrame = moving ? requestAnimationFrame(renderCursor) : null;
}

if (finePointer.matches && !reducedMotion.matches) {
  window.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!cursorFrame) cursorFrame = requestAnimationFrame(renderCursor);
  }, { passive: true });

  document.querySelectorAll("a, button").forEach((interactive) => {
    interactive.addEventListener("pointerenter", () => cursor?.classList.add("is-active"));
    interactive.addEventListener("pointerleave", () => cursor?.classList.remove("is-active"));
  });
}

if (hero && finePointer.matches && !reducedMotion.matches) {
  hero.addEventListener("pointermove", (event) => {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;

    shards.forEach((shard) => {
      const depth = Number(shard.dataset.depth || 1);
      shard.style.setProperty("--tx", `${x * 18 * depth}px`);
      shard.style.setProperty("--ty", `${y * 14 * depth}px`);
    });
  }, { passive: true });

  hero.addEventListener("pointerleave", () => {
    shards.forEach((shard) => {
      shard.style.setProperty("--tx", "0px");
      shard.style.setProperty("--ty", "0px");
    });
  });
}

function setClimate(index) {
  if (index === currentClimate && climateMedia[index]?.classList.contains("is-active")) return;

  previousClimate = currentClimate;
  currentClimate = index;
  body.dataset.climate = String(index);

  climateMedia.forEach((media, mediaIndex) => {
    media.classList.toggle("is-active", mediaIndex === index);
    media.classList.toggle("is-previous", mediaIndex === previousClimate && mediaIndex !== index);
  });

  climateSteps.forEach((step, stepIndex) => {
    step.classList.toggle("is-active", stepIndex === index);
  });

  climateButtons.forEach((button, buttonIndex) => {
    if (buttonIndex === index) {
      button.setAttribute("aria-current", "true");
    } else {
      button.removeAttribute("aria-current");
    }
  });

  coordinate.textContent = climateCoordinates[index];
}

setClimate(0);

const stepObserver = new IntersectionObserver((entries) => {
  const visible = entries
    .filter((entry) => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (visible) setClimate(Number(visible.target.dataset.step));
}, {
  rootMargin: "-32% 0px -38% 0px",
  threshold: [0, 0.25, 0.55, 0.8],
});

climateSteps.forEach((step) => stepObserver.observe(step));

climateButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = climateSteps[Number(button.dataset.go)];
    target?.scrollIntoView({ behavior: reducedMotion.matches ? "auto" : "smooth", block: "center" });
  });
});

if (climateStage && finePointer.matches && !reducedMotion.matches) {
  let stageFrame = null;
  let lensX = 50;
  let lensY = 50;

  climateStage.addEventListener("pointermove", (event) => {
    const bounds = climateStage.getBoundingClientRect();
    lensX = ((event.clientX - bounds.left) / bounds.width) * 100;
    lensY = ((event.clientY - bounds.top) / bounds.height) * 100;

    if (!stageFrame) {
      stageFrame = requestAnimationFrame(() => {
        climateStage.style.setProperty("--lens-x", `${lensX}%`);
        climateStage.style.setProperty("--lens-y", `${lensY}%`);
        stageFrame = null;
      });
    }
  }, { passive: true });
}

function updateScrollMeter() {
  const distance = document.documentElement.scrollHeight - window.innerHeight;
  const progress = distance > 0 ? (window.scrollY / distance) * 100 : 0;
  root.style.setProperty("--scroll", `${Math.min(100, Math.max(0, progress))}%`);
}

window.addEventListener("scroll", updateScrollMeter, { passive: true });
window.addEventListener("resize", updateScrollMeter, { passive: true });
updateScrollMeter();

quietButton?.addEventListener("click", () => {
  const isQuiet = quietButton.getAttribute("aria-pressed") === "true";
  quietButton.setAttribute("aria-pressed", String(!isQuiet));
  body.classList.toggle("is-still", !isQuiet);
  quietButton.lastChild.textContent = isQuiet ? " Still mode" : " Motion still";
});

let holdStart = 0;
let holdFrame = null;
let holdPointerId = null;
let lastOmen = -1;
let completedAt = 0;
let pointerInitiated = false;
const holdDuration = reducedMotion.matches ? 300 : 1400;

function chooseOmen() {
  let next = Math.floor(Math.random() * omens.length);
  if (next === lastOmen) next = (next + 1) % omens.length;
  lastOmen = next;

  omen.classList.add("is-changing");
  window.setTimeout(() => {
    omen.textContent = omens[next];
    omen.classList.remove("is-changing");
    oracle?.classList.add("has-omen");
  }, reducedMotion.matches ? 0 : 260);

  completedAt = performance.now();
}

function holdTick(now) {
  const progress = Math.min(1, (now - holdStart) / holdDuration);
  holdButton.style.setProperty("--hold", progress.toFixed(3));

  if (progress >= 1) {
    holdFrame = null;
    chooseOmen();
    return;
  }

  holdFrame = requestAnimationFrame(holdTick);
}

function startHold(event) {
  if (holdFrame) return;

  if (event.type === "pointerdown") {
    pointerInitiated = true;
    holdPointerId = event.pointerId;
    holdButton.setPointerCapture?.(event.pointerId);
  }

  holdStart = performance.now();
  holdButton.style.setProperty("--hold", "0");
  holdFrame = requestAnimationFrame(holdTick);
}

function cancelHold() {
  if (holdFrame) cancelAnimationFrame(holdFrame);
  holdFrame = null;
  holdPointerId = null;
  holdButton.style.setProperty("--hold", "0");
}

holdButton?.addEventListener("pointerdown", startHold);
holdButton?.addEventListener("pointerup", cancelHold);
holdButton?.addEventListener("pointercancel", cancelHold);

holdButton?.addEventListener("keydown", (event) => {
  if (event.key === " " && !event.repeat) {
    event.preventDefault();
    startHold(event);
  }

  if (event.key === "Enter") {
    event.preventDefault();
    cancelHold();
    chooseOmen();
  }
});

holdButton?.addEventListener("keyup", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    cancelHold();
  }
});

holdButton?.addEventListener("click", () => {
  if (pointerInitiated) {
    pointerInitiated = false;
    return;
  }
  if (performance.now() - completedAt < 500) return;
  chooseOmen();
});
