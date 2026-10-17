import React, { useState } from 'react';
import { Columns, Disc, BookOpen, Sliders, Sparkles } from 'lucide-react';
import { ELYSIAN_IMAGES } from '../data/elysianWorld';
import { harmonics } from '../utils/harmonicAudio';

type PrismMode = 'louvers' | 'astrolabe' | 'paravent';

const REALM_LIST = [
  {
    key: 'scholarlyLandscape',
    roman: 'ACT II',
    ...ELYSIAN_IMAGES.scholarlyLandscape,
    accent: '#FF646B',
    epoch: 'L’Éruption Érudite · 79 AD / Hors-Temps',
    caption:
      'A marble bust poised atop three golden-bound folios while a coral-pink volcanic plume rises behind the Parthenon plateau.',
  },
  {
    key: 'mountainValley',
    roman: 'ACT III',
    ...ELYSIAN_IMAGES.mountainValley,
    accent: '#FFD026',
    epoch: 'Le Méridien Doré · Midi Éternel',
    caption:
      'Saffron-yellow moss blankets an alpine valley where sculpted alabaster clouds cling to jagged peaks and ice-blue rapids.',
  },
  {
    key: 'goldenTemple',
    roman: 'ACT IV',
    ...ELYSIAN_IMAGES.goldenTemple,
    accent: '#FFB800',
    epoch: 'Minuit Corinthien · Sidus Aureum',
    caption:
      'Six burnished golden columns and a coral frieze guard an open sanctuary doorway that pours directly into the starry abyss.',
  },
  {
    key: 'stillLife',
    roman: 'ACT I',
    ...ELYSIAN_IMAGES.stillLife,
    accent: '#FF7588',
    epoch: 'La Table des Paradoxes · Initium',
    caption:
      'Gilded alpine frames, fluted coral monoliths, and cobalt amphorae gathered upon a nocturnal table of pulverized marble.',
  },
];

export const TriptychMorphStage: React.FC = () => {
  const [mode, setMode] = useState<PrismMode>('louvers');
  const [pendulum, setPendulum] = useState<number>(46); // 0 to 100
  const [activePanelIdx, setActivePanelIdx] = useState<number>(0);

  const handleModeChange = (newMode: PrismMode) => {
    setMode(newMode);
    harmonics.playChime(512, 768, 1.15);
  };

  // Determine dominant realm from pendulum position
  const dominantIndex = Math.min(
    REALM_LIST.length - 1,
    Math.floor((pendulum / 101) * REALM_LIST.length)
  );
  const activeRealm = REALM_LIST[mode === 'paravent' ? activePanelIdx : dominantIndex];

  return (
    <section id="triptych" className="triptych-morph-section" aria-label="Le Prisme des Horizons">
      <div className="section-header-block">
        <div className="section-kicker-row">
          <span className="kicker-num">CHAPITRE III · INSTRUMENT D’OPTIQUE SURRÉALISTE</span>
          <span className="kicker-line" />
          <span className="kicker-coords">4 MONDES · INTERFÉRENCE VISUELLE</span>
        </div>
        <div className="section-title-split">
          <h2 className="section-display-title">Le Prisme des Horizons</h2>
          <p className="section-editorial-deck">
            Do not view the realms in isolation—fracture and interleave them. Switch between{' '}
            <em>Fluted Column Louvers</em>, <em>Concentric Astrolabe Rings</em>, and the{' '}
            <em>Sculptural Paravent</em> while swinging the brass pendulum.
          </p>
        </div>
      </div>

      {/* Instrument Control Deck */}
      <div className="prism-control-bar">
        <div className="prism-mode-tabs" role="tablist" aria-label="Optical Instrument Mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'louvers'}
            className={`prism-tab-btn ${mode === 'louvers' ? 'active' : ''}`}
            onClick={() => handleModeChange('louvers')}
          >
            <Columns size={15} />
            <span>Colonnes Cannelées (Lenticulaire)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'astrolabe'}
            className={`prism-tab-btn ${mode === 'astrolabe' ? 'active' : ''}`}
            onClick={() => handleModeChange('astrolabe')}
          >
            <Disc size={15} />
            <span>Anneaux d’Astrolabe (Mandala)</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'paravent'}
            className={`prism-tab-btn ${mode === 'paravent' ? 'active' : ''}`}
            onClick={() => handleModeChange('paravent')}
          >
            <BookOpen size={15} />
            <span>Paravent d’Arches (Triptyque 3D)</span>
          </button>
        </div>

        <div className="pendulum-scrubber-box">
          <label htmlFor="horizon-pendulum-input" className="pendulum-label">
            <Sliders size={14} />
            <span>Pendule d’Interférence: {pendulum}°</span>
          </label>
          <input
            id="horizon-pendulum-input"
            type="range"
            min={0}
            max={100}
            value={pendulum}
            onChange={(e) => setPendulum(Number(e.target.value))}
            className="brass-range-slider wide"
          />
        </div>
      </div>

      {/* Main Optical Stage */}
      <div className="prism-stage-shell">
        {/* MODE 1: FLUTED COLUMN LOUVERS (12 Interleaving Vertical Slices) */}
        {mode === 'louvers' && (
          <div
            className="louver-colonnade-stage"
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              setPendulum(Math.max(0, Math.min(100, pct)));
            }}
          >
            {Array.from({ length: 12 }).map((_, colIdx) => {
              // Each column alternates between the realms based on pendulum angle
              const phase = (pendulum / 100) * Math.PI * 2 + colIdx * 0.55;
              const realmA = REALM_LIST[colIdx % 3];
              const realmB = REALM_LIST[(colIdx + 1) % 3];
              const mix = (Math.sin(phase) + 1) / 2; // 0..1
              const bgPosX = (colIdx / 11) * 100;

              return (
                <div
                  key={colIdx}
                  className="fluted-louver-slice"
                  style={{
                    transform: `perspective(900px) rotateY(${(mix - 0.5) * 18}deg)`,
                  }}
                >
                  {/* Primary Image Slice */}
                  <div
                    className="louver-layer"
                    style={{
                      backgroundImage: `url(${realmA.url}), url(${realmA.fallback})`,
                      backgroundPosition: `${bgPosX}% 50%`,
                      opacity: 1,
                    }}
                  />
                  {/* Secondary Interleaved Image Slice */}
                  <div
                    className="louver-layer secondary"
                    style={{
                      backgroundImage: `url(${realmB.url}), url(${realmB.fallback})`,
                      backgroundPosition: `${bgPosX}% 50%`,
                      opacity: mix,
                    }}
                  />
                  {/* Fluted Column Specular Highlight */}
                  <div className="fluted-specular-groove" />
                  <span className="louver-roman-index">{colIdx + 1}</span>
                </div>
              );
            })}

            <div className="stage-floating-whisper">
              <Sparkles size={13} />
              <span>Glissez le curseur à travers la colonnade pour entrelacer les mondes</span>
            </div>
          </div>
        )}

        {/* MODE 2: CONCENTRIC ASTROLABE RINGS (4 Counter-Rotating Painting Rings) */}
        {mode === 'astrolabe' && (
          <div
            className="concentric-astrolabe-stage"
            onPointerMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
              setPendulum(Math.max(0, Math.min(100, pct)));
            }}
          >
            {/* Outer Ring 1: Still Life */}
            <div
              className="astrolabe-art-ring ring-1"
              style={{
                backgroundImage: `url(${ELYSIAN_IMAGES.stillLife.url}), url(${ELYSIAN_IMAGES.stillLife.fallback})`,
                transform: `rotate(${(pendulum - 50) * 0.9}deg) scale(1.06)`,
              }}
            />
            {/* Ring 2: Scholarly Landscape */}
            <div
              className="astrolabe-art-ring ring-2"
              style={{
                backgroundImage: `url(${ELYSIAN_IMAGES.scholarlyLandscape.url}), url(${ELYSIAN_IMAGES.scholarlyLandscape.fallback})`,
                transform: `rotate(${(50 - pendulum) * 1.4}deg) scale(1.1)`,
              }}
            />
            {/* Ring 3: Mountain Valley */}
            <div
              className="astrolabe-art-ring ring-3"
              style={{
                backgroundImage: `url(${ELYSIAN_IMAGES.mountainValley.url}), url(${ELYSIAN_IMAGES.mountainValley.fallback})`,
                transform: `rotate(${(pendulum - 50) * 2.1}deg) scale(1.14)`,
              }}
            />
            {/* Core Ring 4: Golden Temple */}
            <div
              className="astrolabe-art-ring ring-4"
              style={{
                backgroundImage: `url(${ELYSIAN_IMAGES.goldenTemple.url}), url(${ELYSIAN_IMAGES.goldenTemple.fallback})`,
                transform: `rotate(${(50 - pendulum) * 0.6}deg) scale(1.12)`,
              }}
            />

            {/* Brass Crosshairs & Degree Marks */}
            <svg className="astrolabe-overlay-reticle" viewBox="0 0 500 500" fill="none">
              <circle cx="250" cy="250" r="236" stroke="var(--accent-gold)" strokeWidth="1" strokeDasharray="3 5" />
              <circle cx="250" cy="250" r="182" stroke="var(--accent-coral)" strokeWidth="1" />
              <circle cx="250" cy="250" r="126" stroke="var(--accent-gold)" strokeWidth="1" strokeDasharray="2 4" />
              <circle cx="250" cy="250" r="70" stroke="var(--accent-gold)" strokeWidth="1.2" />
              <line x1="250" y1="10" x2="250" y2="490" stroke="var(--accent-gold)" strokeWidth="0.6" opacity="0.45" />
              <line x1="10" y1="250" x2="490" y2="250" stroke="var(--accent-gold)" strokeWidth="0.6" opacity="0.45" />
            </svg>

            <div className="stage-floating-whisper">
              <Sparkles size={13} />
              <span>Quatre anneaux concentriques tournent en opposition selon l’angle ({pendulum}°)</span>
            </div>
          </div>
        )}

        {/* MODE 3: SCULPTURAL PARAVENT (4 Hinged Arched Sanctuary Panels) */}
        {mode === 'paravent' && (
          <div className="paravent-folding-stage">
            {REALM_LIST.map((realm, idx) => {
              const isExpanded = activePanelIdx === idx;
              const tiltAngle =
                idx % 2 === 0
                  ? (50 - pendulum) * 0.22
                  : (pendulum - 50) * 0.22;

              return (
                <article
                  key={realm.key}
                  onClick={() => {
                    setActivePanelIdx(idx);
                    harmonics.playChime(440 + idx * 90, 660 + idx * 90, 1.2);
                  }}
                  className={`paravent-arch-panel ${isExpanded ? 'expanded' : ''}`}
                  style={{
                    transform: `perspective(1200px) rotateY(${isExpanded ? 0 : tiltAngle}deg)`,
                  }}
                >
                  <div className="paravent-arch-mask">
                    <img
                      src={realm.url}
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (target.src !== window.location.origin + realm.fallback) {
                          target.src = realm.fallback;
                        }
                      }}
                      alt={realm.title}
                      className="paravent-img"
                    />
                    <div className="paravent-gradient-veil" />
                    <div className="paravent-panel-content">
                      <span className="paravent-roman">{realm.roman}</span>
                      <h3 className="paravent-title">{realm.title}</h3>
                      <p className="paravent-epoch">{realm.epoch}</p>
                      {isExpanded && <p className="paravent-desc">{realm.caption}</p>}
                      <span className="paravent-coords">{realm.coordinates}</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Live Telemetry Readout for the Dominant Horizon */}
      <div className="prism-telemetry-footer">
        <div className="telemetry-realm-summary">
          <span className="summary-badge" style={{ borderColor: activeRealm.accent }}>
            {activeRealm.roman} · HORIZON DOMINANT
          </span>
          <h3 className="summary-title">{activeRealm.title}</h3>
          <span className="summary-epoch">{activeRealm.epoch}</span>
        </div>
        <p className="summary-caption">{activeRealm.caption}</p>
        <div className="summary-coord-block">
          <span className="coord-label">COORDONNÉES D’ARCHIVE</span>
          <span className="coord-value">{activeRealm.coordinates}</span>
        </div>
      </div>
    </section>
  );
};
