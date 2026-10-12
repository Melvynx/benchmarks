import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const vite = await createServer({
  configFile: false,
  plugins: [react()],
  server: { middlewareMode: true, hmr: { server: new EventEmitter() } },
  optimizeDeps: { noDiscovery: true },
  appType: 'custom',
})

try {
  const { default: App } = await vite.ssrLoadModule('/src/App.tsx')
  const renderWith = config => {
    globalThis.localStorage = {
      getItem: () => config === null ? null : JSON.stringify(config),
      setItem: () => {},
    }
    return renderToStaticMarkup(createElement(App))
  }

  const defaults = renderWith(null)
  assert.match(defaults, /<h1>GPT-6<\/h1>/)
  for (const name of ['San Francisco', 'Denpasar', 'Geneva']) assert.match(defaults, new RegExp(name))
  assert.match(defaults, /Shared availability/)
  assert.match(defaults, /Green cells = everyone awake/)
  assert.match(defaults, /class="hour-tile overlap"/)

  const base = renderWith({
    cityIds: ['san-francisco', 'denpasar', 'geneva'],
    mode: 'base',
    settings: { wakeHour: 7, sleepHour: 23, timeFormat: '24h' },
  })
  assert.match(base, /One-to-one availability/)
  assert.match(base, /Green cells = awake with the reference city/)
  assert.match(base, /aria-pressed="true"[^>]*>.*Base mode/)

  const none = renderWith({
    cityIds: ['san-francisco', 'denpasar'],
    mode: 'meeting',
    settings: { wakeHour: 9, sleepHour: 17, timeFormat: '12h' },
  })
  assert.match(none, /No shared awake hours/)

  const empty = renderWith({ cityIds: [], mode: 'meeting', settings: { wakeHour: 7, sleepHour: 23, timeFormat: '12h' } })
  assert.match(empty, /Where should we start\?/)

  console.log('Rendered UI checks passed')
} finally {
  await vite.close()
}
