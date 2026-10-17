import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Check, Plus, Sparkles, Compass } from 'lucide-react';
import { ELYSIAN_IMAGES, STILL_LIFE_SPECIMENS, SpecimenRelic } from '../data/elysianWorld';
import { getClipPathByShape } from './ClassicalOrnamentation';
import { harmonics } from '../utils/harmonicAudio';

interface CabinetDissectionProps {
  collectedIds: string[];
  onToggleCollect: (id: string) => void;
}

export const CabinetDissection: React.FC<CabinetDissectionProps> = ({
  collectedIds,
  onToggleCollect,
}) => {
  const [activeRelic, setActiveRelic] = useState<SpecimenRelic>(STILL_LIFE_SPECIMENS[0]);
  const [isDeepZoom, setIsDeepZoom] = useState<boolean>(false);

  const handleSelectRelic = (relic: SpecimenRelic, idx: number) => {
    setActiveRelic(relic);
    harmonics.playChime(460 + idx * 55, 690 + idx * 55, 1.1);
  };

  const isCollected = collectedIds.includes(activeRelic.id);

  // Calculate camera pan transform when Deep Zoom is enabled
  const panX = isDeepZoom ? (50 - activeRelic.xPercent) * 1.35 : 0;
  const panY = isDeepZoom ? (50 - activeRelic.yPercent) * 1.35 : 0;
  const scaleVal = isDeepZoom ? 2.15 : 1.03;

  return (
    <section id="dissection" className="cabinet-dissection-section" aria-label="Anatomie du Cabinet">
      <div className="section-header-block">
        <div className="section-kicker-row">
          <span className="kicker-num">CHAPITRE II · EXCAVATION ARCHÉOLOGIQUE</span>
          <span className="kicker-line" />
          <span className="kicker-coords">{ELYSIAN_IMAGES.stillLife.catalogId}</span>
        </div>
        <div className="section-title-split">
          <h2 className="section-display-title">L’Anatomie du Paradoxe</h2>
          <p className="section-editorial-deck">
            Six artifacts excavated from a single hallucinated table. Select any coordinate pin on
            the canvas—or its carved medallion below—to isolate the fragment, inspect its pigment
            alchemy, and seal it into your personal monograph.
          </p>
        </div>
      </div>

      <div className="dissection-workbench">
        {/* Left: Sculpted Wunderkammer Canvas + Constellation Overlay + Medallion Strip */}
        <div className="dissection-canvas-column">
          <div className="wunderkammer-frame-wrapper">
            {/* Top Instrument Bar over Canvas */}
            <div className="canvas-hud-bar">
              <div className="hud-tag">
                <Compass size={13} />
                <span>
                  FOCUS: N° {activeRelic.number} · {activeRelic.title.toUpperCase()} (
                  {activeRelic.xPercent}% X, {activeRelic.yPercent}% Y)
                </span>
              </div>
              <button
                type="button"
                className={`hud-zoom-btn ${isDeepZoom ? 'active' : ''}`}
                onClick={() => {
                  setIsDeepZoom((prev) => !prev);
                  harmonics.playChime(620, 930, 0.9);
                }}
              >
                {isDeepZoom ? <ZoomOut size={14} /> : <ZoomIn size={14} />}
                <span>{isDeepZoom ? 'Vue Panoramique (1.0×)' : 'Plongée Oculaire (2.2×)'}</span>
              </button>
            </div>

            {/* Non-Rectangular Octagonal/Pediment Stage */}
            <div className="wunderkammer-clipped-stage">
              <div
                className="wunderkammer-pan-layer"
                style={{
                  transform: `scale(${scaleVal}) translate(${panX}%, ${panY}%)`,
                }}
              >
                <img
                  src={ELYSIAN_IMAGES.stillLife.url}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + ELYSIAN_IMAGES.stillLife.fallback) {
                      target.src = ELYSIAN_IMAGES.stillLife.fallback;
                    }
                  }}
                  alt="Le Cabinet du Paradoxe — Surrealist Still Life"
                  className="wunderkammer-master-img"
                />

                {/* SVG Constellation Lines Connecting All 6 Relics */}
                <svg
                  className="constellation-svg-overlay"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <polyline
                    points={STILL_LIFE_SPECIMENS.map((s) => `${s.xPercent},${s.yPercent}`).join(' ')}
                    fill="none"
                    stroke="var(--accent-gold)"
                    strokeWidth="0.28"
                    strokeDasharray="1.2 1.2"
                    opacity="0.7"
                  />
                  {/* Highlight circle around active specimen */}
                  <circle
                    cx={activeRelic.xPercent}
                    cy={activeRelic.yPercent}
                    r="6.5"
                    fill="none"
                    stroke="var(--accent-coral)"
                    strokeWidth="0.35"
                    strokeDasharray="1.5 1"
                  />
                </svg>

                {/* 6 Interactive Relic Coordinate Pins */}
                {STILL_LIFE_SPECIMENS.map((spec, index) => {
                  const isActive = spec.id === activeRelic.id;
                  const isSaved = collectedIds.includes(spec.id);
                  return (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => handleSelectRelic(spec, index)}
                      className={`specimen-pin ${isActive ? 'active' : ''} ${
                        isSaved ? 'collected' : ''
                      }`}
                      style={{
                        left: `${spec.xPercent}%`,
                        top: `${spec.yPercent}%`,
                      }}
                      aria-label={`Inspect Specimen ${spec.number}: ${spec.title}`}
                    >
                      <span className="pin-pulse-ring" />
                      <span className="pin-core">{spec.number}</span>
                      <span className="pin-floating-label">{spec.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Extracted Cut-Out Medallion Strip (6 Cropped Non-Rectangular Silhouettes) */}
          <div className="extracted-medallions-strip" role="tablist" aria-label="Specimen Cut-Outs">
            {STILL_LIFE_SPECIMENS.map((spec, idx) => {
              const isActive = spec.id === activeRelic.id;
              const isSaved = collectedIds.includes(spec.id);
              return (
                <button
                  key={spec.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelectRelic(spec, idx)}
                  className={`medallion-cutout-card ${isActive ? 'active' : ''}`}
                >
                  <div className="medallion-shape-frame">
                    <div
                      className="medallion-cropped-art"
                      style={{
                        clipPath: getClipPathByShape(spec.maskShape),
                        backgroundImage: `url(${ELYSIAN_IMAGES.stillLife.url}), url(${ELYSIAN_IMAGES.stillLife.fallback})`,
                        backgroundPosition: `${spec.cropX}% ${spec.cropY}%`,
                        backgroundSize: `${spec.cropScale}%`,
                      }}
                    />
                    {isSaved && (
                      <span className="medallion-saved-badge" title="Collected in Monograph">
                        ✦
                      </span>
                    )}
                  </div>
                  <span className="medallion-num">N° {spec.number}</span>
                  <span className="medallion-name">{spec.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Curatorial Specimen Dossier Card */}
        <aside className="specimen-dossier-panel" aria-live="polite">
          <div className="dossier-top-meta">
            <span className="dossier-number">SPECIMEN N° {activeRelic.number} / 06</span>
            <span className="dossier-category">{activeRelic.category}</span>
          </div>

          {/* Sculpted High-Res Magnified Relic Aperture */}
          <div className="dossier-magnifier-stage">
            <div
              className="dossier-sculpted-crop"
              style={{
                clipPath: getClipPathByShape(activeRelic.maskShape),
                backgroundImage: `url(${ELYSIAN_IMAGES.stillLife.url}), url(${ELYSIAN_IMAGES.stillLife.fallback})`,
                backgroundPosition: `${activeRelic.cropX}% ${activeRelic.cropY}%`,
                backgroundSize: `${activeRelic.cropScale}%`,
              }}
            />
            <div className="dossier-crop-ring" aria-hidden="true" />
            <div className="dossier-coord-stamp">
              LAT {activeRelic.xPercent}° · LON {activeRelic.yPercent}° · MAG 3.4×
            </div>
          </div>

          <div className="dossier-heading-group">
            <p className="dossier-latin">{activeRelic.latinName}</p>
            <h3 className="dossier-title">{activeRelic.title}</h3>
          </div>

          <blockquote className="dossier-epigraph">{activeRelic.epigraph}</blockquote>

          <p className="dossier-curator-note">{activeRelic.curatorNote}</p>

          {/* Olfactory Accords */}
          <div className="dossier-meta-block">
            <span className="meta-block-label">ACCORDS OLFACTIFS &amp; MATIÈRES</span>
            <div className="accord-chips">
              {activeRelic.olfactoryNotes.map((note) => (
                <span key={note} className="accord-chip">
                  <Sparkles size={11} />
                  {note}
                </span>
              ))}
            </div>
          </div>

          {/* Extracted Pigments */}
          <div className="dossier-meta-block">
            <span className="meta-block-label">SPECTRE PIGMENTAIRE EXTRAIT</span>
            <div className="pigment-swatches-row">
              {activeRelic.pigments.map((pigment) => (
                <div key={pigment.hex} className="pigment-chip">
                  <span className="pigment-dot" style={{ backgroundColor: pigment.hex }} />
                  <div className="pigment-info">
                    <span className="pigment-name">{pigment.name}</span>
                    <span className="pigment-hex">{pigment.hex}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Collect Specimen Action */}
          <button
            type="button"
            onClick={() => {
              onToggleCollect(activeRelic.id);
              harmonics.playChime(isCollected ? 392 : 659.25, isCollected ? 587 : 987.77, 1.3);
            }}
            className={`btn-collect-specimen ${isCollected ? 'collected' : ''}`}
          >
            {isCollected ? (
              <>
                <Check size={16} />
                <span>Scellé dans votre Monographe ({collectedIds.length}/6)</span>
              </>
            ) : (
              <>
                <Plus size={16} />
                <span>Prélever ce Spécimen ({collectedIds.length}/6)</span>
              </>
            )}
          </button>
        </aside>
      </div>
    </section>
  );
};
