import assert from 'node:assert/strict';
import {createServer} from '../server.mjs';
const server=createServer();
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(9198,'127.0.0.1',resolve)});
try{for(const path of ['/','/src/main.js','/src/style.css','/src/simulation.js']){const r=await fetch('http://127.0.0.1:9198'+path);assert.equal(r.status,200);assert.ok((await r.text()).length>100);console.log('PASS http://127.0.0.1:9198'+path);}const html=await (await fetch('http://127.0.0.1:9198')).text();assert.ok(html.includes('<title>GPT-6</title>'));console.log('PASS browser title');}finally{await new Promise(resolve=>server.close(resolve));}
