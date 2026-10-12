import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'

const root = process.cwd()
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' }

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden')
    return
  }
  try {
    const body = await readFile(file)
    response.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }).end(body)
  } catch {
    response.writeHead(404).end('Not found')
  }
}).listen(9199, '0.0.0.0', () => console.log('Cowdie is ready at http://localhost:9199'))
