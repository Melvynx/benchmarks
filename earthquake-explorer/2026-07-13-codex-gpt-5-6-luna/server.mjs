import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))
const port = Number(process.env.PORT || 9126)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/plain' }

createServer(async (request, response) => {
  const pathname = decodeURIComponent((request.url || '/').split('?')[0])
  const safePath = normalize(pathname === '/' ? '/index.html' : pathname)
  const filePath = join(root, safePath)
  if (!filePath.startsWith(root)) {
    response.writeHead(403)
    response.end('Forbidden')
    return
  }
  try {
    const data = await readFile(filePath)
    response.writeHead(200, { 'Content-Type': `${types[extname(filePath)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' })
    response.end(data)
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    response.end('Not found')
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Seismic Observatory running at http://localhost:${port}`)
})
