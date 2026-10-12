import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('.');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const candidate = resolve(root, `.${pathname}`);
    const file = candidate.startsWith(root + sep) || candidate === root ? candidate : resolve(root, 'index.html');
    const content = await readFile(file === root ? resolve(root, 'index.html') : file).catch(() => readFile(resolve(root, 'index.html')));
    response.writeHead(200, { 'content-type': types[extname(file)] || 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(content);
  } catch {
    response.writeHead(500);
    response.end('Unable to load the app.');
  }
}).listen(9199, '0.0.0.0', () => console.log('Cowdie is ready at http://localhost:9199'));
