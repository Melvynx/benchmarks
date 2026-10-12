import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { realpathSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { stripTypeScriptTypes } from 'node:module';
import { pathToFileURL } from 'node:url';

const portIndex = process.argv.indexOf('--port');
const port = Number(portIndex === -1 ? 9191 : process.argv[portIndex + 1]);
const root = resolve(process.argv.includes('--production') ? 'dist' : '.');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.ts': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
export function createRequestHandler(directory = root) {
return async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
    const relative = pathname === '/' ? 'index.html' : pathname === '/favicon.svg' ? 'public/favicon.svg' : pathname.slice(1);
    const file = resolve(directory, relative);
    if (!file.startsWith(directory + sep) || relative.split('/').some(segment => segment.startsWith('.'))) { res.writeHead(403); res.end('Forbidden'); return; }
    let content = await readFile(file);
    if (extname(file) === '.ts') content = stripTypeScriptTypes(content.toString(), { mode: 'strip' });
    res.writeHead(200, { 'Content-Type': `${mime[extname(file)] ?? 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    res.end(content);
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Not found'); }
};
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
const server = http.createServer(createRequestHandler());
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(port, '0.0.0.0', () => console.log(`GPT-6 is running at http://localhost:${port}`));
process.on('SIGTERM', () => server.close());
process.on('SIGINT', () => server.close());
}
