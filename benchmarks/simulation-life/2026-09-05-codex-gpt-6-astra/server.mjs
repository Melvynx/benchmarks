import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 9160;
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
http.createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + '/')) { response.writeHead(403).end(); return; }
  try { response.setHeader('Content-Type', types[extname(file)] || 'text/plain'); response.end(await readFile(file)); }
  catch { response.writeHead(404).end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log(`Garden listening on http://localhost:${port}`));
