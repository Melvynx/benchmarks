import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const SHOTS = join(ROOT, 'e2e', 'shots');
export const URL = process.env.COWDIE_URL ?? 'http://127.0.0.1:9370/';

if (!existsSync(SHOTS)) mkdirSync(SHOTS, { recursive: true });

const SYSTEM_CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function launch() {
  const args = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-webgl', '--autoplay-policy=no-user-gesture-required'];
  const attempts = [
    () => chromium.launch({ channel: 'chrome', headless: true, args }),
    () => chromium.launch({ executablePath: SYSTEM_CHROME, headless: true, args }),
    () => chromium.launch({ headless: true, args: [...args, '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }),
  ];
  let lastError;
  for (const attempt of attempts) {
    try {
      return await attempt();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export async function open(browser, { width = 1280, height = 800, mobile = false, storage } = {}) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    hasTouch: mobile,
    isMobile: mobile,
  });
  if (storage) {
    await context.addInitScript((data) => {
      if (!localStorage.getItem('cowdie.save.v1')) localStorage.setItem('cowdie.save.v1', JSON.stringify(data));
    }, storage);
  }
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
  await page.goto(URL, { waitUntil: 'load' });
  await page.waitForSelector('canvas.scene-canvas');
  await page.waitForFunction(() => window.__cowdie && window.__cowdie.world);
  return { page, context, errors };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
