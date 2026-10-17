import React, { useState } from 'react';
import { Sparkles, KeyRound, CheckCircle2, Compass } from 'lucide-react';
import { ELYSIAN_IMAGES, STILL_LIFE_SPECIMENS } from '../data/elysianWorld';
import { getClipPathByShape } from './ClassicalOrnamentation';
import { harmonics } from '../utils/harmonicAudio';

interface NaosPortalFinaleProps {
  collectedIds: string[];
  onCollectAll: () => void;
}

export const NaosPortalFinale: React.FC<NaosPortalFinaleProps> = ({
  collectedIds,
  onCollectAll,
}) => {
  const [apertureWidth, setApertureWidth] = useState<number>(68); // 35 to 100
  const [patronCipher, setPatronCipher] = useState<string>('');
  const [selectedSanctuaryCity, setSelectedSanctuaryCity] = useState<string>('Athènes · Plaka');
  const [isInitiated, setIsInitiated] = useState<boolean>(false);

  const collectedSpecimens = STILL_LIFE_SPECIMENS.filter((s) => collectedIds.includes(s.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsInitiated(true);
    setApertureWidth(100);
    harmonics.playChime(528, 792, 2.2);
  };

  return (
    <section id="naos" className="naos-portal-section" aria-label="Le Seuil du Naos">
      <div className="section-header-block">
        <div className="section-kicker-row">
          <span className="kicker-num">CHAPITRE V · SANCTUAIRE NOCTURNE &amp; PATRONAGE</span>
          <span className="kicker-line" />
          <span className="kicker-coords">{ELYSIAN_IMAGES.goldenTemple.coordinates}</span>
        </div>
        <div className="section-title-split">
          <h2 className="section-display-title">Le Seuil du Naos</h2>
          <p className="section-editorial-deck">
            Six Corinthian columns of burnished gold support a coral frieze beneath luminous midnight
            clouds. Dilate the sanctuary doorway to step into the star-speckled cella and seal your
            private patronage dossier.
          </p>
        </div>
      </div>

      {/* Interactive Expanding Golden Temple Sanctuary Stage */}
      <div className="naos-architectural-theatre">
        <div className="naos-aperture-controls">
          <label htmlFor="naos-dilation-slider" className="naos-slider-label">
            <KeyRound size={14} />
            <span>Dilatation du Portail Corinthien: {apertureWidth}%</span>
          </label>
          <input
            id="naos-dilation-slider"
            type="range"
            min={38}
            max={100}
            value={apertureWidth}
            onChange={(e) => setApertureWidth(Number(e.target.value))}
            className="brass-range-slider wide"
          />
          <button
            type="button"
            className="btn-open-full-naos"
            onClick={() => {
              setApertureWidth((prev) => (prev < 95 ? 100 : 58));
              harmonics.playChime(660, 990, 1.5);
            }}
          >
            {apertureWidth >= 95 ? 'Resserrer l’Arche' : 'Ouvrir Pleinement le Naos'}
          </button>
        </div>

        <div className="naos-stage-viewport">
          {/* Left & Right Orbiting Moon Fragments from Valley & Volcano */}
          <div
            className="naos-moon-fragment moon-left"
            style={{
              clipPath: getClipPathByShape('vesica'),
              backgroundImage: `url(${ELYSIAN_IMAGES.mountainValley.url}), url(${ELYSIAN_IMAGES.mountainValley.fallback})`,
              backgroundPosition: '50% 40%',
              backgroundSize: '230%',
              transform: `translateX(${(100 - apertureWidth) * 0.25}px)`,
            }}
            title="Fragment d’Arcadie"
          />

          <div
            className="naos-moon-fragment moon-right"
            style={{
              clipPath: getClipPathByShape('vesica'),
              backgroundImage: `url(${ELYSIAN_IMAGES.scholarlyLandscape.url}), url(${ELYSIAN_IMAGES.scholarlyLandscape.fallback})`,
              backgroundPosition: '76% 32%',
              backgroundSize: '240%',
              transform: `translateX(${(apertureWidth - 100) * 0.25}px)`,
            }}
            title="Fragment Vésuvien"
          />

          {/* Central Expanding Pediment & Sanctuary Arch */}
          <div
            className="naos-central-sanctuary"
            style={{
              width: `${apertureWidth}%`,
              clipPath: getClipPathByShape('pediment'),
            }}
          >
            <img
              src={ELYSIAN_IMAGES.goldenTemple.url}
              onError={(e) => {
                const target = e.currentTarget;
                if (target.src !== window.location.origin + ELYSIAN_IMAGES.goldenTemple.fallback) {
                  target.src = ELYSIAN_IMAGES.goldenTemple.fallback;
                }
              }}
              alt="Le Naos des Étoiles — Golden Corinthian Temple Under Starry Sky"
              className="naos-temple-img"
              style={{
                transform: `scale(${1.02 + (apertureWidth - 50) * 0.0025})`,
              }}
            />

            {/* Starry Cella Inner Glow Overlay */}
            <div className="naos-cosmic-overlay">
              <div className="naos-cella-inscription">
                <span className="cella-kicker">PORTA SIDEREA · MMXXVI</span>
                <h3 className="cella-headline">
                  « Là où s’arrêtent les colonnes d’or commence la nuit navigable. »
                </h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Private Monograph & Patronage Ledger */}
      <div className="monograph-ledger-grid">
        {/* Left: Collected Specimens Reliquary */}
        <div className="ledger-reliquary-box">
          <div className="ledger-box-header">
            <div>
              <span className="ledger-kicker">INVENTAIRE D’EXCAVATION</span>
              <h3 className="ledger-title">
                Votre Monographe Personnel ({collectedSpecimens.length}/6)
              </h3>
            </div>
            {collectedSpecimens.length < 6 && (
              <button
                type="button"
                onClick={() => {
                  onCollectAll();
                  harmonics.playChime(587.33, 880, 1.4);
                }}
                className="btn-collect-all-mini"
              >
                <Sparkles size={13} />
                <span>Réunir les 6 Spécimens</span>
              </button>
            )}
          </div>

          <div className="ledger-specimens-grid">
            {STILL_LIFE_SPECIMENS.map((spec) => {
              const isUnlocked = collectedIds.includes(spec.id);
              return (
                <div
                  key={spec.id}
                  className={`ledger-specimen-slot ${isUnlocked ? 'unlocked' : 'locked'}`}
                >
                  <div
                    className="slot-medallion"
                    style={{
                      clipPath: getClipPathByShape(spec.maskShape),
                      backgroundImage: `url(${ELYSIAN_IMAGES.stillLife.url}), url(${ELYSIAN_IMAGES.stillLife.fallback})`,
                      backgroundPosition: `${spec.cropX}% ${spec.cropY}%`,
                      backgroundSize: `${spec.cropScale}%`,
                    }}
                  />
                  <div className="slot-meta">
                    <span className="slot-num">N° {spec.number}</span>
                    <span className="slot-name">{spec.title}</span>
                    <span className="slot-status">
                      {isUnlocked ? '✦ Scellé' : 'En attente d’excavation'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Private Patronage Invocation Form */}
        <div className="ledger-patronage-box">
          <span className="ledger-kicker">SALON PRIVÉ · INVOCATION</span>
          <h3 className="ledger-title">Recevoir le Coffret d’Archives</h3>
          <p className="ledger-prose">
            Inscribe your cipher to reserve a numbered monograph folio accompanied by the four glass
            extraits of Maison Elysian.
          </p>

          {isInitiated ? (
            <div className="patronage-confirmation-card" role="status">
              <CheckCircle2 size={28} className="confirm-icon" />
              <h4 className="confirm-heading">
                Inscription Scellée sous le Naos ({selectedSanctuaryCity})
              </h4>
              <p className="confirm-detail">
                Chiffre du Patron: <strong>{patronCipher || 'INITIÉ ANONYME N° 07'}</strong> ·{' '}
                {collectedSpecimens.length || 6} reliques archivées.
              </p>
              <button
                type="button"
                className="btn-elysian-ghost small"
                onClick={() => setIsInitiated(false)}
              >
                Modifier l’Inscription
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="patronage-form">
              <div className="form-field">
                <label htmlFor="patron-cipher-input">NOM OU CHIFFRE D’ARCHIVISTE</label>
                <input
                  id="patron-cipher-input"
                  type="text"
                  placeholder="ex. Hypatia d’Alexandrie / M.V."
                  value={patronCipher}
                  onChange={(e) => setPatronCipher(e.target.value)}
                  className="elysian-text-input"
                />
              </div>

              <div className="form-field">
                <label>COMPTOIR DE REMISE</label>
                <div className="sanctuary-city-pills" role="group" aria-label="Sanctuary City">
                  {['Athènes · Plaka', 'Naples · Vésuve', 'Ascona · Monte Verità', 'Genève · Vieille Ville'].map(
                    (city) => (
                      <button
                        key={city}
                        type="button"
                        onClick={() => setSelectedSanctuaryCity(city)}
                        className={`city-pill-btn ${selectedSanctuaryCity === city ? 'active' : ''}`}
                      >
                        {city}
                      </button>
                    )
                  )}
                </div>
              </div>

              <button type="submit" className="btn-elysian-primary full-width">
                <Compass size={16} />
                <span>Sceller la Demande au Sanctuaire</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
