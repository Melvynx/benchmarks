import React, { useState } from 'react';
import { Sparkles, Stamp, RotateCcw, Flame } from 'lucide-react';
import { ELYSIAN_IMAGES, MAISON_EDITIONS, MaisonEdition } from '../data/elysianWorld';
import { getClipPathByShape } from './ClassicalOrnamentation';
import { harmonics } from '../utils/harmonicAudio';

interface BlendWeights {
  stillLife: number;
  scholarly: number;
  valley: number;
  temple: number;
}

export const AlchemyComposer: React.FC = () => {
  const [selectedEdition, setSelectedEdition] = useState<MaisonEdition>(MAISON_EDITIONS[0]);
  const [weights, setWeights] = useState<BlendWeights>({
    stillLife: 78,
    scholarly: 54,
    valley: 42,
    temple: 86,
  });
  const [isWaxSealed, setIsWaxSealed] = useState<boolean>(false);

  const handleSelectEdition = (ed: MaisonEdition, index: number) => {
    setSelectedEdition(ed);
    setIsWaxSealed(false);
    harmonics.playChime(480 + index * 70, 720 + index * 70, 1.2);
    // Load preset weights inspired by edition
    if (index === 0) setWeights({ stillLife: 92, scholarly: 45, valley: 30, temple: 65 });
    if (index === 1) setWeights({ stillLife: 55, scholarly: 95, valley: 38, temple: 48 });
    if (index === 2) setWeights({ stillLife: 35, scholarly: 50, valley: 96, temple: 60 });
    if (index === 3) setWeights({ stillLife: 60, scholarly: 42, valley: 52, temple: 98 });
  };

  const totalScore = weights.stillLife + weights.scholarly + weights.valley + weights.temple || 1;
  const pctStill = Math.round((weights.stillLife / totalScore) * 100);
  const pctScholar = Math.round((weights.scholarly / totalScore) * 100);
  const pctValley = Math.round((weights.valley / totalScore) * 100);
  const pctTemple = Math.max(0, 100 - pctStill - pctScholar - pctValley);

  // Derive bespoke Latin formula name from dominant weights
  const getFormulaName = () => {
    const max = Math.max(weights.stillLife, weights.scholarly, weights.valley, weights.temple);
    if (max === weights.temple) return 'ELIXIR SIDEREUS · AURUM NOCTIS';
    if (max === weights.scholarly) return 'TINCTURA VESUVIANA · IGNIS ROSEUS';
    if (max === weights.valley) return 'ESSENTIA ARCADIAE · VALLIS CROCEA';
    return 'QUINTESSENTIA PARIA · MARMOR VIVUM';
  };

  const formulaCode = `ELY-${weights.stillLife}${weights.scholarly}-${weights.valley}${weights.temple}`;

  return (
    <section id="atelier" className="alchemy-composer-section" aria-label="Atelier de Transmutation">
      <div className="section-header-block">
        <div className="section-kicker-row">
          <span className="kicker-num">CHAPITRE IV · HAUTE CONFISERIE OLFACTIVE &amp; OBJETS</span>
          <span className="kicker-line" />
          <span className="kicker-coords">ÉDITIONS NUMÉROTÉES I — IV</span>
        </div>
        <div className="section-title-split">
          <h2 className="section-display-title">Les Quatre Reliquaires d’Elysian</h2>
          <p className="section-editorial-deck">
            Each Maison edition is a physical distillation of one impossible landscape—sculpted from
            Parian stone, volcanic ash, alpine saffron, and nocturnal gold. Select a reliquary or
            transmute your own proportion in the alembic below.
          </p>
        </div>
      </div>

      {/* 4 Sculptural Assemblage Edition Totems */}
      <div className="editions-totem-grid">
        {MAISON_EDITIONS.map((edition, idx) => {
          const isSelected = selectedEdition.id === edition.id;
          const shapeMap: Record<MaisonEdition['silhouette'], 'chalice' | 'pediment' | 'vesica' | 'arch'> = {
            amphora: 'chalice',
            codex: 'pediment',
            chalice: 'vesica',
            portal: 'arch',
          };
          const primaryClip = getClipPathByShape(shapeMap[edition.silhouette]);

          return (
            <article
              key={edition.id}
              onClick={() => handleSelectEdition(edition, idx)}
              className={`edition-totem-card ${isSelected ? 'active' : ''}`}
            >
              {/* Top Roman & Volume Header */}
              <div className="totem-card-top">
                <span className="totem-roman" style={{ color: edition.accentHex }}>
                  {edition.roman}
                </span>
                <span className="totem-volume">{edition.volume}</span>
              </div>

              {/* Multi-Layered Non-Rectangular Art Totem */}
              <div className="totem-art-assemblage">
                <div className="totem-halo-ring" style={{ borderColor: edition.accentHex }} />

                {/* Primary Sculpted Silhouette Crop */}
                <div
                  className="totem-primary-vessel"
                  style={{
                    clipPath: primaryClip,
                    backgroundImage: `url(${edition.sourceImage})`,
                    backgroundPosition: `${edition.primaryCrop.x}% ${edition.primaryCrop.y}%`,
                    backgroundSize: `${edition.primaryCrop.scale}%`,
                  }}
                />

                {/* Secondary Floating Medallion Relic */}
                <div
                  className="totem-secondary-seal"
                  style={{
                    clipPath: getClipPathByShape('octagram'),
                    backgroundImage: `url(${edition.secondaryImage})`,
                    backgroundPosition: `${edition.secondaryCrop.x}% ${edition.secondaryCrop.y}%`,
                    backgroundSize: `${edition.secondaryCrop.scale}%`,
                  }}
                />

                <span className="totem-rarity-tag">{edition.rarity}</span>
              </div>

              {/* Editorial Copy */}
              <div className="totem-body">
                <span className="totem-designation">{edition.designation}</span>
                <h3 className="totem-title">{edition.title}</h3>
                <p className="totem-subtitle">{edition.subtitle}</p>
                <p className="totem-story">{edition.story}</p>

                <div className="totem-accord-list">
                  {edition.accords.map((acc) => (
                    <span key={acc} className="totem-accord-pill">
                      {acc}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Interactive Alchemical Transmutation Workbench */}
      <div className="alembic-transmutation-bench">
        <div className="alembic-controls-col">
          <div className="alembic-header">
            <span className="alembic-kicker">
              <Flame size={14} /> ALAMBIC D’ASSEMBLAGE SURRÉALISTE
            </span>
            <h3 className="alembic-title">Composer Votre Sceau &amp; Extrait</h3>
            <p className="alembic-desc">
              Modulate the four alchemical weights below. The ocular seal on the right dynamically
              layers and masks fragments from all four paintings into a singular personal emblem.
            </p>
          </div>

          <div className="alembic-sliders-stack">
            <div className="alembic-slider-item">
              <div className="slider-meta-row">
                <span className="slider-substance">I · Marmor Paros (Cabinet du Paradoxe)</span>
                <span className="slider-pct">{pctStill}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={weights.stillLife}
                aria-label="Marmor Paros proportion"
                onChange={(e) => {
                  setIsWaxSealed(false);
                  setWeights((w) => ({ ...w, stillLife: Number(e.target.value) }));
                }}
                className="brass-range-slider"
              />
            </div>

            <div className="alembic-slider-item">
              <div className="slider-meta-row">
                <span className="slider-substance">II · Cinis Vesuvii (Traité Vésuvien)</span>
                <span className="slider-pct">{pctScholar}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={weights.scholarly}
                aria-label="Cinis Vesuvii proportion"
                onChange={(e) => {
                  setIsWaxSealed(false);
                  setWeights((w) => ({ ...w, scholarly: Number(e.target.value) }));
                }}
                className="brass-range-slider"
              />
            </div>

            <div className="alembic-slider-item">
              <div className="slider-meta-row">
                <span className="slider-substance">III · Crocus Arcadiae (Vallée de Safran)</span>
                <span className="slider-pct">{pctValley}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={weights.valley}
                aria-label="Crocus Arcadiae proportion"
                onChange={(e) => {
                  setIsWaxSealed(false);
                  setWeights((w) => ({ ...w, valley: Number(e.target.value) }));
                }}
                className="brass-range-slider"
              />
            </div>

            <div className="alembic-slider-item">
              <div className="slider-meta-row">
                <span className="slider-substance">IV · Aurum Sidereum (Naos des Étoiles)</span>
                <span className="slider-pct">{pctTemple}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={100}
                value={weights.temple}
                aria-label="Aurum Sidereum proportion"
                onChange={(e) => {
                  setIsWaxSealed(false);
                  setWeights((w) => ({ ...w, temple: Number(e.target.value) }));
                }}
                className="brass-range-slider"
              />
            </div>
          </div>

          <div className="alembic-action-row">
            <button
              type="button"
              className={`btn-wax-seal ${isWaxSealed ? 'sealed' : ''}`}
              onClick={() => {
                setIsWaxSealed(true);
                harmonics.playChime(528, 1056, 1.8);
              }}
            >
              <Stamp size={16} />
              <span>{isWaxSealed ? `Cachet de Cire Apposé (${formulaCode})` : 'Sceller dans la Cire Corail'}</span>
            </button>

            <button
              type="button"
              className="btn-reset-alembic"
              onClick={() => {
                setIsWaxSealed(false);
                setWeights({ stillLife: 75, scholarly: 75, valley: 75, temple: 75 });
                harmonics.playChime(396, 594, 0.9);
              }}
              title="Équilibrer les quatre essences"
            >
              <RotateCcw size={15} />
              <span>Équinoxe</span>
            </button>
          </div>
        </div>

        {/* Right: Live Multi-Layer Surrealist Seal Compositor */}
        <div className="alembic-seal-preview-col">
          <div className={`composite-emblem-stage ${isWaxSealed ? 'wax-locked' : ''}`}>
            {/* Layer 1: Outer Pediment / Octagram from Still Life */}
            <div
              className="emblem-layer layer-still"
              style={{
                clipPath: getClipPathByShape('octagram'),
                backgroundImage: `url(${ELYSIAN_IMAGES.stillLife.url}), url(${ELYSIAN_IMAGES.stillLife.fallback})`,
                backgroundPosition: `${20 + weights.stillLife * 0.5}% 55%`,
                backgroundSize: `${180 + weights.stillLife}%`,
                transform: `rotate(${(weights.stillLife - 50) * 0.4}deg) scale(${
                  0.82 + (weights.stillLife / 100) * 0.22
                })`,
              }}
            />

            {/* Layer 2: Sanctuary Arch from Scholarly Volcano */}
            <div
              className="emblem-layer layer-scholarly"
              style={{
                clipPath: getClipPathByShape('arch'),
                backgroundImage: `url(${ELYSIAN_IMAGES.scholarlyLandscape.url}), url(${ELYSIAN_IMAGES.scholarlyLandscape.fallback})`,
                backgroundPosition: `${40 + weights.scholarly * 0.4}% 42%`,
                backgroundSize: `${190 + weights.scholarly}%`,
                transform: `rotate(${(50 - weights.scholarly) * 0.35}deg) scale(${
                  0.68 + (weights.scholarly / 100) * 0.2
                })`,
              }}
            />

            {/* Layer 3: Vesica Eye from Saffron Valley */}
            <div
              className="emblem-layer layer-valley"
              style={{
                clipPath: getClipPathByShape('vesica'),
                backgroundImage: `url(${ELYSIAN_IMAGES.mountainValley.url}), url(${ELYSIAN_IMAGES.mountainValley.fallback})`,
                backgroundPosition: `52% ${30 + weights.valley * 0.4}%`,
                backgroundSize: `${200 + weights.valley}%`,
                transform: `rotate(${(weights.valley - 50) * 0.6}deg) scale(${
                  0.58 + (weights.valley / 100) * 0.24
                })`,
              }}
            />

            {/* Layer 4: Core Keyhole from Starry Golden Temple */}
            <div
              className="emblem-layer layer-temple"
              style={{
                clipPath: getClipPathByShape('keyhole'),
                backgroundImage: `url(${ELYSIAN_IMAGES.goldenTemple.url}), url(${ELYSIAN_IMAGES.goldenTemple.fallback})`,
                backgroundPosition: `50% 52%`,
                backgroundSize: `${170 + weights.temple}%`,
                transform: `scale(${0.44 + (weights.temple / 100) * 0.22})`,
              }}
            />

            {/* Engraved Golden Seal Ring */}
            <svg className="emblem-engraved-ring" viewBox="0 0 360 360" fill="none">
              <circle cx="180" cy="180" r="170" stroke="var(--accent-gold)" strokeWidth="1" strokeDasharray="4 4" />
              <circle cx="180" cy="180" r="134" stroke="var(--accent-coral)" strokeWidth="0.8" />
              <circle cx="180" cy="180" r="92" stroke="var(--accent-gold)" strokeWidth="0.8" strokeDasharray="2 5" />
            </svg>

            {isWaxSealed && (
              <div className="wax-seal-stamp-badge">
                <Sparkles size={13} />
                <span>SCELLÉ · {formulaCode}</span>
              </div>
            )}
          </div>

          <div className="emblem-formula-readout">
            <span className="formula-code-tag">FORMULE N° {formulaCode}</span>
            <h4 className="formula-latin-title">{getFormulaName()}</h4>
            <p className="formula-ratio-line">
              {pctStill}% Marbre · {pctScholar}% Vésuve · {pctValley}% Safran · {pctTemple}% Naos
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
