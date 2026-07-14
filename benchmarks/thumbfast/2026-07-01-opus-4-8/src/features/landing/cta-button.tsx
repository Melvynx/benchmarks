import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import Link from "@/compat/link";
import type { ComponentProps } from "react";

type CtaButtonProps = {
  href: string;
  icon?: LucideIcon;
  variant?: "primary" | "secondary";
  children: React.ReactNode;
} & Omit<ComponentProps<typeof Link>, "href">;

export const CtaButton = ({
  href,
  icon: Icon,
  variant = "primary",
  children,
  className,
  ...props
}: CtaButtonProps) => {
  const isPrimary = variant === "primary";

  return (
    <Link
      href={href}
      className={cn(
        "group relative inline-flex items-center justify-center gap-3 rounded-2xl px-10 py-5 text-lg font-semibold transition-all duration-300",
        "shadow-lg hover:shadow-xl",
        isPrimary && [
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 hover:-translate-y-0.5",
          "shadow-primary/25 hover:shadow-primary/40",
        ],
        !isPrimary && [
          "bg-background text-foreground border-border border-2",
          "hover:border-primary/50 hover:bg-accent hover:-translate-y-0.5",
        ],
        className,
      )}
      {...props}
    >
      {isPrimary && (
        <span className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      )}
      <span className="relative flex items-center gap-3">
        {Icon && (
          <Icon
            className={cn(
              "size-6 transition-transform duration-300",
              isPrimary && "group-hover:scale-110",
            )}
          />
        )}
        {children}
      </span>
    </Link>
  );
};
