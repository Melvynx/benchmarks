import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = process.cwd();
const portArg = process.argv.indexOf('--port');
const port = portArg < 0 ? 9171 : Number(process.argv[portArg + 1]);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
createServer(async (request, response) => {
  const url = new URL(request.url, `http://localhost:${port}`);
  const path = resolve(root, `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
  if (path !== root && !path.startsWith(root + sep)) { response.writeHead(403).end(); return; }
  try {
    const file = await readFile(path);
    response.writeHead(200, { 'Content-Type': `${types[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(file);
  } catch { response.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Garden running on http://localhost:${port}`));
