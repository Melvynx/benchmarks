import { cn } from "@/lib/utils";
import Markdown from "markdown-to-jsx";
import { type ComponentPropsWithoutRef } from "react";

type ClientMarkdownProps = ComponentPropsWithoutRef<typeof Markdown>;

export const ClientMarkdown = ({
  children,
  className,
  ...props
}: ClientMarkdownProps) => {
  return (
    <Markdown
      className={cn("typography text-foreground", className)}
      {...props}
    >
      {children}
    </Markdown>
  );
};
