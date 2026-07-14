import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const userDataDir = '/tmp/chrome-test-profile-' + Date.now()
const chrome = spawn(
  CHROME,
  [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    '--user-data-dir=' + userDataDir,
    '--remote-debugging-port=9225',
    '--window-size=1280,900', 'about:blank',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)
let ready = false
chrome.stderr.on('data', (c) => { if (c.toString().includes('DevTools listening on')) ready = true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
while (!ready) await sleep(50)

const tabs = await fetch('http://127.0.0.1:9225/json').then((r) => r.json())
const tab = tabs.find((t) => t.type === 'page') || tabs[0]
const WebSocket = (await import('ws')).default
const ws = new WebSocket(tab.webSocketDebuggerUrl)
let nextId = 1
const pending = new Map()
const pageErrors = []
ws.on('message', (raw) => {
  const m = JSON.parse(raw.toString())
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails)
})
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, (msg) => msg.error ? reject(msg.error) : resolve(msg.result))
    ws.send(JSON.stringify({ id, method, params }))
  })
}
await new Promise((r) => ws.once('open', r))
await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable')

async function evalJS(expr) {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true })
  return r.result.value
}
async function clickByText(needle, tag = 'button') {
  return evalJS(`(() => {
    const all = [...document.querySelectorAll(${JSON.stringify(tag)})];
    const t = all.find(b => b.textContent.trim() === ${JSON.stringify(needle)});
    if (t) { t.click(); return true; }
    return false;
  })()`)
}
async function clickByPartial(needle, tag = 'button') {
  return evalJS(`(() => {
    const all = [...document.querySelectorAll(${JSON.stringify(tag)})];
    const t = all.find(b => b.textContent.includes(${JSON.stringify(needle)}));
    if (t) { t.click(); return true; }
    return false;
  })()`)
}
async function clickAria(label) {
  return evalJS(`(() => {
    const t = document.querySelector('[aria-label=${JSON.stringify(label)}]');
    if (t) { t.click(); return true; }
    return false;
  })()`)
}
async function setSlider(label, val) {
  return evalJS(`(() => {
    const s = document.querySelector('input[aria-label=${JSON.stringify(label)}]');
    if (!s) return false;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(s, String(${val}));
    s.dispatchEvent(new Event('input', { bubbles: true }));
    s.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`)
}
async function shoot(name, w, h, mobile) {
  if (mobile) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile: true })
  } else {
    await send('Emulation.clearDeviceMetricsOverride')
  }
  await sleep(300)
  const r = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`/tmp/shot-${name}.png`, Buffer.from(r.data, 'base64'))
}

await send('Page.navigate', { url: 'http://localhost:5173/' })
await sleep(800)
await evalJS('localStorage.clear()')
await send('Page.reload'); await sleep(1200)

// 1. Defaults
let text = await evalJS('document.body.innerText')
console.log('1) defaults —')
console.log('   h1:', /MiniMax-M3/.test(text))
console.log('   has SF / Denpasar / Geneva:', ['San Francisco', 'Denpasar', 'Geneva'].every(c => text.includes(c)))
console.log('   overlap "2h overlap":', /2h overlap/.test(text))
console.log('   ranges "7am — 8am":', /7am — 8am/.test(text))
console.log('   ranges "10pm — 11pm":', /10pm — 11pm/.test(text))

// 2. Base mode
console.log('\n2) switch to Base mode —')
const clicked = await clickByText('Base')
console.log('   Base button clicked:', clicked)
await sleep(300)
text = await evalJS('document.body.innerText')
console.log('   two per-city badges:', (text.match(/↔/g) || []).length === 2)
console.log('   "Denpasar ↔ San Francisco":', /Denpasar ↔/.test(text))
console.log('   "Geneva ↔ San Francisco":', /Geneva ↔/.test(text))

// 3. Add Tokyo
console.log('\n3) add Tokyo —')
await evalJS(`(() => {
  const i = document.querySelector('input[aria-label="Add city"]');
  i.focus();
})()`)
await sleep(200)
const added = await clickByPartial('Tokyo', 'button')
console.log('   clicked Tokyo in dropdown:', added)
await sleep(400)
text = await evalJS('document.body.innerText')
console.log('   Tokyo row appears:', text.includes('Tokyo'))

// 4. Promote Geneva
console.log('\n4) promote Geneva —')
const promoted = await clickByPartial('Promote Geneva', 'button')
console.log('   promote button clicked:', promoted)
await sleep(300)
text = await evalJS('document.body.innerText')
// Find positions of "REF" badge and "Geneva"
const refIdx = text.indexOf('Ref') // "REF" badge as "Ref" due to text transform? actually it's literal "Ref"
const genevaIdx = text.indexOf('Geneva')
console.log('   Geneva appears before REF:', genevaIdx < refIdx && genevaIdx >= 0 && refIdx >= 0)

// 5. Remove Tokyo
console.log('\n5) remove Tokyo —')
const removed = await clickAria('Remove Tokyo')
console.log('   remove clicked:', removed)
await sleep(300)
text = await evalJS('document.body.innerText')
console.log('   Tokyo gone:', !text.includes('Tokyo'))

// 6. 24h format
console.log('\n6) switch to 24h —')
const fmt24 = await clickByText('24h')
console.log('   24h clicked:', fmt24)
await sleep(300)
text = await evalJS('document.body.innerText')
// Hour header should now be "00:00", "01:00", ..., "23:00"
// But the awake window also shows 09:00 etc, so look for "00:00" or "23:00" specifically in the grid header.
console.log('   "23:00" present (24h grid header):', /23:00/.test(text))
console.log('   no "11pm" in body:', !/11pm/.test(text))

// 7. Screenshot the current state
await shoot('base-24h-geneva-ref', 1280, 900, false)

// 8. Back to 12h meeting mode, capture default state too
await clickByText('12h')
await clickByText('Meeting')
await evalJS(`(() => {
  const all = [...document.querySelectorAll('button')];
  const remove = all.filter(b => b.getAttribute('aria-label')?.startsWith('Remove'));
  // Add Geneva back to top: we already promoted; reset by clicking Promote on first city to swap back
  const promote = all.find(b => b.title?.includes('Promote San Francisco'));
  if (promote) promote.click();
})()`)
await sleep(400)
await shoot('default-meeting-12h', 1280, 900, false)
await shoot('default-mobile', 390, 844, true)

// 9. localStorage
const storage = await evalJS('localStorage.getItem("timezone-checker:v1")')
console.log('\n9) localStorage:', storage)

// 10. Refresh persistence
await send('Page.reload'); await sleep(1200)
text = await evalJS('document.body.innerText')
console.log('\n10) after refresh —')
console.log('   still showing SF / Denpasar / Geneva:', ['San Francisco', 'Denpasar', 'Geneva'].every(c => text.includes(c)))
console.log('   meeting mode active:', /Meeting[\s\S]{0,20}Base|BASE[\s\S]{0,20}Meeting/i.test(text) || text.includes('COMMON AWAKE WINDOW'))

console.log('\nPage errors:', pageErrors.length === 0 ? '✓ none' : pageErrors)
ws.close(); chrome.kill('SIGTERM'); await sleep(200)
process.exit(pageErrors.length === 0 ? 0 : 1)