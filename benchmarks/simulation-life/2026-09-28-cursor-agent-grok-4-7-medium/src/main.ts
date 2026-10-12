import { drawPhase, drawTimeline, drawTraits, formatClock } from "./charts.ts";
import { FIELDS, PRESETS, SPEED_FIELD, balanced, formatValue } from "./presets.ts";
import { drawGarden, type Camera, type Marker } from "./render.ts";
import { countGroup, createSim, describeBlob, fruitTotal, stepSim, type Sim } from "./sim.ts";
import { summarize } from "./summary.ts";
import type { Params } from "./types.ts";

const params: Params = { ...balanced };
let sim: Sim = createSim(params);
let running = true;
let selected: number | null = null;
let markers: Marker[] = [];
const camera: Camera = { yaw: -0.45, tilt: 0.72 };

const transport = must("#transport");
const panel = must("#panel");
const inspect = must("#inspect");
const beads = must("#beads");
const legend = must("#legend");
const summary = must("#summary");
const garden = mustCanvas("#garden");
const timeline = mustCanvas("#timeline");
const phase = mustCanvas("#phase");
const traits = mustCanvas("#traits");

const playBtn = button("Play", () => { running = true; syncTransport(); });
const pauseBtn = button("Pause", () => { running = false; syncTransport(); });
const stepBtn = button("Step", () => {
  running = false;
  stepSim(sim, 0.4);
  syncTransport();
});
const resetBtn = button("Reset", () => reset());
const randomBtn = button("Randomize", () => randomize());

const speedInput = document.createElement("input");
speedInput.type = "range";
speedInput.min = String(SPEED_FIELD.min);
speedInput.max = String(SPEED_FIELD.max);
speedInput.step = String(SPEED_FIELD.step);
speedInput.value = String(params.simSpeed);
speedInput.ariaLabel = SPEED_FIELD.label;
speedInput.addEventListener("input", () => {
  params.simSpeed = Number(speedInput.value);
  speedReadout.textContent = `${formatValue(SPEED_FIELD.digits, params.simSpeed)}×`;
  markPreset();
});

const speedReadout = document.createElement("span");
speedReadout.className = "clock";
const speedWrap = document.createElement("label");
speedWrap.className = "speed";
const speedName = document.createElement("span");
speedName.textContent = SPEED_FIELD.label;
speedWrap.append(speedName, speedInput, speedReadout);

const clock = document.createElement("span");
clock.className = "clock";

transport.append(playBtn, pauseBtn, stepBtn, resetBtn, randomBtn, speedWrap, clock);

const presetRow = document.createElement("div");
presetRow.className = "presets";
const blurb = document.createElement("p");
blurb.className = "blurb";
const presetButtons = new Map<string, HTMLButtonElement>();
for (const preset of PRESETS) {
  const btn = button(preset.name, () => applyPreset(preset.id));
  presetButtons.set(preset.id, btn);
  presetRow.append(btn);
}
panel.append(presetRow, blurb);

const inputs = new Map<keyof Params, HTMLInputElement>();
const readouts = new Map<keyof Params, HTMLElement>();
const groups = ["Garden", "Blue blobs", "Red blobs", "Setup"] as const;
for (const group of groups) {
  const box = document.createElement("fieldset");
  box.className = group === "Garden" ? "group-garden" : group === "Blue blobs" ? "group-blue" : group === "Red blobs" ? "group-red" : "group-setup";
  const legendEl = document.createElement("legend");
  legendEl.textContent = group;
  box.append(legendEl);
  if (group === "Setup") {
    const note = document.createElement("p");
    note.className = "setup-note";
    note.textContent = "Starting trees, blobs, world size, and seed apply when you reset.";
    box.append(note);
  }
  for (const field of FIELDS.filter((item) => item.group === group)) {
    const row = document.createElement("div");
    row.className = "field";
    const id = `field-${field.key}`;
    const label = document.createElement("label");
    label.htmlFor = id;
    label.textContent = field.label;
    const readout = document.createElement("span");
    readout.className = "value";
    const input = document.createElement("input");
    input.id = id;
    input.min = String(field.min);
    input.max = String(field.max);
    input.step = String(field.step);
    input.value = String(params[field.key]);
    if (field.key === "seed") {
      input.type = "number";
    } else {
      input.type = "range";
    }
    input.addEventListener("input", () => {
      const value = clampField(field.key, Number(input.value));
      params[field.key] = value;
      readout.textContent = formatValue(field.digits, value);
      markPreset();
    });
    inputs.set(field.key, input);
    readouts.set(field.key, readout);
    row.append(label, readout, input);
    box.append(row);
  }
  panel.append(box);
}

syncControls();
syncTransport();

let accum = 0;
let last = performance.now();
let inspectKey = "";
let summaryKey = "";

function frame(now: number) {
  const real = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (running) {
    accum += real * params.simSpeed;
    let guard = 0;
    while (accum >= 0.05 && guard < 24) {
      stepSim(sim, 0.05);
      accum -= 0.05;
      guard += 1;
    }
  }
  markers = drawGarden(garden, sim, camera, selected);
  drawTimeline(timeline, sim.history);
  drawPhase(phase, sim.history);
  drawTraits(traits, sim.history);
  paintReadouts();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.addEventListener("keydown", (event) => {
  if (event.code !== "Space" || event.target !== document.body) return;
  event.preventDefault();
  running = !running;
  syncTransport();
});

let dragX = 0;
let dragY = 0;
let dragging = false;
let moved = false;

garden.addEventListener("pointerdown", (event) => {
  dragging = true;
  moved = false;
  dragX = event.clientX;
  dragY = event.clientY;
  garden.classList.add("dragging");
  garden.setPointerCapture(event.pointerId);
});

garden.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  const dx = event.clientX - dragX;
  const dy = event.clientY - dragY;
  if (Math.hypot(dx, dy) > 4) moved = true;
  camera.yaw += dx * 0.008;
  camera.tilt = Math.max(0.42, Math.min(1.05, camera.tilt + dy * 0.003));
  dragX = event.clientX;
  dragY = event.clientY;
});

function endDrag(event: PointerEvent) {
  if (!dragging) return;
  dragging = false;
  garden.classList.remove("dragging");
  if (!moved) selectAt(event);
}

garden.addEventListener("pointerup", endDrag);
garden.addEventListener("pointercancel", () => {
  dragging = false;
  garden.classList.remove("dragging");
});

window.addEventListener("resize", () => {
  markers = drawGarden(garden, sim, camera, selected);
});

function selectAt(event: PointerEvent) {
  const rect = garden.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  let best: Marker | null = null;
  let bestD = 26;
  for (const marker of markers) {
    const d = Math.hypot(marker.x - x, marker.y - y);
    if (d < bestD) {
      best = marker;
      bestD = d;
    }
  }
  selected = best ? best.id : null;
  inspectKey = "";
}

function paintReadouts() {
  const fruit = fruitTotal(sim);
  const blue = countGroup(sim, "blue");
  const red = countGroup(sim, "red");
  beads.innerHTML = `<li><i class="fruit"></i>${fruit.toFixed(1)} fruit</li><li><i class="blue"></i>${blue} blue</li><li><i class="red"></i>${red} red</li>`;
  clock.textContent = formatClock(sim.time);
  speedReadout.textContent = `${formatValue(SPEED_FIELD.digits, params.simSpeed)}×`;
  legend.innerHTML = `<i class="fruit"></i> Fruit ${fruit.toFixed(1)} <i class="blue"></i> Blue ${blue} <i class="red"></i> Red ${red}`;
  const lines = summarize(sim.history, params.trees * params.fruitLimit);
  const nextSummary = lines.map((line) => `<p>${line}</p>`).join("");
  if (nextSummary !== summaryKey) {
    summaryKey = nextSummary;
    summary.innerHTML = nextSummary;
  }
  const blob = selected == null ? undefined : sim.blobs.find((item) => item.id === selected);
  if (!blob) {
    const key = selected == null ? "empty" : "faded";
    if (inspectKey !== key) {
      inspectKey = key;
      inspect.innerHTML = selected == null ? "<p>Click a blob to look closer.</p>" : "<p>That blob faded.</p>";
    }
    return;
  }
  const info = describeBlob(blob, params);
  const timeLeft = info.timeLeft == null ? "Ready" : `${info.timeLeft.toFixed(1)}s`;
  const html = `<h2>${info.group} blob</h2><dl>
    <dt>Group</dt><dd>${info.group}</dd>
    <dt>Energy</dt><dd>${info.energy.toFixed(1)}</dd>
    <dt>Age</dt><dd>${formatAge(info.age)}</dd>
    <dt>Action</dt><dd>${info.action}</dd>
    <dt>Speed</dt><dd>${info.speed.toFixed(2)}</dd>
    <dt>Sensing range</dt><dd>${info.sense.toFixed(1)}</dd>
    <dt>Time left</dt><dd>${timeLeft}</dd>
    <dt>Family</dt><dd>${info.family}, generation ${info.generation}</dd>
    <dt>Traits</dt><dd>speed ${info.speedTrait.toFixed(2)}, sensing ${info.visionTrait.toFixed(2)}</dd>
  </dl>`;
  if (html !== inspectKey) {
    inspectKey = html;
    inspect.innerHTML = html;
  }
  timeline.setAttribute("aria-label", `Timeline with fruit ${fruit.toFixed(1)}, ${blue} blue blobs, ${red} red blobs`);
}

function formatAge(seconds: number) {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

function reset() {
  sim = createSim(params);
  selected = null;
  accum = 0;
  inspectKey = "";
  summaryKey = "";
}

function randomize() {
  for (const field of [...FIELDS, SPEED_FIELD]) {
    const span = field.max - field.min;
    const steps = Math.round(span / field.step);
    const pick = field.min + Math.floor(Math.random() * (steps + 1)) * field.step;
    params[field.key] = clampField(field.key, pick);
  }
  params.seed = 1 + Math.floor(Math.random() * 99999);
  syncControls();
  reset();
}

function applyPreset(id: string) {
  const preset = PRESETS.find((item) => item.id === id);
  if (!preset) return;
  Object.assign(params, preset.params);
  syncControls();
  reset();
}

function syncControls() {
  for (const field of FIELDS) {
    const input = inputs.get(field.key);
    const readout = readouts.get(field.key);
    if (!input || !readout) continue;
    input.value = String(params[field.key]);
    readout.textContent = formatValue(field.digits, params[field.key]);
  }
  speedInput.value = String(params.simSpeed);
  speedReadout.textContent = `${formatValue(SPEED_FIELD.digits, params.simSpeed)}×`;
  markPreset();
}

function markPreset() {
  let active = "";
  for (const preset of PRESETS) {
    const same = (Object.keys(preset.params) as (keyof Params)[]).every((key) => Math.abs(preset.params[key] - params[key]) < 0.001);
    presetButtons.get(preset.id)?.setAttribute("aria-pressed", same ? "true" : "false");
    if (same) active = preset.blurb;
  }
  blurb.textContent = active || "Custom rules. Reset replants the dish.";
}

function syncTransport() {
  playBtn.setAttribute("aria-pressed", running ? "true" : "false");
  pauseBtn.setAttribute("aria-pressed", running ? "false" : "true");
  playBtn.disabled = running;
  pauseBtn.disabled = !running;
}

function clampField(key: keyof Params, value: number) {
  const field = [...FIELDS, SPEED_FIELD].find((item) => item.key === key);
  if (!field || !Number.isFinite(value)) return params[key];
  const snapped = Math.round(value / field.step) * field.step;
  return Math.max(field.min, Math.min(field.max, snapped));
}

function button(label: string, onClick: () => void) {
  const el = document.createElement("button");
  el.type = "button";
  el.textContent = label;
  el.addEventListener("click", onClick);
  return el;
}

function must(sel: string) {
  const el = document.querySelector(sel);
  if (!el) throw new Error(`Missing ${sel}`);
  return el as HTMLElement;
}

function mustCanvas(sel: string) {
  const el = document.querySelector(sel);
  if (!(el instanceof HTMLCanvasElement)) throw new Error(`Missing ${sel}`);
  return el;
}

declare global {
  interface Window {
    __garden?: { sim: Sim; params: Params; camera: Camera };
  }
}

window.__garden = { sim, params, camera };
Object.defineProperty(window.__garden, "sim", { get: () => sim });
