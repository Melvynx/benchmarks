"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  return (
    <Button
      aria-label="Toggle theme"
      className="h-11 rounded-full border border-border/80 bg-card/70 px-4 text-xs font-medium tracking-[0.18em] uppercase backdrop-blur-md"
      variant="outline"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunMedium /> : <MoonStar />}
      {isDark ? "Light" : "Dark"}
    </Button>
  );
}
