import assert from 'node:assert/strict';
import {createMailServer} from '../server.mjs';
const server=createMailServer();
try{
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(9187,'127.0.0.1',resolve);});
 const index=await fetch('http://127.0.0.1:9187/');assert.equal(index.status,200);assert((await index.text()).includes('<title>GPT-6</title>'));
 for(const asset of ['src/app.js','src/style.css','src/data.js','src/icons.js','src/attachments.js']){const response=await fetch('http://127.0.0.1:9187/'+asset);assert.equal(response.status,200,asset);assert((await response.text()).length>100);}
 assert.equal((await fetch('http://127.0.0.1:9187/missing-file')).status,404);
 assert.equal((await fetch('http://127.0.0.1:9187/.hidden')).status,403);
 console.log('Passed: bounded runtime HTTP verification on port 9187; HTML, every application asset, 404 and hidden-file protection.');
}finally{await new Promise(resolve=>server.close(resolve));}
