import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout as delay } from 'node:timers/promises';

const base = 'http://127.0.0.1:9179';
const child = spawn(process.execPath, ['server.mjs', '--port', '9179', '--verify'], { stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', chunk => { output += chunk; });
child.stderr.on('data', chunk => { output += chunk; });
try {
  let ready = false;
  for (let i = 0; i < 30; i++) {
    if (child.exitCode !== null) throw new Error(`Server could not start on port 9179:\n${output}`);
    if (output.includes('Garden running')) { ready = true; break; }
    await delay(100);
  }
  assert.ok(ready, `Server startup timed out: ${output}`);
  for (const [path, contentType] of [['/', 'text/html'], ['/src/app.js', 'text/javascript'], ['/src/world.js', 'text/javascript'], ['/src/simulation.js', 'text/javascript'], ['/src/styles.css', 'text/css'], ['/public/favicon.svg', 'image/svg+xml']]) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.ok(response.headers.get('content-type').startsWith(contentType));
    assert.ok((await response.text()).length > 10);
    console.log(`✓ ${path} served on port 9179`);
  }
  assert.equal((await fetch(base + '/not-a-real-file')).status, 404);
  assert.equal((await fetch(base + '/.git/config')).status, 403);
  console.log('✓ Runtime resource delivery and route boundaries passed');
} finally {
  child.kill('SIGTERM');
}
