import type { ReactNode } from "react";

const tones = {
  primary:
    "inline-flex min-h-11 w-full items-center justify-center bg-coral px-5 text-sm font-semibold text-ink transition-colors duration-200 ease-out hover:bg-coral-hot sm:w-auto",
  secondary:
    "inline-flex min-h-11 w-full items-center justify-center border border-ivory/30 px-5 text-sm font-semibold text-ivory transition-colors duration-200 ease-out hover:border-ivory/70 hover:bg-ivory/10 sm:w-auto",
} as const;

export function CtaLink({
  href,
  children,
  tone = "primary",
  external = false,
}: {
  href: string;
  children: ReactNode;
  tone?: keyof typeof tones;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      className={tones[tone]}
      rel={external ? "noreferrer" : undefined}
    >
      {children}
    </a>
  );
}
