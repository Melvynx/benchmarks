import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type PostCardSkeletonProps = {
  variant?: "default" | "compact";
  className?: string;
};

export const PostCardSkeleton = ({
  variant = "default",
  className,
}: PostCardSkeletonProps) => {
  if (variant === "compact") {
    return (
      <div
        className={cn(
          "border-border bg-card flex flex-col gap-2 rounded-lg border p-4",
          className,
        )}
      >
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-border bg-card flex h-full flex-col gap-4 rounded-2xl border p-3",
        className,
      )}
    >
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="flex flex-1 flex-col gap-2 px-2 pt-1">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 px-2 pb-1">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  );
};
