import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {seedMailbox,seedDrafts,defaultLabels} from '../src/data.js';
for(const file of ['src/app.js','src/data.js','src/icons.js','src/attachments.js','server.mjs'])execFileSync(process.execPath,['--check',file],{stdio:'inherit'});
const mail=seedMailbox();assert.equal(new Set(mail.map(m=>m.id)).size,mail.length);assert(mail.length>=25);for(const m of mail){assert(m.subject&&m.body&&m.email);assert(Array.isArray(m.labels));assert(Array.isArray(m.thread));assert.equal(m.count,m.thread.length+1);assert(Array.isArray(m.attachments));assert(!Number.isNaN(new Date(m.date).getTime()));}assert(mail.some(m=>m.folder==='sent'));assert(mail.some(m=>m.folder==='trash'));assert(mail.some(m=>m.unread));assert(mail.some(m=>m.starred));assert(seedDrafts.length);assert(defaultLabels.length>=4);assert(readFileSync('index.html','utf8').includes('<title>GPT-6</title>'));assert(readFileSync('server.mjs','utf8').includes('listen(9187'));console.log('Passed: JavaScript syntax, seed integrity, mailbox coverage, title, and port configuration.');

execFileSync(process.execPath,['scripts/workflows.mjs'],{stdio:'inherit'});
