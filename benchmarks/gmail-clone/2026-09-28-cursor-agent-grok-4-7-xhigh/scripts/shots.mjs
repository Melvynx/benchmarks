import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const desktop = await browser.newPage({ viewport: { width: 1440, height: 900 } });
desktop.setDefaultTimeout(8000);
await desktop.goto("http://127.0.0.1:9353", { waitUntil: "domcontentloaded" });
await desktop.locator("[data-testid=compose-open]").click();
await desktop.waitForSelector("[data-testid=compose-window]");
await desktop.locator("[data-testid=to-input]").fill("maya");
await desktop.waitForTimeout(150);
const box = await desktop.locator("[data-testid=compose-window]").boundingBox();
const bcc = await desktop.getByRole("button", { name: "Bcc", exact: true }).boundingBox();
console.log(JSON.stringify({ box, bcc }));
await desktop.screenshot({ path: "artifacts/20-compose.png" });
await desktop.close();

const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.setDefaultTimeout(8000);
const shot = (name) => page.screenshot({ path: `artifacts/${name}` });

await page.goto("http://127.0.0.1:9353", { waitUntil: "domcontentloaded" });
await page.waitForSelector("[data-testid=mail-row]");
await shot("23-mobile-list.png");
await page.locator("[aria-label='Open menu']").click();
await page.waitForTimeout(250);
await shot("22-drawer.png");
await page.locator("[data-testid=nav-trash]").click();
await page.waitForTimeout(350);
await shot("25-mobile-trash.png");
await page.locator("[aria-label='Open menu']").click();
await page.waitForTimeout(200);
await page.locator("[data-testid=nav-inbox]").click();
await page.waitForTimeout(350);
await page.locator("[data-testid=mail-row]").first().click();
await page.waitForSelector("[data-testid=thread-view]");
await shot("24-mobile-thread.png");
await browser.close();
console.log("shots ok");
