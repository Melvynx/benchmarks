"use client"

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = "light" | "dark" | "system"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const initialState: ThemeProviderState = {
  theme: "light",
  setTheme: () => null,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "light",
  storageKey = "vite-ui-theme",
  attribute = "class",
  enableSystem = false,
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem(storageKey) as Theme | null
      return storedTheme || defaultTheme
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement
    
    // Handle system theme
    const resolvedTheme = theme === "system" && enableSystem 
      ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      : theme
    
    root.classList.remove("light", "dark")
    root.classList.add(resolvedTheme)
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, theme)
    }
  }, [theme, storageKey, enableSystem])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      setTheme(theme)
    },
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined) 
    throw new Error('useTheme must be used within a ThemeProvider')

  return context
}