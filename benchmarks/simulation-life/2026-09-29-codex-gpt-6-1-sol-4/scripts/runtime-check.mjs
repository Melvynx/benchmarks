import assert from 'node:assert/strict';
import { server } from '../server.mjs';
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(9189, '127.0.0.1', resolve); });
try {
  for (const [route, type] of [['/', 'text/html'], ['/styles.css', 'text/css'], ['/app.js', 'text/javascript'], ['/simulation.js', 'text/javascript'], ['/renderer.js', 'text/javascript'], ['/charts.js', 'text/javascript'], ['/favicon.svg', 'image/svg+xml']]) {
    const response = await fetch('http://127.0.0.1:9189' + route);
    assert.equal(response.status, 200, route);
    assert(response.headers.get('content-type').includes(type), route);
    const body = await response.text();
    assert(body.length > 0);
    if (route === '/') assert(body.includes('<title>GPT-6</title>'));
  }
  const missing = await fetch('http://127.0.0.1:9189/does-not-exist'); assert.equal(missing.status, 404);
  console.log('PASS: runtime on port 9189 serves the page and every application asset with correct content types; unknown files return 404.');
} finally { await new Promise(resolve => server.close(resolve)); }
