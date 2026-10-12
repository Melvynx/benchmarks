import { mkdir, readFile, writeFile, readdir, copyFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { join } from 'node:path';

await mkdir('dist/src', { recursive: true });
await mkdir('dist/public', { recursive: true });
for (const file of await readdir('src')) {
  if (file.endsWith('.test.ts') || file.endsWith('.tsx')) continue;
  const source = await readFile(join('src', file));
  const output = file.endsWith('.ts') ? stripTypeScriptTypes(source.toString(), { mode: 'strip' }) : source;
  await writeFile(join('dist/src', file), output);
}
await copyFile('index.html', 'dist/index.html');
for (const file of await readdir('public')) await copyFile(join('public', file), join('dist/public', file));
console.log('Production build complete: dist/');
