"use client";

import * as React from "react";
import { Moon, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="border-black/10 bg-white/70 text-foreground shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
        aria-label="Toggle theme"
      >
        <SunMedium className="size-4" />
      </Button>
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      variant="outline"
      size="icon"
      className="border-black/10 bg-white/70 text-foreground shadow-sm backdrop-blur hover:bg-black/5 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {isDark ? <SunMedium className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
