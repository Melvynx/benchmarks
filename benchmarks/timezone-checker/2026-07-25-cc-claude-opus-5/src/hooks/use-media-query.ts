import { useEffect, useState } from 'react'

/**
 * Desktop and mobile are two genuinely different layouts here (rows-as-cities
 * vs columns-as-cities), so the breakpoint is resolved in JS and only one tree
 * is ever mounted.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const list = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches)
    setMatches(list.matches)
    list.addEventListener('change', onChange)
    return () => list.removeEventListener('change', onChange)
  }, [query])

  return matches
}
