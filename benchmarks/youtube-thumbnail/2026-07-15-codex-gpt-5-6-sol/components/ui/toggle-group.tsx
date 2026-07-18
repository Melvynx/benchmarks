"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

type ToggleGroupContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const ToggleGroupContext = React.createContext<ToggleGroupContextValue | null>(
  null,
);

function ToggleGroup({
  value,
  onValueChange,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <ToggleGroupContext.Provider value={{ value, onValueChange }}>
      <div
        role="group"
        className={cn(
          "inline-flex items-center rounded-lg border border-input bg-muted p-1",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </ToggleGroupContext.Provider>
  );
}

function ToggleGroupItem({
  value,
  className,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const context = React.useContext(ToggleGroupContext);
  if (!context) {
    throw new Error("ToggleGroupItem must be used inside ToggleGroup");
  }

  const isSelected = context.value === value;

  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={cn(
        "flex size-8 items-center justify-center rounded-md text-sm font-medium text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
        isSelected && "bg-background text-foreground shadow-sm",
        className,
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    />
  );
}

export { ToggleGroup, ToggleGroupItem };
