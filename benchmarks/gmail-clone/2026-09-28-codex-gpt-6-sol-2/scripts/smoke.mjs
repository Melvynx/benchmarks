import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { seedMailbox } from '../src/data.js'

const entries = new Map()
entries.set('gpt6-mailbox-v1', JSON.stringify(seedMailbox()))
const listeners = new Map()
const root = {
  innerHTML: '',
  addEventListener(name, handler) { listeners.set(name, handler) },
}
globalThis.localStorage = {
  getItem(key) { return entries.get(key) ?? null },
  setItem(key, value) { entries.set(key, value) },
}
globalThis.document = {
  activeElement: null,
  getElementById(id) {
    if (id === 'root') return root
    return { focus() {}, blur() {}, setSelectionRange() {} }
  },
  querySelector() { return { textContent: '' } },
  addEventListener() {},
}

await import('../src/main.js')
const mailbox = () => JSON.parse(entries.get('gpt6-mailbox-v1'))
const click = (action, extras = {}) => listeners.get('click')({ target: { closest: () => ({ dataset: { action, ...extras } }) } })
const change = (action, id, checked) => listeners.get('change')({ target: { dataset: { action, id }, checked } })
const input = (field, value) => listeners.get('input')({ target: { dataset: { field }, value } })
const thread = id => mailbox().threads.find(item => item.id === id)

assert.match(root.innerHTML, /GPT-6/)
assert.match(root.innerHTML, /Design review/)
assert.equal(mailbox().threads.length, 22)

click('open', { id: 't1' })
assert.equal(thread('t1').read, true)
assert.match(root.innerHTML, /I went through the latest screens/)
click('reply')
assert.equal(mailbox().drafts.length, 2)
input('body', 'Thanks, I will review the notes today.')
click('send')
assert.equal(thread('t1').messages.length, 3)
assert.equal(mailbox().drafts.length, 1)

click('compose')
input('to', 'jordan@example.com')
input('subject', 'Project update')
input('body', 'The new version is ready.')
click('send')
assert.equal(mailbox().threads[0].subject, 'Project update')
click('navigate', { view: 'Sent' })
assert.match(root.innerHTML, /Project update/)

click('navigate', { view: 'Inbox' })
change('select', 't5', true)
click('labelsMenu')
click('applyLabel', { label: 'Personal' })
assert.ok(thread('t5').labels.includes('Personal'))
click('archive', { id: 't5' })
assert.equal(thread('t5').archived, true)
click('navigate', { view: 'Archive' })
assert.match(root.innerHTML, /A note about the presentation/)

click('searchTip', { query: 'from:maya' })
assert.match(root.innerHTML, /Design review/)
assert.doesNotMatch(root.innerHTML, /Invoice for September/)
click('clearSearch')
click('star', { id: 't5' })
assert.equal(thread('t5').starred, true)
click('navigate', { view: 'Starred' })
assert.match(root.innerHTML, /A note about the presentation/)

click('navigate', { view: 'Inbox' })
click('trash', { id: 't3' })
assert.equal(thread('t3').trashed, true)
click('navigate', { view: 'Trash' })
assert.match(root.innerHTML, /Weekend in Copenhagen/)
click('archive', { id: 't3' })
assert.equal(thread('t3').trashed, false)

click('compose')
input('subject', 'A saved draft')
click('closeComposer')
click('navigate', { view: 'Drafts' })
assert.match(root.innerHTML, /A saved draft/)

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8')
assert.match(html, /<title>GPT-6<\/title>/)
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
assert.match(css, /@media\(max-width:650px\)/)
console.log('Mailbox smoke test passed: read, reply, send, label, archive, trash, restore, star, search, drafts, and title.')
