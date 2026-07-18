import { useEffect } from 'react'
import { useMailStore } from '@/store/mail-store'

export function useThemeEffect() {
  const theme = useMailStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    const mql = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const resolved = theme === 'system' ? (mql.matches ? 'dark' : 'light') : theme
      root.classList.toggle('dark', resolved === 'dark')
    }

    apply()
    if (theme === 'system') {
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
  }, [theme])
}
