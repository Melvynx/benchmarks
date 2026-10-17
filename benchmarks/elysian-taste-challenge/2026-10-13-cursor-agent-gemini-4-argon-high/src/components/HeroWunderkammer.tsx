import React, { useState, useRef, useEffect } from 'react';
import { Eye, Sparkles, Compass, Layers, ArrowDownRight } from 'lucide-react';
import { ELYSIAN_IMAGES } from '../data/elysianWorld';
import { AstrolabeRingSvg, getClipPathByShape } from './ClassicalOrnamentation';
import { harmonics } from '../utils/harmonicAudio';

type PortalShape = 'arch' | 'keyhole' | 'vesica' | 'pediment';
type RefractRealmKey = 'scholarlyLandscape' | 'mountainValley' | 'goldenTemple' | 'stillLife';

interface SatelliteFragment {
  id: RefractRealmKey;
  roman: string;
  label: string;
  sublabel: string;
  imageUrl: string;
  fallbackUrl: string;
  bgPos: string;
  bgSize: string;
  shape: 'arch' | 'vesica' | 'chalice' | 'octagram';
  positionClass: string;
}

const SATELLITES: SatelliteFragment[] = [
  {
    id: 'scholarlyLandscape',
    roman: 'II',
    label: 'Panache de Vésuve',
    sublabel: 'Volcanic Coral & Bust',
    imageUrl: ELYSIAN_IMAGES.scholarlyLandscape.url,
    fallbackUrl: ELYSIAN_IMAGES.scholarlyLandscape.fallback,
    bgPos: '78% 36%',
    bgSize: '260%',
    shape: 'vesica',
    positionClass: 'sat-top-right',
  },
  {
    id: 'mountainValley',
    roman: 'III',
    label: 'Vallée de Safran',
    sublabel: 'Golden Moss & Rapids',
    imageUrl: ELYSIAN_IMAGES.mountainValley.url,
    fallbackUrl: ELYSIAN_IMAGES.mountainValley.fallback,
    bgPos: '54% 58%',
    bgSize: '230%',
    shape: 'chalice',
    positionClass: 'sat-bottom-left',
  },
  {
    id: 'goldenTemple',
    roman: 'IV',
    label: 'Portail Sidéral',
    sublabel: 'Corinthian Starlight',
    imageUrl: ELYSIAN_IMAGES.goldenTemple.url,
    fallbackUrl: ELYSIAN_IMAGES.goldenTemple.fallback,
    bgPos: '50% 52%',
    bgSize: '240%',
    shape: 'octagram',
    positionClass: 'sat-bottom-right',
  },
  {
    id: 'stillLife',
    roman: 'I',
    label: 'Cadre des Cimes',
    sublabel: 'Gilded Alpine Relic',
    imageUrl: ELYSIAN_IMAGES.stillLife.url,
    fallbackUrl: ELYSIAN_IMAGES.stillLife.fallback,
    bgPos: '17% 48%',
    bgSize: '310%',
    shape: 'arch',
    positionClass: 'sat-top-left',
  },
];

export const HeroWunderkammer: React.FC = () => {
  const [portalShape, setPortalShape] = useState<PortalShape>('arch');
  const [refractRealm, setRefractRealm] = useState<RefractRealmKey>('goldenTemple');
  const [lensRadius, setLensRadius] = useState<number>(135);
  const [isHoveringPortal, setIsHoveringPortal] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 52, y: 48 });
  const [parallax, setParallax] = useState({ x: 0, y: 0 });
  const portalRef = useRef<HTMLDivElement | null>(null);

  // Gentle autonomous Lissajous orbit for the Alchemical Loupe when user is not hovering
  useEffect(() => {
    if (isHoveringPortal) return;
    let frameId: number;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = (now - start) * 0.00075;
      const x = 50 + Math.sin(elapsed * 1.3) * 22;
      const y = 48 + Math.cos(elapsed * 0.9) * 18;
      setLensPos({ x, y });
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isHoveringPortal]);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!portalRef.current) return;
    const rect = portalRef.current.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(8, Math.min(92, relX));
    const clampedY = Math.max(8, Math.min(92, relY));
    setLensPos({ x: clampedX, y: clampedY });
    setParallax({
      x: (clampedX - 50) * 0.35,
      y: (clampedY - 50) * 0.35,
    });
  };

  const activeRefractData = ELYSIAN_IMAGES[refractRealm];
  const baseRealmData =
    refractRealm === 'stillLife' ? ELYSIAN_IMAGES.scholarlyLandscape : ELYSIAN_IMAGES.stillLife;

  return (
    <section id="wunderkammer" className="hero-wunderkammer" aria-label="Elysian Surrealist Stage">
      {/* Ambient Radial Aura & Engraved Grid Lines */}
      <div className="hero-architectural-grid" aria-hidden="true">
        <div className="grid-meridian-v" />
        <div className="grid-meridian-h" />
        <div className="grid-diagonal-a" />
        <div className="grid-diagonal-b" />
      </div>

      <div className="hero-layout-container">
        {/* Left Editorial Column: Monumental Typography & Controls */}
        <div className="hero-editorial-column">
          <div className="maison-archival-badge">
            <span className="badge-dot" />
            <span className="badge-code">MAISON ELYSIAN · ARCHIVUM N° MMXXVI</span>
            <span className="badge-sep">/</span>
            <span className="badge-coord">ATHÈNES · VÉSUVE · ARCADIE</span>
          </div>

          <div className="hero-title-lockup">
            <p className="hero-overtitle">
              <span>CABINET DES MONDES IMPOSSIBLES</span>
              <span className="overtitle-ornament">✦</span>
              <span>HAUTE ALCHIMIE VISUELLE</span>
            </p>

            {/* Primary Visible Title — Strictly Model Name Only */}
            <h1 className="hero-primary-title">Gemini 4 Argon</h1>

            <div className="hero-subtitle-bar">
              <span className="subtitle-line" />
              <p className="hero-brand-declaration">
                <strong>ELYSIAN</strong> — Maison de Haute Parfumerie, Reliques Architecturales &amp;
                Traités Surréalistes
              </p>
            </div>
          </div>

          <p className="hero-lead-prose">
            Where Parian marble busts converse with erupting coral volcanoes, saffron-gilded valleys
            dissolve into glacial rapids, and six Corinthian columns of burnished gold guard a
            doorway into the deep-teal cosmos. Move the <em>Ocular Loupe</em> across the sanctuary
            to refract one impossible epoch through another.
          </p>

          {/* Interactive Optical Instrument Controls */}
          <div className="hero-instrument-panel">
            <div className="instrument-group">
              <span className="instrument-label">
                <Eye size={13} /> Réfraction de la Loupe (Second Monde)
              </span>
              <div className="realm-pill-selector" role="group" aria-label="Select Refracted Realm">
                {(
                  [
                    { key: 'goldenTemple', label: 'IV · Naos Astral' },
                    { key: 'scholarlyLandscape', label: 'II · Vésuve Corail' },
                    { key: 'mountainValley', label: 'III · Vallée d’Or' },
                    { key: 'stillLife', label: 'I · Cabinet Pur' },
                  ] as { key: RefractRealmKey; label: string }[]
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`realm-pill-btn ${refractRealm === item.key ? 'active' : ''}`}
                    onClick={() => {
                      setRefractRealm(item.key);
                      harmonics.playChime(587.33, 880, 1.1);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="instrument-row-split">
              <div className="instrument-group">
                <span className="instrument-label">
                  <Layers size={13} /> Géométrie du Portail
                </span>
                <div className="shape-pill-selector" role="group" aria-label="Portal Aperture Geometry">
                  {(
                    [
                      { id: 'arch', label: 'Arche' },
                      { id: 'keyhole', label: 'Serrure' },
                      { id: 'vesica', label: 'Oracle' },
                      { id: 'pediment', label: 'Fronton' },
                    ] as { id: PortalShape; label: string }[]
                  ).map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      className={`shape-pill-btn ${portalShape === sh.id ? 'active' : ''}`}
                      onClick={() => {
                        setPortalShape(sh.id);
                        harmonics.playChime(493.88, 740, 0.9);
                      }}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="instrument-group iris-slider-group">
                <label htmlFor="iris-radius-range" className="instrument-label">
                  <Compass size={13} /> Ouverture d’Iris: {lensRadius}px
                </label>
                <input
                  id="iris-radius-range"
                  type="range"
                  min={75}
                  max={220}
                  value={lensRadius}
                  onChange={(e) => setLensRadius(Number(e.target.value))}
                  className="brass-range-slider"
                />
              </div>
            </div>
          </div>

          {/* Editorial CTAs */}
          <div className="hero-cta-row">
            <a
              href="#dissection"
              className="btn-elysian-primary"
              onClick={() => harmonics.playChime(528, 792, 1.4)}
            >
              <span>Excaver le Cabinet</span>
              <ArrowDownRight size={16} />
            </a>
            <a href="#triptych" className="btn-elysian-ghost">
              <Sparkles size={15} />
              <span>Ouvrir le Prisme des Horizons</span>
            </a>
          </div>
        </div>

        {/* Right Collage Stage: Rotating Astrolabe + Dual-Layer Refracting Portal + 4 Sculptural Cut-Out Satellites */}
        <div className="hero-collage-stage">
          {/* Counter-Rotating Brass Astrolabe Rings */}
          <div
            className="astrolabe-halo-outer"
            style={{
              transform: `translate3d(${parallax.x * -0.4}px, ${parallax.y * -0.4}px, 0)`,
            }}
          >
            <AstrolabeRingSvg className="astrolabe-svg-spin" />
          </div>

          {/* SVG Constellation Connector Threads */}
          <svg className="stage-connector-lines" viewBox="0 0 700 700" fill="none" aria-hidden="true">
            <line
              x1="120"
              y1="130"
              x2={350 + (lensPos.x - 50) * 3}
              y2={350 + (lensPos.y - 50) * 3}
              stroke="var(--accent-gold)"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              opacity="0.55"
            />
            <line
              x1="585"
              y1="145"
              x2={350 + (lensPos.x - 50) * 3}
              y2={350 + (lensPos.y - 50) * 3}
              stroke="var(--accent-coral)"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              opacity="0.55"
            />
            <line
              x1="115"
              y1="560"
              x2={350 + (lensPos.x - 50) * 3}
              y2={350 + (lensPos.y - 50) * 3}
              stroke="var(--accent-gold)"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              opacity="0.55"
            />
            <line
              x1="590"
              y1="555"
              x2={350 + (lensPos.x - 50) * 3}
              y2={350 + (lensPos.y - 50) * 3}
              stroke="var(--accent-coral)"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              opacity="0.55"
            />
          </svg>

          {/* Central Sculpted Sanctuary Portal */}
          <div
            ref={portalRef}
            className="ocular-portal-shell"
            onPointerEnter={() => setIsHoveringPortal(true)}
            onPointerLeave={() => {
              setIsHoveringPortal(false);
              setParallax({ x: 0, y: 0 });
            }}
            onPointerMove={handlePointerMove}
            style={{
              transform: `perspective(1100px) rotateY(${parallax.x * 0.25}deg) rotateX(${
                parallax.y * -0.25
              }deg)`,
            }}
          >
            <div
              className="ocular-portal-clipped"
              style={{
                clipPath: getClipPathByShape(portalShape),
              }}
            >
              {/* Layer 1: Base Painting (Le Cabinet du Paradoxe) */}
              <img
                src={baseRealmData.url}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (target.src !== window.location.origin + baseRealmData.fallback) {
                    target.src = baseRealmData.fallback;
                  }
                }}
                alt={baseRealmData.title}
                className="portal-base-image"
                style={{
                  transform: `scale(1.08) translate3d(${parallax.x * -0.6}px, ${parallax.y * -0.6}px, 0)`,
                }}
              />

              {/* Subtle Vignette & Classical Engraving Texture */}
              <div className="portal-alchemical-wash" />

              {/* Layer 2: Refracted Second Realm inside the Moving Ocular Loupe */}
              <div
                className="portal-refraction-layer"
                style={{
                  clipPath: `circle(${lensRadius}px at ${lensPos.x}% ${lensPos.y}%)`,
                }}
              >
                <img
                  src={activeRefractData.url}
                  onError={(e) => {
                    const target = e.currentTarget;
                    if (target.src !== window.location.origin + activeRefractData.fallback) {
                      target.src = activeRefractData.fallback;
                    }
                  }}
                  alt={activeRefractData.title}
                  className="portal-refracted-image"
                  style={{
                    transform: `scale(1.22) translate3d(${(50 - lensPos.x) * 0.45}px, ${
                      (50 - lensPos.y) * 0.45
                    }px, 0)`,
                  }}
                />
              </div>

              {/* Brass Loupe Reticle Ring Following the Aperture */}
              <div
                className="ocular-loupe-reticle"
                style={{
                  width: `${lensRadius * 2}px`,
                  height: `${lensRadius * 2}px`,
                  left: `${lensPos.x}%`,
                  top: `${lensPos.y}%`,
                }}
                aria-hidden="true"
              >
                <div className="reticle-ring-inner" />
                <div className="reticle-crosshair-h" />
                <div className="reticle-crosshair-v" />
                <span className="reticle-tag">
                  {activeRefractData.title} · {Math.round(lensPos.x)}°/{Math.round(lensPos.y)}°
                </span>
              </div>

              {/* Bottom Archival Caption Bar inside Portal */}
              <div className="portal-inscription-footer">
                <span>BASE: {baseRealmData.title.toUpperCase()}</span>
                <span>✦</span>
                <span>LOUPE: {activeRefractData.title.toUpperCase()}</span>
              </div>
            </div>
          </div>

          {/* 4 Orbiting Cropped Collage Satellites */}
          {SATELLITES.map((sat, idx) => {
            const isSelected = refractRealm === sat.id;
            const factor = idx % 2 === 0 ? 0.65 : -0.55;
            return (
              <button
                key={sat.id}
                type="button"
                onClick={() => {
                  setRefractRealm(sat.id);
                  harmonics.playChime(440 + idx * 110, 660 + idx * 110, 1.2);
                }}
                className={`collage-satellite ${sat.positionClass} ${isSelected ? 'active' : ''}`}
                style={{
                  transform: `translate3d(${parallax.x * factor}px, ${parallax.y * factor}px, 0)`,
                }}
                title={`Refract through ${sat.label}`}
              >
                <div
                  className="satellite-image-crop"
                  style={{
                    clipPath: getClipPathByShape(sat.shape),
                    backgroundImage: `url(${sat.imageUrl}), url(${sat.fallbackUrl})`,
                    backgroundPosition: sat.bgPos,
                    backgroundSize: sat.bgSize,
                  }}
                />
                <div className="satellite-caption">
                  <span className="sat-roman">{sat.roman}</span>
                  <div className="sat-text">
                    <span className="sat-title">{sat.label}</span>
                    <span className="sat-sub">{sat.sublabel}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
