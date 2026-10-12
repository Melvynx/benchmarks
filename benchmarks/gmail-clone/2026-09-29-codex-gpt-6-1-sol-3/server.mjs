import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json'};
export function createMailServer(root=process.cwd()){
 return http.createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(path.resolve(root)+path.sep)||pathname.split('/').some(p=>p.startsWith('.'))){res.writeHead(403);res.end();return;}const body=await readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(body);}catch{res.writeHead(404);res.end('Not found');}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createMailServer(process.argv.includes('--preview')?path.resolve('dist'):process.cwd()).listen(9187,'0.0.0.0',()=>console.log('GPT-6 running at http://localhost:9187'));
