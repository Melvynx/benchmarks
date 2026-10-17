import React from 'react';
import { Volume2, VolumeX, Sparkles, Compass } from 'lucide-react';
import { ATMOSPHERES, AtmosphereId, AtmosphereTheme } from '../data/elysianWorld';

interface SurrealHeaderProps {
  activeAtmosphere: AtmosphereTheme;
  onSelectAtmosphere: (id: AtmosphereId) => void;
  isSoundOn: boolean;
  onToggleSound: () => void;
  collectedCount: number;
  cursorCoords: { x: number; y: number };
}

export const SurrealHeader: React.FC<SurrealHeaderProps> = ({
  activeAtmosphere,
  onSelectAtmosphere,
  isSoundOn,
  onToggleSound,
  collectedCount,
  cursorCoords,
}) => {
  // Convert normalized cursor to pseudo-astronomical coordinates
  const raHours = Math.floor(12 + cursorCoords.x * 11);
  const raMins = Math.floor((cursorCoords.x * 60) % 60)
    .toString()
    .padStart(2, '0');
  const decDeg = Math.floor(22 + cursorCoords.y * 26);
  const decSec = Math.floor((cursorCoords.y * 60) % 60)
    .toString()
    .padStart(2, '0');

  return (
    <header className="surreal-header" role="banner">
      <div className="header-inner">
        {/* Left: Maison Seal */}
        <a href="#top" className="maison-brand" aria-label="Elysian Maison Home">
          <span className="maison-emblem" aria-hidden="true">
            <svg viewBox="0 0 36 36" fill="none">
              <circle cx="18" cy="18" r="16.5" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
              <path
                d="M18 4 C24 12 24 24 18 32 C12 24 12 12 18 4 Z"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <circle cx="18" cy="18" r="3" fill="currentColor" />
            </svg>
          </span>
          <div className="maison-brand-text">
            <span className="maison-name">ELYSIAN</span>
            <span className="maison-sub">MAISON D’ALCHIMIE · MMXXVI</span>
          </div>
        </a>

        {/* Center: Archival Chapter Index */}
        <nav className="archival-nav" aria-label="Archival Chapters">
          <a href="#wunderkammer" className="nav-chapter">
            <span className="chapter-roman">I</span>
            <span className="chapter-label">Portail</span>
          </a>
          <a href="#dissection" className="nav-chapter">
            <span className="chapter-roman">II</span>
            <span className="chapter-label">Anatomie</span>
          </a>
          <a href="#triptych" className="nav-chapter">
            <span className="chapter-roman">III</span>
            <span className="chapter-label">Prisme</span>
          </a>
          <a href="#atelier" className="nav-chapter">
            <span className="chapter-roman">IV</span>
            <span className="chapter-label">Alchimie</span>
          </a>
          <a href="#naos" className="nav-chapter">
            <span className="chapter-roman">V</span>
            <span className="chapter-label">Naos</span>
          </a>
        </nav>

        {/* Right: Astrolabe Telemetry + Atmosphere Dial + Sound */}
        <div className="header-instruments">
          <div className="telemetry-pill" title="Live Ocular Astrolabe Coordinates">
            <Compass size={13} className="telemetry-icon" />
            <span>
              RA {raHours}h{raMins}m · {decDeg}°{decSec}′N
            </span>
          </div>

          <div className="atmosphere-switcher" role="group" aria-label="Atmospheric Palette">
            {ATMOSPHERES.map((atm) => {
              const isActive = atm.id === activeAtmosphere.id;
              return (
                <button
                  key={atm.id}
                  type="button"
                  onClick={() => onSelectAtmosphere(atm.id)}
                  className={`atm-dot-btn ${isActive ? 'active' : ''}`}
                  title={`Atmosphere ${atm.roman}: ${atm.name}`}
                  aria-label={`Atmosphere ${atm.roman}: ${atm.name}`}
                  aria-pressed={isActive}
                >
                  <span
                    className="atm-swatch"
                    style={{
                      background: `linear-gradient(135deg, ${atm.accentGold}, ${atm.accentCoral})`,
                    }}
                  />
                  <span className="atm-roman">{atm.roman}</span>
                </button>
              );
            })}
          </div>

          <a href="#naos" className="relic-counter-pill" title="Excavated Relics in Your Monograph">
            <Sparkles size={13} />
            <span>{collectedCount}/6 Reliques</span>
          </a>

          <button
            type="button"
            onClick={onToggleSound}
            className={`sound-toggle-btn ${isSoundOn ? 'active' : ''}`}
            aria-label={isSoundOn ? 'Mute Harmonic Resonance' : 'Activate Harmonic Resonance'}
            title={isSoundOn ? 'Harmonic Resonance Active' : 'Enable Pythagorean Soundscape'}
          >
            {isSoundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span className="sound-label">{isSoundOn ? 'Onde' : 'Silence'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
