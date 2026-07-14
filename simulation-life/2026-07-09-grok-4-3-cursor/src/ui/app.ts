import { World } from "../sim/world";
import { DEFAULT_PARAMS, PRESETS, PRESET_ORDER } from "../sim/presets";
import type { PresetId, SimParams } from "../sim/types";
import { summarizeRun } from "../sim/verdict";
import { Camera } from "../render/camera";
import { DishRenderer } from "../render/dish";
import {
  drawEnergyHist,
  drawPhaseChart,
  drawPopulationChart,
  drawTraitChart,
} from "./charts";

type ChartTab = "population" | "phase" | "traits" | "energy";

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export class App {
  root: HTMLElement;
  world: World;
  camera = new Camera();
  renderer!: DishRenderer;
  playing = true;
  selectedId: number | null = null;
  activePreset: PresetId = "balanced";
  chartTab: ChartTab = "population";
  private lastCaptures = 0;
  private lastTs = 0;

  // DOM refs
  private canvas!: HTMLCanvasElement;
  private chartCanvas!: HTMLCanvasElement;
  private pillFood!: HTMLElement;
  private pillPrey!: HTMLElement;
  private pillPred!: HTMLElement;
  private pillTime!: HTMLElement;
  private playBtn!: HTMLButtonElement;
  private verdictEl!: HTMLElement;
  private inspectorEl!: HTMLElement;
  private statsEls: Record<string, HTMLElement> = {};
  private sliderBindings: { key: keyof SimParams; valEl: HTMLElement; input: HTMLInputElement }[] = [];
  private presetButtons = new Map<PresetId, HTMLButtonElement>();
  private seedInput!: HTMLInputElement;

  constructor(root: HTMLElement) {
    this.root = root;
    this.world = new World({ ...DEFAULT_PARAMS });
    this.mount();
    this.startLoop();
  }

  private mount(): void {
    this.root.innerHTML = "";
    const shell = el("div", "app-shell");

    const brand = el("header", "brand");
    const brandText = el("div");
    const h1 = el("h1");
    h1.innerHTML = `<span>GROK 4.5</span> · Petri Dish`;
    brandText.append(h1, el("p", "", "A living ecology sandbox — steer food, prey, and predators, then watch the story unfold."));
    brand.append(brandText);
    shell.append(brand);

    shell.append(this.buildControls());
    shell.append(this.buildStage());
    shell.append(this.buildSide());

    this.root.append(shell);

    const wrap = this.root.querySelector(".stage-wrap") as HTMLElement;
    this.renderer = new DishRenderer(this.canvas, this.camera);
    this.camera.bind(wrap);
    this.resize();
    window.addEventListener("resize", () => this.resize());

    this.canvas.addEventListener("click", (e) => {
      const { x, y } = this.renderer.screenToWorld(e.clientX, e.clientY, this.world);
      const hit = this.world.pickAt(x, y, 18 / this.camera.zoom);
      this.selectedId = hit?.id ?? null;
      this.renderer.selectedId = this.selectedId;
      this.refreshInspector();
    });
  }

  private buildControls(): HTMLElement {
    const panel = el("aside", "panel controls-panel");
    const head = el("div", "panel-head");
    head.append(el("h2", "", "Ecosystem forces"));
    panel.append(head);
    const body = el("div", "panel-body");

    // presets
    const secP = el("div", "section");
    secP.append(el("h3", "", "Presets"));
    const presets = el("div", "presets");
    for (const id of PRESET_ORDER) {
      const meta = PRESETS[id];
      const btn = el("button", "preset") as HTMLButtonElement;
      btn.type = "button";
      if (id === this.activePreset) btn.classList.add("active");
      btn.innerHTML = `<strong>${meta.name}</strong><span>${meta.blurb}</span>`;
      btn.addEventListener("click", () => this.applyPreset(id));
      this.presetButtons.set(id, btn);
      presets.append(btn);
    }
    secP.append(presets);
    body.append(secP);

    // seed + world
    const secW = el("div", "section");
    secW.append(el("h3", "", "World"));
    this.seedInput = this.numberControl(secW, "Random seed", this.world.params.seed, (v) => {
      this.world.params.seed = Math.floor(v);
    });
    this.addSlider(secW, "Map radius", "worldRadius", 160, 360, 1);
    this.addSlider(secW, "Plant count", "plantCount", 20, 80, 1);
    this.addSlider(secW, "Starting prey", "startPrey", 0, 80, 1);
    this.addSlider(secW, "Starting predators", "startPredators", 0, 40, 1);
    body.append(secW);

    const secF = el("div", "section");
    secF.append(el("h3", "", "Food abundance"));
    this.addSlider(secF, "Growth rate", "foodGrowthRate", 0.05, 1.6, 0.01);
    this.addSlider(secF, "Carrying capacity", "foodCarryingCapacity", 0.6, 4, 0.05);
    this.addSlider(secF, "Regrowth delay", "foodRegrowDelay", 0.4, 8, 0.1);
    this.addSlider(secF, "Energy per bite", "foodEnergy", 10, 50, 1);
    body.append(secF);

    const secPrey = el("div", "section");
    secPrey.append(el("h3", "", "Prey"));
    this.addSlider(secPrey, "Speed", "preyBaseSpeed", 20, 100, 1);
    this.addSlider(secPrey, "Vision", "preyBaseVision", 30, 140, 1);
    this.addSlider(secPrey, "Metabolism", "preyBaseMetabolism", 1, 8, 0.1);
    this.addSlider(secPrey, "Eating time", "preyEatTime", 0.15, 1.5, 0.05);
    this.addSlider(secPrey, "Reproduce energy", "preyReproduceEnergy", 40, 120, 1);
    this.addSlider(secPrey, "Reproduce chance", "preyReproduceChance", 0.1, 1, 0.01);
    this.addSlider(secPrey, "Flee weight", "preyFleeWeight", 0.4, 2.5, 0.05);
    body.append(secPrey);

    const secPred = el("div", "section");
    secPred.append(el("h3", "", "Predator pressure"));
    this.addSlider(secPred, "Speed", "predatorBaseSpeed", 20, 110, 1);
    this.addSlider(secPred, "Vision", "predatorBaseVision", 40, 160, 1);
    this.addSlider(secPred, "Metabolism", "predatorBaseMetabolism", 1.5, 10, 0.1);
    this.addSlider(secPred, "Hunt range", "predatorHuntRange", 8, 40, 1);
    this.addSlider(secPred, "Capture chance", "predatorCaptureChance", 0.05, 0.95, 0.01);
    this.addSlider(secPred, "Feeding time", "predatorFeedTime", 0.2, 2, 0.05);
    this.addSlider(secPred, "Energy gain", "predatorEnergyGain", 15, 90, 1);
    this.addSlider(secPred, "Reproduce energy", "predatorReproduceEnergy", 50, 150, 1);
    this.addSlider(secPred, "Reproduce chance", "predatorReproduceChance", 0.05, 1, 0.01);
    body.append(secPred);

    const secEvo = el("div", "section");
    secEvo.append(el("h3", "", "Evolution"));
    const tog = el("div", "toggle-row");
    const lab = el("label", "", "Trait inheritance + mutation");
    lab.htmlFor = "evo-toggle";
    const check = document.createElement("input");
    check.type = "checkbox";
    check.id = "evo-toggle";
    check.checked = this.world.params.evolutionEnabled;
    check.addEventListener("change", () => {
      this.world.params.evolutionEnabled = check.checked;
    });
    tog.append(lab, check);
    secEvo.append(tog);
    this.addSlider(secEvo, "Mutation rate", "mutationRate", 0, 0.8, 0.01);
    this.addSlider(secEvo, "Mutation scale", "mutationScale", 0.02, 0.35, 0.01);
    body.append(secEvo);

    const actions = el("div", "section");
    const row = el("div", "transport");
    row.style.padding = "0";
    row.style.border = "none";
    const reset = el("button", "btn primary", "Reset") as HTMLButtonElement;
    reset.type = "button";
    reset.addEventListener("click", () => this.reset());
    const rand = el("button", "btn", "Randomize") as HTMLButtonElement;
    rand.type = "button";
    rand.addEventListener("click", () => {
      this.world.params.seed = Math.floor(Math.random() * 1e9);
      this.seedInput.value = String(this.world.params.seed);
      this.reset();
    });
    row.append(reset, rand);
    actions.append(row);
    body.append(actions);

    panel.append(body);
    return panel;
  }

  private numberControl(
    parent: HTMLElement,
    label: string,
    value: number,
    onChange: (v: number) => void,
  ): HTMLInputElement {
    const wrap = el("div", "control");
    wrap.append(el("label", "", label));
    const input = document.createElement("input");
    input.type = "number";
    input.value = String(value);
    input.addEventListener("change", () => onChange(Number(input.value) || 0));
    wrap.append(input);
    parent.append(wrap);
    return input;
  }

  private addSlider(
    parent: HTMLElement,
    label: string,
    key: keyof SimParams,
    min: number,
    max: number,
    step: number,
  ): void {
    const wrap = el("div", "control");
    wrap.append(el("label", "", label));
    const valEl = el("span", "val", String(this.world.params[key]));
    wrap.append(valEl);
    const input = document.createElement("input");
    input.type = "range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(this.world.params[key]);
    input.addEventListener("input", () => {
      const v = Number(input.value);
      (this.world.params as unknown as Record<string, number>)[key] = v;
      valEl.textContent = Number.isInteger(step) ? String(v) : v.toFixed(2);
      // live: plant count / radius need soft response
      if (key === "foodGrowthRate" || key === "foodCarryingCapacity") {
        for (const pl of this.world.plants) {
          if (key === "foodCarryingCapacity") {
            const kindMul = pl.kind === "tree" ? 1.4 : pl.kind === "bush" ? 1 : 0.65;
            pl.maxFood = v * kindMul;
          }
        }
      }
    });
    wrap.append(input);
    parent.append(wrap);
    this.sliderBindings.push({ key, valEl, input });
  }

  private buildStage(): HTMLElement {
    const panel = el("section", "panel stage-panel");
    const wrap = el("div", "stage-wrap");
    this.canvas = document.createElement("canvas");
    wrap.append(this.canvas);

    const hud = el("div", "stage-hud");
    this.pillFood = el("div", "pill");
    this.pillFood.innerHTML = `<span class="dot food"></span>Food <strong>0</strong>`;
    this.pillPrey = el("div", "pill");
    this.pillPrey.innerHTML = `<span class="dot prey"></span>Prey <strong>0</strong>`;
    this.pillPred = el("div", "pill");
    this.pillPred.innerHTML = `<span class="dot pred"></span>Predators <strong>0</strong>`;
    this.pillTime = el("div", "pill", "t = 0.0s");
    hud.append(this.pillFood, this.pillPrey, this.pillPred, this.pillTime);
    wrap.append(hud);
    panel.append(wrap);

    const transport = el("div", "transport");
    this.playBtn = el("button", "btn primary", "Pause") as HTMLButtonElement;
    this.playBtn.type = "button";
    this.playBtn.addEventListener("click", () => {
      this.playing = !this.playing;
      this.playBtn.textContent = this.playing ? "Pause" : "Play";
    });
    const step = el("button", "btn", "Step") as HTMLButtonElement;
    step.type = "button";
    step.addEventListener("click", () => {
      this.playing = false;
      this.playBtn.textContent = "Play";
      this.world.step(0.05);
      this.afterSim();
    });
    const speedWrap = el("div", "control");
    speedWrap.style.margin = "0";
    speedWrap.style.minWidth = "140px";
    speedWrap.append(el("label", "", "Sim speed"));
    const speedVal = el("span", "val", "1.00");
    speedWrap.append(speedVal);
    const speed = document.createElement("input");
    speed.type = "range";
    speed.min = "0.25";
    speed.max = "4";
    speed.step = "0.25";
    speed.value = String(this.world.params.simSpeed);
    speed.addEventListener("input", () => {
      this.world.params.simSpeed = Number(speed.value);
      speedVal.textContent = Number(speed.value).toFixed(2);
    });
    speedWrap.append(speed);

    const hint = el("div", "hint", "Drag to orbit · scroll to zoom · click a creature");
    transport.append(this.playBtn, step, speedWrap, hint);
    panel.append(transport);
    return panel;
  }

  private buildSide(): HTMLElement {
    const stack = el("div", "side-stack");

    // verdict + stats
    const story = el("section", "panel");
    const head = el("div", "panel-head");
    head.append(el("h2", "", "Run story"));
    story.append(head);
    const body = el("div", "panel-body");
    this.verdictEl = el("div", "verdict stable");
    this.verdictEl.innerHTML = `<div class="label">Warming up</div><div class="detail">Press play and steer the forces.</div>`;
    body.append(this.verdictEl);

    const grid = el("div", "stats-grid");
    grid.style.marginTop = "10px";
    for (const [k, label] of [
      ["births", "Births"],
      ["captures", "Captures"],
      ["starvations", "Starvations"],
      ["peakPrey", "Peak prey"],
      ["peakPred", "Peak predators"],
      ["gen", "Max generation"],
    ] as const) {
      const s = el("div", "stat");
      s.append(el("div", "k", label));
      const v = el("div", "v", "0");
      this.statsEls[k] = v;
      s.append(v);
      grid.append(s);
    }
    body.append(grid);
    story.append(body);
    stack.append(story);

    // charts
    const charts = el("section", "panel");
    const chHead = el("div", "panel-head");
    chHead.append(el("h2", "", "Charts"));
    const tabs = el("div", "tabs");
    for (const [id, label] of [
      ["population", "Population"],
      ["phase", "Phase"],
      ["traits", "Traits"],
      ["energy", "Energy"],
    ] as const) {
      const t = el("button", `tab${id === this.chartTab ? " active" : ""}`, label) as HTMLButtonElement;
      t.type = "button";
      t.addEventListener("click", () => {
        this.chartTab = id;
        tabs.querySelectorAll(".tab").forEach((n) => n.classList.remove("active"));
        t.classList.add("active");
        this.drawCharts();
      });
      tabs.append(t);
    }
    chHead.append(tabs);
    charts.append(chHead);
    const chBody = el("div", "panel-body");
    const box = el("div", "chart-box tall");
    this.chartCanvas = document.createElement("canvas");
    box.append(this.chartCanvas);
    chBody.append(box);
    charts.append(chBody);
    stack.append(charts);

    // inspector
    const insp = el("section", "panel");
    const iHead = el("div", "panel-head");
    iHead.append(el("h2", "", "Inspector"));
    insp.append(iHead);
    const iBody = el("div", "panel-body");
    this.inspectorEl = el("div", "inspector empty", "Click a creature in the dish to inspect energy, behavior, and traits.");
    iBody.append(this.inspectorEl);
    insp.append(iBody);
    stack.append(insp);

    return stack;
  }

  private applyPreset(id: PresetId): void {
    this.activePreset = id;
    for (const [pid, btn] of this.presetButtons) {
      btn.classList.toggle("active", pid === id);
    }
    const params = { ...DEFAULT_PARAMS, ...PRESETS[id].params };
    this.world.reset(params);
    this.syncSliders();
    this.seedInput.value = String(this.world.params.seed);
    this.selectedId = null;
    this.renderer.selectedId = null;
    this.lastCaptures = 0;
    this.refreshInspector();
    this.afterSim();
  }

  private syncSliders(): void {
    for (const b of this.sliderBindings) {
      const v = this.world.params[b.key] as number;
      b.input.value = String(v);
      const step = Number(b.input.step);
      b.valEl.textContent = Number.isInteger(step) && step >= 1 ? String(v) : v.toFixed(2);
    }
  }

  private reset(): void {
    this.world.reset({ seed: this.world.params.seed });
    this.selectedId = null;
    this.renderer.selectedId = null;
    this.lastCaptures = 0;
    this.refreshInspector();
    this.afterSim();
  }

  private resize(): void {
    const wrap = this.canvas.parentElement!;
    this.renderer.resize(wrap.clientWidth, wrap.clientHeight);
  }

  private startLoop(): void {
    const frame = (ts: number) => {
      requestAnimationFrame(frame);
      const dt = this.lastTs ? Math.min(0.05, (ts - this.lastTs) / 1000) : 0.016;
      this.lastTs = ts;

      if (this.playing) {
        this.world.step(dt * this.world.params.simSpeed);
        this.afterSim();
      }

      if (this.world.captures > this.lastCaptures) {
        for (const c of this.world.creatures) {
          if (c.behavior === "digesting" && c.glow > 0.9) {
            this.renderer.burst(c.x, c.y, "#ffb0c0");
          }
        }
        this.lastCaptures = this.world.captures;
      }

      this.renderer.render(this.world, dt);
    };
    requestAnimationFrame(frame);
  }

  private afterSim(): void {
    const { food, prey, predators } = this.world.counts();
    (this.pillFood.querySelector("strong") as HTMLElement).textContent = food.toFixed(0);
    (this.pillPrey.querySelector("strong") as HTMLElement).textContent = String(prey);
    (this.pillPred.querySelector("strong") as HTMLElement).textContent = String(predators);
    this.pillTime.textContent = `t = ${this.world.time.toFixed(1)}s`;

    const verdict = summarizeRun(this.world.history);
    this.verdictEl.className = `verdict ${verdict.tone}`;
    this.verdictEl.innerHTML = `<div class="label">${verdict.label}</div><div class="detail">${verdict.detail}</div>`;

    this.statsEls.births!.textContent = String(this.world.births);
    this.statsEls.captures!.textContent = String(this.world.captures);
    this.statsEls.starvations!.textContent = String(this.world.starvations);
    this.statsEls.peakPrey!.textContent = String(this.world.peakPrey);
    this.statsEls.peakPred!.textContent = String(this.world.peakPredators);
    let maxGen = 0;
    for (const c of this.world.creatures) maxGen = Math.max(maxGen, c.generation);
    this.statsEls.gen!.textContent = String(maxGen);

    this.drawCharts();
    this.refreshInspector();
  }

  private drawCharts(): void {
    const h = this.world.history;
    if (this.chartTab === "population") drawPopulationChart(this.chartCanvas, h);
    else if (this.chartTab === "phase") drawPhaseChart(this.chartCanvas, h);
    else if (this.chartTab === "traits") drawTraitChart(this.chartCanvas, h);
    else {
      const prey: number[] = [];
      const predators: number[] = [];
      for (const c of this.world.creatures) {
        if (c.species === "prey") prey.push(c.energy);
        else predators.push(c.energy);
      }
      drawEnergyHist(this.chartCanvas, { prey, predators });
    }
  }

  private refreshInspector(): void {
    const c = this.world.creatureById(this.selectedId);
    if (!c) {
      if (this.selectedId != null) {
        this.selectedId = null;
        this.renderer.selectedId = null;
      }
      this.inspectorEl.className = "inspector empty";
      this.inspectorEl.textContent =
        "Click a creature in the dish to inspect energy, behavior, and traits.";
      return;
    }

    this.inspectorEl.className = "inspector";
    this.inspectorEl.innerHTML = `
      <div class="species ${c.species}">${c.species === "prey" ? "Prey" : "Predator"} #${c.id}</div>
      <dl class="kv">
        <dt>Behavior</dt><dd>${this.world.behaviorLabel(c.behavior)}</dd>
        <dt>Energy</dt><dd>${c.energy.toFixed(1)}</dd>
        <dt>Age</dt><dd>${c.age.toFixed(1)}s</dd>
        <dt>Generation</dt><dd>${c.generation}</dd>
        <dt>Speed</dt><dd>${c.traits.speed.toFixed(1)}</dd>
        <dt>Vision</dt><dd>${c.traits.vision.toFixed(1)}</dd>
        <dt>Metabolism</dt><dd>${c.traits.metabolism.toFixed(2)}</dd>
        <dt>Size</dt><dd>${c.traits.size.toFixed(2)}</dd>
        <dt>Parent</dt><dd>${c.parentId ?? "—"}</dd>
        <dt>Action timer</dt><dd>${c.actionTimer > 0 ? c.actionTimer.toFixed(2) + "s" : "—"}</dd>
      </dl>
    `;
  }
}
