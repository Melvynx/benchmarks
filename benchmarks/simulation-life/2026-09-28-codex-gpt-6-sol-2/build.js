import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

for (const file of ['server.js', 'build.js', 'src/main.js', 'src/simulation.js', 'src/renderWorld.js']) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
await mkdir('dist/src', { recursive: true });
await cp('index.html', 'dist/index.html');
for (const file of ['main.js', 'simulation.js', 'renderWorld.js', 'styles.css']) {
  await cp(`src/${file}`, `dist/src/${file}`);
}
const html = await readFile('index.html', 'utf8');
const css = await readFile('src/styles.css', 'utf8');
const simulation = (await readFile('src/simulation.js', 'utf8')).replaceAll('export ', '');
const renderer = (await readFile('src/renderWorld.js', 'utf8')).replaceAll('export ', '');
const app = (await readFile('src/main.js', 'utf8')).replace(/^import .*\n/gm, '');
const standalone = html
  .replace('<link rel="stylesheet" href="/src/styles.css" />', `<style>${css}</style>`)
  .replace('<script type="module" src="/src/main.js"></script>', `<script>${simulation}\n${renderer}\n${app}</script>`);
await writeFile('dist/standalone.html', standalone);
console.log('Built static garden in dist/');
