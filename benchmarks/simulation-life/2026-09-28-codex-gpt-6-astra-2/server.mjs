import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 9179;
const project = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(project, args.includes('--production') ? 'dist' : '.');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };

export const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep) || pathname.split('/').some(segment => segment.startsWith('.'))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(content);
  } catch {
    res.writeHead(404).end('Not found');
  }
});

server.on('error', error => {
  console.error(`Cannot start the garden on port ${port}: ${error.code || error.message}`);
  process.exitCode = 1;
});
server.listen(port, '0.0.0.0', () => console.log(`Garden running at http://localhost:${port}`));
if (args.includes('--verify')) setTimeout(() => server.close(), 120_000).unref();
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
