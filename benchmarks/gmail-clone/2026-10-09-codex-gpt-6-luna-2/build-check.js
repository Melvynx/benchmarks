import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

for (const file of ['app.js','server.js']) execFileSync(process.execPath, ['--check', file], { stdio:'inherit' });
const [html, app, css] = await Promise.all(['index.html','app.js','styles.css'].map(path => readFile(path, 'utf8')));
const required = [
  ['document title', /<title>Codex<\/title>/i.test(html)],
  ['visible Codex title', app.includes('class="brand-name">Codex</span>')],
  ['interactive application entry', html.includes('/app.js')],
  ['inbox navigation', app.includes("['inbox','Inbox','inbox']")],
  ['message search', app.includes('function searchMatch')],
  ['local persistence', app.includes("localStorage.setItem('codex-mail-v1'")],
  ['compose and send flow', app.includes('function sendMail()')],
  ['responsive layouts', css.includes('@media(max-width:650px)')],
  ['runtime port 9102', /listen\(9102,/.test(await readFile('server.js', 'utf8'))],
];
const failed = required.filter(([,ok])=>!ok);
for (const [name,ok] of required) console.log(`${ok?'✓':'✗'} ${name}`);
if (failed.length) process.exitCode = 1;
else console.log('Build checks passed.');
