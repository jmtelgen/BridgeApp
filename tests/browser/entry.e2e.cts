import { expect, test } from '@playwright/test';

for (const width of [360, 768, 1440]) {
  test(`entry layout, keyboard and preferences at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Good company.Great hands.');
    await expect(page.getByTestId('create-room-tab')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('create-room-tab')).toHaveCSS('background-color', 'rgb(49, 76, 64)');
    await expect(page.getByTestId('create-room-button')).toHaveCSS('background-color', 'rgb(32, 95, 76)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to room options' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('region', { name: 'Room options' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('create-room-tab')).toBeFocused();
    expect(await page.getByTestId('create-room-tab').evaluate(node => getComputedStyle(node).outlineStyle)).toBe('solid');
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('join-room-tab')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('join-room-tab')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByLabel('Room code')).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Your name for joining a room')).toBeFocused();
    await page.keyboard.type('Keyboard guest');
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Room code')).toBeFocused();
    await page.keyboard.type('Case-sensitive-code');
    await expect(page.getByTestId('join-room-button')).toBeEnabled();
    await page.getByTestId('join-room-tab').blur();
    await page.screenshot({ path: testInfo.outputPath(`entry-join-${width}.png`), fullPage: true });

    await page.getByText('Player preferences', { exact: true }).click();
    await expect(page.getByLabel('Motion', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByLabel('Motion', { exact: true }).selectOption('reduced');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await page.getByText('Player preferences', { exact: true }).click();
    await page.getByTestId('create-room-tab').click();
    await page.getByTestId('create-player-name-input').fill('Sunday host');
    await page.getByLabel('Room name').fill('Sunday bridge');
    await page.getByLabel('Private Room', { exact: true }).check();
    await page.getByTestId('create-player-name-input').blur();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: testInfo.outputPath(`entry-create-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByTestId('login-button')).toHaveAttribute('href', '/login');
    await expect(page.getByTestId('signup-button')).toHaveAttribute('href', '/create-account');
  });
}

test('real guest create, code join, reload and private computer table', async ({ browser }) => {
  const clients = await Promise.all([0, 1, 2].map(() => browser.newContext({
    baseURL: 'http://127.0.0.1:4201', viewport: { width: 360, height: 1000 }, reducedMotion: 'reduce',
  })));
  try {
    const [host, guest, solo] = await Promise.all(clients.map(client => client.newPage()));
    await host.goto('/');
    await host.getByLabel('Your name for a new room').fill('Entry host');
    await host.getByLabel('Room name').fill(`Entry real ${Date.now()}`);
    await host.getByLabel('Room name').press('Enter');
    await expect(host.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible();
    const roomId = new URL(host.url()).pathname.split('/').pop()!;
    await guest.goto('/');
    await guest.getByTestId('join-room-tab').click();
    await guest.getByLabel('Your name for joining a room').fill('Entry guest');
    await guest.getByLabel('Room code').fill(roomId);
    await guest.getByLabel('Room code').press('Enter');
    await expect(guest.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible();
    await expect(host.getByText('2 of 4 seats occupied')).toBeVisible();
    await guest.reload();
    await expect(guest.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible();
    await solo.goto('/');
    await solo.getByLabel('Your name for a new room').fill('Entry solo');
    await expect(solo.getByTestId('create-room-button')).toBeDisabled();
    await solo.getByTestId('quick-join-button').click();
    await expect(solo.getByRole('heading', { name: 'Ready for a hand?' })).toBeVisible();
    await solo.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(solo.getByRole('region', { name: /Bridge table. You are/ })).toBeVisible();
  } finally {
    await Promise.all(clients.map(client => client.close()));
  }
});

test('real failed code join is visible and retains keyboard-editable input', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('join-room-tab').click();
  await page.getByLabel('Your name for joining a room').fill('Entry retry');
  await page.getByLabel('Room code').fill(`missing-${Date.now()}`);
  await page.getByLabel('Room code').press('Enter');
  await expect(page.locator('.entry-error')).toBeVisible();
  await expect(page.locator('.entry-error')).toHaveAttribute('role', 'alert');
  await expect(page.getByTestId('join-room-button')).toBeEnabled();
  await expect(page.getByLabel('Room code')).toHaveValue(/missing-/);
  await page.getByLabel('Room code').focus();
  await expect(page.getByLabel('Room code')).toBeFocused();
});
