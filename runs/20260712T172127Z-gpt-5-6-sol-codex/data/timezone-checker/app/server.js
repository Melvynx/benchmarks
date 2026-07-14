import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml' };
createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent((req.url || '/').split('?')[0]);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = normalize(join(root, relative));
    if (!file.startsWith(root)) throw new Error('invalid path');
    const data = await readFile(file);
    res.writeHead(200, {'Content-Type': types[extname(file)] || 'application/octet-stream'}); res.end(data);
  } catch { res.writeHead(404, {'Content-Type':'text/plain'}); res.end('Not found'); }
}).listen(9107, '127.0.0.1', () => console.log('Meridian running at http://localhost:9107'));
