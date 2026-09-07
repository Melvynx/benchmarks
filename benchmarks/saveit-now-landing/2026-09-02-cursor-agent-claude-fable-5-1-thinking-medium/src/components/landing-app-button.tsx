import type { ReactNode } from "react";

type LandingAppButtonProps = {
  authIntent?: "signin" | "signup";
  children?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "ember" | "cream" | "outline" | "ghost";
};

const SIZES = {
  sm: "h-9 px-4 text-[13px]",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-[15px] sm:h-13 sm:px-7",
} as const;

const VARIANTS = {
  ember:
    "bg-ember text-ink shadow-glow hover:bg-ember-2 hover:shadow-[0_0_0_1px_rgb(255_154_60/0.5),0_16px_56px_-12px_rgb(255_154_60/0.7)]",
  cream: "bg-cream text-ink hover:bg-white",
  outline:
    "border border-white/15 bg-white/[0.03] text-cream backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.08]",
  ghost: "text-sand hover:text-cream hover:bg-white/[0.06]",
} as const;

export function LandingAppButton({
  authIntent = "signup",
  children = "Open SaveIt.now",
  className = "",
  size = "md",
  variant = "ember",
}: LandingAppButtonProps) {
  return (
    <a
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.01em] transition-[background-color,border-color,box-shadow,transform,color] duration-300 ease-out active:scale-[0.98] ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      href={`/signin?intent=${authIntent}&step=email`}
    >
      {children}
    </a>
  );
}
