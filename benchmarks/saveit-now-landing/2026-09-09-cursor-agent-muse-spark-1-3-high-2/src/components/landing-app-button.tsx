import type { ReactNode } from "react";

type LandingAppButtonProps = {
  authIntent?: "signin" | "signup";
  children?: ReactNode;
  className?: string;
  showAlwaysOpenPrompt?: boolean;
  signedOutChildren?: ReactNode;
  variant?: "default" | "outline";
};

export function LandingAppButton({
  authIntent = "signup",
  children = "Open SaveIt.now",
  className = "",
  signedOutChildren,
  variant = "default",
}: LandingAppButtonProps) {
  const base =
    "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors";
  const appearance =
    variant === "outline"
      ? "border border-white/15 bg-transparent text-[#fff6ec] hover:bg-white/10"
      : "bg-[#ff5a1f] text-white hover:brightness-110";

  return (
    <a
      className={`${base} ${appearance} ${className}`}
      href={`#cta`}
      data-intent={authIntent}
    >
      {signedOutChildren ?? children}
    </a>
  );
}
