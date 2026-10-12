import { DEFAULTS, PRESETS, SECTIONS, type Settings, type SettingKey, type SettingSpec } from "./settings.ts";
import { createWorld, snapshot, step, SIM_DT, type Blob, type Snapshot, type World } from "./sim.ts";
import { GardenScene } from "./scene.ts";
import { drawPhase, drawTimeline, drawTraits, type EventMark } from "./charts.ts";
import { summarize } from "./summary.ts";

const SAMPLE_EVERY = 1;
const SPEEDS = [1, 4, 12, 30];
const MAX_STEPS_PER_FRAME = 600;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const settings: Settings = { ...DEFAULTS };
let world: World = createWorld(settings);
let history: Snapshot[] = [];
let events: EventMark[] = [];
let nextSampleAt = SAMPLE_EVERY;
let playing = true;
let speedIdx = 1;
let selectedId: number | null = null;
let pendingReset = false;
let timelineHover: number | null = null;
let accumulator = 0;

const sceneCanvas = $<HTMLCanvasElement>("world");
const scene = new GardenScene(sceneCanvas);

const fieldRefs = new Map<SettingKey, { range: HTMLInputElement; num: HTMLInputElement }>();

function fmt(spec: SettingSpec, v: number): string {
  return spec.step < 1 ? v.toFixed(2) : String(Math.round(v));
}

function clampToSpec(spec: SettingSpec, v: number): number {
  const c = Math.min(spec.max, Math.max(spec.min, v));
  const k = Math.round(c / spec.step) * spec.step;
  return Number(k.toFixed(4));
}

function startWorld(): void {
  world = createWorld(settings);
  history = [];
  events = [];
  nextSampleAt = SAMPLE_EVERY;
  selectedId = null;
  pendingReset = false;
  record();
  syncPending();
}

function record(): void {
  history.push(snapshot(world));
}

function advance(): void {
  step(world, SIM_DT);
  if (world.t >= nextSampleAt) {
    record();
    nextSampleAt += SAMPLE_EVERY;
  }
}

function syncPending(): void {
  $("pending").hidden = !pendingReset;
}

function setSettingValue(key: SettingKey, value: number): void {
  settings[key] = value;
  const spec = findSpec(key);
  const refs = fieldRefs.get(key);
  if (refs) {
    refs.range.value = String(value);
    refs.num.value = String(value);
  }
  if (spec.structural) {
    pendingReset = true;
  } else {
    events.push({ t: world.t, label: `${spec.label} → ${fmt(spec, value)}` });
  }
  syncPending();
}

function findSpec(key: SettingKey): SettingSpec {
  for (const sec of SECTIONS) for (const sp of sec.specs) if (sp.key === key) return sp;
  throw new Error(`unknown setting ${key}`);
}

function buildControls(): void {
  const root = $("sections");
  root.innerHTML = "";
  fieldRefs.clear();
  for (const sec of SECTIONS) {
    const box = document.createElement("div");
    box.className = "section";
    const h = document.createElement("h2");
    h.textContent = sec.title;
    box.appendChild(h);
    for (const spec of sec.specs) {
      const wrap = document.createElement("div");
      wrap.className = "field";
      wrap.title = spec.hint;
      const label = document.createElement("label");
      label.textContent = spec.label;
      if (spec.structural) {
        const tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = "reset";
        label.appendChild(tag);
      }
      const num = document.createElement("input");
      num.type = "number";
      num.min = String(spec.min);
      num.max = String(spec.max);
      num.step = String(spec.step);
      const range = document.createElement("input");
      range.type = "range";
      range.min = String(spec.min);
      range.max = String(spec.max);
      range.step = String(spec.step);
      const v = settings[spec.key];
      range.value = String(v);
      num.value = String(v);
      range.addEventListener("input", () => setSettingValue(spec.key, clampToSpec(spec, Number(range.value))));
      num.addEventListener("change", () => setSettingValue(spec.key, clampToSpec(spec, Number(num.value))));
      const hint = document.createElement("div");
      hint.className = "hint";
      hint.textContent = spec.hint;
      wrap.append(label, num, range, hint);
      box.appendChild(wrap);
      fieldRefs.set(spec.key, { range, num });
    }
    root.appendChild(box);
  }
}

function applyPreset(id: string): void {
  const preset = PRESETS.find((p) => p.id === id);
  if (!preset) return;
  Object.assign(settings, DEFAULTS, preset.values);
  buildControls();
  startWorld();
  playing = true;
  syncPlayButton();
}

function randomize(): void {
  const jitter = (v: number, spec: SettingSpec) => clampToSpec(spec, v * (0.88 + Math.random() * 0.24));
  for (const sec of SECTIONS) {
    for (const spec of sec.specs) {
      if (spec.key === "seed") continue;
      settings[spec.key] = jitter(settings[spec.key], spec);
    }
  }
  settings.seed = 1 + Math.floor(Math.random() * 99998);
  buildControls();
  startWorld();
}

function syncPlayButton(): void {
  $("playBtn").textContent = playing ? "Pause" : "Play";
}

function buildPresets(): void {
  const box = $("presets");
  box.innerHTML = "";
  for (const p of PRESETS) {
    const b = document.createElement("button");
    b.innerHTML = `${p.name}<small>${p.blurb}</small>`;
    b.addEventListener("click", () => applyPreset(p.id));
    box.appendChild(b);
  }
}

function buildSpeeds(): void {
  const seg = $("speedSeg");
  seg.innerHTML = "";
  SPEEDS.forEach((s, i) => {
    const b = document.createElement("button");
    b.textContent = `${s}×`;
    b.className = i === speedIdx ? "on" : "";
    b.addEventListener("click", () => {
      speedIdx = i;
      buildSpeeds();
    });
    seg.appendChild(b);
  });
}

function findBlob(id: number): { blob: Blob; group: "blue" | "red" } | null {
  for (const b of world.blues) if (b.id === id) return { blob: b, group: "blue" };
  for (const r of world.reds) if (r.id === id) return { blob: r, group: "red" };
  return null;
}

function renderInspector(): void {
  const box = $("inspector");
  const found = selectedId === null ? null : findBlob(selectedId);
  if (!found) {
    box.hidden = true;
    if (selectedId !== null) {
      box.hidden = false;
      box.innerHTML = `<h3>Gone</h3><div class="muted">That blob has died or is no longer in the garden. Click another one.</div>`;
    }
    return;
  }
  box.hidden = false;
  const { blob: b, group } = found;
  const spec = group === "blue" ? settings.blueVision : settings.redVision;
  const visionRange = spec * world.R * b.visionGene;
  const speed = Math.hypot(b.vx, b.vy) / world.R;
  const energyColor = group === "blue" ? "#3b82f6" : "#ef4444";
  const pauseLeft = b.pause > 0 ? `${b.pause.toFixed(1)}s left (${b.pauseKind})` : "moving";
  const action = b.state;
  box.innerHTML = `
    <h3 style="color:${energyColor}">${group === "blue" ? "Blue" : "Red"} blob #${b.id}</h3>
    <div class="bar"><i style="width:${Math.max(0, Math.min(100, b.energy))}%;background:${energyColor}"></i></div>
    <dl>
      <dt>Energy</dt><dd>${b.energy.toFixed(0)} / 100</dd>
      <dt>Age</dt><dd>${b.age.toFixed(0)}s</dd>
      <dt>Action</dt><dd>${action}</dd>
      <dt>Pause</dt><dd>${pauseLeft}</dd>
      <dt>Speed</dt><dd>${speed.toFixed(2)} dish radii/s</dd>
      <dt>Sensing range</dt><dd>${(visionRange / world.R).toFixed(2)} dish radii</dd>
      <dt>Speed gene</dt><dd>${b.speedGene.toFixed(2)}</dd>
      <dt>Vision gene</dt><dd>${b.visionGene.toFixed(2)}</dd>
      <dt>Parent</dt><dd>${b.parent ? "#" + b.parent : "founder"}</dd>
      <dt>Children</dt><dd>${b.children}</dd>
      <dt>${group === "blue" ? "Fruit eaten" : "Contacts"}</dt><dd>${group === "blue" ? b.eaten : b.contacts}</dd>
    </dl>`;
}

function renderStatus(): void {
  const fruitNow = world.trees.reduce((a, t) => a + t.fruit, 0);
  $("status").textContent = `t ${Math.floor(world.t)}s · blue ${world.blues.length} · red ${world.reds.length} · fruit ${fruitNow}`;
}

function renderStats(): void {
  const tot = world.totals;
  const hist = history;
  const peakB = hist.reduce((a, s) => Math.max(a, s.blue), 0);
  const peakR = hist.reduce((a, s) => Math.max(a, s.red), 0);
  const be = world.blues.length ? world.blues.reduce((a, b) => a + b.energy, 0) / world.blues.length : 0;
  const re = world.reds.length ? world.reds.reduce((a, b) => a + b.energy, 0) / world.reds.length : 0;
  const rows: [string, string][] = [
    ["Peak blue", String(peakB)],
    ["Peak red", String(peakR)],
    ["Blue births / deaths", `${tot.blueBirths} / ${tot.blueDeaths}`],
    ["Red births / deaths", `${tot.redBirths} / ${tot.redDeaths}`],
    ["Fruit eaten", String(tot.fruitEaten)],
    ["Gentle contacts", String(tot.contacts)],
    ["Avg blue energy", be.toFixed(0)],
    ["Avg red energy", re.toFixed(0)],
  ];
  $("stats").innerHTML = rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("");
}

function renderSummary(): void {
  const { lines } = summarize(history, world.totals);
  $("summary").innerHTML = lines.map((l) => `<li>${l}</li>`).join("");
}

function renderCharts(): void {
  drawTimeline(
    $<HTMLCanvasElement>("timeline"),
    history,
    events,
    { hover: timelineHover },
  );
  drawPhase($<HTMLCanvasElement>("phase"), history);
  drawTraits($<HTMLCanvasElement>("traits"), history);
}

let chartTimer = 0;
let lastFrame = performance.now();

function frame(now: number): void {
  const dt = Math.min(0.1, (now - lastFrame) / 1000);
  lastFrame = now;

  if (playing) {
    accumulator += dt * SPEEDS[speedIdx];
    let n = 0;
    while (accumulator >= SIM_DT && n < MAX_STEPS_PER_FRAME) {
      advance();
      accumulator -= SIM_DT;
      n++;
    }
    if (n >= MAX_STEPS_PER_FRAME) accumulator = 0;
  }

  const canvasRect = sceneCanvas.getBoundingClientRect();
  if (canvasRect.width !== lastSceneW || canvasRect.height !== lastSceneH) {
    lastSceneW = canvasRect.width;
    lastSceneH = canvasRect.height;
    scene.resize();
  }
  scene.selectedId = selectedId;
  scene.draw(world, now / 1000);

  chartTimer += dt;
  if (chartTimer > 0.25) {
    chartTimer = 0;
    renderStatus();
    renderStats();
    renderSummary();
    renderCharts();
    renderInspector();
  }
  requestAnimationFrame(frame);
}

let lastSceneW = 0;
let lastSceneH = 0;

function bindPointer(): void {
  let dragging = false;
  let moved = 0;
  let lastX = 0;
  let lastY = 0;
  sceneCanvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    moved = 0;
    lastX = e.clientX;
    lastY = e.clientY;
    sceneCanvas.setPointerCapture(e.pointerId);
    sceneCanvas.classList.add("dragging");
  });
  sceneCanvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    scene.yaw += dx * 0.008;
  });
  sceneCanvas.addEventListener("pointerup", (e) => {
    dragging = false;
    sceneCanvas.classList.remove("dragging");
    if (moved < 5) {
      const rect = sceneCanvas.getBoundingClientRect();
      const id = scene.pick(e.clientX - rect.left, e.clientY - rect.top);
      selectedId = id;
      renderInspector();
    }
  });
  sceneCanvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      scene.zoom = Math.min(1.8, Math.max(0.6, scene.zoom * (e.deltaY > 0 ? 0.95 : 1.05)));
    },
    { passive: false },
  );

  const tl = $<HTMLCanvasElement>("timeline");
  tl.addEventListener("pointermove", (e) => {
    const rect = tl.getBoundingClientRect();
    timelineHover = e.clientX - rect.left;
  });
  tl.addEventListener("pointerleave", () => {
    timelineHover = null;
  });
}

function bindTransport(): void {
  $("playBtn").addEventListener("click", () => {
    playing = !playing;
    syncPlayButton();
  });
  $("stepBtn").addEventListener("click", () => {
    playing = false;
    syncPlayButton();
    const target = world.t + 1;
    while (world.t < target) advance();
  });
  $("resetBtn").addEventListener("click", () => {
    startWorld();
  });
  $("randBtn").addEventListener("click", randomize);
}

function boot(): void {
  document.title = "Claude Haiku 5.5";
  buildPresets();
  buildControls();
  buildSpeeds();
  bindTransport();
  bindPointer();
  syncPlayButton();
  record();
  requestAnimationFrame((t) => {
    lastFrame = t;
    requestAnimationFrame(frame);
  });
}

boot();
