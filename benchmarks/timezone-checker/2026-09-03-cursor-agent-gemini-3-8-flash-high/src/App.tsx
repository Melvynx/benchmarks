import React, { useState, useEffect } from 'react'
import { TimezoneProvider } from './context/TimezoneContext'
import { Header } from './components/Header'
import { SettingsPanel } from './components/SettingsPanel'
import { OverlapSummary } from './components/OverlapSummary'
import { ScheduleGrid } from './components/ScheduleGrid'

export const AppContent: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  useEffect(() => {
    document.title = 'Gemini 3.8 Flash'
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-ink-950 text-ink-100">
      <Header
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen((prev) => !prev)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        <OverlapSummary />

        <ScheduleGrid />
      </main>

      <footer className="border-t border-ink-900 bg-ink-950/80 py-4 text-center text-xs text-ink-500">
        <p>Live UTC calculations with automatic DST handling • 34 predefined world cities</p>
      </footer>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <TimezoneProvider>
      <AppContent />
    </TimezoneProvider>
  )
}

export default App
