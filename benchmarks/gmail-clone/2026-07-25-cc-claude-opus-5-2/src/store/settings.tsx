import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Settings } from '@/lib/types'

const KEY = 'opus5mail.settings.v1'

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  density: 'default',
  readingPane: 'none',
  conversationView: true,
  showCategoryTabs: true,
  undoSendSeconds: 8,
  signature: 'Avery Chen · Product Engineering · Meridian',
  signatureEnabled: true,
  keyboardShortcuts: true,
  pageSize: 50,
  markAsReadDelayMs: 0,
  hoverActions: true,
  sendAndArchive: false,
  previewText: true,
  starClicked: false,
}

function load(): Settings {
  if (typeof localStorage === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

interface SettingsContextValue {
  settings: Settings
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void
  reset: () => void
  /** Resolved light/dark after applying "system". */
  resolvedTheme: 'light' | 'dark'
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)
  const [systemDark, setSystemDark] = useState(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    settings.theme === 'system' ? (systemDark ? 'dark' : 'light') : settings.theme

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark')
    document.documentElement.style.colorScheme = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(settings))
    } catch {
      /* ignore */
    }
  }, [settings])

  const set = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }, [])
  const reset = useCallback(() => setSettings(DEFAULT_SETTINGS), [])

  const value = useMemo(
    () => ({ settings, set, reset, resolvedTheme }),
    [settings, set, reset, resolvedTheme],
  )
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>')
  return ctx
}

export const DENSITY_ROW: Record<Settings['density'], string> = {
  default: 'min-h-[44px] py-[7px]',
  comfortable: 'min-h-[40px] py-[5px]',
  compact: 'min-h-[34px] py-[2px]',
}
