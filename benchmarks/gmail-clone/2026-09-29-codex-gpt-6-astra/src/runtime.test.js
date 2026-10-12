import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
test('application serves its shell and modules on port 9196',async()=>{
 const server=createServer();
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(9196,'127.0.0.1',resolve)});
 try{
  for(const [route,type] of [['/','text/html'],['/src/main.js','text/javascript'],['/src/mail.js','text/javascript'],['/src/style.css','text/css']]){
   const response=await fetch('http://127.0.0.1:9196'+route);assert.equal(response.status,200);assert.ok(response.headers.get('content-type').startsWith(type));const body=await response.text();assert.ok(body.length>100);if(route==='/')assert.ok(body.includes('<title>GPT-6</title>'));
  }
  assert.equal((await fetch('http://127.0.0.1:9196/package.json')).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
