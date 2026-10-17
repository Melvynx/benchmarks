// Subtle Web Audio API harmonic chime & ambient resonance generator for Maison Elysian

class ElysianHarmonics {
  private ctx: AudioContext | null = null;
  private droneGain: GainNode | null = null;
  private droneOscs: OscillatorNode[] = [];
  public isDroneActive = false;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playChime(freq = 528, secondaryFreq = 792, duration = 1.4) {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.045, now + 0.03);
      master.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      master.connect(ctx.destination);

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(secondaryFreq, now);

      const g2 = ctx.createGain();
      g2.gain.setValueAtTime(0.25, now);

      osc1.connect(master);
      osc2.connect(g2);
      g2.connect(master);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
    } catch {
      // Ignore audio errors on restricted devices
    }
  }

  public toggleAmbientDrone(): boolean {
    try {
      const ctx = this.ensureContext();
      if (!ctx) return false;

      if (this.isDroneActive) {
        if (this.droneGain) {
          const now = ctx.currentTime;
          this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, now);
          this.droneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
          setTimeout(() => {
            this.droneOscs.forEach((o) => {
              try {
                o.stop();
              } catch {}
            });
            this.droneOscs = [];
          }, 850);
        }
        this.isDroneActive = false;
        return false;
      } else {
        const now = ctx.currentTime;
        const master = ctx.createGain();
        master.gain.setValueAtTime(0.0001, now);
        master.gain.exponentialRampToValueAtTime(0.032, now + 1.5);
        master.connect(ctx.destination);
        this.droneGain = master;

        // Warm Pythagorean fifth chord (D3, A3, F#4, E4)
        const freqs = [146.83, 220.0, 329.63, 369.99];
        this.droneOscs = freqs.map((f, idx) => {
          const osc = ctx.createOscillator();
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(f, now);

          const filter = ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(420, now);

          const individualGain = ctx.createGain();
          individualGain.gain.setValueAtTime(idx < 2 ? 0.4 : 0.15, now);

          osc.connect(filter);
          filter.connect(individualGain);
          individualGain.connect(master);
          osc.start(now);
          return osc;
        });

        this.isDroneActive = true;
        this.playChime(440, 660, 1.8);
        return true;
      }
    } catch {
      return false;
    }
  }
}

export const harmonics = new ElysianHarmonics();
