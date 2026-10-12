import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
export function createServer(){return http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,'http://localhost');
    const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    if(pathname!=='/index.html'&&!/^\/src\/[a-zA-Z0-9-]+\.(js|css)$/.test(pathname)){res.writeHead(404);res.end('Not found');return;}
    const file=path.resolve(root,'.'+pathname);
    const data=await readFile(file);
    res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8'})[file.split('.').pop()]);
    res.setHeader('Cache-Control','no-cache');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.end(data);
  }catch{res.writeHead(404);res.end('Not found');}
});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createServer().listen(9196,'0.0.0.0',()=>console.log('GPT-6 mail listening on http://localhost:9196'));
