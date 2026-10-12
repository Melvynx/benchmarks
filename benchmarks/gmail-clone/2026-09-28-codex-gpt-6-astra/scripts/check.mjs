import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {seed,matches} from '../src/data.js';
for(const f of ['src/app.js','src/data.js','server.mjs'])execFileSync(process.execPath,['--check',f]);
const mail=seed();assert.equal(new Set(mail.map(m=>m.id)).size,mail.length);assert(mail.some(m=>m.folder==='drafts'));assert(mail.some(m=>m.folder==='sent'));assert(mail.some(m=>m.folder==='trash'));assert(matches(mail[0],'from:alex has:attachment is:unread'));assert(!matches(mail[0],'is:read'));assert(matches(mail[0],'label:work homepage'));assert(!matches(mail[0],'unfindable-term'));assert(mail.filter(m=>m.category==='Primary'&&m.folder==='inbox').length>8);console.log('PASS: JavaScript syntax, mailbox integrity, folders, and search operators.');
