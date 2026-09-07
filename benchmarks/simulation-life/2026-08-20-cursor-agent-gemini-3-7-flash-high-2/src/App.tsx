import React, { useEffect, useRef, useState } from 'react';
import { SimulationEngine } from './simulation/engine';
import { PRESETS } from './simulation/presets';
import { BlobEntity, InteractiveTool, SimulationConfig } from './types/simulation';
import { GardenScene } from './renderer/GardenScene';
import { TopHeader } from './components/TopHeader';
import { GardenCanvas } from './components/GardenCanvas';
import { ControlPanel } from './components/ControlPanel';
import { ChartsPanel } from './components/ChartsPanel';
import { InspectorPanel } from './components/InspectorPanel';

export const App: React.FC = () => {
  const [engine] = useState(() => new SimulationEngine());
  const sceneRef = useRef<GardenScene | null>(null);

  const [config, setConfig] = useState<SimulationConfig>(engine.config);
  const [isRunning, setIsRunning] = useState(engine.isRunning);
  const [simSpeed, setSimSpeed] = useState(engine.simSpeed);
  const [activePresetId, setActivePresetId] = useState<string | null>('balanced');
  const [activeTool, setActiveTool] = useState<InteractiveTool>('inspect');

  const [selectedBlob, setSelectedBlob] = useState<BlobEntity | null>(null);
  const [isTracked, setIsTracked] = useState(false);

  // Synced stats for React UI
  const [stats, setStats] = useState(() => engine.getStats());
  const [history, setHistory] = useState(() => [...engine.history]);

  // Sync loop for React state (10 Hz)
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(engine.getStats());
      setHistory([...engine.history]);

      // Update selected blob reference if active
      if (engine.selectedBlobId) {
        const currentBlob = engine.blobs.get(engine.selectedBlobId);
        if (currentBlob) {
          setSelectedBlob({ ...currentBlob });
        } else {
          setSelectedBlob(null);
          setIsTracked(false);
        }
      } else if (selectedBlob) {
        setSelectedBlob(null);
        setIsTracked(false);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [engine, selectedBlob]);

  // Handle Play/Pause
  const handleTogglePlay = () => {
    engine.isRunning = !engine.isRunning;
    setIsRunning(engine.isRunning);
  };

  // Handle Step Single Tick
  const handleStep = () => {
    if (!engine.isRunning) {
      engine.isRunning = true;
      engine.update(0.1);
      engine.isRunning = false;
      setStats(engine.getStats());
      setHistory([...engine.history]);
    }
  };

  // Handle Speed Change
  const handleSpeedChange = (speed: number) => {
    engine.simSpeed = speed;
    setSimSpeed(speed);
  };

  // Handle Reset
  const handleReset = () => {
    engine.reset();
    setConfig({ ...engine.config });
    if (sceneRef.current) {
      sceneRef.current.syncTrees();
      sceneRef.current.resetCamera();
    }
    setSelectedBlob(null);
    setIsTracked(false);
  };

  // Handle Randomize
  const handleRandomize = () => {
    const newSeed = Math.floor(Math.random() * 100000) + 1;
    engine.reset({ randomSeed: newSeed });
    setConfig({ ...engine.config });
    if (sceneRef.current) {
      sceneRef.current.syncTrees();
    }
    setSelectedBlob(null);
    setIsTracked(false);
  };

  // Handle Preset Select
  const handleSelectPreset = (presetId: string) => {
    const preset = PRESETS.find((p) => p.id === presetId);
    if (!preset) return;

    setActivePresetId(presetId);
    engine.reset(preset.config);
    setConfig({ ...engine.config });
    if (sceneRef.current) {
      sceneRef.current.syncTrees();
    }
    setSelectedBlob(null);
    setIsTracked(false);
  };

  // Handle Config Change from Sliders
  const handleConfigChange = (updated: Partial<SimulationConfig>) => {
    const newConfig = { ...config, ...updated };
    setConfig(newConfig);
    engine.config = newConfig;

    // If tree count or world size changed, sync tree meshes
    if (updated.treeCount !== undefined || updated.worldRadius !== undefined || updated.fruitPerTree !== undefined) {
      engine.reset(newConfig);
      if (sceneRef.current) {
        sceneRef.current.syncTrees();
      }
    }
    setActivePresetId(null);
  };

  // Handle Tool Select
  const handleSelectTool = (tool: InteractiveTool) => {
    engine.activeTool = tool;
    setActiveTool(tool);
    if (tool !== 'inspect') {
      engine.selectedBlobId = null;
      engine.trackedBlobId = null;
      setSelectedBlob(null);
      setIsTracked(false);
    }
  };

  // Handle Blob Select
  const handleSelectBlob = (blob: BlobEntity | null) => {
    setSelectedBlob(blob ? { ...blob } : null);
    setIsTracked(false);
  };

  // Handle Camera Follow Toggle
  const handleToggleTrack = () => {
    if (!selectedBlob) return;
    if (isTracked) {
      engine.trackedBlobId = null;
      setIsTracked(false);
    } else {
      engine.trackedBlobId = selectedBlob.id;
      setIsTracked(true);
    }
  };

  // Handle Feed Selected Blob
  const handleFeedBlob = () => {
    if (!selectedBlob) return;
    engine.feedBlob(selectedBlob.id);
  };

  // Handle Poke Selected Blob
  const handlePokeBlob = () => {
    if (!selectedBlob) return;
    engine.pokeBlob(selectedBlob.id);
  };

  // Handle Reset Camera
  const handleResetCamera = () => {
    if (sceneRef.current) {
      sceneRef.current.resetCamera();
    }
    setIsTracked(false);
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-950 font-sans">
      {/* Top Header Navigation */}
      <TopHeader
        engine={engine}
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

      {/* Main Tabletop Viewport + Overlays */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* 3D Living Garden Canvas */}
        <GardenCanvas
          engine={engine}
          activeTool={activeTool}
          onSelectTool={handleSelectTool}
          onSelectBlob={handleSelectBlob}
          sceneRef={sceneRef}
        />

        {/* Floating Tuning Panel (Left) */}
        <div className="absolute top-4 left-4 mt-14 z-20 pointer-events-auto">
          <ControlPanel
            config={config}
            onConfigChange={handleConfigChange}
            onSelectPreset={handleSelectPreset}
            activePresetId={activePresetId}
          />
        </div>

        {/* Floating Analytics & Story Panel (Right) */}
        <div className="absolute top-4 right-4 z-20 pointer-events-auto flex flex-col items-end gap-3">
          <ChartsPanel history={history} />
        </div>

        {/* Floating Inspector Panel (When Blob Clicked) */}
        {selectedBlob && (
          <InspectorPanel
            blob={selectedBlob}
            isTracked={isTracked}
            onToggleTrack={handleToggleTrack}
            onFeed={handleFeedBlob}
            onPoke={handlePokeBlob}
            onClose={() => {
              engine.selectedBlobId = null;
              engine.trackedBlobId = null;
              setSelectedBlob(null);
              setIsTracked(false);
            }}
          />
        )}
      </div>
    </div>
  );
};
