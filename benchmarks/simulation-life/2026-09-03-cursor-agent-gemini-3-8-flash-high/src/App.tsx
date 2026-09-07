import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SimulationEngine } from './simulation/engine';
import { TopHeader } from './components/TopHeader';
import { ControlPanel } from './components/ControlPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { InspectorPanel } from './components/InspectorPanel';
import { ToolsOverlay } from './components/ToolsOverlay';
import { GardenCanvas } from './components/GardenCanvas';
import { DEFAULT_CONFIG, PRESETS } from './simulation/presets';
import { BlobEntity, HistoryPoint, InteractiveTool, SimulationConfig, SimulationStats } from './types/simulation';

export const App: React.FC = () => {
  // Engine instance
  const engine = useMemo(() => new SimulationEngine(), []);

  // UI States
  const [config, setConfig] = useState<SimulationConfig>(() => ({ ...engine.config }));
  const [activePresetId, setActivePresetId] = useState<string>('balanced');
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<InteractiveTool>('inspect');
  const [selectedBlob, setSelectedBlob] = useState<BlobEntity | null>(null);
  const [isTracked, setIsTracked] = useState<boolean>(false);
  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(true);

  // Periodic Snapshot States for React UI
  const [stats, setStats] = useState<SimulationStats>(() => engine.getStats());
  const [history, setHistory] = useState<HistoryPoint[]>(() => [...engine.history]);

  // Sync state with engine on interval
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(engine.getStats());
      setHistory([...engine.history]);

      // Keep selected blob data fresh
      if (engine.selectedBlobId) {
        const freshBlob = engine.blobs.get(engine.selectedBlobId) || null;
        setSelectedBlob(freshBlob ? { ...freshBlob } : null);
      } else {
        setSelectedBlob(null);
      }
    }, 80); // ~12 fps UI refresh is butter-smooth for numbers & charts without taxing main thread

    return () => clearInterval(interval);
  }, [engine]);

  // Play / Pause toggle
  const handleTogglePlay = useCallback(() => {
    engine.isRunning = !engine.isRunning;
    setIsRunning(engine.isRunning);
  }, [engine]);

  // Step forward 1 tick
  const handleStep = useCallback(() => {
    engine.step();
    setStats(engine.getStats());
    setHistory([...engine.history]);
  }, [engine]);

  // Reset simulation
  const handleReset = useCallback(() => {
    engine.reset();
    setStats(engine.getStats());
    setHistory([...engine.history]);
    setSelectedBlob(null);
    setIsTracked(false);
  }, [engine]);

  // Randomize rules & seeds
  const handleRandomize = useCallback(() => {
    const randomPreset = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    const newSeed = Math.floor(Math.random() * 9999);
    engine.reset({
      ...randomPreset.config,
      randomSeed: newSeed,
    });
    setConfig({ ...engine.config });
    setActivePresetId(randomPreset.id);
    setStats(engine.getStats());
    setHistory([...engine.history]);
    setSelectedBlob(null);
  }, [engine]);

  // Change simulation speed
  const handleSpeedChange = useCallback(
    (speed: number) => {
      engine.simSpeed = speed;
      setSimSpeed(speed);
    },
    [engine]
  );

  // Reset camera view
  const handleResetCamera = useCallback(() => {
    if ((window as any).__resetGardenCamera) {
      (window as any).__resetGardenCamera();
    }
  }, []);

  // Update Config
  const handleConfigChange = useCallback(
    (newPartial: Partial<SimulationConfig>) => {
      engine.config = { ...engine.config, ...newPartial };
      setConfig({ ...engine.config });
      setActivePresetId('custom');
    },
    [engine]
  );

  // Select Preset
  const handleSelectPreset = useCallback(
    (presetId: string) => {
      const p = PRESETS.find((pr) => pr.id === presetId);
      if (!p) return;
      engine.reset(p.config);
      setConfig({ ...engine.config });
      setActivePresetId(presetId);
      setStats(engine.getStats());
      setHistory([...engine.history]);
      setSelectedBlob(null);
      setIsTracked(false);
    },
    [engine]
  );

  // Reset to default
  const handleResetToDefault = useCallback(() => {
    engine.reset(DEFAULT_CONFIG);
    setConfig({ ...engine.config });
    setActivePresetId('balanced');
    setStats(engine.getStats());
    setHistory([...engine.history]);
    setSelectedBlob(null);
  }, [engine]);

  // Tool Selection
  const handleSelectTool = useCallback(
    (tool: InteractiveTool) => {
      engine.activeTool = tool;
      setActiveTool(tool);
    },
    [engine]
  );

  // Blob Selected
  const handleBlobSelect = useCallback(
    (blob: BlobEntity | null) => {
      setSelectedBlob(blob ? { ...blob } : null);
      if (!blob) {
        setIsTracked(false);
        engine.trackedBlobId = null;
      }
    },
    [engine]
  );

  // Toggle Camera Tracking
  const handleToggleTrack = useCallback(() => {
    if (isTracked) {
      engine.trackedBlobId = null;
      setIsTracked(false);
    } else if (selectedBlob) {
      engine.trackedBlobId = selectedBlob.id;
      setIsTracked(true);
    }
  }, [engine, isTracked, selectedBlob]);

  // Direct Interaction: Feed Blob
  const handleFeedBlob = useCallback(() => {
    if (!selectedBlob) return;
    const b = engine.blobs.get(selectedBlob.id);
    if (b) {
      b.energy = Math.min(b.maxEnergy, b.energy + 40);
      b.action = 'eating';
      b.actionTimer = 0.9;
      setSelectedBlob({ ...b });
    }
  }, [engine, selectedBlob]);

  // Direct Interaction: Cheer Blob
  const handleCheerBlob = useCallback(() => {
    if (!selectedBlob) return;
    const b = engine.blobs.get(selectedBlob.id);
    if (b) {
      b.hopPhase += Math.PI;
      b.scaleY = 1.35;
      b.scaleX = 0.85;
      setSelectedBlob({ ...b });
    }
  }, [engine, selectedBlob]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'KeyS') {
        handleStep();
      } else if (e.code === 'KeyR') {
        handleReset();
      } else if (e.code === 'KeyC') {
        handleResetCamera();
      } else if (e.code === 'Digit1') {
        handleSelectTool('inspect');
      } else if (e.code === 'Digit2') {
        handleSelectTool('spawn_blue');
      } else if (e.code === 'Digit3') {
        handleSelectTool('spawn_red');
      } else if (e.code === 'Digit4') {
        handleSelectTool('plant_tree');
      } else if (e.code === 'Digit5') {
        handleSelectTool('drop_fruit');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTogglePlay, handleStep, handleReset, handleResetCamera, handleSelectTool]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 overflow-hidden relative">
      {/* Top Header Bar */}
      <TopHeader
        isRunning={isRunning}
        simSpeed={simSpeed}
        onTogglePlay={handleTogglePlay}
        onStep={handleStep}
        onReset={handleReset}
        onRandomize={handleRandomize}
        onSpeedChange={handleSpeedChange}
        onResetCamera={handleResetCamera}
        stats={stats}
      />

      {/* Main 3D Canvas Area */}
      <main className="flex-1 relative w-full h-[calc(100vh-4rem)]">
        <GardenCanvas
          engine={engine}
          onBlobSelect={handleBlobSelect}
        />

        {/* Floating Tools Toolbar */}
        <ToolsOverlay
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onResetCamera={handleResetCamera}
        />

        {/* Left Side: Control & Presets Panel */}
        <ControlPanel
          config={config}
          activePresetId={activePresetId}
          onConfigChange={handleConfigChange}
          onSelectPreset={handleSelectPreset}
          onResetToDefault={handleResetToDefault}
          isOpen={isControlsOpen}
          onToggleOpen={() => setIsControlsOpen(!isControlsOpen)}
        />

        {/* Right Side: Selected Blob Inspector */}
        <InspectorPanel
          blob={selectedBlob}
          config={config}
          isTracked={isTracked}
          onToggleTrack={handleToggleTrack}
          onFeedBlob={handleFeedBlob}
          onCheerBlob={handleCheerBlob}
          onClose={() => handleBlobSelect(null)}
        />

        {/* Bottom Right: Story & Charts Panel */}
        <ChartsPanel
          history={history}
          config={config}
          elapsedTime={stats.time}
        />
      </main>
    </div>
  );
};
export default App;
