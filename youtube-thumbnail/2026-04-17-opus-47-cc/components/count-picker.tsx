"use client";

import { cn } from "@/lib/utils";

interface CountPickerProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

export function CountPicker({ value, onChange, max = 4 }: CountPickerProps) {
  const options = Array.from({ length: max }, (_, i) => i + 1);
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-card/60 p-1">
      {options.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={cn(
            "flex size-8 items-center justify-center rounded-full text-sm font-medium transition-all",
            value === n
              ? "bg-foreground text-background shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          aria-label={`${n} thumbnail${n > 1 ? "s" : ""}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
