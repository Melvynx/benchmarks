import React, { useState, useRef, useEffect } from 'react';
import { Compass, Eye, Sparkles, Layers, ArrowDownRight, ScanEye } from 'lucide-react';
import { MYTHOS_ACTS, ELYSIAN_IMAGES, MythosAct } from '../data/elysianWorld';
import { soundscape } from '../utils/soundscape';

interface SurrealStageHeroProps {
  onExploreRelics: () => void;
  onOpenOracle: () => void;
}

export const SurrealStageHero: React.FC<SurrealStageHeroProps> = ({
  onExploreRelics,
  onOpenOracle,
}) => {
  const [activeActIndex, setActiveActIndex] = useState<number>(0);
  const [loupeMode, setLoupeMode] = useState<'ocular' | 'eclipse' | 'triptych'>('ocular');
  const [loupeRadius, setLoupeRadius] = useState<number>(155);
  const [pointer, setPointer] = useState<{ x: number; y: number; active: boolean }>({
    x: 52,
    y: 46,
    active: false,
  });

  const stageRef = useRef<HTMLDivElement | null>(null);
  const activeAct: MythosAct = MYTHOS_ACTS[activeActIndex];

  // Gentle autonomous orbit for the ocular lens when user isn't actively hovering
  useEffect(() => {
    if (pointer.active) return;
    let frameId: number;
    const start = performance.now();

    const tick = (now: number) => {
      const elapsed = (now - start) * 0.00075;
      const x = 50 + Math.cos(elapsed) * 22;
      const y = 48 + Math.sin(elapsed * 1.4) * 18;
      setPointer((prev) => (prev.active ? prev : { x, y, active: false }));
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [pointer.active]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const x = Math.max(6, Math.min(94, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(6, Math.min(94, ((e.clientY - rect.top) / rect.height) * 100));
    setPointer({ x, y, active: true });
  };

  const handleActChange = (index: number) => {
    setActiveActIndex(index);
    soundscape.playChime(432 + index * 64, 1.3);
  };

  const parallaxX = (pointer.x - 50) * 0.28;
  const parallaxY = (pointer.y - 50) * 0.28;

  return (
    <section className="relative min-h-screen pt-24 pb-20 md:pt-28 md:pb-28 px-4 sm:px-8 lg:px-14 overflow-hidden select-none">
      {/* Ambient Surrealist Aura Glows */}
      <div
        className="pointer-events-none absolute -top-32 left-1/4 w-[36rem] h-[36rem] rounded-full blur-[150px] transition-colors duration-1000 opacity-30"
        style={{ backgroundColor: activeAct.accentHex }}
      />
      <div
        className="pointer-events-none absolute top-1/3 right-10 w-[30rem] h-[30rem] rounded-full blur-[140px] transition-colors duration-1000 opacity-25"
        style={{ backgroundColor: activeAct.secondaryHex }}
      />

      {/* Architectural Proscenium Frame Lines */}
      <div className="max-w-[1440px] mx-auto relative">
        {/* Top Engraved Pediment Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-8 border-b border-[#F0A824]/25 text-xs font-mono-tech tracking-[0.22em] text-[#C5BCA8]">
          <div className="flex items-center gap-3">
            <span className="inline-block w-2 h-2 rounded-full bg-[#F26B8A] animate-ping" />
            <span className="text-[#F5EFE4] font-medium">MAISON ELYSIAN · ARCHIVE SURRÉELLE</span>
            <span className="hidden sm:inline text-[#F0A824]/60">/</span>
            <span className="hidden sm:inline text-[#F0A824]">{activeAct.hourLabel}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden md:inline text-[#C5BCA8]/80">{activeAct.coordinates}</span>
            <span className="px-2.5 py-1 rounded-full border border-[#F0A824]/40 bg-[#092129]/90 text-[#F7D58B]">
              ACTE {activeAct.roman} / IV
            </span>
          </div>
        </div>

        {/* Monumental Editorial Header + Collage Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Brand Mythos, Primary Title, and Interactive Controls */}
          <div className="lg:col-span-5 space-y-6 relative z-20">
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border border-[#F26B8A]/40 bg-[#092129]/80 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-[#F26B8A]" />
              <span className="text-[11px] font-mono-tech uppercase tracking-[0.25em] text-[#F5EFE4]">
                ELYSIAN · HAUTE ALCHIMIE OLFACTIVE & RÊVERIE
              </span>
            </div>

            {/* Primary Visible Title: strictly the model name and nothing else */}
            <div className="space-y-2">
              <p className="font-editorial italic text-lg sm:text-xl text-[#F7D58B] tracking-wide">
                Codex d’Antiquité Surréaliste — Monographie Souveraine
              </p>
              <h1 className="font-display text-4xl sm:text-6xl xl:text-[4.15rem] font-bold tracking-[0.04em] leading-[1.03] text-transparent bg-clip-text bg-gradient-to-r from-[#F5EFE4] via-[#F7D58B] to-[#F26B8A] drop-shadow-[0_10px_35px_rgba(240,168,36,0.22)]">
                Gemini 4 Argon
              </h1>
            </div>

            {/* Active Mythos Act Title & Poetic Manifesto */}
            <div className="p-5 sm:p-6 rounded-2xl border border-[#F0A824]/30 bg-gradient-to-br from-[#092129]/95 via-[#071920]/95 to-[#051216]/95 backdrop-blur-xl shadow-[0_24px_60px_rgba(0,0,0,0.55)] space-y-3 relative overflow-hidden">
              <div
                className="absolute top-0 left-0 h-1 transition-all duration-700"
                style={{
                  width: `${((activeActIndex + 1) / MYTHOS_ACTS.length) * 100}%`,
                  background: `linear-gradient(90deg, ${activeAct.accentHex}, ${activeAct.secondaryHex})`,
                }}
              />
              <div className="flex items-center justify-between text-[11px] font-mono-tech tracking-[0.2em] text-[#F0A824]">
                <span>TABLEAU {activeAct.roman}</span>
                <span>« {activeAct.latinMotto} »</span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#F5EFE4] leading-tight">
                {activeAct.title}
              </h2>
              <p className="text-sm sm:text-base text-[#C5BCA8] leading-relaxed font-light">
                {activeAct.poeticManifesto}
              </p>
              <p className="text-xs font-mono-tech text-[#F7D58B]/80 pt-1 border-t border-[#F5EFE4]/10">
                {activeAct.curatorialNote}
              </p>
            </div>

            {/* 4-Act World Switcher (Thumbnail Cutouts) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-mono-tech uppercase tracking-[0.2em] text-[#C5BCA8]">
                <span>Séquencer les Quatre Mondes d’Elysian</span>
                <span className="text-[#F26B8A]">Cliquer pour transmuter</span>
              </div>
              <div className="grid grid-cols-4 gap-2.5">
                {MYTHOS_ACTS.map((act, idx) => {
                  const isSelected = idx === activeActIndex;
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() => handleActChange(idx)}
                      className={`group relative rounded-xl p-1.5 border text-left transition-all duration-300 cursor-pointer overflow-hidden ${
                        isSelected
                          ? 'border-[#F0A824] bg-[#0E2E38] shadow-[0_0_25px_rgba(240,168,36,0.3)] scale-[1.02]'
                          : 'border-[#F5EFE4]/15 bg-[#092129]/60 hover:border-[#F26B8A]/60'
                      }`}
                    >
                      <div className="relative h-14 sm:h-16 w-full overflow-hidden rounded-lg">
                        <img
                          src={act.primaryImage}
                          alt={act.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#051216] via-transparent to-transparent" />
                        <span className="absolute bottom-1 left-1.5 font-mono-tech text-[10px] font-semibold tracking-widest text-[#F7D58B]">
                          {act.roman}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[10px] font-mono-tech truncate text-[#F5EFE4]/90">
                        {act.title.replace(/^L'|La |Le /, '')}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ocular Instrument Mode Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="inline-flex rounded-full p-1 bg-[#092129] border border-[#F0A824]/30">
                <button
                  type="button"
                  onClick={() => {
                    setLoupeMode('ocular');
                    soundscape.playChime(528, 0.9);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono-tech tracking-wider transition-all cursor-pointer ${
                    loupeMode === 'ocular'
                      ? 'bg-[#F0A824] text-[#051216] font-semibold'
                      : 'text-[#C5BCA8] hover:text-[#F5EFE4]'
                  }`}
                >
                  <ScanEye className="w-3.5 h-3.5" />
                  LOUPE ASTRALE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoupeMode('eclipse');
                    soundscape.playChime(639, 0.9);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono-tech tracking-wider transition-all cursor-pointer ${
                    loupeMode === 'eclipse'
                      ? 'bg-[#F26B8A] text-[#051216] font-semibold'
                      : 'text-[#C5BCA8] hover:text-[#F5EFE4]'
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" />
                  VOILE D’ÉCLIPSE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoupeMode('triptych');
                    soundscape.playChime(741, 0.9);
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono-tech tracking-wider transition-all cursor-pointer ${
                    loupeMode === 'triptych'
                      ? 'bg-[#38BDF8] text-[#051216] font-semibold'
                      : 'text-[#C5BCA8] hover:text-[#F5EFE4]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  PRISME ÉCLATÉ
                </button>
              </div>

              {loupeMode === 'ocular' && (
                <label className="flex items-center gap-2 text-[11px] font-mono-tech text-[#C5BCA8] bg-[#092129]/80 px-3 py-1.5 rounded-full border border-[#F5EFE4]/10">
                  <span>Ø IRIS</span>
                  <input
                    type="range"
                    min={90}
                    max={250}
                    value={loupeRadius}
                    onChange={(e) => setLoupeRadius(Number(e.target.value))}
                    className="w-20 accent-[#F0A824] cursor-pointer"
                  />
                </label>
              )}
            </div>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onExploreRelics}
                className="group inline-flex items-center gap-3 px-6 py-3.5 rounded-full bg-gradient-to-r from-[#F0A824] via-[#F7D58B] to-[#F26B8A] text-[#051216] font-mono-tech text-xs font-semibold uppercase tracking-[0.2em] shadow-[0_12px_35px_rgba(240,168,36,0.35)] hover:brightness-110 transition-all cursor-pointer"
              >
                <span>Inspecter les Reliques</span>
                <ArrowDownRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
              </button>
              <button
                type="button"
                onClick={onOpenOracle}
                className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-full border border-[#F0A824]/50 bg-[#092129]/80 hover:bg-[#0E2E38] text-[#F7D58B] font-mono-tech text-xs uppercase tracking-[0.18em] transition-all cursor-pointer"
              >
                <Compass className="w-4 h-4 text-[#F26B8A]" />
                <span>Composer un Collage Oracle</span>
              </button>
            </div>
          </div>

          {/* Right Column: Non-Rectangular Multi-Plane Surrealist Stage */}
          <div className="lg:col-span-7 relative flex items-center justify-center min-h-[540px] sm:min-h-[650px]">
            {/* Rotating Celestial Astrolabe Rings Behind the Stage */}
            <svg
              viewBox="0 0 600 600"
              className="pointer-events-none absolute w-[108%] max-w-[680px] h-auto opacity-35 animate-spin-slow"
            >
              <circle
                cx="300"
                cy="300"
                r="285"
                fill="none"
                stroke="#F0A824"
                strokeWidth="0.8"
                strokeDasharray="6 8"
              />
              <circle
                cx="300"
                cy="300"
                r="248"
                fill="none"
                stroke="#F26B8A"
                strokeWidth="0.8"
                strokeDasharray="2 12"
              />
              <polygon
                points="300,22 545,442 55,442"
                fill="none"
                stroke="#F0A824"
                strokeWidth="0.5"
                opacity="0.45"
              />
              <polygon
                points="300,578 545,158 55,158"
                fill="none"
                stroke="#F26B8A"
                strokeWidth="0.5"
                opacity="0.45"
              />
            </svg>

            {/* Floating Left Satellite Cutout: Ornate Octagonal Relic Crop */}
            <div
              className="hidden sm:block absolute -left-2 lg:-left-6 top-10 z-30 w-40 md:w-48 h-48 md:h-56 p-1.5 bg-gradient-to-b from-[#F0A824] via-[#F26B8A] to-[#092129] clip-octagon-ornate shadow-[0_25px_50px_rgba(0,0,0,0.75)] transition-transform duration-300"
              style={{
                transform: `translate3d(${-parallaxX * 1.1}px, ${-parallaxY * 1.1}px, 0)`,
              }}
            >
              <div className="w-full h-full clip-octagon-ornate relative overflow-hidden bg-[#051216]">
                <div
                  className="w-full h-full transition-all duration-700"
                  style={{
                    backgroundImage: `url(${ELYSIAN_IMAGES.stillLife})`,
                    backgroundPosition: activeAct.focalCrop.leftFragmentPos,
                    backgroundSize: '310%',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#051216]/90 via-transparent to-transparent" />
                <div className="absolute bottom-3 inset-x-0 text-center font-mono-tech text-[9px] tracking-[0.22em] text-[#F7D58B]">
                  FRAGMENT I · CADRE D’OR
                </div>
              </div>
            </div>

            {/* Floating Top-Right Satellite Oculus: Starry Temple / Volcanic Plume */}
            <div
              className="hidden sm:flex absolute -right-1 lg:-right-4 top-4 z-30 w-36 md:w-44 h-36 md:h-44 rounded-full p-1 bg-gradient-to-tr from-[#F26B8A] via-[#F0A824] to-[#38BDF8] shadow-[0_20px_50px_rgba(0,0,0,0.75)] items-center justify-center transition-transform duration-300"
              style={{
                transform: `translate3d(${parallaxX * 1.4}px, ${-parallaxY * 1.2}px, 0)`,
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden relative bg-[#051216]">
                <div
                  className="w-full h-full transition-all duration-700"
                  style={{
                    backgroundImage: `url(${ELYSIAN_IMAGES.scholarly})`,
                    backgroundPosition: activeAct.focalCrop.oculusPos,
                    backgroundSize: '290%',
                  }}
                />
                <div className="absolute inset-0 ring-1 ring-inset ring-[#F0A824]/50 rounded-full" />
                <span className="absolute bottom-2.5 inset-x-0 text-center font-mono-tech text-[8px] uppercase tracking-[0.22em] text-[#F5EFE4] bg-[#051216]/70 py-0.5">
                  OCULUS VÉSUVIEN
                </span>
              </div>
            </div>

            {/* Floating Bottom-Right Fluted Column Slice */}
            <div
              className="hidden sm:block absolute right-0 lg:-right-5 bottom-6 z-30 w-40 md:w-48 h-52 md:h-60 p-1 bg-gradient-to-b from-[#F26B8A] to-[#F0A824] clip-arch-invert shadow-[0_25px_55px_rgba(0,0,0,0.8)] transition-transform duration-300"
              style={{
                transform: `translate3d(${parallaxX * 0.9}px, ${parallaxY * 1.2}px, 0)`,
              }}
            >
              <div className="w-full h-full clip-arch-invert overflow-hidden relative bg-[#051216]">
                <div
                  className="w-full h-full transition-all duration-700"
                  style={{
                    backgroundImage: `url(${ELYSIAN_IMAGES.valley})`,
                    backgroundPosition: activeAct.focalCrop.rightFragmentPos,
                    backgroundSize: '280%',
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#051216]/80 via-transparent to-[#051216]/80" />
                <div className="absolute top-3 inset-x-0 text-center font-mono-tech text-[9px] tracking-[0.2em] text-[#F26B8A]">
                  COLONNE & VALLÉE D’OR
                </div>
              </div>
            </div>

            {/* Central Monumental Archway Stage with Dual-Reality Loupe */}
            <div
              ref={stageRef}
              onPointerMove={handlePointerMove}
              onPointerEnter={() => setPointer((p) => ({ ...p, active: true }))}
              onPointerLeave={() => setPointer((p) => ({ ...p, active: false }))}
              className="relative z-20 w-full max-w-[540px] h-[510px] sm:h-[600px] p-2 bg-gradient-to-b from-[#F0A824] via-[#F26B8A]/80 to-[#092129] clip-arch shadow-[0_30px_90px_rgba(0,0,0,0.85)] cursor-crosshair"
              style={{
                transform: `translate3d(${parallaxX * 0.35}px, ${parallaxY * 0.35}px, 0)`,
              }}
            >
              <div className="relative w-full h-full clip-arch overflow-hidden bg-[#051216]">
                {/* Base Layer: Primary Painting of the Active Act */}
                <img
                  src={activeAct.primaryImage}
                  alt={activeAct.title}
                  className="w-full h-full object-cover transition-transform duration-700"
                  style={{
                    transform:
                      loupeMode === 'triptych'
                        ? `scale(1.08) translate(${-parallaxX * 0.5}px, ${-parallaxY * 0.5}px)`
                        : 'scale(1.03)',
                  }}
                />

                {/* Mode 1: Ocular Astral Loupe — reveals the Veil World inside the moving astrolabe lens */}
                {loupeMode === 'ocular' && (
                  <div
                    className="pointer-events-none absolute inset-0 transition-opacity duration-300"
                    style={{
                      clipPath: `circle(${loupeRadius}px at ${pointer.x}% ${pointer.y}%)`,
                    }}
                  >
                    <img
                      src={activeAct.veilImage}
                      alt="Monde Voilé"
                      className="w-full h-full object-cover scale-110 filter saturate-125 contrast-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-[#F26B8A]/20 via-transparent to-[#F0A824]/25 mix-blend-screen" />
                  </div>
                )}

                {/* Mode 2: Solar Eclipse Veil — vertical split curtain controlled by pointer X */}
                {loupeMode === 'eclipse' && (
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      clipPath: `polygon(${pointer.x}% 0%, 100% 0%, 100% 100%, ${Math.max(
                        0,
                        pointer.x - 14
                      )}% 100%)`,
                    }}
                  >
                    <img
                      src={activeAct.veilImage}
                      alt="Éclipse Surréaliste"
                      className="w-full h-full object-cover scale-105"
                    />
                  </div>
                )}

                {/* Mode 3: Triptych Prismatic Slices — overlays horizontal surrealist bands of all 4 worlds */}
                {loupeMode === 'triptych' && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        clipPath: 'polygon(0% 24%, 100% 14%, 100% 46%, 0% 56%)',
                      }}
                    >
                      <img
                        src={ELYSIAN_IMAGES.temple}
                        alt="Prisme Temple"
                        className="w-full h-full object-cover scale-110"
                      />
                    </div>
                    <div
                      className="pointer-events-none absolute inset-0"
                      style={{
                        clipPath: 'polygon(0% 66%, 100% 58%, 100% 84%, 0% 92%)',
                      }}
                    >
                      <img
                        src={ELYSIAN_IMAGES.valley}
                        alt="Prisme Vallée"
                        className="w-full h-full object-cover scale-110"
                      />
                    </div>
                  </>
                )}

                {/* Engraved Brass Reticle Ring following the Ocular Loupe */}
                {loupeMode === 'ocular' && (
                  <div
                    className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#F7D58B]/90 shadow-[0_0_40px_rgba(240,168,36,0.45)] flex items-center justify-center"
                    style={{
                      left: `${pointer.x}%`,
                      top: `${pointer.y}%`,
                      width: `${loupeRadius * 2}px`,
                      height: `${loupeRadius * 2}px`,
                    }}
                  >
                    <div className="absolute inset-2 rounded-full border border-dashed border-[#F26B8A]/80 animate-spin-slow" />
                    <span className="absolute -top-6 px-2 py-0.5 rounded bg-[#051216]/90 border border-[#F0A824]/50 font-mono-tech text-[9px] tracking-[0.2em] text-[#F7D58B] whitespace-nowrap">
                      VISION ASTRALE · {Math.round(pointer.x)}° / {Math.round(pointer.y)}°
                    </span>
                  </div>
                )}

                {/* Bottom Arch Curatorial Plaque */}
                <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-[#051216] via-[#051216]/85 to-transparent flex items-end justify-between gap-4">
                  <div>
                    <p className="font-mono-tech text-[10px] uppercase tracking-[0.24em] text-[#F0A824]">
                      {pointer.active ? 'LOUPE ACTIVE · DÉPLACER LE CURSEUR' : 'ORBITE AUTOMATIQUE · SURVOLER L’ARCHE'}
                    </p>
                    <p className="font-editorial italic text-lg text-[#F5EFE4]">
                      {activeAct.subtitle}
                    </p>
                  </div>
                  <div className="text-right font-mono-tech text-[10px] text-[#F26B8A] tracking-widest">
                    <div>PLANCHE {activeAct.roman}</div>
                    <div className="text-[#C5BCA8]">MUSEUM ELYSIAN</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
