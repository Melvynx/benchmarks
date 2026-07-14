import { Skeleton } from "@/components/ui/skeleton";

type ResultsSkeletonProps = {
  count: number;
};

export function ResultsSkeleton({ count }: ResultsSkeletonProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-[1.75rem] border border-black/10 bg-card dark:border-white/10"
        >
          <Skeleton className="aspect-video w-full rounded-none" />
          <div className="flex items-center justify-between gap-4 px-4 py-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-18" />
            </div>
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
