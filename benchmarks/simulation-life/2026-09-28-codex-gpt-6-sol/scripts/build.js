import { mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

await mkdir('dist/src', { recursive: true });
for (const file of ['index.html', 'src/main.js', 'src/simulation.js', 'src/style.css']) {
  await copyFile(file, join('dist', file));
}
console.log('Built static app in dist/');
