import React, { useState } from 'react';
import { Sparkles, Stamp, ShoppingBag, Eye, Layers } from 'lucide-react';
import { ELYSIAN_EDITIONS, ElysianEdition } from '../data/elysianWorld';
import { soundscape } from '../utils/soundscape';

interface EditionsGalleryProps {
  onAcquireEdition: (edition: ElysianEdition, engraving: string) => void;
}

export const EditionsGallery: React.FC<EditionsGalleryProps> = ({ onAcquireEdition }) => {
  const [engravings, setEngravings] = useState<Record<string, string>>({
    'marbre-de-carnation': 'MARMOR VII',
    'cendre-derudit': 'VESUVIUS IX',
    'fleuve-dorphee': 'ORPHEUS III',
    'naos-de-minuit': 'ASTRUM IV',
  });
  const [activeNoteTab, setActiveNoteTab] = useState<Record<string, 'top' | 'heart' | 'base'>>({});
  const [revealedLayer, setRevealedLayer] = useState<Record<string, boolean>>({});

  const toggleReveal = (id: string) => {
    setRevealedLayer((prev) => ({ ...prev, [id]: !prev[id] }));
    soundscape.playChime(612, 1.1);
  };

  return (
    <section
      id="collections-extraits"
      className="relative py-24 md:py-36 px-4 sm:px-8 lg:px-14 border-t border-[#F0A824]/20 overflow-hidden"
    >
      {/* Background Decorative Pediment Watermark */}
      <div className="pointer-events-none absolute top-20 right-0 w-[40rem] h-[40rem] rounded-full bg-[#F0A824]/10 blur-[160px]" />
      <div className="pointer-events-none absolute bottom-20 left-0 w-[38rem] h-[38rem] rounded-full bg-[#F26B8A]/10 blur-[160px]" />

      <div className="max-w-[1440px] mx-auto space-y-20">
        {/* Section Title */}
        <div className="max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase tracking-[0.26em] text-[#F0A824]">
            <Sparkles className="w-3.5 h-3.5 text-[#F26B8A]" />
            <span>CHAPITRE II · HAUTE CONFISERIE OLFACTIVE & FLacons SCULPTÉS</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl text-[#F5EFE4] leading-[1.08]">
            Les Quatre Éditions Souveraines
          </h2>
          <p className="font-editorial italic text-xl sm:text-2xl text-[#C5BCA8]">
            Chaque flacon est taillé comme une relique architecturale : colonnes roses cannelées,
            urnes de laiton vésuvien, prismes d’eau glaciaire et sanctuaires d’ambre étoilé.
          </p>
        </div>

        {/* Staggered Asymmetric Sculptural Showcases */}
        <div className="space-y-28">
          {ELYSIAN_EDITIONS.map((edition, index) => {
            const isEven = index % 2 === 0;
            const currentEngraving = engravings[edition.id] ?? 'ELYSIAN';
            const currentPyramid = activeNoteTab[edition.id] ?? 'heart';
            const isRevealed = Boolean(revealedLayer[edition.id]);

            const notesToDisplay =
              currentPyramid === 'top'
                ? edition.topNotes
                : currentPyramid === 'heart'
                ? edition.heartNotes
                : edition.baseNotes;

            return (
              <article
                key={edition.id}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center ${
                  isEven ? '' : 'lg:flex-row-reverse'
                }`}
              >
                {/* Sculptural Non-Rectangular Visual Composition (7 Cols) */}
                <div
                  className={`lg:col-span-7 relative min-h-[460px] sm:min-h-[540px] flex items-center justify-center ${
                    isEven ? 'lg:order-1' : 'lg:order-2'
                  }`}
                >
                  {/* Edition I: Archway + Floating Fluted Column Oculus */}
                  {edition.architectureStyle === 'arch-overlap' && (
                    <div className="relative w-full max-w-[560px] h-[480px] sm:h-[520px]">
                      <div className="w-[82%] h-full p-1.5 bg-gradient-to-b from-[#F26B8A] via-[#F0A824] to-[#092129] clip-arch shadow-[0_30px_80px_rgba(0,0,0,0.8)]">
                        <div className="w-full h-full clip-arch overflow-hidden relative bg-[#051216]">
                          <img
                            src={isRevealed ? edition.secondaryImage : edition.image}
                            alt={edition.name}
                            className="w-full h-full object-cover transition-all duration-1000 hover:scale-108"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#051216]/85 via-transparent to-transparent" />
                        </div>
                      </div>
                      {/* Overlapping Zoomed Bust & Pink Column Medallion */}
                      <div className="absolute right-0 -bottom-4 w-52 sm:w-64 h-64 sm:h-72 p-1.5 bg-gradient-to-tr from-[#F0A824] to-[#F26B8A] clip-octagon-ornate shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-float-gentle">
                        <div
                          className="w-full h-full clip-octagon-ornate bg-[#051216]"
                          style={{
                            backgroundImage: `url(${edition.image})`,
                            backgroundPosition: edition.imageCrop,
                            backgroundSize: '300%',
                          }}
                        />
                        <span className="absolute bottom-3 inset-x-0 text-center font-mono-tech text-[9px] uppercase tracking-[0.2em] text-[#F5EFE4] bg-[#051216]/80 py-1">
                          SOCLE ROSE · DÉTAIL 3×
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Edition II: Vesuvian Pediment + Erupting Coral Plume Shard */}
                  {edition.architectureStyle === 'vesuvian-triptych' && (
                    <div className="relative w-full max-w-[560px] h-[480px] sm:h-[520px]">
                      <div className="ml-auto w-[84%] h-full p-1.5 bg-gradient-to-b from-[#F0A824] via-[#F26B8A] to-[#051216] clip-pediment shadow-[0_30px_80px_rgba(0,0,0,0.85)]">
                        <div className="w-full h-full clip-pediment overflow-hidden relative bg-[#051216]">
                          <img
                            src={isRevealed ? edition.secondaryImage : edition.image}
                            alt={edition.name}
                            className="w-full h-full object-cover transition-all duration-1000 hover:scale-108"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#051216]/85 via-transparent to-transparent" />
                        </div>
                      </div>
                      {/* Left Floating Urn & Manuscript Cutout */}
                      <div className="absolute left-0 bottom-6 w-48 sm:w-60 h-60 sm:h-68 p-1.5 bg-gradient-to-b from-[#F26B8A] to-[#F0A824] clip-arch shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-float-counter">
                        <div
                          className="w-full h-full clip-arch bg-[#051216]"
                          style={{
                            backgroundImage: `url(${edition.image})`,
                            backgroundPosition: '38% 68%',
                            backgroundSize: '290%',
                          }}
                        />
                        <span className="absolute bottom-3 inset-x-0 text-center font-mono-tech text-[9px] uppercase tracking-[0.2em] text-[#F7D58B] bg-[#051216]/80 py-1">
                          ÉPHÈBE & TOMES D’OR
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Edition III: River Valley Cascading Diagonal Diptych */}
                  {edition.architectureStyle === 'river-diptych' && (
                    <div className="relative w-full max-w-[580px] h-[480px] sm:h-[520px] grid grid-cols-12 gap-3 items-center">
                      <div className="col-span-7 h-[92%] p-1.5 bg-gradient-to-b from-[#38BDF8] via-[#F0A824] to-[#092129] clip-river-slice-left shadow-2xl transform -translate-y-3 transition-transform duration-500 hover:-translate-y-5">
                        <div className="w-full h-full clip-river-slice-left overflow-hidden relative">
                          <img
                            src={isRevealed ? edition.secondaryImage : edition.image}
                            alt={edition.name}
                            className="w-full h-full object-cover object-left scale-110"
                          />
                        </div>
                      </div>
                      <div className="col-span-5 h-[88%] p-1.5 bg-gradient-to-t from-[#F26B8A] via-[#F0A824] to-[#38BDF8] clip-river-slice-right shadow-2xl transform translate-y-4 transition-transform duration-500 hover:translate-y-6">
                        <div
                          className="w-full h-full clip-river-slice-right"
                          style={{
                            backgroundImage: `url(${edition.image})`,
                            backgroundPosition: '76% 48%',
                            backgroundSize: '280%',
                          }}
                        />
                      </div>
                      {/* Central Golden Seal */}
                      <div className="absolute left-[54%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full p-1 bg-gradient-to-r from-[#F0A824] to-[#F26B8A] shadow-[0_0_40px_rgba(240,168,36,0.6)]">
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            backgroundImage: `url(${edition.image})`,
                            backgroundPosition: '22% 84%',
                            backgroundSize: '340%',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Edition IV: Starry Naos Keyhole Portal */}
                  {edition.architectureStyle === 'naos-keyhole' && (
                    <div className="relative w-full max-w-[560px] h-[490px] sm:h-[540px] flex items-center justify-center">
                      <div className="w-[86%] h-full p-1.5 bg-gradient-to-b from-[#F0A824] via-[#FF6B35] to-[#F26B8A] clip-keyhole shadow-[0_30px_90px_rgba(240,168,36,0.3)]">
                        <div className="w-full h-full clip-keyhole overflow-hidden relative bg-[#051216]">
                          <img
                            src={isRevealed ? edition.secondaryImage : edition.image}
                            alt={edition.name}
                            className="w-full h-full object-cover transition-all duration-1000 hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#051216]/90 via-transparent to-transparent" />
                        </div>
                      </div>
                      <div className="absolute -left-2 top-8 w-44 h-44 rounded-full p-1 bg-gradient-to-tr from-[#F0A824] to-[#F26B8A] shadow-2xl animate-float-gentle">
                        <div
                          className="w-full h-full rounded-full"
                          style={{
                            backgroundImage: `url(${edition.image})`,
                            backgroundPosition: '50% 24%',
                            backgroundSize: '320%',
                          }}
                        />
                        <span className="absolute bottom-2 inset-x-0 text-center font-mono-tech text-[8px] uppercase tracking-[0.2em] text-[#F7D58B] bg-[#051216]/80 py-0.5">
                          FRONTON CÉLESTE
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Floating Counter-World Toggle Button on every Sculpture */}
                  <button
                    type="button"
                    onClick={() => toggleReveal(edition.id)}
                    className="absolute top-4 right-4 z-30 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#051216]/90 border border-[#F0A824]/60 text-[11px] font-mono-tech uppercase tracking-[0.16em] text-[#F7D58B] hover:bg-[#F0A824] hover:text-[#051216] transition-all cursor-pointer backdrop-blur-md"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{isRevealed ? 'Retour au Tableau Source' : 'Croiser le Contre-Monde'}</span>
                  </button>
                </div>

                {/* Editorial Monograph & Bespoke Flacon Atelier (5 Cols) */}
                <div
                  className={`lg:col-span-5 space-y-6 ${
                    isEven ? 'lg:order-2' : 'lg:order-1'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-[#F0A824]/25 pb-3">
                    <span className="font-mono-tech text-xs uppercase tracking-[0.25em] text-[#F0A824]">
                      {edition.numeral} · {edition.category}
                    </span>
                    <span className="font-mono-tech text-xs text-[#F26B8A]">
                      {edition.allocationCount}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-display text-3xl sm:text-4xl text-[#F5EFE4] tracking-wide">
                      {edition.name}
                    </h3>
                    <p className="font-editorial italic text-xl text-[#F7D58B] mt-1">
                      {edition.subtitle}
                    </p>
                  </div>

                  <p className="text-[#C5BCA8] text-base leading-relaxed font-light">
                    {edition.story}
                  </p>

                  {/* Olfactory Architecture Tabs */}
                  <div className="p-5 rounded-2xl bg-[#092129]/85 border border-[#F0A824]/25 space-y-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono-tech uppercase tracking-[0.2em] text-[#C5BCA8] flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-[#F0A824]" />
                        Pyramide Alchimique
                      </span>
                      <div className="inline-flex rounded-full bg-[#051216] p-0.5 border border-[#F5EFE4]/10">
                        {(['top', 'heart', 'base'] as const).map((tier) => (
                          <button
                            key={tier}
                            type="button"
                            onClick={() => {
                              setActiveNoteTab((prev) => ({ ...prev, [edition.id]: tier }));
                              soundscape.playChime(tier === 'top' ? 660 : tier === 'heart' ? 528 : 396, 0.9);
                            }}
                            className={`px-3 py-1 rounded-full text-[10px] font-mono-tech uppercase tracking-wider transition-all cursor-pointer ${
                              currentPyramid === tier
                                ? 'bg-[#F0A824] text-[#051216] font-semibold'
                                : 'text-[#C5BCA8] hover:text-[#F5EFE4]'
                            }`}
                          >
                            {tier === 'top' ? 'Tête' : tier === 'heart' ? 'Cœur' : 'Fond'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {notesToDisplay.map((note) => (
                        <span
                          key={note}
                          className="px-3 py-1.5 rounded-full text-xs font-editorial italic bg-[#051216]/90 border border-[#F26B8A]/35 text-[#F5EFE4]"
                        >
                          ✦ {note}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-[#F5EFE4]/10 text-[11px] font-mono-tech text-[#C5BCA8]">
                      <span className="text-[#F0A824]">Architecture du Vaisseau : </span>
                      {edition.vesselMaterial}
                    </div>
                  </div>

                  {/* Interactive Brass Seal Engraving Input */}
                  <div className="p-4 rounded-2xl bg-[#051216]/90 border border-[#F5EFE4]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Stamp className="w-4 h-4 text-[#F26B8A] shrink-0" />
                      <div>
                        <label
                          htmlFor={`engrave-${edition.id}`}
                          className="block text-[10px] font-mono-tech uppercase tracking-[0.2em] text-[#C5BCA8]"
                        >
                          Gravure sur Cartouche de Laiton (Max 14 Car.)
                        </label>
                        <input
                          id={`engrave-${edition.id}`}
                          type="text"
                          maxLength={14}
                          value={currentEngraving}
                          onChange={(e) =>
                            setEngravings((prev) => ({
                              ...prev,
                              [edition.id]: e.target.value.toUpperCase(),
                            }))
                          }
                          className="mt-1 bg-transparent border-b border-[#F0A824]/50 focus:border-[#F26B8A] outline-none font-mono-tech text-xs tracking-[0.24em] text-[#F7D58B] uppercase w-44"
                        />
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded border border-[#F0A824]/40 bg-[#092129] font-display text-xs tracking-[0.22em] text-[#F7D58B] text-center">
                      « {currentEngraving || 'ELYSIAN'} »
                    </div>
                  </div>

                  {/* Price & Allocation CTA */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <div>
                      <div className="font-display text-3xl text-[#F5EFE4]">
                        {edition.priceFormatted}
                      </div>
                      <div className="font-mono-tech text-[11px] text-[#C5BCA8] tracking-widest">
                        {edition.volume} · SCELLÉ À LA MAIN
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onAcquireEdition(edition, currentEngraving || 'ELYSIAN')}
                      className="inline-flex items-center gap-3 px-7 py-4 rounded-full bg-gradient-to-r from-[#F0A824] to-[#F26B8A] text-[#051216] font-mono-tech text-xs font-bold uppercase tracking-[0.2em] shadow-[0_15px_40px_rgba(242,107,138,0.3)] hover:scale-[1.02] transition-all cursor-pointer"
                    >
                      <ShoppingBag className="w-4 h-4" />
                      <span>Inscrire à la Malle</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
