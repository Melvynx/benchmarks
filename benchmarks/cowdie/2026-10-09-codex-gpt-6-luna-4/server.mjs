import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' }
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
    const path = resolve(root, relative)
    if (path !== root && !path.startsWith(root + sep)) throw new Error('not found')
    const content = await readFile(path)
    response.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream', 'cache-control': 'no-store' })
    response.end(content)
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
})

const port = Number(process.env.PORT || 9101)
const smoke = process.argv.includes('--smoke')
let rejectListening
const listening = smoke ? new Promise((resolve, reject) => {
  rejectListening = reject
  server.once('listening', resolve)
}) : null
server.on('error', (error) => {
  console.error(`Unable to start Cowdie on port ${port}: ${error.message}`)
  rejectListening?.(error)
  process.exitCode = 1
})
server.listen(port, '127.0.0.1', () => console.log(`Cowdie is running on http://localhost:${port}`))

if (smoke) {
  const checks = [
    ['/', '<title>GPT-6</title>'],
    ['/src/styles.css', '.scene-backdrop'],
    ['/src/app.js', 'createShader'],
  ]
  try {
    await listening
    for (const [route, expected] of checks) {
      const response = await fetch(`http://127.0.0.1:${port}${route}`)
      const body = await response.text()
      if (!response.ok || !body.includes(expected)) throw new Error(`${route}: expected ${expected}, got HTTP ${response.status}`)
      console.log(`HTTP ${response.status} ${route}`)
    }
    server.close()
  } catch (error) {
    console.error(`Runtime verification could not start: ${error.message}`)
    if (server.listening) server.close()
    process.exitCode = 1
  }
}
