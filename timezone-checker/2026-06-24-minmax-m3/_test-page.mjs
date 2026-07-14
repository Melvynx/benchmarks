import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const userDataDir = '/tmp/chrome-test-profile-' + Date.now()
const args = [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--user-data-dir=' + userDataDir,
  '--remote-debugging-port=9223',
  '--window-size=1280,900',
  'about:blank',
]

const chrome = spawn(CHROME, args, { stdio: ['ignore', 'pipe', 'pipe'] })
let chromeReady = false
chrome.stderr.on('data', (chunk) => {
  const s = chunk.toString()
  if (s.includes('DevTools listening on')) chromeReady = true
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

while (!chromeReady) await sleep(50)

async function getJSON(path) {
  const res = await fetch('http://127.0.0.1:9223' + path)
  return res.json()
}

const tabs = await getJSON('/json')
let tab = tabs.find((t) => t.type === 'page') || tabs[0]
const ws = tab.webSocketDebuggerUrl

const WebSocket = (await import('ws')).default
const wsClient = new WebSocket(ws)
let nextId = 1
const pending = new Map()
const consoleLogs = []
const networkErrors = []
const pageErrors = []

wsClient.on('message', (raw) => {
  const msg = JSON.parse(raw.toString())
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg)
    pending.delete(msg.id)
  }
  if (msg.method === 'Runtime.consoleAPICalled') {
    consoleLogs.push({
      type: msg.params.type,
      args: msg.params.args.map((a) => a.value ?? a.description ?? JSON.stringify(a)),
    })
  }
  else if (msg.method === 'Runtime.exceptionThrown') {
    pageErrors.push(msg.params.exceptionDetails)
  }
  else if (msg.method === 'Network.loadingFailed') {
    networkErrors.push(msg.params)
  }
})

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++
    pending.set(id, (m) => (m.error ? reject(m.error) : resolve(m.result)))
    wsClient.send(JSON.stringify({ id, method, params }))
  })
}

await new Promise((r) => wsClient.once('open', r))

await send('Runtime.enable')
await send('Page.enable')
await send('Network.enable')

await send('Page.navigate', { url: 'http://localhost:5173/' })
await sleep(2500)

const result = await send('Runtime.evaluate', {
  expression: `JSON.stringify({
    title: document.title,
    h1: document.querySelector('h1')?.textContent,
    cellCount: document.querySelectorAll('.grid > div').length,
    gridRect: document.querySelector('.grid')?.getBoundingClientRect(),
    bodyText: document.body.innerText.slice(0, 800),
  })`,
  returnByValue: true,
})
const evalResult = JSON.parse(result.result.value)
writeFileSync('/tmp/page-eval.json', JSON.stringify(evalResult, null, 2))

console.log('=== TITLE & HEADING ===')
console.log('title:', evalResult.title)
console.log('h1:', evalResult.h1)

console.log('\n=== CONSOLE LOGS ===')
consoleLogs.forEach((l) => console.log(`[${l.type}]`, ...l.args))

console.log('\n=== PAGE ERRORS ===')
if (pageErrors.length === 0) console.log('(none)')
else pageErrors.forEach((e) => console.log(JSON.stringify(e, null, 2)))

console.log('\n=== NETWORK ERRORS ===')
if (networkErrors.length === 0) console.log('(none)')
else networkErrors.forEach((e) => console.log(JSON.stringify(e)))

console.log('\n=== BODY TEXT (first 800) ===')
console.log(evalResult.bodyText)

// Screenshot
const screenshot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync('/tmp/screenshot-desktop.png', Buffer.from(screenshot.data, 'base64'))
console.log('\nScreenshot saved to /tmp/screenshot-desktop.png')

// Switch to mobile viewport
await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
})
await sleep(500)
const mobileShot = await send('Page.captureScreenshot', { format: 'png' })
writeFileSync('/tmp/screenshot-mobile.png', Buffer.from(mobileShot.data, 'base64'))
console.log('Screenshot saved to /tmp/screenshot-mobile.png')

wsClient.close()
chrome.kill('SIGTERM')
await sleep(200)
process.exit(pageErrors.length === 0 ? 0 : 1)