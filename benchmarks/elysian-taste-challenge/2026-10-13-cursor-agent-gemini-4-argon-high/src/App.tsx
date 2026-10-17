import React, { useState, useEffect } from 'react';
import {
  ATMOSPHERES,
  AtmosphereId,
  ELYSIAN_IMAGES,
  STILL_LIFE_SPECIMENS,
} from './data/elysianWorld';
import { GlobalSvgDefs, MeanderRule } from './components/ClassicalOrnamentation';
import { SurrealHeader } from './components/SurrealHeader';
import { HeroWunderkammer } from './components/HeroWunderkammer';
import { CabinetDissection } from './components/CabinetDissection';
import { TriptychMorphStage } from './components/TriptychMorphStage';
import { AlchemyComposer } from './components/AlchemyComposer';
import { NaosPortalFinale } from './components/NaosPortalFinale';
import { harmonics } from './utils/harmonicAudio';

export const App: React.FC = () => {
  const [atmosphereId, setAtmosphereId] = useState<AtmosphereId>('pelagic');
  const [isSoundOn, setIsSoundOn] = useState<boolean>(false);
  const [collectedIds, setCollectedIds] = useState<string[]>([
    'alpine-frame',
    'twin-marbles',
  ]);
  const [cursorCoords, setCursorCoords] = useState({ x: 0.48, y: 0.36 });

  const activeAtmosphere =
    ATMOSPHERES.find((a) => a.id === atmosphereId) || ATMOSPHERES[0];

  useEffect(() => {
    document.title = 'Gemini 4 Argon';
  }, []);

  const handleSelectAtmosphere = (id: AtmosphereId) => {
    setAtmosphereId(id);
    harmonics.playChime(493.88, 740.82, 1.2);
  };

  const handleToggleSound = () => {
    const active = harmonics.toggleAmbientDrone();
    setIsSoundOn(active);
  };

  const handleToggleCollect = (id: string) => {
    setCollectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleCollectAll = () => {
    setCollectedIds(STILL_LIFE_SPECIMENS.map((s) => s.id));
  };

  return (
    <div
      id="top"
      className="elysian-universe"
      style={
        {
          '--bg-primary': activeAtmosphere.bgPrimary,
          '--bg-elevated': activeAtmosphere.bgElevated,
          '--accent-gold': activeAtmosphere.accentGold,
          '--accent-coral': activeAtmosphere.accentCoral,
          '--text-primary': activeAtmosphere.textPrimary,
          '--text-muted': activeAtmosphere.textMuted,
          '--glow-aura': activeAtmosphere.glowColor,
        } as React.CSSProperties
      }
      onPointerMove={(e) => {
        setCursorCoords({
          x: e.clientX / (window.innerWidth || 1),
          y: e.clientY / (window.innerHeight || 1),
        });
      }}
    >
      {/* Hidden SVG ClipPaths for Architectural & Alchemical Masks */}
      <GlobalSvgDefs />

      {/* Subtle Film Grain & Engraving Overlay */}
      <div className="atmospheric-grain-overlay" aria-hidden="true" />

      {/* Floating Astrolabe Header */}
      <SurrealHeader
        activeAtmosphere={activeAtmosphere}
        onSelectAtmosphere={handleSelectAtmosphere}
        isSoundOn={isSoundOn}
        onToggleSound={handleToggleSound}
        collectedCount={collectedIds.length}
        cursorCoords={cursorCoords}
      />

      {/* Main Surrealist Exhibition Flow */}
      <main className="elysian-main">
        {/* CHAPTER I: Opening Wunderkammer & Ocular Loupe */}
        <HeroWunderkammer />

        {/* Lapidary Interlude Ribbon I */}
        <div className="lapidary-ribbon" aria-hidden="true">
          <MeanderRule color="var(--accent-gold)" />
          <div className="ribbon-marquee-track">
            <span>
              IN MARMORE SOMNIUM · LE CABINET DU PARADOXE · VÉSUVE CORAIL · L’ARCADIE DE SAFRAN · LE
              NAOS DES ÉTOILES · MAISON ELYSIAN MMXXVI ·
            </span>
            <span>
              IN MARMORE SOMNIUM · LE CABINET DU PARADOXE · VÉSUVE CORAIL · L’ARCADIE DE SAFRAN · LE
              NAOS DES ÉTOILES · MAISON ELYSIAN MMXXVI ·
            </span>
          </div>
          <MeanderRule color="var(--accent-gold)" />
        </div>

        {/* CHAPTER II: Interactive Specimen Excavation */}
        <CabinetDissection
          collectedIds={collectedIds}
          onToggleCollect={handleToggleCollect}
        />

        {/* CHAPTER III: The Optical Prism of Horizons */}
        <TriptychMorphStage />

        {/* CHAPTER IV: The Four Numbered Reliquaries & Live Seal Transmutation */}
        <AlchemyComposer />

        {/* CHAPTER V: The Expanding Golden Temple Threshold */}
        <NaosPortalFinale
          collectedIds={collectedIds}
          onCollectAll={handleCollectAll}
        />
      </main>

      {/* Sculptural Colophon Footer */}
      <footer className="elysian-colophon" role="contentinfo">
        <MeanderRule color="var(--accent-gold)" />
        <div className="colophon-inner">
          <div className="colophon-brand-col">
            <span className="colophon-crest">✦ MAISON ELYSIAN ✦</span>
            <p className="colophon-motto">
              Haute Alchimie Olfactive, Traités Classiques &amp; Paysages Surréalistes.
            </p>
            <p className="colophon-atm-status">
              Atmosphère active: <strong>{activeAtmosphere.name}</strong> ({activeAtmosphere.latin})
            </p>
          </div>

          <div className="colophon-plates-index">
            <span className="plates-heading">PLANCHES ICONOGRAPHIQUES D’ORIGINE</span>
            <ul className="plates-list">
              <li>
                <span>Planche I:</span> {ELYSIAN_IMAGES.stillLife.title} ({ELYSIAN_IMAGES.stillLife.coordinates})
              </li>
              <li>
                <span>Planche II:</span> {ELYSIAN_IMAGES.scholarlyLandscape.title} ({ELYSIAN_IMAGES.scholarlyLandscape.coordinates})
              </li>
              <li>
                <span>Planche III:</span> {ELYSIAN_IMAGES.mountainValley.title} ({ELYSIAN_IMAGES.mountainValley.coordinates})
              </li>
              <li>
                <span>Planche IV:</span> {ELYSIAN_IMAGES.goldenTemple.title} ({ELYSIAN_IMAGES.goldenTemple.coordinates})
              </li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
