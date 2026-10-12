import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const root = process.cwd()
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }
const port = 9180

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://localhost:${port}`).pathname)
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden')
    return
  }
  try {
    const content = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(content)
  } catch {
    response.writeHead(404).end('Not found')
  }
}).listen(port, '127.0.0.1', () => console.log(`GPT-6 running on http://localhost:${port}`))
