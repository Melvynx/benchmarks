import { cp, mkdir } from 'node:fs/promises';
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'src', 'public']) await cp(file, `dist/${file}`, { recursive: true });
console.log('Built dependency-free garden → dist/');
