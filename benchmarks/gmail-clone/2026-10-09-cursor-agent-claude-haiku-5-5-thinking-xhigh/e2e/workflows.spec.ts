import { expect, test, type Page } from '@playwright/test';

const TAG = `wf-${Date.now()}`;

const toolbar = (page: Page) => page.getByRole('toolbar', { name: 'Conversation actions' });

async function selectFirstRow(page: Page) {
  await page.getByRole('row').first().getByRole('checkbox').check();
}

async function writeMessage(page: Page, subject: string, body: string) {
  await page.getByLabel('To', { exact: true }).fill('ada@example.com');
  await page.getByLabel('To', { exact: true }).press('Enter');
  await page.getByLabel('Subject', { exact: true }).fill(subject);
  await page.getByRole('textbox', { name: 'Message body' }).click();
  await page.keyboard.type(body);
}

async function openCompose(page: Page) {
  await page.getByRole('button', { name: 'Compose', exact: true }).click();
  await expect(page.getByLabel('To', { exact: true })).toBeVisible();
}

test.describe('desktop workflows', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) < 768, 'desktop only');

  test('snoozing removes a conversation from the inbox and lists it under Snoozed', async ({ page }) => {
    await page.goto('/');
    const before = await page.getByRole('row').count();
    await selectFirstRow(page);
    await toolbar(page).getByRole('button', { name: 'Snooze', exact: true }).click();
    await page.getByRole('menuitem', { name: /^Tomorrow/ }).click();
    await expect(page.getByText(/Snoozed until/)).toBeVisible();
    await expect(page.getByRole('row')).toHaveCount(before - 1);
    await page.goto('/#/snoozed');
    await expect(page.getByRole('row').first()).toBeVisible();
  });

  test('creates a label from the toolbar and applies it to the selection', async ({ page }) => {
    await page.goto('/');
    await selectFirstRow(page);
    await toolbar(page).getByRole('button', { name: 'Labels', exact: true }).click();
    await page.getByLabel('Create new label').fill(`Launch ${TAG}`);
    await page.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByRole('button', { name: `Launch ${TAG}` })).toBeVisible();
    await expect(page.getByText(`Launch ${TAG}`).first()).toBeVisible();
  });

  test('deleting moves a conversation to Trash', async ({ page }) => {
    await page.goto('/');
    await selectFirstRow(page);
    await toolbar(page).getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText(/moved to Trash/)).toBeVisible();
    await page.goto('/#/trash');
    await expect(page.getByRole('row').first()).toBeVisible();
  });

  test('a reply lands in the open conversation after the undo window', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('row').first().click();
    const body = `Reply ${TAG}`;
    await page.getByRole('button', { name: 'Reply', exact: true }).click();
    await page.getByRole('textbox', { name: 'Message body' }).click();
    await page.keyboard.type(body);
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText(body).first()).toBeVisible({ timeout: 10_000 });
  });

  test('scheduling a message files it under Scheduled', async ({ page }) => {
    await page.goto('/');
    await openCompose(page);
    await writeMessage(page, `${TAG} later`, 'See you tomorrow');
    await page.getByRole('button', { name: 'Schedule send' }).click();
    await page.getByRole('menuitem', { name: /^Tomorrow morning/ }).click();
    await expect(page.getByText(/Scheduled for/)).toBeVisible();
    await page.goto('/#/scheduled');
    await expect(page.getByText(`${TAG} later`)).toBeVisible();
  });

  test('sending while offline waits in Scheduled as a queued message', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('switch', { name: 'Work offline' }).click();
    await page.keyboard.press('Escape');
    await openCompose(page);
    await writeMessage(page, `${TAG} offline`, 'Queued until I reconnect');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText(/will send when you reconnect/)).toBeVisible();
    await page.goto('/#/scheduled');
    await expect(page.getByText('Waiting to send')).toBeVisible();
  });
});

test.describe('mobile workflows', () => {
  test.skip(({ viewport }) => (viewport?.width ?? 1000) >= 768, 'mobile only');

  test('the menu drawer navigates to Sent and closes', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Main menu' }).click();
    await page.getByRole('button', { name: /^Sent/ }).click();
    await expect(page).toHaveURL(/#\/sent/);
  });

  test('the floating compose button sends a message', async ({ page }) => {
    await page.goto('/');
    await openCompose(page);
    await writeMessage(page, `${TAG} mobile`, 'From my phone');
    await page.getByRole('button', { name: 'Send', exact: true }).click();
    await expect(page.getByText('Message sent')).toBeVisible();
  });
});
