import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type BorderedDialogContentProps = {
  children: ReactNode;
  maxWidth?: string;
  className?: string;
};

export function BorderedDialogContent({
  children,
  maxWidth = "sm:max-w-2xl",
  className,
}: BorderedDialogContentProps) {
  return (
    <DialogContent
      showCloseButton={false}
      className={cn(
        "gap-0 overflow-hidden rounded-xl border-none p-0 pb-10 shadow-2xl ring-4 ring-neutral-200/80 dark:bg-neutral-900 dark:ring-neutral-800",
        maxWidth,
        className,
      )}
    >
      {children}
    </DialogContent>
  );
}

type BorderedDialogHeaderProps = {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
};

export function BorderedDialogHeader({
  title,
  description,
  children,
}: BorderedDialogHeaderProps) {
  return (
    <DialogHeader className="border-b px-5 py-4">
      {children ?? (
        <>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description && (
            <DialogDescription className="text-sm">
              {description}
            </DialogDescription>
          )}
        </>
      )}
    </DialogHeader>
  );
}

export function BorderedDialogBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 p-5", className)}>{children}</div>
  );
}

export function BorderedDialogFooter({ children }: { children: ReactNode }) {
  return (
    <div className="text-muted-foreground absolute inset-x-0 bottom-0 z-20 flex h-10 items-center justify-between rounded-b-xl border-t border-t-neutral-100 bg-neutral-50 px-4 text-xs font-medium dark:border-t-neutral-700 dark:bg-neutral-800">
      {children}
    </div>
  );
}

export function DialogEscClose() {
  return (
    <div className="flex items-center gap-1.5">
      <Kbd className="size-5 text-[10px]">Esc</Kbd>
      <span>Close</span>
    </div>
  );
}
