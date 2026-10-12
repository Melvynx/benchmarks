import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { handleRequest } from '../server.mjs'

const elements = new Map()
const listeners = new Map()
const storage = new Map()

function element(id) {
  if (!elements.has(id)) {
    let html = ''
    elements.set(id, {
      get innerHTML() { return html },
      set innerHTML(value) { html = value; this.writes++ },
      writes: 0, hidden: false, classList: { toggle() {} }, focus() {}, setSelectionRange() {},
    })
  }
  return elements.get(id)
}

globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
}
globalThis.document = {
  documentElement: { dataset: {} },
  getElementById: element,
  querySelector: () => null,
  addEventListener: (name, listener) => listeners.set(name, listener),
}
globalThis.confirm = () => true

await import('../src/main.js')

const mailbox = () => JSON.parse(storage.get('gpt-6-mailbox-v1'))
const panel = () => element('mail-panel').innerHTML
const click = (action, id, value) => listeners.get('click')({
  target: { closest: selector => selector === '[data-action]' ? { dataset: { action, id, value }, tagName: 'BUTTON' } : null },
})
const type = (field, value) => listeners.get('input')({ target: { dataset: { composeField: field }, value } })

assert.match(element('topbar').innerHTML, /<h1>GPT-6<\/h1>/)
assert.match(panel(), /The final brand direction is ready/)
assert.equal(mailbox().threads.length, 25)

click('open-thread', 'thread-0')
assert.match(panel(), /CONVERSATION · 2 MESSAGES/)
assert.equal(mailbox().threads[0].unread, false)
click('star', 'thread-0')
assert.equal(mailbox().threads[0].starred, false)
click('attachment', 'thread-0', 'Northstar brand direction.pdf')
assert.match(element('preview-layer').innerHTML, /SAMPLE ATTACHMENT/)
click('close-preview')
assert.equal(element('preview-layer').innerHTML, '')
click('expand-message', 'message-0-1')
assert.equal([...panel().matchAll(/message-card collapsed/g)].length, 2)
click('reply')
type('body', 'Thanks, Olivia. I will review the final deck today.')
click('send')
assert.equal(mailbox().threads[0].messages.length, 3)
assert.equal(mailbox().threads[0].messages[2].outgoing, true)

click('nav', undefined, 'drafts')
assert.match(panel(), /Notes from our conversation/)
click('open-draft', 'draft-1')
type('body', 'Hi Jules, here is the updated project plan.')
click('close-compose')
assert.equal(mailbox().drafts.find(d => d.id === 'draft-1').body, 'Hi Jules, here is the updated project plan.')

const draftCount = mailbox().drafts.length
click('compose')
type('to', 'temporary@example.com')
type('to', '')
click('close-compose')
assert.equal(mailbox().drafts.length, draftCount, 'cleared drafts should disappear')

click('compose')
type('to', 'sofia@fieldnotes.co')
type('subject', 'Lunch on Tuesday')
type('body', 'Tuesday at noon sounds perfect.')
click('send')
assert(mailbox().threads.some(t => t.folder === 'sent' && t.subject === 'Lunch on Tuesday'))
assert(!mailbox().drafts.some(d => d.subject === 'Lunch on Tuesday'))

click('nav', undefined, 'inbox')
click('category', undefined, 'updates')
assert.match(panel(), /Your team’s week in Northstar/)
click('category', undefined, 'primary')
click('archive-one', 'thread-2')
assert.equal(mailbox().threads.find(t => t.id === 'thread-2').folder, 'archive')
click('undo')
assert.equal(mailbox().threads.find(t => t.id === 'thread-2').folder, 'inbox')
click('trash-one', 'thread-2')
assert.equal(mailbox().threads.find(t => t.id === 'thread-2').folder, 'trash')
listeners.get('input')({ target: { id: 'mail-search', dataset: {}, value: 'in:trash subject:Coffee' } })
assert.match(panel(), /Coffee next week\?/)
click('nav', undefined, 'trash')
click('select', 'thread-2')
assert.match(panel(), /list-toolbar toolbar has-selection/)
click('restore-selected')
assert.equal(mailbox().threads.find(t => t.id === 'thread-2').folder, 'inbox')

click('nav', undefined, 'inbox')
click('select', 'thread-2')
click('labels')
click('apply-label', undefined, 'Finance')
assert(mailbox().threads.find(t => t.id === 'thread-2').labels.includes('Finance'))

click('labels')
const NativeFormData = globalThis.FormData
globalThis.FormData = class { get() { return 'Follow up' } }
listeners.get('submit')({ target: { dataset: { form: 'new-label' } }, preventDefault() {} })
globalThis.FormData = NativeFormData
assert(mailbox().threads.find(t => t.id === 'thread-2').labels.includes('Follow up'))

click('compose')
type('to', 'saved@example.com')
click('archive-one', 'thread-2')
type('subject', 'Keep this draft')
click('undo')
assert.equal(mailbox().threads.find(t => t.id === 'thread-2').folder, 'inbox')
assert(mailbox().drafts.some(draft => draft.subject === 'Keep this draft'), 'undo should preserve unrelated draft edits')
click('close-compose')

click('theme')
assert.equal(document.documentElement.dataset.theme, 'dark')
click('density')
assert.equal(document.documentElement.dataset.density, 'compact')

const topbarWrites = element('topbar').writes
listeners.get('input')({ target: { id: 'mail-search', dataset: {}, value: 'subject:Coffee', selectionStart: 14 } })
assert.match(panel(), /Coffee next week\?/)
assert.doesNotMatch(panel(), /The final brand direction is ready/)
assert.equal(element('topbar').writes, topbarWrites, 'typing search should keep the input mounted')

const external = mailbox()
external.threads.find(thread => thread.id === 'thread-0').starred = true
storage.set('gpt-6-mailbox-v1', JSON.stringify(external))
click('refresh')
click('nav', undefined, 'starred')
assert.match(panel(), /The final brand direction is ready/)

click('nav', undefined, 'inbox')
listeners.get('keydown')({
  target: { tagName: 'DIV', isContentEditable: false, matches: selector => selector === '.mail-row', dataset: { action: 'open-thread', id: 'thread-2' } },
  key: 'Enter', preventDefault() {},
})
assert.match(panel(), /CONVERSATION · 1 MESSAGE/)
click('forward')
click('compose')
assert(mailbox().drafts.some(draft => draft.subject === 'Fwd: Coffee next week?'), 'replacing an open composer should save its content')
click('close-compose')

click('nav', undefined, 'trash')
const trashed = mailbox().threads.find(thread => thread.folder === 'trash')
click('open-thread', trashed.id)
click('reply')
type('body', 'Following up on this conversation.')
click('send')
assert.equal(mailbox().threads.find(thread => thread.id === trashed.id).folder, 'inbox')

await import('../src/main.js?reload=1')
click('nav', undefined, 'sent')
assert.match(panel(), /Lunch on Tuesday/)
assert.equal(document.documentElement.dataset.theme, 'dark')

const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
assert.match(css, /@media \(max-width: 650px\)/)
assert.match(css, /\.compose-window/)

async function request(url) {
  const response = { status: 0, headers: {}, body: null,
    writeHead(status, headers = {}) { this.status = status; this.headers = headers; return this },
    end(body) { this.body = body; return this },
  }
  await handleRequest({ url }, response)
  return response
}
const home = await request('/')
assert.equal(home.status, 200)
assert.match(home.body.toString(), /<title>GPT-6<\/title>/)
assert.equal((await request('/src/main.js')).headers['Content-Type'], 'text/javascript')
assert.equal((await request('/package.json')).status, 403)
assert.equal((await request('/%GG')).status, 400)

console.log('Smoke flows passed: mail actions, compose and persistence, search, labels, settings, responsive rules, and static HTTP delivery.')
