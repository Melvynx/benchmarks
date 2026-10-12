import { expect, test, type Page } from '@playwright/test';

const SUBJECT = `E2E ${Date.now()}`;

async function openCompose(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByLabel('To', { exact: true })).toBeVisible();
}

async function writeMessage(page: Page, to: string, subject: string, body: string) {
  await page.getByLabel('To', { exact: true }).fill(to);
  await page.getByLabel('To', { exact: true }).press('Enter');
  await page.getByLabel('Subject', { exact: true }).fill(subject);
  await page.getByRole('textbox', { name: 'Message body' }).click();
  await page.keyboard.type(body);
}

test.describe('shell', () => {
  test('uses the model name as title and brand', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('Claude Haiku 5.5');
    await expect(page.getByText('Claude Haiku 5.5', { exact: true }).first()).toBeVisible();
  });

  test('lists seeded mail without horizontal overflow', async ({ page }) => {
    await page.goto('/');
    const rows = page.getByRole('row');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThan(5);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('keyboard c opens a new message', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('c');
    await expect(page.getByLabel('To', { exact: true })).toBeVisible();
  });

  test('search operators filter the list', async ({ page }) => {
    await page.goto('/');
    await page.locator('#search-input').fill('has:attachment');
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#\/search\?q=has/);
    await expect(page.getByText(/results? for/)).toBeVisible();
  });
});

test.describe('desktop', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, 'desktop only');

  test('opens a conversation in the reading pane and can star it', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('row').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const star = page.getByRole('button', { name: 'Star conversation' }).first();
    await star.click();
    await expect(page.getByRole('button', { name: 'Unstar conversation' }).first()).toBeVisible();
  });

  test('archives with an undo toast that restores the conversation', async ({ page }) => {
    await page.goto('/');
    const before = await page.getByRole('row').count();
    await page.getByRole('row').first().getByRole('checkbox').check();
    await page.getByRole('toolbar', { name: 'Conversation actions' }).getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(page.getByText(/Conversation archived/)).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(before - 1);
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByRole('row')).toHaveCount(before);
  });

  test('sends a message after the undo window and it shows up in Sent', async ({ page }) => {
    await page.goto('/');
    await openCompose(page);
    await writeMessage(page, 'ada@example.com', SUBJECT, 'Hello from the e2e test');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText('Message sent')).toBeVisible();
    await expect(page.getByText('Message sent')).toBeHidden({ timeout: 10_000 });
    await page.goto('/#/sent');
    await expect(page.getByText(SUBJECT).first()).toBeVisible({ timeout: 10_000 });
  });

  test('undo restores an unsent message to the compose window', async ({ page }) => {
    await page.goto('/');
    await openCompose(page);
    await writeMessage(page, 'ada@example.com', `${SUBJECT} undo`, 'Restore me');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByLabel('Subject', { exact: true })).toHaveValue(`${SUBJECT} undo`);
  });

  test('keeps a draft across reloads', async ({ page }) => {
    await page.goto('/');
    await openCompose(page);
    await page.getByLabel('Subject', { exact: true }).fill(`${SUBJECT} draft`);
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.reload();
    await page.goto('/#/drafts');
    await expect(page.getByText(`${SUBJECT} draft`)).toBeVisible();
  });
});

test.describe('mobile', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1000) >= 768, 'mobile only');

  test('opens a conversation full-width with a back button and returns to the list', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('row').first().click();
    await expect(page.getByRole('button', { name: 'Back to list' })).toBeVisible();
    await page.getByRole('button', { name: 'Back to list' }).click();
    await expect(page.getByRole('row').first()).toBeVisible();
  });

  test('compose opens full-screen and stays inside the viewport', async ({ page }) => {
    await page.goto('/');
    await openCompose(page);
    const box = await page.getByLabel('Subject', { exact: true }).boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(412);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
