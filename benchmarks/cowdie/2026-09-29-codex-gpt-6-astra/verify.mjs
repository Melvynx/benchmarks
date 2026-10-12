import assert from 'node:assert/strict';
import {server} from './server.mjs';
try {
  if(!server.listening)await new Promise(resolve=>server.once('listening',resolve));
  const home=await fetch('http://localhost:9193');
  assert.equal(home.status,200);
  assert.match(await home.text(),/<title>GPT-6<\/title>/);
  for(const file of ['main.js','scene.js','style.css']){
    const response=await fetch('http://localhost:9193/src/'+file);
    assert.equal(response.status,200);
    assert.ok((await response.text()).length>1000);
  }
  assert.equal((await fetch('http://localhost:9193/missing-file')).status,404);
  console.log('PASS: port 9193, app title, JavaScript, WebGL scene, stylesheet, and 404 handling.');
} finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
