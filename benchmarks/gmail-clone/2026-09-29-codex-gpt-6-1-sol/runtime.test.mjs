import test from 'node:test';
import assert from 'node:assert/strict';
test('application is served on the required port 9187',async context=>{
 const {server}=await import('./server.mjs');
 const error=await new Promise(resolve=>{
  server.once('error',resolve);
  server.listen(9187,'127.0.0.1',()=>resolve(null));
 });
 if(error){
  if(error.code==='EPERM'){context.skip('Sandbox forbids listening on port 9187; runtime not verified.');return;}
  throw error;
 }
 try {
  const page=await fetch('http://localhost:9187/');
  assert.equal(page.status,200);
  assert.match(await page.text(),/<title>Codex<\/title>/);
  for(const file of ['app.js','mailbox.js','style.css']){
   const response=await fetch(`http://localhost:9187/${file}`);
   assert.equal(response.status,200);
   assert.ok((await response.text()).length>100);
  }
  assert.equal((await fetch('http://localhost:9187/missing')).status,404);
 } finally {await new Promise(resolve=>server.close(resolve));}
});
