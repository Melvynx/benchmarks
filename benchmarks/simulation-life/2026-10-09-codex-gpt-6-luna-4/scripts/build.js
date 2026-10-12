import { cp, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

for (const file of ['src/main.js', 'server.js', 'scripts/build.js']) {
  const check = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(check.status ?? 1);
}
await mkdir('dist/src', { recursive: true });
await cp('index.html', 'dist/index.html');
await cp('src/main.js', 'dist/src/main.js');
await cp('src/style.css', 'dist/src/style.css');
console.log('Built static garden app in dist/');
