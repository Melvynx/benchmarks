import { mkdir, copyFile, cp } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('index.html', 'dist/index.html');
await cp('src', 'dist/src', { recursive: true, filter: source => !source.endsWith('.test.js') });
await cp('public', 'dist/public', { recursive: true });
console.log('Built a self-contained garden in dist/. No external dependencies.');
