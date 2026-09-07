import type { ReactNode } from "react";

type LandingAppButtonProps = {
  authIntent?: "signin" | "signup";
  children?: ReactNode;
  className?: string;
  showAlwaysOpenPrompt?: boolean;
  signedOutChildren?: ReactNode;
  variant?: "default" | "outline" | "ghost" | "ember";
};

export function LandingAppButton({
  authIntent = "signup",
  children = "Open SaveIt.now",
  className = "",
  signedOutChildren,
  variant = "default",
}: LandingAppButtonProps) {
  const hasDisplay =
    /\b(hidden|block|inline|inline-block|flex|inline-flex|grid)\b/.test(
      className,
    );

  const base = `btn-press ${hasDisplay ? "" : "inline-flex"} h-11 items-center justify-center rounded-full px-6 text-sm font-medium`;

  const appearance =
    variant === "outline"
      ? "border border-ink/15 bg-transparent text-ink hover:bg-ink/5"
      : variant === "ghost"
        ? "border border-white/35 bg-white/10 text-on-dark backdrop-blur-sm hover:bg-white/18"
        : variant === "ember"
          ? "bg-ember text-on-dark shadow-[0_10px_30px_-12px_oklch(0.62_0.17_45_/_.7)] hover:bg-ember-deep"
          : "bg-ink text-on-dark hover:bg-ink/90";

  return (
    <a
      className={`${base} ${appearance} ${className}`}
      href={`/signin?intent=${authIntent}&step=email`}
    >
      {signedOutChildren ?? children}
    </a>
  );
}
