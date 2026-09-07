import type { ReactNode } from "react";

import { ArrowUpRight } from "lucide-react";

type LandingAppButtonProps = {
  authIntent?: "signin" | "signup";
  children?: ReactNode;
  className?: string;
  showArrow?: boolean;
  signedOutChildren?: ReactNode;
  variant?: "default" | "outline";
};

export function LandingAppButton({
  authIntent = "signup",
  children = "Open SaveIt.now",
  className = "",
  showArrow = false,
  signedOutChildren,
  variant = "default",
}: LandingAppButtonProps) {
  return (
    <a
      className={`button button-${variant} ${className}`.trim()}
      href={`/signin?intent=${authIntent}&step=email`}
    >
      <span>{signedOutChildren ?? children}</span>
      {showArrow ? <ArrowUpRight aria-hidden="true" size={17} /> : null}
    </a>
  );
}
