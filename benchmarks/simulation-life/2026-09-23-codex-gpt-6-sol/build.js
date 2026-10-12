import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { Script } from 'node:vm';

const [html, css, simulation, main] = await Promise.all([
  readFile('index.html', 'utf8'),
  readFile('src/styles.css', 'utf8'),
  readFile('src/simulation.js', 'utf8'),
  readFile('src/main.js', 'utf8'),
]);
const styleTag = '<link rel="stylesheet" href="/src/styles.css" />';
const scriptTag = '<script type="module" src="/src/main.js"></script>';
const mainImport = "import { advance, createWorld, defaults, presets, snapshot } from './simulation.js';";
if (!html.includes(styleTag) || !html.includes(scriptTag) || !main.includes(mainImport)) {
  throw new Error('Build entry points changed; update the standalone bundle step.');
}
const script = `${simulation.replace(/^export /gm, '')}\n${main.replace(mainImport, '')}`;
new Script(script);
const bundled = html
  .replace(styleTag, `<style>${css}</style>`)
  .replace(scriptTag, `<script>${script}</script>`);
await mkdir('dist', { recursive: true });
await writeFile('dist/index.html', bundled);
console.log('Built dist/index.html');
