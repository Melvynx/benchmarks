import React, { useState, useEffect } from 'react';
import { TimezoneProvider } from './context/TimezoneContext';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { SettingsPanel } from './components/SettingsPanel';
import { OverlapSummary } from './components/OverlapSummary';
import { DesktopGrid } from './components/DesktopGrid';
import { MobileGrid } from './components/MobileGrid';
import { LegendAndHints } from './components/LegendAndHints';

const TimezoneCheckerApp: React.FC = () => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    document.title = 'Gemini 3.7 Flash';
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navbar */}
      <Header
        isSettingsOpen={isSettingsOpen}
        onOpenSettings={() => setIsSettingsOpen(!isSettingsOpen)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Availability Settings Panel (Collapsible) */}
        <SettingsPanel
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />

        {/* Controls & Quick Actions */}
        <ControlsBar onOpenSettings={() => setIsSettingsOpen(true)} />

        {/* Overlap Summary Window */}
        <OverlapSummary />

        {/* 24-Column Visualization Grids (Responsive separation) */}
        <DesktopGrid />
        <MobileGrid />

        {/* Legend, Hints & Footer Info */}
        <LegendAndHints />
      </main>

      {/* Subtle Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/60 py-4 text-center text-xs text-slate-400">
        <span>Timezone Overlap Checker &bull; Live UTC calculations with automatic DST handling</span>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <TimezoneProvider>
      <TimezoneCheckerApp />
    </TimezoneProvider>
  );
}
