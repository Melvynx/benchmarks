import assert from 'node:assert/strict';

const handlers = {};
const fields = {};
const root = { innerHTML:'', addEventListener(type, handler) { (handlers[type] ||= []).push(handler); } };
globalThis.localStorage = { data:new Map(), getItem(key) { return this.data.get(key) || null; }, setItem(key,value) { this.data.set(key,value); } };
globalThis.document = {
  activeElement: null,
  getElementById(id) { return id === 'root' ? root : fields[id] || (fields[id] = { value:'', focus() {}, setSelectionRange() {} }); },
  addEventListener() {},
};
await import('./src/app.js');
const click = (action, dataset={}) => handlers.click.forEach(handler => handler({ target:{ closest(selector) { return selector === '[data-action]' ? { dataset:{ action,...dataset } } : null; } } }));
const stored = () => JSON.parse(localStorage.getItem('gpt-6-mail-v1'));

assert.ok(root.innerHTML.includes('GPT-6'));
assert.ok(root.innerHTML.includes('The final details for Friday'));
assert.ok(root.innerHTML.includes('Compose'));

click('open', { mailId:'m1' });
assert.ok(root.innerHTML.includes('Could you take a look at slides 12'));
assert.equal(stored().find(m => m.id === 'm1').read, true);
click('star');
assert.equal(stored().find(m => m.id === 'm1').starred, false);
click('reply');
assert.ok(root.innerHTML.includes('Reply'));
document.getElementById('compose-to').value = 'maya@northstar.design';
document.getElementById('compose-subject').value = 'Re: The final details for Friday';
document.getElementById('compose-body').value = 'Thanks, I will review the slides today.';
click('send');
assert.equal(stored().find(m => m.id === 'm1').replies.at(-1).body, 'Thanks, I will review the slides today.');
assert.equal(stored().filter(m => m.folder === 'sent').length, 4);

click('back');
click('compose');
document.getElementById('compose-to').value = 'sophie@fieldnotes.studio';
document.getElementById('compose-subject').value = 'A new plan';
document.getElementById('compose-body').value = 'Let us meet on Tuesday.';
click('save-draft');
assert.equal(stored().filter(m => m.folder === 'drafts').length, 3);
click('view', { view:'drafts' });
assert.ok(root.innerHTML.includes('A new plan'));
const draft = stored().find(m => m.subject === 'A new plan');
click('open', { mailId:draft.id });
assert.ok(root.innerHTML.includes('Let us meet on Tuesday'));
click('send');
assert.equal(stored().some(m => m.id === draft.id), false);
assert.equal(stored().find(m => m.subject === 'A new plan').folder, 'sent');

click('view', { view:'inbox' });
click('delete', { id:'m2' });
assert.equal(stored().find(m => m.id === 'm2').folder, 'trash');
click('undo');
assert.equal(stored().find(m => m.id === 'm2').folder, 'inbox');
click('archive', { id:'m3' });
assert.equal(stored().find(m => m.id === 'm3').folder, 'archive');
click('view', { view:'starred' });
assert.ok(root.innerHTML.includes('Your upcoming trip to Copenhagen'));
click('view', { view:'sent' });
assert.ok(root.innerHTML.includes('A new plan'));

click('view', { view:'inbox' });
handlers.input.forEach(handler => handler({ target:{ id:'search', value:'from:maya has:attachment', selectionStart:24 } }));
assert.ok(root.innerHTML.includes('The final details for Friday'));
assert.ok(!root.innerHTML.includes('Coffee next week?'));
click('clear-search');
click('select', { id:'m2' });
click('labels');
click('label', { label:'Work' });
assert.ok(stored().find(m => m.id === 'm2').labels.includes('Work'));
click('view', { view:'inbox' });
assert.ok(root.innerHTML.includes('The final details for Friday'));

console.log('Mailbox interactions passed: read, star, reply, draft, send, delete, undo, archive, search, labeling, and navigation.');
