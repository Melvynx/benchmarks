import type { ComponentPropsWithoutRef } from "react";

type LogoSvgProps = ComponentPropsWithoutRef<"svg"> & { size?: number };

export const LogoSvg = ({ size = 32, ...props }: LogoSvgProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 531 531"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M80 101.11V430.33L265.85 265.72L80 101.11Z"
        fill="currentColor"
      />
      <path
        d="M175.47 101V430.22L361.32 265.61L175.47 101Z"
        fill="currentColor"
        fillOpacity="0.75"
      />
      <path
        d="M265.74 101V430.22L451.59 265.61L265.74 101Z"
        fill="currentColor"
        fillOpacity="0.5"
      />
    </svg>
  );
};
