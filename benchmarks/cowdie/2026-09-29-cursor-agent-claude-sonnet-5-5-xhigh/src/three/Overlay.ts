export class Overlay {
  readonly el: HTMLDivElement;
  private bubble: HTMLDivElement;
  private body: HTMLDivElement;
  private bubbleText: HTMLSpanElement;
  private bubbleIcon: HTMLImageElement;
  private hideTimer = 0;
  private visible = false;
  private anchorX = 0;
  private anchorY = 0;
  private lastText = '';
  private lastAt = 0;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'world-overlay';
    this.bubble = document.createElement('div');
    this.bubble.className = 'bubble';
    this.bubble.setAttribute('aria-hidden', 'true');
    this.bubbleIcon = document.createElement('img');
    this.bubbleIcon.className = 'bubble-icon';
    this.bubbleIcon.alt = '';
    this.bubbleText = document.createElement('span');
    this.body = document.createElement('div');
    this.body.className = 'bubble-body';
    this.body.append(this.bubbleIcon, this.bubbleText);
    this.bubble.append(this.body);
    this.el.append(this.bubble);
    container.append(this.el);
  }

  get isSpeaking() {
    return this.visible;
  }

  get sinceLast() {
    return performance.now() - this.lastAt;
  }

  say(text: string, opts: { ms?: number; icon?: string; thought?: boolean } = {}) {
    const ms = opts.ms ?? Math.min(4200, 1600 + text.length * 55);
    this.bubbleText.textContent = text;
    this.body.classList.toggle('thought', !!opts.thought);
    if (opts.icon) {
      this.bubbleIcon.src = opts.icon;
      this.bubbleIcon.style.display = 'block';
    } else {
      this.bubbleIcon.style.display = 'none';
    }
    this.body.classList.remove('show');
    void this.body.offsetWidth;
    this.body.classList.add('show');
    this.visible = true;
    this.lastText = text;
    this.lastAt = performance.now();
    window.dispatchEvent(new CustomEvent('cowdie:say', { detail: text }));
    window.clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => this.hide(), ms);
  }

  hide() {
    this.body.classList.remove('show');
    this.visible = false;
  }

  get text() {
    return this.lastText;
  }

  setAnchor(x: number, y: number) {
    this.anchorX = x;
    this.anchorY = y;
    if (this.visible) this.bubble.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  }

  float(text: string, x: number, y: number, tone: 'belly' | 'joy' | 'energy' | 'fresh' | 'xp' | 'plain' = 'plain', delay = 0) {
    const f = document.createElement('div');
    f.className = `float float-${tone}`;
    f.textContent = text;
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    f.style.animationDelay = `${delay}ms`;
    this.el.append(f);
    window.setTimeout(() => f.remove(), 1900 + delay);
  }

  dispose() {
    window.clearTimeout(this.hideTimer);
    this.el.remove();
  }

  get anchor() {
    return { x: this.anchorX, y: this.anchorY };
  }
}
