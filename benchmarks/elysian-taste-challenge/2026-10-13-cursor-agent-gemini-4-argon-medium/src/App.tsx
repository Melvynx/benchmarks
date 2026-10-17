import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Volume2,
  VolumeX,
  ShoppingBag,
  X,
  Trash2,
  Check,
  Compass,
} from 'lucide-react';
import { SurrealStageHero } from './components/SurrealStageHero';
import { RelicAnatomyStage } from './components/RelicAnatomyStage';
import { EditionsGallery } from './components/EditionsGallery';
import { AlchemicalOracle, CustomMonograph } from './components/AlchemicalOracle';
import { NaosThreshold } from './components/NaosThreshold';
import {
  ELYSIAN_EDITIONS,
  ELYSIAN_IMAGES,
  AlchemicalRelic,
  ElysianEdition,
} from './data/elysianWorld';
import { soundscape } from './utils/soundscape';

interface TrunkItem {
  uid: string;
  title: string;
  subtitle: string;
  engraving?: string;
  price: number;
  image: string;
}

export function App() {
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [trunkOpen, setTrunkOpen] = useState<boolean>(false);
  const [trunkItems, setTrunkItems] = useState<TrunkItem[]>([
    {
      uid: 'initial-marbre',
      title: ELYSIAN_EDITIONS[0].name,
      subtitle: ELYSIAN_EDITIONS[0].subtitle,
      engraving: 'MARMOR VII',
      price: ELYSIAN_EDITIONS[0].price,
      image: ELYSIAN_EDITIONS[0].image,
    },
  ]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trunkSealed, setTrunkSealed] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'Gemini 4 Argon';
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  };

  const handleToggleAudio = () => {
    const next = soundscape.toggle();
    setAudioEnabled(next);
    showToast(
      next
        ? 'Harmonium d’Orphée activé · Résonances cristallines'
        : 'Harmonium d’Orphée mis en silence'
    );
  };

  const handleAddRelicEssence = (relic: AlchemicalRelic) => {
    const newItem: TrunkItem = {
      uid: `relic-${relic.id}-${Date.now()}`,
      title: `Fiole d’Archive · ${relic.name}`,
      subtitle: relic.olfactoryNote,
      engraving: `FRAGMENT ${relic.number}`,
      price: 140,
      image: relic.sourceUrl,
    };
    setTrunkItems((prev) => [...prev, newItem]);
    setTrunkSealed(false);
    showToast(`Essence « ${relic.name} » déposée dans la Malle`);
  };

  const handleAcquireEdition = (edition: ElysianEdition, engraving: string) => {
    const newItem: TrunkItem = {
      uid: `edition-${edition.id}-${Date.now()}`,
      title: `${edition.numeral} · ${edition.name}`,
      subtitle: edition.volume,
      engraving,
      price: edition.price,
      image: edition.image,
    };
    setTrunkItems((prev) => [...prev, newItem]);
    setTrunkSealed(false);
    setTrunkOpen(true);
    soundscape.playChime(639, 1.5);
  };

  const handleSaveMonograph = (monograph: CustomMonograph) => {
    const newItem: TrunkItem = {
      uid: monograph.id,
      title: monograph.title,
      subtitle: monograph.motto,
      engraving: 'ORACLE UNIQUE',
      price: monograph.price,
      image: ELYSIAN_IMAGES.temple,
    };
    setTrunkItems((prev) => [...prev, newItem]);
    setTrunkSealed(false);
    setTrunkOpen(true);
    soundscape.playChime(852, 1.7);
  };

  const removeItem = (uid: string) => {
    setTrunkItems((prev) => prev.filter((item) => item.uid !== uid));
  };

  const totalAmount = trunkItems.reduce((acc, item) => acc + item.price, 0);

  return (
    <div className="min-h-screen bg-[#051216] text-[#F5EFE4] surreal-noise relative selection:bg-[#F26B8A] selection:text-[#051216]">
      {/* Top Floating Curatorial Navigation Bar */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-[#F0A824]/25 bg-[#051216]/85 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-14 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Crest */}
          <a
            href="#"
            className="flex items-center gap-3 group"
            aria-label="Maison Elysian"
          >
            <div className="w-9 h-9 rounded-full p-0.5 bg-gradient-to-tr from-[#F0A824] via-[#F26B8A] to-[#38BDF8] flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#051216] flex items-center justify-center font-display text-xs text-[#F7D58B] font-bold">
                E
              </div>
            </div>
            <div>
              <span className="font-display text-base sm:text-lg tracking-[0.26em] text-[#F5EFE4] block leading-none">
                ELYSIAN
              </span>
              <span className="font-mono-tech text-[9px] tracking-[0.22em] text-[#F0A824] block mt-0.5">
                PAROS · NEAPOLIS · ASTRUM
              </span>
            </div>
          </a>

          {/* Chapter Links */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-mono-tech uppercase tracking-[0.2em] text-[#C5BCA8]">
            <a
              href="#cabinet-des-fragments"
              className="hover:text-[#F0A824] transition-colors"
            >
              I. Fragments
            </a>
            <a
              href="#collections-extraits"
              className="hover:text-[#F26B8A] transition-colors"
            >
              II. Les Quatre Éditions
            </a>
            <a
              href="#oracle-alchimie"
              className="hover:text-[#38BDF8] transition-colors"
            >
              III. L’Oracle
            </a>
            <a
              href="#seuil-du-naos"
              className="hover:text-[#F7D58B] transition-colors"
            >
              IV. Le Naos
            </a>
          </nav>

          {/* Right Utilities: Audio Harmonium + Malle de Curiosités */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={handleToggleAudio}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full border text-[11px] font-mono-tech uppercase tracking-wider transition-all cursor-pointer ${
                audioEnabled
                  ? 'border-[#F0A824] bg-[#F0A824]/20 text-[#F7D58B]'
                  : 'border-[#F5EFE4]/15 bg-[#092129]/70 text-[#C5BCA8] hover:border-[#F0A824]/40'
              }`}
              title="Activer ou couper les résonances sonores"
            >
              {audioEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-[#F0A824]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">
                {audioEnabled ? 'Harmonium Actif' : 'Son Astral'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTrunkOpen(true)}
              className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-gradient-to-r from-[#F0A824] to-[#F26B8A] text-[#051216] font-mono-tech text-xs font-bold uppercase tracking-[0.16em] cursor-pointer shadow-[0_0_25px_rgba(240,168,36,0.35)] hover:brightness-110 transition-all"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Malle ({trunkItems.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full bg-[#092129] border border-[#F0A824] text-xs font-mono-tech text-[#F7D58B] shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
          <Sparkles className="w-4 h-4 text-[#F26B8A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Experience */}
      <main>
        <SurrealStageHero
          onExploreRelics={() => {
            document
              .getElementById('cabinet-des-fragments')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
          onOpenOracle={() => {
            document
              .getElementById('oracle-alchimie')
              ?.scrollIntoView({ behavior: 'smooth' });
          }}
        />

        {/* Editorial Surrealist Ribbon Divider */}
        <div className="border-y border-[#F0A824]/25 bg-[#071920]/90 py-4 px-4 overflow-hidden">
          <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-around gap-6 text-xs font-mono-tech uppercase tracking-[0.26em] text-[#F7D58B]">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F26B8A]" />
              POUDRE DE MARBRE DE PAROS
            </span>
            <span className="text-[#F0A824]/50">✦</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#F0A824]" />
              FUMÉE CORAIL DU VÉSUVE
            </span>
            <span className="text-[#F0A824]/50">✦</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
              TORRENT D’AZUR & PRAIRIE SAFRAN
            </span>
            <span className="text-[#F0A824]/50">✦</span>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#FF6B35]" />
              NAOS AUX SIX COLONNES D’OR
            </span>
          </div>
        </div>

        <RelicAnatomyStage onAddRelicEssence={handleAddRelicEssence} />

        <EditionsGallery onAcquireEdition={handleAcquireEdition} />

        <AlchemicalOracle onSaveMonograph={handleSaveMonograph} />

        <NaosThreshold />
      </main>

      {/* Private Allocation Trunk Drawer ("Malle de Curiosités") */}
      {trunkOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#06161C] border-l border-[#F0A824]/40 h-full flex flex-col justify-between p-6 sm:p-8 shadow-2xl">
            <div className="space-y-6 overflow-y-auto pr-1">
              <div className="flex items-center justify-between border-b border-[#F0A824]/25 pb-4">
                <div>
                  <span className="text-[10px] font-mono-tech uppercase tracking-[0.24em] text-[#F26B8A]">
                    ALLOCATION PRIVÉE · MAISON ELYSIAN
                  </span>
                  <h3 className="font-display text-2xl text-[#F5EFE4] mt-0.5">
                    Malle de Curiosités
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setTrunkOpen(false)}
                  className="p-2 rounded-full border border-[#F5EFE4]/15 text-[#C5BCA8] hover:text-[#F5EFE4] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {trunkItems.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <Compass className="w-10 h-10 text-[#F0A824]/50 mx-auto" />
                  <p className="font-editorial italic text-xl text-[#C5BCA8]">
                    Votre Malle attend sa première relique olfactive.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {trunkItems.map((item) => (
                    <div
                      key={item.uid}
                      className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[#092129]/90 border border-[#F0A824]/25"
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-14 h-16 rounded-xl object-cover border border-[#F0A824]/40 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-editorial text-lg text-[#F5EFE4] truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#C5BCA8] truncate">{item.subtitle}</div>
                        {item.engraving && (
                          <div className="inline-block mt-1 px-2 py-0.5 rounded bg-[#051216] border border-[#F0A824]/40 font-mono-tech text-[9px] tracking-[0.2em] text-[#F7D58B]">
                            SCEAU : « {item.engraving} »
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-mono-tech text-sm font-semibold text-[#F0A824]">
                          €{item.price}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.uid)}
                          className="mt-1 text-[#C5BCA8] hover:text-[#F26B8A] cursor-pointer"
                          title="Retirer de la malle"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trunkItems.length > 0 && (
              <div className="pt-5 border-t border-[#F0A824]/25 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tech text-xs uppercase tracking-[0.2em] text-[#C5BCA8]">
                    TOTAL DE L’ALLOCATION
                  </span>
                  <span className="font-display text-2xl text-[#F7D58B]">€{totalAmount}</span>
                </div>

                {!trunkSealed ? (
                  <button
                    type="button"
                    onClick={() => {
                      setTrunkSealed(true);
                      soundscape.playChime(852, 1.8);
                    }}
                    className="w-full py-4 rounded-full bg-gradient-to-r from-[#F0A824] via-[#F7D58B] to-[#F26B8A] text-[#051216] font-mono-tech text-xs font-bold uppercase tracking-[0.2em] cursor-pointer shadow-lg"
                  >
                    Sceller la Malle à la Cire Rose
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-[#092129] border border-[#F0A824] text-center space-y-1">
                    <div className="inline-flex items-center gap-1.5 text-xs font-mono-tech text-[#F0A824]">
                      <Check className="w-4 h-4" />
                      <span>MALLE N° MMXXVI-VIII SCELLÉE</span>
                    </div>
                    <p className="font-editorial italic text-sm text-[#C5BCA8]">
                      Nos maîtres-ciriers préparent vos flacons gravés.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Architectural Colophon Footer */}
      <footer className="border-t border-[#F0A824]/25 bg-[#040E11] py-16 px-4 sm:px-8 lg:px-14">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div className="space-y-2">
            <div className="font-display text-2xl tracking-[0.28em] text-[#F5EFE4]">
              MAISON ELYSIAN
            </div>
            <p className="font-editorial italic text-lg text-[#C5BCA8]">
              Haute Alchimie Olfactive, Statuaire Paradoxale & Paysages de Rêve.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              ELYSIAN_IMAGES.stillLife,
              ELYSIAN_IMAGES.scholarly,
              ELYSIAN_IMAGES.valley,
              ELYSIAN_IMAGES.temple,
            ].map((imgUrl, idx) => (
              <div
                key={imgUrl}
                className="w-14 h-14 p-0.5 bg-gradient-to-tr from-[#F0A824] to-[#F26B8A] clip-octagon-ornate"
              >
                <img
                  src={imgUrl}
                  alt={`Planche ${idx + 1}`}
                  className="w-full h-full object-cover clip-octagon-ornate"
                />
              </div>
            ))}
          </div>

          <div className="text-xs font-mono-tech text-[#C5BCA8] tracking-[0.18em] space-y-1 md:text-right">
            <div className="text-[#F7D58B]">CODEX SURRÉALISTE · MMXXVI</div>
            <div>PAROS · NEAPOLIS · HYPERBOREA · DELPHI</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
export default App;
