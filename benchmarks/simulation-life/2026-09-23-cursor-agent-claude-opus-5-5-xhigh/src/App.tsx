import { useEffect } from "react";
import { ControlsPanel } from "./ui/ControlsPanel";
import { GardenView } from "./ui/GardenView";
import { Header } from "./ui/Header";
import { PhasePlot } from "./ui/charts/PhasePlot";
import { TimelineChart } from "./ui/charts/TimelineChart";
import { TraitChart } from "./ui/charts/TraitChart";
import { SummaryPanel } from "./ui/SummaryPanel";
import { ctrl } from "./ui/sim";

function useShortcuts() {
  useEffect(() => {
    const isTyping = (el: HTMLElement | null) =>
      !!el &&
      ((el instanceof HTMLInputElement && el.type !== "range") || el.tagName === "TEXTAREA" || el.isContentEditable);
    // Space is play/pause everywhere, so stop it from also clicking whichever button has focus.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === " " && (e.target as HTMLElement | null)?.tagName === "BUTTON") e.preventDefault();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const isRange = el instanceof HTMLInputElement && el.type === "range";
      if (isTyping(el) || (isRange && e.key !== " " && e.key !== "Escape")) return;
      switch (e.key) {
        case " ":
          e.preventDefault();
          if (!e.repeat) ctrl.toggle();
          break;
        case ".":
        case "ArrowRight":
          if (!ctrl.running) {
            e.preventDefault();
            ctrl.stepOnceManual();
          }
          break;
        case "r":
        case "R":
          ctrl.reset();
          break;
        case "f":
        case "F":
          if (ctrl.selected !== null) ctrl.setFollow(!ctrl.follow);
          break;
        case "Escape":
          ctrl.select(null);
          ctrl.selectTree(null);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
}

export function App() {
  useShortcuts();
  return (
    <div className="app">
      <Header />
      <main className="layout">
        <div className="stage">
          <GardenView />
          <TimelineChart />
          <div className="card-row">
            <SummaryPanel />
            <PhasePlot />
            <TraitChart />
          </div>
        </div>
        <ControlsPanel />
      </main>
    </div>
  );
}
