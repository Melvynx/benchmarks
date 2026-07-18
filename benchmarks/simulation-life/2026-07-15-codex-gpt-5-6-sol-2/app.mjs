import {
  FIXED_STEP,
  MAX_ENERGY,
  PARAM_SCHEMA,
  PRESETS,
  GardenSimulation,
  analyzeRun,
  runHeadless,
  summarizeHistory
} from "./engine.mjs";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const TAU = Math.PI * 2;

const elements = {
  worldCanvas: $("#worldCanvas"),
  worldWrap: $("#worldWrap"),
  timelineCanvas: $("#timelineCanvas"),
  phaseCanvas: $("#phaseCanvas"),
  chartTooltip: $("#chartTooltip"),
  historyAccessibleSummary: $("#historyAccessibleSummary"),
  playButton: $("#playButton"),
  stepButton: $("#stepButton"),
  resetButton: $("#resetButton"),
  randomizeButton: $("#randomizeButton"),
  rerollSeed: $("#rerollSeed"),
  seedInput: $("#seedInput"),
  applyAndReset: $("#applyAndReset"),
  presetList: $("#presetList"),
  controlGroups: $("#controlGroups"),
  gardenToast: $("#gardenToast"),
  liveAnnouncer: $("#liveAnnouncer"),
  liveDot: $("#liveDot"),
  runStateLabel: $("#runStateLabel"),
  headerTime: $("#headerTime"),
  headerSpeed: $("#headerSpeed"),
  fruitCount: $("#fruitCount"),
  blueCount: $("#blueCount"),
  redCount: $("#redCount"),
  gardenNote: $("#gardenNote"),
  footerSeed: $("#footerSeed"),
  inspectorCard: $("#inspectorCard"),
  inspectorEmpty: $("#inspectorEmpty"),
  inspectorContent: $("#inspectorContent"),
  inspectFirst: $("#inspectFirst"),
  cycleResident: $("#cycleResident"),
  clearInspection: $("#clearInspection"),
  residentAvatar: $("#residentAvatar"),
  residentGroup: $("#residentGroup"),
  residentName: $("#residentName"),
  residentFamily: $("#residentFamily"),
  residentEnergy: $("#residentEnergy"),
  energyFill: $("#energyFill"),
  residentAge: $("#residentAge"),
  residentAction: $("#residentAction"),
  residentSpeed: $("#residentSpeed"),
  residentVision: $("#residentVision"),
  residentTimer: $("#residentTimer"),
  residentParent: $("#residentParent"),
  phaseStatus: $("#phaseStatus"),
  summaryText: $("#summaryText"),
  peakBlue: $("#peakBlue"),
  peakRed: $("#peakRed"),
  peakBlueTime: $("#peakBlueTime"),
  peakRedTime: $("#peakRedTime"),
  fruitEaten: $("#fruitEaten"),
  contactCount: $("#contactCount")
};

let currentPresetKey = "balanced";
let currentValues = { ...PRESETS[currentPresetKey].values };
let presetBaseline = { ...currentValues };
let simulation = new GardenSimulation(currentValues);
let playing = false;
let selectedId = null;
let simAccumulator = 0;
let visualTime = 0;
let lastFrame = performance.now();
let lastUiUpdate = 0;
let cameraRotation = -0.38;
let cameraVelocity = 0;
let renderHitboxes = [];
let particles = [];
let toastTimer = 0;
let lastTimelineLayout = null;
let chartKeyboardIndex = null;
let worldMetrics = null;
const rangeInputs = new Map();
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");

function formatTime(seconds) {
  const rounded = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}

function formatValue(item, value) {
  const numeric = Number(value).toFixed(item.decimals);
  return `${numeric}${item.suffix}`;
}

function actionName(action) {
  const names = {
    "avoiding red": "Avoiding red",
    "seeking fruit": "Seeking fruit",
    eating: "Eating fruit",
    wandering: "Wandering",
    searching: "Searching for blue",
    "tracking blue": "Tracking blue",
    contacting: "Gentle contact",
    resting: "Resting after contact",
    startled: "Startled"
  };
  return names[action] || action;
}

function showToast(message) {
  elements.gardenToast.textContent = message;
  elements.gardenToast.classList.add("visible");
  elements.liveAnnouncer.textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.gardenToast.classList.remove("visible"), 1900);
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { context, width: rect.width, height: rect.height, dpr };
}

function createControls() {
  for (const item of PARAM_SCHEMA) {
    const container = $(`.sliders[data-group="${item.group}"]`);
    const row = document.createElement("div");
    row.className = "slider-row";
    row.dataset.key = item.key;
    row.innerHTML = `
      <div class="slider-meta">
        <label for="control-${item.key}">${item.label}</label>
        <output class="slider-value" for="control-${item.key}"></output>
      </div>
      <input id="control-${item.key}" name="${item.key}" type="range" min="${item.min}" max="${item.max}" step="${item.step}" />
    `;
    const input = $("input", row);
    const output = $("output", row);
    input.value = String(currentValues[item.key]);
    input.style.setProperty("--range-color", item.group === "blue" ? "#3f92ee" : item.group === "red" ? "#e75a63" : "#5f9470");
    const sync = () => {
      const value = Number(input.value);
      currentValues[item.key] = value;
      output.value = formatValue(item, value);
      const progress = ((value - item.min) / (item.max - item.min)) * 100;
      input.style.setProperty("--range-progress", `${progress}%`);
      row.classList.toggle("changed", Math.abs(value - presetBaseline[item.key]) > item.step * 0.25);
      if (item.group !== "start") simulation.setConfigValue(item.key, value);
    };
    input.addEventListener("input", sync);
    sync();
    container.append(row);
    rangeInputs.set(item.key, { input, output, row, item, sync });
  }
}

function syncControlsFromValues() {
  for (const [key, control] of rangeInputs) {
    control.input.value = String(currentValues[key]);
    control.sync();
  }
  elements.seedInput.value = String(currentValues.seed);
  elements.footerSeed.textContent = `SEED ${currentValues.seed}`;
  syncSpeedButtons();
}

function syncSpeedButtons() {
  $$("[data-speed]").forEach((button) => {
    const active = Number(button.dataset.speed) === Number(currentValues.simSpeed);
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  elements.headerSpeed.textContent = `${currentValues.simSpeed}×`;
}

function resetSimulation(message = "Garden reset to its starting moment.") {
  simulation = new GardenSimulation(currentValues);
  simAccumulator = 0;
  selectedId = null;
  particles = [];
  updateAllUi(true);
  showToast(message);
}

function applyPreset(key) {
  const selected = PRESETS[key];
  if (!selected) return;
  currentPresetKey = key;
  currentValues = { ...selected.values, simSpeed: currentValues.simSpeed };
  presetBaseline = { ...currentValues };
  $$("[data-preset]").forEach((button, index) => {
    const active = button.dataset.preset === key;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
    if (active) $(".recipe-number").textContent = `${String(index + 1).padStart(2, "0")} / 05`;
  });
  elements.gardenNote.textContent = selected.note;
  syncControlsFromValues();
  resetSimulation(`${selected.name} planted.`);
}

function randomizeSeed() {
  const next = ((Date.now() ^ Math.floor(performance.now() * 1000)) % 999998 + 999998) % 999998 + 1;
  currentValues.seed = next;
  elements.seedInput.value = String(next);
  elements.footerSeed.textContent = `SEED ${next}`;
  resetSimulation(`New seed ${next} scattered.`);
}

function togglePlaying(force) {
  playing = typeof force === "boolean" ? force : !playing;
  elements.playButton.classList.toggle("playing", playing);
  elements.playButton.setAttribute("aria-label", playing ? "Pause simulation" : "Play simulation");
  elements.liveDot.classList.toggle("active", playing);
  elements.runStateLabel.textContent = playing ? "PLAYING" : "PAUSED";
  showToast(playing ? "The garden is moving." : "The garden is holding still.");
}

function stepOnce() {
  simulation.step(FIXED_STEP);
  absorbSimulationEvents();
  updateAllUi(true);
}

function cycleResident() {
  const residents = simulation.getAllBlobs();
  if (!residents.length) {
    clearSelection();
    showToast("No residents remain in this run.");
    return;
  }
  const index = residents.findIndex((blob) => blob.id === selectedId);
  const next = residents[(index + 1 + residents.length) % residents.length];
  selectResident(next.id);
}

function selectResident(id) {
  const blob = simulation.getBlob(id);
  if (!blob) return;
  selectedId = id;
  updateInspector();
  showToast(`${blob.kind === "blue" ? "Blue" : "Red"} ${blob.id} is ${actionName(blob.action).toLowerCase()}.`);
}

function clearSelection() {
  selectedId = null;
  updateInspector();
}

function updateInspector() {
  const blob = selectedId ? simulation.getBlob(selectedId) : null;
  if (!blob) {
    if (selectedId) selectedId = null;
    elements.inspectorEmpty.hidden = false;
    elements.inspectorContent.hidden = true;
    return;
  }
  const isRed = blob.kind === "red";
  elements.inspectorEmpty.hidden = true;
  elements.inspectorContent.hidden = false;
  elements.residentAvatar.classList.toggle("red", isRed);
  elements.residentGroup.classList.toggle("red", isRed);
  elements.residentGroup.textContent = `${blob.kind.toUpperCase()} GROUP`;
  elements.residentName.textContent = `${isRed ? "Red" : "Blue"} ${blob.id}`;
  elements.residentFamily.textContent = `Generation ${blob.generation} · ${blob.parentId ? "Garden-born" : "Founding blob"}`;
  elements.residentEnergy.textContent = `${Math.max(0, Math.round(blob.energy))}%`;
  elements.energyFill.style.width = `${clamp(blob.energy, 0, MAX_ENERGY)}%`;
  elements.energyFill.style.background = blob.energy < 25
    ? "linear-gradient(90deg, #dc674f, #e6a04c)"
    : "linear-gradient(90deg, #6aae4a, #b5dd6f)";
  elements.residentAge.textContent = `${Math.floor(blob.age)}s`;
  elements.residentAction.textContent = actionName(blob.action);
  elements.residentSpeed.textContent = `${Math.hypot(blob.vx, blob.vy).toFixed(1)} u/s`;
  elements.residentVision.textContent = `${Math.round(blob.traits.vision)} units`;
  elements.residentTimer.textContent = blob.actionTimer > 0 ? `${blob.actionTimer.toFixed(1)}s left` : "Ready";
  elements.residentParent.textContent = blob.parentId || "Founding blob";
}

function updateAllUi(forceCharts = false) {
  const snapshot = simulation.snapshot();
  elements.fruitCount.textContent = String(snapshot.fruit);
  elements.blueCount.textContent = String(snapshot.blue);
  elements.redCount.textContent = String(snapshot.red);
  elements.headerTime.textContent = formatTime(snapshot.time);
  elements.footerSeed.textContent = `SEED ${currentValues.seed}`;
  elements.worldCanvas.setAttribute(
    "aria-label",
    `${playing ? "A moving" : "A paused"} round garden with ${snapshot.fruit} fruit, ${snapshot.blue} blue blobs, and ${snapshot.red} red blobs. Drag to rotate. Click a blob to inspect it.${selectedId ? ` Selected ${selectedId}.` : ""}`
  );
  const report = analyzeRun(simulation);
  const latest = simulation.history.at(-1);
  elements.historyAccessibleSummary.textContent = latest
    ? `At ${formatTime(latest.t)}, the garden has ${latest.fruit} fruit, ${latest.blue} blue blobs, and ${latest.red} red blobs. The recorded peaks are ${report.bluePeak} blue and ${report.redPeak} red.`
    : "No simulation history has been recorded yet.";
  elements.phaseCanvas.setAttribute("aria-label", `Phase plot of blue versus red population. Latest point: ${latest?.blue ?? 0} blue and ${latest?.red ?? 0} red.`);
  updateInspector();
  updateSummary();
  if (forceCharts || simulation.history.length > 1) drawCharts();
}

function updateSummary() {
  const report = analyzeRun(simulation);
  elements.summaryText.textContent = summarizeHistory(simulation);
  elements.peakBlue.textContent = simulation.history.length > 1 ? String(report.bluePeak) : "—";
  elements.peakRed.textContent = simulation.history.length > 1 ? String(report.redPeak) : "—";
  elements.peakBlueTime.textContent = simulation.history.length > 1 ? `at ${formatTime(report.bluePeakTime)}` : "waiting";
  elements.peakRedTime.textContent = simulation.history.length > 1 ? `at ${formatTime(report.redPeakTime)}` : "waiting";
  elements.fruitEaten.textContent = simulation.stats.fruitEaten ? String(simulation.stats.fruitEaten) : "—";
  elements.contactCount.textContent = simulation.stats.contacts ? `${simulation.stats.contacts} gentle contacts` : "no contacts yet";
  if (simulation.history.length < 25) elements.phaseStatus.textContent = "COLLECTING";
  else if (report.extinctBlue || report.extinctRed) elements.phaseStatus.textContent = "SETTLING";
  else if (report.peakLag > 4) elements.phaseStatus.textContent = `RED +${report.peakLag}s`;
  else elements.phaseStatus.textContent = "IN MOTION";
}

function projectPoint(x, y, z = 0) {
  const cosine = Math.cos(cameraRotation);
  const sine = Math.sin(cameraRotation);
  const rx = x * cosine - y * sine;
  const ry = x * sine + y * cosine;
  return {
    x: worldMetrics.centerX + rx * worldMetrics.unit,
    y: worldMetrics.centerY + ry * worldMetrics.unit * 0.56 - z * worldMetrics.unit,
    depth: ry,
    rx,
    ry
  };
}

function drawWorld() {
  const { context: ctx, width, height } = resizeCanvas(elements.worldCanvas);
  ctx.clearRect(0, 0, width, height);
  if (width <= 1 || height <= 1) return;

  const radius = simulation.config.worldSize;
  const unit = Math.min(width / (radius * 2.48), height / (radius * 1.45));
  const centerX = width * 0.5;
  const centerY = height * 0.52;
  const dishRadiusX = radius * unit * 1.05;
  const dishRadiusY = dishRadiusX * 0.56;
  worldMetrics = { width, height, unit, centerX, centerY, dishRadiusX, dishRadiusY };
  renderHitboxes = [];

  ctx.save();
  ctx.filter = "blur(12px)";
  ctx.fillStyle = "rgba(64, 47, 27, 0.19)";
  ctx.beginPath();
  ctx.ellipse(centerX + 3, centerY + dishRadiusY * 0.52, dishRadiusX * 0.96, dishRadiusY * 0.58, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#80613d";
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 15, dishRadiusX, dishRadiusY, 0, 0, TAU);
  ctx.fill();

  const rimGradient = ctx.createLinearGradient(0, centerY - dishRadiusY, 0, centerY + dishRadiusY);
  rimGradient.addColorStop(0, "#e4c98f");
  rimGradient.addColorStop(0.55, "#b98e55");
  rimGradient.addColorStop(1, "#8f673e");
  ctx.fillStyle = rimGradient;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 5, dishRadiusX, dishRadiusY, 0, 0, TAU);
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, dishRadiusX * 0.94, dishRadiusY * 0.9, 0, 0, TAU);
  ctx.clip();

  const ground = ctx.createRadialGradient(centerX - dishRadiusX * 0.2, centerY - dishRadiusY * 0.45, 10, centerX, centerY, dishRadiusX);
  ground.addColorStop(0, "#99be6f");
  ground.addColorStop(0.5, "#78a65c");
  ground.addColorStop(1, "#557b48");
  ctx.fillStyle = ground;
  ctx.fillRect(centerX - dishRadiusX, centerY - dishRadiusY, dishRadiusX * 2, dishRadiusY * 2);

  for (let index = 0; index < 18; index += 1) {
    const angle = index * 2.399 + 0.4;
    const radial = radius * (0.17 + ((index * 37) % 71) / 100);
    const point = projectPoint(Math.cos(angle) * radial, Math.sin(angle) * radial);
    const patch = 6 + ((index * 13) % 16);
    ctx.fillStyle = index % 3 === 0 ? "rgba(91, 110, 58, 0.2)" : "rgba(219, 204, 132, 0.13)";
    ctx.beginPath();
    ctx.ellipse(point.x, point.y, patch * unit * 0.44, patch * unit * 0.17, angle, 0, TAU);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(235, 242, 187, 0.2)";
  ctx.lineWidth = 1;
  for (let index = 0; index < 72; index += 1) {
    const angle = index * 2.17;
    const radial = radius * (0.15 + ((index * 29) % 80) / 100);
    const point = projectPoint(Math.cos(angle) * radial, Math.sin(angle) * radial);
    const blade = 2 + (index % 3);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(point.x + Math.sin(angle) * blade, point.y - blade * 0.7);
    ctx.stroke();
  }
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 244, 204, 0.54)";
  ctx.lineWidth = Math.max(2, unit * 1.4);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 2, dishRadiusX * 0.97, dishRadiusY * 0.94, 0, Math.PI, TAU);
  ctx.stroke();

  const selected = selectedId ? simulation.getBlob(selectedId) : null;
  if (selected) drawSenseRange(ctx, selected);

  const drawItems = [
    ...simulation.trees.map((tree) => ({ type: "tree", depth: projectPoint(tree.x, tree.y).depth, value: tree })),
    ...simulation.getAllBlobs().map((blob) => ({ type: "blob", depth: projectPoint(blob.x, blob.y).depth, value: blob }))
  ].sort((a, b) => a.depth - b.depth);

  let floatingLabels = 0;
  for (const item of drawItems) {
    if (item.type === "tree") drawTree(ctx, item.value);
    else {
      drawBlob(ctx, item.value);
      if ((item.value.id === selectedId || ["eating", "contacting", "resting"].includes(item.value.action)) && floatingLabels < 4) {
        drawActionTag(ctx, item.value);
        floatingLabels += 1;
      }
    }
  }

  drawParticles(ctx);

  ctx.strokeStyle = "rgba(94, 64, 35, 0.35)";
  ctx.lineWidth = Math.max(1, unit * 0.45);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + 9, dishRadiusX * 0.99, dishRadiusY * 0.97, 0, 0, Math.PI);
  ctx.stroke();
}

function drawSenseRange(ctx, blob) {
  const point = projectPoint(blob.x, blob.y);
  const radius = blob.traits.vision * worldMetrics.unit;
  ctx.save();
  ctx.setLineDash([5, 6]);
  ctx.strokeStyle = blob.kind === "blue" ? "rgba(51, 137, 239, 0.38)" : "rgba(231, 78, 91, 0.38)";
  ctx.fillStyle = blob.kind === "blue" ? "rgba(51, 137, 239, 0.045)" : "rgba(231, 78, 91, 0.045)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, radius, radius * 0.56, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawTree(ctx, tree) {
  const point = projectPoint(tree.x, tree.y);
  const sprite = clamp(worldMetrics.unit / 3.45, 0.74, 1.36) * tree.size;
  const trunkHeight = 29 * sprite;
  const canopyY = point.y - trunkHeight;

  ctx.save();
  ctx.fillStyle = "rgba(35, 48, 25, 0.2)";
  ctx.beginPath();
  ctx.ellipse(point.x + 3 * sprite, point.y + 4 * sprite, 17 * sprite, 6 * sprite, -0.08, 0, TAU);
  ctx.fill();

  ctx.lineCap = "round";
  ctx.strokeStyle = "#68482e";
  ctx.lineWidth = 7 * sprite;
  ctx.beginPath();
  ctx.moveTo(point.x, point.y + 1);
  ctx.quadraticCurveTo(point.x + tree.tilt * 16, point.y - trunkHeight * 0.46, point.x + tree.tilt * 8, canopyY + 6 * sprite);
  ctx.stroke();
  ctx.strokeStyle = "rgba(237, 190, 112, 0.35)";
  ctx.lineWidth = 1.5 * sprite;
  ctx.stroke();

  const pulseScale = reducedMotion.matches ? 1 : 1 + tree.pulse * 0.04;
  const clusters = [
    [-12, 0, 18], [11, -2, 19], [0, -13, 20], [-2, 8, 20], [16, 9, 14], [-17, 10, 14]
  ];
  for (let index = 0; index < clusters.length; index += 1) {
    const [ox, oy, size] = clusters[index];
    const gradient = ctx.createRadialGradient(
      point.x + (ox - 5) * sprite,
      canopyY + (oy - 6) * sprite,
      1,
      point.x + ox * sprite,
      canopyY + oy * sprite,
      size * sprite
    );
    gradient.addColorStop(0, index % 2 ? "#a7ce73" : "#b1d67e");
    gradient.addColorStop(0.58, index % 2 ? "#67994d" : "#72a454");
    gradient.addColorStop(1, "#3f703f");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(point.x + ox * sprite, canopyY + oy * sprite, size * sprite * pulseScale, 0, TAU);
    ctx.fill();
  }

  const eater = simulation.blues.find((blob) => blob.action === "eating" && blob.targetId === tree.id);
  tree.fruitSlots.forEach((slot, index) => {
    const isEating = eater && eater.targetSlot === index;
    const eatScale = isEating && eater.actionDuration > 0
      ? clamp(0.25 + 0.75 * (eater.actionTimer / eater.actionDuration), 0.25, 1)
      : 1;
    const growthScale = slot.ready ? 1 : clamp(slot.progress, 0, 1);
    if (!slot.ready && growthScale < 0.08) return;
    const x = point.x + slot.ox * 28 * sprite;
    const y = canopyY + slot.oy * 28 * sprite;
    const size = 5.2 * sprite * growthScale * eatScale;
    const gradient = ctx.createRadialGradient(x - size * 0.3, y - size * 0.35, 0.5, x, y, size);
    gradient.addColorStop(0, "#e5f7a3");
    gradient.addColorStop(0.42, "#a3dc5f");
    gradient.addColorStop(1, "#5c9c40");
    ctx.globalAlpha = slot.ready ? 1 : 0.48;
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,225,0.75)";
    ctx.beginPath();
    ctx.arc(x - size * 0.25, y - size * 0.28, size * 0.2, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
  ctx.restore();
}

function projectedVelocity(blob) {
  const cosine = Math.cos(cameraRotation);
  const sine = Math.sin(cameraRotation);
  return {
    x: (blob.vx * cosine - blob.vy * sine) * worldMetrics.unit,
    y: (blob.vx * sine + blob.vy * cosine) * worldMetrics.unit * 0.56
  };
}

function drawBlob(ctx, blob) {
  const point = projectPoint(blob.x, blob.y);
  const velocity = projectedVelocity(blob);
  const moving = Math.hypot(blob.vx, blob.vy) > 0.25 && blob.actionTimer <= 0;
  const decorativeMotion = !reducedMotion.matches;
  const stepBounce = decorativeMotion && moving ? Math.abs(Math.sin(simulation.time * 7.5 + blob.visualPhase)) * 2.5 : 0;
  const idleBreath = decorativeMotion ? Math.sin(visualTime * 2.1 + blob.visualPhase) * 0.018 : 0;
  const actionBounce = decorativeMotion && blob.action === "eating" ? Math.abs(Math.sin((blob.actionDuration - blob.actionTimer) * 10)) * 2.4 : 0;
  const heightOffset = stepBounce + actionBounce;
  const size = clamp(worldMetrics.unit * 3.35, 12, 20);
  const width = size * (0.92 + idleBreath);
  const height = size * (1.26 - idleBreath);
  const lean = clamp(velocity.x / 160, -0.14, 0.14);
  const alpha = clamp(0.42 + blob.energy / MAX_ENERGY * 0.58, 0.38, 1);

  ctx.save();
  ctx.globalAlpha = alpha * 0.32;
  ctx.fillStyle = blob.kind === "blue" ? "#174f8b" : "#8d2f43";
  ctx.beginPath();
  ctx.ellipse(point.x + velocity.x * 0.015, point.y + 3, width * 0.78, height * 0.25, 0, 0, TAU);
  ctx.fill();
  ctx.restore();

  if (blob.pulse > 0 || blob.action === "contacting") {
    ctx.save();
    ctx.globalAlpha = 0.16 + blob.pulse * 0.25;
    ctx.strokeStyle = blob.kind === "blue" ? "#73d4ff" : "#ff8d78";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(point.x, point.y - height * 0.58, width * (1.2 + (1 - blob.pulse) * 0.5), 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(point.x, point.y - height * 0.52 - heightOffset);
  ctx.rotate(lean);
  ctx.globalAlpha = alpha;
  const gradient = ctx.createLinearGradient(-width * 0.65, -height * 0.65, width * 0.7, height * 0.7);
  if (blob.kind === "blue") {
    gradient.addColorStop(0, "#8be2ff");
    gradient.addColorStop(0.3, "#4eaeff");
    gradient.addColorStop(0.72, "#2875dd");
    gradient.addColorStop(1, "#1c57b2");
  } else {
    gradient.addColorStop(0, "#ffb083");
    gradient.addColorStop(0.3, "#ff746e");
    gradient.addColorStop(0.72, "#df3f59");
    gradient.addColorStop(1, "#a92948");
  }
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(-width * 0.06, -height * 0.58);
  ctx.bezierCurveTo(width * 0.48, -height * 0.62, width * 0.64, -height * 0.14, width * 0.55, height * 0.27);
  ctx.bezierCurveTo(width * 0.47, height * 0.62, width * 0.04, height * 0.7, -width * 0.36, height * 0.55);
  ctx.bezierCurveTo(-width * 0.7, height * 0.4, -width * 0.63, -height * 0.15, -width * 0.42, -height * 0.45);
  ctx.bezierCurveTo(-width * 0.31, -height * 0.58, -width * 0.18, -height * 0.61, -width * 0.06, -height * 0.58);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = blob.kind === "blue" ? "rgba(25, 67, 124, 0.28)" : "rgba(117, 30, 56, 0.28)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.beginPath();
  ctx.ellipse(-width * 0.25, -height * 0.31, width * 0.15, height * 0.11, -0.4, 0, TAU);
  ctx.fill();

  const blinkHeight = decorativeMotion && blob.blink > 0 ? 0.7 : Math.max(1.3, height * 0.12);
  const eyeColor = blob.kind === "blue" ? "#123c68" : "#652035";
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  for (const eyeX of [-0.17, 0.18]) {
    ctx.beginPath();
    ctx.ellipse(width * eyeX, -height * 0.08, width * 0.115, blinkHeight, 0, 0, TAU);
    ctx.fill();
    if (blinkHeight > 1) {
      ctx.fillStyle = eyeColor;
      ctx.beginPath();
      ctx.arc(width * eyeX + width * 0.02, -height * 0.07, Math.max(1.1, width * 0.045), 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.94)";
    }
  }

  ctx.strokeStyle = eyeColor;
  ctx.lineWidth = Math.max(1, width * 0.06);
  ctx.lineCap = "round";
  ctx.beginPath();
  if (blob.energy < 18) {
    ctx.arc(0, height * 0.26, width * 0.12, Math.PI * 1.12, Math.PI * 1.88);
  } else if (blob.action === "eating") {
    ctx.arc(0, height * 0.19, width * 0.08, 0, TAU);
  } else {
    ctx.arc(0, height * 0.13, width * 0.16, 0.12, Math.PI - 0.12);
  }
  ctx.stroke();

  if (blob.id === selectedId) {
    ctx.strokeStyle = "rgba(255, 251, 211, 0.95)";
    ctx.lineWidth = 2.3;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.ellipse(0, 0, width * 0.82, height * 0.86, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();

  renderHitboxes.push({ id: blob.id, x: point.x, y: point.y - height * 0.52 - heightOffset, rx: width * 0.85, ry: height * 0.9, depth: point.depth });
}

function drawActionTag(ctx, blob) {
  const point = projectPoint(blob.x, blob.y);
  const size = clamp(worldMetrics.unit * 3.35, 12, 20);
  const label = actionName(blob.action).toUpperCase();
  ctx.save();
  ctx.font = "800 8px ui-rounded, system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = ctx.measureText(label).width + 14;
  const y = point.y - size * 2.05;
  ctx.fillStyle = "rgba(255, 250, 238, 0.9)";
  ctx.beginPath();
  ctx.roundRect(point.x - width / 2, y - 10, width, 19, 7);
  ctx.fill();
  ctx.fillStyle = blob.kind === "blue" ? "#2b6eb5" : "#b33b50";
  ctx.fillText(label, point.x, y);
  ctx.restore();
}

function absorbSimulationEvents() {
  const events = simulation.drainEvents();
  if (reducedMotion.matches) return;
  for (const event of events) {
    const count = event.type === "contact" || event.type === "birth" ? 10 : event.type === "death" ? 7 : 5;
    for (let index = 0; index < count; index += 1) {
      const angle = index * 2.399 + event.time * 0.7;
      const speed = 4 + (index % 4) * 1.8;
      particles.push({
        x: event.x,
        y: event.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0,
        duration: 0.55 + (index % 3) * 0.14,
        type: event.type,
        kind: event.kind || (event.type === "eat" || event.type === "regrow" ? "fruit" : index % 2 ? "red" : "blue")
      });
    }
  }
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function updateParticles(dt) {
  for (const particle of particles) particle.life += dt;
  particles = particles.filter((particle) => particle.life < particle.duration);
}

function drawParticles(ctx) {
  for (const particle of particles) {
    const point = projectPoint(
      particle.x + particle.vx * particle.life,
      particle.y + particle.vy * particle.life
    );
    const progress = particle.life / particle.duration;
    const size = (1 - progress) * (particle.type === "birth" ? 4 : 3) + 1;
    ctx.save();
    ctx.globalAlpha = (1 - progress) * 0.82;
    ctx.fillStyle = particle.kind === "fruit" ? "#c6ef78" : particle.kind === "red" ? "#ff826d" : "#73cfff";
    ctx.translate(point.x, point.y - Math.sin(progress * Math.PI) * 14);
    ctx.rotate(progress * 2);
    if (particle.type === "contact") {
      ctx.fillRect(-size / 2, -size / 2, size, size);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawCharts() {
  drawTimeline();
  drawPhase();
}

function niceCeiling(value) {
  if (value <= 5) return 5;
  const power = 10 ** Math.floor(Math.log10(value));
  const normalized = value / power;
  const nice = normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * power;
}

function drawTimeline() {
  const { context: ctx, width, height } = resizeCanvas(elements.timelineCanvas);
  ctx.clearRect(0, 0, width, height);
  const margin = { left: 34, right: 34, top: 16, bottom: 25 };
  const plot = { x: margin.left, y: margin.top, w: Math.max(1, width - margin.left - margin.right), h: Math.max(1, height - margin.top - margin.bottom) };
  const history = simulation.history.slice(-720);
  const populationMax = niceCeiling(Math.max(5, ...history.map((point) => Math.max(point.blue, point.red))));
  const fruitMax = niceCeiling(Math.max(5, ...history.map((point) => point.fruit)));

  ctx.font = "700 8px ui-rounded, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  for (let line = 0; line <= 4; line += 1) {
    const y = plot.y + (plot.h * line) / 4;
    ctx.strokeStyle = "rgba(40, 71, 59, 0.09)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(53, 81, 73, 0.62)";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(populationMax * (1 - line / 4))), plot.x - 7, y);
    ctx.textAlign = "left";
    ctx.fillText(String(Math.round(fruitMax * (1 - line / 4))), plot.x + plot.w + 7, y);
  }

  ctx.fillStyle = "rgba(53, 81, 73, 0.6)";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const startTime = history[0]?.t || 0;
  const endTime = history.at(-1)?.t || 0;
  ctx.fillText(formatTime(startTime), plot.x, height - 5);
  ctx.textAlign = "right";
  ctx.fillText(formatTime(endTime), plot.x + plot.w, height - 5);

  if (history.length < 2) {
    ctx.fillStyle = "rgba(53, 81, 73, 0.48)";
    ctx.font = "italic 12px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Press play to draw the garden's real history", plot.x + plot.w / 2, plot.y + plot.h / 2);
    lastTimelineLayout = { ...plot, history };
    return;
  }

  const drawSeries = (key, max, color, fillColor) => {
    ctx.beginPath();
    history.forEach((point, index) => {
      const x = plot.x + (index / (history.length - 1)) * plot.w;
      const y = plot.y + plot.h - (point[key] / max) * plot.h;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(plot.x + plot.w, plot.y + plot.h);
    ctx.lineTo(plot.x, plot.y + plot.h);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();

    ctx.beginPath();
    history.forEach((point, index) => {
      const x = plot.x + (index / (history.length - 1)) * plot.w;
      const y = plot.y + plot.h - (point[key] / max) * plot.h;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.stroke();
  };

  drawSeries("fruit", fruitMax, "#72a94d", "rgba(114, 169, 77, 0.06)");
  drawSeries("blue", populationMax, "#2f86f4", "rgba(47, 134, 244, 0.055)");
  drawSeries("red", populationMax, "#e94f5d", "rgba(233, 79, 93, 0.045)");
  if (chartKeyboardIndex != null) {
    const index = clamp(chartKeyboardIndex, 0, history.length - 1);
    const x = plot.x + (index / (history.length - 1)) * plot.w;
    ctx.strokeStyle = "rgba(34, 72, 60, 0.32)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.stroke();
    for (const [key, max, color] of [["fruit", fruitMax, "#72a94d"], ["blue", populationMax, "#2f86f4"], ["red", populationMax, "#e94f5d"]]) {
      const y = plot.y + plot.h - (history[index][key] / max) * plot.h;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, TAU);
      ctx.fill();
    }
  }
  lastTimelineLayout = { ...plot, history };
}

function drawPhase() {
  const { context: ctx, width, height } = resizeCanvas(elements.phaseCanvas);
  ctx.clearRect(0, 0, width, height);
  const plot = { x: 33, y: 14, w: Math.max(1, width - 47), h: Math.max(1, height - 43) };
  const history = simulation.history.slice(-360);
  const maxBlue = niceCeiling(Math.max(5, ...history.map((point) => point.blue)));
  const maxRed = niceCeiling(Math.max(5, ...history.map((point) => point.red)));

  ctx.strokeStyle = "rgba(40, 71, 59, 0.1)";
  ctx.lineWidth = 1;
  for (let line = 0; line <= 4; line += 1) {
    const x = plot.x + (plot.w * line) / 4;
    const y = plot.y + (plot.h * line) / 4;
    ctx.beginPath();
    ctx.moveTo(x, plot.y);
    ctx.lineTo(x, plot.y + plot.h);
    ctx.moveTo(plot.x, y);
    ctx.lineTo(plot.x + plot.w, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(53, 81, 73, 0.58)";
  ctx.font = "800 8px ui-rounded, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(`BLUE 0 → ${maxBlue}`, plot.x + plot.w / 2, height - 6);
  ctx.save();
  ctx.translate(7, plot.y + plot.h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`RED 0 → ${maxRed}`, 0, 0);
  ctx.restore();

  if (history.length < 3) {
    ctx.fillStyle = "rgba(53, 81, 73, 0.43)";
    ctx.font = "italic 11px Georgia, serif";
    ctx.fillText("Waiting for a trail", plot.x + plot.w / 2, plot.y + plot.h / 2);
    return;
  }

  for (let index = 1; index < history.length; index += 1) {
    const previous = history[index - 1];
    const current = history[index];
    const alpha = 0.08 + (index / history.length) * 0.62;
    ctx.strokeStyle = `rgba(91, 76, 164, ${alpha})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(plot.x + (previous.blue / maxBlue) * plot.w, plot.y + plot.h - (previous.red / maxRed) * plot.h);
    ctx.lineTo(plot.x + (current.blue / maxBlue) * plot.w, plot.y + plot.h - (current.red / maxRed) * plot.h);
    ctx.stroke();
  }
  const latest = history.at(-1);
  const x = plot.x + (latest.blue / maxBlue) * plot.w;
  const y = plot.y + plot.h - (latest.red / maxRed) * plot.h;
  ctx.fillStyle = "rgba(96, 75, 174, 0.18)";
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#6750af";
  ctx.beginPath();
  ctx.arc(x, y, 3.5, 0, TAU);
  ctx.fill();
}

function updateTimelineTooltip(event) {
  const layout = lastTimelineLayout;
  if (!layout || layout.history.length < 2) return;
  const rect = elements.timelineCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  if (x < layout.x || x > layout.x + layout.w || y < layout.y || y > layout.y + layout.h) {
    elements.chartTooltip.hidden = true;
    return;
  }
  const ratio = clamp((x - layout.x) / layout.w, 0, 1);
  const index = Math.round(ratio * (layout.history.length - 1));
  const point = layout.history[index];
  setTimelineTooltip(point, x, y);
}

function setTimelineTooltip(point, x, y) {
  elements.chartTooltip.innerHTML = `<b>${formatTime(point.t)}</b><br><span style="color:#b7eb71">●</span> Fruit ${point.fruit}<br><span style="color:#68c8ff">●</span> Blue ${point.blue}<br><span style="color:#ff8b72">●</span> Red ${point.red}`;
  elements.chartTooltip.style.left = `${x}px`;
  elements.chartTooltip.style.top = `${y}px`;
  elements.chartTooltip.hidden = false;
}

function showKeyboardTimelinePoint(index) {
  const layout = lastTimelineLayout;
  if (!layout || layout.history.length < 2) return;
  chartKeyboardIndex = clamp(index, 0, layout.history.length - 1);
  const point = layout.history[chartKeyboardIndex];
  const x = layout.x + (chartKeyboardIndex / (layout.history.length - 1)) * layout.w;
  const y = layout.y + layout.h * 0.45;
  setTimelineTooltip(point, x, y);
  elements.historyAccessibleSummary.textContent = `Selected ${formatTime(point.t)}: ${point.fruit} fruit, ${point.blue} blue blobs, and ${point.red} red blobs.`;
  drawTimeline();
}

const drag = { active: false, pointerId: null, startX: 0, lastX: 0, lastTime: 0, moved: 0 };

function onWorldPointerDown(event) {
  drag.active = true;
  drag.pointerId = event.pointerId;
  drag.startX = event.clientX;
  drag.lastX = event.clientX;
  drag.lastTime = performance.now();
  drag.moved = 0;
  cameraVelocity = 0;
  elements.worldCanvas.setPointerCapture(event.pointerId);
  elements.worldCanvas.classList.add("dragging");
}

function onWorldPointerMove(event) {
  if (!drag.active || event.pointerId !== drag.pointerId) return;
  const now = performance.now();
  const dx = event.clientX - drag.lastX;
  const dt = Math.max(8, now - drag.lastTime);
  drag.moved += Math.abs(dx);
  cameraRotation += dx * 0.008;
  cameraVelocity = (dx * 0.008) / (dt / 1000);
  drag.lastX = event.clientX;
  drag.lastTime = now;
}

function onWorldPointerUp(event) {
  if (!drag.active || event.pointerId !== drag.pointerId) return;
  drag.active = false;
  elements.worldCanvas.classList.remove("dragging");
  try { elements.worldCanvas.releasePointerCapture(event.pointerId); } catch { /* pointer was already released */ }
  if (drag.moved < 7) pickBlob(event);
  if (reducedMotion.matches) cameraVelocity = 0;
}

function pickBlob(event) {
  const rect = elements.worldCanvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const hit = [...renderHitboxes]
    .reverse()
    .find((box) => ((x - box.x) / box.rx) ** 2 + ((y - box.y) / box.ry) ** 2 <= 1.2);
  if (hit) selectResident(hit.id);
  else clearSelection();
}

function animate(now) {
  const delta = Math.min(0.05, Math.max(0, (now - lastFrame) / 1000));
  lastFrame = now;
  visualTime += delta;

  if (!drag.active && Math.abs(cameraVelocity) > 0.001) {
    cameraRotation += cameraVelocity * delta;
    cameraVelocity *= Math.pow(0.05, delta);
  }

  if (playing) {
    simAccumulator += delta * currentValues.simSpeed;
    let steps = 0;
    while (simAccumulator >= FIXED_STEP && steps < 120) {
      simulation.step(FIXED_STEP);
      simAccumulator -= FIXED_STEP;
      steps += 1;
    }
    absorbSimulationEvents();
  }

  updateParticles(delta);
  drawWorld();
  if (now - lastUiUpdate > 180) {
    updateAllUi(false);
    lastUiUpdate = now;
  }
  requestAnimationFrame(animate);
}

function bindEvents() {
  elements.playButton.addEventListener("click", () => togglePlaying());
  elements.stepButton.addEventListener("click", stepOnce);
  elements.resetButton.addEventListener("click", () => resetSimulation());
  elements.randomizeButton.addEventListener("click", randomizeSeed);
  elements.rerollSeed.addEventListener("click", randomizeSeed);
  elements.applyAndReset.addEventListener("click", () => resetSimulation("Starting values applied."));
  elements.inspectFirst.addEventListener("click", cycleResident);
  elements.cycleResident.addEventListener("click", cycleResident);
  elements.clearInspection.addEventListener("click", clearSelection);
  elements.seedInput.addEventListener("change", () => {
    currentValues.seed = clamp(Math.round(Number(elements.seedInput.value) || 1), 1, 999999);
    elements.seedInput.value = String(currentValues.seed);
    elements.footerSeed.textContent = `SEED ${currentValues.seed}`;
  });

  $$("[data-speed]").forEach((button) => {
    button.addEventListener("click", () => {
      currentValues.simSpeed = Number(button.dataset.speed);
      simulation.config.simSpeed = currentValues.simSpeed;
      syncSpeedButtons();
      showToast(`Flow set to ${currentValues.simSpeed}×.`);
    });
  });

  $$("[data-preset]").forEach((button) => button.addEventListener("click", () => applyPreset(button.dataset.preset)));

  elements.worldCanvas.addEventListener("pointerdown", onWorldPointerDown);
  elements.worldCanvas.addEventListener("pointermove", onWorldPointerMove);
  elements.worldCanvas.addEventListener("pointerup", onWorldPointerUp);
  elements.worldCanvas.addEventListener("pointercancel", onWorldPointerUp);
  elements.timelineCanvas.addEventListener("pointermove", updateTimelineTooltip);
  elements.timelineCanvas.addEventListener("pointerleave", () => { elements.chartTooltip.hidden = true; });
  elements.timelineCanvas.addEventListener("focus", () => {
    const length = lastTimelineLayout?.history.length || 0;
    if (length) showKeyboardTimelinePoint(length - 1);
  });
  elements.timelineCanvas.addEventListener("keydown", (event) => {
    const length = lastTimelineLayout?.history.length || 0;
    if (!length || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") showKeyboardTimelinePoint(0);
    else if (event.key === "End") showKeyboardTimelinePoint(length - 1);
    else showKeyboardTimelinePoint((chartKeyboardIndex ?? length - 1) + (event.key === "ArrowLeft" ? -1 : 1));
  });
  elements.timelineCanvas.addEventListener("blur", () => {
    chartKeyboardIndex = null;
    elements.chartTooltip.hidden = true;
    drawTimeline();
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) particles = [];
  });

  window.addEventListener("keydown", (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest("button, input, select, textarea, summary, [contenteditable='true']")) return;
    if (event.code === "Space") {
      event.preventDefault();
      togglePlaying();
    } else if (event.key === ".") {
      event.preventDefault();
      stepOnce();
    } else if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      resetSimulation();
    } else if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      cycleResident();
    } else if (event.key === "Escape") {
      clearSelection();
    } else if (event.key === "ArrowLeft") {
      cameraRotation -= 0.12;
    } else if (event.key === "ArrowRight") {
      cameraRotation += 0.12;
    }
  });

  window.addEventListener("resize", () => drawCharts());
}

createControls();
bindEvents();
syncControlsFromValues();
updateAllUi(true);
drawWorld();
requestAnimationFrame(animate);

window.gardenApp = {
  get simulation() { return simulation; },
  get playing() { return playing; },
  play: () => togglePlaying(true),
  pause: () => togglePlaying(false),
  step: stepOnce,
  reset: resetSimulation,
  applyPreset,
  selectResident,
  runHeadless,
  PRESETS
};
