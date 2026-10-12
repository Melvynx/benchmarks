export interface BusEvents {
  say: { text: string };
  toast: { text: string; tone?: 'good' | 'info' };
  levelup: { level: number; unlocked: string | null };
  wake: { reason: 'manual' | 'rested' | 'hungry'; grumpy: boolean };
  autosleep: Record<string, never>;
}

type Handler<K extends keyof BusEvents> = (payload: BusEvents[K]) => void;

class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<keyof BusEvents>>>();

  on<K extends keyof BusEvents>(type: K, handler: Handler<K>) {
    let set = this.handlers.get(type);
    if (!set) {
      set = new Set();
      this.handlers.set(type, set);
    }
    const h = handler as unknown as Handler<keyof BusEvents>;
    set.add(h);
    return () => {
      set.delete(h);
    };
  }

  emit<K extends keyof BusEvents>(type: K, payload: BusEvents[K]) {
    this.handlers.get(type)?.forEach((h) => h(payload));
  }
}

export const bus = new Bus();
