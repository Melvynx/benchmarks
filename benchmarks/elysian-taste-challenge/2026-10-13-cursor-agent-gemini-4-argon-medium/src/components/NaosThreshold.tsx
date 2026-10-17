import React, { useState } from 'react';
import { Sparkles, KeyRound, CheckCircle2, MapPin, Calendar } from 'lucide-react';
import { ELYSIAN_IMAGES } from '../data/elysianWorld';
import { soundscape } from '../utils/soundscape';

const SANCTUARIES = [
  {
    city: 'PAROS · CYCLADES',
    salon: 'Carrière des Nymphes & Naos Solaire',
    coords: '37° 05′ N · 25° 09′ E',
    note: 'Dégustation au crépuscule parmi les tambours de marbre rose.',
  },
  {
    city: 'PARIS · PLACE DES VOSGES',
    salon: 'Cabinet d’Alchimie & Bibliothèque Rose',
    coords: '48° 51′ N · 02° 21′ E',
    note: 'Consultation privée avec orgue à parfums et manuscrits anciens.',
  },
  {
    city: 'KYOTO · HIGASHIYAMA',
    salon: 'Pavillon du Fleuve d’Orphée',
    coords: '35° 00′ N · 135° 46′ E',
    note: 'Cérémonie nocturne d’encens corinthien et résines d’ambre.',
  },
] as const;

export const NaosThreshold: React.FC = () => {
  const [doorOpenPercent, setDoorOpenPercent] = useState<number>(62);
  const [selectedCity, setSelectedCity] = useState<string>(SANCTUARIES[0].city);
  const [guestName, setGuestName] = useState<string>('');
  const [invitationSealed, setInvitationSealed] = useState<boolean>(false);

  const handleSealInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    setDoorOpenPercent(100);
    setInvitationSealed(true);
    soundscape.playChime(852, 2.0);
  };

  return (
    <section
      id="seuil-du-naos"
      className="relative py-24 md:py-36 px-4 sm:px-8 lg:px-14 border-t border-[#F0A824]/25 overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto space-y-14">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 text-xs font-mono-tech uppercase tracking-[0.26em] text-[#F0A824]">
            <KeyRound className="w-3.5 h-3.5 text-[#F26B8A]" />
            <span>CHAPITRE IV · LE PORTAIL DES SIX COLONNES D’OR</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl text-[#F5EFE4]">
            Franchir le Seuil du Sanctuaire Astral
          </h2>
          <p className="font-editorial italic text-xl sm:text-2xl text-[#C5BCA8]">
            Écartez les portes de la Vallée d’Or pour révéler la cella étoilée du Temple Corinthien
            et solliciter votre clef d’audience privée.
          </p>
        </div>

        {/* Interactive Sliding Temple Threshold Stage */}
        <div className="relative max-w-5xl mx-auto">
          {/* Slider Control Bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#092129]/90 border border-[#F0A824]/35">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono-tech uppercase tracking-[0.2em] text-[#F7D58B]">
                OUVERTURE DU SANCTUAIRE : {doorOpenPercent}%
              </span>
            </div>
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <span className="text-[10px] font-mono-tech text-[#C5BCA8]">JOUR SOLAIRE</span>
              <input
                type="range"
                min={0}
                max={100}
                value={doorOpenPercent}
                onChange={(e) => setDoorOpenPercent(Number(e.target.value))}
                className="w-full accent-[#F0A824] cursor-pointer"
              />
              <span className="text-[10px] font-mono-tech text-[#F26B8A]">MINUIT SIDÉRAL</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setDoorOpenPercent(100);
                  soundscape.playChime(741, 1.4);
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#F0A824] text-[#051216] font-mono-tech text-[10px] font-bold uppercase tracking-wider cursor-pointer"
              >
                Ouvrir Grand le Naos
              </button>
            </div>
          </div>

          {/* Sculpted Pediment Portal Container */}
          <div className="relative h-[480px] sm:h-[580px] w-full p-2 bg-gradient-to-b from-[#F0A824] via-[#F26B8A] to-[#092129] clip-pediment shadow-[0_35px_100px_rgba(0,0,0,0.9)]">
            <div className="relative w-full h-full clip-pediment overflow-hidden bg-[#051216]">
              {/* Inner Sanctum: The Starry Night Golden Temple */}
              <img
                src={ELYSIAN_IMAGES.temple}
                alt="Sanctuaire Étoilé d'Elysian"
                className="w-full h-full object-cover transition-transform duration-1000"
                style={{
                  transform: `scale(${1 + (doorOpenPercent / 100) * 0.08})`,
                }}
              />

              {/* Left Sliding Daytime Valley Door */}
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-1/2 overflow-hidden border-r-2 border-[#F0A824] shadow-[15px_0_40px_rgba(0,0,0,0.85)] transition-transform duration-500 ease-out"
                style={{
                  transform: `translateX(-${doorOpenPercent * 0.92}%)`,
                }}
              >
                <img
                  src={ELYSIAN_IMAGES.valley}
                  alt="Porte Gauche Vallée d'Or"
                  className="w-[200%] max-w-none h-full object-cover object-left"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-[#051216]/60 to-transparent" />
              </div>

              {/* Right Sliding Daytime Valley Door */}
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-1/2 overflow-hidden border-l-2 border-[#F0A824] shadow-[-15px_0_40px_rgba(0,0,0,0.85)] transition-transform duration-500 ease-out"
                style={{
                  transform: `translateX(${doorOpenPercent * 0.92}%)`,
                }}
              >
                <img
                  src={ELYSIAN_IMAGES.valley}
                  alt="Porte Droite Vallée d'Or"
                  className="w-[200%] max-w-none h-full object-cover object-right -translate-x-1/2"
                />
                <div className="absolute inset-0 bg-gradient-to-l from-[#051216]/60 to-transparent" />
              </div>

              {/* Center Sanctuary Invitation Overlay inside the Starry Cella */}
              <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-t from-[#051216]/95 via-[#051216]/45 to-transparent">
                <div className="max-w-xl w-full p-6 sm:p-8 rounded-3xl border border-[#F0A824]/50 bg-[#051216]/85 backdrop-blur-xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] space-y-5">
                  <div className="flex items-center justify-between text-[10px] font-mono-tech uppercase tracking-[0.24em] text-[#F0A824]">
                    <span>CELLA ASTRALE · AUDIENCE SUR INVITATION</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#F26B8A]" />
                  </div>

                  {!invitationSealed ? (
                    <form onSubmit={handleSealInvitation} className="space-y-4">
                      <h3 className="font-editorial text-2xl sm:text-3xl text-[#F5EFE4]">
                        Solliciter une Clef des Salons Elysian
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {SANCTUARIES.map((s) => (
                          <button
                            key={s.city}
                            type="button"
                            onClick={() => setSelectedCity(s.city)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              selectedCity === s.city
                                ? 'border-[#F0A824] bg-[#0E2E38] text-[#F5EFE4]'
                                : 'border-[#F5EFE4]/15 bg-[#092129]/60 text-[#C5BCA8]'
                            }`}
                          >
                            <div className="flex items-center gap-1 text-[10px] font-mono-tech text-[#F0A824]">
                              <MapPin className="w-3 h-3" />
                              <span>{s.city.split(' · ')[0]}</span>
                            </div>
                            <div className="font-editorial text-sm mt-1 line-clamp-1">{s.salon}</div>
                          </button>
                        ))}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          required
                          placeholder="Votre Nom ou Pseudonyme Hermétique..."
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="flex-1 px-4 py-3 rounded-full bg-[#092129] border border-[#F0A824]/40 focus:border-[#F26B8A] outline-none text-xs font-mono-tech text-[#F5EFE4] placeholder:text-[#C5BCA8]/60"
                        />
                        <button
                          type="submit"
                          className="px-6 py-3 rounded-full bg-gradient-to-r from-[#F0A824] to-[#F26B8A] text-[#051216] font-mono-tech text-xs font-bold uppercase tracking-[0.18em] cursor-pointer hover:brightness-110 transition-all"
                        >
                          Graver le Laissez-Passer
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3 text-center py-2">
                      <CheckCircle2 className="w-9 h-9 text-[#F0A824] mx-auto" />
                      <div className="font-mono-tech text-xs uppercase tracking-[0.25em] text-[#F26B8A]">
                        LAISSEZ-PASSER ASTRAL SCELLÉ
                      </div>
                      <h4 className="font-display text-2xl text-[#F5EFE4]">
                        {guestName.toUpperCase()} · {selectedCity}
                      </h4>
                      <p className="font-editorial italic text-lg text-[#C5BCA8]">
                        « Les six colonnes d’ambre s’ouvriront à votre nom lors de la prochaine
                        nouvelle lune. »
                      </p>
                      <button
                        type="button"
                        onClick={() => setInvitationSealed(false)}
                        className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono-tech text-[#F7D58B] underline cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        Modifier le sanctuaire de réception
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
