import {mkdir,cp,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
execFileSync(process.execPath,['scripts/check.mjs'],{stdio:'inherit'});
await mkdir('dist/src',{recursive:true});
await cp('index.html','dist/index.html');
for(const f of ['app.js','data.js','style.css'])await cp('src/'+f,'dist/src/'+f);
console.log('Built production static app to dist/');
