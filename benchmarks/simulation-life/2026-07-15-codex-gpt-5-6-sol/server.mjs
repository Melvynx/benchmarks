import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = 9149
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }

createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname)
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '')
    const path = normalize(join(root, relative))
    if (!path.startsWith(root)) throw new Error('Invalid path')
    const info = await stat(path)
    const file = info.isDirectory() ? join(path, 'index.html') : path
    response.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
    response.end(await readFile(file))
  } catch {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`gpt-5.6-sol running at http://127.0.0.1:${port}`))
