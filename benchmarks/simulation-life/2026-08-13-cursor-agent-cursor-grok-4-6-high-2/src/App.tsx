import { useSyncExternalStore } from 'react'
import { Charts, Inspector } from './components/Charts'
import { Controls } from './components/Controls'
import { Garden } from './components/Garden'
import { Engine } from './sim/engine'
import { PRESETS } from './sim/params'
import './App.css'

const engine = new Engine(PRESETS[0]!.params)

export default function App() {
  useSyncExternalStore(engine.subscribe, engine.getSnapshot)
  const c = engine.world.counts
  return (
    <div className="app">
      <header className="mast">
        <h1>Cursor Grok 4.6</h1>
        <p className="live">
          <span className="dot fruit" /> {c.fruit} fruit
          <span className="dot blue" /> {c.blue} blue
          <span className="dot red" /> {c.red} red
          <span className="clock">{engine.world.t.toFixed(0)}s</span>
        </p>
      </header>
      <main>
        <div className="stage">
          <Garden engine={engine} />
          <Inspector engine={engine} />
        </div>
        <Controls engine={engine} />
      </main>
      <Charts engine={engine} />
    </div>
  )
}
