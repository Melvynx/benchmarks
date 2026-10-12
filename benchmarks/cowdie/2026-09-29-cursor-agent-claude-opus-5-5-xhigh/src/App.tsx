import { useEffect } from "react";
import { Scene } from "./scene/Scene";
import { Hud } from "./ui/Hud";
import { useGame } from "./game/store";
import { pointer } from "./game/runtime";
import { initAudio, setAudioPrefs } from "./game/audio";

function useSimulationClock() {
  useEffect(() => {
    useGame.getState().catchUp(Date.now());
    const id = window.setInterval(() => useGame.getState().tick(Date.now()), 500);
    const onVisible = () => {
      if (document.visibilityState === "visible") useGame.getState().catchUp(Date.now());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}

function usePointer() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    };
    const down = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.down = true;
      initAudio();
    };
    const up = () => {
      pointer.down = false;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    window.addEventListener("pointercancel", up, { passive: true });
    const key = () => initAudio();
    window.addEventListener("keydown", key, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("keydown", key);
    };
  }, []);
}

function useAudioPrefs() {
  const sound = useGame((s) => s.sound);
  const music = useGame((s) => s.music);
  const asleep = useGame((s) => s.asleep);
  useEffect(() => setAudioPrefs(sound, music, asleep), [sound, music, asleep]);
}

function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const g = useGame.getState();
      const k = e.key.toLowerCase();
      if (k === "escape") {
        if (g.naming) g.setNaming(false);
        else if (g.levelUp) g.dismissLevelUp();
        else if (g.mode === "play") g.endPlay("done");
        else if (g.mode === "clean") g.endClean();
        else if (g.panel) g.setPanel(null);
        return;
      }
      if (k === "m") {
        g.toggleSound();
        return;
      }
      if (!g.hatched || g.naming) return;
      if (k === "s") {
        g.toggleSleep();
        return;
      }
      if (g.asleep) return;
      if (k === "f") g.setPanel("feed");
      else if (k === "w") g.setPanel("style");
      else if (k === "p") g.mode === "play" ? g.endPlay("done") : g.startPlay();
      else if (k === "c") g.mode === "clean" ? g.endClean() : g.startClean();
      else if (k === "h" && (g.sick || g.stats.health < 60)) g.heal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}

function useBodyState() {
  const mode = useGame((s) => s.mode);
  const asleep = useGame((s) => s.asleep);
  useEffect(() => {
    document.body.dataset.mode = mode;
    document.body.classList.toggle("is-asleep", asleep);
  }, [mode, asleep]);
}

export default function App() {
  useSimulationClock();
  usePointer();
  useAudioPrefs();
  useShortcuts();
  useBodyState();
  return (
    <main className="app">
      <Scene />
      <Hud />
    </main>
  );
}
