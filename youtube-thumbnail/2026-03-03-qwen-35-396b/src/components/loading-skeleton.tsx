"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
      {[1, 2].map((i) => (
        <Card key={i} className="overflow-hidden border-border/50">
          <CardContent className="p-0">
            <Skeleton className="w-full aspect-video" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
