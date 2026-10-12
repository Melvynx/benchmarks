import assert from 'node:assert/strict';

// A rendering/event integration harness, not a browser or visual-layout test.
// It exercises the production entry point without requiring sockets or a DOM package.
const elements = new Map();
const listeners = new Map();
const storage = new Map();
class Element {
  constructor(id = '', dataset = {}) {
    this.id = id; this.dataset = dataset; this.style = {}; this.innerHTML = ''; this.innerText = ''; this.textContent = ''; this.value = ''; this.tagName = 'DIV';
    this.classList = { add() {}, remove() {}, toggle() {}, contains: name => this.classes?.includes(name) ?? false };
  }
  querySelector(selector) {
    const key = `${this.id}:${selector}`;
    if (!elements.has(key)) elements.set(key, new Element(key));
    return elements.get(key);
  }
  querySelectorAll() { return []; }
  closest() { return this; }
  focus() {}
  scrollTo() {}
  scrollIntoView() {}
  setAttribute() {}
  hasAttribute() { return false; }
  getBoundingClientRect() { return { left: 100, top: 100, bottom: 130 }; }
  get firstElementChild() { return this.querySelector(':first-child'); }
  get offsetWidth() { return 230; }
  get offsetHeight() { return 180; }
}
globalThis.document = {
  getElementById(id) { if (!elements.has(id)) elements.set(id, new Element(id)); return elements.get(id); },
  documentElement: { dataset: {} }, activeElement: new Element('body'),
  addEventListener(type, callback) { listeners.set(type, callback); },
};
globalThis.window = { innerWidth: 1440, innerHeight: 900, addEventListener() {} };
globalThis.location = { hash: '' };
globalThis.history = { replaceState() {} };
globalThis.localStorage = { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) };
globalThis.requestAnimationFrame = callback => callback();
globalThis.setInterval = () => 0;
const nativeTimeout = globalThis.setTimeout;
globalThis.setTimeout = (callback, delay) => { const timer = nativeTimeout(callback, delay); timer.unref(); return timer; };
await import('../src/app.js');

const shell = document.getElementById('app-shell');
const composer = document.getElementById('composer-root');
const current = () => JSON.parse(storage.get('gpt6-mail-v1-messages'));
function click(action, dataset = {}) {
  const target = new Element('', { action, ...dataset });
  listeners.get('click')({ target, preventDefault() {} });
}
function composeInput(name, value) {
  const target = new Element(); target.name = name; target.value = value;
  composer.oninput({ target });
}
function composeClick(caction, dataset = {}) {
  composer.onclick({ target: new Element('', { caction, ...dataset }), stopPropagation() {} });
}

assert.match(shell.innerHTML, /<h1>GPT-6<\/h1>/);
assert.match(shell.innerHTML, /Website redesign/);
assert.match(shell.innerHTML, /role="tablist"/);
console.log('PASS: production entry point renders the full seeded inbox');

click('open', { id: 'mail-1' });
assert.match(shell.innerHTML, /conversation-messages/);
assert.match(shell.innerHTML, /Olivia Chen/);
assert.match(shell.innerHTML, /Alex Morgan/);
assert.match(shell.innerHTML, /Website redesign.pdf/);
assert.equal(current().find(mail => mail.id === 'mail-1').read, true);
click('archive');
assert.equal(current().find(mail => mail.id === 'mail-1').folder, 'archive');
click('undo');
assert.equal(current().find(mail => mail.id === 'mail-1').folder, 'inbox');
console.log('PASS: opening marks read; conversation hierarchy, archive, and undo work');

click('star-one', { id: 'mail-2' });
assert.equal(current().find(mail => mail.id === 'mail-2').starred, true);
const selection = new Element('', { select: 'mail-3' }); selection.checked = true;
listeners.get('change')({ target: selection });
assert.match(shell.innerHTML, /1 selected/);
click('apply-label', { label: 'Travel', remove: 'false' });
assert.ok(current().find(mail => mail.id === 'mail-3').labels.includes('Travel'));
click('navigate', { view: 'label:Travel' });
assert.match(shell.innerHTML, /Quick sync on the Q4 roadmap/);
console.log('PASS: selection, starring, labeling, and label navigation are consistent');

const search = new Element('mail-search'); search.value = 'from:olivia has:attachment';
listeners.get('input')({ target: search });
assert.match(shell.innerHTML, /Search results/);
assert.match(shell.innerHTML, /Website redesign/);
assert.ok(!shell.innerHTML.includes('Saturday coffee'));
console.log('PASS: real search input filters the rendered mailbox');

click('clear-search');
click('compose');
composeClick('send');
assert.match(composer.querySelector('.compose-error').textContent, /valid email/);
composeInput('to', 'olivia@studio.co');
composeInput('subject', 'Integration test message');
composeClick('close');
const draft = current().find(mail => mail.subject === 'Integration test message');
assert.equal(draft.folder, 'drafts');
click('navigate', { view: 'drafts' });
assert.match(shell.innerHTML, /Integration test message/);
click('open', { id: draft.id });
assert.match(composer.innerHTML, /Integration test message/);
composeClick('send');
assert.equal(current().find(mail => mail.id === draft.id).folder, 'sent');
click('navigate', { view: 'sent' });
assert.match(shell.innerHTML, /Integration test message/);
click('undo');
assert.equal(current().find(mail => mail.id === draft.id).folder, 'drafts');
composeClick('close');
console.log('PASS: invalid recipients are blocked; draft saves, reopens, sends, and send undo restores it');

click('navigate', { view: 'inbox' });
click('open', { id: 'mail-4' });
click('trash');
assert.equal(current().find(mail => mail.id === 'mail-4').folder, 'trash');
click('navigate', { view: 'trash' });
assert.match(shell.innerHTML, /Olivia mentioned you/);
click('open', { id: 'mail-4' });
click('restore');
assert.equal(current().find(mail => mail.id === 'mail-4').folder, 'inbox');
click('set-theme', { theme: 'dark' });
assert.equal(document.documentElement.dataset.theme, 'dark');
console.log('PASS: trash, restore, and theme settings update the rendered app and persistence');
console.log('All 6 rendering/event integration scenarios passed. Browser visual verification remains separate.');
