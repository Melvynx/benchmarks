import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const [outName, width, ...files] = process.argv.slice(2);
const dir = new globalThis.URL("../.shots/", import.meta.url).pathname;
const imgs = files.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(dir + f).toString("base64")}"><figcaption>${f}</figcaption></figure>`).join("");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: Number(width), height: 800 } });
await page.setContent(`<style>body{margin:0;background:#888;display:flex;flex-wrap:wrap;gap:8px;padding:8px;font:12px sans-serif}figure{margin:0;width:${Math.floor((Number(width) - 8 * (files.length + 1)) / files.length)}px}img{width:100%;display:block}figcaption{color:#fff}</style>${imgs}`);
await page.waitForTimeout(200);
await page.screenshot({ path: dir + outName, fullPage: true });
await browser.close();
