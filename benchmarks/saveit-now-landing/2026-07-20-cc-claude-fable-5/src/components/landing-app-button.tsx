import type { ReactNode } from "react";

type LandingAppButtonProps = {
  authIntent?: "signin" | "signup";
  children?: ReactNode;
  className?: string;
  signedOutChildren?: ReactNode;
  size?: "sm" | "md";
  variant?: "default" | "outline";
};

export function LandingAppButton({
  authIntent = "signup",
  children = "Open SaveIt.now",
  className = "",
  signedOutChildren,
  size = "md",
  variant = "default",
}: LandingAppButtonProps) {
  const base = `inline-flex items-center justify-center rounded-full text-sm font-medium transition-all duration-300 ${
    size === "sm" ? "h-9 px-4" : "h-11 px-6"
  }`;
  const appearance =
    variant === "outline"
      ? "border border-cream/20 bg-transparent text-cream hover:border-cream/40 hover:bg-cream/5"
      : "bg-cream text-ink shadow-[0_0_32px_rgba(255,122,69,0.25)] hover:bg-white hover:shadow-[0_0_44px_rgba(255,122,69,0.45)]";

  return (
    <a
      className={`${base} ${appearance} ${className}`}
      href={`/signin?intent=${authIntent}&step=email`}
    >
      {signedOutChildren ?? children}
    </a>
  );
}
