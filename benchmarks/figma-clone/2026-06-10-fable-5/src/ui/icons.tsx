import type { JSX, ReactNode } from 'react';

interface IconProps {
  size?: number;
}

type IconComponent = (props: IconProps) => JSX.Element;

function stroke(children: ReactNode): IconComponent {
  return ({ size = 16 }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.15}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function filled(children: ReactNode): IconComponent {
  return ({ size = 16 }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" stroke="none" aria-hidden>
      {children}
    </svg>
  );
}

export const ILogo = filled(<path d="M8 1.5l1.7 4.8L14.5 8l-4.8 1.7L8 14.5 6.3 9.7 1.5 8l4.8-1.7z" />);
export const IMove = filled(
  <path d="M4.5 2l7.3 6.1-3.2.6 1.9 4-1.6.8-1.9-4.1-2.5 2.2z" />,
);
export const IFrame = stroke(
  <>
    <path d="M5 1.5v13M11 1.5v13" />
    <path d="M1.5 5h13M1.5 11h13" />
  </>,
);
export const IRect = stroke(<rect x="2.5" y="3.5" width="11" height="9" rx="0.5" />);
export const IEllipse = stroke(<circle cx="8" cy="8" r="5.5" />);
export const ILine = stroke(<path d="M2.5 13.5l11-11" />);
export const IPolygon = stroke(<path d="M8 2.5l6 10.5H2z" />);
export const IStar = filled(
  <path d="M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.2L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z" />,
);
export const IText = stroke(
  <>
    <path d="M3 3.5h10M8 3.5v9.5" />
  </>,
);
export const IImage = stroke(
  <>
    <rect x="2" y="2.5" width="12" height="11" rx="1" />
    <circle cx="5.5" cy="6" r="1.1" />
    <path d="M2.5 12l3.5-3.5 2.5 2.5 3-3 2 2" />
  </>,
);
export const IHand = stroke(
  <path d="M5.5 7V3.8a1 1 0 012 0V7m0-3.7a1 1 0 012 0V7m0-2.5a1 1 0 012 0v4.9c0 2.6-1.6 4.6-4.2 4.6-2.2 0-3.1-1-4.4-3.4-.4-.8-1-1.9-1.3-2.6-.3-.7.5-1.4 1.3-1l1.6 1.2V4.5a1 1 0 012 0" />,
);
export const IChevronDown = stroke(<path d="M4 6l4 4 4-4" />);
export const IChevronRight = stroke(<path d="M6 4l4 4-4 4" />);
export const IEye = stroke(
  <>
    <path d="M1.5 8s2.4-4 6.5-4 6.5 4 6.5 4-2.4 4-6.5 4S1.5 8 1.5 8z" />
    <circle cx="8" cy="8" r="1.8" />
  </>,
);
export const IEyeOff = stroke(
  <>
    <path d="M3 3l10 10" />
    <path d="M6.5 4.4A6.9 6.9 0 018 4.2c4.1 0 6.5 3.8 6.5 3.8a12 12 0 01-2 2.3M4.4 5.5A11 11 0 001.5 8s2.4 4 6.5 4c.9 0 1.8-.2 2.5-.5" />
  </>,
);
export const ILock = stroke(
  <>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
    <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
  </>,
);
export const IUnlock = stroke(
  <>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
    <path d="M5.5 7V5a2.5 2.5 0 014.9-.6" />
  </>,
);
export const IPlus = stroke(<path d="M8 3v10M3 8h10" />);
export const IMinus = stroke(<path d="M3.5 8h9" />);
export const IClose = stroke(<path d="M4 4l8 8M12 4l-8 8" />);
export const ISearch = stroke(
  <>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14" />
  </>,
);
export const IUndo = stroke(<path d="M3 6.5h7a3.5 3.5 0 010 7H6M3 6.5L6 3.5M3 6.5L6 9.5" />);
export const IRedo = stroke(<path d="M13 6.5H6a3.5 3.5 0 000 7h4M13 6.5L10 3.5M13 6.5L10 9.5" />);
export const ICheck = stroke(<path d="M3 8.5l3.5 3.5L13 5" />);
export const IDots = filled(
  <>
    <circle cx="3.5" cy="8" r="1.2" />
    <circle cx="8" cy="8" r="1.2" />
    <circle cx="12.5" cy="8" r="1.2" />
  </>,
);
export const IEyedropper = stroke(
  <path d="M9.5 4.5l2-2a1.4 1.4 0 012 2l-2 2m-2-2l-6 6L3 13l2.5-.5 6-6m-2-2l2 2" />,
);

// Alignment
export const IAlignLeft = stroke(
  <>
    <path d="M3 2.5v11" />
    <rect x="5" y="4.5" width="8" height="2.6" />
    <rect x="5" y="9" width="5" height="2.6" />
  </>,
);
export const IAlignCenterH = stroke(
  <>
    <path d="M8 2.5v11" />
    <rect x="4" y="4.5" width="8" height="2.6" />
    <rect x="5.5" y="9" width="5" height="2.6" />
  </>,
);
export const IAlignRight = stroke(
  <>
    <path d="M13 2.5v11" />
    <rect x="3" y="4.5" width="8" height="2.6" />
    <rect x="6" y="9" width="5" height="2.6" />
  </>,
);
export const IAlignTop = stroke(
  <>
    <path d="M2.5 3h11" />
    <rect x="4.5" y="5" width="2.6" height="8" />
    <rect x="9" y="5" width="2.6" height="5" />
  </>,
);
export const IAlignCenterV = stroke(
  <>
    <path d="M2.5 8h11" />
    <rect x="4.5" y="4" width="2.6" height="8" />
    <rect x="9" y="5.5" width="2.6" height="5" />
  </>,
);
export const IAlignBottom = stroke(
  <>
    <path d="M2.5 13h11" />
    <rect x="4.5" y="3" width="2.6" height="8" />
    <rect x="9" y="6" width="2.6" height="5" />
  </>,
);
export const IDistributeH = stroke(
  <>
    <path d="M2.5 2.5v11M13.5 2.5v11" />
    <rect x="6.5" y="4.5" width="3" height="7" />
  </>,
);
export const IDistributeV = stroke(
  <>
    <path d="M2.5 2.5h11M2.5 13.5h11" />
    <rect x="4.5" y="6.5" width="7" height="3" />
  </>,
);

// Layout
export const ILayoutV = stroke(
  <>
    <rect x="3.5" y="2.5" width="9" height="4.4" />
    <rect x="3.5" y="9.1" width="9" height="4.4" />
  </>,
);
export const ILayoutH = stroke(
  <>
    <rect x="2.5" y="3.5" width="4.4" height="9" />
    <rect x="9.1" y="3.5" width="4.4" height="9" />
  </>,
);
export const ICorner = stroke(<path d="M3 13V7a4 4 0 014-4h6" />);
export const ILinked = stroke(
  <>
    <path d="M6.5 9.5l3-3" />
    <path d="M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1a2.5 2.5 0 01-3.5-3.5l1-1" />
  </>,
);
export const IExport = stroke(
  <>
    <path d="M8 2.5v7.5M5 7l3 3 3-3" />
    <path d="M2.5 11v2a1 1 0 001 1h9a1 1 0 001-1v-2" />
  </>,
);
export const IFolder = stroke(<path d="M1.5 4a1 1 0 011-1h3.5l1.5 2h6a1 1 0 011 1v6.5a1 1 0 01-1 1h-11a1 1 0 01-1-1z" />);
export const IZoomIn = stroke(
  <>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5L14 14M5 7h4M7 5v4" />
  </>,
);
