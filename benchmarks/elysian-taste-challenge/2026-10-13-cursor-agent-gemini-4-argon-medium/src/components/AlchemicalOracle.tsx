import React, { useState } from 'react';
import { Compass, Sparkles, Wand2, Shuffle, PlusCircle } from 'lucide-react';
import { ELYSIAN_IMAGES } from '../data/elysianWorld';
import { soundscape } from '../utils/soundscape';

export interface CustomMonograph {
  id: string;
  title: string;
  motto: string;
  horizonName: string;
  relicName: string;
  price: number;
}

interface AlchemicalOracleProps {
  onSaveMonograph: (monograph: CustomMonograph) => void;
}

const HORIZONS = [
  {
    id: 'valley',
    name: 'Vallée d’Or Hyperboréenne',
    image: ELYSIAN_IMAGES.valley,
    latin: 'CAMPUS AUREUS',
    accord: 'Sève de Safran & Torrent d’Azur',
  },
  {
    id: 'temple',
    name: 'Naos Étoilé de Corinthe',
    image: ELYSIAN_IMAGES.temple,
    latin: 'NOCTIS TEMPLUM',
    accord: 'Ambre Illuminé & Badiane Sidérale',
  },
  {
    id: 'scholarly',
    name: 'Éruption Rose du Vésuve',
    image: ELYSIAN_IMAGES.scholarly,
    latin: 'MONS ROSEUS',
    accord: 'Cendre de Corail & Vélin Ancien',
  },
] as const;

const FOREGROUND_RELICS = [
  {
    id: 'bust-column',
    name: 'Buste de Paros & Colonne Rose',
    image: ELYSIAN_IMAGES.stillLife,
    cropPos: '83% 44%',
    latin: 'STATUA INCARNATA',
    note: 'Poudre de Marbre & Poivre Rose',
  },
  {
    id: 'gilded-frame',
    name: 'Cadre Boréal & Amphore Bleue',
    image: ELYSIAN_IMAGES.stillLife,
    cropPos: '22% 56%',
    latin: 'SPECULUM CAERULEUM',
    note: 'Iris Cobalt & Pin Glaciaire',
  },
  {
    id: 'scholar-ephebe',
    name: 'Éphèbe aux Tomes Jaunes',
    image: ELYSIAN_IMAGES.scholarly,
    cropPos: '42% 64%',
    latin: 'LECTOR AETERNUS',
    note: 'Rose de Damas & Cire d’Or',
  },
] as const;

export const AlchemicalOracle: React.FC<AlchemicalOracleProps> = ({ onSaveMonograph }) => {
  const [horizonIndex, setHorizonIndex] = useState<number>(0);
  const [relicIndex, setRelicIndex] = useState<number>(0);
  const [solarGravity, setSolarGravity] = useState<number>(58);
  const [coralEruption, setCoralEruption] = useState<number>(44);
  const [apertureShape, setApertureShape] = useState<'arch' | 'octagon' | 'keyhole'>('arch');

  const horizon = HORIZONS[horizonIndex];
  const relic = FOREGROUND_RELICS[relicIndex];

  const synthesizedTitle = `Extrait « ${horizon.latin} × ${relic.latin} »`;
  const synthesizedMotto = `${horizon.accord} · ${relic.note}`;

  const randomizeOracle = () => {
    setHorizonIndex(Math.floor(Math.random() * HORIZONS.length));
    setRelicIndex(Math.floor(Math.random() * FOREGROUND_RELICS.length));
    setSolarGravity(Math.floor(25 + Math.random() * 65));
    setCoralEruption(Math.floor(20 + Math.random() * 70));
    const shapes: ('arch' | 'octagon' | 'keyhole')[] = ['arch', 'octagon', 'keyhole'];
    setApertureShape(shapes[Math.floor(Math.random() * shapes.length)]);
    soundscape.playChime(741, 1.6);
  };

  const shapeClass =
    apertureShape === 'arch'
      ? 'clip-arch'
      : apertureShape === 'octagon'
      ? 'clip-octagon-ornate'
      : 'clip-keyhole';

  return (
    <section
      id="oracle-alchimie"
      className="relative py-24 md:py-32 px-4 sm:px-8 lg:px-14 border-t border-[#F0A824]/20 bg-gradient-to-b from-[#051216] via-[#092129] to-[#051216]"
    >
      <div className="max-w-[1440px] mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase tracking-[0.26em] text-[#F26B8A]">
              <Compass className="w-3.5 h-3.5" />
              <span>CHAPITRE III · SYNTHÉTISEUR DE COLLAGE & DIVINATION OLFACTIVE</span>
            </div>
            <h2 className="font-display text-3xl sm:text-5xl text-[#F5EFE4]">
              L’Oracle de Surréalité
            </h2>
            <p className="font-editorial italic text-xl sm:text-2xl text-[#C5BCA8]">
              Superposez les quatre mondes d’Elysian pour forger votre propre planche de collage et
              sa formule d’extrait sur-mesure.
            </p>
          </div>

          <button
            type="button"
            onClick={randomizeOracle}
            className="self-start md:self-auto inline-flex items-center gap-2.5 px-5 py-3 rounded-full border border-[#F26B8A]/60 bg-[#051216] text-[#F26B8A] hover:bg-[#F26B8A] hover:text-[#051216] font-mono-tech text-xs uppercase tracking-[0.2em] transition-all cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Tirer l’Oracle au Sort</span>
          </button>
        </div>

        {/* Interactive Collage Synthesizer Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Controls Column (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 p-6 sm:p-8 rounded-3xl border border-[#F0A824]/30 bg-[#051216]/90 shadow-2xl">
            {/* 1. Horizon Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-mono-tech uppercase tracking-[0.2em] text-[#F0A824]">
                I. Horizon Cosmologique (Arrière-Plan)
              </label>
              <div className="grid grid-cols-1 gap-2">
                {HORIZONS.map((h, idx) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      setHorizonIndex(idx);
                      soundscape.playChime(432 + idx * 80, 1.0);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      horizonIndex === idx
                        ? 'border-[#F0A824] bg-[#0E2E38] text-[#F5EFE4]'
                        : 'border-[#F5EFE4]/10 bg-[#092129]/40 text-[#C5BCA8] hover:border-[#F0A824]/40'
                    }`}
                  >
                    <div>
                      <div className="font-editorial text-lg font-medium">{h.name}</div>
                      <div className="font-mono-tech text-[10px] text-[#F7D58B]/80">{h.accord}</div>
                    </div>
                    <img
                      src={h.image}
                      alt={h.name}
                      className="w-12 h-10 rounded-lg object-cover border border-[#F0A824]/40"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Relic Cutout Selector */}
            <div className="space-y-2.5">
              <label className="block text-xs font-mono-tech uppercase tracking-[0.2em] text-[#F26B8A]">
                II. Relique Sculpturale Superposée
              </label>
              <div className="grid grid-cols-1 gap-2">
                {FOREGROUND_RELICS.map((r, idx) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRelicIndex(idx);
                      soundscape.playChime(528 + idx * 70, 1.0);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      relicIndex === idx
                        ? 'border-[#F26B8A] bg-[#0E2E38] text-[#F5EFE4]'
                        : 'border-[#F5EFE4]/10 bg-[#092129]/40 text-[#C5BCA8] hover:border-[#F26B8A]/40'
                    }`}
                  >
                    <div>
                      <div className="font-editorial text-lg font-medium">{r.name}</div>
                      <div className="font-mono-tech text-[10px] text-[#F26B8A]">{r.note}</div>
                    </div>
                    <div
                      className="w-12 h-10 rounded-lg border border-[#F26B8A]/40"
                      style={{
                        backgroundImage: `url(${r.image})`,
                        backgroundPosition: r.cropPos,
                        backgroundSize: '300%',
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Alchemical Sliders & Geometry */}
            <div className="space-y-4 pt-2 border-t border-[#F5EFE4]/10">
              <div>
                <div className="flex justify-between text-[11px] font-mono-tech text-[#C5BCA8] mb-1">
                  <span>GRAVITÉ SOLAIRE & ORBITE</span>
                  <span className="text-[#F0A824]">{solarGravity}°</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={90}
                  value={solarGravity}
                  onChange={(e) => setSolarGravity(Number(e.target.value))}
                  className="w-full accent-[#F0A824] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-mono-tech text-[#C5BCA8] mb-1">
                  <span>INTENSITÉ DU VOILE CORAIL</span>
                  <span className="text-[#F26B8A]">{coralEruption}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={85}
                  value={coralEruption}
                  onChange={(e) => setCoralEruption(Number(e.target.value))}
                  className="w-full accent-[#F26B8A] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[11px] font-mono-tech text-[#C5BCA8]">GÉOMÉTRIE :</span>
                <div className="flex gap-1.5">
                  {(['arch', 'octagon', 'keyhole'] as const).map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setApertureShape(shape)}
                      className={`px-3 py-1 rounded-full text-[10px] font-mono-tech uppercase cursor-pointer border ${
                        apertureShape === shape
                          ? 'bg-[#F0A824] text-[#051216] border-[#F0A824] font-semibold'
                          : 'border-[#F5EFE4]/20 text-[#C5BCA8]'
                      }`}
                    >
                      {shape === 'arch' ? 'Arche' : shape === 'octagon' ? 'Octogone' : 'Serrure'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mint Custom Monograph Button */}
            <button
              type="button"
              onClick={() =>
                onSaveMonograph({
                  id: `oracle-${Date.now()}`,
                  title: synthesizedTitle,
                  motto: synthesizedMotto,
                  horizonName: horizon.name,
                  relicName: relic.name,
                  price: 590,
                })
              }
              className="w-full flex items-center justify-center gap-2.5 py-4 rounded-full bg-gradient-to-r from-[#F0A824] via-[#F7D58B] to-[#F26B8A] text-[#051216] font-mono-tech text-xs font-bold uppercase tracking-[0.2em] shadow-[0_12px_35px_rgba(240,168,36,0.3)] hover:brightness-110 transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Sceller cette Formule Sur-Mesure (€590)</span>
            </button>
          </div>

          {/* Live Synthesized Surrealist Collage Stage (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="relative w-full max-w-[560px] h-[500px] sm:h-[560px] flex items-center justify-center">
              {/* Rotating Astrolabe Ring controlled by Solar Gravity */}
              <div
                className="pointer-events-none absolute inset-4 rounded-full border border-dashed border-[#F0A824]/45 transition-transform duration-500"
                style={{ transform: `rotate(${solarGravity * 2}deg)` }}
              />

              {/* Primary Horizon Frame */}
              <div
                className={`relative w-[84%] h-[92%] p-2 bg-gradient-to-b from-[#F0A824] via-[#F26B8A] to-[#38BDF8] ${shapeClass} shadow-[0_30px_90px_rgba(0,0,0,0.85)] transition-all duration-700`}
              >
                <div className={`w-full h-full ${shapeClass} overflow-hidden relative bg-[#051216]`}>
                  <img
                    src={horizon.image}
                    alt={horizon.name}
                    className="w-full h-full object-cover transition-all duration-700"
                    style={{
                      transform: `scale(${1 + solarGravity * 0.0025})`,
                    }}
                  />

                  {/* Dynamic Coral & Temple Starry Veil Blend */}
                  <div
                    className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-500"
                    style={{ opacity: coralEruption / 140 }}
                  >
                    <img
                      src={ELYSIAN_IMAGES.temple}
                      alt="Voile Astral"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Overlapping Sculpted Relic Cutout inside the Collage */}
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 sm:w-68 h-68 sm:h-80 p-1.5 bg-gradient-to-tr from-[#F26B8A] via-[#F0A824] to-[#F5EFE4] clip-arch shadow-[0_25px_70px_rgba(0,0,0,0.9)] transition-all duration-500"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${(solarGravity - 50) * 0.18}deg)`,
                    }}
                  >
                    <div
                      className="w-full h-full clip-arch"
                      style={{
                        backgroundImage: `url(${relic.image})`,
                        backgroundPosition: relic.cropPos,
                        backgroundSize: '290%',
                      }}
                    />
                  </div>

                  {/* Bottom Engraved Plate */}
                  <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-[#051216] via-[#051216]/90 to-transparent text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-mono-tech uppercase tracking-[0.24em] text-[#F0A824]">
                      <Wand2 className="w-3 h-3 text-[#F26B8A]" />
                      <span>PLANCHE SYNTHÉTISÉE · ÉDITION UNIQUE</span>
                    </div>
                    <h3 className="font-display text-lg sm:text-xl text-[#F5EFE4]">
                      {synthesizedTitle}
                    </h3>
                    <p className="font-editorial italic text-sm text-[#F7D58B]">
                      {synthesizedMotto}
                    </p>
                  </div>
                </div>
              </div>

              {/* Floating Satellite Shards */}
              <div
                className="hidden sm:block absolute -left-2 bottom-10 w-32 h-32 p-1 bg-gradient-to-br from-[#F0A824] to-[#F26B8A] clip-octagon-ornate shadow-2xl"
                style={{
                  transform: `translateY(${-(solarGravity - 50) * 0.4}px)`,
                }}
              >
                <div
                  className="w-full h-full clip-octagon-ornate"
                  style={{
                    backgroundImage: `url(${ELYSIAN_IMAGES.valley})`,
                    backgroundPosition: '68% 45%',
                    backgroundSize: '320%',
                  }}
                />
              </div>

              <div
                className="hidden sm:block absolute -right-2 top-12 w-32 h-32 p-1 bg-gradient-to-br from-[#F26B8A] to-[#38BDF8] rounded-full shadow-2xl"
                style={{
                  transform: `translateY(${(solarGravity - 50) * 0.4}px)`,
                }}
              >
                <div
                  className="w-full h-full rounded-full"
                  style={{
                    backgroundImage: `url(${ELYSIAN_IMAGES.stillLife})`,
                    backgroundPosition: '56% 66%',
                    backgroundSize: '340%',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
