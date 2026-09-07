import type { ReactNode } from "react";

type LandingAppButtonProps = {
  authIntent?: "signin" | "signup";
  children?: ReactNode;
  className?: string;
  showAlwaysOpenPrompt?: boolean;
  signedOutChildren?: ReactNode;
  variant?: "default" | "outline" | "ghost";
};

export function LandingAppButton({
  authIntent = "signup",
  children = "Open SaveIt.now",
  className = "",
  signedOutChildren,
  variant = "default",
}: LandingAppButtonProps) {
  const base =
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 text-sm font-semibold tracking-tight transition-colors duration-200";
  const appearance =
    variant === "outline"
      ? "border border-ink/20 bg-transparent text-ink hover:bg-ink/10"
      : variant === "ghost"
        ? "text-ink/80 hover:text-ink"
        : "bg-portal text-canvas hover:bg-ink";

  return (
    <a
      className={`${base} ${appearance} ${className}`}
      href={`/signin?intent=${authIntent}&step=email`}
    >
      {signedOutChildren ?? children}
    </a>
  );
}
