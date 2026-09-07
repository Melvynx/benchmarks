import type { AnchorHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "outline";
type Size = "md" | "lg";

type LinkButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-cream text-ink shadow-[0_10px_40px_-10px_rgba(255,180,143,0.45)] hover:bg-white hover:shadow-[0_14px_50px_-10px_rgba(255,122,61,0.55)]",
  outline:
    "border border-white/15 bg-white/[0.04] text-cream backdrop-blur-sm hover:border-white/30 hover:bg-white/[0.08]",
  ghost: "text-cream/80 hover:text-cream hover:bg-white/[0.06]",
};

const sizes: Record<Size, string> = {
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-7 text-[15px]",
};

export function LinkButton({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: LinkButtonProps) {
  return (
    <a
      className={`group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,border-color,box-shadow,transform,color] duration-300 ease-out active:scale-[0.98] ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </a>
  );
}
