import {mkdir,copyFile} from 'node:fs/promises';
await mkdir('dist/src',{recursive:true});
for(const file of ['index.html','src/main.js','src/style.css','src/simulation.js'])await copyFile(file,`dist/${file}`);
console.log('Built dependency-free garden in dist/');
