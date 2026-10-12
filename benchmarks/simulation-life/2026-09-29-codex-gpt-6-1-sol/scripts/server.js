import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';

const portIndex = process.argv.indexOf('--port');
const port = portIndex < 0 ? 9198 : Number(process.argv[portIndex + 1]);
const root = resolve(process.argv.includes('--dist') ? 'dist' : '.');
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export const server = http.createServer(async (request,response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${root}${sep}`)) {response.writeHead(403);response.end('Forbidden');return;}
    const content = await readFile(file);
    response.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'});
    response.end(content);
  } catch {response.writeHead(404);response.end('Not found');}
});
server.on('error', error => {console.error(error.message);process.exitCode=1;});
server.listen(port,'0.0.0.0',()=>console.log(`Garden ready at http://localhost:${port}`));
