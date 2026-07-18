import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="18"
      viewBox="0 0 24 24"
      width="18"
      {...props}
    >
      {children}
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></Icon>;
}

export function SettingsIcon(props: IconProps) {
  return <Icon {...props}><path d="M12 15.25A3.25 3.25 0 1 0 12 8.75a3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.7" /><path d="M19.4 13.35a7.7 7.7 0 0 0 .05-2.7l2-1.55-2-3.45-2.48 1a7.7 7.7 0 0 0-2.32-1.34L14.3 2.7h-4.6l-.35 2.61A7.7 7.7 0 0 0 7.03 6.65l-2.48-1-2 3.45 2 1.55a7.7 7.7 0 0 0 .05 2.7l-2.05 1.6 2 3.45 2.55-1.03a7.7 7.7 0 0 0 2.25 1.3l.35 2.63h4.6l.35-2.63a7.7 7.7 0 0 0 2.25-1.3l2.55 1.03 2-3.45-2.05-1.6Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.4" /></Icon>;
}

export function CloseIcon(props: IconProps) {
  return <Icon {...props}><path d="m6.5 6.5 11 11m0-11-11 11" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" /></Icon>;
}

export function ChevronIcon(props: IconProps) {
  return <Icon {...props}><path d="m7.5 10 4.5 4.5 4.5-4.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></Icon>;
}

export function SearchIcon(props: IconProps) {
  return <Icon {...props}><circle cx="10.75" cy="10.75" r="6.25" stroke="currentColor" strokeWidth="1.7" /><path d="m15.5 15.5 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" /></Icon>;
}

export function PeopleIcon(props: IconProps) {
  return <Icon {...props}><path d="M15 19v-1.5a4 4 0 0 0-4-4H6.5a4 4 0 0 0-4 4V19M8.75 9.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM15 4a3.25 3.25 0 0 1 0 6.5M17 13.8a4 4 0 0 1 4.5 3.96V19" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></Icon>;
}

export function BaseIcon(props: IconProps) {
  return <Icon {...props}><path d="m3 10 9-7 9 7M5.5 9v11h13V9M9 20v-6h6v6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></Icon>;
}

export function MoonIcon(props: IconProps) {
  return <Icon {...props}><path d="M20.1 15.4A8.5 8.5 0 0 1 8.6 3.9a8.5 8.5 0 1 0 11.5 11.5Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" /></Icon>;
}

export function CheckIcon(props: IconProps) {
  return <Icon {...props}><path d="m5 12.5 4.25 4.25L19.5 6.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" /></Icon>;
}
