import {mkdir,copyFile,cp} from 'node:fs/promises';
await mkdir('dist',{recursive:true});await copyFile('index.html','dist/index.html');await cp('src','dist/src',{recursive:true});console.log('Production build created in dist');
