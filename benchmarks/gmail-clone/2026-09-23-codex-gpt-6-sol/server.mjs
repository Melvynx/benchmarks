import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.cwd()
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' }
const servedFiles = new Set(['index.html', 'src/main.js', 'src/data.js', 'src/styles.css'])

export async function handleRequest(request, response) {
  let pathname
  try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname) }
  catch { response.writeHead(400).end('Bad request'); return }
  const file = normalize(join(root, pathname === '/' ? 'index.html' : pathname))
  if (!file.startsWith(root + '/') || !servedFiles.has(file.slice(root.length + 1))) {
    response.writeHead(403).end('Forbidden')
    return
  }
  try {
    const info = await stat(file)
    if (!info.isFile()) throw new Error('Not a file')
    const content = await readFile(file)
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' }).end(content)
  } catch {
    response.writeHead(404).end('Not found')
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  createServer(handleRequest).listen(9173, '127.0.0.1', () => console.log('GPT-6 running at http://localhost:9173'))
}
