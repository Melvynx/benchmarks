import {execFileSync} from 'node:child_process';
import {mkdir,cp} from 'node:fs/promises';
execFileSync(process.execPath,['scripts/check.mjs'],{stdio:'inherit'});
await mkdir('dist',{recursive:true});
await cp('index.html','dist/index.html');
await cp('src','dist/src',{recursive:true});
console.log('Built self-contained application in dist/.');
