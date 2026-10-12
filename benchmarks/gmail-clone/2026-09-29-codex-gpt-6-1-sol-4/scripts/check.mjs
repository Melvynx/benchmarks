import { readFile, readdir } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';
import { spawnSync } from 'node:child_process';

let count = 0;
for (const dir of ['src', 'scripts', '.']) {
  for (const file of await readdir(dir)) {
    if (!/\.(js|mjs|ts)$/.test(file)) continue;
    const path = `${dir}/${file}`;
    let source = await readFile(path, 'utf8');
    if (file.endsWith('.ts')) source = stripTypeScriptTypes(source, { mode: 'strip' });
    const result = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: source, encoding: 'utf8' });
    if (result.status !== 0) { console.error(path, result.stderr); process.exit(1); }
    count++;
  }
}
console.log(`Syntax and TypeScript transform checks passed for ${count} modules.`);
