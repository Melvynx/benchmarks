import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const port = Number(process.env.PORT || 3000);
const root = process.cwd();
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };

createServer((request, response) => {
  const requested = decodeURIComponent((request.url || '/').split('?')[0]);
  const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, '');
  let filePath = join(root, safePath === '/' ? 'index.html' : safePath);
  if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) filePath = join(root, 'index.html');
  response.setHeader('Content-Type', types[extname(filePath)] || 'application/octet-stream');
  response.setHeader('Cache-Control', 'no-cache');
  createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1', () => {
  console.log(`Elysian is blooming at http://localhost:${port}`);
});
