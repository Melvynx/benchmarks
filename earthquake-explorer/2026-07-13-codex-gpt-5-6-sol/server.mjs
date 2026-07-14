import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 9128);
const root = process.cwd();
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

createServer((request, response) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  let file = normalize(join(root, pathname === '/' ? 'index.html' : pathname));
  if (!file.startsWith(root)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (statSync(file).isDirectory()) file = join(file, 'index.html');
    response.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(port, '127.0.0.1', () => console.log(`Groundwave running at http://127.0.0.1:${port}`));
