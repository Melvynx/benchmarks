import React, { useEffect, useRef, useState } from 'react'
import { FastForward, Sprout } from 'lucide-react'
import { GardenSimulation } from './sim/engine'
import { DEFAULT_CONFIG, PRESETS } from './sim/presets'
import { PresetDefinition, SimConfig } from './sim/types'
import { GardenDishCanvas } from './components/GardenDishCanvas'
import { ChartsPanel } from './components/ChartsPanel'
import { BlobInspector } from './components/BlobInspector'
import { ControlsPanel } from './components/ControlsPanel'

export function App() {
  const [config, setConfig] = useState<SimConfig>(() => ({ ...DEFAULT_CONFIG }))
  const [activePresetId, setActivePresetId] = useState<string>('balanced')
  const [isRunning, setIsRunning] = useState<boolean>(true)
  const [simSpeed, setSimSpeed] = useState<number>(1)
  const [selectedBlobId, setSelectedBlobId] = useState<string | null>(null)
  const [showVisionRings, setShowVisionRings] = useState<boolean>(false)
  const [tickVersion, setTickVersion] = useState<number>(0)

  const simRef = useRef<GardenSimulation | null>(null)
  if (!simRef.current) {
    const initialSim = new GardenSimulation(DEFAULT_CONFIG)
    // Pre-warm 12 seconds so the chart already shows an initial living wave at startup
    for (let i = 0; i < 240; i++) {
      initialSim.step(0.05)
    }
    simRef.current = initialSim
  }
  const sim = simRef.current

  useEffect(() => {
    document.title = 'Gemini 4 Argon'
  }, [])

  useEffect(() => {
    if (!isRunning) return

    let frameId = 0
    let lastTime = performance.now()

    const loop = (now: number) => {
      const elapsedSec = Math.min(0.08, (now - lastTime) / 1000)
      lastTime = now

      const totalSimDelta = elapsedSec * simSpeed
      const subSteps = Math.max(1, Math.ceil(totalSimDelta / 0.035))
      const stepDt = totalSimDelta / subSteps

      for (let i = 0; i < subSteps; i++) {
        sim.step(stepDt)
      }

      setTickVersion((v) => (v + 1) % 1000000)
      frameId = requestAnimationFrame(loop)
    }

    frameId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frameId)
  }, [isRunning, simSpeed, sim])

  const handleStep = () => {
    for (let i = 0; i < 10; i++) {
      sim.step(0.05)
    }
    setTickVersion((v) => v + 1)
  }

  const handleFastForward30s = () => {
    for (let i = 0; i < 600; i++) {
      sim.step(0.05)
    }
    setTickVersion((v) => v + 1)
  }

  const handleReset = () => {
    sim.reset(config)
    setSelectedBlobId(null)
    setTickVersion((v) => v + 1)
  }

  const handleSelectPreset = (preset: PresetDefinition) => {
    setActivePresetId(preset.id)
    setConfig({ ...preset.config })
    sim.reset(preset.config)
    // Pre-warm 8 seconds so preset signature immediately begins showing on the chart
    for (let i = 0; i < 160; i++) {
      sim.step(0.05)
    }
    setSelectedBlobId(null)
    setTickVersion((v) => v + 1)
  }

  const handleRandomize = () => {
    const randomSeed = Math.floor(1000 + Math.random() * 9000)
    const nextConfig: SimConfig = {
      ...config,
      fruitGrowthSpeed: Number((0.6 + Math.random() * 1.8).toFixed(2)),
      fruitLimit: Math.round(24 + Math.random() * 76),
      fruitReturnDelay: Number((2.5 + Math.random() * 7.5).toFixed(1)),
      blueSpeed: Math.round(32 + Math.random() * 26),
      blueVision: Math.round(70 + Math.random() * 55),
      redSpeed: Math.round(36 + Math.random() * 28),
      redVision: Math.round(80 + Math.random() * 60),
      startingTrees: Math.round(7 + Math.random() * 11),
      startingBlue: Math.round(12 + Math.random() * 16),
      startingRed: Math.round(4 + Math.random() * 10),
      seed: randomSeed,
    }
    setActivePresetId('custom')
    setConfig(nextConfig)
    sim.reset(nextConfig)
    setSelectedBlobId(null)
    setTickVersion((v) => v + 1)
  }

  const handleChangeConfig = (partial: Partial<SimConfig>, requiresReset = false) => {
    const updated = { ...config, ...partial }
    setConfig(updated)
    setActivePresetId('custom')
    if (requiresReset) {
      sim.reset(updated)
    } else {
      sim.updateConfigLive(partial)
    }
    setTickVersion((v) => v + 1)
  }

  const handlePickSampleBlob = (species?: 'blue' | 'red') => {
    const pool = species ? sim.blobs.filter((b) => b.species === species) : sim.blobs
    if (pool.length > 0) {
      const chosen = pool[Math.floor(Math.random() * pool.length)]
      setSelectedBlobId(chosen.id)
    }
  }

  const selectedBlob = sim.blobs.find((b) => b.id === selectedBlobId) ?? null
  const blueCount = sim.blobs.filter((b) => b.species === 'blue').length
  const redCount = sim.blobs.filter((b) => b.species === 'red').length
  const ripeFruitCount = sim.getRipeFruitCount()
  const regrowingCount = sim.getRegrowingFruitCount()
  const summary = sim.getSummary()

  return (
    <div className="min-h-screen bg-[#0b110e] text-[#f2f5f0] flex flex-col">
      {/* Top Header Bar */}
      <header className="border-b border-emerald-950/80 bg-[#0e1612]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 flex items-center justify-center shadow-md shadow-emerald-950/50 text-slate-950">
              <Sprout className="w-5 h-5 stroke-[2.4]" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-tight">
                Gemini 4 Argon
              </h1>
              <p className="text-xs text-emerald-300/75">
                Interactive Tabletop Ecology Dish • Fruit Trees, Blue Foragers & Red Seekers
              </p>
            </div>
          </div>

          {/* Live Counters & Quick +30s Wave Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-3 bg-[#131f1a] border border-emerald-900/70 rounded-xl px-3.5 py-1.5 text-xs font-mono">
              <div className="flex items-center gap-1.5" title="Ripe attached green fruits (+ regrowing buds)">
                <span className="w-2.5 h-2.5 rounded-full bg-lime-400" />
                <span className="text-emerald-100/70">Fruit:</span>
                <span className="font-bold text-lime-300">{ripeFruitCount}</span>
                <span className="text-[10px] text-emerald-400/60">(+{regrowingCount} buds)</span>
              </div>
              <span className="text-emerald-800">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-emerald-100/70">Blue:</span>
                <span className="font-bold text-sky-300">{blueCount}</span>
              </div>
              <span className="text-emerald-800">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-emerald-100/70">Red:</span>
                <span className="font-bold text-rose-300">{redCount}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFastForward30s}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-xs font-semibold text-emerald-200 transition-colors"
              title="Simulate 30 seconds instantly to observe ecological waves"
            >
              <FastForward className="w-3.5 h-3.5 text-emerald-300" />
              <span>+30s Wave Jump</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main 12-Col Bento Workspace */}
      <main className="max-w-[1600px] w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        {/* Left/Center Column: 3D Circular Garden Dish + Charts (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="h-[460px] sm:h-[510px] w-full">
            <GardenDishCanvas
              sim={sim}
              selectedBlobId={selectedBlob?.id ?? null}
              onSelectBlob={setSelectedBlobId}
              showVisionRings={showVisionRings}
              onToggleVisionRings={() => setShowVisionRings((v) => !v)}
              tickVersion={tickVersion}
            />
          </div>

          <ChartsPanel history={sim.history} summary={summary} />
        </div>

        {/* Right Column: Blob Inspector + Live Toy Controls (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <BlobInspector
            blob={selectedBlob}
            config={config}
            onClear={() => setSelectedBlobId(null)}
            onPickSampleBlob={handlePickSampleBlob}
          />

          <ControlsPanel
            config={config}
            activePresetId={activePresetId}
            isRunning={isRunning}
            simSpeed={simSpeed}
            onTogglePlay={() => setIsRunning((r) => !r)}
            onStep={handleStep}
            onReset={handleReset}
            onRandomize={handleRandomize}
            onSelectPreset={handleSelectPreset}
            onChangeConfig={handleChangeConfig}
            onChangeSimSpeed={setSimSpeed}
          />
        </div>
      </main>
    </div>
  )
}
