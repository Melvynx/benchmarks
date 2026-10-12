import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, resolve, sep } from 'node:path'
const root = process.cwd()
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.json':'application/json; charset=utf-8' }
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost:9100').pathname)
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`)
    if (path !== root && !path.startsWith(root + sep)) throw new Error('Invalid path')
    const data = await readFile(path)
    res.writeHead(200, { 'Content-Type':types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-store' })
    res.end(data)
  } catch { res.writeHead(404, {'Content-Type':'text/plain'}); res.end('Not found') }
}).listen(9100, '0.0.0.0', () => console.log('GPT-6 listening on http://localhost:9100'))
