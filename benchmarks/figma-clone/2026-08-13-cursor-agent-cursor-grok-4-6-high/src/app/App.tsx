import { useEffect } from "react";
import { handleKeyDown } from "../input/shortcuts";
import { CanvasView } from "../ui/CanvasView";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { LayersPanel } from "../ui/LayersPanel";
import { CommandPalette, ShortcutHelp } from "../ui/Overlays";
import { PlayMode } from "../ui/PlayMode";
import { PropertiesPanel } from "../ui/PropertiesPanel";
import { StatusBar } from "../ui/StatusBar";
import { Toolbar } from "../ui/Toolbar";
import { TopBar } from "../ui/TopBar";

export function App() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => handleKeyDown(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ErrorBoundary>
      <div className="app">
        <TopBar />
        <div className="workspace">
          <Toolbar />
          <LayersPanel />
          <CanvasView />
          <PropertiesPanel />
        </div>
        <StatusBar />
        <CommandPalette />
        <ShortcutHelp />
        <PlayMode />
      </div>
    </ErrorBoundary>
  );
}
