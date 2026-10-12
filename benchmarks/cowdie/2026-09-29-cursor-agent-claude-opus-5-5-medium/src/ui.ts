import { FOODS, type FoodDef, type FoodId } from './foods';
import type { Mood, SaveData, Stage, StatKey } from './state';

export interface UIHandlers {
  onFoodDown(def: FoodDef, e: PointerEvent): void;
  onFeedToggle(): void;
  onPlay(): void;
  onWash(): void;
  onSleep(): void;
  onMute(): void;
  onStart(): void;
  onRename(name: string): void;
  onReset(): void;
  onAnyInput(): void;
}

const STAT_META: { key: StatKey; label: string; icon: string }[] = [
  { key: 'hunger', label: 'Tummy', icon: '🍎' },
  { key: 'happy', label: 'Joy', icon: '💖' },
  { key: 'energy', label: 'Energy', icon: '⚡' },
  { key: 'clean', label: 'Hygiene', icon: '🧼' },
];

const $ = <T extends HTMLElement>(root: ParentNode, sel: string) => root.querySelector(sel) as T;

export class UI {
  private root: HTMLElement;
  private speech: HTMLElement;
  private thought: HTMLElement;
  private floaters: HTMLElement;
  private toasts: HTMLElement;
  private tray: HTMLElement;
  private modeHint: HTMLElement;
  private nameEl: HTMLElement;
  private subEl: HTMLElement;
  private moodEl: HTMLElement;
  private xpFill: HTMLElement;
  private xpLabel: HTMLElement;
  private fedEl: HTMLElement;
  private intro: HTMLElement;
  private bars = new Map<StatKey, { row: HTMLElement; fill: HTMLElement; val: HTMLElement }>();
  private chips = new Map<FoodId, HTMLElement>();
  private buttons = new Map<string, HTMLButtonElement>();
  private speechTimer = 0;

  constructor(root: HTMLElement, private h: UIHandlers) {
    this.root = root;
    root.innerHTML = `
      <header class="topbar">
        <h1 class="title">Claude Opus 5.5</h1>
        <button class="icon-btn" id="mute" aria-label="Toggle sound" title="Toggle sound">🔊</button>
      </header>
      <section class="card status" aria-label="Pet status">
        <div class="id-row">
          <div class="avatar" aria-hidden="true">🐮</div>
          <div class="id-text">
            <div class="name" id="pet-name" contenteditable="true" spellcheck="false" title="Click to rename"></div>
            <div class="sub" id="pet-sub"></div>
          </div>
        </div>
        <div class="xp" title="Experience"><div class="xp-fill" id="xp-fill"></div><span id="xp-label"></span></div>
        <div class="mood" id="mood"></div>
        <div class="stats">
          ${STAT_META.map(
            (m) => `<div class="stat" data-stat="${m.key}">
              <span class="stat-ic" aria-hidden="true">${m.icon}</span>
              <div class="stat-main"><div class="stat-top"><span>${m.label}</span><span class="stat-val">0</span></div>
              <div class="bar"><div class="fill"></div></div></div>
            </div>`,
          ).join('')}
        </div>
        <div class="foot"><span id="fed"></span><button class="link" id="reset">Adopt a new calf</button></div>
      </section>
      <div class="speech" id="speech"></div>
      <div class="thought" id="thought"></div>
      <div class="floaters" id="floaters"></div>
      <div class="toasts" id="toasts"></div>
      <div class="bottom">
        <div class="tray" id="tray">
          <p class="tray-hint">Drag a snack up to her mouth, or tap one to toss it</p>
          <div class="foods">
            ${FOODS.map(
              (f) => `<button class="chip" data-food="${f.id}" title="${f.name}: ${f.blurb}">
                <span class="chip-emoji">${f.emoji}</span>
                <span class="chip-name">${f.name}</span>
                <span class="chip-meta">${f.taste === 'hate' ? 'yikes' : `+${f.hunger} tummy`}</span>
                <span class="crave-badge">craving!</span>
              </button>`,
            ).join('')}
          </div>
        </div>
        <div class="mode-hint" id="mode-hint"></div>
        <nav class="dock" aria-label="Care actions">
          <button data-act="feed"><span class="ic">🍽️</span><span class="lbl">Feed</span></button>
          <button data-act="play"><span class="ic">⚽</span><span class="lbl">Play</span></button>
          <button data-act="wash"><span class="ic">🧽</span><span class="lbl">Wash</span></button>
          <button data-act="sleep"><span class="ic">🌙</span><span class="lbl">Sleep</span></button>
        </nav>
      </div>
      <div class="intro" id="intro">
        <div class="intro-card">
          <div class="intro-cow" aria-hidden="true">🐮</div>
          <h2>Meet Cowdie</h2>
          <p>A tiny cow on a tiny floating island. She gets hungry, bored, sleepy and a bit muddy. Keep her happy and she'll grow up.</p>
          <ul>
            <li><b>🍽️ Feed</b> drag snacks right into her mouth</li>
            <li><b>🤚 Pet</b> stroke her, or tap her for a boop</li>
            <li><b>⚽ Play</b> kick the ball, she'll chase it</li>
            <li><b>🧽 Wash</b> scrub her clean, scoop the poop</li>
          </ul>
          <button class="primary" id="start">Say hi</button>
        </div>
      </div>`;

    this.speech = $(root, '#speech');
    this.thought = $(root, '#thought');
    this.floaters = $(root, '#floaters');
    this.toasts = $(root, '#toasts');
    this.tray = $(root, '#tray');
    this.modeHint = $(root, '#mode-hint');
    this.nameEl = $(root, '#pet-name');
    this.subEl = $(root, '#pet-sub');
    this.moodEl = $(root, '#mood');
    this.xpFill = $(root, '#xp-fill');
    this.xpLabel = $(root, '#xp-label');
    this.fedEl = $(root, '#fed');
    this.intro = $(root, '#intro');

    root.querySelectorAll<HTMLElement>('.stat').forEach((row) => {
      const key = row.dataset.stat as StatKey;
      this.bars.set(key, { row, fill: $(row, '.fill'), val: $(row, '.stat-val') });
    });

    root.querySelectorAll<HTMLButtonElement>('.chip').forEach((chip) => {
      const def = FOODS.find((f) => f.id === chip.dataset.food)!;
      this.chips.set(def.id, chip);
      chip.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        h.onAnyInput();
        h.onFoodDown(def, e);
      });
    });

    root.querySelectorAll<HTMLButtonElement>('.dock button').forEach((b) => {
      this.buttons.set(b.dataset.act!, b);
      b.addEventListener('click', () => {
        h.onAnyInput();
        const act = b.dataset.act;
        if (act === 'feed') h.onFeedToggle();
        if (act === 'play') h.onPlay();
        if (act === 'wash') h.onWash();
        if (act === 'sleep') h.onSleep();
      });
    });

    $(root, '#mute').addEventListener('click', () => {
      h.onAnyInput();
      h.onMute();
    });
    $(root, '#start').addEventListener('click', () => {
      h.onAnyInput();
      h.onStart();
    });
    $(root, '#reset').addEventListener('click', () => {
      if (confirm('Say goodbye and adopt a brand new calf? Progress will reset.')) h.onReset();
    });

    this.nameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.nameEl.blur();
      }
    });
    this.nameEl.addEventListener('blur', () => {
      const name = (this.nameEl.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 16) || 'Cowdie';
      this.nameEl.textContent = name;
      h.onRename(name);
    });
  }

  setName(name: string) {
    if (document.activeElement !== this.nameEl) this.nameEl.textContent = name;
    this.root.querySelector('.intro-card h2')!.textContent = `Meet ${name}`;
  }

  renderStats(s: SaveData, mood: Mood, stage: Stage, xpNeed: number) {
    for (const [key, b] of this.bars) {
      const v = Math.round(s.stats[key]);
      b.fill.style.transform = `scaleX(${Math.max(0.02, v / 100)})`;
      b.val.textContent = String(v);
      b.row.classList.toggle('low', v < 25);
      b.row.classList.toggle('mid', v >= 25 && v < 50);
    }
    const day = Math.floor((Date.now() - s.born) / 86400000) + 1;
    this.subEl.textContent = `${stage.name} · Level ${s.level} · Day ${day}`;
    this.xpFill.style.transform = `scaleX(${Math.min(1, s.xp / xpNeed)})`;
    this.xpLabel.textContent = `${Math.floor(s.xp)} / ${xpNeed} xp`;
    this.moodEl.innerHTML = `<span>${mood.emoji}</span> <b>${mood.label}</b>`;
    this.moodEl.dataset.mood = mood.key;
    this.fedEl.textContent = `${s.fed} snack${s.fed === 1 ? '' : 's'} eaten`;
  }

  say(text: string, dur = 2.2) {
    this.speech.textContent = text;
    this.speech.classList.remove('show');
    void this.speech.offsetWidth;
    this.speech.classList.add('show');
    window.clearTimeout(this.speechTimer);
    this.speechTimer = window.setTimeout(() => this.speech.classList.remove('show'), dur * 1000);
  }

  get speaking() {
    return this.speech.classList.contains('show');
  }

  think(glyph: string | null) {
    if (glyph) {
      if (this.thought.dataset.glyph !== glyph) {
        this.thought.dataset.glyph = glyph;
        this.thought.innerHTML = `<span>${glyph}</span>`;
      }
      this.thought.classList.add('show');
    } else {
      this.thought.classList.remove('show');
    }
  }

  placeBubbles(x: number, y: number, visible: boolean) {
    const t = `translate(${x}px, ${y}px)`;
    this.speech.style.transform = t;
    this.thought.style.transform = `translate(${x + 44}px, ${y - 10}px)`;
    this.speech.style.visibility = this.thought.style.visibility = visible ? 'visible' : 'hidden';
  }

  floater(text: string, x: number, y: number, tone: 'good' | 'bad' | 'xp' = 'good') {
    const el = document.createElement('div');
    el.className = `floater ${tone}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.floaters.appendChild(el);
    window.setTimeout(() => el.remove(), 1600);
  }

  toast(text: string, kind: 'info' | 'party' | 'warn' = 'info') {
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.toasts.appendChild(el);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    window.setTimeout(() => el.classList.add('out'), 2800);
    window.setTimeout(() => el.remove(), 3300);
  }

  setTrayOpen(open: boolean) {
    this.tray.classList.toggle('open', open);
    this.buttons.get('feed')!.classList.toggle('active', open);
  }

  get trayOpen() {
    return this.tray.classList.contains('open');
  }

  setModes(o: { wash: boolean; asleep: boolean; ball: boolean }) {
    this.buttons.get('wash')!.classList.toggle('active', o.wash);
    this.buttons.get('play')!.classList.toggle('active', o.ball);
    const sleep = this.buttons.get('sleep')!;
    sleep.classList.toggle('active', o.asleep);
    sleep.querySelector('.ic')!.textContent = o.asleep ? '☀️' : '🌙';
    sleep.querySelector('.lbl')!.textContent = o.asleep ? 'Wake' : 'Sleep';
    this.buttons.get('play')!.querySelector('.lbl')!.textContent = o.ball ? 'Put away' : 'Play';
    document.body.classList.toggle('wash-mode', o.wash);
    document.body.classList.toggle('asleep', o.asleep);
    let hint = '';
    if (o.wash) hint = 'Scrub her with the sponge: click and rub back and forth';
    else if (o.ball) hint = 'Tap the ball to kick it';
    else if (o.asleep) hint = 'Shh… she is recharging';
    this.modeHint.textContent = hint;
    this.modeHint.classList.toggle('show', !!hint);
  }

  setCraving(id: FoodId | null) {
    for (const [fid, chip] of this.chips) chip.classList.toggle('craved', fid === id);
  }

  setMuted(m: boolean) {
    $(this.root, '#mute').textContent = m ? '🔇' : '🔊';
  }

  showIntro(show: boolean) {
    this.intro.classList.toggle('show', show);
  }
}
