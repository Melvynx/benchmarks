import React, { useEffect, useRef, useState } from 'react';
import {
  Dices,
  FastForward,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Sprout,
} from 'lucide-react';
import { BlobInspector } from './components/BlobInspector.tsx';
import { ChartsPanel } from './components/ChartsPanel.tsx';
import { ControlsPanel } from './components/ControlsPanel.tsx';
import { GardenCanvas } from './components/GardenCanvas.tsx';
import { GardenSimulation } from './simulation/engine.ts';
import { createRandomizedConfig, PRESETS } from './simulation/presets.ts';
import type { PresetId, SimConfig } from './simulation/types.ts';

export const App: React.FC = () => {
  const [activePreset, setActivePreset] = useState<PresetId>('balanced');
  const [config, setConfig] = useState<SimConfig>(() => ({
    ...PRESETS.balanced.config,
  }));
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [selectedBlobId, setSelectedBlobId] = useState<number | null>(null);
  const [renderTick, setRenderTick] = useState<number>(0);

  const simRef = useRef<GardenSimulation | null>(null);
  if (!simRef.current) {
    simRef.current = new GardenSimulation(config);
    // Select an initial blue blob so the inspector immediately showcases live blob details
    if (simRef.current.blobs.length > 0) {
      selectedBlobId === null &&
        setSelectedBlobId(simRef.current.blobs[0].id);
    }
  }
  const sim = simRef.current;

  useEffect(() => {
    document.title = 'Gemini 4 Argon';
  }, []);

  // Main simulation loop
  useEffect(() => {
    if (!isPlaying) return;

    let animId = 0;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const elapsedSec = Math.min(0.08, (now - lastTime) / 1000);
      lastTime = now;

      const speed = sim.config.simSpeed;
      const totalSimDt = elapsedSec * speed;
      // Substep at fixed max 1/30s for crisp, consistent physics even at 4x-6x speed
      const substeps = Math.max(1, Math.min(10, Math.ceil(totalSimDt / 0.03)));
      const subDt = totalSimDt / substeps;

      for (let i = 0; i < substeps; i++) {
        sim.step(subDt);
      }

      setRenderTick((t) => (t + 1) % 1000000);
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, sim]);

  const handleSelectPreset = (presetId: Exclude<PresetId, 'custom'>) => {
    const presetConfig: SimConfig = {
      ...PRESETS[presetId].config,
      simSpeed: config.simSpeed,
    };
    setActivePreset(presetId);
    setConfig(presetConfig);
    sim.reset(presetConfig);
    setSelectedBlobId(sim.blobs[0]?.id ?? null);
    setRenderTick((t) => t + 1);
  };

  const handleUpdateConfig = (
    partial: Partial<SimConfig>,
    rebuildWorld: boolean = false
  ) => {
    const nextConfig = { ...config, ...partial };
    setConfig(nextConfig);
    if (!('simSpeed' in partial && Object.keys(partial).length === 1)) {
      setActivePreset('custom');
    }

    if (rebuildWorld) {
      sim.reset(nextConfig);
      setSelectedBlobId(sim.blobs[0]?.id ?? null);
    } else {
      sim.updateConfigLive(partial);
    }
    setRenderTick((t) => t + 1);
  };

  const handleReset = () => {
    sim.reset(config);
    setSelectedBlobId(sim.blobs[0]?.id ?? null);
    setRenderTick((t) => t + 1);
  };

  const handleRandomize = () => {
    const randomCfg = createRandomizedConfig(config.simSpeed);
    setActivePreset('custom');
    setConfig(randomCfg);
    sim.reset(randomCfg);
    setSelectedBlobId(sim.blobs[0]?.id ?? null);
    setRenderTick((t) => t + 1);
  };

  const handleStep = () => {
    setIsPlaying(false);
    // Advance 0.5 seconds of simulation time in 15 smooth physics substeps
    for (let i = 0; i < 15; i++) {
      sim.step(1 / 30);
    }
    setRenderTick((t) => t + 1);
  };

  const counts = sim.getPopulationCounts();
  const fruitDetails = sim.getFruitCounts();
  const summary = sim.getRunSummary();
  const selectedBlob =
    selectedBlobId !== null
      ? sim.blobs.find((b) => b.id === selectedBlobId) ?? null
      : null;

  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#1F2924] flex flex-col">
      {/* Top Studio Header Bar */}
      <header className="sticky top-0 z-30 bg-[#F6F3EC]/90 backdrop-blur-md border-b border-[#E5DEC9] px-4 py-2.5">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Brand & Primary Visible Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-700 flex items-center justify-center text-white shadow-sm">
              <Sprout className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold tracking-tight text-[#1F2924] leading-none">
                Gemini 4 Argon
              </h1>
              <p className="text-[11px] text-[#5C6B62] font-medium mt-0.5">
                Living Garden Ecology Simulator
              </p>
            </div>
          </div>

          {/* Live Telemetry Counter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-semibold text-emerald-950">
                Fruit:{' '}
                <span className="font-mono font-bold">{counts.fruit}</span>
              </span>
              <span className="text-[10px] font-mono text-emerald-700">
                (+{fruitDetails.growing} budding)
              </span>
            </div>

            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-3 py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <span className="text-xs font-semibold text-blue-950">
                Blue Blobs:{' '}
                <span className="font-mono font-bold">{counts.blue}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
              <span className="text-xs font-semibold text-rose-950">
                Red Blobs:{' '}
                <span className="font-mono font-bold">{counts.red}</span>
              </span>
            </div>

            <div className="hidden sm:flex items-center gap-1.5 bg-white border border-[#E5DEC9] rounded-full px-3 py-1 text-xs font-mono text-[#44524A]">
              <span>t = {sim.time.toFixed(1)}s</span>
            </div>
          </div>

          {/* Transport Controls: Play/Pause, Step, Reset, Randomize, Speed */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsPlaying((p) => !p)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm transition ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Play
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleStep}
              title="Pause and step simulation forward by 0.5s"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#EFEAD8] text-[#1F2924] border border-[#DFD7C4] shadow-sm transition"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Step
            </button>

            <button
              type="button"
              onClick={handleReset}
              title="Reset garden to starting state"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#EFEAD8] text-[#1F2924] border border-[#DFD7C4] shadow-sm transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            <button
              type="button"
              onClick={handleRandomize}
              title="Randomize garden rules and seed"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white hover:bg-[#EFEAD8] text-[#1F2924] border border-[#DFD7C4] shadow-sm transition"
            >
              <Dices className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Randomize</span>
            </button>

            {/* Quick Speed Multiplier Selector */}
            <div className="flex items-center bg-white border border-[#DFD7C4] rounded-xl p-0.5 shadow-sm">
              <FastForward className="w-3.5 h-3.5 text-[#68766E] ml-1.5 mr-1 hidden sm:block" />
              {[1, 2, 4].map((spd) => (
                <button
                  key={spd}
                  type="button"
                  onClick={() => handleUpdateConfig({ simSpeed: spd })}
                  className={`px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition ${
                    config.simSpeed === spd
                      ? 'bg-emerald-600 text-white'
                      : 'text-[#55635B] hover:bg-[#F4F0E6]'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main 3-Column Tabletop Workspace */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Presets & Live Rule Controls */}
        <section className="lg:col-span-3 order-2 lg:order-1">
          <ControlsPanel
            config={config}
            activePreset={activePreset}
            onSelectPreset={handleSelectPreset}
            onUpdateConfig={handleUpdateConfig}
            onRandomize={handleRandomize}
            onReset={handleReset}
          />
        </section>

        {/* Center Column: Interactive 3D Circular Tabletop Garden Dish */}
        <section className="lg:col-span-5 order-1 lg:order-2 flex flex-col gap-3">
          <div className="bg-gradient-to-b from-[#FAF8F3] to-[#EFE9DA] border border-[#E2DAC6] rounded-3xl shadow-md overflow-hidden h-[470px] sm:h-[540px] relative">
            <GardenCanvas
              sim={sim}
              selectedBlobId={selectedBlob?.id ?? null}
              onSelectBlob={(id) => setSelectedBlobId(id)}
              renderTick={renderTick}
            />
          </div>

          {/* Cause & Effect Ecology Loop Explainer Card */}
          <div className="bg-white/90 border border-[#E5DEC9] rounded-2xl p-3.5 shadow-sm">
            <div className="text-xs font-bold text-[#1F2924] mb-2 flex items-center justify-between">
              <span>How the Garden Waves Emerge</span>
              <span className="text-[11px] font-normal text-[#68766E]">
                Seed #{config.seed} • {sim.trees.length} Trees
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-2.5 text-emerald-950">
                <div className="font-bold text-emerald-800 mb-0.5">
                  1. Orchard Growth
                </div>
                Green fruit grows on trees up to the limit. When eaten by a blue
                blob, the branch empties and regrows after a delay.
              </div>
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-2.5 text-blue-950">
                <div className="font-bold text-blue-800 mb-0.5">
                  2. Blue Foragers
                </div>
                Blue blobs burn energy to move, pause to chew ripe fruit, evade
                nearby red blobs, and spend stored energy to copy.
              </div>
              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-2.5 text-rose-950">
                <div className="font-bold text-rose-800 mb-0.5">
                  3. Red Contact Tag
                </div>
                Red blobs seek blue blobs, absorb energy from gentle contact,
                and pause happily—creating natural out-of-phase waves.
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Blob Inspector & Live Population Charts / Story */}
        <section className="lg:col-span-4 order-3 flex flex-col gap-3">
          <BlobInspector
            selectedBlob={selectedBlob}
            allBlobs={sim.blobs}
            config={config}
            onSelectBlob={(id) => setSelectedBlobId(id)}
          />

          <ChartsPanel
            history={sim.history}
            summary={summary}
            storyEvents={sim.storyEvents}
          />
        </section>
      </main>
    </div>
  );
};

export default App;
