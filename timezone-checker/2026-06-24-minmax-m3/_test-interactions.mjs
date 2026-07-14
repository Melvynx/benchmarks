import { spawn } from 'node:child_process'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const userDataDir = '/tmp/chrome-test-profile-' + Date.now()
const args = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--user-data-dir=' + userDataDir,
  '--remote-debugging-port=9224',
  '--window-size=1280,900',
  'about:blank',
]

const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] })
let chromeReady = false
chrome.stderr.on('data', (chunk) => {
  if (chunk.toString().includes('DevTools listening on')) chromeReady = true
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
while (!chromeReady) await sleep(50)

const tabs = await fetch('http://127.0.0.1:9224/json').then((r) => r.json())
let tab = tabs.find((t) => t.type === 'page') || tabs[0]
const WebSocket = (await import('ws')).default
const ws = new WebSocket(tab.webSocketDebuggerUrl)
let nextId = 1
const pending = new Map()
const pageErrors = []

ws.on('message', (raw) => {
  const msg = JSON.parse(raw.toString())
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    pageErrors.push(msg.params.exceptionDetails)
  }
})

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, (m) => (m.error ? reject(m.error) : resolve(m.result)))
    ws.send(JSON.stringify({ id, method, params }))
  })
}

await new Promise((r) => ws.once('open', r))
await send('Runtime.enable')
await send('Page.enable')
await send('Network.enable')

// Wipe localStorage first to test defaults
await send('Page.navigate', { url: 'http://localhost:5173/?reset=1' })
await sleep(800)
await send('Runtime.evaluate', { expression: 'localStorage.clear()' })
await send('Page.navigate', { url: 'http://localhost:5173/' })
await sleep(1500)

async function evalText(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
  return r.result.value
}

async function click(selector) {
  await send('Runtime.evaluate', {
    expression: `(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return false; el.click(); return true; })()`,
    returnByValue: true,
  })
}

async function shoot(name, w = 1280, h = 900, mobile = false) {
  if (mobile) {
    await send('Emulation.setDeviceMetricsOverride', {
      width: w, height: h, deviceScaleFactor: 2, mobile: true,
    })
  } else {
    await send('Emulation.clearDeviceMetricsOverride')
  }
  await sleep(300)
  const r = await send('Page.captureScreenshot', { format: 'png' })
  const fs = await import('node:fs')
  fs.writeFileSync(`/tmp/shot-${name}.png`, Buffer.from(r.data, 'base64'))
  console.log(`  → /tmp/shot-${name}.png`)
}

console.log('\n— Initial defaults —')
let text = await evalText('document.body.innerText')
console.log('  h1:', text.match(/MiniMax-M3/)?.[0])
console.log('  default cities visible:', ['San Francisco', 'Denpasar', 'Geneva'].every(c => text.includes(c)))
console.log('  overlap badge shows 2h:', /2h overlap/.test(text))
console.log('  ranges shown:', /7am — 8am/.test(text) && /10pm — 11pm/.test(text))

console.log('\n— Switch to Base mode —')
await click("button[aria-pressed='false']:has-text('Base')")
await sleep(300)
text = await evalText('document.body.innerText')
console.log('  three per-city badges present (SF vs Denpasar, SF vs Geneva):',
  /San Francisco/.test(text) && /Denpasar ↔/.test(text) && /Geneva ↔/.test(text))

console.log('\n— Switch to 24h format —')
await click("button:has-text('24h')")
await sleep(300)
text = await evalText('document.body.innerText')
console.log('  hours shown in 24h (e.g., "07:00"):', /07:00/.test(text))
console.log('  no "am/pm" labels:', !/7am/.test(text))

console.log('\n— Back to 12h & meeting mode —')
await click("button:has-text('12h')")
await click("button[aria-pressed='false']:has-text('Meeting')")
await sleep(300)

console.log('\n— Add Tokyo —')
await evalText(`(() => { const i = document.querySelector('input[aria-label="Add city"]'); i.focus(); i.value = ''; i.dispatchEvent(new Event('input', { bubbles: true })); })()`)
// Type "tokyo"
for (const ch of 'tokyo') {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch })
  await send('Input.dispatchKeyEvent', { type: 'keyUp', text: ch })
  await send('Input.dispatchKeyEvent', { type: 'char', text: ch })
}
await sleep(400)
// Click Tokyo
await send('Runtime.evaluate', {
  expression: `(() => { const btns = [...document.querySelectorAll('button')]; const t = btns.find(b => b.textContent.trim().startsWith('Tokyo')); if (t) t.click(); })()`,
})
await sleep(400)
text = await evalText('document.body.innerText')
console.log('  Tokyo added:', text.includes('Tokyo'))

console.log('\n— Promote Geneva as reference —')
await send('Runtime.evaluate', {
  expression: `(() => { const btns = [...document.querySelectorAll('button')]; const g = btns.find(b => /Geneva/.test(b.textContent) && b.title && b.title.includes('Promote')); if (g) g.click(); })()`,
})
await sleep(300)
text = await evalText('document.body.innerText')
// After promote, Geneva should be first row (REF badge next to Geneva)
const refPos = text.indexOf('REF')
const genevaPos = text.indexOf('Geneva')
console.log('  Geneva is now REF:', refPos > 0 && genevaPos > 0 && genevaPos < refPos + 30)

console.log('\n— Remove Tokyo —')
await send('Runtime.evaluate', {
  expression: `(() => { const btn = document.querySelector('button[aria-label="Remove Tokyo"]'); if (btn) btn.click(); })()`,
})
await sleep(300)
text = await evalText('document.body.innerText')
console.log('  Tokyo removed:', !text.includes('Tokyo'))

console.log('\n— Toggle awake window: wake 9, sleep 18 —')
// Find sliders by aria-label
await send('Runtime.evaluate', {
  expression: `(() => { const s = document.querySelector('input[aria-label="Wake hour"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(s, '9'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); })()`,
})
await send('Runtime.evaluate', {
  expression: `(() => { const s = document.querySelector('input[aria-label="Sleep hour"]'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(s, '18'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); })()`,
})
await sleep(400)
text = await evalText('document.body.innerText')
console.log('  awake window updated:', /09:00/.test(text) && /18:00/.test(text))

await shoot('after-interactions', 1280, 900, false)

console.log('\n— Mobile view —')
await shoot('mobile-final', 390, 844, true)

console.log('\n— localStorage persistence —')
const storage = await evalText('JSON.stringify(JSON.parse(localStorage.getItem("timezone-checker:v1")))')
console.log('  stored:', storage)
console.log('  has cities:', JSON.parse(storage).cities.length === 3)

console.log('\n— Refresh page & verify persistence —')
await send('Page.reload')
await sleep(1500)
text = await evalText('document.body.innerText')
console.log('  Geneva still REF after refresh:', /Geneva[\s\S]{0,50}REF/.test(text) || /REF[\s\S]{0,50}Geneva/.test(text))
console.log('  awake 9-18 restored:', /09:00/.test(text) && /18:00/.test(text))

console.log('\n— Page errors: —')
if (pageErrors.length === 0) console.log('  ✓ none')
else pageErrors.forEach((e) => console.log('  ✗', e.text || JSON.stringify(e)))

ws.close()
chrome.kill('SIGTERM')
await sleep(200)
process.exit(pageErrors.length === 0 ? 0 : 1)