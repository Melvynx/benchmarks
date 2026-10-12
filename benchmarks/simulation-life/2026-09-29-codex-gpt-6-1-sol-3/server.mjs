import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
export function createServer(root=process.cwd()) {
 const base=resolve(root);
 return http.createServer(async(req,res)=>{
  try {const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=resolve(base,'.'+(path==='/'?'/index.html':path));if(!file.startsWith(base+sep)){res.writeHead(403);res.end();return;}
   const body=await readFile(file);const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);const port=Number(args[args.indexOf('--port')+1])||9198;const server=createServer(args.includes('--dist')?'dist':process.cwd());server.listen(port,'0.0.0.0',()=>console.log(`Garden available at http://localhost:${port}`));}
