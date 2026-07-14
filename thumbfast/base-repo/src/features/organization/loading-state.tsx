import type React from "react";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div
      aria-label={label}
      className="mx-auto flex min-h-[360px] w-full max-w-7xl flex-col gap-6 px-4 py-6"
      role="status"
    >
      <span className="sr-only">{label}</span>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-72 max-w-[70vw]" />
        </div>
        <Skeleton className="hidden h-9 w-28 sm:block" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
      <div className="rounded-lg border p-4">
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-lg border border-dashed px-6 text-center">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        {description}
      </p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
