import type { ReactNode, SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconFeed = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 7.2c-1.3-1.3-3.4-1.6-5-.6-2.5 1.5-2.4 5.5-.6 8.1 1.2 1.8 2.6 3.1 4.1 3.1.9 0 1-.4 1.5-.4s.6.4 1.5.4c1.5 0 2.9-1.3 4.1-3.1 1.8-2.6 1.9-6.6-.6-8.1-1.6-1-3.7-.7-5 .6Z" fill="currentColor" fillOpacity=".18" />
    <path d="M12 7.2c0-1.6.7-3 2.2-3.7" />
  </Icon>
);

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity=".18" />
    <path d="M4.2 9.5c4 .8 7.5-.2 10.3-3.2M19.8 14.5c-4-.8-7.5.2-10.3 3.2M9 3.9c.4 5.5 3 9 6.2 11.6M9 20.2c-.1-.2-.3-.4-.4-.6" />
  </Icon>
);

export const IconWash = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="8.5" cy="14" r="4.6" fill="currentColor" fillOpacity=".18" />
    <circle cx="16.5" cy="9" r="3.2" fill="currentColor" fillOpacity=".18" />
    <circle cx="16" cy="17.5" r="1.8" />
    <path d="M6.6 12.4c.4-.7 1-1.1 1.8-1.2" />
  </Icon>
);

export const IconMoon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 14.6A8 8 0 0 1 9.4 4.5a8 8 0 1 0 10.1 10.1Z" fill="currentColor" fillOpacity=".18" />
    <path d="M16.5 4.5v3M15 6h3" />
  </Icon>
);

export const IconSun = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity=".18" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </Icon>
);

export const IconSound = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10v4h3.5l4.5 3.6V6.4L7.500 10H4Z" fill="currentColor" fillOpacity=".18" />
    <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18 6.800a7.500 7.500 0 0 1 0 10.400" />
  </Icon>
);

export const IconMute = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10v4h3.5l4.5 3.6V6.4L7.500 10H4Z" fill="currentColor" fillOpacity=".18" />
    <path d="m16 9.500 5 5M21 9.500l-5 5" />
  </Icon>
);

export const IconHat = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.500 6.500 17h11L12 3.500Z" fill="currentColor" fillOpacity=".18" />
    <path d="M4.500 19.500h15" />
    <circle cx="12" cy="3.400" r="1.300" fill="currentColor" />
  </Icon>
);

export const IconMenu = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="1.400" fill="currentColor" />
    <circle cx="12" cy="12" r="1.400" fill="currentColor" />
    <circle cx="18" cy="12" r="1.400" fill="currentColor" />
  </Icon>
);

export const IconHeart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7.500-4.600-7.500-10.200A4.300 4.300 0 0 1 12 7.300a4.300 4.300 0 0 1 7.500 2.500C19.500 15.400 12 20 12 20Z" fill="currentColor" fillOpacity=".25" />
  </Icon>
);

export const IconBolt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 3 5.500 13.500H11L10 21l7.500-10.500H12L13 3Z" fill="currentColor" fillOpacity=".25" />
  </Icon>
);

export const IconDrop = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 3.500c3.500 4 6 6.800 6 10a6 6 0 0 1-12 0c0-3.200 2.500-6 6-10Z" fill="currentColor" fillOpacity=".25" />
    <path d="M9.500 14.500a2.700 2.700 0 0 0 2 2.500" />
  </Icon>
);

export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 3.800 2.500 5.100 5.600.8-4.100 4 1 5.600-5-2.700-5 2.700 1-5.600-4.100-4 5.600-.8L12 3.800Z" fill="currentColor" fillOpacity=".3" />
  </Icon>
);

export const IconLock = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5.500" y="10.500" width="13" height="9.500" rx="2.500" fill="currentColor" fillOpacity=".2" />
    <path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.500 4.500 4.500L19 7.500" />
  </Icon>
);

export const IconFlower = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2.600" fill="currentColor" fillOpacity=".5" />
    <path d="M12 9.400c-1.800-2.600-1.500-5 0-5.800 1.500.8 1.800 3.200 0 5.800ZM14.600 12c2.600-1.800 5-1.500 5.800 0-.8 1.500-3.200 1.800-5.800 0ZM12 14.600c1.800 2.600 1.500 5 0 5.800-1.500-.8-1.800-3.200 0-5.800ZM9.400 12c-2.600 1.800-5 1.500-5.800 0 .8-1.500 3.200-1.800 5.800 0Z" fill="currentColor" fillOpacity=".18" />
  </Icon>
);

export const IconShades = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 9.500h18M5 9.500c.2 4.200 1.500 6 3.500 6s3-1.600 3.500-4c.5 2.400 1.500 4 3.500 4s3.300-1.800 3.500-6" fill="currentColor" fillOpacity=".3" />
  </Icon>
);

export const IconCrown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m4 17.500-1-9 5 4L12 5.500l4 7 5-4-1 9H4Z" fill="currentColor" fillOpacity=".25" />
    <path d="M4.500 20.500h15" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);
