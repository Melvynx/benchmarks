/** Tiny synthesized sound effects. No asset files, and nothing plays until the first user gesture. */
export class Sfx {
  private ctx: AudioContext | null = null;
  enabled: boolean;

  constructor(enabled: boolean) {
    this.enabled = enabled;
  }

  /** Call from a user gesture so browsers allow audio. */
  unlock(): void {
    if (!this.enabled) return;
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  chomp(): void {
    const ctx = this.ready();
    if (!ctx) return;
    const length = Math.floor(ctx.sampleRate * 0.12);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 900;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  poke(): void {
    this.tone(520, 900, 0.16, "triangle", 0.18);
  }

  yum(): void {
    this.tone(660, 660, 0.12, "sine", 0.14);
    window.setTimeout(() => this.tone(880, 990, 0.18, "sine", 0.14), 110);
  }

  refuse(): void {
    this.tone(330, 180, 0.3, "square", 0.08);
  }

  pop(): void {
    this.tone(1200, 300, 0.06, "sine", 0.06);
  }

  whoosh(): void {
    this.tone(280, 520, 0.22, "sine", 0.07);
  }

  private tone(from: number, to: number, duration: number, type: OscillatorType, volume: number): void {
    const ctx = this.ready();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  private ready(): AudioContext | null {
    if (!this.enabled) return null;
    if (!this.ctx) this.unlock();
    if (!this.ctx || this.ctx.state !== "running") return null;
    return this.ctx;
  }
}
