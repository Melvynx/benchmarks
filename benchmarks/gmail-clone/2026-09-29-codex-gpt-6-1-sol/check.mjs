import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
for (const file of ['app.js', 'mailbox.js', 'server.mjs']) execFileSync(process.execPath, ['--check', file]);
const html = readFileSync('index.html', 'utf8');
if (!html.includes('<title>Codex</title>')) throw new Error('Invalid title');
console.log('All JavaScript syntax and application checks passed.');
