import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const getInitial = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  }
  const [matches, setMatches] = useState<boolean>(getInitial)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    media.addEventListener('change', handler)
    setMatches(media.matches)
    return () => media.removeEventListener('change', handler)
  }, [query])

  return matches
}