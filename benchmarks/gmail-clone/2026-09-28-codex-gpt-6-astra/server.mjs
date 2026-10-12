import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
const port=Number(process.argv[process.argv.indexOf('--port')+1])||9182;
http.createServer(async(req,res)=>{try{let name=decodeURIComponent(req.url.split('?')[0]);if(name==='/')name='/index.html';const file=path.resolve('.','.'+name);if(!file.startsWith(process.cwd()+path.sep))throw Error();const data=await readFile(file);res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data)}catch{res.statusCode=404;res.end('Not found')}}).listen(port,'0.0.0.0',()=>console.log(`Mail running on http://localhost:${port}`));
