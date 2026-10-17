import React from 'react';

export const GlobalSvgDefs: React.FC = () => (
  <svg
    aria-hidden="true"
    style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}
  >
    <defs>
      {/* Classical Sanctuary Arch with Stepped Base */}
      <clipPath id="clip-sanctuary-arch" clipPathUnits="objectBoundingBox">
        <path d="M 0.06,0.96 L 0.06,0.44 C 0.06,0.16 0.25,0.02 0.5,0.02 C 0.75,0.02 0.94,0.16 0.94,0.44 L 0.94,0.96 L 0.98,0.96 L 0.98,1 L 0.02,1 L 0.02,0.96 Z" />
      </clipPath>

      {/* Alchemical Keyhole Portal */}
      <clipPath id="clip-keyhole" clipPathUnits="objectBoundingBox">
        <path d="M 0.5,0.02 C 0.76,0.02 0.95,0.20 0.95,0.43 C 0.95,0.57 0.86,0.69 0.74,0.75 L 0.86,0.98 L 0.14,0.98 L 0.26,0.75 C 0.14,0.69 0.05,0.57 0.05,0.43 C 0.05,0.20 0.24,0.02 0.5,0.02 Z" />
      </clipPath>

      {/* Vesica Piscis / Oracle Eye */}
      <clipPath id="clip-vesica" clipPathUnits="objectBoundingBox">
        <path d="M 0.5,0.02 C 0.84,0.18 0.96,0.5 0.5,0.98 C 0.04,0.5 0.16,0.18 0.5,0.02 Z" />
      </clipPath>

      {/* Greco-Roman Temple Pediment & Apse */}
      <clipPath id="clip-pediment" clipPathUnits="objectBoundingBox">
        <polygon points="0.5,0.01 0.98,0.20 0.94,0.20 0.94,0.92 0.99,0.92 0.99,0.99 0.01,0.99 0.01,0.92 0.06,0.92 0.06,0.20 0.02,0.20" />
      </clipPath>

      {/* Amphora / Chalice Contour */}
      <clipPath id="clip-chalice" clipPathUnits="objectBoundingBox">
        <path d="M 0.22,0.03 L 0.78,0.03 L 0.72,0.16 C 0.92,0.28 0.96,0.56 0.76,0.78 L 0.64,0.90 L 0.80,0.98 L 0.20,0.98 L 0.36,0.90 L 0.24,0.78 C 0.04,0.56 0.08,0.28 0.28,0.16 Z" />
      </clipPath>

      {/* Octagram / Star Reliquary */}
      <clipPath id="clip-octagram" clipPathUnits="objectBoundingBox">
        <polygon points="0.5,0.02 0.65,0.15 0.85,0.15 0.85,0.35 0.98,0.5 0.85,0.65 0.85,0.85 0.65,0.85 0.5,0.98 0.35,0.85 0.15,0.85 0.15,0.65 0.02,0.5 0.15,0.35 0.15,0.15 0.35,0.15" />
      </clipPath>

      {/* Sculpted Medallion with Scalloped Notches */}
      <clipPath id="clip-medallion" clipPathUnits="objectBoundingBox">
        <path d="M 0.5,0.02 C 0.77,0.02 0.98,0.23 0.98,0.5 C 0.98,0.77 0.77,0.98 0.5,0.98 C 0.23,0.98 0.02,0.77 0.02,0.5 C 0.02,0.23 0.23,0.02 0.5,0.02 Z" />
      </clipPath>

      {/* Grand Excavation Stage Mask (Stepped Classical Tympanum + Curved Apse Wings) */}
      <clipPath id="clip-wunderkammer-stage" clipPathUnits="objectBoundingBox">
        <path d="M 0.14,0.02 L 0.86,0.02 L 0.98,0.16 L 0.98,0.84 L 0.88,0.98 L 0.12,0.98 L 0.02,0.84 L 0.02,0.16 Z" />
      </clipPath>
    </defs>
  </svg>
);

export const MeanderRule: React.FC<{ className?: string; color?: string }> = ({
  className = '',
  color = 'currentColor',
}) => (
  <div className={`meander-divider ${className}`} aria-hidden="true">
    <svg viewBox="0 0 480 18" fill="none" preserveAspectRatio="none" className="meander-svg">
      <path
        d="M0 9H20V3H34V15H26V9H30M40 9H60V3H74V15H66V9H70M80 9H100V3H114V15H106V9H110M120 9H140V3H154V15H146V9H150M160 9H180V3H194V15H186V9H190M200 9H220V3H234V15H226V9H230M240 9H260V3H274V15H266V9H270M280 9H300V3H314V15H306V9H310M320 9H340V3H354V15H346V9H350M360 9H380V3H394V15H386V9H390M400 9H420V3H434V15H426V9H430M440 9H460V3H474V15H466V9H470"
        stroke={color}
        strokeWidth="1.2"
        strokeOpacity="0.55"
      />
    </svg>
  </div>
);

export const AstrolabeRingSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg viewBox="0 0 600 600" fill="none" className={className} aria-hidden="true">
    <circle cx="300" cy="300" r="290" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 6" opacity="0.45" />
    <circle cx="300" cy="300" r="274" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    <circle cx="300" cy="300" r="248" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 10" opacity="0.5" />
    {/* Cardinal & Alchemical Ticks */}
    {Array.from({ length: 36 }).map((_, i) => {
      const angle = (i * 10 * Math.PI) / 180;
      const r1 = i % 3 === 0 ? 262 : 268;
      const r2 = 274;
      const x1 = 300 + r1 * Math.cos(angle);
      const y1 = 300 + r1 * Math.sin(angle);
      const x2 = 300 + r2 * Math.cos(angle);
      const y2 = 300 + r2 * Math.sin(angle);
      return (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="currentColor"
          strokeWidth={i % 9 === 0 ? '1.6' : '0.8'}
          opacity={i % 3 === 0 ? '0.7' : '0.35'}
        />
      );
    })}
    {/* Sacred Inscribed Octagram */}
    <polygon
      points="300,26 494,106 574,300 494,494 300,574 106,494 26,300 106,106"
      stroke="currentColor"
      strokeWidth="0.6"
      opacity="0.22"
    />
    <polygon
      points="300,26 574,300 300,574 26,300"
      stroke="currentColor"
      strokeWidth="0.6"
      opacity="0.25"
    />
    {/* Circular Text Path */}
    <defs>
      <path
        id="astrolabe-text-circle"
        d="M 300, 300 m -258, 0 a 258,258 0 1,1 516,0 a 258,258 0 1,1 -516,0"
      />
    </defs>
    <text fill="currentColor" fontSize="9.5" letterSpacing="6.2" opacity="0.62" fontFamily="Cinzel, serif">
      <textPath href="#astrolabe-text-circle" startOffset="0%">
        MAISON ELYSIAN · ARCHIVUM RERUM IMPOSSIBILIUM · PAROS · VESUVIUS · ARCADIA · NAOS ·
      </textPath>
    </text>
  </svg>
);

export const getClipPathByShape = (
  shape: 'arch' | 'medallion' | 'octagram' | 'vesica' | 'pediment' | 'chalice' | 'keyhole'
): string => {
  switch (shape) {
    case 'arch':
      return 'url(#clip-sanctuary-arch)';
    case 'medallion':
      return 'url(#clip-medallion)';
    case 'octagram':
      return 'url(#clip-octagram)';
    case 'vesica':
      return 'url(#clip-vesica)';
    case 'pediment':
      return 'url(#clip-pediment)';
    case 'chalice':
      return 'url(#clip-chalice)';
    case 'keyhole':
      return 'url(#clip-keyhole)';
    default:
      return 'url(#clip-sanctuary-arch)';
  }
};
