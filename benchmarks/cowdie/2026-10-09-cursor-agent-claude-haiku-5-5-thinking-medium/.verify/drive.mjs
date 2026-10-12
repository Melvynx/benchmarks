// Temporary verification driver (CDP over WebSocket, no deps). Lives in .verify/ and gets deleted afterwards.
import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333;
const dir = new URL('.', import.meta.url).pathname;

const chrome = spawn(CHROME, [
  '--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--enable-webgl', '--window-size=1400,850', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${dir}profile2`, 'about:blank',
], { stdio: 'ignore' });

let targets;
for (let i = 0; i < 60; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    if (targets.find((t) => t.type === 'page')) break;
  } catch {}
  await sleep(250);
}
const page = targets.find((t) => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));

let id = 0;
const pending = new Map();
const errors = [];
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
  if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
  if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(msg.params.entry.text);
});
const send = (method, params = {}) => new Promise((res) => {
  const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params }));
});
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value;
const shot = async (name) => {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(`${dir}${name}.png`, Buffer.from(r.result.data, 'base64'));
};

await send('Runtime.enable');
await send('Log.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 850, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: 'http://127.0.0.1:9374/' });
await sleep(4000);

console.log('title:', await evaluate('document.title'));
console.log('h1:', await evaluate('document.querySelector("h1").textContent'));
console.log('canvas:', await evaluate('!!document.querySelector("canvas")'));
await shot('s0-idle');

// Feed the apple via its HUD button and sample the pet's chewing.
await evaluate('document.querySelectorAll(".action.food")[0].click()');
await sleep(350);
await shot('s1-fly');
await sleep(700);
await shot('s2-bite');
await sleep(2200);
await shot('s3-after');

// Milk via the 3D tray (click the milk plate).
await sleep(1000);
const busy = await evaluate('document.querySelectorAll(".action.food")[3].disabled');
console.log('milk button disabled after feed (should be false):', busy);
await evaluate('document.querySelectorAll(".action.food")[3].click()');
await sleep(1300);
await shot('s4-milk');

await sleep(2600);
await evaluate('document.querySelectorAll(".action")[5].click()'); // Wash
await sleep(900);
await shot('s5-wash');
await sleep(2000);
await evaluate('document.querySelectorAll(".action")[4].click()'); // Play
await sleep(1200);
await shot('s6-play');
await sleep(1500);
await evaluate('document.querySelectorAll(".action")[6].click()'); // Sleep
await sleep(2500);
await shot('s7-sleep');
console.log('sleep label:', await evaluate('document.querySelectorAll(".action")[6].textContent'));
await evaluate('document.querySelectorAll(".action")[6].click()'); // Wake
await sleep(500);
await evaluate('document.querySelector("canvas").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true}))');
// Stats should have moved up after feeding.
console.log('bars:', await evaluate('[...document.querySelectorAll(".bar-head span:last-child")].map(e=>e.textContent).join(",")'));
console.log('bubble:', await evaluate('document.querySelector(".bubble")?.textContent ?? null'));
console.log('errors:', JSON.stringify(errors.slice(0, 10)));

ws.close();
chrome.kill();
process.exit(0);
