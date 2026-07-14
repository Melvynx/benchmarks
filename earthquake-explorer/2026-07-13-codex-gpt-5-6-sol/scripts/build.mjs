import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'lib.mjs']) await cp(file, `dist/${file}`);
console.info('Built static app to dist/.');
