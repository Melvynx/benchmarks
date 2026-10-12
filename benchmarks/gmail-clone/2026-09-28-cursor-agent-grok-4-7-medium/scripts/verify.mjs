import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9334;
const shots = new URL("../.shots/", import.meta.url);

await mkdir(shots, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${new URL("../.chrome/", import.meta.url).pathname}`,
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: "ignore" },
);

const errors = [];
let socket;
try {
  const target = await waitForTarget();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve);
    socket.addEventListener("error", reject);
  });

  let seq = 0;
  const pending = new Map();
  const waits = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") {
      errors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      errors.push(message.params.args.map((arg) => arg.value || arg.description).join(" "));
    }
    if (message.method) {
      for (const wait of waits) {
        if (wait.method === message.method) {
          wait.resolve(message.params);
          waits.splice(waits.indexOf(wait), 1);
        }
      }
    }
  });

  const send = (method, params = {}) => {
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  };
  const once = (method) => new Promise((resolve) => waits.push({ method, resolve }));

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");

  async function go(url) {
    const loaded = once("Page.loadEventFired");
    await send("Page.navigate", { url });
    await loaded;
    await sleep(250);
  }

  async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    }
    return result.result?.value;
  }

  async function shot(name) {
    const image = await send("Page.captureScreenshot", { format: "png" });
    await writeFile(new URL(name, shots), Buffer.from(image.data, "base64"));
  }

  async function clickText(text) {
    const clicked = await evaluate(`(() => {
      const nodes = [...document.querySelectorAll("button, [role=listitem], [role=tab]")];
      const needle = ${JSON.stringify(text)};
      const node = nodes.find((item) => item.getAttribute("aria-label") === needle || item.innerText.replace(/\\s+/g, " ").includes(needle));
      if (!node) return false;
      node.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Could not click ${text}`);
    await sleep(200);
  }

  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await go("http://127.0.0.1:9354/");
  const home = await evaluate(`(() => ({
    title: document.title,
    h1: document.querySelector("h1")?.textContent,
    rows: document.querySelectorAll("[role=listitem]").length,
    tabs: [...document.querySelectorAll("[role=tab]")].map((tab) => tab.innerText.replace(/\\s+/g, " ")),
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth
  }))()`);
  console.log("home", JSON.stringify(home));
  if (home.title !== "Grok 4.7" || home.h1 !== "Grok 4.7") throw new Error("Title mismatch");
  if (home.rows < 8) throw new Error("Inbox looks empty");
  await shot("desktop-inbox.png");

  await clickText("Q3 launch");
  const threadCount = await evaluate(`document.querySelectorAll(".message, .msg-collapsed").length`);
  console.log("thread messages", threadCount);
  if (threadCount < 3) throw new Error("Conversation did not expand");
  await shot("desktop-thread-multi.png");
  await clickText("Back to list");
  await clickText("Security alert");
  const reading = await evaluate(`(() => ({
    body: document.body.innerText.includes("MacBook Pro"),
    subject: document.querySelector(".subject-head h2")?.textContent
  }))()`);
  console.log("reading", JSON.stringify(reading));
  if (!reading.body) throw new Error("Thread did not open");
  await shot("desktop-thread.png");

  await clickText("Archive");
  const archived = await evaluate(`document.body.innerText.includes("Conversation archived")`);
  if (!archived) throw new Error("Archive snackbar missing");
  await clickText("Undo");
  await sleep(150);

  await evaluate(`(() => {
    const input = document.querySelector("#q");
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    set.call(input, "has:attachment");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await sleep(200);
  const search = await evaluate(`(() => ({
    rows: document.querySelectorAll("[role=listitem]").length,
    text: document.body.innerText.includes("boarding pass") && document.body.innerText.includes("INV-20418")
  }))()`);
  console.log("search", JSON.stringify(search));
  if (!search.text) throw new Error("Attachment search missed known mail");
  await shot("desktop-search.png");

  await evaluate(`document.querySelector("#q").blur(); document.querySelector("button.nav-item")?.click()`);
  await clickText("Compose");
  await evaluate(`(() => {
    const to = document.querySelector('[aria-label="To"]');
    const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    set.call(to, "sam@paperkite.studio");
    to.dispatchEvent(new Event("input", { bubbles: true }));
    to.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    const subject = document.querySelector('[aria-label="Subject"]');
    set.call(subject, "Still from the list");
    subject.dispatchEvent(new Event("input", { bubbles: true }));
    const body = document.querySelector('[aria-label="Message body"]');
    const setText = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
    setText.call(body, "Hover actions now replace the timestamp.");
    body.dispatchEvent(new Event("input", { bubbles: true }));
  })()`);
  await sleep(150);
  await shot("desktop-compose.png");
  await clickText("Send");
  const sentSnack = await evaluate(`document.body.innerText.includes("Message sent")`);
  if (!sentSnack) throw new Error("Send did not confirm");
  await clickText("Sent");
  const inSent = await evaluate(`document.body.innerText.includes("Still from the list")`);
  console.log("sent", inSent);
  if (!inSent) throw new Error("Sent mail missing");
  await shot("desktop-sent.png");

  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(200);
  await evaluate(`document.querySelectorAll(".nav-item")[0].click()`);
  await sleep(200);
  await shot("mobile-inbox.png");
  const mobile = await evaluate(`(() => ({
    h1: document.querySelector("h1")?.textContent,
    navOpen: document.querySelector(".nav")?.classList.contains("open"),
    rows: document.querySelectorAll("[role=listitem]").length
  }))()`);
  console.log("mobile", JSON.stringify(mobile));
  if (mobile.h1 !== "Grok 4.7" || mobile.rows < 5) throw new Error("Mobile inbox broken");
  await evaluate(`document.querySelector('[aria-label="Open navigation"]').click()`);
  await sleep(200);
  await shot("mobile-nav.png");
  const navOpen = await evaluate(`document.querySelector(".nav").classList.contains("open")`);
  if (!navOpen) throw new Error("Mobile nav did not open");

  const realErrors = errors.filter((error) => error && !String(error).includes("Download the React DevTools"));
  if (realErrors.length) {
    console.log("console", realErrors);
    throw new Error("Console errors");
  }
  console.log("verified");
} finally {
  socket?.close();
  chrome.kill();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTarget() {
  const started = Date.now();
  while (Date.now() - started < 10000) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const list = await response.json();
      const page = list.find((item) => item.type === "page");
      if (page?.webSocketDebuggerUrl) return page;
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  throw new Error("Chrome did not open a debugging port");
}
