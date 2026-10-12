import { FOODS, type FoodDef } from "../game/foods";
import { levelFromXp, stageFromLevel, xpProgress, type PetState, type Stats } from "../game/state";

type Screen = { x: number; y: number };
type Action = "feed" | "play" | "bathe" | "sleep";

const STAT_KEYS: (keyof Stats)[] = ["fullness", "happiness", "energy", "hygiene"];

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el as T;
}

export class Hud {
  private readonly stage = byId<HTMLElement>("stage");
  private readonly petName = byId<HTMLElement>("pet-name");
  private readonly petStage = byId<HTMLElement>("pet-stage");
  private readonly petLevel = byId<HTMLElement>("pet-level");
  private readonly xpFill = byId<HTMLElement>("xp-fill");
  private readonly bubble = byId<HTMLElement>("bubble");
  private readonly zzz = byId<HTMLElement>("zzz");
  private readonly hint = byId<HTMLElement>("hint");
  private readonly toastEl = byId<HTMLElement>("toast");
  private readonly tray = byId<HTMLElement>("food-tray");
  private readonly soundBtn = byId<HTMLButtonElement>("btn-sound");
  private readonly meters = new Map<keyof Stats, { fill: HTMLElement; value: HTMLElement; root: HTMLElement }>();
  private trayKey = "";
  private bubbleTimer = 0;
  private toastTimer = 0;

  constructor() {
    for (const key of STAT_KEYS) {
      const root = document.querySelector<HTMLElement>(`.meter[data-stat="${key}"]`);
      if (!root) throw new Error(`Missing meter ${key}`);
      this.meters.set(key, {
        root,
        fill: root.querySelector<HTMLElement>(".meter-fill") as HTMLElement,
        value: root.querySelector<HTMLElement>(".meter-value") as HTMLElement,
      });
    }
  }

  renderStats(state: PetState): void {
    for (const key of STAT_KEYS) {
      const meter = this.meters.get(key);
      if (!meter) continue;
      const value = Math.round(state[key]);
      meter.fill.style.transform = `scaleX(${state[key] / 100})`;
      meter.value.textContent = String(value);
      meter.root.dataset.low = value < 25 ? "true" : "false";
    }
  }

  renderIdentity(state: PetState): void {
    const { level, ratio } = xpProgress(state.xp);
    this.petName.textContent = state.name;
    this.petStage.textContent = stageFromLevel(level);
    this.petLevel.textContent = `Lv ${level}`;
    this.xpFill.style.transform = `scaleX(${ratio})`;
  }

  /** Rebuilds the food tray only when the set of unlocked foods changes. */
  renderTray(state: PetState): void {
    const level = levelFromXp(state.xp);
    const key = String(level);
    if (key === this.trayKey) return;
    this.trayKey = key;
    this.tray.replaceChildren(...FOODS.map((food) => this.buildCard(food, level)));
  }

  private buildCard(food: FoodDef, level: number): HTMLElement {
    const locked = level < food.unlockLevel;
    const card = document.createElement("button");
    card.type = "button";
    card.className = `food-card${locked ? " locked" : ""}`;
    card.dataset.food = food.id;
    card.style.setProperty("--food", food.color);
    card.setAttribute("aria-label", locked ? `${food.name}, unlocks at level ${food.unlockLevel}` : `Feed ${food.name}`);
    card.innerHTML = `
      <span class="food-emoji" aria-hidden="true">${food.emoji}</span>
      <span class="food-name">${food.name}</span>
      <span class="food-blurb">${locked ? `Lv ${food.unlockLevel}` : food.blurb}</span>
    `;
    return card;
  }

  setTrayOpen(open: boolean): void {
    this.tray.hidden = !open;
    byId<HTMLButtonElement>("btn-feed").setAttribute("aria-expanded", String(open));
  }

  setActiveAction(action: Action, active: boolean): void {
    const btn = document.querySelector<HTMLButtonElement>(`.dock-btn[data-action="${action}"]`);
    if (!btn) return;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", String(active));
  }

  setSleepLabel(asleep: boolean): void {
    const btn = byId<HTMLButtonElement>("btn-sleep");
    const label = btn.querySelector<HTMLElement>("span:last-child");
    const emoji = btn.querySelector<HTMLElement>(".dock-emoji");
    if (label) label.textContent = asleep ? "Wake" : "Sleep";
    if (emoji) emoji.textContent = asleep ? "☀️" : "🌙";
  }

  setSoundOn(on: boolean): void {
    this.soundBtn.setAttribute("aria-pressed", String(on));
    this.soundBtn.textContent = on ? "🔊" : "🔇";
    this.soundBtn.title = on ? "Sound on" : "Sound off";
  }

  setStageMode(mode: { night: boolean; asleep: boolean; feedTarget: boolean; dragging: boolean }): void {
    this.stage.classList.toggle("night", mode.night);
    this.stage.classList.toggle("asleep", mode.asleep);
    this.stage.classList.toggle("feed-target", mode.feedTarget);
    this.stage.classList.toggle("dragging", mode.dragging);
  }

  hideHint(): void {
    this.hint.classList.add("gone");
  }

  /** Speech bubble anchored to a screen point (or pinned to the top when null). */
  say(text: string, anchor: Screen | null, duration = 2.6): void {
    this.bubble.textContent = text;
    this.bubble.classList.add("show");
    this.placeBubble(anchor);
    window.clearTimeout(this.bubbleTimer);
    this.bubbleTimer = window.setTimeout(() => this.bubble.classList.remove("show"), duration * 1000);
  }

  placeBubble(anchor: Screen | null): void {
    if (!anchor) return;
    this.bubble.style.transform = `translate(${anchor.x}px, ${anchor.y}px) translate(-50%, -100%)`;
  }

  setZzz(visible: boolean, anchor: Screen | null): void {
    this.zzz.classList.toggle("show", visible);
    if (anchor) this.zzz.style.transform = `translate(${anchor.x + 34}px, ${anchor.y}px)`;
  }

  /** A short-lived emoji that floats up and fades out. */
  floatEmoji(emoji: string, at: Screen): void {
    const node = document.createElement("span");
    node.className = "float-emoji";
    node.textContent = emoji;
    node.style.left = `${at.x}px`;
    node.style.top = `${at.y}px`;
    node.style.setProperty("--drift", `${(Math.random() - 0.5) * 60}px`);
    this.stage.append(node);
    node.addEventListener("animationend", () => node.remove(), { once: true });
  }

  toast(message: string, duration = 2.2): void {
    this.toastEl.textContent = message;
    this.toastEl.hidden = false;
    this.toastEl.classList.remove("show");
    void this.toastEl.offsetWidth;
    this.toastEl.classList.add("show");
    window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.classList.remove("show");
    }, duration * 1000);
  }
}
