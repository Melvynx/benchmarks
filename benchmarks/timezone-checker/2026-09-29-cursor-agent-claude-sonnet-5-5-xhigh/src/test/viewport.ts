/** Minimal `matchMedia` stand-in: only `(min-width: Npx)` queries are understood. */
let viewportWidth = 1280

const listeners = new Set<() => void>()

function matches(query: string): boolean {
  const min = /\(min-width:\s*(\d+)px\)/.exec(query)
  return min ? viewportWidth >= Number(min[1]) : false
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    get matches() {
      return matches(query)
    },
    media: query,
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }),
})

export function setViewportWidth(width: number) {
  viewportWidth = width
  listeners.forEach((listener) => listener())
}

export function resetViewport() {
  viewportWidth = 1280
}
