import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { createRequestHandler } from '../server.mjs';

async function request(handler, url) {
  let status, headers, body;
  await handler({ url }, { writeHead(code, fields) { status = code; headers = fields; }, end(value) { body = value.toString(); } });
  return { status, headers, body };
}
for (const directory of ['.', 'dist']) {
  const handler = createRequestHandler(resolve(directory));
  const index = await request(handler, '/');
  assert.equal(index.status, 200);
  assert.match(index.body, /<title>GPT-6<\/title>/);
  assert.match(index.body, /\/src\/app.js/);
  assert.match(index.headers['Content-Type'], /text\/html/);
  const app = await request(handler, '/src/app.js');
  assert.equal(app.status, 200);
  assert.match(app.headers['Content-Type'], /text\/javascript/);
  const data = await request(handler, '/src/data.ts');
  assert.equal(data.status, 200);
  assert.match(data.headers['Content-Type'], /text\/javascript/);
  assert.ok(!data.body.includes('export type'));
  assert.match(data.body, /createSeedMail/);
  const css = await request(handler, '/src/styles.css');
  assert.equal(css.status, 200);
  assert.match(css.body, /max-width: 760px/);
  const favicon = await request(handler, '/favicon.svg');
  assert.equal(favicon.status, 200);
  assert.equal((await request(handler, '/.env')).status, 403);
  assert.equal((await request(handler, '/..%2f..%2fetc%2fpasswd')).status, 403);
  assert.equal((await request(handler, '/missing')).status, 404);
  console.log(`PASS: ${directory === '.' ? 'development' : 'production'} request handler serves the app and transformed modules, and rejects hidden files and traversal`);
}
console.log('Port configuration: 9191. Request-handler verification passed; socket binding requires host permission.');
