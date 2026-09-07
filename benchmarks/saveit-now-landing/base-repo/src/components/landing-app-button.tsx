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
      ? "border border-white/10 bg-transparent text-[#fafafa] hover:bg-white/5"
      : "bg-[#fafafa] text-[#141414] hover:bg-[#e0e0e0]";

  return (
    <a
      className={`${base} ${appearance} ${className}`}
      href={`/signin?intent=${authIntent}&step=email`}
    >
      {signedOutChildren ?? children}
    </a>
  );
}
