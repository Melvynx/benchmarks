import { readFile } from 'node:fs/promises';
const files = ['index.html', 'styles.css', 'app.js', 'lib.mjs'];
const banned = [/\bTODO\b/, /console\.log\(/, /placeholder copy/i, /lorem ipsum/i];
let failed = false;
for (const file of files) {
  const source = await readFile(file, 'utf8');
  for (const pattern of banned) if (pattern.test(source)) { console.error(`${file}: banned pattern ${pattern}`); failed = true; }
}
if (failed) process.exit(1);
console.info(`Checked ${files.length} source files.`);
