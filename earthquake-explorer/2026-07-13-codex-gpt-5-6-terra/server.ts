const root = import.meta.dir
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' }
const port = Number(Bun.env.PORT || 9127)
Bun.serve({ port, hostname: '0.0.0.0', fetch(request) { const url = new URL(request.url); const path = url.pathname === '/' ? '/index.html' : url.pathname; const file = Bun.file(`${root}${path}`); return new Response(file, { headers: { 'content-type': mime[path.slice(path.lastIndexOf('.'))] || 'application/octet-stream', 'cache-control': 'no-cache' } }) } })
console.log(`Seismic Field Notes running at http://localhost:${port}`)
