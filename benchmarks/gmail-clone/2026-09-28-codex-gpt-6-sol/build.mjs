import { readFile, writeFile } from 'node:fs/promises';

const data = (await readFile('src/data.js', 'utf8')).replace(/export \{[\s\S]*?\};\s*$/, '');
const app = (await readFile('src/app.js', 'utf8')).replace(/^import .*? from '\.\/data\.js';\s*/, '');
await writeFile('src/bundle.js', `// Generated from src/data.js and src/app.js.\n(()=>{\n${data}\n${app}\n})();\n`);
