import { mkdir, copyFile } from 'node:fs/promises';
await import('./check.mjs');
await mkdir('dist', { recursive: true });
for (const file of ['index.html', 'styles.css', 'app.js', 'simulation.js', 'renderer.js', 'charts.js', 'favicon.svg']) await copyFile(file, 'dist/' + file);
console.log('Built dependency-free static app in dist/');
