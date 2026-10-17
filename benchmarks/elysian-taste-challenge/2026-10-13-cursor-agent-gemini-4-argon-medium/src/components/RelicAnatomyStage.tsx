import React, { useState } from 'react';
import { Sparkles, Crosshair, Volume2, Plus } from 'lucide-react';
import { ALCHEMICAL_RELICS, ELYSIAN_IMAGES, AlchemicalRelic } from '../data/elysianWorld';
import { soundscape } from '../utils/soundscape';

interface RelicAnatomyStageProps {
  onAddRelicEssence: (relic: AlchemicalRelic) => void;
}

export const RelicAnatomyStage: React.FC<RelicAnatomyStageProps> = ({ onAddRelicEssence }) => {
  const [selectedRelic, setSelectedRelic] = useState<AlchemicalRelic>(ALCHEMICAL_RELICS[0]);
  const [activeCanvas, setActiveCanvas] = useState<'stillLife' | 'scholarly'>('stillLife');
  const [isZoomed, setIsZoomed] = useState<boolean>(false);

  const canvasUrl =
    activeCanvas === 'stillLife' ? ELYSIAN_IMAGES.stillLife : ELYSIAN_IMAGES.scholarly;

  const handleSelectRelic = (relic: AlchemicalRelic) => {
    setSelectedRelic(relic);
    setActiveCanvas(relic.sourceCanvas);
    setIsZoomed(true);
    soundscape.playChime(relic.freqHz, 1.5);
  };

  return (
    <section
      id="cabinet-des-fragments"
      className="relative py-24 md:py-32 px-4 sm:px-8 lg:px-14 border-t border-[#F0A824]/20 bg-gradient-to-b from-[#051216] via-[#081E26] to-[#051216]"
    >
      <div className="max-w-[1440px] mx-auto space-y-14">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase tracking-[0.26em] text-[#F26B8A]">
              <Crosshair className="w-3.5 h-3.5" />
              <span>CHAPITRE I · ANATOMIE DES COLLAGES SURRÉALISTES</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl text-[#F5EFE4] tracking-wide leading-tight">
              Le Cabinet des Fragments & Reliques
            </h2>
            <p className="font-editorial text-xl sm:text-2xl italic text-[#C5BCA8]">
              Six artefacts extraits des tables d’alchimie gréco-romaines — chaque fragment recèle
              une molécule olfactive et un paradoxe temporel.
            </p>
          </div>

          {/* Canvas Switcher + Zoom Toggle */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                setActiveCanvas('stillLife');
                setSelectedRelic(ALCHEMICAL_RELICS[0]);
                setIsZoomed(false);
              }}
              className={`px-4 py-2.5 rounded-full text-xs font-mono-tech uppercase tracking-[0.18em] border transition-all cursor-pointer ${
                activeCanvas === 'stillLife'
                  ? 'bg-[#F0A824] text-[#051216] border-[#F0A824] font-semibold'
                  : 'bg-[#092129] text-[#C5BCA8] border-[#F0A824]/30 hover:text-[#F5EFE4]'
              }`}
            >
              Table I · Nature Morte Surréaliste
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveCanvas('scholarly');
                setSelectedRelic(ALCHEMICAL_RELICS[4]);
                setIsZoomed(false);
              }}
              className={`px-4 py-2.5 rounded-full text-xs font-mono-tech uppercase tracking-[0.18em] border transition-all cursor-pointer ${
                activeCanvas === 'scholarly'
                  ? 'bg-[#F26B8A] text-[#051216] border-[#F26B8A] font-semibold'
                  : 'bg-[#092129] text-[#C5BCA8] border-[#F26B8A]/30 hover:text-[#F5EFE4]'
              }`}
            >
              Table II · Paysage Érudit & Vésuve
            </button>
            <button
              type="button"
              onClick={() => setIsZoomed((z) => !z)}
              className="px-4 py-2.5 rounded-full text-xs font-mono-tech uppercase tracking-[0.16em] border border-[#F5EFE4]/20 bg-[#051216] text-[#F7D58B] hover:border-[#F0A824] transition-all cursor-pointer"
            >
              {isZoomed ? 'Vue Panoramique (1×)' : 'Grossissement Loupe (2.6×)'}
            </button>
          </div>
        </div>

        {/* Interactive Sculpted Tableau + Dossier Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left 7 Cols: Sculpted Polygonal Stage with Interactive Brass Pins */}
          <div className="lg:col-span-7 relative">
            <div className="relative h-[440px] sm:h-[540px] w-full p-1.5 bg-gradient-to-br from-[#F0A824] via-[#F26B8A]/70 to-[#38BDF8]/60 clip-vesuvian-shard shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
              <div className="relative w-full h-full clip-vesuvian-shard overflow-hidden bg-[#051216]">
                <img
                  src={canvasUrl}
                  alt={selectedRelic.name}
                  className="w-full h-full object-cover transition-all duration-1000 ease-out"
                  style={{
                    transformOrigin: `${selectedRelic.cropX}% ${selectedRelic.cropY}%`,
                    transform: isZoomed ? `scale(${selectedRelic.cropScale})` : 'scale(1.02)',
                  }}
                />

                {/* Subtle dark vignette overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#051216]/85 via-transparent to-[#051216]/35" />

                {/* Interactive Relic Hotspots */}
                {ALCHEMICAL_RELICS.filter((r) => r.sourceCanvas === activeCanvas).map((relic) => {
                  const isActive = selectedRelic.id === relic.id;
                  return (
                    <button
                      key={relic.id}
                      type="button"
                      onClick={() => handleSelectRelic(relic)}
                      style={{ left: `${relic.x}%`, top: `${relic.y}%` }}
                      className={`group absolute -translate-x-1/2 -translate-y-1/2 z-20 flex items-center gap-2 transition-all duration-500 cursor-pointer ${
                        isActive ? 'scale-115' : 'hover:scale-110'
                      }`}
                    >
                      <span
                        className={`relative flex items-center justify-center w-9 h-9 rounded-full font-mono-tech text-xs font-bold border transition-all ${
                          isActive
                            ? 'bg-[#F0A824] text-[#051216] border-[#F5EFE4] shadow-[0_0_30px_#F0A824]'
                            : 'bg-[#051216]/90 text-[#F7D58B] border-[#F0A824]/80 hover:bg-[#F26B8A] hover:text-[#051216]'
                        }`}
                      >
                        {relic.number}
                        <span className="absolute -inset-1.5 rounded-full border border-[#F0A824]/50 animate-ping pointer-events-none" />
                      </span>
                      <span
                        className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-[10px] font-mono-tech tracking-wider whitespace-nowrap border backdrop-blur-md transition-all ${
                          isActive
                            ? 'bg-[#051216]/95 text-[#F7D58B] border-[#F0A824]'
                            : 'bg-[#051216]/75 text-[#F5EFE4]/90 border-[#F5EFE4]/20 opacity-85 group-hover:opacity-100'
                        }`}
                      >
                        {relic.name}
                      </span>
                    </button>
                  );
                })}

                {/* Bottom Coordinate HUD inside the shard */}
                <div className="absolute bottom-5 left-6 right-6 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tech text-[#F7D58B]">
                  <span>
                    COORDONNÉES OPTIQUES : X:{selectedRelic.cropX}% · Y:{selectedRelic.cropY}% ·{' '}
                    {selectedRelic.alchemyFormula}
                  </span>
                  <span className="text-[#F26B8A]">
                    CLIQUER SUR UN POINT D’OR POUR ISOLER LE FRAGMENT
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Active Relic Alchemical Dossier & Magnified Cutout */}
          <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-3xl border border-[#F0A824]/30 bg-gradient-to-b from-[#092129]/95 to-[#051216]/95 shadow-[0_25px_70px_rgba(0,0,0,0.65)] relative overflow-hidden">
            <div className="space-y-6 relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-mono-tech uppercase tracking-[0.24em] text-[#F26B8A]">
                    RELIQUE N° {selectedRelic.number} · {selectedRelic.category}
                  </span>
                  <h3 className="font-editorial text-3xl sm:text-4xl text-[#F5EFE4] mt-1">
                    {selectedRelic.name}
                  </h3>
                  <p className="font-mono-tech text-xs text-[#F0A824] tracking-[0.18em] mt-1">
                    « {selectedRelic.latinTitle} »
                  </p>
                </div>

                {/* Sculpted Non-Rectangular Zoom Medallion of the Relic */}
                <div
                  className={`w-24 h-28 shrink-0 p-1 bg-gradient-to-b from-[#F0A824] to-[#F26B8A] ${selectedRelic.shapeClass} shadow-xl`}
                >
                  <div
                    className={`w-full h-full ${selectedRelic.shapeClass} bg-[#051216] transition-all duration-700`}
                    style={{
                      backgroundImage: `url(${selectedRelic.sourceUrl})`,
                      backgroundPosition: `${selectedRelic.cropX}% ${selectedRelic.cropY}%`,
                      backgroundSize: '380%',
                    }}
                  />
                </div>
              </div>

              <p className="text-[#C5BCA8] text-base leading-relaxed font-light">
                {selectedRelic.description}
              </p>

              {/* Alchemical Telemetry Boxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-[#051216]/80 border border-[#F0A824]/25">
                  <div className="text-[10px] font-mono-tech uppercase tracking-[0.2em] text-[#F0A824]">
                    Distillation Olfactive
                  </div>
                  <div className="font-editorial text-lg text-[#F5EFE4] mt-1">
                    {selectedRelic.olfactoryNote}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-[#051216]/80 border border-[#F26B8A]/25">
                  <div className="text-[10px] font-mono-tech uppercase tracking-[0.2em] text-[#F26B8A]">
                    Formule & Fréquence
                  </div>
                  <div className="font-mono-tech text-sm text-[#F7D58B] mt-1.5 flex items-center justify-between">
                    <span>{selectedRelic.alchemyFormula}</span>
                    <button
                      type="button"
                      onClick={() => {
                        soundscape.enabled = true;
                        soundscape.playChime(selectedRelic.freqHz, 1.8);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#F26B8A]/20 text-[#F26B8A] hover:bg-[#F26B8A] hover:text-[#051216] transition-colors cursor-pointer text-[11px]"
                      title="Écouter la résonance harmonique"
                    >
                      <Volume2 className="w-3 h-3" />
                      {selectedRelic.freqHz}Hz
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-[#F5EFE4]/10 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs font-mono-tech text-[#C5BCA8]">
                Échantillon d’archive disponible pour votre Malle Privée
              </div>
              <button
                type="button"
                onClick={() => onAddRelicEssence(selectedRelic)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F0A824]/15 hover:bg-[#F0A824] text-[#F7D58B] hover:text-[#051216] border border-[#F0A824]/60 font-mono-tech text-xs uppercase tracking-[0.18em] transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Joindre l’Essence au Coffret</span>
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Strip: 6 Sculpted Cutout Fragments (Arch, Octagon, Pediment, Shard) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 pt-4">
          {ALCHEMICAL_RELICS.map((relic) => {
            const isSelected = relic.id === selectedRelic.id;
            return (
              <button
                key={relic.id}
                type="button"
                onClick={() => handleSelectRelic(relic)}
                className={`group text-left p-3 rounded-2xl border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'border-[#F0A824] bg-[#0E2E38]/90 shadow-[0_12px_30px_rgba(240,168,36,0.2)] -translate-y-1'
                    : 'border-[#F5EFE4]/10 bg-[#092129]/40 hover:border-[#F26B8A]/50 hover:-translate-y-0.5'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono-tech text-[#F0A824] mb-2">
                  <span>FRAGMENT {relic.number}</span>
                  <Sparkles className="w-3 h-3 text-[#F26B8A] opacity-70 group-hover:opacity-100" />
                </div>
                <div className={`w-full h-28 overflow-hidden ${relic.shapeClass} mb-2.5 relative`}>
                  <div
                    className="w-full h-full transition-transform duration-700 group-hover:scale-115"
                    style={{
                      backgroundImage: `url(${relic.sourceUrl})`,
                      backgroundPosition: `${relic.cropX}% ${relic.cropY}%`,
                      backgroundSize: '340%',
                    }}
                  />
                </div>
                <div className="font-editorial text-base text-[#F5EFE4] leading-snug line-clamp-1">
                  {relic.name}
                </div>
                <div className="font-mono-tech text-[10px] text-[#C5BCA8] truncate mt-0.5">
                  {relic.category}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
