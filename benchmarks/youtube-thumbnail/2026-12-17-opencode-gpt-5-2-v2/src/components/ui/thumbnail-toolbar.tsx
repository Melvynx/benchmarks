"use client";

import { Button } from "@/components/ui/button";

type ThumbnailToolbarProps = {
  count: number;
  onCountChange: (next: number) => void;
  onGenerate: () => void;
  isLoading: boolean;
};

const options = [1, 2, 3, 4];

export function ThumbnailToolbar({
  count,
  onCountChange,
  onGenerate,
  isLoading,
}: ThumbnailToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">Count</span>
        <div className="flex items-center gap-2 rounded-full border border-foreground/15 bg-background/60 px-3 py-2 text-sm">
          {options.map((option) => (
            <button
              key={`count-${option}`}
              type="button"
              onClick={() => onCountChange(option)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] transition ${
                count === option
                  ? "bg-foreground text-background"
                  : "text-soft hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
      <Button
        size="lg"
        className="rounded-full px-8 text-sm font-semibold tracking-[0.3em] uppercase"
        onClick={onGenerate}
        disabled={isLoading}
      >
        {isLoading ? "Generating..." : "Generate"}
      </Button>
    </div>
  );
}
