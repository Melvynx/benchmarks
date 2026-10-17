import "./style.css";
import { DEFAULTS, FRUIT_ENERGY, START_KEYS, Sim, mulberry32, type Blob, type Params } from "./sim";
import { PRESETS } from "./presets";
import { WorldView } from "./render";
import { drawPhase, drawTimeline, drawTraits, fmtTime } from "./charts";
import { summarize } from "./analysis";

type Key = keyof Params;

interface Ctl {
  key: Key;
  label: string;
  desc: string;
  min: number;
  max: number;
  step: number;
  fmt: (v: number) => string;
}

interface Group {
  id: string;
  title: string;
  color: string;
  onReset?: boolean;
  items: Ctl[];
}

const x = (v: number) => `${v.toFixed(2).replace(/\.?0+$/, "")}×`;
const sec = (v: number) => `${v.toFixed(1)}s`;
const int = (v: number) => String(Math.round(v));
const un = (v: number) => v.toFixed(1);

const GROUPS: Group[] = [
  {
    id: "fruit",
    title: "Fruit trees",
    color: "#58a83a",
    items: [
      { key: "fruitGrowth", label: "Fruit growth speed", desc: "How fast a bud swells into ripe fruit", min: 0.2, max: 3, step: 0.05, fmt: x },
      { key: "fruitLimit", label: "Fruit limit", desc: "Fruit each tree can hold at once", min: 1, max: 10, step: 1, fmt: int },
      { key: "fruitDelay", label: "Fruit return delay", desc: "Rest time before a picked spot regrows", min: 0, max: 20, step: 0.5, fmt: sec },
    ],
  },
  {
    id: "blue",
    title: "Blue blobs",
    color: "#2f7fe0",
    items: [
      { key: "blueUse", label: "Energy use", desc: "Cost of waiting and moving", min: 0.3, max: 2.5, step: 0.05, fmt: x },
      { key: "blueSpeed", label: "Speed", desc: "Top speed (faster costs more energy)", min: 1, max: 6, step: 0.1, fmt: un },
      { key: "blueVision", label: "Vision", desc: "How far they spot fruit (and reds)", min: 2, max: 14, step: 0.5, fmt: un },
      { key: "blueCopy", label: "Copy threshold", desc: `Energy needed to split in two (fruit = +${FRUIT_ENERGY})`, min: 30, max: 150, step: 5, fmt: int },
      { key: "blueEatTime", label: "Eating time", desc: "Chewing pause after each fruit", min: 0.2, max: 5, step: 0.1, fmt: sec },
    ],
  },
  {
    id: "red",
    title: "Red blobs",
    color: "#e5484d",
    items: [
      { key: "redUse", label: "Energy use", desc: "Cost of waiting and moving", min: 0.3, max: 2.5, step: 0.05, fmt: x },
      { key: "redSpeed", label: "Speed", desc: "Chase speed (faster costs more energy)", min: 1, max: 6, step: 0.1, fmt: un },
      { key: "redVision", label: "Vision", desc: "How far they spot blues in the open", min: 2, max: 16, step: 0.5, fmt: un },
      { key: "redContact", label: "Boop strength", desc: "Energy gained from booping a blue", min: 5, max: 100, step: 1, fmt: int },
      { key: "redCopy", label: "Copy threshold", desc: "Energy needed to split in two", min: 30, max: 200, step: 5, fmt: int },
      { key: "redPause", label: "Pause after boop", desc: "Happy glow before they can boop again", min: 0.2, max: 8, step: 0.1, fmt: sec },
    ],
  },
  {
    id: "world",
    title: "Starting world",
    color: "#c47643",
    onReset: true,
    items: [
      { key: "trees", label: "Starting fruit trees", desc: "Each canopy shelters one blue from reds", min: 1, max: 40, step: 1, fmt: int },
      { key: "blueStart", label: "Starting blue blobs", desc: "", min: 0, max: 150, step: 1, fmt: int },
      { key: "redStart", label: "Starting red blobs", desc: "", min: 0, max: 80, step: 1, fmt: int },
      { key: "worldSize", label: "World size", desc: "Radius of the garden dish", min: 14, max: 50, step: 1, fmt: int },
    ],
  },
];

const SPEEDS = [0.25, 0.5, 1, 2, 4, 8, 12, 20];
const ACTION_NOTE: Record<string, string> = {
  "seeking fruit": "Spotted ripe fruit and is heading over",
  eating: "Chewing. Can't move until done",
  "waiting by tree": "Lingering by a bare tree for fruit to regrow",
  wandering: "Nothing in sight, exploring",
  "avoiding crowd": "Too crowded here, moving on",
  fleeing: "A red is close! Running away",
  "running to cover": "Dashing for a free canopy to hide under",
  hiding: "Frozen under the leaves. Reds can't boop it here",
  chasing: "Locked onto a blue in the open",
  resting: "Glowing after a boop. Can't boop again yet",
  dozing: "Low energy, sitting still to save it",
  newborn: "Just split off its parent",
};

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let params: Params = { ...DEFAULTS };
let applied: Params = { ...params };
let activePreset: string | null = "balanced";
let sim = new Sim(params);
const view = new WorldView($("world"));
let running = true;
let acc = 0;
let lastFrame = performance.now();
let chartTimer = 0;
let uiTimer = 0;
let hoverX: number | null = null;
let fate: { id: number; text: string; snap: Blob } | null = null;
const sliders = new Map<Key, { input: HTMLInputElement; out: HTMLOutputElement; wrap: HTMLElement; ctl: Ctl }>();

// ---------- Controls ----------

function buildPresets() {
  const box = $("presets");
  box.innerHTML = "";
  for (const p of PRESETS) {
    const b = document.createElement("button");
    b.className = "preset" + (p.id === activePreset ? " active" : "");
    b.textContent = p.name;
    b.onclick = () => applyPreset(p.id);
    box.appendChild(b);
  }
  const cur = PRESETS.find((p) => p.id === activePreset);
  $("presetBlurb").textContent = cur ? cur.blurb : "Custom rules. Tweak away.";
}

function buildControls() {
  const root = $("controls");
  root.innerHTML = "";
  for (const g of GROUPS) {
    const sec = document.createElement("div");
    sec.className = `group ${g.id}`;
    sec.innerHTML = `<h3><i class="dot" style="background:${g.color}"></i>${g.title}${g.onReset ? '<span class="tag">applies on reset</span>' : ""}</h3>`;
    for (const c of g.items) {
      const wrap = document.createElement("div");
      wrap.className = "ctl";
      const id = `c-${c.key}`;
      wrap.innerHTML = `<div class="row"><label for="${id}">${c.label}</label><output></output></div><input id="${id}" type="range" min="${c.min}" max="${c.max}" step="${c.step}">${c.desc ? `<div class="desc">${c.desc}</div>` : ""}`;
      const input = wrap.querySelector("input")!;
      const out = wrap.querySelector("output")!;
      input.addEventListener("input", () => {
        params[c.key] = Number(input.value);
        activePreset = null;
        buildPresets();
        if (!START_KEYS.includes(c.key)) sim.setParams(liveParams());
        syncControls();
      });
      sliders.set(c.key, { input, out, wrap, ctl: c });
      sec.appendChild(wrap);
    }
    if (g.id === "world") {
      const row = document.createElement("div");
      row.className = "seed-row";
      row.innerHTML = `<label for="seed">Random seed</label><input id="seed" type="number" min="0" step="1"><button class="btn" id="dice" title="New seed">New seed</button>`;
      sec.appendChild(row);
    }
    root.appendChild(sec);
  }
  const seed = $<HTMLInputElement>("seed");
  seed.addEventListener("change", () => {
    params.seed = Math.max(0, Math.floor(Number(seed.value) || 0));
    activePreset = null;
    buildPresets();
    syncControls();
  });
  $("dice").onclick = () => {
    params.seed = Math.floor(Math.random() * 100000);
    resetWorld();
  };
}

/** Live rules from the sliders, with the start-only settings the world was actually built with. */
function liveParams(): Params {
  const p = { ...params };
  for (const k of START_KEYS) p[k] = applied[k];
  return p;
}

function pendingReset() {
  return START_KEYS.some((k) => params[k] !== applied[k]);
}

function syncControls() {
  for (const [key, s] of sliders) {
    s.input.value = String(params[key]);
    s.out.textContent = s.ctl.fmt(params[key]);
    s.wrap.classList.toggle("changed", START_KEYS.includes(key) && params[key] !== applied[key]);
  }
  $<HTMLInputElement>("seed").value = String(params.seed);
  const idx = SPEEDS.indexOf(params.simSpeed);
  $<HTMLInputElement>("speed").value = String(idx < 0 ? 3 : idx);
  $("speedOut").textContent = `${params.simSpeed}×`;
  const reset = $("reset");
  reset.classList.toggle("pending", pendingReset());
  reset.textContent = pendingReset() ? "Reset to apply" : "Reset";
}

function applyPreset(id: string) {
  const p = PRESETS.find((q) => q.id === id)!;
  params = { ...p.params, simSpeed: params.simSpeed };
  activePreset = id;
  buildPresets();
  resetWorld();
  setRunning(true);
}

function resetWorld() {
  applied = { ...params };
  sim = new Sim(params);
  view.clearEffects();
  view.selected = null;
  fate = null;
  acc = 0;
  syncControls();
  renderInspector();
  renderCharts();
}

function randomize() {
  const rng = mulberry32((Math.random() * 1e9) | 0);
  const g = () => {
    const u = 1 - rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
  const next: Params = { ...DEFAULTS, simSpeed: params.simSpeed };
  for (const grp of GROUPS) {
    for (const c of grp.items) {
      const base = DEFAULTS[c.key];
      const spread = grp.onReset ? 0.35 : 0.22;
      let v = base * Math.exp(g() * spread);
      v = Math.round(v / c.step) * c.step;
      next[c.key] = Number(Math.min(c.max, Math.max(c.min, v)).toFixed(3));
    }
  }
  next.seed = Math.floor(rng() * 100000);
  params = next;
  activePreset = null;
  buildPresets();
  resetWorld();
  setRunning(true);
}

function setRunning(on: boolean) {
  running = on;
  $("play").textContent = on ? "Pause" : "Play";
}

function stepOnce() {
  setRunning(false);
  for (let i = 0; i < 10; i++) sim.step();
  drainEvents();
  renderCharts();
}

// ---------- Inspector ----------

const NAMES_A = ["Bo", "Mi", "Pu", "Lu", "Ti", "Ka", "No", "Fi", "Zu", "Ro", "Pe", "Wi", "Ba", "Mo", "Ju", "Su"];
const NAMES_B = ["bble", "mo", "ppy", "lo", "nk", "bo", "zzy", "ri", "ffin", "mi", "do", "chi", "sh", "pi", "lly", "ku"];
function nameOf(id: number) {
  return NAMES_A[(id * 7) % NAMES_A.length] + NAMES_B[(id * 13 + (id >> 4)) % NAMES_B.length] + ` #${id}`;
}

function renderInspector() {
  const el = $("inspector");
  const id = view.selected;
  if (id === null) {
    el.hidden = true;
    return;
  }
  const live = sim.findBlob(id);
  const b = live ?? (fate && fate.id === id ? fate.snap : null);
  if (!b) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const p = sim.p;
  const copy = b.kind === "blue" ? p.blueCopy : p.redCopy;
  const ePct = Math.max(0, Math.min(100, (b.energy / copy) * 100));
  const eColor = ePct < 25 ? "#e5484d" : ePct < 55 ? "#f2b84b" : "#58a83a";
  const speed = sim.speedOf(b);
  const vision = sim.visionOf(b);
  const now = Math.hypot(b.vx, b.vy);
  const busyLabel = b.kind === "blue" ? "Chewing" : "Glow pause";
  const timer =
    live && b.busy > 0
      ? `<div class="kv"><span>${b.action === "newborn" ? "Settling in" : busyLabel}</span><b>${b.busy.toFixed(1)}s left</b></div><div class="bar timer"><i style="width:${(b.busy / Math.max(0.01, b.busyTotal)) * 100}%"></i></div>`
      : "";
  const pct = (g: number) => `${Math.round(g * 100)}%`;
  el.innerHTML = `
    <div class="ihead">
      <span class="chip ${b.kind}">${b.kind}</span>
      <span class="name">${nameOf(b.id)}</span>
      <button class="close" aria-label="Close">×</button>
    </div>
    ${
      live
        ? `<div class="action">${cap(b.action)}${b.hidden && b.action !== "hiding" ? " · sheltered" : ""}<small>${ACTION_NOTE[b.action] ?? ""}</small></div>`
        : ""
    }
    <div class="kv"><span>Energy</span><b>${b.energy.toFixed(1)} / ${copy} to copy</b></div>
    <div class="bar"><i style="width:${ePct}%;background:${eColor}"></i></div>
    ${timer}
    <div class="kv">
      <span>Age</span><b>${fmtTime(b.age)}</b>
      <span>Speed</span><b>${now.toFixed(1)} now · ${speed.toFixed(2)} max</b>
      <span>Sensing range</span><b>${vision.toFixed(1)}</b>
      <span>Speed gene</span><b>${pct(b.gSpeed)}</b>
      <span>Vision gene</span><b>${pct(b.gVision)}</b>
      <span>Generation</span><b>${b.gen}</b>
      <span>Family</span><b>${nameOf(b.family).split(" ")[0]} line</b>
      <span>Parent</span><b>${b.parent ? "#" + b.parent : "original"}</b>
      <span>Copies made</span><b>${b.children}</b>
      <span>${b.kind === "blue" ? "Fruit eaten" : "Boops"}</span><b>${b.meals}</b>
    </div>
    ${!live && fate ? `<div class="fate">${fate.text}</div>` : ""}
  `;
  el.querySelector<HTMLButtonElement>(".close")!.onclick = () => {
    view.selected = null;
    renderInspector();
  };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---------- Charts & stats ----------

function renderCharts() {
  const h = sim.history;
  const marks: { t: number; label: string; color: string }[] = [];
  if (sim.stats.redExtinctAt !== null) marks.push({ t: sim.stats.redExtinctAt, label: "reds faded", color: "#e5484d" });
  if (sim.stats.blueExtinctAt !== null) marks.push({ t: sim.stats.blueExtinctAt, label: "blues gone", color: "#2f7fe0" });
  const hover = drawTimeline($("timeline"), h, { hoverX, fruitCap: sim.trees.length * sim.p.fruitLimit, marks });
  const tip = $("tip");
  if (hover) {
    tip.hidden = false;
    tip.innerHTML = `${fmtTime(hover.t)} · <b class="blue">${hover.blue}</b> blue · <b class="red">${hover.red}</b> red · <b class="fruit">${hover.fruit}</b> fruit`;
    const w = $("timeline").clientWidth;
    tip.style.left = `${Math.min(w - tip.offsetWidth - 4, Math.max(4, hover.x + 10))}px`;
  } else tip.hidden = true;
  drawPhase($("phase"), h);
  drawTraits($("traits"), h);

  const s = summarize(h, sim.stats, sim.p, sim.time);
  const mood = $("mood");
  mood.className = `mood ${s.mood}`;
  mood.textContent = s.mood === "early" ? "warming up" : s.mood;
  $("summary").innerHTML = `<h4>${s.headline}</h4><ul>${s.lines.map((l) => `<li>${l}</li>`).join("")}</ul>`;
}

function renderStats() {
  const c = sim.counts();
  const fruit = sim.totalFruit();
  const capF = sim.trees.length * Math.round(sim.p.fruitLimit);
  const st = sim.stats;
  $("stats").innerHTML = `
    <div class="stat"><span>time</span><b>${fmtTime(sim.time)}</b></div>
    <div class="stat blue"><span>blue</span><b>${c.blue}</b></div>
    <div class="stat red"><span>red</span><b>${c.red}</b></div>
    <div class="stat fruit"><span>ripe fruit</span><b>${fruit}</b><span>/ ${capF}</span></div>
    <div class="stat"><span>fruit eaten</span><b>${st.meals}</b></div>
    <div class="stat"><span>boops</span><b>${st.tags}</b></div>
    <div class="stat"><span>copies</span><b>${st.blueBirths + st.redBirths}</b></div>
  `;
}

function drainEvents() {
  if (!sim.events.length) return;
  const sel = view.selected;
  if (sel !== null) {
    for (const e of sim.events) {
      if (e.type === "tag" && e.other === sel && e.blob) fate = { id: sel, text: `Booped by red #${e.id} at ${fmtTime(sim.time)} and popped into sparkles.`, snap: { ...e.blob } };
      if (e.type === "fade" && e.id === sel && e.blob) fate = { id: sel, text: `Ran out of energy at ${fmtTime(sim.time)} and faded away.`, snap: { ...e.blob } };
    }
  }
  view.onEvents(sim.events, sim);
  sim.events.length = 0;
}

// ---------- Loop ----------

function frame(now: number) {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;
  if (running) {
    acc += dt * params.simSpeed;
    const t0 = performance.now();
    while (acc >= Sim.DT) {
      sim.step();
      acc -= Sim.DT;
      if (performance.now() - t0 > 14) {
        acc = 0;
        break;
      }
    }
    drainEvents();
  }
  view.update(dt, sim, running ? params.simSpeed : 1);
  view.draw(sim, running ? Math.min(1, acc / Sim.DT) : 1);

  chartTimer += dt;
  uiTimer += dt;
  if (chartTimer > 0.25) {
    chartTimer = 0;
    renderCharts();
  }
  if (uiTimer > 0.1) {
    uiTimer = 0;
    renderStats();
    renderInspector();
  }
  requestAnimationFrame(frame);
}

// ---------- Interaction ----------

function bindWorld() {
  const c = $<HTMLCanvasElement>("world");
  let down: { x: number; y: number; yaw: number; pitch: number; moved: boolean } | null = null;
  c.addEventListener("pointerdown", (e) => {
    c.setPointerCapture(e.pointerId);
    down = { x: e.clientX, y: e.clientY, yaw: view.yaw, pitch: view.pitch, moved: false };
  });
  c.addEventListener("pointermove", (e) => {
    const r = c.getBoundingClientRect();
    if (down) {
      const dx = e.clientX - down.x;
      const dy = e.clientY - down.y;
      if (Math.hypot(dx, dy) > 4) {
        down.moved = true;
        c.classList.add("dragging");
      }
      if (down.moved) {
        view.yaw = down.yaw - dx * 0.008;
        view.pitch = Math.min(1.3, Math.max(0.5, down.pitch + dy * 0.004));
      }
    } else {
      view.hovered = view.hitTest(e.clientX - r.left, e.clientY - r.top);
      c.classList.toggle("pointing", view.hovered !== null);
    }
  });
  c.addEventListener("pointerup", (e) => {
    c.classList.remove("dragging");
    if (down && !down.moved) {
      const r = c.getBoundingClientRect();
      const id = view.hitTest(e.clientX - r.left, e.clientY - r.top);
      view.selected = id;
      fate = null;
      renderInspector();
    }
    down = null;
  });
  c.addEventListener("pointerleave", () => {
    view.hovered = null;
  });
  c.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      view.zoom = Math.min(2.6, Math.max(0.6, view.zoom * Math.exp(-e.deltaY * 0.0012)));
    },
    { passive: false },
  );
  c.addEventListener("dblclick", () => {
    view.yaw = -0.55;
    view.pitch = 0.8;
    view.zoom = 1;
  });

  const tl = $<HTMLCanvasElement>("timeline");
  tl.addEventListener("mousemove", (e) => {
    hoverX = e.clientX - tl.getBoundingClientRect().left;
    renderCharts();
  });
  tl.addEventListener("mouseleave", () => {
    hoverX = null;
    renderCharts();
  });
}

function bindTransport() {
  $("play").onclick = () => setRunning(!running);
  $("step").onclick = stepOnce;
  $("reset").onclick = () => resetWorld();
  $("randomize").onclick = randomize;
  const sp = $<HTMLInputElement>("speed");
  sp.addEventListener("input", () => {
    params.simSpeed = SPEEDS[Number(sp.value)];
    syncControls();
  });
  window.addEventListener("keydown", (e) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "INPUT" && (t as HTMLInputElement).type === "number") return;
    if (e.code === "Space") {
      e.preventDefault();
      setRunning(!running);
    } else if (e.key === "s" || e.key === "S") stepOnce();
    else if (e.key === "r" || e.key === "R") resetWorld();
  });
}

buildPresets();
buildControls();
bindWorld();
bindTransport();
syncControls();
setRunning(true);
requestAnimationFrame(frame);
