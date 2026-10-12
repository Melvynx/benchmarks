import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  ...props,
});

export const PlayIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M7 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L8.5 4.64A1 1 0 0 0 7 5.5Z" fill="currentColor" stroke="none" />
  </svg>
);

export const PauseIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="6" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none" />
    <rect x="14" y="5" width="4" height="14" rx="1.4" fill="currentColor" stroke="none" />
  </svg>
);

export const StepIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6.5v11a.8.8 0 0 0 1.25.66l8-5.5a.8.8 0 0 0 0-1.32l-8-5.5A.8.8 0 0 0 6 6.5Z" fill="currentColor" stroke="none" />
    <path d="M18.5 6v12" />
  </svg>
);

export const ResetIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.6-5.9" />
    <path d="M4 4v4.5h4.5" />
  </svg>
);

export const DiceIcon = (p: P) => (
  <svg {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="9" cy="9" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="15" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="9" cy="15" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

export const ViewIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);

export const OrbitIcon = (p: P) => (
  <svg {...base(p)}>
    <ellipse cx="12" cy="12" rx="9" ry="4.2" />
    <path d="M17.5 5.8 20 8.2l-3.2.9" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
  </svg>
);

export const FollowIcon = (p: P) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const InfoIcon = (p: P) => (
  <svg {...base({ width: 14, height: 14, strokeWidth: 2.4, ...p })}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.2" />
  </svg>
);
