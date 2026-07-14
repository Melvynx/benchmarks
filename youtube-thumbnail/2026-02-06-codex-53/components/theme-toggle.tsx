"use client"

import { MoonStarIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme !== "light"

  return (
    <Button
      variant="outline"
      size="icon-sm"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="border-white/20 bg-white/5 text-zinc-100 hover:bg-white/10 hover:text-zinc-100 dark:border-white/15 dark:bg-white/5 dark:text-zinc-100 dark:hover:bg-white/10"
    >
      <SunIcon className="hidden dark:block" />
      <MoonStarIcon className="block dark:hidden" />
    </Button>
  )
}
