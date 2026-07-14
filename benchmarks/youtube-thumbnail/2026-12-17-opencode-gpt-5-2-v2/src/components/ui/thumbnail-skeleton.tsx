import { Skeleton } from "@/components/ui/skeleton";

type ThumbnailSkeletonProps = {
  count: number;
};

export function ThumbnailSkeleton({ count }: ThumbnailSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className="rounded-3xl border border-foreground/10 bg-background/70 p-3"
        >
          <Skeleton className="aspect-video w-full rounded-2xl" />
          <div className="mt-3 flex items-center justify-between">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
