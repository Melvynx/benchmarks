interface IconProps {
  size?: number;
}

function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function LogoIcon({ size = 22 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v4.5l3.4 2.4" />
    </svg>
  );
}

export function ClockIcon({ size = 13 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v4.5l3.4 2.4" />
    </svg>
  );
}

export function SearchIcon({ size = 15 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m16.5 16.5 4.5 4.5" />
    </svg>
  );
}

export function XIcon({ size = 13 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function SlidersIcon({ size = 14 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M4 8h8M19 8h1M4 16h1M12 16h8" />
      <circle cx="15" cy="8" r="2.6" />
      <circle cx="8" cy="16" r="2.6" />
    </svg>
  );
}

export function WarnIcon({ size = 14 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="M12 3.5 22 20.5H2Z" />
      <path d="M12 9.5V14M12 17.2v.1" />
    </svg>
  );
}

export function CheckIcon({ size = 12 }: IconProps) {
  return (
    <svg {...svgProps(size)}>
      <path d="m4.5 12.5 4.5 4.5L19.5 6.5" />
    </svg>
  );
}
