import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type DividerProps = ComponentProps<"div">;

export const Divider = ({ className, children, ...props }: DividerProps) => {
  return (
    <div className={cn("flex items-center gap-4", className)} {...props}>
      <div className="bg-border h-px flex-1" />
      <span className="text-muted-foreground text-sm">{children}</span>
      <div className="bg-border h-px flex-1" />
    </div>
  );
};
