import {
  DEFAULT_CONFIG,
  GardenSimulation,
  PRESETS,
  STRUCTURAL_KEYS,
} from "./engine.mjs";

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (start, end, amount) => start + (end - start) * amount;
const formatInteger = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const SPEED_STEPS = [0.25, 0.5, 1, 2, 4, 5, 20, 100];

const CONTROL_GROUPS = [
  {
    id: "garden",
    label: "Fruit & garden",
    color: "#709547",
    open: true,
    controls: [
      {
        key: "fruitGrowth",
        label: "Fruit growth speed",
        help: "How quickly a returned fruit grows from bud to ripe.",
        min: 0.01,
        max: 0.12,
        step: 0.005,
        format: (value) => `${Number(value).toFixed(3)}/s`,
      },
      {
        key: "fruitLimit",
        label: "Fruit limit",
        help: "The total number of fruit slots attached to all trees.",
        min: 18,
        max: 100,
        step: 1,
        format: (value) => `${value}`,
      },
      {
        key: "fruitReturnDelay",
        label: "Fruit return delay",
        help: "How long a branch rests before a fruit bud returns.",
        min: 4,
        max: 40,
        step: 1,
        format: (value) => `${value}s`,
      },
    ],
  },
  {
    id: "blue",
    label: "Blue blobs",
    color: "#4c88ed",
    open: true,
    controls: [
      {
        key: "blueEnergyUse",
        label: "Energy use",
        help: "Metabolic cost; movement burns more than waiting.",
        min: 0.2,
        max: 1,
        step: 0.02,
        format: (value) => Number(value).toFixed(2),
      },
      {
        key: "blueSpeed",
        label: "Moving speed",
        help: "Top speed while foraging or fleeing.",
        min: 3,
        max: 9,
        step: 0.1,
        format: (value) => Number(value).toFixed(1),
      },
      {
        key: "blueVision",
        label: "Sensing range",
        help: "How far blue can notice fruit and nearby red blobs.",
        min: 12,
        max: 46,
        step: 1,
        format: (value) => `${value}u`,
      },
      {
        key: "blueCopyThreshold",
        label: "Copy threshold",
        help: "Stored energy needed before blue can make a child.",
        min: 60,
        max: 98,
        step: 1,
        format: (value) => `${value}%`,
      },
      {
        key: "blueEatingTime",
        label: "Eating time",
        help: "A real behavior pause while blue chews one fruit.",
        min: 0.5,
        max: 3,
        step: 0.1,
        format: (value) => `${Number(value).toFixed(1)}s`,
      },
    ],
  },
  {
    id: "red",
    label: "Red blobs",
    color: "#ef665d",
    open: true,
    controls: [
      {
        key: "redEnergyUse",
        label: "Energy use",
        help: "Metabolic cost; chasing burns more than pausing.",
        min: 0.3,
        max: 1.2,
        step: 0.02,
        format: (value) => Number(value).toFixed(2),
      },
      {
        key: "redSpeed",
        label: "Moving speed",
        help: "Top speed while looking for blue.",
        min: 3.5,
        max: 10,
        step: 0.1,
        format: (value) => Number(value).toFixed(1),
      },
      {
        key: "redVision",
        label: "Sensing range",
        help: "How far red can notice a blue blob.",
        min: 15,
        max: 55,
        step: 1,
        format: (value) => `${value}u`,
      },
      {
        key: "redContactStrength",
        label: "Contact strength",
        help: "Energy gently transferred away from blue on a boop.",
        min: 6,
        max: 26,
        step: 1,
        format: (value) => `${value}e`,
      },
      {
        key: "redCopyThreshold",
        label: "Copy threshold",
        help: "Stored energy needed before red can make a child.",
        min: 60,
        max: 98,
        step: 1,
        format: (value) => `${value}%`,
      },
      {
        key: "redPauseTime",
        label: "Pause after contact",
        help: "A real handling pause before red can search again.",
        min: 0.6,
        max: 5,
        step: 0.1,
        format: (value) => `${Number(value).toFixed(1)}s`,
      },
    ],
  },
  {
    id: "starting",
    label: "Starting world",
    color: "#d08b4b",
    open: false,
    controls: [
      {
        key: "treeCount",
        label: "Fruit trees",
        help: "How many fruit-bearing plants the reset world begins with.",
        min: 3,
        max: 14,
        step: 1,
        format: (value) => `${value}`,
      },
      {
        key: "blueStart",
        label: "Blue blobs",
        help: "Starting blue population on reset.",
        min: 6,
        max: 50,
        step: 1,
        format: (value) => `${value}`,
      },
      {
        key: "redStart",
        label: "Red blobs",
        help: "Starting red population on reset.",
        min: 1,
        max: 24,
        step: 1,
        format: (value) => `${value}`,
      },
      {
        key: "worldSize",
        label: "World size",
        help: "Radius of the circular garden dish.",
        min: 50,
        max: 100,
        step: 2,
        format: (value) => `${value}u`,
      },
      {
        key: "seed",
        label: "Random seed",
        help: "The same rules and seed create the same starting garden.",
        min: 1,
        max: 9999,
        step: 1,
        format: (value) => `#${String(value).padStart(4, "0")}`,
      },
    ],
  },
];

const ACTION_LABELS = {
  wandering: "wandering",
  foraging: "looking for fruit",
  eating: "chewing fruit",
  fleeing: "dodging red",
  seeking: "looking for blue",
  resting: "taking a tiny pause",
  startled: "recovering from a boop",
  budding: "making a new blob",
  fading: "returning to the garden",
};

const elements = {
  statusDot: document.querySelector("#statusDot"),
  statusLabel: document.querySelector("#statusLabel"),
  timeLabel: document.querySelector("#timeLabel"),
  randomizeButton: document.querySelector("#randomizeButton"),
  resetButtonTop: document.querySelector("#resetButtonTop"),
  resetButton: document.querySelector("#resetButton"),
  stepButton: document.querySelector("#stepButton"),
  playButton: document.querySelector("#playButton"),
  playLabel: document.querySelector("#playLabel"),
  simulationSpeed: document.querySelector("#simulationSpeed"),
  simulationSpeedOutput: document.querySelector("#simulationSpeedOutput"),
  speedBoostButtons: [...document.querySelectorAll("[data-speed-boost]")],
  controlsRoot: document.querySelector("#controlsRoot"),
  presetGrid: document.querySelector("#presetGrid"),
  pendingBadge: document.querySelector("#pendingBadge"),
  worldCanvas: document.querySelector("#worldCanvas"),
  worldWrap: document.querySelector("#worldWrap"),
  worldTooltip: document.querySelector("#worldTooltip"),
  dragHint: document.querySelector("#dragHint"),
  fruitCount: document.querySelector("#fruitCount"),
  blueCount: document.querySelector("#blueCount"),
  redCount: document.querySelector("#redCount"),
  timelineCanvas: document.querySelector("#timelineCanvas"),
  phaseCanvas: document.querySelector("#phaseCanvas"),
  chartTooltip: document.querySelector("#chartTooltip"),
  chartSummary: document.querySelector("#chartSummary"),
  inspectorContent: document.querySelector("#inspectorContent"),
  clearSelectionButton: document.querySelector("#clearSelectionButton"),
  storyTitle: document.querySelector("#storyTitle"),
  storyText: document.querySelector("#storyText"),
  storyIcon: document.querySelector("#storyIcon"),
  bluePeak: document.querySelector("#bluePeak"),
  redPeak: document.querySelector("#redPeak"),
  fruitUsed: document.querySelector("#fruitUsed"),
  birthCount: document.querySelector("#birthCount"),
};

let appConfig = { ...DEFAULT_CONFIG };
let simulation = new GardenSimulation(appConfig);
let running = false;
let selectedId = null;
let selectedSnapshot = null;
let pendingReset = false;
let activePreset = "balanced";
let worldAngle = -0.28;
let angularVelocity = 0;
let lastFrameTime = performance.now();
let lastUiUpdate = 0;
let renderCache = new Map();
let chartHoverIndex = null;

const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

const dragState = {
  active: false,
  pointerId: null,
  startX: 0,
  lastX: 0,
  lastTime: 0,
  distance: 0,
};

function renderPresets() {
  elements.presetGrid.replaceChildren(
    ...Object.entries(PRESETS).map(([id, preset]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `preset-button${activePreset === id ? " active" : ""}`;
      button.dataset.preset = id;
      button.style.setProperty("--preset-color", preset.color);
      button.title = preset.description;
      button.textContent = preset.label;
      button.addEventListener("click", () => applyPreset(id));
      return button;
    }),
  );
}

function renderControls() {
  elements.controlsRoot.replaceChildren(
    ...CONTROL_GROUPS.map((group) => {
      const details = document.createElement("details");
      details.className = "control-group";
      details.open = group.open;

      const summary = document.createElement("summary");
      summary.innerHTML = `
        <span class="group-swatch" style="--group-color:${group.color}"></span>
        <span class="group-name">${group.label}</span>
        <span class="group-count">${group.controls.length} rules</span>
      `;

      const list = document.createElement("div");
      list.className = "control-list";

      for (const control of group.controls) {
        const row = document.createElement("label");
        row.className = "control-row";
        row.htmlFor = `control-${control.key}`;
        row.style.setProperty("--control-color", group.color);

        const resetMarker = STRUCTURAL_KEYS.has(control.key)
          ? '<span class="reset-dot" title="Applies on reset"></span>'
          : "";
        row.innerHTML = `
          <span class="control-label"><abbr title="${control.help}">${control.label}</abbr>${resetMarker}</span>
          <output class="control-value" for="control-${control.key}" id="output-${control.key}">${control.format(appConfig[control.key])}</output>
          <input
            id="control-${control.key}"
            data-key="${control.key}"
            type="range"
            min="${control.min}"
            max="${control.max}"
            step="${control.step}"
            value="${appConfig[control.key]}"
            aria-label="${control.label}"
          />
        `;

        const input = row.querySelector("input");
        updateRangeProgress(input);
        input.addEventListener("input", () => {
          const value = Number(input.value);
          appConfig[control.key] = value;
          row.querySelector("output").textContent = control.format(value);
          updateRangeProgress(input);
          activePreset = null;
          renderPresets();

          if (STRUCTURAL_KEYS.has(control.key)) {
            pendingReset = true;
            elements.pendingBadge.hidden = false;
          } else {
            simulation.setConfig(control.key, value);
          }
        });

        list.append(row);
      }

      details.append(summary, list);
      return details;
    }),
  );
}

function updateRangeProgress(input) {
  const min = Number(input.min);
  const max = Number(input.max);
  const progress = ((Number(input.value) - min) / Math.max(0.0001, max - min)) * 100;
  input.style.setProperty("--range-progress", `${progress}%`);
}

function syncControlValues() {
  for (const group of CONTROL_GROUPS) {
    for (const control of group.controls) {
      const input = document.querySelector(`#control-${control.key}`);
      const output = document.querySelector(`#output-${control.key}`);
      if (!input || !output) continue;
      input.value = appConfig[control.key];
      output.textContent = control.format(appConfig[control.key]);
      updateRangeProgress(input);
    }
  }
  syncSpeedControl();
}

function syncSpeedControl() {
  let closestIndex = 0;
  let closestDistance = Infinity;
  SPEED_STEPS.forEach((speed, index) => {
    const distance = Math.abs(speed - appConfig.simSpeed);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  });
  elements.simulationSpeed.value = String(closestIndex);
  elements.simulationSpeedOutput.textContent = `${formatSpeed(appConfig.simSpeed)}×`;
  elements.simulationSpeed.setAttribute("aria-valuetext", `${formatSpeed(appConfig.simSpeed)} times`);
  for (const button of elements.speedBoostButtons) {
    const active = Number(button.dataset.speedBoost) === appConfig.simSpeed;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

function formatSpeed(value) {
  return Number.isInteger(Number(value)) ? Number(value).toFixed(0) : Number(value).toFixed(2).replace(/0$/, "");
}

function applyPreset(id) {
  const preset = PRESETS[id];
  if (!preset) return;
  const wasRunning = running;
  appConfig = { ...preset.values };
  activePreset = id;
  pendingReset = false;
  elements.pendingBadge.hidden = true;
  syncControlValues();
  renderPresets();
  resetGarden({ keepRunning: wasRunning });
}

function resetGarden({ keepRunning = false } = {}) {
  running = Boolean(keepRunning);
  simulation.reset(appConfig);
  selectedId = null;
  selectedSnapshot = null;
  chartHoverIndex = null;
  pendingReset = false;
  elements.pendingBadge.hidden = true;
  elements.chartTooltip.hidden = true;
  elements.worldTooltip.hidden = true;
  worldAngle = -0.28;
  angularVelocity = 0;
  updatePlaybackUi();
  updateUi(true);
}

function randomizeGarden() {
  const seedArray = new Uint32Array(1);
  crypto.getRandomValues(seedArray);
  appConfig.seed = 1 + (seedArray[0] % 9999);
  activePreset = null;
  syncControlValues();
  renderPresets();
  resetGarden({ keepRunning: running });
}

function togglePlayback() {
  running = !running;
  updatePlaybackUi();
}

function updatePlaybackUi() {
  elements.playButton.setAttribute("aria-pressed", String(running));
  elements.playLabel.textContent = running ? "Pause the garden" : "Wake the garden";
  elements.statusDot.classList.toggle("live", running);
  elements.statusLabel.textContent = running ? "Garden running" : "Paused";
}

function stepGarden() {
  if (running) {
    running = false;
    updatePlaybackUi();
  }
  simulation.step(0.25);
  updateUi(true);
  drawAll();
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  const pixelWidth = Math.round(width * dpr);
  const pixelHeight = Math.round(height * dpr);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext("2d");
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { context, width, height, dpr };
}

function getWorldProjection(width, height) {
  const radius = simulation.config.worldSize;
  const scale = Math.min(width / (radius * 2.28), height / (radius * 1.52));
  return {
    cx: width / 2,
    cy: height * 0.53,
    scale,
    radius,
  };
}

function projectWorld(x, y, projection, z = 0) {
  const cosine = Math.cos(worldAngle);
  const sine = Math.sin(worldAngle);
  const rotatedX = x * cosine - y * sine;
  const rotatedY = x * sine + y * cosine;
  return {
    x: projection.cx + rotatedX * projection.scale,
    y: projection.cy + rotatedY * projection.scale * 0.62 - z * projection.scale,
    depth: rotatedY,
    rotatedX,
    rotatedY,
  };
}

function drawWorld() {
  const { context, width, height } = resizeCanvas(elements.worldCanvas);
  const ctx = context;
  const projection = getWorldProjection(width, height);
  ctx.clearRect(0, 0, width, height);
  renderCache = new Map();

  drawDish(ctx, projection, width, height);
  drawDecorations(ctx, projection);
  drawIntentOverlay(ctx, projection);

  const renderables = [
    ...simulation.trees.map((tree) => ({ type: "tree", value: tree, depth: projectWorld(tree.x, tree.y, projection).depth })),
    ...simulation.blobs.map((blob) => ({ type: "blob", value: blob, depth: projectWorld(blob.x, blob.y, projection).depth })),
  ].sort((a, b) => a.depth - b.depth);

  for (const item of renderables) {
    if (item.type === "tree") drawTree(ctx, item.value, projection);
    else drawBlob(ctx, item.value, projection);
  }

  drawEffects(ctx, projection);
}

function drawDish(ctx, projection, width, height) {
  const radiusX = projection.radius * projection.scale * 1.06;
  const radiusY = projection.radius * projection.scale * 0.655;
  const centerX = projection.cx;
  const centerY = projection.cy + projection.scale * 2.6;

  ctx.save();
  ctx.fillStyle = "rgba(41, 60, 47, 0.18)";
  ctx.filter = `blur(${Math.max(10, projection.scale * 4)}px)`;
  ctx.beginPath();
  ctx.ellipse(centerX + projection.scale * 2, centerY + radiusY * 0.46, radiusX * 0.86, radiusY * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.filter = "none";

  const rimGradient = ctx.createLinearGradient(0, centerY - radiusY, 0, centerY + radiusY * 1.2);
  rimGradient.addColorStop(0, "#a86d3f");
  rimGradient.addColorStop(0.48, "#c7864b");
  rimGradient.addColorStop(1, "#87522f");
  ctx.fillStyle = rimGradient;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + projection.scale * 2.7, radiusX * 1.035, radiusY * 1.045, 0, 0, TAU);
  ctx.fill();

  ctx.fillStyle = "#72442c";
  ctx.beginPath();
  ctx.ellipse(centerX, centerY + projection.scale * 4, radiusX * 0.98, radiusY * 0.98, 0, 0, TAU);
  ctx.fill();

  const groundGradient = ctx.createRadialGradient(
    centerX - radiusX * 0.28,
    centerY - radiusY * 0.42,
    radiusX * 0.08,
    centerX,
    centerY,
    radiusX,
  );
  groundGradient.addColorStop(0, "#a8c66c");
  groundGradient.addColorStop(0.46, "#83ad59");
  groundGradient.addColorStop(0.82, "#668e4c");
  groundGradient.addColorStop(1, "#4e753f");
  ctx.fillStyle = groundGradient;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY - projection.scale * 0.3, radiusX * 0.965, radiusY * 0.93, 0, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "rgba(236, 235, 186, 0.32)";
  ctx.lineWidth = Math.max(1, projection.scale * 0.28);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY - projection.scale * 1.1, radiusX * 0.9, radiusY * 0.86, 0, Math.PI * 1.05, Math.PI * 1.94);
  ctx.stroke();

  ctx.strokeStyle = "rgba(52, 92, 55, 0.18)";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 8]);
  for (const fraction of [0.34, 0.66]) {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX * fraction, radiusY * fraction, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  const gloss = ctx.createLinearGradient(0, centerY - radiusY, 0, centerY + radiusY);
  gloss.addColorStop(0, "rgba(255,255,223,0.12)");
  gloss.addColorStop(0.45, "rgba(255,255,255,0)");
  gloss.addColorStop(1, "rgba(31,72,47,0.12)");
  ctx.fillStyle = gloss;
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX * 0.96, radiusY * 0.92, 0, 0, TAU);
  ctx.fill();

  ctx.restore();
}

function drawDecorations(ctx, projection) {
  const items = simulation.decorations
    .map((decoration) => ({ decoration, point: projectWorld(decoration.x, decoration.y, projection) }))
    .sort((a, b) => a.point.depth - b.point.depth);

  for (const { decoration, point } of items) {
    const size = projection.scale * decoration.size;
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(decoration.angle + worldAngle * 0.2);
    if (decoration.kind === "stone") {
      ctx.fillStyle = decoration.tint > 0.5 ? "rgba(222,215,164,0.48)" : "rgba(66,98,59,0.3)";
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.85, size * 0.38, 0, 0, TAU);
      ctx.fill();
    } else if (decoration.kind === "flower") {
      ctx.fillStyle = decoration.tint > 0.5 ? "rgba(255,235,171,0.9)" : "rgba(244,190,177,0.86)";
      for (let i = 0; i < 4; i += 1) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath();
        ctx.ellipse(size * 0.34, 0, size * 0.34, size * 0.2, 0, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = "#d99745";
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.18, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = "rgba(48,99,56,0.52)";
      ctx.lineWidth = Math.max(0.8, projection.scale * 0.18);
      ctx.beginPath();
      ctx.moveTo(0, size * 0.35);
      ctx.quadraticCurveTo(-size * 0.12, -size * 0.2, -size * 0.48, -size * 0.48);
      ctx.moveTo(0, size * 0.2);
      ctx.quadraticCurveTo(size * 0.18, -size * 0.15, size * 0.48, -size * 0.36);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawIntentOverlay(ctx, projection) {
  if (!selectedId) return;
  const blob = simulation.findBlob(selectedId);
  if (!blob || blob.dying) return;
  const point = projectWorld(blob.x, blob.y, projection);
  const vision = blob.group === "blue" ? simulation.config.blueVision * blob.visionTrait : simulation.config.redVision * blob.visionTrait;
  const color = blob.group === "blue" ? "76,136,237" : "240,102,93";

  ctx.save();
  ctx.strokeStyle = `rgba(${color},0.34)`;
  ctx.fillStyle = `rgba(${color},0.035)`;
  ctx.lineWidth = 1.25;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.ellipse(point.x, point.y, vision * projection.scale, vision * projection.scale * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  let targetPoint = null;
  if (blob.targetId?.startsWith("T")) {
    const tree = simulation.trees.find((candidate) => candidate.id === blob.targetId);
    if (tree) targetPoint = projectWorld(tree.x, tree.y, projection, 4);
  } else if (blob.targetId) {
    const target = simulation.findBlob(blob.targetId);
    if (target) targetPoint = projectWorld(target.x, target.y, projection, 1);
  }

  if (targetPoint) {
    ctx.strokeStyle = `rgba(${color},0.52)`;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    ctx.lineTo(targetPoint.x, targetPoint.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawTree(ctx, tree, projection) {
  const ground = projectWorld(tree.x, tree.y, projection);
  const canopy = projectWorld(tree.x + tree.lean * 2, tree.y, projection, 5.3 * tree.size);
  const scale = projection.scale * tree.size;

  ctx.save();
  ctx.fillStyle = "rgba(41,63,42,0.22)";
  ctx.beginPath();
  ctx.ellipse(ground.x + scale * 0.7, ground.y + scale * 0.55, scale * 3.8, scale * 1.05, -0.06, 0, TAU);
  ctx.fill();

  ctx.strokeStyle = "#765035";
  ctx.lineWidth = Math.max(2.2, scale * 0.8);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ground.x, ground.y);
  ctx.quadraticCurveTo(ground.x + tree.lean * scale * 2, lerp(ground.y, canopy.y, 0.52), canopy.x, canopy.y + scale * 0.45);
  ctx.stroke();

  ctx.strokeStyle = "rgba(238,196,113,0.38)";
  ctx.lineWidth = Math.max(0.7, scale * 0.17);
  ctx.beginPath();
  ctx.moveTo(ground.x - scale * 0.15, ground.y - scale * 0.2);
  ctx.quadraticCurveTo(ground.x + tree.lean * scale, lerp(ground.y, canopy.y, 0.52), canopy.x - scale * 0.12, canopy.y + scale * 0.45);
  ctx.stroke();

  const sway = reducedMotion ? 0 : Math.sin(simulation.time * 0.55 + tree.phase) * scale * 0.08;
  const canopyOffsets = [
    [-1.7, 0.25, 2.55],
    [1.55, 0.18, 2.48],
    [-0.25, -1.12, 2.65],
    [0.1, 1.05, 2.45],
    [0, -0.05, 2.85],
  ];

  for (let i = 0; i < canopyOffsets.length; i += 1) {
    const [offsetX, offsetY, radius] = canopyOffsets[i];
    const x = canopy.x + offsetX * scale + sway * (i % 2 ? 1 : -1);
    const y = canopy.y + offsetY * scale;
    const gradient = ctx.createRadialGradient(
      x - radius * scale * 0.32,
      y - radius * scale * 0.4,
      radius * scale * 0.15,
      x,
      y,
      radius * scale,
    );
    gradient.addColorStop(0, tree.canopyHue > 0 ? "#91bc58" : "#86b655");
    gradient.addColorStop(0.68, "#5e914d");
    gradient.addColorStop(1, "#3f6f43");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius * scale, 0, TAU);
    ctx.fill();
  }

  for (const fruit of tree.fruits) {
    let growth = fruit.growth;
    if (fruit.reservedBy) {
      const eater = simulation.findBlob(fruit.reservedBy);
      if (eater?.action === "eating" && eater.actionTotal > 0) {
        const progress = clamp(1 - eater.actionTimer / eater.actionTotal, 0, 1);
        growth *= 1 - progress * 0.9;
      }
    }
    if (growth <= 0.015) continue;

    const radial = scale * (1.1 + fruit.anchorRadius * 1.7);
    const fruitX = canopy.x + Math.cos(fruit.anchorAngle) * radial + sway;
    const fruitY = canopy.y + Math.sin(fruit.anchorAngle) * radial * 0.68 + scale * (fruit.anchorLayer - 0.5) * 0.6;
    const fruitRadius = clamp(scale * 0.78 * Math.sqrt(growth), 1, 5.6);
    const wobble = fruit.reservedBy && !reducedMotion ? Math.sin(simulation.time * 18 + fruit.wobble) * fruitRadius * 0.32 : 0;

    ctx.strokeStyle = "rgba(48,82,38,0.75)";
    ctx.lineWidth = Math.max(0.6, projection.scale * 0.12);
    ctx.beginPath();
    ctx.moveTo(fruitX, fruitY - fruitRadius * 0.3);
    ctx.lineTo(fruitX - wobble * 0.2, fruitY - fruitRadius * 1.15);
    ctx.stroke();

    const fruitGradient = ctx.createRadialGradient(
      fruitX - fruitRadius * 0.32 + wobble,
      fruitY - fruitRadius * 0.4,
      fruitRadius * 0.08,
      fruitX + wobble,
      fruitY,
      fruitRadius,
    );
    fruitGradient.addColorStop(0, "#eaf68f");
    fruitGradient.addColorStop(0.38, "#b9da55");
    fruitGradient.addColorStop(1, "#699a3f");
    ctx.fillStyle = fruitGradient;
    ctx.beginPath();
    ctx.arc(fruitX + wobble, fruitY, fruitRadius, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = "rgba(48,84,39,0.34)";
    ctx.stroke();
  }
  ctx.restore();
}

function drawBlob(ctx, blob, projection) {
  const speed = Math.hypot(blob.vx, blob.vy);
  const configuredSpeed = blob.group === "blue" ? simulation.config.blueSpeed : simulation.config.redSpeed;
  const movingAmount = clamp(speed / Math.max(0.1, configuredSpeed), 0, 1);
  const hopping = ["wandering", "foraging", "fleeing", "seeking"].includes(blob.action);
  const bounce = reducedMotion || !hopping
    ? 0
    : Math.max(0, Math.sin(simulation.time * 7.2 + blob.phase)) * 0.85 * movingAmount;
  const point = projectWorld(blob.x, blob.y, projection, 0.7 + bounce);
  const ground = projectWorld(blob.x, blob.y, projection, 0);
  const childScale = blob.age < 4 ? lerp(0.63, 1, blob.age / 4) : 1;
  const energyScale = 0.9 + clamp(blob.energy / 100, 0, 1) * 0.1;
  const deathProgress = blob.dying ? clamp(blob.deathTimer / Math.max(0.01, blob.actionTotal), 0, 1) : 1;
  const baseScale = projection.scale * childScale * energyScale * (blob.dying ? lerp(0.35, 1, deathProgress) : 1);
  let radiusX = baseScale * (2.15 + blob.bodyShape);
  let radiusY = baseScale * (2.72 - blob.bodyShape * 0.4);

  let squash = 0;
  if (!reducedMotion && blob.action === "eating") squash = Math.sin((blob.actionTotal - blob.actionTimer) * 15) * 0.07;
  if (!reducedMotion && blob.action === "resting" && blob.group === "red") squash = Math.sin((blob.actionTotal - blob.actionTimer) * 8) * 0.05;
  if (!reducedMotion && blob.action === "budding") squash = Math.sin((blob.actionTotal - blob.actionTimer) * 9) * 0.12;
  radiusX *= 1 + squash;
  radiusY *= 1 - squash;

  const cosine = Math.cos(worldAngle);
  const sine = Math.sin(worldAngle);
  const screenVx = blob.vx * cosine - blob.vy * sine;
  const screenVy = (blob.vx * sine + blob.vy * cosine) * 0.62;
  const lean = clamp(Math.atan2(screenVy, screenVx) * 0.09 * movingAmount, -0.22, 0.22);
  const isSelected = blob.id === selectedId;
  const bodyBase = blob.group === "blue" ? "#4d8ff4" : "#f06a61";
  const bodyLight = blob.group === "blue" ? "#89b5ff" : "#ff9a8f";
  const bodyDark = blob.group === "blue" ? "#285db4" : "#b94343";
  const energyOpacity = 0.52 + clamp(blob.energy / 100, 0, 1) * 0.48;

  ctx.save();
  ctx.globalAlpha = blob.dying ? deathProgress : 1;
  ctx.fillStyle = `rgba(35,55,42,${0.13 + movingAmount * 0.05})`;
  ctx.beginPath();
  ctx.ellipse(ground.x + baseScale * 0.38, ground.y + baseScale * 0.44, radiusX * (1.02 - bounce * 0.08), radiusY * 0.31, 0, 0, TAU);
  ctx.fill();

  if (blob.group === "red" && blob.action === "resting" && blob.lastContactAt != null) {
    const glow = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, radiusY * 1.9);
    glow.addColorStop(0, "rgba(255,151,111,0.26)");
    glow.addColorStop(1, "rgba(255,151,111,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(point.x, point.y, radiusY * 1.9, 0, TAU);
    ctx.fill();
  }

  ctx.translate(point.x, point.y);
  ctx.rotate(lean);

  if (isSelected) {
    ctx.strokeStyle = blob.group === "blue" ? "rgba(37,80,158,0.78)" : "rgba(163,57,54,0.78)";
    ctx.lineWidth = Math.max(2, projection.scale * 0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, radiusX * 1.38, radiusY * 1.25, 0, 0, TAU);
    ctx.stroke();
  }

  const gradient = ctx.createLinearGradient(-radiusX, -radiusY, radiusX, radiusY);
  gradient.addColorStop(0, bodyLight);
  gradient.addColorStop(0.44, bodyBase);
  gradient.addColorStop(1, bodyDark);
  ctx.globalAlpha *= energyOpacity;
  ctx.fillStyle = gradient;
  ctx.strokeStyle = bodyDark;
  ctx.lineWidth = Math.max(1, projection.scale * 0.22);
  drawBeanPath(ctx, radiusX, radiusY, blob.bodyShape);
  ctx.fill();
  ctx.stroke();

  ctx.globalAlpha *= 0.72;
  const highlight = ctx.createRadialGradient(-radiusX * 0.35, -radiusY * 0.44, 0, -radiusX * 0.32, -radiusY * 0.39, radiusX * 0.68);
  highlight.addColorStop(0, "rgba(255,255,255,0.92)");
  highlight.addColorStop(0.28, "rgba(255,255,255,0.24)");
  highlight.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.ellipse(-radiusX * 0.22, -radiusY * 0.28, radiusX * 0.66, radiusY * 0.72, -0.2, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = blob.dying ? deathProgress : 1;

  const blinkValue = Math.sin(simulation.time * 0.82 + blob.blinkPhase) > 0.985;
  const eyeY = -radiusY * 0.08;
  const eyeGap = radiusX * 0.28;
  const eyeRadius = clamp(radiusX * 0.105, 1.15, 2.65);
  ctx.fillStyle = "#17332e";
  if (blinkValue) {
    ctx.strokeStyle = "#17332e";
    ctx.lineWidth = Math.max(1, eyeRadius * 0.75);
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * eyeGap - eyeRadius * 0.55, eyeY);
      ctx.lineTo(side * eyeGap + eyeRadius * 0.55, eyeY);
      ctx.stroke();
    }
  } else {
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(side * eyeGap, eyeY, eyeRadius, eyeRadius * 1.12, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(side * eyeGap - eyeRadius * 0.28, eyeY - eyeRadius * 0.3, Math.max(0.45, eyeRadius * 0.24), 0, TAU);
      ctx.fill();
      ctx.fillStyle = "#17332e";
    }
  }

  ctx.strokeStyle = "rgba(20,53,45,0.86)";
  ctx.lineWidth = Math.max(0.9, projection.scale * 0.18);
  ctx.lineCap = "round";
  ctx.beginPath();
  const mouthY = radiusY * 0.28;
  if (blob.action === "eating") {
    ctx.arc(0, mouthY, radiusX * 0.12, 0, TAU);
  } else if (blob.energy < 22) {
    ctx.arc(0, mouthY + radiusY * 0.11, radiusX * 0.18, Math.PI * 1.12, Math.PI * 1.88);
  } else if (blob.action === "startled") {
    ctx.arc(0, mouthY, radiusX * 0.1, 0, TAU);
  } else {
    ctx.arc(0, mouthY - radiusY * 0.05, radiusX * 0.19, 0.12, Math.PI - 0.12);
  }
  ctx.stroke();

  if (blob.action === "eating") {
    ctx.fillStyle = "rgba(210,242,104,0.8)";
    for (let i = 0; i < 2; i += 1) {
      const angle = simulation.time * 3 + blob.phase + i * Math.PI;
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * radiusX * 0.82, mouthY + Math.sin(angle) * radiusY * 0.2, Math.max(1, radiusX * 0.06), 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();

  renderCache.set(blob.id, {
    x: point.x,
    y: point.y,
    radiusX: radiusX * 1.35,
    radiusY: radiusY * 1.2,
    depth: point.depth,
  });
}

function drawBeanPath(ctx, radiusX, radiusY, shape) {
  ctx.beginPath();
  ctx.moveTo(0, -radiusY);
  ctx.bezierCurveTo(
    radiusX * (0.82 + shape),
    -radiusY * 0.98,
    radiusX * 1.04,
    -radiusY * 0.28,
    radiusX * 0.88,
    radiusY * 0.36,
  );
  ctx.bezierCurveTo(radiusX * 0.7, radiusY * 0.98, radiusX * 0.16, radiusY * 1.06, 0, radiusY);
  ctx.bezierCurveTo(-radiusX * 0.42, radiusY * 1.04, -radiusX * 0.98, radiusY * 0.74, -radiusX * 0.9, radiusY * 0.14);
  ctx.bezierCurveTo(-radiusX * 0.98, -radiusY * 0.5, -radiusX * 0.6, -radiusY * 0.96, 0, -radiusY);
  ctx.closePath();
}

function drawEffects(ctx, projection) {
  for (const effect of simulation.effects) {
    const point = projectWorld(effect.x, effect.y, projection, 1.2);
    const progress = 1 - effect.life / effect.maxLife;
    const alpha = 1 - progress;
    ctx.save();
    ctx.globalAlpha = alpha;

    if (effect.type === "contact") {
      ctx.strokeStyle = "rgba(255,224,165,0.9)";
      ctx.lineWidth = Math.max(1, projection.scale * 0.3 * (1 - progress));
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, projection.scale * (2 + progress * 7), projection.scale * (1.2 + progress * 4.3), 0, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = "#ffd483";
      drawSparkParticles(ctx, point, effect, progress, projection.scale, 6);
    } else if (effect.type === "eat") {
      ctx.fillStyle = "#dff06c";
      drawSparkParticles(ctx, point, effect, progress, projection.scale, 7);
    } else if (effect.type === "birth") {
      ctx.strokeStyle = effect.group === "blue" ? "rgba(117,174,255,0.85)" : "rgba(255,137,128,0.85)";
      ctx.lineWidth = Math.max(1, projection.scale * 0.34 * (1 - progress));
      ctx.beginPath();
      ctx.ellipse(point.x, point.y, projection.scale * (1.4 + progress * 5.6), projection.scale * (0.9 + progress * 3.5), 0, 0, TAU);
      ctx.stroke();
    } else if (effect.type === "death") {
      ctx.fillStyle = effect.group === "blue" ? "#86b6ed" : "#e99077";
      drawLeafParticles(ctx, point, effect, progress, projection.scale);
    }
    ctx.restore();
  }
}

function drawSparkParticles(ctx, point, effect, progress, scale, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = effect.phase + (i / count) * TAU;
    const distance = scale * (1 + progress * (4 + (i % 3)));
    const x = point.x + Math.cos(angle) * distance;
    const y = point.y + Math.sin(angle) * distance * 0.65 - progress * scale * 1.4;
    const radius = Math.max(0.8, scale * 0.32 * (1 - progress * 0.45));
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, TAU);
    ctx.fill();
  }
}

function drawLeafParticles(ctx, point, effect, progress, scale) {
  for (let i = 0; i < 7; i += 1) {
    const angle = effect.phase + (i / 7) * TAU + progress * 0.7;
    const distance = scale * progress * (3.2 + (i % 3));
    ctx.save();
    ctx.translate(
      point.x + Math.cos(angle) * distance,
      point.y + Math.sin(angle) * distance * 0.62 - progress * scale * 1.8,
    );
    ctx.rotate(angle + progress * 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, scale * 0.42, scale * 0.2, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

function drawTimeline() {
  const { context, width, height } = resizeCanvas(elements.timelineCanvas);
  const ctx = context;
  const history = simulation.history;
  const margin = { top: 16, right: 34, bottom: 26, left: 34 };
  const plotWidth = Math.max(1, width - margin.left - margin.right);
  const plotHeight = Math.max(1, height - margin.top - margin.bottom);
  ctx.clearRect(0, 0, width, height);

  const maxPopulationRaw = Math.max(5, ...history.map((row) => Math.max(row.blue, row.red)));
  const maxPopulation = Math.ceil(maxPopulationRaw / 5) * 5;
  const maxFruitRaw = Math.max(simulation.config.fruitLimit, 10, ...history.map((row) => row.fruit));
  const maxFruit = Math.ceil(maxFruitRaw / 10) * 10;
  const startTime = history[0]?.time ?? 0;
  const endTime = Math.max(startTime + 1, history.at(-1)?.time ?? 1);
  const xFor = (time) => margin.left + ((time - startTime) / (endTime - startTime)) * plotWidth;
  const yPopulation = (value) => margin.top + plotHeight - (value / maxPopulation) * plotHeight;
  const yFruit = (value) => margin.top + plotHeight - (value / maxFruit) * plotHeight;

  ctx.font = "700 8px Avenir Next, system-ui, sans-serif";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(87,103,78,0.12)";
  ctx.fillStyle = "rgba(93,107,87,0.68)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = margin.top + (plotHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(width - margin.right, y);
    ctx.stroke();
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round(maxPopulation * (1 - i / 4))), margin.left - 7, y);
    ctx.textAlign = "left";
    ctx.fillText(String(Math.round(maxFruit * (1 - i / 4))), width - margin.right + 7, y);
  }

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(90,104,83,0.56)";
  ctx.fillText(formatChartTime(startTime), margin.left, height - 8);
  ctx.textAlign = "right";
  ctx.fillText(formatChartTime(endTime), width - margin.right, height - 8);

  if (!history.length) return;

  const fruitArea = ctx.createLinearGradient(0, margin.top, 0, margin.top + plotHeight);
  fruitArea.addColorStop(0, "rgba(158,196,64,0.26)");
  fruitArea.addColorStop(1, "rgba(158,196,64,0.015)");
  ctx.beginPath();
  ctx.moveTo(xFor(history[0].time), margin.top + plotHeight);
  for (const row of history) ctx.lineTo(xFor(row.time), yFruit(row.fruit));
  ctx.lineTo(xFor(history.at(-1).time), margin.top + plotHeight);
  ctx.closePath();
  ctx.fillStyle = fruitArea;
  ctx.fill();

  drawSeries(ctx, history, xFor, (row) => yFruit(row.fruit), "#8dad39", 1.7, [2, 3]);
  drawSeries(ctx, history, xFor, (row) => yPopulation(row.blue), "#4c88ed", 2.3, []);
  drawSeries(ctx, history, xFor, (row) => yPopulation(row.red), "#ef665d", 2.3, [6, 3]);

  const latest = history.at(-1);
  for (const [value, y, color] of [
    [latest.fruit, yFruit(latest.fruit), "#8dad39"],
    [latest.blue, yPopulation(latest.blue), "#4c88ed"],
    [latest.red, yPopulation(latest.red), "#ef665d"],
  ]) {
    void value;
    ctx.fillStyle = "#fffaf0";
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(xFor(latest.time), y, 3.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }

  if (chartHoverIndex != null && history[chartHoverIndex]) {
    const hover = history[chartHoverIndex];
    const x = xFor(hover.time);
    ctx.strokeStyle = "rgba(41,68,54,0.28)";
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotHeight);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawSeries(ctx, history, xFor, yFor, color, lineWidth, dash) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash(dash);
  ctx.beginPath();
  history.forEach((row, index) => {
    const x = xFor(row.time);
    const y = yFor(row);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();
}

function drawPhasePlot() {
  const { context, width, height } = resizeCanvas(elements.phaseCanvas);
  const ctx = context;
  const history = simulation.history;
  const margin = { top: 14, right: 15, bottom: 22, left: 25 };
  const plotWidth = Math.max(1, width - margin.left - margin.right);
  const plotHeight = Math.max(1, height - margin.top - margin.bottom);
  ctx.clearRect(0, 0, width, height);

  const maxBlue = Math.max(5, Math.ceil(Math.max(...history.map((row) => row.blue), 1) / 5) * 5);
  const maxRed = Math.max(5, Math.ceil(Math.max(...history.map((row) => row.red), 1) / 5) * 5);
  const xFor = (value) => margin.left + (value / maxBlue) * plotWidth;
  const yFor = (value) => margin.top + plotHeight - (value / maxRed) * plotHeight;

  ctx.strokeStyle = "rgba(83,101,77,0.11)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const x = margin.left + (plotWidth * i) / 4;
    const y = margin.top + (plotHeight * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x, margin.top);
    ctx.lineTo(x, margin.top + plotHeight);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(margin.left, y);
    ctx.lineTo(margin.left + plotWidth, y);
    ctx.stroke();
  }

  ctx.font = "700 8px Avenir Next, system-ui, sans-serif";
  ctx.fillStyle = "rgba(92,105,87,0.62)";
  ctx.textAlign = "left";
  ctx.fillText("0", margin.left, height - 7);
  ctx.textAlign = "right";
  ctx.fillText(String(maxBlue), width - margin.right, height - 7);
  ctx.textAlign = "left";
  ctx.fillText(String(maxRed), 5, margin.top + 3);

  if (history.length > 1) {
    for (let i = 1; i < history.length; i += 1) {
      const previous = history[i - 1];
      const current = history[i];
      const age = i / history.length;
      ctx.strokeStyle = `rgba(51,91,86,${0.08 + age * 0.62})`;
      ctx.lineWidth = 1 + age * 1.2;
      ctx.beginPath();
      ctx.moveTo(xFor(previous.blue), yFor(previous.red));
      ctx.lineTo(xFor(current.blue), yFor(current.red));
      ctx.stroke();
    }
  }

  const latest = history.at(-1);
  if (latest) {
    const x = xFor(latest.blue);
    const y = yFor(latest.red);
    const dotGradient = ctx.createLinearGradient(x - 4, y - 4, x + 4, y + 4);
    dotGradient.addColorStop(0, "#4c88ed");
    dotGradient.addColorStop(1, "#ef665d");
    ctx.fillStyle = dotGradient;
    ctx.strokeStyle = "#fffaf0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 4.3, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
}

function formatChartTime(seconds) {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
}

function updateUi(force = false) {
  const now = performance.now();
  if (!force && now - lastUiUpdate < 120) return;
  lastUiUpdate = now;

  const counts = simulation.counts;
  elements.fruitCount.textContent = formatInteger.format(counts.fruit);
  elements.blueCount.textContent = formatInteger.format(counts.blue);
  elements.redCount.textContent = formatInteger.format(counts.red);
  elements.timeLabel.textContent = formatRunTime(simulation.time);

  const narrative = simulation.getNarrative();
  elements.storyTitle.textContent = narrative.title;
  elements.storyText.textContent = narrative.text;
  elements.storyIcon.dataset.tone = narrative.tone;
  applyStoryTone(narrative.tone);

  elements.bluePeak.textContent = formatInteger.format(simulation.stats.bluePeak);
  elements.redPeak.textContent = formatInteger.format(simulation.stats.redPeak);
  elements.fruitUsed.textContent = formatInteger.format(simulation.stats.fruitUsed);
  elements.birthCount.textContent = formatInteger.format(simulation.stats.births);
  elements.chartSummary.textContent = `At ${formatChartTime(simulation.time)}, the garden has ${counts.fruit} ripe fruit, ${counts.blue} blue blobs, and ${counts.red} red blobs.`;
  updateInspector();
}

function formatRunTime(seconds) {
  const day = Math.floor(seconds / 30) + 1;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `Day ${day} · ${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function applyStoryTone(tone) {
  const tones = {
    balanced: ["#e6efce", "#5d8b55", "#c8d8a3"],
    growing: ["#e6efce", "#5d8b55", "#c8d8a3"],
    blue: ["#e1ecff", "#477ac9", "#b9cfef"],
    red: ["#fae1dc", "#c85c54", "#eac0b8"],
    fruit: ["#eff3cc", "#7d983f", "#d0d99c"],
    fragile: ["#f6e4ce", "#aa7044", "#e4c29c"],
    quiet: ["#e7e5dc", "#70786c", "#cdcec4"],
  };
  const [background, color, border] = tones[tone] || tones.balanced;
  elements.storyIcon.style.background = background;
  elements.storyIcon.style.color = color;
  elements.storyIcon.style.borderColor = border;
}

function updateInspector() {
  const selected = selectedId ? simulation.findBlob(selectedId) : null;
  if (selected) selectedSnapshot = { ...selected };

  if (!selectedId || (!selected && !selectedSnapshot)) {
    elements.clearSelectionButton.hidden = true;
    elements.inspectorContent.innerHTML = `
      <div class="empty-inspector">
        <div class="empty-portrait" aria-hidden="true">
          <span class="mini-blob"></span>
          <span class="mini-blob"></span>
        </div>
        <h3>Meet a garden resident</h3>
        <p>Click any bean-shaped blob to see its energy, choices, traits, and family.</p>
      </div>
    `;
    return;
  }

  const blob = selected || selectedSnapshot;
  const groupColor = blob.group === "blue" ? "#4c88ed" : "#ef665d";
  const configuredSpeed = blob.group === "blue" ? simulation.config.blueSpeed : simulation.config.redSpeed;
  const configuredVision = blob.group === "blue" ? simulation.config.blueVision : simulation.config.redVision;
  const action = selected ? ACTION_LABELS[blob.action] || blob.action : "life ended";
  const timer = selected && blob.actionTimer > 0 ? `${blob.actionTimer.toFixed(1)}s` : "ready";
  const age = `${Math.floor(blob.age)}s`;
  const family = blob.parentId ? `${blob.parentId} · gen ${blob.generation}` : `founder · gen ${blob.generation}`;
  elements.clearSelectionButton.hidden = false;
  elements.inspectorContent.innerHTML = `
    <div class="selected-profile" style="--blob-color:${groupColor}">
      <div class="profile-hero">
        <div class="profile-portrait" aria-hidden="true">
          <span class="mini-blob" style="--blob-color:${groupColor}"></span>
        </div>
        <div class="profile-copy">
          <h3>${blob.group === "blue" ? "Blue" : "Red"} ${blob.id.slice(1).padStart(2, "0")}</h3>
          <span class="action-badge" style="--blob-color:${groupColor}">${action}</span>
        </div>
      </div>
      <div class="energy-block">
        <div class="energy-label"><span>Stored energy</span><strong>${Math.max(0, blob.energy).toFixed(1)} / 100</strong></div>
        <div class="energy-track"><div class="energy-fill" style="--energy:${clamp(blob.energy, 0, 100)}%;--blob-color:${groupColor}"></div></div>
      </div>
      <dl class="detail-grid">
        <div><dt>Age</dt><dd>${age}</dd></div>
        <div><dt>Action timer</dt><dd>${timer}</dd></div>
        <div><dt>Top speed</dt><dd>${(configuredSpeed * blob.speedTrait).toFixed(1)}u/s</dd></div>
        <div><dt>Sensing</dt><dd>${(configuredVision * blob.visionTrait).toFixed(1)}u</dd></div>
        <div><dt>Family</dt><dd title="${family}">${family}</dd></div>
        <div><dt>Born</dt><dd>${formatChartTime(blob.bornAt)}</dd></div>
      </dl>
      ${selected ? "" : `<div class="ended-note">This field note remains pinned. ${blob.id} returned to the garden at about ${formatChartTime(simulation.time)}.</div>`}
    </div>
  `;
}

function pickBlob(clientX, clientY) {
  const rect = elements.worldCanvas.getBoundingClientRect();
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  let best = null;
  let bestScore = Infinity;
  for (const [id, hit] of renderCache) {
    const dx = (x - hit.x) / Math.max(8, hit.radiusX + 5);
    const dy = (y - hit.y) / Math.max(10, hit.radiusY + 5);
    const score = dx * dx + dy * dy;
    if (score <= 1 && score < bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

function clearSelection() {
  selectedId = null;
  selectedSnapshot = null;
  elements.worldTooltip.hidden = true;
  updateInspector();
}

function cycleSelection(direction = 1) {
  const residents = simulation.livingBlobs
    .slice()
    .sort((a, b) => a.idNumber - b.idNumber);
  if (!residents.length) {
    clearSelection();
    return;
  }
  const currentIndex = residents.findIndex((blob) => blob.id === selectedId);
  const nextIndex = currentIndex < 0
    ? direction > 0 ? 0 : residents.length - 1
    : (currentIndex + direction + residents.length) % residents.length;
  selectedId = residents[nextIndex].id;
  selectedSnapshot = null;
  updateInspector();
}

function handleWorldPointerDown(event) {
  dragState.active = true;
  dragState.pointerId = event.pointerId;
  dragState.startX = event.clientX;
  dragState.lastX = event.clientX;
  dragState.lastTime = performance.now();
  dragState.distance = 0;
  angularVelocity = 0;
  elements.worldCanvas.setPointerCapture(event.pointerId);
}

function handleWorldPointerMove(event) {
  if (dragState.active && event.pointerId === dragState.pointerId) {
    const now = performance.now();
    const deltaX = event.clientX - dragState.lastX;
    const deltaTime = Math.max(8, now - dragState.lastTime);
    worldAngle += deltaX * 0.008;
    angularVelocity = (deltaX * 0.008) / (deltaTime / 1000);
    dragState.distance += Math.abs(deltaX);
    dragState.lastX = event.clientX;
    dragState.lastTime = now;
    elements.dragHint.classList.add("dismissed");
    elements.worldTooltip.hidden = true;
    return;
  }

  const hoveredId = pickBlob(event.clientX, event.clientY);
  if (!hoveredId) {
    elements.worldCanvas.style.cursor = "grab";
    elements.worldTooltip.hidden = true;
    return;
  }
  const blob = simulation.findBlob(hoveredId);
  const hit = renderCache.get(hoveredId);
  if (!blob || !hit) return;
  elements.worldCanvas.style.cursor = "pointer";
  elements.worldTooltip.hidden = false;
  elements.worldTooltip.style.left = `${hit.x}px`;
  elements.worldTooltip.style.top = `${hit.y - hit.radiusY * 0.65}px`;
  elements.worldTooltip.textContent = `${blob.group === "blue" ? "Blue" : "Red"} ${blob.id.slice(1)} · ${Math.round(blob.energy)} energy · ${ACTION_LABELS[blob.action] || blob.action}`;
}

function handleWorldPointerUp(event) {
  if (!dragState.active || event.pointerId !== dragState.pointerId) return;
  const wasClick = dragState.distance < 6;
  dragState.active = false;
  dragState.pointerId = null;
  try {
    elements.worldCanvas.releasePointerCapture(event.pointerId);
  } catch {
    // The capture may already be released when the pointer leaves the window.
  }
  if (reducedMotion) angularVelocity = 0;
  if (wasClick) {
    const picked = pickBlob(event.clientX, event.clientY);
    if (picked) {
      selectedId = picked;
      selectedSnapshot = null;
      updateInspector();
    } else {
      clearSelection();
    }
  }
}

function handleTimelinePointer(event) {
  const rect = elements.timelineCanvas.getBoundingClientRect();
  const history = simulation.history;
  if (!history.length) return;
  const marginLeft = 34;
  const marginRight = 34;
  const normalized = clamp((event.clientX - rect.left - marginLeft) / Math.max(1, rect.width - marginLeft - marginRight), 0, 1);
  chartHoverIndex = Math.round(normalized * (history.length - 1));
  const row = history[chartHoverIndex];
  const left = marginLeft + normalized * (rect.width - marginLeft - marginRight);
  const maxPopulation = Math.max(5, ...history.map((item) => Math.max(item.blue, item.red)));
  const top = 16 + (1 - Math.max(row.blue, row.red) / maxPopulation) * (rect.height - 42);
  elements.chartTooltip.hidden = false;
  elements.chartTooltip.style.left = `${left}px`;
  elements.chartTooltip.style.top = `${Math.max(72, top)}px`;
  elements.chartTooltip.innerHTML = `
    <div class="tooltip-time">${formatChartTime(row.time)}</div>
    <div class="tooltip-grid">
      <i style="background:#8dad39"></i><span>Fruit</span><strong>${row.fruit}</strong>
      <i style="background:#4c88ed"></i><span>Blue</span><strong>${row.blue}</strong>
      <i style="background:#ef665d"></i><span>Red</span><strong>${row.red}</strong>
    </div>
  `;
}

function drawAll() {
  drawWorld();
  drawTimeline();
  drawPhasePlot();
}

function animate(now) {
  const realDelta = clamp((now - lastFrameTime) / 1000, 0, 0.1);
  lastFrameTime = now;
  if (running) simulation.advance(realDelta * appConfig.simSpeed);

  if (!dragState.active && Math.abs(angularVelocity) > 0.0001) {
    worldAngle += angularVelocity * realDelta;
    angularVelocity *= Math.pow(0.92, realDelta * 60);
  }

  drawAll();
  updateUi();
  requestAnimationFrame(animate);
}

elements.playButton.addEventListener("click", togglePlayback);
elements.stepButton.addEventListener("click", stepGarden);
elements.resetButton.addEventListener("click", () => resetGarden());
elements.resetButtonTop.addEventListener("click", () => resetGarden());
elements.randomizeButton.addEventListener("click", randomizeGarden);
elements.clearSelectionButton.addEventListener("click", clearSelection);

elements.simulationSpeed.addEventListener("input", () => {
  const speedIndex = Number(elements.simulationSpeed.value);
  appConfig.simSpeed = SPEED_STEPS[speedIndex] ?? 2;
  syncSpeedControl();
});

for (const button of elements.speedBoostButtons) {
  button.addEventListener("click", () => {
    appConfig.simSpeed = Number(button.dataset.speedBoost);
    syncSpeedControl();
  });
}

elements.worldCanvas.addEventListener("pointerdown", handleWorldPointerDown);
elements.worldCanvas.addEventListener("pointermove", handleWorldPointerMove);
elements.worldCanvas.addEventListener("pointerup", handleWorldPointerUp);
elements.worldCanvas.addEventListener("pointercancel", handleWorldPointerUp);
elements.worldCanvas.addEventListener("pointerleave", () => {
  if (!dragState.active) elements.worldTooltip.hidden = true;
});
elements.worldCanvas.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === "ArrowDown") {
    event.preventDefault();
    event.stopPropagation();
    cycleSelection(1);
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    event.stopPropagation();
    cycleSelection(-1);
  } else if (event.key === "Escape") {
    event.preventDefault();
    event.stopPropagation();
    clearSelection();
  }
});

elements.timelineCanvas.addEventListener("pointermove", handleTimelinePointer);
elements.timelineCanvas.addEventListener("pointerleave", () => {
  chartHoverIndex = null;
  elements.chartTooltip.hidden = true;
});

window.addEventListener("keydown", (event) => {
  const target = event.target;
  const interactive = target instanceof Element && Boolean(target.closest("input, button, summary, a, select, textarea"));
  if (interactive) return;
  if (event.code === "Space") {
    event.preventDefault();
    togglePlayback();
  } else if (event.code === "ArrowRight") {
    event.preventDefault();
    stepGarden();
  } else if (event.code === "Escape") {
    clearSelection();
  }
});

window.addEventListener("blur", () => {
  if (dragState.active) {
    dragState.active = false;
    dragState.pointerId = null;
  }
});

renderPresets();
renderControls();
syncControlValues();
updatePlaybackUi();
updateUi(true);
drawAll();
requestAnimationFrame(animate);

window.pocketGarden = {
  get simulation() {
    return simulation;
  },
  play() {
    running = true;
    updatePlaybackUi();
  },
  pause() {
    running = false;
    updatePlaybackUi();
  },
  step: stepGarden,
  reset: resetGarden,
  applyPreset,
};
